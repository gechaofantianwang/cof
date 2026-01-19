const express = require('express')
const router = express.Router()
const Msg = require('../models/Message')
const auth = require('../middlewares/auth')

// === 接口 1: 获取与某个好友的“最后一条消息” ===
// 场景：好友列表显示时，通常会在头像旁边显示“最近一条消息”预览
// 路径: GET /last_message/好友ID
router.get("/last_message/:id", auth, async (req, res) => {
  const myId = req.user.uid
  const targetId = req.params.id
  try {
    // === 核心查询逻辑 ===
    // 我们需要找的是“我和他”之间的消息，无论谁发给谁
    const messages = await Msg.find({
      $or: [
        // 情况 A: 我发给他的
        { from: myId, to: targetId },
        // 情况 B: 他发给我的
        { from: targetId, to: myId }
      ]
    })
      .sort({ time: -1 })

    // 只返回数组的第 1 项 (也就是最新的那条)
    // 注意：如果一条记录都没有，messages[0] 会是 undefined，前端需要处理这种情况
    res.json(messages[0])
  } catch (err) {
    res.status(401).json({ messages: "获取失败" })
  }
})

// === 接口 2: 获取与某个好友的“完整聊天记录” ===
// 场景：点开聊天窗口时，加载历史消息
// 路径: GET /messages/好友ID
router.get("/messages/:id", auth, async (req, res) => {
  const myId = req.user.uid
  const targetId = req.params.id
  const sinceTime = req.query.since  // 新增：从查询参数获取时间戳
  try {
    const query = {
      $or: [
        { from: myId, to: targetId },
        { from: targetId, to: myId }
      ]
    }

    // 新增：如果提供了 since 参数，添加时间过滤条件
    if (sinceTime) {
      query.createdAt = { $gt: new Date(sinceTime) }
    }

    const messages = await Msg.find(query).sort({ time: 1 })
    res.json(messages)

  } catch (err) {
    res.status(401).json({ messages: "消息获取失败" })
  }
})

// === 接口 3: 发送消息 (HTTP 方式) ===
// 场景：用户输入文字点击发送
// 注意：如果你使用了 Socket.io，通常消息是通过 Socket 发送的，这个接口可能用于
// 1. 存粹的 HTTP 降级方案
// 2. 或者 Socket 发送只是为了实时通知，真正的存储还是走这个 HTTP 接口 (看你的架构设计)
// 路径: POST /messages/好友ID
router.post("/messages/:id", auth, async (req, res) => {
  const myId = req.user.uid
  const targetId = req.params.id
  const content = req.body.content
  try {
    // 1. 创建一个新的 Mongoose 文档实例
    const new_mes = new Msg({
      from: myId,
      to: targetId,
      time: Date.now(), // 记录当前服务器时间戳
      content: content
    })
    await new_mes.save()
    res.send("信息发送成功")
  } catch (err) {
    res.status(500).json({ messages: "发送失败" })
  }
})
module.exports = router