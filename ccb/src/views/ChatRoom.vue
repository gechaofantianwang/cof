<template>
  <div class="container">
    
    <div class="top">
      <div class="left">
        <div class="roomname">{{ roomName }}</div>
        <div class="roomnum">房间号：<strong>{{ roomID }}</strong></div>
      </div>
      <div class="right">
        <div class="counts">999+<strong>Online</strong></div>
        <div class="return" @click="back">✖</div>
      </div>
    </div>

    <div class="middle">
      
      <div class="users">
        <div class="host">
          <div class="avatar">
            <img src="/images/ava.jpg" alt="图片" />
          </div>
          <div class="avatar-name">{{ uname }}</div>
        </div>

        <div class="audiences">
          <div class="audience" v-for="(seat, index) in seats" :key="index">
            <div class="seat">
              <div class="seat-logo">{{ seat.useravatar }}</div>
              <div class="seat-number">
                {{ seat.username ? seat.username : `${index + 1}号位` }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="chats">
        <div class="notice">
          <div class="notice-content">
            欢迎来到 <span>{{ roomName }}</span> 聊天室，请遵循社区基本规则，不要以身试险，祝您愉快!
          </div>
        </div>
        <div class="board">
          <div class="board-content" ref="log">
            <ul>
              <li v-for="(message, index) in messages" :key="index">
                {{ message.role ? message.role : "游客" }}：{{ message.content }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showPicker" class="emoji-picker-container relative">
      <emoji-picker id="emoji-picker-instance" class="absolute bottom-full right-0 mb-2"></emoji-picker>
    </div>

    <div class="input-area">
      <input type="text" id="chat-input" v-model="msg" @keydown.enter="sendMsg" autocomplete="off" />
      
      <input type="button" value="😊" id="emoji-btn" class="send-button" @click="showpicker"/>
      
      <input type="button" value="发送" class="send-button" id="send-button" @click="sendMsg" />
    </div>
  </div>
</template>


<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue';
import { socket, waitForSocketConnection } from '../../utils/socket';
import { useRoute, useRouter } from 'vue-router';
// 初始化路由
const route = useRoute();
const router = useRouter();
// 从 URL 的查询参数 (?name=xx&id=xx) 中获取房间信息和用户信
const roomName = ref(route.query.name)
const roomID = ref(route.query.id)
const roomNum = ref(0); // 房间人数
const uname = ref(route.query.uname); // 当前用户名

const msg = ref("") // 输入框的消息内容
const messages = ref([]) // 存储聊天记录的数组
const log = ref(null); // 对应 template 中的 <div ref="log">，用于控制滚动条
const showPicker = ref(false) // 控制表情面板是否显示

// 初始化座位数组：长度8，默认都是空座位(username: null)
const seats = ref(Array.from({ length: 8 }, () => ({ username: null, useravatar: "🪑" })));
// 变量用于存储表情选择器的 DOM 元素和事件监听函数引用（用于后续销毁）
let pickerElement = null; 
let boundAddEmoji = null;
// 1. 添加表情逻辑
function addEmoji(event) {
  // event.detail.emoji.unicode 是第三方库返回的表情字符
  msg.value += event.detail.emoji.unicode; // 将表情追加到输入框
  showPicker.value = false; // 选完后关闭面板
}


function back(){
  router.back()
}
// 3. 发送消息逻辑
function sendMsg(){
  if(!msg.value.trim()){
    alert('消息不能为空')
    return
  }
  // 通过 Socket 发送 'group-message' 事件给服务器
  socket.emit("group-message",msg.value,uname.value)
  console.log("消息发送至：",socket.id)
  msg.value = ""
}

// 4. 切换表情面板显示
function showpicker(){
  showPicker.value = !showPicker.value
}


// 5. 核心：设置 Socket 事件监听器
function setupSocketListeners(){
  // 【重要防抖步骤】
  // 在绑定新的监听器之前，强制清理一遍旧的监听器。
  // 为什么要这么做？
  // 1. Vue 开发中，热重载（HMR）或路由快速切换时，组件可能会被重新挂载。
  // 2. 如果不清理，Socket.io 会累积绑定同一个事件（例如收到一条消息，触发了5次 console.log）。
  cleanupSocketListeners()
  // 【连接状态检查】
  // socket.connected 是 Socket.io 客户端自带的一个布尔值属性。
  if(socket.connected){
    // 场景 A：如果 socket 已经连接上了（比如从大厅页跳转过来，连接一直保持着）
    // 直接发送 "joinroom" 事件，告诉服务器我要进房
    socket.emit("joinroom",{room:roomID.value,username:uname.value})
  }else{
    // 场景 B：如果 socket 还没连上（比如用户直接刷新了当前页面）
    // 必须监听 "connect" 事件，确保连接成功建立后的那一瞬间，再发送进房请求。
    socket.connect(); // [新增] 手动发起连接
    socket.on("connect",()=>{
      socket.emit("joinroom",{room:roomID.value,username:uname.value})
    })
  }
  // 【接收群聊消息】
  // 当服务器广播 "group-message" 事件时触发
  socket.on("group-message",({msg,uname:sender})=>{
    // 1. 更新数据：将新消息推入 messages 数组，Vue 会自动更新列表渲染
    messages.value.push({ role: sender, content: msg })
    // 2. 自动滚动到底部
    // nextTick 是 Vue 的核心 API。
    // 原因：执行完上面的 push 后，DOM 并不会立即更新（Vue 是异步更新 DOM 的）。
    // 如果直接设置 scrollTop，此时新消息的 DOM 还没渲染出来，滚动条位置会不准确。
    nextTick(() => {
      if (log.value) { // 确保获取到了聊天框的 DOM 元素
        // 将滚动条位置设置为滚动高度（即最底部）
        log.value.scrollTop = log.value.scrollHeight;
      }
    });
  })

  socket.on("update",(newSeats)=>{
    seats.value = newSeats// 直接覆盖前端的座位数据
    // 计算在线人数：过滤掉 username 为 null (空椅子) 的座位，统计长度
    roomNum.value = newSeats.filter(seat=>seat.username !==null).length
  })


  // 【接收系统通知】
  // 例如：“用户 xxx 加入了房间”
  socket.on("notice", (content) => {
    // 将通知封装成一条消息，role 设为 "系统通知"，以便前端样式区分显示
    messages.value.push({ role: "系统通知", content });
    // 同样需要自动滚动到底部
    nextTick(() => {
      if (log.value) {
        log.value.scrollTop = log.value.scrollHeight;
      }
    });
  });


  socket.on("Full",()=>{
    console.warn("当前房间已满");
    router.back(); // 调用路由的返回方法，把用户踢回上一页（大厅）
  })



}


// 6. 清理 Socket 和 DOM 事件监听器
function cleanupSocketListeners() {
  // 【解绑 Socket 事件】
  // socket.off(eventName) 用于移除指定事件的监听器。
  // 必须与 setupSocketListeners 里的事件名一一对应。
  // 如果不移除，当用户离开组件（销毁）后，后台的 Socket 依然在监听，会导致内存泄漏和报错。
  socket.off("connect");
  socket.off("group-message");
  socket.off("update");
  socket.off("notice");
  socket.off("Full");

  // 【清理 DOM 事件监听】
  // 这是为了处理那个 emoji-picker 自定义组件。
  // 因为它是通过 addEventListener 手动绑定的原生事件，Vue 不会自动帮我们解绑，必须手动 remove。
  if (pickerElement && boundAddEmoji) {
    pickerElement.removeEventListener('emoji-click', boundAddEmoji);
    console.log('Emoji picker event listener removed during component cleanup.');
    pickerElement = null; // 释放 DOM 引用，帮助垃圾回收
    boundAddEmoji = null; // 释放函数引用
  }
}
// --- 侦听器 Watch ---
// 专门处理 emoji-picker 的事件绑定
// 因为 <emoji-picker> 是一个 Web Component（自定义元素），
// Vue 的模板绑定语法 @emoji-click="xxx" 在某些版本的 Vue 或特定 Web Component 库中可能无法生效，
// 或者我们需要精确控制其绑定时机，所以采用了手动 DOM 监听的方式。
watch(showPicker, (newValue) => {
  if (newValue) {
    // 场景：用户点击了笑脸按钮，showPicker 变为 true
    
    // 使用 nextTick，因为 showPicker 刚变 true，v-if 控制的元素还没真正渲染到页面上。
    // 必须等待 Vue 完成 DOM 插入操作。
    nextTick(() => {
      // 通过 ID 获取原生的 DOM 元素
      pickerElement = document.getElementById('emoji-picker-instance');
      
      if (pickerElement) {
        // 保存函数引用，为了稍后 removeEventListener 时能找到同一个函数
        boundAddEmoji = addEmoji;
        
        // 手动添加原生事件监听 'emoji-click'（这是 emoji-picker 库特有的事件）
        pickerElement.addEventListener('emoji-click', boundAddEmoji);
        console.log('Emoji picker event listener attached via watch.');
      } else {
        console.warn('Emoji picker element still not found after nextTick.');
      }
    });
  } else {
    // 场景：用户关闭了表情面板，showPicker 变为 false
    // 元素即将被销毁（因为 v-if），但在销毁前，最好手动移除监听器是个好习惯
    if (pickerElement && boundAddEmoji) {
      pickerElement.removeEventListener('emoji-click', boundAddEmoji);
      console.log('Emoji picker event listener removed via watch.');
      pickerElement = null;
      boundAddEmoji = null;
    }
  }
});

// --- 生命周期 ---

// 组件挂载完成（页面显示出来了）
onMounted(() => {
  setupSocketListeners(); // 1. 启动监听，开始接收消息
});

// 

// 组件即将销毁（用户点击返回、跳转其他页面）
onBeforeUnmount(() => {
  cleanupSocketListeners(); // 2. 只有在这里彻底清理，才能保证离开房间后不再收到消息
});


</script>


<style scoped>
.container{
        width: 100%;
        background: linear-gradient(rgb(101, 78, 163),rgba(216,194,215));
        height: 100vh;
    }
    .top{
        height: 10vh;
        border: none;
        display: flex;
        justify-content: space-between;
        padding: 5px 10px;
    }
    .right{
        display: flex;
        gap: 10px;
        height: 50%;
    }
    .counts{
        border: none;
        border-radius: 10px;
        padding: 0 5px;
        background-color: rgba(0,0,0,.3);
        display: flex;
        justify-content: center;
        align-items: center;
    }
    .return{
        background-color: rgba(0,0,0,.3);
        border-radius: 50%;
        aspect-ratio: 1/1;
        display: flex;
        justify-content: center;
        align-items: center;
        cursor: pointer;
        transition: all 0.5s ease-in;
    }
    .return:hover{
        transform: scale(1.05);
    }
    .middle{
        height: 80vh;
        overflow: hidden;
        display: flex;
        flex-direction: column;
    }
    .users{
        height: fit-content
    }
    .host{
        /* border: 1px solid black; */
        display: flex;
        justify-content: center;
        align-items: center;
        position: relative;
        margin-bottom: 30px;
    }
    .avatar{
        aspect-ratio: 1/1;
        /* border: 1px solid black; */
        border-radius: 50%;
        overflow: hidden;
    }
    .avatar img{
        object-fit: cover;
        width: 50px;
    }
    .avatar-name{
        position: absolute;
        bottom: 0;
        background-color: aqua;
        font-size: small;
        border-radius: 5px;
        transform: translateY(10px);
        color: white;
        padding: 0 5%;
    }

    .audiences{
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        justify-content: start;
    }
    .audience{
        flex: 0 0 25%;
        box-sizing: border-box;
        /* border: 1px solid black; */
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
    }
    .seat{
        /* padding-top: 5px; */
        width: 50px;
        display: flex;
        flex-direction: column;
        align-items: center;
    }
    .seat-logo{
        flex: 3;
        font-size: 30px;
        width: 100%;
        aspect-ratio: 1/1;
        /* border: 1px solid black; */
        border-radius: 50%;
        background-color: rgba(0,0,0,.3);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
    }
    .seat-number{
        flex: 1;
    }

    .chats{
        height: 100%;
        display: flex;
        flex-direction: column;
        min-height: 0
    }

    .notice{
        /* border: 1px solid white; */
        display: flex;
        justify-content: center;
        padding-top: 10px;
        height: fit-content;
        margin-bottom: 10px;
    }

    .notice-content{
        background-color: rgba(255,255,255,.1);
        box-shadow: 0 0 1px 0px rgba(0,0,0,.3);
        width: 70%;
        padding: 1px;
        font-size: small;
        height: fit-content;
        border-radius: 5px;
        text-align: center;
    }

    .notice-content span{
        color: rgba(255,0,0,.8);
    }

    .board{
        flex: 1;
        display: flex;
        justify-content: center;
        overflow: hidden;
        max-height: 100%;
        min-height: 0;
    }

    .board-content{
        background-color: rgba(255,255,255,.1);
        box-shadow: 0 0 1px 0px rgba(0,0,0,.3);
        width: 90%;
        padding: 1px;
        font-size: small;
        overflow: auto;
        padding: 0 1rem;
        padding-top: 0.5rem;
        border-radius: 5px;
        margin-bottom: 2px;
    }

    .board-content li{
        /* border: 1px solid black; */
        width: fit-content;
        color: white;
        box-shadow: 0 0 5px 1px rgba(0,0,0,.1);
        margin-bottom: 10px;
    }

    .bottom{
        width: 100%;
        position: fixed;
        height: 10vh;
        display: flex;
        flex-direction: row;
        /* border-top: 1px solid black; */
        align-items: center;
        gap: 5px;
        margin-bottom: 10px;
    }
    #chat-input{
        flex: 1;
        height: min(10px,80%);
        border-radius: 30px;
        padding: 1rem;
        /* padding-top: 0.5rem; */
        font-size: 1rem;
        overflow: hidden;
        white-space:nowrap;
        color: black;
        resize: none;
        /* margin-bottom: 10px; */
        margin-left: 10px;
        border: none;
        outline: none;
    }
    /* #picker {
    position: absolute;
    bottom: 75px;
    width: 100%;
    height: 40vh;
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    z-index: 999;
    padding: 10px;
    overflow-y: auto;
    transition: all 0.3s ease;
    } */
    
    .emoji-picker {
        position: absolute;
        bottom: 75px;
        width: 100%;
        height: 40vh;
        z-index: 999;
        background: #fff;
        border-radius: 10px;
        box-shadow: 0 0 10px rgba(0,0,0,0.2);
    }
    .input-area {
        position: relative;
        display: flex;
        align-items: center;
        padding: 10px;
    }
            
    .send-button{
        height: 40px;
        aspect-ratio: 1/1;
        border-radius: 50%;
        border: none;
        cursor: pointer;
    }
    .send-button:last-child{
        color: orange;
    }
    ul{
        list-style-type: none;
    }
    li{
        margin: 0.5rem 0;
    }

    .emoji-picker-container {
    position: absolute;
    bottom: 0;
    right: 0;
    right: 15px;
    z-index: 20;
    width: 100%;
    max-width: 350px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    border-radius: 8px;
    overflow: hidden;
    transform: translateY(-75px);
    }
</style>