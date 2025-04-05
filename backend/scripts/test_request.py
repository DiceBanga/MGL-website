#!/usr/bin/env python
"""
Test utility for the request service
Usage:
    python test_request.py team_rebrand --team-id TEAM_ID --user-id USER_ID [--options]
    python test_request.py team_transfer --team-id TEAM_ID --user-id USER_ID --new-captain NEW_CAPTAIN_ID [--options]
"""
import os
import sys
import json
import uuid
import logging
import argparse
from datetime import datetime
import asyncio

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set up logging
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Import Supabase client and other services
from database import create_supabase_client
from services.payment_service import PaymentService
from services.request_service import RequestService

async def get_item_id(supabase, item_name):
    """Get item ID for a given item name"""
    try:
        # Query items table for the item ID
        query = supabase.table("items").select("id").eq("item_name", item_name)
        response = query.execute()
        
        if not response.data:
            logger.error(f"No item found with name: {item_name}")
            return None
            
        logger.info(f"Found item ID for {item_name}: {response.data[0]['id']}")
        return response.data[0]['id']
    except Exception as e:
        logger.error(f"Error getting item ID: {str(e)}")
        return None

async def test_team_rebrand(args):
    """Test team rebrand request"""
    supabase = create_supabase_client()
    payment_service = PaymentService(supabase)
    request_service = RequestService(supabase, payment_service)
    
    team_id = args.team_id
    user_id = args.user_id
    new_name = args.new_name
    
    # Get current team name
    team_query = supabase.table("teams").select("name").eq("id", team_id)
    team_response = team_query.execute()
    
    if not team_response.data:
        logger.error(f"No team found with ID: {team_id}")
        return
        
    old_name = team_response.data[0]["name"]
    
    # Get item ID for team rebrand
    item_id = await get_item_id(supabase, "Team Rebrand")
    if not item_id:
        logger.error("Could not find item ID for Team Rebrand")
        return
    
    # Create request data
    request_id = str(uuid.uuid4())
    request_data = {
        "request_id": request_id,
        "request_type": "team_rebrand",
        "team_id": team_id,
        "requested_by": user_id,
        "old_name": old_name,
        "new_name": new_name,
        "item_id": item_id,
        "requires_payment": args.requires_payment,
        "metadata": {
            "note": "Test request from utility script",
            "logo_url": args.logo_url if args.logo_url else None
        }
    }
    
    # Add payment data if required
    if args.requires_payment:
        request_data["payment_data"] = {
            "amount": args.amount if args.amount else 20,
            "metadata": {
                "request_id": request_id,
                "request_type": "team_rebrand",
                "team_id": team_id,
                "old_name": old_name,
                "new_name": new_name,
                "item_id": item_id
            }
        }
    
    logger.info(f"Sending test request: {json.dumps(request_data, indent=2)}")
    
    try:
        # Process the request
        result = await request_service.process_request(request_data)
        logger.info(f"Request processed successfully: {json.dumps(result, indent=2)}")
        
        # Check the result in the database
        query = supabase.table("team_change_requests").select("*").eq("id", request_id)
        response = query.execute()
        
        if response.data:
            logger.info(f"Request record created: {json.dumps(response.data[0], indent=2)}")
        else:
            logger.warning(f"No request record found with ID: {request_id}")
        
        return result
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        return None

async def test_team_transfer(args):
    """Test team transfer request"""
    supabase = create_supabase_client()
    payment_service = PaymentService(supabase)
    request_service = RequestService(supabase, payment_service)
    
    team_id = args.team_id
    user_id = args.user_id
    new_captain_id = args.new_captain
    
    # Get current team info
    team_query = supabase.table("teams").select("captain_id").eq("id", team_id)
    team_response = team_query.execute()
    
    if not team_response.data:
        logger.error(f"No team found with ID: {team_id}")
        return
        
    old_captain_id = team_response.data[0]["captain_id"]
    
    # Get item ID for team transfer
    item_id = await get_item_id(supabase, "Team Transfer")
    if not item_id:
        logger.error("Could not find item ID for Team Transfer")
        return
    
    # Create request data
    request_id = str(uuid.uuid4())
    request_data = {
        "request_id": request_id,
        "request_type": "team_transfer",
        "team_id": team_id,
        "requested_by": user_id,
        "old_captain_id": old_captain_id,
        "new_captain_id": new_captain_id,
        "item_id": item_id,
        "requires_payment": args.requires_payment,
        "metadata": {
            "note": "Test request from utility script"
        }
    }
    
    # Add payment data if required
    if args.requires_payment:
        request_data["payment_data"] = {
            "amount": args.amount if args.amount else 15,
            "metadata": {
                "request_id": request_id,
                "request_type": "team_transfer",
                "team_id": team_id,
                "old_captain_id": old_captain_id,
                "new_captain_id": new_captain_id,
                "item_id": item_id
            }
        }
    
    logger.info(f"Sending test request: {json.dumps(request_data, indent=2)}")
    
    try:
        # Process the request
        result = await request_service.process_request(request_data)
        logger.info(f"Request processed successfully: {json.dumps(result, indent=2)}")
        
        # Check the result in the database
        query = supabase.table("team_change_requests").select("*").eq("id", request_id)
        response = query.execute()
        
        if response.data:
            logger.info(f"Request record created: {json.dumps(response.data[0], indent=2)}")
        else:
            logger.warning(f"No request record found with ID: {request_id}")
        
        return result
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        return None

def parse_args():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description="Test Request Service")
    subparsers = parser.add_subparsers(dest="request_type", help="Request type to test")
    
    # Team Rebrand
    rebrand_parser = subparsers.add_parser("team_rebrand", help="Test team rebrand request")
    rebrand_parser.add_argument("--team-id", required=True, help="Team ID")
    rebrand_parser.add_argument("--user-id", required=True, help="User ID")
    rebrand_parser.add_argument("--new-name", required=True, help="New team name")
    rebrand_parser.add_argument("--logo-url", help="Logo URL")
    rebrand_parser.add_argument("--requires-payment", action="store_true", help="Whether the request requires payment")
    rebrand_parser.add_argument("--amount", type=int, default=20, help="Payment amount")
    
    # Team Transfer
    transfer_parser = subparsers.add_parser("team_transfer", help="Test team transfer request")
    transfer_parser.add_argument("--team-id", required=True, help="Team ID")
    transfer_parser.add_argument("--user-id", required=True, help="User ID")
    transfer_parser.add_argument("--new-captain", required=True, help="New captain ID")
    transfer_parser.add_argument("--requires-payment", action="store_true", help="Whether the request requires payment")
    transfer_parser.add_argument("--amount", type=int, default=15, help="Payment amount")
    
    return parser.parse_args()

async def main():
    """Main entry point"""
    args = parse_args()
    
    if args.request_type == "team_rebrand":
        await test_team_rebrand(args)
    elif args.request_type == "team_transfer":
        await test_team_transfer(args)
    else:
        logger.error(f"Unknown request type: {args.request_type}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main()) 