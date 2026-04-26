<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="900"
    scrollable
  >
    <v-card>
      <v-card-title class="d-flex align-center pa-4">
        <v-icon start class="mr-2">mdi-text-box-search-outline</v-icon>
        开发环境错误日志
        <v-spacer />
        <v-btn icon variant="text" size="small" @click="loadLogs">
          <v-icon>mdi-refresh</v-icon>
        </v-btn>
        <v-btn
          icon
          variant="text"
          size="small"
          color="error"
          :disabled="total === 0"
          @click="onClearAll"
        >
          <v-icon>mdi-delete-sweep</v-icon>
        </v-btn>
      </v-card-title>

      <v-divider />

      <v-card-text v-if="loading" class="text-center pa-8">
        <v-progress-circular indeterminate color="primary" size="40" />
        <div class="mt-3 text-body-2 text-medium-emphasis">加载中...</div>
      </v-card-text>

      <div v-else-if="logs.length === 0" class="text-center pa-8">
        <v-icon size="48" color="grey-lighten-1">mdi-check-circle-outline</v-icon>
        <div class="mt-3 text-body-1 text-medium-emphasis">暂无错误日志</div>
      </div>

      <v-card-text v-else class="pa-0">
        <v-table density="compact" class="log-table">
          <thead>
            <tr>
              <th style="width: 60px">状态</th>
              <th style="width: 70px">方法</th>
              <th>URL</th>
              <th style="width: 170px">时间</th>
              <th style="width: 50px"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="log in logs"
              :key="log.id"
              class="log-row"
              :class="{ 'is-expanded': expandedId === log.id }"
              @click="toggleExpand(log.id)"
            >
              <td>
                <v-chip
                  :color="getStatusColor(log.response_status)"
                  size="x-small"
                  label
                >
                  {{ log.response_status }}
                </v-chip>
              </td>
              <td>
                <span class="font-weight-medium">{{ log.method }}</span>
              </td>
              <td class="log-url">
                {{ truncateUrl(log.url, 60) }}
              </td>
              <td class="text-caption text-medium-emphasis">
                {{ formatTime(log.created_at) }}
              </td>
              <td>
                <v-btn
                  icon
                  variant="text"
                  size="x-small"
                  :ripple="false"
                >
                  <v-icon size="16">
                    {{ expandedId === log.id ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
                  </v-icon>
                </v-btn>
              </td>
            </tr>
            <tr v-if="expandedId === getExpandedLog()?.id" class="expand-row">
              <td colspan="5">
                <div class="expand-content">
                  <div class="expand-section">
                    <div class="expand-label">请求 URL</div>
                    <pre class="expand-value">{{ getExpandedLog()?.url }}</pre>
                  </div>
                  <div v-if="getExpandedLog()?.request_body" class="expand-section">
                    <div class="expand-label">请求体</div>
                    <pre class="expand-value">{{ formatJson(getExpandedLog()!.request_body) }}</pre>
                  </div>
                  <div v-if="getExpandedLog()?.response_body" class="expand-section">
                    <div class="expand-label">响应体</div>
                    <pre class="expand-value response-body">{{ formatJson(getExpandedLog()!.response_body) }}</pre>
                  </div>
                  <div v-if="getExpandedLog()?.error_message" class="expand-section">
                    <div class="expand-label">错误信息</div>
                    <pre class="expand-value error-msg">{{ getExpandedLog()?.error_message }}</pre>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>

      <v-divider v-if="logs.length > 0" />

      <v-card-actions v-if="totalPages > 1" class="pa-3 justify-center">
        <v-pagination
          v-model="currentPage"
          :length="totalPages"
          :total-visible="7"
          density="comfortable"
          @update:model-value="onPageChange"
        />
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { httpRequest } from '@/api/client'

interface ErrorLog {
  id: number
  url: string
  method: string
  request_params: string | null
  request_body: string | null
  response_status: number
  response_body: string | null
  error_message: string | null
  created_at: string
}

interface LogResult {
  logs: ErrorLog[]
  total: number
  totalPages: number
  currentPage: number
}

const props = defineProps<{
  modelValue: boolean
}>()

defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const PAGE_SIZE = 15

const loading = ref(false)
const logs = ref<ErrorLog[]>([])
const total = ref(0)
const totalPages = ref(0)
const currentPage = ref(1)
const expandedId = ref<number | null>(null)

watch(() => props.modelValue, (val) => {
  if (val) {
    loadLogs()
  }
})

async function loadLogs() {
  loading.value = true
  try {
    const result = await httpRequest<LogResult>('/api/dev-error-logs', {
      params: { page: currentPage.value, pageSize: PAGE_SIZE }
    })
    logs.value = result.logs || []
    total.value = result.total || 0
    totalPages.value = result.totalPages || 0
  } catch {
    logs.value = []
    total.value = 0
    totalPages.value = 0
  } finally {
    loading.value = false
  }
}

function onPageChange(page: number) {
  currentPage.value = page
  expandedId.value = null
  loadLogs()
}

function toggleExpand(id: number) {
  expandedId.value = expandedId.value === id ? null : id
}

function getExpandedLog(): ErrorLog | undefined {
  return logs.value.find((l) => l.id === expandedId.value)
}

async function onClearAll() {
  try {
    await httpRequest('/api/dev-error-logs', { method: 'DELETE' })
    logs.value = []
    total.value = 0
    totalPages.value = 0
    expandedId.value = null
  } catch {
    /** 静默处理 */
  }
}

function getStatusColor(status: number): string {
  if (status >= 500) return 'error'
  if (status >= 400) return 'warning'
  return undefined
}

function formatTime(timeStr: string): string {
  if (!timeStr) return ''
  const d = new Date(timeStr)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function truncateUrl(url: string, maxLen: number): string {
  if (!url) return ''
  if (url.length <= maxLen) return url
  return url.substring(0, maxLen) + '...'
}

function formatJson(str: string): string {
  if (!str) return ''
  try {
    return JSON.stringify(JSON.parse(str), null, 2)
  } catch {
    return str
  }
}
</script>

<style scoped lang="scss" src="./index.scss"></style>
