import asyncio
import uuid
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any, List, Optional
import tempfile
import shutil

import pandas as pd
import xarray as xr
import numpy as np
from sqlalchemy.orm import Session

from app.schemas.import_wizard import (
    ImportWizardSession,
    ImportWizardSessionCreate,
    ImportWizardSessionUpdate,
    FileValidationRequest,
    FileValidationResponse,
    DataPreviewRequest,
    DataPreviewResponse,
    ConversionRequest,
    ConversionResult,
    ColumnMapping,
    MetadataConfig,
    CFComplianceCheck,
    FileType
)
from app.schemas.common import ErrorDetail, ProgressUpdate
from app.services.validation_service import validation_service
from app.services.data_conversion_service import conversion_service
from app.services.metadata_extraction_service import metadata_extraction_service
from app.crud.crud_nc_file import nc_file as crud_nc_file
from app.core.config import settings
from app.utils.data_conversion import convert_numpy_types

logger = logging.getLogger(__name__)


class ImportWizardService:
    """Enhanced import wizard service with session management"""
    
    def __init__(self):
        self.active_sessions: Dict[str, ImportWizardSession] = {}
        self.active_conversions: Dict[str, asyncio.Task] = {}
        self.session_cleanup_interval = 3600  # 1 hour
        
        # Start cleanup task (only if event loop is running)
        try:
            asyncio.create_task(self._cleanup_expired_sessions())
        except RuntimeError:
            # No event loop running, cleanup task will be started later
            pass
    
    async def create_session(self, db: Session, session_create: ImportWizardSessionCreate, 
                           file_path: str) -> ImportWizardSession:
        """Create a new import wizard session"""
        try:
            session_id = str(uuid.uuid4())
            now = datetime.utcnow()
            expires_at = now + timedelta(hours=session_create.session_duration_hours)
            
            # Detect file type if not provided
            file_type = session_create.file_type
            if not file_type:
                detected_type = validation_service._detect_file_type(file_path, session_create.original_filename)
                file_type = detected_type or FileType.CSV
            
            session = ImportWizardSession(
                session_id=session_id,
                file_path=file_path,
                original_filename=session_create.original_filename,
                file_type=file_type,
                current_step="upload",
                created_at=now,
                updated_at=now,
                expires_at=expires_at
            )
            
            # Store session in memory
            self.active_sessions[session_id] = session
            
            logger.info(f"Created import wizard session {session_id} for file {session_create.original_filename}")
            return session
            
        except Exception as e:
            logger.error(f"Failed to create import session: {e}")
            raise
    
    async def get_session(self, session_id: str) -> Optional[ImportWizardSession]:
        """Get import wizard session by ID"""
        session = self.active_sessions.get(session_id)
        if session and session.expires_at > datetime.utcnow():
            return session
        elif session:
            # Session expired, remove it
            await self._cleanup_session(session_id)
        return None
    
    async def update_session(self, session_id: str, 
                           session_update: ImportWizardSessionUpdate) -> Optional[ImportWizardSession]:
        """Update import wizard session"""
        session = await self.get_session(session_id)
        if not session:
            return None
        
        # Update fields
        update_data = session_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(session, field, value)
        
        session.updated_at = datetime.utcnow()
        
        # Store back
        self.active_sessions[session_id] = session
        
        logger.debug(f"Updated session {session_id}")
        return session
    
    async def validate_file(self, session_id: str) -> FileValidationResponse:
        """Validate file in import session"""
        session = await self.get_session(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found or expired")
        
        try:
            # Perform validation
            validation_result = validation_service.validate_file_upload(
                session.file_path, 
                session.original_filename
            )
            
            # Update session with validation result
            await self.update_session(session_id, ImportWizardSessionUpdate(
                current_step="validate",
                validation_result=validation_result
            ))
            
            return validation_result
            
        except Exception as e:
            logger.error(f"File validation failed for session {session_id}: {e}")
            raise
    
    async def extract_metadata(self, session_id: str) -> MetadataConfig:
        """从文件中提取元数据信息"""
        session = await self.get_session(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found or expired")
        
        try:
            # 使用元数据提取服务
            metadata_config = metadata_extraction_service.extract_metadata_from_file(
                session.file_path,
                session.file_type,
                session.original_filename
            )
            
            # 更新会话，保存提取的元数据
            await self.update_session(session_id, ImportWizardSessionUpdate(
                current_step="metadata",
                metadata_config=metadata_config
            ))
            
            logger.info(f"成功提取文件元数据: {session.original_filename}")
            return metadata_config
            
        except Exception as e:
            logger.error(f"Metadata extraction failed for session {session_id}: {e}")
            raise
    
    async def preview_data(self, session_id: str, 
                          preview_request: DataPreviewRequest) -> DataPreviewResponse:
        """Generate data preview for import session"""
        session = await self.get_session(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found or expired")
        
        try:
            # Use file path from session if not provided in request
            file_path = preview_request.file_path or session.file_path
            
            # Generate preview based on file type
            if session.file_type in [FileType.CSV, FileType.TXT]:
                return await self._preview_tabular_data(
                    file_path, 
                    preview_request.limit,
                    preview_request.column_mapping,
                    preview_request.metadata_config
                )
            elif session.file_type == FileType.NETCDF:
                return await self._preview_netcdf_data(
                    file_path,
                    preview_request.limit
                )
            else:
                raise ValueError(f"Preview not supported for file type: {session.file_type}")
                
        except Exception as e:
            logger.error(f"Data preview failed for session {session_id}: {e}")
            raise
    
    async def _preview_tabular_data(self, file_path: str, limit: int,
                                   column_mapping: Optional[List[ColumnMapping]] = None,
                                   metadata_config: Optional[MetadataConfig] = None) -> DataPreviewResponse:
        """Preview tabular data (CSV/TXT)"""
        try:
            # Read data
            if file_path.endswith('.csv'):
                df = pd.read_csv(file_path, nrows=limit)
            else:
                # Try different delimiters for text files
                for delimiter in ['\t', ' ', ';', '|']:
                    try:
                        df = pd.read_csv(file_path, delimiter=delimiter, nrows=limit)
                        if len(df.columns) > 1:
                            break
                    except:
                        continue
                else:
                    raise ValueError("Could not parse text file")
            
            # Get total row count
            with open(file_path, 'r') as f:
                total_rows = sum(1 for line in f) - 1  # subtract header
            
            # Identify coordinate and data variables based on mapping
            coordinate_vars = []
            data_vars = []
            
            if column_mapping:
                for mapping in column_mapping:
                    if mapping.type.value == 'coordinate':
                        coordinate_vars.append(mapping.original_name)
                    elif mapping.type.value == 'variable':
                        data_vars.append(mapping.original_name)
            else:
                # Auto-detect potential coordinates
                coord_indicators = ['lat', 'lon', 'time', 'depth', 'level', 'x', 'y', 'z']
                for col in df.columns:
                    col_lower = col.lower()
                    if any(indicator in col_lower for indicator in coord_indicators):
                        coordinate_vars.append(col)
                    else:
                        data_vars.append(col)
            
            # Convert DataFrame to dict records
            sample_data = []
            for _, row in df.iterrows():
                row_dict = {}
                for col in df.columns:
                    value = row[col]
                    if pd.isna(value):
                        row_dict[col] = None
                    elif isinstance(value, (pd.Timestamp, pd.DatetimeIndex)):
                        row_dict[col] = value.isoformat() if hasattr(value, 'isoformat') else str(value)
                    else:
                        # 转换NumPy类型为Python原生类型
                        row_dict[col] = convert_numpy_types(value)
                sample_data.append(row_dict)
            
            # Get data types
            data_types = {col: str(dtype) for col, dtype in df.dtypes.items()}
            
            # Generate metadata preview if config provided
            metadata_preview = None
            if metadata_config:
                metadata_preview = self._generate_metadata_preview(metadata_config)
            
            return DataPreviewResponse(
                columns=df.columns.tolist(),
                sample_data=sample_data,  # 已经在构建时转换过
                total_rows=total_rows,
                data_types=data_types,
                coordinate_variables=coordinate_vars,
                data_variables=data_vars,
                metadata_preview=metadata_preview  # 已经在构建时转换过
            )
            
        except Exception as e:
            logger.error(f"Tabular data preview failed: {e}")
            raise
    
    async def _preview_netcdf_data(self, file_path: str, limit: int) -> DataPreviewResponse:
        """Preview NetCDF data"""
        try:
            # 尝试多种方式打开NetCDF文件
            ds = None
            error_messages = []
            
            # 方法1: 标准xarray打开
            try:
                ds = xr.open_dataset(file_path)
            except Exception as e:
                error_messages.append(f"Standard xarray: {str(e)}")
                
            # 方法2: 如果标准方式失败，尝试使用不同的引擎
            if ds is None:
                try:
                    ds = xr.open_dataset(file_path, engine='netcdf4')
                except Exception as e:
                    error_messages.append(f"NetCDF4 engine: {str(e)}")
                    
            # 方法3: 尝试使用scipy引擎
            if ds is None:
                try:
                    ds = xr.open_dataset(file_path, engine='scipy')
                except Exception as e:
                    error_messages.append(f"Scipy engine: {str(e)}")
            
            # 如果所有方法都失败，返回基本信息
            if ds is None:
                logger.warning(f"Cannot open NetCDF file {file_path}: {'; '.join(error_messages)}")
                return self._create_fallback_netcdf_preview(file_path, error_messages)
            
            with ds:
                # Get coordinate and data variables
                coordinate_vars = list(ds.coords.keys())
                data_vars = list(ds.data_vars.keys())
                all_columns = coordinate_vars + data_vars
                
                # 如果没有数据变量，返回基本信息
                if not coordinate_vars and not data_vars:
                    return self._create_minimal_netcdf_preview(ds, file_path)
                
                # Convert to DataFrame for preview
                df = None
                try:
                    df = ds.to_dataframe()
                except Exception as e:
                    logger.warning(f"Cannot convert NetCDF to DataFrame: {e}")
                    return self._create_minimal_netcdf_preview(ds, file_path)
                
                if not df.empty:
                    # Reset index if meaningful
                    if df.index.name is not None or isinstance(df.index, pd.MultiIndex):
                        df = df.reset_index()
                    
                    # Limit rows
                    df_limited = df.head(limit)
                    
                    # Convert to sample data
                    sample_data = []
                    for _, row in df_limited.iterrows():
                        row_dict = {}
                        for col in df_limited.columns:
                            if col != 'index':  # Skip default index
                                value = row[col]
                                if pd.isna(value):
                                    row_dict[col] = None
                                elif isinstance(value, (pd.Timestamp, pd.DatetimeIndex)):
                                    row_dict[col] = value.isoformat() if hasattr(value, 'isoformat') else str(value)
                                else:
                                    # 转换NumPy类型为Python原生类型
                                    row_dict[col] = convert_numpy_types(value)
                        sample_data.append(row_dict)
                    
                    columns = [col for col in df_limited.columns if col != 'index']
                    total_rows = len(df)
                else:
                    sample_data = []
                    columns = all_columns
                    total_rows = 0
                
                # Get data types
                data_types = {}
                for var_name, var in ds.data_vars.items():
                    data_types[var_name] = str(var.dtype)
                for coord_name, coord in ds.coords.items():
                    data_types[coord_name] = str(coord.dtype)
                
                return DataPreviewResponse(
                    columns=columns,
                    sample_data=sample_data,
                    total_rows=total_rows,
                    data_types=data_types,
                    coordinate_variables=coordinate_vars,
                    data_variables=data_vars
                )
                
        except Exception as e:
            logger.error(f"NetCDF data preview failed: {e}")
            # 使用回退机制返回基本信息而不是抛出异常
            return self._create_fallback_netcdf_preview(file_path, [f"Final error: {str(e)}"])
    
    def _generate_metadata_preview(self, metadata_config: MetadataConfig) -> Dict[str, Any]:
        """Generate metadata preview from configuration"""
        preview = {}
        
        if metadata_config.basic_info:
            basic = metadata_config.basic_info
            if basic.title:
                preview['title'] = basic.title
            if basic.summary:
                preview['summary'] = basic.summary
            if basic.keywords:
                preview['keywords'] = basic.keywords
        
        if metadata_config.institution_info:
            inst = metadata_config.institution_info
            if inst.institution:
                preview['institution'] = inst.institution
            if inst.source:
                preview['source'] = inst.source
            if inst.creator_name:
                preview['creator_name'] = inst.creator_name
        
        if metadata_config.spatiotemporal_coverage:
            coverage = metadata_config.spatiotemporal_coverage
            if coverage.geospatial_lat_min is not None:
                preview['geospatial_lat_min'] = coverage.geospatial_lat_min
            if coverage.geospatial_lat_max is not None:
                preview['geospatial_lat_max'] = coverage.geospatial_lat_max
            if coverage.geospatial_lon_min is not None:
                preview['geospatial_lon_min'] = coverage.geospatial_lon_min
            if coverage.geospatial_lon_max is not None:
                preview['geospatial_lon_max'] = coverage.geospatial_lon_max
        
        preview['conventions'] = 'CF-1.8'
        preview['history'] = f'{datetime.utcnow().isoformat()}: Created using Ocean Data Platform Import Wizard'
        
        return convert_numpy_types(preview)
    
    async def convert_data(self, db: Session, session_id: str, 
                          conversion_request: ConversionRequest) -> ConversionResult:
        """Convert data using import wizard session"""
        session = await self.get_session(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found or expired")
        
        try:
            # Generate output path if not provided
            output_path = conversion_request.output_path
            if not output_path:
                output_dir = Path(settings.NETCDF_DIR)
                output_dir.mkdir(parents=True, exist_ok=True)
                output_filename = f"{Path(session.original_filename).stem}_cf18.nc"
                output_path = str(output_dir / output_filename)
            
            # Prepare conversion options for the existing conversion service
            conversion_options = {
                'metadata': conversion_request.metadata_config.dict() if conversion_request.metadata_config else {},
                'columnMapping': {mapping.original_name: mapping.dict() for mapping in conversion_request.column_mapping}
            }
            
            # Use existing conversion service
            if session.file_type == FileType.CSV:
                result = await conversion_service._convert_csv_with_metadata(
                    session.file_path,
                    output_path,
                    conversion_options
                )
            elif session.file_type == FileType.NETCDF:
                result = await conversion_service._validate_and_convert_netcdf(
                    session.file_path,
                    output_path,
                    conversion_options
                )
            else:
                raise ValueError(f"Conversion not supported for file type: {session.file_type}")
            
            # Create NC file record
            nc_file_data = {
                "original_filename": session.original_filename,
                "converted_filename": Path(output_path).name,
                "original_format": session.file_type.value,
                "file_path": output_path,
                "file_size": Path(output_path).stat().st_size if Path(output_path).exists() else None,
                "conversion_status": "completed",
                "processed_at": datetime.utcnow(),
                **conversion_service._clean_metadata(result)
            }
            
            nc_file_obj = crud_nc_file.create(db, obj_in=nc_file_data)
            
            # Update session with conversion task
            await self.update_session(session_id, ImportWizardSessionUpdate(
                current_step="completed",
                conversion_task_id=str(nc_file_obj.id)
            ))
            
            return ConversionResult(
                success=True,
                output_path=output_path,
                nc_file_id=nc_file_obj.id,
                cf_compliant=result.get('is_cf_compliant', True),
                quality_score=result.get('data_quality_score'),
                processing_log=result.get('processing_log', 'Conversion completed successfully')
            )
            
        except Exception as e:
            logger.error(f"Data conversion failed for session {session_id}: {e}")
            
            # Update session with error
            await self.update_session(session_id, ImportWizardSessionUpdate(
                current_step="failed"
            ))
            
            return ConversionResult(
                success=False,
                error_message=str(e)
            )
    
    async def check_cf_compliance(self, session_id: str) -> CFComplianceCheck:
        """Check CF compliance for converted file"""
        session = await self.get_session(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found or expired")
        
        return validation_service.validate_cf_compliance(session.file_path)
    
    async def delete_session(self, session_id: str) -> bool:
        """Delete import wizard session and cleanup files"""
        return await self._cleanup_session(session_id)
    
    async def _cleanup_session(self, session_id: str) -> bool:
        """Cleanup session and associated files"""
        try:
            session = self.active_sessions.pop(session_id, None)
            if session:
                # Cleanup temporary files if they exist
                try:
                    file_path = Path(session.file_path)
                    if file_path.exists() and str(file_path).startswith('/tmp'):
                        file_path.unlink()
                except Exception as e:
                    logger.warning(f"Failed to cleanup session file {session.file_path}: {e}")
                
                # Cancel any active conversion tasks
                if session_id in self.active_conversions:
                    task = self.active_conversions.pop(session_id)
                    if not task.done():
                        task.cancel()
                
                logger.debug(f"Cleaned up session {session_id}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Session cleanup failed for {session_id}: {e}")
            return False
    
    async def _cleanup_expired_sessions(self):
        """Background task to cleanup expired sessions"""
        while True:
            try:
                now = datetime.utcnow()
                expired_sessions = [
                    session_id for session_id, session in self.active_sessions.items()
                    if session.expires_at <= now
                ]
                
                for session_id in expired_sessions:
                    await self._cleanup_session(session_id)
                
                if expired_sessions:
                    logger.info(f"Cleaned up {len(expired_sessions)} expired sessions")
                
            except Exception as e:
                logger.error(f"Session cleanup task failed: {e}")
            
            # Wait before next cleanup
            await asyncio.sleep(self.session_cleanup_interval)
    
    def get_active_sessions_count(self) -> int:
        """Get number of active sessions"""
        return len(self.active_sessions)
    
    def get_session_info(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get session information for monitoring"""
        session = self.active_sessions.get(session_id)
        if session:
            return {
                'session_id': session.session_id,
                'filename': session.original_filename,
                'file_type': session.file_type.value,
                'current_step': session.current_step,
                'created_at': session.created_at.isoformat(),
                'updated_at': session.updated_at.isoformat(),
                'expires_at': session.expires_at.isoformat(),
                'is_expired': session.expires_at <= datetime.utcnow()
            }
        return None
    
    def _create_fallback_netcdf_preview(self, file_path: str, error_messages: list) -> DataPreviewResponse:
        """创建NetCDF文件的回退预览（当无法正常读取时）"""
        import os
        
        file_size = os.path.getsize(file_path) if os.path.exists(file_path) else 0
        
        return DataPreviewResponse(
            columns=['文件无法解析'],
            sample_data=[],
            total_rows=0,
            data_types={},
            coordinate_variables=[],
            data_variables=[],
            metadata_preview={
                'file_path': file_path,
                'file_size': file_size,
                'error_messages': error_messages,
                'status': 'NetCDF文件解析失败，可能是文件损坏或格式不支持'
            }
        )
    
    def _create_minimal_netcdf_preview(self, ds, file_path: str) -> DataPreviewResponse:
        """创建最小NetCDF预览（当有数据集但无法转换为DataFrame时）"""
        try:
            # 尝试获取基本信息
            coordinate_vars = list(ds.coords.keys()) if hasattr(ds, 'coords') else []
            data_vars = list(ds.data_vars.keys()) if hasattr(ds, 'data_vars') else []
            all_columns = coordinate_vars + data_vars
            
            # 尝试获取维度信息
            dimensions = {}
            if hasattr(ds, 'dims'):
                dimensions = convert_numpy_types(dict(ds.dims))
            
            # 尝试获取属性信息
            attrs = {}
            if hasattr(ds, 'attrs'):
                attrs = convert_numpy_types(dict(ds.attrs))
            
            # 尝试获取数据类型
            data_types = {}
            for var_name in coordinate_vars:
                if var_name in ds.coords:
                    data_types[var_name] = str(ds.coords[var_name].dtype)
            for var_name in data_vars:
                if var_name in ds.data_vars:
                    data_types[var_name] = str(ds.data_vars[var_name].dtype)
            
            return DataPreviewResponse(
                columns=all_columns,
                sample_data=[],
                total_rows=max(dimensions.values()) if dimensions else 0,
                data_types=data_types,
                coordinate_variables=coordinate_vars,
                data_variables=data_vars,
                metadata_preview={
                    'dimensions': dimensions,
                    'global_attributes': attrs,
                    'status': 'NetCDF结构信息已提取，但无法生成数据样本'
                }
            )
            
        except Exception as e:
            logger.warning(f"Cannot create minimal NetCDF preview: {e}")
            return self._create_fallback_netcdf_preview(file_path, [f"Minimal preview failed: {str(e)}"])


# Global instance
import_wizard_service = ImportWizardService()