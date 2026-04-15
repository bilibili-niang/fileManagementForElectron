<template>
  <div class="file-list-container">
    <v-row class="fill-height ma-0">
      <!-- 左侧分类侧边栏 -->
      <v-col cols="2" class="category-sidebar pa-1">
        <v-card class="fill-height" flat>
          <v-card-item class="py-2">
            <v-card-title class="text-h6">视图</v-card-title>
          </v-card-item>
          <v-list class="category-list">
            <v-list-item
              v-for="view in viewModes"
              :key="view.key"
              :prepend-icon="view.icon"
              @click="selectViewMode(view.key)"
              :active="currentViewMode === view.key"
              class="category-item"
            >
              <v-list-item-title>{{ view.name }}</v-list-item-title>
            </v-list-item>
          </v-list>

          <v-divider class="my-2"></v-divider>

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

      <!-- 中间文件列表区域 -->
      <v-col cols="10" class="file-list-area pa-1">
        <v-card class="fill-height file-list-card" flat>
          <!-- 工具栏 -->
          <v-card-item class="file-list-header py-2">
            <v-row align="center" no-gutters>
              <v-col cols="4">
                <v-card-title class="text-h6">{{ getViewTitle }}</v-card-title>
              </v-col>
              <v-col cols="8">
                <div class="toolbar-right">
                  <!-- 批量操作按钮 -->
                  <v-btn
                    v-if="selectedFiles.length > 0"
                    color="error"
                    variant="outlined"
                    size="small"
                    class="mr-2"
                    @click="confirmBatchDelete"
                  >
                    <v-icon icon="mdi-delete" size="small" class="mr-1"></v-icon>
                    删除选中 ({{ selectedFiles.length }})
                  </v-btn>
                  <v-btn
                    v-if="selectedFiles.length > 0"
                    variant="outlined"
                    size="small"
                    class="mr-2"
                    @click="clearSelection"
                  >
                    取消选择
                  </v-btn>
                  
                  <!-- 时长筛选（仅在媒体视图显示） -->
                  <template v-if="currentViewMode === 'media'">
                    <v-select
                      v-model="durationFilter"
                      :items="durationFilterOptions"
                      item-title="title"
                      item-value="value"
                      label="时长筛选"
                      variant="outlined"
                      density="compact"
                      hide-details
                      class="duration-filter"
                      @update:model-value="onDurationFilterChange"
                    ></v-select>
                  </template>

                  <v-select
                    v-model="pageSize"
                    :items="pageSizeOptions"
                    item-title="title"
                    item-value="value"
                    label="每页"
                    variant="outlined"
                    density="compact"
                    hide-details
                    class="page-size-select ml-2"
                  ></v-select>
                </div>
              </v-col>
            </v-row>
          </v-card-item>

          <!-- 文件列表 -->
          <v-card-text class="file-list-content">
            <v-data-table
              v-model="selectedFiles"
              :headers="headers"
              :items="files"
              :items-per-page="pageSize"
              :page="currentPage"
              :loading="loading"
              hover
              show-select
              class="file-table"
              hide-default-footer
              item-value="id"
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
                <span class="file-path" :title="item.path">{{ item.path }}</span>
              </template>
              <template v-slot:item.size="{ item }">
                {{ formatSize(item.size) }}
              </template>
              <template v-slot:item.duration="{ item }">
                {{ formatDuration(item.duration) }}
              </template>
              <template v-slot:item.modified_time="{ item }">
                {{ formatDate(item.modified_time) }}
              </template>
              <template v-slot:item.extension="{ item }">
                <v-chip size="small" variant="outlined">{{ item.extension }}</v-chip>
              </template>
            </v-data-table>
          </v-card-text>

          <!-- 分页 -->
          <div class="file-list-footer">
            <div class="d-flex align-center justify-center w-100">
              <v-pagination
                v-model="currentPage"
                :length="totalPages"
                :total-visible="7"
                size="small"
              ></v-pagination>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- 删除确认对话框 -->
    <v-dialog v-model="deleteDialog.show" max-width="400">
      <v-card>
        <v-card-title class="text-h6">确认删除</v-card-title>
        <v-card-text>
          确定要删除选中的 {{ selectedFiles.length }} 个文件吗？<br>
          <span class="text-caption text-grey">此操作只会删除数据库记录，不会删除实际文件。</span>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="deleteDialog.show = false">取消</v-btn>
          <v-btn color="error" variant="elevated" @click="executeBatchDelete">删除</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 右键菜单 -->
    <v-menu
      v-model="contextMenu.show"
      :activator="contextMenuActivator"
      :location="contextMenu.location"
      transition="scale-transition"
      :close-on-content-click="true"
    >
      <v-list density="compact">
        <v-list-item @click="handleOpenFile">
          <template v-slot:prepend>
            <v-icon icon="mdi-open-in-app" size="small"></v-icon>
          </template>
          <v-list-item-title>打开</v-list-item-title>
        </v-list-item>
        <v-list-item @click="handleOpenInExplorer">
          <template v-slot:prepend>
            <v-icon icon="mdi-folder-open" size="small"></v-icon>
          </template>
          <v-list-item-title>在资源管理器中打开</v-list-item-title>
        </v-list-item>
        <v-divider></v-divider>
        <v-list-item @click="handleDeleteSingle" color="error">
          <template v-slot:prepend>
            <v-icon icon="mdi-delete" size="small" color="error"></v-icon>
          </template>
          <v-list-item-title class="text-error">删除记录</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-menu>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, inject } from 'vue'
