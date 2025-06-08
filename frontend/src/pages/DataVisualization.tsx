import React, { useState, useEffect } from 'react'
import { 
  algorithmService, 
  Algorithm, 
  ExecutionTask,
  AlgorithmStats 
} from '../services/algorithmService'
import AlgorithmUpload from '../components/AlgorithmUpload'
import AlgorithmExecution from '../components/AlgorithmExecution'
import AlgorithmExecutionEnhanced from '../components/AlgorithmExecutionEnhanced'
import AlgorithmGuide from '../components/AlgorithmGuide'
import AlgorithmEdit from '../components/AlgorithmEdit'
import { 
  BarChart3, 
  Settings, 
  Download,
  Play,
  Layers,
  Eye,
  Grid,
  MousePointer,
  Image,
  Globe,
  TrendingUp,
  Mountain,
  Package,
  Code,
  Container,
  Search,
  Filter,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  Tag,
  FileText,
  ExternalLink,
  Trash2,
  RefreshCw,
  AlertTriangle,
  Activity,
  Terminal,
  X
} from 'lucide-react'

const DataVisualization: React.FC = () => {
  const [currentView, setCurrentView] = useState<'library' | 'execution' | 'guide'>('library')
  const [algorithms, setAlgorithms] = useState<Algorithm[]>([])
  const [executionTasks, setExecutionTasks] = useState<ExecutionTask[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showExecutionModal, setShowExecutionModal] = useState(false)
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<Algorithm | null>(null)
  const [selectedAlgorithmForView, setSelectedAlgorithmForView] = useState<Algorithm | null>(null)
  const [selectedAlgorithmForEdit, setSelectedAlgorithmForEdit] = useState<Algorithm | null>(null)
  const [loading, setLoading] = useState(true)

  // 算法分类
  const algorithmCategories = [
    { value: 'all', label: '全部算法', icon: Package },
    { value: 'visualization', label: '数据可视化', icon: BarChart3 },
    { value: 'analysis', label: '数据分析', icon: TrendingUp },
    { value: 'preprocessing', label: '数据预处理', icon: Settings },
    { value: 'ml_inference', label: '机器学习推理', icon: Mountain }
  ]

  // 编程语言支持
  const supportedLanguages = [
    { value: 'python', label: 'Python', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'r', label: 'R', color: 'bg-blue-100 text-blue-800' },
    { value: 'matlab', label: 'MATLAB', color: 'bg-orange-100 text-orange-800' }
  ]

  // 示例算法数据（作为回退）
  const sampleAlgorithms: Algorithm[] = [
    {
      id: 1,
      name: '海表温度等值线图生成器',
      version: 'v2.1.0',
      description: '基于NetCDF数据生成高质量海表温度等值线图，支持多种投影和色彩映射',
      category: 'visualization',
      language: 'python',
      author: '张海洋',
      institution: '中科院海洋所',
      status: 'ready',
      docker_image: 'oceanviz/sst-contour:v2.1.0',
      last_updated: '2024-01-10T08:30:00Z',
      usage_count: 245,
      rating: 4.8,
      tags: ['温度', '等值线', '可视化', 'NetCDF'],
      input_formats: ['NetCDF', 'HDF5'],
      output_formats: ['PNG', 'SVG', 'HTML'],
      parameters: [
        { name: 'colormap', type: 'select', description: '色彩映射方案', required: true, default_value: 'thermal', options: ['thermal', 'ocean', 'viridis'] },
        { name: 'contour_levels', type: 'number', description: '等值线级数', required: false, default_value: 20 },
        { name: 'projection', type: 'select', description: '地图投影', required: true, default_value: 'mercator', options: ['mercator', 'orthographic', 'mollweide'] }
      ],
      is_public: true,
      execution_time: 45,
      memory_usage: 512
    },
    {
      id: 2, 
      name: '海流矢量场可视化',
      version: 'v1.3.2',
      description: '生成海流矢量场图，支持流线和粒子轨迹动画',
      category: 'visualization',
      language: 'python',
      author: '李流体',
      status: 'ready',
      docker_image: 'oceanviz/current-vector:v1.3.2',
      last_updated: '2024-01-08T14:15:00Z',
      usage_count: 189,
      rating: 4.6,
      tags: ['海流', '矢量场', '动画', '流线'],
      input_formats: ['NetCDF', 'GRIB'],
      output_formats: ['GIF', 'MP4', 'HTML'],
      parameters: [
        { name: 'animation_type', type: 'select', description: '动画类型', required: true, default_value: 'streamlines', options: ['streamlines', 'particles'] },
        { name: 'time_steps', type: 'number', description: '时间步数', required: false, default_value: 24 }
      ],
      is_public: true,
      execution_time: 120,
      memory_usage: 1024
    },
    {
      id: 3,
      name: '深度学习海底地形反演',
      version: 'v0.8.1', 
      description: '基于重力数据的深度学习海底地形反演算法',
      category: 'ml_inference',
      language: 'python',
      author: '王地形',
      status: 'building',
      last_updated: '2024-01-12T10:20:00Z',
      usage_count: 23,
      rating: 4.2,
      tags: ['深度学习', '地形反演', '重力', 'CNN'],
      input_formats: ['CSV', 'NetCDF'],
      output_formats: ['NetCDF', 'TIFF'],
      parameters: [
        { name: 'model_type', type: 'select', description: '模型类型', required: true, default_value: 'cnn', options: ['cnn', 'unet', 'resnet'] },
        { name: 'depth_range', type: 'string', description: '深度范围 (m)', required: true, default_value: '0,6000' }
      ],
      is_public: false,
      execution_time: 1800,
      memory_usage: 4096
    },
    {
      id: 4,
      name: 'NetCDF数据质量检查',
      version: 'v3.0.5',
      description: '对NetCDF文件进行CF合规性检查和数据质量评估',
      category: 'preprocessing',
      language: 'python',
      author: '陈质控',
      status: 'ready',
      docker_image: 'oceantools/qc-checker:v3.0.5',
      last_updated: '2024-01-05T16:45:00Z',
      usage_count: 567,
      rating: 4.9,
      tags: ['质量控制', 'CF合规', 'NetCDF', '数据检查'],
      input_formats: ['NetCDF'],
      output_formats: ['JSON', 'HTML'],
      parameters: [
        { name: 'check_cf_compliance', type: 'boolean', description: '检查CF合规性', required: false, default_value: true },
        { name: 'check_data_ranges', type: 'boolean', description: '检查数据范围', required: false, default_value: true }
      ],
      is_public: true,
      execution_time: 30,
      memory_usage: 256
    }
  ]

  // 示例执行任务
  const sampleTasks: ExecutionTask[] = [
    {
      id: 1,
      algorithm_id: 1,
      algorithm_name: '海表温度等值线图生成器',
      status: 'completed',
      start_time: '2024-01-15T14:30:00Z',
      end_time: '2024-01-15T14:32:15Z',
      input_files: ['sst_data_20240115.nc'],
      output_files: ['sst_contour_20240115.png', 'sst_contour_20240115.html'],
      parameters: { colormap: 'thermal', contour_levels: 25, projection: 'mercator' },
      progress: 100,
      logs: ['开始加载数据...', '生成等值线...', '渲染完成'],
      container_id: 'container_abc123'
    },
    {
      id: 2,
      algorithm_id: 2,
      algorithm_name: '海流矢量场可视化',
      status: 'running',
      start_time: '2024-01-15T15:10:00Z',
      input_files: ['current_uv_20240115.nc'],
      output_files: [],
      parameters: { animation_type: 'streamlines', time_steps: 48 },
      progress: 65,
      logs: ['初始化容器...', '加载数据...', '生成流线...'],
      container_id: 'container_def456'
    },
    {
      id: 3,
      algorithm_id: 4,
      algorithm_name: 'NetCDF数据质量检查',
      status: 'queued',
      start_time: '2024-01-15T15:25:00Z',
      input_files: ['ocean_data_batch.nc'],
      output_files: [],
      parameters: { check_cf_compliance: true, check_data_ranges: true },
      progress: 0,
      logs: ['等待资源分配...'],
    }
  ]

  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        // 尝试加载真实数据
        const [algorithmsData, tasksData] = await Promise.all([
          algorithmService.getAlgorithms(),
          algorithmService.getExecutionTasks({ limit: 20 })
        ])
        
        setAlgorithms(algorithmsData)
        setExecutionTasks(tasksData)
      } catch (error) {
        console.error('加载数据失败，使用示例数据:', error)
        // 回退到示例数据
        setAlgorithms(sampleAlgorithms)
        setExecutionTasks(sampleTasks)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // 过滤算法
  const filteredAlgorithms = algorithms.filter(algo => {
    const matchesCategory = selectedCategory === 'all' || algo.category === selectedCategory
    const matchesSearch = algo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         algo.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (algo.tags || []).some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    return matchesCategory && matchesSearch
  })

  // 状态颜色获取
  const getAlgorithmStatusColor = (status: Algorithm['status']) => {
    switch (status) {
      case 'ready': return 'text-green-600 bg-green-100'
      case 'building': return 'text-blue-600 bg-blue-100'
      case 'registered': return 'text-gray-600 bg-gray-100'
      case 'failed': return 'text-red-600 bg-red-100'
      case 'running': return 'text-purple-600 bg-purple-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getTaskStatusColor = (status: ExecutionTask['status']) => {
    switch (status) {
      case 'running': return 'text-blue-600 bg-blue-100'
      case 'completed': return 'text-green-600 bg-green-100'
      case 'queued': return 'text-yellow-600 bg-yellow-100'
      case 'failed': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getAlgorithmStatusIcon = (status: Algorithm['status']) => {
    switch (status) {
      case 'ready': return CheckCircle
      case 'building': return RefreshCw
      case 'registered': return Clock
      case 'failed': return XCircle
      case 'running': return Activity
      default: return Clock
    }
  }

  // 算法操作
  const handleRunAlgorithm = async (algorithm: Algorithm) => {
    setSelectedAlgorithm(algorithm)
    setShowExecutionModal(true)
  }

  // 上传算法
  const handleUploadAlgorithm = async (algorithmData: any) => {
    try {
      const uploadRequest = {
        name: algorithmData.name,
        version: algorithmData.version,
        description: algorithmData.description,
        category: algorithmData.category,
        language: algorithmData.language,
        author: algorithmData.author,
        institution: algorithmData.institution,
        tags: algorithmData.tags,
        inputFormats: algorithmData.inputFormats,
        outputFormats: algorithmData.outputFormats,
        parameters: algorithmData.parameters,
        isPublic: algorithmData.isPublic,
        autoContainerize: algorithmData.autoContainerize,
        sourceCodeFile: algorithmData.sourceCode,
        documentationFile: algorithmData.documentation
      }

      const newAlgorithm = await algorithmService.uploadAlgorithm(uploadRequest)
      setAlgorithms(prev => [newAlgorithm, ...prev])
      console.log('算法上传成功:', newAlgorithm)
    } catch (error) {
      console.error('上传算法失败:', error)
      throw error
    }
  }

  // 执行算法
  const handleExecuteAlgorithm = async (executionParams: any) => {
    try {
      if (!selectedAlgorithm) {
        throw new Error('未选择算法')
      }
      
      console.log('执行算法参数:', executionParams)
      
      // 验证输入参数
      if (!executionParams.inputFiles || executionParams.inputFiles.length === 0) {
        throw new Error('请上传至少一个输入文件')
      }
      
      // 验证必需参数
      const requiredParams = selectedAlgorithm.parameters?.filter(p => p.required) || []
      for (const param of requiredParams) {
        if (!executionParams.parameters[param.name] || executionParams.parameters[param.name] === '') {
          throw new Error(`缺少必需参数: ${param.name}`)
        }
      }
      
      try {
        // 调用真实的API执行算法
        const task = await algorithmService.executeAlgorithm({
          algorithm_id: selectedAlgorithm.id,
          input_files: executionParams.inputFiles, // 这些应该是File对象
          parameters: executionParams.parameters,
          output_format: executionParams.outputFormat
        })
        
        // 添加到执行任务列表
        setExecutionTasks(prev => [task, ...prev])
        console.log('算法执行任务已创建:', task)
        
        // 启动轮询任务状态
        pollTaskStatus(task.id)
        
      } catch (apiError) {
        console.error('API调用失败:', apiError)
        
        // 如果API调用失败，回退到模拟模式
        console.warn('回退到模拟执行模式')
        
        // 创建模拟任务
        const taskId = Math.floor(Math.random() * 10000)
        const mockTask: ExecutionTask = {
          id: taskId,
          algorithm_id: selectedAlgorithm.id,
          algorithm_name: selectedAlgorithm.name,
          status: 'queued',
          start_time: new Date().toISOString(),
          input_files: executionParams.inputFiles.map((f: File) => f.name) || [],
          output_files: [],
          parameters: executionParams.parameters || {},
          progress: 0,
          logs: [
            `[${new Date().toLocaleTimeString()}] 任务已创建 (模拟模式)`,
            `[${new Date().toLocaleTimeString()}] 算法: ${selectedAlgorithm.name} v${selectedAlgorithm.version}`,
            `[${new Date().toLocaleTimeString()}] 输入文件: ${executionParams.inputFiles.map((f: File) => f.name).join(', ')}`,
            `[${new Date().toLocaleTimeString()}] 参数: ${JSON.stringify(executionParams.parameters)}`,
            `[${new Date().toLocaleTimeString()}] 等待资源分配...`
          ]
        }
        
        setExecutionTasks(prev => [mockTask, ...prev])
        
        // 模拟执行过程
        simulateTaskExecution(taskId, selectedAlgorithm.name)
      }
      
    } catch (error) {
      console.error('执行算法失败:', error)
      
      // 如果是验证错误，直接抛出
      if (error.message.includes('请上传') || error.message.includes('缺少必需参数') || error.message.includes('未选择算法')) {
        throw error
      }
      
      // 其他错误也抛出，让上层处理
      throw new Error(`算法执行失败: ${error.message || '未知错误'}`)
    }
  }

  // 轮询任务状态
  const pollTaskStatus = (taskId: number) => {
    const interval = setInterval(async () => {
      try {
        const updatedTasks = await algorithmService.getExecutionTasks({ limit: 20 })
        setExecutionTasks(updatedTasks)
        
        // 检查任务是否完成
        const task = updatedTasks.find(t => t.id === taskId)
        if (task && ['completed', 'failed', 'cancelled'].includes(task.status)) {
          clearInterval(interval)
        }
      } catch (error) {
        console.error('轮询任务状态失败:', error)
        clearInterval(interval)
      }
    }, 2000) // 每2秒轮询一次
    
    // 最多轮询5分钟
    setTimeout(() => {
      clearInterval(interval)
    }, 300000)
  }

  // 模拟任务执行过程
  const simulateTaskExecution = (taskId: number, algorithmName: string) => {
    const progressSteps = [
      { delay: 1000, progress: 5, message: '正在初始化算法环境...' },
      { delay: 2000, progress: 20, message: '验证输入数据格式...' },
      { delay: 3000, progress: 35, message: '加载数据到内存...' },
      { delay: 4000, progress: 50, message: '开始执行算法计算...' },
      { delay: 5000, progress: 75, message: '生成可视化结果...' },
      { delay: 6000, progress: 90, message: '保存输出文件...' }
    ]
    
    progressSteps.forEach(step => {
      setTimeout(() => {
        setExecutionTasks(prev => prev.map(task => 
          task.id === taskId 
            ? { 
                ...task, 
                status: step.progress < 90 ? 'running' : task.status,
                progress: step.progress, 
                logs: [...task.logs, `[${new Date().toLocaleTimeString()}] ${step.message}`] 
              }
            : task
        ))
      }, step.delay)
    })
    
    // 最终结果
    setTimeout(() => {
      const isSuccess = Math.random() > 0.2 // 80% 成功率
      
      setExecutionTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { 
              ...task, 
              status: isSuccess ? 'completed' : 'failed', 
              progress: isSuccess ? 100 : 0, 
              end_time: new Date().toISOString(),
              output_files: isSuccess ? [
                `${algorithmName.replace(/\s+/g, '_')}_result.png`,
                `${algorithmName.replace(/\s+/g, '_')}_data.json`,
                'execution_summary.txt'
              ] : [],
              error_message: isSuccess ? undefined : '算法执行失败: 输入数据格式不兼容',
              logs: [
                ...task.logs, 
                `[${new Date().toLocaleTimeString()}] ${isSuccess ? '算法执行完成' : '错误: 数据格式验证失败'}`,
                `[${new Date().toLocaleTimeString()}] ${isSuccess ? '生成3个输出文件' : '任务执行失败'}`,
                `[${new Date().toLocaleTimeString()}] 任务${isSuccess ? '成功完成' : '执行失败'}`
              ]
            }
          : task
      ))
    }, 7000)
  }

  const handleDeleteAlgorithm = async (algorithmId: number) => {
    if (confirm('确定要删除这个算法吗？')) {
      try {
        await algorithmService.deleteAlgorithm(algorithmId.toString())
        setAlgorithms(prev => prev.filter(algo => algo.id !== algorithmId))
      } catch (error) {
        console.error('删除算法失败:', error)
      }
    }
  }

  // 查看算法详情
  const handleViewAlgorithm = (algorithm: Algorithm) => {
    setSelectedAlgorithmForView(algorithm)
  }

  // 编辑算法
  const handleEditAlgorithm = (algorithm: Algorithm) => {
    setSelectedAlgorithmForEdit(algorithm)
  }

  // 保存编辑后的算法
  const handleSaveEditedAlgorithm = (updatedAlgorithm: Algorithm) => {
    setAlgorithms(prev => prev.map(algo => 
      algo.id === updatedAlgorithm.id ? updatedAlgorithm : algo
    ))
    setSelectedAlgorithmForEdit(null)
  }

  // 查看算法文档  
  const handleViewDocumentation = async (algorithm: Algorithm) => {
    try {
      // 显示文档查看选项
      const docOptions = [
        '算法使用说明',
        '参数配置指南',
        '输入数据格式说明', 
        '输出结果解释',
        '使用示例'
      ]
      
      const message = `查看算法文档：${algorithm.name}\n\n可查看的文档：\n${docOptions.map(doc => `• ${doc}`).join('\n')}\n\n文档查看功能开发中...`
      alert(message)
    } catch (error) {
      console.error('获取文档失败:', error)
      alert('获取文档失败，请稍后重试')
    }
  }

  const handleStopTask = async (taskId: number) => {
    try {
      // 只能停止运行中或队列中的任务
      const task = executionTasks.find(t => t.id === taskId)
      if (!task || (task.status !== 'running' && task.status !== 'queued')) {
        alert('只能停止运行中或队列中的任务')
        return
      }
      
      if (!confirm('确定要停止这个任务吗？')) {
        return
      }
      
      // 更新任务状态为已取消
      setExecutionTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { 
              ...task, 
              status: 'failed', 
              progress: 0,
              end_time: new Date().toISOString(),
              error_message: '任务被用户手动停止',
              logs: [...task.logs, `[${new Date().toLocaleTimeString()}] 任务被用户手动停止`]
            } 
          : task
      ))
      
      // 注释掉真实的API调用
      // await algorithmService.stopExecutionTask(taskId.toString())
      
    } catch (error) {
      console.error('停止任务失败:', error)
      alert('停止任务失败，请重试')
    }
  }
  
  // 重新运行任务
  const handleRestartTask = async (task: ExecutionTask) => {
    try {
      const algorithm = algorithms.find(a => a.id === task.algorithm_id)
      if (!algorithm) {
        alert('找不到对应的算法')
        return
      }
      
      await handleExecuteAlgorithm({
        inputFiles: task.input_files,
        parameters: task.parameters,
        outputFormat: 'png'
      })
      
    } catch (error) {
      console.error('重新运行任务失败:', error)
      alert('重新运行任务失败: ' + error.message)
    }
  }
  
  // 删除任务
  const handleDeleteTask = async (taskId: number) => {
    try {
      if (!confirm('确定要删除这个任务吗？')) {
        return
      }
      
      setExecutionTasks(prev => prev.filter(task => task.id !== taskId))
      
    } catch (error) {
      console.error('删除任务失败:', error)
      alert('删除任务失败，请重试')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ocean-500"></div>
        <span className="ml-2 text-gray-600">加载算法库...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">海洋算法库管理</h1>
          <p className="text-gray-600 mt-1">可视化算法注册、Docker容器化和执行管理</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={() => setCurrentView('library')}
            className={`btn-secondary flex items-center space-x-2 ${
              currentView === 'library' ? 'bg-ocean-100 text-ocean-700' : ''
            }`}
          >
            <Package className="h-4 w-4" />
            <span>算法库</span>
          </button>
          <button 
            onClick={() => setCurrentView('execution')}
            className={`btn-secondary flex items-center space-x-2 ${
              currentView === 'execution' ? 'bg-ocean-100 text-ocean-700' : ''
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>执行任务</span>
          </button>
          <button 
            onClick={() => setCurrentView('guide')}
            className={`btn-secondary flex items-center space-x-2 ${
              currentView === 'guide' ? 'bg-ocean-100 text-ocean-700' : ''
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>使用指南</span>
          </button>
          <button 
            onClick={() => setShowUploadModal(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>上传算法</span>
          </button>
        </div>
      </div>

      {/* 算法库视图 */}
      {currentView === 'library' && (
        <>
          {/* 搜索和过滤 */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索算法名称、描述或标签..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
              >
                {algorithmCategories.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 算法统计 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card">
              <div className="flex items-center">
                <div className="p-2 rounded-lg text-blue-600 bg-blue-100">
                  <Package className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">算法总数</p>
                  <p className="text-2xl font-bold text-gray-900">{algorithms.length}</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center">
                <div className="p-2 rounded-lg text-green-600 bg-green-100">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">就绪算法</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {algorithms.filter(a => a.status === 'ready').length}
                  </p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center">
                <div className="p-2 rounded-lg text-purple-600 bg-purple-100">
                  <Activity className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">运行中</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {executionTasks.filter(t => t.status === 'running').length}
                  </p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center">
                <div className="p-2 rounded-lg text-orange-600 bg-orange-100">
                  <Container className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">容器化</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {algorithms.filter(a => a.docker_image).length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 算法列表 */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">算法库 ({filteredAlgorithms.length})</h2>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>按更新时间排序</span>
              </div>
            </div>
            
            <div className="space-y-4">
              {filteredAlgorithms.map((algorithm) => {
                const StatusIcon = getAlgorithmStatusIcon(algorithm.status)
                return (
                  <div key={algorithm.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-medium text-gray-900">{algorithm.name}</h3>
                          <span className="text-xs text-gray-500">v{algorithm.version}</span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center space-x-1 ${
                            getAlgorithmStatusColor(algorithm.status)
                          }`}>
                            <StatusIcon className="h-3 w-3" />
                            <span>{algorithm.status === 'ready' ? '就绪' : 
                                   algorithm.status === 'building' ? '构建中' :
                                   algorithm.status === 'registered' ? '已注册' :
                                   algorithm.status === 'failed' ? '失败' : '运行中'}
                            </span>
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            supportedLanguages.find(l => l.value === algorithm.language)?.color || 'bg-gray-100 text-gray-800'
                          }`}>
                            {algorithm.language.toUpperCase()}
                          </span>
                          {!algorithm.is_public && (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
                              私有
                            </span>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-3">{algorithm.description}</p>
                        
                        {/* 标签 */}
                        <div className="flex flex-wrap gap-1 mb-3">
                          {(algorithm.tags || []).map((tag, index) => (
                            <span key={index} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                              #{tag}
                            </span>
                          ))}
                        </div>
                        
                        {/* 详细信息 */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-2">
                            <Code className="h-4 w-4" />
                            <span>作者: {algorithm.author}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Eye className="h-4 w-4" />
                            <span>使用: {algorithm.usage_count}次</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <TrendingUp className="h-4 w-4" />
                            <span>评分: {algorithm.rating}/5.0</span>
                          </div>
                          {algorithm.execution_time && (
                            <div className="flex items-center space-x-2">
                              <Clock className="h-4 w-4" />
                              <span>执行时间: ~{algorithm.execution_time}s</span>
                            </div>
                          )}
                          {algorithm.docker_image && (
                            <div className="flex items-center space-x-2">
                              <Container className="h-4 w-4" />
                              <span className="text-xs font-mono truncate">{algorithm.docker_image}</span>
                            </div>
                          )}
                          <div className="flex items-center space-x-2">
                            <FileText className="h-4 w-4" />
                            <span>更新: {new Date(algorithm.last_updated).toLocaleDateString()}</span>
                          </div>
                        </div>
                        
                        {/* 输入输出格式 */}
                        <div className="flex items-center space-x-6 mt-3 text-xs text-gray-500">
                          <div>
                            <span className="font-medium">输入: </span>
                            {algorithm.input_formats?.join(', ') || '未指定'}
                          </div>
                          <div>
                            <span className="font-medium">输出: </span>
                            {algorithm.output_formats?.join(', ') || '未指定'}
                          </div>
                        </div>
                      </div>

                      {/* 操作按钮 */}
                      <div className="flex items-center space-x-2 ml-4">
                        {algorithm.status === 'ready' && (
                          <button 
                            onClick={() => handleRunAlgorithm(algorithm)}
                            className="p-2 text-green-500 hover:text-green-700 rounded"
                            title="运行算法"
                          >
                            <Play className="h-4 w-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => handleViewAlgorithm(algorithm)}
                          className="p-2 text-gray-500 hover:text-gray-700 rounded" 
                          title="查看详情"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleEditAlgorithm(algorithm)}
                          className="p-2 text-gray-500 hover:text-gray-700 rounded" 
                          title="编辑"
                        >
                          <Settings className="h-4 w-4" />
                        </button>
                        {algorithm.documentation && (
                          <button 
                            onClick={() => handleViewDocumentation(algorithm)}
                            className="p-2 text-blue-500 hover:text-blue-700 rounded" 
                            title="文档"
                          >
                            <FileText className="h-4 w-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => handleDeleteAlgorithm(algorithm.id)}
                          className="p-2 text-red-500 hover:text-red-700 rounded" 
                          title="删除"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* 执行任务视图 */}
      {currentView === 'execution' && (
        <>
          {/* 任务统计 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card">
              <div className="flex items-center">
                <div className="p-2 rounded-lg text-blue-600 bg-blue-100">
                  <Activity className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">运行中</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {executionTasks.filter(t => t.status === 'running').length}
                  </p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center">
                <div className="p-2 rounded-lg text-yellow-600 bg-yellow-100">
                  <Clock className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">队列中</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {executionTasks.filter(t => t.status === 'queued').length}
                  </p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center">
                <div className="p-2 rounded-lg text-green-600 bg-green-100">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">已完成</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {executionTasks.filter(t => t.status === 'completed').length}
                  </p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center">
                <div className="p-2 rounded-lg text-red-600 bg-red-100">
                  <XCircle className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">失败</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {executionTasks.filter(t => t.status === 'failed').length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 执行任务列表 */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">执行任务 ({executionTasks.length})</h2>
              <button className="btn-secondary flex items-center space-x-2">
                <RefreshCw className="h-4 w-4" />
                <span>刷新</span>
              </button>
            </div>
            
            <div className="space-y-4">
              {executionTasks.map((task) => (
                <div key={task.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-medium text-gray-900">{task.algorithm_name}</h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          getTaskStatusColor(task.status)
                        }`}>
                          {task.status === 'running' ? '运行中' :
                           task.status === 'completed' ? '已完成' :
                           task.status === 'queued' ? '队列中' : '失败'}
                        </span>
                        {task.container_id && (
                          <span className="text-xs text-gray-500 font-mono">
                            {task.container_id.substring(0, 12)}
                          </span>
                        )}
                      </div>
                      
                      {/* 进度条 */}
                      {task.status === 'running' && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-gray-600">执行进度</span>
                            <span className="text-gray-900 font-medium">{task.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${task.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                      
                      {/* 任务信息 */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4" />
                          <span>开始: {new Date(task.start_time).toLocaleString()}</span>
                        </div>
                        {task.end_time && (
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4" />
                            <span>结束: {new Date(task.end_time).toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4" />
                          <span>输入: {task.input_files.join(', ')}</span>
                        </div>
                      </div>
                      
                      {/* 参数 */}
                      <div className="mb-3">
                        <div className="text-sm font-medium text-gray-700 mb-1">执行参数:</div>
                        <div className="text-xs text-gray-600 bg-gray-50 rounded p-2 font-mono">
                          {JSON.stringify(task.parameters, null, 2)}
                        </div>
                      </div>
                      
                      {/* 日志 */}
                      {task.logs.length > 0 && (
                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-1">执行日志:</div>
                          <div className="text-xs text-gray-600 bg-gray-900 text-green-400 rounded p-2 font-mono max-h-32 overflow-y-auto">
                            {task.logs.map((log, index) => (
                              <div key={index}>{log}</div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* 错误信息 */}
                      {task.error_message && (
                        <div className="mt-2">
                          <div className="text-sm font-medium text-red-700 mb-1">错误信息:</div>
                          <div className="text-xs text-red-600 bg-red-50 rounded p-2">
                            {task.error_message}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex items-center space-x-2 ml-4">
                      {(task.status === 'running' || task.status === 'queued') && (
                        <button 
                          onClick={() => handleStopTask(task.id)}
                          className="p-2 text-red-500 hover:text-red-700 rounded" 
                          title="停止任务"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      )}
                      
                      {task.status === 'failed' && (
                        <button 
                          onClick={() => handleRestartTask(task)}
                          className="p-2 text-blue-500 hover:text-blue-700 rounded" 
                          title="重新运行"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                      )}
                      
                      <button 
                        className="p-2 text-gray-500 hover:text-gray-700 rounded" 
                        title="查看详细日志"
                        onClick={() => {
                          const logText = task.logs.join('\n')
                          const blob = new Blob([logText], { type: 'text/plain' })
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = `task_${task.id}_logs.txt`
                          a.click()
                          URL.revokeObjectURL(url)
                        }}
                      >
                        <Terminal className="h-4 w-4" />
                      </button>
                      
                      {task.output_files.length > 0 && (
                        <button 
                          className="p-2 text-green-500 hover:text-green-700 rounded" 
                          title="下载结果"
                          onClick={() => {
                            task.output_files.forEach(filename => {
                              // 模拟文件下载
                              const content = `# ${filename}\n\n这是算法执行的输出文件。\n\n任务ID: ${task.id}\n算法: ${task.algorithm_name}\n执行时间: ${task.start_time}\n\n文件内容将在实际部署时由后端API提供。`
                              const blob = new Blob([content], { type: 'text/plain' })
                              const url = URL.createObjectURL(blob)
                              const a = document.createElement('a')
                              a.href = url
                              a.download = filename
                              a.click()
                              URL.revokeObjectURL(url)
                            })
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      )}
                      
                      {(task.status === 'completed' || task.status === 'failed') && (
                        <button 
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-2 text-gray-400 hover:text-red-500 rounded" 
                          title="删除任务"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* 使用指南视图 */}
      {currentView === 'guide' && <AlgorithmGuide />}

      {/* 上传算法模态框 */}
      {showUploadModal && (
        <AlgorithmUpload
          onClose={() => setShowUploadModal(false)}
          onUpload={handleUploadAlgorithm}
        />
      )}

      {/* 算法执行模态框 */}
      {showExecutionModal && selectedAlgorithm && (
        <>
          {/* 如果是海洋环境要素可视化算法，使用增强版组件 */}
          {selectedAlgorithm.name.includes('海洋环境要素') || 
           selectedAlgorithm.category === 'visualization' ? (
            <AlgorithmExecutionEnhanced
              algorithm={selectedAlgorithm}
              onClose={() => {
                setShowExecutionModal(false)
                setSelectedAlgorithm(null)
              }}
              onExecute={handleExecuteAlgorithm}
            />
          ) : (
            <AlgorithmExecution
              algorithm={selectedAlgorithm}
              onClose={() => {
                setShowExecutionModal(false)
                setSelectedAlgorithm(null)
              }}
              onExecute={handleExecuteAlgorithm}
            />
          )}
        </>
      )}

      {/* 算法详情查看模态框 */}
      {selectedAlgorithmForView && (
        <div className="fixed inset-0 z-40 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity">
              <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setSelectedAlgorithmForView(null)}></div>
            </div>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              {/* 头部 */}
              <div className="bg-white px-6 pt-6 pb-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{selectedAlgorithmForView.name}</h2>
                    <p className="text-sm text-gray-600 mt-1">v{selectedAlgorithmForView.version} | {selectedAlgorithmForView.author}</p>
                  </div>
                  <button
                    onClick={() => setSelectedAlgorithmForView(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* 内容区域 */}
              <div className="bg-white px-6 py-6 max-h-96 overflow-y-auto">
                <div className="space-y-6">
                  {/* 基本信息 */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">基本信息</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">算法名称</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedAlgorithmForView.name}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">版本</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedAlgorithmForView.version}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">作者</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedAlgorithmForView.author}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">机构</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedAlgorithmForView.institution || '未指定'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">分类</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedAlgorithmForView.category}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">编程语言</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedAlgorithmForView.language.toUpperCase()}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">状态</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedAlgorithmForView.status}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">可见性</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedAlgorithmForView.is_public ? '公开' : '私有'}</p>
                      </div>
                    </div>
                  </div>

                  {/* 描述 */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">描述</h3>
                    <p className="text-sm text-gray-700">{selectedAlgorithmForView.description}</p>
                  </div>

                  {/* 标签 */}
                  {selectedAlgorithmForView.tags && selectedAlgorithmForView.tags.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-3">标签</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedAlgorithmForView.tags.map((tag, index) => (
                          <span key={index} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 输入输出格式 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-3">输入格式</h3>
                      <div className="space-y-2">
                        {(selectedAlgorithmForView.input_formats || []).map((format, index) => (
                          <span key={index} className="inline-block px-2 py-1 text-xs bg-green-100 text-green-800 rounded mr-2">
                            {format}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-3">输出格式</h3>
                      <div className="space-y-2">
                        {(selectedAlgorithmForView.output_formats || []).map((format, index) => (
                          <span key={index} className="inline-block px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded mr-2">
                            {format}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 参数 */}
                  {selectedAlgorithmForView.parameters && selectedAlgorithmForView.parameters.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-3">参数</h3>
                      <div className="space-y-3">
                        {selectedAlgorithmForView.parameters.map((param, index) => (
                          <div key={index} className="border border-gray-200 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-gray-900">{param.name}</span>
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                {param.type}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{param.description}</p>
                            <div className="text-xs text-gray-500">
                              <span>必需: {param.required ? '是' : '否'}</span>
                              {param.default_value && (
                                <span className="ml-4">默认值: {param.default_value}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 统计信息 */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">统计信息</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{selectedAlgorithmForView.usage_count}</div>
                        <div className="text-sm text-gray-600">使用次数</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{selectedAlgorithmForView.rating}</div>
                        <div className="text-sm text-gray-600">评分</div>
                      </div>
                      {selectedAlgorithmForView.execution_time && (
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">{selectedAlgorithmForView.execution_time}s</div>
                          <div className="text-sm text-gray-600">执行时间</div>
                        </div>
                      )}
                      {selectedAlgorithmForView.memory_usage && (
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600">{selectedAlgorithmForView.memory_usage}MB</div>
                          <div className="text-sm text-gray-600">内存使用</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 底部按钮 */}
              <div className="bg-gray-50 px-6 py-4 flex justify-between">
                <div className="flex space-x-3">
                  {selectedAlgorithmForView.status === 'ready' && (
                    <button
                      onClick={() => {
                        const algo = selectedAlgorithmForView
                        setSelectedAlgorithmForView(null)
                        handleRunAlgorithm(algo)
                      }}
                      className="btn-primary flex items-center space-x-2"
                    >
                      <Play className="h-4 w-4" />
                      <span>运行算法</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      const algo = selectedAlgorithmForView
                      setSelectedAlgorithmForView(null)
                      handleEditAlgorithm(algo)
                    }}
                    className="btn-secondary flex items-center space-x-2"
                  >
                    <Settings className="h-4 w-4" />
                    <span>编辑</span>
                  </button>
                </div>
                <button
                  onClick={() => setSelectedAlgorithmForView(null)}
                  className="btn-secondary"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 算法编辑模态框 */}
      {selectedAlgorithmForEdit && (
        <AlgorithmEdit
          algorithm={selectedAlgorithmForEdit}
          onClose={() => setSelectedAlgorithmForEdit(null)}
          onSave={handleSaveEditedAlgorithm}
        />
      )}


    </div>
  )
}

export default DataVisualization