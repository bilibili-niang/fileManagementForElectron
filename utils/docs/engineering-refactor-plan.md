# 前端工程化重构方案

#### 概述

本文档记录项目前端代码工程化重构的完整方案,涵盖 API 层、工具函数、常量管理、路由、类型规范等各个方面。

---

## 决策汇总

| 决策项 | 方案 | 状态 |
|-------|------|------|
| 路径别名 | 只用 `@` | ✅ 已确认 |
| API 目录 | `src/api/` + barrel export | ✅ 已确认 |
| types 目录 | `src/types/` 或 `src/api/types/` | ✅ 已确认 |
| utils 目录 | `src/utils/` + barrel export | ✅ 已确认 |
| constants 目录 | `src/constants/` + barrel export | ✅ 已确认 |
| 错误处理 | 统一使用 `handleError()` | ✅ 已确认 |
| Vue Router | 引入,替换 tabs | ✅ 已确认 |
| Provide/Inject | Symbol + InjectionKey | ✅ 已确认 |
| main.ts | 拆分到 plugins/ | ✅ 已确认 |
| Props/Emits | interface + 类型化 emits | ✅ 已确认 |
| 实施策略 | 并行进行 | ✅ 已确认 |
| 兼容层 | 直接替换 | ✅ 已确认 |

---

## 目标目录结构

```
src/
├── api/                          # API 层
│   ├── index.ts                  # Barrel export
│   ├── client.ts                 # 统一请求客户端
│   ├── types/
│   │   ├── index.ts
│   │   ├── common.ts
│   │   ├── search.ts
│   │   ├── file.ts
│   │   └── history.ts
│   └── modules/
│       ├── index.ts
│       ├── search.ts
│       ├── history.ts
│       ├── file.ts
│       └── config.ts
├── components/                   # 组件
│   ├── FileIcon/
│   │   ├── index.vue
│   │   └── index.scss
│   └── ...
├── composables/                  # 组合式函数
│   └── useSearchHistory.ts
├── constants/                    # 常量
│   ├── index.ts
│   ├── file.ts
│   ├── api.ts
│   └── ui.ts
├── plugins/                      # 插件配置
│   ├── vuetify.ts
│   └── mock-api.ts
├── router/                       # 路由
│   └── index.ts
├── stores/                       # Pinia Store
│   ├── index.ts
│   └── config.ts
├── types/                        # 全局类型
│   ├── electron.d.ts
│   └── injection-keys.ts
├── utils/                        # 工具函数
│   ├── index.ts
│   ├── format.ts
│   ├── file.ts
│   ├── dom.ts
│   └── error.ts
├── views/                        # 页面
│   ├── FileCategory/
│   ├── FileSearch/
│   └── Settings/
├── App.vue
└── main.ts
```

---

## 第一阶段: 基础设施重构

### 1. API 层重构

#### 1.1 client.ts - 统一请求客户端

```typescript
/**
 * 统一 API 客户端
 * 封装 HTTP 请求和 Electron IPC 调用
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

/**
 * 检查是否在 Electron 环境
 */
function isElectron(): boolean {
  return !!(window as any).electronAPI
}

/**
 * HTTP 请求封装
 */
async function httpRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Electron IPC 调用封装
 */
function electronInvoke<T>(channel: string, ...args: any[]): Promise<T> {
  const electronAPI = (window as any).electronAPI
  if (!electronAPI || !electronAPI[channel]) {
    throw new Error(`Electron API channel not found: ${channel}`)
  }
  return electronAPI[channel](...args)
}

/**
 * 统一请求方法
 */
export async function request<T>(
  httpConfig: { path: string; method?: string; body?: any },
  electronConfig?: { channel: string; args?: any[] }
): Promise<T> {
  if (isElectron() && electronConfig) {
    return electronInvoke(electronConfig.channel, ...(electronConfig.args || []))
  }
  return httpRequest(httpConfig.path, {
    method: httpConfig.method || 'GET',
    body: httpConfig.body ? JSON.stringify(httpConfig.body) : undefined
  })
}
```

#### 1.2 types/common.ts

```typescript
/**
 * API 通用类型
 */

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

export interface PaginationParams {
  page?: number
  pageSize?: number
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
```

#### 1.3 types/search.ts

```typescript
import type { PaginatedResult } from './common'

export interface FileResult {
  id: number
  name: string
  path: string
  extension: string
  size: number
  modified_time: string
  contentPreview?: string
  matchCount?: number
}

export type SearchResult = PaginatedResult<FileResult>

export interface SearchOptions {
  fileType?: string
  minSize?: number
  maxSize?: number
}

export interface ContentSearchResult {
  id: number
  name: string
  path: string
  extension: string
  size: number
  modified_time: string
  preview: string
  matchCount: number
}
```

#### 1.4 types/history.ts

```typescript
export interface SearchHistoryItem {
  id: number
  query: string
  search_type: 'filename' | 'content'
  result_count: number
  created_at: string
}

export interface AddHistoryParams {
  query: string
  searchType: 'filename' | 'content'
  resultCount: number
}
```

#### 1.5 modules/history.ts

```typescript
import { request } from '../client'
import type { SearchHistoryItem, AddHistoryParams } from '../types'

export const historyApi = {
  async getHistory(type?: string, limit: number = 20) {
    return request<
      { success: boolean; history: SearchHistoryItem[] }
    >(
      {
        path: `/api/config/search-history?${new URLSearchParams({
          limit: String(limit),
          ...(type && { type })
        }).toString()}`
      },
      { channel: 'getSearchHistory', args: [limit, type] }
    )
  },

  async addHistory(params: AddHistoryParams) {
    return request<{ success: boolean }>(
      {
        path: '/api/config/search-history',
        method: 'POST',
        body: {
          query: params.query,
          search_type: params.searchType,
          result_count: params.resultCount
        }
      },
      { channel: 'addSearchHistory', args: [params.query, params.searchType, params.resultCount] }
    )
  },

  async deleteHistory(id: number) {
    return request<{ success: boolean }>(
      { path: `/api/config/search-history/${id}`, method: 'DELETE' },
      { channel: 'deleteSearchHistory', args: [id] }
    )
  },

  async clearHistory() {
    return request<{ success: boolean }>(
      { path: '/api/config/search-history', method: 'DELETE' },
      { channel: 'clearSearchHistory' }
    )
  }
}
```

#### 1.6 api/index.ts

```typescript
/**
 * API 统一入口
 */

export { request } from './client'
export * from './types'
export { historyApi } from './modules/history'
export { searchApi } from './modules/search'
export { fileApi } from './modules/file'
export { configApi } from './modules/config'
```

---

### 2. Utils 工具函数

#### 2.1 utils/format.ts

```typescript
/**
 * 格式化工具函数
 */

export function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN')
}

export function formatTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 30) return `${days}天前`
  
  return formatDate(dateString)
}
```

#### 2.2 utils/file.ts

```typescript
import { FILE_CATEGORIES, EXTENSION_TO_CATEGORY } from '@/constants'

export function getFileExtension(filename: string): string {
  const ext = filename.split('.').pop()
  return ext ? ext.toLowerCase() : ''
}

export function getFileCategory(filename: string): string {
  const ext = getFileExtension(filename)
  return EXTENSION_TO_CATEGORY[ext] || 'other'
}

export function isFileCategory(filename: string, category: string): boolean {
  return getFileCategory(filename) === category
}

export function getCategoryDisplayName(category: string): string {
  const names: Record<string, string> = {
    images: '图片',
    documents: '文档',
    code: '代码',
    videos: '视频',
    audio: '音频',
    archives: '压缩包',
    executables: '可执行文件',
    other: '其他'
  }
  return names[category] || '其他'
}
```

#### 2.3 utils/dom.ts

```typescript
export function escapeHtml(html: string): string {
  const div = document.createElement('div')
  div.textContent = html
  return div.innerHTML
}

export function highlightCode(code: string, keyword: string): string {
  if (!keyword) return escapeHtml(code)
  
  const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escapedKeyword})`, 'gi')
  
  return escapeHtml(code).replace(
    regex,
    '<mark style="background: yellow; color: black;">$1</mark>'
  )
}

export async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
  } catch (err) {
    const textarea = document.createElement('textarea')
    textarea.value = text
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
  }
}
```

#### 2.4 utils/error.ts

```typescript
import { inject } from 'vue'
import { ShowSnackbarKey } from '@/types/injection-keys'

