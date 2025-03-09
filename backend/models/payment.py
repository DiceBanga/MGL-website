from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class Payment(BaseModel):
    id: str
    amount: float
    currency: str = "USD"
    status: str
    source_id: str
    location_id: str
    reference_id: Optional[str] = None
    note: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        orm_mode = True 