import React, { useState } from 'react'
import { 
  BarChart3, 
  Settings, 
  Download,
  Play,
  Layers,
  Map,
  Eye,
  Palette,
  Grid,
  MousePointer,
  Image,
  Globe,
  TrendingUp,
  Mountain
} from 'lucide-react'

const DataVisualization: React.FC = () => {
  const [visualConfig, setVisualConfig] = useState({
    chartType: 'contour',
    colormap: 'ocean',
    projection: 'mercator',
    resolution: 'high',
    showGrid: true,
    showLegend: true
  })

  const [selectedVariable, setSelectedVariable] = useState('temperature')

  const chartTypes = [
    { value: 'contour', label: '等值线图', icon: TrendingUp },
    { value: 'heatmap', label: '热力图', icon: Grid },
    { value: 'vector', label: '矢量场', icon: MousePointer },
    { value: '3d_surface', label: '三维表面', icon: Mountain },
    { value: 'particle', label: '粒子轨迹', icon: Eye },
    { value: 'volume', label: '体绘制', icon: Layers }
  ]

  const variables = [
    { value: 'temperature', label: '海表温度', unit: '°C', range: '[-2, 35]' },
    { value: 'salinity', label: '盐度', unit: 'PSU', range: '[30, 38]' },
    { value: 'current', label: '海流速度', unit: 'm/s', range: '[0, 2.5]' },
    { value: 'depth', label: '水深', unit: 'm', range: '[0, 11000]' },
    { value: 'pressure', label: '海面气压', unit: 'hPa', range: '[980, 1040]' },
    { value: 'wind', label: '风速', unit: 'm/s', range: '[0, 50]' }
  ]

  const colormaps = [
    { value: 'ocean', label: '海洋', preview: 'linear-gradient(to right, #000080, #0066CC, #00CCFF, #66FFCC)' },
    { value: 'thermal', label: '热度', preview: 'linear-gradient(to right, #000080, #800080, #FF0000, #FFFF00)' },
    { value: 'rainbow', label: '彩虹', preview: 'linear-gradient(to right, #FF0000, #FFFF00, #00FF00, #00FFFF, #0000FF, #FF00FF)' },
    { value: 'viridis', label: 'Viridis', preview: 'linear-gradient(to right, #440154, #31688E, #35B779, #FDE725)' }
  ]

  const visualizationTasks = [
    {
      id: 1,
      name: '全球海表温度分布',
      type: '等值线图',
      variable: '海表温度',
      status: '已生成',
      createdAt: '2024-01-15 14:30',
      format: 'PNG, HTML',
      size: '2048×1024'
    },
    {
      id: 2,
      name: '太平洋海流矢量场',
      type: '矢量场',
      variable: '海流速度',
      status: '生成中',
      createdAt: '2024-01-15 14:25',
      format: 'GIF, SVG',
      size: '1920×1080'
    },
    {
      id: 3,
      name: '三维海底地形',
      type: '三维表面',
      variable: '水深',
      status: '队列中',
      createdAt: '待开始',
      format: 'HTML, MP4',
      size: '4096×2048'
    }
  ]

  const interactiveFeatures = [
    { name: '缩放平移', enabled: true },
    { name: '数据查询', enabled: true },
    { name: '图层控制', enabled: false },
    { name: '时间动画', enabled: true },
    { name: '数据导出', enabled: true },
    { name: '标注工具', enabled: false }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case '生成中': return 'text-blue-600 bg-blue-100'
      case '已生成': return 'text-green-600 bg-green-100'
      case '队列中': return 'text-yellow-600 bg-yellow-100'
      case '出错': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">可视化算法集成</h1>
          <p className="text-gray-600 mt-1">多维度海洋环境数据可视化算法集成和交互式分析</p>
        </div>
        <div className="flex space-x-3">
          <button className="btn-secondary flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>高级设置</span>
          </button>
          <button className="btn-primary flex items-center space-x-2">
            <Play className="h-4 w-4" />
            <span>生成可视化</span>
          </button>
        </div>
      </div>

      {/* 可视化配置 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 图表类型选择 */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-blue-500" />
            图表类型
          </h2>
          <div className="space-y-3">
            {chartTypes.map((type) => {
              const Icon = type.icon
              return (
                <label key={type.value} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="chartType"
                    value={type.value}
                    checked={visualConfig.chartType === type.value}
                    onChange={(e) => setVisualConfig({...visualConfig, chartType: e.target.value})}
                    className="h-4 w-4 text-ocean-600 focus:ring-ocean-500"
                  />
                  <Icon className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-700">{type.label}</span>
                </label>
              )
            })}
          </div>
        </div>

        {/* 变量选择 */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Layers className="h-5 w-5 mr-2 text-green-500" />
            数据变量
          </h2>
          <div className="space-y-3">
            <select
              value={selectedVariable}
              onChange={(e) => setSelectedVariable(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
            >
              {variables.map((variable) => (
                <option key={variable.value} value={variable.value}>
                  {variable.label} ({variable.unit})
                </option>
              ))}
            </select>
            
            {/* 选中变量的详细信息 */}
            <div className="bg-gray-50 rounded-lg p-3">
              {variables.map((variable) => {
                if (variable.value === selectedVariable) {
                  return (
                    <div key={variable.value}>
                      <div className="text-sm font-medium text-gray-900">{variable.label}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        单位: {variable.unit}
                      </div>
                      <div className="text-xs text-gray-600">
                        范围: {variable.range}
                      </div>
                    </div>
                  )
                }
                return null
              })}
            </div>
          </div>
        </div>

        {/* 样式配置 */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Palette className="h-5 w-5 mr-2 text-purple-500" />
            样式配置
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">色彩映射</label>
              <div className="space-y-2">
                {colormaps.map((colormap) => (
                  <label key={colormap.value} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="colormap"
                      value={colormap.value}
                      checked={visualConfig.colormap === colormap.value}
                      onChange={(e) => setVisualConfig({...visualConfig, colormap: e.target.value})}
                      className="h-4 w-4 text-ocean-600 focus:ring-ocean-500"
                    />
                    <div className="flex items-center space-x-2 flex-1">
                      <div 
                        className="w-12 h-4 rounded border border-gray-300"
                        style={{ background: colormap.preview }}
                      />
                      <span className="text-sm text-gray-700">{colormap.label}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={visualConfig.showGrid}
                  onChange={(e) => setVisualConfig({...visualConfig, showGrid: e.target.checked})}
                  className="h-4 w-4 text-ocean-600 focus:ring-ocean-500 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-700">显示网格</label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={visualConfig.showLegend}
                  onChange={(e) => setVisualConfig({...visualConfig, showLegend: e.target.checked})}
                  className="h-4 w-4 text-ocean-600 focus:ring-ocean-500 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-700">显示图例</label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 可视化预览区域 */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">可视化预览</h2>
        <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
          <div className="text-center">
            <Globe className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">选择数据和图表类型后，预览将在此显示</p>
            <button className="btn-primary">
              加载数据预览
            </button>
          </div>
        </div>
      </div>

      {/* 交互功能配置 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">交互功能</h2>
          <div className="space-y-3">
            {interactiveFeatures.map((feature, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{feature.name}</span>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    defaultChecked={feature.enabled}
                    className="h-4 w-4 text-ocean-600 focus:ring-ocean-500 border-gray-300 rounded"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">输出设置</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">输出格式</label>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="h-4 w-4 text-ocean-600" />
                  <span className="text-sm">PNG</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="h-4 w-4 text-ocean-600" />
                  <span className="text-sm">HTML</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="h-4 w-4 text-ocean-600" />
                  <span className="text-sm">SVG</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="h-4 w-4 text-ocean-600" />
                  <span className="text-sm">GIF</span>
                </label>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">分辨率</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500">
                <option value="low">低 (1024×768)</option>
                <option value="medium">中 (1920×1080)</option>
                <option value="high" selected>高 (2560×1440)</option>
                <option value="ultra">超高 (4096×2048)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 可视化任务列表 */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">可视化任务</h2>
          <span className="text-sm text-gray-500">共 {visualizationTasks.length} 个任务</span>
        </div>
        
        <div className="space-y-4">
          {visualizationTasks.map((task) => (
            <div key={task.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="font-medium text-gray-900">{task.name}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(task.status)}`}>
                      {task.status}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                      <BarChart3 className="h-4 w-4" />
                      <span>{task.type}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Layers className="h-4 w-4" />
                      <span>{task.variable}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Image className="h-4 w-4" />
                      <span>{task.format}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Grid className="h-4 w-4" />
                      <span>{task.size}</span>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500 mt-2">
                    创建时间: {task.createdAt}
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex items-center space-x-2 ml-4">
                  <button className="p-2 text-gray-500 hover:text-gray-700 rounded">
                    <Eye className="h-4 w-4" />
                  </button>
                  <button className="p-2 text-gray-500 hover:text-gray-700 rounded">
                    <Settings className="h-4 w-4" />
                  </button>
                  {task.status === '已生成' && (
                    <button className="p-2 text-green-500 hover:text-green-700 rounded">
                      <Download className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 可视化技术说明 */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">支持的可视化技术</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">标量场可视化</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• 等值线图和等值面</li>
              <li>• 热力图和色彩映射</li>
              <li>• 三维表面绘制</li>
              <li>• 体绘制技术</li>
            </ul>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <h3 className="font-medium text-green-900 mb-2">矢量场可视化</h3>
            <ul className="text-sm text-green-800 space-y-1">
              <li>• 矢量箭头图</li>
              <li>• 流线和迹线</li>
              <li>• 粒子轨迹动画</li>
              <li>• 矢量场拓扑分析</li>
            </ul>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <h3 className="font-medium text-purple-900 mb-2">多维数据可视化</h3>
            <ul className="text-sm text-purple-800 space-y-1">
              <li>• 多变量组合显示</li>
              <li>• 时间序列动画</li>
              <li>• 交互式数据探索</li>
              <li>• 统计图表集成</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DataVisualization 