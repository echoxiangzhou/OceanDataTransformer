import React, { useState } from 'react'
import { 
  Mountain, 
  Brain, 
  Settings, 
  Play,
  Pause,
  Download,
  Upload,
  Target,
  TrendingUp,
  Activity,
  Layers,
  Map
} from 'lucide-react'

const TerrainInversion: React.FC = () => {
  const [modelConfig, setModelConfig] = useState({
    modelType: 'cnn',
    inputSize: '256x256',
    batchSize: 32,
    learningRate: 0.001,
    epochs: 100
  })

  const [inversionConfig, setInversionConfig] = useState({
    dataSource: 'gravity',
    resolution: '1km',
    depthRange: '0-6000m',
    filterType: 'gaussian'
  })

  const models = [
    {
      id: 1,
      name: 'CNN海底地形模型',
      type: 'CNN',
      accuracy: 92.5,
      status: '已训练',
      lastTrained: '2024-01-10',
      dataPoints: 50000,
      description: '基于卷积神经网络的海底地形反演模型'
    },
    {
      id: 2,
      name: 'DNN重力反演模型',
      type: 'DNN',
      accuracy: 89.7,
      status: '训练中',
      lastTrained: '进行中',
      dataPoints: 75000,
      description: '深度神经网络重力数据反演模型'
    },
    {
      id: 3,
      name: '混合神经网络模型',
      type: 'Hybrid',
      accuracy: 0,
      status: '待训练',
      lastTrained: '未开始',
      dataPoints: 0,
      description: 'CNN+DNN混合架构地形反演模型'
    }
  ]

  const inversionTasks = [
    {
      id: 1,
      name: '南海海盆地形反演',
      model: 'CNN海底地形模型',
      region: '南海海盆',
      progress: 78,
      status: '处理中',
      startTime: '2024-01-15 09:30',
      estimatedTime: '2小时15分钟',
      inputData: '重力异常数据',
      resolution: '500m'
    },
    {
      id: 2,
      name: '马里亚纳海沟深度计算',
      model: 'DNN重力反演模型',
      region: '马里亚纳海沟',
      progress: 100,
      status: '已完成',
      startTime: '2024-01-14 14:20',
      estimatedTime: '完成',
      inputData: '多波束+重力数据',
      resolution: '100m'
    }
  ]

  const performanceMetrics = [
    { name: '反演精度', value: '±15m', status: 'good' },
    { name: '覆盖范围', value: '95.8%', status: 'good' },
    { name: '处理速度', value: '2.3km²/min', status: 'normal' },
    { name: '数据质量', value: '92.1%', status: 'good' }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case '处理中': case '训练中': return 'text-blue-600 bg-blue-100'
      case '已完成': case '已训练': return 'text-green-600 bg-green-100'
      case '待训练': return 'text-yellow-600 bg-yellow-100'
      case '出错': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getMetricColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600'
      case 'normal': return 'text-blue-600'
      case 'warning': return 'text-yellow-600'
      case 'error': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">海底地形重力反演</h1>
          <p className="text-gray-600 mt-1">基于深度学习的海底地形重力反演和CNN/DNN算法</p>
        </div>
        <div className="flex space-x-3">
          <button className="btn-secondary flex items-center space-x-2">
            <Upload className="h-4 w-4" />
            <span>导入数据</span>
          </button>
          <button className="btn-primary flex items-center space-x-2">
            <Play className="h-4 w-4" />
            <span>开始反演</span>
          </button>
        </div>
      </div>

      {/* 模型配置和反演配置 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 模型配置 */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Brain className="h-5 w-5 mr-2 text-purple-500" />
            深度学习模型配置
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">模型类型</label>
                <select
                  value={modelConfig.modelType}
                  onChange={(e) => setModelConfig({...modelConfig, modelType: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                >
                  <option value="cnn">CNN (卷积神经网络)</option>
                  <option value="dnn">DNN (深度神经网络)</option>
                  <option value="hybrid">CNN+DNN 混合</option>
                  <option value="transformer">Transformer</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">输入尺寸</label>
                <select
                  value={modelConfig.inputSize}
                  onChange={(e) => setModelConfig({...modelConfig, inputSize: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                >
                  <option value="128x128">128×128</option>
                  <option value="256x256">256×256</option>
                  <option value="512x512">512×512</option>
                  <option value="1024x1024">1024×1024</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">批次大小</label>
                <input
                  type="number"
                  value={modelConfig.batchSize}
                  onChange={(e) => setModelConfig({...modelConfig, batchSize: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">学习率</label>
                <input
                  type="number"
                  step="0.0001"
                  value={modelConfig.learningRate}
                  onChange={(e) => setModelConfig({...modelConfig, learningRate: parseFloat(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">训练轮数</label>
                <input
                  type="number"
                  value={modelConfig.epochs}
                  onChange={(e) => setModelConfig({...modelConfig, epochs: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                />
              </div>
            </div>

            <button className="w-full btn-primary flex items-center justify-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>配置网络架构</span>
            </button>
          </div>
        </div>

        {/* 反演配置 */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Mountain className="h-5 w-5 mr-2 text-green-500" />
            地形反演配置
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">数据源</label>
                <select
                  value={inversionConfig.dataSource}
                  onChange={(e) => setInversionConfig({...inversionConfig, dataSource: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                >
                  <option value="gravity">重力异常数据</option>
                  <option value="multibeam">多波束测深</option>
                  <option value="satellite">卫星测高</option>
                  <option value="combined">组合数据</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">空间分辨率</label>
                <select
                  value={inversionConfig.resolution}
                  onChange={(e) => setInversionConfig({...inversionConfig, resolution: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                >
                  <option value="100m">100m</option>
                  <option value="500m">500m</option>
                  <option value="1km">1km</option>
                  <option value="5km">5km</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">深度范围</label>
                <select
                  value={inversionConfig.depthRange}
                  onChange={(e) => setInversionConfig({...inversionConfig, depthRange: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                >
                  <option value="0-1000m">0-1000m (陆架)</option>
                  <option value="0-6000m">0-6000m (深海)</option>
                  <option value="6000m+">6000m+ (深渊)</option>
                  <option value="custom">自定义范围</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">滤波方式</label>
                <select
                  value={inversionConfig.filterType}
                  onChange={(e) => setInversionConfig({...inversionConfig, filterType: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
                >
                  <option value="gaussian">高斯滤波</option>
                  <option value="butterworth">巴特沃斯滤波</option>
                  <option value="median">中值滤波</option>
                  <option value="none">无滤波</option>
                </select>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2">反演性能指标</h3>
              <div className="grid grid-cols-2 gap-4">
                {performanceMetrics.map((metric, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{metric.name}</span>
                    <span className={`text-sm font-medium ${getMetricColor(metric.status)}`}>
                      {metric.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 模型列表 */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">深度学习模型库</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {models.map((model) => (
            <div key={model.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Brain className="h-5 w-5 text-purple-500" />
                  <span className="font-medium text-gray-900">{model.type}</span>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(model.status)}`}>
                  {model.status}
                </span>
              </div>
              
              <h3 className="font-medium text-gray-900 mb-2">{model.name}</h3>
              <p className="text-sm text-gray-600 mb-4">{model.description}</p>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">准确率:</span>
                  <span className="font-medium">{model.accuracy > 0 ? `${model.accuracy}%` : '未评估'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">训练数据:</span>
                  <span className="font-medium">{model.dataPoints.toLocaleString()} 点</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">最后训练:</span>
                  <span className="font-medium">{model.lastTrained}</span>
                </div>
              </div>

              <div className="mt-4 flex space-x-2">
                <button className="flex-1 text-xs btn-secondary">
                  {model.status === '已训练' ? '重新训练' : '开始训练'}
                </button>
                <button className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700 border border-gray-300 rounded">
                  设置
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 反演任务列表 */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">地形反演任务</h2>
          <span className="text-sm text-gray-500">共 {inversionTasks.length} 个任务</span>
        </div>
        
        <div className="space-y-4">
          {inversionTasks.map((task) => (
            <div key={task.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="font-medium text-gray-900">{task.name}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(task.status)}`}>
                      {task.status}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                    <div className="flex items-center space-x-2">
                      <Target className="h-4 w-4" />
                      <span>{task.region}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Brain className="h-4 w-4" />
                      <span>{task.model}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Layers className="h-4 w-4" />
                      <span>{task.inputData}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Map className="h-4 w-4" />
                      <span>分辨率: {task.resolution}</span>
                    </div>
                  </div>

                  {/* 进度条 */}
                  {task.status === '处理中' && (
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-600">反演进度</span>
                        <span className="text-gray-900 font-medium">{task.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full bg-purple-500"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>开始时间: {task.startTime}</span>
                        <span>预计剩余: {task.estimatedTime}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 操作按钮 */}
                <div className="flex items-center space-x-2 ml-4">
                  {task.status === '处理中' ? (
                    <button className="p-2 text-blue-500 hover:text-blue-700 rounded">
                      <Pause className="h-4 w-4" />
                    </button>
                  ) : null}
                  <button className="p-2 text-gray-500 hover:text-gray-700 rounded">
                    <Settings className="h-4 w-4" />
                  </button>
                  {task.status === '已完成' && (
                    <button className="p-2 text-green-500 hover:text-green-700 rounded">
                      <Download className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 算法说明 */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">算法架构说明</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2 flex items-center">
              <Brain className="h-4 w-4 mr-2" />
              CNN 卷积神经网络
            </h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• 多层卷积特征提取</li>
              <li>• 空间特征自动学习</li>
              <li>• 适用于重力异常反演</li>
              <li>• 高精度地形重建</li>
            </ul>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <h3 className="font-medium text-purple-900 mb-2 flex items-center">
              <TrendingUp className="h-4 w-4 mr-2" />
              DNN 深度神经网络
            </h3>
            <ul className="text-sm text-purple-800 space-y-1">
              <li>• 深层非线性映射</li>
              <li>• 复杂关系建模</li>
              <li>• 适用于多源数据融合</li>
              <li>• 提升反演稳定性</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TerrainInversion 