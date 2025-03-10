#!/usr/bin/env python
"""
Check Square API Configuration

This script verifies that your Square API credentials are properly configured
and can connect to the Square API.
"""

import os
import json
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

def check_square_configuration():
    """
    Verify Square API configuration and test connection.
    """
    # Check environment variables
    square_access_token = os.getenv('SQUARE_ACCESS_TOKEN')
    square_location_id = os.getenv('SQUARE_LOCATION_ID')
    square_environment = os.getenv('SQUARE_ENVIRONMENT', 'sandbox')
    
    print("=== Square API Configuration Check ===")
    
    # Check for required environment variables
    if not square_access_token:
        print("❌ SQUARE_ACCESS_TOKEN is missing from .env file")
        return False
    else:
        print("✅ SQUARE_ACCESS_TOKEN is configured")
    
    if not square_location_id:
        print("❌ SQUARE_LOCATION_ID is missing from .env file")
        return False
    else:
        print("✅ SQUARE_LOCATION_ID is configured")
    
    print(f"🔍 Square environment set to: {square_environment}")
    
    # Test API connection
    try:
        client = Client(
            access_token=square_access_token,
            environment=square_environment
        )
        
        print("🔄 Testing connection to Square API...")
        
        # List locations to verify connection
        result = client.locations.list_locations()
        
        if result.is_success():
            locations = result.body.get('locations', [])
            print(f"✅ Successfully connected to Square API")
            print(f"📍 Found {len(locations)} location(s)")
            
            # Check if our configured location ID exists
            location_ids = [loc['id'] for loc in locations]
            if square_location_id in location_ids:
                print(f"✅ Configured SQUARE_LOCATION_ID is valid")
                
                # Print location details
                for location in locations:
                    if location['id'] == square_location_id:
                        print(f"\nLocation Details:")
                        print(f"  Name: {location.get('name', 'N/A')}")
                        print(f"  Type: {location.get('type', 'N/A')}")
                        print(f"  Status: {location.get('status', 'N/A')}")
                        
                        address = location.get('address', {})
                        if address:
                            print(f"  Address: {address.get('address_line_1', '')}, "
                                 f"{address.get('locality', '')}, "
                                 f"{address.get('administrative_district_level_1', '')} "
                                 f"{address.get('postal_code', '')}")
                        
                        print(f"  Currency: {location.get('currency', 'N/A')}")
                        break
            else:
                print(f"❌ Configured SQUARE_LOCATION_ID is not found in your Square account")
                print(f"   Available location IDs: {', '.join(location_ids)}")
            
            return True
        elif result.is_error():
            errors = result.errors
            print(f"❌ Failed to connect to Square API: {errors}")
            return False
    except Exception as e:
        print(f"❌ Error connecting to Square API: {e}")
        logger.exception("Error during Square API connection test")
        return False

def main():
    successful = check_square_configuration()
    
    if successful:
        print("\n🟢 Your Square API configuration appears to be correct!")
        print("   You should be able to process test payments.")
    else:
        print("\n🔴 Your Square API configuration has issues that need to be fixed.")
        print("   Please check the error messages above.")

if __name__ == "__main__":
    main() 