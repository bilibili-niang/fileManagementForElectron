<template>
  <v-dialog v-model="show" persistent fullscreen :scrim="false" transition="fade-transition">
    <v-card class="welcome-wizard" color="primary" dark>
      <!-- 步骤条 -->
      <v-stepper v-model="currentStep" class="wizard-stepper" bg-color="transparent" flat>
        <v-stepper-header class="wizard-header">
          <v-stepper-item value="1" title="欢迎"></v-stepper-item>
          <v-divider></v-divider>
          <v-stepper-item value="2" title="数据库配置"></v-stepper-item>
          <v-divider></v-divider>
          <v-stepper-item value="3" title="完成"></v-stepper-item>
        </v-stepper-header>

        <v-stepper-window class="wizard-window">
          <!-- 步骤 1: 欢迎 -->
          <v-stepper-window-item value="1">
            <div class="step-content">
              <v-icon icon="mdi-magnify" size="80" class="mb-4 welcome-icon"></v-icon>
              <h1 class="text-h3 mb-4">欢迎使用 SuperUtils</h1>
              <p class="text-body-1 mb-2 text-center" style="max-width: 500px;">
                这是一个强大的本地文件搜索工具，帮助你快速找到电脑上的任何文件。
              </p>
              <p class="text-body-2 text-medium-emphasis">
                首次使用需要配置数据库，让我们开始吧！
              </p>
              <v-btn color="white" variant="elevated" class="mt-6" size="large" @click="nextStep">
                开始配置
                <v-icon end icon="mdi-arrow-right"></v-icon>
              </v-btn>
            </div>
          </v-stepper-window-item>

          <!-- 步骤 2: 数据库配置 -->
          <v-stepper-window-item value="2">
            <div class="step-content">
              <v-icon icon="mdi-database" size="60" class="mb-4"></v-icon>
              <h2 class="text-h4 mb-4">数据库配置</h2>
              <p class="text-body-2 mb-4 text-center" style="max-width: 500px;">
                请配置 MySQL 数据库连接信息，用于存储文件索引数据。
              </p>

              <v-card class="config-form pa-4" max-width="450" width="100%" variant="outlined" color="rgba(255,255,255,0.1)">
                <v-form ref="form" v-model="valid">
                  <v-text-field v-model="config.host" label="主机" :rules="[rules.required]" variant="outlined" density="compact" class="mb-2" bg-color="rgba(255,255,255,0.05)"></v-text-field>

                  <v-text-field v-model.number="config.port" label="端口" type="number" :rules="[rules.required, rules.portRange]" variant="outlined" density="compact" class="mb-2" bg-color="rgba(255,255,255,0.05)"></v-text-field>

                  <v-text-field v-model="config.username" label="用户名" :rules="[rules.required]" variant="outlined" density="compact" class="mb-2" bg-color="rgba(255,255,255,0.05)"></v-text-field>

                  <v-text-field v-model="config.password" label="密码" type="password" :rules="[rules.required]" variant="outlined" density="compact" class="mb-2" bg-color="rgba(255,255,255,0.05)"></v-text-field>

                  <v-btn :loading="testing" :disabled="!valid || testing" color="white" variant="outlined" block class="mt-2" @click="testConnection">
                    <v-icon start icon="mdi-connection"></v-icon>
                    测试连接
                  </v-btn>
                </v-form>
              </v-card>

              <div class="step-actions mt-4">
                <v-btn variant="text" @click="prevStep">返回</v-btn>
                <v-btn color="white" variant="elevated" :disabled="!connectionSuccess" @click="saveAndContinue">
                  保存并继续
                  <v-icon end icon="mdi-arrow-right"></v-icon>
                </v-btn>
              </div>
            </div>
          </v-stepper-window-item>

          <!-- 步骤 3: 完成 -->
          <v-stepper-window-item value="3">
            <div class="step-content">
              <v-icon icon="mdi-check-circle" size="80" color="success" class="mb-4 success-icon"></v-icon>
              <h2 class="text-h3 mb-4">配置完成！</h2>
              <p class="text-body-1 mb-2 text-center" style="max-width: 500px;">
                数据库连接已成功配置。
              </p>
              <p class="text-body-2 text-medium-emphasis mb-4">
                现在你可以开始使用 SuperUtils 搜索文件了。
              </p>
              <v-alert type="info" variant="tonal" class="mb-4" max-width="400">
                <p class="text-caption mb-0">
                  <v-icon icon="mdi-lightbulb" size="16" class="mr-1"></v-icon>
                  提示：首次使用建议先进行文件索引，这样才能搜索到文件。
                </p>
              </v-alert>
              <v-btn color="success" variant="elevated" size="large" @click="finish">
                开始使用
                <v-icon end icon="mdi-rocket-launch"></v-icon>
              </v-btn>
            </div>
          </v-stepper-window-item>
        </v-stepper-window>
      </v-stepper>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'complete': []
}>()

