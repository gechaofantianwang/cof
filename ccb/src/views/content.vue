<template>
  <div class="box">
            <div class="main">
                <div class="top">
                    <h4>{{uname}}</h4>
                    <button @click="muted">{{disturb?"🔊":"🔇"}}</button>
                    <button class="off" @click="offmessage">✖</button>
                </div>
                <div class="middle" ref="messageList">
                    <RecycleScroller
                        ref="scrollerRef"
                        class="scroller"
                        :items="messages"
                        :item-size="80"
                        key-field="_id"
                        v-slot="{ item }"
                    >
                        <div class="message">
                            <div class="avatar" v-if="item.from===chatstore.currentChatUser"><img :src="avatar || './images/maodie.jpg'" alt="图片"></div>
                            <div class="text" :class="{me:item.from!==chatstore.currentChatUser}">
                                <div class="content">
                                    <template v-if="item.file">
                                        <div class="file-message">
                                            <template v-if="item.file.fileType && item.file.fileType.startsWith('image/')">
                                                <a :href="item.file.fileUrl" target="_blank" rel="noopener noreferrer">
                                                    <img :src="item.file.fileUrl" :alt="item.file.fileName" class="chat-image-preview">
                                                </a>
                                            </template>
                                            <template v-else>
                                                <a :href="item.file.fileUrl" target="_blank" rel="noopener noreferrer" class="file-link">
                                                    📁 {{ item.file.fileName }}
                                                </a>
                                            </template>
                                        </div>
                                    </template>
                                    <template v-else>
                                        {{item.content}}
                                    </template>
                                </div>
                            </div>
                        </div>
                    </RecycleScroller>
                </div>
                <div class="bottom">
                    <div v-if="showPicker" class="emoji-picker-container">
                        <emoji-picker id="emoji-picker-instance" class="absolute bottom-full right-0 mb-2"></emoji-picker>
                    </div>
                    <div class="send">
                        <button @click="showpicker">😋</button>
                        <!-- <button>📁</button> -->
                        <input type="file" ref="fileInputRef" style="display: none;" @change="handleFileChange">
                        <button class="file-button" @click="triggerFileInput">📁</button>
                        <button @click="send" :class="{active:new_message.trim().length>0 || selectedFile}">send</button>
                    </div>
                    <textarea name="content" id="content" v-model="new_message" @keyup.enter="send"></textarea>
                </div>
            </div>
  </div>
</template>

<script setup>
import {ref,nextTick,onMounted} from 'vue'
import { useRoute } from 'vue-router'
import { useChatStore } from '../stores/useChatStore'
import axios from 'axios'
import { watch } from 'vue'
import {socket} from "../../utils/socket"
import { onBeforeUnmount } from 'vue'
import 'emoji-picker-element';
const messages = ref([])
const messageList = ref(null)
const scrollerRef = ref(null)  // 虚拟滚动组件引用
const new_message = ref("")
const disturb = ref(true)
const chatstore = useChatStore()

const uname = ref("")
const avatar = ref("")
const route = useRoute()
const showPicker = ref(false)

const fileInputRef = ref(null)
const selectedFile = ref(null)

// 滚动到底部（虚拟滚动专用）
function scrollToBottom() {
    nextTick(() => {
        if (scrollerRef.value && messages.value.length > 0) {
            scrollerRef.value.scrollToItem(messages.value.length - 1)
        }
    })
}

onMounted(async ()=>{
    const mountStartTime = performance.now()  // 记录 onMounted 开始时间
    console.log('🚀 页面开始加载...')
    
    uname.value = route.query.uname
    avatar.value = route.query.img

    // 【重要】先获取用户信息并设置 currentUserId，否则本地缓存功能无法工作
    try {
        const token = localStorage.getItem("token")
        const res = await axios.get(`${import.meta.env.VITE_BASE_URL}/user/info`, {
            headers: { authorization: `Bearer ${token}` }
        })
        console.log(`👤 用户信息获取完成: ${(performance.now() - mountStartTime).toFixed(2)} ms`)
        // 设置当前用户ID，供本地存储使用
        chatstore.setCurrentUserId(res.data.id)
        socket.emit("login", res.data.id)
    } catch (err) {
        console.error('content.vue: 获取用户信息失败', err)
    }

    //这里获取对方头像
    await getavatar()
    console.log(`🖼️ 头像获取完成: ${(performance.now() - mountStartTime).toFixed(2)} ms`)

    //这里写获取消息列表（此时 currentUserId 已经设置好了）
    await getlists()
    console.log(`✅ 【用户实际感知时间】消息可见: ${(performance.now() - mountStartTime).toFixed(2)} ms`)

    // 滚动到底部
    scrollToBottom()
})

