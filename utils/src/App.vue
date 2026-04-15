<template>
  <v-app class="app-container">
    <!-- 首次引导 -->
    <WelcomeWizard v-model="showWelcomeWizard" @complete="onWizardComplete"/>

    <!-- 自定义标题栏 -->
    <WindowTitleBar v-if="!showWelcomeWizard">
      <v-tabs v-model="activeTab" bg-color="transparent" density="compact" class="app-tabs" hide-slider>
        <v-tab value="qrcode" class="text-caption app-tab">二维码生成</v-tab>
        <v-tab value="category" class="text-caption app-tab">分类浏览</v-tab>
        <v-tab value="filelist" class="text-caption app-tab">文件列表</v-tab>
        <v-tab value="search" class="text-caption app-tab">文件搜索</v-tab>
        <v-tab value="network" class="text-caption app-tab">网络模拟</v-tab>
        <v-tab value="settings" class="text-caption app-tab">设置</v-tab>
      </v-tabs>
    </WindowTitleBar>

    <v-main class="main-content" v-if="!showWelcomeWizard">
      <v-container fluid class="pa-0">
        <v-window v-model="activeTab" class="app-window">
          <v-window-item value="qrcode">
            <QrCodeGenerator/>
          </v-window-item>

          <v-window-item value="category">
            <FileCategory/>
          </v-window-item>

          <v-window-item value="filelist">
            <FileList/>
          </v-window-item>

          <v-window-item value="search">
            <FileSearch/>
          </v-window-item>

          <v-window-item value="network">
            <NetworkMock/>
          </v-window-item>

          <v-window-item value="settings">
            <Settings/>
          </v-window-item>
        </v-window>
      </v-container>
    </v-main>

    <DatabaseConfigDialog v-model="showConfigDialog"/>
    <FileEditorDialog
        v-model="showFileEditor"
        :file-path="currentFile.path"
        :file-name="currentFile.name"
        :file-content="currentFile.content"
        @save="handleFileSave"
    />
    <ImagePreviewDialog
        v-model="showImagePreview"
        :file-path="currentFile.path"
        :file-name="currentFile.name"
    />
    <DocxPreviewDialog
        v-model="showDocxPreview"
        :file-path="currentFile.path"
        :file-name="currentFile.name"
    />
    <MediaPlayerDialog
        v-model="showMediaPlayer"
        :file-path="currentFile.path"
        :file-name="currentFile.name"
        :file-size="currentFile.size"
    />
    <PdfPreviewDialog
        v-model="showPdfPreview"
        :file-path="currentFile.path"
        :file-name="currentFile.name"
    />

    <!-- 全局索引进度条 - 底部悬浮 -->
    <v-slide-y-reverse-transition>
      <v-card
        v-if="isIndexing"
        class="indexing-status-bar"
        flat
        density="compact"
        @mouseenter="showIndexDetails = true"
        @mouseleave="showIndexDetails = false"
      >
        <!-- 简洁模式 - 默认显示 -->
        <v-card-text class="py-1 px-3">
          <div class="d-flex align-center">
            <v-icon icon="mdi-sync" class="mr-2 rotating" size="small"></v-icon>
            <span class="text-caption mr-2">正在索引...</span>
            <v-progress-linear
              :model-value="indexProgress.progress"
              height="4"
              color="primary"
              class="flex-grow-1"
              striped
              animated
            ></v-progress-linear>
            <span class="text-caption text-grey ml-2">{{ indexProgress.progress }}%</span>
          </div>
        </v-card-text>

        <!-- 详情模式 - hover 显示 -->
        <v-expand-transition>
          <div v-show="showIndexDetails" class="index-details">
            <v-divider></v-divider>
            <v-card-text class="py-2 px-3">
              <div class="d-flex justify-space-between text-caption mb-1">
                <span class="text-grey">当前目录:</span>
                <span class="text-truncate ml-2" style="max-width: 300px;">{{ indexProgress.currentDrive || '-' }}</span>
              </div>
              <div class="d-flex justify-space-between text-caption mb-1">
                <span class="text-grey">当前文件:</span>
                <span class="text-truncate ml-2" style="max-width: 300px;">{{ indexProgress.currentPath ? indexProgress.currentPath.split('\\').pop() : '-' }}</span>
              </div>
              <div class="d-flex justify-space-between text-caption">
                <span class="text-grey">已索引:</span>
                <span>{{ indexProgress.filesIndexed }} 个文件</span>
              </div>
            </v-card-text>
          </div>
        </v-expand-transition>
      </v-card>
    </v-slide-y-reverse-transition>

    <!-- 全局 Snackbar -->
    <v-snackbar
        v-model="snackbar.show"
        :color="snackbar.color"
        :timeout="snackbar.timeout"
        location="top"
        :style="{ top: '48px' }"
    >
      <div class="d-flex align-center">
        <v-icon :icon="snackbar.icon" class="mr-2"></v-icon>
        {{ snackbar.message }}
      </div>
      <template v-slot:actions>
        <v-btn
            variant="text"
            icon="mdi-close"
            @click="snackbar.show = false"
        ></v-btn>
      </template>
    </v-snackbar>
  </v-app>
