from sqlalchemy import Column, Integer, String, DateTime, Text, JSON, Float
from sqlalchemy.sql import func
from app.db.base_class import Base

class NetCDFFile(Base):
    __tablename__ = "netcdf_files"
    
    id = Column(Integer, primary_key=True, index=True)
    original_filename = Column(String(255), nullable=False)
    converted_filename = Column(String(255), nullable=False)
    file_path = Column(Text, nullable=False)
    file_size = Column(Integer, nullable=False)
    format_version = Column(String(50), default="CF1.8")
    dimensions = Column(JSON)  # Dictionary of dimension names and sizes
    variables = Column(JSON)  # List of variable names
    global_attributes = Column(JSON)  # Global attributes as JSON
    time_range = Column(JSON)  # Start and end time
    spatial_bounds = Column(JSON)  # Geographic bounds
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ConversionTask(Base):
    __tablename__ = "conversion_tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    original_file_path = Column(Text, nullable=False)
    target_format = Column(String(50), default="CF1.8")
    conversion_options = Column(JSON)
    status = Column(String(50), default="pending", index=True)  # pending, running, completed, failed
    progress = Column(Float, default=0.0)
    error_message = Column(Text)
    netcdf_file_id = Column(Integer)  # Reference to created NetCDF file
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))