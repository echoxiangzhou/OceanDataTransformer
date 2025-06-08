import { api } from '../lib/api'

export interface ValidationIssue {
  level: 'critical' | 'warning' | 'info'
  code: string
  message: string
  location: string
  suggestion?: string
}

export interface ValidationResult {
  filename: string
  is_valid: boolean
  cf_version?: string
  total_issues: number
  critical_issues: number
  warning_issues: number
  compliance_score: number
  issues: ValidationIssue[]
}

export interface ValidationAndFixResult {
  filename: string
  original_valid: boolean
  conversion_performed: boolean
  conversion_success?: boolean
  backup_created?: boolean
  issues_fixed?: ValidationIssue[]
  remaining_issues?: ValidationIssue[]
  validation_result: {
    original: {
      is_valid: boolean
      total_issues: number
      critical_issues: number
      compliance_score: number
    }
    final?: {
      is_valid: boolean
      total_issues: number
      critical_issues: number
      compliance_score: number
    }
  }
  converted_file_size?: number
  message?: string
}

export interface CFStandards {
  cf_version: string
  required_global_attributes: string[]
  recommended_global_attributes: string[]
  coordinate_standards: Record<string, any>
  common_variable_standards: Record<string, any>
}

export interface ValidationCodes {
  critical_codes: Record<string, string>
  warning_codes: Record<string, string>
  info_codes: Record<string, string>
}

class CFComplianceService {
  private baseUrl = '/cf-compliance'

  async validateFile(file: File): Promise<ValidationResult> {
    const formData = new FormData()
    formData.append('file', file)

    return await api.post(`${this.baseUrl}/validate`, formData)
  }

  async validateAndFix(
    file: File,
    options?: {
      auto_fix?: boolean
      backup?: boolean
      title?: string
      institution?: string
      source?: string
      comment?: string
    }
  ): Promise<ValidationAndFixResult> {
    const formData = new FormData()
    formData.append('file', file)
    
    if (options?.auto_fix !== undefined) {
      formData.append('auto_fix', String(options.auto_fix))
    }
    if (options?.backup !== undefined) {
      formData.append('backup', String(options.backup))
    }
    if (options?.title) {
      formData.append('title', options.title)
    }
    if (options?.institution) {
      formData.append('institution', options.institution)
    }
    if (options?.source) {
      formData.append('source', options.source)
    }
    if (options?.comment) {
      formData.append('comment', options.comment)
    }

    return await api.post(`${this.baseUrl}/validate-and-fix`, formData)
  }

  async getCFStandards(): Promise<CFStandards> {
    return await api.get(`${this.baseUrl}/standards`)
  }

  async getValidationCodes(): Promise<ValidationCodes> {
    return await api.get(`${this.baseUrl}/validation-codes`)
  }

  getComplianceLevelColor(score: number): string {
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  getComplianceLevelText(score: number): string {
    if (score >= 90) return '高合规性'
    if (score >= 70) return '中等合规性'
    return '低合规性'
  }

  getIssueLevelColor(level: string): string {
    switch (level) {
      case 'critical':
        return 'text-red-600 bg-red-100'
      case 'warning':
        return 'text-yellow-600 bg-yellow-100'
      case 'info':
        return 'text-blue-600 bg-blue-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  getIssueLevelText(level: string): string {
    switch (level) {
      case 'critical':
        return '严重'
      case 'warning':
        return '警告'
      case 'info':
        return '信息'
      default:
        return level
    }
  }
}

export const cfComplianceService = new CFComplianceService()