import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { DownloadTaskCreate, DataSource } from '@/types/domain'
import { useDataSources } from '../hooks/useDataSources'

interface NewTaskModalProps {
  onClose: () => void
  onSubmit: (taskData: DownloadTaskCreate) => Promise<void>
}

export const NewTaskModal: React.FC<NewTaskModalProps> = ({ onClose, onSubmit }) => {
  const [loading, setLoading] = useState(false)
  const { dataSources, loading: sourcesLoading } = useDataSources()
  
  const [formData, setFormData] = useState({
    source_id: 0,
    save_path: './downloads/',
    filename_pattern: '*.nc',
    max_retries: 3,
    timeout: 300,
  })

  // 当数据源加载完成后，自动选择第一个数据源
  useEffect(() => {
    if (dataSources.length > 0 && formData.source_id === 0) {
      setFormData(prev => ({ ...prev, source_id: dataSources[0].id }))
    }
  }, [dataSources, formData.source_id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 验证是否选择了数据源
    if (formData.source_id === 0) {
      alert('请选择数据源')
      return
    }
    
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
                  disabled={sourcesLoading}
                >
                  {sourcesLoading ? (
                    <option value={0}>加载中...</option>
                  ) : dataSources.length === 0 ? (
                    <option value={0}>暂无数据源，请先添加数据源</option>
                  ) : (
                    <>
                      <option value={0}>请选择数据源</option>
                      {dataSources.map((source) => (
                        <option key={source.id} value={source.id}>
                          {source.name} ({source.protocol})
                        </option>
                      ))}
                    </>
                  )}
                </select>
                {dataSources.length === 0 && !sourcesLoading && (
                  <p className="mt-1 text-sm text-orange-600">
                    请先在数据源管理中添加数据源
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  保存路径
                </label>
                <select
                  value={formData.save_path}
                  onChange={(e) => handleChange('save_path', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                  required
                >
                  <option value="./downloads/">默认下载目录 (./downloads/)</option>
                  <option value="./data/downloads/">数据目录 (./data/downloads/)</option>
                  <option value="/tmp/downloads/">临时目录 (/tmp/downloads/)</option>
                  <option value="custom">自定义路径...</option>
                </select>
                {formData.save_path === 'custom' && (
                  <input
                    type="text"
                    placeholder="输入自定义路径"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500 mt-2"
                    onChange={(e) => handleChange('save_path', e.target.value)}
                  />
                )}
                <p className="mt-1 text-xs text-gray-500">
                  系统会自动创建不存在的目录
                </p>
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
                <div className="mt-1 text-xs text-gray-500">
                  <p>• 目录URL：下载所有符合模式的文件（如：*.nc, sst_*.nc）</p>
                  <p>• 单文件URL：直接下载该文件（模式将被忽略）</p>
                </div>
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
                  disabled={loading || sourcesLoading || dataSources.length === 0}
                  className="btn-primary w-full sm:w-auto sm:ml-3 disabled:opacity-50"
                >
                  {loading ? '创建中...' : 
                   sourcesLoading ? '加载中...' :
                   dataSources.length === 0 ? '请先添加数据源' : '创建任务'}
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