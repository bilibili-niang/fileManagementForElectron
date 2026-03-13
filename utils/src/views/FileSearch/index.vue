<template>
  <v-container fluid class="file-search-container">
    <!-- 搜索类型 Tab -->
    <v-row dense>
      <v-col cols="12" sm="6" md="4" lg="3">
        <v-card variant="outlined" class="mb-1">
          <v-tabs v-model="searchType" color="primary" grow density="compact">
            <v-tab value="filename" class="text-none px-2">
              <v-icon icon="mdi-file-search" size="small" start></v-icon>
              文件名
            </v-tab>
            <v-tab value="content" class="text-none px-2">
              <v-icon icon="mdi-text-box-search" size="small" start></v-icon>
              文件内容
            </v-tab>
          </v-tabs>
        </v-card>
      </v-col>
    </v-row>

    <!-- 文件名搜索 -->
    <div v-show="searchType === 'filename'">
      <v-row dense>
        <v-col cols="12">
          <v-text-field
              v-model="searchQuery"
              label="搜索文件"
              placeholder="支持语法：文件名 扩展名（如：document pdf）"
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              density="compact"
              clearable
              @update:model-value="onSearchInput"
              @keydown.enter.prevent="performSearch"
              hint="示例：report pdf | image jpg | code js"
              persistent-hint
          ></v-text-field>
        </v-col>
      </v-row>

      <!-- 搜索历史 -->
      <v-row dense v-if="searchHistory.length > 0">
        <v-col cols="12">
          <div class="search-history-bar">
            <div class="history-chips">
              <span class="history-label">历史:</span>
              <v-chip
                  v-for="item in searchHistory.slice(0, 5)"
                  :key="item.id"
                  size="small"
                  variant="outlined"
                  color="primary"
                  class="history-chip"
                  @click="selectHistory(item.query)"
              >
                {{ item.query }}
                <v-icon
                    icon="mdi-close"
                    size="12"
                    class="ml-1"
                    @click.stop="deleteHistoryItem(item.id)"
                ></v-icon>
              </v-chip>
              <v-btn
                  v-if="searchHistory.length > 0"
                  variant="text"
                  density="compact"
                  size="x-small"
                  color="grey"
                  @click="clearAllHistory"
              >
                清除
              </v-btn>
            </div>
          </div>
        </v-col>
      </v-row>

      <v-row dense>
        <v-col cols="12" sm="6" md="3">
          <v-select
              v-model="searchOptions.fileType"
              :items="fileTypeOptions"
              label="文件类型"
              variant="outlined"
              density="compact"
              clearable
              @update:model-value="performSearch"
          ></v-select>
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-text-field
              v-model="searchOptions.minSize"
              label="最小大小 (MB)"
              type="number"
              variant="outlined"
              density="compact"
              clearable
              @update:model-value="performSearch"
          ></v-text-field>
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-text-field
              v-model="searchOptions.maxSize"
              label="最大大小 (MB)"
              type="number"
              variant="outlined"
              density="compact"
              clearable
              @update:model-value="performSearch"
          ></v-text-field>
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-btn
              color="primary"
              variant="outlined"
              density="compact"
              @click="clearFilters"
              class="mt-1"
          >
            <v-icon icon="mdi-filter-remove" size="small" class="mr-1"></v-icon>
            清除筛选
          </v-btn>
        </v-col>
      </v-row>
    </div>

    <!-- 文件内容搜索 -->
    <div v-show="searchType === 'content'">
      <v-row>
        <v-col cols="12">
          <v-text-field
              v-model="contentQuery"
              label="搜索文件内容"
              placeholder="输入关键词搜索文件内容"
              prepend-inner-icon="mdi-text-box-search"
              variant="outlined"
              clearable
              @update:model-value="onContentSearchInput"
              @keydown.enter.prevent="performContentSearch"
              hint="支持文本文件：代码、文档、配置文件等"
              persistent-hint
          ></v-text-field>
        </v-col>
      </v-row>

      <!-- 内容搜索历史 -->
      <v-row dense v-if="contentSearchHistory.length > 0">
        <v-col cols="12">
          <div class="search-history-bar">
            <div class="history-chips">
              <span class="history-label">历史:</span>
              <v-chip
                  v-for="item in contentSearchHistory.slice(0, 5)"
                  :key="'content-'+item.id"
                  size="small"
                  variant="outlined"
                  color="primary"
                  class="history-chip"
                  @click="selectContentHistory(item.query)"
              >
                {{ item.query }}
                <v-icon
                    icon="mdi-close"
                    size="12"
                    class="ml-1"
                    @click.stop="deleteContentHistoryItem(item.id)"
                ></v-icon>
              </v-chip>
              <v-btn
                  v-if="contentSearchHistory.length > 0"
                  variant="text"
                  density="compact"
                  size="x-small"
                  color="grey"
                  @click="clearAllContentHistory"
              >
                清除
              </v-btn>
            </div>
          </div>
        </v-col>
      </v-row>
      <v-row>
        <v-col cols="12">
          <!-- 内容索引状态 -->
          <v-alert
              :type="contentStats.indexedFiles > 0 ? 'success' : 'warning'"
              variant="tonal"
              density="compact"
              class="compact-alert"
          >
            <template v-slot:prepend>
              <v-icon :icon="contentStats.indexedFiles > 0 ? 'mdi-check-circle' : 'mdi-alert'" size="small"></v-icon>
            </template>
            <span class="compact-text" v-if="contentStats.indexedFiles > 0">
                  已索引 {{ contentStats.indexedFiles }}/{{ contentStats.totalFiles }} 个文件
                  <span v-if="contentStats.lastIndexed">，更新于 {{ formatDate(contentStats.lastIndexed) }}</span>
                </span>
            <span class="compact-text" v-else>
                  尚未建立内容索引，请前往"设置"页面开始索引
                </span>
          </v-alert>
        </v-col>
      </v-row>
    </div>

    <v-row v-if="loading">
      <v-col cols="12" class="text-center">
        <v-progress-circular indeterminate color="primary"></v-progress-circular>
      </v-col>
    </v-row>

    <!-- 文件名搜索结果 - 纯 flex 布局 -->
    <div v-show="searchType === 'filename' && results.length > 0" class="flex-result-container">
      <!-- 左侧列表 -->
      <div class="flex-list-area">
        <v-data-table
            :headers="headers"
            :items="results"
            :items-per-page="pageSize"
            :page="currentPage"
            :loading="loading"
            @click:row="openFile"
            hover
            class="file-table"
        >
          <template v-slot:item.name="{ item }">
            <div
                class="d-flex align-center file-name-cell"
                @click="openFile(item)"
                @contextmenu.prevent="showContextMenu($event, item)"
            >
              <FileIcon :extension="item.extension" :size="24" class="mr-2"></FileIcon>
              <span
                  class="file-name"
                  @mouseenter="showPreview($event, item)"
                  @mouseleave="hidePreview"
              >{{ item.name }}</span>
            </div>
          </template>
          <template v-slot:item.path="{ item }">
            <span
                class="file-path"
                @click="openFile(item)"
                @contextmenu.prevent="showContextMenu($event, item)"
            >{{ item.path }}</span>
          </template>
          <template v-slot:item.size="{ item }">
            {{ formatSize(item.size) }}
          </template>
          <template v-slot:item.modified_time="{ item }">
            {{ formatDate(item.modified_time) }}
          </template>
        </v-data-table>

        <v-pagination
            v-model="currentPage"
            :length="totalPages"
            :total-visible="7"
            class="mt-4"
        ></v-pagination>
      </div>

      <!-- 右侧预览面板 -->
      <div class="flex-preview-area">
        <div class="preview-panel-fixed">
          <div class="preview-title">{{ previewFileName || '预览' }}</div>
          <div class="preview-content" v-html="previewContent || '<div style=\'padding: 20px; color: #999;\'>鼠标悬停在文件上查看预览</div>'"></div>
        </div>
      </div>
    </div>

    <!-- 文件内容搜索结果 -->
    <v-row v-show="searchType === 'content' && contentResults.length > 0">
      <v-col cols="12">
        <v-list class="content-search-list">
          <v-list-item
              v-for="item in contentResults"
              :key="item.id"
              @click="openFile(item)"
              @mouseenter="showPreview($event, item)"
              @mouseleave="hidePreview"
              class="content-result-item"
          >
            <template v-slot:prepend>
              <FileIcon :extension="item.extension" :size="32" class="mr-4"></FileIcon>
            </template>

            <v-list-item-title class="d-flex align-center">
              <span class="file-name">{{ item.name }}</span>
              <v-chip size="small" color="primary" class="ml-2">
                {{ item.matchCount }} 处匹配
              </v-chip>
            </v-list-item-title>

            <v-list-item-subtitle class="mt-1">
              <div class="file-path">{{ item.path }}</div>
              <div class="content-preview mt-2">{{ item.contentPreview }}</div>
            </v-list-item-subtitle>

            <template v-slot:append>
              <div class="text-right">
                <div class="text-caption">{{ formatSize(item.size) }}</div>
                <div class="text-caption">{{ formatDate(item.modified_time) }}</div>
              </div>
            </template>
          </v-list-item>
        </v-list>

        <v-pagination
            v-model="contentPage"
            :length="contentTotalPages"
            :total-visible="7"
            class="mt-4"
        ></v-pagination>
      </v-col>
    </v-row>

    <!-- 空状态提示 - 文件名搜索 -->
    <v-row v-show="searchType === 'filename' && !loading && results.length === 0">
      <v-col cols="12" class="text-center text-grey">
        <v-icon icon="mdi-file-search-outline" size="64" class="mb-4"></v-icon>
        <p>未找到匹配的文件</p>
      </v-col>
    </v-row>

    <!-- 空状态提示 - 文件内容搜索 -->
    <v-row v-show="searchType === 'content' && !loading && contentResults.length === 0">
      <v-col cols="12" class="text-center text-grey">
        <v-icon icon="mdi-file-search-outline" size="64" class="mb-4"></v-icon>
        <p>未找到匹配的文件</p>
      </v-col>
    </v-row>

    <v-row v-if="indexProgress.show">
      <v-col cols="12">
        <v-alert type="info" variant="tonal" class="mt-4">
          <div class="d-flex align-center">
            <v-progress-linear
                :model-value="indexProgress.progress * 100"
                color="primary"
                class="flex-grow-1 mr-4"
            ></v-progress-linear>
            <span>{{ Math.round(indexProgress.progress * 100) }}%</span>
          </div>
          <div class="text-caption mt-2">
            正在索引：{{ indexProgress.currentPath }}
          </div>
        </v-alert>
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


  </v-container>
