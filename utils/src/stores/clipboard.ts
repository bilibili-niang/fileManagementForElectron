import { defineStore } from 'pinia'
import { ref } from 'vue'
import { isElectron } from '@/utils/env'

export interface ClipboardItem {
  id: string
  content: string
  type: 'text' | 'image' | 'files'
  sourceApp: string
  timestamp: number
}

const STORAGE_KEY = 'clipboard-history'
const MAX_ITEMS = 100

export const useClipboardStore = defineStore('clipboard', () => {
  const history = ref<ClipboardItem[]>([])
  const isListening = ref(false)
  const isElectronEnv = isElectron()

  // 从 localStorage 加载历史
  function loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        history.value = JSON.parse(stored)
      }
    } catch (error) {
      console.error('Failed to load clipboard history:', error)
    }
  }

  // 保存到 localStorage
  function saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history.value))
    } catch (error) {
      console.error('Failed to save clipboard history:', error)
    }
  }

  // 添加新条目
  function addItem(item: Omit<ClipboardItem, 'id'>) {
    // 避免重复（相同内容不重复添加）
    const exists = history.value.some(h => h.content === item.content)
    if (exists) return

    const newItem: ClipboardItem = {
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }

    history.value.unshift(newItem)

    // 限制最大数量
    if (history.value.length > MAX_ITEMS) {
      history.value = history.value.slice(0, MAX_ITEMS)
    }

    saveToStorage()
  }

  // 删除条目
  function removeItem(id: string) {
    history.value = history.value.filter(item => item.id !== id)
    saveToStorage()
  }

  // 清空历史
  function clearHistory() {
    history.value = []
    saveToStorage()
  }

  /**
   * 复制到剪贴板
   */
  async function copyToClipboard(content: string) {
    try {
      if (isElectronEnv) {
        await window.electronAPI.writeClipboardText(content)
      } else {
        await navigator.clipboard.writeText(content)
      }
      return true
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      return false
    }
  }

  /**
   * 启动监听
   */
  function startListening() {
    if (isListening.value || !isElectronEnv) return

    window.electronAPI.onClipboardChange((data) => {
      addItem({
        content: data.content,
        type: data.type as 'text' | 'image' | 'files',
        sourceApp: data.sourceApp,
        timestamp: data.timestamp
      })
    })

    isListening.value = true
  }

  /**
   * 停止监听
   */
  function stopListening() {
    if (isElectronEnv) {
      window.electronAPI.removeClipboardListener('clipboard-change')
    }
    isListening.value = false
  }

  /**
   * 初始化
   */
  function init() {
    loadFromStorage()
    if (isElectronEnv) {
      startListening()
    }
  }

  return {
    history,
    isListening,
    addItem,
    removeItem,
    clearHistory,
    copyToClipboard,
    startListening,
    stopListening,
    init
  }
})