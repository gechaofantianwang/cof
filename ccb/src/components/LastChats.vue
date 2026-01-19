<template>
    <div class="contacts">
        <div class="set" v-if="issetting">
            <div class="set_" @click="toBeige">Beige</div>
            <div class="set_" @click="toMist">Mist</div>
            <div class="set_" @click="toApricot">Apricot</div>
        </div>
        <div class="top">
            <div class="top_child">
                <input type="button" value="◁" @click="back" id="button">
                <span>Chat</span>
                <div class="chatroom"><button @click="$router.push('/chatbox/chathall')">+</button></div>
            </div>
        </div>
        <div class="middle">
            <div class="setting" @click="setcolor"><font-awesome-icon :icon="['fas', 'gear']" title="更换背景色"/></div>
            <div class="avatar">
                <div class="frame">
                    <img :src="userava" alt="">
                </div>
            </div>
            <div class="friendname">{{ username?username:'游客' }}
            <div class="status" :class="statu==='occupied'?'busy':''"></div>
                <div class="sta">
                    <select name="status" id="statusbox" v-model="statu">
                        <option value="available" class="aval">available</option>
                        <option value="occupied" class="occu">occupied</option>
                    </select>
                </div>
            </div>
            <div class="search">
                <input type="text" name="" id="" placeholder="Search">
            </div>
        </div>
        <div class="bottom">
            <div class="head">Last charts</div>
            <ul class="chat-list">
                <li class="chat-item" v-for="friend in friends" @click="switchChat(friend)" >
                    <div class="avatar-box">
                        <div class="avatar-small">
                        <div :class="{ 'tips': friend.isNewmsg }"></div>
                        <img :src="friend.avatar ||'images/maodie.jpg' " alt="图片">
                    </div>
                    </div>
                    <div class="detail">
                        <div class="name">{{friend.name}}</div>
                        <div class="info">{{friend.lastMessage}}</div>
                    </div>
                    <div class="time">{{formatDate(friend.lastTime)}}</div>
                </li>
            </ul>
        </div>
        
    </div>
</template>

<script setup>
// 引入必要的库
import axios from 'axios'
import {onBeforeUnmount, ref} from 'vue'
import { defineEmits } from 'vue'
import { onMounted } from 'vue'    
import { useChatStore } from '../stores/useChatStore' // 引入 Pinia 状态管理，用于跨组件通信
import {socket} from "../../utils/socket" // 引入 Socket.io 实例
import { watch } from 'vue'

// --- 响应式状态定义 ---
const statu = ref("available") // 用户当前状态
const issetting = ref(false)   // 设置弹窗显隐控制
const friends = ref([])        // 好友列表数据
const From = ref("")           // 记录消息来源ID（用于Socket监听）

const userid = ref("")
const username = ref("")
const userava = ref("")

// 初始化 Pinia store
const chatStore = useChatStore()

// --- 定义组件向外抛出的事件 ---
const emit = defineEmits(["hidechat",'changecolor',"todetail"])

// 1. 返回/关闭聊天栏
function back(){
    emit("hidechat","关掉聊天")
}
// 2. 打开设置遮罩
function setcolor(){
    issetting.value = true
}
// 3. 切换主题颜色并关闭遮罩
function toBeige(){
    emit("changecolor",{color:"beige"})
    issetting.value = false
}
function toMist(){
    emit("changecolor",{color:"mist"})
    issetting.value = false
}
function toApricot(){
    emit("changecolor",{color:"apricot"})
    issetting.value = false
}
// 4. 切换聊天对象的核心逻辑
function switchChat(friend){
  chatStore.switchChatUser(friend.id)
  // 通知父组件跳转到聊天详情页，并传递对方名字和头像
  emit("todetail",{uname:friend.name,img:friend.img})
  // 点击后消除红点提醒（标记为已读）
    if(friend){ 
        friend.isNewmsg = false; 
    }
}

// 5. 时间格式化工具函数
// 如果是当天的消息显示 "HH:MM"，非当天显示 "YYYY-MM-DD"
function formatDate(dateStr) {
    const date = new Date(dateStr);
    const current_date = new Date()
    if(date.toLocaleDateString() === current_date.toLocaleDateString()){
        return isNaN(date.getTime()) ? "" : date.toLocaleTimeString().slice(0,5);
    } else {
        return isNaN(date.getTime()) ? "" : date.toLocaleDateString().slice(0,10);
    }
}

// 钩子1: 初始化个人信息并登录 Socket
onMounted(async()=>{
    try{
        const token = localStorage.getItem("token")
        // 请求个人信息
        const res = await axios.get(`${import.meta.env.VITE_BASE_URL}/user/info`, {
        headers: {
            authorization: `Bearer ${token}`
        }
        })
        // 赋值本地状态
        username.value = res.data.name
        userid.value = res.data.id
        userava.value = res.data.ava
        // 向 Socket 服务器发送登录事件，绑定当前用户ID
        console.log('准备发送login, socket.connected =', socket.connected, 'userId =', res.data.id)
        socket.emit("login",res.data.id)
    }
    catch(err){
        console.error("用户名获取失败：",err)
    }
})

// 钩子2: 获取好友列表及每个好友的最后一条消息
onMounted(async () => {
    try {
        const token = localStorage.getItem('token')
        // 1. 获取好友基础列表
        const res = await axios(`${import.meta.env.VITE_BASE_URL}/user/friends`, {
            headers: {
                authorization: `Bearer ${token}`
            }
        })

        const newFriends = res.data

        // 2. 并发请求所有好友的最后一条消息 (Promise.all)
        // 这种做法可能会造成请求瞬间爆发，如果好友很多，建议后端提供聚合接口
        const lastMsgPromises = newFriends.map(friend =>
            axios.get(`${import.meta.env.VITE_BASE_URL}/chat/last_message/${friend.id}`, {
                headers: {
                    authorization: `Bearer ${token}`
                }
            }).then(msgRes => ({
                id: friend.id,
                lastMessage: msgRes.data.content,
                lastTime: msgRes.data.time
            })).catch(err => {
                console.error(`初始化时获取${friend.name}的消息失败`, err)
                return { id: friend.id, lastMessage: '', lastTime: '' }
            })
        )

        const lastMessages = await Promise.all(lastMsgPromises)

        // 3. 将最后一条消息合并进好友数据对象
        newFriends.forEach(friend => {
            const msg = lastMessages.find(m => m.id === friend.id)
            Object.assign(friend, {
                lastMessage: msg?.lastMessage || '',
                lastTime: msg?.lastTime || '',
                isNewmsg: false // 默认为无新消息
            })
        })

        // 4. 过滤掉没有消息记录的好友（可选逻辑），并更新响应式数据
        friends.value = [...newFriends].filter(friend => friend.lastMessage !== '') 
    } catch (err) {
        console.error("初始化联系人或消息失败:", err)
    }
})

// --- 实时消息处理逻辑 ---
// 更新指定好友的最后一条消息显示和红点
// isIncoming: true 表示收到新消息(显示红点), false 表示自己发送消息(清除红点)
async function updateFriendMessage(friendId, isIncoming = false) {
  // 在现有列表中查找好友索引
  const index = friends.value.findIndex(f => f.id === friendId)
  if(index !== -1){
    try{
        console.log(`[LastChats] 更新好友 ${friendId} 消息, identifies as incoming: ${isIncoming}`)
        const token = localStorage.getItem('token');
        // 获取该好友的最新一条消息（无论是发的还是收的）
        const res = await axios.get(`${import.meta.env.VITE_BASE_URL}/chat/last_message/${friendId}`, {
            headers: { authorization: `Bearer ${token}` }
        });
        
        const lastMsg = res.data;
        console.log(`[LastChats] API返回最新消息:`, lastMsg)

        // 更新消息内容和时间
        friends.value[index].lastMessage = lastMsg.content || '[收到新消息]'; // 兜底
        friends.value[index].lastTime = lastMsg.time || '';

        // 处理红点逻辑
        if (isIncoming) {
            // 如果是收到的消息，显示红点
            friends.value[index].isNewmsg = true;
        } else {
            // 如果是自己发送的消息，清除红点
            friends.value[index].isNewmsg = false;
        }

    }catch(err){
        console.error(`更新好友 ${friendId} 消息失败:`, err);
    }
  }
}

// 监听 Socket 私聊消息 (接收方)
onMounted(() => {
    socket.on('private-message', ({ from }) => { 
        From.value = from; 
        console.log(`[LastChats] 收到 Socket 消息通知: ${from}`)
        // isIncoming = true
        updateFriendMessage(from, true);
    });
});

// 监听发送消息后的更新 (发送方)
watch(() => chatStore.lastMessageUpdated, async (newVal) => {
    if (newVal && newVal.friendId) {
        console.log(`[LastChats] 监听到本地发送消息更新: ${newVal.friendId}`)
        // isIncoming = false
        await updateFriendMessage(newVal.friendId, false);
    }
});

// 组件卸载前移除监听
onBeforeUnmount(()=>{
    socket.off("private-message")
})




</script>

<style scoped>
:root {
    --primary-color: #4CAF50;
    --border-color: rgba(0, 0, 0, 0.1);
    --shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.contacts {
    height: 100%;
    /* min-width: 100%; */
    max-width: 100vw;
    display: flex;
    flex-direction: column;
    background-color: transparent;
    overflow: hidden;
}

.set{
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%,-50%);
    display: flex;
    /* flex-direction: column; */
    height: 100%;
    width: 100%;
    z-index: 999;
    cursor: pointer;
}

.set_{
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 1.5rem;
    white-space: wrap;
    flex-wrap: wrap;
    transition: all 1.5s ease;
    -webkit-app-region: no-drag
}

.set_:hover{
    font-size: 3rem;
}

.set_:first-child{
    color: #444444;
    background-color: #f9f9f9;
    border: none;
}
.set_:nth-child(2){
    background-color: rgba(220, 225, 230, 1);
    color: #2c3e50;
    border: none;
}

.set_:last-child{
    color: #5c4033	;
    background-color: rgba(255, 235, 215, 1);
    border:none;
}

/* 顶部区域 */
.top {
    height: 60px;
    padding: 0 1rem;
    border-bottom: 1px solid var(--border-color);
    flex-shrink: 0;
    box-shadow: 0 1px 1px 0px rgba(0,0,0,.1);

}

#button,.status,.search,.setting,.avatar,.chat-list,.chatroom button{
    -webkit-app-region: no-drag
}

.top_child {
    height: 100%;
    display: flex;
    align-items: center;
    gap: 1rem;
    position: relative;
}

.top_child input {
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.3s ease;
}

.top_child input:hover {
    transform: scale(1.05);
}

.chatroom{
    position: absolute;
    right: 0;
}

.chatroom button{
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: larger;
}
.chatroom button:hover{
    transform: scale(1.05);
}

.chatroom button::after {
  content: "加入聊天室";
  position: absolute;
  top: 50%;
  left: -200%;
  transform: translateY(-50%);
  white-space: nowrap;
  background: rgba(0,0,0,0.75);
  color: white;
  padding: 4px 8px;
  border-radius: 6px;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.chatroom button:hover::after {
  opacity: 1;
}


/* 中间区域 */
.middle {
    height: 15rem;
    padding: 2rem 1rem;
    position: relative;
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    align-items: center;
    gap: 1rem;
    border-bottom: 1px solid var(--border-color);
}

.setting {
    position: absolute;
    top: 1rem;
    right: 1rem;
    cursor: pointer;
}

.avatar {
    width: 100%;
    max-width: 120px;
    /* margin-bottom: 1rem; */
    display: flex;
    justify-content: center;
}

.frame {
    width: 80%;
    /* width: 100%; */
    border-radius: 50%;
    overflow: hidden;
    aspect-ratio: 1/1;
    box-shadow: var(--shadow);
}

.frame img {
    max-width: 100%;
    aspect-ratio: 1/1;
    object-fit: cover;
}

.friendname {
    font-size: 1.2rem;
    font-weight: 600;
    /* margin-bottom: 0.5rem; */
}

.status {
    width: 150px;
    padding: 0.5rem;
    border-radius: 20px;
    background-color: rgba(127,255,212,.3);    
}

.status select {
    width: 100%;
    border: none;
    outline: none;
    background: transparent;
    color: green;
    padding: 0.25rem;
    cursor: pointer;
    font-weight: bolder;
}

.status.busy{
    background-color: #f5f2f7;
}

.status.busy select{
    color: red;
}

.aval{
    color: green;
    background-color: #ccffeb;
}
.occu{
    color: red;
    background-color: #f8f1e4;
}

.search {
    width: 100%;
    max-width: 300px;
    margin-top: 1rem;
}

.search input {
    width: 80%;
    padding: 0.75rem 2.5rem 0.75rem 1rem;
    border: none;
    border-radius: 20px;
    background-color: rgba(0, 0, 0, 0.05);
    font-size: 0.9rem;
    transition: all 0.3s ease;
}

/* 底部聊天列表 */
.bottom {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.head {
    margin-top: 20px;
    /*max-height: 10px; */
    padding:0.5rem 1rem;
    font-weight: 600;
    color: #666;
    flex-shrink: 0;
    box-shadow: 0 0 2px 1px rgba(0, 0, 0, 0.1)
}

.chat-list {
    flex: 1;
    overflow-y: auto;
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    /* background-color: #4CAF50; */
}

.chat-item {
    padding: 1rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    transition: background-color 0.3s ease;
    cursor: pointer;
    position: relative;
    /* flex: 0 0 25%; */
}

.chat-item:hover {
    background-color: rgba(0, 0, 0, 0.02);
}

.avatar-box {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    flex-shrink: 0;
    position: relative;
}
.avatar-small {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    overflow: hidden;
    flex-shrink: 0;
}

.avatar-small img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.tips{
    position: absolute;
    color: white;
    top: 0;
    right: 0;
    background-color: red;
    border-radius: 50%;
    height: 25%;
    aspect-ratio: 1/1;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: small;
    transform: translate(50%,-50%);
}

.detail {
    flex: 1;
    min-width: 0;
}

.name {
    font-weight: 500;
    margin-bottom: 0.25rem;
}

.info {
    color: #666;
    font-size: 0.9rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow:ellipsis;
}

.time {
    color: #999;
    font-size: 0.8rem;
    white-space: nowrap;
}

@media (max-width: 768px) {
    #button{
        display: none;
    }
    .top_child span{
        font-weight: bolder;
    }
    .set{
        display: flex;
        flex-direction: column;
    }
}

/* @media (max-width: 490px) {
    .contacts {
        width: 100%;
    }
    
    .middle {
        padding: 1rem;
    }
    
    .search {
        max-width: 100%;
    }
}

@media (min-width: 769px) {
    .contacts {
        border-right: 1px solid var(--border-color);
    }
} */
</style>