</template>

<script setup lang="ts">
import {ref, watch, onMounted, onUnmounted, computed, inject} from 'vue'
import {debounce} from 'lodash-es'
import FileIcon from '@/components/FileIcon/index.vue'
import {historyApi, configApi} from '@/api'

// 调试日志工具
async function debugLog(component: string, message: string, data?: any) {
  try {
    await configApi.addDebugLog({component, message, data})
  } catch (e) {
    console.error('Debug log failed:', e)
  }
}

interface FileResult {
  id: number
  name: string
  path: string
  extension: string
  size: number
  modified_time: string
  contentPreview?: string
  matchCount?: number
}

const searchType = ref('filename')
const searchQuery = ref('')
const contentQuery = ref('')
const results = ref<FileResult[]>([])
const contentResults = ref<FileResult[]>([])
const loading = ref(false)
const currentPage = ref(1)
const contentPage = ref(1)
const pageSize = ref(50)
const totalPages = ref(0)
const contentTotalPages = ref(0)
const indexProgress = ref({
  show: false,
  progress: 0,
  currentPath: ''
})

// 搜索历史相关
const searchHistory = ref<Array<{
  id: number
  query: string
  search_type: string
  result_count: number
  created_at: string
}>>([])

// 内容搜索历史相关
const contentSearchHistory = ref<Array<{
  id: number
  query: string
  search_type: string
  result_count: number
  created_at: string
}>>([])

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

