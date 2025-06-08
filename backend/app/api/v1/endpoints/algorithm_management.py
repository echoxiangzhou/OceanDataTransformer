from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import json
import tempfile
from pathlib import Path
import shutil

from app.db.session import get_db
from app.schemas.algorithm import (
    AlgorithmCreate, 
    AlgorithmResponse, 
    Algorithm,
    ExecutionTask,
    AlgorithmStats
)
from app.schemas.common import StandardResponse
from app.services.algorithm_service import algorithm_service
from app.services.container_service import container_service

router = APIRouter()

# Docker服务管理端点 - 使用不同的路径前缀
@router.get("/system/docker-health", response_model=StandardResponse[Dict[str, Any]])
async def docker_health_check():
    """Docker服务健康检查"""
    try:
        health_info = container_service.health_check()
        return StandardResponse(success=True, data=health_info)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats", response_model=StandardResponse[Dict[str, Any]])
async def get_algorithm_statistics(db: Session = Depends(get_db)):
    """获取算法统计信息"""
    try:
        stats = algorithm_service.get_algorithm_stats(db)
        
        # 添加容器服务统计
        container_stats = container_service.health_check()
        stats["docker_available"] = container_stats.get("docker_available", False)
        stats["docker_status"] = container_stats.get("status", "unknown")
        
        return StandardResponse(success=True, data=stats)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tasks", response_model=StandardResponse[List[ExecutionTask]])
async def get_execution_tasks(
    algorithmId: Optional[int] = None,
    status: Optional[str] = None,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """获取算法执行任务列表"""
    try:
        # 从数据库获取任务
        db_tasks = algorithm_service.get_execution_tasks(
            db=db,
            algorithm_id=algorithmId,
            status=status,
            limit=limit
        )
        
        # 从容器服务获取实时状态
        container_tasks = container_service.get_all_tasks(limit=limit)
        
        # 合并结果，优先使用容器服务的数据
        task_map = {task.id: task for task in container_tasks}
        
        for db_task in db_tasks:
            if db_task.id not in task_map:
                task_map[db_task.id] = db_task
        
        tasks = list(task_map.values())
        tasks.sort(key=lambda t: t.start_time, reverse=True)
        
        return StandardResponse(success=True, data=tasks[:limit])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/execute", response_model=StandardResponse[ExecutionTask])
async def execute_algorithm(
    db: Session = Depends(get_db),
    algorithm_id: int = Form(..., description="算法ID"),
    parameters: str = Form("{}", description="执行参数JSON字符串"),
    output_format: Optional[str] = Form(None, description="输出格式"),
    priority: Optional[str] = Form("normal", description="优先级"),
    input_files: List[UploadFile] = File(..., description="输入文件列表")
):
    """执行算法"""
    try:
        # 获取算法信息
        algorithm = algorithm_service.get_algorithm(db, algorithm_id)
        if not algorithm:
            raise HTTPException(status_code=404, detail="Algorithm not found")
        
        if algorithm.status != "ready":
            raise HTTPException(status_code=400, detail=f"Algorithm is not ready (current status: {algorithm.status})")
        
        # 解析参数
        parsed_parameters = json.loads(parameters) if parameters else {}
        
        # 保存上传的文件到临时目录
        temp_files = []
        try:
            for upload_file in input_files:
                # 创建临时文件
                temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=f"_{upload_file.filename}")
                content = await upload_file.read()
                temp_file.write(content)
                temp_file.close()
                temp_files.append(temp_file.name)
            
            # 创建执行任务记录
            task = algorithm_service.create_execution_task(
                db=db,
                algorithm_id=algorithm_id,
                input_files=[Path(f).name for f in temp_files],
                parameters=parsed_parameters
            )
            
            # 增加算法使用次数
            algorithm_service.increment_usage_count(db, algorithm_id)
            
            # 启动容器执行
            execution_task = await container_service.execute_algorithm(
                task_id=task.id,
                algorithm=algorithm,
                input_files=temp_files,
                parameters=parsed_parameters,
                output_format=output_format
            )
            
            return StandardResponse(success=True, data=execution_task)
            
        except Exception as e:
            # 清理临时文件
            for temp_file in temp_files:
                try:
                    Path(temp_file).unlink()
                except:
                    pass
            raise e
            
    except HTTPException:
        raise
    except Exception as e:
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
    auto_containerize: bool = Form(True),
    source_code: Optional[UploadFile] = File(None),
    documentation: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    """上传算法"""
    try:
        # 解析JSON字符串
        parsed_tags = json.loads(tags) if tags else []
        parsed_input_formats = json.loads(input_formats) if input_formats else []
        parsed_output_formats = json.loads(output_formats) if output_formats else []
        parsed_parameters = json.loads(parameters) if parameters else []
        
        # 创建算法数据对象
        algorithm_data = AlgorithmCreate(
            name=name,
            version=version,
            description=description,
            category=category,
            language=language,
            author=author,
            institution=institution,
            tags=parsed_tags,
            input_formats=parsed_input_formats,
            output_formats=parsed_output_formats,
            parameters=parsed_parameters,
            is_public=is_public
        )
        
        # 读取源代码
        source_code_content = None
        if source_code:
            source_code_content = (await source_code.read()).decode('utf-8')
        
        # 创建算法记录
        algorithm = algorithm_service.create_algorithm(
            db=db,
            algorithm_data=algorithm_data,
            source_code=source_code_content
        )
        
        # 保存文档
        if documentation:
            doc_content = (await documentation.read()).decode('utf-8')
            algorithm_service.save_algorithm_documentation(
                algorithm.id, 
                doc_content
            )
        
        # 如果启用自动容器化且有源代码，则构建Docker镜像
        if auto_containerize and source_code_content:
            # 异步构建镜像
            import asyncio
            asyncio.create_task(build_algorithm_image_task(algorithm.id, db))
        
        return StandardResponse(success=True, data=algorithm)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=StandardResponse[List[Algorithm]])
