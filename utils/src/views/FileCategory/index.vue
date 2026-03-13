<template>
  <div class="file-category-container">
    <v-row class="fill-height ma-0">
      <v-col cols="3" class="category-sidebar pa-1">
        <v-card class="fill-height" flat>
          <v-card-item class="py-2">
            <v-card-title class="text-h6">分类</v-card-title>
          </v-card-item>
          <v-list class="category-list">
            <v-list-item
              v-for="category in categories"
              :key="category.key"
              :prepend-icon="category.icon"
              @click="selectCategory(category.key)"
              :active="selectedCategory === category.key"
              class="category-item"
            >
              <v-list-item-title>{{ category.name }}</v-list-item-title>
              <v-list-item-subtitle>{{ category.count }} 个文件</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>

      <v-col cols="9" class="file-list-area pa-1">
        <v-card class="fill-height file-list-card" flat>
          <v-card-item class="file-list-header py-2">
            <v-card-title class="text-h6">{{ getCategoryName(selectedCategory) }}</v-card-title>
          </v-card-item>
          <v-card-text class="file-list-content">
            <v-data-table
              :headers="headers"
              :items="files"
              :items-per-page="pageSize"
              :page="currentPage"
              :loading="loading"
              hover
              class="file-table"
              hide-default-footer
            >
              <template v-slot:item.name="{ item }">
                <div
                  class="file-name-wrapper"
                  @click="openFile(item)"
                  @contextmenu.prevent="showContextMenu($event, item)"
                >
                  <div class="file-icon-row">
                    <FileIcon :extension="item.extension" :size="24"></FileIcon>
                  </div>
                  <div class="file-name-row">
                    <span class="file-name" :title="item.name">{{ item.name }}</span>
                  </div>
                </div>
              </template>
              <template v-slot:item.path="{ item }">
                <div class="file-path-wrapper" @contextmenu.prevent="showContextMenu($event, item)">
                  <span class="file-path" :title="item.path">{{ item.path }}</span>
                </div>
              </template>
              <template v-slot:item.size="{ item }">
                {{ formatSize(item.size) }}
              </template>
              <template v-slot:item.created_time="{ item }">
                {{ formatDate(item.created_time) }}
              </template>
              <template v-slot:item.modified_time="{ item }">
                {{ formatDate(item.modified_time) }}
              </template>
              <template v-slot:item.accessed_time="{ item }">
                {{ formatDate(item.accessed_time) }}
              </template>
              <template v-slot:item.attributes="{ item }">
                <div class="file-attributes">
                  <v-tooltip v-if="item.is_hidden" text="隐藏文件">
                    <template v-slot:activator="{ props }">
                      <v-icon v-bind="props" icon="mdi-eye-off" size="small" color="grey"></v-icon>
                    </template>
                  </v-tooltip>
                  <v-tooltip v-if="item.is_readonly" text="只读文件">
                    <template v-slot:activator="{ props }">
                      <v-icon v-bind="props" icon="mdi-lock" size="small" color="orange"></v-icon>
                    </template>
                  </v-tooltip>
                  <v-tooltip v-if="item.is_system" text="系统文件">
                    <template v-slot:activator="{ props }">
                      <v-icon v-bind="props" icon="mdi-cog" size="small" color="blue"></v-icon>
                    </template>
                  </v-tooltip>
                  <v-chip
                    v-if="!item.is_hidden && !item.is_readonly && !item.is_system"
                    size="x-small"
                    color="success"
                    variant="outlined"
                  >
                    正常
                  </v-chip>
                </div>
              </template>
            </v-data-table>
          </v-card-text>
          <div class="file-list-footer">
            <div class="d-flex align-center justify-center w-100">
              <v-select
                v-model="pageSize"
                :items="pageSizeOptions"
                item-title="title"
                item-value="value"
                label="每页"
                variant="outlined"
                density="compact"
                class="page-size-select mr-4"
                hide-details
              ></v-select>
              <v-pagination
                v-model="currentPage"
                :length="totalPages"
                :total-visible="5"
                size="small"
              ></v-pagination>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

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
import { ref, onMounted, inject, watch } from 'vue'
import FileIcon from '@/components/FileIcon/index.vue'

interface FileResult {
  id: number
  name: string
  path: string
  extension: string
  size: number
  modified_time: string
}

interface Category {
  key: string
  name: string
  icon: string
  count: number
}

