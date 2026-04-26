import { ref, provide } from 'vue'

export function useSnackbar() {
  const snackbar = ref({
    show: false,
    message: '',
    color: 'info',
    icon: 'mdi-information',
    timeout: 3000
  })

  function showSnackbar(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') {
    const config = {
      success: {color: 'success', icon: 'mdi-check-circle'},
      error: {color: 'error', icon: 'mdi-alert-circle'},
      warning: {color: 'warning', icon: 'mdi-alert'},
      info: {color: 'info', icon: 'mdi-information'}
    }

    snackbar.value = {
      show: true,
      message,
      color: config[type].color,
      icon: config[type].icon,
      timeout: type === 'error' ? 5000 : 3000
    }
  }

  provide('showSnackbar', showSnackbar)

  return {
    snackbar,
    showSnackbar
  }
}