const show = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const currentStep = ref('1')
const valid = ref(false)
const testing = ref(false)
const connectionSuccess = ref(false)

const config = reactive({
  host: 'localhost',
  port: 3306,
  username: 'root',
  password: ''
})

const rules = {
  required: (value: string) => !!value || '此项为必填项',
  portRange: (value: number) => (value >= 1 && value <= 65535) || '端口范围必须在 1-65535 之间'
}

function nextStep() {
  if (currentStep.value === '1') currentStep.value = '2'
  else if (currentStep.value === '2') currentStep.value = '3'
}

function prevStep() {
  if (currentStep.value === '2') currentStep.value = '1'
  else if (currentStep.value === '3') currentStep.value = '2'
}

async function testConnection() {
  testing.value = true
  try {
    console.log('=== 开始测试数据库连接 ===')
    console.log('配置信息:', JSON.stringify(config, null, 2))

    const isElectron = !!(window as any).electronAPI?.testDatabaseConnection
    console.log('是否 Electron 环境:', isElectron)

    let result

    if (isElectron) {
      console.log('使用 Electron API 测试连接')
      result = await window.electronAPI.testDatabaseConnection(config)
      console.log('Electron 返回结果:', result)
    } else {
      console.log('使用 HTTP API 测试连接: http://localhost:3000/api/config/test-db')
      const response = await fetch('http://localhost:3000/api/config/test-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })
      console.log('HTTP 响应状态:', response.status)
      result = await response.json()
      console.log('HTTP 返回结果:', result)
    }

    connectionSuccess.value = result.success
    if (result.success) {
      console.log('连接成功')
      await saveConfig()
    } else {
      console.log('连接失败:', result.message || result.error)
      alert('连接失败，请检查配置信息: ' + (result.message || result.error || ''))
    }
  } catch (error) {
    console.error('=== 测试连接出错 ===')
    console.error('错误对象:', error)
    console.error('错误类型:', typeof error)

    /**
     * 提取错误消息
     * 注意: Electron IPC 返回的错误可能是普通对象而不是 Error 实例
     */
    let errorMessage = '未知错误'
    if (error instanceof Error) {
      errorMessage = error.message
    } else if (typeof error === 'object' && error !== null) {
      errorMessage = error.message || error.error || JSON.stringify(error)
    } else if (typeof error === 'string') {
      errorMessage = error
    }

    console.error('错误消息:', errorMessage)
    alert('测试连接时出错: ' + errorMessage)
  } finally {
    testing.value = false
    console.log('=== 测试连接结束 ===')
  }
}

async function saveConfig() {
  try {
    const fullConfig = {
      mysql: {
        ...config,
        database: 'superutils_file_manager'
      },
      indexing: {
        excludeC: true,
        excludeNodeModules: true,
        lastIndexed: null,
        schedule: ''
      }
    }

    const isElectron = !!(window as any).electronAPI?.saveConfig

    if (isElectron) {
      await window.electronAPI.saveConfig(fullConfig)
    } else {
      await fetch('http://localhost:3000/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullConfig)
      })
    }
  } catch (error) {
    console.error('Save config error:', error)
  }
}

function saveAndContinue() {
  nextStep()
}

function finish() {
  show.value = false
  emit('complete')
}
</script>

<style scoped lang="scss">
@import './index.scss';
</style>
