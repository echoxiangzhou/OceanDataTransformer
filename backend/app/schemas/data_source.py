from pydantic import BaseModel, HttpUrl
from typing import Optional
from datetime import datetime

class DataSourceBase(BaseModel):
    name: str
    url: str
    description: Optional[str] = None
    protocol: str = "HTTP"  # HTTP, FTP, SFTP
    auth_required: bool = False
    username: Optional[str] = None
    password: Optional[str] = None

class DataSourceCreate(DataSourceBase):
    pass

class DataSourceUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    description: Optional[str] = None
    protocol: Optional[str] = None
    auth_required: Optional[bool] = None
    username: Optional[str] = None
    password: Optional[str] = None

class DataSourceResponse(DataSourceBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    is_active: bool = True
    
    class Config:
        from_attributes = True