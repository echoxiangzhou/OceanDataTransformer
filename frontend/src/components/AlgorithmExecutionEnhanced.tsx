import React, { useState, useRef, useEffect } from 'react'
import {
  Play,
  Upload,
  Settings,
  Download,
  Eye,
  Image,
  FileText,
  X,
  CheckCircle,
  Clock,
  AlertCircle,
  Maximize2,
  ArrowRight,
  ArrowLeft,
  FileInput,
  MapPin,
  Palette,
  Map,
  FileType,
  Variable,
  Link
} from 'lucide-react'
import { Algorithm, AlgorithmParameter } from '../services/algorithmService'

interface AlgorithmExecutionEnhancedProps {
  algorithm: Algorithm
  onClose: () => void
  onExecute: (params: any) => void
}

interface NCVariable {
  name: string
  dimensions: string[]
  shape: number[]
  type: string
  units?: string
  long_name?: string
}

interface VariableMapping {
  algorithmVariable: string
  ncVariable: string
}

const AlgorithmExecutionEnhanced: React.FC<AlgorithmExecutionEnhancedProps> = ({
  algorithm,
  onClose,
  onExecute
}) => {
  const [step, setStep] = useState(1) // 1: 输入数据, 2: 变量映射, 3: 参数配置, 4: 执行监控, 5: 结果预览
  const [inputFiles, setInputFiles] = useState<File[]>([])
  const [ncVariables, setNcVariables] = useState<NCVariable[]>([])
  const [variableMappings, setVariableMappings] = useState<VariableMapping[]>([])
  const [parameters, setParameters] = useState<Record<string, any>>({})
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionProgress, setExecutionProgress] = useState(0)
  const [executionLogs, setExecutionLogs] = useState<string[]>([])
  const [outputFiles, setOutputFiles] = useState<string[]>([])
  const [selectedPreview, setSelectedPreview] = useState<string | null>(null)
  const [uploadingFiles, setUploadingFiles] = useState<boolean>(false)
  const [scanningFile, setScanningFile] = useState<boolean>(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 海洋数据可视化的默认参数
  const oceanVisParams = {
    visualizationElement: {
      name: '可视化要素',
      type: 'select',
      options: ['温度', '盐度', '海表面高度'],
      default: '温度',
      description: '选择要可视化的海洋环境要素'
    },
    colorScheme: {
      name: '色彩方案',
      type: 'select',
      options: ['Rainbow', 'Viridis', 'Coolwarm', 'Ocean', 'Jet', 'Turbo'],
      default: 'Ocean',
      description: '选择可视化的色彩映射方案'
    },
    projection: {
      name: '地图投影',
      type: 'select',
      options: ['墨卡托投影', '等距圆柱投影', '兰伯特投影', '极地投影'],
      default: '墨卡托投影',
      description: '选择地图投影方式'
    },
    outputFormat: {
      name: '输出格式',
      type: 'select',
      options: ['PNG', 'SVG', 'PDF', 'JPEG'],
      default: 'PNG',
      description: '选择输出图像格式'
    },
    depthLevel: {
      name: '深度层级',
      type: 'number',
      default: 0,
      description: '选择要显示的深度层级（米）'
    },
    timeStep: {
      name: '时间步',
      type: 'number',
      default: 0,
      description: '选择要显示的时间步（如果数据包含时间维度）'
    },
    contourLevels: {
      name: '等值线级数',
      type: 'number',
      default: 10,
      description: '设置等值线的数量'
    },
    showGridLines: {
      name: '显示网格线',
      type: 'boolean',
      default: true,
      description: '是否在图上显示经纬度网格线'
    },
    showColorbar: {
      name: '显示色标',
      type: 'boolean',
      default: true,
      description: '是否显示颜色标尺'
    }
  }

  // 需要映射的算法变量
  const requiredVariables = [
    { name: 'temperature', displayName: '温度', required: false },
    { name: 'salinity', displayName: '盐度', required: false },
    { name: 'ssh', displayName: '海表面高度', required: false },
    { name: 'longitude', displayName: '经度', required: true },
    { name: 'latitude', displayName: '纬度', required: true },
    { name: 'time', displayName: '时间', required: false },
    { name: 'depth', displayName: '深度', required: false }
  ]

  // 初始化参数
  useEffect(() => {
    const defaultParams: Record<string, any> = {}
    
    // 如果是海洋数据可视化算法，使用预定义的参数
    if (algorithm.name.includes('海洋环境要素')) {
      Object.entries(oceanVisParams).forEach(([key, param]) => {
        defaultParams[key] = param.default
      })
    } else {
      // 使用算法自带的参数
      algorithm.parameters?.forEach((param: AlgorithmParameter) => {
        if (param.default_value !== undefined) {
          defaultParams[param.name] = param.default_value
        }
      })
    }
    
    setParameters(defaultParams)

    // 初始化变量映射
    const initialMappings = requiredVariables.map(v => ({
      algorithmVariable: v.name,
      ncVariable: ''
    }))
    setVariableMappings(initialMappings)
  }, [algorithm])

  // 模拟扫描NetCDF文件变量
  const scanNCFile = async (file: File) => {
    setScanningFile(true)
    
    // 模拟异步扫描过程
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // 模拟的NetCDF变量（实际应该通过后端API扫描）
    const mockVariables: NCVariable[] = [
      {
        name: 'temp',
        dimensions: ['time', 'depth', 'lat', 'lon'],
        shape: [12, 50, 180, 360],
        type: 'float32',
        units: 'celsius',
        long_name: 'Sea Water Temperature'
      },
      {
        name: 'salt',
        dimensions: ['time', 'depth', 'lat', 'lon'],
        shape: [12, 50, 180, 360],
        type: 'float32',
        units: 'psu',
        long_name: 'Sea Water Salinity'
      },
      {
        name: 'zos',
        dimensions: ['time', 'lat', 'lon'],
        shape: [12, 180, 360],
        type: 'float32',
        units: 'meters',
        long_name: 'Sea Surface Height'
      },
      {
        name: 'lon',
        dimensions: ['lon'],
        shape: [360],
        type: 'float32',
        units: 'degrees_east',
        long_name: 'Longitude'
      },
      {
        name: 'lat',
        dimensions: ['lat'],
        shape: [180],
        type: 'float32',
        units: 'degrees_north',
        long_name: 'Latitude'
      },
      {
        name: 'time',
        dimensions: ['time'],
        shape: [12],
        type: 'float64',
        units: 'days since 1900-01-01',
        long_name: 'Time'
      },
      {
        name: 'depth',
        dimensions: ['depth'],
        shape: [50],
        type: 'float32',
        units: 'meters',
        long_name: 'Depth'
      }
    ]
    
    setNcVariables(mockVariables)
    
    // 尝试自动映射
    const autoMappings = variableMappings.map(mapping => {
      const algVar = mapping.algorithmVariable
      let ncVar = ''
      
      // 自动匹配规则
      if (algVar === 'temperature') {
        ncVar = mockVariables.find(v => v.name === 'temp' || v.name.includes('temperature'))?.name || ''
      } else if (algVar === 'salinity') {
        ncVar = mockVariables.find(v => v.name === 'salt' || v.name.includes('salinity'))?.name || ''
      } else if (algVar === 'ssh') {
        ncVar = mockVariables.find(v => v.name === 'zos' || v.name === 'ssh' || v.long_name?.includes('Height'))?.name || ''
      } else if (algVar === 'longitude') {
        ncVar = mockVariables.find(v => v.name === 'lon' || v.name === 'longitude')?.name || ''
      } else if (algVar === 'latitude') {
        ncVar = mockVariables.find(v => v.name === 'lat' || v.name === 'latitude')?.name || ''
      } else if (algVar === 'time') {
        ncVar = mockVariables.find(v => v.name === 'time')?.name || ''
      } else if (algVar === 'depth') {
        ncVar = mockVariables.find(v => v.name === 'depth' || v.name === 'lev')?.name || ''
      }
      
      return {
        ...mapping,
        ncVariable: ncVar
      }
    })
    
    setVariableMappings(autoMappings)
    setScanningFile(false)
  }

  // 处理文件上传
  const handleFileUpload = async (files: FileList) => {
    if (!files || files.length === 0) return
    
    setUploadingFiles(true)
    
    const validFiles = Array.from(files).filter(file => {
      const ext = file.name.toLowerCase().split('.').pop()
      return ['nc', 'nc4', 'netcdf'].includes(ext || '')
    })
    
    if (validFiles.length === 0) {
      alert('请上传NetCDF格式文件（.nc, .nc4, .netcdf）')
      setUploadingFiles(false)
      return
    }
    
    setInputFiles(prev => [...prev, ...validFiles])
    
    // 扫描第一个文件的变量
    if (validFiles.length > 0) {
      await scanNCFile(validFiles[0])
    }
    
    setUploadingFiles(false)
  }

  // 更新变量映射
  const updateVariableMapping = (algorithmVar: string, ncVar: string) => {
    setVariableMappings(prev => 
      prev.map(mapping => 
        mapping.algorithmVariable === algorithmVar 
          ? { ...mapping, ncVariable: ncVar }
          : mapping
      )
    )
  }

  // 更新参数
  const updateParameter = (name: string, value: any) => {
    setParameters(prev => ({ ...prev, [name]: value }))
  }

  // 验证是否可以进入下一步
  const canProceedToNext = () => {
    switch (step) {
      case 1:
        return inputFiles.length > 0
      case 2:
        // 检查必需的变量是否都已映射
        const requiredMappings = variableMappings.filter(m => {
          const reqVar = requiredVariables.find(v => v.name === m.algorithmVariable)
          return reqVar?.required
        })
        return requiredMappings.every(m => m.ncVariable !== '')
      case 3:
        return true // 参数都有默认值
      default:
        return true
    }
  }

  // 执行算法
  const handleExecute = async () => {
    setIsExecuting(true)
    setStep(4)
    setExecutionProgress(0)
    
    const executionData = {
      inputFiles: inputFiles,
      variableMappings: variableMappings,
      parameters: parameters,
      outputFormat: parameters.outputFormat || 'PNG'
    }
    
    setExecutionLogs([
      `[${new Date().toLocaleTimeString()}] 开始执行算法...`,
      `[${new Date().toLocaleTimeString()}] 算法: ${algorithm.name}`,
      `[${new Date().toLocaleTimeString()}] 输入文件: ${inputFiles.map(f => f.name).join(', ')}`,
      `[${new Date().toLocaleTimeString()}] 变量映射配置完成`,
      `[${new Date().toLocaleTimeString()}] 参数设置: ${JSON.stringify(parameters, null, 2)}`
    ])
    
    // 模拟执行过程
    const steps = [
      { progress: 20, message: '读取NetCDF文件...' },
      { progress: 40, message: '提取映射变量数据...' },
      { progress: 60, message: '应用可视化参数...' },
      { progress: 80, message: '生成可视化图像...' },
      { progress: 100, message: '保存输出结果...' }
    ]
    
    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, 1500))
      setExecutionProgress(step.progress)
      setExecutionLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${step.message}`])
    }
    
    // 调用实际执行函数
    await onExecute(executionData)
    
    setIsExecuting(false)
    setStep(5)
    setOutputFiles(['ocean_visualization.png', 'metadata.json'])
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* 头部 */}
        <div className="bg-gradient-to-r from-ocean-600 to-ocean-700 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{algorithm.name}</h2>
              <p className="text-ocean-100 mt-1">执行算法并生成可视化结果</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          {/* 步骤指示器 */}
          <div className="flex items-center justify-between mt-6">
            {[
              { num: 1, label: '上传数据' },
              { num: 2, label: '变量映射' },
              { num: 3, label: '参数配置' },
              { num: 4, label: '执行监控' },
              { num: 5, label: '查看结果' }
            ].map((s) => (
              <div key={s.num} className="flex-1 flex items-center">
                <div className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                      step >= s.num
                        ? 'bg-white text-ocean-600'
                        : 'bg-ocean-500 text-ocean-200'
                    }`}
                  >
                    {step > s.num ? <CheckCircle className="h-6 w-6" /> : s.num}
                  </div>
                  <span className={`ml-2 text-sm ${step >= s.num ? 'text-white' : 'text-ocean-200'}`}>
                    {s.label}
                  </span>
                </div>
                {s.num < 5 && (
                  <div className={`flex-1 h-1 mx-3 rounded ${
                    step > s.num ? 'bg-white' : 'bg-ocean-500'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 内容区域 */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          {/* 步骤1：上传数据 */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">上传NetCDF数据文件</h3>
                
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    uploadingFiles ? 'border-ocean-400 bg-ocean-50' : 'border-gray-300 hover:border-ocean-400'
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleFileUpload(e.dataTransfer.files)
                  }}
                >
                  <FileInput className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">拖拽NetCDF文件到此处，或点击选择文件</p>
                  <p className="text-sm text-gray-500 mb-4">支持格式：.nc, .nc4, .netcdf</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".nc,.nc4,.netcdf"
                    onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFiles}
                    className="px-4 py-2 bg-ocean-500 text-white rounded-lg hover:bg-ocean-600 disabled:opacity-50"
                  >
                    选择文件
                  </button>
                </div>
              </div>

              {inputFiles.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">已上传的文件：</h4>
                  <div className="space-y-2">
                    {inputFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <FileText className="h-5 w-5 text-ocean-500 mr-3" />
                          <div>
                            <p className="font-medium text-gray-900">{file.name}</p>
                            <p className="text-sm text-gray-500">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setInputFiles(prev => prev.filter((_, i) => i !== index))}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 步骤2：变量映射 */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">NetCDF变量映射</h3>
                <p className="text-gray-600 mb-4">将NetCDF文件中的变量映射到算法所需的输入变量</p>
              </div>

              {scanningFile ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ocean-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">正在扫描NetCDF文件变量...</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* 文件变量信息 */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">检测到的NetCDF变量：</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {ncVariables.map((variable) => (
                        <div key={variable.name} className="bg-white rounded-lg p-3 border border-gray-200">
                          <p className="font-medium text-gray-900">{variable.name}</p>
                          <p className="text-xs text-gray-500">{variable.long_name || '无描述'}</p>
                          <p className="text-xs text-gray-400">
                            维度: {variable.dimensions.join(' × ')}
                          </p>
                          {variable.units && (
                            <p className="text-xs text-gray-400">单位: {variable.units}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 变量映射表 */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">变量映射配置：</h4>
                    <div className="space-y-3">
                      {variableMappings.map((mapping) => {
                        const reqVar = requiredVariables.find(v => v.name === mapping.algorithmVariable)
                        return (
                          <div key={mapping.algorithmVariable} className="flex items-center space-x-4">
                            <div className="flex-1">
                              <div className="flex items-center">
                                <Variable className="h-4 w-4 text-gray-400 mr-2" />
                                <span className="font-medium text-gray-900">
                                  {reqVar?.displayName}
                                </span>
                                {reqVar?.required && (
                                  <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-1 rounded">
                                    必需
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <ArrowRight className="h-4 w-4 text-gray-400" />
                              <select
                                value={mapping.ncVariable}
                                onChange={(e) => updateVariableMapping(mapping.algorithmVariable, e.target.value)}
                                className={`px-3 py-2 border rounded-lg focus:ring-ocean-500 focus:border-ocean-500 ${
                                  reqVar?.required && !mapping.ncVariable ? 'border-red-300' : 'border-gray-300'
                                }`}
                              >
                                <option value="">-- 选择变量 --</option>
                                {ncVariables.map((ncVar) => (
                                  <option key={ncVar.name} value={ncVar.name}>
                                    {ncVar.name} {ncVar.long_name && `(${ncVar.long_name})`}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <AlertCircle className="inline h-4 w-4 mr-1" />
                      提示：系统已自动匹配部分变量。请检查映射是否正确，必需的变量（经度、纬度）必须映射。
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* 步骤3：参数配置 */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">算法参数配置</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 可视化要素 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Eye className="inline h-4 w-4 mr-1" />
                    {oceanVisParams.visualizationElement.name}
                  </label>
                  <select
                    value={parameters.visualizationElement || oceanVisParams.visualizationElement.default}
                    onChange={(e) => updateParameter('visualizationElement', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                  >
                    {oceanVisParams.visualizationElement.options.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {oceanVisParams.visualizationElement.description}
                  </p>
                </div>

                {/* 色彩方案 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Palette className="inline h-4 w-4 mr-1" />
                    {oceanVisParams.colorScheme.name}
                  </label>
                  <select
                    value={parameters.colorScheme || oceanVisParams.colorScheme.default}
                    onChange={(e) => updateParameter('colorScheme', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                  >
                    {oceanVisParams.colorScheme.options.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {oceanVisParams.colorScheme.description}
                  </p>
                </div>

                {/* 地图投影 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Map className="inline h-4 w-4 mr-1" />
                    {oceanVisParams.projection.name}
                  </label>
                  <select
                    value={parameters.projection || oceanVisParams.projection.default}
                    onChange={(e) => updateParameter('projection', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                  >
                    {oceanVisParams.projection.options.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {oceanVisParams.projection.description}
                  </p>
                </div>

                {/* 输出格式 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FileType className="inline h-4 w-4 mr-1" />
                    {oceanVisParams.outputFormat.name}
                  </label>
                  <select
                    value={parameters.outputFormat || oceanVisParams.outputFormat.default}
                    onChange={(e) => updateParameter('outputFormat', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                  >
                    {oceanVisParams.outputFormat.options.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {oceanVisParams.outputFormat.description}
                  </p>
                </div>

                {/* 深度层级 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {oceanVisParams.depthLevel.name}
                  </label>
                  <input
                    type="number"
                    value={parameters.depthLevel ?? oceanVisParams.depthLevel.default}
                    onChange={(e) => updateParameter('depthLevel', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                    min="0"
                    step="10"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {oceanVisParams.depthLevel.description}
                  </p>
                </div>

                {/* 时间步 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {oceanVisParams.timeStep.name}
                  </label>
                  <input
                    type="number"
                    value={parameters.timeStep ?? oceanVisParams.timeStep.default}
                    onChange={(e) => updateParameter('timeStep', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                    min="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {oceanVisParams.timeStep.description}
                  </p>
                </div>

                {/* 等值线级数 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {oceanVisParams.contourLevels.name}
                  </label>
                  <input
                    type="number"
                    value={parameters.contourLevels ?? oceanVisParams.contourLevels.default}
                    onChange={(e) => updateParameter('contourLevels', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                    min="1"
                    max="20"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {oceanVisParams.contourLevels.description}
                  </p>
                </div>

                {/* 布尔选项 */}
                <div className="md:col-span-2 grid grid-cols-2 gap-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={parameters.showGridLines ?? oceanVisParams.showGridLines.default}
                      onChange={(e) => updateParameter('showGridLines', e.target.checked)}
                      className="h-4 w-4 text-ocean-600 focus:ring-ocean-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      {oceanVisParams.showGridLines.name}
                    </span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={parameters.showColorbar ?? oceanVisParams.showColorbar.default}
                      onChange={(e) => updateParameter('showColorbar', e.target.checked)}
                      className="h-4 w-4 text-ocean-600 focus:ring-ocean-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      {oceanVisParams.showColorbar.name}
                    </span>
                  </label>
                </div>
              </div>

              {/* 参数预览 */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">参数配置预览：</h4>
                <pre className="text-sm text-gray-600 overflow-x-auto">
                  {JSON.stringify(parameters, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* 步骤4：执行监控 */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="text-center py-8">
                <div className="relative inline-flex items-center justify-center">
                  <div className="w-32 h-32 rounded-full border-8 border-gray-200"></div>
                  <div 
                    className="absolute inset-0 w-32 h-32 rounded-full border-8 border-ocean-500 border-t-transparent animate-spin"
                    style={{
                      clipPath: `polygon(0 0, 100% 0, 100% ${executionProgress}%, 0 ${executionProgress}%)`
                    }}
                  ></div>
                  <span className="absolute text-2xl font-bold text-gray-900">
                    {executionProgress}%
                  </span>
                </div>
                <p className="mt-4 text-lg text-gray-600">
                  {isExecuting ? '正在执行算法...' : '执行完成！'}
                </p>
              </div>

              {/* 执行日志 */}
              <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm max-h-64 overflow-y-auto">
                {executionLogs.map((log, index) => (
                  <div key={index} className="mb-1">{log}</div>
                ))}
              </div>
            </div>
          )}

          {/* 步骤5：结果预览 */}
          {step === 5 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">执行结果</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 结果预览 */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="font-medium text-gray-900 mb-4">可视化预览</h4>
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <img
                      src="/api/placeholder/600/400"
                      alt="Ocean Visualization Result"
                      className="w-full h-auto rounded"
                    />
                  </div>
                </div>

                {/* 输出文件 */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">输出文件</h4>
                  <div className="space-y-3">
                    {outputFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                        <div className="flex items-center">
                          <Image className="h-5 w-5 text-ocean-500 mr-3" />
                          <span className="font-medium text-gray-900">{file}</span>
                        </div>
                        <button className="text-ocean-500 hover:text-ocean-700">
                          <Download className="h-5 w-5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* 执行统计 */}
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <h5 className="font-medium text-blue-900 mb-2">执行统计</h5>
                    <div className="space-y-1 text-sm text-blue-800">
                      <p>执行时间：15.3秒</p>
                      <p>内存使用：256MB</p>
                      <p>输出大小：2.4MB</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 底部操作栏 */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-between">
          <div>
            {step > 1 && step < 5 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 flex items-center"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                上一步
              </button>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            {step < 3 && (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canProceedToNext()}
                className="px-6 py-2 bg-ocean-500 text-white rounded-lg hover:bg-ocean-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                下一步
                <ArrowRight className="h-4 w-4 ml-2" />
              </button>
            )}
            
            {step === 3 && (
              <button
                onClick={handleExecute}
                className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center"
              >
                <Play className="h-4 w-4 mr-2" />
                开始执行
              </button>
            )}
            
            {step === 5 && (
              <button
                onClick={onClose}
                className="px-6 py-2 bg-ocean-500 text-white rounded-lg hover:bg-ocean-600"
              >
                完成
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AlgorithmExecutionEnhanced