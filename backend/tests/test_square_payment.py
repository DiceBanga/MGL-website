#!/usr/bin/env python
"""
Test module for Square payment processing.
This module contains tests for the Square payment integration.
"""

import os
import logging
from square.client import Client
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def test_square_payment():
    """Test the Square payment processing functionality."""
    # Load environment variables
    load_dotenv()
    
    # Get Square credentials
    access_token = os.getenv('SQUARE_ACCESS_TOKEN')
    location_id = os.getenv('SQUARE_LOCATION_ID')
    environment = os.getenv('SQUARE_ENVIRONMENT', 'sandbox')
    
    if not access_token or not location_id:
        logger.error("Missing required environment variables")
        return False
    
    try:
        # Create Square client
        client = Client(
            access_token=access_token,
            environment=environment
        )
        
        # Test payment data
        payment_data = {
            "source_id": "test-card-nonce",
            "amount_money": {
                "amount": 100,  # $1.00
                "currency": "USD"
            },
            "location_id": location_id,
            "idempotency_key": "test-payment-key"
        }
        
        # Attempt to create payment
        result = client.payments.create_payment(payment_data)
        
        if result.is_success():
            logger.info("Payment test successful!")
            logger.info(f"Payment ID: {result.body['payment']['id']}")
            return True
        else:
            logger.error("Payment test failed")
            logger.error(f"Errors: {result.errors}")
            return False
            
    except Exception as e:
        logger.exception(f"Exception during payment test: {str(e)}")
        return False

if __name__ == "__main__":
    print("Starting Square Payment Test...")
    success = test_square_payment()
    print(f"Test completed with {'success' if success else 'failure'}. Check logs for details.") 