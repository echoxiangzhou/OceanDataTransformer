"""算法和执行任务的Pydantic模型"""
from datetime import datetime
from typing import List, Optional, Dict, Any
from enum import Enum

from pydantic import BaseModel, Field


class AlgorithmCategory(str, Enum):
    """算法分类"""
    VISUALIZATION = "visualization"
    ANALYSIS = "analysis"
    PREPROCESSING = "preprocessing"
    ML_INFERENCE = "ml_inference"
    TERRAIN_INVERSION = "terrain_inversion"
    DATA_PROCESSING = "data_processing"
    QUALITY_CONTROL = "quality_control"


class ProgrammingLanguage(str, Enum):
    """支持的编程语言"""
    PYTHON = "python"
    R = "r"
    MATLAB = "matlab"


class AlgorithmStatus(str, Enum):
    """算法状态"""
    REGISTERED = "registered"
    BUILDING = "building"
    READY = "ready"
    FAILED = "failed"
    RUNNING = "running"
    VALIDATED = "validated"
    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"


class ExecutionStatus(str, Enum):
    """执行任务状态"""
    QUEUED = "queued"
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class AlgorithmParameterType(str, Enum):
    """算法参数类型"""
    STRING = "string"
    NUMBER = "number"
    BOOLEAN = "boolean"
    FILE = "file"
    SELECT = "select"


class AlgorithmParameter(BaseModel):
    """算法参数定义"""
    name: str = Field(..., description="参数名称", min_length=1)
    type: AlgorithmParameterType = Field(..., description="参数类型")
    description: str = Field("", description="参数描述")
    required: bool = Field(False, description="是否必需")
    default_value: Optional[Any] = Field(None, description="默认值")
    options: Optional[List[str]] = Field(None, description="选项列表（用于select类型）")
    validation: Optional[str] = Field(None, description="验证规则")


class AlgorithmBase(BaseModel):
    """算法基础信息"""
    name: str = Field(..., description="算法名称", max_length=100)
    version: str = Field("1.0.0", description="版本号", max_length=20)
    description: str = Field(..., description="算法描述", max_length=500)
    category: AlgorithmCategory = Field(..., description="算法分类")
    language: ProgrammingLanguage = Field(ProgrammingLanguage.PYTHON, description="编程语言")
    author: str = Field(..., description="作者", max_length=50)
    institution: Optional[str] = Field(None, description="所属机构", max_length=100)
    tags: List[str] = Field(default_factory=list, description="标签")
    input_formats: List[str] = Field(..., description="支持的输入格式")
    output_formats: List[str] = Field(..., description="支持的输出格式")
    parameters: List[AlgorithmParameter] = Field(default_factory=list, description="参数定义")
    is_public: bool = Field(True, description="是否公开")
    docker_image: Optional[str] = Field(None, description="Docker镜像名称")
    input_schema: Optional[Dict[str, Any]] = Field(None, description="输入数据模式")
    output_schema: Optional[Dict[str, Any]] = Field(None, description="输出数据模式")
    dependencies: Optional[List[str]] = Field(None, description="依赖列表")


class AlgorithmCreate(AlgorithmBase):
    """创建算法的请求模型"""
    python_code: Optional[str] = Field(None, description="Python源代码")
    dockerfile_content: Optional[str] = Field(None, description="Dockerfile内容")


class AlgorithmUpdate(BaseModel):
    """更新算法的请求模型"""
    name: Optional[str] = Field(None, max_length=100)
    version: Optional[str] = Field(None, max_length=20)
    description: Optional[str] = Field(None, max_length=500)
    tags: Optional[List[str]] = None
    parameters: Optional[List[AlgorithmParameter]] = None
    is_public: Optional[bool] = None
    status: Optional[AlgorithmStatus] = None
    docker_image: Optional[str] = None
    input_schema: Optional[Dict[str, Any]] = None
    output_schema: Optional[Dict[str, Any]] = None
    source_code: Optional[str] = Field(None, description="算法源代码")
    input_formats: Optional[List[str]] = Field(None, description="支持的输入格式")
    output_formats: Optional[List[str]] = Field(None, description="支持的输出格式")
    category: Optional[AlgorithmCategory] = Field(None, description="算法分类")
    language: Optional[ProgrammingLanguage] = Field(None, description="编程语言")
    author: Optional[str] = Field(None, max_length=50, description="作者")
    institution: Optional[str] = Field(None, max_length=100, description="所属机构")


