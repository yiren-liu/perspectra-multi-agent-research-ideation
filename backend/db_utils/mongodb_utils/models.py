from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class UserLog(BaseModel):
    user: str
    session_id: str
    type: str
    log_body: dict
    client_name: str
    timestamp: datetime