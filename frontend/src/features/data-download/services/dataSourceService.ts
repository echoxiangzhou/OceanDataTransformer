import api from '@/lib/api'
import type { DataSource, DataSourceCreate, MessageResponse } from '@/types/domain'

export const dataSourceService = {
  // Get all data sources
  async getDataSources(): Promise<DataSource[]> {
    return api.get<DataSource[]>('/data-download/sources')
  },

  // Get specific data source
  async getDataSource(id: number): Promise<DataSource> {
    return api.get<DataSource>(`/data-download/sources/${id}`)
  },

  // Create new data source
  async createDataSource(data: DataSourceCreate): Promise<DataSource> {
    return api.post<DataSource>('/data-download/sources', data)
  },

  // Update data source
  async updateDataSource(id: number, data: Partial<DataSourceCreate>): Promise<DataSource> {
    return api.put<DataSource>(`/data-download/sources/${id}`, data)
  },

  // Delete data source
  async deleteDataSource(id: number): Promise<MessageResponse> {
    return api.delete<MessageResponse>(`/data-download/sources/${id}`)
  },

  // Test data source connection
  async testConnection(id: number): Promise<{ success: boolean; message: string }> {
    // This would be a custom endpoint to test connectivity
    return api.post<{ success: boolean; message: string }>(`/data-download/sources/${id}/test`)
  },
}