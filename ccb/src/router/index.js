// createWebHistory: 用于开启 HTML5 的 History 模式 (URL 里不带 # 号，比如 /login 而不是 /#/login)
// import { Children } from 'react'
import { createRouter, createWebHistory } from 'vue-router'
import content from '../views/content.vue'
import Assistant from '../views/Assistant.vue'
import ChatBox from '../components/ChatBox.vue'
import ChatHall from '../views/ChatHall.vue'
import ChatRoom from '../views/ChatRoom.vue'
// 这里的箭头函数 () => import(...) 是"懒加载" (Lazy Loading)。
// 只有当用户真的访问这个页面时，浏览器才会去下载对应的代码文件。
// 优点：能显著加快首屏打开速度，不需要一次性加载所有页面。
const Login = () => import('../components/Login.vue')
const ChatView = () => import('../components/ChatView.vue')

const routes = [
  {
    path: '/',
    component: ChatView,
    meta: { requireAuth: true },
    children: [{
      path: "/chatdetail",
      component: content
    },
    {
      path: '/chat-ai',
      component: Assistant
    }
    ]
  },
  {
    path: '/login',
    component: Login
  },
  {
    path: '/chatbox',
    component: ChatBox,
    children: [{
      path: "",
      redirect: "/chatbox/chathall"
    },
    {
      path: 'chathall',
      component: ChatHall
    },
    {
      path: 'chatroom',
      component: ChatRoom
    }
    ]
  },
  // :catchAll(.*) 是一个正则表达式，意思是"匹配上面没有定义过的所有其他路径"
  {
    path: '/:catchAll(.*)',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 检查 Token 是否过期
function isTokenExpired(token) {
  if (!token) return true

  try {
    // JWT 格式: header.payload.signature
    // 我们需要解析 payload 部分
    const payload = token.split('.')[1]

    // Base64 解码
    const decodedPayload = JSON.parse(atob(payload))

    // 检查过期时间（exp 是 Unix 时间戳，单位秒）
    const currentTime = Math.floor(Date.now() / 1000)

    // 如果当前时间 > 过期时间，则已过期
    return decodedPayload.exp < currentTime
  } catch (e) {
    // 解析失败，视为过期
    console.error('Token 解析失败:', e)
    return true
  }
}

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')

  // 检查是否需要认证的页面
  if (to.meta.requireAuth) {
    // 没有 token 或 token 已过期
    if (!token || isTokenExpired(token)) {
      // 清除过期的 token
      localStorage.removeItem('token')
      console.log('Token 不存在或已过期，跳转到登录页')
      next('/login')
    } else {
      next()
    }
  } else {
    next()
  }
})

export default router