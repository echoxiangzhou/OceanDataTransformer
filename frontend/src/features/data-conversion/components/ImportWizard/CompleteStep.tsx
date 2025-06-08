import React from 'react'
import { CheckCircle, Download, Eye, FileText, BarChart3, Database } from 'lucide-react'
import { ImportWizardData } from '../../../../hooks/useDataImportWizard'

interface CompleteStepProps {
  wizardData: ImportWizardData
  updateWizardData: (data: Partial<ImportWizardData>) => void
  onReset?: () => void
}

const CompleteStep: React.FC<CompleteStepProps> = ({ wizardData, onReset }) => {
  const validationResult = wizardData.validationResult
  const fileInfo = validationResult?.file_info
  const cfValidation = validationResult?.cf_validation

  const handleDownload = () => {
    // 实际实现中应该调用下载API
    console.log('下载文件:', fileInfo?.id)
  }

  const handleViewDetails = () => {
    // 跳转到文件详情页面
    console.log('查看详情:', fileInfo?.id)
  }

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'N/A'
    const sizes = ['B', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 B'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">导入完成</h2>
        <p className="text-gray-600">
          数据文件已成功转换为CF-1.8标准格式并保存到系统中。
        </p>
      </div>

      {/* 成功状态 */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center space-x-4 mb-4">
          <div className="flex-shrink-0">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-green-900">
              数据导入成功完成！
            </h3>
            <p className="text-green-700">
              您的数据已经成功转换为CF-1.8标准格式，可以开始使用了。
            </p>
          </div>
        </div>

        {/* 文件信息摘要 */}
        {fileInfo && (
          <div className="bg-white rounded-lg p-4 mt-4">
            <h4 className="font-medium text-gray-900 mb-3">文件信息</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">原始文件:</span>
                <div className="text-gray-600">{fileInfo.original_filename}</div>
              </div>
              <div>
                <span className="font-medium text-gray-700">NetCDF文件:</span>
                <div className="text-gray-600">{fileInfo.converted_filename || fileInfo.original_filename}</div>
              </div>
              <div>
                <span className="font-medium text-gray-700">文件大小:</span>
                <div className="text-gray-600">{formatFileSize(fileInfo.file_size)}</div>
              </div>
              <div>
                <span className="font-medium text-gray-700">CF合规性:</span>
                <div className={`${fileInfo.is_cf_compliant ? 'text-green-600' : 'text-yellow-600'}`}>
                  {fileInfo.is_cf_compliant ? '✓ 符合CF-1.8标准' : '⚠ 部分符合'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 质量评估 */}
      {cfValidation && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">质量评估结果</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <BarChart3 className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-600">
                {cfValidation.compliance_score}%
              </div>
              <div className="text-sm text-blue-700">合规性评分</div>
            </div>
            
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <FileText className="h-8 w-8 text-gray-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-600">
                {cfValidation.total_issues}
              </div>
              <div className="text-sm text-gray-700">总计问题</div>
            </div>
            
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {cfValidation.critical_issues}
              </div>
              <div className="text-sm text-red-700">严重问题</div>
            </div>
            
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {cfValidation.warning_issues}
              </div>
              <div className="text-sm text-yellow-700">警告问题</div>
            </div>
          </div>

          {cfValidation.is_valid && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-green-700 font-medium">
                  文件完全符合CF-1.8标准要求
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 操作选项 */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">接下来您可以</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={handleDownload}
            className="flex items-center justify-center space-x-2 p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="h-5 w-5 text-blue-500" />
            <span className="text-gray-700">下载NetCDF文件</span>
          </button>
          
          <button
            onClick={handleViewDetails}
            className="flex items-center justify-center space-x-2 p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Eye className="h-5 w-5 text-green-500" />
            <span className="text-gray-700">查看文件详情</span>
          </button>
          
          <button
            onClick={onReset}
            className="flex items-center justify-center space-x-2 p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Database className="h-5 w-5 text-purple-500" />
            <span className="text-gray-700">导入更多文件</span>
          </button>
        </div>
      </div>

      {/* 元数据摘要 */}
      {wizardData.metadata && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">元数据信息</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">标题:</span>
              <div className="text-gray-600">{wizardData.metadata.title}</div>
            </div>
            <div>
              <span className="font-medium text-gray-700">机构:</span>
              <div className="text-gray-600">{wizardData.metadata.institution}</div>
            </div>
            <div>
              <span className="font-medium text-gray-700">数据源:</span>
              <div className="text-gray-600">{wizardData.metadata.source}</div>
            </div>
            {wizardData.metadata.comment && (
              <div>
                <span className="font-medium text-gray-700">备注:</span>
                <div className="text-gray-600">{wizardData.metadata.comment}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 处理统计 */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">处理统计</h3>
        
        <div className="text-sm text-gray-600 space-y-2">
          <div className="flex justify-between">
            <span>原始格式:</span>
            <span className="font-medium">{wizardData.fileType?.toUpperCase()}</span>
          </div>
          <div className="flex justify-between">
            <span>目标格式:</span>
            <span className="font-medium">NetCDF CF-1.8</span>
          </div>
          <div className="flex justify-between">
            <span>处理时间:</span>
            <span className="font-medium">
              {fileInfo?.created_at && fileInfo?.processed_at ? 
                `${Math.round((new Date(fileInfo.processed_at).getTime() - new Date(fileInfo.created_at).getTime()) / 1000)}秒` :
                'N/A'
              }
            </span>
          </div>
          <div className="flex justify-between">
            <span>任务ID:</span>
            <span className="font-mono text-xs">{wizardData.uploadResponse?.task_id}</span>
          </div>
        </div>
      </div>

      {/* 注意事项 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">使用说明</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• 转换后的NetCDF文件已保存在系统中，您可以随时下载或查看</li>
          <li>• 如果发现数据质量问题，可以重新调整元数据后再次转换</li>
          <li>• 转换后的文件符合国际CF-1.8标准，便于数据共享和交换</li>
          <li>• 您可以在"NetCDF文件"页面中管理所有已转换的文件</li>
        </ul>
      </div>
    </div>
  )
}

export default CompleteStep