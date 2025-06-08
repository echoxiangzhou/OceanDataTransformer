from sqlalchemy import Column, Integer, String, DateTime, Text, JSON, Float, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base_class import Base

class Algorithm(Base):
    __tablename__ = "algorithms"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)  # INT ID for now
    name = Column(String(255), nullable=False, index=True)
    category = Column(String(100), nullable=False, index=True)  # visualization, terrain_inversion, etc.
    description = Column(Text, nullable=False)
    version = Column(String(50), default="1.0.0")
    language = Column(String(20), default="python", nullable=False)  # python, r, matlab
    author = Column(String(100), nullable=False)
    institution = Column(String(200))
    docker_image = Column(String(255))
    source_code_path = Column(String(500))  # 源代码文件路径
    input_schema = Column(JSON)  # Input parameter schema
    output_schema = Column(JSON)  # Output schema
    dependencies = Column(JSON)  # List of dependencies
    tags = Column(JSON)  # List of tags as JSON array
    input_formats = Column(JSON)  # 支持的输入格式列表
    output_formats = Column(JSON)  # 支持的输出格式列表
    parameters = Column(JSON)  # 算法参数定义列表
    is_public = Column(Boolean, default=True)  # 是否公开
    status = Column(String(50), default="registered", index=True)  # registered, building, ready, failed, etc.
    python_code = Column(Text)  # Optional: store Python code
    dockerfile_content = Column(Text)  # Optional: store Dockerfile
    execution_count = Column(Integer, default=0)
    usage_count = Column(Integer, default=0)  # 使用次数
    rating = Column(Float, default=0.0)  # 评分 0-5
    avg_execution_time = Column(Integer)  # 平均执行时间（秒）
    max_memory_usage = Column(Integer)  # 最大内存使用（MB）
    last_executed = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    executions = relationship("AlgorithmExecution", back_populates="algorithm", cascade="all, delete-orphan")

class AlgorithmExecution(Base):
    __tablename__ = "algorithm_executions"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)  # INT ID for now
    algorithm_id = Column(Integer, ForeignKey("algorithms.id"), nullable=False)
    user_id = Column(Integer, nullable=True)  # 用户ID，暂不关联用户表
    status = Column(String(50), default="queued", index=True)  # queued, running, completed, failed, cancelled
    progress = Column(Integer, default=0)  # 0-100
    input_data = Column(JSON)  # Input parameters
    input_files = Column(JSON)  # 输入文件列表
    output_data = Column(JSON)  # Execution results
    output_files = Column(JSON)  # 输出文件列表
    parameters = Column(JSON)  # 执行参数
    error_message = Column(Text)
    logs = Column(JSON)  # Execution logs as list
    container_id = Column(String(255))  # Docker container ID
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    start_time = Column(DateTime(timezone=True))  # 实际开始时间
    end_time = Column(DateTime(timezone=True))  # 结束时间
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Aliases for compatibility
    started_at = Column(DateTime(timezone=True))  # Alias for start_time
    completed_at = Column(DateTime(timezone=True))  # Alias for end_time
    
    # Relationship
    algorithm = relationship("Algorithm", back_populates="executions")


# 创建兼容的别名
ExecutionTask = AlgorithmExecution