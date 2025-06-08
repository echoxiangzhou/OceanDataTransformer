from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, Query, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import shutil
import tempfile
from pathlib import Path

from app.db.session import get_db
from app.schemas.import_wizard import (
    ImportWizardSessionCreate,
    ImportWizardSessionUpdate,
    ImportWizardSession,
    FileValidationResponse,
    DataPreviewRequest,
    DataPreviewResponse,
    ConversionRequest,
    ConversionResult,
    CFComplianceCheck,
    ColumnMapping,
    MetadataConfig
)
from app.schemas.common import (
    MessageResponse,
    StandardResponse,
    ErrorDetail,
    ValidationResult
)
from app.services.import_wizard_service import import_wizard_service
from app.services.validation_service import validation_service
from app.core.config import settings

router = APIRouter()


@router.post("/sessions", response_model=StandardResponse)
async def create_import_session(
    file: UploadFile = File(...),
    session_duration_hours: int = Form(24),
    db: Session = Depends(get_db)
):
    """创建导入向导会话并上传文件"""
    try:
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file provided")
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=f"_{file.filename}") as temp_file:
            shutil.copyfileobj(file.file, temp_file)
            temp_path = temp_file.name
        
        # Create session
        session_create = ImportWizardSessionCreate(
            original_filename=file.filename,
            session_duration_hours=session_duration_hours
        )
        
        session = await import_wizard_service.create_session(db, session_create, temp_path)
        
        return StandardResponse(
            success=True,
            data={
                'session_id': session.session_id,
                'filename': session.original_filename,
                'file_type': session.file_type.value,
                'expires_at': session.expires_at.isoformat()
            }
        )
        
    except Exception as e:
        # Cleanup temp file on error
        if 'temp_path' in locals() and os.path.exists(temp_path):
            os.unlink(temp_path)
        
        return StandardResponse(
            success=False,
            error=ErrorDetail(
                code="SESSION_CREATION_FAILED",
                message=str(e)
            )
        )


