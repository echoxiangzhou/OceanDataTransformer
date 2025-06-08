import React, { useState, useRef } from 'react'
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
  Camera,
  Maximize2,
  ZoomIn,
  RotateCcw,
  Share2,
  Save
} from 'lucide-react'
import { Algorithm, AlgorithmParameter } from '../services/algorithmService'

interface AlgorithmExecutionProps {
  algorithm: Algorithm
  onClose: () => void
  onExecute: (params: any) => void
}

const AlgorithmExecution: React.FC<AlgorithmExecutionProps> = ({
  algorithm,
  onClose,
  onExecute
}) => {
  const [step, setStep] = useState(1) // 1: 输入数据, 2: 参数配置, 3: 执行监控, 4: 结果预览
  const [inputFiles, setInputFiles] = useState<File[]>([])
  const [parameters, setParameters] = useState<Record<string, any>>({})
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionProgress, setExecutionProgress] = useState(0)
  const [executionLogs, setExecutionLogs] = useState<string[]>([])
  const [outputFiles, setOutputFiles] = useState<string[]>([])
  const [selectedPreview, setSelectedPreview] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState<'fit' | 'actual'>('fit')
  const [uploadingFiles, setUploadingFiles] = useState<boolean>(false)
  const [uploadProgress, setUploadProgress] = useState<number>(0)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // 初始化参数默认值
  React.useEffect(() => {
    const defaultParams: Record<string, any> = {}
    algorithm.parameters?.forEach((param: AlgorithmParameter) => {
      if (param.default_value !== undefined) {
        defaultParams[param.name] = param.default_value
      }
    })
    setParameters(defaultParams)
  }, [algorithm])

  // 处理文件上传
  const handleFileUpload = (files: FileList) => {
    if (!files || files.length === 0) return
    
    console.log('Processing files:', files.length)
    setUploadingFiles(true)
    setUploadProgress(10)
    
    // 使用setTimeout来避免UI阻塞
    setTimeout(() => {
      try {
        // 检查文件大小限制 (500MB)
        const maxSizeBytes = 500 * 1024 * 1024
        const oversizedFiles = Array.from(files).filter(file => file.size > maxSizeBytes)
        
        if (oversizedFiles.length > 0) {
          alert(`以下文件超过500MB限制:\n${oversizedFiles.map(f => `${f.name} (${(f.size / 1024 / 1024).toFixed(1)}MB)`).join('\n')}`)
          setUploadingFiles(false)
          setUploadProgress(0)
          return
        }
        
        setUploadProgress(30)
        
        const validFiles = Array.from(files).filter(file => {
          const fileName = file.name.toLowerCase()
          const fileExt = fileName.split('.').pop() || ''
          
          console.log(`Checking file: ${file.name}, ext: ${fileExt}`)
          
          // 如果没有定义支持的格式，则接受所有文件
          if (!algorithm.input_formats || algorithm.input_formats.length === 0) {
            console.log('No format restrictions, accepting file')
            return true
          }
          
          // 检查文件扩展名是否在支持的格式中
          const isSupported = (algorithm.input_formats || []).some(format => {
            const formatLower = format.toLowerCase()
            console.log(`Checking format: ${formatLower} against ${fileExt}`)
            
            // 处理NetCDF格式的特殊映射
            if (formatLower === 'netcdf' && (fileExt === 'nc' || fileExt === 'netcdf')) {
              console.log('NetCDF format matched')
              return true
            }
            // 处理HDF格式
            if (formatLower === 'hdf5' && (fileExt === 'h5' || fileExt === 'hdf' || fileExt === 'hdf5')) {
              console.log('HDF5 format matched')
              return true
            }
            // 处理GRIB格式
            if (formatLower === 'grib' && (fileExt === 'grb' || fileExt === 'grib' || fileExt === 'grib2')) {
              console.log('GRIB format matched')
              return true
            }
            // 常规匹配
            if (fileName.endsWith(`.${formatLower}`) || fileExt === formatLower || file.type.includes(formatLower)) {
              console.log('Regular format matched')
              return true
            }
            return false
          })
          
          console.log(`File ${file.name} supported: ${isSupported}`)
          return isSupported
        })
        
        setUploadProgress(70)
        
        if (validFiles.length !== files.length) {
          const unsupportedCount = files.length - validFiles.length
          const supportedFormats = (algorithm.input_formats || []).map(format => {
            if (format.toLowerCase() === 'netcdf') return 'NetCDF (.nc)'
            if (format.toLowerCase() === 'hdf5') return 'HDF5 (.h5, .hdf)'
            if (format.toLowerCase() === 'grib') return 'GRIB (.grb, .grib)'
            return format
          }).join(', ')
          alert(`${unsupportedCount} 个文件格式不支持。\n\n支持的格式: ${supportedFormats}`)
        }
        
        setUploadProgress(100)
        console.log('Adding valid files:', validFiles.length)
        
        if (validFiles.length > 0) {
          setInputFiles(prev => {
            const newFiles = [...prev, ...validFiles]
            console.log('Updated input files:', newFiles)
            return newFiles
          })
        }
        
      } catch (error) {
        console.error('文件上传处理失败:', error)
        alert('文件处理失败，请重试')
      } finally {
        setTimeout(() => {
          setUploadingFiles(false)
          setUploadProgress(0)
        }, 500)
      }
    }, 100)
  }

  // 移除输入文件
  const removeInputFile = (index: number) => {
    setInputFiles(inputFiles.filter((_, i) => i !== index))
  }

  // 更新参数值
  const updateParameter = (name: string, value: any) => {
    setParameters({ ...parameters, [name]: value })
  }

  // 渲染参数输入组件
  const renderParameterInput = (param: AlgorithmParameter) => {
    const value = parameters[param.name] ?? param.default_value ?? ''

    switch (param.type) {
      case 'string':
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => updateParameter(param.name, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
            placeholder={param.default_value || ''}
          />
        )

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => updateParameter(param.name, parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
            placeholder={param.default_value?.toString() || '0'}
          />
        )

      case 'boolean':
        return (
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => updateParameter(param.name, e.target.checked)}
              className="h-4 w-4 text-ocean-600 focus:ring-ocean-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">启用</span>
          </label>
        )

      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => updateParameter(param.name, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
          >
            {param.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        )

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => updateParameter(param.name, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
            placeholder={param.default_value || ''}
          />
        )
    }
  }

  // 执行算法
  const handleExecute = async () => {
    try {
      // 验证输入
      if (inputFiles.length === 0) {
        alert('请先上传输入文件')
        return
      }

      // 验证必需参数
      const requiredParams = algorithm.parameters?.filter(p => p.required) || []
      for (const param of requiredParams) {
        const value = parameters[param.name]
        if (value === undefined || value === null || value === '') {
          alert(`请填写必需参数: ${param.name}`)
          return
        }
      }

      setIsExecuting(true)
      setStep(3)
      setExecutionProgress(0)
      setExecutionLogs([
        `[${new Date().toLocaleTimeString()}] 开始执行算法...`,
        `[${new Date().toLocaleTimeString()}] 算法: ${algorithm.name} v${algorithm.version}`,
        `[${new Date().toLocaleTimeString()}] 输入文件: ${inputFiles.map(f => f.name).join(', ')}`,
        `[${new Date().toLocaleTimeString()}] 参数: ${JSON.stringify(parameters)}`
      ])

      // 模拟执行过程
      const progressSteps = [
        { progress: 10, message: '验证输入文件格式...' },
        { progress: 25, message: '加载数据到内存...' },
        { progress: 40, message: '应用算法参数...' },
        { progress: 60, message: '执行核心计算...' },
        { progress: 80, message: '生成可视化结果...' },
        { progress: 95, message: '保存输出文件...' }
      ]

      for (let i = 0; i < progressSteps.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        const step = progressSteps[i]
        setExecutionProgress(step.progress)
        setExecutionLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${step.message}`])
      }

      // 调用父组件的执行函数
      await onExecute({
        inputFiles: inputFiles, // 传递File对象而不是文件名
        parameters,
        outputFormat: 'png'
      })

      setExecutionProgress(100)
      setIsExecuting(false)
      setStep(4)
      setOutputFiles([
        `${algorithm.name.replace(/\s+/g, '_')}_result.png`,
        `${algorithm.name.replace(/\s+/g, '_')}_analysis.json`,
        'execution_log.txt'
      ])
      setExecutionLogs(prev => [...prev, 
        `[${new Date().toLocaleTimeString()}] 算法执行完成`,
        `[${new Date().toLocaleTimeString()}] 生成 ${outputFiles.length + 3} 个输出文件`
      ])

    } catch (error) {
      console.error('执行失败:', error)
      setIsExecuting(false)
      setExecutionProgress(0)
      setExecutionLogs(prev => [...prev, 
        `[${new Date().toLocaleTimeString()}] 执行失败: ${error.message || error}`,
        `[${new Date().toLocaleTimeString()}] 请检查输入数据和参数设置`
      ])
      
      // 显示错误消息
      alert(`算法执行失败: ${error.message || error}`)
    }
  }

  // 下载文件
  const handleDownload = (filename: string) => {
    // 创建虚拟下载链接
    const link = document.createElement('a')
    link.href = `/api/v1/algorithms/download/${filename}`
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // 预览图片
  const PreviewModal = ({ filename }: { filename: string }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="relative max-w-full max-h-full">
        <div className="bg-white rounded-lg shadow-xl">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-lg font-medium">{filename}</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPreviewMode(previewMode === 'fit' ? 'actual' : 'fit')}
                className="p-2 hover:bg-gray-100 rounded"
                title={previewMode === 'fit' ? '实际大小' : '适应窗口'}
              >
                {previewMode === 'fit' ? <Maximize2 className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}
              </button>
              <button
                onClick={() => handleDownload(filename)}
                className="p-2 hover:bg-gray-100 rounded"
                title="下载"
              >
                <Download className="h-4 w-4" />
              </button>
              <button
                onClick={() => setSelectedPreview(null)}
                className="p-2 hover:bg-gray-100 rounded"
                title="关闭"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="p-4">
            <img
              src={`/api/v1/algorithms/preview/${filename}`}
              alt={filename}
              className={`max-w-full ${previewMode === 'fit' ? 'max-h-96' : ''} object-contain`}
              onError={(e) => {
                // 如果图片加载失败，显示占位符
                (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuWbvueJh+mihOiniDwvdGV4dD48L3N2Zz4='
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">上传输入数据</h3>
            
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">支持的输入格式</h4>
              <div className="flex flex-wrap gap-2">
                {(algorithm.input_formats || []).map((format) => {
                  let displayFormat = format
                  if (format.toLowerCase() === 'netcdf') displayFormat = 'NetCDF (.nc)'
                  if (format.toLowerCase() === 'hdf5') displayFormat = 'HDF5 (.h5, .hdf)'
                  if (format.toLowerCase() === 'grib') displayFormat = 'GRIB (.grb, .grib)'
                  
                  return (
                    <span key={format} className="px-2 py-1 text-xs bg-blue-200 text-blue-800 rounded">
                      {displayFormat}
                    </span>
                  )
                })}
              </div>
              {(algorithm.input_formats || []).length === 0 && (
                <p className="text-sm text-blue-800">支持所有常见文件格式</p>
              )}
            </div>

            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                uploadingFiles ? 'cursor-wait border-blue-400 bg-blue-50' : 'cursor-pointer border-gray-300 hover:border-ocean-400'
              }`}
              onDrop={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (!uploadingFiles) {
                  const files = e.dataTransfer.files
                  if (files.length > 0) {
                    handleFileUpload(files)
                  }
                }
              }}
              onDragOver={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
              onDragEnter={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
              onDragLeave={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
              onClick={() => {
                if (!uploadingFiles) {
                  fileInputRef.current?.click()
                }
              }}
            >
              {uploadingFiles ? (
                <div className="space-y-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto" />
                  <p className="text-lg text-blue-600 mb-2">处理文件中...</p>
                  <div className="w-64 mx-auto">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-blue-600">进度</span>
                      <span className="text-blue-600 font-medium">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg text-gray-600 mb-2">拖放文件到此处或点击选择</p>
                </>
              )}
              <p className="text-sm text-gray-500">
                支持 {(algorithm.input_formats || []).map(format => {
                  if (format.toLowerCase() === 'netcdf') return 'NetCDF (.nc)'
                  if (format.toLowerCase() === 'hdf5') return 'HDF5 (.h5)'
                  if (format.toLowerCase() === 'grib') return 'GRIB (.grb)'
                  return format
                }).join(', ')} 格式
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={(algorithm.input_formats || []).map(f => {
                  const format = f.toLowerCase()
                  if (format === 'netcdf') return '.nc,.netcdf'
                  if (format === 'hdf5') return '.h5,.hdf,.hdf5'
                  if (format === 'grib') return '.grb,.grib,.grib2'
                  return `.${format}`
                }).join(',')}
                onChange={(e) => e.target.files && !uploadingFiles && handleFileUpload(e.target.files)}
                disabled={uploadingFiles}
                className="hidden"
              />
            </div>

            {inputFiles.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">已选择的文件 ({inputFiles.length})</h4>
                {inputFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{file.name}</p>
                        <p className="text-xs text-gray-500">
                          {file.size >= 1024 * 1024 
                            ? `${(file.size / 1024 / 1024).toFixed(2)} MB` 
                            : `${(file.size / 1024).toFixed(2)} KB`
                          } | {file.type || '未知类型'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeInputFile(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">配置算法参数</h3>
            
            {algorithm.parameters && algorithm.parameters.length > 0 ? (
              <div className="space-y-4">
                {algorithm.parameters.map((param) => (
                  <div key={param.name} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="font-medium text-gray-900">
                        {param.name}
                        {param.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {param.type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{param.description}</p>
                    {renderParameterInput(param)}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                <Settings className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">此算法无需配置参数</p>
              </div>
            )}

            <div className="bg-green-50 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-2">当前参数配置</h4>
              <pre className="text-sm text-green-800 bg-green-100 rounded p-2 overflow-x-auto">
                {JSON.stringify(parameters, null, 2)}
              </pre>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">算法执行中</h3>
            
            <div className="bg-blue-50 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-blue-900">执行进度</h4>
                <span className="text-blue-700 font-medium">{Math.round(executionProgress)}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${executionProgress}%` }}
                />
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-white">执行日志</h4>
                <div className="flex items-center text-green-400 text-sm">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse" />
                  运行中
                </div>
              </div>
              <div className="text-sm text-green-400 font-mono space-y-1 max-h-64 overflow-y-auto">
                {executionLogs.map((log, index) => (
                  <div key={index} className="flex items-start">
                    <span className="text-gray-500 mr-2">
                      [{new Date().toLocaleTimeString()}]
                    </span>
                    <span>{log}</span>
                  </div>
                ))}
              </div>
            </div>

            {isExecuting && (
              <div className="flex items-center justify-center text-gray-600">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-ocean-500 mr-2" />
                正在执行算法，请稍候...
              </div>
            )}
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">执行结果</h3>
            
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center">
                <CheckCircle className="h-6 w-6 text-green-500 mr-3" />
                <div>
                  <h4 className="font-medium text-green-900">算法执行成功</h4>
                  <p className="text-sm text-green-700">生成了 {outputFiles.length} 个输出文件</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">输出文件</h4>
              {outputFiles.map((filename, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Image className="h-6 w-6 text-blue-500 mr-3" />
                      <div>
                        <p className="font-medium text-gray-900">{filename}</p>
                        <p className="text-sm text-gray-500">可视化结果图片</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedPreview(filename)}
                        className="btn-secondary text-sm flex items-center space-x-1"
                      >
                        <Eye className="h-4 w-4" />
                        <span>预览</span>
                      </button>
                      <button
                        onClick={() => handleDownload(filename)}
                        className="btn-primary text-sm flex items-center space-x-1"
                      >
                        <Download className="h-4 w-4" />
                        <span>下载</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-yellow-500 mr-2 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800">文件说明</p>
                  <ul className="mt-1 text-yellow-700 space-y-1">
                    <li>• 点击"预览"可以查看生成的可视化图片</li>
                    <li>• 点击"下载"保存文件到本地</li>
                    <li>• 支持下载单个文件或批量打包下载</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <div className="fixed inset-0 transition-opacity">
            <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
          </div>
          
          <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
            {/* 头部 */}
            <div className="bg-white px-6 pt-6 pb-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">执行算法</h2>
                  <p className="text-sm text-gray-600 mt-1">{algorithm.name} v{algorithm.version}</p>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              {/* 步骤指示器 */}
              <div className="mt-4">
                <div className="flex items-center">
                  {[1, 2, 3, 4].map((stepNum) => (
                    <React.Fragment key={stepNum}>
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                        step >= stepNum 
                          ? 'bg-ocean-500 text-white' 
                          : 'bg-gray-200 text-gray-500'
                      }`}>
                        {stepNum}
                      </div>
                      {stepNum < 4 && (
                        <div className={`flex-1 h-1 mx-2 ${
                          step > stepNum ? 'bg-ocean-500' : 'bg-gray-200'
                        }`} />
                      )}
                    </React.Fragment>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>输入数据</span>
                  <span>参数配置</span>
                  <span>执行监控</span>
                  <span>结果预览</span>
                </div>
              </div>
            </div>

            {/* 内容区域 */}
            <div className="bg-white px-6 py-6 max-h-96 overflow-y-auto">
              {renderStep()}
            </div>

            {/* 底部按钮 */}
            <div className="bg-gray-50 px-6 py-4 flex justify-between">
              <div>
                {step > 1 && step < 3 && (
                  <button
                    onClick={() => setStep(step - 1)}
                    className="btn-secondary"
                  >
                    上一步
                  </button>
                )}
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="btn-secondary"
                >
                  {step === 4 ? '关闭' : '取消'}
                </button>
                
                {step === 1 && (
                  <button
                    onClick={() => setStep(2)}
                    disabled={inputFiles.length === 0}
                    className="btn-primary"
                  >
                    下一步
                  </button>
                )}
                
                {step === 2 && (
                  <button
                    onClick={handleExecute}
                    disabled={isExecuting}
                    className="btn-primary flex items-center space-x-2"
                  >
                    <Play className="h-4 w-4" />
                    <span>执行算法</span>
                  </button>
                )}

                {step === 4 && (
                  <button
                    onClick={() => {
                      // 下载所有文件
                      outputFiles.forEach(filename => handleDownload(filename))
                    }}
                    className="btn-primary flex items-center space-x-2"
                  >
                    <Download className="h-4 w-4" />
                    <span>下载全部</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 图片预览模态框 */}
      {selectedPreview && <PreviewModal filename={selectedPreview} />}
    </>
  )
}

export default AlgorithmExecution