/**
 * 预览面板状态 - 固定右侧布局
 */
const previewVisible = ref(false)
const previewFileName = ref('')
const previewContent = ref('')
const previewCurrentItem = ref<FileResult | null>(null)

/**
 * 预览延迟定时器
 */
let previewTimeout: ReturnType<typeof setTimeout> | null = null

/**
 * 内容索引统计
 */
const contentStats = ref({
  totalFiles: 0,
  indexedFiles: 0,
  lastIndexed: null as string | null
})

const searchOptions = ref({
  fileType: '',
  minSize: '',
  maxSize: ''
})

const fileTypeOptions = [
  {title: '图片', value: 'image'},
  {title: '文档', value: 'document'},
  {title: '代码', value: 'code'},
  {title: '视频', value: 'video'},
  {title: '音频', value: 'audio'},
  {title: '压缩包', value: 'archive'},
  {title: '可执行文件', value: 'executable'}
]

const hasFilters = computed(() => {
  return searchOptions.value.fileType ||
      searchOptions.value.minSize ||
      searchOptions.value.maxSize
})

/**
 * 监听筛选条件变化
 */
watch(() => searchOptions.value, (newOptions, oldOptions) => {
  if (searchQuery.value || hasFilters.value) {
    currentPage.value = 1
    performSearch()
  }
}, {deep: true})