class Algorithm(AlgorithmBase):
    """算法完整信息"""
    id: int = Field(..., description="算法ID")
    status: AlgorithmStatus = Field(..., description="算法状态")
    last_updated: str = Field(..., description="最后更新时间")
    usage_count: int = Field(0, description="使用次数")
    rating: float = Field(0.0, description="评分", ge=0, le=5)
    documentation: Optional[str] = Field(None, description="文档内容")
    source_code: Optional[str] = Field(None, description="源代码")
    execution_time: Optional[int] = Field(None, description="平均执行时间（秒）")
    memory_usage: Optional[int] = Field(None, description="最大内存使用（MB）")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")
    execution_count: int = Field(0, description="执行次数")
    last_executed: Optional[datetime] = Field(None, description="最后执行时间")
    
    class Config:
        from_attributes = True


class AlgorithmResponse(Algorithm):
    """算法响应模型，兼容旧版本"""
    pass


class ExecutionRequest(BaseModel):
    """算法执行请求"""
    algorithm_id: int = Field(..., description="算法ID")
    input_files: List[str] = Field(default_factory=list, description="输入文件路径列表")
    input_data: Optional[Dict[str, Any]] = Field(None, description="输入数据")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="算法参数")
    output_format: Optional[str] = Field(None, description="输出格式")
    output_path: Optional[str] = Field(None, description="输出路径")
    priority: Optional[str] = Field("normal", description="优先级")


class AlgorithmExecutionRequest(ExecutionRequest):
    """算法执行请求（兼容旧版本）"""
    pass


class ExecutionTask(BaseModel):
    """执行任务信息"""
    id: int = Field(..., description="任务ID")
    algorithm_id: int = Field(..., description="算法ID")
    algorithm_name: str = Field(..., description="算法名称")
    status: ExecutionStatus = Field(..., description="任务状态")
    start_time: datetime = Field(..., description="开始时间")
    end_time: Optional[datetime] = Field(None, description="结束时间")
    input_files: List[str] = Field(default_factory=list, description="输入文件列表")
    output_files: List[str] = Field(default_factory=list, description="输出文件列表")
    parameters: Dict[str, Any] = Field(..., description="执行参数")
    progress: int = Field(0, description="执行进度", ge=0, le=100)
    logs: List[str] = Field(default_factory=list, description="执行日志")
    error_message: Optional[str] = Field(None, description="错误信息")
    container_id: Optional[str] = Field(None, description="容器ID")
    resource_usage: Optional[Dict[str, float]] = Field(None, description="资源使用情况")
    
    # 兼容旧版本字段
    input_data: Optional[Dict[str, Any]] = Field(None, description="输入数据")
    output_data: Optional[Dict[str, Any]] = Field(None, description="输出数据")
    created_at: Optional[datetime] = Field(None, description="创建时间")
    started_at: Optional[datetime] = Field(None, description="开始时间")
    completed_at: Optional[datetime] = Field(None, description="完成时间")
    
    class Config:
        from_attributes = True


class AlgorithmExecutionResponse(ExecutionTask):
    """算法执行响应（兼容旧版本）"""
    pass


class AlgorithmStats(BaseModel):
    """算法统计信息"""
    total_algorithms: int = Field(..., description="算法总数")
    ready_algorithms: int = Field(..., description="就绪算法数")
    running_tasks: int = Field(..., description="运行中任务数")
    containerized_algorithms: int = Field(..., description="容器化算法数")
    total_usage: int = Field(..., description="总使用次数")
    average_rating: float = Field(..., description="平均评分")
    average_execution_time: Optional[float] = Field(None, description="平均执行时间")
    total_memory_allocated: Optional[int] = Field(None, description="总内存分配")


class ContainerStats(BaseModel):
    """容器资源统计"""
    cpu: float = Field(..., description="CPU使用率（%）")
    memory: float = Field(..., description="内存使用率（%）")
    memory_usage_mb: float = Field(..., description="内存使用量（MB）")
    network_rx_mb: float = Field(0, description="网络接收（MB）")
    network_tx_mb: float = Field(0, description="网络发送（MB）")


class BuildRequest(BaseModel):
    """构建Docker镜像请求"""
    algorithm_id: int = Field(..., description="算法ID")
    source_code: str = Field(..., description="源代码内容")
    requirements: Optional[str] = Field(None, description="依赖文件内容")
    auto_containerize: bool = Field(True, description="是否自动容器化")


class BuildResponse(BaseModel):
    """构建响应"""
    success: bool = Field(..., description="是否成功")
    image_name: Optional[str] = Field(None, description="镜像名称")
    build_logs: List[str] = Field(default_factory=list, description="构建日志")
    error_message: Optional[str] = Field(None, description="错误信息")