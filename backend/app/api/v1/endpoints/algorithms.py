"""算法管理API端点"""
from typing import List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form, BackgroundTasks
from sqlalchemy.orm import Session
import json

from app.api.deps import get_db
from app.schemas.algorithm import (
    Algorithm,
    AlgorithmCreate,
    AlgorithmUpdate,
    AlgorithmStats,
    ExecutionRequest,
    ExecutionTask,
    BuildRequest,
    BuildResponse,
    ContainerStats
)
from app.schemas.common import StandardResponse
from app.services.algorithm_service import algorithm_service
from app.services.container_service import container_service
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter()


@router.get("", response_model=StandardResponse[List[Algorithm]])
async def get_algorithms(
    category: Optional[str] = None,
    language: Optional[str] = None,
    status: Optional[str] = None,
    is_public: Optional[bool] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """获取算法列表"""
    try:
        algorithms = algorithm_service.get_algorithms(
            db,
            category=category,
            language=language,
            status=status,
            is_public=is_public,
            search=search,
            skip=skip,
            limit=limit
        )
        return StandardResponse(
            success=True,
            data=algorithms,
            message=f"获取到 {len(algorithms)} 个算法"
        )
    except Exception as e:
        logger.error(f"获取算法列表失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload", response_model=StandardResponse[Algorithm])
async def upload_algorithm(
    name: str = Form(...),
    version: str = Form(...),
    description: str = Form(...),
    category: str = Form(...),
    language: str = Form(...),
    author: str = Form(...),
    institution: Optional[str] = Form(None),
    tags: str = Form("[]"),  # JSON string
    input_formats: str = Form("[]"),  # JSON string
    output_formats: str = Form("[]"),  # JSON string
    parameters: str = Form("[]"),  # JSON string
    is_public: bool = Form(True),
    auto_containerize: bool = Form(False),
    source_code: Optional[UploadFile] = File(None),
    documentation: Optional[UploadFile] = File(None),
    requirements: Optional[UploadFile] = File(None),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db)
):
    """上传新算法"""
    try:
        # 解析JSON字段（前端已经JSON.stringify了，所以需要解析）
        try:
            tags_list = json.loads(tags) if tags and tags != '[]' else []
        except json.JSONDecodeError:
            tags_list = []
            
        try:
            input_formats_list = json.loads(input_formats) if input_formats and input_formats != '[]' else []
        except json.JSONDecodeError:
            input_formats_list = []
            
        try:
            output_formats_list = json.loads(output_formats) if output_formats and output_formats != '[]' else []
        except json.JSONDecodeError:
            output_formats_list = []
            
        try:
            parameters_list = json.loads(parameters) if parameters and parameters != '[]' else []
        except json.JSONDecodeError:
            parameters_list = []
        
        # 读取源代码
        source_code_content = None
        if source_code:
            source_code_content = await source_code.read()
            source_code_content = source_code_content.decode('utf-8')
        
        # 创建算法数据
        algorithm_data = AlgorithmCreate(
            name=name,
            version=version,
            description=description,
            category=category,
            language=language,
            author=author,
            institution=institution,
            tags=tags_list,
            input_formats=input_formats_list,
            output_formats=output_formats_list,
            parameters=parameters_list,
            is_public=is_public
        )
        
        # 创建算法
        algorithm = algorithm_service.create_algorithm(
            db, 
            algorithm_data,
            source_code=source_code_content
        )
        
        # 保存文档
        if documentation:
            doc_content = await documentation.read()
            algorithm_service.save_algorithm_documentation(
                algorithm.id,
                doc_content.decode('utf-8')
            )
        
        # 如果需要自动容器化
        if auto_containerize and source_code_content:
            requirements_content = None
            if requirements:
                req_content = await requirements.read()
                requirements_content = req_content.decode('utf-8')
            
            # 在后台构建Docker镜像
            background_tasks.add_task(
                _build_algorithm_image,
                db,
                algorithm.id,
                source_code_content,
                requirements_content
            )
        
        return StandardResponse(
            success=True,
            data=algorithm,
            message="算法上传成功"
        )
        
    except Exception as e:
        logger.error(f"上传算法失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats", response_model=StandardResponse[AlgorithmStats])
async def get_algorithm_stats(db: Session = Depends(get_db)):
    """获取算法统计信息"""
    try:
        stats = algorithm_service.get_algorithm_stats(db)
        return StandardResponse(
            success=True,
            data=stats,
            message="获取统计信息成功"
        )
    except Exception as e:
        logger.error(f"获取统计信息失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tasks", response_model=StandardResponse[List[ExecutionTask]])
