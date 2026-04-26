<template>
  <v-container fluid class="clipboard-container">
    <div class="d-flex justify-end align-center mb-4">
      <div class="d-flex align-center gap-2">
        <v-chip size="small" :color="isListening ? 'success' : 'grey'" variant="tonal">
          <v-icon :icon="isListening ? 'mdi-record-circle' : 'mdi-circle-outline'" start size="small"></v-icon>
          {{ isListening ? '监控中' : '已暂停' }}
        </v-chip>
        <v-btn
          v-if="history.length > 0"
          color="error"
          variant="text"
          size="small"
          prepend-icon="mdi-delete-sweep"
          @click="showClearDialog = true"
        >
          清空
        </v-btn>
      </div>
    </div>

    <div v-if="history.length === 0" class="text-center text-grey py-12">
      <v-icon icon="mdi-clipboard-text-outline" size="64" class="mb-4"></v-icon>
      <p class="text-body-1">暂无剪贴板历史</p>
      <p class="text-caption">复制内容后会自动记录到这里</p>
    </div>

    <v-data-table
      v-else
      :headers="tableHeaders"
      :items="displayHistory"
      :items-per-page="pagination.pageSize.value"
      :page="pagination.page.value"
      hide-default-footer
      class="elevation-1 clipboard-table"
      density="comfortable"
      @click:row="(_, item) => handlePreview(item)"
    >
      <!-- 内容列 -->
      <template #item.content="{ item }">
        <div class="cursor-pointer" @click.stop="handlePreview(item)">
          <div v-if="item.type === 'text'" class="text-preview">
            <span class="text-truncate">{{ item.content }}</span>
          </div>
          <div v-else-if="item.type === 'image'" class="image-preview">
            <v-img
              :src="item.content"
              max-height="60"
              max-width="120"
              contain
              class="rounded"
            ></v-img>
          </div>
          <div v-else-if="item.type === 'files'" class="files-preview">
            <div class="d-flex align-center gap-1 mb-1">
              <v-icon icon="mdi-file-multiple" size="small" color="primary"></v-icon>
              <span class="text-body-2">{{ getFileCount(item.content) }} 个文件</span>
            </div>
            <div class="file-list text-caption">
              {{ getFileNames(item.content) }}
            </div>
          </div>
        </div>
      </template>

      <!-- 来源列 -->
      <template #item.source="{ item }">
        <div class="d-flex align-center gap-1">
          <v-icon icon="mdi-application" size="x-small"></v-icon>
          <span class="text-caption">{{ item.sourceApp }}</span>
        </div>
      </template>

      <!-- 时间列 -->
      <template #item.time="{ item }">
        <div class="d-flex align-center gap-1">
          <v-icon icon="mdi-clock-outline" size="x-small"></v-icon>
          <span class="text-caption">{{ formatTime(item.timestamp) }}</span>
        </div>
      </template>

      <!-- 操作列 -->
      <template #item.action="{ item }">
        <div class="d-flex" style="gap: 4px;">
          <v-btn
            icon="mdi-content-copy"
            variant="text"
            density="compact"
            size="small"
            color="primary"
            @click.stop="handleCopy(item)"
          ></v-btn>
          <v-btn
            icon="mdi-delete-outline"
            variant="text"
            density="compact"
            size="small"
            color="error"
            @click.stop="handleRemove(item.id)"
          ></v-btn>
        </div>
      </template>
    </v-data-table>

    <!-- 分页器 -->
    <div class="pagination-bar">
      <div class="pagination-info">
        显示 {{ startIndex + 1 }}-{{ endIndex }} ，共 {{ history.length }} 条
      </div>
      <div class="pagination-controls">
        <v-btn
          icon="mdi-page-first"
          variant="text"
          density="compact"
          :disabled="pagination.page.value <= 1"
          @click="goToPage(1)"
        ></v-btn>
        <v-btn
          icon="mdi-chevron-left"
          variant="text"
          density="compact"
          :disabled="pagination.page.value <= 1"
          @click="prevPage"
        ></v-btn>
        <div class="page-numbers">
          <v-btn
            v-for="(p, index) in visiblePages"
            :key="index"
            :variant="p === pagination.page.value ? 'flat' : 'text'"
            :color="p === pagination.page.value ? 'primary' : undefined"
            density="compact"
            class="page-btn"
            :disabled="p === '...'"
            @click="typeof p === 'number' && goToPage(p)"
          >
            {{ p }}
          </v-btn>
        </div>
        <v-btn
          icon="mdi-chevron-right"
          variant="text"
          density="compact"
          :disabled="pagination.page.value >= totalPages"
          @click="nextPage"
        ></v-btn>
        <v-btn
          icon="mdi-page-last"
          variant="text"
          density="compact"
          :disabled="pagination.page.value >= totalPages"
          @click="goToPage(totalPages)"
        ></v-btn>
      </div>
    </div>

    <!-- 清空确认对话框 -->
    <v-dialog v-model="showClearDialog" max-width="300">
      <v-card>
        <v-card-title class="text-h6">确认清空</v-card-title>
        <v-card-text>确定要清空所有剪贴板历史记录吗？</v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showClearDialog = false">取消</v-btn>
          <v-btn color="error" variant="flat" @click="handleClear">确定</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 复制成功提示 -->
    <v-snackbar v-model="showCopySuccess" color="success" :timeout="1500">
      <v-icon icon="mdi-check" class="mr-2"></v-icon>
      已复制到剪贴板
    </v-snackbar>

    <!-- 提示 -->
    <v-snackbar v-model="showSnackbar" color="info" :timeout="1500">
      <v-icon icon="mdi-information" class="mr-2"></v-icon>
      文件复制功能暂不支持
    </v-snackbar>

    <!-- 图片预览对话框 -->
    <v-dialog v-model="showImagePreview" max-width="90vw" max-height="90vh">
      <v-card>
        <v-card-item>
          <v-card-title class="d-flex align-center">
            <v-icon icon="mdi-image" class="mr-2"></v-icon>
            <span>图片预览</span>
            <v-spacer></v-spacer>
            <v-btn icon="mdi-close" variant="text" size="small" @click="showImagePreview = false"></v-btn>
          </v-card-title>
        </v-card-item>
        <v-card-text class="text-center pa-0" style="max-height: 80vh; overflow: auto;">
          <img :src="previewImageUrl" alt="Preview" style="max-width: 100%; max-height: 80vh;" />
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showImagePreview = false">关闭</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 文本预览对话框 -->
    <v-dialog v-model="showTextPreview" max-width="700" scrollable>
      <v-card>
        <v-card-item>
          <v-card-title class="d-flex align-center">
            <v-icon icon="mdi-text" class="mr-2"></v-icon>
            <span>文本预览</span>
            <v-spacer></v-spacer>
            <v-btn icon="mdi-close" variant="text" size="small" @click="showTextPreview = false"></v-btn>
          </v-card-title>
        </v-card-item>
        <v-card-text style="max-height: 60vh;">
          <pre class="text-previewer">{{ previewTextContent }}</pre>
        </v-card-text>
        <v-card-actions>
          <v-btn variant="text" @click="copyPreviewText">复制</v-btn>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showTextPreview = false">关闭</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useClipboardStore, type ClipboardItem } from '@/stores/clipboard'
