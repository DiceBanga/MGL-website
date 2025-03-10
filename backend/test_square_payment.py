#!/usr/bin/env python
"""
Square Payment API Test Script

This script bypasses the frontend and directly tests the Square payment integration.
It uses test card values for the Square sandbox environment.
"""

import os
import json
import uuid
import logging
from dotenv import load_dotenv
from square.client import Client

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

def test_square_payment():
    """
    Test a Square payment using the sandbox environment and test card details.
    
    Uses the test card:
    - Number: 4111 1111 1111 1111
    - Expiration: 12/31
    - CVV: 111
    - Zip: 12345
    - Amount: $150 USD
    """
    # Check Square API configuration
    square_location_id = os.getenv('SQUARE_LOCATION_ID')
    square_access_token = os.getenv('SQUARE_ACCESS_TOKEN')
    square_environment = os.getenv('SQUARE_ENVIRONMENT', 'sandbox')
    
    if not square_location_id or not square_access_token:
        logger.error("Missing Square API configuration. Check your .env file.")
        return
    
    logger.info(f"Using Square environment: {square_environment}")
    logger.info(f"Using Square location ID: {square_location_id}")
    logger.info(f"Square access token configured: {'Yes' if square_access_token else 'No'}")
    
    try:
        # Create a client with your credentials
        client = Client(
            access_token=square_access_token,
            environment=square_environment
        )
        
        # First, create a card nonce (in production this would come from the frontend)
        # For testing, we'll use a predefined nonce for the test card
        source_id = "cnon:card-nonce-ok"  # This is a special test nonce in the sandbox
        
        # You could also use this for direct card testing, but the nonce is simpler
        # card_info = {
        #     "card_number": "4111111111111111",
        #     "expiration_month": 12,
        #     "expiration_year": 31,
        #     "cvv": "111",
        #     "postal_code": "12345"
        # }
        
        # Generate a unique idempotency key
        idempotency_key = str(uuid.uuid4())
        logger.info(f"Using idempotency key: {idempotency_key}")
        
        # Test amount: $150 USD
        amount_in_cents = 15000  # $150.00
        
        # Create payment request body
        payment_body = {
            "source_id": source_id,
            "amount_money": {
                "amount": amount_in_cents,
                "currency": "USD"
            },
            "idempotency_key": idempotency_key,
            "location_id": square_location_id,
            "note": "Test payment for team registration",
            "reference_id": "backend-test-team-registration"
        }
        
        logger.info(f"Sending payment request to Square: {json.dumps(payment_body, default=str)}")
        
        # Call the Square Payments API
        result = client.payments.create_payment(payment_body)
        
        if result.is_success():
            payment = result.body["payment"]
            logger.info(f"Payment successful! ID: {payment['id']}")
            logger.info(f"Full payment response: {json.dumps(payment, default=str)}")
            print("\n✅ PAYMENT SUCCESSFUL!")
            print(f"Payment ID: {payment['id']}")
            print(f"Status: {payment.get('status', 'Unknown')}")
            print(f"Amount: ${payment['amount_money']['amount']/100:.2f} {payment['amount_money']['currency']}")
            if 'receipt_url' in payment:
                print(f"Receipt URL: {payment['receipt_url']}")
            return payment
        elif result.is_error():
            errors = result.errors
            logger.error(f"Square API Error: {errors}")
            print("\n❌ PAYMENT FAILED!")
            for error in errors:
                print(f"Error: {error.get('category')}: {error.get('detail')}")
            return None
            
    except Exception as e:
        logger.exception(f"Error during payment processing: {str(e)}")
        print(f"\n❌ ERROR: {str(e)}")
        return None

if __name__ == "__main__":
    print("Starting Square Payment Test...")
    test_square_payment()
    print("Test completed. Check logs for details.") 