<template>
  <v-container fluid class="calculator-container">
    <v-row class="fill-height">
      <v-col cols="12" md="8" lg="6" class="mx-auto">
        <v-card class="calculator-card" flat>
          <v-card-text class="pa-3">
            <div class="calculator-display">
              <div class="expression">{{ expression }}</div>
              <div class="result">{{ display }}</div>
            </div>

            <div class="calculator-buttons">
              <v-row dense>
                <v-col v-for="btn in buttons" :key="btn.value" cols="3">
                  <v-btn
                    :class="[
                      'calc-btn',
                      { 'operator': btn.type === 'operator' },
                      { 'equals': btn.type === 'equals' },
                      { 'clear': btn.type === 'clear' },
                      { 'function': btn.type === 'function' }
                    ]"
                    :color="btn.color"
                    :variant="btn.variant"
                    size="x-large"
                    block
                    @click="handleButton(btn)"
                  >
                    {{ btn.label }}
                  </v-btn>
                </v-col>
              </v-row>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="4" lg="6" class="fill-height">
        <v-card class="history-card fill-height" flat>
          <v-card-text class="pa-3">
            <div class="d-flex justify-space-between align-center mb-3">
              <h3 class="section-title text-body-1 mb-0">计算历史</h3>
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
              <p class="text-caption">暂无计算历史</p>
            </div>

            <v-list v-else class="history-list" density="compact">
              <v-list-item
                v-for="item in history"
                :key="item.id"
                class="history-item px-2 py-1"
              >
                <div class="history-content">
                  <div class="history-time">{{ formatHistoryTime(item.created_at) }}</div>
                  <div class="history-calc">
                    <span class="history-expression">{{ item.expression }}</span>
                    <span class="history-equals">=</span>
                    <span class="history-result">{{ item.result }}</span>
                  </div>
                </div>
                <template v-slot:append>
                  <div class="d-flex align-center" style="gap: 2px;">
                    <v-btn
                      icon="mdi-content-copy"
                      variant="text"
                      density="compact"
                      size="small"
                      color="primary"
                      @click="copyResult(item.result)"
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
          确定要清空所有计算历史吗？此操作无法撤销。
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showClearDialog = false">取消</v-btn>
          <v-btn color="error" variant="elevated" @click="confirmClear">清空</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, inject } from 'vue'
import { configApi } from '@/api'

