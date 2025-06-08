import React, { useState, useRef } from 'react'
import {
  Upload,
  X,
  Plus,
  FileText,
  Settings,
  Play,
  Download,
  Eye,
  Code,
  Package,
  AlertCircle,
  CheckCircle,
  Trash2,
  Edit3,
  Save,
  Camera,
  Image
} from 'lucide-react'

export interface AlgorithmParameter {
  name: string
  type: 'string' | 'number' | 'boolean' | 'file' | 'select'
  description: string
  required: boolean
  defaultValue?: any
  options?: string[]
  validation?: string
}

interface AlgorithmUploadProps {
  onClose: () => void
  onUpload: (algorithmData: any) => void
}

const AlgorithmUpload: React.FC<AlgorithmUploadProps> = ({ onClose, onUpload }) => {
  const [step, setStep] = useState(1) // 1: 基本信息, 2: 代码和依赖, 3: 参数配置, 4: 预览确认
  const [formData, setFormData] = useState({
    name: '',
    version: '1.0.0',
    description: '',
    category: 'visualization',
    language: 'python',
    author: '',
    institution: '',
    tags: '',
    inputFormats: ['NetCDF'],
    outputFormats: ['PNG'],
    isPublic: true,
    autoContainerize: true
  })

  const [sourceCodeFile, setSourceCodeFile] = useState<File | null>(null)
  const [requirementsFile, setRequirementsFile] = useState<File | null>(null)
  const [documentationFile, setDocumentationFile] = useState<File | null>(null)
  const [parameters, setParameters] = useState<AlgorithmParameter[]>([])
  const [testData, setTestData] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const sourceCodeRef = useRef<HTMLInputElement>(null)
  const requirementsRef = useRef<HTMLInputElement>(null)
  const documentationRef = useRef<HTMLInputElement>(null)
  const testDataRef = useRef<HTMLInputElement>(null)

  // 算法分类选项
  const categories = [
    { value: 'visualization', label: '数据可视化' },
    { value: 'analysis', label: '数据分析' },
    { value: 'preprocessing', label: '数据预处理' },
    { value: 'ml_inference', label: '机器学习推理' },
    { value: 'terrain_inversion', label: '地形反演' },
    { value: 'quality_control', label: '质量控制' }
  ]

  // 支持的文件格式
  const fileFormats = [
    'NetCDF', 'HDF5', 'GRIB', 'CSV', 'JSON', 'TIFF', 'PNG', 'JPG', 'SVG', 'HTML', 'GIF', 'MP4'
  ]

  // 参数类型选项
  const parameterTypes = [
    { value: 'string', label: '字符串' },
    { value: 'number', label: '数值' },
    { value: 'boolean', label: '布尔值' },
    { value: 'file', label: '文件' },
    { value: 'select', label: '选择项' }
  ]

  // 添加新参数
  const addParameter = () => {
    setParameters([...parameters, {
      name: '',
      type: 'string',
      description: '',
      required: false,
      defaultValue: ''
    }])
  }

  // 删除参数
  const removeParameter = (index: number) => {
    setParameters(parameters.filter((_, i) => i !== index))
  }

  // 更新参数
  const updateParameter = (index: number, field: string, value: any) => {
    const updated = [...parameters]
    updated[index] = { ...updated[index], [field]: value }
    setParameters(updated)
  }

  // 文件上传处理
  const handleFileUpload = (type: string, file: File) => {
    switch (type) {
      case 'sourceCode':
        setSourceCodeFile(file)
        break
      case 'requirements':
        setRequirementsFile(file)
        break
      case 'documentation':
        setDocumentationFile(file)
        break
      case 'testData':
        setTestData(file)
        break
    }
  }

  // 提交算法
  const handleSubmit = async () => {
    setIsUploading(true)
    try {
      const algorithmData = {
        ...formData,
        tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
        parameters,
        sourceCode: sourceCodeFile,
        requirements: requirementsFile,
        documentation: documentationFile
      }
      
      await onUpload(algorithmData)
      onClose()
    } catch (error) {
      console.error('上传失败:', error)
    } finally {
      setIsUploading(false)
    }
  }

  // 步骤渲染
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">基本信息</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">算法名称 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                  placeholder="海洋数据可视化算法"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">版本号 *</label>
                <input
                  type="text"
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                  placeholder="1.0.0"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">算法描述 *</label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                placeholder="详细描述算法的功能、用途和特点"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">算法分类 *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">编程语言 *</label>
                <select
                  value={formData.language}
                  onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                >
                  <option value="python">Python</option>
                  <option value="r">R</option>
                  <option value="matlab">MATLAB</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">作者 *</label>
                <input
                  type="text"
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                  placeholder="您的姓名"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">所属机构</label>
                <input
                  type="text"
                  value={formData.institution}
                  onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                  placeholder="机构或组织名称"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">标签</label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                placeholder="温度,可视化,NetCDF (用逗号分隔)"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">支持的输入格式</label>
                <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                  {fileFormats.slice(0, 6).map(format => (
                    <label key={`input-${format}`} className="flex items-center text-sm">
                      <input
                        type="checkbox"
                        checked={formData.inputFormats.includes(format)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, inputFormats: [...formData.inputFormats, format] })
                          } else {
                            setFormData({ ...formData, inputFormats: formData.inputFormats.filter(f => f !== format) })
                          }
                        }}
                        className="mr-1"
                      />
                      {format}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">支持的输出格式</label>
                <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                  {fileFormats.slice(6).map(format => (
                    <label key={`output-${format}`} className="flex items-center text-sm">
                      <input
                        type="checkbox"
                        checked={formData.outputFormats.includes(format)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, outputFormats: [...formData.outputFormats, format] })
                          } else {
                            setFormData({ ...formData, outputFormats: formData.outputFormats.filter(f => f !== format) })
                          }
                        }}
                        className="mr-1"
                      />
                      {format}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">代码和依赖</h3>
            
            {/* 源代码上传 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">算法源代码 *</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="text-center">
                  <Code className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  {sourceCodeFile ? (
                    <div className="text-sm">
                      <p className="text-green-600 font-medium">已选择: {sourceCodeFile.name}</p>
                      <p className="text-gray-500">大小: {(sourceCodeFile.size / 1024).toFixed(1)} KB</p>
                      <button
                        onClick={() => setSourceCodeFile(null)}
                        className="text-red-500 hover:text-red-700 mt-2"
                      >
                        <X className="h-4 w-4 inline mr-1" />
                        移除
                      </button>
                    </div>
                  ) : (
                    <div>
                      <button
                        onClick={() => sourceCodeRef.current?.click()}
                        className="btn-primary"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        选择源代码文件
                      </button>
                      <p className="text-sm text-gray-500 mt-2">
                        支持 .py, .r, .m, .zip 格式，最大 10MB
                      </p>
                    </div>
                  )}
                </div>
                <input
                  ref={sourceCodeRef}
                  type="file"
                  accept=".py,.r,.m,.zip"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload('sourceCode', e.target.files[0])}
                  className="hidden"
                />
              </div>
            </div>

            {/* 依赖文件上传 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">依赖文件 (可选)</label>
              <div className="border border-gray-300 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Package className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-700">requirements.txt / packages.txt</span>
                  </div>
                  {requirementsFile ? (
                    <div className="text-sm">
                      <span className="text-green-600">{requirementsFile.name}</span>
                      <button
                        onClick={() => setRequirementsFile(null)}
                        className="text-red-500 hover:text-red-700 ml-2"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => requirementsRef.current?.click()}
                      className="btn-secondary text-sm"
                    >
                      选择文件
                    </button>
                  )}
                </div>
                <input
                  ref={requirementsRef}
                  type="file"
                  accept=".txt,.yml,.yaml"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload('requirements', e.target.files[0])}
                  className="hidden"
                />
              </div>
            </div>

            {/* 文档上传 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">算法文档 (可选)</label>
              <div className="border border-gray-300 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-700">README.md / 使用说明</span>
                  </div>
                  {documentationFile ? (
                    <div className="text-sm">
                      <span className="text-green-600">{documentationFile.name}</span>
                      <button
                        onClick={() => setDocumentationFile(null)}
                        className="text-red-500 hover:text-red-700 ml-2"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => documentationRef.current?.click()}
                      className="btn-secondary text-sm"
                    >
                      选择文件
                    </button>
                  )}
                </div>
                <input
                  ref={documentationRef}
                  type="file"
                  accept=".md,.txt,.pdf,.doc,.docx"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload('documentation', e.target.files[0])}
                  className="hidden"
                />
              </div>
            </div>

            {/* 测试数据上传 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">测试数据 (可选)</label>
              <div className="border border-gray-300 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Download className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-700">用于算法测试的示例数据</span>
                  </div>
                  {testData ? (
                    <div className="text-sm">
                      <span className="text-green-600">{testData.name}</span>
                      <button
                        onClick={() => setTestData(null)}
                        className="text-red-500 hover:text-red-700 ml-2"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => testDataRef.current?.click()}
                      className="btn-secondary text-sm"
                    >
                      选择文件
                    </button>
                  )}
                </div>
                <input
                  ref={testDataRef}
                  type="file"
                  accept=".nc,.hdf5,.csv,.json"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload('testData', e.target.files[0])}
                  className="hidden"
                />
              </div>
            </div>

            {/* 容器化选项 */}
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-blue-900">Docker 容器化</h4>
                  <p className="text-sm text-blue-700 mt-1">自动将算法打包为 Docker 容器，确保运行环境一致性</p>
                </div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.autoContainerize}
                    onChange={(e) => setFormData({ ...formData, autoContainerize: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-blue-900">启用自动容器化</span>
                </label>
              </div>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">算法参数配置</h3>
              <button
                onClick={addParameter}
                className="btn-secondary flex items-center space-x-1"
              >
                <Plus className="h-4 w-4" />
                <span>添加参数</span>
              </button>
            </div>

            <div className="space-y-4">
              {parameters.map((param, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-gray-900">参数 {index + 1}</h4>
                    <button
                      onClick={() => removeParameter(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">参数名称</label>
                      <input
                        type="text"
                        value={param.name}
                        onChange={(e) => updateParameter(index, 'name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                        placeholder="variable_type"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">参数类型</label>
                      <select
                        value={param.type}
                        onChange={(e) => updateParameter(index, 'type', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                      >
                        {parameterTypes.map(type => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">参数描述</label>
                    <input
                      type="text"
                      value={param.description}
                      onChange={(e) => updateParameter(index, 'description', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                      placeholder="描述这个参数的用途"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">默认值</label>
                      <input
                        type={param.type === 'number' ? 'number' : 'text'}
                        value={param.defaultValue || ''}
                        onChange={(e) => updateParameter(index, 'defaultValue', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                        placeholder="默认值"
                      />
                    </div>
                    <div className="flex items-center pt-6">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={param.required}
                          onChange={(e) => updateParameter(index, 'required', e.target.checked)}
                          className="h-4 w-4 text-ocean-600 focus:ring-ocean-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">必需参数</span>
                      </label>
                    </div>
                  </div>

                  {param.type === 'select' && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">选项列表 (用逗号分隔)</label>
                      <input
                        type="text"
                        value={param.options?.join(',') || ''}
                        onChange={(e) => updateParameter(index, 'options', e.target.value.split(',').map(s => s.trim()))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                        placeholder="选项1,选项2,选项3"
                      />
                    </div>
                  )}
                </div>
              ))}

              {parameters.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <Settings className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">暂无参数配置</p>
                  <p className="text-sm text-gray-400">点击"添加参数"为算法配置输入参数</p>
                </div>
              )}
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">预览和确认</h3>
            
            <div className="bg-gray-50 rounded-lg p-6">
              <h4 className="font-medium text-gray-900 mb-4">算法信息摘要</h4>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">名称:</span>
                  <span className="ml-2">{formData.name}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">版本:</span>
                  <span className="ml-2">v{formData.version}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">分类:</span>
                  <span className="ml-2">{categories.find(c => c.value === formData.category)?.label}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">语言:</span>
                  <span className="ml-2">{formData.language.toUpperCase()}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">作者:</span>
                  <span className="ml-2">{formData.author}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">机构:</span>
                  <span className="ml-2">{formData.institution || '未填写'}</span>
                </div>
              </div>

              <div className="mt-4">
                <span className="font-medium text-gray-700">描述:</span>
                <p className="mt-1 text-gray-600">{formData.description}</p>
              </div>

              <div className="mt-4">
                <span className="font-medium text-gray-700">标签:</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {formData.tags.split(',').map((tag, index) => (
                    tag.trim() && (
                      <span key={index} className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded">
                        #{tag.trim()}
                      </span>
                    )
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <span className="font-medium text-gray-700">输入格式:</span>
                  <p className="text-gray-600">{formData.inputFormats.join(', ')}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">输出格式:</span>
                  <p className="text-gray-600">{formData.outputFormats.join(', ')}</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">上传的文件</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center">
                  <Code className="h-4 w-4 text-blue-600 mr-2" />
                  <span>源代码: {sourceCodeFile?.name || '未上传'}</span>
                  {sourceCodeFile && <CheckCircle className="h-4 w-4 text-green-500 ml-2" />}
                </div>
                <div className="flex items-center">
                  <Package className="h-4 w-4 text-blue-600 mr-2" />
                  <span>依赖文件: {requirementsFile?.name || '未上传'}</span>
                  {requirementsFile && <CheckCircle className="h-4 w-4 text-green-500 ml-2" />}
                </div>
                <div className="flex items-center">
                  <FileText className="h-4 w-4 text-blue-600 mr-2" />
                  <span>文档: {documentationFile?.name || '未上传'}</span>
                  {documentationFile && <CheckCircle className="h-4 w-4 text-green-500 ml-2" />}
                </div>
                <div className="flex items-center">
                  <Download className="h-4 w-4 text-blue-600 mr-2" />
                  <span>测试数据: {testData?.name || '未上传'}</span>
                  {testData && <CheckCircle className="h-4 w-4 text-green-500 ml-2" />}
                </div>
              </div>
            </div>

            {parameters.length > 0 && (
              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-2">算法参数 ({parameters.length} 个)</h4>
                <div className="space-y-2 text-sm">
                  {parameters.map((param, index) => (
                    <div key={index} className="flex items-center">
                      <span className="font-medium text-green-800">{param.name}</span>
                      <span className="mx-2 text-green-600">({param.type})</span>
                      <span className="text-green-700">{param.description}</span>
                      {param.required && <span className="ml-2 text-red-500">*</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border border-orange-200 bg-orange-50 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-orange-500 mr-2 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-orange-800">上传说明</p>
                  <ul className="mt-1 text-orange-700 space-y-1">
                    <li>• 算法将被自动注册到系统中</li>
                    <li>• 如果启用了自动容器化，系统将构建 Docker 镜像</li>
                    <li>• 构建完成后，算法状态将变为"就绪"</li>
                    <li>• 其他用户可以根据权限设置使用您的算法</li>
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
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
        </div>
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* 头部 */}
          <div className="bg-white px-6 pt-6 pb-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">上传新算法</h2>
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
                <span>基本信息</span>
                <span>代码和依赖</span>
                <span>参数配置</span>
                <span>预览确认</span>
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
              {step > 1 && (
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
                取消
              </button>
              
              {step < 4 ? (
                <button
                  onClick={() => setStep(step + 1)}
                  className="btn-primary"
                  disabled={
                    (step === 1 && (!formData.name || !formData.description || !formData.author)) ||
                    (step === 2 && !sourceCodeFile)
                  }
                >
                  下一步
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={isUploading || !sourceCodeFile}
                  className="btn-primary flex items-center space-x-2"
                >
                  {isUploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>上传中...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      <span>上传算法</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AlgorithmUpload