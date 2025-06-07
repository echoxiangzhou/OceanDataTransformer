from sqlalchemy import Column, Integer, String, DateTime, Text, JSON, Float, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base_class import Base

class Algorithm(Base):
    __tablename__ = "algorithms"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    category = Column(String(100), nullable=False, index=True)  # visualization, terrain_inversion, etc.
    description = Column(Text, nullable=False)
    version = Column(String(50), default="1.0.0")
    docker_image = Column(String(255), nullable=False)
    input_schema = Column(JSON)  # Input parameter schema
    output_schema = Column(JSON)  # Output schema
    dependencies = Column(JSON)  # List of dependencies
    tags = Column(JSON)  # List of tags
    status = Column(String(50), default="registered", index=True)  # registered, validated, active, inactive, error
    python_code = Column(Text)  # Optional: store Python code
    dockerfile_content = Column(Text)  # Optional: store Dockerfile
    execution_count = Column(Integer, default=0)
    last_executed = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class AlgorithmExecution(Base):
    __tablename__ = "algorithm_executions"
    
    id = Column(Integer, primary_key=True, index=True)
    algorithm_id = Column(Integer, ForeignKey("algorithms.id"), nullable=False)
    status = Column(String(50), default="pending", index=True)  # pending, running, completed, failed, cancelled
    progress = Column(Float, default=0.0)
    input_data = Column(JSON, nullable=False)  # Input parameters
    output_data = Column(JSON)  # Execution results
    error_message = Column(Text)
    logs = Column(JSON)  # Execution logs as list
    container_id = Column(String(255))  # Docker container ID
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    
    # Relationship
    algorithm = relationship("Algorithm", backref="executions")