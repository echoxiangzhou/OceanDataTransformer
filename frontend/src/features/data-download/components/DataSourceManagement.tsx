import React, { useState } from 'react'
import { Plus, Settings, Trash2, Globe, CheckCircle, XCircle, Edit } from 'lucide-react'
import { useDataSources } from '../hooks/useDataSources'
import { DataSourceForm } from './DataSourceForm'
import type { DataSource } from '@/types/domain'
import { formatDate } from '@/lib/utils'

export const DataSourceManagement: React.FC = () => {
  const { 
    dataSources, 
    loading, 
    error, 
    createDataSource, 
    updateDataSource, 
    deleteDataSource,
    testConnection
  } = useDataSources()

  const [showForm, setShowForm] = useState(false)
  const [editingSource, setEditingSource] = useState<DataSource | null>(null)
  const [testingConnection, setTestingConnection] = useState<number | null>(null)

  const handleCreateSource = async (sourceData: any) => {
    try {
      await createDataSource(sourceData)
      setShowForm(false)
    } catch (error) {
      console.error('Failed to create data source:', error)
    }
  }

  const handleUpdateSource = async (sourceData: any) => {
    if (!editingSource) return
    
    try {
      await updateDataSource(editingSource.id, sourceData)
      setEditingSource(null)
      setShowForm(false)
    } catch (error) {
      console.error('Failed to update data source:', error)
    }
  }

  const handleDeleteSource = async (id: number) => {
    if (!confirm('确定要删除这个数据源吗？')) return
    
    try {
      await deleteDataSource(id)
    } catch (error) {
      console.error('Failed to delete data source:', error)
    }
  }

  const handleTestConnection = async (id: number) => {
    setTestingConnection(id)
    try {
      const result = await testConnection(id)
      alert(result.success ? '连接成功！' : `连接失败: ${result.message}`)
    } catch (error) {
      alert('连接测试失败')
    } finally {
      setTestingConnection(null)
    }
  }

  const handleEdit = (source: DataSource) => {
    setEditingSource(source)
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingSource(null)
  }

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ocean-500"></div>
          <span className="ml-2 text-gray-600">加载中...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card">
        <div className="text-center py-8 text-red-600">
          <XCircle className="h-12 w-12 mx-auto mb-4" />
          <p>加载失败: {error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-end">
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>添加数据源</span>
        </button>
      </div>

      {/* Data Sources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dataSources.map((source) => (
          <div key={source.id} className="card hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Globe className="h-6 w-6 text-ocean-500" />
                <div>
                  <h3 className="font-medium text-gray-900">{source.name}</h3>
                  <p className="text-sm text-gray-600">{source.protocol}</p>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => handleEdit(source)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                  title="编辑"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeleteSource(source.id)}
                  className="p-1 text-gray-400 hover:text-red-600 rounded"
                  title="删除"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">数据源URL</p>
                <p className="text-sm text-gray-900 truncate" title={source.url}>
                  {source.url}
                </p>
              </div>

              {source.description && (
                <div>
                  <p className="text-sm text-gray-500">描述</p>
                  <p className="text-sm text-gray-900">{source.description}</p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {source.is_active ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm text-gray-600">
                    {source.is_active ? '活跃' : '停用'}
                  </span>
                </div>

                <button
                  onClick={() => handleTestConnection(source.id)}
                  disabled={testingConnection === source.id}
                  className="text-sm text-ocean-600 hover:text-ocean-800 disabled:opacity-50"
                >
                  {testingConnection === source.id ? '测试中...' : '测试连接'}
                </button>
              </div>

              <div className="text-xs text-gray-500">
                创建时间: {formatDate(source.created_at)}
              </div>
            </div>
          </div>
        ))}

        {dataSources.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Globe className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">暂无数据源</p>
            <p className="text-sm text-gray-400">点击"添加数据源"开始配置</p>
          </div>
        )}
      </div>

      {/* Data Source Form Modal */}
      {showForm && (
        <DataSourceForm
          source={editingSource}
          onSubmit={editingSource ? handleUpdateSource : handleCreateSource}
          onClose={handleCloseForm}
        />
      )}
    </div>
  )
}