//拿对方头像
async function getavatar(){
    const res =await axios.get(`${import.meta.env.VITE_BASE_URL}/user/friend_avatar/${chatstore.currentChatUser}`)
    avatar.value = res.data.ava
}

// ==================== 性能对比开关 ====================
// true  = 使用新方案（本地缓存 + 后台静默同步）
// false = 使用旧方案（直接全量拉取）
const USE_CACHE = true
// ======================================================

//拿对话消息
async function getlists(){
    const startTime = performance.now()
    
    try{
        if (USE_CACHE) {
            // ========== 新方案：先渲染本地缓存，后台静默同步 ==========
            
            // 【第 1 步】立即从本地缓存加载并渲染（不管网络多慢，10ms 内显示）
            messages.value = await chatstore.loadFromCache(chatstore.currentChatUser)
            scrollToBottom()
            console.log(`📦 [新方案] 本地缓存已渲染: ${(performance.now() - startTime).toFixed(2)} ms, 消息数: ${messages.value.length}`)
            
            // 【第 2 步】后台静默同步（不用 await，不阻塞用户）
            // 用户此时已经可以阅读消息了，同步在后台悄悄进行
            chatstore.syncMessages(chatstore.currentChatUser).then(async () => {
                // 同步完成后，静默更新界面（有新消息才会变化）
                const newMessages = await chatstore.loadFromCache(chatstore.currentChatUser)
                if (newMessages.length > messages.value.length) {
                    messages.value = newMessages
                    scrollToBottom()
                    console.log(`🌐 [新方案] 后台同步完成，新增 ${newMessages.length - messages.value.length} 条消息`)
                } else {
                    console.log(`🌐 [新方案] 后台同步完成，无新消息`)
                }
            })
            
        } else {
            // ========== 旧方案：直接从服务器全量拉取（必须等待网络） ==========
            const token = localStorage.getItem("token")
            const res = await axios.get(
                `${import.meta.env.VITE_BASE_URL}/chat/messages/${chatstore.currentChatUser}`,
                { headers: { Authorization: `Bearer ${token}` } }
            )
            messages.value = res.data
            const endTime = performance.now()
            
            // 计算数据大小
            const dataSize = new Blob([JSON.stringify(res.data)]).size
            console.log(`📡 [旧方案] 全量拉取完成: ${(endTime - startTime).toFixed(2)} ms`)
            console.log(`📊 [旧方案] 消息数: ${res.data.length}, 数据大小: ${(dataSize / 1024).toFixed(2)} KB`)
            scrollToBottom()
        }
    }
    catch(err){
        console.error("消息获取失败:",err)
    }
}

function triggerFileInput() {
  fileInputRef.value.click();
}

function handleFileChange(event) {
  const file = event.target.files[0];
  if (file) {
    selectedFile.value = file;
    console.log("Selected file:", file.name);
  }
}

