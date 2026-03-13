import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface Config {
  mysql: {
    host: string
    port: number
    username: string
    password: string
    database: string
  }
  indexing: {
    excludeC: boolean
    excludeNodeModules: boolean
    lastIndexed: string | null
    schedule: string
  }
}

export const useConfigStore = defineStore('config', () => {
  const config = ref<Config | null>(null)
  const hasConfig = computed(() => config.value !== null)

  async function loadConfig() {
    try {
      const result = await window.electronAPI.loadConfig()
      config.value = result
    } catch (error) {
      console.error('Failed to load config:', error)
    }
  }

  async function saveConfig(newConfig: Config) {
    try {
      await window.electronAPI.saveConfig(newConfig)
      config.value = newConfig
    } catch (error) {
      console.error('Failed to save config:', error)
      throw error
    }
  }

  async function testConnection(newConfig: Config) {
    try {
      await window.electronAPI.testDatabaseConnection(newConfig)
      return true
    } catch (error) {
      console.error('Connection test failed:', error)
      throw error
    }
  }

  return {
    config,
    hasConfig,
    loadConfig,
    saveConfig,
    testConnection
  }
})
