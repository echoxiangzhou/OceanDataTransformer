import React, { useState } from 'react'
import { 
  Download, 
  Play, 
  Pause, 
  Settings, 
  FolderOpen,
  Globe,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus
} from 'lucide-react'

const DataDownload: React.FC = () => {
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [newTask, setNewTask] = useState({
    name: '',
    url: '',
    format: 'netcdf',
    savePath: '',
    protocol: 'http'
  })

  const dataSources = [
    { name: 'NOAA 海洋数据', url: 'https://www.nodc.noaa.gov', type: 'NetCDF', status: '已连接' },
    { name: 'Copernicus 海洋服务', url: 'https://marine.copernicus.eu', type: 'GRIB', status: '已连接' },
    { name: 'ARGO 漂流浮标', url: 'https://www.argo.ucsd.edu', type: 'NetCDF', status: '已连接' },
    { name: 'WOD 世界海洋数据', url: 'https://www.nodc.noaa.gov/OC5/WOD', type: 'CSV', status: '断开' },
  ]

  const downloadTasks = [
    {
      id: 1,
      name: '全球海表温度数据',
      source: 'NOAA',
      format: 'NetCDF',
      size: '1.2GB',
      progress: 85,
      status: '下载中',
      startTime: '2024-01-15 14:20',
      savePath: '/data/sst/'
    },
    {
      id: 2,
      name: 'ARGO温盐深度数据',
      source: 'ARGO',
      format: 'NetCDF',
      size: '856MB',
      progress: 100,
      status: '已完成',
      startTime: '2024-01-15 13:45',
      savePath: '/data/argo/'
    },
    {
      id: 3,
      name: '海洋再分析数据',
      source: 'Copernicus',
      format: 'GRIB',
      size: '2.1GB',
      progress: 45,
      status: '已暂停',
      startTime: '2024-01-15 12:30',
      savePath: '/data/reanalysis/'
    }
  ]

  const handleAddTask = () => {
    setShowConfigModal(true)
  }

  const handleSaveTask = () => {
    // 保存新任务的逻辑
    setShowConfigModal(false)
    setNewTask({ name: '', url: '', format: 'netcdf', savePath: '', protocol: 'http' })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case '下载中': return 'text-blue-600 bg-blue-100'
      case '已完成': return 'text-green-600 bg-green-100'
      case '已暂停': return 'text-yellow-600 bg-yellow-100'
      case '出错': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">数据下载管理</h1>
          <p className="text-gray-600 mt-1">国际共享海洋环境数据批量下载</p>
        </div>
        <button
          onClick={handleAddTask}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>新建下载任务</span>
        </button>
      </div>

      {/* 数据源状态 */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">数据源状态</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {dataSources.map((source, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <Globe className="h-5 w-5 text-ocean-500" />
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  source.status === '已连接' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {source.status}
                </span>
              </div>
              <h3 className="font-medium text-gray-900 text-sm">{source.name}</h3>
              <p className="text-xs text-gray-600 mt-1">{source.type}</p>
              <p className="text-xs text-gray-500 mt-1 truncate">{source.url}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 下载任务列表 */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">下载任务 ({downloadTasks.length})</h2>
        <div className="space-y-4">
          {downloadTasks.map((task) => (
            <div key={task.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="font-medium text-gray-900">{task.name}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(task.status)}`}>
                      {task.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                      <Globe className="h-4 w-4" />
                      <span>{task.source}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Download className="h-4 w-4" />
                      <span>{task.format} · {task.size}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span>{task.startTime}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <FolderOpen className="h-4 w-4" />
                      <span className="truncate">{task.savePath}</span>
                    </div>
                  </div>
                  {/* 进度条 */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600">下载进度</span>
                      <span className="text-gray-900 font-medium">{task.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          task.status === '已完成' ? 'bg-green-500' :
                          task.status === '下载中' ? 'bg-blue-500' :
                          task.status === '已暂停' ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
                {/* 操作按钮 */}
                <div className="flex items-center space-x-2 ml-4">
                  {task.status === '下载中' ? (
                    <button className="p-2 text-gray-500 hover:text-gray-700 rounded">
                      <Pause className="h-4 w-4" />
                    </button>
                  ) : task.status === '已暂停' ? (
                    <button className="p-2 text-green-500 hover:text-green-700 rounded">
                      <Play className="h-4 w-4" />
                    </button>
                  ) : null}
                  <button className="p-2 text-gray-500 hover:text-gray-700 rounded">
                    <Settings className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 新建任务模态框 */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity">
              <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setShowConfigModal(false)}></div>
            </div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">新建下载任务</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">任务名称</label>
                    <input
                      type="text"
                      value={newTask.name}
                      onChange={(e) => setNewTask({...newTask, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                      placeholder="输入任务名称"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">数据链接</label>
                    <input
                      type="url"
                      value={newTask.url}
                      onChange={(e) => setNewTask({...newTask, url: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                      placeholder="输入数据源URL"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">数据格式</label>
                      <select
                        value={newTask.format}
                        onChange={(e) => setNewTask({...newTask, format: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                      >
                        <option value="netcdf">NetCDF</option>
                        <option value="grib">GRIB</option>
                        <option value="hdf">HDF</option>
                        <option value="csv">CSV</option>
                        <option value="tiff">TIFF</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">下载协议</label>
                      <select
                        value={newTask.protocol}
                        onChange={(e) => setNewTask({...newTask, protocol: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                      >
                        <option value="http">HTTP</option>
                        <option value="ftp">FTP</option>
                        <option value="sftp">SFTP</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">保存路径</label>
                    <input
                      type="text"
                      value={newTask.savePath}
                      onChange={(e) => setNewTask({...newTask, savePath: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                      placeholder="/data/downloads/"
                    />
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={handleSaveTask}
                  className="btn-primary w-full sm:w-auto sm:ml-3"
                >
                  创建任务
                </button>
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="btn-secondary w-full sm:w-auto mt-3 sm:mt-0"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DataDownload 