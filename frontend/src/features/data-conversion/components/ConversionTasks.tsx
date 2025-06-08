import React, { useState, useEffect } from 'react'
import { 
  RefreshCw, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Pause,
  Play,
  MoreVertical,
  FileText,
  Eye,
  Download,
  Trash2
} from 'lucide-react'
import { conversionService, ConversionTask } from '../../../services/conversionService'

interface ConversionTasksProps {
  refreshTrigger?: number
}

const ConversionTasks: React.FC<ConversionTasksProps> = ({ refreshTrigger }) => {
  const [tasks, setTasks] = useState<ConversionTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string>('all')

  useEffect(() => {
    loadTasks()
  }, [refreshTrigger, selectedStatus])

  const loadTasks = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params: any = { limit: 50 }
      if (selectedStatus !== 'all') {
        params.status = selectedStatus
      }
      
      const tasksData = await conversionService.getConversionTasks(params)
      setTasks(tasksData)
    } catch (error: any) {
      setError(error.response?.data?.detail || error.message || '加载任务失败')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelTask = async (taskId: number) => {
    try {
      await conversionService.cancelConversionTask(taskId)
      await loadTasks() // Refresh the list
    } catch (error: any) {
      setError(error.response?.data?.detail || error.message || '取消任务失败')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'processing':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100'
      case 'processing': return 'text-blue-600 bg-blue-100'
      case 'completed': return 'text-green-600 bg-green-100'
      case 'failed': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '等待中'
      case 'processing': return '转换中'
      case 'completed': return '已完成'
      case 'failed': return '失败'
      default: return status
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN')
  }

  const getDuration = (startTime?: string, endTime?: string) => {
    if (!startTime) return '-'
    
    const start = new Date(startTime)
    const end = endTime ? new Date(endTime) : new Date()
    const diffMs = end.getTime() - start.getTime()
    const diffMinutes = Math.floor(diffMs / 60000)
    const diffSeconds = Math.floor((diffMs % 60000) / 1000)
    
    if (diffMinutes > 0) {
      return `${diffMinutes}分${diffSeconds}秒`
    }
    return `${diffSeconds}秒`
  }

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-8 w-8 text-gray-400 animate-spin" />
          <span className="ml-2 text-gray-600">加载中...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with filter */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">转换任务</h2>
        <div className="flex items-center space-x-4">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-ocean-500 focus:border-ocean-500 text-sm"
          >
            <option value="all">全部状态</option>
            <option value="pending">等待中</option>
            <option value="processing">转换中</option>
            <option value="completed">已完成</option>
            <option value="failed">失败</option>
          </select>
          
          <button
            onClick={loadTasks}
            className="btn-secondary flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>刷新</span>
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-center">
            <XCircle className="h-5 w-5 text-red-400" />
            <span className="ml-2 text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Tasks list */}
      <div className="card">
        {tasks.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">暂无转换任务</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => (
              <div key={task.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Task header */}
                    <div className="flex items-center space-x-3 mb-3">
                      {getStatusIcon(task.status)}
                      <h3 className="font-medium text-gray-900">
                        {task.original_filename}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(task.status)}`}>
                        {getStatusText(task.status)}
                      </span>
                    </div>

                    {/* Task details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 text-sm text-gray-600 mb-3">
                      <div>
                        <span className="font-medium">格式转换:</span>
                        <div>{task.original_format.toUpperCase()} → {task.target_format}</div>
                      </div>
                      
                      <div>
                        <span className="font-medium">创建时间:</span>
                        <div>{formatDate(task.created_at)}</div>
                      </div>
                      
                      {task.started_at && (
                        <div>
                          <span className="font-medium">开始时间:</span>
                          <div>{formatDate(task.started_at)}</div>
                        </div>
                      )}
                      
                      {task.completed_at && (
                        <div>
                          <span className="font-medium">完成时间:</span>
                          <div>{formatDate(task.completed_at)}</div>
                        </div>
                      )}
                      
                      <div>
                        <span className="font-medium">耗时:</span>
                        <div>{getDuration(task.started_at, task.completed_at)}</div>
                      </div>
                    </div>

                    {/* Progress bar for processing tasks */}
                    {task.status === 'processing' && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-600">处理进度</span>
                          <span className="text-gray-900 font-medium">{task.progress.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full bg-blue-500 transition-all duration-300"
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Error message for failed tasks */}
                    {task.status === 'failed' && task.error_message && (
                      <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm">
                        <span className="font-medium text-red-700">错误信息:</span>
                        <div className="text-red-600 mt-1">{task.error_message}</div>
                      </div>
                    )}

                    {/* Success info for completed tasks */}
                    {task.status === 'completed' && task.nc_file_id && (
                      <div className="bg-green-50 border border-green-200 rounded-md p-3 text-sm">
                        <span className="font-medium text-green-700">转换成功!</span>
                        <div className="text-green-600 mt-1">
                          已生成 NetCDF 文件 (ID: {task.nc_file_id})
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 ml-4">
                    {task.status === 'pending' || task.status === 'processing' ? (
                      <button
                        onClick={() => handleCancelTask(task.id)}
                        className="p-2 text-gray-500 hover:text-red-600 rounded"
                        title="取消任务"
                      >
                        <Pause className="h-4 w-4" />
                      </button>
                    ) : null}
                    
                    {task.status === 'completed' && task.nc_file_id && (
                      <button
                        className="p-2 text-gray-500 hover:text-blue-600 rounded"
                        title="查看结果"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    )}
                    
                    <button
                      className="p-2 text-gray-500 hover:text-gray-700 rounded"
                      title="更多操作"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ConversionTasks