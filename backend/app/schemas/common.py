from pydantic import BaseModel
from typing import Optional, Any, Dict, List, TypeVar, Generic
from datetime import datetime
from enum import Enum

T = TypeVar('T')

class MessageResponse(BaseModel):
    message: str
    
class PaginationParams(BaseModel):
    page: int = 1
    size: int = 20
    
class StatusResponse(BaseModel):
    status: str
    message: Optional[str] = None

class ErrorDetail(BaseModel):
    """Structured error information"""
    code: str
    message: str
    field: Optional[str] = None
    context: Optional[Dict[str, Any]] = None

class ValidationResult(BaseModel):
    """Validation result with detailed feedback"""
    is_valid: bool
    errors: List[ErrorDetail] = []
    warnings: List[ErrorDetail] = []
    
class StandardResponse(BaseModel, Generic[T]):
    """Standardized API response format"""
    success: bool
    data: Optional[T] = None
    error: Optional[ErrorDetail] = None
    timestamp: datetime = datetime.utcnow()
    message: Optional[str] = None
    
class PaginatedResponse(StandardResponse[T]):
    """Paginated response format"""
    total: int
    page: int
    page_size: int
    has_next: bool
    has_prev: bool

class ProgressUpdate(BaseModel):
    """Progress tracking for long-running operations"""
    task_id: str
    status: str
    progress: float  # 0.0 to 100.0
    message: Optional[str] = None
    estimated_completion: Optional[datetime] = None
    error: Optional[ErrorDetail] = None