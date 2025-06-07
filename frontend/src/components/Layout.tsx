import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  Home, 
  Download, 
  RefreshCw, 
  Mountain, 
  BarChart3, 
  Menu,
  X,
  Waves
} from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  const navigation = [
    { name: '仪表板', href: '/', icon: Home },
    { name: '数据下载', href: '/download', icon: Download },
    { name: '标准转换', href: '/transform', icon: RefreshCw },
    { name: '地形反演', href: '/terrain', icon: Mountain },
    { name: '算法集成', href: '/visualization', icon: BarChart3 },
  ]

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 侧边栏 */}
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Waves className="h-8 w-8 text-ocean-500" />
            <span className="text-xl font-bold text-gray-900">海洋数据转换可视化</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
          >
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>
        
        <nav className="mt-8 px-4">
          <ul className="space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.href
              
              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={`nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {item.name}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部导航栏 */}
        <header className="bg-white shadow-sm border-b border-gray-200 lg:hidden">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-md text-gray-500 hover:bg-gray-100"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center space-x-2">
              <Waves className="h-6 w-6 text-ocean-500" />
              <span className="text-lg font-semibold text-gray-900">海洋数据转换可视化</span>
            </div>
            <div className="w-10"></div>
          </div>
        </header>

        {/* 主内容 */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>

      {/* 移动端遮罩层 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}

export default Layout 