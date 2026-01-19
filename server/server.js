require('dotenv').config()//读取环境变量
const express = require('express')
const cors = require('cors')
const connectDB = require('./config/db') //引入数据库连接
const app = express() //创建APP
const userRoutes = require('./routes/user')//引入路由
const chatRouter = require('./routes/chat')
const gmrouter = require('./routes/gm')
const roomrouter = require('./routes/room')
// --- 新增部分 Start ---
const http = require('http');
const { Server } = require("socket.io");
const chatSocket = require("./sockets/chat"); // 引入刚才写的文件
const roomSocket = require("./sockets/room")
const server = http.createServer(app); // 用 http 包装 app
const io = new Server(server, {
  cors: {
    origin: "*" // 允许跨域
  }
});
io.on("connection", (socket) => {
  // 把 socket 逻辑交给 chat.js 处理
  // 注意：chat.js 和 room.js 导出的函数接收参数顺序是 (socket, io)
  chatSocket(socket, io);
  roomSocket(socket, io)
});
// --- 新增部分 End ---




connectDB()//连接数据库
// 4. 配置中间件
app.use(cors())
app.use(express.json())// 允许服务器读懂 JSON 格式的请求
app.use('/user', userRoutes)//挂载路由，访问路径变成 /user/login
app.use('/chat', chatRouter)
app.use('/api', gmrouter)
app.use('/room', roomrouter)
// 5. 写一个简单的接口测试一下
app.get('/', (req, res) => {
  res.send('你好！CCB 后端服务器正在运行！')
})

const PORT = process.env.PORT || 3000
// app.listen(PORT, () => {
//   console.log(`🚀 服务器已启动，监听端口: ${PORT}`);
// })


server.listen(3000, () => {
  console.log("Server is running on port 3000");
});