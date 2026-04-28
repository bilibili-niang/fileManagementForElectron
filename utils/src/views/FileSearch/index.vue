<template>
  <v-container fluid class="file-search-page">
    <!-- 主布局：三栏结构 -->
    <div class="main-layout">
      <!-- 左侧：分类导航侧边栏 -->
      <aside class="sidebar-section">
        <CategoryList
          v-model="selectedCategory"
          show-extra-items
          @select="handleCategorySelect"
          @select-favorite="handleSelectFavorite"
          @select-recent="handleSelectRecent"
        />
      </aside>

      <!-- 中间：主内容区 -->
      <main class="content-section">
        <!-- 索引进度提示 -->
        <v-card
          v-if="showIndexProgress && (indexStatus.isIndexing || indexStatus.totalFiles === 0)"
          variant="outlined"
          class="mb-3"
          :color="indexStatus.isIndexing ? 'primary' : 'warning'"
        >
          <v-card-text class="py-2">
            <div class="d-flex align-center">
              <template v-if="indexStatus.isIndexing">
                <v-progress-circular
                  indeterminate
                  size="20"
                  width="2"
                  color="primary"
                  class="mr-2"
                ></v-progress-circular>
                <div class="flex-grow-1">
                  <div class="text-body-2">
                    正在建立文件索引... {{ indexStatus.indexedFiles }} / {{ indexStatus.totalFiles }}
                  </div>
                  <v-progress-linear
                    :model-value="indexStatus.totalFiles > 0 ? (indexStatus.indexedFiles / indexStatus.totalFiles * 100) : 0"
                    height="4"
                    color="primary"
                    class="mt-1"
                  ></v-progress-linear>
                  <div class="text-caption text-grey mt-1 text-truncate" style="max-width: 100%;">
                    {{ indexStatus.currentPath }}
                  </div>
                </div>
              </template>
              <template v-else-if="indexStatus.totalFiles === 0">
                <v-icon icon="mdi-information" color="warning" class="mr-2"></v-icon>
                <span class="text-body-2 flex-grow-1">正在准备文件索引...</span>
              </template>
              <v-btn
                icon="mdi-close"
                size="small"
                variant="text"
                @click="showIndexProgress = false"
                class="ml-2"
              ></v-btn>
            </div>
          </v-card-text>
        </v-card>

        <!-- SuperTable 组件（包含搜索、表格、分页） -->
        <div class="search-content">
          <FileTableComponent />
        </div>
      </main>

    </div>

    <!-- 文件预览弹窗 -->
    <v-dialog v-model="showPreview" max-width="800" max-height="90vh" scrollable>
      <v-card v-if="previewedFile">
        <v-card-title class="d-flex align-center">
          <v-icon :icon="getFileIcon(previewedFile.extension)" class="mr-2" />
          <span class="text-truncate">{{ previewedFile.name }}</span>
          <v-spacer></v-spacer>
          <v-btn icon="mdi-close" variant="text" size="small" @click="closePreview"></v-btn>
        </v-card-title>
        
        <v-tabs v-model="previewTab" color="primary" density="compact">
          <v-tab value="preview">
            <v-icon icon="mdi-eye" size="small" start></v-icon>
            预览
          </v-tab>
          <v-tab value="info">
            <v-icon icon="mdi-information" size="small" start></v-icon>
            信息
          </v-tab>
        </v-tabs>

        <v-card-text style="max-height: 70vh; overflow-y: auto;">
          <!-- 预览 Tab -->
          <div v-if="previewTab === 'preview'" v-html="previewContent || '<div class=\'text-center py-8 text-grey\'>无法预览此文件</div>'"></div>
          
          <!-- 信息 Tab -->
          <div v-else-if="previewTab === 'info'">
            <v-list density="compact">
              <v-list-item>
                <v-list-item-title class="text-caption text-grey">文件名</v-list-item-title>
                <v-list-item-subtitle>{{ previewedFile.name }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title class="text-caption text-grey">类型</v-list-item-title>
                <v-list-item-subtitle>{{ previewedFile.extension.toUpperCase() }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title class="text-caption text-grey">大小</v-list-item-title>
                <v-list-item-subtitle>{{ formatFileSize(previewedFile.size) }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title class="text-caption text-grey">修改时间</v-list-item-title>
                <v-list-item-subtitle>{{ formatDate(previewedFile.modified_time) }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title class="text-caption text-grey">路径</v-list-item-title>
                <v-list-item-subtitle class="text-caption" style="word-break: break-all;">{{ previewedFile.path }}</v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </div>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="closePreview">关闭</v-btn>
          <v-btn color="primary" variant="elevated" prepend-icon="mdi-open-in-app" @click="openFile(previewedFile)">
            打开文件
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 删除确认对话框 -->
    <v-dialog v-model="deleteDialogVisible" max-width="400">
      <v-card>
        <v-card-title class="headline">确认删除</v-card-title>
        <v-card-text>
          确定要删除文件 "{{ deleteTarget?.name }}" 吗？
          <br><br>
          此操作仅从数据库中移除该文件的索引记录，不会删除实际文件。
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="deleteDialogVisible = false">取消</v-btn>
          <v-btn color="error" variant="text" :loading="deleting" @click="confirmDeleteAction">确认删除</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- SnackBar 提示 -->
    <v-snackbar
        v-model="snackbar.visible"
        :color="snackbar.color"
        :timeout="SNACKBAR_TIMEOUT"
        location="top"
    >
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>

<script setup lang="ts">
/**
 * 文件搜索页面 - 增强版
 * 支持分类浏览、高级搜索语法、增强预览面板
 */

import { ref, computed, onMounted, onUnmounted, watch, h } from 'vue'
import { searchApi } from '@/api'
import type { SearchResult, FileCountByCategory } from '@/api/types'
import CategoryList from '@/components/CategoryList/index.tsx'
import FileIcon from '@/components/FileIcon/index.vue'
import { favoritesApi } from '@/api/modules/favorites'
import { recentApi } from '@/api/modules/favorites'
import { CATEGORY_CONFIGS, type FileCategory } from '@/utils/fileCategory'
import { useIndexingStore } from '@/stores/indexing'
import { SIDEBAR_WIDTH, DEFAULT_PAGE_SIZE, PREVIEW_PANEL_WIDTH, PREVIEW_PANEL_MIN_WIDTH, PREVIEW_PANEL_MAX_WIDTH, SNACKBAR_TIMEOUT } from '@/constants/fileSearch'
import { SuperTable } from '@/components/SuperTable'
import type { SuperTableConfig, TableColumn, ActionColumn } from '@/components/SuperTable/types'

// ==================== 类型定义 ====================

interface FileItem {
  id: number
  name: string
  path: string
  extension: string
  size: number
  modified_time: string
  created_time: string
}

interface HistoryItem {
  id: number
  query: string
  search_type: string
}

interface SnackbarState {
  visible: boolean
  message: string
  color: string
}

// ==================== 响应式状态 ====================

/** 是否显示索引进度提示 */
const showIndexProgress = ref(true)

/** 搜索类型 */
const searchType = ref<'filename' | 'content'>('filename')

/** 文件名搜索关键词 */
const searchQuery = ref('')

/** 内容搜索关键词 */
const contentQuery = ref('')

/** 当前选中的分类 */
const selectedCategory = ref<FileCategory>('all')

/** 文件类型筛选 */
const fileTypeFilter = ref<string | null>(null)

/** 最小文件大小筛选（MB） */
const minSizeFilter = ref<number | null>(null)

/** 最大文件大小筛选（MB） */
const maxSizeFilter = ref<number | null>(null)

/** 加载状态 */
const loading = ref(false)
const loadingContent = ref(false)

/** 搜索结果 */
const files = ref<FileItem[]>([])

/** 总数 */
const totalFiles = ref(0)

/** 分页 */
const currentPage = ref(1)
const pageSize = ref(DEFAULT_PAGE_SIZE)
const totalPages = computed(() => Math.ceil(totalFiles.value / pageSize.value))

/** 是否已执行过搜索 */
const hasSearched = ref(false)

/** 搜索历史 */
const searchHistory = ref<HistoryItem[]>([])

/** 预览相关 */
const showPreview = ref(false)
const previewedFile = ref<FileItem | null>(null)
const previewContent = ref('')
let previewTimeout: ReturnType<typeof setTimeout> | null = null

/** 删除对话框 */
const deleteDialogVisible = ref(false)
const deleteTarget = ref<FileItem | null>(null)
const deleting = ref(false)

/** 索引进度 */
const indexingProgress = ref(0)

/** 提示信息 */
const snackbar = ref<SnackbarState>({
  visible: false,
  message: '',
  color: 'info'
})

/** 选中的行 */
const selectedRows = ref<number[]>([])

/** 预览 Tab */
const previewTab = ref<'preview' | 'info'>('preview')

// ==================== SuperTable 配置 ====================

const fileTableConfig = computed<SuperTableConfig<FileItem>>(() => ({
  data: () => files.value,
  title: {
    title: '文件列表',
    icon: 'mdi-file-document-multiple'
  },
  columns: [
    {
      key: 'name',
      title: '文件名',
      sortable: true,
      customRender: (record: FileItem) => {
        return h('div', { class: 'd-flex align-center file-name-cell' }, [
          h(FileIcon, { extension: record.extension, size: 20, class: 'mr-2' }),
          h('span', { class: 'file-name' }, record.name)
        ])
      }
    },
    {
      key: 'size',
      title: '大小',
      sortable: true,
      width: '100px',
      format: (value: number) => formatFileSize(value)
    },
    {
      key: 'modified_time',
      title: '修改时间',
      sortable: true,
      width: '180px',
      format: (value: string) => formatDate(value)
    }
  ] as TableColumn<FileItem>[],
  actions: [
    {
      icon: 'mdi-open-in-app',
      tooltip: '打开文件',
      onClick: (record: FileItem) => openFile(record)
    },
    {
      icon: 'mdi-folder-outline',
      tooltip: '在资源管理器中打开',
      onClick: (record: FileItem) => openInExplorer(record)
    },
    {
      customRender: (record: FileItem) => {
        return h('div', { class: 'd-flex align-center' }, [
          h('div', {
            onClick: (e: Event) => e.stopPropagation()
          }, [
            h('v-menu', {}, {
              default: () => h('v-list', { density: 'compact' }, [
                h('v-list-item', {
                  prependIcon: 'mdi-star-outline',
                  title: '添加收藏',
                  onClick: () => addToFavorites(record)
                }),
                h('v-list-item', {
                  prependIcon: 'mdi-content-copy',
                  title: '复制路径',
                  onClick: () => copyPath(record)
                }),
                h('v-divider', {}),
                h('v-list-item', {
                  prependIcon: 'mdi-delete',
                  title: '删除记录',
                  class: 'text-error',
                  onClick: () => confirmDelete(record)
                })
              ]),
              activator: ({ props }: { props: any }) => h('v-btn', {
                ...props,
                icon: 'mdi-dots-vertical',
                variant: 'text',
                size: 'small',
                onClick: (e: Event) => e.stopPropagation()
              })
            })
          ])
        ])
      }
    }
  ] as ActionColumn<FileItem>[],
  toolBar: [
    {
      icon: 'mdi-refresh',
      tooltip: '刷新',
      onClick: () => refreshFileTable()
    }
  ],
  search: {
    position: 'toolbar',
    layout: 'compact',
    fields: [
      // 1. 主搜索框 - 完整显示
      {
        key: 'query',
        label: '搜索',
        type: 'input',
        placeholder: '搜索文件...',
        showInCompact: true,
        compactStyle: 'full',
        compactWidth: '400px'
      },
      // 2. 文件大小范围 - 完整显示（两个数字输入框）
      {
        key: 'sizeRange',
        label: '大小',
        type: 'range',
        min: 0,
        max: 1024,
        unit: 'MB',
        showInCompact: true,
        compactStyle: 'full'
      },
      // 3. 文件类型 - 完整显示（下拉选择）
      {
        key: 'fileType',
        label: '类型',
        type: 'select',
        options: fileTypeOptions,
        showInCompact: true,
        compactStyle: 'full',
        compactWidth: '160px'
      }
    ],
    buttons: {
      search: {
        text: '搜索',
        icon: 'mdi-magnify',
        color: 'primary',
        variant: 'elevated',
        show: true
      },
      reset: {
        text: '重置',
        icon: 'mdi-refresh',
        show: true,
        variant: 'text'
      }
    }
  },
  pagination: {
    page: currentPage.value,
    pageSize: pageSize.value,
    total: totalFiles.value
  },
  onRowClick: (record: FileItem) => handleRowClick(record),
  rowKey: 'id'
}))

// SuperTable 实例
let fileTable: ReturnType<typeof SuperTable<FileItem>> | null = null
const FileTableComponent = computed(() => {
  fileTable = SuperTable(fileTableConfig.value)
  return fileTable.Table()
})

const refreshFileTable = async () => {
  if (selectedCategory.value !== 'all') {
    await loadByCategory(selectedCategory.value)
  } else if (searchType.value === 'filename' && searchQuery.value) {
    await performSearch()
  } else if (searchType.value === 'content' && contentQuery.value) {
    await performContentSearch()
  } else {
    await loadAllFiles()
  }
}

const fileTypeOptions = [
  { label: '图片', value: 'image' },
  { label: '视频', value: 'video' },
  { label: '音频', value: 'audio' },
  { label: '文档', value: 'document' },
  { label: '代码', value: 'code' },
  { label: '压缩包', value: 'archive' },
  { label: '可执行', value: 'executable' }
]

// ==================== 方法 ====================

/**
 * 显示提示消息
 */
function showMessage(message: string, color: string = 'info'): void {
  snackbar.value = {
    visible: true,
    message,
    color
  }
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes: number): string {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024
    i++
  }
  return `${bytes.toFixed(1)} ${units[i]}`
}

/**
 * 格式化日期
 */
function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN') + ' ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

/**
 * 获取分类显示名称
 */
function getCategoryLabel(category: FileCategory): string {
  if (category === 'all') return '全部'
  const config = CATEGORY_CONFIGS.find(c => c.key === category)
  return config?.label || category
}

/**
 * 处理分类选择
 */
async function handleCategorySelect(category: FileCategory): Promise<void> {
  selectedCategory.value = category
  currentPage.value = 1

  if (category === 'all') {
    await loadAllFiles()
  } else {
    await loadByCategory(category)
  }
}

/**
 * 处理收藏夹选择
 */
function handleSelectFavorite(): void {
  showMessage('收藏夹功能开发中...', 'info')
}

/**
 * 处理最近访问选择
 */
function handleSelectRecent(): void {
  showMessage('最近访问功能开发中...', 'info')
}

/**
 * 按分类加载文件
 */
async function loadByCategory(category: FileCategory): Promise<void> {
  loading.value = true
  try {
    const response = await searchApi.getFilesByCategory(
      category,
      currentPage.value,
      pageSize.value
    )

    if (response.success) {
      files.value = response.files.map((f: any) => ({
        id: f.id,
        name: f.name,
        path: f.path,
        extension: f.extension,
        size: f.size,
        modified_time: f.modified_time,
        created_time: f.created_time
      }))
      totalFiles.value = response.total
      hasSearched.value = true
    }
  } catch (error) {
    console.error('[FileSearch] Failed to load by category:', error)
    showMessage('加载失败', 'error')
  } finally {
    loading.value = false
  }
}

/**
 * 加载所有文件
 */
async function loadAllFiles(): Promise<void> {
  loading.value = true
  try {
    const response = await searchApi.getFilesByCategory(
      'all',
      currentPage.value,
      pageSize.value
    )

    if (response.success) {
      files.value = response.files.map((f: any) => ({
        id: f.id,
        name: f.name,
        path: f.path,
        extension: f.extension,
        size: f.size,
        modified_time: f.modified_time,
        created_time: f.created_time
      }))
      totalFiles.value = response.total
      hasSearched.value = true
    }
  } catch (error) {
    console.error('[FileSearch] Failed to load all files:', error)
    showMessage('加载失败', 'error')
  } finally {
    loading.value = false
  }
}

/**
 * 执行文件名搜索
 */
async function performSearch(): Promise<void> {
  if (!searchQuery.value.trim() && !selectedCategory.value) return

  loading.value = true
  hasSearched.value = true

  try {
    const params: Record<string, any> = {
      query: searchQuery.value.trim(),
      page: currentPage.value,
      pageSize: pageSize.value
    }

    if (fileTypeFilter.value) {
      params.fileType = fileTypeFilter.value
    }

    if (minSizeFilter.value !== null) {
      params.minSize = minSizeFilter.value
    }

    if (maxSizeFilter.value !== null) {
      params.maxSize = maxSizeFilter.value
    }

    const response = await searchApi.search(params)

    if (response.success) {
      files.value = response.files.map((f: any) => ({
        id: f.id,
        name: f.name,
        path: f.path,
        extension: f.extension,
        size: f.size,
        modified_time: f.modified_time,
        created_time: f.created_time
      }))
      totalFiles.value = response.total

      // 记录搜索历史
      if (searchQuery.value.trim()) {
        await saveSearchHistory(searchQuery.value.trim(), 'filename')
      }
    }
  } catch (error) {
    console.error('[FileSearch] Search error:', error)
    showMessage('搜索失败', 'error')
  } finally {
    loading.value = false
  }
}

/**
 * 执行内容搜索
 */
async function performContentSearch(): Promise<void> {
  if (!contentQuery.value.trim()) return

  loadingContent.value = true
  hasSearched.value = true

  try {
    const response = await searchApi.searchContent({
      query: contentQuery.value.trim(),
      page: currentPage.value,
      pageSize: pageSize.value
    })

    if (response.success) {
      files.value = response.results.map((r: any) => ({
        id: r.id,
        name: r.name,
        path: r.path,
        extension: r.extension,
        size: r.size,
        modified_time: r.modified_time,
        created_time: ''
      }))
      totalFiles.value = response.total

      await saveSearchHistory(contentQuery.value.trim(), 'content')
    }
  } catch (error) {
    console.error('[FileSearch] Content search error:', error)
    showMessage('内容搜索失败', 'error')
  } finally {
    loadingContent.value = false
  }
}

/**
 * 保存搜索历史
 */
async function saveSearchHistory(query: string, type: string): Promise<void> {
  try {
    await searchApi.saveSearchHistory({ query, search_type: type })
    await loadSearchHistory()
  } catch (error) {
    console.error('[FileSearch] Failed to save history:', error)
  }
}

/**
 * 加载搜索历史
 */
async function loadSearchHistory(): Promise<void> {
  try {
    const response = await searchApi.getSearchHistory(10)
    if (response.success) {
      searchHistory.value = response.history
    }
  } catch (error) {
    console.error('[FileSearch] Failed to load history:', error)
  }
}

/**
 * 使用历史搜索项
 */
function useHistoryItem(item: HistoryItem): void {
  if (item.search_type === 'content') {
    contentQuery.value = item.query
    searchType.value = 'content'
    performContentSearch()
  } else {
    searchQuery.value = item.query
    searchType.value = 'filename'
    performSearch()
  }
}

/**
 * 移除历史项
 */
async function removeHistory(item: HistoryItem): Promise<void> {
  try {
    await searchApi.removeSearchHistory(item.id)
    await loadSearchHistory()
  } catch (error) {
    console.error('[FileSearch] Failed to remove history:', error)
  }
}

/**
 * 清空搜索
 */
function clearSearch(): void {
  searchQuery.value = ''
  fileTypeFilter.value = null
  minSizeFilter.value = null
  maxSizeFilter.value = null
  files.value = []
  totalFiles.value = 0
  hasSearched.value = false
}

/**
 * 清空内容搜索
 */
function clearContentSearch(): void {
  contentQuery.value = ''
  files.value = []
  totalFiles.value = 0
  hasSearched.value = false
}

/**
 * 处理表格更新事件（排序、分页）
 */
function handleTableUpdate(options: any): void {
  currentPage.value = options.page
  pageSize.value = options.itemsPerPage

  if (selectedCategory.value !== 'all') {
    loadByCategory(selectedCategory.value)
  } else if (searchType.value === 'filename' && searchQuery.value) {
    performSearch()
  } else if (searchType.value === 'content' && contentQuery.value) {
    performContentSearch()
  }
}

/**
 * 处理行点击（显示预览）
 */
function handleRowClick(file: FileItem): void {
  previewedFile.value = file
  showPreview.value = true
  loadPreviewContent(file)

  // 记录访问
  recentApi.recordAccess({
    file_id: file.id,
    path: file.path,
    name: file.name,
    access_type: 'preview'
  }).catch(console.error)
}

/**
 * 加载预览内容
 */
async function loadPreviewContent(file: FileItem): Promise<void> {
  previewContent.value = '<div class="text-center py-8"><v-progress-circular indeterminate /></div>'

  try {
    const ext = file.extension.toLowerCase()
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp']

    if (imageExts.includes(ext)) {
      const response = await searchApi.getImageBuffer(file.path)
      if (response.success && response.data) {
        const blob = new Blob([new Uint8Array(response.data)], { type: `image/${ext}` })
        previewContent.value = `<img src="${URL.createObjectURL(blob)}" alt="${file.name}" />`
      }
    } else {
      const response = await searchApi.getFileContent(file.path)
      if (response.success) {
        const codeExts = ['js', 'ts', 'vue', 'py', 'java', 'go', 'rs', 'json', 'xml', 'html', 'css', 'scss']
        
        if (codeExts.includes(ext)) {
          const lines = response.content.split('\n').slice(0, 50)
          const numberedLines = lines.map((line: string, index: number) => 
            `<div style="display:flex;"><span style="color:#666;user-select:none;width:40px;text-align:right;padding-right:16px;">${index + 1}</span><code>${escapeHtml(line)}</code></div>`
          ).join('')
          previewContent.value = `<pre style="font-size:13px;line-height:1.5;margin:0;padding:0;overflow-x:auto;">${numberedLines}</pre>`
        } else {
          previewContent.value = `<pre style="white-space:pre-wrap;font-size:13px;">${escapeHtml(response.content.substring(0, 5000))}</pre>`
        }
      }
    }
  } catch (error) {
    console.error('[FileSearch] Preview error:', error)
    previewContent.value = '<div class="text-center py-8 text-grey">无法预览此文件</div>'
  }
}

/**
 * HTML 转义
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

/**
 * 关闭预览
 */
function closePreview(): void {
  showPreview.value = false
  previewedFile.value = null
  previewContent.value = ''
  previewTab.value = 'preview'
}

/**
 * 获取文件类型对应的图标名称
 */
function getFileIcon(extension: string): string {
  const ext = extension.toLowerCase()

  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext)) {
    return 'mdi-image'
  }
  if (['mp4', 'avi', 'mkv', 'mov', 'wmv'].includes(ext)) {
    return 'mdi-video'
  }
  if (['mp3', 'wav', 'flac', 'aac'].includes(ext)) {
    return 'mdi-music'
  }
  if (['pdf'].includes(ext)) {
    return 'mdi-file-pdf-box'
  }
  if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) {
    return 'mdi-file-document'
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return 'mdi-folder-zip'
  }
  if (['js', 'ts', 'vue', 'py', 'java', 'go', 'rs'].includes(ext)) {
    return 'mdi-code-braces'
  }

  return 'mdi-file'
}

