const { Socket } = require("socket.io");
const Room = require("../models/Room")
module.exports = function (socket, io) {
  // 1. 初始化常量和内存状态
  // 预设的头像数组，按座位顺序分配
  const avatars = ["🐔", "🐱", "🐮", "🐶", "🐹", "🐵", "🦊", "🐸"];
  // 创建一个长度为 8 的座位数组，模拟房间里的位置
  // 每个座位默认是空的（🪑）
  const seats = Array.from({ length: 8 }, () => ({
    username: null,
    useravatar: "🪑",
    userID: null,
  }));
  // 2. 内部工具函数：用户加入逻辑
  function userEnter(username) {
    // 寻找第一个 username 为 null 的空位
    const index = seats.findIndex(seat => seat.username === null)
    if (index !== -1) {
      // 坐下：将用户信息填入对应的座位索引
      seats[index].username = username
      seats[index].useravatar = avatars[index]; // 自动分配对应的动物头像
      seats[index].userID = socket.id;          // 记录 Socket ID 以便后续退出时查找
      console.log(`用户 [${username}] 加入房间，占用座位 [${index}]`);

      // 全局广播最新的座位状态，让所有人看到座位更新
      io.emit("update", seats)
    } else {
      socket.emit("Full")
    }
  }

  // 3. 内部工具函数：用户退出逻辑
  function userExit() {
    const index = seats.findIndex(seat => seat.userID === socket.id)
    if (index !== -1) {
      const username = seats[index].username;
      // 重置该位置的信息（变回空椅子）
      seats[index] = { username: null, useravatar: "🪑", userID: null };
      console.log(`🚪 用户 [${username}] 离开房间，释放座位 [${index}]`);

      // 再次广播最新的座位状态
      io.emit("update", seats);
    }
  }


  // 4. 事件监听：用户加入房间

  socket.on("joinroom", ({ room, username }) => {
    // 将房间号和用户名存入当前 socket 实例的 data 属性中，方便后续调用
    socket.data.room = room
    socket.data.username = username
    console.log(`用户 [${username}] 请求加入房间 [${room}]`)
    userEnter(username)// 执行座位分配逻辑
    socket.join(room);   // Socket.io 原生的“分房间”功能，让消息只在该房间传播

    // 通知房间内的其他人，有人进来了
    io.to(room).emit("notice", `用户 ${username} 进入房间`);
  })

  // 5. 事件监听：群聊消息
  socket.on("group-message", (msg, uname) => {
    // 只向该用户所在的房间广播消息
    io.to(socket.data.room).emit("group-message", { msg, uname })
  })

  // 6. 事件监听：连接断开（最关键的清理逻辑）
  socket.on("disconnect", async () => {
    userExit()
    // 发送退出通知
    io.to(socket.data.room).emit("notice", `用户 ${socket.data.username} 离开房间`)
    const roomID = socket.data.room
    // 获取当前房间里还剩下多少个 Socket 连接
    const room = io.sockets.adapter.rooms.get(roomID)
    const roomSize = room ? room.size : 0
    console.log(`房间 [${roomID}] 当前人数: ${roomSize}`);

    // 7. 自动销毁机制：如果房间没人了，删除数据库中的记录
    if (roomSize === 0) {
      console.log(`房间 [${roomID}] 无人在线，准备删除数据库房间数据`);

      try {
        // 注意：这里的字段名 roomID 要与你 Schema 中定义的一致（之前代码里是 RoomID）
        await Room.deleteOne({ roomID: roomID });
        console.log(`房间 [${roomID}] 已成功从数据库删除`);
      } catch (err) {
        console.error("删除房间失败：", err);
      }
    }
  })
}