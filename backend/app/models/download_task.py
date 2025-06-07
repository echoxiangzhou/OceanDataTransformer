from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base_class import Base

class DownloadTask(Base):
    __tablename__ = "download_tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    source_id = Column(Integer, ForeignKey("data_sources.id"), nullable=False)
    save_path = Column(Text, nullable=False)
    filename_pattern = Column(String(255))
    max_retries = Column(Integer, default=3)
    timeout = Column(Integer, default=300)
    status = Column(String(50), default="pending", index=True)  # pending, running, paused, completed, failed, cancelled
    progress = Column(Float, default=0.0)
    file_size = Column(Integer)  # Total file size in bytes
    downloaded_size = Column(Integer, default=0)  # Downloaded size in bytes
    error_message = Column(Text)
    task_metadata = Column(JSON)  # Additional metadata as JSON
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    
    # Relationship
    data_source = relationship("DataSource", backref="download_tasks")