@router.get("/sessions/{session_id}", response_model=StandardResponse)
async def get_import_session(session_id: str):
    """获取导入向导会话信息"""
    try:
        session = await import_wizard_service.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found or expired")
        
        return StandardResponse(
            success=True,
            data=session.dict()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        return StandardResponse(
            success=False,
            error=ErrorDetail(
                code="SESSION_RETRIEVAL_FAILED",
                message=str(e)
            )
        )


@router.put("/sessions/{session_id}", response_model=StandardResponse)
async def update_import_session(
    session_id: str,
    session_update: ImportWizardSessionUpdate
):
    """更新导入向导会话"""
    try:
        session = await import_wizard_service.update_session(session_id, session_update)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found or expired")
        
        return StandardResponse(
            success=True,
            data=session.dict()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        return StandardResponse(
            success=False,
            error=ErrorDetail(
                code="SESSION_UPDATE_FAILED",
                message=str(e)
            )
        )


@router.post("/sessions/{session_id}/validate", response_model=StandardResponse)
async def validate_session_file(session_id: str):
    """验证会话中的文件"""
    try:
        validation_result = await import_wizard_service.validate_file(session_id)
        
        return StandardResponse(
            success=True,
            data=validation_result.dict()
        )
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        return StandardResponse(
            success=False,
            error=ErrorDetail(
                code="FILE_VALIDATION_FAILED",
                message=str(e)
            )
        )


@router.post("/sessions/{session_id}/extract-metadata", response_model=StandardResponse)
async def extract_session_metadata(session_id: str):
    """提取会话文件的元数据信息"""
    try:
        metadata_config = await import_wizard_service.extract_metadata(session_id)
        
        return StandardResponse(
            success=True,
            data=metadata_config.dict()
        )
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        return StandardResponse(
            success=False,
            error=ErrorDetail(
                code="METADATA_EXTRACTION_FAILED",
                message=str(e)
            )
        )

@router.post("/sessions/{session_id}/preview", response_model=StandardResponse)
async def preview_session_data(
    session_id: str,
    preview_request: DataPreviewRequest
):
    """预览会话中的数据"""
    try:
        preview_result = await import_wizard_service.preview_data(session_id, preview_request)
        
        return StandardResponse(
            success=True,
            data=preview_result.dict()
        )
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        return StandardResponse(
            success=False,
            error=ErrorDetail(
                code="DATA_PREVIEW_FAILED",
                message=str(e)
            )
        )


@router.post("/sessions/{session_id}/convert", response_model=StandardResponse)
async def convert_session_data(
    session_id: str,
    conversion_request: ConversionRequest,
    db: Session = Depends(get_db)
):
    """转换会话中的数据为NetCDF格式"""
    try:
        conversion_result = await import_wizard_service.convert_data(
            db, session_id, conversion_request
        )
        
        return StandardResponse(
            success=conversion_result.success,
            data=conversion_result.dict(),
            error=ErrorDetail(
                code="CONVERSION_FAILED",
                message=conversion_result.error_message
            ) if not conversion_result.success else None
        )
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        return StandardResponse(
            success=False,
            error=ErrorDetail(
                code="CONVERSION_ERROR",
                message=str(e)
            )
        )


@router.get("/sessions/{session_id}/cf-compliance", response_model=StandardResponse)
async def check_session_cf_compliance(session_id: str):
    """检查会话文件的CF合规性"""
    try:
        compliance_result = await import_wizard_service.check_cf_compliance(session_id)
        
        return StandardResponse(
            success=True,
            data=compliance_result.dict()
        )
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        return StandardResponse(
            success=False,
            error=ErrorDetail(
                code="CF_COMPLIANCE_CHECK_FAILED",
                message=str(e)
            )
        )


@router.delete("/sessions/{session_id}", response_model=StandardResponse)
async def delete_import_session(session_id: str):
    """删除导入向导会话"""
    try:
        success = await import_wizard_service.delete_session(session_id)
        
        return StandardResponse(
            success=success,
            data={'message': f'Session {session_id} deleted successfully' if success else 'Session not found'}
        )
        
    except Exception as e:
        return StandardResponse(
            success=False,
            error=ErrorDetail(
                code="SESSION_DELETE_FAILED",
                message=str(e)
            )
        )


@router.post("/validate-column-mapping", response_model=StandardResponse)
async def validate_column_mapping(
    column_mapping: List[ColumnMapping],
    available_columns: List[str]
):
    """验证列映射配置"""
    try:
        validation_result = validation_service.validate_column_mapping(
            column_mapping, available_columns
        )
        
        return StandardResponse(
            success=validation_result.is_valid,
            data=validation_result.dict()
        )
        
    except Exception as e:
        return StandardResponse(
            success=False,
            error=ErrorDetail(
                code="COLUMN_MAPPING_VALIDATION_FAILED",
                message=str(e)
            )
        )


@router.post("/validate-metadata-config", response_model=StandardResponse)
async def validate_metadata_config(metadata_config: MetadataConfig):
    """验证元数据配置"""
    try:
        validation_result = validation_service.validate_metadata_config(metadata_config)
        
        return StandardResponse(
            success=validation_result.is_valid,
            data=validation_result.dict()
        )
        
    except Exception as e:
        return StandardResponse(
            success=False,
            error=ErrorDetail(
                code="METADATA_CONFIG_VALIDATION_FAILED",
                message=str(e)
            )
        )


@router.get("/cf-standard-names", response_model=StandardResponse)
async def get_cf_standard_names(
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(100, le=1000)
):
    """获取CF标准名称列表"""
    try:
        # Mock CF standard names - in production, this would come from a database or CF vocabulary
        standard_names = [
            {
                "name": "air_temperature",
                "description": "Air temperature",
                "units": "K",
                "category": "atmospheric"
            },
            {
                "name": "sea_water_temperature", 
                "description": "Sea water temperature",
                "units": "K",
                "category": "oceanic"
            },
            {
                "name": "sea_water_salinity",
                "description": "Sea water salinity",
                "units": "1",
                "category": "oceanic"
            },
            {
                "name": "sea_surface_height",
                "description": "Sea surface height above geoid",
                "units": "m",
                "category": "oceanic"
            },
            {
                "name": "eastward_sea_water_velocity",
                "description": "Eastward velocity of sea water",
                "units": "m s-1",
                "category": "oceanic"
            },
            {
                "name": "northward_sea_water_velocity",
                "description": "Northward velocity of sea water", 
                "units": "m s-1",
                "category": "oceanic"
            }
        ]
        
        # Apply filters
        if category:
            standard_names = [name for name in standard_names if name["category"] == category]
        
        if search:
            search_lower = search.lower()
            standard_names = [
                name for name in standard_names 
                if search_lower in name["name"].lower() or search_lower in name["description"].lower()
            ]
        
        # Apply limit
        standard_names = standard_names[:limit]
        
        return StandardResponse(
            success=True,
            data={
                'standard_names': standard_names,
                'total': len(standard_names)
            }
        )
        
    except Exception as e:
        return StandardResponse(
            success=False,
            error=ErrorDetail(
                code="CF_STANDARD_NAMES_FAILED",
                message=str(e)
            )
        )


@router.get("/sessions", response_model=StandardResponse)
async def list_import_sessions():
    """列出活跃的导入向导会话"""
    try:
        active_count = import_wizard_service.get_active_sessions_count()
        
        return StandardResponse(
            success=True,
            data={
                'active_sessions': active_count,
                'message': f'{active_count} active import sessions'
            }
        )
        
    except Exception as e:
        return StandardResponse(
            success=False,
            error=ErrorDetail(
                code="SESSION_LIST_FAILED",
                message=str(e)
            )
        )


@router.get("/health", response_model=StandardResponse)
async def import_wizard_health():
    """导入向导服务健康检查"""
    try:
        active_sessions = import_wizard_service.get_active_sessions_count()
        
        return StandardResponse(
            success=True,
            data={
                'status': 'healthy',
                'active_sessions': active_sessions,
                'max_file_size_mb': validation_service.max_file_size / (1024 * 1024),
                'supported_formats': list(validation_service.supported_formats.keys())
            }
        )
        
    except Exception as e:
        return StandardResponse(
            success=False,
            error=ErrorDetail(
                code="HEALTH_CHECK_FAILED",
                message=str(e)
            )
        )