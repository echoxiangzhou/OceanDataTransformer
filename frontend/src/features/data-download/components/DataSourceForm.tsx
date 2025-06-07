import React, { useState, useEffect } from 'react'
import { X, Globe, Lock, Key } from 'lucide-react'
import type { DataSource, DataSourceCreate } from '@/types/domain'
import { isValidUrl } from '@/lib/utils'

interface DataSourceFormProps {
  source?: DataSource | null
  onSubmit: (data: DataSourceCreate) => Promise<void>
  onClose: () => void
}

export const DataSourceForm: React.FC<DataSourceFormProps> = ({
  source,
  onSubmit,
  onClose,
}) => {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<DataSourceCreate>({
    name: '',
    url: '',
    description: '',
    protocol: 'HTTP',
    auth_required: false,
    username: '',
    password: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (source) {
      setFormData({
        name: source.name,
        url: source.url,
        description: source.description || '',
        protocol: source.protocol,
        auth_required: source.auth_required,
        username: source.username || '',
        password: source.password || '',
      })
    }
  }, [source])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = '数据源名称不能为空'
    }

    if (!formData.url.trim()) {
      newErrors.url = 'URL不能为空'
    } else if (!isValidUrl(formData.url)) {
      newErrors.url = '请输入有效的URL'
    }

    if (formData.auth_required) {
      if (!formData.username?.trim()) {
        newErrors.username = '启用认证时用户名不能为空'
      }
      if (!formData.password?.trim()) {
        newErrors.password = '启用认证时密码不能为空'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)
    setErrors({}) // Clear previous errors
    
    try {
      await onSubmit(formData)
      onClose()
    } catch (error: any) {
      console.error('Submit error:', error)
      
      // Handle different types of errors
      if (error.message && error.message.includes('already exists')) {
        setErrors({ name: '该数据源名称已存在' })
      } else if (error.message && error.message.includes('validation')) {
        setErrors({ general: '数据验证失败，请检查输入内容' })
      } else {
        setErrors({ general: '添加数据源失败，请稍后重试' })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: keyof DataSourceCreate, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
        </div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                  <Globe className="h-6 w-6 text-ocean-500" />
                  <h3 className="text-lg font-medium text-gray-900">
                    {source ? '编辑数据源' : '添加数据源'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    数据源名称 *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-ocean-500 focus:border-ocean-500 ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="输入数据源名称"
                    required
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    数据源URL *
                  </label>
                  <input
                    type="url"
                    value={formData.url}
                    onChange={(e) => handleChange('url', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-ocean-500 focus:border-ocean-500 ${
                      errors.url ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="https://example.com/data"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    支持目录URL（下载多个文件）或单文件URL（如：.nc文件）
                  </p>
                  {errors.url && (
                    <p className="mt-1 text-sm text-red-600">{errors.url}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    协议类型
                  </label>
                  <select
                    value={formData.protocol}
                    onChange={(e) => handleChange('protocol', e.target.value as 'HTTP' | 'FTP' | 'SFTP')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                  >
                    <option value="HTTP">HTTP/HTTPS</option>
                    <option value="FTP">FTP</option>
                    <option value="SFTP">SFTP</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    描述
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                    placeholder="数据源描述信息（可选）"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="auth_required"
                    checked={formData.auth_required}
                    onChange={(e) => handleChange('auth_required', e.target.checked)}
                    className="h-4 w-4 text-ocean-600 focus:ring-ocean-500 border-gray-300 rounded"
                  />
                  <label htmlFor="auth_required" className="flex items-center text-sm text-gray-700">
                    <Lock className="h-4 w-4 mr-1" />
                    需要身份验证
                  </label>
                </div>

                {formData.auth_required && (
                  <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        用户名 *
                      </label>
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          value={formData.username}
                          onChange={(e) => handleChange('username', e.target.value)}
                          className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-ocean-500 focus:border-ocean-500 ${
                            errors.username ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="输入用户名"
                        />
                      </div>
                      {errors.username && (
                        <p className="mt-1 text-sm text-red-600">{errors.username}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        密码 *
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="password"
                          value={formData.password}
                          onChange={(e) => handleChange('password', e.target.value)}
                          className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-ocean-500 focus:border-ocean-500 ${
                            errors.password ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="输入密码"
                        />
                      </div>
                      {errors.password && (
                        <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* General error message */}
              {errors.general && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{errors.general}</p>
                </div>
              )}
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full sm:w-auto sm:ml-3 disabled:opacity-50"
              >
                {loading ? '保存中...' : source ? '更新' : '创建'}
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
  )
}