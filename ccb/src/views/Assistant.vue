<template>
  <div class="box">
    <div class="main">
      <div class="top">
        <h3>AI智能小助手</h3>
        <button class="off" @click="offmessage">✖</button>
      </div>
      <div class="middle" ref="messageList">
        <ul>
          <li class="message" v-for="(message,index) in messages" :key="index">
            <div class="avatar" v-if="message.from === 'AI'"><img src="/images/gemini-color.png" alt="AI头像"></div>
            <div class="text" :class="{me:message.from ==='user'}">
              <div class="content">
                {{ message.content }}
              </div>
            </div>
          </li>
          <div class="message" v-if="isLoading">
            <div class="avatar"><img src="/images/gemini-color.png" alt="AI头像"></div>
            <div class="text">
              <div class="content loading-dots">
                <span>.</span><span>.</span><span>.</span>
              </div>
            </div>
          </div>
        </ul>
      </div>
      <div class="bottom">
        <div v-if="showPicker" class="emoji-picker-container">
          <emoji-picker id="emoji-picker-instance" class="absolute bottom-full right-0 mb-2"></emoji-picker>
        </div>
        <div class="send">
          <button @click="send" :class="{active:new_message.trim().length>0}" :disabled="isLoading"> 问gemini问题</button>
        </div>
         <textarea name="content" id="content" v-model="new_message" @keyup.enter="send" :disabled="isLoading"></textarea>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted, watch, warn } from 'vue'
import axios from 'axios'
const messages = ref([
  {from:"AI",content:"你好，我是你的ai小助手，请询问我任何问题"}
])
const messageList = ref(null)
const new_message = ref("")

const showPicker = ref(false)
const isLoading = ref(false)
const aiAvatar = "/images/gemini-color.png"
// --- 核心业务逻辑 ---

// 发送消息的方法
async function send(e) {
  e.preventDefault()
  if(isLoading.value)return
  const content = new_message.value.trim()
  if(!content){
    console.warn("输入内容不能为空");
    
    return
  }
  // 1. 立即将【用户】的消息推入列表并显示
    messages.value.push({ from: "user", content: content, time: new Date().toLocaleString() })
    new_message.value = '' // 清空输入框
    scrollToBottom()       // 滚动到底部

    // 2. 开启加载状态
    isLoading.value = true;
    scrollToBottom(); // 再次滚动，确保看到加载动画
  try{
    const token = localStorage.getItem('token')
    const res = await axios.post(`${import.meta.env.VITE_BASE_URL}/api/gemini-chat`,
      {
        question:content
      },
      {
        headers:{
          Authorization:`Bearer ${token}`
        }
      })
      const aires = res.data.answer
      messages.value.push({from:"AI",content:aires,time: new Date().toDateString})
  }catch(err){
    console.error(error)
    messages.value.push({ from: "AI", content: "抱歉，AI小助手正在打三国杀，没空回答你的问题，请稍后再试。", time: new Date().toDateString })
    
  }finally{
    isLoading.value = false
    scrollToBottom()
  }
}
// 如果不加 nextTick滚动条确实滚到底部了，但此时“底部”是旧
// 消息的底部。等 Vue 把新消息渲染出来后，新消息会出现在可视区域的下方，用户还是看不到，必须手动再滚一下。
// 加了 nextTick 的效果： nextTick 的意思就是：“等 Vue 把刚才的数据变化应
// 用到 DOM 上，页面渲染更新完毕后，再执行回调函数里的代码”。 这样就保证了我们在计算高度时，新消息已经在页面上了。
function scrollToBottom(){
  nextTick(()=>{
    const el = messageList.value
    if(el){
      el.scrollTop=el.scrollHeight
    }
  })
}

onMounted(()=>{
  scrollToBottom()
})
const emit = defineEmits(['closemessage'])
function offmessage(){
    emit('closemessage')
}
// --- 表情选择器逻辑 ---
// 这里处理的是自定义 Web Component 的事件绑定

let pickerElement = null; 
let boundAddEmoji = null;

// 切换表情面板显示/隐藏
function showpicker(){
    showPicker.value = !showPicker.value
}

// 添加表情的回调函数
function addEmoji(event) {
    // 将选中的表情 unicode 添加到输入框
    new_message.value += event.detail.emoji.unicode;
    showPicker.value = false; // 选完自动关闭
}
// 监听 showPicker 变化，动态绑定/解绑事件
watch(showPicker, (newValue) => {
    if (newValue) {
        // 当面板打开时
        nextTick(() => {
            pickerElement = document.getElementById('emoji-picker-instance');
            if (pickerElement) {
                boundAddEmoji = addEmoji;
                // 手动添加 'emoji-click' 事件监听
                pickerElement.addEventListener('emoji-click', boundAddEmoji);
                console.log('Emoji picker event listener attached via watch.');
            } else {
                console.warn('Emoji picker element still not found after nextTick.');
            }
        });
    } else {
        // 当面板关闭时，移除监听器以防内存泄漏
        if (pickerElement && boundAddEmoji) {
            pickerElement.removeEventListener('emoji-click', boundAddEmoji);
            console.log('Emoji picker event listener removed via watch.');
            pickerElement = null;
            boundAddEmoji = null;
        }
    }
});
</script>
<style scoped>
.box{
    width: 96%;
    height: 92%;
    padding: 4% 2%;
    padding-top: 2%;
}

.main{
    width: 100%;
    height: 100%;
    border: none;
    border-radius: 1rem;
    background-color: rgba(128,128,128,.1);
    box-shadow: 0 0 5px 2px rgba(0,0,0,.1);
    display: flex;
    flex-direction: column;
}
.top{
    border-top-left-radius: 1rem;
    border-top-right-radius: 1rem;
    flex: 1;
    display: flex;
    align-items: center;
    box-shadow: 0 1px 1px 0px rgba(0,0,0,.1);
    padding-left: 1vw;
    font-size: larger;
    font-weight: bolder;
    position: relative;
}
.top button{
    height: 45px;
    width: 45px;
    border: none;
    cursor: pointer;
    font-size: larger;
    background-color: transparent;
    -webkit-app-region: no-drag
}
.off{
    position: absolute;
    right: 0;
    border-radius: 50%;
    background-color: transparent;
}
.off:hover{
    background-color: rgba(128,128,128,.1)
}
.middle{
    border-radius: 1rem;
    flex: 8;
    overflow-y: scroll;
    overflow-x: hidden;
    -webkit-app-region: no-drag
}
*:focus{
    border: none;
    outline: none;
}
ul{
    height: 100%;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
}
li{
    flex: 0 0 auto;
    padding-top: 1vh;
    padding-left: 1vw;
    list-style-type: none;
}
.message{
    display: flex;
    flex-direction: row;
    align-items: flex-end;
    padding-bottom: 10px;
}
.avatar{
    flex: 1;
    max-width: 40px;
    aspect-ratio: 1/1;
    border-radius: 50%;
    overflow: hidden;
}
.avatar img{
    width: 100%;
    aspect-ratio: 1/1;
    object-fit: cover;
}
.text{
    height: 100%;
    position: relative;
    flex: 9;
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
}
.text.me{
    align-items: flex-end;
}
.text.me .content{
    border-radius: 1rem 1rem 0.3rem 1rem;
    margin-right: 10px;
    background-color: rgba(165, 42, 42,.8);
    color: white;
}
.content {
    display: inline-block;
    background-color: #f9f9f9;
    color: #333;
    padding: 0.6rem 1rem;
    margin: 0.4rem 1vw;
    border-radius: 1rem 1rem 1rem 0.3rem;
    width: fit-content;
    max-width: 70%;
    word-wrap: break-word;
    word-break: break-word;

    font-size: 17px;
    line-height: 1.4;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}
.triangle{
    background-color: transparent;
    width: 0;
    height: 0;
    position: absolute;
    border-top: 20px solid transparent;
    border-bottom: 30px solid #f9f9f9;
    border-left: 20px solid transparent;
    border-right: 20px solid transparent;
    bottom: 0;
    left: 5px;
    color: transparent;
}

.bottom{
    box-shadow: 0 0 2px 1px rgba(0,0,0,.1);
    border-radius: 1rem 1rem 0 1rem;
    flex: 2;
    width: 96%;
    margin: 0 2% 2% 2%;
    background-color: #f9f9f9;
    max-height: 15vh;
    position: relative;
    -webkit-app-region: no-drag
}
.send{
    position: absolute;
    bottom: -25px;
    width: 100%;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    -webkit-app-region: no-drag
}
.send button{
    height: 30px;
    width: 100%;
    border-radius: 10px;
    border: none;
    box-shadow: 0 0 2px 1px rgba(0,0,0,.1);
    background-color: #f9f9f9;
    cursor: pointer;
}

.send button:last-of-type{
    display: none;
    aspect-ratio: 2/1;
    background-color: rgba(165, 42, 42,.8);
    color: white;
}

.send button.active{
    display: block;
}

.bottom textarea{
    height: 90%;
    width: 96%;
    padding: 10px 2% 0 2%;
    border: none;
    outline: none;
    resize: none;
    border-radius: 1rem 1rem 0 1rem;
    font-size: 1rem;
    font-weight: normal;
}
.emoji-picker-container{
    position: absolute;
    bottom: 0;
    right: 0;
}

.chat-image-preview {
    max-width: 150px;
    max-height: 150px;
    border-radius: 8px;
    cursor: pointer;
    display: block;
    margin-top: 5px;
}
.file-link {
    display: flex;
    align-items: center;
    gap: 5px;
    color: #4a90e2;
    text-decoration: underline;
    font-weight: bold;
}
.file-message {
    padding: 0;
    margin: 0;
}

.loading-dots {
    display: inline-block;
}

.loading-dots span {
    opacity: 0;
    animation: blink 1s infinite;
}

.loading-dots span:nth-child(1) {
    animation-delay: 0s;
}

.loading-dots span:nth-child(2) {
    animation-delay: 0.33s;
}

.loading-dots span:nth-child(3) {
    animation-delay: 0.66s;
}

@keyframes blink {
    0%, 100% {
        opacity: 0;
    }
    50% {
        opacity: 1;
    }
}
</style>