<template>
  <div class="qr-code-generator">
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
          @click="generateDynamicQrCode"
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
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import QRCode from 'qrcode'

/**
 * 基础链接
 */
const baseUrl = ref('http://172.19.102.166:8000/#/indexApp')

/**
 * 时间接口地址
 */
const timeApiUrl = ref('http://172.19.102.166:8000/client/system/datetime')

/**
 * 二维码大小
 */
const qrSize = ref(256)

/**
 * 纠错级别
 */
const errorCorrectionLevel = ref('M')

/**
 * 是否拼接时间参数
 */
const appendTime = ref(true)

/**
 * 二维码数据URL
 */
const qrDataUrl = ref('')

/**
 * 生成的完整链接
 */
const generatedUrl = ref('')

/**
 * 是否正在加载
 */
const isLoading = ref(false)

/**
 * 错误信息
 */
const errorMessage = ref('')

/**
 * 纠错级别选项
 */
const errorCorrectionLevels = [
  { title: '低 (L)', value: 'L' },
  { title: '中 (M)', value: 'M' },
  { title: '高 (Q)', value: 'Q' },
  { title: '最高 (H)', value: 'H' }
]

/**
 * 生成二维码
 */
async function generateDynamicQrCode(): Promise<void> {
  if (!baseUrl.value) {
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    if (appendTime.value) {
      await generateQrWithTimestamp()
    } else {
      await generateQrWithoutTimestamp()
    }
  } finally {
    isLoading.value = false
  }
}

/**
 * 从接口获取时间戳并生成二维码
 */
async function generateQrWithTimestamp(): Promise<void> {
  if (!timeApiUrl.value) {
    errorMessage.value = '请输入时间接口地址'
    return
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
      generatedUrl.value = `${baseUrl.value}?time=${timestamp}`
      await generateQrImage(generatedUrl.value)
    } else {
      errorMessage.value = '获取时间戳失败: ' + JSON.stringify(result)
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    if (errMsg.includes('CORS') || errMsg.includes('Failed to fetch')) {
      errorMessage.value = '跨域请求被阻止,请检查后端是否允许跨域访问,或使用当前时间戳生成'
      await useLocalTimestamp()
    } else {
      errorMessage.value = '生成二维码失败: ' + errMsg
    }
  }
}

/**
 * 不使用时间戳生成二维码
 */
async function generateQrWithoutTimestamp(): Promise<void> {
  generatedUrl.value = baseUrl.value
  await generateQrImage(generatedUrl.value)
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
async function useLocalTimestamp(): Promise<void> {
  const timestamp = Date.now()
  generatedUrl.value = `${baseUrl.value}?time=${timestamp}`
  await generateQrImage(generatedUrl.value)
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
</script>

<style lang="scss">
@use './index.scss';
</style>
