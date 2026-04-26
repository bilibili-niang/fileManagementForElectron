<template>
  <v-container fluid class="file-share-container">
    <!-- 顶部工具栏 -->
    <v-card variant="outlined" class="mb-3">
      <v-card-title class="toolbar-title">
        <div class="d-flex align-center">
          <v-icon icon="mdi-folder-sync" class="mr-2"></v-icon>
          <span>文件共享</span>
        </div>
        <div class="toolbar-actions">
          <v-btn
            icon
            variant="text"
            size="small"
            :loading="loading"
            @click="loadFiles"
          >
            <v-icon icon="mdi-refresh"></v-icon>
          </v-btn>
          <v-btn
            v-if="folderPath"
            icon
            variant="text"
            size="small"
            @click="openFolder"
          >
            <v-icon icon="mdi-folder-open"></v-icon>
          </v-btn>
          <v-btn
            variant="outlined"
            size="small"
            prepend-icon="mdi-share"
            class="mr-2"
            :loading="shareLoading"
            @click="openShareDialog"
          >
            <span class="d-none d-sm-inline">分享</span>
          </v-btn>
          <v-btn
            variant="outlined"
            color="primary"
            size="small"
            prepend-icon="mdi-upload"
            @click="triggerUpload"
          >
            <span class="d-none d-sm-inline">上传文件</span>
            <v-icon icon="mdi-upload" class="d-sm-none"></v-icon>
          </v-btn>
        </div>
      </v-card-title>
      <v-card-text v-if="folderPath" class="text-caption text-grey folder-path">
        共享文件夹: {{ folderPath }}
      </v-card-text>
    </v-card>

    <!-- 隐藏的文件上传 input -->
    <input
      ref="fileInput"
      type="file"
      accept="*"
      class="hidden-input"
      @change="handleFileSelect"
    />

    <!-- 文件列表 - 桌面端表格 -->
    <v-card variant="outlined" class="d-none d-md-block">
      <v-progress-linear
        v-if="loading"
        indeterminate
        color="primary"
      ></v-progress-linear>

      <v-data-table
        v-else
        :items="files"
        :headers="headers"
        item-key="name"
        density="compact"
        no-data-text="暂无文件"
      >
        <template v-slot:item.name="{ item }">
          <div
            class="d-flex align-center cursor-pointer"
            @click="previewImage(item)"
          >
            <v-icon :icon="getFileIcon(item.extension)" class="mr-2"></v-icon>
            {{ item.name }}
          </div>
        </template>

        <template v-slot:item.size="{ item }">
          {{ formatFileSize(item.size) }}
        </template>

        <template v-slot:item.modifiedTime="{ item }">
          {{ formatDate(item.modifiedTime) }}
        </template>

        <template v-slot:item.actions="{ item }">
          <div class="d-flex">
            <v-btn
              icon
              size="small"
              variant="text"
              @click="downloadFile(item)"
              title="下载"
            >
              <v-icon icon="mdi-download"></v-icon>
            </v-btn>
            <v-btn
              icon
              size="small"
              variant="text"
              color="error"
              @click="deleteFile(item)"
              title="删除"
            >
              <v-icon icon="mdi-delete"></v-icon>
            </v-btn>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- 文件列表 - 移动端卡片 -->
    <div v-if="!loading && files.length > 0" class="d-md-none file-list-mobile">
      <v-card
        v-for="item in files"
        :key="item.name"
        variant="outlined"
        class="file-card mb-2"
      >
        <v-card-text class="pa-3">
          <div class="d-flex align-start">
            <v-icon :icon="getFileIcon(item.extension)" size="large" class="mr-3"></v-icon>
            <div class="file-info flex-grow-1" style="min-width: 0;">
              <div class="text-body-2 text-truncate" @click="previewImage(item)">
                {{ item.name }}
              </div>
              <div class="text-caption text-grey mt-1">
                {{ formatFileSize(item.size) }} · {{ formatDate(item.modifiedTime) }}
              </div>
            </div>
            <div class="file-actions d-flex">
              <v-btn
                icon
                size="small"
                variant="text"
                @click="downloadFile(item)"
              >
                <v-icon icon="mdi-download" size="small"></v-icon>
              </v-btn>
              <v-btn
                icon
                size="small"
                variant="text"
                color="error"
                @click="deleteFile(item)"
              >
                <v-icon icon="mdi-delete" size="small"></v-icon>
              </v-btn>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </div>

    <!-- 空状态 -->
    <v-card v-if="!loading && files.length === 0" variant="outlined" class="d-md-none">
      <v-card-text class="text-center text-grey py-8">
        <v-icon icon="mdi-folder-open" size="48" class="mb-2"></v-icon>
        <p>暂无文件</p>
      </v-card-text>
    </v-card>

    <!-- 上传对话框 -->
    <v-dialog v-model="showUploadDialog" max-width="500">
      <v-card>
        <v-card-title>
          <v-icon icon="mdi-upload" class="mr-2"></v-icon>
          上传文件
        </v-card-title>
        <v-card-text>
          <v-file-input
            v-model="selectedFile"
            label="选择文件"
            prepend-icon="mdi-file"
            show-size
            accept="*"
            density="compact"
            variant="outlined"
          ></v-file-input>
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn
            variant="text"
            @click="showUploadDialog = false; selectedFile = null"
          >
            取消
          </v-btn>
          <v-btn
            color="primary"
            :disabled="!selectedFile || uploading"
            :loading="uploading"
            @click="uploadFile"
          >
            上传
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 删除确认对话框 -->
    <v-dialog v-model="showDeleteDialog" max-width="400">
      <v-card>
        <v-card-title>
          <v-icon icon="mdi-alert" color="warning" class="mr-2"></v-icon>
          确认删除
        </v-card-title>
        <v-card-text>
          确定要删除文件 "{{ fileToDelete?.name }}" 吗？
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="showDeleteDialog = false">
            取消
          </v-btn>
          <v-btn color="error" @click="confirmDelete" :loading="deleting">
            删除
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 图片预览对话框 -->
    <v-dialog v-model="showImagePreview" max-width="90vw" max-height="90vh">
      <v-card>
        <v-card-item>
          <v-card-title class="d-flex align-center">
            <v-icon icon="mdi-image" class="mr-2"></v-icon>
            <span class="text-truncate">{{ previewFileName }}</span>
            <v-spacer></v-spacer>
            <v-btn icon="mdi-close" variant="text" size="small" @click="showImagePreview = false"></v-btn>
          </v-card-title>
        </v-card-item>
        <v-card-text class="text-center pa-0" style="max-height: 80vh; overflow: auto;">
          <img :src="previewImageUrl" :alt="previewFileName" style="max-width: 100%; max-height: 80vh;" />
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- 上传进度对话框 -->
    <v-dialog v-model="showUploadProgress" max-width="400" persistent>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon icon="mdi-upload" class="mr-2" color="primary"></v-icon>
          <span>正在上传</span>
        </v-card-title>
        <v-card-text class="pt-4">
          <div class="d-flex align-center mb-3">
            <v-icon icon="mdi-file" class="mr-2" color="grey"></v-icon>
            <span class="text-body-2 text-truncate">{{ uploadingFileName }}</span>
          </div>
          <v-progress-linear
            v-model="uploadProgress"
            color="primary"
            height="20"
            striped
            rounded
          >
            <template v-slot:default="{ value }">
              <span class="text-white text-caption">{{ Math.ceil(value) }}%</span>
            </template>
          </v-progress-linear>
          <div class="d-flex justify-space-between mt-2 text-caption text-grey">
            <span>{{ formatFileSize(uploadedBytes) }} / {{ formatFileSize(uploadTotalBytes) }}</span>
            <span v-if="uploadSpeed > 0">{{ uploadSpeed }} MB/s</span>
          </div>
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn
            color="error"
            variant="text"
            :disabled="uploadProgress >= 100"
            @click="cancelUpload"
          >
            取消上传
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 分享对话框 -->
    <v-dialog v-model="showShareDialog" max-width="450">
      <v-card>
        <v-card-title>
          <v-icon icon="mdi-share-variant" class="mr-2"></v-icon>
          分享文件共享
        </v-card-title>
        <v-card-text class="text-center">
          <div class="text-body-2 text-grey mb-4">
            扫描二维码或复制链接访问
          </div>
          <div class="qrcode-container mb-4">
            <img
              v-if="shareQrCode"
              :src="shareQrCode"
              alt="QR Code"
              width="180"
              height="180"
            />
            <div v-else class="qrcode-placeholder">
              <v-progress-circular indeterminate size="32"></v-progress-circular>
            </div>
          </div>
          <v-text-field
            :model-value="shareInfo.url"
            label="访问地址"
            readonly
            variant="outlined"
            density="compact"
            hide-details
            append-inner-icon="mdi-content-copy"
            @click:append-inner="copyShareUrl"
            @click="copyShareUrl"
          ></v-text-field>
          <div class="mt-3 text-caption text-grey">
            IP: {{ shareInfo.ip }}:{{ shareInfo.port }}
          </div>
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="showShareDialog = false">
            关闭
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { fileShareApi, type ShareFile } from '@/api'
import { useSnackbar } from '@/composables/useSnackbar'
import { formatFileSize } from '@/utils'
import QRCode from 'qrcode'