export interface ErrorHandlerOptions {
  showToUser?: boolean
  context?: string
  throwError?: boolean
}

export function handleError(
  error: unknown,
  message: string,
  options: ErrorHandlerOptions = {}
): void {
  const { showToUser = true, context, throwError = false } = options
  
  const errorMessage = error instanceof Error ? error.message : String(error)
  const fullMessage = context ? `${context}: ${message}` : message
  
  console.error(fullMessage, error)
  
  if (showToUser) {
    const showSnackbar = inject(ShowSnackbarKey)
    showSnackbar?.({
      message: `${fullMessage}: ${errorMessage}`,
      type: 'error'
    })
  }
  
  if (throwError) {
    throw error instanceof Error ? error : new Error(errorMessage)
  }
}
```

#### 2.5 utils/index.ts

```typescript
export {
  formatSize,
  formatDate,
  formatTime
} from './format'

export {
  getFileExtension,
  getFileCategory,
  isFileCategory,
  getCategoryDisplayName
} from './file'

export {
  escapeHtml,
  highlightCode,
  copyToClipboard
} from './dom'

export {
  handleError,
  type ErrorHandlerOptions
} from './error'
```

---

### 3. Constants 常量

#### 3.1 constants/file.ts

```typescript
export const FILE_CATEGORIES = {
  images: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'bmp', 'webp', 'ico'],
  documents: ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'xls', 'xlsx', 'ppt', 'pptx', 'csv'],
  code: ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'h', 'cs', 'go', 'rs', 'php', 'rb', 'swift', 'kt', 'vue', 'html', 'css', 'scss', 'json', 'xml', 'yaml', 'sql'],
  videos: ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'm4v'],
  audio: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a'],
  archives: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'],
  executables: ['exe', 'msi', 'app', 'dmg', 'deb', 'rpm', 'bat', 'sh']
} as const

export type FileCategory = keyof typeof FILE_CATEGORIES

export const EXTENSION_TO_CATEGORY: Record<string, FileCategory> = Object.entries(
  FILE_CATEGORIES
).reduce((acc, [category, extensions]) => {
  extensions.forEach(ext => {
    acc[ext] = category as FileCategory
  })
  return acc
}, {} as Record<string, FileCategory>)

export const FILE_TYPE_OPTIONS = [
  { title: '全部', value: 'all' },
  { title: '图片', value: 'images' },
  { title: '文档', value: 'documents' },
  { title: '代码', value: 'code' },
  { title: '视频', value: 'videos' },
  { title: '音频', value: 'audio' },
  { title: '压缩包', value: 'archives' },
  { title: '可执行文件', value: 'executables' }
]
```

#### 3.2 constants/api.ts

```typescript
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

export const API_ENDPOINTS = {
  SEARCH: {
    FILES: '/api/search/files',
    CONTENT: '/api/search/content'
  },
  CONFIG: {
    SEARCH_HISTORY: '/api/config/search-history',
    EXCLUDE_RULES: '/api/config/exclude-rules',
    DEBUG_LOG: '/api/config/debug-log'
  }
} as const

export const DEFAULT_PAGE_SIZE = 50
export const MAX_HISTORY_ITEMS = 20
```

#### 3.3 constants/ui.ts

```typescript
export const SNACKBAR_DURATION = 3000

export const DEBOUNCE_DELAY = {
  SEARCH: 300,
  CONTENT_SEARCH: 500,
  INPUT: 300
} as const

export const PREVIEW_DELAY = 500

export const FILE_ICON_SIZE = {
  SMALL: 16,
  MEDIUM: 24,
  LARGE: 32,
  XLARGE: 48
} as const
```

#### 3.4 constants/index.ts

```typescript
export {
  FILE_CATEGORIES,
  EXTENSION_TO_CATEGORY,
  FILE_TYPE_OPTIONS,
  type FileCategory
} from './file'

export {
  API_BASE_URL,
  API_ENDPOINTS,
  DEFAULT_PAGE_SIZE,
  MAX_HISTORY_ITEMS
} from './api'

