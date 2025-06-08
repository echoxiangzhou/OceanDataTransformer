from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum


class ConversionStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class NCFileBase(BaseModel):
    original_filename: str
    original_format: str
    title: Optional[str] = None
    institution: Optional[str] = None
    source: Optional[str] = None
    comment: Optional[str] = None


class NCFileCreate(NCFileBase):
    file_path: str
    file_size: Optional[int] = None
    conversion_parameters: Optional[Dict[str, Any]] = None


class NCFileUpdate(BaseModel):
    converted_filename: Optional[str] = None
    conversion_status: Optional[ConversionStatus] = None
    title: Optional[str] = None
    institution: Optional[str] = None
    source: Optional[str] = None
    history: Optional[str] = None
    references: Optional[str] = None
    comment: Optional[str] = None
    latitude_min: Optional[float] = None
    latitude_max: Optional[float] = None
    longitude_min: Optional[float] = None
    longitude_max: Optional[float] = None
    depth_min: Optional[float] = None
    depth_max: Optional[float] = None
    time_coverage_start: Optional[datetime] = None
    time_coverage_end: Optional[datetime] = None
    variables: Optional[Dict[str, Any]] = None
    dimensions: Optional[Dict[str, Any]] = None
    is_cf_compliant: Optional[bool] = None
    quality_flags: Optional[Dict[str, Any]] = None
    data_quality_score: Optional[float] = None
    processing_log: Optional[str] = None
    error_message: Optional[str] = None


class NCFileResponse(NCFileBase):
    id: int
    converted_filename: Optional[str] = None
    file_size: Optional[int] = None
    file_path: str
    conversion_status: ConversionStatus
    
    # Geospatial metadata
    latitude_min: Optional[float] = None
    latitude_max: Optional[float] = None
    longitude_min: Optional[float] = None
    longitude_max: Optional[float] = None
    depth_min: Optional[float] = None
    depth_max: Optional[float] = None
    
    # Temporal metadata
    time_coverage_start: Optional[datetime] = None
    time_coverage_end: Optional[datetime] = None
    
    # Data info
    variables: Optional[Dict[str, Any]] = None
    dimensions: Optional[Dict[str, Any]] = None
    
    # CF1.8 compliance
    cf_version: str = "CF-1.8"
    conventions: str = "CF-1.8"
    is_cf_compliant: bool = False
    
    # Quality info
    data_quality_score: Optional[float] = None
    
    # Timestamps
    created_at: datetime
    updated_at: Optional[datetime] = None
    processed_at: Optional[datetime] = None
    
    # Processing info
    error_message: Optional[str] = None
    
    class Config:
        from_attributes = True


class ConversionTaskBase(BaseModel):
    original_filename: str
    original_format: str
    target_format: str = "CF1.8"
    conversion_options: Optional[Dict[str, Any]] = None


class ConversionTaskCreate(ConversionTaskBase):
    original_file_path: str


class ConversionTaskUpdate(BaseModel):
    status: Optional[ConversionStatus] = None
    progress: Optional[float] = None
    error_message: Optional[str] = None
    nc_file_id: Optional[int] = None


class ConversionTaskResponse(ConversionTaskBase):
    id: int
    original_file_path: str
    status: ConversionStatus
    progress: float = 0.0
    error_message: Optional[str] = None
    nc_file_id: Optional[int] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True