/**
 * 打开文件
 */
async function openFile(file: FileItem): Promise<void> {
  try {
    const response = await searchApi.openFile(file.path)
    if (response.success) {
      showMessage(`已打开: ${file.name}`, 'success')

      recentApi.recordAccess({
        file_id: file.id,
        path: file.path,
        name: file.name,
        access_type: 'open'
      }).catch(console.error)
    }
  } catch (error) {
    console.error('[FileSearch] Open error:', error)
    showMessage('打开文件失败', 'error')
  }
}

/**
 * 在资源管理器中打开
 */
async function openInExplorer(file: FileItem): Promise<void> {
  try {
    const response = await searchApi.openInSystem(file.path)
    if (response.success) {
      showMessage('已在资源管理器中打开', 'success')
    }
  } catch (error) {
    console.error('[FileSearch] Explorer error:', error)
    showMessage('打开失败', 'error')
  }
}

/**
 * 添加到收藏夹
 */
async function addToFavorites(file: FileItem): Promise<void> {
  try {
    const isFav = await favoritesApi.isFavorited(file.path)
    
    if (isFav.data.isFavorited) {
      showMessage('已存在于收藏夹', 'warning')
      return
    }

    await favoritesApi.addFavorite({
      type: 'file',
      name: file.name,
      path: file.path
    })

    showMessage('已添加到收藏夹', 'success')
  } catch (error) {
    console.error('[FileSearch] Add favorite error:', error)
    showMessage('添加收藏失败', 'error')
  }
}