const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg']

const { showSnackbar } = useSnackbar()

const files = ref<ShareFile[]>([])
const loading = ref(false)
const folderPath = ref('')

// 分享弹窗
const showShareDialog = ref(false)
const shareInfo = ref({ url: '', ip: '', port: 0 })
const shareLoading = ref(false)
const shareQrCode = ref('')

// 图片预览
const showImagePreview = ref(false)
const previewImageUrl = ref('')
const previewFileName = ref('')

const showUploadDialog = ref(false)
const selectedFile = ref<File | null>(null)
const uploading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const showDeleteDialog = ref(false)
const fileToDelete = ref<ShareFile | null>(null)
const deleting = ref(false)

/**
 * 上传进度相关状态
 */
const showUploadProgress = ref(false)
const uploadProgress = ref(0)
const uploadingFileName = ref('')
const uploadedBytes = ref(0)
const uploadTotalBytes = ref(0)
const uploadSpeed = ref(0)
const uploadStartTime = ref(0)
let currentXhr: XMLHttpRequest | null = null

const headers = [
  { key: 'name', title: '文件名' },
  { key: 'size', title: '大小' },
  { key: 'modifiedTime', title: '修改时间' },
  { key: 'actions', title: '操作', sortable: false, width: '120px' }
]

const getFileIcon = (extension: string): string => {
  const ext = extension.toLowerCase()
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg']
  const docExts = ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'xls', 'xlsx', 'ppt', 'pptx']
  const codeExts = ['js', 'ts', 'jsx', 'tsx', 'vue', 'html', 'css', 'py', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'go', 'rs', 'rb', 'php']
  const videoExts = ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm']
  const audioExts = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a']
  const archiveExts = ['zip', 'rar', '7z', 'tar', 'gz']

  if (imageExts.includes(ext)) return 'mdi-file-image'
  if (docExts.includes(ext)) return 'mdi-file-document'
  if (codeExts.includes(ext)) return 'mdi-file-code'
  if (videoExts.includes(ext)) return 'mdi-file-video'
  if (audioExts.includes(ext)) return 'mdi-file-music'
  if (archiveExts.includes(ext)) return 'mdi-folder-zip'

  return 'mdi-file'
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN')
}

