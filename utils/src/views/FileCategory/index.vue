<template>
  <div class="file-category-container">
    <div class="main-layout">
      <!-- 左侧：分类导航侧边栏 -->
      <aside class="category-sidebar">
        <CategoryList
          v-model="selectedCategory"
          @select="selectCategory"
        />
      </aside>

      <!-- 右侧：文件列表区 -->
      <main class="file-list-area">
        <v-card class="fill-height file-list-card" flat>
          <v-card-item class="file-list-header py-2">
            <v-card-title class="text-h6">{{ getCategoryName(selectedCategory) }}</v-card-title>
          </v-card-item>
          <v-card-text class="file-list-content">
            <CategoryTable />
          </v-card-text>
        </v-card>
      </main>
    </div>

    <!-- 右键菜单 -->
    <v-menu
      v-model="contextMenu.show"
      :activator="contextMenuActivator"
      :location="contextMenu.location"
      transition="scale-transition"
      :close-on-content-click="true"
      :close-on-click-outside="true"
    >
      <v-list density="compact" class="context-menu-list">
        <v-list-item @click="handleOpenFile" class="context-menu-item">
          <template v-slot:prepend>
            <v-icon icon="mdi-open-in-app" size="small"></v-icon>
          </template>
          <v-list-item-title>打开</v-list-item-title>
        </v-list-item>
        <v-list-item @click="handleOpenInExplorer" class="context-menu-item">
          <template v-slot:prepend>
            <v-icon icon="mdi-folder-open" size="small"></v-icon>
          </template>
          <v-list-item-title>在文件资源管理器中打开</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-menu>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, inject } from 'vue'
import CategoryList from '@/components/CategoryList/index.tsx'
import { useIndexingStore } from '@/stores/indexing'
import { CATEGORY_CONFIGS, type FileCategory } from '@/utils/fileCategory'
import { createFileCategoryTable, type FileResult } from './tableConfig'

const selectedCategory = ref<FileCategory>('all')

/**
 * 右键菜单状态
 */
const contextMenu = ref({
  show: false,
  location: 'bottom' as string,
  selectedItem: null as FileResult | null
})

/**
 * 右键菜单触发元素
 */
const contextMenuActivator = ref<HTMLElement | null>(null)

const openFileEditor = inject('openFileEditor') as (path: string, name: string) => void
const openImagePreview = inject('openImagePreview') as (filePath: string) => void
const openMediaPlayer = inject('openMediaPlayer') as (filePath: string, fileSize?: number) => void
const openPdfPreview = inject('openPdfPreview') as (filePath: string) => void
const openDocxPreview = inject('openDocxPreview') as (filePath: string) => void
const showSnackbar = inject('showSnackbar') as (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void

const { Table: CategoryTable, refresh } = createFileCategoryTable({
  category: selectedCategory,
  onRowClick: openFile,
  onRowContextmenu: (item, event) => {
    event.preventDefault()
    contextMenu.value.selectedItem = item
    contextMenuActivator.value = event.currentTarget as HTMLElement
    contextMenu.value.show = true
  }
})

async function selectCategory(category: string) {
  selectedCategory.value = category as FileCategory
  await refresh()
}

async function loadFileCounts() {
  try {
    const indexingStore = useIndexingStore()
    await indexingStore.initialize()
  } catch (error) {
    console.error('Load file counts failed:', error)
  }
}

function getCategoryName(key: string): string {
  if (key === 'all') return '全部文件'
  const config = CATEGORY_CONFIGS.find(c => c.key === key)
  return config?.label || '未知'
}

async function openFile(item: FileResult) {
  if (!item || !item.path || !item.name) {
    showSnackbar('文件信息不完整', 'error')
    return
  }

  const fullPath = `${item.path}\\${item.name}`
  const ext = item.extension?.toLowerCase() || ''

  let openConfig: { open_method: string; internal_viewer: string | null } | null = null
  try {
    const response = await fetch(`http://localhost:3000/api/files/open-config/${ext}`)
    if (response.ok) {
      const data = await response.json()
      openConfig = data.config
    }
  } catch (error) {
    // 获取文件打开配置失败，使用系统默认方式
  }

  if (!openConfig || openConfig.open_method === 'system') {
    window.electronAPI.openFile(fullPath)
    return
  }

  const viewer = openConfig.internal_viewer

  switch (viewer) {
    case 'image':
      if (openImagePreview) {
        openImagePreview(fullPath)
      } else {
        window.electronAPI.openFile(fullPath)
      }
      break
    case 'pdf':
      if (openPdfPreview) {
        openPdfPreview(fullPath)
      } else {
        window.electronAPI.openFile(fullPath)
      }
      break
    case 'docx':
      if (openDocxPreview) {
        openDocxPreview(fullPath)
      } else {
        window.electronAPI.openFile(fullPath)
      }
      break
    case 'media':
      if (openMediaPlayer) {
        openMediaPlayer(fullPath, item.size)
      } else {
        window.electronAPI.openFile(fullPath)
      }
      break
    case 'editor':
    default:
      if (openFileEditor) {
        openFileEditor(item.path, item.name)
      } else {
        window.electronAPI.openFile(fullPath)
      }
      break
  }
}

/**
 * 处理打开文件
 */
function handleOpenFile() {
  if (contextMenu.value.selectedItem) {
    openFile(contextMenu.value.selectedItem)
  }
  contextMenu.value.show = false
}

/**
 * 处理在文件资源管理器中打开
 */
function handleOpenInExplorer() {
  if (contextMenu.value.selectedItem) {
    const item = contextMenu.value.selectedItem
    const fullPath = `${item.path}\\${item.name}`
    window.electronAPI.showItemInFolder(fullPath)
  }
  contextMenu.value.show = false
}

onMounted(async () => {
  await loadFileCounts()
  await refresh()
})
</script>

<style lang="scss" scoped>
@import './index.scss';
</style>