export {
  SNACKBAR_DURATION,
  DEBOUNCE_DELAY,
  PREVIEW_DELAY,
  FILE_ICON_SIZE
} from './ui'
```

---

## 第二阶段: 架构优化

### 4. Vue Router 配置

#### 4.1 router/index.ts

```typescript
import { createRouter, createWebHashHistory } from 'vue-router'
import FileCategory from '@/views/FileCategory/index.vue'
import FileSearch from '@/views/FileSearch/index.vue'
import Settings from '@/views/Settings/index.vue'

const routes = [
  { path: '/', redirect: '/category' },
  { 
    path: '/category',
    name: 'Category',
    component: FileCategory,
    meta: { title: '分类浏览', icon: 'mdi-folder' }
  },
  { 
    path: '/search',
    name: 'Search',
    component: FileSearch,
    meta: { title: '文件搜索', icon: 'mdi-magnify' }
  },
  { 
    path: '/settings',
    name: 'Settings',
    component: Settings,
    meta: { title: '设置', icon: 'mdi-cog' }
  }
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes
})
```

---

### 5. 全局类型声明

#### 5.1 types/electron.d.ts

```typescript
export interface ElectronAPI {
  // 搜索
  searchFiles: (query: string, page: number, pageSize: number, options?: any) => Promise<any>
  searchFileContent: (query: string, page: number, pageSize: number) => Promise<any>
  
  // 文件操作
  openFile: (path: string) => Promise<void>
  openFileLocation: (path: string) => Promise<void>
  deleteFile: (path: string) => Promise<boolean>
  showItemInFolder: (path: string) => Promise<{ success: boolean; message?: string }>
  
  // 配置
  loadConfig: () => Promise<any>
  saveConfig: (config: any) => Promise<boolean>
  testDatabaseConnection: (config: any) => Promise<{ success: boolean; message?: string }>
  
  // 历史记录
  getSearchHistory: (limit: number, type?: string) => Promise<any>
  addSearchHistory: (query: string, searchType: string, resultCount: number) => Promise<any>
  deleteSearchHistory: (id: number) => Promise<any>
  clearSearchHistory: () => Promise<any>
  
  // 索引
  startIndex: (drives: string[]) => Promise<any>
  stopIndex: () => Promise<any>
  getIndexingProgress: () => Promise<any>
  onIndexProgress: (callback: (data: any) => void) => void
  onIndexComplete: (callback: (data: any) => void) => void
  onError: (callback: (error: any) => void) => void
  
  // 预览
  parseDocx: (path: string) => Promise<any>
  saveFile: (path: string, content: string) => Promise<any>
  
  // 窗口控制
  windowMinimize: () => Promise<void>
  windowMaximize: () => Promise<void>
  windowClose: () => Promise<void>
  windowIsMaximized: () => Promise<boolean>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
```

#### 5.2 types/injection-keys.ts

```typescript
import type { InjectionKey } from 'vue'

export interface SnackbarOptions {
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  timeout?: number
}

export const ShowSnackbarKey: InjectionKey<(options: SnackbarOptions) => void> = 
  Symbol('showSnackbar')

export interface PreviewOptions {
  path: string
  name: string
}

export const OpenImagePreviewKey: InjectionKey<(options: PreviewOptions) => void> = 
  Symbol('openImagePreview')

export const OpenPdfPreviewKey: InjectionKey<(options: PreviewOptions) => void> = 
  Symbol('openPdfPreview')

export const OpenDocxPreviewKey: InjectionKey<(options: PreviewOptions) => void> = 
  Symbol('openDocxPreview')

export const OpenMediaPlayerKey: InjectionKey<(options: PreviewOptions) => void> = 
  Symbol('openMediaPlayer')

export const OpenFileEditorKey: InjectionKey<(path: string, name: string) => void> = 
  Symbol('openFileEditor')
```

---

### 6. 插件配置

#### 6.1 plugins/vuetify.ts

```typescript
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import '@mdi/font/css/materialdesignicons.css'

export function setupVuetify() {
  return createVuetify({
    components,
    directives,
    icons: {
      defaultSet: 'mdi',
      aliases,
      sets: { mdi }
    },
    theme: {
      defaultTheme: 'light',
      themes: {
        light: {
          colors: {
            primary: '#1976d2',
            secondary: '#424242',
            accent: '#82b1ff',
            error: '#ff5252',
            info: '#2196f3',
            success: '#4caf50',
            warning: '#fb8c00'
          }
        }
      }
    }
  })
}
```

#### 6.2 plugins/mock-api.ts

```typescript
import { apiService } from '@/services/api'

export function setupMockApi() {
  const isElectron = !!(window as any).electronAPI
  
  if (isElectron) {
    console.log('Running in Electron environment')
    return
  }

  console.log('Setting up mock Electron API...')
  
  let globalPollingActive = false

  ;(window as any).electronAPI = {
    // ... Mock API 实现
    // 从原 main.ts 迁移
  }
  
  console.log('Mock Electron API setup complete')
}
```

---

### 7. main.ts 重构

```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { setupVuetify } from './plugins/vuetify'
import { setupMockApi } from './plugins/mock-api'

// 设置 Mock API (非 Electron 环境)
setupMockApi()

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(setupVuetify())
app.mount('#app')
```

---

## 第三阶段: 组件规范

### 8. Props/Emits 规范示例

```vue
<script setup lang="ts">
/**
 * 组件 Props 和 Emits 规范示例
 */

// Props 定义
interface Props {
  modelValue: boolean
  title?: string
  confirmText?: string
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '确认',
  confirmText: '确定',
  loading: false
})

