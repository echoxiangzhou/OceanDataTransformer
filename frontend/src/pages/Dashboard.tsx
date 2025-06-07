import React from 'react'
import { 
  Download, 
  RefreshCw, 
  Mountain, 
  BarChart3,
  Database,
  Activity,
  Users,
  Globe
} from 'lucide-react'

const Dashboard: React.FC = () => {
  const stats = [
    { name: '数据总量', value: '2.3TB', icon: Database, color: 'text-blue-600' },
    { name: '处理任务', value: '145', icon: Activity, color: 'text-green-600' },
    { name: '在线用户', value: '23', icon: Users, color: 'text-purple-600' },
    { name: '数据源', value: '18', icon: Globe, color: 'text-orange-600' },
  ]

  const modules = [
    {
      name: '数据下载模块',
      description: '国际共享海洋环境数据批量下载',
      icon: Download,
      status: '运行中',
      lastUpdate: '2024-01-15 14:30',
      color: 'bg-blue-500'
    },
    {
      name: '数据转换模块', 
      description: '海洋环境数据格式标准化转换',
      icon: RefreshCw,
      status: '运行中',
      lastUpdate: '2024-01-15 14:25',
      color: 'bg-green-500'
    },
    {
      name: '地形反演模块',
      description: '基于深度学习的海底地形重力反演',
      icon: Mountain,
      status: '待机',
      lastUpdate: '2024-01-15 12:15',
      color: 'bg-purple-500'
    },
    {
      name: '数据可视化模块',
      description: '海洋环境数据多维度可视化',
      icon: BarChart3,
      status: '运行中',
      lastUpdate: '2024-01-15 14:28',
      color: 'bg-orange-500'
    }
  ]

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">系统仪表板</h1>
          <p className="text-gray-600 mt-1">海洋环境数据标准转换和可视化算法集成软件概览</p>
        </div>
        <div className="text-sm text-gray-500">
          最后更新: {new Date().toLocaleString()}
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.name} className="card">
              <div className="flex items-center">
                <div className={`p-2 rounded-lg ${stat.color} bg-opacity-10`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 模块状态 */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">模块状态</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {modules.map((module) => {
            const Icon = module.icon
            return (
              <div key={module.name} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg ${module.color} text-white`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{module.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{module.description}</p>
                      <p className="text-xs text-gray-500 mt-2">更新时间: {module.lastUpdate}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    module.status === '运行中' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {module.status}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 系统信息 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">支持的数据格式</h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">文本文件</span>
              <span className="font-medium">TXT, CSV</span>
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
              <span className="text-gray-600">数据库</span>
              <span className="font-medium">MySQL, PostgreSQL</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">可视化输出格式</h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">静态图像</span>
              <span className="font-medium">PNG, JPG, EMF, EPS</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">动画格式</span>
              <span className="font-medium">GIF, MP4</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">网页格式</span>
              <span className="font-medium">HTML, SVG</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">编程接口</span>
              <span className="font-medium">Python, JavaScript, R</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard 