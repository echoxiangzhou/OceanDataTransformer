import React, { useState, useEffect } from 'react'
import { 
  FileText, 
  Download, 
  Eye, 
  Trash2, 
  MoreVertical,
  RefreshCw,
  Database,
  Globe,
  Calendar,
  BarChart3,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react'
import { conversionService, NCFile } from '../../../services/conversionService'

interface NCFilesListProps {
  refreshTrigger?: number
}

const NCFilesList: React.FC<NCFilesListProps> = ({ refreshTrigger }) => {
  const [files, setFiles] = useState<NCFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedFile, setSelectedFile] = useState<NCFile | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [isCleaningUp, setIsCleaningUp] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalFiles, setTotalFiles] = useState(0)
  const itemsPerPage = 5

  useEffect(() => {
    setCurrentPage(1) // Reset to first page when status changes
    loadFiles()
  }, [refreshTrigger, selectedStatus])

  useEffect(() => {
    loadFiles()
  }, [currentPage])

  const loadFiles = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params: any = { 
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage
      }
      if (selectedStatus !== 'all') {
        params.conversion_status = selectedStatus
      }
      
      const response = await conversionService.getNCFiles(params)
      // 检查返回的数据结构
      const filesData = Array.isArray(response) ? response : response.files || []
      const total = typeof response === 'object' && 'total' in response ? response.total : filesData.length
      
      // 过滤只显示符合CF-1.8标准的文件
      const cfCompliantFiles = filesData.filter(file => file.is_cf_compliant)
      setFiles(cfCompliantFiles)
      setTotalFiles(total)
    } catch (error: any) {
      setError(error.response?.data?.detail || error.message || '加载文件失败')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteFile = async (fileId: number) => {
    if (!window.confirm('确定要删除这个文件吗？此操作无法撤销。')) {
      return
    }

    try {
      await conversionService.deleteNCFile(fileId)
      await loadFiles() // Refresh the list
    } catch (error: any) {
      setError(error.response?.data?.detail || error.message || '删除文件失败')
    }
  }

  const handleViewDetails = (file: NCFile) => {
    setSelectedFile(file)
    setShowDetails(true)
  }

  const handleCleanupDuplicates = async () => {
    if (!window.confirm('确定要清理重复文件吗？这将删除除最新版本外的所有重复文件。')) {
      return
    }

    try {
      setIsCleaningUp(true)
      setError(null)
      const result = await conversionService.cleanupDuplicateFiles()
      // 显示成功消息
      alert(result.message)
      // 刷新文件列表
      await loadFiles()
    } catch (error: any) {
      setError(error.response?.data?.detail || error.message || '清理重复文件失败')
    } finally {
      setIsCleaningUp(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Database className="h-4 w-4 text-blue-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100'
      case 'failed': return 'text-red-600 bg-red-100'
      default: return 'text-blue-600 bg-blue-100'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return '已完成'
      case 'failed': return '失败'
      case 'processing': return '处理中'
      case 'pending': return '等待中'
      default: return status
    }
  }

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '-'
    const sizes = ['B', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 B'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString('zh-CN')
  }

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-8 w-8 text-gray-400 animate-spin" />
          <span className="ml-2 text-gray-600">加载中...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h2 className="text-lg font-semibold text-gray-900">标准NetCDF文件</h2>
          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
            CF-1.8标准
          </span>
          {totalFiles > 0 && (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
              共 {totalFiles} 个文件
            </span>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-ocean-500 focus:border-ocean-500 text-sm"
          >
            <option value="all">全部状态</option>
            <option value="completed">已完成</option>
            <option value="processing">处理中</option>
            <option value="failed">失败</option>
          </select>
          
          <button
            onClick={handleCleanupDuplicates}
            disabled={isCleaningUp}
            className="btn-secondary flex items-center space-x-2 disabled:opacity-50"
          >
            <Trash2 className={`h-4 w-4 ${isCleaningUp ? 'animate-pulse' : ''}`} />
            <span>{isCleaningUp ? '清理中...' : '清理重复文件'}</span>
          </button>
          
          <button
            onClick={loadFiles}
            className="btn-secondary flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>刷新</span>
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-center">
            <XCircle className="h-5 w-5 text-red-400" />
            <span className="ml-2 text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Files list */}
      <div className="card">
        {files.length === 0 ? (
          <div className="text-center py-8">
            <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">暂无符合CF-1.8标准的NetCDF文件</p>
            <p className="text-sm text-gray-400">
              使用"向导模式"转换数据文件为标准NetCDF格式
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {files.map((file) => (
              <div key={file.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* File header */}
                    <div className="flex items-center space-x-3 mb-3">
                      {getStatusIcon(file.conversion_status)}
                      <h3 className="font-medium text-gray-900">
                        {file.converted_filename || file.original_filename}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(file.conversion_status)}`}>
                        {getStatusText(file.conversion_status)}
                      </span>
                      {file.is_cf_compliant && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full text-green-600 bg-green-100">
                          CF-1.8 合规
                        </span>
                      )}
                    </div>

                    {/* File details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                      <div>
                        <span className="font-medium">原始格式:</span>
                        <div>{file.original_format.toUpperCase()}</div>
                      </div>
                      
                      <div>
                        <span className="font-medium">文件大小:</span>
                        <div>{formatFileSize(file.file_size)}</div>
                      </div>
                      
                      <div>
                        <span className="font-medium">创建时间:</span>
                        <div>{formatDate(file.created_at)}</div>
                      </div>
                      
                      <div>
                        <span className="font-medium">处理时间:</span>
                        <div>{formatDate(file.processed_at)}</div>
                      </div>
                    </div>

                    {/* Metadata preview */}
                    {(file.title || file.institution) && (
                      <div className="bg-gray-50 rounded-md p-3 text-sm">
                        {file.title && (
                          <div className="mb-1">
                            <span className="font-medium text-gray-700">标题:</span>
                            <span className="ml-2 text-gray-600">{file.title}</span>
                          </div>
                        )}
                        {file.institution && (
                          <div className="mb-1">
                            <span className="font-medium text-gray-700">机构:</span>
                            <span className="ml-2 text-gray-600">{file.institution}</span>
                          </div>
                        )}
                        {file.data_quality_score && (
                          <div>
                            <span className="font-medium text-gray-700">质量评分:</span>
                            <span className="ml-2 text-gray-600">{file.data_quality_score.toFixed(1)}/100</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Geospatial info */}
                    {(file.latitude_min !== undefined || file.longitude_min !== undefined) && (
                      <div className="mt-3 flex items-center space-x-4 text-sm text-gray-600">
                        <Globe className="h-4 w-4" />
                        <span>
                          纬度: {file.latitude_min?.toFixed(2)}° ~ {file.latitude_max?.toFixed(2)}°
                        </span>
                        <span>
                          经度: {file.longitude_min?.toFixed(2)}° ~ {file.longitude_max?.toFixed(2)}°
                        </span>
                      </div>
                    )}

                    {/* Time coverage */}
                    {(file.time_coverage_start || file.time_coverage_end) && (
                      <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span>
                          时间范围: {formatDate(file.time_coverage_start)} ~ {formatDate(file.time_coverage_end)}
                        </span>
                      </div>
                    )}

                    {/* Error message for failed files */}
                    {file.conversion_status === 'failed' && file.error_message && (
                      <div className="mt-3 bg-red-50 border border-red-200 rounded-md p-3 text-sm">
                        <span className="font-medium text-red-700">错误信息:</span>
                        <div className="text-red-600 mt-1">{file.error_message}</div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleViewDetails(file)}
                      className="p-2 text-gray-500 hover:text-blue-600 rounded"
                      title="查看详情"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    
                    {file.conversion_status === 'completed' && (
                      <button
                        className="p-2 text-gray-500 hover:text-green-600 rounded"
                        title="下载文件"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleDeleteFile(file.id)}
                      className="p-2 text-gray-500 hover:text-red-600 rounded"
                      title="删除文件"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    
                    <button
                      className="p-2 text-gray-500 hover:text-gray-700 rounded"
                      title="更多操作"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {files.length > 0 && totalFiles > itemsPerPage && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-gray-700">
            显示第 {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalFiles)} 条，
            共 {totalFiles} 条记录
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              上一页
            </button>
            
            {/* Page numbers */}
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.ceil(totalFiles / itemsPerPage) }, (_, i) => i + 1)
                .filter(page => {
                  // Show first page, last page, current page, and pages around current page
                  const totalPages = Math.ceil(totalFiles / itemsPerPage)
                  return page === 1 || 
                         page === totalPages || 
                         Math.abs(page - currentPage) <= 1
                })
                .map((page, index, arr) => (
                  <React.Fragment key={page}>
                    {index > 0 && arr[index - 1] < page - 1 && (
                      <span className="px-2 text-gray-500">...</span>
                    )}
                    <button
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-2 text-sm border rounded-md ${
                        currentPage === page
                          ? 'bg-ocean-500 text-white border-ocean-500'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  </React.Fragment>
                ))
              }
            </div>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(totalFiles / itemsPerPage)))}
              disabled={currentPage >= Math.ceil(totalFiles / itemsPerPage)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              下一页
            </button>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetails && selectedFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">文件详情</h3>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Basic info */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">基本信息</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">原始文件名:</span>
                      <div className="text-gray-600">{selectedFile.original_filename}</div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">转换后文件名:</span>
                      <div className="text-gray-600">{selectedFile.converted_filename || '-'}</div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">文件大小:</span>
                      <div className="text-gray-600">{formatFileSize(selectedFile.file_size)}</div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">CF合规性:</span>
                      <div className="text-gray-600">{selectedFile.is_cf_compliant ? '是' : '否'}</div>
                    </div>
                  </div>
                </div>

                {/* Metadata */}
                {(selectedFile.title || selectedFile.institution || selectedFile.source) && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">元数据</h4>
                    <div className="grid grid-cols-1 gap-4 text-sm">
                      {selectedFile.title && (
                        <div>
                          <span className="font-medium text-gray-700">标题:</span>
                          <div className="text-gray-600">{selectedFile.title}</div>
                        </div>
                      )}
                      {selectedFile.institution && (
                        <div>
                          <span className="font-medium text-gray-700">机构:</span>
                          <div className="text-gray-600">{selectedFile.institution}</div>
                        </div>
                      )}
                      {selectedFile.source && (
                        <div>
                          <span className="font-medium text-gray-700">数据源:</span>
                          <div className="text-gray-600">{selectedFile.source}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Variables */}
                {selectedFile.variables && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">数据变量</h4>
                    <div className="bg-gray-50 rounded-md p-4">
                      <pre className="text-sm text-gray-600 whitespace-pre-wrap">
                        {JSON.stringify(selectedFile.variables, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Dimensions */}
                {selectedFile.dimensions && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">维度信息</h4>
                    <div className="bg-gray-50 rounded-md p-4">
                      <pre className="text-sm text-gray-600 whitespace-pre-wrap">
                        {JSON.stringify(selectedFile.dimensions, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default NCFilesList