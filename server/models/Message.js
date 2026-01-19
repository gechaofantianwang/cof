const mongoose = require("mongoose")
// 2. 定义 Schema (数据结构/蓝图)
const msgSchema = new mongoose.Schema({
  from: String,
  to: String,
  time: Date,
  content: String,
  file: {
    fileUrl: String,
    fileName: String,
    fileType: String
  }
}, {
  timestamps: true
})
// 参数 1: 'Msg' 是你给这个模型起的名字 (首字母大写是惯例)
// 参数 2: msgSchema 是上面定义的结构
module.exports = mongoose.model('Msg', msgSchema)