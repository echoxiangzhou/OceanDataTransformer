from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum

class AlgorithmCategory(str, Enum):
    VISUALIZATION = "visualization"
    TERRAIN_INVERSION = "terrain_inversion"
    DATA_PROCESSING = "data_processing"
    QUALITY_CONTROL = "quality_control"

class AlgorithmStatus(str, Enum):
    REGISTERED = "registered"
    VALIDATED = "validated"
    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"

class ExecutionStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class AlgorithmBase(BaseModel):
    name: str
    category: AlgorithmCategory
    description: str
    version: str = "1.0.0"
    docker_image: str
    input_schema: Optional[Dict[str, Any]] = None
    output_schema: Optional[Dict[str, Any]] = None
    dependencies: Optional[List[str]] = None
    tags: Optional[List[str]] = None

class AlgorithmCreate(AlgorithmBase):
    python_code: Optional[str] = None
    dockerfile_content: Optional[str] = None

class AlgorithmUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    version: Optional[str] = None
    status: Optional[AlgorithmStatus] = None
    docker_image: Optional[str] = None
    input_schema: Optional[Dict[str, Any]] = None
    output_schema: Optional[Dict[str, Any]] = None

class AlgorithmResponse(AlgorithmBase):
    id: int
    status: AlgorithmStatus
    created_at: datetime
    updated_at: datetime
    execution_count: int = 0
    last_executed: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class AlgorithmExecutionRequest(BaseModel):
    input_data: Dict[str, Any]
    parameters: Optional[Dict[str, Any]] = None
    output_path: Optional[str] = None

class AlgorithmExecutionResponse(BaseModel):
    id: int
    algorithm_id: int
    status: ExecutionStatus
    progress: float = 0.0
    input_data: Dict[str, Any]
    output_data: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    logs: Optional[List[str]] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True