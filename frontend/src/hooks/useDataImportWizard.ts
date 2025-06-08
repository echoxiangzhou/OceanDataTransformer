import { useState, useCallback } from 'react'

export interface ImportStep {
  id: string
  name: string
  description: string
  status: 'complete' | 'current' | 'upcoming'
}

export interface ImportWizardData {
  file?: File
  fileType?: string
  sessionId?: string
  uploadResponse?: any
  previewData?: any
  columnMapping?: any
  extractedMetadata?: any  // From backend extraction
  metadata?: {
    basic_info?: {
      title?: string
      summary?: string
      keywords?: string
      id?: string
      naming_authority?: string
    }
    institution_info?: {
      institution?: string
      source?: string
      references?: string
      comment?: string
      creator_name?: string
      creator_email?: string
      publisher_name?: string
      publisher_email?: string
    }
    spatiotemporal_coverage?: {
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
    quality_info?: {
      processing_level?: string
      quality_control?: string
      standard_name_vocabulary?: string
      conventions?: string
      metadata_link?: string
      license?: string
    }
    // Legacy fields for backward compatibility
    title?: string
    institution?: string
    source?: string
    comment?: string
  }
  validationResult?: any
  conversionResult?: any
}

const IMPORT_STEPS: ImportStep[] = [
  {
    id: 'upload',
    name: '文件上传',
    description: '选择并上传数据文件',
    status: 'current'
  },
  {
    id: 'preview',
    name: '数据预览',
    description: '查看和验证数据内容',
    status: 'upcoming'
  },
  {
    id: 'metadata',
    name: '元数据配置',
    description: '配置数据集元数据',
    status: 'upcoming'
  },
  {
    id: 'validate',
    name: '验证确认',
    description: 'CF规范验证和确认',
    status: 'upcoming'
  },
  {
    id: 'complete',
    name: '导入完成',
    description: '完成数据导入过程',
    status: 'upcoming'
  }
]

export const useDataImportWizard = () => {
  const [wizardData, setWizardData] = useState<ImportWizardData>({})
  const [currentStepId, setCurrentStepId] = useState<string>('upload')

  // 获取当前步骤索引
  const getCurrentStepIndex = useCallback((stepId: string) => {
    return IMPORT_STEPS.findIndex(step => step.id === stepId)
  }, [])

  // 更新步骤状态
  const updateStepStatuses = useCallback((currentId: string) => {
    const currentIndex = getCurrentStepIndex(currentId)
    return IMPORT_STEPS.map((step, index) => ({
      ...step,
      status: (index < currentIndex ? 'complete' : 
               index === currentIndex ? 'current' : 'upcoming') as 'complete' | 'current' | 'upcoming'
    }))
  }, [getCurrentStepIndex])

  // 检查是否可以进入下一步
  const canProceed = useCallback((stepId: string) => {
    const result = (() => {
      switch (stepId) {
        case 'upload':
          return !!wizardData.file && !!wizardData.uploadResponse
        case 'preview':
          return !!wizardData.previewData
        case 'metadata':
          // 检查必填的元数据字段
          if (!wizardData.metadata) return false
          const meta = wizardData.metadata
          // Support both new structure and legacy fields
          const hasTitle = meta.basic_info?.title || meta.title
          const hasInstitution = meta.institution_info?.institution || meta.institution
          const hasSource = meta.institution_info?.source || meta.source
          return !!(hasTitle && hasInstitution && hasSource)
        case 'validate':
          return !!wizardData.validationResult
        case 'complete':
          return !!wizardData.validationResult
        default:
          return false
      }
    })()
    
    return result
  }, [wizardData])

  // 获取步骤列表（带状态）
  const getSteps = useCallback(() => {
    return updateStepStatuses(currentStepId)
  }, [currentStepId, updateStepStatuses])

  // 导航到特定步骤
  const goToStep = useCallback((stepId: string) => {
    const step = IMPORT_STEPS.find(s => s.id === stepId)
    if (!step) return

    // 获取目标步骤的索引
    const targetIndex = getCurrentStepIndex(stepId)
    const currentIndex = getCurrentStepIndex(currentStepId)

    // 不允许跳过步骤，只能向前进入已验证的步骤或返回之前的步骤
    if (targetIndex > currentIndex) {
      // 向前跳转：检查所有前置步骤是否已完成
      for (let i = 0; i < targetIndex; i++) {
        const prevStepId = IMPORT_STEPS[i].id
        if (!canProceed(prevStepId)) {
          return
        }
      }
    }
    
    setCurrentStepId(stepId)
  }, [currentStepId, getCurrentStepIndex, canProceed])

  // 下一步
  const nextStep = useCallback(() => {
    const currentIndex = getCurrentStepIndex(currentStepId)
    const nextIndex = currentIndex + 1
    
    if (nextIndex < IMPORT_STEPS.length) {
      const nextStep = IMPORT_STEPS[nextIndex]
      goToStep(nextStep.id)
    }
  }, [currentStepId, getCurrentStepIndex, goToStep])

  // 上一步
  const previousStep = useCallback(() => {
    const currentIndex = getCurrentStepIndex(currentStepId)
    const prevIndex = currentIndex - 1
    
    if (prevIndex >= 0) {
      const prevStep = IMPORT_STEPS[prevIndex]
      goToStep(prevStep.id)
    }
  }, [currentStepId, getCurrentStepIndex, goToStep])

  // 更新向导数据
  const updateWizardData = useCallback((data: Partial<ImportWizardData>) => {
    setWizardData(prev => ({ ...prev, ...data }))
  }, [])

  // 重置向导
  const resetWizard = useCallback(() => {
    setWizardData({})
    setCurrentStepId('upload')
  }, [])

  // 检查是否为第一步/最后一步
  const isFirstStep = currentStepId === 'upload'
  const isLastStep = currentStepId === 'complete'

  return {
    steps: getSteps(),
    currentStepId,
    currentStepIndex: getCurrentStepIndex(currentStepId),
    wizardData,
    isFirstStep,
    isLastStep,
    goToStep,
    nextStep,
    previousStep,
    updateWizardData,
    resetWizard,
    canProceed
  }
}