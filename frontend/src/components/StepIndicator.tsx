import React from 'react'
import { CheckCircle, Clock, Circle } from 'lucide-react'
import { ImportStep } from '../hooks/useDataImportWizard'

interface StepIndicatorProps {
  steps: ImportStep[]
  currentStepId: string
  onStepClick?: (stepId: string) => void
  canNavigateToStep?: (stepId: string) => boolean
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ steps, currentStepId, onStepClick, canNavigateToStep }) => {
  const getStepIcon = (step: ImportStep, index: number) => {
    switch (step.status) {
      case 'complete':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'current':
        return (
          <div className="h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center">
            <span className="text-xs text-white font-bold">{index + 1}</span>
          </div>
        )
      case 'upcoming':
        return (
          <div className="h-5 w-5 rounded-full border-2 border-gray-300 flex items-center justify-center">
            <span className="text-xs text-gray-500 font-medium">{index + 1}</span>
          </div>
        )
      default:
        return (
          <div className="h-5 w-5 rounded-full border-2 border-gray-300 flex items-center justify-center">
            <span className="text-xs text-gray-500 font-medium">{index + 1}</span>
          </div>
        )
    }
  }

  const getStepColor = (step: ImportStep) => {
    switch (step.status) {
      case 'complete':
        return 'text-green-600'
      case 'current':
        return 'text-blue-600'
      case 'upcoming':
        return 'text-gray-400'
      default:
        return 'text-gray-400'
    }
  }

  const getConnectorColor = (index: number) => {
    if (index === steps.length - 1) return '' // 最后一个步骤不需要连接线
    
    const currentStep = steps[index]
    const nextStep = steps[index + 1]
    
    if (currentStep.status === 'complete') {
      return 'bg-green-200'
    } else if (currentStep.status === 'current' && nextStep.status === 'upcoming') {
      return 'bg-gray-200'
    } else {
      return 'bg-gray-200'
    }
  }

  return (
    <nav aria-label="Progress" className="mb-8">
      <ol className="flex items-center">
        {steps.map((step, index) => (
          <li 
            key={step.id} 
            className={`relative ${index !== steps.length - 1 ? 'flex-1' : ''}`}
          >
            {/* 步骤内容 */}
            <button
              onClick={() => onStepClick && onStepClick(step.id)}
              className={`flex items-center w-full text-left rounded-lg p-2 transition-colors ${
                step.status === 'upcoming' || (canNavigateToStep && !canNavigateToStep(step.id))
                  ? 'cursor-not-allowed opacity-50'
                  : 'hover:bg-gray-50 cursor-pointer'
              }`}
              disabled={step.status === 'upcoming' || (canNavigateToStep && !canNavigateToStep(step.id))}
              title={
                step.status === 'upcoming' || (canNavigateToStep && !canNavigateToStep(step.id))
                  ? '请先完成前面的步骤'
                  : '点击跳转到此步骤'
              }
            >
              {/* 步骤图标 */}
              <div className="flex items-center justify-center">
                {getStepIcon(step, index)}
              </div>
              
              {/* 步骤文本 */}
              <div className="ml-4 min-w-0">
                <span className={`text-sm font-medium ${getStepColor(step)}`}>
                  {step.name}
                </span>
                <div className={`text-xs ${getStepColor(step)}`}>
                  {step.description}
                </div>
              </div>
            </button>

          </li>
        ))}
      </ol>
    </nav>
  )
}

export default StepIndicator