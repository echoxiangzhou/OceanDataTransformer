import api from '@/lib/api'
import type { DataSource, DataSourceCreate, DownloadTask, DownloadTaskCreate, MessageResponse } from '@/types/domain'

export const downloadService = {
  // Data Sources
  async getDataSources(): Promise<DataSource[]> {
    return api.get<DataSource[]>('/data-download/sources')
  },

  async createDataSource(data: DataSourceCreate): Promise<DataSource> {
    return api.post<DataSource>('/data-download/sources', data)
  },

  async updateDataSource(id: number, data: Partial<DataSourceCreate>): Promise<DataSource> {
    return api.put<DataSource>(`/data-download/sources/${id}`, data)
  },

  async deleteDataSource(id: number): Promise<MessageResponse> {
    return api.delete<MessageResponse>(`/data-download/sources/${id}`)
  },

  // Download Tasks
  async getDownloadTasks(params?: { status?: string; source_id?: number }): Promise<DownloadTask[]> {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.append('status', params.status)
    if (params?.source_id) searchParams.append('source_id', params.source_id.toString())
    
    const query = searchParams.toString()
    return api.get<DownloadTask[]>(`/data-download/tasks${query ? `?${query}` : ''}`)
  },

  async createDownloadTask(data: DownloadTaskCreate): Promise<DownloadTask> {
    return api.post<DownloadTask>('/data-download/tasks', data)
  },

  async getDownloadTask(id: number): Promise<DownloadTask> {
    return api.get<DownloadTask>(`/data-download/tasks/${id}`)
  },

  async startDownloadTask(id: number): Promise<MessageResponse> {
    return api.post<MessageResponse>(`/data-download/tasks/${id}/start`)
  },

  async pauseDownloadTask(id: number): Promise<MessageResponse> {
    return api.post<MessageResponse>(`/data-download/tasks/${id}/pause`)
  },

  async resumeDownloadTask(id: number): Promise<MessageResponse> {
    return api.post<MessageResponse>(`/data-download/tasks/${id}/resume`)
  },

  async cancelDownloadTask(id: number): Promise<MessageResponse> {
    return api.post<MessageResponse>(`/data-download/tasks/${id}/cancel`)
  },

  async deleteDownloadTask(id: number): Promise<MessageResponse> {
    return api.delete<MessageResponse>(`/data-download/tasks/${id}`)
  },

  // Batch operations
  async startMultipleTasks(taskIds: number[], priority: number = 5): Promise<MessageResponse> {
    return api.post<MessageResponse>(`/data-download/tasks/batch/start?priority=${priority}`, taskIds)
  },

  async pauseMultipleTasks(taskIds: number[]): Promise<MessageResponse> {
    return api.post<MessageResponse>('/data-download/tasks/batch/pause', taskIds)
  },

  async cancelMultipleTasks(taskIds: number[]): Promise<MessageResponse> {
    return api.post<MessageResponse>('/data-download/tasks/batch/cancel', taskIds)
  },

  // Priority management
  async updateTaskPriority(id: number, priority: number): Promise<MessageResponse> {
    return api.put<MessageResponse>(`/data-download/tasks/${id}/priority?priority=${priority}`)
  },

  // Scheduler management
  async getSchedulerStatus(): Promise<{
    running_tasks: number
    pending_tasks: number
    max_concurrent: number
    scheduler_running: boolean
    running_task_ids: number[]
    pending_task_ids: number[]
  }> {
    return api.get('/data-download/scheduler/status')
  },

  async startScheduler(): Promise<MessageResponse> {
    return api.post<MessageResponse>('/data-download/scheduler/start')
  },

  async stopScheduler(): Promise<MessageResponse> {
    return api.post<MessageResponse>('/data-download/scheduler/stop')
  },
}