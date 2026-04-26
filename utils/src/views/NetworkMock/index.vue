<template>
  <div class="network-mock">
    <v-card class="mock-card" elevation="2">
      <v-card-text class="pa-4">
        <!-- 服务地址 - 简洁显示 -->
        <div class="server-address mb-4" @click="copyServerAddress" title="点击复制服务地址">
          <v-icon icon="mdi-server" size="18" class="mr-2" color="primary"></v-icon>
          <span class="address-text">{{ serverAddress }}</span>
          <v-icon icon="mdi-content-copy" size="16" class="ml-2 copy-icon" color="on-surface-variant"></v-icon>
        </div>

        <v-divider class="mb-4"></v-divider>

        <!-- 添加路由 -->
        <div class="mb-4">
          <div class="text-subtitle-2 mb-2">添加模拟路由</div>
          <v-row>
            <v-col cols="12" sm="4">
              <v-text-field
                v-model="newRoute.path"
                label="路由路径"
                placeholder="/api/test"
                variant="outlined"
                density="compact"
                hide-details
              ></v-text-field>
            </v-col>
            <v-col cols="12" sm="3">
              <v-select
                v-model="newRoute.method"
                label="请求方式"
                :items="httpMethods"
                variant="outlined"
                density="compact"
                hide-details
              ></v-select>
            </v-col>
            <v-col cols="12" sm="5">
              <v-btn
                color="primary"
                variant="elevated"
                @click="addRoute"
                :disabled="!newRoute.path"
              >
                <v-icon icon="mdi-plus" class="mr-1"></v-icon>
                添加路由
              </v-btn>
            </v-col>
          </v-row>
        </div>

        <!-- 返回数据 -->
        <div class="mb-4">
          <v-textarea
            v-model="newRoute.response"
            label="返回数据 (JSON格式)"
            placeholder='{"code": 200, "data": "success"}'
            variant="outlined"
            density="compact"
            rows="4"
            hide-details
          ></v-textarea>
        </div>

        <v-divider class="mb-4"></v-divider>

        <!-- 路由列表 -->
        <div class="text-subtitle-2 mb-2">已配置路由</div>
        <v-list v-if="routes.length > 0" density="compact">
          <v-list-item
            v-for="(route, index) in routes"
            :key="index"
            class="route-item"
          >
            <!-- 操作按钮 - 绝对定位在右上角 -->
            <div class="route-actions">
              <v-btn
                icon="mdi-pencil"
                size="small"
                variant="text"
                color="primary"
                @click="openEditDialog(index)"
                title="编辑"
              ></v-btn>
              <v-btn
                icon="mdi-code-json"
                size="small"
                variant="text"
                color="primary"
                @click="toggleExpand(index)"
                :title="expandedIndex === index ? '收起' : '展开'"
              ></v-btn>
              <v-btn
                icon="mdi-delete"
                size="small"
                variant="text"
                color="error"
                @click="removeRoute(index)"
              ></v-btn>
            </div>

            <template v-slot:prepend>
              <v-chip
                size="small"
                :color="getMethodColor(route.method)"
                class="mr-2"
              >
                {{ route.method }}
              </v-chip>
            </template>
            <v-list-item-title
              class="route-path"
              @click="copyRoute(route)"
              title="点击复制完整URL"
            >
              {{ route.path }}
            </v-list-item-title>

            <!-- 展开的响应数据 -->
            <v-expand-transition>
              <v-card
                v-if="expandedIndex === index"
                class="route-response-card mt-2"
                elevation="2"
              >
                <v-card-text class="pa-3">
                  <div class="response-header">
                    <span class="text-caption text-grey">响应数据:</span>
                    <v-btn
                      icon="mdi-content-copy"
                      size="small"
                      variant="text"
                      density="compact"
                      @click="copyResponse(route.response)"
                      title="复制响应数据"
                    ></v-btn>
                  </div>
                  <pre class="response-content">{{ route.response }}</pre>
                </v-card-text>
              </v-card>
            </v-expand-transition>
          </v-list-item>
        </v-list>
        <v-alert
          v-else
          type="info"
          variant="tonal"
          density="compact"
        >
          暂无配置的路由
        </v-alert>
      </v-card-text>
    </v-card>

    <!-- 复制成功提示 -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="2000"
      location="top center"
      position="fixed"
      style="top: 50px; z-index: 9999;"
    >
      {{ snackbar.message }}
    </v-snackbar>

    <!-- 编辑路由对话框 -->
    <v-dialog v-model="editDialog.show" max-width="600" persistent>
      <v-card>
        <v-card-title>编辑路由</v-card-title>
        <v-card-text>
          <v-row class="mt-2">
            <v-col cols="12" sm="4">
              <v-select
                v-model="editDialog.method"
                label="请求方式"
                :items="httpMethods"
                variant="outlined"
                density="compact"
                hide-details
              ></v-select>
            </v-col>
            <v-col cols="12" sm="8">
              <v-text-field
                v-model="editDialog.path"
                label="路由路径"
                placeholder="/api/test"
                variant="outlined"
                density="compact"
                hide-details
              ></v-text-field>
            </v-col>
          </v-row>
          <v-textarea
            v-model="editDialog.response"
            label="返回数据 (JSON格式)"
            placeholder='{"code": 200, "data": "success"}'
            variant="outlined"
            density="compact"
            rows="6"
            class="mt-4"
            :error-messages="editDialog.responseError"
          ></v-textarea>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="closeEditDialog">取消</v-btn>
          <v-btn color="primary" variant="elevated" @click="saveEdit" :loading="editDialog.saving">
            保存
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import {ref, onMounted, computed} from 'vue'

