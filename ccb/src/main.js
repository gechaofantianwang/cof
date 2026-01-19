import { createApp } from 'vue'
// import './style.css'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import '@fortawesome/fontawesome-free/css/all.css'
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { fas } from '@fortawesome/free-solid-svg-icons'
import VueVirtualScroller from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'

library.add(fas)

const app = createApp(App)
app.component('font-awesome-icon', FontAwesomeIcon)

// [NEW] 定义一个全局函数处理图片路径
app.config.globalProperties.$img = (url) => {
    if (!url) return ''
    // 1. 如果本来就是 http 开头，直接返回
    if (url.startsWith('http')) return url

    // 2. 如果是 blob 开头（本地上传预览），直接返回
    if (url.startsWith('blob')) return url
    // 3. 否则，拼接上后端的地址前缀
    // 这样 /images/ava.jpg 就会变成 http://localhost:3000/images/ava.jpg
    // 这里的 BASE_URL 会自动读取 .env 也就是您配置的后端地址
    const baseUrl = import.meta.env.VITE_BASE_URL
    return `${baseUrl}${url}`
}
app.use(VueVirtualScroller)
app.use(router)
const pinia = createPinia()
app.use(pinia)
app.mount('#app')
