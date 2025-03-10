#!/usr/bin/env python
"""
Square Environment Setup Helper

This script helps you set up your Square API credentials properly.
It will update your .env file with the values you provide.
"""

import os
import re
from dotenv import load_dotenv

def update_env_file(app_id, access_token, location_id):
    """Update the .env file with the provided Square credentials."""
    # Load current .env file
    env_path = '.env'
    if not os.path.exists(env_path):
        print(f"Creating new .env file at {os.path.abspath(env_path)}")
        with open(env_path, 'w') as f:
            f.write("# Square API credentials for sandbox testing\n")
    
    # Read existing content
    with open(env_path, 'r') as f:
        content = f.read()
    
    # Update or add Square credentials
    patterns = {
        'SQUARE_APP_ID': (r'SQUARE_APP_ID=.*', f'SQUARE_APP_ID={app_id}'),
        'SQUARE_ACCESS_TOKEN': (r'SQUARE_ACCESS_TOKEN=.*', f'SQUARE_ACCESS_TOKEN={access_token}'),
        'SQUARE_LOCATION_ID': (r'SQUARE_LOCATION_ID=.*', f'SQUARE_LOCATION_ID={location_id}'),
        'SQUARE_ENVIRONMENT': (r'SQUARE_ENVIRONMENT=.*', 'SQUARE_ENVIRONMENT=sandbox')
    }
    
    for key, (pattern, replacement) in patterns.items():
        if re.search(pattern, content):
            content = re.sub(pattern, replacement, content)
        else:
            content += f"\n{replacement}"
    
    # Write updated content back to .env file
    with open(env_path, 'w') as f:
        f.write(content)
    
    print(f"Successfully updated {env_path} with Square credentials.")

def main():
    print("""
╔════════════════════════════════════════════════════════════╗
║                Square API Setup Assistant                  ║
╚════════════════════════════════════════════════════════════╝

This script will help you set up your Square API credentials for testing.
You'll need to get these from your Square Developer Dashboard.

Follow these steps:

1. Go to https://developer.squareup.com/apps
2. Sign in to your Square account (or create one if needed)
3. Select your application or create a new one
4. Make sure "Sandbox" is selected at the top of the page
5. Go to the "Credentials" tab
6. Copy the values for:
   - Application ID
   - Access Token
   - Location ID
""")

    app_id = input("\nEnter your Sandbox Application ID: ").strip()
    access_token = input("Enter your Sandbox Access Token: ").strip()
    location_id = input("Enter your Sandbox Location ID: ").strip()
    
    if not all([app_id, access_token, location_id]):
        print("Error: All values are required to continue.")
        return
    
    print("\nYou entered:")
    print(f"Application ID: {app_id}")
    print(f"Access Token: {access_token[:6]}...{access_token[-4:] if len(access_token) > 10 else ''}")
    print(f"Location ID: {location_id}")
    
    confirm = input("\nIs this correct? (y/n): ").strip().lower()
    
    if confirm == 'y':
        update_env_file(app_id, access_token, location_id)
        print("\nNow run 'python check_square_config.py' to verify your configuration.")
    else:
        print("\nSetup cancelled. Please run this script again with the correct values.")

if __name__ == "__main__":
    main() 