import { usePagination } from '@/composables/usePagination'

const clipboardStore = useClipboardStore()

const history = computed(() => clipboardStore.history)
const isListening = computed(() => clipboardStore.isListening)

// 表格列定义
const tableHeaders = [
  { title: '内容', key: 'content', width: '45%' },
  { title: '来源', key: 'source', width: '15%' },
  { title: '时间', key: 'time', width: '20%' },
  { title: '操作', key: 'action', width: '20%', sortable: false }
]

// 分页
const pagination = usePagination({
  page: 1,
  pageSize: 10
})

// 分页计算
const displayHistory = computed(() => {
  const start = (pagination.page.value - 1) * pagination.pageSize.value
  const end = start + pagination.pageSize.value
  return history.value.slice(start, end)
})

const totalPages = computed(() => Math.ceil(history.value.length / pagination.pageSize.value))
const startIndex = computed(() => (pagination.page.value - 1) * pagination.pageSize.value)
const endIndex = computed(() => Math.min(startIndex.value + pagination.pageSize.value, history.value.length))

const visiblePages = computed(() => {
  const pages: (number | '...')[] = []
  const total = totalPages.value
  const current = pagination.page.value

  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else {
    pages.push(1)
    if (current > 3) pages.push('...')
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
      pages.push(i)
    }
    if (current < total - 2) pages.push('...')
    pages.push(total)
  }

  return pages
})

