const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
  uID: String,
  uName: String,
  Password: String,
  uAvatar: { type: String, default: "" },
  Friends: [{ uID: String }]
})

module.exports = mongoose.model("Users", userSchema)
// mongoose.model() 并不是一个简单的注册函数，它实际上
// 是一个“类构造工厂”。它在内部动态地把你的 Schema（
// 数据结构定义）和 Mongoose 的底层能力（增删改查方法）熔合在了一起。