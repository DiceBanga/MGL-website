#!/usr/bin/env python
"""
Utility script to manually process pending team transfers.

This script can be used to process specific pending transfers by ID or all pending transfers.
It uses the same approach as the webhook handler to call the admin_transfer_team_ownership function.

Usage:
    python process_pending_transfers.py [--all] [--request-id REQUEST_ID]

Options:
    --all           Process all pending team transfer requests
    --request-id    Process a specific team transfer request by ID
"""

import os
import sys
import argparse
import asyncio
import logging
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Supabase configuration
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_ANON_KEY') or os.getenv('SUPABASE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    logger.error("Missing required environment variables (SUPABASE_URL and SUPABASE_ANON_KEY)")
    sys.exit(1)

# Initialize Supabase client
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

async def process_single_transfer(request_id: str):
    """Process a single team transfer request by ID"""
    logger.info(f"Processing team transfer request: {request_id}")
    
    try:
        # Get request details
        response = supabase.table("team_change_requests").select("*").eq("id", request_id).execute()
        
        # Check if data is available
        data = getattr(response, 'data', None)
        if not data or len(data) == 0:
            logger.error(f"Request with ID {request_id} not found")
            return False
        
        request = data[0]
        
        # Verify this is a team transfer request
        if request.get('request_type') != 'team_transfer':
            logger.error(f"Request {request_id} is not a team transfer request (type: {request.get('request_type')})")
            return False
        
        # Check if request is already processed
        if request.get('status') == 'completed':
            logger.info(f"Request {request_id} is already completed (processed at {request.get('processed_at')})")
            return True
        
        # Get required parameters
        team_id = request.get('team_id')
        new_captain_id = request.get('new_value')
        old_captain_id = request.get('old_value')  # Get old captain ID
        
        if not team_id or not new_captain_id or not old_captain_id:
            logger.error(f"Missing required parameters: team_id={team_id}, new_captain_id={new_captain_id}, old_captain_id={old_captain_id}")
            return False
        
        # Execute the team transfer
        logger.info(f"Executing team transfer: team_id={team_id}, new_captain_id={new_captain_id}, old_captain_id={old_captain_id}")
        
        # Update request status to processing
        update_result = supabase.table("team_change_requests").update({
            "status": "processing",
            "updated_at": datetime.now().isoformat()
        }).eq("id", request_id).execute()
        
        # Continue even if update fails
        
        # Call the admin_transfer_team_ownership function
        try:
            # Execute the RPC with correct parameter names
            rpc_result = supabase.rpc(
                'admin_transfer_team_ownership',
                {
                    'p_team_id': team_id,
                    'p_new_captain_id': new_captain_id,
                    'p_old_captain_id': old_captain_id
                }
            ).execute()
            
            # Check for errors in RPC result
            rpc_error = getattr(rpc_result, 'error', None)
            if rpc_error:
                logger.error(f"Error executing team transfer: {rpc_error}")
                
                # Update request with error
                error_update = supabase.table("team_change_requests").update({
                    "status": "failed",
                    "last_error": str(rpc_error),
                    "processing_attempts": request.get('processing_attempts', 0) + 1
                }).eq("id", request_id).execute()
                
                return False
            
            logger.info(f"Team transfer executed successfully")
            
        except Exception as e:
            logger.error(f"Exception during team transfer execution: {str(e)}")
            
            # Update request with error
            error_update = supabase.table("team_change_requests").update({
                "status": "failed",
                "last_error": str(e),
                "processing_attempts": request.get('processing_attempts', 0) + 1
            }).eq("id", request_id).execute()
            
            return False
        
        # Update request status to completed
        complete_result = supabase.table("team_change_requests").update({
            "status": "completed",
            "processed_at": datetime.now().isoformat()
        }).eq("id", request_id).execute()
        
        # Check for errors in update result, but continue on error
        complete_error = getattr(complete_result, 'error', None)
        if complete_error:
            logger.error(f"Error updating request status to completed: {complete_error}")
            # Team transfer was successful but status update failed
            return True
        
        logger.info(f"Successfully processed team transfer request {request_id}")
        return True
        
    except Exception as e:
        logger.error(f"Error processing team transfer request {request_id}: {str(e)}")
        return False

async def process_all_transfers():
    """Process all pending team transfer requests"""
    logger.info("Processing all pending team transfers")
    
    try:
        # Get all pending team transfer requests
        response = supabase.table("team_change_requests").select("id").eq("request_type", "team_transfer").eq("status", "pending").execute()
        
        # Check if data is available
        data = getattr(response, 'data', None)
        if not data:
            logger.info("No pending team transfers found")
            return True
        
        request_ids = [request.get('id') for request in data]
        logger.info(f"Found {len(request_ids)} pending team transfer requests")
        
        # Process each request
        success_count = 0
        for request_id in request_ids:
            success = await process_single_transfer(request_id)
            if success:
                success_count += 1
        
        logger.info(f"Successfully processed {success_count} of {len(request_ids)} team transfer requests")
        return True
        
    except Exception as e:
        logger.error(f"Error processing pending team transfers: {str(e)}")
        return False

async def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="Process team transfers")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--all", action="store_true", help="Process all pending team transfers")
    group.add_argument("--request-id", type=str, help="Process a specific team transfer request by ID")
    
    args = parser.parse_args()
    
    if args.all:
        success = await process_all_transfers()
    else:
        success = await process_single_transfer(args.request_id)
    
    if success:
        logger.info("Processing completed successfully")
    else:
        logger.error("Processing completed with errors")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main()) 