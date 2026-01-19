import { defineStore } from 'pinia'
import axios from 'axios'
import * as db from '../../utils/db'  // 引入本地存储模块.

export const useChatStore = defineStore('chat', {
  state: () => ({
    currentChatUser: null,
    messageLists: {},
    lastMessageUpdated: null,  // 用于触发 LastChats 更新

    currentUserId: null,  // 当前登录用户ID（用于本地存储查询）
    syncStatus: {}  // 同步状态：{ friendId: 'syncing' | 'synced' | 'error' }

  }),
  actions: {
    // 设置当前用户ID（登录后调用）
    setCurrentUserId(userId) {
      this.currentUserId = userId
    },
    switchChatUser(user) {
      this.currentChatUser = user
    },

    /**
    * 从本地缓存加载消息（离线可用，速度快）
    * @param {string} friendId - 好友ID
    * @returns {Promise<Array>} 消息数组
    */
    async loadFromCache(friendId) {
      if (!this.currentUserId) {
        console.warn('useChatStore: currentUserId 未设置')
        return []
      }
      try {
        const messages = await db.getMessages(this.currentUserId, friendId)
        this.messageLists[friendId] = messages
        return messages
      } catch (error) {
        console.error('useChatStore: loadFromCache error', error)
        return []
      }
    },

    /**
    * 增量同步消息（从服务器拉取新消息并存入本地）
    * @param {string} friendId - 好友ID
    */
    async syncMessages(friendId) {
      if (!this.currentUserId) return
      this.syncStatus[friendId] = 'syncing'
      try {
        const lastSyncTime = await db.getLastSyncTime(this.currentUserId, friendId)
        // 2. 构造请求 URL（带 since 参数实现增量查询）
        const token = localStorage.getItem('token')
        let url = `${import.meta.env.VITE_BASE_URL}/chat/messages/${friendId}`
        if (lastSyncTime) {
          url += `?since=${encodeURIComponent(lastSyncTime)}`
        }
        // 3. 请求服务器
        const res = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` }
        })
        // 4. 将新消息存入本地
        if (res.data && res.data.length > 0) {
          await db.saveMessages(res.data, this.currentUserId)
          // 更新内存中的消息列表
          this.messageLists[friendId] = await db.getMessages(this.currentUserId, friendId)
        }

        this.syncStatus[friendId] = 'synced'

      } catch (error) {
        console.error('useChatStore: syncMessages error', error)
        this.syncStatus[friendId] = 'error'
      }
    },





    addMessage(userID, message) {
      if (!this.messageLists[userID]) {
        this.messageLists[userID] = []
      }
      this.messageLists[userID].push(message)
    },
    getMessage(userID) {
      return this.messageLists[userID]
    },
    // 触发 LastChats 更新
    triggerLastMessageUpdate(friendId) {
      this.lastMessageUpdated = { friendId, timestamp: Date.now() }
    }
  }
}
)