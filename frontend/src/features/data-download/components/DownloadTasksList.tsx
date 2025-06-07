import React, { useState } from 'react'
import { 
  Download, 
  Play, 
  Pause, 
  Settings, 
  FolderOpen,
  Globe,
  Clock,
  AlertCircle,
  Loader2,
  CheckSquare,
  Square,
  ChevronDown,
  X
} from 'lucide-react'
import type { DownloadTask } from '@/types/domain'
import { formatDate, formatFileSize, formatProgress } from '@/lib/utils'

interface DownloadTasksListProps {
  tasks: DownloadTask[]
  loading: boolean
  error: string | null
  onStartTask: (id: number) => Promise<void>
  onPauseTask: (id: number) => Promise<void>
  onResumeTask: (id: number) => Promise<void>
  onCancelTask: (id: number) => Promise<void>
  onBatchStart?: (taskIds: number[], priority: number) => Promise<void>
  onBatchPause?: (taskIds: number[]) => Promise<void>
  onBatchCancel?: (taskIds: number[]) => Promise<void>
  onUpdatePriority?: (taskId: number, priority: number) => Promise<void>
}

export const DownloadTasksList: React.FC<DownloadTasksListProps> = ({
  tasks,
  loading,
  error,
  onStartTask,
  onPauseTask,
  onResumeTask,
  onCancelTask,
  onBatchStart,
  onBatchPause,
  onBatchCancel,
  onUpdatePriority,
}) => {
  const [selectedTasks, setSelectedTasks] = useState<number[]>([])
  const [showBatchActions, setShowBatchActions] = useState(false)
  const [batchPriority, setBatchPriority] = useState(5)
  const [editingPriority, setEditingPriority] = useState<number | null>(null)
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-blue-600 bg-blue-100'
      case 'completed': return 'text-green-600 bg-green-100'
      case 'paused': return 'text-yellow-600 bg-yellow-100'
      case 'failed': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '等待中'
      case 'running': return '下载中'
      case 'paused': return '已暂停'
      case 'completed': return '已完成'
      case 'failed': return '失败'
      case 'cancelled': return '已取消'
      default: return status
    }
  }

  const getPriority = (task: DownloadTask): number => {
    return task.task_metadata?.priority || 5
  }

  const handleSelectTask = (taskId: number) => {
    setSelectedTasks(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    )
  }

  const handleSelectAll = () => {
    if (selectedTasks.length === tasks.length) {
      setSelectedTasks([])
    } else {
      setSelectedTasks(tasks.map(task => task.id))
    }
  }

  const handleBatchAction = async (action: 'start' | 'pause' | 'cancel') => {
    if (selectedTasks.length === 0) return
    
    try {
      switch (action) {
        case 'start':
          if (onBatchStart) {
            await onBatchStart(selectedTasks, batchPriority)
          }
          break
        case 'pause':
          if (onBatchPause) {
            await onBatchPause(selectedTasks)
          }
          break
        case 'cancel':
          if (onBatchCancel) {
            await onBatchCancel(selectedTasks)
          }
          break
      }
      setSelectedTasks([])
      setShowBatchActions(false)
    } catch (error) {
      console.error(`Batch ${action} failed:`, error)
    }
  }

  const handlePriorityUpdate = async (taskId: number, priority: number) => {
    if (onUpdatePriority) {
      try {
        await onUpdatePriority(taskId, priority)
        setEditingPriority(null)
      } catch (error) {
        console.error('Failed to update priority:', error)
      }
    }
  }

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-ocean-500" />
          <span className="ml-2 text-gray-600">加载中...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-8 text-red-600">
          <AlertCircle className="h-6 w-6 mr-2" />
          <span>加载失败: {error}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          下载任务 ({tasks.length})
          {selectedTasks.length > 0 && (
            <span className="ml-2 text-sm text-ocean-600">已选择 {selectedTasks.length} 个</span>
          )}
        </h2>
        
        {tasks.length > 0 && (
          <div className="flex items-center space-x-2">
            {selectedTasks.length > 0 && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowBatchActions(!showBatchActions)}
                  className="btn-secondary flex items-center space-x-1"
                >
                  <span>批量操作</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${
                    showBatchActions ? 'rotate-180' : ''
                  }`} />
                </button>
                <button
                  onClick={() => setSelectedTasks([])}
                  className="p-2 text-gray-500 hover:text-gray-700 rounded"
                  title="清除选择"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            
            <button
              onClick={handleSelectAll}
              className="p-2 text-gray-500 hover:text-gray-700 rounded"
              title={selectedTasks.length === tasks.length ? "取消全选" : "全选"}
            >
              {selectedTasks.length === tasks.length ? (
                <CheckSquare className="h-4 w-4" />
              ) : (
                <Square className="h-4 w-4" />
              )}
            </button>
          </div>
        )}
      </div>
      
      {/* 批量操作面板 */}
      {showBatchActions && selectedTasks.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">优先级:</label>
                <select
                  value={batchPriority}
                  onChange={(e) => setBatchPriority(Number(e.target.value))}
                  className="form-select text-sm"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(p => (
                    <option key={p} value={p}>{p} {p === 1 ? '(最高)' : p === 10 ? '(最低)' : ''}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleBatchAction('start')}
                className="btn-primary text-sm"
                disabled={!onBatchStart}
              >
                批量开始
              </button>
              <button
                onClick={() => handleBatchAction('pause')}
                className="btn-secondary text-sm"
                disabled={!onBatchPause}
              >
                批量暂停
              </button>
              <button
                onClick={() => handleBatchAction('cancel')}
                className="btn-secondary text-sm text-red-600 hover:text-red-700"
                disabled={!onBatchCancel}
              >
                批量取消
              </button>
            </div>
          </div>
        </div>
      )}
      
      {tasks.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Download className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>暂无下载任务</p>
          <p className="text-sm">点击"新建下载任务"开始</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <div key={task.id} className={`border border-gray-200 rounded-lg p-4 transition-colors ${
              selectedTasks.includes(task.id) ? 'bg-ocean-50 border-ocean-200' : ''
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <button
                    onClick={() => handleSelectTask(task.id)}
                    className="mt-1 p-1 text-gray-400 hover:text-gray-600 rounded"
                  >
                    {selectedTasks.includes(task.id) ? (
                      <CheckSquare className="h-4 w-4 text-ocean-600" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-medium text-gray-900">任务 #{task.id}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(task.status)}`}>
                        {getStatusText(task.status)}
                      </span>
                      
                      {/* 优先级显示/编辑 */}
                      <div className="flex items-center space-x-1">
                        <span className="text-xs text-gray-500">优先级:</span>
                        {editingPriority === task.id ? (
                          <select
                            value={getPriority(task)}
                            onChange={(e) => handlePriorityUpdate(task.id, Number(e.target.value))}
                            onBlur={() => setEditingPriority(null)}
                            className="form-select text-xs w-16"
                            autoFocus
                          >
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(p => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                        ) : (
                          <button
                            onClick={() => setEditingPriority(task.id)}
                            className="text-xs text-ocean-600 hover:text-ocean-800 underline"
                            disabled={!onUpdatePriority}
                          >
                            {getPriority(task)}
                          </button>
                        )}
                      </div>
                    </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
                    <div className="flex items-center space-x-2">
                      <FolderOpen className="h-4 w-4" />
                      <span className="truncate">{task.save_path}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span>{formatDate(task.created_at)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Download className="h-4 w-4" />
                      <span>
                        {task.file_size ? formatFileSize(task.file_size) : '未知大小'}
                      </span>
                    </div>
                  </div>

                  {/* 进度条 */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600">进度</span>
                      <span className="text-gray-900 font-medium">
                        {formatProgress(task.progress)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          task.status === 'completed' ? 'bg-green-500' :
                          task.status === 'running' ? 'bg-blue-500' :
                          task.status === 'paused' ? 'bg-yellow-500' : 
                          task.status === 'failed' ? 'bg-red-500' : 'bg-gray-400'
                        }`}
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                  </div>

                  {task.error_message && (
                    <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                      {task.error_message}
                    </div>
                  )}
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex items-center space-x-2 ml-4">
                  {task.status === 'running' && (
                    <button 
                      onClick={() => onPauseTask(task.id)}
                      className="p-2 text-gray-500 hover:text-gray-700 rounded"
                      title="暂停"
                    >
                      <Pause className="h-4 w-4" />
                    </button>
                  )}
                  
                  {(task.status === 'paused' || task.status === 'failed') && (
                    <button 
                      onClick={() => onResumeTask(task.id)}
                      className="p-2 text-green-500 hover:text-green-700 rounded"
                      title="恢复"
                    >
                      <Play className="h-4 w-4" />
                    </button>
                  )}
                  
                  {task.status === 'pending' && (
                    <button 
                      onClick={() => onStartTask(task.id)}
                      className="p-2 text-green-500 hover:text-green-700 rounded"
                      title="开始"
                    >
                      <Play className="h-4 w-4" />
                    </button>
                  )}

                  {(task.status === 'running' || task.status === 'pending' || task.status === 'paused') && (
                    <button 
                      onClick={() => onCancelTask(task.id)}
                      className="p-2 text-red-500 hover:text-red-700 rounded"
                      title="取消"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}

                  <button className="p-2 text-gray-500 hover:text-gray-700 rounded" title="设置">
                    <Settings className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}