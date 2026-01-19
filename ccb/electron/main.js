// 1. 【改动】使用 import 引入 Electron 模块
import { app, BrowserWindow } from 'electron'

// 2. 【改动】引入 node:path 和 node:url 模块
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// 3. 【新增】在 ES Module 中没有 __dirname，需要手动定义
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const createWindow = () => {
  // 实例化一个浏览器窗口对象
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      // 允许在渲染进程直接使用 Node.js API
      nodeIntegration: true,
      // 关闭上下文隔离
      contextIsolation: false
    }
  })

  // 判断是否是开发模式
  if (process.env.VITE_DEV_SERVER_URL) {
    // --- 开发模式 ---
    // 加载本地 Vite 服务地址
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
    // 打开开发者工具
    win.webContents.openDevTools()
  } else {
    // --- 生产模式 ---
    // 加载打包后的文件
    // 注意：这里的 __dirname 使用的是我们在上面第 3 步手动定义的那个
    win.loadFile(path.join(__dirname, '../dist/index.html'))
    // [Debug] 强制在生产环境打开控制台，以便查错
    win.webContents.openDevTools()
  }
}

// app 准备好后创建窗口
app.whenReady().then(createWindow)