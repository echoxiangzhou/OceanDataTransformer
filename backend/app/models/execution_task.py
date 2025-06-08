"""算法执行任务模型"""
from sqlalchemy import Column, Integer, String, DateTime, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base_class import Base


class ExecutionTask(Base):
    """算法执行任务表"""
    __tablename__ = "execution_tasks"
    
    id = Column(String(50), primary_key=True, index=True)  # UUID字符串
    algorithm_id = Column(String(50), ForeignKey("algorithms.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"))  # 如果有用户系统
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