const loadFiles = async () => {
  try {
    loading.value = true
    const response = await fileShareApi.getFileList()
    if (response.success) {
      files.value = response.files
      folderPath.value = response.folder
    }
  } catch (error) {
    console.error('Load files error:', error)
    showSnackbar('加载文件列表失败', 'error')
  } finally {
    loading.value = false
  }
}

// 触发文件选择（兼容移动端）
const triggerUpload = () => {
  if (fileInput.value) {
    fileInput.value.click()
  }
}

// 处理文件选择
const handleFileSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    await uploadFileFromInput(file)
  }
  // 清空 input 以便选择相同文件
  input.value = ''
}

/**
 * 使用选择的文件上传
 */
const uploadFileFromInput = async (file: File) => {
  try {
    uploading.value = true
    showUploadProgress.value = true
    uploadingFileName.value = file.name
    uploadTotalBytes.value = file.size
    uploadProgress.value = 0
    uploadedBytes.value = 0
    uploadSpeed.value = 0
    uploadStartTime.value = Date.now()

    const { promise, xhr } = fileShareApi.uploadFile(file, (progress) => {
      uploadProgress.value = progress
      uploadedBytes.value = Math.round((progress / 100) * file.size)

      /**
       * 计算上传速度
       */
      const elapsedSeconds = (Date.now() - uploadStartTime.value) / 1000
      if (elapsedSeconds > 0) {
        const bytesPerSecond = uploadedBytes.value / elapsedSeconds
        uploadSpeed.value = Math.round((bytesPerSecond / 1024 / 1024) * 10) / 10
      }
    })

    currentXhr = xhr
    const result = await promise

    if (result.success) {
      showSnackbar('上传成功', 'success')
      await loadFiles()
    } else {
      showSnackbar(result.error || '上传失败', 'error')
    }
  } catch (error) {
    console.error('Upload error:', error)
    if ((error as Error).message !== '上传已取消') {
      showSnackbar('上传失败', 'error')
    }
  } finally {
    uploading.value = false
    showUploadProgress.value = false
    uploadProgress.value = 0
    currentXhr = null
  }
}

/**
 * 取消上传
 */
const cancelUpload = () => {
  if (currentXhr) {
    currentXhr.abort()
    currentXhr = null
  }
  showUploadProgress.value = false
  uploading.value = false
  showSnackbar('上传已取消', 'info')
}

/**
 * 从对话框上传文件
 */