async function uploadFile() {
  if (!selectedFile.value) {
    console.warn("没有选中文件");
    return;
  }

  const formData = new FormData();
  formData.append('file', selectedFile.value);

  try {
    const res = await axios.post(`${import.meta.env.VITE_BASE_URL}/upload/file`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${localStorage.getItem("token")}`
      }
    });

    console.log("文件上传成功:", res.data);
    const fileUrl = res.data.fileUrl;
    const fileName = selectedFile.value.name;
    const fileType = selectedFile.value.type;

    socket.emit("private-file-message", {
      to: chatstore.currentChatUser,
      fileUrl: fileUrl,
      fileName: fileName,
      fileType: fileType
    });

    selectedFile.value = null;
    if (fileInputRef.value) {
      fileInputRef.value.value = '';
    }
    await getlists()

  } catch (err) {
    console.error("文件上传失败:", err);
  }
}


async function send(e) {
    e.preventDefault()
    if (new_message.value.trim()) {
        try {
            const token = localStorage.getItem("token")
            const res = await axios.post(`${import.meta.env.VITE_BASE_URL}/chat/messages/${chatstore.currentChatUser}`,
                { content: new_message.value },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            )
            new_message.value = ''

            await getlists()

            socket.emit("private-message",{to:chatstore.currentChatUser})

            // 触发 LastChats 更新发送方的最后一条消息
            chatstore.triggerLastMessageUpdate(chatstore.currentChatUser)

            scrollToBottom()

        } catch (err) {
            console.error("发送失败：", err)
        }
    } else if (selectedFile.value) {
        await uploadFile();
    } else {
        console.warn("输入内容或文件不能为空！")
    }
}

watch(() => chatstore.currentChatUser, async (newUser, oldUser) => {
  if (newUser !== oldUser) {
    uname.value = route.query.uname
    avatar.value = route.query.img
    await getavatar()
    await getlists()
    scrollToBottom()
  }
})

watch(()=>route.query.uname,(new_uname)=>{
    uname.value = new_uname
})

watch(messages, () => {
    scrollToBottom()
})

function muted(){
    disturb.value = !disturb.value
}

const emit = defineEmits(['closemessage'])
function offmessage(){
    emit('closemessage')
}


onMounted(()=>{
    socket.on('private-message',async({from})=>{
        console.log(`收到${from}发来的信息`)
        await getlists()
        scrollToBottom()
    })
    socket.on('private-file-message',async({from, fileUrl, fileName, fileType})=>{
        console.log(`收到${from}发来的文件: ${fileName} (${fileUrl})`)
        messages.value.push({
            from: from,
            content: `[文件: ${fileName}]`, 
            file: { fileUrl, fileName, fileType } 
        });
        scrollToBottom()
    })
})

onBeforeUnmount(()=>{
    socket.off("private-message")
    socket.off("private-file-message")
})


let pickerElement = null; 
let boundAddEmoji = null; 

function showpicker(){
  showPicker.value = !showPicker.value
}

function addEmoji(event) {
  new_message.value += event.detail.emoji.unicode;
  showPicker.value = false;
}

watch(showPicker, (newValue) => {
  if (newValue) {
    nextTick(() => {
      pickerElement = document.getElementById('emoji-picker-instance');
      if (pickerElement) {
        boundAddEmoji = addEmoji;
        pickerElement.addEventListener('emoji-click', boundAddEmoji);
        console.log('Emoji picker event listener attached via watch.');
      } else {
        console.warn('Emoji picker element still not found after nextTick.');
      }
    });
  } else {
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
        /* height: 100vh; */
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
        /* border-top: 1px solid black; */
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
        /* border-radius: 50%; */
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
        /* border: 1px solid black; */
        border-radius: 1rem;
        flex: 8;
        overflow: hidden;  /* 让虚拟滚动组件管理滚动 */
        -webkit-app-region: no-drag
    }
    *:focus{
        border: none;
        outline: none;
    }
    /* 虚拟滚动容器 */
    .scroller {
        height: 100%;
        overflow-y: auto;
    }
    .message{
        height: 80px;  /* 必须与 :item-size 一致 */
        box-sizing: border-box;
        display: flex;
        flex-direction: row;
        align-items: flex-end;
        padding: 10px 10px 10px 1vw;
    }
    .avatar{
        flex: 1;
        /* border: 1px solid black; */
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
        /* background-color: aliceblue; */
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

    /* 底部样式 */
    .bottom{
        /* border: 1px solid black; */
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
        /* border: 1px solid black; */
        width: 100%;
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        -webkit-app-region: no-drag
        /* padding: 0 10px 15px 0; */
    }
    .send button{
        height: 30px;
        /* aspect-ratio: 1/1; */
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
        /* background-color: purple; */
        /* display: flex;
        justify-content: flex-start;
        align-items: flex-start; */
    }
    .emoji-picker-container{
        position: absolute;
        bottom: 0;
        right: 0;
    }

    /* 新增的样式 */
    .chat-image-preview {
        max-width: 150px; /* 限制图片宽度 */
        max-height: 150px; /* 限制图片高度 */
        border-radius: 8px;
        cursor: pointer;
        display: block;
        margin-top: 5px;
    }
    .file-link {
        display: flex;
        align-items: center;
        gap: 5px;
        color: #4a90e2; /* 链接颜色 */
        text-decoration: underline;
        font-weight: bold;
    }
    .file-message {
        padding: 0;
        margin: 0;
    }
</style>
