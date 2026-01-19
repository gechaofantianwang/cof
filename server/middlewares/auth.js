const jwt = require("jsonwebtoken")

function authMiddlewares(req, res, next) {
  // 前端通常把 Token 放在请求头里，格式是："Authorization: Bearer <你的Token>"
  // .split(' ') 是为了把 "Bearer" 和 "Token" 分开
  // [1] 是为了拿空格后面的那串真正的 Token 字符串
  // ?. (可选链) 是为了防止没有 authorization 头时程序报错崩溃
  const token = req.headers.authorization?.split(' ')[1]

  if (!token) {
    return res.status(401).json({ message: "未提供token" })
  }
  try {

    const decoded = jwt.verify(token, "MySecretKey123")
    // 代码能走到这里，说明 Token 是真的。
    // decoded 就是你当初登录时存进去的数据 (比如 { uid: 'u123', uName: '老王' })
    // 我们把它赋值给 req.user，这样后面的路由（比如 /info, /add）就能直接用 req.user 拿到当前用户是谁了
    req.user = decoded
    //让express中间件继续向下走
    next()
  } catch (err) {
    console.error(err);

    return res.status(401).json({ message: "Token无效或已过期" })
  }
}
module.exports = authMiddlewares