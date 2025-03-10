#!/usr/bin/env python
"""
Examine Payments in Supabase

This script retrieves existing payment records from Supabase
to understand the required metadata structure.
"""

import os
import json
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Supabase configuration
supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_ANON_KEY')

print(f"Supabase URL: {supabase_url}")
print(f"Supabase Key: {supabase_key[:6]}... (truncated)")

def get_existing_payments():
    """Get existing payment records from Supabase."""
    headers = {
        'apikey': supabase_key,
        'Authorization': f'Bearer {supabase_key}'
    }
    
    # Get the payments table structure
    try:
        print("\nExamining payments table structure...")
        structure_url = f"{supabase_url}/rest/v1/payments?select=*&limit=0"
        structure_response = requests.get(
            structure_url, 
            headers=headers
        )
        
        if structure_response.status_code != 200:
            print(f"Error getting table structure: {structure_response.status_code}")
            print(f"Response: {structure_response.text}")
        else:
            print("Table structure query successful!")
    except Exception as e:
        print(f"Error examining table structure: {e}")
    
    # Get existing payment records
    try:
        print("\nQuerying existing payment records...")
        url = f"{supabase_url}/rest/v1/payments?select=*&limit=5"
        response = requests.get(
            url, 
            headers=headers
        )
        
        if response.status_code == 200:
            payments = response.json()
            if payments:
                print(f"Found {len(payments)} payment records!")
                
                for i, payment in enumerate(payments, 1):
                    print(f"\nPayment {i}:")
                    print(f"  ID: {payment.get('id', 'N/A')}")
                    print(f"  User ID: {payment.get('user_id', 'N/A')}")
                    print(f"  Amount: {payment.get('amount', 'N/A')} {payment.get('currency', 'N/A')}")
                    print(f"  Status: {payment.get('status', 'N/A')}")
                    print(f"  Payment Method: {payment.get('payment_method', 'N/A')}")
                    print(f"  Payment ID: {payment.get('payment_id', 'N/A')}")
                    print(f"  Created At: {payment.get('created_at', 'N/A')}")
                    
                    # Examine metadata structure
                    metadata = payment.get('metadata')
                    if metadata:
                        print("\n  Metadata structure:")
                        print(f"  Type: {type(metadata)}")
                        print(f"  Raw: {metadata}")
                        
                        # If metadata is already a dict, we can display it directly
                        if isinstance(metadata, dict):
                            print("\n  Metadata fields:")
                            for key in metadata:
                                print(f"    - {key}: {type(metadata[key])}")
                        # If it's a string, it might be JSON
                        elif isinstance(metadata, str):
                            try:
                                parsed = json.loads(metadata)
                                print("\n  Metadata fields (parsed from string):")
                                for key in parsed:
                                    print(f"    - {key}: {type(parsed[key])}")
                            except:
                                print("  Could not parse metadata as JSON")
            else:
                print("No payment records found.")
                # Create a test record with a blank/null metadata to see if it works
                create_test_record()
        else:
            print(f"Error getting payment records: {response.status_code}")
            print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error querying payments: {e}")

def create_test_record():
    """Create a test payment record with minimal data to see if it works."""
    print("\nCreating a test payment record with minimal data...")
    
    headers = {
        'apikey': supabase_key,
        'Authorization': f'Bearer {supabase_key}',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    }
    
    # Try with minimal fields and null metadata
    test_record = {
        'user_id': 'ecac78cd-e1a9-484a-a55e-4da6aa6c103a',
        'amount': 10.0,
        'currency': 'USD',
        'status': 'COMPLETED',
        'payment_method': 'test',
        'payment_id': 'test-payment-id',
        'description': 'Test payment record',
        'metadata': None  # Try with null metadata first
    }
    
    try:
        response = requests.post(
            f"{supabase_url}/rest/v1/payments",
            headers=headers,
            json=test_record
        )
        
        if response.status_code in (200, 201):
            print("\n✅ Test record created successfully!")
            print(f"Response: {json.dumps(response.json(), indent=2)}")
            return True
        else:
            print("\n❌ Failed to create test record")
            print(f"Status code: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"\n❌ Error creating test record: {e}")
        return False

if __name__ == "__main__":
    print("Examining payments in Supabase...")
    get_existing_payments()
    print("\nExamination complete!") 