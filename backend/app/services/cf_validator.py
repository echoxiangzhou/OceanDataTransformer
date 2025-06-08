"""
CF-1.8规范验证服务
检查NetCDF文件是否符合CF-1.8标准
基于version0.5代码优化和集成
"""

import os
import logging
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from enum import Enum
import xarray as xr
import numpy as np
from datetime import datetime
import re

logger = logging.getLogger(__name__)


class ValidationLevel(Enum):
    """验证级别"""
    CRITICAL = "critical"  # 严重错误，必须修复
    WARNING = "warning"   # 警告，建议修复
    INFO = "info"         # 信息提示


@dataclass
class ValidationIssue:
    """验证问题"""
    level: ValidationLevel
    code: str
    message: str
    location: str
    suggestion: Optional[str] = None


@dataclass
class ValidationResult:
    """验证结果"""
    is_valid: bool
    issues: List[ValidationIssue]
    cf_version: Optional[str] = None
    
    @property
    def critical_issues(self) -> List[ValidationIssue]:
        return [i for i in self.issues if i.level == ValidationLevel.CRITICAL]
    
    @property
    def warning_issues(self) -> List[ValidationIssue]:
        return [i for i in self.issues if i.level == ValidationLevel.WARNING]


class CFValidator:
    """CF-1.8规范验证器"""
    
    # CF-1.8标准的必需全局属性
    REQUIRED_GLOBAL_ATTRS = {
        'Conventions': 'CF-1.8',
        'title': str,
        'institution': str,
        'source': str,
        'history': str,
        'references': str,
    }
    
    # 标准坐标变量名称
    STANDARD_COORD_NAMES = {
        'longitude': ['longitude', 'lon', 'x'],
        'latitude': ['latitude', 'lat', 'y'], 
        'time': ['time', 't'],
        'depth': ['depth', 'z', 'level'],
        'pressure': ['pressure', 'pres'],
    }
    
    # 常见的standard_name
    COMMON_STANDARD_NAMES = {
        'sea_water_temperature': ['temperature', 'temp', 't'],
        'sea_water_salinity': ['salinity', 'salt', 's'],
        'sea_water_pressure': ['pressure', 'pres', 'p'],
        'depth': ['depth', 'z'],
    }
    
    def __init__(self):
        self.issues = []
    
    def validate_file(self, file_path: str) -> ValidationResult:
        """验证NetCDF文件"""
        self.issues = []
        
        try:
            with xr.open_dataset(file_path, decode_times=False) as ds:
                logger.info(f"开始验证文件: {file_path}")
                
                # 检查全局属性
                self._check_global_attributes(ds)
                
                # 检查坐标变量
                self._check_coordinate_variables(ds)
                
                # 检查数据变量
                self._check_data_variables(ds)
                
                # 检查时间变量
                self._check_time_variables(ds)
                
                # 检查单位
                self._check_units(ds)
                
                # 检查缺失值
                self._check_missing_values(ds)
                
                # 检查维度
                self._check_dimensions(ds)
                
        except Exception as e:
            self.issues.append(ValidationIssue(
                level=ValidationLevel.CRITICAL,
                code="FILE_READ_ERROR",
                message=f"无法读取NetCDF文件: {str(e)}",
                location="file"
            ))
        
        # 判断是否通过验证
        is_valid = len(self.critical_issues) == 0
        cf_version = self._get_cf_version()
        
        return ValidationResult(
            is_valid=is_valid,
            issues=self.issues.copy(),
            cf_version=cf_version
        )
    
    @property
    def critical_issues(self) -> List[ValidationIssue]:
        return [i for i in self.issues if i.level == ValidationLevel.CRITICAL]
    
    def _get_cf_version(self) -> Optional[str]:
        """获取CF版本"""
        for issue in self.issues:
            if issue.code == "CONVENTIONS_FOUND":
                return issue.message.split(": ")[-1]
        return None
    
    def _check_global_attributes(self, ds: xr.Dataset):
        """检查全局属性"""
        attrs = ds.attrs
        
        # 检查Conventions属性
        if 'Conventions' not in attrs:
            self.issues.append(ValidationIssue(
                level=ValidationLevel.CRITICAL,
                code="MISSING_CONVENTIONS",
                message="缺少Conventions属性",
                location="global",
                suggestion="添加 Conventions = 'CF-1.8'"
            ))
        else:
            conventions = attrs['Conventions']
            if not isinstance(conventions, str) or 'CF' not in conventions:
                self.issues.append(ValidationIssue(
                    level=ValidationLevel.CRITICAL,
                    code="INVALID_CONVENTIONS",
                    message=f"Conventions属性无效: {conventions}",
                    location="global",
                    suggestion="设置 Conventions = 'CF-1.8'"
                ))
            else:
                self.issues.append(ValidationIssue(
                    level=ValidationLevel.INFO,
                    code="CONVENTIONS_FOUND",
                    message=f"发现CF版本: {conventions}",
                    location="global"
                ))
        
        # 检查其他推荐的全局属性
        recommended_attrs = ['title', 'institution', 'source', 'history']
        for attr in recommended_attrs:
            if attr not in attrs:
                self.issues.append(ValidationIssue(
                    level=ValidationLevel.WARNING,
                    code=f"MISSING_{attr.upper()}",
                    message=f"缺少推荐的全局属性: {attr}",
                    location="global",
                    suggestion=f"添加 {attr} 属性"
                ))
    
    def _check_coordinate_variables(self, ds: xr.Dataset):
        """检查坐标变量"""
        coords = ds.coords
        
        # 检查是否有经纬度坐标
        has_lon = any(name in coords for names in self.STANDARD_COORD_NAMES['longitude'] for name in names)
        has_lat = any(name in coords for names in self.STANDARD_COORD_NAMES['latitude'] for name in names)
        
        if not has_lon:
            self.issues.append(ValidationIssue(
                level=ValidationLevel.WARNING,
                code="MISSING_LONGITUDE",
                message="未找到经度坐标变量",
                location="coordinates",
                suggestion="添加经度坐标变量（longitude, lon, x）"
            ))
        
        if not has_lat:
            self.issues.append(ValidationIssue(
                level=ValidationLevel.WARNING,
                code="MISSING_LATITUDE",
                message="未找到纬度坐标变量",
                location="coordinates",
                suggestion="添加纬度坐标变量（latitude, lat, y）"
            ))
        
        # 检查坐标变量属性
        for coord_name, coord_var in coords.items():
            self._check_coordinate_attributes(coord_name, coord_var)
    
    def _check_coordinate_attributes(self, coord_name: str, coord_var):
        """检查坐标变量属性"""
        attrs = coord_var.attrs
        
        # 检查units属性
        if 'units' not in attrs:
            self.issues.append(ValidationIssue(
                level=ValidationLevel.WARNING,
                code="MISSING_COORDINATE_UNITS",
                message=f"坐标变量 {coord_name} 缺少units属性",
                location=f"coordinate:{coord_name}",
                suggestion="添加适当的units属性"
            ))
        
        # 检查axis属性（对于标准坐标）
        coord_lower = coord_name.lower()
        expected_axis = None
        
        if coord_lower in ['longitude', 'lon', 'x']:
            expected_axis = 'X'
        elif coord_lower in ['latitude', 'lat', 'y']:
            expected_axis = 'Y'
        elif coord_lower in ['time', 't']:
            expected_axis = 'T'
        elif coord_lower in ['depth', 'z', 'level']:
            expected_axis = 'Z'
        
        if expected_axis and 'axis' not in attrs:
            self.issues.append(ValidationIssue(
                level=ValidationLevel.WARNING,
                code="MISSING_AXIS",
                message=f"坐标变量 {coord_name} 缺少axis属性",
                location=f"coordinate:{coord_name}",
                suggestion=f"添加 axis = '{expected_axis}'"
            ))
    
    def _check_data_variables(self, ds: xr.Dataset):
        """检查数据变量"""
        for var_name, var in ds.data_vars.items():
            attrs = var.attrs
            
            # 检查standard_name或long_name
            if 'standard_name' not in attrs and 'long_name' not in attrs:
                self.issues.append(ValidationIssue(
                    level=ValidationLevel.WARNING,
                    code="MISSING_VARIABLE_NAME",
                    message=f"数据变量 {var_name} 缺少standard_name或long_name",
                    location=f"variable:{var_name}",
                    suggestion="添加standard_name或long_name属性"
                ))
            
            # 检查units属性
            if 'units' not in attrs:
                self.issues.append(ValidationIssue(
                    level=ValidationLevel.WARNING,
                    code="MISSING_VARIABLE_UNITS",
                    message=f"数据变量 {var_name} 缺少units属性",
                    location=f"variable:{var_name}",
                    suggestion="添加适当的units属性"
                ))
    
    def _check_time_variables(self, ds: xr.Dataset):
        """检查时间变量"""
        time_vars = []
        
        # 查找时间变量
        for var_name, var in ds.variables.items():
            if (var_name.lower() in ['time', 't'] or 
                var.attrs.get('standard_name') == 'time' or
                'time' in var.attrs.get('units', '').lower()):
                time_vars.append(var_name)
        
        for time_var_name in time_vars:
            time_var = ds[time_var_name]
            attrs = time_var.attrs
            
            # 检查时间单位格式
            units = attrs.get('units', '')
            if not units:
                self.issues.append(ValidationIssue(
                    level=ValidationLevel.CRITICAL,
                    code="MISSING_TIME_UNITS",
                    message=f"时间变量 {time_var_name} 缺少units属性",
                    location=f"time:{time_var_name}",
                    suggestion="添加时间单位，如 'days since 1970-01-01 00:00:00'"
                ))
            elif 'since' not in units:
                self.issues.append(ValidationIssue(
                    level=ValidationLevel.WARNING,
                    code="INVALID_TIME_UNITS",
                    message=f"时间变量 {time_var_name} 的units格式可能无效: {units}",
                    location=f"time:{time_var_name}",
                    suggestion="使用标准时间单位格式，如 'days since 1970-01-01 00:00:00'"
                ))
            
            # 检查calendar属性
            if 'calendar' not in attrs:
                self.issues.append(ValidationIssue(
                    level=ValidationLevel.WARNING,
                    code="MISSING_TIME_CALENDAR",
                    message=f"时间变量 {time_var_name} 缺少calendar属性",
                    location=f"time:{time_var_name}",
                    suggestion="添加 calendar = 'gregorian'"
                ))
    
    def _check_units(self, ds: xr.Dataset):
        """检查单位"""
        # 检查单位的有效性
        for var_name, var in ds.variables.items():
            units = var.attrs.get('units')
            if units:
                # 检查常见的单位错误
                if isinstance(units, str):
                    # 检查温度单位
                    if 'temp' in var_name.lower() and units not in ['degree_C', 'degree_Celsius', 'K', 'kelvin']:
                        self.issues.append(ValidationIssue(
                            level=ValidationLevel.WARNING,
                            code="QUESTIONABLE_TEMPERATURE_UNITS",
                            message=f"变量 {var_name} 的温度单位可能不正确: {units}",
                            location=f"variable:{var_name}",
                            suggestion="使用标准温度单位：degree_C 或 K"
                        ))
    
    def _check_missing_values(self, ds: xr.Dataset):
        """检查缺失值"""
        for var_name, var in ds.data_vars.items():
            attrs = var.attrs
            
            # 检查是否定义了缺失值
            has_missing_def = '_FillValue' in attrs or 'missing_value' in attrs
            has_actual_missing = var.isnull().any()
            
            if has_actual_missing and not has_missing_def:
                self.issues.append(ValidationIssue(
                    level=ValidationLevel.WARNING,
                    code="MISSING_FILLVALUE",
                    message=f"变量 {var_name} 包含缺失值但未定义_FillValue",
                    location=f"variable:{var_name}",
                    suggestion="添加_FillValue属性"
                ))
    
    def _check_dimensions(self, ds: xr.Dataset):
        """检查维度"""
        # 检查维度名称是否合理
        for dim_name, dim_size in ds.dims.items():
            if dim_size == 0:
                self.issues.append(ValidationIssue(
                    level=ValidationLevel.WARNING,
                    code="EMPTY_DIMENSION",
                    message=f"维度 {dim_name} 的大小为0",
                    location=f"dimension:{dim_name}",
                    suggestion="检查数据是否正确加载"
                ))
    
    def validate_compliance_level(self, ds: xr.Dataset) -> Dict[str, Any]:
        """评估CF合规性级别"""
        total_checks = 0
        passed_checks = 0
        
        # 统计检查项
        for issue in self.issues:
            total_checks += 1
            if issue.level != ValidationLevel.CRITICAL:
                passed_checks += 1
        
        if total_checks == 0:
            compliance_score = 100.0
        else:
            compliance_score = (passed_checks / total_checks) * 100
        
        return {
            'score': compliance_score,
            'level': 'high' if compliance_score >= 90 else 'medium' if compliance_score >= 70 else 'low',
            'total_checks': total_checks,
            'passed_checks': passed_checks,
            'critical_issues': len(self.critical_issues),
            'warning_issues': len(self.warning_issues)
        }