const selectedCategory = ref('all')
const files = ref<FileResult[]>([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(100)
const totalPages = ref(0)

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

const pageSizeOptions = [
  { title: '20条', value: 20 },
  { title: '50条', value: 50 },
  { title: '100条', value: 100 },
  { title: '200条', value: 200 },
  { title: '500条', value: 500 }
]

const openFileEditor = inject('openFileEditor') as (path: string, name: string) => void
const openImagePreview = inject('openImagePreview') as (filePath: string) => void
const openMediaPlayer = inject('openMediaPlayer') as (filePath: string, fileSize?: number) => void
const openPdfPreview = inject('openPdfPreview') as (filePath: string) => void
const openDocxPreview = inject('openDocxPreview') as (filePath: string) => void
const showSnackbar = inject('showSnackbar') as (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void

const categories = ref<Category[]>([
  { key: 'all', name: '全部文件', icon: 'mdi-file-multiple', count: 0 },
  { key: 'images', name: '图片', icon: 'mdi-image-multiple', count: 0 },
  { key: 'documents', name: '文档', icon: 'mdi-file-document-multiple', count: 0 },
  { key: 'code', name: '代码', icon: 'mdi-code-braces', count: 0 },
  { key: 'videos', name: '视频', icon: 'mdi-video', count: 0 },
  { key: 'audio', name: '音频', icon: 'mdi-music', count: 0 },
  { key: 'archives', name: '压缩包', icon: 'mdi-zip-box', count: 0 },
  { key: 'executables', name: '可执行', icon: 'mdi-application', count: 0 },
  { key: 'other', name: '其他', icon: 'mdi-file', count: 0 }
])

const headers = [
  { title: '文件名', key: 'name', sortable: true, align: 'start', width: '250px' },
  { title: '路径', key: 'path', sortable: true, align: 'start', width: '200px' },
  { title: '大小', key: 'size', sortable: true, align: 'start', width: '80px' },
  { title: '创建时间', key: 'created_time', sortable: true, align: 'start', width: '140px' },
  { title: '修改时间', key: 'modified_time', sortable: true, align: 'start', width: '140px' },
  { title: '访问时间', key: 'accessed_time', sortable: true, align: 'start', width: '140px' },
  { title: '属性', key: 'attributes', sortable: false, align: 'start', width: '80px' }
]

async function selectCategory(category: string) {
  selectedCategory.value = category
  currentPage.value = 1
  await loadFiles()
}

async function loadFiles() {
  loading.value = true
  try {
    const data = await window.electronAPI.getFilesByCategory(
      selectedCategory.value,
      currentPage.value,
      pageSize.value
    )
    files.value = data.files
    totalPages.value = data.totalPages
  } catch (error) {
    console.error('Load files failed:', error)
    showSnackbar('加载文件失败：' + (error as Error).message, 'error')
  } finally {
    loading.value = false
  }
}

async function loadFileCounts() {
  try {
    const counts = await window.electronAPI.getFileCounts()
    console.log('[FileCategory] 获取文件统计:', counts)
    
    categories.value = [
      { key: 'all', name: '全部文件', icon: 'mdi-file-multiple', count: counts.all },
      { key: 'images', name: '图片', icon: 'mdi-image-multiple', count: counts.images },
      { key: 'documents', name: '文档', icon: 'mdi-file-document-multiple', count: counts.documents },
      { key: 'code', name: '代码', icon: 'mdi-code-braces', count: counts.code },
      { key: 'videos', name: '视频', icon: 'mdi-video', count: counts.videos },
      { key: 'audio', name: '音频', icon: 'mdi-music', count: counts.audio },
      { key: 'archives', name: '压缩包', icon: 'mdi-zip-box', count: counts.archives },
      { key: 'executables', name: '可执行', icon: 'mdi-application', count: counts.executables },
      { key: 'other', name: '其他', icon: 'mdi-file', count: counts.other }
    ]
  } catch (error) {
    console.error('Load file counts failed:', error)
  }
}

function getCategoryName(key: string): string {
  const category = categories.value.find(c => c.key === key)
  return category ? category.name : '未知'
}

async function openFile(item: FileResult) {
  console.log('[FileCategory] 打开文件:', item)
  if (!item || !item.path || !item.name) {
    console.error('[FileCategory] 文件信息不完整:', item)
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
    console.warn('[FileCategory] 获取文件打开配置失败:', error)
  }

  if (!openConfig || openConfig.open_method === 'system') {
    console.log('[FileCategory] 使用系统默认程序打开:', fullPath)
    window.electronAPI.openFile(fullPath)
    return
  }

  const viewer = openConfig.internal_viewer
  console.log(`[FileCategory] 使用内部查看器 ${viewer} 打开:`, fullPath)

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

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function formatDate(dateStr: string): string {
  if (!dateStr || dateStr === 'null' || dateStr === 'undefined') {
    return '-'
  }
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) {
    return '-'
  }
  return date.toLocaleString('zh-CN')
}

/**
 * 显示右键菜单
 */
function showContextMenu(event: MouseEvent, item: FileResult) {
  event.preventDefault()
  contextMenu.value.selectedItem = item
  contextMenuActivator.value = event.currentTarget as HTMLElement
  contextMenu.value.show = true
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

watch(currentPage, async (newPage) => {
  console.log('[FileCategory] Page changed to:', newPage)
  await loadFiles()
})

watch(pageSize, async (newSize) => {
  console.log('[FileCategory] Page size changed to:', newSize)
  currentPage.value = 1
  await loadFiles()
})

onMounted(async () => {
  await loadFileCounts()
  await loadFiles()
})
</script>

<style lang="scss" scoped>
@import './index.scss';
</style>