/**
 * 复制路径
 */
function copyPath(file: FileItem): void {
  navigator.clipboard.writeText(file.path).then(() => {
    showMessage('路径已复制', 'success')
  }).catch(() => {
    showMessage('复制失败', 'error')
  })
}

/**
 * 确认删除
 */
function confirmDelete(file: FileItem): void {
  deleteTarget.value = file
  deleteDialogVisible.value = true
}

/**
 * 执行删除操作
 */
async function confirmDeleteAction(): Promise<void> {
  if (!deleteTarget.value) return

  deleting.value = true
  try {
    const response = await searchApi.deleteFile(deleteTarget.value.id)
    if (response.success) {
      showMessage('已删除', 'success')
      files.value = files.value.filter(f => f.id !== deleteTarget.value!.id)
      totalFiles.value--
    }
    deleteDialogVisible.value = false
    deleteTarget.value = null
  } catch (error) {
    console.error('[FileSearch] Delete error:', error)
    showMessage('删除失败', 'error')
  } finally {
    deleting.value = false
  }
}

// ==================== 索引进度状态（使用全局 Store）====================

const indexingStore = useIndexingStore()

/**
 * 索引状态 - 从全局 Store 获取
 * 使用 fileCounts.all 作为 totalFiles，因为 indexingStore.totalFiles 只在索引过程中有效
 */
