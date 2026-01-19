require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testGemini() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error("❌ 错误: .env 中没有找到 GEMINI_API_KEY");
    return;
  }

  console.log("⏳ 正在尝试连接 Gemini...");

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    // 先改成 gemini-pro 试试能不能跑通
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = "用一句话解释什么是快乐。";
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log("✅ 测试成功！Gemini 回复：");
    console.log(text);
  } catch (error) {
    console.error("❌ 测试失败，原因如下：");
    console.error(error);
  }
}

testGemini();