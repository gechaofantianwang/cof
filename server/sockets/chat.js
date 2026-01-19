// === 全局变量区 ===
// 创建一个 Map 对象，充当"在线用户通讯录"。
// 结构是：Key(用户ID) => Value(Socket连接ID)
// 比如：{ "user_1001" => "AbCdEfGh12345", "user_1002" => "XyZw..." }
// 注意：这个变量放在函数外面，保证所有连接进来的用户共享这一份名单。
const users = new Map()

module.exports = function (socket, io) {
  // === 1. 登录/上线事件 ===
  // 前端连上后，必须发送一个 'login' 事件，告诉后端"我是谁"
  socket.on("login", (userId) => {
    socket.userId = userId
    console.log(`收到登录请求:${userId}`)
    // 步骤 B: 登记造册
    // 将"业务ID"和"连接ID"绑定，存入 users Map
    // 以后只要知道 userId，就能通过这个 Map 查到 socket.id，从而给他发消息
    users.set(userId, socket.id)
  })

  // === 2. 私聊文本消息事件 ===
  // 前端发送消息时，数据包结构解构为 { to }，这里似乎漏了 content (消息内容)
  socket.on("private-message", ({ to }) => {
    const targetId = users.get(to)
    if (targetId) {
      io.to(targetId).emit('private-message', { from: socket.userId })
    }
  })

  // === 3. 私聊文件消息事件 ===
  // 逻辑和上面类似，但是携带了文件的元数据 (URL, 文件名, 类型)
  socket.on("private-file-message", async ({ to, fileUrl, fileName, fileType }) => {
    const targetSocketId = users.get(to)
    if (targetSocketId) {
      // 2. 打印日志方便调试
      console.log(`用户 ${socket.userId} 发送文件: ${fileName} (${fileUrl}) 给用户 ID: ${to}`);

      // 3. 定向转发给目标用户
      io.to(targetSocketId).emit("private-file-message", {
        from: socket.userId, // 告诉接收者是谁发的
        fileUrl,             // 文件的下载/预览地址
        fileName,            // 文件名
        fileType,            // 文件类型 (如 image/png, application/pdf)
      });
    } else {
      // 4. 异常处理：如果你发给的人不在线，或者 Map 里没找到
      console.log(`用户 ${to} 不在线或未登录，无法发送文件消息。`);
      // 这里其实可以扩展：给发送者回发一个事件，告诉他"发送失败，对方不在线"
    }
  })

  socket.on("disconnect", async () => {
    for (const [userId, id] of users) {
      if (id === socket.id) {
        users.delete(userId) // 找到对应的 userId 并删除
        break // 找到了就停止循环
      }
    }
  })
}