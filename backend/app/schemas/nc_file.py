from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime

class NetCDFFileBase(BaseModel):
    original_filename: str
    converted_filename: str
    file_path: str
    file_size: int
    format_version: str = "CF1.8"

class NetCDFFileCreate(NetCDFFileBase):
    pass

class NetCDFFileResponse(NetCDFFileBase):
    id: int
    created_at: datetime
    dimensions: Optional[Dict[str, int]] = None
    variables: Optional[List[str]] = None
    global_attributes: Optional[Dict[str, Any]] = None
    time_range: Optional[Dict[str, str]] = None
    spatial_bounds: Optional[Dict[str, float]] = None
    
    class Config:
        from_attributes = True

class ConversionTaskBase(BaseModel):
    original_file_path: str
    target_format: str = "CF1.8"
    conversion_options: Optional[Dict[str, Any]] = None

class ConversionTaskCreate(ConversionTaskBase):
    pass

class ConversionTaskResponse(ConversionTaskBase):
    id: int
    status: str
    progress: float = 0.0
    error_message: Optional[str] = None
    netcdf_file_id: Optional[int] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True