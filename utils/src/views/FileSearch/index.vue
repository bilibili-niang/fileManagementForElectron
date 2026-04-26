<template>
  <v-container fluid class="file-search-page">
    <!-- 主布局：三栏结构 -->
    <div class="main-layout">
      <!-- 左侧：分类导航侧边栏 -->
      <aside class="sidebar-section">
        <CategorySidebar
          v-model="selectedCategory"
          @select="handleCategorySelect"
        />
      </aside>

      <!-- 中间：主内容区 -->
      <main class="content-section">
        <!-- 搜索类型 Tab -->
        <v-card variant="outlined" class="search-type-card mb-3">
          <v-tabs v-model="searchType" color="primary" grow density="compact">
            <v-tab value="filename" class="text-none px-4">
              <v-icon icon="mdi-file-search" size="small" start></v-icon>
              文件名
            </v-tab>
            <v-tab value="content" class="text-none px-4">
              <v-icon icon="mdi-text-box-search" size="small" start></v-icon>
              文件内容
            </v-tab>
          </v-tabs>
        </v-card>

        <!-- 索引进度提示 -->
        <v-card
          v-if="indexStatus.isIndexing || indexStatus.totalFiles === 0"
          variant="outlined"
          class="mb-3"
          :color="indexStatus.isIndexing ? 'primary' : 'warning'"
        >
          <v-card-text class="py-2">
            <div v-if="indexStatus.isIndexing" class="d-flex align-center">
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
            </div>
            <div v-else-if="indexStatus.totalFiles === 0" class="d-flex align-center">
              <v-icon icon="mdi-information" color="warning" class="mr-2"></v-icon>
              <span class="text-body-2">正在准备文件索引...</span>
            </div>
          </v-card-text>
        </v-card>

        <!-- 搜索框区域 -->
        <div v-show="searchType === 'filename'" class="search-area">
          <SearchBox
            v-model="searchQuery"
            :loading="loading"
            placeholder="搜索文件... 支持语法：ext:pdf size:>10mb date:today path:downloads *.js"
            :show-advanced-filters="true"
            @search="performSearch"
            @clear="clearSearch"
          />

          <!-- 筛选条件 -->
          <v-row dense class="filter-row mt-2">
            <v-col cols="6" sm="4" md="3">
              <v-text-field
                  v-model.number="minSizeFilter"
                  label="最小 (MB)"
                  type="number"
                  min="0"
                  step="0.1"
                  density="compact"
                  variant="outlined"
                  hide-details
              ></v-text-field>
            </v-col>

            <v-col cols="6" sm="4" md="3">
              <v-text-field
                  v-model.number="maxSizeFilter"
                  label="最大 (MB)"
                  type="number"
                  min="0"
                  step="0.1"
                  density="compact"
                  variant="outlined"
                  hide-details
              ></v-text-field>
            </v-col>

            <v-col cols="12" sm="4" md="6" class="d-flex align-center justify-end gap-2">
              <v-btn
                  variant="text"
                  color="primary"
                  size="small"
                  prepend-icon="mdi-magnify"
                  :loading="loading"
                  @click="performSearch"
              >
                搜索
              </v-btn>
              <v-btn
                  variant="text"
                  color="grey"
                  size="small"
                  prepend-icon="mdi-close-circle"
                  @click="clearSearch"
              >
                清空
              </v-btn>
            </v-col>
          </v-row>
        </div>

        <!-- 文件内容搜索 -->
        <div v-show="searchType === 'content'" class="search-area mt-3">
          <SearchBox
              v-model="contentQuery"
              :loading="loadingContent"
              placeholder="搜索文件内容..."
              @search="performContentSearch"
              @clear="clearContentSearch"
          />
        </div>

        <!-- 搜索历史标签 -->
        <div v-if="searchHistory.length > 0 && searchType === 'filename'" class="history-bar mt-3">
          <span class="history-label">历史:</span>
          <v-chip
              v-for="item in searchHistory.slice(0, 8)"
              :key="item.id"
              size="small"
              closable
              class="mr-1"
              @click="useHistoryItem(item)"
              @click:close="removeHistory(item)"
          >
            {{ item.query }}
          </v-chip>
        </div>

        <!-- 搜索结果统计 -->
        <v-card v-if="files.length > 0 || loading" variant="flat" class="result-stats mt-3 pa-3">
          <template v-if="loading">
            <v-progress-linear indeterminate color="primary"></v-progress-linear>
          </template>
          <template v-else-if="files.length > 0">
            <span class="stats-text">
              找到 {{ totalFiles }} 个文件
              <template v-if="selectedCategory !== 'all'">
                （{{ getCategoryLabel(selectedCategory) }}）
              </template>
            </span>
          </template>
          <template v-else-if="hasSearched && files.length === 0">
            <span class="stats-text text-grey">未找到匹配的文件</span>
          </template>
        </v-card>

        <!-- 搜索结果列表 -->
        <v-card variant="outlined" class="results-table mt-3">
          <v-data-table-server
              :headers="tableHeaders"
              :items="files"
              :items-length="totalFiles"
              :loading="loading"
              :page.sync="currentPage"
              :items-per-page.sync="pageSize"
              density="compact"
              hover
              show-select
              item-value="id"
              @update:options="handleTableUpdate"
              @click:row="(event: any, row: any) => handleRowClick(row.item)"
          >
            <!-- 文件名列 -->
            <template #item.name="{ item }">
              <div class="d-flex align-center file-name-cell">
                <FileIcon :extension="item.extension" :size="20" class="mr-2" />
                <span class="file-name">{{ item.name }}</span>
              </div>
            </template>

            <!-- 大小列 -->
            <template #item.size="{ item }">
              {{ formatFileSize(item.size) }}
            </template>

            <!-- 修改时间列 -->
            <template #item.modified_time="{ item }">
              {{ formatDate(item.modified_time) }}
            </template>

            <!-- 操作列 -->
            <template #item.actions="{ item }">
              <v-btn
                  icon="mdi-open-in-app"
                  variant="text"
                  size="small"
                  title="打开文件"
                  @click.stop="openFile(item)"
              ></v-btn>
              <v-btn
                  icon="mdi-folder-outline"
                  variant="text"
                  size="small"
                  title="在资源管理器中打开"
                  @click.stop="openInExplorer(item)"
              ></v-btn>
              <v-menu>
                <template #activator="{ props }">
                  <v-btn
                      icon="mdi-dots-vertical"
                      variant="text"
                      size="small"
                      v-bind="props"
                      @click.stop
                  ></v-btn>
                </template>
                <v-list density="compact">
                  <v-list-item
                      prepend-icon="mdi-star-outline"
                      title="添加收藏"
                      @click="addToFavorites(item)"
                  ></v-list-item>
                  <v-list-item
                      prepend-icon="mdi-content-copy"
                      title="复制路径"
                      @click="copyPath(item)"
                  ></v-list-item>
                  <v-divider></v-divider>
                  <v-list-item
                      prepend-icon="mdi-delete"
                      title="删除记录"
                      class="text-error"
                      @click="confirmDelete(item)"
                  ></v-list-item>
                </v-list>
              </v-menu>
            </template>

            <!-- 无数据提示 -->
            <template #no-data>
              <div class="pa-8 text-center text-grey">
                <v-icon icon="mdi-file-search-outline" size="48" class="mb-3"></v-icon>
                <p>输入关键词开始搜索</p>
              </div>
            </template>
          </v-data-table-server>
        </v-card>

        <!-- 分页控件 -->
        <v-pagination
            v-if="totalPages > 1"
            v-model="currentPage"
            :length="totalPages"
            :total-visible="7"
            density="comfortable"
            class="mt-4"
        ></v-pagination>

        <!-- 索引进度条 -->
        <v-progress-linear
            v-if="indexingProgress > 0 && indexingProgress < 100"
            :model-value="indexingProgress"
            color="primary"
            height="6"
            rounded
            class="mt-4"
        >
          <template #default="{ value }">
            <strong>{{ Math.round(value) }}%</strong> - 索引中...
          </template>
        </v-progress-linear>
      </main>

      <!-- 右侧：预览面板 -->
      <aside v-if="showPreview" class="preview-section">
        <FilePreviewPanel
            v-model="showPreview"
            :file="previewedFile"
            :content="previewContent"
            :width="350"
            :min-width="250"
            :max-width="600"
            @close="closePreview"
        />
      </aside>
    </div>

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
        :timeout="3000"
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

