import React, { useState } from 'react'
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react'
import { ImportWizardData } from '../../../../hooks/useDataImportWizard'
import { conversionService } from '../../../../services/conversionService'

interface UploadStepProps {
  wizardData: ImportWizardData
  updateWizardData: (data: Partial<ImportWizardData>) => void
}

const UploadStep: React.FC<UploadStepProps> = ({ wizardData, updateWizardData }) => {
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supportedFormats = ['csv', 'txt', 'cnv', 'nc', 'netcdf']

  const getFileExtension = (filename: string): string => {
    return filename.split('.').pop()?.toLowerCase() || ''
  }

  const isFileSupported = (file: File): boolean => {
    const extension = getFileExtension(file.name)
    return supportedFormats.includes(extension)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleFileSelect = async (file: File) => {
    setError(null)

    if (!isFileSupported(file)) {
      setError(`不支持的文件格式。支持的格式: ${supportedFormats.join(', ').toUpperCase()}`)
      return
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      setError('文件大小不能超过 50MB')
      return
    }

    // 检查文本文件的编码 (对于CSV, TXT, CNV文件)
    const extension = getFileExtension(file.name)
    if (['csv', 'txt', 'cnv'].includes(extension)) {
      try {
        const text = await file.text()
        // 检查是否包含替换字符 (通常表示编码问题)
        if (text.includes('\uFFFD')) {
          setError('文件编码可能有问题，请确保文件保存为UTF-8格式')
          return
        }
      } catch (encodingError) {
        console.warn('编码检查失败:', encodingError)
        // 继续上传，让后端处理
      }
    }

    setUploading(true)

    try {
      // 优先使用新的session-based API，如果失败则降级到旧的API
      let response, sessionId

      try {
        // 尝试使用新的session API
        const sessionResponse = await conversionService.createImportSession(file, 24)
        sessionId = sessionResponse.session_id
        response = {
          task_id: sessionId,
          detected_format: sessionResponse.file_type,
          filename: sessionResponse.filename,
          message: 'Session created successfully'
        }
      } catch (sessionError) {
        console.warn('Session API not available, falling back to legacy upload:', sessionError)
        
        // 降级到旧的上传API
        const metadata = {
          basic_info: {
            title: file.name.split('.')[0],
            id: `dataset_${Date.now()}`
          },
          institution_info: {
            institution: '',
            source: `Converted from ${getFileExtension(file.name).toUpperCase()} file`,
            comment: ''
          },
          spatiotemporal_coverage: {},
          quality_info: {
            standard_name_vocabulary: 'CF Standard Name Table v79',
            conventions: 'CF-1.8'
          },
          // Legacy fields for backward compatibility
          title: file.name.split('.')[0],
          institution: '',
          source: '',
          comment: ''
        }

        response = await conversionService.uploadFile(file, metadata)
      }
      
      // 更新向导数据
      updateWizardData({
        file,
        fileType: response.detected_format,
        uploadResponse: response,
        sessionId: sessionId,  // 新增session ID
        metadata: sessionId ? undefined : {  // 只有在使用旧API时才设置metadata
          basic_info: {
            title: file.name.split('.')[0],
            id: `dataset_${Date.now()}`
          },
          institution_info: {
            institution: '',
            source: `Converted from ${getFileExtension(file.name).toUpperCase()} file`,
            comment: ''
          },
          spatiotemporal_coverage: {},
          quality_info: {
            standard_name_vocabulary: 'CF Standard Name Table v79',
            conventions: 'CF-1.8'
          }
        }
      })

    } catch (error: any) {
      setError(error.response?.data?.detail || error.message || '文件上传失败')
    } finally {
      setUploading(false)
    }
  }

  const removeFile = async () => {
    // 如果有session ID，清理session
    if (wizardData.sessionId) {
      try {
        await conversionService.deleteImportSession(wizardData.sessionId)
      } catch (error) {
        console.warn('Failed to cleanup session:', error)
      }
    }
    
    updateWizardData({
      file: undefined,
      fileType: undefined,
      uploadResponse: undefined,
      metadata: undefined,
      sessionId: undefined,
      extractedMetadata: undefined
    })
    setError(null)
  }

  const formatFileSize = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 B'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">上传数据文件</h2>
        <p className="text-gray-600">
          选择要导入的数据文件。支持 CSV、TXT、CNV 和 NetCDF 格式。
        </p>
      </div>

      {/* 文件上传区域 */}
      {!wizardData.file && (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
            dragOver
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-upload')?.click()}
        >
          <div className="space-y-4">
            <Upload className="h-12 w-12 text-gray-400 mx-auto" />
            <div>
              <p className="text-lg font-medium text-gray-900">
                点击上传文件或拖拽文件到此处
              </p>
              <p className="text-gray-500 mt-2">
                支持格式: CSV, TXT, CNV, NETCDF
              </p>
              <p className="text-gray-500 text-sm">
                最大文件大小: 50 MB
              </p>
              <p className="text-orange-600 text-xs mt-1">
                ⚠️ 文本文件请使用UTF-8编码格式
              </p>
            </div>
          </div>
          
          <input
            id="file-upload"
            type="file"
            className="hidden"
            onChange={handleFileInputChange}
            accept={supportedFormats.map(ext => `.${ext}`).join(',')}
          />
        </div>
      )}

      {/* 上传中状态 */}
      {uploading && (
        <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent" />
            <span className="text-blue-700 font-medium">正在上传和处理文件...</span>
          </div>
        </div>
      )}

      {/* 已上传文件信息 */}
      {wizardData.file && wizardData.uploadResponse && (
        <div className="border border-green-200 rounded-lg p-4 bg-green-50">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-6 w-6 text-green-500" />
              <div>
                <h3 className="font-medium text-green-900">{wizardData.file.name}</h3>
                <div className="text-sm text-green-700 space-y-1">
                  <p>文件大小: {formatFileSize(wizardData.file.size)}</p>
                  <p>检测格式: {wizardData.uploadResponse.detected_format.toUpperCase()}</p>
                  <p>{wizardData.sessionId ? '会话 ID' : '任务 ID'}: {wizardData.uploadResponse.task_id}</p>
                  {wizardData.sessionId && (
                    <p className="text-blue-600">✨ 智能提取模式已启用</p>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={removeFile}
              className="text-gray-400 hover:text-red-500"
            >
              <span className="sr-only">移除文件</span>
              ×
            </button>
          </div>
        </div>
      )}

      {/* 错误信息 */}
      {error && (
        <div className="border border-red-200 rounded-lg p-4 bg-red-50">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-6 w-6 text-red-500 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-700 mb-2">{error}</p>
              {error.includes('编码') && (
                <div className="text-sm text-red-600 space-y-2">
                  <p className="font-medium">如何转换文件编码为UTF-8：</p>
                  <div className="space-y-1">
                    <p><strong>Excel方法：</strong></p>
                    <ol className="list-decimal list-inside ml-2 space-y-1">
                      <li>在Excel中打开文件</li>
                      <li>点击"文件" → "另存为"</li>
                      <li>选择"CSV UTF-8(逗号分隔)(*.csv)"格式</li>
                      <li>保存文件</li>
                    </ol>
                  </div>
                  <div className="space-y-1">
                    <p><strong>文本编辑器方法：</strong></p>
                    <ol className="list-decimal list-inside ml-2 space-y-1">
                      <li>用Notepad++或VS Code打开文件</li>
                      <li>选择"编码" → "转为UTF-8编码"</li>
                      <li>保存文件</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default UploadStep