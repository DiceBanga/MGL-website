from square.client import Client
from supabase import Client as SupabaseClient
import logging
from datetime import datetime
import json

class PaymentService:
    def __init__(self, square_client: Client, supabase: SupabaseClient, square_location_id: str, square_app_id: str):
        self.square_client = square_client
        self.supabase = supabase
        self.square_location_id = square_location_id
        self.square_app_id = square_app_id
        self.logger = logging.getLogger(__name__)

    async def process_payment(self, payment_data: dict) -> dict:
        try:
            # Log the payment request
            self.logger.info(f"Processing payment: amount={payment_data['amount']}, reference={payment_data.get('reference_id')}")
            
            # Create Square payment
            payment_result = await self.create_square_payment(payment_data)
            
            # Store payment in database (don't throw if this fails)
            try:
                await self.store_payment_record(payment_result)
            except Exception as db_error:
                self.logger.error(f"Failed to store payment record, but payment was successful: {str(db_error)}")
                # We don't want to fail the overall payment if just the DB storage fails
                # So we continue without re-raising
            
            # Format the response for the frontend
            formatted_result = {
                "id": payment_result.get("id", "unknown"),
                "status": payment_result.get("status", "COMPLETED"),
                "receiptUrl": payment_result.get("receipt_url"),
                "amount": payment_data["amount"],
                "created_at": payment_result.get("created_at"),
                "card_details": payment_result.get("card_details", {})
            }
            
            return formatted_result
            
        except Exception as e:
            self.logger.error(f"Payment processing error: {str(e)}")
            raise

    async def create_square_payment(self, payment_data: dict) -> dict:
        try:
            # Extract the original metadata if provided
            original_metadata = payment_data.get("metadata", {})
            
            body = {
                "source_id": payment_data["source_id"],
                "amount_money": {
                    "amount": int(payment_data["amount"] * 100),  # Convert to cents
                    "currency": "USD"
                },
                "idempotency_key": payment_data["idempotency_key"],
                "location_id": self.square_location_id
            }

            # Add optional fields if present
            if payment_data.get("note"):
                body["note"] = payment_data["note"]
            if payment_data.get("reference_id"):
                body["reference_id"] = payment_data["reference_id"]
            
            # Make the Square API call
            self.logger.info(f"Calling Square API with body: {json.dumps(body, default=str)}")
            result = self.square_client.payments.create_payment(body)
            
            if not result.is_success():
                errors = result.errors
                self.logger.error(f"Square payment failed: {errors}")
                error_details = []
                for error in errors:
                    error_details.append(f"{error.get('category')}: {error.get('detail')}")
                
                raise Exception(f"Square payment failed: {', '.join(error_details)}")
            
            payment = result.body.get("payment", {})
            self.logger.info(f"Square payment successful, ID: {payment.get('id')}")
            
            # Add the original metadata to the result so we can access it when storing the payment
            payment["original_metadata"] = original_metadata
            
            # Log information about the metadata for debugging
            if original_metadata:
                # Check if the metadata has the proper structure
                has_valid_structure = (
                    isinstance(original_metadata, dict) and
                    "transaction_details" in original_metadata and
                    "payment_method" in original_metadata and
                    isinstance(original_metadata["transaction_details"], dict) and
                    isinstance(original_metadata["payment_method"], dict)
                )
                
                if has_valid_structure:
                    self.logger.info("Received well-formed metadata structure from frontend")
                else:
                    self.logger.warning("Metadata received but does not have the required structure")
            else:
                self.logger.info("No metadata received from frontend")
            
            return payment
        
        except Exception as e:
            self.logger.error(f"Error creating Square payment: {str(e)}")
            raise

    async def store_payment_record(self, payment_result: dict) -> None:
        try:
            # Check if original_metadata was passed from the frontend
            original_metadata = payment_result.get("original_metadata", {})
            
            # Extract card details if available
            card_details = payment_result.get("card_details", {})
            card = card_details.get("card", {})
            card_brand = card.get("card_brand", "UNKNOWN")
            last_four = card.get("last_4", "0000")
            
            # Create a guaranteed valid metadata structure based on our database requirements
            metadata = {
                "transaction_details": {
                    "processor_response": payment_result.get("id", f"square-{datetime.now().timestamp()}"),
                    "authorization_code": payment_result.get("id", f"auth-{datetime.now().timestamp()}")
                },
                "payment_method": {
                    "type": card_brand.lower() if card_brand else "square",
                    "last_four": last_four
                }
            }
            
            # Add team ID and event data if available in original metadata
            if original_metadata:
                # Try both camelCase and snake_case versions
                team_id = original_metadata.get("team_id") or original_metadata.get("teamId")
                event_id = original_metadata.get("event_id") or original_metadata.get("eventId")
                event_type = original_metadata.get("event_type") or original_metadata.get("type")
                
                if team_id:
                    metadata["team_id"] = team_id
                if event_id:
                    metadata["event_id"] = event_id
                if event_type:
                    metadata["event_type"] = event_type
            
            # Store in payments table
            payment_data = {
                "payment_id": payment_result["id"],
                "amount": float(payment_result["amount_money"]["amount"]) / 100,  # Convert back to dollars
                "currency": payment_result["amount_money"]["currency"],
                "status": payment_result["status"],
                "source_id": payment_result["source_id"],
                "location_id": payment_result["location_id"],
                "created_at": datetime.now().isoformat(),
                "metadata": metadata,
                "reference_id": payment_result.get("reference_id")
            }

            # Log the exact metadata we're using
            self.logger.info(f"Using validated metadata structure: {json.dumps(metadata, default=str)}")
            
            # Insert into Supabase
            self.logger.info(f"Storing payment in Supabase")
            result = self.supabase.table("payments").insert(payment_data).execute()
            
            if hasattr(result, 'error') and result.error is not None:
                self.logger.error(f"Database error: {result.error}")
                raise Exception(f"Failed to store payment record: {result.error}")
            
            self.logger.info(f"Payment record successfully stored in database")

        except Exception as e:
            self.logger.error(f"Database error: {str(e)}")
            # Don't raise here - payment was successful, storage failure shouldn't affect the user
            # But log it for monitoring
            self.logger.error("Failed to store payment record in database")