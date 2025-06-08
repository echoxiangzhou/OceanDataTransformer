#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
海洋数据可视化算法
支持海洋温度、海洋盐度、海表面高度数据的可视化
作者: 海洋数据分析系统
版本: 1.0.0
"""

import numpy as np
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors
from matplotlib.patches import Rectangle
import xarray as xr
import cartopy.crs as ccrs
import cartopy.feature as cfeature
from cartopy.mpl.gridliner import LONGITUDE_FORMATTER, LATITUDE_FORMATTER
import os
import json
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
import warnings
warnings.filterwarnings('ignore')

# 设置中文字体
plt.rcParams['font.sans-serif'] = ['SimHei', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

class OceanDataVisualizer:
    """海洋数据可视化类"""
    
    def __init__(self):
        """初始化可视化器"""
        self.supported_variables = {
            'temperature': {'name': '海洋温度', 'unit': '°C', 'cmap': 'RdYlBu_r'},
            'salinity': {'name': '海洋盐度', 'unit': 'PSU', 'cmap': 'viridis'},
            'sea_surface_height': {'name': '海表面高度', 'unit': 'm', 'cmap': 'RdBu_r'},
            'ssh': {'name': '海表面高度', 'unit': 'm', 'cmap': 'RdBu_r'},
            'temp': {'name': '海洋温度', 'unit': '°C', 'cmap': 'RdYlBu_r'},
            'sal': {'name': '海洋盐度', 'unit': 'PSU', 'cmap': 'viridis'}
        }
    
    def load_netcdf_data(self, file_path: str) -> xr.Dataset:
        """加载NetCDF数据文件"""
        try:
            ds = xr.open_dataset(file_path)
            print(f"成功加载数据文件: {file_path}")
            print(f"数据变量: {list(ds.variables.keys())}")
            print(f"数据维度: {dict(ds.dims)}")
            return ds
        except Exception as e:
            raise ValueError(f"无法加载NetCDF文件 {file_path}: {str(e)}")
    
    def detect_variable_names(self, ds: xr.Dataset) -> Dict[str, str]:
        """自动检测数据变量名称"""
        var_mapping = {}
        
        # 常见的变量名映射
        name_patterns = {
            'temperature': ['temperature', 'temp', 'T', 'TEMP', 'pot_temp', 'theta'],
            'salinity': ['salinity', 'sal', 'S', 'SAL', 'SALT', 'psal'],
            'sea_surface_height': ['ssh', 'sea_surface_height', 'SSH', 'zos', 'eta', 'h'],
            'longitude': ['longitude', 'lon', 'LON', 'x', 'X'],
            'latitude': ['latitude', 'lat', 'LAT', 'y', 'Y'],
            'depth': ['depth', 'lev', 'level', 'z', 'Z', 'deptht']
        }
        
        for var_type, patterns in name_patterns.items():
            for var_name in ds.variables:
                if any(pattern in var_name.lower() for pattern in [p.lower() for p in patterns]):
                    var_mapping[var_type] = var_name
                    break
        
        return var_mapping
    
    def get_depth_levels(self, ds: xr.Dataset, depth_var: str) -> np.ndarray:
        """获取深度层级"""
        if depth_var in ds.variables:
            return ds[depth_var].values
        return np.array([0])
    
    def select_depth_data(self, data: xr.DataArray, depth_var: str, target_depth: float) -> xr.DataArray:
        """选择特定深度的数据"""
        if depth_var not in data.dims:
            return data
        
        depths = data[depth_var].values
        closest_depth_idx = np.argmin(np.abs(depths - target_depth))
        closest_depth = depths[closest_depth_idx]
        
        print(f"目标深度: {target_depth}m, 选择深度: {closest_depth}m")
        return data.isel({depth_var: closest_depth_idx})
    
    def create_ocean_map(self, 
                        data: xr.DataArray, 
                        title: str, 
                        variable_info: Dict[str, str],
                        lon_var: str = 'longitude',
                        lat_var: str = 'latitude',
                        bbox: Optional[Tuple[float, float, float, float]] = None) -> plt.Figure:
        """
        创建海洋数据地图
        
        参数:
            data: 数据数组
            title: 图表标题
            variable_info: 变量信息字典
            lon_var: 经度变量名
            lat_var: 纬度变量名
            bbox: 边界框 (lon_min, lat_min, lon_max, lat_max)，可选
        """
        
        # 创建地图
        fig = plt.figure(figsize=(12, 8))
        ax = fig.add_subplot(1, 1, 1, projection=ccrs.PlateCarree())
        
        # 添加地理特征
        ax.add_feature(cfeature.COASTLINE, linewidth=0.5)
        ax.add_feature(cfeature.BORDERS, linewidth=0.5)
        ax.add_feature(cfeature.LAND, facecolor='lightgray')
        ax.add_feature(cfeature.OCEAN, facecolor='white')
        
        # 获取经纬度
        if lon_var in data.coords:
            lons = data[lon_var].values
            lats = data[lat_var].values
        else:
            lons = data.coords[list(data.coords.keys())[1]].values
            lats = data.coords[list(data.coords.keys())[0]].values
        
        # 如果指定了边界框，则裁剪数据
        if bbox is not None:
            lon_min, lat_min, lon_max, lat_max = bbox
            print(f"应用地理边界框: 经度 [{lon_min}, {lon_max}], 纬度 [{lat_min}, {lat_max}]")
            
            # 裁剪数据到指定区域
            if lon_var in data.coords and lat_var in data.coords:
                data_subset = data.sel({
                    lon_var: slice(lon_min, lon_max),
                    lat_var: slice(lat_min, lat_max)
                })
                lons = data_subset[lon_var].values
                lats = data_subset[lat_var].values
                data_values = data_subset.values
            else:
                # 如果无法直接切片，手动筛选
                lon_mask = (lons >= lon_min) & (lons <= lon_max)
                lat_mask = (lats >= lat_min) & (lats <= lat_max)
                
                if len(lons.shape) == 1 and len(lats.shape) == 1:
                    # 1D坐标
                    lon_indices = np.where(lon_mask)[0]
                    lat_indices = np.where(lat_mask)[0]
                    
                    if len(lon_indices) > 0 and len(lat_indices) > 0:
                        lons = lons[lon_mask]
                        lats = lats[lat_mask]
                        data_values = data.values[np.ix_(lat_indices, lon_indices)]
                    else:
                        print("警告: 指定区域内无数据")
                        data_values = data.values
                else:
                    data_values = data.values
            
            # 在地图上绘制边界框
            bbox_rect = Rectangle((lon_min, lat_min), lon_max - lon_min, lat_max - lat_min,
                                linewidth=2, edgecolor='red', facecolor='none', 
                                transform=ccrs.PlateCarree(), alpha=0.8)
            ax.add_patch(bbox_rect)
        else:
            data_values = data.values
        
        # 绘制数据
        cmap = variable_info.get('cmap', 'viridis')
        im = ax.contourf(lons, lats, data_values, 
                        levels=20, cmap=cmap, transform=ccrs.PlateCarree(),
                        extend='both')
        
        # 添加颜色条
        cbar = plt.colorbar(im, ax=ax, orientation='horizontal', 
                           pad=0.1, shrink=0.8, aspect=40)
        cbar.set_label(f"{variable_info['name']} ({variable_info['unit']})", 
                      fontsize=12)
        
        # 添加网格线
        gl = ax.gridlines(draw_labels=True, linewidth=0.5, alpha=0.5)
        gl.xlabel_style = {'size': 10}
        gl.ylabel_style = {'size': 10}
        gl.xformatter = LONGITUDE_FORMATTER
        gl.yformatter = LATITUDE_FORMATTER
        
        # 设置地图范围
        if bbox is not None:
            # 使用指定的边界框范围，并稍微扩展
            lon_min, lat_min, lon_max, lat_max = bbox
            extent = [lon_min - 2, lon_max + 2, lat_min - 2, lat_max + 2]
            ax.set_extent(extent, crs=ccrs.PlateCarree())
        else:
            # 自动设置范围
            ax.set_global()
            if len(lons) > 1 and len(lats) > 1:
                lon_range = [lons.min() - 5, lons.max() + 5]
                lat_range = [lats.min() - 5, lats.max() + 5]
                ax.set_extent([*lon_range, *lat_range], crs=ccrs.PlateCarree())
        
        # 添加标题
        if bbox is not None:
            title += f" (区域: {bbox[0]:.1f}°-{bbox[2]:.1f}°E, {bbox[1]:.1f}°-{bbox[3]:.1f}°N)"
        plt.title(title, fontsize=14, fontweight='bold', pad=20)
        
        # 添加统计信息
        if bbox is not None and 'data_subset' in locals():
            # 使用裁剪后的数据计算统计信息
            stats_data = data_subset
        else:
            stats_data = data
            
        stats_text = f"最小值: {stats_data.min().values:.2f} {variable_info['unit']}\n"
        stats_text += f"最大值: {stats_data.max().values:.2f} {variable_info['unit']}\n"
        stats_text += f"平均值: {stats_data.mean().values:.2f} {variable_info['unit']}"
        
        if bbox is not None:
            stats_text += f"\n区域范围: {bbox[0]:.1f}°-{bbox[2]:.1f}°E, {bbox[1]:.1f}°-{bbox[3]:.1f}°N"
        
        ax.text(0.02, 0.98, stats_text, transform=ax.transAxes, 
                verticalalignment='top', bbox=dict(boxstyle='round', 
                facecolor='white', alpha=0.8), fontsize=9)
        
        plt.tight_layout()
        return fig
    
    def extract_region_data(self, 
                           data: xr.DataArray,
                           bbox: Tuple[float, float, float, float],
                           lon_var: str = 'longitude',
                           lat_var: str = 'latitude') -> xr.DataArray:
        """
        提取指定区域的数据
        
        参数:
            data: 输入数据数组
            bbox: 边界框 (lon_min, lat_min, lon_max, lat_max)
            lon_var: 经度变量名
            lat_var: 纬度变量名
            
        返回:
            裁剪后的数据数组
        """
        lon_min, lat_min, lon_max, lat_max = bbox
        
        try:
            # 尝试使用 xarray 的 sel 方法进行切片
            if lon_var in data.coords and lat_var in data.coords:
                region_data = data.sel({
                    lon_var: slice(lon_min, lon_max),
                    lat_var: slice(lat_min, lat_max)
                })
                print(f"成功提取区域数据，形状: {region_data.shape}")
                return region_data
            else:
                print("警告: 无法使用坐标切片，返回原始数据")
                return data
        except Exception as e:
            print(f"区域数据提取失败: {e}，返回原始数据")
            return data
    
    def create_regional_analysis(self,
                               data: xr.DataArray,
                               bbox: Tuple[float, float, float, float],
                               variable_info: Dict[str, str],
                               lon_var: str = 'longitude',
                               lat_var: str = 'latitude') -> plt.Figure:
        """
        创建区域分析图表
        
        参数:
            data: 数据数组
            bbox: 边界框 (lon_min, lat_min, lon_max, lat_max)
            variable_info: 变量信息字典
            lon_var: 经度变量名
            lat_var: 纬度变量名
            
        返回:
            包含多个子图的分析图表
        """
        lon_min, lat_min, lon_max, lat_max = bbox
        
        # 提取区域数据
        region_data = self.extract_region_data(data, bbox, lon_var, lat_var)
        
        # 创建多子图布局
        fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(15, 12))
        
        # 1. 区域平均时间序列（如果有时间维度）
        if 'time' in region_data.dims:
            time_series = region_data.mean(dim=[d for d in region_data.dims if d != 'time'])
            ax1.plot(range(len(time_series)), time_series.values, 'b-', linewidth=2)
            ax1.set_title(f'{variable_info["name"]} 区域平均时间序列')
            ax1.set_xlabel('时间步')
            ax1.set_ylabel(f'{variable_info["name"]} ({variable_info["unit"]})')
            ax1.grid(True, alpha=0.3)
        else:
            ax1.text(0.5, 0.5, '无时间维度数据', ha='center', va='center', transform=ax1.transAxes)
            ax1.set_title('时间序列分析')
        
        # 2. 数据分布直方图
        flat_data = region_data.values.flatten()
        flat_data = flat_data[~np.isnan(flat_data)]  # 移除NaN值
        if len(flat_data) > 0:
            ax2.hist(flat_data, bins=30, alpha=0.7, color='skyblue', edgecolor='black')
            ax2.set_title(f'{variable_info["name"]} 数据分布')
            ax2.set_xlabel(f'{variable_info["name"]} ({variable_info["unit"]})')
            ax2.set_ylabel('频次')
            ax2.grid(True, alpha=0.3)
            
            # 添加统计信息
            stats_text = f'均值: {np.mean(flat_data):.2f}\n'
            stats_text += f'标准差: {np.std(flat_data):.2f}\n'
            stats_text += f'最小值: {np.min(flat_data):.2f}\n'
            stats_text += f'最大值: {np.max(flat_data):.2f}'
            ax2.text(0.02, 0.98, stats_text, transform=ax2.transAxes, 
                    verticalalignment='top', bbox=dict(boxstyle='round', 
                    facecolor='white', alpha=0.8), fontsize=9)
        
        # 3. 经向平均剖面
        if lat_var in region_data.dims and len(region_data.dims) >= 2:
            zonal_mean = region_data.mean(dim=[d for d in region_data.dims if d != lat_var])
            lats = region_data[lat_var].values
            ax3.plot(zonal_mean.values, lats, 'g-', linewidth=2, marker='o', markersize=4)
            ax3.set_title(f'{variable_info["name"]} 经向平均剖面')
            ax3.set_xlabel(f'{variable_info["name"]} ({variable_info["unit"]})')
            ax3.set_ylabel('纬度 (°N)')
            ax3.grid(True, alpha=0.3)
        else:
            ax3.text(0.5, 0.5, '无法生成经向剖面', ha='center', va='center', transform=ax3.transAxes)
            ax3.set_title('经向平均剖面')
        
        # 4. 纬向平均剖面
        if lon_var in region_data.dims and len(region_data.dims) >= 2:
            meridional_mean = region_data.mean(dim=[d for d in region_data.dims if d != lon_var])
            lons = region_data[lon_var].values
            ax4.plot(lons, meridional_mean.values, 'r-', linewidth=2, marker='o', markersize=4)
            ax4.set_title(f'{variable_info["name"]} 纬向平均剖面')
            ax4.set_xlabel('经度 (°E)')
            ax4.set_ylabel(f'{variable_info["name"]} ({variable_info["unit"]})')
            ax4.grid(True, alpha=0.3)
        else:
            ax4.text(0.5, 0.5, '无法生成纬向剖面', ha='center', va='center', transform=ax4.transAxes)
            ax4.set_title('纬向平均剖面')
        
        # 添加总标题
        fig.suptitle(f'{variable_info["name"]} 区域分析 (区域: {lon_min:.1f}°-{lon_max:.1f}°E, {lat_min:.1f}°-{lat_max:.1f}°N)', 
                    fontsize=16, fontweight='bold')
        
        plt.tight_layout()
        return fig
    
    def create_depth_profile(self, 
                           data: xr.DataArray, 
                           depth_var: str,
                           variable_info: Dict[str, str],
                           lon_point: float = None, 
                           lat_point: float = None) -> plt.Figure:
        """创建深度剖面图"""
        
        fig, ax = plt.subplots(figsize=(10, 6))
        
        if depth_var in data.dims and len(data.dims) >= 3:
            # 如果指定了经纬度点，提取该点的深度剖面
            if lon_point is not None and lat_point is not None:
                # 找到最近的格点
                lon_var = [dim for dim in data.dims if 'lon' in dim.lower()][0]
                lat_var = [dim for dim in data.dims if 'lat' in dim.lower()][0]
                
                data_point = data.sel({lon_var: lon_point, lat_var: lat_point}, method='nearest')
                depths = data_point[depth_var].values
                values = data_point.values
                
                ax.plot(values, depths, 'b-', linewidth=2, marker='o', markersize=4)
                ax.set_title(f'{variable_info["name"]} 深度剖面 (经度: {lon_point:.2f}°, 纬度: {lat_point:.2f}°)')
            else:
                # 计算全球平均剖面
                depths = data[depth_var].values
                mean_profile = data.mean(dim=[d for d in data.dims if d != depth_var])
                
                ax.plot(mean_profile.values, depths, 'b-', linewidth=2, marker='o', markersize=4)
                ax.set_title(f'{variable_info["name"]} 全球平均深度剖面')
            
            ax.set_xlabel(f'{variable_info["name"]} ({variable_info["unit"]})')
            ax.set_ylabel('深度 (m)')
            ax.invert_yaxis()  # 深度从上到下
            ax.grid(True, alpha=0.3)
            
        plt.tight_layout()
        return fig

def run(input_files: List[Path], 
        output_dir: Path, 
        parameters: Dict[str, Any], 
        output_format: str = 'png') -> None:
    """
    算法主函数
    
    参数:
        input_files: 输入NetCDF文件列表
        output_dir: 输出目录
        parameters: 算法参数
        output_format: 输出格式
    """
    
    print("开始执行海洋数据可视化算法...")
    print(f"输入文件: {input_files}")
    print(f"输出目录: {output_dir}")
    print(f"算法参数: {parameters}")
    
    # 创建可视化器
    visualizer = OceanDataVisualizer()
    
    # 获取参数
    variable_type = parameters.get('variable_type', 'temperature')  # temperature, salinity, sea_surface_height
    depth = parameters.get('depth', 0)  # 深度 (m)
    create_profile = parameters.get('create_profile', False)  # 是否创建深度剖面
    profile_lon = parameters.get('profile_lon', None)  # 剖面经度
    profile_lat = parameters.get('profile_lat', None)  # 剖面纬度
    
    # 区域边界框参数 (lon_min, lat_min, lon_max, lat_max)
    bbox = None
    if all(key in parameters for key in ['bbox_lon_min', 'bbox_lat_min', 'bbox_lon_max', 'bbox_lat_max']):
        bbox = (
            float(parameters['bbox_lon_min']),
            float(parameters['bbox_lat_min']),
            float(parameters['bbox_lon_max']),
            float(parameters['bbox_lat_max'])
        )
        print(f"使用区域边界框: {bbox}")
    
    # 是否创建区域分析
    create_regional_analysis = parameters.get('create_regional_analysis', False) and bbox is not None
    
    if not input_files:
        raise ValueError("未提供输入文件")
    
    # 处理每个输入文件
    for i, input_file in enumerate(input_files):
        try:
            print(f"\n处理文件 {i+1}/{len(input_files)}: {input_file}")
            
            # 加载数据
            ds = visualizer.load_netcdf_data(str(input_file))
            
            # 自动检测变量名
            var_mapping = visualizer.detect_variable_names(ds)
            print(f"检测到的变量映射: {var_mapping}")
            
            # 确定要可视化的变量
            target_var = None
            for var_key in [variable_type, variable_type.lower(), 
                           variable_type.replace('_', ''), variable_type[:4]]:
                if var_key in var_mapping:
                    target_var = var_mapping[var_key]
                    break
            
            if not target_var:
                # 尝试直接查找
                possible_vars = list(ds.data_vars.keys())
                print(f"可用的数据变量: {possible_vars}")
                if possible_vars:
                    target_var = possible_vars[0]
                    print(f"自动选择变量: {target_var}")
                else:
                    raise ValueError(f"无法找到变量类型 {variable_type}")
            
            # 获取变量信息
            var_info = visualizer.supported_variables.get(
                variable_type, 
                {'name': target_var, 'unit': '', 'cmap': 'viridis'}
            )
            
            # 获取数据
            data = ds[target_var]
            print(f"数据形状: {data.shape}")
            print(f"数据维度: {data.dims}")
            
            # 获取坐标变量
            lon_var = var_mapping.get('longitude', 'longitude')
            lat_var = var_mapping.get('latitude', 'latitude')
            depth_var = var_mapping.get('depth', 'depth')
            
            # 处理深度选择
            if variable_type != 'sea_surface_height' and depth_var in data.dims:
                print(f"选择深度: {depth}m")
                data = visualizer.select_depth_data(data, depth_var, depth)
                title = f"{var_info['name']} (深度: {depth}m)"
            else:
                title = f"{var_info['name']}"
                if variable_type in ['sea_surface_height', 'ssh']:
                    title += " (海表面)"
            
            # 创建地图可视化
            print("创建地图可视化...")
            fig = visualizer.create_ocean_map(data, title, var_info, lon_var, lat_var, bbox)
            
            # 保存地图
            map_filename = f"{input_file.stem}_{variable_type}"
            if variable_type != 'sea_surface_height':
                map_filename += f"_depth_{depth}m"
            if bbox is not None:
                map_filename += f"_region_{bbox[0]:.0f}-{bbox[2]:.0f}E_{bbox[1]:.0f}-{bbox[3]:.0f}N"
            map_filename += f"_map.{output_format}"
            
            map_path = output_dir / map_filename
            fig.savefig(map_path, dpi=300, bbox_inches='tight')
            plt.close(fig)
            print(f"地图已保存: {map_path}")
            
            # 创建区域分析图（如果指定了区域边界框）
            if create_regional_analysis:
                print("创建区域分析图...")
                analysis_fig = visualizer.create_regional_analysis(
                    data, bbox, var_info, lon_var, lat_var
                )
                
                analysis_filename = f"{input_file.stem}_{variable_type}"
                if variable_type != 'sea_surface_height':
                    analysis_filename += f"_depth_{depth}m"
                analysis_filename += f"_region_analysis_{bbox[0]:.0f}-{bbox[2]:.0f}E_{bbox[1]:.0f}-{bbox[3]:.0f}N.{output_format}"
                
                analysis_path = output_dir / analysis_filename
                analysis_fig.savefig(analysis_path, dpi=300, bbox_inches='tight')
                plt.close(analysis_fig)
                print(f"区域分析图已保存: {analysis_path}")
            
            # 创建深度剖面图（仅对温度和盐度）
            if create_profile and variable_type in ['temperature', 'salinity'] and depth_var in ds[target_var].dims:
                print("创建深度剖面图...")
                profile_fig = visualizer.create_depth_profile(
                    ds[target_var], depth_var, var_info, profile_lon, profile_lat
                )
                
                profile_filename = f"{input_file.stem}_{variable_type}_profile.{output_format}"
                profile_path = output_dir / profile_filename
                profile_fig.savefig(profile_path, dpi=300, bbox_inches='tight')
                plt.close(profile_fig)
                print(f"深度剖面图已保存: {profile_path}")
            
            # 关闭数据集
            ds.close()
            
        except Exception as e:
            print(f"处理文件 {input_file} 时出错: {str(e)}")
            continue
    
    print("\n海洋数据可视化算法执行完成!")

# 测试函数
if __name__ == "__main__":
    # 示例参数
    test_parameters = {
        'variable_type': 'temperature',  # 可选: temperature, salinity, sea_surface_height
        'depth': 10,  # 深度 (m)
        'create_profile': True,  # 是否创建深度剖面
        'profile_lon': 120.0,  # 剖面经度
        'profile_lat': 30.0,   # 剖面纬度
        
        # 区域边界框参数（可选）
        'bbox_lon_min': 100.0,  # 最小经度
        'bbox_lat_min': 10.0,   # 最小纬度  
        'bbox_lon_max': 140.0,  # 最大经度
        'bbox_lat_max': 50.0,   # 最大纬度
        'create_regional_analysis': True  # 是否创建区域分析
    }
    
    print("海洋数据可视化算法测试")
    print("支持的变量类型:")
    print("- temperature: 海洋温度")
    print("- salinity: 海洋盐度") 
    print("- sea_surface_height: 海表面高度")
    print("\n支持的新功能:")
    print("- 按照经纬度矩形区域进行数据可视化")
    print("- 区域数据统计分析（时间序列、分布直方图、经纬向剖面）")
    print("- 区域边界框可视化（红色矩形框标识）")
    print("\n区域参数说明:")
    print("- bbox_lon_min/max: 经度范围 (°E)")
    print("- bbox_lat_min/max: 纬度范围 (°N)")
    print("- create_regional_analysis: 是否生成区域分析图表")
    print(f"\n示例参数: {test_parameters}")
    
    print("\n使用示例:")
    print("1. 全球可视化: 不设置bbox参数")
    print("2. 区域可视化: 设置bbox_lon_min, bbox_lat_min, bbox_lon_max, bbox_lat_max")
    print("3. 区域分析: 设置区域参数并启用create_regional_analysis")