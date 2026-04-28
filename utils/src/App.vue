<template>
  <v-app class="app-container">
    <WelcomeWizard v-model="showWelcomeWizard" @complete="onWizardComplete"/>

    <WindowTitleBar v-if="!showWelcomeWizard && isElectronEnv">
      <div class="tab-selector-container">
        <v-menu :close-on-content-click="false" location="bottom center">
          <template v-slot:activator="{ props: menuProps }">
            <v-btn
              v-bind="menuProps"
              variant="text"
              density="compact"
              class="tab-selector-btn"
              append-icon="mdi-menu-down"
            >
              <v-icon start size="small" :icon="getActiveTabIcon()"></v-icon>
              {{ getActiveTabLabel() }}
            </v-btn>
          </template>
          <v-list class="tab-menu-list" density="compact">
            <v-list-item
              v-for="tab in tabOptions"
              :key="tab.value"
              :value="tab.value"
              :active="activeTab === tab.value"
              @click="activeTab = tab.value"
              class="tab-menu-item"
            >
              <template v-slot:prepend>
                <v-icon :icon="tab.icon" size="small"></v-icon>
              </template>
              <v-list-item-title>{{ tab.label }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>
    </WindowTitleBar>

    <div v-if="!showWelcomeWizard && !isElectronEnv" class="browser-nav-bar">
      <v-tabs v-model="activeTab" class="browser-tabs" grow>
        <v-tab
          v-for="tab in tabOptions"
          :key="tab.value"
          :value="tab.value"
        >
          <v-icon start size="small">{{ tab.icon }}</v-icon>
          {{ tab.label }}
        </v-tab>
      </v-tabs>
      <!-- 主题切换按钮 -->
      <v-btn
        icon
        variant="text"
        density="compact"
        class="theme-toggle-btn"
        :title="themeStore.themeName"
        @click="themeStore.toggleTheme"
      >
        <v-icon size="20">{{ themeStore.themeIcon }}</v-icon>
      </v-btn>
    </div>

    <v-main class="main-content" v-if="!showWelcomeWizard">
      <div class="window-content">
        <v-window v-model="activeTab" class="app-window">
          <v-window-item value="qrcode">
            <QrCodeGenerator/>
          </v-window-item>

          <v-window-item value="category">
            <FileCategory/>
          </v-window-item>

          <v-window-item value="search">
            <FileSearch/>
          </v-window-item>

          <v-window-item value="network">
            <NetworkMock/>
          </v-window-item>

          <v-window-item value="api-docs">
            <ApiDocs/>
          </v-window-item>

          <v-window-item value="countdown">
            <Countdown/>
          </v-window-item>

          <v-window-item value="calculator">
            <Calculator/>
          </v-window-item>

          <v-window-item value="clipboard">
            <ClipboardHistory/>
          </v-window-item>

          <v-window-item value="portkiller">
            <PortKiller/>
          </v-window-item>

          <v-window-item value="fileShare">
            <FileShare/>
          </v-window-item>

          <v-window-item value="settings">
            <Settings/>
          </v-window-item>
        </v-window>
      </div>
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

    <DevToolsButton v-if="isElectronEnv || isDev"/>
  </v-app>
</template>

<script setup lang="ts">
import {onMounted, provide, ref} from 'vue'
import FileSearch from '@/views/FileSearch/index.vue'
import FileCategory from '@/views/FileCategory/index.vue'
import Settings from '@/views/Settings/index.vue'
import QrCodeGenerator from '@/views/QrCodeGenerator/index.vue'
import NetworkMock from '@/views/NetworkMock/index.vue'
import Countdown from '@/views/Countdown/index.vue'
import Calculator from '@/views/Calculator/index.vue'
import ClipboardHistory from '@/views/ClipboardHistory/index.vue'
import PortKiller from '@/views/PortKiller/index.vue'
import ApiDocs from '@/views/ApiDocs/index.vue'
import FileShare from '@/views/FileShare'
import DatabaseConfigDialog from '@/components/DatabaseConfigDialog/index.vue'
import FileEditorDialog from '@/components/FileEditorDialog/index.vue'
import ImagePreviewDialog from '@/components/ImagePreviewDialog/index.vue'
import DocxPreviewDialog from '@/components/DocxPreviewDialog/index.vue'
import MediaPlayerDialog from '@/components/MediaPlayerDialog/index.vue'
import PdfPreviewDialog from '@/components/PdfPreviewDialog/index.vue'
import WindowTitleBar from '@/components/WindowTitleBar/index.vue'
import WelcomeWizard from '@/components/WelcomeWizard/index.vue'
import DevToolsButton from '@/components/DevToolsButton/index.vue'
import {useConfigStore} from '@/stores/config'
import {configApi} from '@/api'
import {useFilePreview} from '@/composables/useFilePreview'
import {useTabManager} from '@/composables/useTabManager'
import {useSnackbar} from '@/composables/useSnackbar'
import {useThemeManager} from '@/composables/useThemeManager'
import {useWelcomeWizard} from '@/composables/useWelcomeWizard'
import {isElectron} from '@/utils/env'

const configStore = useConfigStore()

/**
 * 判断是否运行在 Electron 环境中
 */
const isElectronEnv = isElectron()

/**
 * 判断是否为开发环境
 */
const isDev = (import.meta as any).env?.DEV

const {activeTab, loadSavedTab} = useTabManager()
const {snackbar, showSnackbar} = useSnackbar()
const {themeStore, initTheme} = useThemeManager()
const {showWelcomeWizard, checkFirstTime, onWizardComplete} = useWelcomeWizard()
const {
  showFileEditor,
  showImagePreview,
  showDocxPreview,
  showMediaPlayer,
  showPdfPreview,
  currentFile,
  openImagePreview,
  openPdfPreview,
  openDocxPreview,
  openMediaPlayer,
  openFileEditor,
  handleFileSave
} = useFilePreview()

const showConfigDialog = ref(false)

const tabOptions = [
  {value: 'qrcode', label: '二维码生成', icon: 'mdi-qrcode'},
  {value: 'category', label: '分类浏览', icon: 'mdi-folder'},
  {value: 'search', label: '文件搜索', icon: 'mdi-magnify'},
  {value: 'fileShare', label: '文件共享', icon: 'mdi-folder-sync'},
  {value: 'api-docs', label: 'API 文档', icon: 'mdi-api'},
  {value: 'network', label: '网络模拟', icon: 'mdi-lan'},
  {value: 'countdown', label: '倒计时', icon: 'mdi-timer'},
  {value: 'calculator', label: '计算器', icon: 'mdi-calculator'},
  {value: 'clipboard', label: '粘贴板', icon: 'mdi-clipboard'},
  {value: 'portkiller', label: '端口管理', icon: 'mdi-lan-remove'},
  {value: 'settings', label: '设置', icon: 'mdi-cog'}
]

function getActiveTabLabel() {
  const tab = tabOptions.find(t => t.value === activeTab.value)
  return tab ? tab.label : ''
}

function getActiveTabIcon() {
  const tab = tabOptions.find(t => t.value === activeTab.value)
  return tab ? tab.icon : 'mdi-menu'
}

provide('openImagePreview', openImagePreview)
provide('openPdfPreview', openPdfPreview)
provide('openDocxPreview', openDocxPreview)
provide('openMediaPlayer', openMediaPlayer)
provide('openFileEditor', openFileEditor)

onMounted(async () => {
  await loadSavedTab()
  await initTheme()

  try {
    await configApi.healthCheck()
  } catch (error) {
    console.error('后端服务不可用:', error)
    showSnackbar('后端服务未启动，请运行 npm run server', 'warning')
  }

  await configStore.loadConfig()
  showWelcomeWizard.value = false
})
</script>

<style scoped lang="scss">
@import './App.scss';

.browser-nav-bar {
  display: flex;
  align-items: center;
  background: rgba(0, 0, 0, 0.04);
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
  padding-right: 8px;
}

:deep(.browser-tabs) {
  flex: 1;

  .v-tab {
    font-size: 13px;
    text-transform: none;
    min-width: 80px;
  }
}

.theme-toggle-btn {
  margin-left: 8px;
  width: 36px;
  height: 36px;
}
</style>
