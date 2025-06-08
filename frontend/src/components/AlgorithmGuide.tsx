import React, { useState } from 'react'
import {
  BookOpen,
  Code,
  Upload,
  Settings,
  Play,
  Download,
  Eye,
  Package,
  Container,
  FileText,
  Image,
  ChevronRight,
  ChevronDown,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react'

const AlgorithmGuide: React.FC = () => {
  const [expandedSection, setExpandedSection] = useState<string | null>('upload')

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section)
  }

  const GuideSection = ({ 
    id, 
    title, 
    icon: Icon, 
    children 
  }: { 
    id: string
    title: string
    icon: React.ComponentType<any>
    children: React.ReactNode 
  }) => (
    <div className="border border-gray-200 rounded-lg">
      <button
        onClick={() => toggleSection(id)}
        className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50"
      >
        <div className="flex items-center">
          <Icon className="h-5 w-5 text-ocean-500 mr-3" />
          <span className="font-medium text-gray-900">{title}</span>
        </div>
        {expandedSection === id ? (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-500" />
        )}
      </button>
      {expandedSection === id && (
        <div className="px-4 pb-4 border-t border-gray-100">
          {children}
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-ocean-500 to-blue-600 rounded-lg p-6 text-white">
        <div className="flex items-center mb-4">
          <BookOpen className="h-8 w-8 mr-3" />
          <h1 className="text-2xl font-bold">海洋算法库使用指南</h1>
        </div>
        <p className="text-ocean-100">
          完整的算法上传、管理、执行和结果下载指南
        </p>
      </div>

      <div className="space-y-4">
        <GuideSection id="upload" title="1. 算法上传" icon={Upload}>
          <div className="space-y-4 mt-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">支持的代码文件格式</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-blue-800">Python (.py)</p>
                  <ul className="text-blue-700 mt-1 space-y-1">
                    <li>• 单个Python文件</li>
                    <li>• ZIP压缩包（包含多个.py文件）</li>
                    <li>• 需要包含run()函数作为入口</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-blue-800">其他格式</p>
                  <ul className="text-blue-700 mt-1 space-y-1">
                    <li>• R脚本 (.r, .R)</li>
                    <li>• MATLAB文件 (.m)</li>
                    <li>• 项目压缩包 (.zip)</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-2">依赖包管理</h4>
              <div className="space-y-2 text-sm text-green-800">
                <p><strong>Python:</strong> 上传 requirements.txt 文件</p>
                <div className="bg-green-100 rounded p-2 font-mono text-xs">
                  numpy&gt;=1.21.0<br/>
                  matplotlib&gt;=3.5.0<br/>
                  xarray&gt;=0.20.0<br/>
                  cartopy&gt;=0.20.0<br/>
                  netCDF4&gt;=1.5.8
                </div>
                <p><strong>R:</strong> 在代码中使用 install.packages()</p>
                <p><strong>MATLAB:</strong> 系统已预装常用工具箱</p>
              </div>
            </div>

            <div className="bg-yellow-50 rounded-lg p-4">
              <h4 className="font-medium text-yellow-900 mb-2">算法参数配置</h4>
              <div className="space-y-2 text-sm text-yellow-800">
                <p>为算法定义可配置的参数，支持以下类型：</p>
                <ul className="space-y-1">
                  <li>• <strong>字符串:</strong> 文本输入 (如变量名称)</li>
                  <li>• <strong>数值:</strong> 数字输入 (如深度值)</li>
                  <li>• <strong>布尔值:</strong> 开关选项 (如是否创建剖面)</li>
                  <li>• <strong>选择项:</strong> 下拉菜单 (如颜色方案)</li>
                  <li>• <strong>文件:</strong> 文件上传 (如配置文件)</li>
                </ul>
              </div>
            </div>
          </div>
        </GuideSection>

        <GuideSection id="execute" title="2. 算法执行" icon={Play}>
          <div className="space-y-4 mt-4">
            <div className="bg-purple-50 rounded-lg p-4">
              <h4 className="font-medium text-purple-900 mb-2">输入数据准备</h4>
              <div className="space-y-2 text-sm text-purple-800">
                <p>支持的数据格式：</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="font-medium">海洋数据格式</p>
                    <ul className="space-y-1">
                      <li>• NetCDF (.nc)</li>
                      <li>• HDF5 (.h5, .hdf5)</li>
                      <li>• GRIB (.grib, .grib2)</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium">通用格式</p>
                    <ul className="space-y-1">
                      <li>• CSV (.csv)</li>
                      <li>• JSON (.json)</li>
                      <li>• TIFF (.tiff, .tif)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-indigo-50 rounded-lg p-4">
              <h4 className="font-medium text-indigo-900 mb-2">执行流程</h4>
              <div className="space-y-3 text-sm text-indigo-800">
                <div className="flex items-start">
                  <div className="w-6 h-6 bg-indigo-200 text-indigo-800 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">1</div>
                  <div>
                    <p className="font-medium">上传输入数据</p>
                    <p className="text-indigo-700">选择或拖拽数据文件到上传区域</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-6 h-6 bg-indigo-200 text-indigo-800 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">2</div>
                  <div>
                    <p className="font-medium">配置算法参数</p>
                    <p className="text-indigo-700">根据算法需求设置相应参数</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-6 h-6 bg-indigo-200 text-indigo-800 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">3</div>
                  <div>
                    <p className="font-medium">监控执行进度</p>
                    <p className="text-indigo-700">实时查看执行日志和进度条</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-6 h-6 bg-indigo-200 text-indigo-800 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">4</div>
                  <div>
                    <p className="font-medium">查看和下载结果</p>
                    <p className="text-indigo-700">预览生成的可视化图片并下载</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </GuideSection>

        <GuideSection id="preview" title="3. 结果预览" icon={Eye}>
          <div className="space-y-4 mt-4">
            <div className="bg-green-50 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-2">可视化预览功能</h4>
              <div className="space-y-2 text-sm text-green-800">
                <p>系统支持多种可视化结果的在线预览：</p>
                <ul className="space-y-1">
                  <li>• <strong>图片预览:</strong> PNG, JPG, SVG 格式图片</li>
                  <li>• <strong>交互式图表:</strong> HTML 格式的交互式可视化</li>
                  <li>• <strong>动画预览:</strong> GIF, MP4 格式的动画</li>
                  <li>• <strong>缩放功能:</strong> 支持图片放大和适应窗口</li>
                </ul>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">预览操作</h4>
              <div className="grid grid-cols-2 gap-4 text-sm text-blue-800">
                <div>
                  <p className="font-medium mb-1">快捷操作</p>
                  <ul className="space-y-1">
                    <li>• 点击文件名快速预览</li>
                    <li>• 双击图片全屏查看</li>
                    <li>• 右键菜单快速下载</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium mb-1">视图控制</p>
                  <ul className="space-y-1">
                    <li>• 适应窗口/实际大小切换</li>
                    <li>• 鼠标滚轮缩放</li>
                    <li>• 拖拽移动大图</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </GuideSection>

        <GuideSection id="download" title="4. 结果下载" icon={Download}>
          <div className="space-y-4 mt-4">
            <div className="bg-orange-50 rounded-lg p-4">
              <h4 className="font-medium text-orange-900 mb-2">下载方式</h4>
              <div className="space-y-3 text-sm text-orange-800">
                <div>
                  <p className="font-medium">单文件下载</p>
                  <p>点击每个文件旁的下载按钮，直接下载单个结果文件</p>
                </div>
                <div>
                  <p className="font-medium">批量下载</p>
                  <p>点击"下载全部"按钮，系统会将所有结果文件打包为ZIP下载</p>
                </div>
                <div>
                  <p className="font-medium">历史结果</p>
                  <p>在"执行任务"页面可以下载之前的执行结果</p>
                </div>
              </div>
            </div>

            <div className="bg-red-50 rounded-lg p-4">
              <h4 className="font-medium text-red-900 mb-2">下载格式说明</h4>
              <div className="space-y-2 text-sm text-red-800">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="font-medium">图片格式</p>
                    <ul className="space-y-1">
                      <li>• PNG: 高质量无损图片</li>
                      <li>• JPG: 压缩图片格式</li>
                      <li>• SVG: 矢量图格式</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium">数据格式</p>
                    <ul className="space-y-1">
                      <li>• NetCDF: 处理后的数据</li>
                      <li>• CSV: 表格数据</li>
                      <li>• JSON: 结构化数据</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </GuideSection>

        <GuideSection id="docker" title="5. Docker 容器化" icon={Container}>
          <div className="space-y-4 mt-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">自动容器化</h4>
              <div className="space-y-2 text-sm text-gray-700">
                <p>当您上传算法时启用"自动容器化"选项，系统将：</p>
                <ul className="space-y-1 ml-4">
                  <li>• 分析您的代码和依赖</li>
                  <li>• 自动生成Dockerfile</li>
                  <li>• 构建Docker镜像</li>
                  <li>• 设置算法状态为"就绪"</li>
                </ul>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">容器化优势</h4>
              <div className="grid grid-cols-2 gap-4 text-sm text-blue-800">
                <div>
                  <p className="font-medium mb-1">环境隔离</p>
                  <ul className="space-y-1">
                    <li>• 独立的运行环境</li>
                    <li>• 避免依赖冲突</li>
                    <li>• 版本一致性保证</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium mb-1">资源管理</p>
                  <ul className="space-y-1">
                    <li>• CPU和内存限制</li>
                    <li>• 执行时间控制</li>
                    <li>• 资源使用监控</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </GuideSection>

        <GuideSection id="example" title="6. 示例算法" icon={Code}>
          <div className="space-y-4 mt-4">
            <div className="bg-green-50 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-2">海洋温度可视化示例</h4>
              <div className="text-sm text-green-800">
                <p className="mb-2">以下是一个完整的Python算法示例：</p>
                <div className="bg-green-100 rounded p-3 font-mono text-xs overflow-x-auto">
                  <div>
                    import numpy as np<br/>
                    import matplotlib.pyplot as plt<br/>
                    import xarray as xr<br/>
                    from pathlib import Path<br/><br/>
                    
                    def run(input_files, output_dir, parameters, output_format='png'):<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;"""<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;算法主函数<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;"""<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;# 获取参数<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;variable_type = parameters.get('variable_type', 'temperature')<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;depth = parameters.get('depth', 0)<br/><br/>
                    
                    &nbsp;&nbsp;&nbsp;&nbsp;# 加载数据<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;for input_file in input_files:<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;ds = xr.open_dataset(input_file)<br/><br/>
                    
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;# 数据处理和可视化<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;# ... 具体实现<br/><br/>
                    
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;# 保存结果<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;output_file = output_dir / f"{'{'}variable_type{'}'}_visualization.{'{'}output_format{'}'}"<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;plt.savefig(output_file, dpi=300, bbox_inches='tight')<br/><br/>
                    
                    &nbsp;&nbsp;&nbsp;&nbsp;print("算法执行完成")<br/><br/>
                    
                    if __name__ == "__main__":<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;# 测试代码<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;pass
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 rounded-lg p-4">
              <h4 className="font-medium text-yellow-900 mb-2">算法开发要求</h4>
              <div className="space-y-2 text-sm text-yellow-800">
                <div className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                  <p>必须包含 <code className="bg-yellow-200 px-1 rounded">run()</code> 函数作为入口点</p>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                  <p>函数参数为 <code className="bg-yellow-200 px-1 rounded">input_files, output_dir, parameters, output_format</code></p>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                  <p>将结果文件保存到 <code className="bg-yellow-200 px-1 rounded">output_dir</code> 目录</p>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                  <p>使用 <code className="bg-yellow-200 px-1 rounded">print()</code> 输出执行日志</p>
                </div>
              </div>
            </div>
          </div>
        </GuideSection>
      </div>

      <div className="bg-gray-50 rounded-lg p-6">
        <div className="flex items-start">
          <Info className="h-6 w-6 text-blue-500 mr-3 mt-0.5" />
          <div>
            <h3 className="font-medium text-gray-900 mb-2">需要帮助？</h3>
            <p className="text-sm text-gray-600 mb-3">
              如果您在使用过程中遇到问题，可以：
            </p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 查看算法执行日志了解错误信息</li>
              <li>• 检查输入数据格式是否正确</li>
              <li>• 确认算法参数配置是否合理</li>
              <li>• 联系技术支持获取帮助</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AlgorithmGuide