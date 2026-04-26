<template>
  <v-container class="pa-4">
    <v-card title="端口占用管理" subtitle="查询并结束占用指定端口的进程">
      <v-card-text>
        <v-row>
          <v-col cols="12" md="8">
            <v-text-field
              v-model="portInput"
              label="端口号或端口范围"
              placeholder="例如: 3000 或 3000-3010"
              variant="outlined"
              density="compact"
              hint="支持单个端口(如 3000)或端口范围(如 3000-3010)"
              persistent-hint
            />
          </v-col>
          <v-col cols="12" md="4" class="d-flex align-center">
            <v-btn
              color="primary"
              :loading="loading"
              :disabled="!portInput.trim()"
              @click="scanPorts"
              block
            >
              <v-icon start>mdi-magnify</v-icon>
              扫描端口
            </v-btn>
          </v-col>
        </v-row>

        <!-- 扫描结果 -->
        <v-expand-transition>
          <div v-if="scanResults.length > 0" class="mt-4">
            <v-alert
              type="info"
              variant="tonal"
              class="mb-3"
            >
              找到 {{ scanResults.length }} 个占用端口的进程
            </v-alert>

            <v-table density="compact" class="elevation-1">
              <thead>
                <tr>
                  <th>端口</th>
                  <th>PID</th>
                  <th>进程名称</th>
                  <th>协议</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in scanResults" :key="item.port + item.pid">
                  <td>
                    <v-chip size="small" color="primary" variant="flat">
                      {{ item.port }}
                    </v-chip>
                  </td>
                  <td>{{ item.pid }}</td>
                  <td>
                    <v-tooltip :text="item.processName" location="top">
                      <template v-slot:activator="{ props }">
                        <span v-bind="props" class="text-truncate" style="max-width: 200px; display: inline-block;">
                          {{ item.processName }}
                        </span>
                      </template>
                    </v-tooltip>
                  </td>
                  <td>{{ item.protocol }}</td>
                  <td>
                    <v-chip size="x-small" :color="item.state === 'LISTENING' ? 'success' : 'warning'" variant="flat">
                      {{ item.state }}
                    </v-chip>
                  </td>
                  <td>
                    <v-btn
                      size="small"
                      color="error"
                      variant="tonal"
                      :loading="killingPid === item.pid"
                      @click="killProcess(item.pid)"
                    >
                      <v-icon start size="small">mdi-kill</v-icon>
                      结束
                    </v-btn>
                  </td>
                </tr>
              </tbody>
            </v-table>
          </div>
        </v-expand-transition>

        <!-- 无结果提示 -->
        <v-expand-transition>
          <v-alert
            v-if="scanned && scanResults.length === 0 && !loading"
            type="success"
            variant="tonal"
            class="mt-4"
          >
            指定端口范围内没有发现被占用的端口
          </v-alert>
        </v-expand-transition>

        <!-- 历史记录 -->
        <div class="mt-6">
          <div class="d-flex align-center justify-space-between mb-2">
            <span class="text-subtitle-2">操作历史</span>
            <v-btn
              size="small"
              variant="text"
              :disabled="killHistory.length === 0"
              @click="clearHistory"
            >
              清空
            </v-btn>
          </div>
          <v-list density="compact" v-if="killHistory.length > 0" class="elevation-1">
            <v-list-item
              v-for="(item, index) in killHistory"
              :key="index"
            >
              <template v-slot:prepend>
                <v-icon color="success">mdi-check-circle</v-icon>
              </template>
              <v-list-item-title>
                已结束端口 {{ item.port }} 的进程 (PID: {{ item.pid }}, {{ item.processName }})
              </v-list-item-title>
              <v-list-item-subtitle>
                {{ item.time }}
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>
          <div v-else class="elevation-1 pa-4 text-center text-grey">
            暂无操作记录
          </div>
        </div>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface PortInfo {
  port: number
  pid: number
  processName: string
  protocol: string
  state: string
}

interface KillHistoryItem {
  port: number
  pid: number
  processName: string
  time: string
}

const portInput = ref('')
const loading = ref(false)
const scanned = ref(false)
const scanResults = ref<PortInfo[]>([])
const killingPid = ref<number | null>(null)
const killHistory = ref<KillHistoryItem[]>([])

// 解析端口输入
function parsePorts(input: string): number[] {
  const ports: number[] = []
  const trimmed = input.trim()

  // 检查是否是范围 (如 3000-3010)
  if (trimmed.includes('-')) {
    const parts = trimmed.split('-')
    if (parts.length === 2) {
      const start = parseInt(parts[0], 10)
      const end = parseInt(parts[1], 10)
      if (!isNaN(start) && !isNaN(end) && start <= end && start > 0 && end <= 65535) {
        for (let i = start; i <= end; i++) {
          ports.push(i)
        }
      }
    }
  } else {
    // 单个端口
    const port = parseInt(trimmed, 10)
    if (!isNaN(port) && port > 0 && port <= 65535) {
      ports.push(port)
    }
  }

  return ports
}

// 扫描端口
async function scanPorts() {
  const ports = parsePorts(portInput.value)
  if (ports.length === 0) {
    return
  }

  loading.value = true
  scanned.value = false
  scanResults.value = []

  try {
    const result = await window.electronAPI.scanPorts(ports)
    if (result && result.success) {
      scanResults.value = result.ports || []
    }
  } catch (error) {
    console.error('Scan ports error:', error)
  } finally {
    loading.value = false
    scanned.value = true
  }
}

// 结束进程
async function killProcess(pid: number) {
  if (killingPid.value !== null) return

  killingPid.value = pid
  try {
    const result = await window.electronAPI.killProcess(pid)
    if (result && result.success) {
      // 从结果中移除
      const killedItem = scanResults.value.find(p => p.pid === pid)
      if (killedItem) {
        killHistory.value.unshift({
          port: killedItem.port,
          pid: killedItem.pid,
          processName: killedItem.processName,
          time: new Date().toLocaleString()
        })
      }
      scanResults.value = scanResults.value.filter(p => p.pid !== pid)

      // 显示成功提示
      showSnackbar(`已结束进程 (PID: ${pid})`, 'success')
    }
  } catch (error) {
    console.error('Kill process error:', error)
    showSnackbar('结束进程失败', 'error')
  } finally {
    killingPid.value = null
  }
}

// 清空历史
function clearHistory() {
  killHistory.value = []
}

// 注入 showSnackbar
const showSnackbar = inject('showSnackbar') as (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void
</script>

<script lang="ts">
import { inject } from 'vue'
export default {
  name: 'PortKiller'
}
</script>