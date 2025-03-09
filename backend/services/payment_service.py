from square.client import Client
from supabase import Client as SupabaseClient
import logging
from datetime import datetime

class PaymentService:
    def __init__(self, square_client: Client, supabase: SupabaseClient, square_location_id: str, square_app_id: str):
        self.square_client = square_client
        self.supabase = supabase
        self.square_location_id = square_location_id
        self.square_app_id = square_app_id
        self.logger = logging.getLogger(__name__)

    async def process_payment(self, payment_data: dict) -> dict:
        try:
            # Create Square payment
            result = await self.create_square_payment(payment_data)
            
            # Store in Supabase
            await self.store_payment_record(result)
            
            return result
            
        except Exception as e:
            self.logger.error(f"Payment processing error: {str(e)}")
            raise

    async def create_square_payment(self, payment_data: dict) -> dict:
        try:
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

            result = self.square_client.payments.create_payment(body=body)

            if result.is_success():
                return result.body["payment"]
            else:
                raise Exception(str(result.errors))
                
        except Exception as e:
            self.logger.error(f"Square payment error: {str(e)}")
            raise

    async def store_payment_record(self, payment_result: dict) -> None:
        try:
            # Store in payments table
            payment_data = {
                "payment_id": payment_result["id"],
                "amount": float(payment_result["amount_money"]["amount"]) / 100,  # Convert back to dollars
                "currency": payment_result["amount_money"]["currency"],
                "status": payment_result["status"],
                "source_id": payment_result["source_id"],
                "location_id": payment_result["location_id"],
                "created_at": datetime.now().isoformat(),
                "metadata": {
                    "square_payment": payment_result,
                    "reference_id": payment_result.get("reference_id"),
                    "note": payment_result.get("note")
                }
            }

            # Insert into Supabase
            result = self.supabase.table("payments").insert(payment_data).execute()
            
            if hasattr(result, 'error') and result.error is not None:
                raise Exception(f"Failed to store payment record: {result.error}")

        except Exception as e:
            self.logger.error(f"Database error: {str(e)}")
            # Don't raise here - payment was successful, storage failure shouldn't affect the user
            # But log it for monitoring
            self.logger.error("Failed to store payment record in database")