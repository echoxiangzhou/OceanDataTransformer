import React, { useState } from 'react'
import { 
  RefreshCw, 
  FileText, 
  Database, 
  Upload,
  Download,
  Settings,
  Play,
  CheckCircle,
  Clock,
  AlertTriangle
} from 'lucide-react'

const DataTransform: React.FC = () => {
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [transformConfig, setTransformConfig] = useState({
    sourceFormat: 'netcdf',
    targetFormat: 'mysql',
    outputPath: '/data/processed/',
    qualityControl: true,
    compression: 'gzip'
  })

  const supportedFormats = {
    input: [
      { value: 'netcdf', label: 'NetCDF', desc: '网络通用数据格式' },
      { value: 'grib', label: 'GRIB', desc: '气象数据格式' },
      { value: 'hdf', label: 'HDF', desc: '分层数据格式' },
      { value: 'csv', label: 'CSV', desc: '逗号分隔值' },
      { value: 'tiff', label: 'TIFF', desc: '标记图像文件格式' },
      { value: 'binary', label: 'Binary', desc: '二进制文件' }
    ],
    output: [
      { value: 'mysql', label: 'MySQL', desc: 'MySQL数据库' },
      { value: 'postgresql', label: 'PostgreSQL', desc: 'PostgreSQL数据库' },
      { value: 'netcdf', label: 'NetCDF', desc: '标准NetCDF格式' },
      { value: 'csv', label: 'CSV', desc: '逗号分隔值' },
      { value: 'json', label: 'JSON', desc: 'JavaScript对象表示法' }
    ]
  }

  const transformTasks = [
    {
      id: 1,
      name: 'NOAA温度数据转换',
      sourceFormat: 'NetCDF',
      targetFormat: 'MySQL',
      fileCount: 156,
      progress: 78,
      status: '处理中',
      startTime: '2024-01-15 13:45',
      estimatedTime: '15分钟'
    },
    {
      id: 2,
      name: 'ARGO盐度数据转换',
      sourceFormat: 'CSV',
      targetFormat: 'PostgreSQL',
      fileCount: 89,
      progress: 100,
      status: '已完成',
      startTime: '2024-01-15 12:20',
      estimatedTime: '完成'
    },
    {
      id: 3,
      name: '卫星影像数据转换',
      sourceFormat: 'TIFF',
      targetFormat: 'NetCDF',
      fileCount: 45,
      progress: 0,
      status: '队列中',
      startTime: '待开始',
      estimatedTime: '30分钟'
    }
  ]

  const dataQualityMetrics = [
    { name: '数据完整性', value: '98.5%', status: 'good' },
    { name: '数据一致性', value: '95.2%', status: 'good' },
    { name: '时间连续性', value: '87.3%', status: 'warning' },
    { name: '空间覆盖度', value: '92.1%', status: 'good' }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case '处理中': return 'text-blue-600 bg-blue-100'
      case '已完成': return 'text-green-600 bg-green-100'
      case '队列中': return 'text-yellow-600 bg-yellow-100'
      case '出错': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getMetricColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600'
      case 'warning': return 'text-yellow-600'
      case 'error': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">数据标准转换处理</h1>
          <p className="text-gray-600 mt-1">海洋环境数据格式标准化转换和存储</p>
        </div>
        <button className="btn-primary flex items-center space-x-2">
          <Upload className="h-4 w-4" />
          <span>选择文件</span>
        </button>
      </div>

      {/* 转换配置 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">转换配置</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">源格式</label>
                <select
                  value={transformConfig.sourceFormat}
                  onChange={(e) => setTransformConfig({...transformConfig, sourceFormat: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                >
                  {supportedFormats.input.map((format) => (
                    <option key={format.value} value={format.value}>
                      {format.label} - {format.desc}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">目标格式</label>
                <select
                  value={transformConfig.targetFormat}
                  onChange={(e) => setTransformConfig({...transformConfig, targetFormat: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                >
                  {supportedFormats.output.map((format) => (
                    <option key={format.value} value={format.value}>
                      {format.label} - {format.desc}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">输出路径</label>
              <input
                type="text"
                value={transformConfig.outputPath}
                onChange={(e) => setTransformConfig({...transformConfig, outputPath: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={transformConfig.qualityControl}
                  onChange={(e) => setTransformConfig({...transformConfig, qualityControl: e.target.checked})}
                  className="h-4 w-4 text-ocean-600 focus:ring-ocean-500 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-700">数据质量控制</label>
              </div>
              <div>
                <select
                  value={transformConfig.compression}
                  onChange={(e) => setTransformConfig({...transformConfig, compression: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                >
                  <option value="none">无压缩</option>
                  <option value="gzip">GZIP压缩</option>
                  <option value="lz4">LZ4压缩</option>
                  <option value="zstd">ZSTD压缩</option>
                </select>
              </div>
            </div>

            <button className="w-full btn-primary flex items-center justify-center space-x-2">
              <Play className="h-4 w-4" />
              <span>开始转换</span>
            </button>
          </div>
        </div>

        {/* 数据质量监控 */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">数据质量监控</h2>
          <div className="space-y-4">
            {dataQualityMetrics.map((metric, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{metric.name}</span>
                <div className="flex items-center space-x-2">
                  <span className={`text-sm font-medium ${getMetricColor(metric.status)}`}>
                    {metric.value}
                  </span>
                  {metric.status === 'good' && <CheckCircle className="h-4 w-4 text-green-500" />}
                  {metric.status === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-2">处理统计</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">2,456</div>
                <div className="text-gray-600">已处理文件</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">45.2GB</div>
                <div className="text-gray-600">处理数据量</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 转换任务列表 */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">转换任务</h2>
          <span className="text-sm text-gray-500">共 {transformTasks.length} 个任务</span>
        </div>
        
        <div className="space-y-4">
          {transformTasks.map((task) => (
            <div key={task.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="font-medium text-gray-900">{task.name}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(task.status)}`}>
                      {task.status}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                    <div className="flex items-center space-x-2">
                      <RefreshCw className="h-4 w-4" />
                      <span>{task.sourceFormat} → {task.targetFormat}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4" />
                      <span>{task.fileCount} 个文件</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span>{task.startTime}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span>预计: {task.estimatedTime}</span>
                    </div>
                  </div>

                  {/* 进度条 */}
                  {task.status === '处理中' && (
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-600">处理进度</span>
                        <span className="text-gray-900 font-medium">{task.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full bg-blue-500"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 操作按钮 */}
                <div className="flex items-center space-x-2 ml-4">
                  <button className="p-2 text-gray-500 hover:text-gray-700 rounded">
                    <Settings className="h-4 w-4" />
                  </button>
                  <button className="p-2 text-gray-500 hover:text-gray-700 rounded">
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 支持的转换路径 */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">支持的转换路径</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">科学数据格式</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <div>NetCDF → MySQL/PostgreSQL</div>
              <div>GRIB → NetCDF</div>
              <div>HDF → CSV/JSON</div>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">图像数据格式</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <div>TIFF → NetCDF</div>
              <div>Binary → TIFF</div>
              <div>多波段 → 单波段</div>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">文本数据格式</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <div>CSV → MySQL/PostgreSQL</div>
              <div>TXT → NetCDF</div>
              <div>JSON → 关系数据库</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DataTransform 