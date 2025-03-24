#!/usr/bin/env python
"""
Test module for Square webhook processing.
This module contains tests for the webhook handler, especially for team transfers.
"""

import os
import json
import logging
import uuid
import pytest
from fastapi import Request, BackgroundTasks
from unittest.mock import AsyncMock, MagicMock, patch

from routes.webhooks import handle_square_webhook, process_request_update
from services.request_service import RequestService

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Sample webhook payload for a completed payment
SAMPLE_PAYMENT_WEBHOOK = {
    "merchant_id": "MLDE92SSPPR26",
    "type": "payment.updated",
    "event_id": "test-event-id-123",
    "created_at": "2025-03-24T06:34:09.909Z",
    "data": {
        "type": "payment",
        "id": "test-payment-id-123",
        "object": {
            "payment": {
                "id": "test-payment-id-123",
                "status": "COMPLETED",
                "reference_id": "1002-5eaab34540354536a5d2938926a8b4da",
                "note": "Transfer ownership of TestTeam to TestUser",
                "amount_money": {
                    "amount": 1500,
                    "currency": "USD"
                },
                "card_details": {
                    "card": {
                        "last_4": "1111",
                        "card_brand": "VISA"
                    },
                    "status": "CAPTURED"
                }
            }
        }
    }
}

# Utility function to create a mocked request with the webhook payload
async def create_mocked_request():
    request = MagicMock(spec=Request)
    request.body = AsyncMock(return_value=json.dumps(SAMPLE_PAYMENT_WEBHOOK).encode('utf-8'))
    request.json = AsyncMock(return_value=SAMPLE_PAYMENT_WEBHOOK)
    return request

# Utility function to create a mocked Request Service
def create_mocked_request_service():
    # Create a team change request record for our test
    team_change_request = {
        "id": "5eaab345-4035-4536-a5d2-938926a8b4da",
        "team_id": "test-team-id-123",
        "request_type": "team_transfer",
        "requested_by": "test-requestor-id-123",
        "status": "pending",
        "payment_reference": "test-payment-id-123",
        "old_value": "test-old-captain-id-123",
        "new_value": "test-new-captain-id-123",
        "metadata": {
            "teamName": "TestTeam",
            "oldCaptainName": "OldCaptain",
            "newCaptainName": "NewCaptain"
        },
        "processing_attempts": 0
    }
    
    # Create mock execute results
    select_mock_result = MagicMock()
    select_mock_result.data = [team_change_request]
    select_mock_result.error = None
    
    update_mock_result = MagicMock()
    update_mock_result.data = [{"status": "success"}]
    update_mock_result.error = None
    
    rpc_mock_result = MagicMock()
    rpc_mock_result.data = {"success": True}
    rpc_mock_result.error = None
    
    # Create the supabase mock with improved handling of table method
    supabase_mock = MagicMock()
    
    # Track update calls for assertion
    update_calls = []
    
    # Create a custom table method that tracks calls
    def custom_table(table_name):
        table_mock = MagicMock()
        
        def custom_update(data):
            update_calls.append(data)
            update_mock = MagicMock()
            update_mock.eq.return_value.execute = AsyncMock(return_value=update_mock_result)
            return update_mock
        
        table_mock.update = custom_update
        table_mock.select = MagicMock(return_value=table_mock)
        table_mock.eq = MagicMock(return_value=table_mock)
        table_mock.execute = AsyncMock(return_value=select_mock_result)
        
        return table_mock
    
    supabase_mock.table = custom_table
    
    # Set up rpc mock
    supabase_mock.rpc = MagicMock()
    supabase_mock.rpc.return_value.execute = AsyncMock(return_value=rpc_mock_result)
    
    # Create RequestService mock
    request_service = MagicMock(spec=RequestService)
    request_service.supabase = supabase_mock
    request_service.update_calls = update_calls  # Store update calls for testing
    
    return request_service

@pytest.mark.asyncio
async def test_webhook_handler():
    """Test the Square webhook handler for team transfers"""
    # Arrange
    request = await create_mocked_request()
    background_tasks = MagicMock(spec=BackgroundTasks)
    request_service = create_mocked_request_service()
    
    # Act
    result = await handle_square_webhook(request, background_tasks, request_service)
    
    # Assert
    assert result["status"] == "success"
    assert "processing request" in result["message"]
    assert background_tasks.add_task.called
    
    # Verify the correct task was queued
    args, kwargs = background_tasks.add_task.call_args
    assert args[0] == process_request_update
    assert args[1] == "5eaab345-4035-4536-a5d2-938926a8b4da"
    assert args[2] == "approved"

@pytest.mark.asyncio
async def test_process_request_update():
    """Test the process_request_update function for team transfers"""
    # Arrange
    request_id = "5eaab345-4035-4536-a5d2-938926a8b4da"
    status = "approved"
    webhook_data = SAMPLE_PAYMENT_WEBHOOK
    request_service = create_mocked_request_service()
    
    # Act
    await process_request_update(request_id, status, webhook_data, request_service)
    
    # Simplified testing approach - just verify we called RPC with the right function
    rpc_calls = [call for call in request_service.supabase.method_calls if call[0] == 'rpc']
    assert len(rpc_calls) > 0, "No RPC calls were made"
    
    # Check if admin_transfer_team_ownership was called
    admin_transfer_calls = [call for call in rpc_calls if call[1][0] == 'admin_transfer_team_ownership']
    assert len(admin_transfer_calls) > 0, "admin_transfer_team_ownership was not called"

if __name__ == "__main__":
    print("Running webhook tests...")
    pytest.main(["-xvs", __file__]) 