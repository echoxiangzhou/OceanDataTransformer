import React, { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, Edit3, Save, X, Check, AlertCircle, Database, Plus, Trash2 } from 'lucide-react'

interface VariableMapping {
  columnName: string
  type: 'coordinate' | 'variable' | 'ignore'
  dimension?: 'time' | 'latitude' | 'longitude' | 'depth' | 'other'
  standardName?: string
  units?: string
  longName?: string
  description?: string
  dataType?: string
  fillValue?: string | number
}

interface VariableSettingsFormProps {
  previewData?: any
  columnMapping?: { [key: string]: VariableMapping }
  onColumnMappingUpdate: (mapping: { [key: string]: VariableMapping }) => void
}

const VariableSettingsForm: React.FC<VariableSettingsFormProps> = ({
  previewData,
  columnMapping = {},
  onColumnMappingUpdate
}) => {
  const [isExpanded, setIsExpanded] = useState(true)
  const [mappings, setMappings] = useState<{ [key: string]: VariableMapping }>({})
  const [editingVariable, setEditingVariable] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<VariableMapping | null>(null)

  // 初始化列映射
  useEffect(() => {
    if (previewData?.columns && Object.keys(mappings).length === 0) {
      const initialMappings: { [key: string]: VariableMapping } = {}
      
      previewData.columns.forEach((column: string) => {
        const existing = columnMapping[column]
        if (existing) {
          initialMappings[column] = existing
        } else {
          // 智能推断列类型
          const inferredMapping = inferColumnType(column)
          initialMappings[column] = {
            columnName: column,
            type: inferredMapping.type,
            dimension: inferredMapping.dimension,
            standardName: inferredMapping.standardName,
            units: inferredMapping.units,
            longName: column.replace(/_/g, ' '),
            dataType: previewData.data_types?.[column] || 'unknown'
          }
        }
      })
      
      setMappings(initialMappings)
      onColumnMappingUpdate(initialMappings)
    }
  }, [previewData, columnMapping, mappings, onColumnMappingUpdate])

  // 智能推断列类型
  const inferColumnType = (columnName: string): Partial<VariableMapping> => {
    const name = columnName.toLowerCase()
    
    // 时间相关
    if (name.includes('time') || name.includes('date') || name === 't') {
      return {
        type: 'coordinate',
        dimension: 'time',
        standardName: 'time',
        units: 'days since 1900-01-01'
      }
    }
    
    // 纬度
    if (name.includes('lat') || name === 'y') {
      return {
        type: 'coordinate',
        dimension: 'latitude',
        standardName: 'latitude',
        units: 'degrees_north'
      }
    }
    
    // 经度
    if (name.includes('lon') || name === 'x') {
      return {
        type: 'coordinate',
        dimension: 'longitude',
        standardName: 'longitude',
        units: 'degrees_east'
      }
    }
    
    // 深度
    if (name.includes('depth') || name.includes('level') || name === 'z') {
      return {
        type: 'coordinate',
        dimension: 'depth',
        standardName: 'depth',
        units: 'm'
      }
    }
    
    // 温度
    if (name.includes('temp') || name.includes('temperature')) {
      return {
        type: 'variable',
        standardName: 'sea_water_temperature',
        units: 'degree_C'
      }
    }
    
    // 盐度
    if (name.includes('sal') || name.includes('salinity')) {
      return {
        type: 'variable',
        standardName: 'sea_water_salinity',
        units: 'psu'
      }
    }
    
    // 默认为数据变量
    return {
      type: 'variable',
      standardName: '',
      units: ''
    }
  }

  // 开始编辑变量
  const startEditVariable = (columnName: string) => {
    setEditingVariable(columnName)
    setEditValues({ ...mappings[columnName] })
  }

  // 保存编辑
  const saveVariableEdit = () => {
    if (editingVariable && editValues) {
      const newMappings = {
        ...mappings,
        [editingVariable]: editValues
      }
      setMappings(newMappings)
      onColumnMappingUpdate(newMappings)
      setEditingVariable(null)
      setEditValues(null)
    }
  }

  // 取消编辑
  const cancelVariableEdit = () => {
    setEditingVariable(null)
    setEditValues(null)
  }

  // 更新编辑值
  const updateEditValue = (field: string, value: any) => {
    if (editValues) {
      setEditValues({ ...editValues, [field]: value })
    }
  }

  // 删除变量映射
  const removeVariable = (columnName: string) => {
    const newMappings = { ...mappings }
    delete newMappings[columnName]
    setMappings(newMappings)
    onColumnMappingUpdate(newMappings)
  }

  // 获取类型颜色
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'coordinate': return 'text-blue-600 bg-blue-100'
      case 'variable': return 'text-green-600 bg-green-100'
      case 'ignore': return 'text-gray-600 bg-gray-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  // 获取类型文本
  const getTypeText = (type: string) => {
    switch (type) {
      case 'coordinate': return '坐标变量'
      case 'variable': return '数据变量'
      case 'ignore': return '忽略'
      default: return '未知'
    }
  }

  // 统计信息
  const stats = {
    coordinates: Object.values(mappings).filter(m => m.type === 'coordinate').length,
    variables: Object.values(mappings).filter(m => m.type === 'variable').length,
    ignored: Object.values(mappings).filter(m => m.type === 'ignore').length,
    total: Object.keys(mappings).length
  }

  if (!previewData?.columns) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="text-center text-gray-500">
          <Database className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p>没有找到数据列信息</p>
          <p className="text-sm">请先完成数据预览步骤</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      {/* 标题栏 */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer border-b border-gray-200"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3">
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronRight className="h-5 w-5 text-gray-500" />
          )}
          <Database className="h-5 w-5 text-blue-500" />
          <h3 className="text-lg font-semibold text-gray-900">
            变量设置
          </h3>
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
            {stats.total} 列
          </span>
        </div>
        
        {/* 统计信息 */}
        <div className="flex items-center space-x-4 text-sm">
          <span className="flex items-center">
            <span className="w-3 h-3 bg-blue-500 rounded-full mr-1"></span>
            坐标: {stats.coordinates}
          </span>
          <span className="flex items-center">
            <span className="w-3 h-3 bg-green-500 rounded-full mr-1"></span>
            变量: {stats.variables}
          </span>
          <span className="flex items-center">
            <span className="w-3 h-3 bg-gray-500 rounded-full mr-1"></span>
            忽略: {stats.ignored}
          </span>
        </div>
      </div>

      {/* 详细内容 */}
      {isExpanded && (
        <div className="p-4">
          {/* 操作提示 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">变量设置说明</p>
                <ul className="space-y-1 text-xs">
                  <li>• <strong>坐标变量</strong>：时间、纬度、经度、深度等维度信息</li>
                  <li>• <strong>数据变量</strong>：实际的观测数据，如温度、盐度等</li>
                  <li>• <strong>忽略</strong>：不需要包含在NetCDF文件中的列</li>
                  <li>• 系统已根据列名智能推断变量类型，您可以根据需要调整</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 变量列表 */}
          <div className="space-y-3">
            {Object.entries(mappings).map(([columnName, mapping]) => (
              <div key={columnName} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-medium text-gray-900">{columnName}</h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(mapping.type)}`}>
                        {getTypeText(mapping.type)}
                      </span>
                      {mapping.dimension && (
                        <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-700">
                          {mapping.dimension}
                        </span>
                      )}
                    </div>
                    
                    {editingVariable === columnName ? (
                      // 编辑模式
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              变量类型 *
                            </label>
                            <select
                              value={editValues?.type || 'variable'}
                              onChange={(e) => updateEditValue('type', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="coordinate">坐标变量</option>
                              <option value="variable">数据变量</option>
                              <option value="ignore">忽略</option>
                            </select>
                          </div>
                          
                          {editValues?.type === 'coordinate' && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                维度类型
                              </label>
                              <select
                                value={editValues?.dimension || 'other'}
                                onChange={(e) => updateEditValue('dimension', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="time">时间</option>
                                <option value="latitude">纬度</option>
                                <option value="longitude">经度</option>
                                <option value="depth">深度</option>
                                <option value="other">其他</option>
                              </select>
                            </div>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              CF标准名称
                            </label>
                            <input
                              type="text"
                              value={editValues?.standardName || ''}
                              onChange={(e) => updateEditValue('standardName', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="CF standard name"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              单位
                            </label>
                            <input
                              type="text"
                              value={editValues?.units || ''}
                              onChange={(e) => updateEditValue('units', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="单位"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            完整名称
                          </label>
                          <input
                            type="text"
                            value={editValues?.longName || ''}
                            onChange={(e) => updateEditValue('longName', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="变量的完整描述名称"
                          />
                        </div>
                        
                        <div className="flex space-x-2">
                          <button
                            onClick={saveVariableEdit}
                            className="flex items-center px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            保存
                          </button>
                          <button
                            onClick={cancelVariableEdit}
                            className="flex items-center px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
                          >
                            <X className="h-4 w-4 mr-1" />
                            取消
                          </button>
                        </div>
                      </div>
                    ) : (
                      // 显示模式
                      <div className="space-y-1 text-sm text-gray-600">
                        {mapping.standardName && (
                          <div><strong>CF名称:</strong> {mapping.standardName}</div>
                        )}
                        {mapping.units && (
                          <div><strong>单位:</strong> {mapping.units}</div>
                        )}
                        {mapping.longName && (
                          <div><strong>描述:</strong> {mapping.longName}</div>
                        )}
                        <div><strong>数据类型:</strong> {mapping.dataType}</div>
                      </div>
                    )}
                  </div>
                  
                  {editingVariable !== columnName && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => startEditVariable(columnName)}
                        className="flex items-center px-2 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                      >
                        <Edit3 className="h-4 w-4 mr-1" />
                        编辑
                      </button>
                      <button
                        onClick={() => removeVariable(columnName)}
                        className="flex items-center px-2 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default VariableSettingsForm