/**
 * HTTP请求方法列表
 */
const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']

/**
 * 服务信息
 */
const serverInfo = ref({
  host: 'localhost',
  port: '3000'
})

/**
 * 本机 IPv4 地址
 */
const localIp = ref('localhost')

/**
 * 服务地址显示文本
 */
const serverAddress = computed(() => {
  return `${localIp.value}:${serverInfo.value.port}`
})

/**
 * 新路由配置
 */
const newRoute = ref({
  path: '',
  method: 'GET',
  response: ''
})

/**
 * 已配置路由列表
 */
const routes = ref<Array<{
  path: string
  method: string
  response: string
}>>([])

/**
 * 当前展开的路由索引
 */
const expandedIndex = ref<number | null>(null)

/**
 * 提示框状态
 */
const snackbar = ref({
  show: false,
  message: '',
  color: 'success'
})

/**
 * 编辑对话框状态
 */
const editDialog = ref({
  show: false,
  index: -1,
  method: '',
  path: '',
  response: '',
  saving: false,
  responseError: ''
})

/**
 * 显示提示
 * @param message - 提示消息
 * @param color - 提示颜色
 */
function showSnackbar(message: string, color: string = 'success'): void {
  snackbar.value.message = message
  snackbar.value.color = color
  snackbar.value.show = true
}

/**
 * 获取请求方法对应的颜色
 * @param method - HTTP请求方法
 * @returns 颜色名称
 */
function getMethodColor(method: string): string {
  const colorMap: Record<string, string> = {
    'GET': 'success',
    'POST': 'primary',
    'PUT': 'warning',
    'DELETE': 'error',
    'PATCH': 'info'
  }
  return colorMap[method] || 'grey'
}

/**
 * 从后端加载路由列表
 */
async function loadRoutes(): Promise<void> {
  try {
    const response = await fetch('/api/mock/routes')
    const result = await response.json()

    if (result.success && result.routes) {
      routes.value = result.routes.map((route: any) => ({
        path: route.path,
        method: route.method,
        response: JSON.stringify(route.response, null, 2)
      }))
    }
  } catch (error) {
    console.error('加载路由列表失败:', error)
  }
}

/**
 * 切换展开状态
 * @param index - 路由索引
 */
function toggleExpand(index: number): void {
  expandedIndex.value = expandedIndex.value === index ? null : index
}

/**
 * 复制文本到剪贴板(兼容性处理)
 * @param text - 要复制的文本
 * @returns 是否复制成功
 */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
    // 降级方案:使用 textarea
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.left = '-999999px'
    textarea.style.top = '-999999px'
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()
    const result = document.execCommand('copy')
    document.body.removeChild(textarea)
    return result
  } catch (error) {
    console.error('复制失败:', error)
    return false
  }
}

/**
 * 复制服务地址
 */
async function copyServerAddress(): Promise<void> {
  const success = await copyToClipboard(serverAddress.value)
  if (success) {
    showSnackbar('服务地址已复制到剪贴板')
  } else {
    showSnackbar('复制失败', 'error')
  }
}

/**
 * 复制路由完整URL
 * @param route - 路由对象
 */
async function copyRoute(route: { path: string; method: string }): Promise<void> {
  const fullUrl = `http://${localIp.value}:${serverInfo.value.port}${route.path}`
  const success = await copyToClipboard(fullUrl)
  if (success) {
    showSnackbar('URL已复制到剪贴板')
  } else {
    showSnackbar('复制失败', 'error')
  }
}

/**
 * 复制响应数据
 * @param response - 响应数据
 */
async function copyResponse(response: string): Promise<void> {
  const success = await copyToClipboard(response)
  if (success) {
    showSnackbar('响应数据已复制到剪贴板')
  } else {
    showSnackbar('复制失败', 'error')
  }
}

/**
 * 添加路由
 */
