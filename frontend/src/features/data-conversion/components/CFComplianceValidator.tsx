import React, { useState } from 'react'
import { 
  Upload, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  FileText,
  Settings,
  Download,
  RefreshCw,
  Info
} from 'lucide-react'
import { 
  cfComplianceService, 
  ValidationResult, 
  ValidationAndFixResult,
  ValidationIssue
} from '../../../services/cfComplianceService'

interface CFComplianceValidatorProps {
  onValidationComplete?: (result: ValidationResult | ValidationAndFixResult) => void
}

const CFComplianceValidator: React.FC<CFComplianceValidatorProps> = ({ 
  onValidationComplete 
}) => {
  const [file, setFile] = useState<File | null>(null)
  const [validating, setValidating] = useState(false)
  const [result, setResult] = useState<ValidationResult | ValidationAndFixResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'validate' | 'fix'>('validate')
  const [fixOptions, setFixOptions] = useState({
    auto_fix: true,
    backup: true,
    title: '',
    institution: '',
    source: '',
    comment: ''
  })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (!selectedFile.name.toLowerCase().endsWith('.nc') && 
          !selectedFile.name.toLowerCase().endsWith('.netcdf')) {
        setError('请选择NetCDF文件 (.nc 或 .netcdf)')
        return
      }
      setFile(selectedFile)
      setResult(null)
      setError(null)
    }
  }

  const handleValidate = async () => {
    if (!file) return

    setValidating(true)
    setError(null)

    try {
      let validationResult: ValidationResult | ValidationAndFixResult

      if (mode === 'validate') {
        validationResult = await cfComplianceService.validateFile(file)
      } else {
        validationResult = await cfComplianceService.validateAndFix(file, fixOptions)
      }

      setResult(validationResult)
      onValidationComplete?.(validationResult)
    } catch (error: any) {
      setError(error.response?.data?.detail || error.message || '验证失败')
    } finally {
      setValidating(false)
    }
  }

  const renderValidationResult = (result: ValidationResult) => (
    <div className="space-y-4">
      {/* 总体状态 */}
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="flex items-center space-x-3">
          {result.is_valid ? (
            <CheckCircle className="h-8 w-8 text-green-500" />
          ) : (
            <XCircle className="h-8 w-8 text-red-500" />
          )}
          <div>
            <h3 className="font-semibold text-gray-900">
              {result.is_valid ? 'CF-1.8合规' : '不符合CF-1.8标准'}
            </h3>
            <p className="text-sm text-gray-600">
              合规性评分: <span className={cfComplianceService.getComplianceLevelColor(result.compliance_score)}>
                {result.compliance_score}%
              </span>
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-sm text-gray-600">
            总计问题: {result.total_issues}
          </div>
          <div className="text-xs text-gray-500">
            严重: {result.critical_issues} | 警告: {result.warning_issues}
          </div>
        </div>
      </div>

      {/* 问题列表 */}
      {result.issues.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-900 mb-3">检测到的问题:</h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {result.issues.map((issue, index) => (
              <div key={index} className="border rounded-lg p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        cfComplianceService.getIssueLevelColor(issue.level)
                      }`}>
                        {cfComplianceService.getIssueLevelText(issue.level)}
                      </span>
                      <span className="text-xs text-gray-500">{issue.code}</span>
                    </div>
                    <p className="text-sm text-gray-900">{issue.message}</p>
                    <p className="text-xs text-gray-500 mt-1">位置: {issue.location}</p>
                    {issue.suggestion && (
                      <p className="text-xs text-blue-600 mt-1">建议: {issue.suggestion}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  const renderFixResult = (result: ValidationAndFixResult) => (
    <div className="space-y-4">
      {/* 转换状态 */}
      <div className="p-4 border rounded-lg">
        <div className="flex items-center space-x-3 mb-3">
          {result.conversion_success ? (
            <CheckCircle className="h-6 w-6 text-green-500" />
          ) : (
            <XCircle className="h-6 w-6 text-red-500" />
          )}
          <div>
            <h3 className="font-semibold text-gray-900">
              {result.conversion_performed ? 
                (result.conversion_success ? '转换完成' : '转换失败') : 
                '无需转换'
              }
            </h3>
            {result.message && (
              <p className="text-sm text-gray-600">{result.message}</p>
            )}
          </div>
        </div>

        {/* 对比信息 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 p-3 rounded">
            <h4 className="text-sm font-medium text-gray-900 mb-2">原始文件</h4>
            <div className="text-xs space-y-1">
              <div>合规性: {result.validation_result.original.is_valid ? '是' : '否'}</div>
              <div>问题总数: {result.validation_result.original.total_issues}</div>
              <div>评分: {result.validation_result.original.compliance_score}%</div>
            </div>
          </div>
          
          {result.validation_result.final && (
            <div className="bg-green-50 p-3 rounded">
              <h4 className="text-sm font-medium text-gray-900 mb-2">转换后文件</h4>
              <div className="text-xs space-y-1">
                <div>合规性: {result.validation_result.final.is_valid ? '是' : '否'}</div>
                <div>问题总数: {result.validation_result.final.total_issues}</div>
                <div>评分: {result.validation_result.final.compliance_score}%</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 修复的问题 */}
      {result.issues_fixed && result.issues_fixed.length > 0 && (
        <div>
          <h4 className="font-medium text-green-700 mb-3">已修复的问题:</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {result.issues_fixed.map((issue, index) => (
              <div key={index} className="bg-green-50 border border-green-200 rounded p-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-800">{issue.message}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 剩余问题 */}
      {result.remaining_issues && result.remaining_issues.length > 0 && (
        <div>
          <h4 className="font-medium text-yellow-700 mb-3">剩余问题:</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {result.remaining_issues.map((issue, index) => (
              <div key={index} className="bg-yellow-50 border border-yellow-200 rounded p-2">
                <div className="text-sm text-yellow-800">{issue.message}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* 模式选择 */}
      <div className="flex space-x-4">
        <button
          onClick={() => setMode('validate')}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            mode === 'validate'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          仅验证
        </button>
        <button
          onClick={() => setMode('fix')}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            mode === 'fix'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          验证并修复
        </button>
      </div>

      {/* 文件选择 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          选择NetCDF文件
        </label>
        <input
          type="file"
          accept=".nc,.netcdf"
          onChange={handleFileSelect}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>

      {/* 修复选项 */}
      {mode === 'fix' && (
        <div className="border rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">修复选项</h3>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={fixOptions.auto_fix}
                onChange={(e) => setFixOptions(prev => ({ ...prev, auto_fix: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">自动修复问题</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={fixOptions.backup}
                onChange={(e) => setFixOptions(prev => ({ ...prev, backup: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">创建备份</span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">标题</label>
              <input
                type="text"
                value={fixOptions.title}
                onChange={(e) => setFixOptions(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                placeholder="数据标题"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">机构</label>
              <input
                type="text"
                value={fixOptions.institution}
                onChange={(e) => setFixOptions(prev => ({ ...prev, institution: e.target.value }))}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                placeholder="数据来源机构"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">数据源</label>
              <input
                type="text"
                value={fixOptions.source}
                onChange={(e) => setFixOptions(prev => ({ ...prev, source: e.target.value }))}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                placeholder="数据来源描述"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">备注</label>
              <input
                type="text"
                value={fixOptions.comment}
                onChange={(e) => setFixOptions(prev => ({ ...prev, comment: e.target.value }))}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                placeholder="额外备注"
              />
            </div>
          </div>
        </div>
      )}

      {/* 验证按钮 */}
      <button
        onClick={handleValidate}
        disabled={!file || validating}
        className="w-full btn-primary flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {validating ? (
          <>
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>{mode === 'validate' ? '验证中...' : '验证并修复中...'}</span>
          </>
        ) : (
          <>
            <CheckCircle className="h-4 w-4" />
            <span>{mode === 'validate' ? '验证CF合规性' : '验证并修复'}</span>
          </>
        )}
      </button>

      {/* 错误信息 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-center">
            <XCircle className="h-5 w-5 text-red-400" />
            <span className="ml-2 text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* 结果显示 */}
      {result && (
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-4">验证结果</h3>
          {'conversion_performed' in result ? 
            renderFixResult(result as ValidationAndFixResult) : 
            renderValidationResult(result as ValidationResult)
          }
        </div>
      )}
    </div>
  )
}

export default CFComplianceValidator