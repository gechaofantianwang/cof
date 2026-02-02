# 🗨️ CCB 聊天室

一个基于 Vue 3 + Node.js + Socket.IO 的实时聊天室应用，支持 AI 智能对话。

## ✨ 功能特性

- 💬 实时消息通讯（基于 Socket.IO）
- 🤖 AI 智能对话（集成 Google Gemini API）
- 🔐 用户认证（JWT Token）
- 💾 消息持久化（MongoDB）
- 🖥️ 桌面客户端（Electron）
- 📱 响应式设计

## 🛠️ 技术栈

### 前端 (ccb/)
- Vue 3 + Vite
- Pinia 状态管理
- Vue Router
- Socket.IO Client
- Font Awesome 图标
- Electron（桌面端打包）

### 后端 (server/)
- Node.js + Express
- Socket.IO
- MongoDB + Mongoose
- JWT 认证
- Google Generative AI

## 🚀 快速开始

### 环境要求
- Node.js >= 18
- MongoDB
- npm 或 yarn

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/你的用户名/coffee.git
cd coffee
```

2. **配置环境变量**

复制环境变量示例文件并填入你的配置：
```bash
# 前端
cp ccb/.env.example ccb/.env

# 后端
cp server/.env.example server/.env
```

3. **安装依赖**
```bash
# 安装后端依赖
cd server
npm install

# 安装前端依赖
cd ../ccb
npm install
```

4. **启动项目**
```bash
# 启动后端服务（在 server 目录）
npm start

# 启动前端开发服务器（在 ccb 目录）
npm run dev
```

5. **访问应用**

打开浏览器访问 `http://localhost:5173`

## 📁 项目结构

```
coffee/
├── ccb/                 # 前端项目
│   ├── src/
│   │   ├── views/       # 页面组件
│   │   ├── stores/      # Pinia 状态管理
│   │   ├── router/      # 路由配置
│   │   └── utils/       # 工具函数
│   └── electron/        # Electron 配置
│
├── server/              # 后端项目
│   ├── routes/          # API 路由
│   ├── models/          # 数据模型
│   ├── middlewares/     # 中间件
│   ├── sockets/         # Socket.IO 处理
│   └── config/          # 配置文件
│
└── README.md
```

## 📦 构建桌面应用

```bash
cd ccb
npm run build:win
```

构建产物将输出到 `ccb/release/` 目录。

## 📄 许可证

本项目基于 [MIT 许可证](./LICENSE) 开源。
