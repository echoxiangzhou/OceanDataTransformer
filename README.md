# 海洋环境数据标准转换和可视化算法集成软件

基于React + Tailwind CSS构建的现代化海洋环境数据标准转换和可视化算法集成软件。

## 🌊 功能特性

### 1. 数据下载模块
- 国际共享海洋环境数据批量下载
- 支持多种数据源：NOAA、Copernicus、ARGO等
- 多协议支持：HTTP、FTP、SFTP
- 任务管理和进度监控

### 2. 数据标准转换模块
- 海洋环境数据格式标准化转换和存储
- 支持格式：NetCDF、GRIB、HDF、CSV、TIFF等
- 目标数据库：MySQL、PostgreSQL
- 数据质量控制和压缩优化

### 3. 地形反演模块
- 基于深度学习的海底地形重力反演
- CNN和DNN算法支持
- 网络设计和模型评估
- 高精度地形重建

### 4. 可视化算法集成模块
- 多维度海洋环境数据可视化算法集成
- 标量场和矢量场可视化
- 交互式数据探索和算法调试
- 多种输出格式：PNG、HTML、SVG、GIF等

## 🚀 技术栈

- **前端框架**: React 18 + TypeScript
- **样式库**: Tailwind CSS
- **图标库**: Lucide React
- **构建工具**: Vite
- **路由**: React Router
- **UI组件**: Shadcn/ui

## 📦 安装与运行

### 环境要求
- Node.js 16+
- npm 或 yarn

### 安装依赖
```bash
npm install
```

### 开发模式
```bash
npm run dev
```
访问 http://localhost:3000

### 构建生产版本
```bash
npm run build
```

### 预览生产版本
```bash
npm run preview
```

## 🗂 项目结构

```
src/
├── components/          # 共享组件
│   └── Layout.tsx      # 主布局组件
├── pages/              # 页面组件
│   ├── Dashboard.tsx   # 仪表板页面
│   ├── DataDownload.tsx # 数据下载页面
│   ├── DataTransform.tsx # 数据转换页面
│   ├── TerrainInversion.tsx # 地形反演页面
│   └── DataVisualization.tsx # 数据可视化页面
├── App.tsx             # 主应用组件
├── main.tsx           # 应用入口
└── index.css          # 全局样式
```

## 🎨 设计理念

- **B/S架构**: 基于浏览器的用户界面，支持跨平台访问
- **响应式设计**: 适配桌面和移动设备
- **模块化设计**: 松耦合的功能模块，易于扩展
- **现代UI**: 简洁清晰的用户界面，优秀的用户体验

## 📋 支持的数据格式

### 输入格式
- **科学数据**: NetCDF、GRIB、HDF
- **文本数据**: CSV、TXT、JSON
- **图像数据**: TIFF、PNG、JPG
- **二进制数据**: Binary格式

### 输出格式
- **数据库**: MySQL、PostgreSQL
- **图像**: PNG、JPG、EMF、EPS
- **动画**: GIF、MP4
- **网页**: HTML、SVG

## 🔧 配置说明

### 环境配置
项目使用Vite作为构建工具，支持：
- 热模块替换(HMR)
- TypeScript支持
- 自动导入优化

### 样式配置
基于Tailwind CSS，包含：
- 海洋主题色彩方案
- 响应式断点设置
- 自定义组件样式

