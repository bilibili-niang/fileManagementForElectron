import {defineStore} from 'pinia'
import {ref, computed} from 'vue'

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

/**
 * 主题 Store
 * 管理应用的主题状态,支持浅色、深色和自动模式
 */
export const useThemeStore = defineStore('theme', () => {
  /**
   * 当前主题
   */
  const currentTheme = ref<ThemeType>('light')

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
    try {
      const isElectron = !!(window as any).electronAPI?.loadConfig
      if (isElectron) {
        const config = await window.electronAPI.loadConfig()
        currentTheme.value = config.theme || 'light'
      } else {
        const saved = localStorage.getItem('app-theme')
        if (saved) {
          currentTheme.value = saved as ThemeType
        }
      }
    } catch (error) {
      console.error('Failed to load theme:', error)
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
      const isElectron = !!(window as any).electronAPI?.loadConfig
      if (isElectron) {
        const config = await window.electronAPI.loadConfig()
        config.theme = theme
        await window.electronAPI.saveConfig(config)
      }
      localStorage.setItem('app-theme', theme)
    } catch (error) {
      console.error('Failed to save theme:', error)
      localStorage.setItem('app-theme', theme)
    }
  }

  /**
   * 切换主题
   * 循环切换: light -> dark -> auto -> light
   */
  async function toggleTheme() {
    const themes: ThemeType[] = ['light', 'dark', 'auto']
    const currentIndex = themes.indexOf(currentTheme.value)
    const nextIndex = (currentIndex + 1) % themes.length
    await setTheme(themes[nextIndex])
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
