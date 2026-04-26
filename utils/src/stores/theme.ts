import {defineStore} from 'pinia'
import {ref, computed} from 'vue'
import {isElectron} from '@/utils/env'

/**
 * 主题类型
 */
export type ThemeType = 'light' | 'dark' | 'auto'

/**
 * 主题配置接口
 */
export interface ThemeConfig {
  theme: ThemeType
}

const DEFAULT_THEME: ThemeType = 'light'

/**
 * 同步从 localStorage 获取初始主题
 */
const getInitialTheme = (): ThemeType => {
  try {
    const saved = localStorage.getItem('app-theme')
    console.log('[ThemeStore] getInitialTheme - localStorage app-theme:', saved)
    const result = (saved as ThemeType) || DEFAULT_THEME
    console.log('[ThemeStore] getInitialTheme - result:', result)
    return result
  } catch {
    return DEFAULT_THEME
  }
}

/**
 * 主题 Store
 * 管理应用的主题状态,支持浅色、深色和自动模式
 */
export const useThemeStore = defineStore('theme', () => {
  /**
   * 当前主题
   */
  const currentTheme = ref<ThemeType>(getInitialTheme())

  /**
   * 是否为深色模式
   */
  const isDark = computed(() => {
    if (currentTheme.value === 'auto') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return currentTheme.value === 'dark'
  })

  /**
   * 主题图标
   */
  const themeIcon = computed(() => {
    switch (currentTheme.value) {
      case 'light':
        return 'mdi-white-balance-sunny'
      case 'dark':
        return 'mdi-weather-night'
      case 'auto':
        return 'mdi-theme-light-dark'
      default:
        return 'mdi-white-balance-sunny'
    }
  })

  /**
   * 主题名称
   */
  const themeName = computed(() => {
    switch (currentTheme.value) {
      case 'light':
        return '浅色模式'
      case 'dark':
        return '深色模式'
      case 'auto':
        return '跟随系统'
      default:
        return '浅色模式'
    }
  })

  /**
   * 加载主题配置
   */
  async function loadTheme() {
    console.log('[ThemeStore] loadTheme - start')
    try {
      const electronEnv = isElectron()
      console.log('[ThemeStore] loadTheme - isElectron:', electronEnv)
      if (electronEnv) {
        const config = await window.electronAPI.loadConfig()
        console.log('[ThemeStore] loadTheme - electron config:', config)
        if (config?.theme) {
          currentTheme.value = config.theme
        }
      } else {
        const saved = localStorage.getItem('app-theme')
        console.log('[ThemeStore] loadTheme - localStorage saved:', saved)
        if (saved) {
          currentTheme.value = saved as ThemeType
        }
      }
      console.log('[ThemeStore] loadTheme - currentTheme after load:', currentTheme.value)
    } catch (error) {
      console.error('[ThemeStore] Failed to load theme:', error)
      const saved = localStorage.getItem('app-theme')
      if (saved) {
        currentTheme.value = saved as ThemeType
      }
    }
  }

  /**
   * 设置主题
   */
  async function setTheme(theme: ThemeType) {
    currentTheme.value = theme
    try {
      const electronEnv = isElectron()
      if (electronEnv) {
        const config = await window.electronAPI.loadConfig()
        config.theme = theme
        await window.electronAPI.saveConfig(config)
      }
      localStorage.setItem('app-theme', theme)
    } catch (error) {
      console.error('[ThemeStore] Failed to save theme:', error)
      localStorage.setItem('app-theme', theme)
    }
  }

  /**
   * 切换主题
   * 循环切换: light -> dark -> light
   */
  async function toggleTheme() {
    const nextTheme = currentTheme.value === 'light' ? 'dark' : 'light'
    await setTheme(nextTheme)
  }

  return {
    currentTheme,
    isDark,
    themeIcon,
    themeName,
    loadTheme,
    setTheme,
    toggleTheme
  }
})
