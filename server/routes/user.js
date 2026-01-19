const express = require('express')
const jwt = require('jsonwebtoken')
// 创建一个路由容器。
// 我们可以把这看作一个“子应用”，最后把它挂载到主应用（app.js）的某个路径下（比如 /api/users）
const router = express.Router()
const bcrypt = require('bcrypt')
const Users = require("../models/User")
const User = require('../models/User')
const auth = require('../middlewares/auth')

const SECRET_KEY = 'MySecretKey123'

router.post("/register", async (req, res) => {
  const { username, password } = req.body
  try {
    // 去数据库查询：是否存在 uName 等于 username 的用户
    // await 表示“等待数据库查询结果出来再往下走”
    const oldUser = await Users.findOne({ uName: username })
    if (oldUser) return res.status(409).json({ message: "用户已存在" })
    // 参数 10 是“盐值轮数” (salt rounds)，数字越大越安全但也越慢，10 是个常用推荐值。
    // 结果 hashedPassword 是一串像乱码一样的长字符串（不可逆）。
    const hashedPassword = await bcrypt.hash(password, 10)
    // 实例化 Users 模型，准备一条新数据
    const newUser = new Users({
      uID: Date.now().toString(),
      uName: username,
      Password: hashedPassword
    })
    //调用save方法把数据写入mongoDB，
    //这个save方法是mongoDB自带的内置方法，能用是因为newUser是通过User模型创建的，User模型定义时由mongoose赋能
    await newUser.save()
    res.status(200).json({ message: '注册成功' })
  } catch (err) {
    console.log(err);

    res.status(500).json({ message: "服务器出错" })
  }
})

router.post('/login', async (req, res) => {
  const { username, password } = req.body
  try {
    const user = await User.findOne({ uName: username })
    if (!user) return res.status(401).json({ message: "用户不存在" })
    //user是上一步在数据库中找到后赋的值，user就是那个用户对象
    const ismatch = await bcrypt.compare(password, user.Password)
    if (!ismatch) return res.status(401).json({ message: "密码错误" })
    const token = jwt.sign(
      { uid: user.uID, username: user.uName, },
      SECRET_KEY,
      { expiresIn: '1d' }//1天过期
    )
    res.json({ token, message: "登录成功" })
  } catch (err) {
    res.status(500).json({ message: "登录成功" })
  }

})
// === 新增接口 1: 获取当前登录用户信息 ===
router.get("/info", auth, async (req, res) => {
  try {
    const myId = req.user.uid
    const user = await Users.findOne({ uID: myId });
    res.json({ id: user.uID, name: user.uName, ava: user.uAvatar });
  } catch (err) {
    console.error("获取个人信息失败", err);
    res.status(500).json({ message: "获取信息失败" })

  }
})


// === 新增接口 2: 获取好友列表 (带详情) ===
router.get("/friends", auth, async (req, res) => {
  try {
    const myId = req.user.uid
    console.log(`[GetFriends] 正在查询用户 ID: ${myId}`);

    const user = await Users.findOne({ uID: myId })
    if (!user) {
      console.error(`[GetFriends] 用户未找到: ${myId}`);
      return res.status(404).json({ message: "用户不存在" })
    }

    const friends = user.Friends || []
    // Promise.all 配合 map 可以同时并发查询所有好友的数据，效率比用 for 循环一个一个查要高
    const friend_list = await Promise.all(
      friends.map(async (friend) => {
        const fri = await Users.findOne({ uID: friend.uID })
        // 容错处理：如果这个好友账号被注销或删除了，fri 会是 null
        if (!fri) return null
        return {
          id: fri.uID,
          name: fri.uName,
          avatar: fri.uAvatar
        }
      })
    )
    res.json(friend_list.filter(f => f !== null))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// === 接口 3: 添加好友 (双向添加) ===
// 访问路径: POST /add

router.post("/add", auth, async (req, res) => {
  try {
    const targetName = req.body.content
    const myId = req.user.uid
    const targetUser = await Users.findOne({ uName: targetName })
    if (!targetUser) {
      return res.status(404).json({ message: "用户不存在" })

    }
    if (targetUser.uID === myId) {
      return res.status(400).json({ message: "不能添加自己" })
    }
    // $addToSet 是 MongoDB 的操作符，非常关键！
    // 它的作用是：只有当数组里没有这个 ID 时才添加。防止了重复添加同一个好友。
    await Users.findOneAndUpdate(
      { uID: myId },
      { $addToSet: { Friends: { uID: targetUser.uID } } }
    )
    res.json({ message: "好友添加成功" })
  } catch (err) {
    res.status(500).json({ message: "添加失败" })
  }
})
// === 接口 4: 根据 ID 获取好友头像 ===
// 访问路径: GET /friend_avatar/12345
// 这里的 :id 是路径参数，对应 req.params.id
router.get("/friend_avatar/:id", async (req, res) => {
  try {
    // 直接根据 URL 传来的 ID 查询头像
    const user = await Users.findOne({ uID: req.params.id });

    // 三元运算符：如果找到 user 就返回头像，找不到返回空字符串
    res.json({ ava: user ? user.uAvatar : '' });
  } catch (err) {
    // 这里的容错比较简单，出错也不报错，直接返回空头像，防止前端图片裂开
    res.json({ ava: '' });
  }
});


module.exports = router