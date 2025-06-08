import { api } from '../lib/api'

export interface SupportedFormat {
  [key: string]: string
}

export interface SupportedFormatsResponse {
  supported_formats: string[]
  descriptions: SupportedFormat
}

export interface ConversionTask {
  id: number
  original_filename: string
  original_format: string
  target_format: string
  original_file_path: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  error_message?: string
  nc_file_id?: number
  created_at: string
  started_at?: string
  completed_at?: string
  conversion_options?: Record<string, any>
}

export interface NCFile {
  id: number
  original_filename: string
  converted_filename?: string
  original_format: string
  file_size?: number
  file_path: string
  conversion_status: 'pending' | 'processing' | 'completed' | 'failed'
  title?: string
  institution?: string
  source?: string
  history?: string
  references?: string
  comment?: string
  latitude_min?: number
  latitude_max?: number
  longitude_min?: number
  longitude_max?: number
  depth_min?: number
  depth_max?: number
  time_coverage_start?: string
  time_coverage_end?: string
  variables?: Record<string, any>
  dimensions?: Record<string, any>
  is_cf_compliant: boolean
  data_quality_score?: number
  created_at: string
  updated_at?: string
  processed_at?: string
  error_message?: string
}

export interface UploadResponse {
  message: string
  task_id: number
  detected_format: string
  filename: string
}

class ConversionService {
  private baseUrl = '/data-conversion'

  async getSupportedFormats(): Promise<SupportedFormatsResponse> {
    return await api.get(`${this.baseUrl}/formats`)
  }

  async uploadFile(
    file: File,
    metadata?: {
      title?: string
      institution?: string
      source?: string
      comment?: string
    },
    enhancedMetadata?: any,
    columnMapping?: any
  ): Promise<UploadResponse> {
    const formData = new FormData()
    formData.append('file', file)
    
    // Legacy metadata fields for backward compatibility
    if (metadata?.title) formData.append('title', metadata.title)
    if (metadata?.institution) formData.append('institution', metadata.institution)
    if (metadata?.source) formData.append('source', metadata.source)
    if (metadata?.comment) formData.append('comment', metadata.comment)

    // Enhanced metadata and column mapping
    if (enhancedMetadata) {
      formData.append('metadata', JSON.stringify(enhancedMetadata))
    }
    if (columnMapping) {
      formData.append('columnMapping', JSON.stringify(columnMapping))
    }

    return await api.post(`${this.baseUrl}/upload`, formData)
  }

  async getConversionTasks(params?: {
    skip?: number
    limit?: number
    status?: string
  }): Promise<ConversionTask[]> {
    return await api.get(`${this.baseUrl}/tasks`)
  }

  async getConversionTask(taskId: number): Promise<ConversionTask> {
    return await api.get(`${this.baseUrl}/tasks/${taskId}`)
  }

  async cancelConversionTask(taskId: number): Promise<void> {
    await api.post(`${this.baseUrl}/tasks/${taskId}/cancel`)
  }

  async getNCFiles(params?: {
    skip?: number
    limit?: number
    offset?: number
    conversion_status?: string
  }): Promise<{ files: NCFile[], total: number }> {
    const queryParams = new URLSearchParams()
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.skip) queryParams.append('skip', params.skip.toString())
    if (params?.offset) queryParams.append('offset', params.offset.toString())
    if (params?.conversion_status) queryParams.append('conversion_status', params.conversion_status)
    