const headers = [
  {title: '文件名', key: 'name', sortable: true, align: 'start'},
  {title: '路径', key: 'path', sortable: true, align: 'start'},
  {title: '大小', key: 'size', sortable: true, align: 'start'},
  {title: '修改时间', key: 'modified_time', sortable: true, align: 'start'}
]

const openFileEditor = inject('openFileEditor') as (path: string, name: string) => void
const showSnackbar = inject('showSnackbar') as (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void

let searchTimeout: ReturnType<typeof setTimeout> | null = null

const debouncedContentSearch = debounce((value: string) => {
  contentQuery.value = value
  if (value) {
    performContentSearch()
  } else {
    contentResults.value = []
  }
}, 500)

watch(searchQuery, () => {
  currentPage.value = 1
})

watch(contentQuery, () => {
  contentPage.value = 1
})

function clearFilters() {
  searchOptions.value = {
    fileType: '',
    minSize: '',
    maxSize: ''
  }
  performSearch()
}

async function performSearch() {
  if (!searchQuery.value.trim() && !hasFilters.value) {
    results.value = []
    return
  }

  loading.value = true
  try {
    const options: any = {}
    if (searchOptions.value.fileType) {
      options.fileType = searchOptions.value.fileType
    }
    if (searchOptions.value.minSize) {
      options.minSize = parseInt(searchOptions.value.minSize) * 1024 * 1024
    }
    if (searchOptions.value.maxSize) {
      options.maxSize = parseInt(searchOptions.value.maxSize) * 1024 * 1024
    }

    const data = await window.electronAPI.searchFiles(
        searchQuery.value,
        currentPage.value,
        pageSize.value,
        options
    )
    await debugLog('FileSearch', 'API response received', {query: searchQuery.value, dataKeys: Object.keys(data)})
    results.value = data.files || []
    totalPages.value = data.totalPages || 0

    // 保存搜索历史
    await debugLog('FileSearch', 'About to save history', {query: searchQuery.value, count: results.value.length})
    await saveSearchHistory(searchQuery.value, 'filename', results.value.length)
    await debugLog('FileSearch', 'History saved successfully')
  } catch (error) {
    console.error('Search failed:', error)
    showSnackbar('搜索失败：' + (error as Error).message, 'error')
  } finally {
    loading.value = false
  }
}

async function performContentSearch() {
  if (!contentQuery.value.trim()) {
    contentResults.value = []
    return
  }

  loading.value = true
  try {
    const data = await window.electronAPI.searchFileContent(
        contentQuery.value,
        contentPage.value,
        pageSize.value
    )
    contentResults.value = data.results || []
    contentTotalPages.value = data.totalPages || 0

    // 保存搜索历史
    await saveSearchHistory(contentQuery.value, 'content', contentResults.value.length)
  } catch (error) {
    console.error('Content search failed:', error)
    showSnackbar('内容搜索失败：' + (error as Error).message, 'error')
  } finally {
    loading.value = false
  }
}

function openFile(item: FileResult) {
  if (openFileEditor) {
    openFileEditor(item.path, item.name)
  } else {
    const fullPath = `${item.path}\\${item.name}`
    window.electronAPI.openFile(fullPath)
  }
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN')
}

// ==================== 搜索历史功能 ====================

// 加载搜索历史
async function loadSearchHistory() {
  try {
    const data = await historyApi.getHistory('filename', 20)
    if (data.success) {
      searchHistory.value = data.history
    }
  } catch (error) {
    console.error('Load search history failed:', error)
  }
}

// 保存搜索历史
async function saveSearchHistory(query: string, searchType: string, resultCount: number) {
  await debugLog('SearchHistory', 'Saving history', {query, searchType, resultCount})
  if (!query.trim()) {
    await debugLog('SearchHistory', 'Query is empty, skipping')
    return
  }

  try {
    const result = await historyApi.addHistory({query, searchType, resultCount})
    await debugLog('SearchHistory', 'Save result', {result})

    // 保存成功后重新加载历史记录
    if (searchType === 'filename') {
      await loadSearchHistory()
    } else {
      await loadContentSearchHistory()
    }
  } catch (error) {
    await debugLog('SearchHistory', 'Save failed', {error: (error as Error).message})
  }
}

// 删除单条历史
async function deleteHistoryItem(id: number) {
  try {
    await historyApi.deleteHistory(id)
    // 重新加载历史
    await loadSearchHistory()
  } catch (error) {
    console.error('Delete history item failed:', error)
  }
}

// 清除全部历史
async function clearAllHistory() {
  try {
    await historyApi.clearHistory()
    searchHistory.value = []
    showSnackbar('搜索历史已清除', 'success')
  } catch (error) {
    console.error('Clear history failed:', error)
    showSnackbar('清除历史失败', 'error')
  }
}

// 选择历史记录
function selectHistory(query: string) {
  searchQuery.value = query
  performSearch()
}

// 搜索输入处理 - 实时搜索
const debouncedSearch = debounce((value: string) => {
  if (value || hasFilters.value) {
    performSearch()
  } else {
    results.value = []
  }
}, 300)

function onSearchInput(value: string) {
  debouncedSearch(value)
}

// ==================== 内容搜索历史功能 ====================

// 加载内容搜索历史
async function loadContentSearchHistory() {
  try {
    const data = await historyApi.getHistory('content', 20)
    if (data.success) {
      contentSearchHistory.value = data.history
    }
  } catch (error) {
    console.error('Load content search history failed:', error)
  }
}

// 删除单条内容搜索历史
async function deleteContentHistoryItem(id: number) {
  try {
    await historyApi.deleteHistory(id)
    await loadContentSearchHistory()
  } catch (error) {
    console.error('Delete content history item failed:', error)
  }
}

// 清除全部内容搜索历史
async function clearAllContentHistory() {
  try {
    await historyApi.clearHistory()
    contentSearchHistory.value = []
    showSnackbar('搜索历史已清除', 'success')
  } catch (error) {
    console.error('Clear content history failed:', error)
    showSnackbar('清除历史失败', 'error')
  }
}

// 选择内容搜索历史记录
function selectContentHistory(query: string) {
  contentQuery.value = query
  performContentSearch()
}

function onContentSearchInput(value: string) {
  debouncedContentSearch(value)
}

// 格式化时间
function formatTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  // 小于1小时显示"X分钟前"
  if (diff < 60 * 60 * 1000) {
    const minutes = Math.floor(diff / (60 * 1000))
    return minutes < 1 ? '刚刚' : `${minutes}分钟前`
  }

  // 小于24小时显示"X小时前"
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000))
    return `${hours}小时前`
  }

  // 小于7天显示"X天前"
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    const days = Math.floor(diff / (24 * 60 * 60 * 1000))
    return `${days}天前`
  }

  // 否则显示日期
  return date.toLocaleDateString('zh-CN')
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

