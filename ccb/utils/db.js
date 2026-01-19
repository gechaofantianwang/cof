const DB_NAME = "ccb_chat_db"
const DB_VERSION = 1
const STORE_NAME = 'message'

let dbInstance = null
/**
 * 初始化/打开数据库
 * @returns {Promise<IDBDatabase>}
 */
export function openDB() {
    return new Promise((resolve, reject) => {
        if (dbInstance) {
            resolve(dbInstance)
            return
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION)
        request.onupgradeneeded = (event) => {
            const db = event.target.result
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: '_id' })
                store.createIndex('conversationKey', 'conversationKey', { unique: false })
                // 创建索引：按时间排序
                store.createIndex('time', 'time', { unique: false })
            }
        }
        request.onsuccess = (event) => {
            dbInstance = event.target.result
            resolve(dbInstance)
        }

        request.onerror = (event) => {
            reject(event.target.error)
        }

    })
}

/**
 * 生成对话标识（确保双方ID的组合唯一且一致）
 * @param {string} myId - 我的用户ID
 * @param {string} friendId - 好友的用户ID
 * @returns {string}
 */

export function getConversationKey(myId, friendId) {
    // 按字母顺序排列，确保 A-B 和 B-A 生成相同的 key
    return [myId, friendId].sort().join('_')
}

/**
 * 保存消息到本地（批量）
 * @param {Array} messages - 消息数组
 * @param {string} myId - 当前用户ID
 */
export async function saveMessages(messages, myId) {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)

    for (const msg of messages) {
        // 为每条消息添加 conversationKey，用于后续查询
        const friendId = msg.from === myId ? msg.to : msg.from
        msg.conversationKey = getConversationKey(myId, friendId)
        store.put(msg)  // put 会自动更新已存在的记录
    }

    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
    })
}

/**
 * 获取与某好友的所有本地消息
 * @param {string} myId - 当前用户ID
 * @param {string} friendId - 好友ID
 * @returns {Promise<Array>}
 */
export async function getMessages(myId, friendId) {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const index = store.index('conversationKey')
    const key = getConversationKey(myId, friendId)

    return new Promise((resolve, reject) => {
        const request = index.getAll(key)
        request.onsuccess = () => {
            // 按时间排序
            const messages = request.result.sort((a, b) =>
                new Date(a.time) - new Date(b.time)
            )
            resolve(messages)
        }
        request.onerror = () => reject(request.error)
    })
}


/**
 * 获取与某好友的最新消息时间（用于增量同步）
 * @param {string} myId - 当前用户ID
 * @param {string} friendId - 好友ID
 * @returns {Promise<string|null>} ISO 时间字符串或 null
 */
export async function getLastSyncTime(myId, friendId) {
    const messages = await getMessages(myId, friendId)
    if (messages.length === 0) return null

    // 找到最新的消息时间
    const lastMsg = messages[messages.length - 1]
    return lastMsg.createdAt || lastMsg.time
}