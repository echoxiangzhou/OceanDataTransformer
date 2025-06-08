from pydantic import BaseModel, validator
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum

from .common import ValidationResult, ErrorDetail, ProgressUpdate


class FileType(str, Enum):
    CSV = "csv"
    TXT = "txt"
    NETCDF = "nc"
    HDF5 = "hdf5"
    TIFF = "tiff"
    GRIB = "grib"


class ColumnType(str, Enum):
    COORDINATE = "coordinate"
    VARIABLE = "variable"
    IGNORE = "ignore"


class DimensionType(str, Enum):
    TIME = "time"
    LATITUDE = "latitude"
    LONGITUDE = "longitude"
    DEPTH = "depth"
    LEVEL = "level"
    OTHER = "other"


class ColumnMapping(BaseModel):
    """Column mapping configuration for data conversion"""
    original_name: str
    type: ColumnType
    standard_name: Optional[str] = None
    dimension: Optional[DimensionType] = None
    units: Optional[str] = None
    long_name: Optional[str] = None
    description: Optional[str] = None
    
    @validator('standard_name')
    def validate_standard_name(cls, v, values):
        if values.get('type') == ColumnType.COORDINATE and not v:
            raise ValueError("Standard name required for coordinate columns")
        return v


class BasicInfo(BaseModel):
    """Basic dataset information"""
    title: Optional[str] = None
    summary: Optional[str] = None
    keywords: Optional[str] = None
    id: Optional[str] = None
    naming_authority: Optional[str] = None


class InstitutionInfo(BaseModel):
    """Institution and contact information"""
    institution: Optional[str] = None
    source: Optional[str] = None
    creator_name: Optional[str] = None
    creator_email: Optional[str] = None
    publisher_name: Optional[str] = None
    publisher_email: Optional[str] = None
    references: Optional[str] = None
    comment: Optional[str] = None


class SpatiotemporalCoverage(BaseModel):
    """Spatiotemporal coverage information"""
    geospatial_lat_min: Optional[float] = None
    geospatial_lat_max: Optional[float] = None
    geospatial_lon_min: Optional[float] = None
    geospatial_lon_max: Optional[float] = None
    geospatial_vertical_min: Optional[float] = None
    geospatial_vertical_max: Optional[float] = None
    time_coverage_start: Optional[str] = None
    time_coverage_end: Optional[str] = None
    time_coverage_duration: Optional[str] = None
    time_coverage_resolution: Optional[str] = None


class QualityInfo(BaseModel):
    """Data quality and compliance information"""
    standard_name_vocabulary: Optional[str] = "CF Standard Name Table v79"
    processing_level: Optional[str] = None
    quality_control: Optional[str] = None
    license: Optional[str] = None
    metadata_link: Optional[str] = None


class MetadataConfig(BaseModel):
    """Complete metadata configuration for import wizard"""
    basic_info: Optional[BasicInfo] = None
    institution_info: Optional[InstitutionInfo] = None
    spatiotemporal_coverage: Optional[SpatiotemporalCoverage] = None
    quality_info: Optional[QualityInfo] = None


class FileValidationRequest(BaseModel):
    """Request for file validation"""
    file_path: str
    file_type: Optional[FileType] = None
    expected_format: Optional[str] = None


class FileValidationResponse(BaseModel):
    """Response from file validation"""
    is_valid: bool
    file_type: FileType
    file_size: int
    estimated_rows: Optional[int] = None
    detected_columns: List[str] = []
    has_time_column: bool = False
    has_coordinates: bool = False
    validation_errors: List[ErrorDetail] = []
    validation_warnings: List[ErrorDetail] = []
    recommendations: List[str] = []


class DataPreviewRequest(BaseModel):
    """Request for data preview"""
    file_path: Optional[str] = None  # Optional for session-based preview
    limit: int = 100
    column_mapping: Optional[List[ColumnMapping]] = None
    metadata_config: Optional[MetadataConfig] = None


class DataPreviewResponse(BaseModel):
    """Response with data preview"""
    columns: List[str]
    sample_data: List[Dict[str, Any]]
    total_rows: int
    data_types: Dict[str, str]
    coordinate_variables: List[str] = []
    data_variables: List[str] = []
    metadata_preview: Optional[Dict[str, Any]] = None


class ConversionRequest(BaseModel):
    """Request for data conversion"""
    file_path: str
    output_path: Optional[str] = None
    column_mapping: List[ColumnMapping]
    metadata_config: MetadataConfig
    validation_options: Optional[Dict[str, Any]] = None
    force_overwrite: bool = False


class ConversionResult(BaseModel):
    """Result of data conversion"""
    success: bool
    output_path: Optional[str] = None
    nc_file_id: Optional[int] = None
    cf_compliant: bool = False
    issues_fixed: List[str] = []
    remaining_issues: List[ErrorDetail] = []
    quality_score: Optional[float] = None
    processing_log: Optional[str] = None
    error_message: Optional[str] = None


class ImportWizardSession(BaseModel):
    """Import wizard session tracking"""
    session_id: str
    file_path: str
    original_filename: str
    file_type: FileType
    current_step: str
    column_mapping: Optional[List[ColumnMapping]] = None
    metadata_config: Optional[MetadataConfig] = None
    validation_result: Optional[FileValidationResponse] = None
    conversion_task_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    expires_at: datetime


class ImportWizardSessionCreate(BaseModel):
    """Create new import wizard session"""
    original_filename: str
    file_type: Optional[FileType] = None
    session_duration_hours: int = 24


class ImportWizardSessionUpdate(BaseModel):
    """Update import wizard session"""
    current_step: Optional[str] = None
    column_mapping: Optional[List[ColumnMapping]] = None
    metadata_config: Optional[MetadataConfig] = None
    validation_result: Optional[FileValidationResponse] = None
    conversion_task_id: Optional[str] = None


class CFComplianceCheck(BaseModel):
    """CF compliance validation result"""
    is_compliant: bool
    cf_version: str = "CF-1.8"
    required_attributes: List[str] = []
    missing_attributes: List[str] = []
    invalid_attributes: List[ErrorDetail] = []
    coordinate_issues: List[ErrorDetail] = []
    variable_issues: List[ErrorDetail] = []
    global_attribute_issues: List[ErrorDetail] = []
    compliance_score: float  # 0.0 to 100.0
    recommendations: List[str] = []


class BatchImportRequest(BaseModel):
    """Request for batch import processing"""
    session_ids: List[str]
    apply_same_config: bool = False
    shared_metadata: Optional[MetadataConfig] = None
    processing_options: Optional[Dict[str, Any]] = None


class BatchImportResponse(BaseModel):
    """Response for batch import processing"""
    batch_id: str
    total_files: int
    successful: int
    failed: int
    task_ids: List[str]
    results: List[ConversionResult]
    errors: List[ErrorDetail] = []