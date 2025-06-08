import React, { useState, useEffect } from 'react'
import {
  X,
  Save,
  Plus,
  Trash2,
  Settings,
  Tag,
  AlertCircle,
  Info,
  Code,
  RefreshCw
} from 'lucide-react'
import { Algorithm, AlgorithmParameter, algorithmService } from '../services/algorithmService'

interface AlgorithmEditProps {
  algorithm: Algorithm
  onClose: () => void
  onSave: (updatedAlgorithm: Algorithm) => void
}

const AlgorithmEdit: React.FC<AlgorithmEditProps> = ({
  algorithm,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState({
    name: algorithm.name,
    version: algorithm.version,
    description: algorithm.description,
    category: algorithm.category,
    language: algorithm.language,
    author: algorithm.author,
    institution: algorithm.institution || '',
    tags: [...(algorithm.tags || [])],
    input_formats: [...(algorithm.input_formats || [])],
    output_formats: [...(algorithm.output_formats || [])],
    parameters: [...(algorithm.parameters || [])],
    is_public: algorithm.is_public,
    source_code: algorithm.source_code || ''
  })

  const [newTag, setNewTag] = useState('')
  const [newInputFormat, setNewInputFormat] = useState('')
  const [newOutputFormat, setNewOutputFormat] = useState('')
  const [newParameter, setNewParameter] = useState<Partial<AlgorithmParameter>>({
    name: '',
    type: 'string',
    description: '',
    required: false,
    default_value: '',
    options: []
  })
  const [showParameterForm, setShowParameterForm] = useState(false)
  const [editingParameterIndex, setEditingParameterIndex] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loadingSourceCode, setLoadingSourceCode] = useState(false)

  // 算法分类选项
  const categoryOptions = [
    { value: 'visualization', label: '数据可视化' },
    { value: 'analysis', label: '数据分析' },
    { value: 'preprocessing', label: '数据预处理' },
    { value: 'ml_inference', label: '机器学习推理' }
  ]

  // 编程语言选项
  const languageOptions = [
    { value: 'python', label: 'Python' },
    { value: 'r', label: 'R' },
    { value: 'matlab', label: 'MATLAB' }
  ]

  // 参数类型选项
  const parameterTypes = [
    { value: 'string', label: '字符串' },
    { value: 'number', label: '数字' },
    { value: 'boolean', label: '布尔值' },
    { value: 'select', label: '选择项' },
    { value: 'file', label: '文件' }
  ]

  // 常用输入格式
  const commonInputFormats = ['NetCDF', 'HDF5', 'CSV', 'JSON', 'GRIB', 'TIFF', 'GeoTIFF']
  
  // 常用输出格式  
  const commonOutputFormats = ['PNG', 'SVG', 'PDF', 'HTML', 'JSON', 'CSV', 'NetCDF', 'GIF', 'MP4']

  // 加载源代码
  const loadSourceCode = async () => {
    if (loadingSourceCode) return
    
    setLoadingSourceCode(true)
    try {
      const sourceCode = await algorithmService.getAlgorithmSourceCode(algorithm.id.toString())
      setFormData(prev => ({ ...prev, source_code: sourceCode || '' }))
    } catch (error) {
      console.error('Failed to load source code:', error)
      alert('加载源代码失败')
    } finally {
      setLoadingSourceCode(false)
    }
  }

  // 组件加载时如果源代码为空，尝试加载
  useEffect(() => {
    if (!algorithm.source_code || algorithm.source_code.trim() === '') {
      loadSourceCode()
    }
  }, [algorithm.id])

  // 验证表单
  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = '算法名称不能为空'
    }
    if (!formData.version.trim()) {
      newErrors.version = '版本号不能为空'
    }
    if (!formData.description.trim()) {
      newErrors.description = '算法描述不能为空'
    }
    if (!formData.author.trim()) {
      newErrors.author = '作者不能为空'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 添加标签
  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }))
      setNewTag('')
    }
  }

  // 移除标签
  const removeTag = (index: number) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index)
    }))
  }

  // 添加输入格式
  const addInputFormat = () => {
    if (newInputFormat.trim() && !formData.input_formats.includes(newInputFormat.trim())) {
      setFormData(prev => ({
        ...prev,
        input_formats: [...prev.input_formats, newInputFormat.trim()]
      }))
      setNewInputFormat('')
    }
  }

  // 快速添加输入格式
  const quickAddInputFormat = (format: string) => {
    if (!formData.input_formats.includes(format)) {
      setFormData(prev => ({
        ...prev,
        input_formats: [...prev.input_formats, format]
      }))
    }
  }

  // 移除输入格式
  const removeInputFormat = (index: number) => {
    setFormData(prev => ({
      ...prev,
      input_formats: prev.input_formats.filter((_, i) => i !== index)
    }))
  }

  // 添加输出格式
  const addOutputFormat = () => {
    if (newOutputFormat.trim() && !formData.output_formats.includes(newOutputFormat.trim())) {
      setFormData(prev => ({
        ...prev,
        output_formats: [...prev.output_formats, newOutputFormat.trim()]
      }))
      setNewOutputFormat('')
    }
  }

  // 快速添加输出格式
  const quickAddOutputFormat = (format: string) => {
    if (!formData.output_formats.includes(format)) {
      setFormData(prev => ({
        ...prev,
        output_formats: [...prev.output_formats, format]
      }))
    }
  }

  // 移除输出格式
  const removeOutputFormat = (index: number) => {
    setFormData(prev => ({
      ...prev,
      output_formats: prev.output_formats.filter((_, i) => i !== index)
    }))
  }

  // 添加或更新参数
  const saveParameter = () => {
    if (!newParameter.name || !newParameter.description) {
      alert('参数名称和描述不能为空')
      return
    }

    const parameterData: AlgorithmParameter = {
      name: newParameter.name!,
      type: newParameter.type as any,
      description: newParameter.description!,
      required: newParameter.required || false,
      default_value: newParameter.default_value,
      options: newParameter.options || []
    }

    setFormData(prev => {
      const newParameters = [...prev.parameters]
      if (editingParameterIndex !== null) {
        newParameters[editingParameterIndex] = parameterData
      } else {
        newParameters.push(parameterData)
      }
      return { ...prev, parameters: newParameters }
    })

    // 重置表单
    setNewParameter({
      name: '',
      type: 'string',
      description: '',
      required: false,
      default_value: '',
      options: []
    })
    setShowParameterForm(false)
    setEditingParameterIndex(null)
  }

  // 编辑参数
  const editParameter = (index: number) => {
    const param = formData.parameters[index]
    setNewParameter({
      name: param.name,
      type: param.type,
      description: param.description,
      required: param.required,
      default_value: param.default_value,
      options: param.options || []
    })
    setEditingParameterIndex(index)
    setShowParameterForm(true)
  }

  // 删除参数
  const removeParameter = (index: number) => {
    setFormData(prev => ({
      ...prev,
      parameters: prev.parameters.filter((_, i) => i !== index)
    }))
  }

  // 添加参数选项
  const addParameterOption = (option: string) => {
    if (option.trim() && !(newParameter.options || []).includes(option.trim())) {
      setNewParameter(prev => ({
        ...prev,
        options: [...(prev.options || []), option.trim()]
      }))
    }
  }

  // 移除参数选项
  const removeParameterOption = (index: number) => {
    setNewParameter(prev => ({
      ...prev,
      options: (prev.options || []).filter((_, i) => i !== index)
    }))
  }

  // 保存算法
  const handleSave = async () => {
    if (!validateForm()) {
      return
    }

    setSaving(true)
    try {
      // 构建更新数据，排除不应该在更新请求中的字段
      const { id, ...updateData } = formData as any
      
      // 清理参数数据，确保符合后端期望的格式
      const cleanParameters = updateData.parameters
        .filter((param: any) => param.name && param.name.trim()) // 只保留有名称的参数
        .map((param: any) => ({
          name: param.name.trim(),
          type: param.type || 'string',
          description: param.description?.trim() || '',
          required: Boolean(param.required),
          default_value: param.default_value === null || param.default_value === '' ? undefined : param.default_value,
          options: param.options && Array.isArray(param.options) && param.options.length > 0 ? param.options : undefined,
          validation: param.validation?.trim() || undefined
        }))
      
      // 移除其他不应该更新的字段
      const rawUpdateData = {
        name: updateData.name?.trim(),
        version: updateData.version?.trim(),
        description: updateData.description?.trim(),
        category: updateData.category,
        language: updateData.language,
        author: updateData.author?.trim(),
        institution: updateData.institution?.trim() || null,
        tags: updateData.tags || [],
        input_formats: updateData.input_formats || [],
        output_formats: updateData.output_formats || [],
        parameters: cleanParameters,
        is_public: Boolean(updateData.is_public),
        source_code: updateData.source_code || null
      }
      
      // 移除 undefined 值以避免 JSON 序列化问题
      const cleanUpdateData = Object.fromEntries(
        Object.entries(rawUpdateData).filter(([_, value]) => value !== undefined)
      )

      // 调用实际的API更新算法
      const updatedAlgorithm = await algorithmService.updateAlgorithm(algorithm.id.toString(), cleanUpdateData)

      onSave(updatedAlgorithm)
      alert('算法更新成功！')
      onClose()
    } catch (error: any) {
      console.error('保存失败:', error)
      let errorMessage = '保存失败，请稍后重试'
      
      if (error?.response?.data?.detail) {
        errorMessage = `保存失败: ${error.response.data.detail}`
      } else if (error?.message) {
        errorMessage = `保存失败: ${error.message}`
      }
      
      alert(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
        </div>
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
          {/* 头部 */}
          <div className="bg-white px-6 pt-6 pb-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">编辑算法</h2>
                <p className="text-sm text-gray-600 mt-1">{algorithm.name} v{algorithm.version}</p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
                disabled={saving}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* 内容区域 */}
          <div className="bg-white px-6 py-6 max-h-[70vh] overflow-y-auto">
            <div className="space-y-8">
              {/* 基本信息 */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Info className="h-5 w-5 mr-2" />
                  基本信息
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      算法名称 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-ocean-500 focus:border-ocean-500 ${
                        errors.name ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="输入算法名称"
                    />
                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      版本号 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.version}
                      onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-ocean-500 focus:border-ocean-500 ${
                        errors.version ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="例如: v1.0.0"
                    />
                    {errors.version && <p className="text-red-500 text-xs mt-1">{errors.version}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      作者 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.author}
                      onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-ocean-500 focus:border-ocean-500 ${
                        errors.author ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="输入作者姓名"
                    />
                    {errors.author && <p className="text-red-500 text-xs mt-1">{errors.author}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      所属机构
                    </label>
                    <input
                      type="text"
                      value={formData.institution}
                      onChange={(e) => setFormData(prev => ({ ...prev, institution: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                      placeholder="输入所属机构"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      算法分类
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                    >
                      {categoryOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      编程语言
                    </label>
                    <select
                      value={formData.language}
                      onChange={(e) => setFormData(prev => ({ ...prev, language: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                    >
                      {languageOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    算法描述 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-ocean-500 focus:border-ocean-500 ${
                      errors.description ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="详细描述算法的功能和用途"
                  />
                  {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
                </div>

                <div className="mt-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_public}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_public: e.target.checked }))}
                      className="h-4 w-4 text-ocean-600 focus:ring-ocean-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">公开算法（其他用户可见）</span>
                  </label>
                </div>
              </div>

              {/* 标签管理 */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Tag className="h-5 w-5 mr-2" />
                  标签管理
                </h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  {formData.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                    >
                      #{tag}
                      <button
                        onClick={() => removeTag(index)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTag()}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                    placeholder="输入新标签"
                  />
                  <button
                    onClick={addTag}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* 输入格式管理 */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">输入格式</h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  {formData.input_formats.map((format, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800"
                    >
                      {format}
                      <button
                        onClick={() => removeInputFormat(index)}
                        className="ml-2 text-green-600 hover:text-green-800"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newInputFormat}
                    onChange={(e) => setNewInputFormat(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addInputFormat()}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                    placeholder="输入支持的输入格式"
                  />
                  <button
                    onClick={addInputFormat}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm text-gray-500">常用格式:</span>
                  {commonInputFormats.map(format => (
                    <button
                      key={format}
                      onClick={() => quickAddInputFormat(format)}
                      disabled={formData.input_formats.includes(format)}
                      className={`text-xs px-2 py-1 rounded ${
                        formData.input_formats.includes(format)
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {format}
                    </button>
                  ))}
                </div>
              </div>

              {/* 输出格式管理 */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">输出格式</h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  {formData.output_formats.map((format, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800"
                    >
                      {format}
                      <button
                        onClick={() => removeOutputFormat(index)}
                        className="ml-2 text-purple-600 hover:text-purple-800"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newOutputFormat}
                    onChange={(e) => setNewOutputFormat(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addOutputFormat()}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                    placeholder="输入支持的输出格式"
                  />
                  <button
                    onClick={addOutputFormat}
                    className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm text-gray-500">常用格式:</span>
                  {commonOutputFormats.map(format => (
                    <button
                      key={format}
                      onClick={() => quickAddOutputFormat(format)}
                      disabled={formData.output_formats.includes(format)}
                      className={`text-xs px-2 py-1 rounded ${
                        formData.output_formats.includes(format)
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {format}
                    </button>
                  ))}
                </div>
              </div>

              {/* 源代码编辑 */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center justify-between">
                  <span className="flex items-center">
                    <Code className="h-5 w-5 mr-2" />
                    算法源代码
                  </span>
                  <button
                    onClick={loadSourceCode}
                    disabled={loadingSourceCode}
                    className="px-3 py-1 text-sm bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 flex items-center space-x-1"
                  >
                    <RefreshCw className={`h-3 w-3 ${loadingSourceCode ? 'animate-spin' : ''}`} />
                    <span>重新加载</span>
                  </button>
                </h3>
                <div className="border border-gray-300 rounded-lg">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-300 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      {formData.language === 'python' ? 'Python' : 
                       formData.language === 'r' ? 'R' : 
                       formData.language === 'matlab' ? 'MATLAB' : '源代码'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formData.source_code.length} 字符
                      {loadingSourceCode && <span className="ml-2">加载中...</span>}
                    </span>
                  </div>
                  <textarea
                    rows={20}
                    value={formData.source_code}
                    onChange={(e) => setFormData(prev => ({ ...prev, source_code: e.target.value }))}
                    className="w-full px-4 py-3 font-mono text-sm border-0 resize-none focus:ring-ocean-500 focus:border-ocean-500 rounded-b-lg"
                    placeholder={`输入${formData.language === 'python' ? 'Python' : 
                                     formData.language === 'r' ? 'R' : 
                                     formData.language === 'matlab' ? 'MATLAB' : ''}代码...

示例结构：
def run(input_files, output_dir, parameters, output_format):
    """
    算法主函数
    
    Args:
        input_files: 输入文件列表
        output_dir: 输出目录路径
        parameters: 算法参数字典
        output_format: 输出格式
    """
    # 在这里实现你的算法逻辑
    pass`}
                    style={{ minHeight: '400px' }}
                  />
                </div>
                {formData.source_code.length === 0 && (
                  <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex">
                      <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5 mr-2" />
                      <div className="text-sm">
                        <p className="font-medium text-yellow-800">算法源代码为空</p>
                        <p className="text-yellow-700 mt-1">
                          请添加算法的核心实现代码。确保包含一个名为 "run" 的主函数。
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 参数管理 */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center justify-between">
                  <span className="flex items-center">
                    <Settings className="h-5 w-5 mr-2" />
                    参数配置
                  </span>
                  <button
                    onClick={() => setShowParameterForm(true)}
                    className="px-4 py-2 bg-ocean-500 text-white rounded-lg hover:bg-ocean-600 flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>添加参数</span>
                  </button>
                </h3>

                {/* 参数列表 */}
                <div className="space-y-4 mb-6">
                  {formData.parameters.map((param, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <span className="font-medium text-gray-900">{param.name}</span>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                            {param.type}
                          </span>
                          {param.required && (
                            <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">
                              必需
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => editParameter(index)}
                            className="text-blue-500 hover:text-blue-700"
                          >
                            <Settings className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => removeParameter(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{param.description}</p>
                      {param.default_value && (
                        <p className="text-xs text-gray-500">默认值: {param.default_value}</p>
                      )}
                      {param.options && param.options.length > 0 && (
                        <div className="mt-2">
                          <span className="text-xs text-gray-500">选项: </span>
                          {param.options.map((option, i) => (
                            <span key={i} className="text-xs bg-gray-100 text-gray-600 px-1 py-0.5 rounded mr-1">
                              {option}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* 参数表单 */}
                {showParameterForm && (
                  <div className="border border-gray-300 rounded-lg p-6 bg-gray-50">
                    <h4 className="text-md font-medium text-gray-900 mb-4">
                      {editingParameterIndex !== null ? '编辑参数' : '添加新参数'}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          参数名称
                        </label>
                        <input
                          type="text"
                          value={newParameter.name || ''}
                          onChange={(e) => setNewParameter(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                          placeholder="例如: colormap"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          参数类型
                        </label>
                        <select
                          value={newParameter.type || 'string'}
                          onChange={(e) => setNewParameter(prev => ({ ...prev, type: e.target.value as any }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                        >
                          {parameterTypes.map(type => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          参数描述
                        </label>
                        <textarea
                          rows={2}
                          value={newParameter.description || ''}
                          onChange={(e) => setNewParameter(prev => ({ ...prev, description: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                          placeholder="描述参数的作用和用法"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          默认值
                        </label>
                        <input
                          type="text"
                          value={newParameter.default_value || ''}
                          onChange={(e) => setNewParameter(prev => ({ ...prev, default_value: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                          placeholder="设置默认值（可选）"
                        />
                      </div>
                      <div className="flex items-center">
                        <label className="flex items-center mt-6">
                          <input
                            type="checkbox"
                            checked={newParameter.required || false}
                            onChange={(e) => setNewParameter(prev => ({ ...prev, required: e.target.checked }))}
                            className="h-4 w-4 text-ocean-600 focus:ring-ocean-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">必需参数</span>
                        </label>
                      </div>

                      {/* 选项管理（仅用于select类型） */}
                      {newParameter.type === 'select' && (
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            选项列表
                          </label>
                          <div className="flex flex-wrap gap-2 mb-2">
                            {(newParameter.options || []).map((option, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 py-1 rounded text-sm bg-blue-100 text-blue-800"
                              >
                                {option}
                                <button
                                  onClick={() => removeParameterOption(index)}
                                  className="ml-1 text-blue-600 hover:text-blue-800"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  addParameterOption(e.currentTarget.value)
                                  e.currentTarget.value = ''
                                }
                              }}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                              placeholder="输入选项值，按回车添加"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end space-x-3 mt-6">
                      <button
                        onClick={() => {
                          setShowParameterForm(false)
                          setEditingParameterIndex(null)
                          setNewParameter({
                            name: '',
                            type: 'string',
                            description: '',
                            required: false,
                            default_value: '',
                            options: []
                          })
                        }}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                      >
                        取消
                      </button>
                      <button
                        onClick={saveParameter}
                        className="px-4 py-2 bg-ocean-500 text-white rounded-lg hover:bg-ocean-600"
                      >
                        {editingParameterIndex !== null ? '更新参数' : '添加参数'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 底部按钮 */}
          <div className="bg-gray-50 px-6 py-4 flex justify-between">
            <div className="flex items-center text-sm text-gray-500">
              <AlertCircle className="h-4 w-4 mr-1" />
              <span>修改将立即保存到算法库</span>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                disabled={saving}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-ocean-500 text-white rounded-lg hover:bg-ocean-600 disabled:opacity-50 flex items-center space-x-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>保存中...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>保存更改</span>
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

export default AlgorithmEdit