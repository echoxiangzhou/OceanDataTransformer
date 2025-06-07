# Ocean Data Platform - Frontend

海洋环境数据标准转换和可视化算法集成软件 - 前端应用

## 技术栈

- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **样式**: Tailwind CSS 
- **路由**: React Router DOM
- **状态管理**: React Hooks + Context
- **图标**: Lucide React
- **工具库**: clsx, tailwind-merge

## 开发命令

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview

# 代码检查
npm run lint

# 修复代码问题
npm run lint:fix
```

## 项目结构

```
src/
├── components/          # 通用组件
├── features/           # 特性模块
│   ├── data-download/  # 数据下载模块
│   ├── data-conversion/# 数据转换模块
│   └── algorithm-management/ # 算法管理模块
├── lib/               # 工具函数和配置
├── types/             # TypeScript 类型定义
├── hooks/             # 全局自定义 Hooks
└── pages/             # 页面组件
```

## 开发指南

### 特性模块结构

每个特性模块包含：
- `components/`: 模块特定组件
- `pages/`: 页面组件
- `hooks/`: 自定义 Hooks
- `services/`: API 服务

### API 配置

API 基础URL通过环境变量配置：
- 开发环境: `http://localhost:8000/api/v1`
- 生产环境: 通过 `VITE_API_URL` 环境变量设置

### 样式规范

- 使用 Tailwind CSS 工具类
- 自定义颜色: `ocean-500` (海洋主题色)
- 响应式设计原则
- 组件样式类: `btn-primary`, `btn-secondary`, `card`, `nav-item`

## 环境变量

```bash
VITE_API_URL=http://localhost:8000  # 后端API地址
```

## Docker 部署

```bash
# 构建镜像
docker build -f ../Dockerfile.frontend -t ocean-platform-frontend .

# 运行容器
docker run -p 3000:3000 ocean-platform-frontend
```