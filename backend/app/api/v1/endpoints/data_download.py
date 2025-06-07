from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.session import get_db
from app.schemas.data_source import DataSourceCreate, DataSourceResponse, DataSourceUpdate
from app.schemas.download_task import DownloadTaskCreate, DownloadTaskResponse
from app.schemas.common import MessageResponse
from app.crud.crud_data_source import data_source as crud_data_source
from app.crud.crud_download_task import download_task as crud_download_task
from app.services.data_download_service import download_service
from app.services.task_scheduler import task_scheduler

router = APIRouter()

@router.get("/sources", response_model=List[DataSourceResponse])
async def get_data_sources(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """获取所有数据源配置"""
    sources = crud_data_source.get_multi(db, skip=skip, limit=limit)
    return sources

@router.post("/sources", response_model=DataSourceResponse)
async def create_data_source(
    source: DataSourceCreate,
    db: Session = Depends(get_db)
):
    """创建新的数据源配置"""
    # Check if name already exists
    existing = crud_data_source.get_by_name(db, name=source.name)
    if existing:
        raise HTTPException(status_code=400, detail="Data source with this name already exists")
    
    return crud_data_source.create(db, obj_in=source)

@router.get("/sources/{source_id}", response_model=DataSourceResponse)
async def get_data_source(source_id: int, db: Session = Depends(get_db)):
    """获取特定数据源配置"""
    source = crud_data_source.get(db, id=source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Data source not found")
    return source

@router.put("/sources/{source_id}", response_model=DataSourceResponse)
async def update_data_source(
    source_id: int,
    source_update: DataSourceUpdate,
    db: Session = Depends(get_db)
):
    """更新数据源配置"""
    source = crud_data_source.get(db, id=source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Data source not found")
    
    return crud_data_source.update(db, db_obj=source, obj_in=source_update)

@router.delete("/sources/{source_id}", response_model=MessageResponse)
async def delete_data_source(source_id: int, db: Session = Depends(get_db)):
    """删除数据源配置"""
    source = crud_data_source.get(db, id=source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Data source not found")
    
    crud_data_source.remove(db, id=source_id)
    return {"message": "Data source deleted successfully"}

@router.get("/tasks", response_model=List[DownloadTaskResponse])
async def get_download_tasks(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = Query(None),
    source_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """获取下载任务列表"""
    tasks = crud_download_task.get_multi(
        db, skip=skip, limit=limit, status=status, source_id=source_id
    )
    return tasks

@router.post("/tasks", response_model=DownloadTaskResponse)
async def create_download_task(
    task: DownloadTaskCreate,
    db: Session = Depends(get_db)
):
    """创建新的下载任务"""
    # Verify data source exists
    source = crud_data_source.get(db, id=task.source_id)
    if not source:
        raise HTTPException(status_code=400, detail="Data source not found")
    
    return crud_download_task.create(db, obj_in=task)

@router.get("/tasks/{task_id}", response_model=DownloadTaskResponse)
async def get_download_task(task_id: int, db: Session = Depends(get_db)):
    """获取特定下载任务详情"""
    task = crud_download_task.get(db, id=task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Download task not found")
    return task

@router.post("/tasks/{task_id}/start", response_model=MessageResponse)
async def start_download_task(task_id: int, db: Session = Depends(get_db)):
    """启动下载任务"""
    task = crud_download_task.get(db, id=task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Download task not found")
    
    if task.status not in ["pending", "paused", "failed"]:
        raise HTTPException(status_code=400, detail="Task cannot be started in current status")
    
    success = await download_service.start_download(db, task_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to start download task")
    
    return {"message": f"Download task {task_id} started"}

@router.post("/tasks/{task_id}/pause", response_model=MessageResponse)
async def pause_download_task(task_id: int, db: Session = Depends(get_db)):
    """暂停下载任务"""
    task = crud_download_task.get(db, id=task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Download task not found")
    
    if task.status != "running":
        raise HTTPException(status_code=400, detail="Only running tasks can be paused")
    
    success = await download_service.pause_download(db, task_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to pause download task")
    
    return {"message": f"Download task {task_id} paused"}

@router.post("/tasks/{task_id}/resume", response_model=MessageResponse)
async def resume_download_task(task_id: int, db: Session = Depends(get_db)):
    """恢复下载任务"""
    task = crud_download_task.get(db, id=task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Download task not found")
    
    if task.status != "paused":
        raise HTTPException(status_code=400, detail="Only paused tasks can be resumed")
    
    success = await download_service.resume_download(db, task_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to resume download task")
    
    return {"message": f"Download task {task_id} resumed"}

@router.delete("/tasks/{task_id}", response_model=MessageResponse)
async def cancel_download_task(task_id: int, db: Session = Depends(get_db)):
    """取消下载任务"""
    task = crud_download_task.get(db, id=task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Download task not found")
    
    success = await download_service.cancel_download(db, task_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to cancel download task")
    
    return {"message": f"Download task {task_id} cancelled"}

# Batch operations
@router.post("/tasks/batch/start", response_model=MessageResponse)
async def start_multiple_tasks(
    task_ids: List[int],
    priority: int = Query(5, ge=1, le=10, description="Priority (1=highest, 10=lowest)"),
    db: Session = Depends(get_db)
):
    """批量启动下载任务"""
    started_count = 0
    failed_tasks = []
    
    for task_id in task_ids:
        try:
            task = crud_download_task.get(db, task_id)
            if not task:
                failed_tasks.append(f"Task {task_id}: not found")
                continue
                
            if task.status not in ["pending", "paused", "failed"]:
                failed_tasks.append(f"Task {task_id}: invalid status {task.status}")
                continue
            
            # Add to scheduler queue with priority
            await task_scheduler.add_task_to_queue(db, task_id, priority)
            started_count += 1
            
        except Exception as e:
            failed_tasks.append(f"Task {task_id}: {str(e)}")
    
    message = f"Successfully queued {started_count} tasks"
    if failed_tasks:
        message += f". Failed: {'; '.join(failed_tasks)}"
    
    return {"message": message}

@router.post("/tasks/batch/pause", response_model=MessageResponse)
async def pause_multiple_tasks(
    task_ids: List[int],
    db: Session = Depends(get_db)
):
    """批量暂停下载任务"""
    paused_count = 0
    failed_tasks = []
    
    for task_id in task_ids:
        try:
            success = await download_service.pause_download(db, task_id)
            if success:
                paused_count += 1
            else:
                failed_tasks.append(f"Task {task_id}: failed to pause")
        except Exception as e:
            failed_tasks.append(f"Task {task_id}: {str(e)}")
    
    message = f"Successfully paused {paused_count} tasks"
    if failed_tasks:
        message += f". Failed: {'; '.join(failed_tasks)}"
    
    return {"message": message}

@router.post("/tasks/batch/cancel", response_model=MessageResponse)
async def cancel_multiple_tasks(
    task_ids: List[int],
    db: Session = Depends(get_db)
):
    """批量取消下载任务"""
    cancelled_count = 0
    failed_tasks = []
    
    for task_id in task_ids:
        try:
            success = await download_service.cancel_download(db, task_id)
            if success:
                # Also remove from scheduler queue
                await task_scheduler.remove_task_from_queue(task_id)
                cancelled_count += 1
            else:
                failed_tasks.append(f"Task {task_id}: failed to cancel")
        except Exception as e:
            failed_tasks.append(f"Task {task_id}: {str(e)}")
    
    message = f"Successfully cancelled {cancelled_count} tasks"
    if failed_tasks:
        message += f". Failed: {'; '.join(failed_tasks)}"
    
    return {"message": message}

# Task priority management
@router.put("/tasks/{task_id}/priority", response_model=MessageResponse)
async def update_task_priority(
    task_id: int,
    priority: int = Query(..., ge=1, le=10, description="Priority (1=highest, 10=lowest)"),
    db: Session = Depends(get_db)
):
    """更新任务优先级"""
    task = crud_download_task.get(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Download task not found")
    
    # Update task metadata
    if not task.task_metadata:
        task.task_metadata = {}
    task.task_metadata['priority'] = priority
    
    crud_download_task.update(db, db_obj=task, obj_in={"task_metadata": task.task_metadata})
    
    # If task is pending, update queue position
    if task.status == "pending":
        await task_scheduler.remove_task_from_queue(task_id)
        await task_scheduler.add_task_to_queue(db, task_id, priority)
    
    return {"message": f"Task {task_id} priority updated to {priority}"}

# Scheduler status
@router.get("/scheduler/status")
async def get_scheduler_status():
    """获取任务调度器状态"""
    return task_scheduler.get_queue_status()

@router.post("/scheduler/start", response_model=MessageResponse)
async def start_scheduler(db: Session = Depends(get_db)):
    """启动任务调度器"""
    if not task_scheduler.scheduler_running:
        # Start scheduler in background
        import asyncio
        asyncio.create_task(task_scheduler.start_scheduler(db))
        return {"message": "Task scheduler started"}
    else:
        return {"message": "Task scheduler is already running"}

@router.post("/scheduler/stop", response_model=MessageResponse)
async def stop_scheduler():
    """停止任务调度器"""
    await task_scheduler.stop_scheduler()
    return {"message": "Task scheduler stopped"}