import json
from datetime import datetime
from app.dependencies import get_request_service

class PaymentService:
    async def process_payment_webhook(self, webhook_data: dict) -> bool:
        """Process a payment webhook from Square"""
        try:
            # Extract the payment information
            payment_id = webhook_data.get('data', {}).get('object', {}).get('payment', {}).get('id')
            if not payment_id:
                logger.error("Payment ID not found in webhook data")
                return False
            
            # Get the payment details from Square
            payment = await self.get_payment(payment_id)
            if not payment:
                logger.error(f"Could not retrieve payment {payment_id}")
                return False
            
            status = payment.get('status')
            if status != 'COMPLETED':
                logger.info(f"Payment {payment_id} not completed (status: {status})")
                return False
            
            # Get the request ID from the payment metadata
            metadata = payment.get('order_id') or payment.get('note')
            if not metadata:
                logger.error(f"No metadata found for payment {payment_id}")
                return False
            
            # Try to parse the metadata to get the request ID
            request_id = None
            try:
                if isinstance(metadata, str) and metadata.startswith('{'):
                    metadata_dict = json.loads(metadata)
                    request_id = metadata_dict.get('request_id')
                else:
                    # Handle legacy format or other structures
                    request_id = metadata
            except Exception as e:
                logger.error(f"Error parsing metadata: {str(e)}")
                return False
            
            if not request_id:
                logger.error(f"No request ID found in metadata: {metadata}")
                return False
            
            # Now that we have the request ID and confirmed payment, execute the request
            request_service = await get_request_service()
            
            # Approve the request first
            await request_service._update_request_status(request_id, 'approved', {
                'payment_id': payment_id,
                'payment_status': status,
                'payment_amount': payment.get('amount_money', {}).get('amount', 0),
                'payment_currency': payment.get('amount_money', {}).get('currency', 'USD'),
                'payment_date': datetime.now().isoformat()
            })
            
            # Then execute it
            success = await request_service.execute_approved_request(request_id)
            
            if not success:
                logger.error(f"Failed to execute request {request_id}")
                return False
            
            logger.info(f"Successfully executed request {request_id} after payment {payment_id}")
            return True
            
        except Exception as e:
            logger.exception(f"Error processing payment webhook: {str(e)}")
            return False 