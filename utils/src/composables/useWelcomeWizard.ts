import { ref, inject } from 'vue'
import { configApi } from '@/api'
import { isElectron } from '@/utils/env'

export function useWelcomeWizard() {
  const showWelcomeWizard = ref(false)
  const showSnackbar = inject('showSnackbar') as (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void

  async function checkFirstTime() {
    try {
      let config

      if (isElectron()) {
        config = await window.electronAPI.loadConfig()
      } else {
        const response = await fetch('http://localhost:3000/api/config')
        config = await response.json()
      }

      if (!config || !config.mysql || !config.mysql.host) {
        showWelcomeWizard.value = true
      }
    } catch (error) {
      console.error('Check first time error:', error)
      showWelcomeWizard.value = true
    }
  }

  function onWizardComplete() {
    showWelcomeWizard.value = false
    showSnackbar('配置完成，欢迎使用！', 'success')
  }

  return {
    showWelcomeWizard,
    checkFirstTime,
    onWizardComplete
  }
}
