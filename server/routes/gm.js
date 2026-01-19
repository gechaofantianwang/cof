require('dotenv').config();
const express = require('express');
const router = express.Router();
const auth = require("../middlewares/auth");

// 1. 引入 Google Gemini 官方 SDK
const { GoogleGenerativeAI } = require("@google/generative-ai");
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
if (!GEMINI_API_KEY) {
  console.log("没有apikey");

}

// 2. 初始化 Gemini 客户端
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
// 修改路由路径名称（可选，为了对应功能）
router.post('/gemini-chat', auth, async (req, res) => {
  const userQuestion = req.body.question
  const user = req.user.username
  if (!userQuestion) {
    return res.status(400).json({ error: "请求体缺少问题" })
  }
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: '服务器配置错误：Gemini API Key 未设置' });
  }

  try {
    // 3. 配置模型和系统指令 (System Instruction)
    // Gemini 1.5 系列支持直接通过 systemInstruction 参数设置人设
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: `
                你是一个AI智能小助手，请用简短的中文回答用户的问题。
                请注意以下几点：
                1. 当前项目叫做“CCB聊天软件”，作者名字是“石培臻”。
                2. 当别人问起作者相关消息时，你给他推荐GitHub链接：https://github.com。
                3. 你最喜欢玩英雄联盟，尤其是剑魔狗和铁男狗”。
                4. 如果别人不提及当前项目的话，请你不要随意重复上述内容！
                5. 当前访问项目的用户是${user}
            `
    });

    // 4. 生成内容
    const result = await model.generateContent(userQuestion);
    const response = await result.response;
    const aiAnswer = response.text();

    res.json({ answer: aiAnswer });

  } catch (error) {
    console.error('调用 Gemini API 失败:', error);
    // Gemini 的错误对象结构可能不同，简单打印 error 即可
    res.status(500).json({ error: '从 AI 获取响应失败' });
  }
})

module.exports = router;