/**
 * 显示预览 - 固定右侧布局
 */
function showPreview(event: MouseEvent, item: FileResult) {
  console.log('[Preview] Mouse enter:', item.name)

  // 清除之前的定时器
  if (previewTimeout) {
    clearTimeout(previewTimeout)
  }

  // 如果已经在显示同一个文件，不重复处理
  if (previewVisible.value && previewCurrentItem.value?.id === item.id) {
    console.log('[Preview] Already showing same file')
    return
  }

  // 延迟显示预览
  previewTimeout = setTimeout(() => {
    console.log('[Preview] Showing preview for:', item.name)
    previewFileName.value = item.name
    previewCurrentItem.value = item

    // 根据文件类型生成预览内容
    generatePreview(item).then(content => {
      console.log('[Preview] Content generated, length:', content.length)
      previewContent.value = content
      previewVisible.value = true
      console.log('[Preview] Show state:', previewVisible.value)
    }).catch(err => {
      console.error('[Preview] Error:', err)
    })
  }, 200)
}

/**
 * 隐藏预览
 */
function hidePreview() {
  // 延迟隐藏
  previewTimeout = setTimeout(() => {
    previewVisible.value = false
    previewCurrentItem.value = null
  }, 300)
}

/**
 * 生成预览内容
 */
