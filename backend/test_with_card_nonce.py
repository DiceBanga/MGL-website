#!/usr/bin/env python
"""
Square Payment API Test with Card Nonce

This script tests the Square payment integration using a card nonce that would normally
come from the frontend Square Web Payment SDK.
"""

import os
import json
import uuid
import logging
import argparse
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

def test_with_nonce(nonce, amount=150.00):
    """
    Test a Square payment using a card nonce from the frontend.
    
    Args:
        nonce (str): The card nonce from Square Web Payment SDK
        amount (float): Amount to charge in dollars
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
        
        # Generate a unique idempotency key
        idempotency_key = str(uuid.uuid4())
        logger.info(f"Using idempotency key: {idempotency_key}")
        
        # Convert dollars to cents
        amount_in_cents = int(amount * 100)
        
        # Create payment request body
        payment_body = {
            "source_id": nonce,
            "amount_money": {
                "amount": amount_in_cents,
                "currency": "USD"
            },
            "idempotency_key": idempotency_key,
            "location_id": square_location_id,
            "note": "Test payment using card nonce",
            "reference_id": "backend-test-with-nonce"
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

def main():
    parser = argparse.ArgumentParser(description='Test Square Payment with a card nonce')
    parser.add_argument('--nonce', type=str, default="cnon:card-nonce-ok", 
                        help='Card nonce from Square Web Payment SDK')
    parser.add_argument('--amount', type=float, default=150.00,
                        help='Amount to charge in dollars')
    
    args = parser.parse_args()
    
    print(f"Starting Square Payment Test with nonce: {args.nonce} for ${args.amount:.2f}...")
    test_with_nonce(args.nonce, args.amount)
    print("Test completed. Check logs for details.")

if __name__ == "__main__":
    main() 