const showSnackbar = inject('showSnackbar') as (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void

const display = ref('0')
const expression = ref('')
const showClearDialog = ref(false)
const history = ref<Array<{
  id: number
  expression: string
  result: string
  created_at: string
}>>([])

const buttons = [
  { label: 'C', value: 'C', type: 'clear', color: 'error', variant: 'tonal' },
  { label: '±', value: '±', type: 'function', color: 'grey', variant: 'tonal' },
  { label: '%', value: '%', type: 'function', color: 'grey', variant: 'tonal' },
  { label: '÷', value: '/', type: 'operator', color: 'primary', variant: 'tonal' },
  { label: '7', value: '7', type: 'number', color: 'grey', variant: 'tonal' },
  { label: '8', value: '8', type: 'number', color: 'grey', variant: 'tonal' },
  { label: '9', value: '9', type: 'number', color: 'grey', variant: 'tonal' },
  { label: '×', value: '*', type: 'operator', color: 'primary', variant: 'tonal' },
  { label: '4', value: '4', type: 'number', color: 'grey', variant: 'tonal' },
  { label: '5', value: '5', type: 'number', color: 'grey', variant: 'tonal' },
  { label: '6', value: '6', type: 'number', color: 'grey', variant: 'tonal' },
  { label: '-', value: '-', type: 'operator', color: 'primary', variant: 'tonal' },
  { label: '1', value: '1', type: 'number', color: 'grey', variant: 'tonal' },
  { label: '2', value: '2', type: 'number', color: 'grey', variant: 'tonal' },
  { label: '3', value: '3', type: 'number', color: 'grey', variant: 'tonal' },
  { label: '+', value: '+', type: 'operator', color: 'primary', variant: 'tonal' },
  { label: '0', value: '0', type: 'number', color: 'grey', variant: 'tonal' },
  { label: '.', value: '.', type: 'number', color: 'grey', variant: 'tonal' },
  { label: '⌫', value: '⌫', type: 'function', color: 'grey', variant: 'tonal' },
  { label: '=', value: '=', type: 'equals', color: 'primary', variant: 'elevated' }
]

function handleButton(btn: any) {
  if (btn.type === 'number') {
    handleNumber(btn.value)
  } else if (btn.type === 'operator') {
    handleOperator(btn.value)
  } else if (btn.type === 'function') {
    handleFunction(btn.value)
  } else if (btn.type === 'equals') {
    calculate()
  } else if (btn.type === 'clear') {
    clear()
  }
}

function handleNumber(value: string) {
  if (display.value === '0' && value !== '.') {
    display.value = value
  } else {
    if (value === '.' && display.value.includes('.')) {
      return
    }
    display.value += value
  }
}

function handleOperator(value: string) {
  if (expression.value && display.value) {
    calculate()
  }
  expression.value = display.value + ' ' + value + ' '
  display.value = '0'
}

function handleFunction(value: string) {
  if (value === '±') {
    if (display.value !== '0') {
      if (display.value.startsWith('-')) {
        display.value = display.value.substring(1)
      } else {
        display.value = '-' + display.value
      }
    }
  } else if (value === '%') {
    display.value = String(parseFloat(display.value) / 100)
  } else if (value === '⌫') {
    if (display.value.length > 1) {
      display.value = display.value.substring(0, display.value.length - 1)
    } else {
      display.value = '0'
    }
  }
}

function calculate() {
  try {
    let fullExpression = expression.value + display.value
    fullExpression = fullExpression.replace(/×/g, '*').replace(/÷/g, '/')

    const result = eval(fullExpression)
    
    if (isNaN(result) || !isFinite(result)) {
      throw new Error('Invalid result')
    }

    const formattedResult = formatNumber(result)
    const finalExpression = expression.value + display.value

    display.value = formattedResult
    expression.value = ''

    saveHistory(finalExpression, formattedResult)
  } catch (error) {
    showSnackbar('计算错误', 'error')
    display.value = 'Error'
    expression.value = ''
  }
}

function formatNumber(num: number): string {
  if (Number.isInteger(num)) {
    return String(num)
  }
  return parseFloat(num.toPrecision(12)).toString()
}

function clear() {
  display.value = '0'
  expression.value = ''
}

async function loadHistory() {
  try {
    const response = await configApi.getCalculatorHistory(50)
    if (response.success) {
      history.value = response.history
    }
  } catch (error) {
    console.error('加载历史记录失败:', error)
  }
}

async function saveHistory(expression: string, result: string) {
  try {
    await configApi.addCalculatorHistory(expression, result)
    await loadHistory()
  } catch (error) {
    console.error('保存历史记录失败:', error)
    showSnackbar('保存历史记录失败', 'error')
  }
}

async function deleteHistoryItem(id: number) {
  try {
    await configApi.deleteCalculatorHistory(id)
    await loadHistory()
    showSnackbar('已删除', 'success')
  } catch (error) {
    console.error('Failed to delete history item:', error)
    showSnackbar('删除失败', 'error')
  }
}

async function clearHistory() {
  try {
    await configApi.clearCalculatorHistory()
    await loadHistory()
    showSnackbar('历史记录已清空', 'success')
  } catch (error) {
    console.error('Failed to clear history:', error)
    showSnackbar('清空失败', 'error')
  }
}

function confirmClear() {
  showClearDialog.value = false
  clearHistory()
}

function copyResult(result: string) {
  navigator.clipboard.writeText(result).then(() => {
    showSnackbar('已复制到剪贴板', 'success')
  }).catch(() => {
    showSnackbar('复制失败', 'error')
  })
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins}分钟前`
  if (diffHours < 24) return `${diffHours}小时前`
  if (diffDays < 7) return `${diffDays}天前`

  return `${date.getMonth() + 1}-${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

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

onMounted(() => {
  loadHistory()
})
</script>

<style scoped lang="scss">
@import './index.scss';
</style>
