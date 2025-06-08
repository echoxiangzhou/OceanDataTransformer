import React, { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, Edit3, Save, X, Check, AlertCircle, Globe, Calendar, User, Info, CheckCircle, Download, RefreshCw } from 'lucide-react'
import { ImportWizardData } from '../../../../hooks/useDataImportWizard'
import VariableSettingsForm from './VariableSettingsForm'
import { extractFileAttributes, generateMetadataSuggestions } from '../../../../utils/fileAttributeExtractor'
import { conversionService } from '../../../../services/conversionService'

interface MetadataStepProps {
  wizardData: ImportWizardData
  updateWizardData: (data: Partial<ImportWizardData>) => void
}

interface ExtendedMetadata {
  basic_info: {
    title?: string
    summary?: string
    keywords?: string
    id?: string
    naming_authority?: string
  }
  institution_info: {
    institution?: string
    source?: string
    references?: string
    comment?: string
    creator_name?: string
    creator_email?: string
    publisher_name?: string
    publisher_email?: string
  }
  spatiotemporal_coverage: {
    geospatial_lat_min?: number
    geospatial_lat_max?: number
    geospatial_lon_min?: number
    geospatial_lon_max?: number
    geospatial_vertical_min?: number
    geospatial_vertical_max?: number
    time_coverage_start?: string
    time_coverage_end?: string
    time_coverage_duration?: string
    time_coverage_resolution?: string
  }
  quality_info: {
    processing_level?: string
    quality_control?: string
    standard_name_vocabulary?: string
    conventions?: string
    metadata_link?: string
    license?: string
  }
}

