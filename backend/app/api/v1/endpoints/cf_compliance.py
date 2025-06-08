"""
CF合规性验证API端点
基于version0.5代码优化和集成
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
import tempfile
import os
from pathlib import Path

from app.db.session import get_db
from app.services.cf_validator import CFValidator, ValidationResult
from app.services.cf_converter import CFConverter
from app.schemas.common import MessageResponse

router = APIRouter()


@router.post("/validate")
async def validate_cf_compliance(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """验证NetCDF文件的CF-1.8合规性"""
    
    if not file.filename.lower().endswith(('.nc', '.netcdf')):
        raise HTTPException(
            status_code=400, 
            detail="只支持NetCDF文件格式 (.nc, .netcdf)"
        )
    
    # 创建临时文件
    with tempfile.NamedTemporaryFile(delete=False, suffix='.nc') as temp_file:
        temp_path = temp_file.name
        
        # 保存上传的文件
        content = await file.read()
        temp_file.write(content)
    
    try:
        # 执行CF验证
        validator = CFValidator()
        result = validator.validate_file(temp_path)
        
        # 格式化验证结果
        response_data = {
            "filename": file.filename,
            "is_valid": result.is_valid,
            "cf_version": result.cf_version,
            "total_issues": len(result.issues),
            "critical_issues": len(result.critical_issues),
            "warning_issues": len(result.warning_issues),
            "compliance_score": _calculate_compliance_score(result),
            "issues": [
                {
                    "level": issue.level.value,
                    "code": issue.code,
                    "message": issue.message,
                    "location": issue.location,
                    "suggestion": issue.suggestion
                }
                for issue in result.issues
            ]
        }
        
        return response_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"验证失败: {str(e)}")
    finally:
        # 清理临时文件
        if os.path.exists(temp_path):
            os.unlink(temp_path)


@router.post("/validate-and-fix")
async def validate_and_fix_cf_compliance(
    file: UploadFile = File(...),
    auto_fix: bool = Form(True),
    backup: bool = Form(True),
    title: Optional[str] = Form(None),
    institution: Optional[str] = Form(None),
    source: Optional[str] = Form(None),
    comment: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """验证NetCDF文件并自动修复CF-1.8合规性问题"""
    
    if not file.filename.lower().endswith(('.nc', '.netcdf')):
        raise HTTPException(
            status_code=400, 
            detail="只支持NetCDF文件格式 (.nc, .netcdf)"
        )
    
    # 创建临时输入和输出文件
    with tempfile.NamedTemporaryFile(delete=False, suffix='.nc') as input_temp:
        input_path = input_temp.name
        content = await file.read()
        input_temp.write(content)
    
    output_path = input_path.replace('.nc', '_fixed.nc')
    
    try:
        # 先进行验证
        validator = CFValidator()
        original_result = validator.validate_file(input_path)
        
        if original_result.is_valid and not auto_fix:
            # 文件已经合规且不强制修复
            return {
                "filename": file.filename,
                "original_valid": True,
                "conversion_performed": False,
                "message": "文件已符合CF-1.8标准",
                "validation_result": {
                    "is_valid": original_result.is_valid,
                    "cf_version": original_result.cf_version,
                    "total_issues": len(original_result.issues),
                    "compliance_score": _calculate_compliance_score(original_result)
                }
            }
        
        # 执行CF转换
        converter = CFConverter()
        
        # 准备转换选项
        conversion_options = {}
        if title:
            conversion_options['title'] = title
        if institution:
            conversion_options['institution'] = institution
        if source:
            conversion_options['source'] = source
        if comment:
            conversion_options['comment'] = comment
        
        conversion_result = converter.convert_file(
            input_path, 
            output_path, 
            auto_fix=auto_fix,
            backup=backup
        )
        
        if not conversion_result['success']:
            raise HTTPException(
                status_code=500, 
                detail=f"转换失败: {conversion_result['message']}"
            )
        
        # 验证转换后的文件
        final_result = validator.validate_file(output_path)
        
        # 读取转换后的文件内容
        with open(output_path, 'rb') as f:
            converted_content = f.read()
        
        response_data = {
            "filename": file.filename,
            "original_valid": original_result.is_valid,
            "conversion_performed": True,
            "conversion_success": conversion_result['success'],
            "backup_created": conversion_result.get('backup_path') is not None,
            "issues_fixed": conversion_result['issues_fixed'],
            "remaining_issues": conversion_result['remaining_issues'],
            "validation_result": {
                "original": {
                    "is_valid": original_result.is_valid,
                    "total_issues": len(original_result.issues),
                    "critical_issues": len(original_result.critical_issues),
                    "compliance_score": _calculate_compliance_score(original_result)
                },
                "final": {
                    "is_valid": final_result.is_valid,
                    "total_issues": len(final_result.issues),
                    "critical_issues": len(final_result.critical_issues),
                    "compliance_score": _calculate_compliance_score(final_result)
                }
            },
            "converted_file_size": len(converted_content)
        }
        
        return response_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"验证和修复失败: {str(e)}")
    finally:
        # 清理临时文件
        for path in [input_path, output_path]:
            if os.path.exists(path):
                os.unlink(path)


@router.get("/standards")
async def get_cf_standards():
    """获取CF-1.8标准信息"""
    return {
        "cf_version": "CF-1.8",
        "required_global_attributes": [
            "Conventions",
            "title", 
            "institution",
            "source",
            "history"
        ],
        "recommended_global_attributes": [
            "references",
            "comment",
            "created_by",
            "date_created"
        ],
        "coordinate_standards": {
            "longitude": {
                "standard_name": "longitude",
                "units": "degrees_east",
                "axis": "X"
            },
            "latitude": {
                "standard_name": "latitude", 
                "units": "degrees_north",
                "axis": "Y"
            },
            "time": {
                "standard_name": "time",
                "axis": "T",
                "units_format": "time_unit since reference_time"
            },
            "depth": {
                "standard_name": "depth",
                "units": "m",
                "axis": "Z",
                "positive": "down"
            }
        },
        "common_variable_standards": {
            "sea_water_temperature": {
                "standard_name": "sea_water_temperature",
                "units": "degree_C"
            },
            "sea_water_salinity": {
                "standard_name": "sea_water_salinity", 
                "units": "psu"
            },
            "sea_water_pressure": {
                "standard_name": "sea_water_pressure",
                "units": "dbar"
            }
        }
    }


@router.get("/validation-codes")
async def get_validation_codes():
    """获取验证错误代码说明"""
    return {
        "critical_codes": {
            "MISSING_CONVENTIONS": "缺少Conventions属性",
            "INVALID_CONVENTIONS": "Conventions属性格式无效",
            "FILE_READ_ERROR": "文件读取错误",
            "MISSING_TIME_UNITS": "时间变量缺少units属性"
        },
        "warning_codes": {
            "MISSING_TITLE": "缺少推荐的title属性",
            "MISSING_INSTITUTION": "缺少推荐的institution属性", 
            "MISSING_SOURCE": "缺少推荐的source属性",
            "MISSING_HISTORY": "缺少推荐的history属性",
            "MISSING_LONGITUDE": "未找到经度坐标变量",
            "MISSING_LATITUDE": "未找到纬度坐标变量",
            "MISSING_COORDINATE_UNITS": "坐标变量缺少units属性",
            "MISSING_AXIS": "坐标变量缺少axis属性",
            "MISSING_VARIABLE_NAME": "数据变量缺少standard_name或long_name",
            "MISSING_VARIABLE_UNITS": "数据变量缺少units属性",
            "INVALID_TIME_UNITS": "时间变量units格式可能无效",
            "MISSING_TIME_CALENDAR": "时间变量缺少calendar属性",
            "QUESTIONABLE_TEMPERATURE_UNITS": "温度单位可能不正确",
            "MISSING_FILLVALUE": "变量包含缺失值但未定义_FillValue",
            "EMPTY_DIMENSION": "维度大小为0"
        },
        "info_codes": {
            "CONVENTIONS_FOUND": "发现CF版本信息"
        }
    }


def _calculate_compliance_score(result: ValidationResult) -> float:
    """计算合规性评分"""
    if len(result.issues) == 0:
        return 100.0
    
    # 严重问题权重更高
    critical_weight = 10
    warning_weight = 1
    
    total_weight = (len(result.critical_issues) * critical_weight + 
                   len(result.warning_issues) * warning_weight)
    
    max_weight = len(result.issues) * critical_weight  # 假设所有问题都是严重的
    
    if max_weight == 0:
        return 100.0
    
    score = max(0, 100 - (total_weight / max_weight * 100))
    return round(score, 1)