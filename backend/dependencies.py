from fastapi import Depends
from typing import Optional
import os

from .services.request_service import RequestService
from .services.payment_service import PaymentService

# Global instances
_request_service: Optional[RequestService] = None

async def get_request_service():
    """
    Get or create a RequestService instance
    """
    global _request_service
    
    if _request_service is None:
        from main import supabase_client, square_client
        
        # Get environment variables
        square_location_id = os.environ.get("SQUARE_LOCATION_ID")
        square_app_id = os.environ.get("SQUARE_APP_ID")
        
        # Create payment service
        payment_service = PaymentService(
            square_client=square_client,
            supabase=supabase_client,
            square_location_id=square_location_id,
            square_app_id=square_app_id
        )
        
        # Create request service
        _request_service = RequestService(
            supabase=supabase_client,
            payment_service=payment_service
        )
    
    return _request_service 