</template>

<script setup lang="ts">
import {ref, onMounted, provide, watch} from 'vue'
import {useTheme} from 'vuetify'
import FileSearch from '@/views/FileSearch/index.vue'
import FileCategory from '@/views/FileCategory/index.vue'
import FileList from '@/views/FileList/index.vue'
import Settings from '@/views/Settings/index.vue'
import QrCodeGenerator from '@/views/QrCodeGenerator/index.vue'
import NetworkMock from '@/views/NetworkMock/index.vue'
import DatabaseConfigDialog from '@/components/DatabaseConfigDialog/index.vue'
import FileEditorDialog from '@/components/FileEditorDialog/index.vue'
import ImagePreviewDialog from '@/components/ImagePreviewDialog/index.vue'
import DocxPreviewDialog from '@/components/DocxPreviewDialog/index.vue'
import MediaPlayerDialog from '@/components/MediaPlayerDialog/index.vue'
import PdfPreviewDialog from '@/components/PdfPreviewDialog/index.vue'
import WindowTitleBar from '@/components/WindowTitleBar/index.vue'
import WelcomeWizard from '@/components/WelcomeWizard/index.vue'
import {useConfigStore} from '@/stores/config'
import {useThemeStore} from '@/stores/theme'
import {fileApi, configApi} from '@/api'

/**
 * 当前激活的 tab
 * 从 localStorage 恢复,默认为 qrcode
 */
const activeTab = ref('qrcode')

/**
 * 加载保存的 tab
 */
async function loadSavedTab() {
  try {
    const isElectron = !!(window as any).electronAPI?.loadConfig
    if (isElectron) {
      const config = await window.electronAPI.loadConfig()
      if (config.activeTab) {
        activeTab.value = config.activeTab
      }
    } else {
      const saved = localStorage.getItem('active-tab')
      if (saved) {
        activeTab.value = saved
      }
    }
  } catch (error) {
    console.error('Failed to load saved tab:', error)
  }
}

/**
 * 保存当前 tab
 */
async function saveActiveTab(tab: string) {
  try {
    const isElectron = !!(window as any).electronAPI?.loadConfig
    if (isElectron) {
      const config = await window.electronAPI.loadConfig()
      if (config) {
        config.activeTab = tab
        await window.electronAPI.saveConfig(config)
      }
    }
    localStorage.setItem('active-tab', tab)
  } catch (error) {
    console.error('Failed to save active tab:', error)
  }
}

const showConfigDialog = ref(false)
const showFileEditor = ref(false)
const showImagePreview = ref(false)
const showDocxPreview = ref(false)
const showMediaPlayer = ref(false)
const showPdfPreview = ref(false)
const showWelcomeWizard = ref(false)
const configStore = useConfigStore()
const themeStore = useThemeStore()
const vuetifyTheme = useTheme()