const uploadFile = async () => {
  if (!selectedFile.value) return

  try {
    uploading.value = true
    showUploadProgress.value = true
    showUploadDialog.value = false
    uploadingFileName.value = selectedFile.value.name
    uploadTotalBytes.value = selectedFile.value.size
    uploadProgress.value = 0
    uploadedBytes.value = 0
    uploadSpeed.value = 0
    uploadStartTime.value = Date.now()

    const { promise, xhr } = fileShareApi.uploadFile(selectedFile.value, (progress) => {
      uploadProgress.value = progress
      uploadedBytes.value = Math.round((progress / 100) * selectedFile.value!.size)

      /**
       * 计算上传速度
       */
      const elapsedSeconds = (Date.now() - uploadStartTime.value) / 1000
      if (elapsedSeconds > 0) {
        const bytesPerSecond = uploadedBytes.value / elapsedSeconds
        uploadSpeed.value = Math.round((bytesPerSecond / 1024 / 1024) * 10) / 10
      }
    })

    currentXhr = xhr
    const result = await promise

    if (result.success) {
      showSnackbar('上传成功', 'success')
      selectedFile.value = null
      await loadFiles()
    } else {
      showSnackbar(result.error || '上传失败', 'error')
    }
  } catch (error) {
    console.error('Upload error:', error)
    if ((error as Error).message !== '上传已取消') {
      showSnackbar('上传失败', 'error')
    }
  } finally {
    uploading.value = false
    showUploadProgress.value = false
    uploadProgress.value = 0
    currentXhr = null
  }
}

const downloadFile = (file: ShareFile) => {
  const url = fileShareApi.getDownloadUrl(file.name)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

const deleteFile = (file: ShareFile) => {
  fileToDelete.value = file
  showDeleteDialog.value = true
}

const confirmDelete = async () => {
  if (!fileToDelete.value) return

  try {
    deleting.value = true
    const result = await fileShareApi.deleteFile(fileToDelete.value.name)

    if (result.success) {
      showSnackbar('删除成功', 'success')
      showDeleteDialog.value = false
      fileToDelete.value = null
      await loadFiles()
    } else {
      showSnackbar(result.error || '删除失败', 'error')
    }
  } catch (error) {
    console.error('Delete error:', error)
    showSnackbar('删除失败', 'error')
  } finally {
    deleting.value = false
  }
}

const openFolder = async () => {
  try {
    if ((window as any).electronAPI?.showItemInFolder && folderPath.value) {
      await (window as any).electronAPI.showItemInFolder(folderPath.value)
    } else {
      showSnackbar('请在 Electron 环境中使用此功能', 'warning')
    }
  } catch (error) {
    console.error('Open folder error:', error)
    showSnackbar('打开文件夹失败', 'error')
  }
}

const openShareDialog = async () => {
  try {
    shareLoading.value = true
    const res = await fileShareApi.getAccessInfo()
    if (res.success) {
      const frontendPort = window.location.port || '5173'
      const shareUrl = `http://${res.ip}:${frontendPort}/#/fileShare`

      shareInfo.value = {
        url: shareUrl,
        ip: res.ip,
        port: frontendPort
      }
      try {
        shareQrCode.value = await QRCode.toDataURL(shareUrl, {
          width: 180,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        })
      } catch (qrError) {
        console.error('Generate QR code failed:', qrError)
        shareQrCode.value = ''
      }
      showShareDialog.value = true
    } else {
      showSnackbar('获取分享信息失败', 'error')
    }
  } catch (error) {
    console.error('Get share info error:', error)
    showSnackbar('获取分享信息失败', 'error')
  } finally {
    shareLoading.value = false
  }
}

const copyShareUrl = () => {
  navigator.clipboard.writeText(shareInfo.value.url)
  showSnackbar('已复制到剪贴板', 'success')
}

const isImage = (file: ShareFile): boolean => {
  return imageExtensions.includes(file.extension.toLowerCase())
}

const previewImage = (file: ShareFile) => {
  if (isImage(file)) {
    previewImageUrl.value = fileShareApi.getDownloadUrl(file.name)
    previewFileName.value = file.name
    showImagePreview.value = true
  }
}

onMounted(() => {
  loadFiles()
})
</script>

<style scoped lang="scss">
.file-share-container {
  padding: 0 !important;
  min-height: 100%;
}

.cursor-pointer {
  cursor: pointer;
}

.toolbar-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 16px;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.folder-path {
  padding-top: 0 !important;
}

.hidden-input {
  display: none;
}

.file-list-mobile {
  padding: 0;
}

.file-card {
  .file-info {
    max-width: calc(100% - 100px);
  }

  .file-actions {
    gap: 0;
  }
}

.qrcode-container {
  display: flex;
  justify-content: center;
  min-height: 180px;
  align-items: center;

  img {
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
}

.qrcode-placeholder {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 180px;
  height: 180px;
}

// 移动端适配
@media (max-width: 599px) {
  .file-share-container {
    padding: 8px !important;
  }

  .toolbar-title {
    flex-direction: column;
    align-items: flex-start;
    padding: 12px;
  }

  .toolbar-actions {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
