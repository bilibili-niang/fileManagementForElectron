<template>
  <v-dialog
    v-model="dialog"
    :max-width="isFullscreen ? '100vw' : '90vw'"
    :max-height="isFullscreen ? '100vh' : '90vh'"
    :fullscreen="isFullscreen"
    @keydown.esc="closeDialog"
  >
    <v-card class="docx-preview-card" :class="{ 'fullscreen': isFullscreen }">
      <v-card-item class="preview-header">
        <v-card-title class="d-flex align-center">
          <v-icon icon="mdi-file-word" class="mr-2" color="blue"></v-icon>
          <span class="text-truncate">{{ fileName }}</span>
          <v-spacer></v-spacer>
          <v-btn
            :icon="isFullscreen ? 'mdi-fullscreen-exit' : 'mdi-fullscreen'"
            variant="text"
            size="small"
            @click="toggleFullscreen"
            class="mr-2"
          ></v-btn>
          <v-btn icon="mdi-close" variant="text" size="small" @click="closeDialog"></v-btn>
        </v-card-title>
        <v-card-subtitle>{{ filePath }}</v-card-subtitle>
      </v-card-item>

      <v-card-text class="preview-content">
        <div v-if="loading" class="d-flex justify-center align-center" style="height: 400px;">
          <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
        </div>
        
        <v-alert v-else-if="error" type="error" text="无法加载文档"></v-alert>
        
        <div v-else class="docx-content" v-html="htmlContent"></div>
      </v-card-text>

      <v-card-actions class="preview-actions">
        <v-spacer></v-spacer>
        <v-btn color="primary" variant="outlined" @click="openWithSystem">
          <v-icon icon="mdi-open-in-app" class="mr-2"></v-icon>
          用系统默认程序打开
        </v-btn>
        <v-btn color="grey" variant="outlined" @click="closeDialog">
          关闭
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch, inject } from 'vue'

const showSnackbar = inject('showSnackbar') as (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void

interface Props {
  modelValue: boolean
  filePath?: string
  fileName?: string
}

const props = withDefaults(defineProps<Props>(), {
  filePath: '',
  fileName: ''
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const dialog = ref(props.modelValue)
const htmlContent = ref('')
const loading = ref(false)
const error = ref(false)
const isFullscreen = ref(true) // 默认全屏

watch(() => props.modelValue, (newVal) => {
  dialog.value = newVal
  if (newVal) {
    loadDocx()
  }
})

watch(dialog, (newVal) => {
  emit('update:modelValue', newVal)
  if (!newVal) {
    htmlContent.value = ''
  }
})

async function loadDocx() {
  if (!props.filePath) return

  loading.value = true
  error.value = false

  try {
    // 使用后端 API 解析 docx
    const response = await fetch('http://localhost:3000/api/files/parse-docx', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ filePath: props.filePath })
    })

    if (response.ok) {
      const result = await response.json()
      if (result.success) {
        htmlContent.value = result.html
      } else {
        error.value = true
      }
    } else {
      error.value = true
    }
  } catch (err) {
    console.error('Error loading docx:', err)
    error.value = true
  } finally {
    loading.value = false
  }
}

function openWithSystem() {
  fetch('http://localhost:3000/api/files/open-system', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ filePath: props.filePath })
  }).catch(err => {
    console.error('Error opening file with system:', err)
    showSnackbar('无法打开文件', 'error')
  })
}

function closeDialog() {
  dialog.value = false
}

function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value
}
</script>

<style scoped lang="scss">
@import './index.scss';
</style>
