import React from 'react'
import {
  Play,
  Upload,
  Settings,
  Download,
  Eye,
  AlertCircle,
  CheckCircle,
  FileText,
  Image
} from 'lucide-react'

interface AlgorithmExecutionGuideProps {
  algorithmName?: string
}

const AlgorithmExecutionGuide: React.FC<AlgorithmExecutionGuideProps> = ({ 
  algorithmName = "海洋环境要素（温度、盐度、海表面高度）可视化" 
}) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        算法执行操作指南
      </h2>
      
      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-blue-800">
          <strong>当前算法：</strong>{algorithmName}
        </p>
      </div>

      <div className="space-y-6">
        {/* 步骤1：上传数据 */}
        <div className="border-l-4 border-ocean-500 pl-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
            <span className="bg-ocean-500 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3">1</span>
            <Upload className="h-5 w-5 mr-2" />
            上传输入数据
          </h3>
          <div className="ml-11 space-y-2">
            <p className="text-gray-700">准备您的NetCDF格式海洋数据文件：</p>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>支持格式：.nc, .nc4, .netcdf</li>
              <li>文件大小：不超过500MB</li>
              <li>数据要求：包含温度、盐度或海表面高度变量</li>
              <li>坐标要求：包含经度(lon/longitude)和纬度(lat/latitude)</li>
            </ul>
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-sm text-yellow-800">
                <AlertCircle className="inline h-4 w-4 mr-1" />
                提示：确保数据遵循CF-1.8标准格式，包含正确的变量名和单位
              </p>
            </div>
          </div>
        </div>

        {/* 步骤2：参数配置 */}
        <div className="border-l-4 border-ocean-500 pl-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
            <span className="bg-ocean-500 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3">2</span>
            <Settings className="h-5 w-5 mr-2" />
            配置参数
          </h3>
          <div className="ml-11 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-3 rounded">
                <h4 className="font-medium text-gray-900 mb-1">可视化要素</h4>
                <select className="w-full p-2 border border-gray-300 rounded">
                  <option>温度 (Temperature)</option>
                  <option>盐度 (Salinity)</option>
                  <option>海表面高度 (SSH)</option>
                </select>
              </div>
              
              <div className="bg-gray-50 p-3 rounded">
                <h4 className="font-medium text-gray-900 mb-1">色彩方案</h4>
                <select className="w-full p-2 border border-gray-300 rounded">
                  <option>Rainbow (彩虹色)</option>
                  <option>Viridis (绿紫渐变)</option>
                  <option>Coolwarm (冷暖对比)</option>
                  <option>Ocean (海洋色)</option>
                </select>
              </div>
              
              <div className="bg-gray-50 p-3 rounded">
                <h4 className="font-medium text-gray-900 mb-1">输出格式</h4>
                <select className="w-full p-2 border border-gray-300 rounded">
                  <option>PNG (推荐)</option>
                  <option>SVG (矢量图)</option>
                  <option>PDF (文档)</option>
                </select>
              </div>
              
              <div className="bg-gray-50 p-3 rounded">
                <h4 className="font-medium text-gray-900 mb-1">地图投影</h4>
                <select className="w-full p-2 border border-gray-300 rounded">
                  <option>墨卡托投影</option>
                  <option>等距圆柱投影</option>
                  <option>兰伯特投影</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* 步骤3：执行算法 */}
        <div className="border-l-4 border-ocean-500 pl-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
            <span className="bg-ocean-500 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3">3</span>
            <Play className="h-5 w-5 mr-2" />
            执行算法
          </h3>
          <div className="ml-11 space-y-2">
            <p className="text-gray-700">点击"开始执行"按钮后，系统将：</p>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>验证输入数据格式</li>
              <li>加载算法容器（如果启用Docker）</li>
              <li>处理数据并生成可视化图像</li>
              <li>显示实时进度和日志</li>
            </ul>
          </div>
        </div>

        {/* 步骤4：查看结果 */}
        <div className="border-l-4 border-ocean-500 pl-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
            <span className="bg-ocean-500 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3">4</span>
            <Eye className="h-5 w-5 mr-2" />
            查看和下载结果
          </h3>
          <div className="ml-11 space-y-2">
            <p className="text-gray-700">执行完成后，您可以：</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
              <div className="flex items-center space-x-2 text-gray-600">
                <Image className="h-5 w-5 text-blue-500" />
                <span>预览生成的图像</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-600">
                <Download className="h-5 w-5 text-green-500" />
                <span>下载结果文件</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-600">
                <FileText className="h-5 w-5 text-purple-500" />
                <span>查看执行日志</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 示例数据结构 */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-3">
          NetCDF数据结构示例
        </h3>
        <pre className="bg-gray-800 text-gray-100 p-4 rounded overflow-x-auto text-sm">
{`dimensions:
    time = 1 ;
    lat = 180 ;
    lon = 360 ;
    
variables:
    float time(time) ;
        time:units = "days since 1900-01-01" ;
    float lat(lat) ;
        lat:units = "degrees_north" ;
    float lon(lon) ;
        lon:units = "degrees_east" ;
    float temperature(time, lat, lon) ;
        temperature:units = "celsius" ;
        temperature:long_name = "Sea Surface Temperature" ;
    float salinity(time, lat, lon) ;
        salinity:units = "psu" ;
        salinity:long_name = "Sea Surface Salinity" ;
    float ssh(time, lat, lon) ;
        ssh:units = "meters" ;
        ssh:long_name = "Sea Surface Height" ;`}
        </pre>
      </div>

      <div className="mt-6 flex items-center justify-center">
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 flex items-center">
            <CheckCircle className="h-5 w-5 mr-2" />
            准备就绪！按照以上步骤即可成功执行海洋数据可视化算法
          </p>
        </div>
      </div>
    </div>
  )
}

export default AlgorithmExecutionGuide