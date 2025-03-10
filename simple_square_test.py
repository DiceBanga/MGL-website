#!/usr/bin/env python
"""
Simple Square API Test

This is a minimal script to test the Square SDK connection.
"""

import os
from square.client import Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Use proper bearer auth credentials format
access_token = os.getenv('SQUARE_ACCESS_TOKEN')
environment = os.getenv('SQUARE_ENVIRONMENT', 'sandbox')
location_id = os.getenv('SQUARE_LOCATION_ID')

print(f"Testing Square API with:")
print(f"  Environment: {environment}")
print(f"  Access Token: {access_token[:6]}... (truncated)")

# Create client with bearer_auth_credentials instead of access_token
client = Client(
    access_token=access_token,
    environment=environment
)
# Try a simple payment with test nonce
try:
    print("\nAttempting to create a test payment...")
    location_id = os.getenv('SQUARE_LOCATION_ID')
    
    # Use the special sandbox test card nonce
    payment_body = {
        "source_id": "cnon:card-nonce-ok",
        "amount_money": {
            "amount": 150,  # $1.00
            "currency": "USD"
        },
        "idempotency_key": "unique-idempotency-key-12345",
        "location_id": location_id
    }
    
    result = client.payments.create_payment(payment_body)
    
    if result.is_success():
        payment = result.body["payment"]
        print(f"✅ Payment successful! ID: {payment['id']}")
        print(f"  Status: {payment.get('status', 'Unknown')}")
        print(f"  Amount: ${payment['amount_money']['amount']/100:.2f} {payment['amount_money']['currency']}")
    elif result.is_error():
        print(f"❌ Payment Error: {result.errors}")
except Exception as e:
    print(f"❌ Payment Exception: {str(e)}") 