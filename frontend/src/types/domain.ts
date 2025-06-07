// Domain model types

export interface DataSource {
  id: number
  name: string
  url: string
  description?: string
  protocol: 'HTTP' | 'FTP' | 'SFTP'
  auth_required: boolean
  username?: string
  password?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface DataSourceCreate {
  name: string
  url: string
  description?: string
  protocol?: 'HTTP' | 'FTP' | 'SFTP'
  auth_required?: boolean
  username?: string
  password?: string
}

export type TaskStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'

export interface DownloadTask {
  id: number
  source_id: number
  save_path: string
  filename_pattern?: string
  max_retries: number
  timeout: number
  status: TaskStatus
  progress: number
  file_size?: number
  downloaded_size?: number
  error_message?: string
  task_metadata?: Record<string, any>
  created_at: string
  started_at?: string
  completed_at?: string
}

export interface DownloadTaskCreate {
  source_id: number
  save_path: string
  filename_pattern?: string
  max_retries?: number
  timeout?: number
}

export interface NetCDFFile {
  id: number
  original_filename: string
  converted_filename: string
  file_path: string
  file_size: number
  format_version: string
  dimensions?: Record<string, number>
  variables?: string[]
  global_attributes?: Record<string, any>
  time_range?: { start: string; end: string }
  spatial_bounds?: { north: number; south: number; east: number; west: number }
  created_at: string
}

export type AlgorithmCategory = 'visualization' | 'terrain_inversion' | 'data_processing' | 'quality_control'
export type AlgorithmStatus = 'registered' | 'validated' | 'active' | 'inactive' | 'error'
export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

export interface Algorithm {
  id: number
  name: string
  category: AlgorithmCategory
  description: string
  version: string
  docker_image: string
  input_schema?: Record<string, any>
  output_schema?: Record<string, any>
  dependencies?: string[]
  tags?: string[]
  status: AlgorithmStatus
  execution_count: number
  last_executed?: string
  created_at: string
  updated_at: string
}

export interface AlgorithmCreate {
  name: string
  category: AlgorithmCategory
  description: string
  version?: string
  docker_image: string
  input_schema?: Record<string, any>
  output_schema?: Record<string, any>
  dependencies?: string[]
  tags?: string[]
  python_code?: string
  dockerfile_content?: string
}

export interface AlgorithmExecution {
  id: number
  algorithm_id: number
  status: ExecutionStatus
  progress: number
  input_data: Record<string, any>
  output_data?: Record<string, any>
  error_message?: string
  logs?: string[]
  container_id?: string
  created_at: string
  started_at?: string
  completed_at?: string
}

export interface AlgorithmExecutionRequest {
  input_data: Record<string, any>
  parameters?: Record<string, any>
  output_path?: string
}