// 检查是否需要显示首次引导
async function checkFirstTime() {
  try {
    const config = await configApi.loadConfig()

    // 如果没有配置或数据库未配置，显示引导
    if (!config || !config.mysql || !config.mysql.host) {
      showWelcomeWizard.value = true
    }
  } catch (error) {
    console.error('Check first time error:', error)
    // 出错时也显示引导
    showWelcomeWizard.value = true
  }
}

// 引导完成
function onWizardComplete() {
  showWelcomeWizard.value = false
  showSnackbar('配置完成，欢迎使用！', 'success')
}

const currentFile = ref({
  path: '',
  name: '',
  content: '',
  size: 0
})

// Snackbar 状态
const snackbar = ref({
  show: false,
  message: '',
  color: 'info',
  icon: 'mdi-information',
  timeout: 3000
})

// 显示 Snackbar 的方法
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

// 提供全局方法
provide('showSnackbar', showSnackbar)

// 图片扩展名列表
const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg']

// docx 扩展名
const docxExtensions = ['docx']

// pdf 扩展名
const pdfExtensions = ['pdf']

// 音频扩展名
const audioExtensions = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a']

// 视频扩展名
const videoExtensions = ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm']

// 提供打开图片预览的方法
provide('openImagePreview', (filePath: string) => {
  console.log('[App] 打开图片预览:', filePath)
  const fileName = filePath.split('\\').pop() || ''
  currentFile.value = {
    path: filePath,
    name: fileName,
    content: ''
  }
  showImagePreview.value = true
})

// 提供打开 PDF 预览的方法
provide('openPdfPreview', (filePath: string) => {
  console.log('[App] 打开 PDF 预览:', filePath)
  const fileName = filePath.split('\\').pop() || ''
  currentFile.value = {
    path: filePath,
    name: fileName,
    content: ''
  }
  showPdfPreview.value = true
})

// 提供打开 DOCX 预览的方法
provide('openDocxPreview', (filePath: string) => {
  console.log('[App] 打开 DOCX 预览:', filePath)
  const fileName = filePath.split('\\').pop() || ''
  currentFile.value = {
    path: filePath,
    name: fileName,
    content: ''
  }
  showDocxPreview.value = true
})

// 提供打开媒体播放器的方法
provide('openMediaPlayer', (filePath: string, fileSize?: number) => {
  console.log('[App] 打开媒体播放器:', filePath)
  const fileName = filePath.split('\\').pop() || ''
  currentFile.value = {
    path: filePath,
    name: fileName,
    content: '',
    size: fileSize || 0
  }
  showMediaPlayer.value = true
})

// 提供打开文件编辑器的方法
provide('openFileEditor', async (dirPath: string, fileName: string) => {
  console.log('[App] 打开文件:', dirPath, fileName)

  // 组合完整文件路径
  const filePath = `${dirPath}\\${fileName}`
  console.log('[App] 完整文件路径:', filePath)

  // 获取文件扩展名
  const ext = fileName.split('.').pop()?.toLowerCase() || ''

  // 如果是图片文件，使用图片预览
  if (imageExtensions.includes(ext)) {
    console.log('[App] 打开图片预览:', fileName)
    currentFile.value = {
      path: filePath,
      name: fileName,
      content: ''
    }
    showImagePreview.value = true
    return
  }

  // 如果是 docx 文件，使用 docx 预览
  if (docxExtensions.includes(ext)) {
    console.log('[App] 打开 docx 预览:', fileName)
    currentFile.value = {
      path: filePath,
      name: fileName,
      content: ''
    }
    showDocxPreview.value = true
    return
  }

  // 如果是 PDF 文件，使用 PDF 预览
  if (pdfExtensions.includes(ext)) {
    console.log('[App] 打开 PDF 预览:', fileName)
    currentFile.value = {
      path: filePath,
      name: fileName,
      content: ''
    }
    showPdfPreview.value = true
    return
  }

  // 如果是文本文件，使用 Monaco Editor
  try {
    console.log('[App] 读取文本文件:', filePath)
    const result = await window.electronAPI.readFile(filePath)
    console.log('[App] 读取文件结果:', result)

    if (result.success) {
      currentFile.value = {
        path: filePath,
        name: fileName,
        content: result.content
      }
      showFileEditor.value = true
    } else {
      showSnackbar('无法打开文件: ' + (result.error || ''), 'error')
    }
  } catch (error) {
    console.error('打开文件失败:', error)
    showSnackbar('打开文件失败: ' + (error as Error).message, 'error')
  }
})

async function handleFileSave(content: string) {
  console.log('[App] 保存文件内容:', content.substring(0, 100) + '...')

  try {
    const result = await fileApi.saveFile(currentFile.value.path, content)
    if (result.success) {
      showSnackbar('文件已保存', 'success')
    } else {
      showSnackbar('保存失败', 'error')
    }
  } catch (error) {
    console.error('保存文件失败:', error)
    showSnackbar('保存文件失败: ' + (error as Error).message, 'error')
  }
}

/**
 * 应用主题到 Vuetify
 */
function applyTheme() {
  const themeName = themeStore.isDark ? 'dark' : 'light'
  vuetifyTheme.global.name.value = themeName
  console.log('[App] 主题已切换为:', themeName)
}

// 监听主题变化
watch(() => themeStore.isDark, applyTheme, {immediate: true})

// 监听 tab 变化,自动保存
watch(activeTab, (newTab) => {
  saveActiveTab(newTab)
})

// ==================== 索引状态管理 ====================
const isIndexing = ref(false)
const indexProgress = ref({
  currentDrive: '',
  progress: 0,
  currentPath: '',
  filesIndexed: 0
})
const indexComplete = ref(false)
const indexStats = ref({
  totalFiles: 0,
  duration: 0
})
const showIndexDetails = ref(false)
let indexProgressInterval: number | null = null

// 提供索引状态给子组件
provide('isIndexing', isIndexing)
provide('indexProgress', indexProgress)
provide('indexComplete', indexComplete)
provide('indexStats', indexStats)

// 轮询索引进度
async function pollIndexingProgress() {
  try {
    const result = await window.electronAPI.getIndexingProgress()
    console.log('[App] 索引进度:', result)
    
    if (result.isIndexing) {
      isIndexing.value = true
      indexProgress.value = {
        currentDrive: result.currentDrive || '',
        progress: Math.round(result.progress || 0),
        currentPath: result.currentPath || '',
        filesIndexed: result.filesIndexed || 0
      }
    } else if (isIndexing.value && !result.isIndexing) {
      // 索引完成了
      isIndexing.value = false
      indexComplete.value = true
      indexStats.value = {
        totalFiles: result.totalFiles || 0,
        duration: result.duration || 0
      }
      showSnackbar(`索引完成！共索引 ${result.totalFiles || 0} 个文件`, 'success')
      
      // 停止轮询
      if (indexProgressInterval) {
        clearInterval(indexProgressInterval)
        indexProgressInterval = null
      }
    }
  } catch (error) {
    console.error('[App] 获取索引进度失败:', error)
  }
}

// 开始索引
async function startAutoIndex() {
  try {
    // 使用 getScanRoots 获取扫描目录
    const scanRootsResult = await window.electronAPI.getScanRoots()
    console.log('[App] 扫描目录配置:', scanRootsResult)
    
    // 兼容不同的返回格式
    let roots: string[] = []
    if (scanRootsResult && scanRootsResult.roots && Array.isArray(scanRootsResult.roots)) {
      roots = scanRootsResult.roots
    } else if (scanRootsResult && Array.isArray(scanRootsResult)) {
      roots = scanRootsResult
    }
    
    if (roots.length === 0) {
      console.log('[App] 没有配置扫描目录，跳过自动索引')
      return
    }

    console.log('[App] 开始自动索引，目录:', roots)
    isIndexing.value = true
    indexComplete.value = false
    indexProgress.value = {
      currentDrive: roots[0],
      progress: 0,
      currentPath: '',
      filesIndexed: 0
    }

    // 先检查是否已经在索引中
    const progressResult = await window.electronAPI.getIndexingProgress()
    if (progressResult.isIndexing) {
      console.log('[App] 索引已在进行中')
      // 开始轮询进度
      indexProgressInterval = window.setInterval(pollIndexingProgress, 1000)
      return
    }

    // 调用开始索引
    const result = await window.electronAPI.startIndex(roots)
    if (result.success) {
      console.log('[App] 索引已启动')
      // 开始轮询进度
      indexProgressInterval = window.setInterval(pollIndexingProgress, 1000)
    } else {
      console.error('[App] 启动索引失败:', result.error)
      isIndexing.value = false
      showSnackbar('启动索引失败: ' + (result.error || ''), 'error')
    }
  } catch (error) {
    console.error('[App] 自动索引失败:', error)
    isIndexing.value = false
    showSnackbar('自动索引失败: ' + (error as Error).message, 'error')
  }
}

onMounted(async () => {
  // 加载保存的 tab
  await loadSavedTab()

  // 加载主题配置
  await themeStore.loadTheme()
  applyTheme()

  // 检查后端服务是否可用
  try {
    const health = await configApi.healthCheck()
    console.log('后端服务状态:', health)
  } catch (error) {
    console.error('后端服务不可用:', error)
    showSnackbar('后端服务不可用，请检查后端是否启动/端口是否被占用', 'warning')
  }

  await configStore.loadConfig()

  // 跳过首次引导检查,直接显示主界面
  showWelcomeWizard.value = false

  // 启动自动索引
  await startAutoIndex()
})
</script>

<style>
/* 全局样式 */
html, body, #app {
  height: 100%;
  overflow: hidden;
}

html {
  overflow-y: auto !important;
}

body {
  font-family: 'Roboto', 'Microsoft YaHei', sans-serif;
  margin: 0;
  padding: 0;
}

/* 应用容器占满全屏 */
.v-application {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

/* 去除 v-container 的 padding */
.v-container {
  padding: 0 !important;
  height: auto;
}

/* 去除 v-main 的 padding */
.v-main {
  padding: 0 !important;
  flex: 1;
  overflow: auto;
  display: flex;
  flex-direction: column;
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
}

::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #555;
}

/* 应用容器 */
.app-container {
  padding-top: 36px !important;
}

/* 主内容区域 */
.main-content {
  padding: 0 !important;
}

/* 应用标签栏 */
.app-tabs {
  min-height: 36px !important;
  height: 36px !important;
}

.app-tabs .v-tab {
  min-height: 32px !important;
  height: 32px !important;
  padding: 0 12px !important;
  text-transform: none !important;
  color: rgba(255, 255, 255, 0.7) !important;
  font-size: 13px !important;
}

.app-tabs .v-tab--selected {
  color: white !important;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 4px;
}

.app-tabs .v-tab:hover {
  color: white !important;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

/* 应用窗口 */
.app-window {
  padding: 0 8px;
}

.v-window {
  height: auto;
}

:deep(.v-window) {
  height: auto !important;
  display: flex;
  flex-direction: column;
}

:deep(.v-window__container) {
  height: auto !important;
  flex: 1;
}

.v-window-item {
  height: auto !important;
  overflow: visible !important;
}

:deep(.v-card-text) {
  overflow: visible;
  height: auto;
}

/* 索引进度条 - 底部悬浮 */
.indexing-status-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: rgba(var(--v-theme-surface), 0.95);
  backdrop-filter: blur(10px);
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px 8px 0 0;
  margin: 0 16px;
  max-width: calc(100% - 32px);
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.3s ease;
}

.indexing-status-bar:hover {
  background: rgba(var(--v-theme-surface), 1);
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.15);
}

.index-details {
  background: rgba(var(--v-theme-surface-variant), 0.5);
}

/* 旋转动画 */
@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.rotating {
  animation: rotate 2s linear infinite;
}
</style>
