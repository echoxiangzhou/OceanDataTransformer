"""数据类型转换工具函数"""
import numpy as np
import pandas as pd
from typing import Any, Dict, List, Union


def convert_numpy_types(obj: Any) -> Any:
    """递归转换NumPy类型为Python原生类型"""
    # 首先检查是否是pandas NaN
    try:
        if pd.isna(obj):
            return None
    except (TypeError, ValueError):
        pass
    
    # 检查NumPy数组
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    
    # 检查NumPy标量类型 - 使用更通用的方法
    if hasattr(obj, 'dtype') and hasattr(obj, 'item'):
        try:
            # 使用item()方法将numpy标量转换为Python原生类型
            return obj.item()
        except (ValueError, AttributeError):
            pass
    
    # 检查具体的NumPy类型
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.bool_):
        return bool(obj)
    
    # 处理容器类型
    elif isinstance(obj, dict):
        return {key: convert_numpy_types(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy_types(item) for item in obj]
    elif isinstance(obj, tuple):
        return tuple(convert_numpy_types(item) for item in obj)
    
    # 对于其他类型，直接返回
    return obj


def safe_serialize_for_pydantic(data: Any) -> Any:
    """确保数据可以被Pydantic安全序列化"""
    try:
        return convert_numpy_types(data)
    except Exception:
        # 如果转换失败，尝试转换为字符串
        return str(data)