"""
CSV文件解析器
基于version0.5代码优化和集成
"""

import pandas as pd
import xarray as xr
import numpy as np
from typing import Dict, Any, Optional
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class CSVParser:
    """CSV文件解析器"""
    
    def __init__(self):
        self.default_cf_attrs = {
            'Conventions': 'CF-1.8',
            'title': 'Data converted from CSV',
            'institution': 'Ocean Data Platform',
            'source': 'CSV file',
            'history': f'{datetime.now().isoformat()}: Converted from CSV to NetCDF',
            'references': 'CF Conventions: http://cfconventions.org/',
        }
    
    def parse(self, file_path: str, metadata: Optional[Dict[str, Any]] = None) -> xr.Dataset:
        """
        解析CSV文件为xarray Dataset
        
        Args:
            file_path: CSV文件路径
            metadata: 额外的元数据
        
        Returns:
            xarray Dataset
        """
        try:
            logger.info(f"开始解析CSV文件: {file_path}")
            
            # 读取CSV文件
            df = pd.read_csv(file_path)
            
            # 数据清理和预处理
            df = self._preprocess_dataframe(df)
            
            # 转换为xarray Dataset
            ds = self._dataframe_to_dataset(df)
            
            # 添加CF-1.8属性
            ds = self._add_cf_attributes(ds, metadata)
            
            # 识别和处理坐标变量
            ds = self._identify_coordinates(ds)
            
            # 添加变量属性
            ds = self._add_variable_attributes(ds)
            
            logger.info(f"CSV文件解析完成: {file_path} - 坐标: {list(ds.coords.keys())}, 数据变量: {list(ds.data_vars.keys())}")
            return ds
            
        except Exception as e:
            logger.error(f"CSV文件解析失败: {str(e)}")
            raise
    
    def _preprocess_dataframe(self, df: pd.DataFrame) -> pd.DataFrame:
        """预处理DataFrame"""
        # 清理列名
        df.columns = [col.strip().replace(' ', '_').lower() for col in df.columns]
        
        # 处理缺失值
        df = df.replace(['', 'null', 'NULL', 'nan', 'NaN'], np.nan)
        
        # 尝试转换数据类型
        for col in df.columns:
            if df[col].dtype == 'object':
                # 尝试转换为数值型
                try:
                    df[col] = pd.to_numeric(df[col], errors='ignore')
                except:
                    pass
                
                # 暂时不自动转换时间类型，保持原始数据
                # 让用户在前端界面决定如何处理时间列
                if False:  # 禁用自动时间转换
                    pass
        
        return df
    
    def _dataframe_to_dataset(self, df: pd.DataFrame) -> xr.Dataset:
        """将DataFrame转换为xarray Dataset"""
        # 不自动设置任何列为索引，保留所有列为数据变量
        # 让用户在前端界面决定哪个列作为时间坐标
        
        # 转换为xarray Dataset
        ds = xr.Dataset.from_dataframe(df)
        
        return ds
    
    def _add_cf_attributes(self, ds: xr.Dataset, metadata: Optional[Dict[str, Any]]) -> xr.Dataset:
        """添加CF-1.8全局属性"""
        attrs = self.default_cf_attrs.copy()
        
        # 合并用户提供的元数据
        if metadata:
            attrs.update({k: v for k, v in metadata.items() if v is not None})
        
        ds.attrs.update(attrs)
        return ds
    
    def _identify_coordinates(self, ds: xr.Dataset) -> xr.Dataset:
        """识别和设置坐标变量（保守识别，由用户在前端确认）"""
        coord_mapping = {
            'longitude': ['lon', 'longitude'],
            'latitude': ['lat', 'latitude'],
            # 移除depth的自动识别，让用户选择
            # 移除time的自动识别，让用户选择
        }
        
        for standard_name, possible_names in coord_mapping.items():
            for var_name in list(ds.data_vars.keys()):  # 使用list()避免迭代时修改
                if var_name.lower() in possible_names:
                    # 将数据变量转换为坐标
                    if var_name not in ds.coords:
                        ds = ds.set_coords(var_name)
                    
                    # 重命名为标准名称
                    if var_name != standard_name:
                        ds = ds.rename({var_name: standard_name})
                    
                    break
        
        return ds
    
    def _add_variable_attributes(self, ds: xr.Dataset) -> xr.Dataset:
        """为变量添加属性"""
        # 坐标变量属性
        coord_attrs = {
            'longitude': {
                'standard_name': 'longitude',
                'long_name': 'longitude',
                'units': 'degrees_east',
                'axis': 'X'
            },
            'latitude': {
                'standard_name': 'latitude',
                'long_name': 'latitude', 
                'units': 'degrees_north',
                'axis': 'Y'
            },
            'depth': {
                'standard_name': 'depth',
                'long_name': 'depth',
                'units': 'm',
                'axis': 'Z',
                'positive': 'down'
            },
            'time': {
                'standard_name': 'time',
                'long_name': 'time',
                'axis': 'T'
            }
        }
        
        # 为坐标变量添加属性
        for coord_name, attrs in coord_attrs.items():
            if coord_name in ds.coords:
                ds[coord_name].attrs.update(attrs)
        
        # 为数据变量添加基本属性
        for var_name in ds.data_vars:
            var = ds[var_name]
            if not var.attrs:
                attrs = {}
                
                # 根据变量名推断属性
                var_lower = var_name.lower()
                if 'temp' in var_lower:
                    attrs.update({
                        'standard_name': 'sea_water_temperature',
                        'long_name': 'sea water temperature',
                        'units': 'degree_C'
                    })
                elif 'sal' in var_lower:
                    attrs.update({
                        'standard_name': 'sea_water_salinity',
                        'long_name': 'sea water salinity',
                        'units': 'psu'
                    })
                elif 'pres' in var_lower:
                    attrs.update({
                        'standard_name': 'sea_water_pressure',
                        'long_name': 'sea water pressure',
                        'units': 'dbar'
                    })
                else:
                    # 通用属性
                    attrs.update({
                        'long_name': var_name.replace('_', ' ').title()
                    })
                
                # 添加缺失值属性
                if var.isnull().any():
                    if var.dtype.kind == 'f':
                        attrs['_FillValue'] = np.nan
                    elif var.dtype.kind == 'i':
                        attrs['_FillValue'] = -999
                
                var.attrs.update(attrs)
        
        return ds
    
    def validate_csv_structure(self, file_path: str) -> Dict[str, Any]:
        """验证CSV文件结构"""
        try:
            # 读取文件头部进行快速验证
            df_sample = pd.read_csv(file_path, nrows=5)
            
            result = {
                'valid': True,
                'columns': list(df_sample.columns),
                'row_count': len(pd.read_csv(file_path)),
                'column_count': len(df_sample.columns),
                'data_types': df_sample.dtypes.to_dict(),
                'has_time_column': any('time' in col.lower() or 'date' in col.lower() 
                                     for col in df_sample.columns),
                'has_coordinate_columns': any(coord in col.lower() 
                                            for col in df_sample.columns 
                                            for coord in ['lat', 'lon', 'x', 'y'])
            }
            
            return result
            
        except Exception as e:
            return {
                'valid': False,
                'error': str(e)
            }


# 便利函数
def parse_csv_to_netcdf(csv_path: str, output_path: str, 
                       metadata: Optional[Dict[str, Any]] = None) -> str:
    """
    将CSV文件转换为NetCDF文件
    
    Args:
        csv_path: CSV文件路径
        output_path: 输出NetCDF文件路径
        metadata: 额外的元数据
    
    Returns:
        输出文件路径
    """
    parser = CSVParser()
    ds = parser.parse(csv_path, metadata)
    
    # 保存为NetCDF
    ds.to_netcdf(output_path, format='NETCDF4')
    logger.info(f"CSV文件已转换为NetCDF: {output_path}")
    
    return output_path