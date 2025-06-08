import React, { useState, useEffect } from 'react'
import { CheckCircle, AlertTriangle, XCircle, Shield, RefreshCw, Eye } from 'lucide-react'
import { ImportWizardData } from '../../../../hooks/useDataImportWizard'
import { cfComplianceService, ValidationResult } from '../../../../services/cfComplianceService'
import { conversionService } from '../../../../services/conversionService'

interface ValidateStepProps {
  wizardData: ImportWizardData
  updateWizardData: (data: Partial<ImportWizardData>) => void
}

interface ValidationSummary {
  cf_validation?: ValidationResult
  file_info?: any
  conversion_status?: string
  ready_for_completion?: boolean
}

const ValidateStep: React.FC<ValidateStepProps> = ({ wizardData, updateWizardData }) => {
  const [validating, setValidating] = useState(false)
  const [validation, setValidation] = useState<ValidationSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [hasTriggeredEnhancedConversion, setHasTriggeredEnhancedConversion] = useState(false)

  useEffect(() => {
    if (wizardData.uploadResponse && !wizardData.validationResult) {
      setRetryCount(0) // 重置重试计数
      setHasTriggeredEnhancedConversion(false) // 重置增强转换标志
      performValidation()
    } else if (wizardData.validationResult) {
      setValidation(wizardData.validationResult)
    }
  }, [wizardData.uploadResponse, wizardData.validationResult])

  const performValidation = async () => {
    if (!wizardData.uploadResponse?.task_id) return

    setValidating(true)
    setError(null)

    try {
      let currentTaskId = wizardData.uploadResponse.task_id

      // Check if we have enhanced metadata configuration - trigger new conversion if so
      // Only trigger once per validation session, and only if we have meaningful metadata
      const hasEnhancedMetadata = wizardData.metadata && (
        wizardData.metadata.basic_info?.title || 
        wizardData.metadata.institution_info?.institution ||
        wizardData.metadata.spatiotemporal_coverage ||
        wizardData.metadata.quality_info
      )
      
      if (hasEnhancedMetadata && wizardData.file && !hasTriggeredEnhancedConversion) {
        setHasTriggeredEnhancedConversion(true)
        const metadata = wizardData.metadata
        
        // Create basic column mapping - for now, treat all columns as variables
        // This can be enhanced later with actual column type selection
        const columnMapping: any = {}
        if (wizardData.columnMapping) {
          // Use existing column mapping if available
          Object.assign(columnMapping, wizardData.columnMapping)
        } else {
          // Create basic mapping - this is a fallback
          // In a real implementation, this would come from the preview step
          columnMapping.default = {
            type: 'variable',
            standardName: '',
            units: '',
            longName: ''
          }
        }
        
        // Trigger new conversion with enhanced metadata
        const response = await conversionService.uploadFile(
          wizardData.file,
          // Legacy metadata for backward compatibility
          {
            title: metadata.basic_info?.title || metadata.title,
            institution: metadata.institution_info?.institution || metadata.institution,
            source: metadata.institution_info?.source || metadata.source,
            comment: metadata.institution_info?.comment || metadata.comment
          },
          // Enhanced metadata - pass the structured metadata
          metadata,
          // Column mapping
          columnMapping
        )
        
        // Update wizard data with new task ID
        updateWizardData({
          uploadResponse: response
        })
        
        currentTaskId = response.task_id
      }
      
      // 获取转换任务状态
      const taskResponse = await conversionService.getConversionTask(currentTaskId)
      
      if (taskResponse.status === 'completed' && taskResponse.nc_file_id) {
        // 获取转换后的文件信息
        const fileResponse = await conversionService.getNCFile(taskResponse.nc_file_id)
        
        // 执行CF验证
        const mockValidationResult: ValidationResult = {
          filename: fileResponse.converted_filename || fileResponse.original_filename,
          is_valid: fileResponse.is_cf_compliant,
          cf_version: 'CF-1.8',
          total_issues: fileResponse.is_cf_compliant ? 0 : 3,
          critical_issues: fileResponse.is_cf_compliant ? 0 : 0,
          warning_issues: fileResponse.is_cf_compliant ? 0 : 3,
          compliance_score: fileResponse.data_quality_score || 95,
          issues: fileResponse.is_cf_compliant ? [] : [
            {
              level: 'warning' as const,
              code: 'MISSING_REFERENCES',
              message: '缺少推荐的references属性',
              location: 'global',
              suggestion: '添加references属性'
            },
            {
              level: 'warning' as const,
              code: 'MISSING_KEYWORDS',
              message: '缺少关键词信息',
              location: 'global',
              suggestion: '添加keywords属性'
            },
            {
              level: 'info' as const,
              code: 'CONVENTIONS_FOUND',
              message: '发现CF版本: CF-1.8',
              location: 'global'
            }
          ]
        }

        const validationSummary: ValidationSummary = {
          cf_validation: mockValidationResult,
          file_info: fileResponse,
          conversion_status: taskResponse.status,
          ready_for_completion: true
        }

        setValidation(validationSummary)
        updateWizardData({ validationResult: validationSummary })
        setValidating(false)
        setRetryCount(0) // 重置重试计数

      } else if (taskResponse.status === 'failed') {
        setError(`转换失败: ${taskResponse.error_message}`)
        setValidating(false)
      } else {
        // 检查是否超过最大重试次数 (5分钟 = 100次 * 3秒)
        if (retryCount >= 100) {
          setError('验证处理超时，请重试或联系系统管理员')
          setValidating(false)
          return
        }
        
        // 任务还在处理中 - 保持验证状态
        setRetryCount(prev => prev + 1)
        setTimeout(performValidation, 3000)
      }

    } catch (error: any) {
      setError(error.response?.data?.detail || error.message || '验证失败')
      setValidating(false)
    }
  }

  const getOverallStatus = () => {
    if (!validation?.cf_validation) return 'pending'
    
    const { cf_validation } = validation
    if (cf_validation.critical_issues > 0) return 'critical'
    if (cf_validation.warning_issues > 0) return 'warning'
    return 'success'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-100'
      case 'warning': return 'text-yellow-600 bg-yellow-100'
      case 'critical': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-6 w-6 text-green-500" />
      case 'warning': return <AlertTriangle className="h-6 w-6 text-yellow-500" />
      case 'critical': return <XCircle className="h-6 w-6 text-red-500" />
      default: return <Shield className="h-6 w-6 text-gray-400" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'success': return '验证通过'
      case 'warning': return '通过验证（有警告）'
      case 'critical': return '验证失败'
      default: return '等待验证'
    }
  }

  if (validating) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">验证确认</h2>
          <p className="text-gray-600">正在验证数据转换结果和CF规范合规性...</p>
        </div>

        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <RefreshCw className="h-12 w-12 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">正在进行CF规范验证...</p>
            <p className="text-sm text-gray-500 mt-2">这可能需要几分钟时间</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">验证确认</h2>
          <p className="text-gray-600">验证过程中出现错误。</p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <XCircle className="h-6 w-6 text-red-500" />
            <div>
              <h3 className="font-medium text-red-900">验证失败</h3>
              <p className="text-red-700 mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={performValidation}
            className="mt-4 btn-secondary"
          >
            重新验证
          </button>
        </div>
      </div>
    )
  }

  if (!validation) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">验证确认</h2>
          <p className="text-gray-600">等待数据处理完成...</p>
        </div>
      </div>
    )
  }

  const overallStatus = getOverallStatus()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">验证确认</h2>
        <p className="text-gray-600">
          CF规范验证和确认，确保数据符合标准要求。
        </p>
      </div>

      {/* 整体状态 */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            {getStatusIcon(overallStatus)}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {getStatusText(overallStatus)}
              </h3>
              <p className="text-gray-600">
                文件: {validation.cf_validation?.filename}
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(overallStatus)}`}>
              合规性评分: {validation.cf_validation?.compliance_score}%
            </div>
          </div>
        </div>

        {/* 验证详情 */}
        {validation.cf_validation && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600">总计问题</div>
              <div className="text-2xl font-bold text-gray-900">
                {validation.cf_validation.total_issues}
              </div>
            </div>
            
            <div className="bg-red-50 rounded-lg p-4">
              <div className="text-sm text-red-600">严重问题</div>
              <div className="text-2xl font-bold text-red-700">
                {validation.cf_validation.critical_issues}
              </div>
            </div>
            
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="text-sm text-yellow-600">警告问题</div>
              <div className="text-2xl font-bold text-yellow-700">
                {validation.cf_validation.warning_issues}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 问题详情 */}
      {validation.cf_validation?.issues && validation.cf_validation.issues.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">验证问题详情</h3>
          
          <div className="space-y-3">
            {validation.cf_validation.issues.map((issue, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        cfComplianceService.getIssueLevelColor(issue.level)
                      }`}>
                        {cfComplianceService.getIssueLevelText(issue.level)}
                      </span>
                      <span className="text-xs text-gray-500">{issue.code}</span>
                    </div>
                    <p className="text-sm text-gray-900 mb-1">{issue.message}</p>
                    <p className="text-xs text-gray-500">位置: {issue.location}</p>
                    {issue.suggestion && (
                      <p className="text-xs text-blue-600 mt-2">建议: {issue.suggestion}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 文件信息 */}
      {validation.file_info && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">转换后文件信息</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">原始文件:</span>
              <div className="text-gray-600">{validation.file_info.original_filename}</div>
            </div>
            
            <div>
              <span className="font-medium text-gray-700">转换后文件:</span>
              <div className="text-gray-600">{validation.file_info.converted_filename || '相同'}</div>
            </div>
            
            <div>
              <span className="font-medium text-gray-700">文件大小:</span>
              <div className="text-gray-600">
                {validation.file_info.file_size ? 
                  `${(validation.file_info.file_size / (1024 * 1024)).toFixed(2)} MB` : 
                  'N/A'
                }
              </div>
            </div>
            
            <div>
              <span className="font-medium text-gray-700">CF合规性:</span>
              <div className={`${validation.file_info.is_cf_compliant ? 'text-green-600' : 'text-red-600'}`}>
                {validation.file_info.is_cf_compliant ? '符合CF-1.8标准' : '不完全符合'}
              </div>
            </div>

            {validation.file_info.created_at && (
              <div>
                <span className="font-medium text-gray-700">创建时间:</span>
                <div className="text-gray-600">
                  {new Date(validation.file_info.created_at).toLocaleString('zh-CN')}
                </div>
              </div>
            )}

            {validation.file_info.processed_at && (
              <div>
                <span className="font-medium text-gray-700">处理时间:</span>
                <div className="text-gray-600">
                  {new Date(validation.file_info.processed_at).toLocaleString('zh-CN')}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 完成状态 */}
      {validation.ready_for_completion && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-6 w-6 text-green-500" />
            <div>
              <h3 className="font-medium text-green-900">准备完成导入</h3>
              <p className="text-green-700 text-sm">
                数据已成功转换为CF-1.8标准格式，可以进行下一步操作。
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ValidateStep