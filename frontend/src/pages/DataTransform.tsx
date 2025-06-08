import React, { useState } from 'react'
import { 
  Database,
  AlertCircle,
  CheckCircle,
  Zap
} from 'lucide-react'
import NCFilesList from '../features/data-conversion/components/NCFilesList'
import ImportWizard from '../features/data-conversion/components/ImportWizard/ImportWizard'

const DataTransform: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'wizard' | 'files'>('wizard')
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [notification, setNotification] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  const handleUploadSuccess = (response: any) => {
    setNotification({
      type: 'success',
      message: `文件上传成功！任务 ID: ${response.task_id}，检测到格式: ${response.detected_format}`
    })
    setRefreshTrigger(prev => prev + 1)
    setTimeout(() => setNotification(null), 5000)
  }

  const handleUploadError = (error: string) => {
    setNotification({
      type: 'error',
      message: error
    })
    setTimeout(() => setNotification(null), 5000)
  }

  const tabs = [
    { id: 'wizard', label: '向导模式', icon: Zap },
    { id: 'files', label: '标准NetCDF文件', icon: Database }
  ] as const

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">数据标准转换处理</h1>
          <p className="text-gray-600 mt-1">海洋环境数据格式标准化转换为 NetCDF CF-1.8 格式</p>
        </div>
      </div>

      {/* 通知信息 */}
      {notification && (
        <div className={`border rounded-md p-4 ${
          notification.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          <div className="flex items-center">
            {notification.type === 'success' ? (
              <CheckCircle className="h-5 w-5 mr-2" />
            ) : (
              <AlertCircle className="h-5 w-5 mr-2" />
            )}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* 选项卡导航 */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-ocean-500 text-ocean-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* 选项卡内容 */}
      <div className="py-6">
        {activeTab === 'wizard' && (
          <ImportWizard />
        )}

        {activeTab === 'files' && (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <Database className="h-5 w-5 text-green-500 mt-0.5 mr-2" />
                <div className="text-sm text-green-700">
                  <p className="font-medium mb-1">标准NetCDF文件管理</p>
                  <p>
                    查看和管理所有符合CF-1.8标准的NetCDF文件。这些文件已经过验证，符合国际标准，
                    可以用于数据共享、科学研究和可视化分析。
                  </p>
                </div>
              </div>
            </div>
            <NCFilesList refreshTrigger={refreshTrigger} />
          </div>
        )}
      </div>

    </div>
  )
}

export default DataTransform 