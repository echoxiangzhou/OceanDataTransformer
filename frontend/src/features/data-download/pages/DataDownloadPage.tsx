import React, { useState } from 'react'
import { Plus } from 'lucide-react'
import { DataSourcesGrid } from '../components/DataSourcesGrid'
import { DataSourceManagement } from '../components/DataSourceManagement'
import { DownloadTasksList } from '../components/DownloadTasksList'
import { NewTaskModal } from '../components/NewTaskModal'
import { SchedulerStatus } from '../components/SchedulerStatus'
import { useDownloadTasks } from '../hooks/useDownloadTasks'
import { useWebSocket } from '@/hooks/useWebSocket'
import { WebSocketStatus } from '@/components/WebSocketStatus'

const DataDownloadPage: React.FC = () => {
  const [showNewTaskModal, setShowNewTaskModal] = useState(false)
  const [showDataSourceManagement, setShowDataSourceManagement] = useState(false)
  
  // Initialize WebSocket connection
  const { connection } = useWebSocket()
  const { 
    tasks, 
    loading, 
    error, 
    createTask, 
    startTask, 
    pauseTask, 
    resumeTask, 
    cancelTask,
    deleteTask,
    batchStartTasks,
    batchPauseTasks,
    batchCancelTasks,
    updateTaskPriority
  } = useDownloadTasks()

  const handleCreateTask = async (taskData: any) => {
    try {
      await createTask(taskData)
      setShowNewTaskModal(false)
    } catch (error) {
      // Error is handled in the hook
      console.error('Failed to create task:', error)
    }
  }

  if (showDataSourceManagement) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => setShowDataSourceManagement(false)}
              className="text-ocean-600 hover:text-ocean-800 mb-2 text-sm"
            >
              ← 返回下载管理
            </button>
            <h1 className="text-2xl font-bold text-gray-900">数据源管理</h1>
            <p className="text-gray-600 mt-1">配置和管理海洋数据下载源</p>
          </div>
        </div>
        <DataSourceManagement />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">数据下载管理</h1>
            <WebSocketStatus
              isConnected={connection.isConnected}
              reconnectAttempts={connection.reconnectAttempts}
            />
          </div>
          <p className="text-gray-600 mt-1">国际共享海洋环境数据批量下载</p>
        </div>
        <button
          onClick={() => setShowNewTaskModal(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>新建下载任务</span>
        </button>
      </div>

      {/* 数据源状态 */}
      <DataSourcesGrid onManageClick={() => setShowDataSourceManagement(true)} />

      {/* 调度器状态 */}
      <SchedulerStatus />

      {/* 下载任务列表 */}
      <DownloadTasksList
        tasks={tasks}
        loading={loading}
        error={error}
        onStartTask={startTask}
        onPauseTask={pauseTask}
        onResumeTask={resumeTask}
        onCancelTask={cancelTask}
        onDeleteTask={deleteTask}
        onBatchStart={batchStartTasks}
        onBatchPause={batchPauseTasks}
        onBatchCancel={batchCancelTasks}
        onUpdatePriority={updateTaskPriority}
      />

      {/* 新建任务模态框 */}
      {showNewTaskModal && (
        <NewTaskModal
          onClose={() => setShowNewTaskModal(false)}
          onSubmit={handleCreateTask}
        />
      )}
    </div>
  )
}

export default DataDownloadPage