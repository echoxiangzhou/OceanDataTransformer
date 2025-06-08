import asyncio
import os
import logging
import tempfile
import shutil
from pathlib import Path
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime, timedelta

from app.schemas.common import ErrorDetail, ValidationResult
from app.services.validation_service import validation_service

import numpy as np
import pandas as pd
import xarray as xr
import netCDF4 as nc
from PIL import Image
import h5py

from sqlalchemy.orm import Session
from app.crud.crud_nc_file import nc_file as crud_nc_file, conversion_task as crud_conversion_task
from app.core.config import settings
from app.db.session import SessionLocal
from .cf_converter import CFConverter
from .cf_validator import CFValidator
from .parsers.csv_parser import CSVParser

logger = logging.getLogger(__name__)


class DataConversionService:
    def __init__(self):
        self.active_conversions: Dict[int, asyncio.Task] = {}
        self.cf_converter = CFConverter()
        self.cf_validator = CFValidator()
        self.csv_parser = CSVParser()
        
        self.supported_formats = {
            'csv': self._convert_csv,
            'txt': self._convert_txt, 
            'tiff': self._convert_tiff,
            'tif': self._convert_tiff,
            'hdf': self._convert_hdf,
            'hdf5': self._convert_hdf,
            'h5': self._convert_hdf,
            'grib': self._convert_grib,
            'grib2': self._convert_grib,
            'nc': self._validate_and_convert_netcdf,
            'netcdf': self._validate_and_convert_netcdf
        }

    def detect_format(self, file_path: str) -> str:
        """Auto-detect file format based on extension and content"""
        file_path = Path(file_path)
        extension = file_path.suffix.lower().lstrip('.')
        
        # First check by extension
        if extension in self.supported_formats:
            return extension
            
        # Try to detect by content for some formats
        try:
            # Check if it's a NetCDF file
            with nc.Dataset(file_path, 'r'):
                return 'nc'
        except:
            pass
            
        try:
            # Check if it's an HDF5 file
            with h5py.File(file_path, 'r'):
                return 'hdf5'
        except:
            pass
            
        # Check if it's a CSV by trying to read first few lines
        try:
            with open(file_path, 'r') as f:
                first_line = f.readline()
                if ',' in first_line or ';' in first_line:
                    return 'csv'
        except:
            pass
            
        return 'unknown'

    async def start_conversion(self, db: Session, task_id: int) -> bool:
        """Start a conversion task with enhanced validation"""
        try:
            task = crud_conversion_task.get(db, task_id)
            if not task:
                logger.error(f"Conversion task {task_id} not found")
                return False

            # Validate file before conversion
            validation_result = validation_service.validate_file_upload(
                task.original_file_path, 
                task.original_filename
            )
            
            if not validation_result.is_valid:
                error_msg = "File validation failed: " + "; ".join(
                    [error.message for error in validation_result.validation_errors]
                )
                crud_conversion_task.set_status(db, task_id=task_id, status="failed", error_message=error_msg)
                return False

            # Update task status to running
            crud_conversion_task.set_status(db, task_id=task_id, status="processing")
            crud_conversion_task.update(db, db_obj=task, obj_in={"started_at": datetime.utcnow()})
            
            # Create conversion task
            conversion_coroutine = self._run_conversion(task_id, task.original_file_path, 
                                                     task.original_filename, task.original_format,
                                                     task.conversion_options or {})
            
            # Store the task for potential cancellation
            self.active_conversions[task_id] = asyncio.create_task(conversion_coroutine)
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to start conversion task {task_id}: {e}")
            crud_conversion_task.set_status(db, task_id=task_id, status="failed", error_message=str(e))
            return False

    async def _run_conversion(self, task_id: int, file_path: str, filename: str, 
                            file_format: str, options: Dict[str, Any]):
        """Run the actual conversion process"""
        async_db = SessionLocal()
        try:
            # Get the conversion function
            converter = self.supported_formats.get(file_format)
            if not converter:
                raise ValueError(f"Unsupported format: {file_format}")
            
            # Create output directory
            output_dir = Path(settings.NETCDF_DIR)
            output_dir.mkdir(parents=True, exist_ok=True)
            
            # Generate output filename
            output_filename = f"{Path(filename).stem}_cf18.nc"
            output_path = output_dir / output_filename
            
            # Update progress
            crud_conversion_task.update_progress(async_db, task_id=task_id, progress=10.0)
            
            # Run conversion
            result = await converter(file_path, str(output_path), options)
            
            # Update progress
            crud_conversion_task.update_progress(async_db, task_id=task_id, progress=90.0)
            
            # Create NC file record
            nc_file_data = {
                "original_filename": filename,
                "converted_filename": output_filename,
                "original_format": file_format,
                "file_path": str(output_path),
                "file_size": output_path.stat().st_size if output_path.exists() else None,
                "conversion_status": "completed",
                "processed_at": datetime.utcnow(),
                **self._clean_metadata(result)  # Include cleaned metadata from conversion
            }
            
            nc_file_obj = crud_nc_file.create(async_db, obj_in=nc_file_data)
            
            # Update task as completed
            crud_conversion_task.update(async_db, db_obj=crud_conversion_task.get(async_db, task_id), 
                                      obj_in={
                                          "status": "completed",
                                          "progress": 100.0,
                                          "nc_file_id": nc_file_obj.id,
                                          "completed_at": datetime.utcnow()
                                      })
            
            logger.info(f"Conversion task {task_id} completed successfully")
            
        except Exception as e:
            logger.error(f"Conversion task {task_id} failed: {e}")
            crud_conversion_task.set_status(async_db, task_id=task_id, status="failed", error_message=str(e))
        finally:
            async_db.close()
            if task_id in self.active_conversions:
                del self.active_conversions[task_id]

    async def _convert_csv(self, input_path: str, output_path: str, options: Dict[str, Any]) -> Dict[str, Any]:
        """Convert CSV file to NetCDF CF1.8 using enhanced parser"""
        try:
            # Check if we have enhanced metadata and column mapping
            if 'metadata' in options and 'columnMapping' in options:
                return await self._convert_csv_with_metadata(input_path, output_path, options)
            
            # Fallback to basic conversion for backward compatibility
            metadata = {
                'title': options.get('title'),
                'institution': options.get('institution'),
                'source': options.get('source'),
                'comment': options.get('comment')
            }
            
            # Parse CSV file
            ds = self.csv_parser.parse(input_path, metadata)
            
            # Validate and improve CF compliance
            validation_result = self.cf_validator.validate_file(input_path)
            
            # Apply CF converter if needed
            if not validation_result.is_valid:
                # Create a temporary file to save the initial dataset
                temp_path = output_path + '.tmp'
                ds.to_netcdf(temp_path, format='NETCDF4')
                
                # Convert using CF converter
                conversion_result = self.cf_converter.convert_file(temp_path, output_path)
                
                # Clean up temporary file
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                
                if not conversion_result['success']:
                    raise RuntimeError(f"CF conversion failed: {conversion_result['message']}")
            else:
                # Save directly if already CF compliant
                ds.to_netcdf(output_path, format='NETCDF4')
            
            # Extract metadata from final file
            with xr.open_dataset(output_path) as final_ds:
                metadata = self._extract_metadata(final_ds)
            
            return metadata
            
        except Exception as e:
            logger.error(f"Enhanced CSV conversion failed: {e}")
            raise

    async def _convert_csv_with_metadata(self, input_path: str, output_path: str, options: Dict[str, Any]) -> Dict[str, Any]:
        """Convert CSV file to NetCDF CF1.8 with full metadata and column mapping"""
        try:
            metadata_config = options.get('metadata', {})
            column_mapping = options.get('columnMapping', {})
            
            logger.info(f"开始标准化CSV转换: {input_path}")
            logger.info(f"列映射配置: {len(column_mapping)} 列")
            
            # 读取CSV文件
            df = pd.read_csv(input_path)
            
            # 预处理DataFrame
            df = self._preprocess_dataframe_with_mapping(df, column_mapping)
            
            # 创建标准化的xarray Dataset
            ds = self._create_standardized_dataset(df, column_mapping, metadata_config)
            
            # 保存为NetCDF文件，使用安全的编码设置
            encoding = {}
            if 'time' in ds.coords:
                # 为时间坐标设置安全的编码
                encoding['time'] = {'units': 'days since 1900-01-01', 'calendar': 'gregorian'}
            
            ds.to_netcdf(output_path, format='NETCDF4', encoding=encoding)
            
            logger.info(f"标准化NetCDF文件已生成: {output_path}")
            
            # 提取元数据
            with xr.open_dataset(output_path) as final_ds:
                metadata = self._extract_metadata(final_ds)
            
            return metadata
            
        except Exception as e:
            logger.error(f"标准化CSV转换失败: {e}")
            raise

    async def _convert_txt(self, input_path: str, output_path: str, options: Dict[str, Any]) -> Dict[str, Any]:
        """Convert text file to NetCDF CF1.8"""
        try:
            # Try to read as delimited text
            delimiter = options.get('delimiter', r'\s+')
            df = pd.read_csv(input_path, delimiter=delimiter, **options.get('pandas_options', {}))
            
            # Convert to xarray Dataset
            ds = df.to_xarray()
            
            # Add CF1.8 attributes
            ds.attrs.update({
                'Conventions': 'CF-1.8',
                'title': options.get('title', f'Converted from {Path(input_path).name}'),
                'institution': options.get('institution', 'Unknown'),
                'source': options.get('source', 'Text file conversion'),
                'history': f'{datetime.utcnow().isoformat()}: Created from text file',
                'references': options.get('references', ''),
                'comment': options.get('comment', 'Converted using Ocean Data Platform')
            })
            
            # Save as NetCDF
            ds.to_netcdf(output_path, mode='w', format='NETCDF4')
            
            # Extract metadata
            metadata = self._extract_metadata(ds)
            
            return metadata
            
        except Exception as e:
            logger.error(f"Text conversion failed: {e}")
            raise

    async def _convert_tiff(self, input_path: str, output_path: str, options: Dict[str, Any]) -> Dict[str, Any]:
        """Convert TIFF file to NetCDF CF1.8"""
        try:
            # Read TIFF file
            img = Image.open(input_path)
            data = np.array(img)
            
            # Create coordinate arrays
            height, width = data.shape[:2]
            y = np.arange(height)
            x = np.arange(width)
            
            # Create xarray Dataset
            if len(data.shape) == 3:  # RGB/RGBA
                ds = xr.Dataset({
                    'band_data': (['y', 'x', 'band'], data)
                }, coords={'y': y, 'x': x, 'band': np.arange(data.shape[2])})
            else:  # Grayscale
                ds = xr.Dataset({
                    'raster_data': (['y', 'x'], data)
                }, coords={'y': y, 'x': x})
            
            # Add CF1.8 attributes
            ds.attrs.update({
                'Conventions': 'CF-1.8',
                'title': options.get('title', f'Converted from {Path(input_path).name}'),
                'institution': options.get('institution', 'Unknown'),
                'source': options.get('source', 'TIFF file conversion'),
                'history': f'{datetime.utcnow().isoformat()}: Created from TIFF file',
                'references': options.get('references', ''),
                'comment': options.get('comment', 'Converted using Ocean Data Platform')
            })
            
            # Save as NetCDF
            ds.to_netcdf(output_path, mode='w', format='NETCDF4')
            
            # Extract metadata
            metadata = self._extract_metadata(ds)
            
            return metadata
            
        except Exception as e:
            logger.error(f"TIFF conversion failed: {e}")
            raise

    async def _convert_hdf(self, input_path: str, output_path: str, options: Dict[str, Any]) -> Dict[str, Any]:
        """Convert HDF5 file to NetCDF CF1.8"""
        try:
            # Open HDF5 file and convert to xarray
            ds = xr.open_dataset(input_path, engine='h5netcdf')
            
            # Add/update CF1.8 attributes
            ds.attrs.update({
                'Conventions': 'CF-1.8',
                'title': options.get('title', ds.attrs.get('title', f'Converted from {Path(input_path).name}')),
                'institution': options.get('institution', ds.attrs.get('institution', 'Unknown')),
                'source': options.get('source', ds.attrs.get('source', 'HDF5 file conversion')),
                'history': f'{datetime.utcnow().isoformat()}: Converted from HDF5 to CF-1.8; ' + ds.attrs.get('history', ''),
                'references': options.get('references', ds.attrs.get('references', '')),
                'comment': options.get('comment', ds.attrs.get('comment', 'Converted using Ocean Data Platform'))
            })
            
            # Save as NetCDF
            ds.to_netcdf(output_path, mode='w', format='NETCDF4')
            
            # Extract metadata
            metadata = self._extract_metadata(ds)
            
            return metadata
            
        except Exception as e:
            logger.error(f"HDF conversion failed: {e}")
            raise

    async def _convert_grib(self, input_path: str, output_path: str, options: Dict[str, Any]) -> Dict[str, Any]:
        """Convert GRIB file to NetCDF CF1.8"""
        try:
            # Open GRIB file with xarray
            ds = xr.open_dataset(input_path, engine='cfgrib')
            
            # Add/update CF1.8 attributes
            ds.attrs.update({
                'Conventions': 'CF-1.8',
                'title': options.get('title', ds.attrs.get('title', f'Converted from {Path(input_path).name}')),
                'institution': options.get('institution', ds.attrs.get('institution', 'Unknown')),
                'source': options.get('source', ds.attrs.get('source', 'GRIB file conversion')),
                'history': f'{datetime.utcnow().isoformat()}: Converted from GRIB to CF-1.8; ' + ds.attrs.get('history', ''),
                'references': options.get('references', ds.attrs.get('references', '')),
                'comment': options.get('comment', ds.attrs.get('comment', 'Converted using Ocean Data Platform'))
            })
            
            # Save as NetCDF
            ds.to_netcdf(output_path, mode='w', format='NETCDF4')
            
            # Extract metadata
            metadata = self._extract_metadata(ds)
            
            return metadata
            
        except Exception as e:
            logger.error(f"GRIB conversion failed: {e}")
            raise

    async def _validate_and_convert_netcdf(self, input_path: str, output_path: str, options: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and convert NetCDF file to CF1.8 compliance using enhanced CF converter"""
        try:
            # First validate the file
            validation_result = self.cf_validator.validate_file(input_path)
            
            # Prepare metadata update options
            conversion_options = {
                'title': options.get('title'),
                'institution': options.get('institution'),
                'source': options.get('source'),
                'comment': options.get('comment')
            }
            
            if validation_result.is_valid and not options.get('force_update', False):
                # File is already CF compliant, just copy
                shutil.copy2(input_path, output_path)
                conversion_result = {
                    'success': True,
                    'message': 'File already CF-1.8 compliant',
                    'issues_fixed': [],
                    'remaining_issues': []
                }
            else:
                # Convert using CF converter
                conversion_result = self.cf_converter.convert_file(
                    input_path, 
                    output_path, 
                    auto_fix=True,
                    backup=options.get('backup', True)
                )
                
                if not conversion_result['success']:
                    raise RuntimeError(f"CF conversion failed: {conversion_result['message']}")
            
            # Extract metadata from final file
            with xr.open_dataset(output_path) as final_ds:
                metadata = self._extract_metadata(final_ds)
            
            # Add conversion information to metadata
            metadata.update({
                'is_cf_compliant': True,
                # 将conversion_result存储到processing_log字段中，因为NCFile模型没有conversion_result字段
                'processing_log': f"CF conversion: {conversion_result['message']}",
                # validation_info也存储为JSON格式
                'quality_flags': {
                    'original_valid': validation_result.is_valid,
                    'issues_found': len(validation_result.issues),
                    'critical_issues': len(validation_result.critical_issues),
                    'warning_issues': len(validation_result.warning_issues)
                }
            })
            
            return metadata
            
        except Exception as e:
            logger.error(f"Enhanced NetCDF validation and conversion failed: {e}")
            raise

    def _extract_metadata(self, ds: xr.Dataset) -> Dict[str, Any]:
        """Extract metadata from xarray Dataset"""
        try:
            metadata = {}
            
            # Basic attributes
            metadata['title'] = ds.attrs.get('title')
            metadata['institution'] = ds.attrs.get('institution')
            metadata['source'] = ds.attrs.get('source')
            metadata['history'] = ds.attrs.get('history')
            metadata['references'] = ds.attrs.get('references')
            metadata['comment'] = ds.attrs.get('comment')
            
            # Dimensions
            metadata['dimensions'] = {dim: size for dim, size in ds.dims.items()}
            
            # Variables
            variables = {}
            for var_name, var in ds.data_vars.items():
                variables[var_name] = {
                    'dims': list(var.dims),
                    'shape': list(var.shape),
                    'dtype': str(var.dtype),
                    'attrs': dict(var.attrs)
                }
            metadata['variables'] = variables
            
            # Spatial bounds
            if 'latitude' in ds.coords or 'lat' in ds.coords:
                lat_coord = ds.coords.get('latitude', ds.coords.get('lat'))
                if lat_coord is not None:
                    metadata['latitude_min'] = float(lat_coord.min())
                    metadata['latitude_max'] = float(lat_coord.max())
            
            if 'longitude' in ds.coords or 'lon' in ds.coords:
                lon_coord = ds.coords.get('longitude', ds.coords.get('lon'))
                if lon_coord is not None:
                    metadata['longitude_min'] = float(lon_coord.min())
                    metadata['longitude_max'] = float(lon_coord.max())
            
            if 'depth' in ds.coords or 'level' in ds.coords:
                depth_coord = ds.coords.get('depth', ds.coords.get('level'))
                if depth_coord is not None:
                    metadata['depth_min'] = float(depth_coord.min())
                    metadata['depth_max'] = float(depth_coord.max())
            
            # Time range
            if 'time' in ds.coords:
                time_coord = ds.coords['time']
                if len(time_coord) > 0:
                    try:
                        time_start = pd.to_datetime(time_coord.min().values)
                        time_end = pd.to_datetime(time_coord.max().values)
                        
                        # Check if the datetime values are valid (not NaT)
                        if not pd.isna(time_start):
                            metadata['time_coverage_start'] = time_start.to_pydatetime()
                        if not pd.isna(time_end):
                            metadata['time_coverage_end'] = time_end.to_pydatetime()
                    except (ValueError, TypeError, pd.errors.OutOfBoundsDatetime) as e:
                        logger.warning(f"Invalid time coordinate values, skipping time coverage: {e}")
                        # Don't set time coverage if conversion fails
            
            # CF compliance
            conventions = ds.attrs.get('Conventions', '')
            metadata['is_cf_compliant'] = 'CF-1.8' in conventions
            
            return metadata
            
        except Exception as e:
            logger.error(f"Metadata extraction failed: {e}")
            return {}

    def _clean_metadata(self, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Clean metadata values before database insertion"""
        # NCFile模型中的有效字段
        valid_fields = {
            'original_filename', 'converted_filename', 'original_format', 'file_size', 'file_path',
            'conversion_status', 'title', 'institution', 'source', 'history', 'references', 'comment',
            'latitude_min', 'latitude_max', 'longitude_min', 'longitude_max', 'depth_min', 'depth_max',
            'time_coverage_start', 'time_coverage_end', 'variables', 'dimensions', 'cf_version',
            'conventions', 'is_cf_compliant', 'quality_flags', 'data_quality_score', 'processing_log',
            'error_message', 'conversion_parameters', 'processed_at'
        }
        
        cleaned = {}
        
        for key, value in metadata.items():
            # 只处理NCFile模型中存在的字段
            if key not in valid_fields:
                logger.debug(f"Skipping invalid field for NCFile: {key}")
                continue
            if value is None:
                cleaned[key] = None
            elif isinstance(value, pd.Timestamp):
                # Handle pandas Timestamp values
                if pd.isna(value):
                    cleaned[key] = None
                else:
                    cleaned[key] = value.to_pydatetime() if hasattr(value, 'to_pydatetime') else value
            elif isinstance(value, datetime):
                # Handle datetime objects
                cleaned[key] = value
            elif isinstance(value, (np.datetime64, np.timedelta64)):
                # Handle numpy datetime types
                try:
                    if pd.isna(value):
                        cleaned[key] = None
                    else:
                        cleaned[key] = pd.to_datetime(value).to_pydatetime()
                except (ValueError, TypeError, pd.errors.OutOfBoundsDatetime):
                    logger.warning(f"Failed to convert numpy datetime for {key}, setting to None")
                    cleaned[key] = None
            elif key in ['time_coverage_start', 'time_coverage_end']:
                # Special handling for time coverage fields
                try:
                    if pd.isna(value):
                        cleaned[key] = None
                    else:
                        cleaned[key] = pd.to_datetime(value).to_pydatetime()
                except (ValueError, TypeError, pd.errors.OutOfBoundsDatetime):
                    logger.warning(f"Invalid datetime value for {key}, setting to None: {value}")
                    cleaned[key] = None
            else:
                cleaned[key] = value
                
        return cleaned

    def _preprocess_dataframe_with_mapping(self, df: pd.DataFrame, column_mapping: Dict[str, Any]) -> pd.DataFrame:
        """根据列映射配置预处理DataFrame"""
        # 清理列名
        df.columns = [col.strip().replace(' ', '_').lower() for col in df.columns]
        
        # 处理缺失值
        df = df.replace(['', 'null', 'NULL', 'nan', 'NaN'], np.nan)
        
        # 根据列映射配置处理每列
        for original_col, mapping in column_mapping.items():
            col_lower = original_col.lower()
            
            if col_lower in df.columns:
                # 跳过被忽略的列
                if mapping.get('type') == 'ignore':
                    df = df.drop(col_lower, axis=1)
                    continue
                
                # 根据映射类型进行数据类型转换
                if mapping.get('type') == 'coordinate':
                    dimension = mapping.get('dimension')
                    
                    if dimension == 'time':
                        # 时间坐标处理
                        try:
                            df[col_lower] = pd.to_datetime(df[col_lower])
                        except Exception as e:
                            logger.warning(f"时间转换失败 {col_lower}: {e}")
                    
                    elif dimension in ['latitude', 'longitude', 'depth']:
                        # 数值坐标处理
                        try:
                            df[col_lower] = pd.to_numeric(df[col_lower], errors='coerce')
                        except Exception as e:
                            logger.warning(f"数值转换失败 {col_lower}: {e}")
                
                elif mapping.get('type') == 'variable':
                    # 数据变量处理
                    try:
                        df[col_lower] = pd.to_numeric(df[col_lower], errors='ignore')
                    except Exception as e:
                        logger.warning(f"变量转换失败 {col_lower}: {e}")
        
        return df

    def _create_standardized_dataset(self, df: pd.DataFrame, column_mapping: Dict[str, Any], metadata_config: Dict[str, Any]) -> xr.Dataset:
        """创建标准化的xarray Dataset"""
        
        # 识别坐标和变量
        coordinates = {}
        data_vars = {}
        
        for original_col, mapping in column_mapping.items():
            col_lower = original_col.lower()
            
            if col_lower not in df.columns or mapping.get('type') == 'ignore':
                continue
                
            standard_name = mapping.get('standardName', col_lower)
            
            if mapping.get('type') == 'coordinate':
                # 坐标变量
                dimension = mapping.get('dimension', 'other')
                
                if dimension == 'time':
                    # 时间坐标
                    coordinates['time'] = ('time', df[col_lower].values)
                elif dimension == 'latitude':
                    coordinates['latitude'] = ('latitude', df[col_lower].values)
                elif dimension == 'longitude':
                    coordinates['longitude'] = ('longitude', df[col_lower].values)
                elif dimension == 'depth':
                    coordinates['depth'] = ('depth', df[col_lower].values)
                else:
                    # 其他维度坐标
                    coordinates[standard_name] = (standard_name, df[col_lower].values)
            
            elif mapping.get('type') == 'variable':
                # 数据变量
                # 确定变量的维度
                dims = self._determine_variable_dimensions(df, coordinates)
                data_vars[standard_name] = (dims, df[col_lower].values)
        
        # 创建Dataset
        ds = xr.Dataset(data_vars, coords=coordinates)
        
        # 处理时间坐标的编码问题
        if 'time' in ds.coords:
            # 确保时间坐标有正确的编码，避免属性冲突
            time_coord = ds.coords['time']
            if hasattr(time_coord.values[0], 'to_pydatetime'):
                # 如果是pandas Timestamp，转换为标准datetime
                try:
                    time_values = [t.to_pydatetime() if hasattr(t, 'to_pydatetime') else t 
                                 for t in time_coord.values]
                    ds = ds.assign_coords(time=time_values)
                except Exception as e:
                    logger.warning(f"时间坐标转换警告: {e}")
        
        # 添加坐标变量属性
        self._add_coordinate_attributes(ds, column_mapping)
        
        # 添加数据变量属性
        self._add_data_variable_attributes(ds, column_mapping)
        
        # 添加全局属性
        self._add_global_attributes(ds, metadata_config)
        
        return ds

    def _determine_variable_dimensions(self, df: pd.DataFrame, coordinates: Dict) -> list:
        """确定数据变量的维度"""
        dims = []
        
        # 按优先级添加维度
        if 'time' in coordinates:
            dims.append('time')
        
        # 如果只有时间维度，返回
        if len(dims) == 1 and len(df) > 0:
            return dims
        
        # 如果没有明确的维度坐标，使用索引
        if not dims:
            dims = ['index']
            
        return dims

    def _add_coordinate_attributes(self, ds: xr.Dataset, column_mapping: Dict[str, Any]):
        """为坐标变量添加CF-1.8标准属性"""
        coord_attrs = {
            'time': {
                'standard_name': 'time',
                'long_name': 'time',
                'axis': 'T'
                # 注意：不为time设置units，避免与xarray编码冲突
            },
            'latitude': {
                'standard_name': 'latitude',
                'long_name': 'latitude',
                'units': 'degrees_north',
                'axis': 'Y'
            },
            'longitude': {
                'standard_name': 'longitude',
                'long_name': 'longitude',
                'units': 'degrees_east',
                'axis': 'X'
            },
            'depth': {
                'standard_name': 'depth',
                'long_name': 'depth',
                'units': 'm',
                'axis': 'Z',
                'positive': 'down'
            }
        }
        
        for coord_name, coord in ds.coords.items():
            # 清理现有的attrs，避免冲突
            if coord_name == 'time':
                # 对于时间坐标，先清理可能冲突的属性
                safe_attrs = {k: v for k, v in coord.attrs.items() 
                             if k not in ['units', 'calendar']}
                coord.attrs.clear()
                coord.attrs.update(safe_attrs)
            
            # 应用标准属性
            if coord_name in coord_attrs:
                coord.attrs.update(coord_attrs[coord_name])
            
            # 应用用户定义的单位（除了时间坐标）
            for original_col, mapping in column_mapping.items():
                if (mapping.get('type') == 'coordinate' and 
                    mapping.get('standardName') == coord_name and 
                    mapping.get('units') and 
                    coord_name != 'time'):  # 避免为时间坐标设置units
                    coord.attrs['units'] = mapping['units']

    def _add_data_variable_attributes(self, ds: xr.Dataset, column_mapping: Dict[str, Any]):
        """为数据变量添加CF-1.8标准属性"""
        for var_name, var in ds.data_vars.items():
            # 从列映射中找到对应的配置
            for original_col, mapping in column_mapping.items():
                if (mapping.get('type') == 'variable' and 
                    mapping.get('standardName') == var_name):
                    
                    attrs = {}
                    
                    if mapping.get('standardName'):
                        attrs['standard_name'] = mapping['standardName']
                    
                    if mapping.get('units'):
                        attrs['units'] = mapping['units']
                    
                    # 添加long_name
                    attrs['long_name'] = original_col.replace('_', ' ').title()
                    
                    # 添加缺失值属性
                    if var.isnull().any():
                        if var.dtype.kind == 'f':
                            attrs['_FillValue'] = np.nan
                        elif var.dtype.kind == 'i':
                            attrs['_FillValue'] = -999
                    
                    var.attrs.update(attrs)
                    break

    def _add_global_attributes(self, ds: xr.Dataset, metadata_config: Dict[str, Any]):
        """添加全局属性"""
        global_attrs = {
            'Conventions': 'CF-1.8',
            'history': f'{datetime.utcnow().isoformat()}: Created from CSV using Ocean Data Platform'
        }
        
        # 基本信息
        basic_info = metadata_config.get('basic_info', {})
        if basic_info.get('title'):
            global_attrs['title'] = basic_info['title']
        if basic_info.get('summary'):
            global_attrs['summary'] = basic_info['summary']
        if basic_info.get('keywords'):
            global_attrs['keywords'] = basic_info['keywords']
        if basic_info.get('id'):
            global_attrs['id'] = basic_info['id']
        if basic_info.get('naming_authority'):
            global_attrs['naming_authority'] = basic_info['naming_authority']
        
        # 机构信息
        institution_info = metadata_config.get('institution_info', {})
        if institution_info.get('institution'):
            global_attrs['institution'] = institution_info['institution']
        if institution_info.get('source'):
            global_attrs['source'] = institution_info['source']
        if institution_info.get('creator_name'):
            global_attrs['creator_name'] = institution_info['creator_name']
        if institution_info.get('creator_email'):
            global_attrs['creator_email'] = institution_info['creator_email']
        if institution_info.get('publisher_name'):
            global_attrs['publisher_name'] = institution_info['publisher_name']
        if institution_info.get('publisher_email'):
            global_attrs['publisher_email'] = institution_info['publisher_email']
        if institution_info.get('references'):
            global_attrs['references'] = institution_info['references']
        if institution_info.get('comment'):
            global_attrs['comment'] = institution_info['comment']
        
        # 时空覆盖范围
        spatiotemporal = metadata_config.get('spatiotemporal_coverage', {})
        if spatiotemporal.get('geospatial_lat_min') is not None:
            global_attrs['geospatial_lat_min'] = spatiotemporal['geospatial_lat_min']
        if spatiotemporal.get('geospatial_lat_max') is not None:
            global_attrs['geospatial_lat_max'] = spatiotemporal['geospatial_lat_max']
        if spatiotemporal.get('geospatial_lon_min') is not None:
            global_attrs['geospatial_lon_min'] = spatiotemporal['geospatial_lon_min']
        if spatiotemporal.get('geospatial_lon_max') is not None:
            global_attrs['geospatial_lon_max'] = spatiotemporal['geospatial_lon_max']
        if spatiotemporal.get('geospatial_vertical_min') is not None:
            global_attrs['geospatial_vertical_min'] = spatiotemporal['geospatial_vertical_min']
        if spatiotemporal.get('geospatial_vertical_max') is not None:
            global_attrs['geospatial_vertical_max'] = spatiotemporal['geospatial_vertical_max']
        if spatiotemporal.get('time_coverage_start'):
            global_attrs['time_coverage_start'] = spatiotemporal['time_coverage_start']
        if spatiotemporal.get('time_coverage_end'):
            global_attrs['time_coverage_end'] = spatiotemporal['time_coverage_end']
        if spatiotemporal.get('time_coverage_duration'):
            global_attrs['time_coverage_duration'] = spatiotemporal['time_coverage_duration']
        if spatiotemporal.get('time_coverage_resolution'):
            global_attrs['time_coverage_resolution'] = spatiotemporal['time_coverage_resolution']
        
        # 质量信息
        quality_info = metadata_config.get('quality_info', {})
        if quality_info.get('standard_name_vocabulary'):
            global_attrs['standard_name_vocabulary'] = quality_info['standard_name_vocabulary']
        if quality_info.get('processing_level'):
            global_attrs['processing_level'] = quality_info['processing_level']
        if quality_info.get('quality_control'):
            global_attrs['quality_control'] = quality_info['quality_control']
        if quality_info.get('license'):
            global_attrs['license'] = quality_info['license']
        if quality_info.get('metadata_link'):
            global_attrs['metadata_link'] = quality_info['metadata_link']
        
        ds.attrs.update(global_attrs)

    async def cancel_conversion(self, db: Session, task_id: int) -> bool:
        """Cancel a running conversion task"""
        if task_id in self.active_conversions:
            self.active_conversions[task_id].cancel()
            del self.active_conversions[task_id]
        
        crud_conversion_task.set_status(db, task_id=task_id, status="failed", error_message="Cancelled by user")
        return True
    
    def get_conversion_status(self, db: Session, task_id: int) -> Dict[str, Any]:
        """Get detailed conversion status"""
        try:
            task = crud_conversion_task.get(db, task_id)
            if not task:
                return {"error": "Task not found"}
            
            status_info = {
                "task_id": task_id,
                "status": task.status,
                "progress": task.progress,
                "created_at": task.created_at.isoformat() if task.created_at else None,
                "started_at": task.started_at.isoformat() if task.started_at else None,
                "completed_at": task.completed_at.isoformat() if task.completed_at else None,
                "error_message": task.error_message,
                "original_filename": task.original_filename,
                "original_format": task.original_format,
                "nc_file_id": task.nc_file_id
            }
            
            # Add estimated completion time for running tasks
            if task.status == "processing" and task.started_at:
                elapsed = datetime.utcnow() - task.started_at
                if task.progress > 0:
                    estimated_total = elapsed.total_seconds() / (task.progress / 100)
                    remaining = estimated_total - elapsed.total_seconds()
                    if remaining > 0:
                        estimated_completion = datetime.utcnow() + timedelta(seconds=remaining)
                        status_info["estimated_completion"] = estimated_completion.isoformat()
            
            # Check if task is still active
            status_info["is_active"] = task_id in self.active_conversions
            
            return status_info
            
        except Exception as e:
            logger.error(f"Failed to get conversion status for task {task_id}: {e}")
            return {"error": str(e)}
    
    def get_active_conversions_count(self) -> int:
        """Get number of active conversions"""
        return len(self.active_conversions)
    
    def get_service_health(self) -> Dict[str, Any]:
        """Get service health information"""
        return {
            "status": "healthy",
            "active_conversions": len(self.active_conversions),
            "supported_formats": list(self.supported_formats.keys()),
            "max_concurrent_conversions": 10,  # configurable limit
            "service_uptime": "running"  # could track actual uptime
        }


# Global instance
conversion_service = DataConversionService()