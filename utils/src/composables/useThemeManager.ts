import { watch } from 'vue'
import { useTheme } from 'vuetify'
import { useThemeStore } from '@/stores/theme'

export function useThemeManager() {
  const themeStore = useThemeStore()
  const vuetifyTheme = useTheme()

  function applyTheme() {
    const themeName = themeStore.isDark ? 'dark' : 'light'
    console.log('[ThemeManager] applyTheme - isDark:', themeStore.isDark, 'themeName:', themeName)
    vuetifyTheme.global.name.value = themeName
    console.log('[ThemeManager] 主题已切换为:', themeName)
  }

  async function initTheme() {
    console.log('[ThemeManager] initTheme - start, currentTheme:', themeStore.currentTheme)
    await themeStore.loadTheme()
    console.log('[ThemeManager] initTheme - after loadTheme, currentTheme:', themeStore.currentTheme)
    applyTheme()
  }

  watch(() => themeStore.isDark, applyTheme)

  return {
    themeStore,
    applyTheme,
    initTheme
  }
}
