import React, { useState, useEffect } from 'react'
import { 
  Download, 
  RefreshCw, 
  Mountain, 
  BarChart3,
  Database,
  Activity,
  Users,
  Globe,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  Server,
  Wifi,
  HardDrive,
  Cpu,
  Thermometer
} from 'lucide-react'
import { 
  dashboardService, 
  SystemStats, 
  ModuleStatus, 
  RecentActivity, 
  DataSourceStatus 
} from '../services/dashboardService'

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [moduleStatus, setModuleStatus] = useState<ModuleStatus[]>([])
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [dataSourceStatus, setDataSourceStatus] = useState<DataSourceStatus[]>([])
  const [systemHealth, setSystemHealth] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  // 加载仪表板数据
  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const [statsData, modulesData, activityData, sourcesData, healthData] = await Promise.all([
        dashboardService.getSystemStats(),
        dashboardService.getModuleStatus(),
        dashboardService.getRecentActivity(8),
        dashboardService.getDataSourceStatus(),
        dashboardService.getSystemHealth()
      ])

      setStats(statsData)
      setModuleStatus(modulesData)
      setRecentActivity(activityData)
      setDataSourceStatus(sourcesData)
      setSystemHealth(healthData)
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  // 初始加载数据
  useEffect(() => {
    loadDashboardData()
    
    // 设置自动刷新（每30秒）
    const interval = setInterval(loadDashboardData, 30000)
    
    return () => clearInterval(interval)
  }, [])

  // 手动刷新
  const handleRefresh = () => {
    loadDashboardData()
  }

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'running':
      case '运行中': 
        return 'bg-green-100 text-green-800'
      case 'idle':
      case '待机': 
        return 'bg-gray-100 text-gray-800'
      case 'error':
      case '错误': 
        return 'bg-red-100 text-red-800'
      case 'maintenance':
      case '维护中': 
        return 'bg-yellow-100 text-yellow-800'
      default: 
        return 'bg-gray-100 text-gray-800'
    }
  }

  // 获取活动严重程度颜色
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'success': return 'text-green-600'
      case 'warning': return 'text-yellow-600'
      case 'error': return 'text-red-600'
      default: return 'text-blue-600'
    }
  }

  // 格式化时间
  const formatTime = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffMs = now.getTime() - time.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return '刚刚'
    if (diffMins < 60) return `${diffMins}分钟前`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}小时前`
    return `${Math.floor(diffMins / 1440)}天前`
  }

  const getIconForModule = (name: string) => {
    if (name.includes('下载')) return Download
    if (name.includes('转换')) return RefreshCw
    if (name.includes('算法') || name.includes('可视化')) return BarChart3
    if (name.includes('地形') || name.includes('反演')) return Mountain
    return Server
  }

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ocean-500"></div>
        <span className="ml-2 text-gray-600">加载仪表板数据...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">系统仪表板</h1>
          <p className="text-gray-600 mt-1">海洋环境数据标准转换和可视化算法集成软件概览</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500">
            最后更新: {lastUpdate.toLocaleString()}
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="btn-secondary flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>刷新</span>
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-2 rounded-lg text-blue-600 bg-blue-100">
              <Database className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">数据总量</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalDataSize || '0'}</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <div className="p-2 rounded-lg text-green-600 bg-green-100">
              <Activity className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">处理任务</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.processedTasks || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <div className="p-2 rounded-lg text-purple-600 bg-purple-100">
              <Users className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">在线用户</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.activeUsers || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <div className="p-2 rounded-lg text-orange-600 bg-orange-100">
              <Globe className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">数据源</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.dataSources || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 模块状态和系统健康 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 模块状态 */}
        <div className="lg:col-span-2">
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">模块状态</h2>
            <div className="grid grid-cols-1 gap-4">
              {moduleStatus.map((module) => {
                const Icon = getIconForModule(module.name)
                return (
                  <div key={module.name} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 rounded-lg bg-gray-100">
                          <Icon className="h-5 w-5 text-gray-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium text-gray-900">{module.name}</h3>
                            <span className="text-xs text-gray-500">v{module.version}</span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{module.description}</p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            <span>运行时间: {module.uptime}</span>
                            <span>更新: {formatTime(module.lastUpdate)}</span>
                          </div>
                          {/* 健康状态 */}
                          <div className="flex items-center space-x-4 mt-2">
                            <div className="flex items-center space-x-1">
                              <Cpu className="h-3 w-3 text-gray-400" />
                              <span className="text-xs text-gray-600">CPU: {module.health.cpu}%</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Activity className="h-3 w-3 text-gray-400" />
                              <span className="text-xs text-gray-600">内存: {module.health.memory}%</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <HardDrive className="h-3 w-3 text-gray-400" />
                              <span className="text-xs text-gray-600">磁盘: {module.health.disk}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(module.status)}`}>
                        {module.status === 'running' ? '运行中' : 
                         module.status === 'idle' ? '待机' : 
                         module.status === 'error' ? '错误' : module.status}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* 系统健康状态 */}
        <div className="space-y-6">
          {/* 系统健康 */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">系统健康</h2>
            {systemHealth && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Cpu className="h-4 w-4 text-blue-500" />
                    <span className="text-sm text-gray-600">CPU使用率</span>
                  </div>
                  <span className="text-sm font-medium">{systemHealth.cpu}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full" 
                    style={{ width: `${systemHealth.cpu}%` }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Activity className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-gray-600">内存使用率</span>
                  </div>
                  <span className="text-sm font-medium">{systemHealth.memory}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ width: `${systemHealth.memory}%` }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <HardDrive className="h-4 w-4 text-purple-500" />
                    <span className="text-sm text-gray-600">磁盘使用率</span>
                  </div>
                  <span className="text-sm font-medium">{systemHealth.disk}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-500 h-2 rounded-full" 
                    style={{ width: `${systemHealth.disk}%` }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Wifi className="h-4 w-4 text-orange-500" />
                    <span className="text-sm text-gray-600">网络负载</span>
                  </div>
                  <span className="text-sm font-medium">{systemHealth.network}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-orange-500 h-2 rounded-full" 
                    style={{ width: `${systemHealth.network}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 数据源状态 */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">数据源状态</h2>
            <div className="space-y-3">
              {dataSourceStatus.map((source) => (
                <div key={source.id} className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        source.status === 'connected' ? 'bg-green-500' : 
                        source.status === 'disconnected' ? 'bg-gray-400' : 'bg-red-500'
                      }`} />
                      <span className="text-sm font-medium text-gray-900">{source.name}</span>
                    </div>
                    <div className="text-xs text-gray-500 ml-4">
                      {source.type} • 响应时间: {source.responseTime}ms
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    可用性: {source.uptime}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 最近活动和存储信息 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 最近活动 */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">最近活动</h2>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className={`w-2 h-2 rounded-full mt-2 ${getSeverityColor(activity.severity).replace('text-', 'bg-')}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{activity.message}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs text-gray-500">{formatTime(activity.timestamp)}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      activity.type === 'download' ? 'bg-blue-100 text-blue-700' :
                      activity.type === 'conversion' ? 'bg-green-100 text-green-700' :
                      activity.type === 'algorithm' ? 'bg-purple-100 text-purple-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {activity.type === 'download' ? '下载' :
                       activity.type === 'conversion' ? '转换' :
                       activity.type === 'algorithm' ? '算法' : '系统'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 存储和任务统计 */}
        <div className="space-y-6">
          {/* 存储信息 */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">存储空间</h2>
            {stats && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">已使用</span>
                  <span className="text-sm font-medium">{stats.storageInfo.used}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-ocean-500 h-3 rounded-full" 
                    style={{ width: `${stats.storageInfo.usagePercentage}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>可用空间: {stats.storageInfo.available}</span>
                  <span>{stats.storageInfo.usagePercentage}% 已使用</span>
                </div>
              </div>
            )}
          </div>

          {/* 任务统计 */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">任务统计</h2>
            {stats && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">下载任务</span>
                    <span className="text-sm font-medium">{stats.downloadTasks.total}</span>
                  </div>
                  <div className="flex space-x-1">
                    <div className="flex-1 bg-green-100 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${(stats.downloadTasks.completed / stats.downloadTasks.total) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>完成: {stats.downloadTasks.completed}</span>
                    <span>进行中: {stats.downloadTasks.active}</span>
                    <span>失败: {stats.downloadTasks.failed}</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">转换任务</span>
                    <span className="text-sm font-medium">{stats.conversionTasks.total}</span>
                  </div>
                  <div className="flex space-x-1">
                    <div className="flex-1 bg-blue-100 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${(stats.conversionTasks.completed / stats.conversionTasks.total) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>完成: {stats.conversionTasks.completed}</span>
                    <span>处理中: {stats.conversionTasks.processing}</span>
                    <span>失败: {stats.conversionTasks.failed}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 支持格式信息 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">支持的数据格式</h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">文本文件</span>
              <span className="font-medium">TXT, CSV, CNV</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">科学数据</span>
              <span className="font-medium">NetCDF, HDF, GRIB</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">图像格式</span>
              <span className="font-medium">TIFF, PNG, JPG</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">输出标准</span>
              <span className="font-medium">CF-1.8 NetCDF</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">可视化输出格式</h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">静态图像</span>
              <span className="font-medium">PNG, JPG, SVG, EPS</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">动画格式</span>
              <span className="font-medium">GIF, MP4, HTML5</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">交互式图表</span>
              <span className="font-medium">HTML, JavaScript</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">数据格式</span>
              <span className="font-medium">JSON, CSV, NetCDF</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard 