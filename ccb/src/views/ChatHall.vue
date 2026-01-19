<template>
  <div class="container">
    <div class="return" @click="back">←</div>
    <!-- 适时出现的创建房间菜单 --> 
    <div class="overlay" v-if="buildnew">
      <div class="menu">
        <div class="close" @click="close">×</div>
        <div class="build-name"><input type="text" name="room-name" id="room-name" v-model="roomName" autocomplete="off" placeholder="房间名" maxlength="6" ></div>
        <div class="build-id"><input type="text" name="room-name" id="room-name" v-model="roomID" autocomplete="off" placeholder="房间号" maxlength="6" @input="roomID=roomID.replace(/\D/g,'')"></div>
        <button @click="buildNewRoom">创建房间</button>
      </div>
    </div>
     <!-- 这个是让用户确认进入聊天室 -->
      <div class="overlay" v-if="isEnter">
        <div class="menu">
          <div class="close">×</div>
          <div class="notice">即将进入房间: <strong style="color: red;font-weight: 1000;">{{tem_name}}</strong></div>
          <button @click="makesure">开启畅聊~</button>
        </div>
      </div>

      <div class="top">匿名聊天室</div>
      <div class="middle">
        <div class="room-list">
          <div class="room-item" v-for="room in roomlists" @click="enterRoom(room)">
            <div class="room-name">{{ room.RoomName }}</div>
            <div class="room-id"> <strong>{{ room.roomID }}</strong> </div>
            <div class="room-num">在线人数：999+</div>
          </div>
        </div>
      </div>
      <div class="bottom"><button @click="buildNew">创建聊天室</button></div>
  </div>
</template>


<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
const router = useRouter()


const buildnew = ref(false)
// 定义响应式变量 isEnter，布尔值，控制“进入确认”弹窗的显示/隐藏
const isEnter = ref(false)
// 定义响应式变量 roomName，用于存储用户输入的房间名
const roomName = ref("")
const roomID = ref("")
// 定义响应式变量 uname，用于存储当前登录用户的用户名
const uname = ref("")
// 定义响应式数组 roomlists，用于存储从后端获取的房间列表数据
const roomlists = ref([])
// 定义响应式变量 tem_name，临时存储用户点击的那个房间的名称
const tem_name = ref("")
// 定义响应式变量 tem_id，临时存储用户点击的那个房间的 ID
const tem_id = ref("")

//返回上一页
function back(){
  router.back()
}

// 函数：打开“创建房间”的弹窗
function buildNew(){
  // 如果当前没有显示弹窗
  if(!buildnew.value){
    // 将 buildnew 设置为 true，弹窗会在页面上显示出来
    buildnew.value = true
  }
}
// 函数：关闭所有弹窗
function close(){
  if(buildnew.value){
    buildnew.value = false
  }
  if(isEnter.value){
    isEnter.value = false
  }
}

// 异步函数：创建新房间并让房主自动进房
async function buildNewRoom() {
  if(roomName.value && roomID.value){
    const token = localStorage.getItem("token")
    try{
      // 拼接请求地址：基础URL + /room/create/ + 房间号
      const res = await axios.post(
        `${import.meta.env.VITE_BASE_URL}/room/create/${roomID.value}`,
        {roomname:roomName.value},
        {headers:{Authorization:`Bearer ${token}`}}
      )
      buildnew.value = false
      router.push({path:"chatroom",query:{id:roomID.value,name:roomName.value,uname:uname.value}})
      // 清空输入框的内容
      roomName.value = "";
      roomID.value = "";
    }catch(err){
    // 捕获请求错误，在控制台打印错误信息
      console.error("创建房间失败:", err);
      // 弹出提示框告知用户失败
      alert("房间号重复，创建失败，请重试!");
      // 清空输入框的内容
      roomName.value = "";
      roomID.value = "";
    }
  }
}

// 函数：唤醒“确认进入”的弹窗
function enterRoom(room){
  // 把点击的房间信息赋值给临时变量
  tem_name.value = room.RoomName
  tem_id.value = room.RoomID

  // 显示确认进入的弹窗
  isEnter.value = true
}

// 异步函数：点击确认后，正式进入房间
async function makesure(){
  // 跳转页面，携带房间 ID、房间名和用户名
  router.push({path:"chatroom",query:{id:tem_id.value,name:tem_name.value,uname:uname.value}})
  // 关闭确认弹窗
  isEnter.value = false
}

// 生命周期钩子：当组件挂载完成后自动执行
onMounted(async()=>{
  try{
    const token = localStorage.getItem("token")
    const res = await axios.get(`${import.meta.env.VITE_BASE_URL}/room/getrooms`,{
      headers:{
        Authorization:`Bearer ${token}`
      },
  })
    roomlists.value = res.data.roomLists
    uname.value = res.data.uname
    console.log(res);
    
  }catch(err){
    console.error(err)
    
  }
})


</script>


<style scoped>
/* 页面主容器样式 */
    .container{
        height: 100vh; /* 高度占满整个视口高度 */
        width: 100vw;  /* 宽度占满整个视口宽度 */
        background-color: #1e1f24; /* 设置深色背景 */
        display: flex; /* 启用 Flex 布局 */
        flex-direction: column; /* 子元素垂直排列 */
        color: white; /* 字体颜色为白色 */
        overflow: hidden; /* 隐藏溢出的内容 */
        position: relative; /* 相对定位，作为子元素绝对定位的参考点 */
    }

    /* 返回按钮样式 */
    .return{
        position: absolute; /* 绝对定位 */
        top: 5px; /* 距离顶部 5px */
        left: 5px; /* 距离左侧 5px */
        /* right: 0; */ /* 被注释掉的样式 */
        width: 35px; /* 宽度 35px */
        background-color: rgba(255,255,255,.3); /* 半透明白色背景 */
        border-radius: 50%; /* 圆形边框 */
        aspect-ratio: 1/1; /* 宽高比 1:1，保持正圆 */
        display: flex; /* Flex 布局 */
        justify-content: center; /* 水平居中 */
        align-items: center; /* 垂直居中 */
        cursor: pointer; /* 鼠标悬停显示手型 */
        transition: all 0.5s ease-in; /* 设置过渡动画效果 */
        font-weight: bolder; /* 字体加粗 */
    }
    /* 返回按钮悬停效果 */
    .return:hover{
        transform: scale(1.05); /* 放大 1.05 倍 */
    }

    /* 开房菜单的遮罩层样式 */
    .overlay{
      position: fixed; /* 固定定位，覆盖全屏 */
      width: 100%; /* 宽度 100% */
      height: 100%; /* 高度 100% */
      overflow: hidden; /* 隐藏溢出 */
      background-color: #1e1f24; /* 背景色与主背景一致（这里可能想起到遮挡作用） */
    }

    /* 弹窗菜单框主体样式 */
    .menu{
      position: fixed; /* 固定定位 */
      left: 50%; /* 左边距 50% */
      top: 50%; /* 上边距 50% */
      border: 1px solid white; /* 白色边框 */
      width: 300px; /* 宽度 300px */
      height: 200px; /* 高度 200px */
      transform: translate(-50%,-50%); /* 通过位移实现完全居中 */
      background-color: rgba(255,255,255,.5); /* 半透明白色背景 */
      border-radius: 20px; /* 圆角 20px */
      padding: 20px; /* 内边距 20px */
      padding-top: 50px; /* 顶部内边距 50px */
      display: flex; /* Flex 布局 */
      flex-direction: column; /* 垂直排列 */
      gap: 50px; /* 子元素间距 50px */
      z-index: 999; /* 层级设置很高，保证在最上层 */
    }

    /* 弹窗关闭按钮样式 */
    .close{
      position: absolute; /* 绝对定位 */
      top: 10px; /* 距离顶部 10px */
      right: 10px; /* 距离右侧 10px */
      width: 30px; /* 宽度 30px */
      aspect-ratio: 1/1; /* 宽高比 1:1 */
      display: flex; /* Flex 布局 */
      justify-content: center; /* 水平居中 */
      align-items: center; /* 垂直居中 */
      border-radius: 50%; /* 圆形 */
      box-shadow: 0 0px 3px 1px rgba(0,0,0,.5); /* 阴影效果 */
      color: black; /* 字体黑色 */
      cursor: pointer; /* 手型光标 */
      transition: all 0.5s ease; /* 过渡动画 */
    }
    /* 关闭按钮悬停效果 */
    .close:hover{
      transform: translateY(-5px); /* 向上位移 5px */
    }

    /* 创建房间时的输入行样式 */
    .build-name,.build-id{
      display: flex; /* Flex 布局 */
      flex-direction: row; /* 水平排列 */
      justify-content: space-between; /* 两端对齐 */
      font-size: 1.5rem; /* 字体大小 */
    }

    /* 菜单内的输入框样式 */
    .menu input{
      /* border: 1px solid black; */ /* 注释掉的边框 */
      border: none; /* 无边框 */
      outline: none; /* 无轮廓线 */
      background-color: transparent; /* 背景透明 */
      /* box-shadow: 0 0px 30px 0px rgba(255,255,255,.5); */ /* 注释掉的阴影 */
      border: 1px solid rgba(255,255,255,.5); /* 半透明白色边框 */
      font-size: 1.5rem; /* 字体大小 */
      line-height: 2rem; /* 行高 */
      width: 100%; /* 宽度占满 */
      right: 0; /* 右对齐（在 flex 下可能无效，除非 absolute） */
      color: #2f4f4f; /* 字体颜色：深岩灰色 */
      border-radius: 10px; /* 圆角 */
      padding: 0 1rem; /* 左右内边距 */
    }
    

    /* 菜单内的按钮样式 */
    .menu button{
      position: absolute; /* 绝对定位 */
      bottom: 10%; /* 距离底部 10% */
      left: 50%; /* 左边距 50% */
      transform: translateX(-50%); /* 水平居中 */
      height: 50px; /* 高度 */
      width: 200px; /* 宽度 */
      border-radius: 20px; /* 圆角 */
      border: none; /* 无边框 */
      cursor: pointer; /* 手型光标 */
    }

    /* 确认进入弹窗的提示文字样式 */
    .notice{
      position: absolute; /* 绝对定位 */
      top: 50%; /* 垂直居中 */
      left: 50%; /* 水平居中 */
      transform: translate(-50%,-50%); /* 修正居中偏移 */
      font-size: larger; /* 较大字体 */
      width: fit-content; /* 宽度适应内容 */
      white-space: nowrap; /* 不换行 */
    }

    /* 顶部标题区域样式 */
    .top{
        /* border: 1px solid black; */ /* 注释掉的边框 */
        flex: 1; /* 占据 1 份空间 */
        font-size: 22px; /* 字体大小 */
        display: flex; /* Flex 布局 */
        flex-direction: column; /* 垂直排列 */
        justify-content: center; /* 垂直居中 */
        align-items: center; /* 水平居中 */
        overflow: hidden; /* 隐藏溢出 */
    }
    /* 中间列表区域样式 */
    .middle{
        /* border: 1px solid black; */ /* 注释掉的边框 */
        flex: 9; /* 占据 9 份空间（占比最大） */
        max-height: 75vh; /* 最大高度 */
        overflow: hidden; /* 隐藏溢出（注意：这里可能导致列表无法滚动，除非内部有滚动设置） */
        padding: 20px 15px; /* 内边距 */
    }
    /* 房间列表容器样式 */
    .room-list{
        display: flex; /* Flex 布局 */
        flex-direction: row; /* 水平排列 */
        justify-content: flex-start; /* 左对齐 */
        flex-wrap: wrap; /* 允许换行 */
        gap: 10px; /* 左右间距 */
        row-gap: 20px; /* 上下间距 */
    }
    /* 单个房间卡片样式 */
    .room-item{
        flex: 0 0 calc(50% - 5px); /* 固定宽度：50% 减去间隙的一半，实现一行两个 */
        box-sizing: border-box; /* 边框计算在宽高内 */
        /* border: 1px solid white; */ /* 注释掉的边框 */
        height: 16vh; /* 高度 */
        border-radius: 20px; /* 圆角 */
        display: flex; /* Flex 布局 */
        flex-direction: column; /* 垂直排列 */
        align-items: start; /* 左对齐 */
        justify-content: space-between; /* 两端对齐 */
        padding: 10px 5px; /* 内边距 */
        padding-left: 15px; /* 左内边距加宽 */
        background-color: rgba(255,255,255,.04); /* 极淡的背景色 */
        box-shadow: 0 0 1px 1px rgba(0,0,0,.1); /* 阴影 */
        overflow: hidden; /* 隐藏溢出 */
        cursor: pointer; /* 手型光标 */
    }
    /* 房间名样式 */
    .room-name{
        font-weight: bold; /* 加粗 */
        background: linear-gradient(to right, #ff7e5f, #feb47b); /* 设置渐变背景 */
        -webkit-background-clip: text; /* 背景被裁剪成文字形状 */
        -webkit-text-fill-color: transparent; /* 文字填充透明，从而显示出背景渐变 */
        background-clip: text; /* 标准属性兼容 */
    }
    /* 房间人数区域样式 */
    .room-num{
        width: 100%; /* 宽度 100% */
        display: flex; /* Flex 布局 */
        justify-content: space-between; /* 两端对齐 */
        font-size: small; /* 小字体 */
    }

    /* 房间人数里的按钮样式（虽然 HTML 里没看到按钮，但这里定义了样式） */
    .room-num button{
        color: lightgreen; /* 亮绿色文字 */
        background:transparent; /* 透明背景 */
        border-radius: 5px; /* 圆角 */
        width: 35px; /* 宽度 */
        text-align: center; /* 文字居中 */
        box-shadow: 0 0 1px 1px rgba(255,255,255,.2); /* 阴影 */
    }

    /* 底部区域样式 */
    .bottom{
        flex: 2; /* 占据 2 份空间 */
        display: flex; /* Flex 布局 */
        justify-content: center; /* 水平居中 */
    }
    /* 底部“创建聊天室”按钮样式 */
    .bottom button{
        height: 50px; /* 高度 */
        width: 250px; /* 宽度 */
        border-radius: 20px; /* 圆角 */
        /* margin-top: 20px; */ /* 注释掉的外边距 */
        background-color: rgb(134, 225, 237); /* 青色背景 */
        border: none; /* 无边框 */
        color: white; /* 白色文字 */
        font-size: large; /* 大字体 */
        cursor: pointer; /* 手型光标 */
        transition: all 0.5s ease-in; /* 过渡效果 */
    }

    /* .bottom button:hover{
      transform: scale(1.05);
    } */ /* 注释掉的按钮悬停效果 */
</style>