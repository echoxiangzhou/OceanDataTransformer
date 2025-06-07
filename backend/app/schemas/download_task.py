from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum

class TaskStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class DownloadTaskBase(BaseModel):
    source_id: int
    save_path: str
    filename_pattern: Optional[str] = None
    max_retries: int = 3
    timeout: int = 300  # seconds

class DownloadTaskCreate(DownloadTaskBase):
    pass

class DownloadTaskUpdate(BaseModel):
    status: Optional[TaskStatus] = None
    progress: Optional[float] = None
    error_message: Optional[str] = None

class DownloadTaskResponse(DownloadTaskBase):
    id: int
    status: TaskStatus
    progress: float = 0.0
    file_size: Optional[int] = None
    downloaded_size: Optional[int] = None
    error_message: Optional[str] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    task_metadata: Optional[Dict[str, Any]] = None
    
    class Config:
        from_attributes = True