import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { searchApi } from '@/api'
import type { SearchResult, FileCountByCategory } from '@/api/types'
import CategorySidebar from './components/CategorySidebar/index.tsx'
import SearchBox from './components/SearchBox/index.tsx'
import FilePreviewPanel from './components/FilePreviewPanel/index.tsx'
import FileIcon from '@/components/FileIcon/index.vue'
import { favoritesApi } from '@/api/modules/favorites'
import { recentApi } from '@/api/modules/favorites'
import { CATEGORY_CONFIGS, type FileCategory } from '@/utils/fileCategory'

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
const pageSize = ref(50)
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

// ==================== 表格配置 ====================

const tableHeaders = [
  { title: '文件名', key: 'name', sortable: true },
  { title: '大小', key: 'size', sortable: true, width: '100px' },
  { title: '修改时间', key: 'modified_time', sortable: true, width: '180px' },
  { title: '操作', key: 'actions', sortable: false, width: '150px', align: 'end' as const }
]

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
    if (searchQuery.value) {
      await performSearch()
    }
  } else {
    await loadByCategory(category)
  }
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
        id: r.file_id,
        name: r.filename,
        path: r.filepath,
        extension: r.filepath.split('.').pop() || '',
        size: 0,
        modified_time: '',
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

// ==================== 索引状态检测 ====================

