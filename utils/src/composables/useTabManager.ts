import { ref, watch } from 'vue'
import { isElectron } from '@/utils/env'

const DEFAULT_TAB = 'qrcode'

/**
 * 同步从 localStorage 获取初始标签页
 */
const getInitialTab = (): string => {
  try {
    const saved = localStorage.getItem('active-tab')
    console.log('[TabManager] getInitialTab - localStorage active-tab:', saved)
    const result = saved || DEFAULT_TAB
    console.log('[TabManager] getInitialTab - result:', result)
    return result
  } catch {
    return DEFAULT_TAB
  }
}

export function useTabManager() {
  const activeTab = ref(getInitialTab())

  async function loadSavedTab() {
    console.log('[TabManager] loadSavedTab - start, activeTab:', activeTab.value)
    try {
      const electronEnv = isElectron()
      console.log('[TabManager] loadSavedTab - isElectron:', electronEnv)
      if (electronEnv) {
        const config = await window.electronAPI.loadConfig()
        console.log('[TabManager] loadSavedTab - electron config.activeTab:', config.activeTab)
        if (config.activeTab) {
          activeTab.value = config.activeTab
        }
      } else {
        const saved = localStorage.getItem('active-tab')
        console.log('[TabManager] loadSavedTab - localStorage saved:', saved)
        if (saved) {
          activeTab.value = saved
        }
      }
      console.log('[TabManager] loadSavedTab - activeTab after load:', activeTab.value)
    } catch (error) {
      console.error('Failed to load saved tab:', error)
    }
  }

  async function saveActiveTab(tab: string) {
    try {
      const electronEnv = isElectron()
      if (electronEnv) {
        const config = await window.electronAPI.loadConfig()
        config.activeTab = tab
        await window.electronAPI.saveConfig(config)
      }
      localStorage.setItem('active-tab', tab)
    } catch (error) {
      console.error('Failed to save active tab:', error)
    }
  }

  watch(activeTab, (newTab) => {
    saveActiveTab(newTab)
  })

  return {
    activeTab,
    loadSavedTab,
    saveActiveTab
  }
}