const MetadataStep: React.FC<MetadataStepProps> = ({ wizardData, updateWizardData }) => {
  const [metadata, setMetadata] = useState<ExtendedMetadata>({
    basic_info: {},
    institution_info: {},
    spatiotemporal_coverage: {},
    quality_info: {
      standard_name_vocabulary: 'CF Standard Name Table v79',
      conventions: 'CF-1.8'
    }
  })
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<any>({})
  const [hasAutoExtracted, setHasAutoExtracted] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractionError, setExtractionError] = useState<string | null>(null)

  // 从后端提取元数据
  const extractMetadataFromBackend = async () => {
    if (!wizardData.sessionId) {
      setExtractionError('无法提取元数据：缺少会话ID')
      return
    }

    try {
      setIsExtracting(true)
      setExtractionError(null)
      
      const extractedData = await conversionService.extractMetadata(wizardData.sessionId)
      
      // 将提取的元数据合并到当前的元数据中
      const newMetadata = {
        basic_info: {
          ...metadata.basic_info,
          ...extractedData.basic_info
        },
        institution_info: {
          ...metadata.institution_info,
          ...extractedData.institution_info
        },
        spatiotemporal_coverage: {
          ...metadata.spatiotemporal_coverage,
          ...extractedData.spatiotemporal_coverage
        },
        quality_info: {
          ...metadata.quality_info,
          ...extractedData.quality_info
        }
      }
      
      setMetadata(newMetadata)
      updateWizardData({ 
        extractedMetadata: extractedData,
        metadata: newMetadata 
      })
      setHasAutoExtracted(true)
      
    } catch (error: any) {
      console.error('元数据提取失败:', error)
      setExtractionError(error.response?.data?.message || error.message || '元数据提取失败')
    } finally {
      setIsExtracting(false)
    }
  }

  useEffect(() => {
    if (wizardData.metadata) {
      const existingMeta = wizardData.metadata
      
      // Check if it's already in the new structure or needs conversion from legacy format
      if (existingMeta.basic_info || existingMeta.institution_info || existingMeta.spatiotemporal_coverage || existingMeta.quality_info) {
        // Already in new structure, use as is
        setMetadata({
          basic_info: existingMeta.basic_info || {},
          institution_info: existingMeta.institution_info || {},
          spatiotemporal_coverage: existingMeta.spatiotemporal_coverage || {},
          quality_info: existingMeta.quality_info || {
            standard_name_vocabulary: 'CF Standard Name Table v79',
            conventions: 'CF-1.8'
          }
        })
      } else {
        // Convert from legacy format
        setMetadata(prev => ({
          ...prev,
          basic_info: {
            ...prev.basic_info,
            title: existingMeta.title,
            keywords: existingMeta.keywords
          },
          institution_info: {
            ...prev.institution_info,
            institution: existingMeta.institution,
            source: existingMeta.source,
            comment: existingMeta.comment,
            references: existingMeta.references
          }
        }))
      }
    } else if (wizardData.sessionId && !wizardData.extractedMetadata && !hasAutoExtracted && !isExtracting) {
      // 优先使用后端智能提取
      extractMetadataFromBackend()
    } else if (wizardData.file && wizardData.previewData && !hasAutoExtracted && !wizardData.sessionId) {
      // 降级到前端提取（兼容旧版本）
      const extractedAttributes = extractFileAttributes(wizardData.previewData)
      const suggestions = generateMetadataSuggestions(
        extractedAttributes, 
        wizardData.file.name, 
        wizardData.fileType || 'unknown'
      )
      
      setMetadata(prev => ({
        basic_info: {
          ...prev.basic_info,
          ...suggestions.basic_info,
          id: `dataset_${Date.now()}`
        },
        institution_info: {
          ...prev.institution_info,
          ...suggestions.institution_info
        },
        spatiotemporal_coverage: {
          ...prev.spatiotemporal_coverage,
          ...suggestions.spatiotemporal_coverage
        },
        quality_info: {
          ...prev.quality_info,
          ...suggestions.quality_info
        }
      }))
      
      setHasAutoExtracted(true)
    } else if (wizardData.file && !hasAutoExtracted && !wizardData.sessionId) {
      // 如果没有预览数据，使用基本信息
      setMetadata(prev => ({
        ...prev,
        basic_info: {
          ...prev.basic_info,
          title: wizardData.file!.name.split('.')[0],
          id: `dataset_${Date.now()}`
        },
        institution_info: {
          ...prev.institution_info,
          source: `Converted from ${wizardData.fileType || 'unknown'} file`
        }
      }))
      setHasAutoExtracted(true)
    }
  }, [wizardData.metadata, wizardData.file, wizardData.fileType, wizardData.previewData, wizardData.sessionId, wizardData.extractedMetadata, hasAutoExtracted, isExtracting])

  // 开始编辑
  const startEdit = (section: string) => {
    setEditingSection(section)
    setEditValues({ ...(metadata as any)[section] })
  }

  // 保存编辑
  const saveEdit = () => {
    if (editingSection) {
      const newMetadata = {
        ...metadata,
        [editingSection]: editValues
      }
      setMetadata(newMetadata)
      updateWizardData({ metadata: newMetadata })
      setEditingSection(null)
      setEditValues({})
    }
  }

  // 取消编辑
  const cancelEdit = () => {
    setEditingSection(null)
    setEditValues({})
  }

  // 处理列映射更新
  const handleColumnMappingUpdate = (columnMapping: any) => {
    updateWizardData({ columnMapping })
  }

  // 统计信息
  const stats = {
    basic_filled: Object.values(metadata.basic_info || {}).filter(v => v !== undefined && v !== null && v !== '').length,
    basic_total: 5,
    institution_filled: Object.values(metadata.institution_info || {}).filter(v => v !== undefined && v !== null && v !== '').length,
    institution_total: 8,
    spatiotemporal_filled: Object.values(metadata.spatiotemporal_coverage || {}).filter(v => v !== undefined && v !== null && v !== '').length,
    spatiotemporal_total: 10,
    quality_filled: Object.values(metadata.quality_info || {}).filter(v => v !== undefined && v !== null && v !== '').length,
    quality_total: 6
  }

  const totalFilled = stats.basic_filled + stats.institution_filled + stats.spatiotemporal_filled + stats.quality_filled
  const totalFields = stats.basic_total + stats.institution_total + stats.spatiotemporal_total + stats.quality_total

  // 检查必填字段
  const isValid = metadata.basic_info?.title && metadata.institution_info?.institution && metadata.institution_info?.source

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">元数据配置</h2>
          <p className="text-gray-600">
            配置数据集的CF-1.8标准元数据信息。系统将根据这些信息生成符合国际标准的NetCDF文件。
          </p>
        </div>
        
        {/* 智能提取按钮 */}
        {wizardData.sessionId && (
          <div className="flex items-center space-x-2">
            <button
              onClick={extractMetadataFromBackend}
              disabled={isExtracting}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              title="从原始文件智能提取元数据信息"
            >
              {isExtracting ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {isExtracting ? '提取中...' : hasAutoExtracted ? '重新提取' : '智能提取'}
            </button>
          </div>
        )}
      </div>

      {/* 提取错误显示 */}
      {extractionError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
            <div className="text-sm text-red-800">
              <p className="font-medium mb-1">元数据提取失败</p>
              <p>{extractionError}</p>
              <button
                onClick={() => setExtractionError(null)}
                className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 智能提取提示 */}
      {hasAutoExtracted && !extractionError && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
            <div className="text-sm text-green-800">
              <p className="font-medium mb-1">🤖 智能提取完成</p>
              <p>系统已从您的数据文件中自动提取并填充了以下信息：</p>
              <ul className="mt-2 space-y-1 text-xs">
                <li>• 数据集标题和摘要</li>
                <li>• 时空覆盖范围（时间、经纬度、深度）</li>
                <li>• 机构信息和数据来源</li>
                <li>• 变量类型和单位建议</li>
                <li>• 数据质量统计信息</li>
              </ul>
              <p className="mt-2 text-xs text-green-700">您可以根据需要调整这些自动填充的信息。</p>
            </div>
          </div>
        </div>
      )}

      {/* 正在提取中的提示 */}
      {isExtracting && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <RefreshCw className="h-5 w-5 text-blue-500 mt-0.5 animate-spin" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">正在智能提取元数据...</p>
              <p>系统正在分析您的文件内容，自动识别和提取元数据信息，请稍等片刻。</p>
            </div>
          </div>
        </div>
      )}

      {/* 配置进度总览 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Globe className="h-5 w-5 text-blue-500" />
            <span className="font-medium text-blue-900">配置进度</span>
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {totalFilled}/{totalFields} 已配置
            </span>
          </div>
          <div className="text-sm text-blue-700">
            {Math.round((totalFilled / totalFields) * 100)}% 完成
          </div>
        </div>
        <div className="w-full bg-blue-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
            style={{ width: `${(totalFilled / totalFields) * 100}%` }}
          />
        </div>
      </div>

      {/* 必填字段状态 */}
      {!isValid && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
            <div className="text-sm text-red-800">
              <p className="font-medium mb-1">请完成必填字段</p>
              <ul className="space-y-1 text-xs">
                {!metadata.basic_info?.title && <li>• 数据集标题（基本信息）</li>}
                {!metadata.institution_info?.institution && <li>• 机构名称（机构信息）</li>}
                {!metadata.institution_info?.source && <li>• 数据来源（机构信息）</li>}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 基本信息 */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Info className="h-5 w-5 text-blue-500" />
            <h3 className="text-lg font-medium text-gray-900">基本信息</h3>
            <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
              {stats.basic_filled}/{stats.basic_total}
            </span>
          </div>
          {editingSection !== 'basic_info' && (
            <button
              onClick={() => startEdit('basic_info')}
              className="flex items-center px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              <Edit3 className="h-4 w-4 mr-1" />
              编辑
            </button>
          )}
        </div>

        <div className="p-4">
          {editingSection === 'basic_info' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  数据集标题 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editValues.title || ''}
                  onChange={(e) => setEditValues((prev: any) => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="输入数据集的完整标题"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  数据集摘要
                </label>
                <textarea
                  value={editValues.summary || ''}
                  onChange={(e) => setEditValues((prev: any) => ({ ...prev, summary: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="简要描述数据集的内容、目的和用途"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    关键词
                  </label>
                  <input
                    type="text"
                    value={editValues.keywords || ''}
                    onChange={(e) => setEditValues((prev: any) => ({ ...prev, keywords: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="用逗号分隔的关键词"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    数据集ID
                  </label>
                  <input
                    type="text"
                    value={editValues.id || ''}
                    onChange={(e) => setEditValues((prev: any) => ({ ...prev, id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="唯一标识符"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  命名机构
                </label>
                <input
                  type="text"
                  value={editValues.naming_authority || ''}
                  onChange={(e) => setEditValues((prev: any) => ({ ...prev, naming_authority: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="负责分配标识符的机构"
                />
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={saveEdit}
                  className="flex items-center px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                >
                  <Check className="h-4 w-4 mr-1" />
                  保存
                </button>
                <button
                  onClick={cancelEdit}
                  className="flex items-center px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
                >
                  <X className="h-4 w-4 mr-1" />
                  取消
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <span className="font-medium text-gray-700">标题:</span>
                <span className="ml-2 text-gray-900">
                  {metadata.basic_info?.title || <span className="text-red-500">未设置</span>}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">摘要:</span>
                <span className="ml-2 text-gray-900">
                  {metadata.basic_info?.summary || <span className="text-gray-500">未设置</span>}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">关键词:</span>
                <span className="ml-2 text-gray-900">
                  {metadata.basic_info?.keywords || <span className="text-gray-500">未设置</span>}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 机构信息 */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <User className="h-5 w-5 text-purple-500" />
            <h3 className="text-lg font-medium text-gray-900">机构信息</h3>
            <span className="px-2 py-1 rounded text-xs bg-purple-100 text-purple-800">
              {stats.institution_filled}/{stats.institution_total}
            </span>
          </div>
          {editingSection !== 'institution_info' && (
            <button
              onClick={() => startEdit('institution_info')}
              className="flex items-center px-3 py-1 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm"
            >
              <Edit3 className="h-4 w-4 mr-1" />
              编辑
            </button>
          )}
        </div>

        <div className="p-4">
          {editingSection === 'institution_info' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    机构名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editValues.institution || ''}
                    onChange={(e) => setEditValues((prev: any) => ({ ...prev, institution: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="数据产生机构"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    数据来源 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editValues.source || ''}
                    onChange={(e) => setEditValues((prev: any) => ({ ...prev, source: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="数据的获取方法或来源"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    创建者姓名
                  </label>
                  <input
                    type="text"
                    value={editValues.creator_name || ''}
                    onChange={(e) => setEditValues((prev: any) => ({ ...prev, creator_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="数据集创建者"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    创建者邮箱
                  </label>
                  <input
                    type="email"
                    value={editValues.creator_email || ''}
                    onChange={(e) => setEditValues((prev: any) => ({ ...prev, creator_email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="创建者联系邮箱"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    发布者姓名
                  </label>
                  <input
                    type="text"
                    value={editValues.publisher_name || ''}
                    onChange={(e) => setEditValues((prev: any) => ({ ...prev, publisher_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="数据发布者"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    发布者邮箱
                  </label>
                  <input
                    type="email"
                    value={editValues.publisher_email || ''}
                    onChange={(e) => setEditValues((prev: any) => ({ ...prev, publisher_email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="发布者联系邮箱"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  参考文献
                </label>
                <textarea
                  value={editValues.references || ''}
                  onChange={(e) => setEditValues((prev: any) => ({ ...prev, references: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="相关文献引用"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  备注信息
                </label>
                <textarea
                  value={editValues.comment || ''}
                  onChange={(e) => setEditValues((prev: any) => ({ ...prev, comment: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="补充说明信息"
                  rows={2}
                />
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={saveEdit}
                  className="flex items-center px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                >
                  <Check className="h-4 w-4 mr-1" />
                  保存
                </button>
                <button
                  onClick={cancelEdit}
                  className="flex items-center px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
                >
                  <X className="h-4 w-4 mr-1" />
                  取消
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <span className="font-medium text-gray-700">机构:</span>
                <span className="ml-2 text-gray-900">
                  {metadata.institution_info?.institution || <span className="text-red-500">未设置</span>}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">数据来源:</span>
                <span className="ml-2 text-gray-900">
                  {metadata.institution_info?.source || <span className="text-red-500">未设置</span>}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">创建者:</span>
                <span className="ml-2 text-gray-900">
                  {metadata.institution_info?.creator_name || <span className="text-gray-500">未设置</span>}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 时空覆盖范围 */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-orange-500" />
            <h3 className="text-lg font-medium text-gray-900">时空覆盖范围</h3>
            <span className="px-2 py-1 rounded text-xs bg-orange-100 text-orange-800">
              {stats.spatiotemporal_filled}/{stats.spatiotemporal_total}
            </span>
          </div>
          {editingSection !== 'spatiotemporal_coverage' && (
            <button
              onClick={() => startEdit('spatiotemporal_coverage')}
              className="flex items-center px-3 py-1 bg-orange-600 text-white rounded-md hover:bg-orange-700 text-sm"
            >
              <Edit3 className="h-4 w-4 mr-1" />
              编辑
            </button>
          )}
        </div>

        <div className="p-4">
          {editingSection === 'spatiotemporal_coverage' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    最小纬度
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editValues.geospatial_lat_min || ''}
                    onChange={(e) => setEditValues((prev: any) => ({ ...prev, geospatial_lat_min: parseFloat(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="-90"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    最大纬度
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editValues.geospatial_lat_max || ''}
                    onChange={(e) => setEditValues((prev: any) => ({ ...prev, geospatial_lat_max: parseFloat(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="90"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    最小经度
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editValues.geospatial_lon_min || ''}
                    onChange={(e) => setEditValues((prev: any) => ({ ...prev, geospatial_lon_min: parseFloat(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="-180"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    最大经度
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editValues.geospatial_lon_max || ''}
                    onChange={(e) => setEditValues((prev: any) => ({ ...prev, geospatial_lon_max: parseFloat(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="180"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    时间开始
                  </label>
                  <input
                    type="datetime-local"
                    value={editValues.time_coverage_start || ''}
                    onChange={(e) => setEditValues((prev: any) => ({ ...prev, time_coverage_start: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    时间结束
                  </label>
                  <input
                    type="datetime-local"
                    value={editValues.time_coverage_end || ''}
                    onChange={(e) => setEditValues((prev: any) => ({ ...prev, time_coverage_end: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    时间跨度
                  </label>
                  <input
                    type="text"
                    value={editValues.time_coverage_duration || ''}
                    onChange={(e) => setEditValues((prev: any) => ({ ...prev, time_coverage_duration: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="如: P1Y (1年), P30D (30天)"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    时间分辨率
                  </label>
                  <input
                    type="text"
                    value={editValues.time_coverage_resolution || ''}
                    onChange={(e) => setEditValues((prev: any) => ({ ...prev, time_coverage_resolution: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="如: PT1H (每小时), P1D (每天)"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    最小垂直坐标
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editValues.geospatial_vertical_min || ''}
                    onChange={(e) => setEditValues((prev: any) => ({ ...prev, geospatial_vertical_min: parseFloat(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="深度/高度 (米)"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    最大垂直坐标
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editValues.geospatial_vertical_max || ''}
                    onChange={(e) => setEditValues((prev: any) => ({ ...prev, geospatial_vertical_max: parseFloat(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="深度/高度 (米)"
                  />
                </div>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={saveEdit}
                  className="flex items-center px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                >
                  <Check className="h-4 w-4 mr-1" />
                  保存
                </button>
                <button
                  onClick={cancelEdit}
                  className="flex items-center px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
                >
                  <X className="h-4 w-4 mr-1" />
                  取消
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <span className="font-medium text-gray-700">地理范围:</span>
                <span className="ml-2 text-gray-900">
                  {metadata.spatiotemporal_coverage?.geospatial_lat_min !== undefined && 
                   metadata.spatiotemporal_coverage?.geospatial_lat_max !== undefined &&
                   metadata.spatiotemporal_coverage?.geospatial_lon_min !== undefined &&
                   metadata.spatiotemporal_coverage?.geospatial_lon_max !== undefined ? (
                    `纬度: ${metadata.spatiotemporal_coverage.geospatial_lat_min}°~${metadata.spatiotemporal_coverage.geospatial_lat_max}°, ` +
                    `经度: ${metadata.spatiotemporal_coverage.geospatial_lon_min}°~${metadata.spatiotemporal_coverage.geospatial_lon_max}°`
                  ) : (
                    <span className="text-gray-500">未设置</span>
                  )}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">时间范围:</span>
                <span className="ml-2 text-gray-900">
                  {metadata.spatiotemporal_coverage?.time_coverage_start && metadata.spatiotemporal_coverage?.time_coverage_end ? (
                    `${metadata.spatiotemporal_coverage.time_coverage_start} ~ ${metadata.spatiotemporal_coverage.time_coverage_end}`
                  ) : (
                    <span className="text-gray-500">未设置</span>
                  )}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 数据质量信息 */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <h3 className="text-lg font-medium text-gray-900">数据质量信息</h3>
            <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-800">
              {stats.quality_filled}/{stats.quality_total}
            </span>
          </div>
          {editingSection !== 'quality_info' && (
            <button
              onClick={() => startEdit('quality_info')}
              className="flex items-center px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
            >
              <Edit3 className="h-4 w-4 mr-1" />
              编辑
            </button>
          )}
        </div>

        <div className="p-4">
          {editingSection === 'quality_info' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    处理级别
                  </label>
                  <select
                    value={editValues.processing_level || ''}
                    onChange={(e) => setEditValues((prev: any) => ({ ...prev, processing_level: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">请选择处理级别</option>
                    <option value="Level 0">Level 0 - 原始数据</option>
                    <option value="Level 1">Level 1 - 质量控制后的数据</option>
                    <option value="Level 2">Level 2 - 插值和处理后的数据</option>
                    <option value="Level 3">Level 3 - 合成和分析产品</option>
                    <option value="Level 4">Level 4 - 模型产品</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    数据许可证
                  </label>
                  <select
                    value={editValues.license || ''}
                    onChange={(e) => setEditValues((prev: any) => ({ ...prev, license: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">请选择许可证</option>
                    <option value="CC BY 4.0">CC BY 4.0</option>
                    <option value="CC BY-SA 4.0">CC BY-SA 4.0</option>
                    <option value="CC BY-NC 4.0">CC BY-NC 4.0</option>
                    <option value="CC0 1.0">CC0 1.0 (公有领域)</option>
                    <option value="Custom">自定义许可证</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  质量控制描述
                </label>
                <textarea
                  value={editValues.quality_control || ''}
                  onChange={(e) => setEditValues((prev: any) => ({ ...prev, quality_control: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="描述数据质量控制的方法和标准"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    标准词汇表
                  </label>
                  <input
                    type="text"
                    value={editValues.standard_name_vocabulary || ''}
                    onChange={(e) => setEditValues((prev: any) => ({ ...prev, standard_name_vocabulary: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="CF Standard Name Table v79"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CF公约版本
                  </label>
                  <input
                    type="text"
                    value={editValues.conventions || ''}
                    onChange={(e) => setEditValues((prev: any) => ({ ...prev, conventions: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="CF-1.8"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  元数据链接
                </label>
                <input
                  type="url"
                  value={editValues.metadata_link || ''}
                  onChange={(e) => setEditValues((prev: any) => ({ ...prev, metadata_link: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="相关元数据的URL链接"
                />
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={saveEdit}
                  className="flex items-center px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                >
                  <Check className="h-4 w-4 mr-1" />
                  保存
                </button>
                <button
                  onClick={cancelEdit}
                  className="flex items-center px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
                >
                  <X className="h-4 w-4 mr-1" />
                  取消
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <span className="font-medium text-gray-700">处理级别:</span>
                <span className="ml-2 text-gray-900">
                  {metadata.quality_info?.processing_level || <span className="text-gray-500">未设置</span>}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">数据许可证:</span>
                <span className="ml-2 text-gray-900">
                  {metadata.quality_info?.license || <span className="text-gray-500">未设置</span>}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">CF标准词汇表:</span>
                <span className="ml-2 text-gray-900">
                  {metadata.quality_info?.standard_name_vocabulary || <span className="text-gray-500">未设置</span>}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">CF公约版本:</span>
                <span className="ml-2 text-gray-900">
                  {metadata.quality_info?.conventions || <span className="text-gray-500">未设置</span>}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">质量控制:</span>
                <span className="ml-2 text-gray-900">
                  {metadata.quality_info?.quality_control ? 
                    (metadata.quality_info.quality_control.length > 50 ? 
                      `${metadata.quality_info.quality_control.slice(0, 50)}...` : 
                      metadata.quality_info.quality_control
                    ) : 
                    <span className="text-gray-500">未设置</span>
                  }
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 变量设置表单 */}
      <VariableSettingsForm
        previewData={wizardData.previewData}
        columnMapping={wizardData.columnMapping}
        onColumnMappingUpdate={handleColumnMappingUpdate}
      />

      {/* 配置状态提示 */}
      <div className={`p-4 rounded-lg border ${
        isValid ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
      }`}>
        <div className="flex items-center space-x-2">
          {isValid ? (
            <Check className="h-5 w-5 text-green-500" />
          ) : (
            <AlertCircle className="h-5 w-5 text-yellow-500" />
          )}
          <span className={`text-sm font-medium ${
            isValid ? 'text-green-800' : 'text-yellow-800'
          }`}>
            {isValid ? '元数据配置完成，可以进入下一步' : '请完成必填的元数据字段'}
          </span>
        </div>
      </div>
    </div>
  )
}

export default MetadataStep