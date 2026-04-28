import {watch} from 'vue'
import {useTheme} from 'vuetify'
import {useThemeStore} from '@/stores/theme'

export function useThemeManager() {
  const themeStore = useThemeStore()
  const vuetifyTheme = useTheme()
  
  function applyTheme() {
    const themeName = themeStore.isDark ? 'dark' : 'light'
    vuetifyTheme.global.name.value = themeName
  }
  
  async function initTheme() {
    await themeStore.loadTheme()
    applyTheme()
  }
  
  watch(() => themeStore.isDark, applyTheme)
  
  return {
    themeStore,
    applyTheme,
    initTheme
  }
}
