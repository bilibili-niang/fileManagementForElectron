<template>
  <div class="qr-code-generator">
    <v-row>
      <!-- 左侧：配置和预览 -->
      <v-col cols="12" md="6" lg="5">
        <v-card class="qr-card" elevation="2">
          <v-card-text class="pa-4 pt-4">
            <v-text-field
              v-model="baseUrl"
              label="基础链接"
              placeholder="http://172.19.102.166:8000/#/indexApp"
              variant="outlined"
              class="mb-1"
              density="compact"
              hide-details
            ></v-text-field>

            <v-text-field
              v-model="timeApiUrl"
              label="时间接口地址"
              placeholder="http://172.19.102.166:8000/client/system/datetime"
              variant="outlined"
              class="mb-1"
              :disabled="!appendTime"
              density="compact"
              hide-details
            ></v-text-field>

            <v-switch
              v-model="appendTime"
              label="拼接时间参数"
              color="primary"
              class="mb-1 mt-0"
              hide-details
              density="compact"
            ></v-switch>

            <v-row class="mb-2">
              <v-col cols="6">
                <v-text-field
                  v-model.number="qrSize"
                  label="二维码大小(px)"
                  type="number"
                  variant="outlined"
                  min="100"
                  max="1000"
                ></v-text-field>
              </v-col>
              <v-col cols="6">
                <v-select
                  v-model="errorCorrectionLevel"
                  label="纠错级别"
                  :items="errorCorrectionLevels"
                  variant="outlined"
                ></v-select>
              </v-col>
            </v-row>

            <div class="qr-preview">
              <div v-if="qrDataUrl" class="qr-preview__container">
                <img :src="qrDataUrl" :width="qrSize" :height="qrSize" alt="二维码" class="qr-preview__image" />
              </div>
              <div v-else class="qr-preview__placeholder">
                <v-icon icon="mdi-qrcode-scan" size="48" color="on-surface-variant"></v-icon>
                <p class="qr-preview__text">点击生成按钮创建二维码</p>
              </div>
            </div>

            <div v-if="generatedUrl" class="qr-url mt-2">
              <v-text-field
                v-model="generatedUrl"
                label="生成的链接"
                variant="outlined"
                readonly
                density="compact"
                append-inner-icon="mdi-content-copy"
                @click:append-inner="copyUrl"
              ></v-text-field>
            </div>

            <v-alert
              v-if="errorMessage"
              type="error"
              variant="tonal"
              class="mt-2"
              closable
              @click:close="errorMessage = ''"
              density="compact"
            >
              {{ errorMessage }}
            </v-alert>
          </v-card-text>

          <v-card-actions class="qr-card__actions">
            <v-btn
              color="primary"
              variant="elevated"
              :loading="isLoading"
              @click="handleManualGenerate"
            >
              <v-icon icon="mdi-refresh" class="mr-2"></v-icon>
              生成二维码
            </v-btn>
            <v-btn
              color="secondary"
              variant="outlined"
              :disabled="!qrDataUrl"
              @click="downloadQrCode"
            >
              <v-icon icon="mdi-download" class="mr-2"></v-icon>
              下载二维码
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>

      <!-- 右侧：历史记录 -->
      <v-col cols="12" md="6" lg="7">
        <v-card class="history-card fill-height" elevation="2">
          <v-card-text class="pa-3 fill-height">
            <div class="d-flex justify-space-between align-center mb-3">
              <h3 class="section-title text-body-1 mb-0">生成历史</h3>
              <div class="d-flex align-center gap-1">
                <v-btn
                  v-if="history.length > 0"
                  color="error"
                  variant="text"
                  size="small"
                  icon="mdi-delete-sweep"
                  @click="showClearDialog = true"
                ></v-btn>
              </div>
            </div>

            <div v-if="history.length === 0" class="text-center text-grey py-4">
              <v-icon icon="mdi-history" size="32" class="mb-2"></v-icon>
              <p class="text-caption">暂无生成历史</p>
            </div>

            <v-list v-else class="history-list" density="compact">
              <v-list-item
                v-for="item in history"
                :key="item.id"
                class="history-item px-2 py-1"
              >
                <div class="history-content">
                  <div class="history-time">{{ formatHistoryTime(item.created_at) }}</div>
                  <div class="history-url" :title="item.generated_url">{{ item.generated_url }}</div>
                </div>
                <template v-slot:append>
                  <div class="d-flex align-center" style="gap: 2px;">
                    <v-btn
                      icon="mdi-content-copy"
                      variant="text"
                      density="compact"
                      size="small"
                      color="primary"
                      @click="copyHistoryUrl(item.generated_url)"
                    ></v-btn>
                    <v-btn
                      icon="mdi-reload"
                      variant="text"
                      density="compact"
                      size="small"
                      color="info"
                      @click="loadFromHistory(item)"
                    ></v-btn>
                    <v-btn
                      icon="mdi-delete"
                      variant="text"
                      density="compact"
                      size="small"
                      color="error"
                      @click="deleteHistoryItem(item.id)"
                    ></v-btn>
                  </div>
                </template>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- 清空历史确认对话框 -->
    <v-dialog v-model="showClearDialog" max-width="320">
      <v-card>
        <v-card-title class="text-body-1 pa-4">确认清空</v-card-title>
        <v-card-text class="pa-0 px-4 pb-4">
          确定要清空所有生成历史吗？此操作无法撤销。
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showClearDialog = false">取消</v-btn>
          <v-btn color="error" variant="elevated" @click="confirmClear">清空</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, inject } from 'vue'