async def get_algorithms(
    category: Optional[str] = None,
    language: Optional[str] = None,
    status: Optional[str] = None,
    isPublic: Optional[bool] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """获取算法列表"""
    try:
        algorithms = algorithm_service.get_algorithms(
            db=db,
            category=category,
            language=language,
            status=status,
            is_public=isPublic,
            search=search,
            skip=skip,
            limit=limit
        )
        return StandardResponse(success=True, data=algorithms)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 参数化路径端点 - 必须在最后定义
@router.get("/{algorithm_id}", response_model=StandardResponse[Algorithm])
async def get_algorithm(algorithm_id: int, db: Session = Depends(get_db)):
    """获取算法详情"""
    algorithm = algorithm_service.get_algorithm(db, algorithm_id)
    if not algorithm:
        raise HTTPException(status_code=404, detail="Algorithm not found")
    return StandardResponse(success=True, data=algorithm)

@router.get("/tasks/{task_id}", response_model=StandardResponse[ExecutionTask])
async def get_task_status(task_id: int, db: Session = Depends(get_db)):
    """获取任务状态"""
    try:
        # 优先从容器服务获取实时状态
        task = container_service.get_task(task_id)
        if not task:
            # 从数据库获取历史任务
            db_tasks = algorithm_service.get_execution_tasks(db=db, limit=1000)
            task = next((t for t in db_tasks if t.id == task_id), None)
        
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        return StandardResponse(success=True, data=task)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/tasks/{task_id}/stop", response_model=StandardResponse[Dict[str, str]])
async def stop_task(task_id: int, db: Session = Depends(get_db)):
    """停止算法执行任务"""
    try:
        success = await container_service.stop_task(task_id)
        if success:
            return StandardResponse(success=True, data={"message": f"Task {task_id} stopped"})
        else:
            raise HTTPException(status_code=400, detail="Failed to stop task")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tasks/{task_id}/logs", response_model=StandardResponse[List[str]])
async def get_task_logs(task_id: int, db: Session = Depends(get_db)):
    """获取任务日志"""
    try:
        logs = container_service.get_task_logs(task_id)
        return StandardResponse(success=True, data=logs)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tasks/{task_id}/download/{filename}")
async def download_task_result(task_id: int, filename: str, db: Session = Depends(get_db)):
    """下载任务结果文件"""
    from fastapi.responses import FileResponse
    try:
        # 构建文件路径
        task_dir = Path(container_service.work_dir) / str(task_id) / "output"
        file_path = task_dir / filename
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File not found")
        
        return FileResponse(
            path=str(file_path),
            filename=filename,
            media_type='application/octet-stream'
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{algorithm_id}/build-logs", response_model=StandardResponse[List[str]])
async def get_build_logs(algorithm_id: int, db: Session = Depends(get_db)):
    """获取算法构建日志"""
    # TODO: 实现构建日志存储和检索
    return StandardResponse(success=True, data=["Build logs not implemented yet"])

@router.post("/{algorithm_id}/build", response_model=StandardResponse[Dict[str, str]])
async def build_algorithm(algorithm_id: int, db: Session = Depends(get_db)):
    """重新构建算法镜像"""
    try:
        algorithm = algorithm_service.get_algorithm(db, algorithm_id)
        if not algorithm:
            raise HTTPException(status_code=404, detail="Algorithm not found")
        
        # 异步构建镜像
        import asyncio
        asyncio.create_task(build_algorithm_image_task(algorithm_id, db))
        
        return StandardResponse(success=True, data={"message": "Build started"})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{algorithm_id}", response_model=StandardResponse[Algorithm])
async def update_algorithm(
    algorithm_id: int,
    updates: dict,
    db: Session = Depends(get_db)
):
    """更新算法信息"""
    try:
        from app.schemas.algorithm import AlgorithmUpdate
        
        # 过滤掉不应该在更新中的字段
        allowed_fields = {
            'name', 'version', 'description', 'tags', 'parameters', 'is_public',
            'status', 'docker_image', 'input_schema', 'output_schema', 'source_code',
            'input_formats', 'output_formats', 'category', 'language', 'author', 'institution'
        }
        
        filtered_updates = {k: v for k, v in updates.items() if k in allowed_fields}
        algorithm_update = AlgorithmUpdate(**filtered_updates)
        
        updated_algorithm = algorithm_service.update_algorithm(
            db=db,
            algorithm_id=algorithm_id,
            updates=algorithm_update
        )
        
        if not updated_algorithm:
            raise HTTPException(status_code=404, detail="Algorithm not found")
        
        return StandardResponse(success=True, data=updated_algorithm)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=f"数据验证失败: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{algorithm_id}/source", response_model=StandardResponse[str])
async def get_algorithm_source_code(
    algorithm_id: int,
    db: Session = Depends(get_db)
):
    """获取算法源代码"""
    try:
        algorithm = algorithm_service.get_algorithm(db, algorithm_id)
        if not algorithm:
            raise HTTPException(status_code=404, detail="Algorithm not found")
        
        source_code = algorithm_service.get_algorithm_source_code(algorithm_id)
        if not source_code:
            raise HTTPException(status_code=404, detail="Source code not found")
        
        return StandardResponse(success=True, data=source_code)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{algorithm_id}/source", response_model=StandardResponse[bool])
async def update_algorithm_source_code(
    algorithm_id: int,
    source_code: str = Form(...),
    db: Session = Depends(get_db)
):
    """更新算法源代码"""
    try:
        success = algorithm_service.update_algorithm_source_code(
            db, algorithm_id, source_code
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="Algorithm not found or update failed")
        
        return StandardResponse(success=True, data=True, message="Source code updated successfully")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{algorithm_id}", response_model=StandardResponse[Dict[str, str]])
async def delete_algorithm(algorithm_id: int, db: Session = Depends(get_db)):
    """删除算法"""
    try:
        success = algorithm_service.delete_algorithm(db, algorithm_id)
        if success:
            return StandardResponse(success=True, data={"message": "Algorithm deleted"})
        else:
            raise HTTPException(status_code=404, detail="Algorithm not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/containers/{container_id}/stats", response_model=StandardResponse[Dict[str, Any]])
async def get_container_stats(container_id: str):
    """获取容器资源使用统计"""
    try:
        stats = await container_service.get_container_stats(container_id)
        return StandardResponse(success=True, data=stats)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 异步构建镜像任务
async def build_algorithm_image_task(algorithm_id: int, db: Session):
    """异步构建算法镜像"""
    try:
        # 获取算法信息
        algorithm = algorithm_service.get_algorithm(db, algorithm_id)
        if not algorithm:
            return
        
        # 更新状态为构建中
        algorithm_service.update_algorithm_status(db, algorithm_id, "building")
        
        # 获取源代码
        source_code = algorithm_service.get_algorithm_source_code(algorithm_id)
        if not source_code:
            algorithm_service.update_algorithm_status(db, algorithm_id, "failed")
            return
        
        # 构建镜像
        success, image_name, build_logs = await container_service.build_algorithm_image(
            algorithm, source_code
        )
        
        if success:
            algorithm_service.update_algorithm_status(
                db, algorithm_id, "ready", docker_image=image_name
            )
        else:
            algorithm_service.update_algorithm_status(db, algorithm_id, "failed")
            
    except Exception as e:
        algorithm_service.update_algorithm_status(db, algorithm_id, "failed")