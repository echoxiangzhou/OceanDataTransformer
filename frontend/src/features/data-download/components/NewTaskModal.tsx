import React, { useState } from 'react'
import { X } from 'lucide-react'
import type { DownloadTaskCreate } from '@/types/domain'

interface NewTaskModalProps {
  onClose: () => void
  onSubmit: (taskData: DownloadTaskCreate) => Promise<void>
}

export const NewTaskModal: React.FC<NewTaskModalProps> = ({ onClose, onSubmit }) => {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    source_id: 1,
    save_path: '/data/downloads/',
    filename_pattern: '*.nc',
    max_retries: 3,
    timeout: 300,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      await onSubmit(formData)
    } catch (error) {
      console.error('Failed to create task:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
        </div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">新建下载任务</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  数据源
                </label>
                <select
                  value={formData.source_id}
                  onChange={(e) => handleChange('source_id', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                  required
                >
                  <option value={1}>NOAA 海洋数据</option>
                  <option value={2}>Copernicus 海洋服务</option>
                  <option value={3}>ARGO 漂流浮标</option>
                  <option value={4}>WOD 世界海洋数据</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  保存路径
                </label>
                <input
                  type="text"
                  value={formData.save_path}
                  onChange={(e) => handleChange('save_path', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                  placeholder="/data/downloads/"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  文件名模式
                </label>
                <input
                  type="text"
                  value={formData.filename_pattern}
                  onChange={(e) => handleChange('filename_pattern', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                  placeholder="*.nc"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    最大重试次数
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={formData.max_retries}
                    onChange={(e) => handleChange('max_retries', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    超时时间(秒)
                  </label>
                  <input
                    type="number"
                    min="60"
                    max="3600"
                    value={formData.timeout}
                    onChange={(e) => handleChange('timeout', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                  />
                </div>
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full sm:w-auto sm:ml-3 disabled:opacity-50"
                >
                  {loading ? '创建中...' : '创建任务'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-secondary w-full sm:w-auto mt-3 sm:mt-0"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}