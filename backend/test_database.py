#!/usr/bin/env python
"""
Test Database Storage for Square Payments

This script tests:
1. Creating a payment with Square
2. Storing the payment details in Supabase
"""

from square.client import Client
from square.http.auth.o_auth_2 import BearerAuthCredentials
import os
import json
import uuid
import datetime
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Square configuration
square_access_token = os.getenv('SQUARE_ACCESS_TOKEN')
square_location_id = os.getenv('SQUARE_LOCATION_ID')
square_environment = os.getenv('SQUARE_ENVIRONMENT', 'sandbox')
bearer_auth_credentials = BearerAuthCredentials(
    access_token=square_access_token
)

# Supabase configuration
supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_ANON_KEY')
# Try to use a service role key if available (has bypass RLS permissions)
supabase_service_key = os.getenv('SUPABASE_SERVICE_KEY', supabase_key)

print(f"Square Configuration:")
print(f"  Environment: {square_environment}")
print(f"  Location ID: {square_location_id}")
print(f"  Access Token: {square_access_token[:6]}... (truncated)")

print(f"\nSupabase Configuration:")
print(f"  URL: {supabase_url}")
print(f"  Using {'service role' if supabase_service_key != supabase_key else 'anon'} key")

# Initialize Square client
square_client = Client(
    bearer_auth_credentials=bearer_auth_credentials,
    environment=square_environment
)

def create_test_payment():
    """Create a test payment using Square API."""
    try:
        # Create a unique idempotency key
        idempotency_key = str(uuid.uuid4())
        print(f"\nCreating test payment...")
        print(f"Generated idempotency key: {idempotency_key}")
        
        # Create payment request body
        payment_body = {
            "idempotency_key": idempotency_key,
            "source_id": "cnon:card-nonce-ok",  # Test nonce for sandbox
            "amount_money": {
                "amount": 15000,  # $150.00
                "currency": "USD"
            },
            "location_id": square_location_id,
            "note": "Test payment for team registration - $150",
            "reference_id": f"test-payment-{datetime.datetime.now().strftime('%Y%m%d-%H%M%S')}"
        }
        
        print("Sending payment request to Square...")
        result = square_client.payments.create_payment(payment_body)
        
        if result.is_success():
            payment = result.body.get("payment", {})
            print("\n✅ Payment successful!")
            print(f"Payment ID: {payment.get('id')}")
            print(f"Status: {payment.get('status')}")
            print(f"Amount: ${payment.get('amount_money', {}).get('amount', 0)/100:.2f} {payment.get('amount_money', {}).get('currency')}")
            
            return payment
        elif result.is_error():
            print("\n❌ Payment failed!")
            for error in result.errors:
                print(f"Error: {error.get('category')}: {error.get('detail')}")
            return None
            
    except Exception as e:
        print(f"\n❌ An error occurred: {e}")
        return None

def store_payment_in_supabase(payment_data):
    """Store payment data in Supabase database using direct REST API call."""
    if not payment_data:
        print("No payment data to store.")
        return False
    
    try:
        # Extract relevant data from the payment
        payment_id = payment_data.get('id')
        status = payment_data.get('status')
        amount = payment_data.get('amount_money', {}).get('amount', 0) / 100  # Convert cents to dollars
        currency = payment_data.get('amount_money', {}).get('currency')
        created_at = payment_data.get('created_at')
        note = payment_data.get('note', 'Square payment')
        
        # Try multiple metadata structures to find one that works
        metadata_options = [
            # Option 1: Only the square_payment data
            {
                'square_payment': payment_data
            },
            
            # Option 2: Simple metadata
            {
                'provider': 'square',
                'test': True
            },
            
            # Option 3: Complex metadata with wrapped payment
            {
                'provider': 'square',
                'event_type': 'league',
                'event_id': 'test-league-id',
                'team_id': 'test-team-id',
                'client': 'web',
                'type': 'payment',
                'version': '1.0',
                'transaction_type': 'purchase',
                'transaction_id': payment_id,
                'square_payment': payment_data
            },
            
            # Option 4: Try null (if allowed)
            None
        ]
        
        # Try each metadata structure
        for i, metadata in enumerate(metadata_options, 1):
            # Create payment record matching the database schema
            payment_record = {
                'user_id': 'ecac78cd-e1a9-484a-a55e-4da6aa6c103a',  # Using a valid UUID format
                'amount': amount,
                'currency': currency,
                'status': status,
                'payment_method': 'square',
                'payment_id': f"{payment_id}-test-{i}",  # Add suffix to make unique
                'description': note,
                'metadata': metadata
            }
            
            print(f"\nAttempt {i}: Storing payment in Supabase with metadata structure:")
            print(f"Metadata: {json.dumps(metadata, default=str)[:200]}... (truncated)")
            
            # Using direct REST API call to Supabase
            headers = {
                'apikey': supabase_service_key,
                'Authorization': f'Bearer {supabase_service_key}',
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            }
            
            response = requests.post(
                f"{supabase_url}/rest/v1/payments",
                headers=headers,
                json=payment_record
            )
            
            if response.status_code in (200, 201):
                data = response.json()
                print(f"\n✅ Payment successfully stored in database with metadata option {i}!")
                print(f"Response: {json.dumps(data, indent=2)[:300]}... (truncated)")
                return True
            else:
                print(f"\n❌ Attempt {i} failed to store payment")
                print(f"Status code: {response.status_code}")
                print(f"Response: {response.text}")
        
        # If all attempts fail, provide guidance
        print("\nAll metadata structures failed. Please run the SQL script in the Supabase SQL Editor")
        print("to determine the required metadata structure or constraints.")
        return False
            
    except Exception as e:
        print(f"\n❌ Database error: {e}")
        return False

def main():
    """Main function to test payment and database storage."""
    print("\n=== Testing Square Payment and Supabase Storage ===\n")
    
    # Step 1: Create a test payment
    payment_data = create_test_payment()
    
    if not payment_data:
        print("\nTest failed: Could not create payment.")
        return
    
    # Step 2: Store the payment in Supabase
    success = store_payment_in_supabase(payment_data)
    
    if success:
        print("\n✅ TEST PASSED: Payment created and stored successfully!")
    else:
        print("\n❌ TEST FAILED: Could not store payment in database.")

if __name__ == "__main__":
    main() 