import FileIcon from '@/components/FileIcon/index.vue'

interface FileResult {
  id: number
  name: string
  path: string
  extension: string
  size: number
  modified_time: string
  duration?: number
}

interface Category {
  key: string
  name: string
  icon: string
  count: number
}

interface ViewMode {
  key: string
  name: string
  icon: string
}

// 视图模式
const viewModes: ViewMode[] = [
  { key: 'all', name: '全部文件', icon: 'mdi-file-multiple' },
  { key: 'media', name: '媒体文件', icon: 'mdi-play-circle' },
  { key: 'large', name: '大文件', icon: 'mdi-file-cabinet' },
  { key: 'recent', name: '最近修改', icon: 'mdi-clock-outline' }
]

// 分类列表
const categories = ref<Category[]>([
  { key: 'all', name: '全部', icon: 'mdi-file-multiple', count: 0 },
  { key: 'images', name: '图片', icon: 'mdi-image-multiple', count: 0 },
  { key: 'documents', name: '文档', icon: 'mdi-file-document-multiple', count: 0 },
  { key: 'videos', name: '视频', icon: 'mdi-video', count: 0 },
  { key: 'audio', name: '音频', icon: 'mdi-music', count: 0 },
  { key: 'archives', name: '压缩包', icon: 'mdi-zip-box', count: 0 }
])

