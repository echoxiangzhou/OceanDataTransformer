import os
import logging
import re
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
import numpy as np
import pandas as pd
import xarray as xr
import netCDF4 as nc
from PIL import Image
import h5py

from app.schemas.import_wizard import (
    FileType,
    BasicInfo,
    InstitutionInfo,
    SpatiotemporalCoverage,
    QualityInfo,
    MetadataConfig
)

logger = logging.getLogger(__name__)


class MetadataExtractionService:
    """智能元数据提取服务"""
    
    def __init__(self):
        # 常见的元数据字段映射
        self.metadata_mappings = {
            'title': ['title', 'Title', 'TITLE', 'dataset_name', 'name'],
            'institution': ['institution', 'Institution', 'INSTITUTION', 'source_institution', 'organization'],
            'source': ['source', 'Source', 'SOURCE', 'data_source', 'platform'],
            'creator_name': ['creator_name', 'author', 'Author', 'AUTHOR', 'created_by', 'investigator'],
            'creator_email': ['creator_email', 'contact_email', 'email', 'Email'],
            'summary': ['summary', 'description', 'Description', 'DESCRIPTION', 'abstract'],
            'keywords': ['keywords', 'Keywords', 'KEYWORDS', 'tags'],
            'comment': ['comment', 'Comment', 'COMMENT', 'remarks', 'notes'],
            'references': ['references', 'References', 'REFERENCES', 'citation', 'doi'],
            'license': ['license', 'License', 'LICENSE', 'data_license', 'usage_rights']
        }
        
        # 时空覆盖相关字段
        self.spatial_mappings = {
            'lat_min': ['geospatial_lat_min', 'lat_min', 'south_bound', 'southernmost_latitude'],
            'lat_max': ['geospatial_lat_max', 'lat_max', 'north_bound', 'northernmost_latitude'],
            'lon_min': ['geospatial_lon_min', 'lon_min', 'west_bound', 'westernmost_longitude'],
            'lon_max': ['geospatial_lon_max', 'lon_max', 'east_bound', 'easternmost_longitude'],
            'depth_min': ['geospatial_vertical_min', 'depth_min', 'min_depth', 'shallow_depth'],
            'depth_max': ['geospatial_vertical_max', 'depth_max', 'max_depth', 'deep_depth']
        }
        
        # 时间覆盖相关字段
        self.temporal_mappings = {
            'time_start': ['time_coverage_start', 'start_time', 'begin_date', 'time_min'],
            'time_end': ['time_coverage_end', 'end_time', 'end_date', 'time_max'],
            'time_duration': ['time_coverage_duration', 'duration', 'period'],
            'time_resolution': ['time_coverage_resolution', 'time_step', 'temporal_resolution']
        }
    
    def extract_metadata_from_file(self, file_path: str, file_type: FileType, 
                                  filename: str) -> MetadataConfig:
        """从文件中提取元数据信息"""
        try:
            logger.info(f"开始提取文件元数据: {filename} (类型: {file_type.value})")
            
            # 根据文件类型选择提取方法
            if file_type == FileType.NETCDF:
                return self._extract_from_netcdf(file_path, filename)
            elif file_type in [FileType.CSV, FileType.TXT]:
                return self._extract_from_tabular(file_path, filename, file_type)
            elif file_type == FileType.HDF5:
                return self._extract_from_hdf5(file_path, filename)
            elif file_type in [FileType.TIFF]:
                return self._extract_from_tiff(file_path, filename)
            else:
                # 对于不支持的格式，返回基于文件名的基本信息
                return self._extract_basic_from_filename(filename)
                
        except Exception as e:
            logger.error(f"元数据提取失败: {e}")
            return self._extract_basic_from_filename(filename)
    
    def _extract_from_netcdf(self, file_path: str, filename: str) -> MetadataConfig:
        """从NetCDF文件提取元数据"""
        try:
            with xr.open_dataset(file_path) as ds:
                # 基本信息
                basic_info = BasicInfo()
                basic_info.title = self._find_attribute(ds.attrs, self.metadata_mappings['title'])
                basic_info.summary = self._find_attribute(ds.attrs, self.metadata_mappings['summary'])
                basic_info.keywords = self._find_attribute(ds.attrs, self.metadata_mappings['keywords'])
                basic_info.id = self._find_attribute(ds.attrs, ['id', 'dataset_id', 'uuid'])
                basic_info.naming_authority = self._find_attribute(ds.attrs, ['naming_authority'])
                
                # 如果没有标题，从文件名生成
                if not basic_info.title:
                    basic_info.title = self._generate_title_from_filename(filename)
                
                # 机构信息
                institution_info = InstitutionInfo()
                institution_info.institution = self._find_attribute(ds.attrs, self.metadata_mappings['institution'])
                institution_info.source = self._find_attribute(ds.attrs, self.metadata_mappings['source'])
                institution_info.creator_name = self._find_attribute(ds.attrs, self.metadata_mappings['creator_name'])
                institution_info.creator_email = self._find_attribute(ds.attrs, self.metadata_mappings['creator_email'])
                institution_info.publisher_name = self._find_attribute(ds.attrs, ['publisher_name', 'publisher'])
                institution_info.publisher_email = self._find_attribute(ds.attrs, ['publisher_email'])
                institution_info.references = self._find_attribute(ds.attrs, self.metadata_mappings['references'])
                institution_info.comment = self._find_attribute(ds.attrs, self.metadata_mappings['comment'])
                
                # 时空覆盖信息
                spatiotemporal = SpatiotemporalCoverage()
                
                # 从全局属性中提取空间覆盖范围
                spatiotemporal.geospatial_lat_min = self._find_numeric_attribute(ds.attrs, self.spatial_mappings['lat_min'])
                spatiotemporal.geospatial_lat_max = self._find_numeric_attribute(ds.attrs, self.spatial_mappings['lat_max'])
                spatiotemporal.geospatial_lon_min = self._find_numeric_attribute(ds.attrs, self.spatial_mappings['lon_min'])
                spatiotemporal.geospatial_lon_max = self._find_numeric_attribute(ds.attrs, self.spatial_mappings['lon_max'])
                spatiotemporal.geospatial_vertical_min = self._find_numeric_attribute(ds.attrs, self.spatial_mappings['depth_min'])
                spatiotemporal.geospatial_vertical_max = self._find_numeric_attribute(ds.attrs, self.spatial_mappings['depth_max'])
                
                # 从坐标变量中计算空间覆盖范围
                lat_bounds = self._calculate_coordinate_bounds(ds, ['latitude', 'lat', 'y'])
                if lat_bounds and spatiotemporal.geospatial_lat_min is None:
                    spatiotemporal.geospatial_lat_min = lat_bounds[0]
                    spatiotemporal.geospatial_lat_max = lat_bounds[1]
                
                lon_bounds = self._calculate_coordinate_bounds(ds, ['longitude', 'lon', 'x'])
                if lon_bounds and spatiotemporal.geospatial_lon_min is None:
                    spatiotemporal.geospatial_lon_min = lon_bounds[0]
                    spatiotemporal.geospatial_lon_max = lon_bounds[1]
                
                depth_bounds = self._calculate_coordinate_bounds(ds, ['depth', 'level', 'z'])
                if depth_bounds and spatiotemporal.geospatial_vertical_min is None:
                    spatiotemporal.geospatial_vertical_min = depth_bounds[0]
                    spatiotemporal.geospatial_vertical_max = depth_bounds[1]
                
                # 时间覆盖信息
                spatiotemporal.time_coverage_start = self._find_attribute(ds.attrs, self.temporal_mappings['time_start'])
                spatiotemporal.time_coverage_end = self._find_attribute(ds.attrs, self.temporal_mappings['time_end'])
                spatiotemporal.time_coverage_duration = self._find_attribute(ds.attrs, self.temporal_mappings['time_duration'])
                spatiotemporal.time_coverage_resolution = self._find_attribute(ds.attrs, self.temporal_mappings['time_resolution'])
                
                # 从时间坐标中计算时间覆盖范围
                time_bounds = self._calculate_time_bounds(ds)
                if time_bounds:
                    if not spatiotemporal.time_coverage_start:
                        spatiotemporal.time_coverage_start = time_bounds[0]
                    if not spatiotemporal.time_coverage_end:
                        spatiotemporal.time_coverage_end = time_bounds[1]
                
                # 质量信息
                quality_info = QualityInfo()
                quality_info.standard_name_vocabulary = self._find_attribute(ds.attrs, ['standard_name_vocabulary'])
                quality_info.processing_level = self._find_attribute(ds.attrs, ['processing_level'])
                quality_info.quality_control = self._find_attribute(ds.attrs, ['quality_control', 'qc_flag'])
                quality_info.license = self._find_attribute(ds.attrs, self.metadata_mappings['license'])
                quality_info.metadata_link = self._find_attribute(ds.attrs, ['metadata_link', 'info_url'])
                
                return MetadataConfig(
                    basic_info=basic_info,
                    institution_info=institution_info,
                    spatiotemporal_coverage=spatiotemporal,
                    quality_info=quality_info
                )
                
        except Exception as e:
            logger.error(f"NetCDF元数据提取失败: {e}")
            return self._extract_basic_from_filename(filename)
    
    def _extract_from_tabular(self, file_path: str, filename: str, file_type: FileType) -> MetadataConfig:
        """从表格文件(CSV/TXT)提取元数据"""
        try:
            # 读取文件头部，寻找元数据信息
            metadata_lines = []
            data_start_line = 0
            
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
                
                # 查找可能的元数据行（通常以#开头或在数据前）
                for i, line in enumerate(lines[:50]):  # 只检查前50行
                    line = line.strip()
                    if line.startswith('#') or line.startswith('%') or line.startswith('//'):
                        metadata_lines.append(line[1:].strip())  # 去掉注释符号
                    elif line and ',' in line or '\t' in line:
                        # 可能是数据行，停止寻找元数据
                        data_start_line = i
                        break
            
            # 从元数据行中提取信息
            extracted_metadata = self._parse_metadata_lines(metadata_lines)
            
            # 读取数据以分析空间和时间范围
            try:
                if file_type == FileType.CSV:
                    df = pd.read_csv(file_path, skiprows=data_start_line, nrows=1000)  # 读取前1000行分析
                else:
                    # TXT文件，尝试不同的分隔符
                    for delimiter in ['\t', ' ', ';', '|']:
                        try:
                            df = pd.read_csv(file_path, delimiter=delimiter, skiprows=data_start_line, nrows=1000)
                            if len(df.columns) > 1:
                                break
                        except:
                            continue
                
                # 分析数据范围
                spatial_temporal_info = self._analyze_tabular_data_ranges(df)
                extracted_metadata.update(spatial_temporal_info)
                
            except Exception as e:
                logger.warning(f"分析表格数据范围失败: {e}")
            
            # 构建元数据配置
            return self._build_metadata_config_from_dict(extracted_metadata, filename)
            
        except Exception as e:
            logger.error(f"表格文件元数据提取失败: {e}")
            return self._extract_basic_from_filename(filename)
    
    def _extract_from_hdf5(self, file_path: str, filename: str) -> MetadataConfig:
        """从HDF5文件提取元数据"""
        try:
            with h5py.File(file_path, 'r') as f:
                # 从根组属性中提取元数据
                extracted_metadata = {}
                
                # 遍历根组属性
                for key, value in f.attrs.items():
                    if isinstance(value, bytes):
                        value = value.decode('utf-8')
                    extracted_metadata[key.lower()] = value
                
                # 分析数据集结构
                datasets = []
                def collect_datasets(name, obj):
                    if isinstance(obj, h5py.Dataset):
                        datasets.append(name)
                
                f.visititems(collect_datasets)
                
                # 从数据集名称推断可能的空间时间信息
                spatial_temporal_info = self._infer_spatiotemporal_from_names(datasets)
                extracted_metadata.update(spatial_temporal_info)
                
                return self._build_metadata_config_from_dict(extracted_metadata, filename)
                
        except Exception as e:
            logger.error(f"HDF5元数据提取失败: {e}")
            return self._extract_basic_from_filename(filename)
    
    def _extract_from_tiff(self, file_path: str, filename: str) -> MetadataConfig:
        """从TIFF文件提取元数据"""
        try:
            from PIL.ExifTags import TAGS
            
            with Image.open(file_path) as img:
                extracted_metadata = {}
                
                # 提取EXIF信息
                if hasattr(img, '_getexif') and img._getexif():
                    exif = img._getexif()
                    for tag_id, value in exif.items():
                        tag = TAGS.get(tag_id, tag_id)
                        if isinstance(value, str):
                            extracted_metadata[tag.lower()] = value
                
                # 添加图像基本信息
                extracted_metadata.update({
                    'image_width': img.width,
                    'image_height': img.height,
                    'image_mode': img.mode,
                    'image_format': img.format
                })
                
                return self._build_metadata_config_from_dict(extracted_metadata, filename)
                
        except Exception as e:
            logger.error(f"TIFF元数据提取失败: {e}")
            return self._extract_basic_from_filename(filename)
    
    def _extract_basic_from_filename(self, filename: str) -> MetadataConfig:
        """从文件名中提取基本信息"""
        basic_info = BasicInfo()
        basic_info.title = self._generate_title_from_filename(filename)
        
        # 从文件名中推断可能的信息
        filename_lower = filename.lower()
        
        # 推断数据类型或来源
        if any(keyword in filename_lower for keyword in ['temp', 'temperature']):
            basic_info.keywords = "temperature"
        elif any(keyword in filename_lower for keyword in ['sal', 'salinity']):
            basic_info.keywords = "salinity"
        elif any(keyword in filename_lower for keyword in ['wind', 'velocity']):
            basic_info.keywords = "velocity"
        elif any(keyword in filename_lower for keyword in ['pressure']):
            basic_info.keywords = "pressure"
        
        # 推断可能的时间信息
        spatiotemporal = SpatiotemporalCoverage()
        time_pattern = re.search(r'(\d{4})[-_]?(\d{2})[-_]?(\d{2})', filename)
        if time_pattern:
            year, month, day = time_pattern.groups()
            try:
                date_str = f"{year}-{month}-{day}"
                spatiotemporal.time_coverage_start = date_str
                spatiotemporal.time_coverage_end = date_str
            except:
                pass
        
        institution_info = InstitutionInfo()
        quality_info = QualityInfo()
        
        return MetadataConfig(
            basic_info=basic_info,
            institution_info=institution_info,
            spatiotemporal_coverage=spatiotemporal,
            quality_info=quality_info
        )
    
    def _find_attribute(self, attrs: Dict, possible_keys: List[str]) -> Optional[str]:
        """在属性字典中查找可能的键值"""
        for key in possible_keys:
            if key in attrs:
                value = attrs[key]
                if isinstance(value, (bytes, np.bytes_)):
                    return value.decode('utf-8')
                elif isinstance(value, str) and value.strip():
                    return value.strip()
                elif value is not None:
                    return str(value)
        return None
    
    def _find_numeric_attribute(self, attrs: Dict, possible_keys: List[str]) -> Optional[float]:
        """在属性字典中查找数值型属性"""
        for key in possible_keys:
            if key in attrs:
                try:
                    value = attrs[key]
                    if isinstance(value, (int, float, np.number)):
                        return float(value)
                    elif isinstance(value, str):
                        return float(value)
                except (ValueError, TypeError):
                    continue
        return None
    
    def _calculate_coordinate_bounds(self, ds: xr.Dataset, coord_names: List[str]) -> Optional[Tuple[float, float]]:
        """计算坐标变量的边界值"""
        for coord_name in coord_names:
            if coord_name in ds.coords:
                coord = ds.coords[coord_name]
                try:
                    values = coord.values
                    if len(values) > 0:
                        min_val = float(np.nanmin(values))
                        max_val = float(np.nanmax(values))
                        if not (np.isnan(min_val) or np.isnan(max_val)):
                            return (min_val, max_val)
                except:
                    continue
        return None
    
    def _calculate_time_bounds(self, ds: xr.Dataset) -> Optional[Tuple[str, str]]:
        """计算时间坐标的边界值"""
        time_coord_names = ['time', 'Time', 'TIME', 'date', 'datetime']
        
        for coord_name in time_coord_names:
            if coord_name in ds.coords:
                try:
                    time_coord = ds.coords[coord_name]
                    if len(time_coord) > 0:
                        # 转换为pandas datetime
                        time_series = pd.to_datetime(time_coord.values)
                        if not time_series.empty:
                            start_time = time_series.min()
                            end_time = time_series.max()
                            if not (pd.isna(start_time) or pd.isna(end_time)):
                                return (start_time.isoformat(), end_time.isoformat())
                except Exception as e:
                    logger.debug(f"时间坐标处理失败 {coord_name}: {e}")
                    continue
        return None
    
    def _parse_metadata_lines(self, metadata_lines: List[str]) -> Dict[str, Any]:
        """解析元数据行"""
        metadata = {}
        
        for line in metadata_lines:
            # 尝试解析键值对格式
            if ':' in line:
                key, value = line.split(':', 1)
                key = key.strip().lower()
                value = value.strip()
                if value:
                    metadata[key] = value
            elif '=' in line:
                key, value = line.split('=', 1)
                key = key.strip().lower()
                value = value.strip()
                if value:
                    metadata[key] = value
            else:
                # 如果不是键值对，可能是描述信息
                if len(line) > 10:  # 只保留较长的描述
                    if 'description' not in metadata:
                        metadata['description'] = line
                    else:
                        metadata['description'] += '; ' + line
        
        return metadata
    
    def _analyze_tabular_data_ranges(self, df: pd.DataFrame) -> Dict[str, Any]:
        """分析表格数据的空间和时间范围"""
        ranges = {}
        
        # 分析可能的坐标列
        for col in df.columns:
            col_lower = col.lower()
            
            # 纬度列
            if any(keyword in col_lower for keyword in ['lat', 'latitude', 'y']):
                try:
                    values = pd.to_numeric(df[col], errors='coerce').dropna()
                    if not values.empty:
                        ranges['geospatial_lat_min'] = float(values.min())
                        ranges['geospatial_lat_max'] = float(values.max())
                except:
                    pass
            
            # 经度列
            elif any(keyword in col_lower for keyword in ['lon', 'longitude', 'x']):
                try:
                    values = pd.to_numeric(df[col], errors='coerce').dropna()
                    if not values.empty:
                        ranges['geospatial_lon_min'] = float(values.min())
                        ranges['geospatial_lon_max'] = float(values.max())
                except:
                    pass
            
            # 深度列
            elif any(keyword in col_lower for keyword in ['depth', 'level', 'z']):
                try:
                    values = pd.to_numeric(df[col], errors='coerce').dropna()
                    if not values.empty:
                        ranges['geospatial_vertical_min'] = float(values.min())
                        ranges['geospatial_vertical_max'] = float(values.max())
                except:
                    pass
            
            # 时间列
            elif any(keyword in col_lower for keyword in ['time', 'date', 'datetime']):
                try:
                    time_values = pd.to_datetime(df[col], errors='coerce').dropna()
                    if not time_values.empty:
                        ranges['time_coverage_start'] = time_values.min().isoformat()
                        ranges['time_coverage_end'] = time_values.max().isoformat()
                except:
                    pass
        
        return ranges
    
    def _infer_spatiotemporal_from_names(self, dataset_names: List[str]) -> Dict[str, Any]:
        """从数据集名称推断时空信息"""
        info = {}
        
        # 检查是否包含坐标相关的数据集
        has_lat = any('lat' in name.lower() for name in dataset_names)
        has_lon = any('lon' in name.lower() for name in dataset_names)
        has_time = any('time' in name.lower() or 'date' in name.lower() for name in dataset_names)
        has_depth = any('depth' in name.lower() or 'level' in name.lower() for name in dataset_names)
        
        if has_lat and has_lon:
            info['has_spatial_coverage'] = True
        if has_time:
            info['has_temporal_coverage'] = True
        if has_depth:
            info['has_vertical_coverage'] = True
        
        return info
    
    def _build_metadata_config_from_dict(self, metadata_dict: Dict[str, Any], filename: str) -> MetadataConfig:
        """从字典构建元数据配置"""
        
        # 基本信息
        basic_info = BasicInfo()
        basic_info.title = self._extract_field(metadata_dict, self.metadata_mappings['title'])
        if not basic_info.title:
            basic_info.title = self._generate_title_from_filename(filename)
        
        basic_info.summary = self._extract_field(metadata_dict, self.metadata_mappings['summary'])
        basic_info.keywords = self._extract_field(metadata_dict, self.metadata_mappings['keywords'])
        basic_info.id = self._extract_field(metadata_dict, ['id', 'dataset_id', 'uuid'])
        basic_info.naming_authority = self._extract_field(metadata_dict, ['naming_authority'])
        
        # 机构信息
        institution_info = InstitutionInfo()
        institution_info.institution = self._extract_field(metadata_dict, self.metadata_mappings['institution'])
        institution_info.source = self._extract_field(metadata_dict, self.metadata_mappings['source'])
        institution_info.creator_name = self._extract_field(metadata_dict, self.metadata_mappings['creator_name'])
        institution_info.creator_email = self._extract_field(metadata_dict, self.metadata_mappings['creator_email'])
        institution_info.publisher_name = self._extract_field(metadata_dict, ['publisher_name', 'publisher'])
        institution_info.publisher_email = self._extract_field(metadata_dict, ['publisher_email'])
        institution_info.references = self._extract_field(metadata_dict, self.metadata_mappings['references'])
        institution_info.comment = self._extract_field(metadata_dict, self.metadata_mappings['comment'])
        
        # 时空覆盖信息
        spatiotemporal = SpatiotemporalCoverage()
        spatiotemporal.geospatial_lat_min = self._extract_numeric_field(metadata_dict, self.spatial_mappings['lat_min'])
        spatiotemporal.geospatial_lat_max = self._extract_numeric_field(metadata_dict, self.spatial_mappings['lat_max'])
        spatiotemporal.geospatial_lon_min = self._extract_numeric_field(metadata_dict, self.spatial_mappings['lon_min'])
        spatiotemporal.geospatial_lon_max = self._extract_numeric_field(metadata_dict, self.spatial_mappings['lon_max'])
        spatiotemporal.geospatial_vertical_min = self._extract_numeric_field(metadata_dict, self.spatial_mappings['depth_min'])
        spatiotemporal.geospatial_vertical_max = self._extract_numeric_field(metadata_dict, self.spatial_mappings['depth_max'])
        
        spatiotemporal.time_coverage_start = self._extract_field(metadata_dict, self.temporal_mappings['time_start'])
        spatiotemporal.time_coverage_end = self._extract_field(metadata_dict, self.temporal_mappings['time_end'])
        spatiotemporal.time_coverage_duration = self._extract_field(metadata_dict, self.temporal_mappings['time_duration'])
        spatiotemporal.time_coverage_resolution = self._extract_field(metadata_dict, self.temporal_mappings['time_resolution'])
        
        # 质量信息
        quality_info = QualityInfo()
        quality_info.standard_name_vocabulary = self._extract_field(metadata_dict, ['standard_name_vocabulary'])
        quality_info.processing_level = self._extract_field(metadata_dict, ['processing_level'])
        quality_info.quality_control = self._extract_field(metadata_dict, ['quality_control', 'qc_flag'])
        quality_info.license = self._extract_field(metadata_dict, self.metadata_mappings['license'])
        quality_info.metadata_link = self._extract_field(metadata_dict, ['metadata_link', 'info_url'])
        
        return MetadataConfig(
            basic_info=basic_info,
            institution_info=institution_info,
            spatiotemporal_coverage=spatiotemporal,
            quality_info=quality_info
        )
    
    def _extract_field(self, metadata_dict: Dict[str, Any], possible_keys: List[str]) -> Optional[str]:
        """从字典中提取字段值"""
        for key in possible_keys:
            # 直接匹配
            if key in metadata_dict:
                value = metadata_dict[key]
                if isinstance(value, str) and value.strip():
                    return value.strip()
            
            # 不区分大小写匹配
            for dict_key, dict_value in metadata_dict.items():
                if dict_key.lower() == key.lower():
                    if isinstance(dict_value, str) and dict_value.strip():
                        return dict_value.strip()
        
        return None
    
    def _extract_numeric_field(self, metadata_dict: Dict[str, Any], possible_keys: List[str]) -> Optional[float]:
        """从字典中提取数值字段"""
        for key in possible_keys:
            # 直接匹配
            if key in metadata_dict:
                try:
                    return float(metadata_dict[key])
                except (ValueError, TypeError):
                    continue
            
            # 不区分大小写匹配
            for dict_key, dict_value in metadata_dict.items():
                if dict_key.lower() == key.lower():
                    try:
                        return float(dict_value)
                    except (ValueError, TypeError):
                        continue
        
        return None
    
    def _generate_title_from_filename(self, filename: str) -> str:
        """从文件名生成标题"""
        # 移除扩展名
        name = Path(filename).stem
        
        # 替换下划线和连字符为空格
        title = name.replace('_', ' ').replace('-', ' ')
        
        # 首字母大写
        title = ' '.join(word.capitalize() for word in title.split())
        
        return title


# 全局实例
metadata_extraction_service = MetadataExtractionService()