async function addRoute(): Promise<void> {
  if (!newRoute.value.path) {
    return
  }

  try {
    let responseData = null
    if (newRoute.value.response) {
      try {
        responseData = JSON.parse(newRoute.value.response)
      } catch {
        responseData = newRoute.value.response
      }
    }

    const response = await fetch('/api/mock/routes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        method: newRoute.value.method,
        path: newRoute.value.path,
        response: responseData
      })
    })

    const result = await response.json()

    if (result.success) {
      routes.value.push({
        path: newRoute.value.path,
        method: newRoute.value.method,
        response: newRoute.value.response
      })

      // 重置表单
      newRoute.value.path = ''
      newRoute.value.response = ''
    }
  } catch (error) {
    console.error('添加路由失败:', error)
  }
}

/**
 * 移除路由
 * @param index - 路由索引
 */
async function removeRoute(index: number): Promise<void> {
  const route = routes.value[index]

  try {
    const response = await fetch('/api/mock/routes', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        method: route.method,
        path: route.path
      })
    })

    const result = await response.json()

    if (result.success) {
      routes.value.splice(index, 1)
    }
  } catch (error) {
    console.error('删除路由失败:', error)
  }
}

/**
 * 打开编辑对话框
 * @param index - 路由索引
 */
function openEditDialog(index: number): void {
  const route = routes.value[index]
  editDialog.value = {
    show: true,
    index,
    method: route.method,
    path: route.path,
    response: route.response,
    saving: false,
    responseError: ''
  }
}

/**
 * 关闭编辑对话框
 */
function closeEditDialog(): void {
  editDialog.value.show = false
  editDialog.value.responseError = ''
}

/**
 * 保存编辑
 */
async function saveEdit(): Promise<void> {
  if (!editDialog.value.path) {
    return
  }

  // 验证 JSON 格式
  if (editDialog.value.response) {
    try {
      JSON.parse(editDialog.value.response)
      editDialog.value.responseError = ''
    } catch {
      editDialog.value.responseError = 'JSON 格式错误'
      return
    }
  }

  editDialog.value.saving = true

  try {
    let responseData = null
    if (editDialog.value.response) {
      try {
        responseData = JSON.parse(editDialog.value.response)
      } catch {
        responseData = editDialog.value.response
      }
    }

    const route = routes.value[editDialog.value.index]
    const response = await fetch('/api/mock/routes', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        oldMethod: route.method,
        oldPath: route.path,
        method: editDialog.value.method,
        path: editDialog.value.path,
        response: responseData
      })
    })

    const result = await response.json()

    if (result.success) {
      // 更新本地数据
      routes.value[editDialog.value.index] = {
        method: editDialog.value.method,
        path: editDialog.value.path,
        response: editDialog.value.response
      }
      closeEditDialog()
      showSnackbar('路由已更新')
    } else {
      showSnackbar(result.message || '更新失败', 'error')
    }
  } catch (error) {
    console.error('更新路由失败:', error)
    showSnackbar('更新失败', 'error')
  } finally {
    editDialog.value.saving = false
  }
}

/**
 * 获取本机 IPv4 地址
 */
async function getLocalIp(): Promise<string> {
  try {
    // 尝试通过后端 API 获取本机 IP
    const response = await fetch('/api/health')
    if (response.ok) {
      const data = await response.json()
      if (data.ip) {
        return data.ip
      }
    }
  } catch (error) {
    console.log('通过 API 获取 IP 失败,尝试其他方式')
  }

  // 尝试通过 WebRTC 获取本地 IP
  try {
    const pc = new RTCPeerConnection({iceServers: []})
    pc.createDataChannel('')
    await pc.createOffer().then((o) => pc.setLocalDescription(o))
    await new Promise<void>((resolve) => {
      pc.onicecandidate = (ice) => {
        if (!ice || !ice.candidate || !ice.candidate.candidate) {
          resolve()
          return
        }
        const ipMatch = /([0-9]{1,3}\.){3}[0-9]{1,3}/.exec(ice.candidate.candidate)
        if (ipMatch && ipMatch[0] !== '127.0.0.1') {
          localIp.value = ipMatch[0]
        }
        resolve()
      }
      // 超时处理
      setTimeout(resolve, 1000)
    })
    pc.close()
  } catch (error) {
    console.log('WebRTC 获取 IP 失败')
  }

  // 如果都没获取到,使用 window.location.hostname
  return window.location.hostname || 'localhost'
}

/**
 * 加载服务信息
 */
async function loadServerInfo(): Promise<void> {
  try {
    const response = await fetch('/api/health')
    if (response.ok) {
      localIp.value = await getLocalIp()
      serverInfo.value.port = '3000'
    }
  } catch (error) {
    console.error('获取服务信息失败:', error)
    localIp.value = window.location.hostname || 'localhost'
  }
}

onMounted(() => {
  loadServerInfo()
  loadRoutes()
})
</script>

<style scoped lang="scss">
@import './index.scss';
</style>