function goToPage(p: number) {
  if (p < 1 || p > totalPages.value) return
  pagination.setPage(p)
}

function prevPage() {
  goToPage(pagination.page.value - 1)
}

function nextPage() {
  goToPage(pagination.page.value + 1)
}

const showClearDialog = ref(false)
const showCopySuccess = ref(false)
const showSnackbar = ref(false)

// 预览状态
const showImagePreview = ref(false)
const showTextPreview = ref(false)
const previewImageUrl = ref('')
const previewTextContent = ref('')

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return '刚刚'
  if (diffMin < 60) return `${diffMin}分钟前`
  if (diffHour < 24) return `${diffHour}小时前`
  if (diffDay < 7) return `${diffDay}天前`

  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getFileCount(content: string): number {
  return content.split('\n').filter(f => f.trim()).length
}

function getFileNames(content: string): string {
  const files = content.split('\n').filter(f => f.trim())
  if (files.length <= 2) {
    return files.map(f => f.split('/').pop()).join(', ')
  }
  return files.slice(0, 2).map(f => f.split('/').pop()).join(', ') + '...'
}

async function handleCopy(item: ClipboardItem) {
  if (item.type === 'text') {
    const success = await clipboardStore.copyToClipboard(item.content)
    if (success) {
      showCopySuccess.value = true
    }
  } else if (item.type === 'files') {
    // 文件复制功能暂不支持复制回文件到剪贴板
    showSnackbar.value = true
  }
}

function handleRemove(id: string) {
  clipboardStore.removeItem(id)
}

function handleClear() {
  clipboardStore.clearHistory()
  showClearDialog.value = false
}

// 预览处理
function handlePreview(item: ClipboardItem) {
  if (item.type === 'image') {
    previewImageUrl.value = item.content
    showImagePreview.value = true
  } else if (item.type === 'text') {
    previewTextContent.value = item.content
    showTextPreview.value = true
  }
}

// 复制预览文本
async function copyPreviewText() {
  try {
    await navigator.clipboard.writeText(previewTextContent.value)
    showTextPreview.value = false
    showCopySuccess.value = true
  } catch (e) {
    console.error('Copy failed:', e)
  }
}

onMounted(() => {
  clipboardStore.init()
})
</script>

<style scoped lang="scss">
.clipboard-container {
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.cursor-pointer {
  cursor: pointer;
}

.content-cell {
  vertical-align: middle;
}

.text-preview {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.files-preview {
  .file-list {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
    color: rgba(128, 128, 128, 0.8);
  }
}

.text-previewer {
  white-space: pre-wrap;
  word-break: break-all;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.6;
  margin: 0;
}

.clipboard-table {
  flex: 1;
  overflow: auto;

  :deep(table) {
    table-layout: fixed;
    width: 100%;
    border-collapse: collapse;
  }

  :deep(th),
  :deep(td) {
    border-right: 1px solid rgba(var(--v-theme-surface-variant), 0.2);

    &:last-child {
      border-right: none;
    }

    &:nth-child(1) {
      width: 45%;
      min-width: 200px;
    }
    &:nth-child(2) {
      width: 15%;
      min-width: 100px;
    }
    &:nth-child(3) {
      width: 20%;
      min-width: 120px;
    }
    &:nth-child(4) {
      width: 20%;
      min-width: 120px;
    }
  }

  :deep(th) {
    border-bottom: 2px solid rgba(var(--v-theme-surface-variant), 0.3);
  }

  :deep(td) {
    border-bottom: 1px solid rgba(var(--v-theme-surface-variant), 0.12);
  }

  :deep(tr:last-child td) {
    border-bottom: none;
  }
}

.pagination-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-top: 1px solid rgba(var(--v-theme-surface-variant), 0.5);
  flex-shrink: 0;
}

.pagination-info {
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}

.page-numbers {
  display: flex;
  align-items: center;
  gap: 2px;
}

.page-btn {
  min-width: 32px !important;
  font-size: 13px;
}
</style>
