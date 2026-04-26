<template>
  <v-dialog
    v-model="dialogVisible"
    :max-width="isFullscreen ? '100vw' : '1200'"
    :max-height="isFullscreen ? '100vh' : '95vh'"
    :fullscreen="isFullscreen"
    scrollable
    @keydown.esc="close"
  >
    <v-card class="pdf-preview-card" :class="{ 'fullscreen': isFullscreen }">
      <v-card-item class="preview-header">
        <v-card-title class="d-flex align-center">
          <v-icon icon="mdi-file-pdf-box" class="mr-2" color="red"></v-icon>
          <span class="text-truncate">{{ fileName }}</span>
          <v-spacer></v-spacer>
          <v-btn
            :icon="isFullscreen ? 'mdi-fullscreen-exit' : 'mdi-fullscreen'"
            variant="text"
            size="small"
            @click="toggleFullscreen"
            class="mr-2"
          ></v-btn>
          <v-btn icon="mdi-close" variant="text" size="small" @click="close"></v-btn>
        </v-card-title>
        <v-card-subtitle v-if="filePath">{{ filePath }}</v-card-subtitle>
      </v-card-item>

      <v-card-text class="pa-0 preview-content">
        <div class="pdf-container">
          <!-- PDF 渲染区域 -->
          <div v-if="!error" class="pdf-viewer" ref="pdfContainer">
            <canvas
              v-for="pageNum in totalPages"
              :key="pageNum"
              :ref="el => setPageRef(el, pageNum)"
              class="pdf-page"
            ></canvas>
          </div>

          <!-- 加载中 -->
          <div v-if="loading" class="loading-container">
            <v-progress-circular indeterminate color="primary" size="48"></v-progress-circular>
            <span class="mt-2">正在加载 PDF...</span>
          </div>

          <!-- 错误提示 -->
          <div v-if="error" class="error-container">
            <v-icon icon="mdi-alert-circle" size="64" color="error"></v-icon>
            <span class="mt-2 text-h6">无法加载 PDF 文件</span>
            <p class="text-caption text-grey mt-2">{{ error }}</p>
          </div>
        </div>
      </v-card-text>

      <v-card-actions class="preview-actions">
        <div class="d-flex align-center">
          <v-btn
            icon="mdi-chevron-left"
            variant="text"
            size="small"
            :disabled="currentPage <= 1"
            @click="prevPage"
          ></v-btn>
          <span class="mx-2">{{ currentPage }} / {{ totalPages }}</span>
          <v-btn
            icon="mdi-chevron-right"
            variant="text"
            size="small"
            :disabled="currentPage >= totalPages"
            @click="nextPage"
          ></v-btn>
        </div>
        <v-spacer></v-spacer>
        <v-btn color="primary" variant="outlined" @click="openInNewWindow" prepend-icon="mdi-open-in-new">
          在新窗口打开
        </v-btn>
        <v-btn color="grey" variant="text" @click="close">关闭</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import * as pdfjsLib from 'pdfjs-dist'

// 设置 PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url
).toString()

const props = defineProps<{
  modelValue: boolean
  filePath: string
  fileName: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const isFullscreen = ref(true) // 默认全屏

const pdfContainer = ref<HTMLDivElement>()
const pageRefs = ref<Map<number, HTMLCanvasElement>>(new Map())
const loading = ref(true)
const error = ref('')
const currentPage = ref(1)
const totalPages = ref(0)
const pdfDoc = ref<any>(null)

// 文件 URL
const fileUrl = computed(() => {
  if (!props.filePath) return ''
  const encodedPath = encodeURIComponent(props.filePath)
  return `http://localhost:3000/api/files/media?path=${encodedPath}`
})

function setPageRef(el: any, pageNum: number) {
  if (el) {
    pageRefs.value.set(pageNum, el)
  }
}

// 渲染页面
async function renderPage(pageNum: number) {
  if (!pdfDoc.value || !pageRefs.value.has(pageNum)) return

  const page = await pdfDoc.value.getPage(pageNum)
  const canvas = pageRefs.value.get(pageNum)!
  const context = canvas.getContext('2d')

  if (!context) return

  // 根据容器宽度动态计算缩放比例
  const containerWidth = pdfContainer.value
    ? pdfContainer.value.clientWidth - 60 // 减去 padding
    : 800

  // 获取 PDF 页面原始尺寸
  const unscaledViewport = page.getViewport({ scale: 1 })
  const maxScale = containerWidth / unscaledViewport.width

  // 使用适当的缩放比例，最大不超过 2，最小不小于 0.5
  const scale = Math.min(Math.max(maxScale, 0.5), 2)

  const viewport = page.getViewport({ scale })

  canvas.height = viewport.height
  canvas.width = viewport.width

  const renderContext = {
    canvasContext: context,
    viewport: viewport
  }

  await page.render(renderContext).promise
}

// 加载 PDF
async function loadPdf() {
  if (!fileUrl.value) return

  loading.value = true
  error.value = ''

  try {
    const loadingTask = pdfjsLib.getDocument(fileUrl.value)
    pdfDoc.value = await loadingTask.promise
    totalPages.value = pdfDoc.value.numPages
    currentPage.value = 1

    // 渲染所有页面
    await nextTick()
    for (let i = 1; i <= totalPages.value; i++) {
      await renderPage(i)
    }

    loading.value = false
  } catch (err: any) {
    console.error('PDF load error:', err)
    error.value = 'PDF 文件加载失败：' + (err.message || '未知错误')
    loading.value = false
  }
}

function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--
    scrollToPage(currentPage.value)
  }
}

function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
    scrollToPage(currentPage.value)
  }
}

function scrollToPage(pageNum: number) {
  const canvas = pageRefs.value.get(pageNum)
  if (canvas && pdfContainer.value) {
    canvas.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

function close() {
  dialogVisible.value = false
}

function openInNewWindow() {
  window.open(fileUrl.value, '_blank')
}

function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value
}

// 监听对话框打开
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    loadPdf()
  } else {
    // 清理
    pdfDoc.value = null
    pageRefs.value.clear()
    totalPages.value = 0
    currentPage.value = 1
  }
})
</script>

<style scoped lang="scss">
@import './index.scss';
</style>
