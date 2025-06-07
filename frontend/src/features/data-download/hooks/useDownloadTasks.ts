import { useState, useEffect, useCallback } from 'react'
import { downloadService } from '../services/downloadService'
import type { DownloadTask, DownloadTaskCreate } from '@/types/domain'

export function useDownloadTasks() {
  const [tasks, setTasks] = useState<DownloadTask[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTasks = useCallback(async (filters?: { status?: string; source_id?: number }) => {
    setLoading(true)
    setError(null)
    try {
      const data = await downloadService.getDownloadTasks(filters)
      setTasks(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks')
    } finally {
      setLoading(false)
    }
  }, [])

  const createTask = useCallback(async (taskData: DownloadTaskCreate) => {
    try {
      const newTask = await downloadService.createDownloadTask(taskData)
      setTasks(prev => [newTask, ...prev])
      return newTask
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task')
      throw err
    }
  }, [])

  const startTask = useCallback(async (id: number) => {
    try {
      await downloadService.startDownloadTask(id)
      // Refresh tasks to get updated status
      await fetchTasks()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start task')
      throw err
    }
  }, [fetchTasks])

  const pauseTask = useCallback(async (id: number) => {
    try {
      await downloadService.pauseDownloadTask(id)
      await fetchTasks()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pause task')
      throw err
    }
  }, [fetchTasks])

  const resumeTask = useCallback(async (id: number) => {
    try {
      await downloadService.resumeDownloadTask(id)
      await fetchTasks()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resume task')
      throw err
    }
  }, [fetchTasks])

  const cancelTask = useCallback(async (id: number) => {
    try {
      await downloadService.cancelDownloadTask(id)
      setTasks(prev => prev.filter(task => task.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel task')
      throw err
    }
  }, [])

  const batchStartTasks = useCallback(async (taskIds: number[], priority: number) => {
    try {
      await downloadService.startMultipleTasks(taskIds, priority)
      await fetchTasks()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start batch tasks')
      throw err
    }
  }, [fetchTasks])

  const batchPauseTasks = useCallback(async (taskIds: number[]) => {
    try {
      await downloadService.pauseMultipleTasks(taskIds)
      await fetchTasks()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pause batch tasks')
      throw err
    }
  }, [fetchTasks])

  const batchCancelTasks = useCallback(async (taskIds: number[]) => {
    try {
      await downloadService.cancelMultipleTasks(taskIds)
      await fetchTasks()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel batch tasks')
      throw err
    }
  }, [fetchTasks])

  const updateTaskPriority = useCallback(async (taskId: number, priority: number) => {
    try {
      await downloadService.updateTaskPriority(taskId, priority)
      await fetchTasks()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task priority')
      throw err
    }
  }, [fetchTasks])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  return {
    tasks,
    loading,
    error,
    fetchTasks,
    createTask,
    startTask,
    pauseTask,
    resumeTask,
    cancelTask,
    batchStartTasks,
    batchPauseTasks,
    batchCancelTasks,
    updateTaskPriority,
  }
}