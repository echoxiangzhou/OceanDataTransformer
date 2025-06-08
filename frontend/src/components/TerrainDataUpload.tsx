import React, { useState, useRef } from 'react'
import {
  Upload,
  FileText,
  MapPin,
  Database,
  AlertCircle,
  CheckCircle,
  X,
  Info,
  Download
} from 'lucide-react'

interface TerrainDataUploadProps {
  onClose: () => void
  onUpload: (data: any) => void
}

interface UploadedFile {
  name: string
  size: number
  type: string
  dataType: 'gravity' | 'bathymetry' | 'multibeam' | 'satellite'
  status: 'pending' | 'validating' | 'valid' | 'invalid'
  error?: string
  metadata?: {
    rows?: number
    columns?: number
    resolution?: string
    region?: string
    minDepth?: number
    maxDepth?: number
  }
}

const TerrainDataUpload: React.FC<TerrainDataUploadProps> = ({ onClose, onUpload }) => {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [region, setRegion] = useState({
    name: '',
    northLat: '',
    southLat: '',
    eastLon: '',
    westLon: ''
  })
  const [dataConfig, setDataConfig] = useState({
    coordinateSystem: 'WGS84',
    depthUnit: 'meter',
    gravityUnit: 'mGal',
    interpolationMethod: 'kriging'
  })
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 支持的文件格式
  const supportedFormats = {
    gravity: ['.grd', '.nc', '.csv', '.txt', '.xyz'],
    bathymetry: ['.grd', '.nc', '.tif', '.asc', '.xyz'],
    multibeam: ['.mb', '.all', '.gsf', '.xyz'],
    satellite: ['.nc', '.hdf', '.tif']
  }

  // 处理文件上传
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = Array.from(e.target.files || [])
    
    const newFiles: UploadedFile[] = uploadedFiles.map(file => ({
      name: file.name,
      size: file.size,
      type: file.type,
      dataType: detectDataType(file.name),
      status: 'pending'
    }))

    setFiles(prev => [...prev, ...newFiles])
    
    // 模拟文件验证
    newFiles.forEach((file, index) => {
      setTimeout(() => {
        validateFile(files.length + index)
      }, 1000 * (index + 1))
    })
  }

  // 检测数据类型
  const detectDataType = (filename: string): UploadedFile['dataType'] => {
    const lower = filename.toLowerCase()
    if (lower.includes('gravity') || lower.includes('grav')) return 'gravity'
    if (lower.includes('bathymetry') || lower.includes('bath')) return 'bathymetry'
    if (lower.includes('multibeam') || lower.includes('mb')) return 'multibeam'
    if (lower.includes('satellite') || lower.includes('sat')) return 'satellite'
    return 'gravity' // 默认
  }

  // 验证文件
  const validateFile = (index: number) => {
    setFiles(prev => {
      const updated = [...prev]
      updated[index] = {
        ...updated[index],
        status: 'validating'
      }
      return updated
    })

    // 模拟验证过程
    setTimeout(() => {
      const isValid = Math.random() > 0.2 // 80% 成功率
      
      setFiles(prev => {
        const updated = [...prev]
        updated[index] = {
          ...updated[index],
          status: isValid ? 'valid' : 'invalid',
          error: isValid ? undefined : '文件格式不正确或数据损坏',
          metadata: isValid ? {
            rows: Math.floor(Math.random() * 1000) + 500,
            columns: Math.floor(Math.random() * 1000) + 500,
            resolution: ['100m', '500m', '1km'][Math.floor(Math.random() * 3)],
            region: '南海海盆',
            minDepth: -6000,
            maxDepth: -100
          } : undefined
        }
        return updated
      })
    }, 2000)
  }

  // 移除文件
  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  // 获取文件状态颜色
  const getFileStatusColor = (status: UploadedFile['status']) => {
    switch (status) {
      case 'pending': return 'text-gray-500'
      case 'validating': return 'text-blue-500'
      case 'valid': return 'text-green-500'
      case 'invalid': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  // 获取文件状态图标
  const getFileStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'pending': return <Database className="h-5 w-5" />
      case 'validating': return <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500" />
      case 'valid': return <CheckCircle className="h-5 w-5" />
      case 'invalid': return <AlertCircle className="h-5 w-5" />
      default: return <Database className="h-5 w-5" />
    }
  }

  // 获取数据类型标签颜色
  const getDataTypeColor = (type: UploadedFile['dataType']) => {
    switch (type) {
      case 'gravity': return 'bg-purple-100 text-purple-800'
      case 'bathymetry': return 'bg-blue-100 text-blue-800'
      case 'multibeam': return 'bg-green-100 text-green-800'
      case 'satellite': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // 提交数据
  const handleSubmit = () => {
    const validFiles = files.filter(f => f.status === 'valid')
    if (validFiles.length === 0) {
      alert('请上传有效的数据文件')
      return
    }

    if (!region.name || !region.northLat || !region.southLat || !region.eastLon || !region.westLon) {
      alert('请填写完整的区域信息')
      return
    }

    setUploading(true)
    
    // 模拟上传过程
    setTimeout(() => {
      const uploadData = {
        files: validFiles,
        region,
        config: dataConfig,
        timestamp: new Date().toISOString()
      }
      
      onUpload(uploadData)
      setUploading(false)
      alert('数据上传成功！')
      onClose()
    }, 2000)
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
        </div>
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* 头部 */}
          <div className="bg-white px-6 pt-6 pb-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">上传地形反演数据</h2>
                <p className="text-sm text-gray-600 mt-1">支持重力异常、测深、多波束等多种数据格式</p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
                disabled={uploading}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* 内容区域 */}
          <div className="bg-white px-6 py-6 max-h-[70vh] overflow-y-auto">
            <div className="space-y-6">
              {/* 文件上传区域 */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">数据文件</h3>
                
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-ocean-400 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600 mb-2">点击或拖放文件到此处</p>
                  <p className="text-xs text-gray-500">
                    支持格式: {Object.values(supportedFormats).flat().join(', ')}
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={Object.values(supportedFormats).flat().join(',')}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                {/* 上传的文件列表 */}
                {files.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {files.map((file, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <div className={getFileStatusColor(file.status)}>
                              {getFileStatusIcon(file.status)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-gray-900">{file.name}</span>
                                <span className={`px-2 py-0.5 text-xs rounded-full ${getDataTypeColor(file.dataType)}`}>
                                  {file.dataType}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {(file.size / 1024 / 1024).toFixed(2)} MB
                                </span>
                              </div>
                              {file.error && (
                                <p className="text-sm text-red-500 mt-1">{file.error}</p>
                              )}
                              {file.metadata && (
                                <div className="text-xs text-gray-600 mt-1 grid grid-cols-3 gap-2">
                                  <span>行列: {file.metadata.rows}×{file.metadata.columns}</span>
                                  <span>分辨率: {file.metadata.resolution}</span>
                                  <span>深度: {file.metadata.minDepth}~{file.metadata.maxDepth}m</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => removeFile(index)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 区域配置 */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  研究区域
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      区域名称 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={region.name}
                      onChange={(e) => setRegion({ ...region, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                      placeholder="例如: 南海海盆"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      北纬边界 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={region.northLat}
                      onChange={(e) => setRegion({ ...region, northLat: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                      placeholder="25.0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      南纬边界 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={region.southLat}
                      onChange={(e) => setRegion({ ...region, southLat: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                      placeholder="5.0"
                    />
                  </div>
                  <div></div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      东经边界 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={region.eastLon}
                      onChange={(e) => setRegion({ ...region, eastLon: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                      placeholder="120.0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      西经边界 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={region.westLon}
                      onChange={(e) => setRegion({ ...region, westLon: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                      placeholder="110.0"
                    />
                  </div>
                </div>
              </div>

              {/* 数据配置 */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">数据配置</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      坐标系统
                    </label>
                    <select
                      value={dataConfig.coordinateSystem}
                      onChange={(e) => setDataConfig({ ...dataConfig, coordinateSystem: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                    >
                      <option value="WGS84">WGS84</option>
                      <option value="GCJ02">GCJ02</option>
                      <option value="BD09">BD09</option>
                      <option value="UTM">UTM</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      深度单位
                    </label>
                    <select
                      value={dataConfig.depthUnit}
                      onChange={(e) => setDataConfig({ ...dataConfig, depthUnit: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                    >
                      <option value="meter">米 (m)</option>
                      <option value="feet">英尺 (ft)</option>
                      <option value="fathom">英寻 (fm)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      重力单位
                    </label>
                    <select
                      value={dataConfig.gravityUnit}
                      onChange={(e) => setDataConfig({ ...dataConfig, gravityUnit: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                    >
                      <option value="mGal">毫伽 (mGal)</option>
                      <option value="μGal">微伽 (μGal)</option>
                      <option value="gu">重力单位 (g.u.)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      插值方法
                    </label>
                    <select
                      value={dataConfig.interpolationMethod}
                      onChange={(e) => setDataConfig({ ...dataConfig, interpolationMethod: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                    >
                      <option value="kriging">克里金插值</option>
                      <option value="idw">反距离权重</option>
                      <option value="spline">样条函数</option>
                      <option value="natural">自然邻近</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 数据格式说明 */}
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-start">
                  <Info className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900 mb-2">数据格式要求</p>
                    <ul className="text-blue-800 space-y-1">
                      <li>• 重力数据: 包含经度、纬度、重力异常值的网格或点数据</li>
                      <li>• 测深数据: 包含位置和深度信息的测量数据</li>
                      <li>• 多波束数据: 标准格式的多波束测深文件</li>
                      <li>• 卫星数据: 包含测高或重力场的卫星观测数据</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 底部按钮 */}
          <div className="bg-gray-50 px-6 py-4 flex justify-between">
            <div className="flex items-center text-sm text-gray-500">
              <Database className="h-4 w-4 mr-1" />
              <span>已选择 {files.filter(f => f.status === 'valid').length} 个有效文件</span>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                disabled={uploading}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={uploading || files.filter(f => f.status === 'valid').length === 0}
                className="px-4 py-2 bg-ocean-500 text-white rounded-lg hover:bg-ocean-600 disabled:opacity-50 flex items-center space-x-2"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>上传中...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    <span>上传数据</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TerrainDataUpload