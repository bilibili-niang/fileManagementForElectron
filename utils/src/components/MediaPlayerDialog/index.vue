<template>
  <v-dialog
      v-model="dialogVisible"
      :max-width="isFullscreen ? '100vw' : '1000'"
      :max-height="isFullscreen ? '100vh' : '95vh'"
      :fullscreen="isFullscreen"
      scrollable
      @keydown.esc="close"
  >
    <v-card class="media-player-card" :class="{ 'fullscreen': isFullscreen }">
      <v-card-item class="preview-header">
        <v-card-title class="d-flex align-center">
          <v-icon icon="mdi-play-circle" class="mr-2" color="primary"></v-icon>
          <span class="text-truncate">{{ fileName }}</span>
          <v-spacer></v-spacer>
          <v-btn
              :icon="isFullscreen ? 'mdi-fullscreen-exit' : 'mdi-fullscreen'"
              variant="text"
              @click="toggleFullscreen"
              class="mr-2"
          ></v-btn>
          <v-btn icon="mdi-close" variant="text" @click="close"></v-btn>
        </v-card-title>
        <v-card-subtitle v-if="filePath">{{ filePath }}</v-card-subtitle>
      </v-card-item>

      <v-card-text class="pa-0 preview-content">
        <div class="media-container">
          <!-- 视频播放器 -->
          <div v-if="isVideo" class="video-wrapper">
            <video
                ref="videoRef"
                class="custom-video-player"
                controls
                playsinline
                preload="metadata"
                @loadeddata="loading = false"
                @error="handleError"
            >
              <source :src="fileUrl" :type="videoType" />
              您的浏览器不支持视频播放。
            </video>
          </div>

          <!-- 音频播放器 -->
          <div v-else-if="isAudio" class="audio-wrapper">
            <div class="audio-cover">
              <v-icon icon="mdi-music" size="80" color="primary"></v-icon>
            </div>
            <div class="audio-info">
              <h3 class="audio-title">{{ fileName }}</h3>
              <p class="audio-subtitle">{{ formatSize(fileSize) }}</p>
            </div>
            <audio
                ref="audioRef"
                class="custom-audio-player"
                controls
                preload="metadata"
                @loadeddata="loading = false"
                @error="handleError"
            >
              <source :src="fileUrl" :type="audioType" />
              您的浏览器不支持音频播放。
            </audio>
          </div>

          <!-- 加载中 -->
          <div v-if="loading" class="loading-container">
            <v-progress-circular indeterminate color="primary" size="48"></v-progress-circular>
            <span class="mt-2">加载中...</span>
          </div>

          <!-- 错误提示 -->
          <div v-if="error" class="error-container">
            <v-icon icon="mdi-alert-circle" size="64" color="error"></v-icon>
            <span class="mt-2 text-h6">无法加载媒体文件</span>
            <p class="text-caption text-grey mt-2">{{ error }}</p>
          </div>
        </div>
      </v-card-text>

      <v-card-actions class="preview-actions">
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
import { ref, computed, watch } from 'vue'

