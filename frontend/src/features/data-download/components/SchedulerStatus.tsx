import React, { useState, useEffect } from 'react'
import { Play, Pause, Activity, Clock, Users } from 'lucide-react'
import { downloadService } from '../services/downloadService'
import { useSchedulerStatus } from '@/hooks/useWebSocket'

interface SchedulerStatusData {
  running_tasks: number
  pending_tasks: number
  max_concurrent: number
  scheduler_running: boolean
  running_task_ids: number[]
  pending_task_ids: number[]
}

export const SchedulerStatus: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Use WebSocket for real-time status updates
  const status = useSchedulerStatus()

  const toggleScheduler = async () => {
    if (!status) return
    
    setLoading(true)
    try {
      if (status.scheduler_running) {
        await downloadService.stopScheduler()
      } else {
        await downloadService.startScheduler()
      }
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle scheduler')
    } finally {
      setLoading(false)
    }
  }

  if (!status) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-ocean-500"></div>
          <span className="ml-2 text-sm text-gray-600">加载调度器状态...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
          <Activity className="h-5 w-5 text-ocean-500" />
          <span>任务调度器</span>
        </h3>
        
        <button
          onClick={toggleScheduler}
          disabled={loading}
          className={`flex items-center space-x-2 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
            status.scheduler_running
              ? 'bg-red-100 text-red-700 hover:bg-red-200'
              : 'bg-green-100 text-green-700 hover:bg-green-200'
          } disabled:opacity-50`}
        >
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
          ) : status.scheduler_running ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          <span>{status.scheduler_running ? '停止' : '启动'}</span>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <Activity className={`h-6 w-6 ${
              status.scheduler_running ? 'text-green-500' : 'text-gray-400'
            }`} />
          </div>
          <div className="text-sm text-gray-600">状态</div>
          <div className={`text-lg font-semibold ${
            status.scheduler_running ? 'text-green-600' : 'text-gray-500'
          }`}>
            {status.scheduler_running ? '运行中' : '已停止'}
          </div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <Play className="h-6 w-6 text-blue-500" />
          </div>
          <div className="text-sm text-gray-600">运行任务</div>
          <div className="text-lg font-semibold text-blue-600">
            {status.running_tasks}
          </div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <Clock className="h-6 w-6 text-yellow-500" />
          </div>
          <div className="text-sm text-gray-600">等待任务</div>
          <div className="text-lg font-semibold text-yellow-600">
            {status.pending_tasks}
          </div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <Users className="h-6 w-6 text-purple-500" />
          </div>
          <div className="text-sm text-gray-600">最大并发</div>
          <div className="text-lg font-semibold text-purple-600">
            {status.max_concurrent}
          </div>
        </div>
      </div>

      {/* 进度条显示当前并发使用情况 */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-gray-600">并发使用率</span>
          <span className="text-gray-900 font-medium">
            {status.running_tasks} / {status.max_concurrent}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="h-2 rounded-full transition-all duration-300 bg-gradient-to-r from-blue-400 to-purple-500"
            style={{ width: `${(status.running_tasks / status.max_concurrent) * 100}%` }}
          />
        </div>
      </div>

      {error && (
        <div className="mt-4 text-sm text-red-600 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}
    </div>
  )
}