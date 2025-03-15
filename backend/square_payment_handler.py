#!/usr/bin/env python
"""
Square Payment Handler

This module provides functionality to:
1. Create payments with Square API
2. Store payment records in Supabase

Based on testing, the payments table in Supabase accepts payments with null metadata.
"""

from square.client import Client
from square.http.auth.o_auth_2 import BearerAuthCredentials
import os
import json
import uuid
import requests
import logging
from datetime import datetime
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

class SquarePaymentHandler:
    """Handles Square payment processing and database storage."""
    
    def __init__(self):
        """Initialize with configuration from environment variables."""
        # Square configuration
        self.square_access_token = os.getenv('SQUARE_ACCESS_TOKEN')
        self.square_location_id = os.getenv('SQUARE_LOCATION_ID')
        self.square_environment = os.getenv('SQUARE_ENVIRONMENT', 'sandbox')
        self.bearer_auth_credentials = BearerAuthCredentials(
            access_token=self.square_access_token
        )
        
        # Supabase configuration
        self.supabase_url = os.getenv('SUPABASE_URL')
        self.supabase_key = os.getenv('SUPABASE_ANON_KEY')
        
        # Initialize Square client
        self.square_client = Client(
            bearer_auth_credentials=self.bearer_auth_credentials,
            environment=self.square_environment
        )
        
        logger.info(f"Initialized with Square environment: {self.square_environment}")
        logger.info(f"Using Square location ID: {self.square_location_id}")
    
    def create_payment(self, source_id, amount, currency="USD", idempotency_key=None, 
                     note=None, reference_id=None):
        """
        Create a payment using Square API.
        
        Args:
            source_id (str): The source ID (card nonce)
            amount (float): Payment amount in dollars
            currency (str): Currency code (default: USD)
            idempotency_key (str): Optional idempotency key
            note (str): Optional payment note
            reference_id (str): Optional reference ID
            
        Returns:
            dict: The payment data if successful, None otherwise
        """
        try:
            # Generate idempotency key if not provided
            if not idempotency_key:
                idempotency_key = str(uuid.uuid4())
            
            logger.info(f"Creating payment of {amount} {currency}")
            logger.info(f"Using idempotency key: {idempotency_key}")
            
            # Convert amount to cents (integer)
            amount_in_cents = int(amount * 100)
            
            # Create payment request body
            payment_body = {
                "source_id": source_id,
                "amount_money": {
                    "amount": amount_in_cents,
                    "currency": currency
                },
                "idempotency_key": idempotency_key,
                "location_id": self.square_location_id
            }
            
            # Add optional fields if provided
            if note:
                payment_body["note"] = note
            if reference_id:
                payment_body["reference_id"] = reference_id
            
            logger.info(f"Sending payment request to Square: {json.dumps(payment_body, default=str)}")
            
            # Call Square API
            result = self.square_client.payments.create_payment(payment_body)
            
            if result.is_success():
                payment = result.body.get("payment", {})
                logger.info(f"Payment successful! ID: {payment.get('id')}")
                return payment
            elif result.is_error():
                errors = result.errors
                logger.error(f"Square API Error: {errors}")
                return None
                
        except Exception as e:
            logger.exception(f"Error creating payment: {e}")
            return None
    
    def store_payment_in_database(self, payment_data, user_id, event_type=None, 
                                event_id=None, team_id=None):
        """
        Store payment data in Supabase database.
        
        Args:
            payment_data (dict): The payment data from Square
            user_id (str): The user ID (UUID)
            event_type (str): Optional event type (e.g., 'league', 'tournament')
            event_id (str): Optional event ID
            team_id (str): Optional team ID
            
        Returns:
            bool: True if successful, False otherwise
        """
        if not payment_data:
            logger.warning("No payment data to store")
            return False
        
        try:
            # Extract relevant data from the payment
            payment_id = payment_data.get('id')
            status = payment_data.get('status')
            amount = payment_data.get('amount_money', {}).get('amount', 0) / 100  # Convert cents to dollars
            currency = payment_data.get('amount_money', {}).get('currency')
            note = payment_data.get('note', '')
            
            # Build description field
            description_parts = []
            if note:
                description_parts.append(note)
            if event_type:
                description_parts.append(f"{event_type.capitalize()} payment")
            if not description_parts:
                description_parts.append("Square payment")
                
            description = " - ".join(description_parts)
            
            # Try to build valid metadata structure if possible
            # Based on the database validation requirements, we need:
            # - transaction_details.processor_response
            # - transaction_details.authorization_code
            # - payment_method.type
            # - payment_method.last_four
            metadata = None
            
            # Extract card details if available
            card_details = payment_data.get('card_details', {})
            card = card_details.get('card', {})
            card_brand = card.get('card_brand', '')
            last_4 = card.get('last_4', '')
            
            # Only create metadata if we have sufficient card details
            if card_brand and last_4:
                # Create properly structured metadata that will pass validation
                metadata = {
                    "transaction_details": {
                        "processor_response": payment_data.get('receipt_number', payment_id),
                        "authorization_code": payment_data.get('id', '')
                    },
                    "payment_method": {
                        "type": card_brand.lower() if card_brand else "square",
                        "last_four": last_4
                    },
                    # Add additional fields that won't affect validation
                    "square_payment_id": payment_id,
                    "event_type": event_type,
                    "event_id": event_id,
                    "team_id": team_id
                }
                logger.info("Created structured metadata that should pass validation")
            else:
                # Use NULL metadata which passes validation
                logger.info("Using NULL metadata (insufficient card details available)")
                metadata = None
            
            # Create payment record
            payment_record = {
                'user_id': user_id,
                'amount': amount,
                'currency': currency,
                'status': status,
                'payment_method': 'square',
                'payment_id': payment_id,
                'description': description,
                'metadata': metadata  # Could be structured or NULL
            }
            
            logger.info(f"Storing payment in database: {json.dumps(payment_record, default=str)}")
            
            # Using direct REST API call to Supabase
            headers = {
                'apikey': self.supabase_key,
                'Authorization': f'Bearer {self.supabase_key}',
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            }
            
            response = requests.post(
                f"{self.supabase_url}/rest/v1/payments",
                headers=headers,
                json=payment_record
            )
            
            if response.status_code in (200, 201):
                data = response.json()
                logger.info(f"Payment successfully stored in database! ID: {data[0].get('id') if data else 'Unknown'}")
                return True
            else:
                logger.error(f"Failed to store payment in database: {response.status_code}, {response.text}")
                
                # If we tried to use structured metadata and it failed, try again with NULL
                if metadata is not None:
                    logger.info("Structured metadata failed validation, retrying with NULL metadata")
                    payment_record['metadata'] = None
                    
                    retry_response = requests.post(
                        f"{self.supabase_url}/rest/v1/payments",
                        headers=headers,
                        json=payment_record
                    )
                    
                    if retry_response.status_code in (200, 201):
                        retry_data = retry_response.json()
                        logger.info(f"Payment successfully stored with NULL metadata! ID: {retry_data[0].get('id') if retry_data else 'Unknown'}")
                        return True
                    else:
                        logger.error(f"Retry with NULL metadata also failed: {retry_response.status_code}, {retry_response.text}")
                
                return False
                
        except Exception as e:
            logger.exception(f"Database error: {e}")
            return False
    
    def process_payment(self, source_id, amount, user_id, currency="USD", note=None,
                      event_type=None, event_id=None, team_id=None, reference_id=None):
        """
        Process a complete payment flow: create payment and store in database.
        
        Args:
            source_id (str): The source ID (card nonce)
            amount (float): Payment amount in dollars
            user_id (str): The user ID (UUID)
            currency (str): Currency code (default: USD)
            note (str): Optional payment note
            event_type (str): Optional event type (e.g., 'league', 'tournament')
            event_id (str): Optional event ID
            team_id (str): Optional team ID
            reference_id (str): Optional reference ID
            
        Returns:
            dict: Result containing success status and payment details
        """
        # Step 1: Create payment with Square
        payment_data = self.create_payment(
            source_id=source_id,
            amount=amount,
            currency=currency,
            note=note,
            reference_id=reference_id
        )
        
        if not payment_data:
            return {
                "success": False,
                "message": "Failed to create payment with Square",
                "payment": None
            }
        
        # Step 2: Store payment in database
        db_success = self.store_payment_in_database(
            payment_data=payment_data,
            user_id=user_id,
            event_type=event_type,
            event_id=event_id,
            team_id=team_id
        )
        
        return {
            "success": True,
            "database_stored": db_success,
            "message": "Payment processed successfully",
            "payment": payment_data
        }


# Example usage
if __name__ == "__main__":
    # Test the payment handler
    handler = SquarePaymentHandler()
    
    # Test with a sandbox nonce
    result = handler.process_payment(
        source_id="cnon:card-nonce-ok",  # Test nonce for sandbox
        amount=150.00,
        user_id="ecac78cd-e1a9-484a-a55e-4da6aa6c103a",
        note="Test payment for team registration",
        event_type="league",
        event_id="test-league-id",
        team_id="test-team-id"
    )
    
    if result["success"]:
        print("\n✅ Payment successful!")
        print(f"Payment ID: {result['payment'].get('id')}")
        print(f"Status: {result['payment'].get('status')}")
        print(f"Amount: ${result['payment'].get('amount_money', {}).get('amount', 0)/100:.2f}")
        print(f"Database stored: {'Yes' if result['database_stored'] else 'No'}")
    else:
        print("\n❌ Payment failed!")
        print(f"Message: {result['message']}") 