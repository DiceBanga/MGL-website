from square.client import Client
from square.http.auth.o_auth_2 import BearerAuthCredentials
import os
from dotenv import load_dotenv
import uuid

# Load environment variables
load_dotenv()

# Get credentials from environment variables
access_token = os.getenv('SQUARE_ACCESS_TOKEN')
location_id = os.getenv('SQUARE_LOCATION_ID')
environment = os.getenv('SQUARE_ENVIRONMENT', 'sandbox')
bearer_auth_credentials = BearerAuthCredentials(
    access_token=access_token
)

print(f"Using access token: {access_token[:6]}...{access_token[-4:] if len(access_token) > 10 else ''}")
print(f"Using location ID: {location_id}")
print(f"Using environment: {environment}")

# Initialize the Square client with the recommended bearer_auth_credentials pattern
client = Client(
    bearer_auth_credentials=bearer_auth_credentials,
    environment=environment
)

def create_payment():
    try:
        # Create a unique idempotency key for this request
        idempotency_key = str(uuid.uuid4())
        print(f"Generated idempotency key: {idempotency_key}")
        
        # Create a payment request body
        body = {
            "idempotency_key": idempotency_key,
            "source_id": "cnon:card-nonce-ok",  # Special test nonce that works in sandbox
            "amount_money": {
                "amount": 15000,  # $150.00 in cents
                "currency": "USD"
            },
            "location_id": location_id,
            "note": "Test payment for team registration - $150"
        }

        print("Sending payment request to Square...")
        # Call the Payments API to create a payment
        result = client.payments.create_payment(body)

        if result.is_success():
            payment = result.body.get("payment", {})
            print("\n✅ Payment successful!")
            print(f"Payment ID: {payment.get('id')}")
            print(f"Status: {payment.get('status')}")
            print(f"Amount: ${payment.get('amount_money', {}).get('amount', 0)/100:.2f} {payment.get('amount_money', {}).get('currency')}")
            if 'receipt_url' in payment:
                print(f"Receipt URL: {payment.get('receipt_url')}")
            print("\nFull payment details:")
            print(payment)
        elif result.is_error():
            print("\n❌ Payment failed!")
            for error in result.errors:
                print(f"Error: {error.get('category')}: {error.get('detail')}")

    except Exception as e:
        print(f"\n❌ An error occurred: {e}")

# Run the function to create a payment
if __name__ == "__main__":
    print("Starting test payment...")
    create_payment()
    print("Test completed.") 