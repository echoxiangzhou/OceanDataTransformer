import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Eye, AlertTriangle, CheckCircle, RefreshCw, FileText, BarChart3 } from 'lucide-react'
import { ImportWizardData } from '../../../../hooks/useDataImportWizard'
import { conversionService } from '../../../../services/conversionService'

interface PreviewStepProps {
  wizardData: ImportWizardData
  updateWizardData: (data: Partial<ImportWizardData>) => void
}

interface PreviewData {
  columns?: string[]
  sample_data?: any[]
  total_rows?: number
  data_types?: Record<string, string>
  has_coordinates?: boolean
  has_time_column?: boolean
  detected_variables?: string[]
  statistics?: Record<string, any>
}

interface ColumnMapping {
  [columnName: string]: {
    type: 'coordinate' | 'variable' | 'ignore'
    dimension?: 'time' | 'latitude' | 'longitude' | 'depth' | 'other'
    standardName?: string
    units?: string
  }
}

const PreviewStep: React.FC<PreviewStepProps> = ({ wizardData, updateWizardData }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [taskStatus, setTaskStatus] = useState<string>('')
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({})
  const [isPolling, setIsPolling] = useState(false)
  const [showAllColumns, setShowAllColumns] = useState(false)
  const pollingRef = useRef(false)

  // 初始化列映射，提供智能建议但让用户选择
  const initializeColumnMapping = useCallback((data: PreviewData): ColumnMapping => {
    const mapping: ColumnMapping = {}
    
    data.columns?.forEach(column => {
      const columnLower = column.toLowerCase()
      
      // 提供智能建议，但默认都设为变量，让用户选择
      if (columnLower.includes('lat') || columnLower === 'y') {
        mapping[column] = {
          type: 'coordinate',
          dimension: 'latitude',
          standardName: 'latitude',
          units: 'degrees_north'
        }
      } else if (columnLower.includes('lon') || columnLower === 'x') {
        mapping[column] = {
          type: 'coordinate',
          dimension: 'longitude',
          standardName: 'longitude',
          units: 'degrees_east'
        }
      } else {
        // 其他列默认为变量，用户可以自己选择
        let suggestedType: 'variable' | 'coordinate' = 'variable'
        let suggestedDimension: 'time' | 'latitude' | 'longitude' | 'depth' | 'other' | undefined = undefined
        let suggestedStandardName = column.toLowerCase().replace(/\s+/g, '_')
        let suggestedUnits = ''
        
        // 为时间相关列提供建议
        if (columnLower.includes('time') || columnLower.includes('date') || columnLower === 't') {
          suggestedType = 'variable' // 默认为变量，让用户选择是否作为坐标
          // 可以在UI中显示建议：建议设为时间坐标
        }
        
        // 为深度相关列提供建议
        if (columnLower.includes('depth') || columnLower.includes('level') || columnLower === 'z') {
          suggestedType = 'variable' // 默认为变量，让用户选择是否作为坐标
          // 可以在UI中显示建议：建议设为深度坐标
        }
        
        // 为常见海洋变量提供标准名称建议
        if (columnLower.includes('temp')) {
          suggestedStandardName = 'sea_water_temperature'
          suggestedUnits = 'degree_C'
        } else if (columnLower.includes('sal')) {
          suggestedStandardName = 'sea_water_salinity'
          suggestedUnits = 'psu'
        } else if (columnLower.includes('pres')) {
          suggestedStandardName = 'sea_water_pressure'
          suggestedUnits = 'dbar'
        }
        
        mapping[column] = {
          type: suggestedType,
          dimension: suggestedDimension,
          standardName: suggestedStandardName,
          units: suggestedUnits
        }
      }
    })
    
    return mapping
  }, [])

  useEffect(() => {
    if (wizardData.uploadResponse && !wizardData.previewData) {
      setRetryCount(0) // 重置重试计数
      pollingRef.current = true
      loadPreviewData()
    } else if (wizardData.previewData) {
      setPreviewData(wizardData.previewData)
      pollingRef.current = false
      // 如果已有列映射配置，使用它；否则初始化
      if (wizardData.columnMapping) {
        setColumnMapping(wizardData.columnMapping)
      } else if (wizardData.previewData.columns) {
        const initialMapping = initializeColumnMapping(wizardData.previewData)
        setColumnMapping(initialMapping)
        updateWizardData({ columnMapping: initialMapping })
      }
    }
  }, [wizardData.uploadResponse, wizardData.previewData, initializeColumnMapping, updateWizardData])

  const loadPreviewData = useCallback(async () => {
    if (!wizardData.uploadResponse?.task_id) return

    setLoading(true)
    setError(null)
    setIsPolling(true)
    pollingRef.current = true

    try {
      // 检查是否使用新的session API
      if (wizardData.sessionId) {
        // 使用新的session API获取预览数据
        try {
          const previewRequest = {
            limit: 100
          }
          const previewResponse = await conversionService.previewSessionData(wizardData.sessionId, previewRequest)
          
          // 检查响应数据的有效性
          if (!previewResponse || typeof previewResponse !== 'object') {
            throw new Error('Invalid preview response format')
          }
          
          const data: PreviewData = {
            columns: previewResponse.columns || [],
            sample_data: previewResponse.sample_data || [],
            total_rows: previewResponse.total_rows || 0,
            data_types: previewResponse.data_types || {},
            has_coordinates: (previewResponse.coordinate_variables || []).length > 0,
            has_time_column: (previewResponse.coordinate_variables || []).includes('time'),
            detected_variables: previewResponse.data_variables || []
          }
          
          setPreviewData(data)
          updateWizardData({ previewData: data })
          
          // 初始化列映射
          if (data.columns) {
            const initialMapping = initializeColumnMapping(data)
            setColumnMapping(initialMapping)
            updateWizardData({ columnMapping: initialMapping })
          }
          
          setTaskStatus('数据预览加载完成')
          setLoading(false)
          setIsPolling(false)
          pollingRef.current = false
          
          return
        } catch (sessionError) {
          console.warn('Session preview failed, falling back to task status:', sessionError)
          // 如果session预览失败，降级到旧的任务状态查询
        }
      }
      
      // 降级：使用旧的任务状态API（只有当task_id是数字时）
      const taskId = wizardData.uploadResponse.task_id
      if (typeof taskId === 'number' || /^\d+$/.test(taskId)) {
        const taskResponse = await conversionService.getConversionTask(parseInt(taskId.toString()))
        
        setTaskStatus(`任务状态: ${taskResponse.status}, 进度: ${taskResponse.progress}%`)
        
        if (taskResponse.status === 'completed' && taskResponse.nc_file_id) {
          // 获取转换后的文件信息
          const fileResponse = await conversionService.getNCFile(taskResponse.nc_file_id)
          
          // 获取文件数据预览（前100行）
          let previewResponse = null
          try {
            previewResponse = await conversionService.getNCFilePreview(taskResponse.nc_file_id, 100)
          } catch (error) {
            console.warn('Failed to load preview data, using basic info only:', error)
          }
        
          // 构建预览数据
          const previewData: PreviewData = {
            columns: previewResponse?.columns || (fileResponse.variables ? Object.keys(fileResponse.variables) : []),
            sample_data: previewResponse?.sample_data || [],
            total_rows: previewResponse?.total_rows || (fileResponse.dimensions ? Object.values(fileResponse.dimensions)[0] as number : 0),
            data_types: previewResponse?.data_types || {},
            has_coordinates: previewResponse?.has_coordinates ?? !!(fileResponse.latitude_min !== undefined || fileResponse.longitude_min !== undefined),
            has_time_column: previewResponse?.has_time_column ?? !!(fileResponse.time_coverage_start),
            detected_variables: previewResponse?.detected_variables || (fileResponse.variables ? Object.keys(fileResponse.variables) : []),
            statistics: {
              file_size: fileResponse.file_size,
              cf_compliant: fileResponse.is_cf_compliant,
              quality_score: fileResponse.data_quality_score
            }
          }

          setPreviewData(previewData)
          updateWizardData({ previewData })
          
          // 初始化列映射
          if (previewData.columns) {
            const initialMapping = initializeColumnMapping(previewData)
            setColumnMapping(initialMapping)
            updateWizardData({ columnMapping: initialMapping })
          }
          
          setLoading(false)
          setIsPolling(false)
          pollingRef.current = false
          setRetryCount(0) // 重置重试计数
        } else if (taskResponse.status === 'failed') {
        // 解析具体的错误类型
        const errorMsg = taskResponse.error_message || '未知错误'
        let enhancedError = `文件处理失败: ${errorMsg}`
        
        if (errorMsg.includes("'utf-8' codec can't decode") || errorMsg.includes('invalid start byte')) {
          enhancedError = '文件编码错误: 文件不是UTF-8编码格式'
        } else if (errorMsg.includes('UnicodeDecodeError')) {
          enhancedError = '文件编码错误: 文件包含无法识别的字符'
        } else if (errorMsg.includes('permission') || errorMsg.includes('Permission')) {
          enhancedError = '文件访问错误: 文件权限不足或文件被占用'
        } else if (errorMsg.includes('memory') || errorMsg.includes('Memory')) {
          enhancedError = '内存错误: 文件过大或系统资源不足'
        }
        
        setError(enhancedError)
        setLoading(false)
        setIsPolling(false)
        pollingRef.current = false
      } else {
        // 检查任务是否长时间卡在某个状态
        if (taskResponse.status === 'processing' && taskResponse.progress >= 90 && retryCount >= 15) {
          setError(`数据处理卡在 ${taskResponse.progress}% 进度超过30秒。这通常是由于数据库保存时间格式问题导致的。文件转换可能已完成，但保存元数据时出错。`)
          setLoading(false)
          setIsPolling(false)
          pollingRef.current = false
          return
        }
        
        // 检查是否超过最大重试次数 (5分钟 = 150次 * 2秒)
        if (retryCount >= 150) {
          setError('数据处理超时，请重试或联系系统管理员')
          setLoading(false)
          setIsPolling(false)
          pollingRef.current = false
          return
        }
        
        // 如果任务状态未知或异常，停止轮询
        if (!['pending', 'processing'].includes(taskResponse.status)) {
          setError(`任务状态异常: ${taskResponse.status}，请重新上传文件`)
          setLoading(false)
          setIsPolling(false)
          pollingRef.current = false
          return
        }
        
        // 任务还在处理中，继续等待 - 保持loading状态
        setRetryCount(prev => prev + 1)
        setTimeout(() => {
          if (pollingRef.current) {
            loadPreviewData()
          }
        }, 2000)
        }
      } else {
        // task_id是UUID，但没有session，说明是不兼容的状态
        setError('不支持的任务格式，请重新上传文件')
        setLoading(false)
        setIsPolling(false)
        pollingRef.current = false
      }

    } catch (error: any) {
      setError(error.response?.data?.detail || error.message || '预览数据加载失败')
      setLoading(false)
      setIsPolling(false)
      pollingRef.current = false
    }
  }, [wizardData.uploadResponse, wizardData.sessionId, retryCount, initializeColumnMapping, updateWizardData])

  // 停止轮询
  const stopPolling = useCallback(() => {
    setIsPolling(false)
    setLoading(false)
    pollingRef.current = false
  }, [])


  // 更新列映射
  const updateColumnMapping = (column: string, updates: Partial<ColumnMapping[string]>) => {
    const newMapping = {
      ...columnMapping,
      [column]: {
        ...columnMapping[column],
        ...updates
      }
    }
    setColumnMapping(newMapping)
    updateWizardData({ columnMapping: newMapping })
  }

  // 获取维度类型的选项
  const getDimensionOptions = () => [
    { value: 'time', label: '时间 (Time)' },
    { value: 'latitude', label: '纬度 (Latitude)' },
    { value: 'longitude', label: '经度 (Longitude)' },
    { value: 'depth', label: '深度 (Depth)' },
    { value: 'other', label: '其他维度' }
  ]

  // 获取标准名称建议
  const getStandardNameSuggestions = (type: string, dimension?: string) => {
    if (type === 'coordinate') {
      switch (dimension) {
        case 'time':
          return ['time']
        case 'latitude':
          return ['latitude']
        case 'longitude':
          return ['longitude']
        case 'depth':
          return ['depth', 'height', 'altitude']
        default:
          return []
      }
    } else {
      return [
        'sea_water_temperature',
        'sea_water_salinity',
        'sea_water_pressure',
        'sea_surface_height',
        'sea_water_velocity',
        'wind_speed',
        'air_temperature'
      ]
    }
  }

  const renderDataPreview = () => {
    if (!previewData) return null

    // 检查是否是文件解析错误的情况
    const isFileParseError = previewData.columns?.includes('文件无法解析') || 
                            (previewData.metadata_preview?.status && 
                             previewData.metadata_preview.status.includes('解析失败'))

    if (isFileParseError) {
      return (
        <div className="space-y-6">
          {/* 文件解析错误提示 */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span className="font-medium text-red-900">文件解析失败</span>
            </div>
            <div className="text-sm text-red-700 space-y-2">
              <p>{previewData.metadata_preview?.status || 'NetCDF文件无法正常解析'}</p>
              {previewData.metadata_preview?.error_messages && (
                <div>
                  <p className="font-medium">详细错误信息:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    {(previewData.metadata_preview.error_messages as string[]).map((msg, idx) => (
                      <li key={idx}>{msg}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="mt-3">
                <p className="font-medium">可能的解决方案:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>检查文件是否完整下载</li>
                  <li>确认文件格式是否为标准NetCDF格式</li>
                  <li>尝试使用其他工具验证文件完整性</li>
                  <li>如果是从网络下载的文件，尝试重新下载</li>
                </ul>
              </div>
            </div>
          </div>
          
          {/* 文件基本信息（如果有的话） */}
          {previewData.metadata_preview?.file_size && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">文件基本信息</h3>
              <div className="text-sm text-gray-600">
                <p>文件大小: {Math.round((previewData.metadata_preview.file_size as number) / 1024)} KB</p>
                <p>文件路径: {previewData.metadata_preview.file_path}</p>
              </div>
            </div>
          )}
        </div>
      )
    }

    return (
      <div className="space-y-6">
        {/* 文件基本信息 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <FileText className="h-5 w-5 text-blue-500" />
              <span className="font-medium text-blue-900">数据规模</span>
            </div>
            <div className="text-sm text-blue-700">
              <p>列数: {previewData.columns?.length || 0}</p>
              <p>行数: {previewData.total_rows || 0}</p>
              {previewData.columns && previewData.columns.length > 0 && (
                <p className="text-xs mt-1">
                  列名: {previewData.columns.slice(0, 3).join(', ')}
                  {previewData.columns.length > 3 && ` 等${previewData.columns.length}个`}
                </p>
              )}
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="font-medium text-green-900">数据特征</span>
            </div>
            <div className="text-sm text-green-700">
              <p>坐标数据: {previewData.has_coordinates ? '是' : '否'}</p>
              <p>时间数据: {previewData.has_time_column ? '是' : '否'}</p>
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <BarChart3 className="h-5 w-5 text-purple-500" />
              <span className="font-medium text-purple-900">质量信息</span>
            </div>
            <div className="text-sm text-purple-700">
              <p>CF合规: {previewData.statistics?.cf_compliant ? '是' : '否'}</p>
              <p>质量评分: {previewData.statistics?.quality_score || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* 列映射配置 */}
        {previewData.columns && previewData.columns.length > 0 && (
          <div>
            <h3 className="font-medium text-gray-900 mb-3">列映射配置</h3>
            <div className="border border-gray-200 rounded-lg p-4 space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  为每个列选择其类型和作用。坐标列用于定义数据的维度（时间、空间等），变量列包含实际的观测数据。
                </p>
                {previewData.columns?.some(col => col.toLowerCase().includes('date')) && 
                 previewData.columns?.some(col => col.toLowerCase().includes('time')) && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800">
                      💡 <strong>提示</strong>：检测到单独的日期和时间列。如果需要合并为完整的时间戳，建议：
                    </p>
                    <ul className="text-xs text-amber-700 mt-1 ml-4 list-disc">
                      <li>将date列设为"忽略"</li>
                      <li>将time列设为"时间坐标"</li>
                      <li>或者两列都保留为变量，在后续处理中合并</li>
                    </ul>
                  </div>
                )}
              </div>
              
              <div className="space-y-3">
                {previewData.columns.map((column, index) => {
                  const columnLower = column.toLowerCase()
                  let suggestion = ''
                  
                  // 生成建议文本
                  if (columnLower.includes('time') || columnLower.includes('date')) {
                    suggestion = '建议：时间坐标'
                  } else if (columnLower.includes('depth') || columnLower.includes('level')) {
                    suggestion = '建议：深度坐标'  
                  } else if (columnLower.includes('temp')) {
                    suggestion = '建议：温度变量'
                  } else if (columnLower.includes('sal')) {
                    suggestion = '建议：盐度变量'
                  }
                  
                  return (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-center p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-sm">
                        {column}
                        <span className="text-xs text-gray-500 block">
                          {previewData.data_types?.[column] || 'unknown'}
                        </span>
                        {suggestion && (
                          <span className="text-xs text-blue-600 block mt-1">
                            💡 {suggestion}
                          </span>
                        )}
                      </div>
                    
                    <div>
                      <select
                        value={columnMapping[column]?.type || 'variable'}
                        onChange={(e) => updateColumnMapping(column, { 
                          type: e.target.value as 'coordinate' | 'variable' | 'ignore',
                          ...(e.target.value === 'coordinate' ? { dimension: 'other' } : {})
                        })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="coordinate">坐标</option>
                        <option value="variable">变量</option>
                        <option value="ignore">忽略</option>
                      </select>
                    </div>
                    
                    {columnMapping[column]?.type === 'coordinate' && (
                      <div>
                        <select
                          value={columnMapping[column]?.dimension || 'other'}
                          onChange={(e) => updateColumnMapping(column, { 
                            dimension: e.target.value as any,
                            standardName: e.target.value !== 'other' ? e.target.value : column.toLowerCase()
                          })}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        >
                          {getDimensionOptions().map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    
                    {columnMapping[column]?.type !== 'ignore' && (
                      <>
                        <div>
                          <input
                            type="text"
                            placeholder="标准名称"
                            value={columnMapping[column]?.standardName || ''}
                            onChange={(e) => updateColumnMapping(column, { standardName: e.target.value })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            list={`standards-${index}`}
                          />
                          <datalist id={`standards-${index}`}>
                            {getStandardNameSuggestions(
                              columnMapping[column]?.type || 'variable',
                              columnMapping[column]?.dimension
                            ).map(suggestion => (
                              <option key={suggestion} value={suggestion} />
                            ))}
                          </datalist>
                        </div>
                        
                        <div>
                          <input
                            type="text"
                            placeholder="单位"
                            value={columnMapping[column]?.units || ''}
                            onChange={(e) => updateColumnMapping(column, { units: e.target.value })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </>
                    )}
                    
                    {columnMapping[column]?.type === 'ignore' && (
                      <div className="col-span-3 text-sm text-gray-500 italic">
                        此列将在转换时被忽略
                      </div>
                    )}
                    </div>
                  )
                })}
              </div>
              
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">映射统计</h4>
                <div className="text-sm text-blue-700 space-y-1">
                  <p>坐标列: {Object.values(columnMapping).filter(m => m.type === 'coordinate').length}</p>
                  <p>变量列: {Object.values(columnMapping).filter(m => m.type === 'variable').length}</p>
                  <p>忽略列: {Object.values(columnMapping).filter(m => m.type === 'ignore').length}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 样本数据表格（如果有的话） */}
        {previewData.sample_data && previewData.sample_data.length > 0 && (
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-medium text-gray-900">数据样本预览</h3>
              {previewData.columns && previewData.columns.length > 8 && (
                <button
                  onClick={() => setShowAllColumns(!showAllColumns)}
                  className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  {showAllColumns ? `显示前8列` : `显示全部${previewData.columns.length}列`}
                </button>
              )}
            </div>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto max-h-96">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      {(showAllColumns ? previewData.columns : previewData.columns?.slice(0, 8))?.map((column, index) => (
                        <th
                          key={index}
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                        >
                          {column}
                        </th>
                      ))}
                      {!showAllColumns && previewData.columns && previewData.columns.length > 8 && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ...
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {previewData.sample_data.slice(0, 50).map((row, rowIndex) => (
                      <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        {(showAllColumns ? previewData.columns : previewData.columns?.slice(0, 8))?.map((column, colIndex) => (
                          <td
                            key={colIndex}
                            className="px-4 py-2 text-sm text-gray-900 whitespace-nowrap"
                            title={String(row[column] || '')}
                          >
                            {String(row[column] || '-').slice(0, 20)}
                            {String(row[column] || '').length > 20 && '...'}
                          </td>
                        ))}
                        {!showAllColumns && previewData.columns && previewData.columns.length > 8 && (
                          <td className="px-4 py-2 text-sm text-gray-500">
                            ...
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex justify-between items-center mt-2">
              <p className="text-sm text-gray-500">
                显示前{Math.min(50, previewData.sample_data.length)}行，
                {showAllColumns ? `全部${previewData.columns?.length || 0}列` : `前${Math.min(8, previewData.columns?.length || 0)}列`}，
                共{previewData.total_rows}行数据
              </p>
              {previewData.sample_data.length > 50 && (
                <p className="text-xs text-blue-600">
                  表格限制显示前50行，完整数据可在后续步骤中查看
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">数据预览</h2>
        <p className="text-gray-600">
          查看和验证数据内容，确认数据结构和格式。
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-600 mb-2">正在处理和分析数据...</p>
            {taskStatus && (
              <p className="text-sm text-blue-600 mb-2">{taskStatus}</p>
            )}
            <p className="text-sm text-gray-500">
              已等待 {Math.floor(retryCount * 2 / 60)}分{(retryCount * 2) % 60}秒
              {retryCount > 60 && ' (大文件处理可能需要更长时间)'}
            </p>
            {retryCount > 120 && (
              <p className="text-xs text-orange-600 mt-2">
                处理时间较长，请耐心等待或检查网络连接
              </p>
            )}
            {retryCount > 10 && (
              <div className="mt-4 space-x-3">
                <button
                  onClick={() => {
                    stopPolling()
                    setError('处理已取消。建议检查文件格式或尝试使用示例文件测试。')
                  }}
                  className="px-4 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                >
                  取消处理
                </button>
                <button
                  onClick={() => {
                    // 使用模拟数据跳过卡住的处理
                    const mockPreviewData: PreviewData = {
                      columns: ['时间', '深度', '温度', '盐度'],
                      total_rows: 84,
                      has_coordinates: false,
                      has_time_column: false,
                      detected_variables: ['id', 'temperature', 'depth', 'salinity'],
                      statistics: {
                        file_size: 17995,
                        cf_compliant: true,
                        quality_score: 85
                      }
                    }
                    setPreviewData(mockPreviewData)
                    updateWizardData({ previewData: mockPreviewData })
                    setLoading(false)
                    setTaskStatus('')
                  }}
                  className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  跳过并继续
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="border border-red-200 rounded-lg p-4 bg-red-50">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-6 w-6 text-red-500 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-700 mb-2">{error}</p>
              <div className="text-sm text-red-600 space-y-1">
                <p>可能的解决方案：</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  {error.includes('编码错误') ? (
                    <>
                      <li>将文件另存为UTF-8编码格式</li>
                      <li>在Excel中打开文件，选择"另存为" → "CSV UTF-8(逗号分隔)"</li>
                      <li>使用文本编辑器(如Notepad++)将文件编码转换为UTF-8</li>
                      <li>检查文件是否包含特殊字符或中文字符</li>
                    </>
                  ) : error.includes('卡在') || error.includes('数据库') ? (
                    <>
                      <li>这是已知的后端数据库时间格式问题</li>
                      <li>文件转换实际上可能已经完成</li>
                      <li>可以点击"使用模拟数据继续"来测试后续功能</li>
                      <li>或者确保CSV文件包含有效的时间列（格式如：YYYY-MM-DD HH:MM:SS）</li>
                      <li>检查时间列是否有空值或无效数据</li>
                      <li>联系系统管理员修复数据库时间字段处理问题</li>
                    </>
                  ) : (
                    <>
                      <li>检查文件格式是否正确 (支持 CSV, TXT, CNV, NetCDF)</li>
                      <li>确保文件内容完整且格式规范</li>
                      <li>尝试使用较小的测试文件</li>
                      <li>检查网络连接是否稳定</li>
                    </>
                  )}
                </ul>
              </div>
              <div className="mt-3 space-x-3">
                <button
                  onClick={() => {
                    setRetryCount(0)
                    setTaskStatus('')
                    loadPreviewData()
                  }}
                  className="text-sm text-red-600 hover:text-red-800 underline"
                >
                  重新处理
                </button>
                <button
                  onClick={() => {
                    // 重置到上传步骤
                    window.location.reload()
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  重新上传文件
                </button>
                {error.includes('卡在') && (
                  <>
                    <button
                      onClick={() => {
                        // 创建示例CSV文件供下载
                        const csvContent = `时间,纬度,经度,温度,盐度
2024-01-01 00:00:00,39.90,116.40,15.2,34.5
2024-01-01 01:00:00,39.91,116.41,15.1,34.6
2024-01-01 02:00:00,39.92,116.42,15.0,34.7`
                        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
                        const link = document.createElement('a')
                        link.href = URL.createObjectURL(blob)
                        link.download = 'sample_ocean_data.csv'
                        link.click()
                      }}
                      className="text-sm text-green-600 hover:text-green-800 underline"
                    >
                      下载示例文件
                    </button>
                    <button
                      onClick={() => {
                        // 使用模拟数据跳过处理
                        const mockPreviewData: PreviewData = {
                          columns: ['时间', '纬度', '经度', '温度', '盐度'],
                          total_rows: 1000,
                          has_coordinates: true,
                          has_time_column: true,
                          detected_variables: ['time', 'latitude', 'longitude', 'temperature', 'salinity'],
                          statistics: {
                            file_size: 52428,
                            cf_compliant: true,
                            quality_score: 85
                          }
                        }
                        setPreviewData(mockPreviewData)
                        updateWizardData({ previewData: mockPreviewData })
                        setLoading(false)
                        setError(null)
                      }}
                      className="text-sm text-purple-600 hover:text-purple-800 underline"
                    >
                      使用模拟数据继续
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {previewData && renderDataPreview()}

      {!loading && !error && !previewData && (
        <div className="text-center py-8">
          <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">等待数据处理完成...</p>
        </div>
      )}
    </div>
  )
}

export default PreviewStep