/**
 * 索引状态
 */
const indexStatus = ref<{
  isIndexing: boolean
  totalFiles: number
  indexedFiles: number
  currentPath: string
  lastIndexed: string | null
}>({
  isIndexing: false,
  totalFiles: 0,
  indexedFiles: 0,
  currentPath: '',
  lastIndexed: null
})

/**
 * 检查索引状态
 */
async function checkIndexStatus(): Promise<void> {
  try {
    // 获取文件总数
    const counts = await searchApi.getFileCounts()
    const totalFiles = counts.all || 0

    // 获取索引进度
    const progress = await searchApi.getIndexingProgress()

    indexStatus.value = {
      isIndexing: progress.isIndexing,
      totalFiles: progress.totalFiles || totalFiles,
      indexedFiles: progress.currentFile || 0,
      currentPath: progress.currentPath || '',
      lastIndexed: null
    }

    console.log('[FileSearch] Index status:', indexStatus.value)

    // 如果没有索引过且当前没有正在索引,自动开始索引
    if (totalFiles === 0 && !progress.isIndexing) {
      console.log('[FileSearch] No files indexed, starting auto index...')
      await startAutoIndex()
    }
  } catch (error) {
    console.error('[FileSearch] Failed to check index status:', error)
  }
}

/**
 * 自动开始索引
 */
async function startAutoIndex(): Promise<void> {
  try {
    // 获取所有驱动器
    const response = await fetch('http://localhost:3000/api/files/drives')
    const data = await response.json()
    const drives = data.success ? data.drives : ['C:', 'D:']

    console.log('[FileSearch] Starting auto index for drives:', drives)

    // 开始索引
    await fetch('http://localhost:3000/api/files/index/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ drives })
    })

    // 开始轮询进度
    startIndexProgressPolling()
  } catch (error) {
    console.error('[FileSearch] Failed to start auto index:', error)
  }
}

/**
 * 索引进度轮询
 */
let indexProgressInterval: ReturnType<typeof setInterval> | null = null

function startIndexProgressPolling(): void {
  if (indexProgressInterval) {
    clearInterval(indexProgressInterval)
  }

  indexStatus.value.isIndexing = true

  indexProgressInterval = setInterval(async () => {
    try {
      const progress = await searchApi.getIndexingProgress()

      indexStatus.value = {
        isIndexing: progress.isIndexing,
        totalFiles: progress.totalFiles || 0,
        indexedFiles: progress.currentFile || 0,
        currentPath: progress.currentPath || '',
        lastIndexed: null
      }

      // 如果索引完成
      if (!progress.isIndexing) {
        stopIndexProgressPolling()
        showMessage(`索引完成!共索引 ${progress.totalFiles} 个文件`, 'success')
        // 刷新文件计数
        await checkIndexStatus()
      }
    } catch (error) {
      console.error('[FileSearch] Index progress polling error:', error)
    }
  }, 1000)
}

function stopIndexProgressPolling(): void {
  if (indexProgressInterval) {
    clearInterval(indexProgressInterval)
    indexProgressInterval = null
  }
  indexStatus.value.isIndexing = false
}

// ==================== 生命周期 ====================

onMounted(async () => {
  await loadSearchHistory()
  await checkIndexStatus()
})

onUnmounted(() => {
  stopIndexProgressPolling()
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
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

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
  overflow-y: auto;
  padding: 0 24px;

  .search-type-card {
    border-radius: 8px;
  }

  .search-area {
    margin-top: 16px;
  }

  .filter-row {
    align-items: center;
  }

  .history-bar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;

    .history-label {
      font-size: 13px;
      font-weight: 500;
      color: rgba(var(--v-theme-on-surface), 0.6);
      margin-right: 4px;
    }
  }

  .result-stats {
    border-radius: 8px;

    .stats-text {
      font-size: 14px;
      font-weight: 500;
    }
  }

  .results-table {
    border-radius: 8px;

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

.preview-section {
  flex-shrink: 0;
  width: 350px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.08);

  @media (max-width: 1279px) {
    position: fixed;
    right: 0;
    top: 64px;
    bottom: 0;
    width: 350px;
    z-index: 99;
    box-shadow: -4px 0 12px rgba(0, 0, 0, 0.15);
  }

  @media (max-width: 959px) {
    display: none;
  }
}
</style>