const indexStatus = computed(() => ({
  isIndexing: indexingStore.isIndexing,
  totalFiles: indexingStore.fileCounts.all,
  indexedFiles: indexingStore.currentFile,
  currentPath: indexingStore.currentPath,
  lastIndexed: null
}))

/**
 * 初始化索引进度状态
 */
async function initIndexStatus(): Promise<void> {
  await indexingStore.initialize()
}

// ==================== 生命周期 ====================

onMounted(async () => {
  await loadSearchHistory()
  await initIndexStatus()
  // 默认加载全部文件
  await loadAllFiles()
})

onUnmounted(() => {
  // 注意：不要在组件卸载时停止轮询
  // 因为索引进度是全局状态，其他页面可能还在显示
})
</script>

<style lang="scss" scoped>
.file-search-page {
  padding: 0;
  height: 100%;
  overflow: hidden;
}

.main-layout {
  display: flex;
  height: 100%;
  gap: 0;
}

.sidebar-section {
  flex-shrink: 0;
  width: 200px;
  height: 100%;
  overflow: hidden;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  background-color: rgba(var(--v-theme-surface), 1);

  @media (max-width: 959px) and (min-width: 600px) {
    position: fixed;
    top: 64px;
    left: 0;
    right: 0;
    z-index: 100;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  @media (max-width: 599px) {
    display: none;
  }
}

.content-section {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0 24px;

  .search-content {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }

  .results-table {
    border-radius: 8px;

    .table-container {
      height: calc(100vh - 200px);
      overflow-y: auto;
    }

    .file-name-cell {
      .file-name {
        font-weight: 500;
        cursor: pointer;
        
        &:hover {
          color: rgb(var(--v-theme-primary));
        }
      }
    }
  }
}
</style>
