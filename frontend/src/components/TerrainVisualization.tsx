import React, { useState } from 'react'
import {
  Mountain,
  Map,
  BarChart3,
  Download,
  Settings,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Grid,
  Layers,
  Eye,
  Maximize,
  Info,
  Palette,
  Target,
  Sliders
} from 'lucide-react'

interface TerrainVisualizationProps {
  inversionData: {
    region: string
    model: string
    resolution: string
    dataSource: string
    timestamp: string
    statistics: {
      minDepth: number
      maxDepth: number
      avgDepth: number
      totalArea: number
      accuracy: number
    }
  }
  onClose: () => void
}

const TerrainVisualization: React.FC<TerrainVisualizationProps> = ({ 
  inversionData, 
  onClose 
}) => {
  const [viewMode, setViewMode] = useState<'3d' | '2d' | 'contour' | 'profile'>('3d')
  const [colormap, setColormap] = useState('bathymetry')
  const [showGrid, setShowGrid] = useState(true)
  const [depthRange, setDepthRange] = useState({ min: -6000, max: 0 })
  const [selectedPoint, setSelectedPoint] = useState<{ x: number, y: number, depth: number } | null>(null)

  // 颜色映射方案
  const colormaps = [
    { value: 'bathymetry', label: '测深配色', description: '蓝色深海到绿色浅海' },
    { value: 'terrain', label: '地形配色', description: '褐色陆地到蓝色海洋' },
    { value: 'viridis', label: 'Viridis', description: '紫色到黄色渐变' },
    { value: 'plasma', label: 'Plasma', description: '紫色到粉色渐变' },
    { value: 'grayscale', label: '灰度', description: '黑白渐变显示' }
  ]

  // 模拟深度数据
  const generateMockDepthData = () => {
    const data = []
    for (let i = 0; i < 50; i++) {
      for (let j = 0; j < 50; j++) {
        const x = i / 50
        const y = j / 50
        // 模拟海底地形：中心深，边缘浅
        const depth = -Math.abs(Math.sin(x * Math.PI * 2) * Math.cos(y * Math.PI * 2) * 3000 + 
                               Math.random() * 500 - 1000)
        data.push({ x: x * 100, y: y * 100, depth })
      }
    }
    return data
  }

  const mockData = generateMockDepthData()

  // 获取深度颜色
  const getDepthColor = (depth: number) => {
    const normalized = Math.abs(depth) / 6000 // 归一化到0-1
    switch (colormap) {
      case 'bathymetry':
        if (normalized < 0.3) return '#000080' // 深蓝
        if (normalized < 0.6) return '#0066CC' // 蓝色
        if (normalized < 0.8) return '#00CCCC' // 青色
        return '#00FF00' // 绿色（浅海）
      case 'terrain':
        if (normalized < 0.3) return '#000080'
        if (normalized < 0.6) return '#4169E1'
        if (normalized < 0.8) return '#87CEEB'
        return '#F0E68C'
      default:
        return `hsl(${240 - normalized * 240}, 70%, 50%)`
    }
  }

  const handleExportData = () => {
    const exportData = {
      metadata: inversionData,
      depthData: mockData,
      settings: { viewMode, colormap, depthRange }
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `terrain_inversion_${inversionData.region}_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handlePointSelect = (x: number, y: number) => {
    // 找到最近的数据点
    const point = mockData.find(p => 
      Math.abs(p.x - x) < 2 && Math.abs(p.y - y) < 2
    )
    if (point) {
      setSelectedPoint(point)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
        </div>
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-7xl sm:w-full">
          {/* 头部 */}
          <div className="bg-white px-6 pt-6 pb-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">地形反演结果可视化</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {inversionData.region} | {inversionData.model} | 分辨率: {inversionData.resolution}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleExportData}
                  className="btn-secondary flex items-center space-x-2"
                >
                  <Download className="h-4 w-4" />
                  <span>导出数据</span>
                </button>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>

          {/* 工具栏 */}
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              {/* 视图模式 */}
              <div className="flex space-x-2">
                <button
                  onClick={() => setViewMode('3d')}
                  className={`px-3 py-1 text-sm rounded ${
                    viewMode === '3d' ? 'bg-ocean-500 text-white' : 'bg-white text-gray-700 border'
                  }`}
                >
                  <Mountain className="h-4 w-4 inline mr-1" />
                  3D视图
                </button>
                <button
                  onClick={() => setViewMode('2d')}
                  className={`px-3 py-1 text-sm rounded ${
                    viewMode === '2d' ? 'bg-ocean-500 text-white' : 'bg-white text-gray-700 border'
                  }`}
                >
                  <Map className="h-4 w-4 inline mr-1" />
                  平面图
                </button>
                <button
                  onClick={() => setViewMode('contour')}
                  className={`px-3 py-1 text-sm rounded ${
                    viewMode === 'contour' ? 'bg-ocean-500 text-white' : 'bg-white text-gray-700 border'
                  }`}
                >
                  <BarChart3 className="h-4 w-4 inline mr-1" />
                  等深线
                </button>
                <button
                  onClick={() => setViewMode('profile')}
                  className={`px-3 py-1 text-sm rounded ${
                    viewMode === 'profile' ? 'bg-ocean-500 text-white' : 'bg-white text-gray-700 border'
                  }`}
                >
                  <Target className="h-4 w-4 inline mr-1" />
                  剖面图
                </button>
              </div>

              {/* 显示设置 */}
              <div className="flex items-center space-x-4">
                <label className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={showGrid}
                    onChange={(e) => setShowGrid(e.target.checked)}
                    className="mr-2"
                  />
                  显示网格
                </label>
                
                <div className="flex items-center space-x-2">
                  <Palette className="h-4 w-4 text-gray-500" />
                  <select
                    value={colormap}
                    onChange={(e) => setColormap(e.target.value)}
                    className="text-sm border rounded px-2 py-1"
                  >
                    {colormaps.map(cm => (
                      <option key={cm.value} value={cm.value}>
                        {cm.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* 主要内容区域 */}
          <div className="bg-white px-6 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* 可视化区域 */}
              <div className="lg:col-span-3">
                <div className="border border-gray-300 rounded-lg h-96 relative bg-gray-100">
                  {viewMode === '3d' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <Mountain className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">3D地形可视化</p>
                        <p className="text-sm text-gray-500">WebGL渲染的海底地形表面</p>
                      </div>
                    </div>
                  )}
                  
                  {viewMode === '2d' && (
                    <div className="absolute inset-0 p-4">
                      <div className="w-full h-full relative">
                        {/* 模拟2D深度图 */}
                        <div className="grid grid-cols-10 gap-0 w-full h-full">
                          {Array.from({ length: 100 }, (_, i) => {
                            const depth = mockData[i * 25]?.depth || -2000
                            return (
                              <div
                                key={i}
                                className="cursor-pointer"
                                style={{ backgroundColor: getDepthColor(depth) }}
                                onClick={() => handlePointSelect(i % 10 * 10, Math.floor(i / 10) * 10)}
                                title={`深度: ${depth.toFixed(1)}m`}
                              />
                            )
                          })}
                        </div>
                        {showGrid && (
                          <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none" />
                        )}
                      </div>
                    </div>
                  )}
                  
                  {viewMode === 'contour' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">等深线图</p>
                        <p className="text-sm text-gray-500">基于深度值生成的等值线</p>
                      </div>
                    </div>
                  )}

                  {viewMode === 'profile' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">地形剖面</p>
                        <p className="text-sm text-gray-500">选择剖面线查看深度变化</p>
                      </div>
                    </div>
                  )}

                  {/* 缩放和旋转控制 */}
                  <div className="absolute top-4 right-4 flex flex-col space-y-2">
                    <button className="p-2 bg-white shadow rounded hover:bg-gray-50">
                      <ZoomIn className="h-4 w-4" />
                    </button>
                    <button className="p-2 bg-white shadow rounded hover:bg-gray-50">
                      <ZoomOut className="h-4 w-4" />
                    </button>
                    <button className="p-2 bg-white shadow rounded hover:bg-gray-50">
                      <RotateCcw className="h-4 w-4" />
                    </button>
                    <button className="p-2 bg-white shadow rounded hover:bg-gray-50">
                      <Maximize className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* 颜色条 */}
                <div className="mt-4 flex items-center space-x-4">
                  <span className="text-sm text-gray-600">深度 (m):</span>
                  <div className="flex-1 h-4 rounded" style={{
                    background: `linear-gradient(to right, ${getDepthColor(-6000)}, ${getDepthColor(-3000)}, ${getDepthColor(-1000)}, ${getDepthColor(0)})`
                  }} />
                  <div className="flex justify-between text-xs text-gray-500 w-64">
                    <span>-6000m</span>
                    <span>-3000m</span>
                    <span>-1000m</span>
                    <span>0m</span>
                  </div>
                </div>
              </div>

              {/* 信息面板 */}
              <div className="space-y-6">
                {/* 反演信息 */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                    <Info className="h-4 w-4 mr-2" />
                    反演信息
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">区域:</span>
                      <span className="font-medium">{inversionData.region}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">模型:</span>
                      <span className="font-medium">{inversionData.model}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">数据源:</span>
                      <span className="font-medium">{inversionData.dataSource}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">分辨率:</span>
                      <span className="font-medium">{inversionData.resolution}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">完成时间:</span>
                      <span className="font-medium">{new Date(inversionData.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* 统计信息 */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">统计信息</h3>
                  <div className="space-y-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {inversionData.statistics.minDepth}m
                      </div>
                      <div className="text-xs text-gray-600">最大深度</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {inversionData.statistics.avgDepth}m
                      </div>
                      <div className="text-xs text-gray-600">平均深度</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {inversionData.statistics.totalArea}km²
                      </div>
                      <div className="text-xs text-gray-600">覆盖面积</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {inversionData.statistics.accuracy}%
                      </div>
                      <div className="text-xs text-gray-600">反演精度</div>
                    </div>
                  </div>
                </div>

                {/* 选中点信息 */}
                {selectedPoint && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-3">选中点信息</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">经度:</span>
                        <span className="font-medium">{selectedPoint.x.toFixed(3)}°</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">纬度:</span>
                        <span className="font-medium">{selectedPoint.y.toFixed(3)}°</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">深度:</span>
                        <span className="font-medium">{selectedPoint.depth.toFixed(1)}m</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 深度范围控制 */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                    <Sliders className="h-4 w-4 mr-2" />
                    深度范围
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">最小深度 (m)</label>
                      <input
                        type="range"
                        min="-6000"
                        max="0"
                        value={depthRange.min}
                        onChange={(e) => setDepthRange(prev => ({ ...prev, min: parseInt(e.target.value) }))}
                        className="w-full"
                      />
                      <span className="text-xs text-gray-500">{depthRange.min}m</span>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">最大深度 (m)</label>
                      <input
                        type="range"
                        min="-6000"
                        max="0"
                        value={depthRange.max}
                        onChange={(e) => setDepthRange(prev => ({ ...prev, max: parseInt(e.target.value) }))}
                        className="w-full"
                      />
                      <span className="text-xs text-gray-500">{depthRange.max}m</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 底部操作栏 */}
          <div className="bg-gray-50 px-6 py-4 flex justify-between">
            <div className="flex items-center space-x-4">
              <button className="btn-secondary flex items-center space-x-2">
                <Settings className="h-4 w-4" />
                <span>高级设置</span>
              </button>
              <button className="btn-secondary flex items-center space-x-2">
                <Eye className="h-4 w-4" />
                <span>生成报告</span>
              </button>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleExportData}
                className="btn-primary flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>导出结果</span>
              </button>
              <button
                onClick={onClose}
                className="btn-secondary"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TerrainVisualization