async def get_execution_tasks(
    algorithm_id: Optional[int] = None,
    status: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """获取执行任务列表"""
    try:
        # 从数据库获取任务
        tasks = algorithm_service.get_execution_tasks(
            db, 
            algorithm_id=algorithm_id,
            status=status,
            limit=limit
        )
        
        return StandardResponse(
            success=True,
            data=tasks,
            message=f"获取到 {len(tasks)} 个任务"
        )
    except Exception as e:
        logger.error(f"获取任务列表失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tasks/{task_id}", response_model=StandardResponse[ExecutionTask])
async def get_execution_task(task_id: int, db: Session = Depends(get_db)):
    """获取执行任务详情"""
    try:
        # 从数据库获取任务
        from app.models.algorithm import AlgorithmExecution
        task_model = db.query(AlgorithmExecution).filter(
            AlgorithmExecution.id == task_id
        ).first()
        
        if not task_model:
            raise HTTPException(status_code=404, detail="任务不存在")
        
        # 转换为schema
        task = algorithm_service._task_model_to_schema(task_model, db)
        
        return StandardResponse(
            success=True,
            data=task,
            message="获取任务详情成功"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取任务详情失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tasks/{task_id}/stop", response_model=StandardResponse[bool])
async def stop_execution_task(task_id: int, db: Session = Depends(get_db)):
    """停止执行任务"""
    try:
        # 首先检查任务是否存在
        from app.models.algorithm import AlgorithmExecution
        task_model = db.query(AlgorithmExecution).filter(
            AlgorithmExecution.id == task_id
        ).first()
        
        if not task_model:
            raise HTTPException(status_code=404, detail="任务不存在")
        
        if task_model.status in ["completed", "failed", "cancelled"]:
            raise HTTPException(status_code=400, detail="任务已完成")
        
        # 尝试停止容器中的任务
        container_success = await container_service.stop_task(task_id)
        
        # 更新数据库中的任务状态
        algorithm_service.update_execution_task(
            db, task_id, 
            status=ExecutionStatus.CANCELLED,
            error_message="用户手动停止"
        )
        
        return StandardResponse(
            success=True,
            data=True,
            message="任务已停止"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"停止任务失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tasks/{task_id}/logs", response_model=StandardResponse[List[str]])
async def get_task_logs(task_id: int, db: Session = Depends(get_db)):
    """获取任务日志"""
    try:
        # 从数据库获取任务
        from app.models.algorithm import AlgorithmExecution
        task_model = db.query(AlgorithmExecution).filter(
            AlgorithmExecution.id == task_id
        ).first()
        
        if not task_model:
            raise HTTPException(status_code=404, detail="任务不存在")
        
        # 获取日志
        logs = json.loads(task_model.logs) if task_model.logs else []
        
        return StandardResponse(
            success=True,
            data=logs,
            message="获取日志成功"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取任务日志失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/execute", response_model=StandardResponse[ExecutionTask])
async def execute_algorithm(
    request: ExecutionRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """执行算法"""
    try:
        # 获取算法信息
        algorithm = algorithm_service.get_algorithm(db, request.algorithm_id)
        if not algorithm:
            raise HTTPException(status_code=404, detail="算法不存在")
        
        if algorithm.status != "ready":
            raise HTTPException(status_code=400, detail="算法未就绪")
        
        if not algorithm.docker_image:
            raise HTTPException(status_code=400, detail="算法未构建Docker镜像")
        
        # 创建执行任务记录
        db_task = algorithm_service.create_execution_task(
            db,
            algorithm_id=request.algorithm_id,
            input_files=request.input_files,
            parameters=request.parameters
        )
        
        # 在容器中执行算法
        task = await container_service.execute_algorithm(
            task_id=db_task.id,
            algorithm=algorithm,
            input_files=request.input_files,
            parameters=request.parameters,
            output_format=request.output_format
        )
        
        # 增加算法使用次数
        algorithm_service.increment_usage_count(db, algorithm.id)
        
        return StandardResponse(
            success=True,
            data=task,
            message="算法执行任务已创建"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"执行算法失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{algorithm_id}", response_model=StandardResponse[Algorithm])
async def get_algorithm(
    algorithm_id: int,
    db: Session = Depends(get_db)
):
    """获取单个算法详情"""
    try:
        algorithm = algorithm_service.get_algorithm(db, algorithm_id)
        if not algorithm:
            raise HTTPException(status_code=404, detail="算法不存在")
        
        return StandardResponse(
            success=True,
            data=algorithm,
            message="获取算法详情成功"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取算法详情失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{algorithm_id}", response_model=StandardResponse[Algorithm])
async def update_algorithm(
    algorithm_id: int,
    updates: AlgorithmUpdate,
    db: Session = Depends(get_db)
):
    """更新算法信息"""
    try:
        algorithm = algorithm_service.update_algorithm(db, algorithm_id, updates)
        if not algorithm:
            raise HTTPException(status_code=404, detail="算法不存在")
        
        return StandardResponse(
            success=True,
            data=algorithm,
            message="算法更新成功"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新算法失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{algorithm_id}", response_model=StandardResponse[bool])
async def delete_algorithm(
    algorithm_id: int,
    db: Session = Depends(get_db)
):
    """删除算法"""
    try:
        success = algorithm_service.delete_algorithm(db, algorithm_id)
        if not success:
            raise HTTPException(status_code=404, detail="算法不存在")
        
        return StandardResponse(
            success=True,
            data=True,
            message="算法删除成功"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除算法失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{algorithm_id}/build", response_model=StandardResponse[BuildResponse])
async def build_algorithm_image(
    algorithm_id: int,
    build_request: BuildRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """构建算法Docker镜像"""
    try:
        algorithm = algorithm_service.get_algorithm(db, algorithm_id)
        if not algorithm:
            raise HTTPException(status_code=404, detail="算法不存在")
        
        # 在后台构建镜像
        task_id = f"build_{algorithm_id}"
        background_tasks.add_task(
            _build_algorithm_image,
            db,
            algorithm_id,
            build_request.source_code,
            build_request.requirements
        )
        
        return StandardResponse(
            success=True,
            data=BuildResponse(
                success=True,
                build_logs=[f"构建任务已提交，任务ID: {task_id}"]
            ),
            message="构建任务已提交"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"提交构建任务失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{algorithm_id}/source", response_model=StandardResponse[str])
async def get_algorithm_source(
    algorithm_id: int,
    db: Session = Depends(get_db)
):
    """获取算法源代码"""
    try:
        source_code = algorithm_service.get_algorithm_source_code(algorithm_id)
        if not source_code:
            raise HTTPException(status_code=404, detail="源代码不存在")
        
        return StandardResponse(
            success=True,
            data=source_code,
            message="获取源代码成功"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取源代码失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{algorithm_id}/source", response_model=StandardResponse[bool])
async def update_algorithm_source(
    algorithm_id: int,
    source_code: str,
    db: Session = Depends(get_db)
):
    """更新算法源代码"""
    try:
        success = algorithm_service.update_algorithm_source_code(
            db, algorithm_id, source_code
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="算法不存在或更新失败")
        
        return StandardResponse(
            success=True,
            data=True,
            message="源代码更新成功"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新源代码失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{algorithm_id}/documentation", response_model=StandardResponse[str])
async def get_algorithm_documentation(
    algorithm_id: int,
    db: Session = Depends(get_db)
):
    """获取算法文档"""
    try:
        documentation = algorithm_service.get_algorithm_documentation(algorithm_id)
        if not documentation:
            raise HTTPException(status_code=404, detail="文档不存在")
        
        return StandardResponse(
            success=True,
            data=documentation,
            message="获取文档成功"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取文档失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/containers/{container_id}/stats", response_model=StandardResponse[ContainerStats])
async def get_container_stats(container_id: str):
    """获取容器资源统计"""
    try:
        stats = await container_service.get_container_stats(container_id)
        return StandardResponse(
            success=True,
            data=stats,
            message="获取容器统计成功"
        )
    except Exception as e:
        logger.error(f"获取容器统计失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# 辅助函数
async def _build_algorithm_image(
    db: Session,
    algorithm_id: int,
    source_code: str,
    requirements: Optional[str]
):
    """后台构建Docker镜像"""
    try:
        algorithm = algorithm_service.get_algorithm(db, algorithm_id)
        if not algorithm:
            return
        
        # 更新状态为构建中
        algorithm_service.update_algorithm_status(
            db, algorithm_id, "building"
        )
        
        # 构建镜像
        success, image_name, build_logs = await container_service.build_algorithm_image(
            algorithm, source_code, requirements
        )
        
        if success:
            # 更新算法状态和镜像名称
            algorithm_service.update_algorithm_status(
                db, algorithm_id, "ready", docker_image=image_name
            )
            logger.info(f"算法 {algorithm_id} 镜像构建成功: {image_name}")
        else:
            # 更新状态为失败
            algorithm_service.update_algorithm_status(
                db, algorithm_id, "failed"
            )
            logger.error(f"算法 {algorithm_id} 镜像构建失败")
            
    except Exception as e:
        logger.error(f"构建镜像时出错: {e}")
        try:
            algorithm_service.update_algorithm_status(
                db, algorithm_id, "failed"
            )
        except:
            pass