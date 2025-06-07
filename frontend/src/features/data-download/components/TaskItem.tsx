import React, { useState } from 'react'
import { 
  Play, 
  Pause, 
  Settings, 
  FolderOpen,
  Clock,
  Download,
  X,
  CheckSquare,
  Square,
  Trash2
} from 'lucide-react'
import type { DownloadTask } from '@/types/domain'
import { formatDate, formatFileSize, formatProgress } from '@/lib/utils'
import { useTaskProgress } from '@/hooks/useWebSocket'

interface TaskItemProps {
  task: DownloadTask
  isSelected: boolean
  onSelect: (taskId: number) => void
  onStartTask: (id: number) => Promise<void>
  onPauseTask: (id: number) => Promise<void>
  onResumeTask: (id: number) => Promise<void>
  onCancelTask: (id: number) => Promise<void>
  onDeleteTask: (id: number) => Promise<void>
  onUpdatePriority?: (taskId: number, priority: number) => Promise<void>
  editingPriority: number | null
  setEditingPriority: (taskId: number | null) => void
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  isSelected,
  onSelect,
  onStartTask,
  onPauseTask,
  onResumeTask,
  onCancelTask,
  onDeleteTask,
  onUpdatePriority,
  editingPriority,
  setEditingPriority,
}) => {
  // Use real-time progress for running tasks
  const { progress: realTimeProgress } = useTaskProgress(
    task.status === 'running' ? task.id : 0
  )

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

  // Use real-time progress if available, otherwise fall back to task progress
  const currentProgress = realTimeProgress?.progress ?? task.progress
  const currentStatus = realTimeProgress?.status ?? task.status
  const downloadedSize = realTimeProgress?.downloaded_size ?? 0
  const totalSize = realTimeProgress?.total_size ?? task.file_size

  return (
    <div className={`border border-gray-200 rounded-lg p-4 transition-colors ${
      isSelected ? 'bg-ocean-50 border-ocean-200' : ''
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <button
            onClick={() => onSelect(task.id)}
            className="mt-1 p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            {isSelected ? (
              <CheckSquare className="h-4 w-4 text-ocean-600" />
            ) : (
              <Square className="h-4 w-4" />
            )}
          </button>
          
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h3 className="font-medium text-gray-900">任务 #{task.id}</h3>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(currentStatus)}`}>
                {getStatusText(currentStatus)}
              </span>
              
              {/* Real-time status indicator */}
              {realTimeProgress && (
                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                  实时
                </span>
              )}
              
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
                  {totalSize ? formatFileSize(totalSize) : '未知大小'}
                  {downloadedSize > 0 && totalSize && (
                    <span className="text-blue-600 ml-1">
                      ({formatFileSize(downloadedSize)})
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* 进度条 */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-sm mb-1">
                <div className="flex items-center space-x-2">
                  <span className="text-gray-600">进度</span>
                  {/* 显示目录下载的文件进度 */}
                  {realTimeProgress && realTimeProgress.total_files && (
                    <span className="text-xs text-gray-500">
                      ({realTimeProgress.files_completed || 0}/{realTimeProgress.total_files} 文件)
                    </span>
                  )}
                </div>
                <span className="text-gray-900 font-medium">
                  {formatProgress(currentProgress)}
                  {realTimeProgress && currentStatus === 'running' && (
                    <span className="text-blue-600 ml-1 animate-pulse">⬇</span>
                  )}
                </span>
              </div>
              
              {/* 当前文件信息 */}
              {realTimeProgress && realTimeProgress.current_file && currentStatus === 'running' && (
                <div className="text-xs text-gray-500 mb-1">
                  正在下载: {realTimeProgress.current_file}
                  {realTimeProgress.file_progress && (
                    <span className="ml-1">({Math.round(realTimeProgress.file_progress)}%)</span>
                  )}
                </div>
              )}
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    currentStatus === 'completed' ? 'bg-green-500' :
                    currentStatus === 'running' ? 'bg-blue-500 bg-gradient-to-r from-blue-400 to-blue-600' :
                    currentStatus === 'paused' ? 'bg-yellow-500' : 
                    currentStatus === 'failed' ? 'bg-red-500' : 'bg-gray-400'
                  }`}
                  style={{ width: `${Math.max(0, Math.min(100, currentProgress))}%` }}
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

          {/* 删除按钮 - 只对已完成、已取消或失败的任务显示 */}
          {(task.status === 'completed' || task.status === 'cancelled' || task.status === 'failed') && (
            <button 
              onClick={() => {
                if (window.confirm(`确定要删除任务 #${task.id} 吗？此操作不可撤销。`)) {
                  onDeleteTask(task.id)
                }
              }}
              className="p-2 text-red-500 hover:text-red-700 rounded"
              title="删除"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}

          <button className="p-2 text-gray-500 hover:text-gray-700 rounded" title="设置">
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}