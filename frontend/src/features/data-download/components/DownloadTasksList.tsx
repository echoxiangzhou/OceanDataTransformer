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
import { TaskItem } from './TaskItem'

interface DownloadTasksListProps {
  tasks: DownloadTask[]
  loading: boolean
  error: string | null
  onStartTask: (id: number) => Promise<void>
  onPauseTask: (id: number) => Promise<void>
  onResumeTask: (id: number) => Promise<void>
  onCancelTask: (id: number) => Promise<void>
  onDeleteTask: (id: number) => Promise<void>
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
  onDeleteTask,
  onBatchStart,
  onBatchPause,
  onBatchCancel,
  onUpdatePriority,
}) => {
  const [selectedTasks, setSelectedTasks] = useState<number[]>([])
  const [showBatchActions, setShowBatchActions] = useState(false)
  const [batchPriority, setBatchPriority] = useState(5)
  const [editingPriority, setEditingPriority] = useState<number | null>(null)

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
            <TaskItem
              key={task.id}
              task={task}
              isSelected={selectedTasks.includes(task.id)}
              onSelect={handleSelectTask}
              onStartTask={onStartTask}
              onPauseTask={onPauseTask}
              onResumeTask={onResumeTask}
              onCancelTask={onCancelTask}
              onDeleteTask={onDeleteTask}
              onUpdatePriority={onUpdatePriority}
              editingPriority={editingPriority}
              setEditingPriority={setEditingPriority}
            />
          ))}
        </div>
      )}
    </div>
  )
}