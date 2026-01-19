const mongoose = require('mongoose');
const connectDB = async () => {
  try {
    const mongoUrl = process.env.MONGO_URL
    if (!mongoUrl) {
      console.log("错误：MONGO_URL环境变量未设置");
      process.exit(1)//强制终止程序
    }

    await mongoose.connect(mongoUrl)
    console.log('MongoDB 连接成功!');
  } catch (err) {
    console.error("MongoDB连接失败", err);
    process.exit(1)

  }
}
module.exports = connectDB //导出连接函数