import QRCode from 'qrcode'
import { configApi } from '@/api'

const showSnackbar = inject('showSnackbar') as (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void

// 表单数据
const baseUrl = ref('http://172.19.102.166:8000/#/indexApp')
const timeApiUrl = ref('http://172.19.102.166:8000/client/system/datetime')
const qrSize = ref(256)
const errorCorrectionLevel = ref('M')
const appendTime = ref(true)

// 生成结果
const qrDataUrl = ref('')
const generatedUrl = ref('')
const isLoading = ref(false)
const errorMessage = ref('')

// 历史记录
const history = ref<Array<{
  id: number
  base_url: string
  time_api_url: string
  generated_url: string
  append_time: boolean
  qr_size: number
  error_correction_level: string
  created_at: string
}>>([])

const showClearDialog = ref(false)

// 纠错级别选项
const errorCorrectionLevels = [
  { title: '低 (L)', value: 'L' },
  { title: '中 (M)', value: 'M' },
  { title: '高 (Q)', value: 'Q' },
  { title: '最高 (H)', value: 'H' }
]

/**
 * 加载配置并自动生成二维码
 */
async function loadConfigAndGenerate() {
  try {
    isLoading.value = true
    const response = await configApi.getQrcodeConfig()
    if (response.success && response.config) {
      const config = response.config
      baseUrl.value = config.base_url || 'http://172.19.102.166:8000/#/indexApp'
      timeApiUrl.value = config.time_api_url || 'http://172.19.102.166:8000/client/system/datetime'
      appendTime.value = config.append_time !== false
      qrSize.value = config.qr_size || 256
      errorCorrectionLevel.value = config.error_correction_level || 'M'
    }
    await generateDynamicQrCode()
  } catch (error) {
    console.error('加载配置失败:', error)
    await generateDynamicQrCode()
  } finally {
    isLoading.value = false
  }
}

/**
 * 保存配置
 */
async function saveConfig() {
  try {
    await configApi.saveQrcodeConfig({
      base_url: baseUrl.value,
      time_api_url: timeApiUrl.value,
      append_time: appendTime.value,
      qr_size: qrSize.value,
      error_correction_level: errorCorrectionLevel.value
    })
  } catch (error) {
    console.error('保存配置失败:', error)
  }
}

/**
 * 生成二维码（用于页面加载，不保存历史）
 */
async function generateDynamicQrCode(): Promise<void> {
  if (!baseUrl.value) {
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    let resultUrl = ''

    if (appendTime.value) {
      resultUrl = await generateQrWithTimestamp()
    } else {
      resultUrl = baseUrl.value
      await generateQrImage(resultUrl)
    }

    generatedUrl.value = resultUrl
  } catch {
    // 页面加载时生成失败不显示错误，避免干扰
  } finally {
    isLoading.value = false
  }
}

/**
 * 从接口获取时间戳并生成二维码
 */
async function generateQrWithTimestamp(): Promise<string> {
  if (!timeApiUrl.value) {
    errorMessage.value = '请输入时间接口地址'
    throw new Error('请输入时间接口地址')
  }

  try {
    const response = await fetch(timeApiUrl.value, {
      method: 'GET',
      mode: 'cors',
      headers: {
        'Accept': 'application/json'
      }
    })
    const result = await response.json()

    if (result.code === 200 && result.data) {
      const timestamp = result.data
      const url = `${baseUrl.value}?time=${timestamp}`
      await generateQrImage(url)
      return url
    } else {
      errorMessage.value = '获取时间戳失败: ' + JSON.stringify(result)
      throw new Error('获取时间戳失败')
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    if (errMsg.includes('CORS') || errMsg.includes('Failed to fetch')) {
      errorMessage.value = '跨域请求被阻止,请检查后端是否允许跨域访问,或使用当前时间戳生成'
      return await useLocalTimestamp()
    } else {
      errorMessage.value = '生成二维码失败: ' + errMsg
      throw error
    }
  }
}

/**
 * 生成二维码图片
 */
async function generateQrImage(url: string): Promise<void> {
  try {
    const dataUrl = await QRCode.toDataURL(url, {
      width: qrSize.value,
      margin: 2,
      errorCorrectionLevel: errorCorrectionLevel.value as 'L' | 'M' | 'Q' | 'H',
      type: 'image/png'
    })
    qrDataUrl.value = dataUrl
  } catch (error) {
    errorMessage.value = '生成二维码失败: ' + (error instanceof Error ? error.message : String(error))
  }
}

/**
 * 使用本地时间戳生成二维码
 */
async function useLocalTimestamp(): Promise<string> {
  const timestamp = Date.now()
  const url = `${baseUrl.value}?time=${timestamp}`
  await generateQrImage(url)
  return url
}

/**
 * 下载二维码图片
 */
function downloadQrCode(): void {
  if (!qrDataUrl.value) {
    return
  }

  const link = document.createElement('a')
  link.download = `qrcode-${Date.now()}.png`
  link.href = qrDataUrl.value
  link.click()
}

/**
 * 复制链接
 */
function copyUrl(): void {
  if (!generatedUrl.value) return
  navigator.clipboard.writeText(generatedUrl.value).then(() => {
    showSnackbar('已复制到剪贴板', 'success')
  }).catch(() => {
    showSnackbar('复制失败', 'error')
  })
}

/**
 * 加载历史记录
 */
async function loadHistory() {
  try {
    const response = await configApi.getQrcodeHistory(50)
    if (response.success) {
      history.value = response.history
    }
  } catch (error) {
    console.error('加载历史记录失败:', error)
  }
}

/**
 * 保存到历史记录
 */
async function saveHistory(url: string) {
  try {
    await configApi.addQrcodeHistory({
      base_url: baseUrl.value,
      time_api_url: timeApiUrl.value,
      generated_url: url,
      append_time: appendTime.value,
      qr_size: qrSize.value,
      error_correction_level: errorCorrectionLevel.value
    })
    await loadHistory()
  } catch (error) {
    console.error('保存历史记录失败:', error)
  }
}

/**
 * 从历史记录加载
 */
async function loadFromHistory(item: typeof history.value[0]) {
  baseUrl.value = item.base_url
  timeApiUrl.value = item.time_api_url
  appendTime.value = item.append_time
  qrSize.value = item.qr_size
  errorCorrectionLevel.value = item.error_correction_level

  // 重新生成二维码
  generatedUrl.value = item.generated_url
  await generateQrImage(item.generated_url)

  showSnackbar('已加载历史配置', 'info')
}

/**
 * 删除单条历史记录
 */
async function deleteHistoryItem(id: number) {
  try {
    await configApi.deleteQrcodeHistory(id)
    await loadHistory()
    showSnackbar('已删除', 'success')
  } catch (error) {
    console.error('删除历史记录失败:', error)
    showSnackbar('删除失败', 'error')
  }
}

/**
 * 清空历史记录
 */
async function clearHistory() {
  try {
    await configApi.clearQrcodeHistory()
    await loadHistory()
    showSnackbar('历史记录已清空', 'success')
  } catch (error) {
    console.error('清空历史记录失败:', error)
    showSnackbar('清空失败', 'error')
  }
}

/**
 * 确认清空
 */
function confirmClear() {
  showClearDialog.value = false
  clearHistory()
}

/**
 * 复制历史链接
 */
function copyHistoryUrl(url: string) {
  navigator.clipboard.writeText(url).then(() => {
    showSnackbar('已复制到剪贴板', 'success')
  }).catch(() => {
    showSnackbar('复制失败', 'error')
  })
}

/**
 * 格式化历史时间
 */
function formatHistoryTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  let dateStr2 = ''
  if (dateOnly.getTime() === today.getTime()) {
    dateStr2 = '今天'
  } else if (dateOnly.getTime() === yesterday.getTime()) {
    dateStr2 = '昨天'
  } else {
    dateStr2 = `${date.getMonth() + 1}-${date.getDate()}`
  }

  return `${dateStr2} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

// 页面加载时
onMounted(() => {
  loadHistory()
  loadConfigAndGenerate()
})

// 手动生成二维码（保存历史）
async function handleManualGenerate() {
  if (!baseUrl.value) {
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    let resultUrl = ''

    if (appendTime.value) {
      resultUrl = await generateQrWithTimestamp()
    } else {
      resultUrl = baseUrl.value
      await generateQrImage(resultUrl)
    }

    generatedUrl.value = resultUrl

    // 手动生成才保存到历史记录
    await saveHistory(resultUrl)

    // 保存配置
    await saveConfig()
  } catch {
    // 生成失败时不保存历史记录
  } finally {
    isLoading.value = false
  }
}
</script>

<style lang="scss">
@use './index.scss';

.fill-height {
  height: 100%;
}

.history-card {
  height: calc(100vh - 32px);
  display: flex;
  flex-direction: column;
}

.history-list {
  flex: 1;
  overflow-y: auto;
  max-height: calc(100vh - 150px);
}

.history-item {
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);

  &:last-child {
    border-bottom: none;
  }
}

.history-content {
  flex: 1;
  min-width: 0;
}

.history-time {
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
  margin-bottom: 2px;
}

.history-url {
  font-size: 0.85rem;
  color: rgba(var(--v-theme-on-surface), 0.87);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
