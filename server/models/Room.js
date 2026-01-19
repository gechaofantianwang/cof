// 引入 mongoose 插件，它是 Node.js 环境下操作 MongoDB 的对象建模工具
const mongoose = require("mongoose")

// 定义一个名为 roomSchema 的数据架构（Schema）
// Schema 决定了文档（Document）在数据库中存储的结构和规则
const roomSchema = new mongoose.Schema({

    // 房间 ID：
    // type: Number -> 数据类型为数字
    // required: true -> 必填项，不能为空
    // unique: true -> 唯一性，数据库中不允许存在两个相同 ID 的房间
    RoomID: { type: Number, required: true, unique: true },

    // 房间名称：
    // type: String -> 数据类型为字符串
    // required: true -> 必填项
    RoomName: { type: String, required: true },

    // 成员列表：
    // 使用方括号 [] 包裹，表示这是一个对象数组（Array of Objects）
    Members: [{
        Nickname: String, // 成员昵称
        Avatar: String,   // 成员头像的 URL 地址或路径
        userID: String    // 成员在系统中的唯一用户 ID
    }]
})

// 将该 Schema 编译成名为 "Room" 的模型（Model）并导出
// 在数据库中，它会自动对应到一个名为 "rooms" 的集合（Collection）
module.exports = mongoose.model("Room", roomSchema)