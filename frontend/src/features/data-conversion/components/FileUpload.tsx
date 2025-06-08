import React, { useState, useRef } from 'react'
import { Upload, X, FileText, AlertCircle, CheckCircle } from 'lucide-react'
import { conversionService, UploadResponse } from '../../../services/conversionService'

interface FileUploadProps {
  onUploadSuccess?: (response: UploadResponse) => void
  onUploadError?: (error: string) => void
}

interface FileWithMetadata {
  file: File
  preview?: string
  metadata: {
    title?: string
    institution?: string
    source?: string
    comment?: string
  }
}

const FileUpload: React.FC<FileUploadProps> = ({ onUploadSuccess, onUploadError }) => {
  const [files, setFiles] = useState<FileWithMetadata[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [supportedFormats, setSupportedFormats] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    loadSupportedFormats()
  }, [])

  const loadSupportedFormats = async () => {
    try {
      const response = await conversionService.getSupportedFormats()
      setSupportedFormats(response.supported_formats)
    } catch (error) {
      console.error('Failed to load supported formats:', error)
    }
  }

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
    
    const droppedFiles = Array.from(e.dataTransfer.files)
    addFiles(droppedFiles)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    addFiles(selectedFiles)
  }

  const addFiles = (newFiles: File[]) => {
    const validFiles = newFiles.filter(isFileSupported)
    const invalidFiles = newFiles.filter(file => !isFileSupported(file))

    if (invalidFiles.length > 0) {
      const extensions = invalidFiles.map(f => getFileExtension(f.name)).join(', ')
      onUploadError?.(`不支持的文件格式: ${extensions}`)
    }

    const filesWithMetadata: FileWithMetadata[] = validFiles.map(file => ({
      file,
      metadata: {
        title: file.name.split('.')[0],
        institution: '',
        source: '',
        comment: ''
      }
    }))

    setFiles(prev => [...prev, ...filesWithMetadata])
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const updateFileMetadata = (index: number, field: string, value: string) => {
    setFiles(prev => prev.map((fileData, i) => 
      i === index 
        ? { ...fileData, metadata: { ...fileData.metadata, [field]: value } }
        : fileData
    ))
  }

  const uploadFiles = async () => {
    if (files.length === 0) return

    setUploading(true)
    
    try {
      for (const { file, metadata } of files) {
        const response = await conversionService.uploadFile(file, metadata)
        onUploadSuccess?.(response)
      }
      
      setFiles([])
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || '上传失败'
      onUploadError?.(errorMessage)
    } finally {
      setUploading(false)
    }
  }

  const formatFileSize = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 B'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`
  }

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragOver
            ? 'border-ocean-500 bg-ocean-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="space-y-4">
          <Upload className="h-12 w-12 text-gray-400 mx-auto" />
          <div>
            <p className="text-lg font-medium text-gray-900">
              拖拽文件到此处，或
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-ocean-600 hover:text-ocean-700 ml-1"
              >
                点击选择文件
              </button>
            </p>
            <p className="text-gray-500 mt-2">
              支持格式: {supportedFormats.join(', ').toUpperCase()}
            </p>
          </div>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept={supportedFormats.map(ext => `.${ext}`).join(',')}
        />
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">待上传文件 ({files.length})</h3>
          
          {files.map((fileData, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <FileText className="h-8 w-8 text-blue-500" />
                  <div>
                    <h4 className="font-medium text-gray-900">{fileData.file.name}</h4>
                    <p className="text-sm text-gray-500">
                      {formatFileSize(fileData.file.size)} • {getFileExtension(fileData.file.name).toUpperCase()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Metadata Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    标题
                  </label>
                  <input
                    type="text"
                    value={fileData.metadata.title || ''}
                    onChange={(e) => updateFileMetadata(index, 'title', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-ocean-500 focus:border-ocean-500 text-sm"
                    placeholder="数据标题"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    机构
                  </label>
                  <input
                    type="text"
                    value={fileData.metadata.institution || ''}
                    onChange={(e) => updateFileMetadata(index, 'institution', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-ocean-500 focus:border-ocean-500 text-sm"
                    placeholder="数据来源机构"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    数据源
                  </label>
                  <input
                    type="text"
                    value={fileData.metadata.source || ''}
                    onChange={(e) => updateFileMetadata(index, 'source', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-ocean-500 focus:border-ocean-500 text-sm"
                    placeholder="数据来源描述"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    备注
                  </label>
                  <input
                    type="text"
                    value={fileData.metadata.comment || ''}
                    onChange={(e) => updateFileMetadata(index, 'comment', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-ocean-500 focus:border-ocean-500 text-sm"
                    placeholder="额外备注信息"
                  />
                </div>
              </div>
            </div>
          ))}

          {/* Upload Button */}
          <div className="flex justify-end">
            <button
              onClick={uploadFiles}
              disabled={uploading || files.length === 0}
              className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>上传中...</span>
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  <span>开始上传并转换</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default FileUpload