import { api } from '../lib/api'

export interface Algorithm {
  id: number
  name: string
  version: string
  description: string
  category: 'visualization' | 'analysis' | 'preprocessing' | 'ml_inference'
  language: 'python' | 'r' | 'matlab'
  author: string
  institution?: string
  status: 'registered' | 'building' | 'ready' | 'failed' | 'running'
  docker_image?: string
  last_updated: string
  usage_count: number
  rating: number
  tags?: string[]
  input_formats?: string[]
  output_formats?: string[]
  parameters?: AlgorithmParameter[]
  documentation?: string
  source_code?: string
  is_public: boolean
  execution_time?: number
  memory_usage?: number
  created_at?: string
  updated_at?: string
  execution_count?: number
  last_executed?: string
}

export interface AlgorithmParameter {
  name: string
  type: 'string' | 'number' | 'boolean' | 'file' | 'select'
  description: string
  required: boolean
  default_value?: any
  options?: string[]
  validation?: string
}

export interface ExecutionTask {
  id: number
  algorithm_id: number
  algorithm_name: string
  status: 'queued' | 'running' | 'completed' | 'failed'
  start_time: string
  end_time?: string
  input_files: string[]
  output_files: string[]
  parameters: Record<string, any>
  progress: number
  logs: string[]
  error_message?: string
  container_id?: string
  resource_usage?: {
    cpu: number
    memory: number
    executionTime: number
  }
}

export interface AlgorithmUploadRequest {
  name: string
  version: string
  description: string
  category: Algorithm['category']
  language: Algorithm['language']
  author: string
  institution?: string
  tags: string[]
  inputFormats: string[]
  outputFormats: string[]
  parameters: AlgorithmParameter[]
  isPublic: boolean
  sourceCodeFile?: File
  documentationFile?: File
  autoContainerize?: boolean
}

export interface ExecutionRequest {
  algorithm_id: number
  input_files: File[]
  parameters: Record<string, any>
  output_format?: string
  priority?: 'low' | 'normal' | 'high'
}

export interface AlgorithmStats {
  totalAlgorithms: number
  readyAlgorithms: number
  runningTasks: number
  containerizedAlgorithms: number
  totalUsage: number
  averageRating: number
  averageExecutionTime: number
  totalMemoryAllocated: number
}

class AlgorithmService {
  private baseUrl = '/algorithms'

