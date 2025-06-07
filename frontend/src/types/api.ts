// API request and response types

export interface ApiResponse<T> {
  data: T
  message?: string
  success: boolean
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  size: number
  has_next: boolean
  has_prev: boolean
}

export interface ApiError {
  detail: string
  error_code?: string
  timestamp: string
}

// Common request types
export interface PaginationParams {
  page?: number
  size?: number
}

export interface MessageResponse {
  message: string
}

export interface StatusResponse {
  status: string
  message?: string
}