async function generatePreview(item: FileResult): Promise<string> {
  const ext = item.extension.toLowerCase()
  const fullPath = `${item.path}\\${item.name}`

  // 图片预览
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico'].includes(ext)) {
    return `<img src="file://${fullPath}" style="max-width: 100%; max-height: 280px; object-fit: contain; border-radius: 4px;" />`
  }

  // 视频预览
  if (['mp4', 'webm', 'ogg', 'mov', 'mkv', 'avi'].includes(ext)) {
    return `
      <video controls style="max-width: 100%; max-height: 280px; border-radius: 4px;">
        <source src="file://${fullPath}">
        您的浏览器不支持视频播放
      </video>
      <div style="margin-top: 8px; font-size: 12px; color: #666;">
        格式: ${ext.toUpperCase()} | 大小: ${formatSize(item.size)}
      </div>
    `
  }

  // 音频预览
  if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma'].includes(ext)) {
    return `
      <audio controls style="width: 100%; margin: 10px 0;">
        <source src="file://${fullPath}">
        您的浏览器不支持音频播放
      </audio>
      <div style="font-size: 12px; color: #666; text-align: center;">
        ${item.name} | ${formatSize(item.size)}
      </div>
    `
  }

  // PDF 预览
  if (ext === 'pdf') {
    return `
      <div style="text-align: center; padding: 20px;">
        <v-icon icon="mdi-file-pdf-box" size="64" color="red"></v-icon>
        <div style="margin-top: 12px; font-weight: 500;">PDF 文档</div>
        <div style="margin-top: 8px; font-size: 12px; color: #666;">
          ${item.name}<br>
          大小: ${formatSize(item.size)}
        </div>
        <div style="margin-top: 12px; font-size: 12px; color: #999;">
          点击打开查看完整内容
        </div>
      </div>
    `
  }

  // Office 文档预览
  if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) {
    const iconMap: Record<string, string> = {
      'doc': 'mdi-file-word', 'docx': 'mdi-file-word',
      'xls': 'mdi-file-excel', 'xlsx': 'mdi-file-excel',
      'ppt': 'mdi-file-powerpoint', 'pptx': 'mdi-file-powerpoint'
    }
    const colorMap: Record<string, string> = {
      'doc': '#2b579a', 'docx': '#2b579a',
      'xls': '#217346', 'xlsx': '#217346',
      'ppt': '#d24726', 'pptx': '#d24726'
    }
    return `
      <div style="text-align: center; padding: 20px;">
        <div style="font-size: 48px; color: ${colorMap[ext] || '#666'};">
          📄
        </div>
        <div style="margin-top: 12px; font-weight: 500;">${ext.toUpperCase()} 文档</div>
        <div style="margin-top: 8px; font-size: 12px; color: #666;">
          ${item.name}<br>
          大小: ${formatSize(item.size)}
        </div>
      </div>
    `
  }

  // 压缩包预览
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'].includes(ext)) {
    return `
      <div style="text-align: center; padding: 20px;">
        <div style="font-size: 48px;">📦</div>
        <div style="margin-top: 12px; font-weight: 500;">压缩文件</div>
        <div style="margin-top: 8px; font-size: 12px; color: #666;">
          ${item.name}<br>
          大小: ${formatSize(item.size)}
        </div>
      </div>
    `
  }

  // 可执行文件预览
  if (['exe', 'msi', 'dmg', 'pkg', 'deb', 'rpm', 'appimage'].includes(ext)) {
    return `
      <div style="text-align: center; padding: 20px;">
        <div style="font-size: 48px;">⚙️</div>
        <div style="margin-top: 12px; font-weight: 500;">可执行文件</div>
        <div style="margin-top: 8px; font-size: 12px; color: #666;">
          ${item.name}<br>
          大小: ${formatSize(item.size)}
        </div>
      </div>
    `
  }

  // 文本文件预览 - 编辑器风格
  const textExts = ['txt', 'md', 'json', 'xml', 'yaml', 'yml', 'ini', 'conf', 'log',
    'js', 'ts', 'vue', 'jsx', 'tsx', 'css', 'scss', 'sass', 'less', 'html', 'htm',
    'py', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'go', 'rs', 'rb', 'php', 'swift', 'kt',
    'sh', 'bat', 'ps1', 'cmd', 'sql', 'dockerfile', 'makefile', 'cmake', 'gradle']
  if (textExts.includes(ext)) {
    try {
      // 使用 HTTP API 读取文件内容
      const response = await fetch(`http://localhost:3000/api/files/content?path=${encodeURIComponent(fullPath)}`)
      const data = await response.json()

      if (data.success && data.content) {
        const allLines = data.content.split('\n')
        const displayLines = allLines.slice(0, 50) // 显示前50行
        const totalLines = allLines.length

        // 生成带行号的代码预览
        const codeHtml = displayLines.map((line: string, index: number) => {
          const lineNum = index + 1
          const escapedLine = escapeHtml(line)
          // 简单的语法高亮
          const highlightedLine = highlightCode(escapedLine, ext)
          return `<div class="line"><span class="line-number">${lineNum}</span><span class="line-content">${highlightedLine}</span></div>`
        }).join('')

        const moreInfo = totalLines > 50 ? `<div style="padding: 8px 12px; color: #858585; font-size: 11px; border-top: 1px solid #3c3c3c;">... 还有 ${totalLines - 50} 行</div>` : ''

        return `<div class="code-preview">${codeHtml}</div>${moreInfo}`
      } else if (data.error) {
        return `<div style="text-align: center; padding: 20px; color: #858585;">📄 ${data.error}</div>`
      }
      return '<div style="text-align: center; padding: 20px; color: #858585;">📄 无法读取文件内容</div>'
    } catch (e) {
      console.error('读取文件失败:', e)
      return '<div style="text-align: center; padding: 20px; color: #858585;">📄 无法读取文件内容</div>'
    }
  }

  // 其他文件显示基本信息
  return `
    <div style="padding: 20px; text-align: center;">
      <div style="font-size: 48px; margin-bottom: 12px;">📎</div>
      <div style="font-weight: 500; margin-bottom: 8px;">${escapeHtml(item.name)}</div>
      <div style="font-size: 12px; color: #666; margin-bottom: 4px;">类型: ${ext.toUpperCase()}</div>
      <div style="font-size: 12px; color: #666; margin-bottom: 4px;">大小: ${formatSize(item.size)}</div>
      <div style="font-size: 12px; color: #666;">修改: ${formatDate(item.modified_time)}</div>
    </div>
  `
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
 * 简单的语法高亮
 */
