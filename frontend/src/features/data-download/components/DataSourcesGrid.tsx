import React from 'react'
import { Globe, Settings } from 'lucide-react'
import { useDataSources } from '../hooks/useDataSources'

interface DataSourcesGridProps {
  onManageClick?: () => void
}

export const DataSourcesGrid: React.FC<DataSourcesGridProps> = ({ onManageClick }) => {
  const { dataSources, loading } = useDataSources()

  if (loading) {
    return (
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">数据源状态</h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-ocean-500"></div>
          <span className="ml-2 text-gray-600">加载中...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">数据源状态</h2>
        {onManageClick && (
          <button
            onClick={onManageClick}
            className="flex items-center space-x-1 text-sm text-ocean-600 hover:text-ocean-800"
          >
            <Settings className="h-4 w-4" />
            <span>管理</span>
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {dataSources.length > 0 ? (
          dataSources.slice(0, 4).map((source) => (
            <div key={source.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <Globe className="h-5 w-5 text-ocean-500" />
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  source.is_active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {source.is_active ? '已连接' : '断开'}
                </span>
              </div>
              <h3 className="font-medium text-gray-900 text-sm">{source.name}</h3>
              <p className="text-xs text-gray-600 mt-1">{source.protocol}</p>
              <p className="text-xs text-gray-500 mt-1 truncate" title={source.url}>
                {source.url}
              </p>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-8">
            <Globe className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">暂无数据源</p>
            <p className="text-sm text-gray-400">点击"管理"开始配置数据源</p>
          </div>
        )}
      </div>
      
      {dataSources.length > 4 && (
        <div className="mt-4 text-center">
          <button
            onClick={onManageClick}
            className="text-sm text-ocean-600 hover:text-ocean-800"
          >
            查看全部 {dataSources.length} 个数据源
          </button>
        </div>
      )}
    </div>
  )
}