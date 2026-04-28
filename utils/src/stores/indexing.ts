import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { searchApi } from '@/api'

/**
 * 文件分类统计
 */
export interface FileCounts {
  all: number
  images: number
  videos: number
  audio: number
  documents: number
  code: number
  archives: number
  executables: number
  other: number
}

/**
 * 索引进度状态管理 Store
 * 全局管理文件索引进度，所有页面共享同一状态
 */
export const useIndexingStore = defineStore('indexing', () => {
  // ==================== State ====================

  /**
   * 是否正在索引
   */
  const isIndexing = ref(false)

  /**
   * 当前已索引文件数
   */
  const currentFile = ref(0)

  /**
   * 总文件数
   */
  const totalFiles = ref(0)

  /**
   * 当前正在索引的文件路径
   */
  const currentPath = ref('')

  /**
   * 是否正在轮询
   */
  const isPolling = ref(false)

  /**
   * 文件分类统计
   */
  const fileCounts = ref<FileCounts>({
    all: 0,
    images: 0,
    videos: 0,
    audio: 0,
    documents: 0,
    code: 0,
    archives: 0,
    executables: 0,
    other: 0
  })

  // ==================== Getters ====================

  /**
   * 计算进度百分比
   */
  const progress = computed(() => {
    if (totalFiles.value === 0) return 0
    return (currentFile.value / totalFiles.value) * 100
  })

  /**
   * 进度文本显示
   */
  const progressText = computed(() => {
    return `${currentFile.value} / ${totalFiles.value}`
  })

  // ==================== Actions ====================

  let pollingInterval: number | null = null

  /**
   * 检查当前索引进度状态
   * @returns 索引进度信息
   */
  async function checkStatus() {
    try {
      const result = await searchApi.getIndexingProgress()

      isIndexing.value = result.isIndexing
      currentFile.value = result.currentFile || 0
      totalFiles.value = result.totalFiles || 0
      currentPath.value = result.currentPath || ''

      return result
    } catch (error) {
      console.error('[IndexingStore] Failed to check status:', error)
      return null
    }
  }

  /**
   * 开始轮询索引进度
   * 全局只有一个轮询在运行
   */
  function startPolling() {
    // 如果已经在轮询，不重复启动
    if (pollingInterval) {
      return
    }

    isPolling.value = true

    // 立即检查一次
    checkStatus()

    // 每秒轮询一次
    pollingInterval = window.setInterval(async () => {
      const result = await checkStatus()

      // 如果索引完成，自动停止轮询
      if (result && !result.isIndexing) {
        stopPolling()
        // 索引完成后刷新文件统计
        await refreshFileCounts()
      }
    }, 1000)
  }

  /**
   * 停止轮询
   */
  function stopPolling() {
    if (pollingInterval) {
      clearInterval(pollingInterval)
      pollingInterval = null
    }
    isPolling.value = false
  }

  /**
   * 开始索引
   * @param drives - 驱动器列表
   */
  async function startIndexing(drives: string[]) {
    try {
      await searchApi.startIndexing(drives)
      startPolling()
    } catch (error) {
      console.error('[IndexingStore] Failed to start indexing:', error)
      throw error
    }
  }

  /**
   * 停止索引
   */
  async function stopIndexing() {
    try {
      await searchApi.stopIndexing()
      stopPolling()
    } catch (error) {
      console.error('[IndexingStore] Failed to stop indexing:', error)
      throw error
    }
  }

  /**
   * 强制重新索引
   * @param drives - 驱动器列表
   */
  async function forceReindex(drives: string[]) {
    try {
      await searchApi.forceReindex(drives)
      startPolling()
    } catch (error) {
      console.error('[IndexingStore] Failed to force reindex:', error)
      throw error
    }
  }

  /**
   * 刷新文件分类统计
   */
  async function refreshFileCounts() {
    try {
      const counts = await searchApi.getFileCounts()
      fileCounts.value = {
        all: counts.all || 0,
        images: counts.image || 0,
        videos: counts.video || 0,
        audio: counts.audio || 0,
        documents: counts.document || 0,
        code: counts.code || 0,
        archives: counts.archive || 0,
        executables: counts.executable || 0,
        other: counts.other || 0
      }
    } catch (error) {
      console.error('[IndexingStore] Failed to refresh file counts:', error)
    }
  }

  /**
   * 初始化 Store
   * 检查当前状态，如果正在索引则启动轮询
   */
  async function initialize() {
    const result = await checkStatus()
    if (result?.isIndexing) {
      startPolling()
    }
    // 同时刷新文件统计
    await refreshFileCounts()
  }

  return {
    // State
    isIndexing,
    currentFile,
    totalFiles,
    currentPath,
    isPolling,
    fileCounts,
    // Getters
    progress,
    progressText,
    // Actions
    checkStatus,
    startPolling,
    stopPolling,
    startIndexing,
    stopIndexing,
    forceReindex,
    refreshFileCounts,
    initialize
  }
})