  // 算法管理
  async getAlgorithms(filters?: {
    category?: string
    language?: string
    status?: string
    isPublic?: boolean
    search?: string
  }): Promise<Algorithm[]> {
    try {
      const params = new URLSearchParams()
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.append(key, value.toString())
          }
        })
      }
      
      const response = await api.get(`${this.baseUrl}?${params.toString()}`)
      // Handle StandardResponse format: {success: true, data: [...]}
      if (response && typeof response === 'object' && 'data' in response) {
        return response.data
      }
      return response
    } catch (error) {
      console.error('Failed to fetch algorithms:', error)
      throw error
    }
  }

  async getAlgorithm(algorithmId: string): Promise<Algorithm> {
    try {
      const response = await api.get(`${this.baseUrl}/${algorithmId}`)
      // Handle StandardResponse format: {success: true, data: {...}}
      if (response && typeof response === 'object' && 'data' in response) {
        return response.data
      }
      return response
    } catch (error) {
      console.error(`Failed to fetch algorithm ${algorithmId}:`, error)
      throw error
    }
  }

  async uploadAlgorithm(requestOrFormData: AlgorithmUploadRequest | FormData): Promise<Algorithm> {
    try {
      let formData: FormData
      
      if (requestOrFormData instanceof FormData) {
        // 如果直接传入FormData，直接使用
        formData = requestOrFormData
      } else {
        // 如果传入的是对象，构建FormData
        const request = requestOrFormData
        formData = new FormData()
        
        // 添加基本信息
        formData.append('name', request.name)
        formData.append('version', request.version)
        formData.append('description', request.description)
        formData.append('category', request.category)
        formData.append('language', request.language)
        formData.append('author', request.author)
        if (request.institution) {
          formData.append('institution', request.institution)
        }
        formData.append('tags', JSON.stringify(request.tags))
        formData.append('input_formats', JSON.stringify(request.inputFormats))
        formData.append('output_formats', JSON.stringify(request.outputFormats))
        formData.append('parameters', JSON.stringify(request.parameters))
        formData.append('is_public', request.isPublic.toString())
        
        if (request.autoContainerize !== undefined) {
          formData.append('auto_containerize', request.autoContainerize.toString())
        }

        // 添加文件
        if (request.sourceCodeFile) {
          formData.append('source_code', request.sourceCodeFile)
        }
        if (request.documentationFile) {
          formData.append('documentation', request.documentationFile)
        }
      }

      const response = await api.post(`${this.baseUrl}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      // Handle StandardResponse format: {success: true, data: {...}}
      if (response && typeof response === 'object' && 'data' in response) {
        return response.data
      }
      return response
    } catch (error) {
      console.error('Failed to upload algorithm:', error)
      throw error
    }
  }

  async updateAlgorithm(algorithmId: string, updates: Partial<Algorithm>): Promise<Algorithm> {
    try {
      const response = await api.put(`${this.baseUrl}/${algorithmId}`, updates)
      // Handle StandardResponse format: {success: true, data: {...}}
      if (response && typeof response === 'object' && 'data' in response) {
        return response.data
      }
      return response
    } catch (error) {
      console.error(`Failed to update algorithm ${algorithmId}:`, error)
      throw error
    }
  }

  async deleteAlgorithm(algorithmId: string): Promise<void> {
    try {
      await api.delete(`${this.baseUrl}/${algorithmId}`)
    } catch (error) {
      console.error(`Failed to delete algorithm ${algorithmId}:`, error)
      throw error
    }
  }

  // 容器化管理
  async buildDockerImage(algorithmId: string): Promise<void> {
    try {
      await api.post(`${this.baseUrl}/${algorithmId}/build`)
    } catch (error) {
      console.error(`Failed to build Docker image for algorithm ${algorithmId}:`, error)
      throw error
    }
  }

  async getDockerBuildLogs(algorithmId: string): Promise<string[]> {
    try {
      const response = await api.get(`${this.baseUrl}/${algorithmId}/build-logs`)
      return response.data
    } catch (error) {
      console.error(`Failed to get build logs for algorithm ${algorithmId}:`, error)
      throw error
    }
  }

  // 执行任务管理
  async executeAlgorithm(request: ExecutionRequest): Promise<ExecutionTask> {
    try {
      const formData = new FormData()
      
      formData.append('algorithm_id', request.algorithm_id.toString())
      formData.append('parameters', JSON.stringify(request.parameters))
      
      if (request.output_format) {
        formData.append('output_format', request.output_format)
      }
      if (request.priority) {
        formData.append('priority', request.priority)
      }

      // 添加输入文件
      request.input_files.forEach((file) => {
        formData.append('input_files', file)
      })

      // 不要手动设置 Content-Type，让浏览器自动设置正确的 boundary
      const response = await api.post(`${this.baseUrl}/execute`, formData)
      
      // Handle StandardResponse format
      if (response && typeof response === 'object' && 'data' in response) {
        return response.data
      }
      return response
    } catch (error) {
      console.error('Failed to execute algorithm:', error)
      throw error
    }
  }

  async getExecutionTasks(filters?: {
    algorithmId?: string
    status?: string
    limit?: number
  }): Promise<ExecutionTask[]> {
    try {
      const params = new URLSearchParams()
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.append(key, value.toString())
          }
        })
      }

      const response = await api.get(`${this.baseUrl}/tasks?${params.toString()}`)
      // Handle StandardResponse format: {success: true, data: [...]}
      if (response && typeof response === 'object' && 'data' in response) {
        return response.data
      }
      return response
    } catch (error) {
      console.error('Failed to fetch execution tasks:', error)
      throw error
    }
  }

  async getExecutionTask(taskId: string): Promise<ExecutionTask> {
    try {
      const response = await api.get(`${this.baseUrl}/tasks/${taskId}`)
      // Handle StandardResponse format: {success: true, data: {...}}
      if (response && typeof response === 'object' && 'data' in response) {
        return response.data
      }
      return response
    } catch (error) {
      console.error(`Failed to fetch task ${taskId}:`, error)
      throw error
    }
  }

  async stopExecutionTask(taskId: string): Promise<void> {
    try {
      await api.post(`${this.baseUrl}/tasks/${taskId}/stop`)
    } catch (error) {
      console.error(`Failed to stop task ${taskId}:`, error)
      throw error
    }
  }

  async getTaskLogs(taskId: string): Promise<string[]> {
    try {
      const response = await api.get(`${this.baseUrl}/tasks/${taskId}/logs`)
      return response.data
    } catch (error) {
      console.error(`Failed to get logs for task ${taskId}:`, error)
      throw error
    }
  }

  async downloadTaskResult(taskId: string, filename: string): Promise<Blob> {
    try {
      const response = await api.get(`${this.baseUrl}/tasks/${taskId}/download/${filename}`, {
        responseType: 'blob'
      })
      return response.data
    } catch (error) {
      console.error(`Failed to download result for task ${taskId}:`, error)
      throw error
    }
  }

  // 统计信息
  async getAlgorithmStats(): Promise<AlgorithmStats> {
    try {
      const response = await api.get(`${this.baseUrl}/stats`)
      // Handle StandardResponse format: {success: true, data: {...}}
      if (response && typeof response === 'object' && 'data' in response) {
        return response.data
      }
      return response
    } catch (error) {
      console.error('Failed to fetch algorithm stats:', error)
      throw error
    }
  }

  // 算法评价
  async rateAlgorithm(algorithmId: string, rating: number, comment?: string): Promise<void> {
    try {
      await api.post(`${this.baseUrl}/${algorithmId}/rate`, {
        rating,
        comment
      })
    } catch (error) {
      console.error(`Failed to rate algorithm ${algorithmId}:`, error)
      throw error
    }
  }

  // 获取算法文档
  async getAlgorithmDocumentation(algorithmId: string): Promise<string> {
    try {
      const response = await api.get(`${this.baseUrl}/${algorithmId}/documentation`)
      return response.data
    } catch (error) {
      console.error(`Failed to get documentation for algorithm ${algorithmId}:`, error)
      throw error
    }
  }

  // 获取算法源代码
  async getAlgorithmSourceCode(algorithmId: string): Promise<string> {
    try {
      const response = await api.get(`${this.baseUrl}/${algorithmId}/source`)
      // Handle StandardResponse format: {success: true, data: "..."}
      if (response && typeof response === 'object' && 'data' in response) {
        return response.data
      }
      return response
    } catch (error) {
      console.error(`Failed to get source code for algorithm ${algorithmId}:`, error)
      throw error
    }
  }

  // 更新算法源代码
  async updateAlgorithmSourceCode(algorithmId: string, sourceCode: string): Promise<boolean> {
    try {
      const response = await api.put(`${this.baseUrl}/${algorithmId}/source`, {
        source_code: sourceCode
      })
      // Handle StandardResponse format: {success: true, data: true}
      if (response && typeof response === 'object' && 'data' in response) {
        return response.data
      }
      return response
    } catch (error) {
      console.error(`Failed to update source code for algorithm ${algorithmId}:`, error)
      throw error
    }
  }

  // 容器资源监控
  async getContainerStats(containerId: string): Promise<{
    cpu: number
    memory: number
    disk: number
    network: number
  }> {
    try {
      const response = await api.get(`${this.baseUrl}/containers/${containerId}/stats`)
      return response.data
    } catch (error) {
      console.error(`Failed to get container stats for ${containerId}:`, error)
      throw error
    }
  }

  // 批量操作
  async batchDeleteAlgorithms(algorithmIds: string[]): Promise<void> {
    try {
      await api.post(`${this.baseUrl}/batch/delete`, { algorithmIds })
    } catch (error) {
      console.error('Failed to batch delete algorithms:', error)
      throw error
    }
  }

  async batchStopTasks(taskIds: string[]): Promise<void> {
    try {
      await api.post(`${this.baseUrl}/tasks/batch/stop`, { taskIds })
    } catch (error) {
      console.error('Failed to batch stop tasks:', error)
      throw error
    }
  }
}

export const algorithmService = new AlgorithmService()