function highlightCode(line: string, ext: string): string {
  // 根据文件类型应用不同的高亮规则
  const keywords: Record<string, string[]> = {
    'js': ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'import', 'export', 'from', 'class', 'async', 'await'],
    'ts': ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'import', 'export', 'from', 'class', 'async', 'await', 'interface', 'type', 'extends', 'implements'],
    'vue': ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'import', 'export', 'from', 'class', 'async', 'await'],
    'py': ['def', 'class', 'import', 'from', 'return', 'if', 'else', 'elif', 'for', 'while', 'try', 'except', 'with', 'as'],
    'java': ['public', 'private', 'protected', 'class', 'interface', 'extends', 'implements', 'return', 'if', 'else', 'for', 'while'],
    'cpp': ['int', 'float', 'double', 'char', 'void', 'class', 'struct', 'return', 'if', 'else', 'for', 'while'],
    'go': ['func', 'package', 'import', 'return', 'if', 'else', 'for', 'range', 'struct', 'interface'],
    'rs': ['fn', 'let', 'mut', 'return', 'if', 'else', 'for', 'while', 'match', 'struct', 'impl'],
    'css': ['display', 'position', 'width', 'height', 'margin', 'padding', 'color', 'background', 'border'],
    'json': ['true', 'false', 'null']
  }

  const langKeywords = keywords[ext] || keywords['js'] || []

  // 转义 HTML 后应用高亮
  let highlighted = line
      // 注释
      .replace(/(\/\/.*$|#.*$)/, '<span class="comment">$1</span>')
      // 字符串
      .replace(/("[^"]*"|'[^']*'|`[^`]*`)/g, '<span class="string">$1</span>')
      // 数字
      .replace(/\b(\d+)\b/g, '<span class="number">$1</span>')
      // 关键字
      .replace(new RegExp(`\\b(${langKeywords.join('|')})\\b`, 'g'), '<span class="keyword">$1</span>')
      // HTML 标签
      .replace(/(&lt;\/?[\w-]+)/g, '<span class="tag">$1</span>')
      // HTML 属性
      .replace(/\s([\w-]+)=/g, ' <span class="attr">$1</span>=')

  return highlighted
}

/**
 * 加载内容索引统计
 */
async function loadContentStats() {
  try {
    console.log('Loading content stats...')
    const stats = await window.electronAPI.getContentIndexStats()
    console.log('Content stats loaded:', stats)
    contentStats.value = stats
  } catch (error) {
    console.error('Failed to load content stats:', error)
  }
}

const hasShownIndexComplete = sessionStorage.getItem('hasShownIndexComplete') === 'true'

onMounted(() => {
  window.electronAPI.onIndexProgress((data) => {
    indexProgress.value = {
      show: true,
      progress: data.progress,
      currentPath: data.currentPath
    }
  })

  window.electronAPI.onIndexComplete((data) => {
    indexProgress.value.show = false
    if (!hasShownIndexComplete) {
      showSnackbar(`索引完成！共索引 ${data.totalFiles} 个文件`, 'success')
      sessionStorage.setItem('hasShownIndexComplete', 'true')
    }
    loadContentStats()
  })

  window.electronAPI.onError((data) => {
    showSnackbar(`错误：${data.message}`, 'error')
  })

  loadContentStats()

  // 加载搜索历史
  loadSearchHistory()
  loadContentSearchHistory()
})

onUnmounted(() => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
})
</script>

<style lang="scss" scoped>
@import './index.scss';
</style>
