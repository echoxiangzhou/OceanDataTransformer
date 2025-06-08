#!/usr/bin/env python3
"""
测试算法源代码更新功能
"""

import asyncio
import httpx
import json

BASE_URL = "http://localhost:8000/api/v1"

async def test_algorithm_source_update():
    """测试算法源代码更新"""
    async with httpx.AsyncClient() as client:
        # 1. 首先获取算法列表
        print("🔍 获取算法列表...")
        response = await client.get(f"{BASE_URL}/algorithms")
        if response.status_code != 200:
            print(f"❌ 获取算法列表失败: {response.status_code}")
            return
        
        algorithms = response.json().get("data", [])
        if not algorithms:
            print("❌ 没有找到任何算法")
            return
        
        algorithm_id = algorithms[0]["id"]
        print(f"✅ 找到算法ID: {algorithm_id}")
        
        # 2. 获取当前源代码
        print(f"📄 获取算法 {algorithm_id} 的当前源代码...")
        response = await client.get(f"{BASE_URL}/algorithms/{algorithm_id}/source")
        if response.status_code == 200:
            current_source = response.json().get("data", "")
            print(f"✅ 当前源代码长度: {len(current_source)} 字符")
        else:
            print(f"⚠️  无法获取当前源代码: {response.status_code}")
            current_source = ""
        
        # 3. 测试源代码更新（通过专用端点）
        new_source_code = '''
import numpy as np
import matplotlib.pyplot as plt

def ocean_data_analysis(data):
    """
    海洋数据分析函数 - 更新版本
    
    Args:
        data: 输入的海洋数据
    
    Returns:
        dict: 分析结果
    """
    print("正在进行海洋数据分析...")
    
    # 模拟数据处理
    result = {
        "mean_temperature": np.mean(data.get("temperature", [])),
        "max_depth": np.max(data.get("depth", [])),
        "analysis_timestamp": "2024-01-01T12:00:00Z",
        "version": "2.0.0"
    }
    
    print("分析完成！")
    return result

if __name__ == "__main__":
    sample_data = {
        "temperature": [15.2, 16.8, 14.5, 17.1],
        "depth": [10, 20, 30, 40]
    }
    result = ocean_data_analysis(sample_data)
    print(f"分析结果: {result}")
'''
        
        print(f"🔄 通过专用端点更新算法 {algorithm_id} 的源代码...")
        response = await client.put(
            f"{BASE_URL}/algorithms/{algorithm_id}/source",
            data={"source_code": new_source_code}
        )
        
        if response.status_code == 200:
            print("✅ 源代码更新成功（专用端点）")
        else:
            print(f"❌ 源代码更新失败（专用端点）: {response.status_code} - {response.text}")
        
        # 4. 测试源代码更新（通过通用更新端点）
        print(f"🔄 通过通用端点更新算法 {algorithm_id} 的源代码...")
        
        update_data = {
            "source_code": new_source_code,
            "version": "2.0.1"
        }
        
        response = await client.put(
            f"{BASE_URL}/algorithms/{algorithm_id}",
            json=update_data
        )
        
        if response.status_code == 200:
            print("✅ 源代码更新成功（通用端点）")
            updated_algorithm = response.json().get("data")
            print(f"   - 新版本: {updated_algorithm.get('version')}")
            print(f"   - 源代码已包含: {'source_code' in updated_algorithm}")
        else:
            print(f"❌ 源代码更新失败（通用端点）: {response.status_code} - {response.text}")
        
        # 5. 验证更新后的源代码
        print(f"🔍 验证更新后的源代码...")
        response = await client.get(f"{BASE_URL}/algorithms/{algorithm_id}/source")
        if response.status_code == 200:
            updated_source = response.json().get("data", "")
            print(f"✅ 更新后源代码长度: {len(updated_source)} 字符")
            if "更新版本" in updated_source:
                print("✅ 源代码内容验证成功")
            else:
                print("⚠️  源代码内容可能未正确更新")
        else:
            print(f"❌ 获取更新后源代码失败: {response.status_code}")

if __name__ == "__main__":
    print("🧪 开始测试算法源代码更新功能...")
    asyncio.run(test_algorithm_source_update())
    print("🏁 测试完成")