// Emits 定义
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
  cancel: []
}>()

// 使用
function handleConfirm() {
  emit('confirm')
  emit('update:modelValue', false)
}
</script>
```

---

## 导入路径替换清单

### 替换规则

```typescript
// 1. API 导入
import { searchHistoryApi } from '../../services/api'
// ->
import { historyApi } from '@/api'

// 2. 工具函数
import { formatSize } from '../utils/format'
// ->
import { formatSize } from '@/utils'

// 3. 常量
import { FILE_CATEGORIES } from '../constants/file'
// ->
import { FILE_CATEGORIES } from '@/constants'

// 4. 组件
import FileIcon from '../../components/FileIcon/index.vue'
// ->
import FileIcon from '@/components/FileIcon/index.vue'

// 5. 类型
import type { FileResult } from '../types/file'
// ->
import type { FileResult } from '@/types'

// 6. Injection Keys
import { ShowSnackbarKey } from '@/types/injection-keys'
const showSnackbar = inject(ShowSnackbarKey)!
```

---

## 实施计划

### 任务拆分

| 任务 | 内容 | 预计时间 | 依赖 |
|-----|------|---------|------|
| T1 | 创建 `api/` 目录结构 + `client.ts` | 15min | - |
| T2 | 迁移 API 模块到 `api/modules/` | 30min | T1 |
| T3 | 创建 `api/types/` 类型定义 | 20min | - |
| T4 | 创建 `utils/` 目录 + 工具函数 | 20min | - |
| T5 | 创建 `constants/` 目录 + 常量 | 15min | - |
| T6 | 创建 `types/` 全局类型声明 | 15min | - |
| T7 | 创建 `router/` 路由配置 | 10min | - |
| T8 | 创建 `plugins/` 目录 + 重构 main.ts | 20min | - |
| T9 | 批量替换所有导入路径 | 30min | T1-T8 |
| T10 | 删除 `services/` 目录 | 5min | T9 |
| T11 | 更新组件 Props/Emits 规范 | 40min | - |
| T12 | 重构 App.vue 使用 Router | 20min | T7 |

**总计: 约 4-5 小时**

### 并行策略

- **并行组 1**: T1, T3, T4, T5, T6, T7, T8 (可同时进行)
- **串行**: T2 依赖 T1, T9 依赖 T1-T8, T10 依赖 T9, T12 依赖 T7

---

## 后续优化方向

1. **Composables 提取**: `useSearchHistory`, `useFilePreview` 等
2. **组件拆分**: FileSearch 大组件拆分
3. **Pinia Store 重构**: 搜索状态管理
4. **测试覆盖**: 单元测试、E2E 测试
5. **CI/CD**: GitHub Actions 自动化

---

## 文档信息

- 创建日期: 2026-02-11
- 参与讨论: Winston(架构师), Amelia(开发者), Barry(Quick Flow 专家), Sally(UX 设计师), Mary(业务分析师)
- 状态: 待实施