    const url = queryParams.toString() ? `${this.baseUrl}/nc-files?${queryParams}` : `${this.baseUrl}/nc-files`
    return await api.get(url)
  }

  async getNCFile(fileId: number): Promise<NCFile> {
    return await api.get(`${this.baseUrl}/nc-files/${fileId}`)
  }

  async deleteNCFile(fileId: number): Promise<void> {
    await api.delete(`${this.baseUrl}/nc-files/${fileId}`)
  }

  async getNCFilePreview(fileId: number, limit: number = 100): Promise<{
    columns: string[]
    coordinates: string[]
    sample_data: Record<string, any>[]
    total_rows: number
    data_types: Record<string, string>
    has_coordinates: boolean
    has_time_column: boolean
    detected_variables: string[]
    error?: string
  }> {
    return await api.get(`${this.baseUrl}/nc-files/${fileId}/preview?limit=${limit}`)
  }

  async cleanupDuplicateFiles(): Promise<{ message: string }> {
    return await api.post(`${this.baseUrl}/nc-files/cleanup-duplicates`)
  }

  // Import Wizard methods
  async createImportSession(file: File, sessionDurationHours: number = 24): Promise<{
    session_id: string
    filename: string
    file_type: string
    expires_at: string
  }> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('session_duration_hours', sessionDurationHours.toString())
    
    const response = await api.post('/import-wizard/sessions', formData)
    // 处理StandardResponse格式: {success: true, data: {...}}
    if (response.data && response.data.success && response.data.data) {
      return response.data.data
    }
    return response.data
  }

  async getImportSession(sessionId: string): Promise<any> {
    const response = await api.get(`/import-wizard/sessions/${sessionId}`)
    // 处理StandardResponse格式: {success: true, data: {...}}
    if (response.data && response.data.success && response.data.data) {
      return response.data.data
    }
    return response.data
  }

  async extractMetadata(sessionId: string): Promise<{
    basic_info?: {
      title?: string
      summary?: string
      keywords?: string
      id?: string
      naming_authority?: string
    }
    institution_info?: {
      institution?: string
      source?: string
      creator_name?: string
      creator_email?: string
      publisher_name?: string
      publisher_email?: string
      references?: string
      comment?: string
    }
    spatiotemporal_coverage?: {
      geospatial_lat_min?: number
      geospatial_lat_max?: number
      geospatial_lon_min?: number
      geospatial_lon_max?: number
      geospatial_vertical_min?: number
      geospatial_vertical_max?: number
      time_coverage_start?: string
      time_coverage_end?: string
      time_coverage_duration?: string
      time_coverage_resolution?: string
    }
    quality_info?: {
      standard_name_vocabulary?: string
      processing_level?: string
      quality_control?: string
      license?: string
      metadata_link?: string
    }
  }> {
    const response = await api.post(`/import-wizard/sessions/${sessionId}/extract-metadata`)
    // 处理StandardResponse格式: {success: true, data: {...}}
    if (response.data && response.data.success && response.data.data) {
      return response.data.data
    }
    // 如果是直接的数据格式，则直接返回
    return response.data
  }

  async validateSessionFile(sessionId: string): Promise<{
    is_valid: boolean
    file_type: string
    file_size: number
    estimated_rows?: number
    detected_columns: string[]
    has_time_column: boolean
    has_coordinates: boolean
    validation_errors: Array<{
      code: string
      message: string
      field?: string
    }>
    validation_warnings: Array<{
      code: string
      message: string
      field?: string
    }>
    recommendations: string[]
  }> {
    const response = await api.post(`/import-wizard/sessions/${sessionId}/validate`)
    // 处理StandardResponse格式: {success: true, data: {...}}
    if (response.data && response.data.success && response.data.data) {
      return response.data.data
    }
    return response.data
  }

  async previewSessionData(sessionId: string, previewRequest: {
    file_path?: string
    limit?: number
    column_mapping?: any[]
    metadata_config?: any
  }): Promise<{
    columns: string[]
    sample_data: Record<string, any>[]
    total_rows: number
    data_types: Record<string, string>
    coordinate_variables: string[]
    data_variables: string[]
    metadata_preview?: Record<string, any>
  }> {
    const response = await api.post(`/import-wizard/sessions/${sessionId}/preview`, previewRequest)
    // 处理StandardResponse格式: {success: true, data: {...}}
    if (response.data && response.data.success && response.data.data) {
      return response.data.data
    }
    // 如果是直接的数据格式，则直接返回
    return response.data
  }

  async convertSessionData(sessionId: string, conversionRequest: {
    file_path?: string
    output_path?: string
    column_mapping: any[]
    metadata_config: any
    validation_options?: Record<string, any>
    force_overwrite?: boolean
  }): Promise<{
    success: boolean
    output_path?: string
    nc_file_id?: number
    cf_compliant: boolean
    issues_fixed?: string[]
    remaining_issues?: any[]
    quality_score?: number
    processing_log?: string
    error_message?: string
  }> {
    const response = await api.post(`/import-wizard/sessions/${sessionId}/convert`, conversionRequest)
    // 处理StandardResponse格式: {success: true, data: {...}}
    if (response.data && response.data.success && response.data.data) {
      return response.data.data
    }
    return response.data
  }

  async deleteImportSession(sessionId: string): Promise<{ message: string }> {
    const response = await api.delete(`/import-wizard/sessions/${sessionId}`)
    // 处理StandardResponse格式: {success: true, data: {...}}
    if (response.data && response.data.success && response.data.data) {
      return response.data.data
    }
    return response.data
  }
}

export const conversionService = new ConversionService()