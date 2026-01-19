const express = require("express")
const router = express.Router()
const auth = require("../middlewares/auth")
const Room = require("../models/Room")
/**
 * 路由 1：创建房间
 * 请求方法：POST
 * 路径：/create/:roomID
 * 中间件：auth (只有登录用户能开房)
 */
router.post("/create/:roomID", auth, async (req, res) => {
  const id = req.params.roomID  // 从 URL 路径中获取 roomID
  const name = req.body.roomname  // 从请求体中获取房间名
  const user = req.user   // auth 中间件注入的用户信息（包含 uid）
  try {
    // 实例化一个新的房间文档
    const new_room = new Room({
      RoomID: id,
      RoomName: name,
      Members: [{
        Nickname: "房主", // 默认第一个成员是房主
        Avatar: "/images/ava.jpg",
        userID: user.uid
      }]
    })
    await new_room.save()
    res.json({ message: `成功创建房间${name}` })
  } catch (err) {
    console.error(err)
    // 如果 RoomID 重复（Schema中设置了unique），会进入 catch
    res.status(500).json({ message: "创建房间失败", error: err.message })
  }
})


/**
 * 路由 2：获取所有活跃房间列表
 * 请求方法：GET
 */
router.get("/getrooms", auth, async (req, res) => {
  const uname = req.user.username
  const rooms = await Room.find()
  res.json({ roomLists: rooms, uname })
})
/**
 * 路由 3：检查房间状态（是否满员）
 * 请求方法：GET
 * 注意：此路由通常在前端跳转房间前调用，作为拦截逻辑
 */

router.get("/check/:roomID", async (req, res) => {
  const roomID = req.params.roomID
  const room = await Room.findById(roomID)
  if (!room) return res.status(404).json({ success: false, message: "房间不存在" })
  if (room.Members.length >= 9) {
    return res.json({ success: false, message: "当前房间已满员" })
  }
  return res.json({ success: true, message: "当前房间可进入" })
})

module.exports = router

