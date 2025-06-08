from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, Query, Form
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
import os
import shutil
from pathlib import Path

from app.db.session import get_db
from app.schemas.nc_file import NCFileResponse, ConversionTaskResponse, ConversionTaskCreate
from app.schemas.common import MessageResponse
from app.crud.crud_nc_file import nc_file as crud_nc_file, conversion_task as crud_conversion_task
from app.services.data_conversion_service import conversion_service
from app.models.nc_file import NCFile, ConversionTask
from app.core.config import settings

router = APIRouter()

@router.post("/upload")
async def upload_file_for_conversion(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    institution: Optional[str] = Form(None),
    source: Optional[str] = Form(None),
    comment: Optional[str] = Form(None),
    metadata: Optional[str] = Form(None),  # JSON string of metadata config
    columnMapping: Optional[str] = Form(None),  # JSON string of column mapping
    db: Session = Depends(get_db)
):
    """上传文件进行格式转换"""
    import json
    
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    # Create upload directory
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Save uploaded file
    file_path = upload_dir / file.filename
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Detect file format
        detected_format = conversion_service.detect_format(str(file_path))
        if detected_format == 'unknown':
            raise HTTPException(status_code=400, detail="Unsupported file format")
        
        # Prepare conversion options
        conversion_options = {
            "title": title,
            "institution": institution,
            "source": source,
            "comment": comment
        }
        
        # Parse enhanced metadata and column mapping if provided
        if metadata:
            try:
                parsed_metadata = json.loads(metadata)
                conversion_options["metadata"] = parsed_metadata
            except json.JSONDecodeError:
                pass  # Fall back to basic options
        
        if columnMapping:
            try:
                parsed_column_mapping = json.loads(columnMapping)
                conversion_options["columnMapping"] = parsed_column_mapping
            except json.JSONDecodeError:
                pass  # Fall back to basic options
        
        # Create conversion task
        task_data = ConversionTaskCreate(
            original_file_path=str(file_path),
            original_filename=file.filename,
            original_format=detected_format,
            target_format="CF1.8",
            conversion_options=conversion_options
        )
        
        task = crud_conversion_task.create(db, obj_in=task_data)
        
        # Start conversion
        success = await conversion_service.start_conversion(db, task.id)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to start conversion")
        
        return {
            "message": f"File {file.filename} uploaded and conversion started",
            "task_id": task.id,
            "detected_format": detected_format,
            "filename": file.filename
        }
        
    except Exception as e:
        # Clean up uploaded file if conversion fails
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tasks", response_model=List[ConversionTaskResponse])
async def get_conversion_tasks(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """获取转换任务列表"""
    tasks = crud_conversion_task.get_multi(db, skip=skip, limit=limit, status=status)
    return tasks

@router.get("/tasks/{task_id}", response_model=ConversionTaskResponse)
async def get_conversion_task(task_id: int, db: Session = Depends(get_db)):
    """获取转换任务详情"""
    task = crud_conversion_task.get(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Conversion task not found")
    return task

@router.post("/tasks/{task_id}/cancel", response_model=MessageResponse)
async def cancel_conversion_task(task_id: int, db: Session = Depends(get_db)):
    """取消转换任务"""
    task = crud_conversion_task.get(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Conversion task not found")
    
    if task.status not in ["pending", "processing"]:
        raise HTTPException(status_code=400, detail="Task cannot be cancelled in current status")
    
    success = await conversion_service.cancel_conversion(db, task_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to cancel conversion task")
    
    return {"message": f"Conversion task {task_id} cancelled"}

@router.get("/nc-files")
async def get_nc_files(
    skip: int = Query(0, alias="offset"),  # Accept both skip and offset
    limit: int = 5,  # Default to 5 per page
    conversion_status: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """获取所有NetCDF文件"""
    files = crud_nc_file.get_multi(db, skip=skip, limit=limit, conversion_status=conversion_status)
    total = crud_nc_file.get_count(db, conversion_status=conversion_status)
    
    return {
        "files": files,
        "total": total,
        "skip": skip,
        "limit": limit
    }

@router.get("/nc-files/{file_id}", response_model=NCFileResponse)
async def get_nc_file(file_id: int, db: Session = Depends(get_db)):
    """获取NetCDF文件详情"""
    nc_file = crud_nc_file.get(db, file_id)
    if not nc_file:
        raise HTTPException(status_code=404, detail="NetCDF file not found")
    return nc_file

@router.get("/nc-files/{file_id}/preview")
async def get_nc_file_preview(file_id: int, limit: int = Query(100, le=1000), db: Session = Depends(get_db)):
    """获取NetCDF文件的数据预览"""
    import xarray as xr
    import pandas as pd
    
    nc_file = crud_nc_file.get(db, file_id)
    if not nc_file:
        raise HTTPException(status_code=404, detail="NetCDF file not found")
    
    file_path = Path(nc_file.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="NetCDF file not found on disk")
    
    try:
        # 打开NetCDF文件
        with xr.open_dataset(file_path) as ds:
            # 获取所有列名（数据变量 + 有意义的坐标变量）
            meaningful_coords = [coord for coord in ds.coords.keys() if coord != 'index']
            all_columns = meaningful_coords + list(ds.data_vars.keys())
            
            preview_data = {
                "columns": all_columns,
                "coordinates": list(ds.coords.keys()),
                "sample_data": [],
                "total_rows": 0,
                "data_types": {},
                "has_coordinates": bool(ds.coords),
                "has_time_column": 'time' in ds.coords,
                "detected_variables": list(ds.data_vars.keys())
            }
            
            # 获取数据类型信息 - 包括数据变量
            for var_name, var in ds.data_vars.items():
                preview_data["data_types"][var_name] = str(var.dtype)
            
            # 获取坐标变量的数据类型
            for coord_name, coord in ds.coords.items():
                preview_data["data_types"][coord_name] = str(coord.dtype)
            
            # 如果有数据变量或坐标变量，尝试转换为DataFrame获取前N行数据
            if ds.data_vars or ds.coords:
                try:
                    # 转换为DataFrame - 只取前limit行
                    df = ds.to_dataframe()
                    if not df.empty:
                        # 检查是否有有意义的索引（坐标变量）
                        if df.index.name is not None or isinstance(df.index, pd.MultiIndex):
                            # 有有意义的索引，重置并包含在数据中
                            df_reset = df.reset_index()
                        else:
                            # 只是默认的数字索引，不需要重置
                            df_reset = df
                        
                        # 限制行数
                        df_limited = df_reset.head(limit)
                        preview_data["total_rows"] = len(df)
                        
                        # 转换为字典列表，处理NaN值
                        sample_data = []
                        for _, row in df_limited.iterrows():
                            row_dict = {}
                            # 只包含实际的数据列，排除默认索引
                            for col in df_limited.columns:
                                if col != 'index':  # 排除默认索引列
                                    value = row[col]
                                    if pd.isna(value):
                                        row_dict[col] = None
                                    elif isinstance(value, (pd.Timestamp, pd.DatetimeIndex)):
                                        row_dict[col] = value.isoformat() if hasattr(value, 'isoformat') else str(value)
                                    else:
                                        row_dict[col] = value
                            sample_data.append(row_dict)
                        
                        preview_data["sample_data"] = sample_data
                        
                        # 更新列信息，过滤掉默认索引列
                        df_columns = [col for col in df_limited.columns if col != 'index']
                        preview_data["columns"] = df_columns
                        
                        
                except Exception as e:
                    # 如果DataFrame转换失败，提供基本信息
                    preview_data["error"] = f"无法转换为表格格式: {str(e)}"
                    # 即使转换失败，也确保返回列信息
                    preview_data["columns"] = all_columns
            
            return preview_data
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read NetCDF file: {str(e)}")

@router.delete("/nc-files/{file_id}", response_model=MessageResponse)
async def delete_nc_file(file_id: int, db: Session = Depends(get_db)):
    """删除NetCDF文件"""
    nc_file = crud_nc_file.get(db, file_id)
    if not nc_file:
        raise HTTPException(status_code=404, detail="NetCDF file not found")
    
    # Delete physical file
    try:
        file_path = Path(nc_file.file_path)
        if file_path.exists():
            file_path.unlink()
    except Exception as e:
        # Log error but continue with database deletion
        pass
    
    # Delete database record
    crud_nc_file.remove(db, id=file_id)
    return {"message": f"NetCDF file {file_id} deleted successfully"}

@router.post("/nc-files/cleanup-duplicates", response_model=MessageResponse)
async def cleanup_duplicate_nc_files(db: Session = Depends(get_db)):
    """清理重复的NetCDF文件，只保留每个原始文件名的最新版本"""
    from sqlalchemy import func
    from pathlib import Path
    
    try:
        # 找出所有重复的记录（除了最新的）
        subquery = (
            db.query(
                NCFile.original_filename,
                func.max(NCFile.id).label('max_id')
            )
            .group_by(NCFile.original_filename)
            .subquery()
        )
        
        # 获取需要删除的记录
        duplicates_to_delete = (
            db.query(NCFile)
            .filter(
                ~NCFile.id.in_(
                    db.query(subquery.c.max_id)
                )
            )
            .all()
        )
        
        deleted_count = 0
        deleted_files = 0
        
        # 删除重复的数据库记录和物理文件
        for nc_file in duplicates_to_delete:
            # 删除物理文件
            try:
                file_path = Path(nc_file.file_path)
                if file_path.exists():
                    file_path.unlink()
                    deleted_files += 1
            except Exception as e:
                # 记录错误但继续处理
                pass
            
            # 删除数据库记录
            db.delete(nc_file)
            deleted_count += 1
        
        db.commit()
        
        return {
            "message": f"清理完成：删除了 {deleted_count} 条重复记录和 {deleted_files} 个重复文件"
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"清理重复文件失败: {str(e)}")

@router.get("/formats")
async def get_supported_formats():
    """获取支持的文件格式"""
    return {
        "supported_formats": list(conversion_service.supported_formats.keys()),
        "descriptions": {
            "csv": "Comma-separated values",
            "txt": "Plain text files", 
            "tiff": "Tagged Image File Format",
            "tif": "Tagged Image File Format",
            "hdf": "Hierarchical Data Format 5",
            "hdf5": "Hierarchical Data Format 5",
            "h5": "Hierarchical Data Format 5",
            "grib": "GRIdded Binary format",
            "grib2": "GRIdded Binary format version 2",
            "nc": "Network Common Data Form",
            "netcdf": "Network Common Data Form"
        }
    }

@router.get("/tasks/{task_id}/status")
async def get_detailed_conversion_status(task_id: int, db: Session = Depends(get_db)):
    """获取转换任务的详细状态信息"""
    try:
        status_info = conversion_service.get_conversion_status(db, task_id)
        if "error" in status_info:
            raise HTTPException(status_code=404, detail=status_info["error"])
        
        return status_info
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get conversion status: {str(e)}")

@router.get("/health")
async def get_conversion_service_health():
    """获取数据转换服务健康状态"""
    try:
        health_info = conversion_service.get_service_health()
        return health_info
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")

@router.get("/stats")
async def get_conversion_stats(db: Session = Depends(get_db)):
    """获取转换服务统计信息"""
    try:
        # Get active conversions count
        active_count = conversion_service.get_active_conversions_count()
        
        # Get task statistics from database (简化版本)
        total_tasks = db.query(func.count(ConversionTask.id)).scalar()
        completed_tasks = db.query(func.count(ConversionTask.id)).filter(
            ConversionTask.status == "completed"
        ).scalar()
        failed_tasks = db.query(func.count(ConversionTask.id)).filter(
            ConversionTask.status == "failed"
        ).scalar()
        
        return {
            "active_conversions": active_count,
            "total_tasks": total_tasks or 0,
            "completed_tasks": completed_tasks or 0,
            "failed_tasks": failed_tasks or 0,
            "success_rate": (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")