const props = defineProps<{
  modelValue: boolean
  filePath: string
  fileName: string
  fileSize?: number
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const isFullscreen = ref(true) // 默认全屏

const videoRef = ref<HTMLVideoElement>()
const audioRef = ref<HTMLAudioElement>()
const loading = ref(true)
const error = ref('')

// 文件 URL（使用后端流服务）
const fileUrl = computed(() => {
  if (!props.filePath) return ''
  // 使用后端 API 获取媒体流
  const encodedPath = encodeURIComponent(props.filePath)
  return `http://localhost:3000/api/files/media?path=${encodedPath}`
})

// 判断是否为视频文件
const isVideo = computed(() => {
  const videoExtensions = ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm']
  const ext = props.fileName?.split('.').pop()?.toLowerCase() || ''
  return videoExtensions.includes(ext)
})

// 判断是否为音频文件
const isAudio = computed(() => {
  const audioExtensions = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a']
  const ext = props.fileName?.split('.').pop()?.toLowerCase() || ''
  return audioExtensions.includes(ext)
})

// 视频 MIME 类型
const videoType = computed(() => {
  const ext = props.fileName?.split('.').pop()?.toLowerCase() || ''
  const typeMap: Record<string, string> = {
    'mp4': 'video/mp4',
    'avi': 'video/x-msvideo',
    'mkv': 'video/x-matroska',
    'mov': 'video/quicktime',
    'wmv': 'video/x-ms-wmv',
    'flv': 'video/x-flv',
    'webm': 'video/webm'
  }
  return typeMap[ext] || 'video/mp4'
})

// 音频 MIME 类型
const audioType = computed(() => {
  const ext = props.fileName?.split('.').pop()?.toLowerCase() || ''
  const typeMap: Record<string, string> = {
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'flac': 'audio/flac',
    'aac': 'audio/aac',
    'ogg': 'audio/ogg',
    'wma': 'audio/x-ms-wma',
    'm4a': 'audio/mp4'
  }
  return typeMap[ext] || 'audio/mpeg'
})

// 监听对话框打开
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    loading.value = true
    error.value = ''
  } else {
    // 关闭时停止播放
    if (videoRef.value) {
      videoRef.value.pause()
      videoRef.value.currentTime = 0
    }
    if (audioRef.value) {
      audioRef.value.pause()
      audioRef.value.currentTime = 0
    }
  }
})

function handleError(e: Event) {
  loading.value = false
  error.value = '文件无法播放或格式不受支持'
  console.error('Media load error:', e)
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

function formatSize(bytes?: number): string {
  if (!bytes || bytes === 0) return '未知大小'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
</script>

<style scoped>
.media-player-card {
  display: flex;
  flex-direction: column;
  max-height: 95vh;
  background: #1a1a1a;
}

.media-player-card.fullscreen {
  height: 100vh;
  max-height: 100vh;
}

.preview-header {
  flex-shrink: 0;
  padding: 2px 16px !important;
  min-height: auto !important;
}

.preview-header :deep(.v-card-title) {
  font-size: 0.95rem;
  line-height: 1.2;
  padding: 0 !important;
}

.preview-header :deep(.v-card-subtitle) {
  font-size: 0.7rem;
  line-height: 1;
  padding: 0 !important;
  margin: 0 !important;
}

.preview-content {
  flex: 1;
  overflow: hidden;
}

.media-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  height: 100%;
  background: #000;
}

.video-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.custom-video-player {
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: calc(100vh - 80px);
  border-radius: 8px;
}

/* 自定义视频播放器样式 */
.custom-video-player::-webkit-media-controls {
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
}

.custom-video-player::-webkit-media-controls-panel {
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
}

.audio-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 40px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  width: 100%;
  min-height: 400px;
  justify-content: center;
}

.audio-cover {
  width: 180px;
  height: 180px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 30px;
  box-shadow: 0 20px 60px rgba(102, 126, 234, 0.4);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

.audio-info {
  text-align: center;
  margin-bottom: 30px;
}

.audio-title {
  color: #fff;
  font-size: 1.5rem;
  font-weight: 500;
  margin-bottom: 8px;
}

.audio-subtitle {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.9rem;
}

.custom-audio-player {
  width: 100%;
  max-width: 600px;
  height: 50px;
  border-radius: 25px;
}

/* 自定义音频播放器样式 */
.custom-audio-player::-webkit-media-controls {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 25px;
}

.custom-audio-player::-webkit-media-controls-panel {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 25px;
}

.loading-container,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  color: #fff;
  min-height: 400px;
}

.preview-actions {
  flex-shrink: 0;
  padding: 4px 16px !important;
  min-height: auto !important;
}

.preview-actions :deep(.v-btn) {
  margin: 0;
}
</style>
