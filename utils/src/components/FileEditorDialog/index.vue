<template>
  <v-dialog
    v-model="dialog"
    :max-width="isFullscreen ? '100vw' : '90vw'"
    :max-height="isFullscreen ? '100vh' : '90vh'"
    :fullscreen="isFullscreen"
    persistent
    @keydown.esc="closeDialog"
  >
    <v-card class="file-editor-card" :class="{ 'fullscreen': isFullscreen }">
      <v-card-item class="editor-header">
        <v-card-title class="d-flex align-center">
          <v-icon icon="mdi-file-document-edit" class="mr-2"></v-icon>
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

      <v-card-text class="editor-content">
        <MonacoEditor
          ref="editorRef"
          v-model="fileContent"
          :language="fileLanguage"
          :theme="editorTheme"
          :read-only="isReadOnly"
          class="monaco-editor-wrapper"
        />
      </v-card-text>

      <v-card-actions class="editor-actions">
        <v-spacer></v-spacer>
        <v-btn color="grey" variant="outlined" @click="closeDialog">
          关闭
        </v-btn>
        <v-btn color="primary" variant="elevated" @click="saveFile" :disabled="isReadOnly">
          保存
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import MonacoEditor from '@/components/MonacoEditor/index.vue'

interface Props {
  modelValue: boolean
  filePath?: string
  fileName?: string
  fileContent?: string
}

const props = withDefaults(defineProps<Props>(), {
  filePath: '',
  fileName: '',
  fileContent: ''
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'save': [content: string]
}>()

const dialog = ref(props.modelValue)
const editorRef = ref<InstanceType<typeof MonacoEditor>>()
const fileContent = ref(props.fileContent)
const editorTheme = ref('vs-dark')
const isReadOnly = ref(false)
const isFullscreen = ref(true) // 默认全屏

const fileLanguage = computed(() => {
  const ext = props.fileName.split('.').pop()?.toLowerCase() || ''
  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'ts': 'typescript',
    'vue': 'html',
    'html': 'html',
    'css': 'css',
    'json': 'json',
    'py': 'python',
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'h': 'c',
    'hpp': 'cpp',
    'cs': 'csharp',
    'go': 'go',
    'rs': 'rust',
    'php': 'php',
    'rb': 'ruby',
    'swift': 'swift',
    'kt': 'kotlin',
    'scala': 'scala',
    'r': 'r',
    'sql': 'sql',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
    'md': 'markdown',
    'sh': 'shell',
    'bash': 'shell',
    'ps1': 'powershell',
    'txt': 'plaintext'
  }
  return languageMap[ext] || 'plaintext'
})

watch(() => props.modelValue, (newVal) => {
  dialog.value = newVal
  if (newVal) {
    fileContent.value = props.fileContent
  }
})

watch(dialog, (newVal) => {
  emit('update:modelValue', newVal)
})

watch(() => props.fileContent, (newVal) => {
  fileContent.value = newVal
})

function closeDialog() {
  dialog.value = false
  // 关闭时重置全屏状态
  isFullscreen.value = false
}

function saveFile() {
  emit('save', fileContent.value)
  closeDialog()
}

function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value
}
</script>

<style scoped lang="scss">
@import './index.scss';
</style>
