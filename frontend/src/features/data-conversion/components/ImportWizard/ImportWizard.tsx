import React from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useDataImportWizard } from '../../../../hooks/useDataImportWizard'
import StepIndicator from '../../../../components/StepIndicator'
import UploadStep from './UploadStep'
import PreviewStep from './PreviewStep'
import MetadataStep from './MetadataStep'
import ValidateStep from './ValidateStep'
import CompleteStep from './CompleteStep'

const ImportWizard: React.FC = () => {
  const {
    wizardData,
    updateWizardData,
    currentStepId,
    currentStepIndex,
    steps,
    isFirstStep,
    isLastStep,
    nextStep,
    previousStep,
    goToStep,
    resetWizard,
    canProceed
  } = useDataImportWizard()

  const renderCurrentStep = () => {
    const commonProps = {
      wizardData,
      updateWizardData
    }


    switch (currentStepId) {
      case 'upload':
        return <UploadStep {...commonProps} />
      case 'preview':
        return <PreviewStep {...commonProps} />
      case 'metadata':
        return <MetadataStep {...commonProps} />
      case 'validate':
        return <ValidateStep {...commonProps} />
      case 'complete':
        return <CompleteStep {...commonProps} onReset={resetWizard} />
      default:
        return <UploadStep {...commonProps} />
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 步骤指示器 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <StepIndicator
          steps={steps}
          currentStepId={currentStepId}
          onStepClick={goToStep}
          canNavigateToStep={(stepId) => {
            const targetIndex = steps.findIndex(s => s.id === stepId)
            const currentIndex = steps.findIndex(s => s.id === currentStepId)
            
            // 允许向后导航或导航到当前步骤
            if (targetIndex <= currentIndex) return true
            
            // 向前导航需要检查前置条件
            for (let i = 0; i < targetIndex; i++) {
              if (!canProceed(steps[i].id)) return false
            }
            return true
          }}
        />
      </div>

      {/* 当前步骤内容 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {renderCurrentStep()}
      </div>

      {/* 导航按钮 */}
      {currentStepId !== 'complete' && (
        <div className="flex justify-between items-center bg-white rounded-lg border border-gray-200 p-4">
          <button
            onClick={previousStep}
            disabled={isFirstStep}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
              !isFirstStep
                ? 'text-gray-700 hover:bg-gray-100 border border-gray-300'
                : 'text-gray-400 cursor-not-allowed border border-gray-200'
            }`}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>上一步</span>
          </button>

          <div className="text-sm text-gray-500">
            第 {currentStepIndex + 1} 步，共 {steps.length} 步
          </div>

          <button
            onClick={nextStep}
            disabled={isLastStep || !canProceed(currentStepId)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
              !isLastStep && canProceed(currentStepId)
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <span>下一步</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 完成页面的重置按钮 */}
      {currentStepId === 'complete' && (
        <div className="flex justify-center bg-white rounded-lg border border-gray-200 p-4">
          <button
            onClick={resetWizard}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            导入新文件
          </button>
        </div>
      )}

    </div>
  )
}

export default ImportWizard