// 状态
const currentViewMode = ref('all')
const selectedCategory = ref('all')
const files = ref<FileResult[]>([])
const selectedFiles = ref<number[]>([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(50)
const totalPages = ref(0)
const durationFilter = ref<string | null>(null)

// 右键菜单
const contextMenu = ref({
  show: false,
  location: 'bottom' as string,
  selectedItem: null as FileResult | null
})
const contextMenuActivator = ref<HTMLElement | null>(null)

// 删除对话框
const deleteDialog = ref({
  show: false
})

// 每页选项
const pageSizeOptions = [
  { title: '20条', value: 20 },
  { title: '50条', value: 50 },
  { title: '100条', value: 100 },
  { title: '200条', value: 200 }
]

// 时长筛选选项
const durationFilterOptions = [
  { title: '全部', value: null },
  { title: '1分钟内', value: '0-60' },
  { title: '1-5分钟', value: '60-300' },
  { title: '5-30分钟', value: '300-1800' },
  { title: '30分钟以上', value: '1800-' }
]

// 表格列定义
const headers = computed(() => {
  const baseHeaders = [
    { title: '文件名', key: 'name', sortable: true, align: 'start' },
    { title: '路径', key: 'path', sortable: true, align: 'start' },
    { title: '类型', key: 'extension', sortable: true, align: 'start', width: '100px' },
    { title: '大小', key: 'size', sortable: true, align: 'start', width: '100px' },
    { title: '修改时间', key: 'modified_time', sortable: true, align: 'start', width: '150px' }
  ]
  
  // 媒体视图显示时长列
  if (currentViewMode.value === 'media') {
    baseHeaders.splice(4, 0, { title: '时长', key: 'duration', sortable: true, align: 'start', width: '100px' })
  }
  
  return baseHeaders
})

// 视图标题
const getViewTitle = computed(() => {
  const view = viewModes.find(v => v.key === currentViewMode.value)
  const category = categories.value.find(c => c.key === selectedCategory.value)
  return `${view?.name || '全部'} - ${category?.name || '全部'}`
})

const showSnackbar = inject('showSnackbar') as (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void
const openFileEditor = inject('openFileEditor') as (path: string, name: string) => void

// 选择视图模式
async function selectViewMode(mode: string) {
  currentViewMode.value = mode
  currentPage.value = 1
  await loadFiles()
}

// 选择分类
async function selectCategory(category: string) {
  selectedCategory.value = category
  currentPage.value = 1
  await loadFiles()
}

// 加载文件列表
async function loadFiles() {
  loading.value = true
  try {
    let data
    
    if (currentViewMode.value === 'media') {
      // 媒体视图：按时长筛选
      const { minDuration, maxDuration } = parseDurationFilter(durationFilter.value)
      data = await window.electronAPI.searchFilesByDuration(minDuration, maxDuration, currentPage.value, pageSize.value)
    } else {
      // 其他视图：按分类获取
      data = await window.electronAPI.getFilesByCategory(
        selectedCategory.value,
        currentPage.value,
        pageSize.value
      )
    }
    
    files.value = data.files || []
    totalPages.value = data.totalPages || 0
  } catch (error) {
    console.error('Load files failed:', error)
    showSnackbar('加载文件失败：' + (error as Error).message, 'error')
  } finally {
    loading.value = false
  }
}

// 解析时长筛选
function parseDurationFilter(filter: string | null): { minDuration?: number; maxDuration?: number } {
  if (!filter) return {}
  const [min, max] = filter.split('-').map(v => v ? parseInt(v) : undefined)
  return { minDuration: min, maxDuration: max }
}

// 时长筛选变化
function onDurationFilterChange() {
  currentPage.value = 1
  loadFiles()
}

// 清除选择
function clearSelection() {
  selectedFiles.value = []
}

// 确认批量删除
function confirmBatchDelete() {
  deleteDialog.value.show = true
}

// 执行批量删除
async function executeBatchDelete() {
  try {
    const result = await window.electronAPI.batchDeleteFiles(selectedFiles.value)
    if (result.success) {
      showSnackbar(`成功删除 ${result.deletedCount} 个文件`, 'success')
      selectedFiles.value = []
      await loadFiles()
      await loadFileCounts()
    } else {
      showSnackbar('删除失败：' + result.error, 'error')
    }
  } catch (error) {
    showSnackbar('删除失败：' + (error as Error).message, 'error')
  } finally {
    deleteDialog.value.show = false
  }
}

// 打开文件 - 根据文件类型选择打开方式
function openFile(item: FileResult) {
  const fullPath = `${item.path}\\${item.name}`
  const ext = item.extension.toLowerCase()
  
  // 文本文件类型
  const textExtensions = ['txt', 'md', 'json', 'xml', 'html', 'css', 'js', 'ts', 'vue', 'py', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'go', 'rs', 'php', 'rb', 'sh', 'bat', 'cmd', 'ps1', 'sql', 'yaml', 'yml', 'ini', 'conf', 'log']
  
  // 文档类型
  const docExtensions = ['doc', 'docx', 'pdf', 'xls', 'xlsx', 'ppt', 'pptx']
  
  // 图片类型
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico']
  
  // 视频类型
  const videoExtensions = ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm']
  
  // 音频类型
  const audioExtensions = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a']
  
  if (textExtensions.includes(ext)) {
    // 文本文件使用内置编辑器打开
    if (openFileEditor) {
      openFileEditor(item.path, item.name)
    }
  } else if (docExtensions.includes(ext) || imageExtensions.includes(ext) || videoExtensions.includes(ext) || audioExtensions.includes(ext)) {
    // 文档、图片、视频、音频使用系统默认程序打开
    window.electronAPI.openFile(fullPath)
  } else {
    // 其他文件询问用户或使用系统默认程序
    window.electronAPI.openFile(fullPath)
  }
}

// 显示右键菜单
function showContextMenu(event: MouseEvent, item: FileResult) {
  event.preventDefault()
  contextMenu.value.selectedItem = item
  contextMenuActivator.value = event.currentTarget as HTMLElement
  contextMenu.value.show = true
}

// 处理打开文件
function handleOpenFile() {
  if (contextMenu.value.selectedItem) {
    openFile(contextMenu.value.selectedItem)
  }
  contextMenu.value.show = false
}

// 处理在资源管理器中打开
function handleOpenInExplorer() {
  if (contextMenu.value.selectedItem) {
    const item = contextMenu.value.selectedItem
    const fullPath = `${item.path}\\${item.name}`
    window.electronAPI.showItemInFolder(fullPath)
  }
  contextMenu.value.show = false
}

// 处理单文件删除
async function handleDeleteSingle() {
  if (contextMenu.value.selectedItem) {
    const fileId = contextMenu.value.selectedItem.id
    try {
      const result = await window.electronAPI.batchDeleteFiles([fileId])
      if (result.success) {
        showSnackbar('删除成功', 'success')
        await loadFiles()
        await loadFileCounts()
      }
    } catch (error) {
      showSnackbar('删除失败：' + (error as Error).message, 'error')
    }
  }
  contextMenu.value.show = false
}

// 加载文件统计
async function loadFileCounts() {
  try {
    const counts = await window.electronAPI.getFileCounts()
    categories.value = [
      { key: 'all', name: '全部', icon: 'mdi-file-multiple', count: counts.all },
      { key: 'images', name: '图片', icon: 'mdi-image-multiple', count: counts.images },
      { key: 'documents', name: '文档', icon: 'mdi-file-document-multiple', count: counts.documents },
      { key: 'videos', name: '视频', icon: 'mdi-video', count: counts.videos },
      { key: 'audio', name: '音频', icon: 'mdi-music', count: counts.audio },
      { key: 'archives', name: '压缩包', icon: 'mdi-zip-box', count: counts.archives }
    ]
  } catch (error) {
    console.error('Load file counts failed:', error)
  }
}

// 格式化文件大小
function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 格式化时长
function formatDuration(seconds?: number): string {
  if (!seconds) return '-'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

// 格式化日期
function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '-'
  return date.toLocaleString('zh-CN')
}

// 监听分页变化
watch(currentPage, loadFiles)
watch(pageSize, () => {
  currentPage.value = 1
  loadFiles()
})

onMounted(() => {
  loadFileCounts()
  loadFiles()
})
</script>

<style lang="scss" scoped>
.file-list-container {
  height: calc(100vh - 100px);
  overflow: hidden;
}

.category-sidebar {
  height: 100%;
  overflow-y: auto;
  border-right: 1px solid rgba(0, 0, 0, 0.12);
}

.category-list {
  padding: 0;
}

.category-item {
  cursor: pointer;
  
  &:hover {
    background-color: rgba(0, 0, 0, 0.04);
  }
  
  &.v-list-item--active {
    background-color: rgba(var(--v-theme-primary), 0.12);
  }
}

.file-list-area {
  height: 100%;
  overflow: hidden;
}

.file-list-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.file-list-content {
  flex: 1;
  overflow: auto;
  padding: 0;
}

.file-list-footer {
  padding: 8px 16px;
  border-top: 1px solid rgba(0, 0, 0, 0.12);
}

.file-table {
  .file-name-wrapper {
    display: flex;
    align-items: center;
    cursor: pointer;
  }
  
  .file-icon-row {
    margin-right: 8px;
  }
  
  .file-name {
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .file-path {
    max-width: 250px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: rgba(0, 0, 0, 0.6);
  }
}

.toolbar-right {
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.duration-filter {
  width: 150px;
}

.page-size-select {
  width: 100px;
}

.duration-filter,
.page-size-select {
  :deep(.v-field) {
    min-height: 32px;
  }
}
</style>
