from sqlalchemy import Column, Integer, String, DateTime, Text, JSON, Float, Boolean
from sqlalchemy.sql import func
from app.db.base_class import Base


class NCFile(Base):
    __tablename__ = "nc_files"

    id = Column(Integer, primary_key=True, index=True)
    original_filename = Column(String(255), nullable=False, index=True)
    converted_filename = Column(String(255), nullable=True, index=True)
    original_format = Column(String(50), nullable=False)  # csv, txt, tiff, hdf, grib, etc.
    file_size = Column(Integer, nullable=True)  # in bytes
    file_path = Column(String(500), nullable=False)  # storage path
    conversion_status = Column(String(50), default="pending")  # pending, processing, completed, failed
    
    # NetCDF CF1.8 metadata
    title = Column(String(255), nullable=True)
    institution = Column(String(255), nullable=True)
    source = Column(String(255), nullable=True)
    history = Column(Text, nullable=True)
    references = Column(Text, nullable=True)
    comment = Column(Text, nullable=True)
    
    # Geospatial metadata
    latitude_min = Column(Float, nullable=True)
    latitude_max = Column(Float, nullable=True)
    longitude_min = Column(Float, nullable=True)
    longitude_max = Column(Float, nullable=True)
    depth_min = Column(Float, nullable=True)
    depth_max = Column(Float, nullable=True)
    
    # Temporal metadata
    time_coverage_start = Column(DateTime, nullable=True)
    time_coverage_end = Column(DateTime, nullable=True)
    
    # Data variables info
    variables = Column(JSON, nullable=True)  # Store variable metadata as JSON
    dimensions = Column(JSON, nullable=True)  # Store dimension info as JSON
    
    # CF1.8 compliance
    cf_version = Column(String(20), default="CF-1.8")
    conventions = Column(String(100), default="CF-1.8")
    is_cf_compliant = Column(Boolean, default=False)
    
    # Quality control
    quality_flags = Column(JSON, nullable=True)  # QC results
    data_quality_score = Column(Float, nullable=True)  # 0-100 quality score
    
    # Processing info
    processing_log = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    conversion_parameters = Column(JSON, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    processed_at = Column(DateTime(timezone=True), nullable=True)


class ConversionTask(Base):
    __tablename__ = "conversion_tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    original_file_path = Column(Text, nullable=False)
    original_filename = Column(String(255), nullable=False)
    original_format = Column(String(50), nullable=False)
    target_format = Column(String(50), default="CF1.8")
    conversion_options = Column(JSON, nullable=True)
    status = Column(String(50), default="pending", index=True)  # pending, running, completed, failed
    progress = Column(Float, default=0.0)
    error_message = Column(Text, nullable=True)
    nc_file_id = Column(Integer, nullable=True)  # Reference to created NC file
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)