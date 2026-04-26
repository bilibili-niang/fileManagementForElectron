<template>
  <div class="api-docs">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <v-btn
          color="primary"
          variant="elevated"
          prepend-icon="mdi-upload"
          @click="showImportDialog = true"
        >
          导入文档
        </v-btn>
      </div>

      <div class="toolbar-center">
        <v-text-field
          v-model="searchQuery"
          prepend-inner-icon="mdi-magnify"
          label="搜索 API"
          placeholder="搜索所有服务..."
          variant="outlined"
          density="compact"
          hide-details
          clearable
          class="search-input"
          :disabled="docList.length === 0"
          @click:clear="searchQuery = ''"
        ></v-text-field>
      </div>

      <div class="toolbar-right">
        <v-btn
          icon="mdi-web"
          variant="text"
          size="small"
          @click="showBaseUrlDialog = true"
          title="设置 Base URL"
        ></v-btn>
      </div>
    </div>

    <!-- 服务 Tab 栏 -->
    <div class="service-tabs-wrapper" v-if="docList.length > 0">
      <v-tabs v-model="activeService" color="primary" density="compact" show-arrows>
        <v-tab
          v-for="doc in docList"
          :key="doc.id"
          :value="doc.id"
          size="small"
          class="service-tab"
        >
          {{ doc.name }}
          <v-btn
            icon="mdi-close-circle"
            variant="text"
            size="x-small"
            class="ml-1"
            @click.stop="confirmDelete(doc)"
          ></v-btn>
        </v-tab>
      </v-tabs>
    </div>

    <!-- 文档内容区域 -->
    <div class="docs-content" v-if="currentDocData">
      <v-card class="docs-info-card" elevation="0">
        <v-card-title class="d-flex align-center">
          <v-icon icon="mdi-api" class="mr-2" color="primary"></v-icon>
          {{ currentDocData.openapiDoc.info?.title || 'API 文档' }}
          <v-chip size="small" class="ml-2" variant="tonal">{{ currentDocData.openapiDoc.info?.version }}</v-chip>
        </v-card-title>
        <v-card-text v-if="currentDocData.openapiDoc.info?.description">
          {{ currentDocData.openapiDoc.info.description }}
        </v-card-text>
      </v-card>

      <!-- 标签分组 -->
      <div class="tag-row">
        <v-tabs v-model="activeTag" color="primary" density="compact" class="tag-tabs">
          <v-tab value="all" size="small">全部</v-tab>
          <v-tab v-for="tag in currentDocData.tags" :key="tag" :value="tag" size="small">
            {{ tag }}
          </v-tab>
        </v-tabs>
        <div v-if="searchQuery" class="search-results-count">
          找到 <strong>{{ currentApiCount }}</strong> 个匹配结果
        </div>
      </div>

      <!-- API 列表 -->
      <div class="api-list">
        <v-expansion-panels v-model="expandedApis" multiple>
          <v-expansion-panel
            v-for="(methods, path) in filteredApis"
            :key="path"
            :value="path"
          >
            <v-expansion-panel-title>
              <div class="api-header">
                <div class="method-badges">
                  <v-chip
                    v-for="method in Object.keys(methods)"
                    :key="method"
                    :color="getMethodColor(method)"
                    size="small"
                    variant="flat"
                    class="method-chip mr-1"
                  >
                    {{ method.toUpperCase() }}
                  </v-chip>
                </div>
                <span class="api-path ml-2">{{ path }}</span>
              </div>
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <div v-for="(api, method) in methods" :key="method" class="api-method-block">
                <div class="api-summary mb-2" v-if="api.summary">
                  <strong>{{ api.summary }}</strong>
                  <v-chip :color="getMethodColor(method)" size="x-small" variant="tonal" class="ml-2">
                    {{ method.toUpperCase() }}
                  </v-chip>
                </div>
                <div class="api-description text-body-2 text-grey mb-3" v-if="api.description">
                  {{ api.description }}
                </div>

                <!-- 操作按钮 -->
                <div class="api-actions mb-3">
                  <v-btn
                    size="x-small"
                    variant="tonal"
                    prepend-icon="mdi-code-braces"
                    @click="copyCurl(path, method, api)"
                    class="mr-2"
                  >
                    cURL
                  </v-btn>
                  <v-btn
                    size="x-small"
                    variant="tonal"
                    prepend-icon="mdi-link-variant"
                    @click="copyFullUrl(path)"
                    class="mr-2"
                  >
                    复制 URL
                  </v-btn>
                  <v-btn
                    size="x-small"
                    variant="tonal"
                    prepend-icon="mdi-path"
                    @click="copyPath(path)"
                  >
                    复制路径
                  </v-btn>
                </div>

                <!-- 参数 -->
                <div v-if="api.parameters?.length" class="api-params mb-3">
                  <div class="text-subtitle-2 mb-1">参数</div>
                  <v-table density="compact" class="params-table">
                    <thead>
                      <tr>
                        <th>名称</th>
                        <th>位置</th>
                        <th>类型</th>
                        <th>必填</th>
                        <th>说明</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="param in api.parameters" :key="param.name">
                        <td><code>{{ param.name }}</code></td>
                        <td>
                          <v-chip size="x-small" variant="outlined">{{ param.in }}</v-chip>
                        </td>
                        <td><code>{{ param.schema?.type || 'string' }}</code></td>
                        <td>
                          <v-icon
                            :icon="param.required ? 'mdi-check' : 'mdi-close'"
                            :color="param.required ? 'success' : 'grey'"
                            size="small"
                          ></v-icon>
                        </td>
                        <td>{{ param.description || '-' }}</td>
                      </tr>
                    </tbody>
                  </v-table>
                </div>

                <!-- 请求体 -->
                <div v-if="api.requestBody" class="api-request-body mb-3">
                  <div class="text-subtitle-2 mb-1">请求体</div>
                  <code class="request-body-schema">{{ formatJson(api.requestBody) }}</code>
                </div>

                <!-- 响应 -->
                <div v-if="api.responses" class="api-responses">
                  <div class="text-subtitle-2 mb-1">响应</div>
                  <div v-for="(response, code) in api.responses" :key="code" class="response-item mb-2">
                    <v-chip
                      :color="getResponseColor(code)"
                      size="x-small"
                      variant="flat"
                      class="mr-2"
                    >
                      {{ code }}
                    </v-chip>
                    <span class="text-body-2">{{ response.description || '-' }}</span>
                  </div>
                </div>

                <v-divider v-if="Object.keys(methods).length > 1" class="my-3" />
              </div>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-state">
      <v-icon icon="mdi-api" size="80" color="primary" class="mb-4"></v-icon>
      <h3 class="text-h6 mb-2">暂无 API 文档</h3>
      <p class="text-body-2 text-grey mb-4">导入 OpenAPI JSON 文档开始使用</p>
      <v-btn color="primary" variant="elevated" @click="showImportDialog = true">
        <v-icon icon="mdi-upload" class="mr-2"></v-icon>
        导入文档
      </v-btn>
    </div>

    <!-- 导入对话框 -->
    <v-dialog v-model="showImportDialog" max-width="500">
      <v-card>
        <v-card-title>导入 API 文档</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="importFormData.name"
            label="服务名称"
            placeholder="例如：级联服务"
            variant="outlined"
            density="compact"
            class="mb-4"
          ></v-text-field>

          <div class="file-upload mb-4">
            <v-btn
              color="primary"
              variant="outlined"
              prepend-icon="mdi-file-upload"
              @click="triggerFileInput"
            >
              选择 JSON 文件
            </v-btn>
            <input
              ref="fileInputRef"
              type="file"
              accept=".json"
              style="display: none"
              @change="handleFileChange"
            />
            <span v-if="selectedFileName" class="ml-3 text-body-2">{{ selectedFileName }}</span>
          </div>

          <v-alert
            v-if="filePreview"
            type="info"
            variant="tonal"
            density="compact"
            class="mt-2"
          >
            <div class="text-subtitle-2">{{ filePreview.title }}</div>
            <div class="text-caption">版本: {{ filePreview.version }}</div>
            <div class="text-caption">接口数量: {{ filePreview.pathCount }}</div>
          </v-alert>

          <v-alert
            v-if="importError"
            type="error"
            variant="tonal"
            density="compact"
            class="mt-2"
            closable
            @click:close="importError = ''"
          >
            {{ importError }}
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="closeImportDialog">取消</v-btn>
          <v-btn
            color="primary"
            variant="elevated"
            :disabled="!canImport"
            :loading="isImporting"
            @click="handleImport"
          >
            导入
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Base URL 配置对话框 -->
    <v-dialog v-model="showBaseUrlDialog" max-width="400">
      <v-card>
        <v-card-title>设置 Base URL</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="baseUrl"
            label="Base URL"
            placeholder="http://localhost:8080"
            variant="outlined"
            density="compact"
            hint="用于生成完整 URL 和 cURL 命令"
            persistent-hint
          ></v-text-field>
          <div v-if="currentDocData?.baseUrl" class="text-caption text-grey mt-2">
            文档中定义: {{ currentDocData.baseUrl }}
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showBaseUrlDialog = false">关闭</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 删除确认对话框 -->
    <v-dialog v-model="showDeleteDialog" max-width="320">
      <v-card>
        <v-card-title class="text-body-1 pa-4">确认删除</v-card-title>
        <v-card-text class="pa-0 px-4 pb-4">
          确定要删除「{{ deleteTarget?.name }}」吗？此操作无法撤销。
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showDeleteDialog = false">取消</v-btn>
          <v-btn color="error" variant="elevated" @click="handleDelete">删除</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, inject } from 'vue'
import { configApi } from '@/api'

const showSnackbar = inject('showSnackbar') as (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void

// 文档列表
const docList = ref<Array<{
  id: number
  name: string
  source_file: string
  created_at: string
  updated_at: string
}>>([])

// 所有已加载的文档数据 { id: docData }
const allDocs = ref<Record<number, {
  openapiDoc: any
  baseUrl: string
  tags: string[]
}>>({})

// 当前选中的服务
const activeService = ref<number | null>(null)
const activeTag = ref('all')
const expandedApis = ref<string[]>([])
const showImportDialog = ref(false)
const showDeleteDialog = ref(false)
const deleteTarget = ref<any>(null)
const isImporting = ref(false)
const importError = ref('')
const baseUrl = ref('')
const showBaseUrlDialog = ref(false)
const searchQuery = ref('')

// 文件输入
const fileInputRef = ref<HTMLInputElement | null>(null)
const selectedFileName = ref('')

// 导入表单
const importFormData = ref({
  name: ''
})
const parsedJsonData = ref<string | null>(null)
const filePreview = ref<{
  title: string
  version: string
  pathCount: number
} | null>(null)

// 计算是否可以导入
const canImport = computed(() => {
  return importFormData.value.name.trim() && parsedJsonData.value
})

// 当前服务的数据
const currentDocData = computed(() => {
  if (!activeService.value) return null
  return allDocs.value[activeService.value] || null
})

// 当前服务的标签列表
const tags = computed(() => {
  return currentDocData.value?.tags || []
})

// 当前服务的搜索结果数量
const currentApiCount = computed(() => {
  let count = 0
  Object.values(filteredApis.value).forEach((methods: any) => {
    count += Object.keys(methods).length
  })
  return count
})

// 按标签筛选 API
const filteredApis = computed(() => {
  if (!currentDocData.value?.openapiDoc?.paths) {
    return {}
  }

  const paths = currentDocData.value.openapiDoc.paths
  const query = searchQuery.value?.toLowerCase().trim()
  const isTagFilter = activeTag.value && activeTag.value !== 'all'

  const result: Record<string, any> = {}
  Object.entries(paths).forEach(([path, pathMethods]: [string, any]) => {
    Object.entries(pathMethods).forEach(([method, details]: [string, any]) => {
      // 标签过滤
      if (isTagFilter && !details.tags?.includes(activeTag.value)) {
        return
      }

      // 搜索过滤
      if (query) {
        const pathMatch = path.toLowerCase().includes(query)
        const summaryMatch = details.summary?.toLowerCase().includes(query)
        const descMatch = details.description?.toLowerCase().includes(query)
        const paramMatch = details.parameters?.some((p: any) =>
          p.name?.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query)
        )

        if (!pathMatch && !summaryMatch && !descMatch && !paramMatch) {
          return
        }
      }

      if (!result[path]) result[path] = {}
      result[path][method] = { ...details, method }
    })
  })
  return result
})

// 监听搜索，自动展开所有结果
watch(searchQuery, (query) => {
  if (query && query.trim()) {
    expandedApis.value = Object.keys(filteredApis.value)
  } else {
    expandedApis.value = Object.keys(filteredApis.value).slice(0, 1)
  }
})

// 监听服务切换
watch(activeService, (newId) => {
  if (newId) {
    activeTag.value = 'all'
    // 切换到新服务的 baseUrl
    if (allDocs.value[newId]?.baseUrl) {
      baseUrl.value = allDocs.value[newId].baseUrl
    }
    // 展开匹配搜索的第一个 API 或默认展开第一个
    setTimeout(() => {
      if (searchQuery.value?.trim()) {
        expandedApis.value = Object.keys(filteredApis.value)
      } else {
        const firstPath = Object.keys(filteredApis.value)[0]
        expandedApis.value = firstPath ? [firstPath] : []
      }
    }, 0)
  }
})

// 解析 API 列表
function parseApis(paths: Record<string, any>) {
  const result: Record<string, any> = {}
  Object.entries(paths).forEach(([path, pathMethods]: [string, any]) => {
    Object.entries(pathMethods).forEach(([method, details]: [string, any]) => {
      if (!result[path]) result[path] = {}
      result[path][method] = { ...details, method }
    })
  })
  return result
}

// 获取方法颜色
function getMethodColor(method: string) {
  const colors: Record<string, string> = {
    get: 'success',
    post: 'primary',
    put: 'warning',
    delete: 'error',
    patch: 'info'
  }
  return colors[method.toLowerCase()] || 'grey'
}

// 获取响应颜色
function getResponseColor(code: string) {
  if (code.startsWith('2')) return 'success'
  if (code.startsWith('4')) return 'warning'
  if (code.startsWith('5')) return 'error'
  return 'grey'
}

// 格式化 JSON
function formatJson(obj: any) {
  try {
    return JSON.stringify(obj, null, 2)
  } catch {
    return String(obj)
  }
}

// 复制路径
async function copyPath(path: string) {
  try {
    await navigator.clipboard.writeText(path)
    showSnackbar('路径已复制', 'success')
  } catch {
    showSnackbar('复制失败', 'error')
  }
}

// 复制完整 URL
async function copyFullUrl(path: string) {
  const url = `${baseUrl.value}${path}`
  try {
    await navigator.clipboard.writeText(url)
    showSnackbar('URL 已复制', 'success')
  } catch {
    showSnackbar('复制失败', 'error')
  }
}

// 生成 cURL 命令
function generateCurl(path: string, method: string, api: any): string {
  const url = `${baseUrl.value}${path}`
  const queryParams = api.parameters
    ?.filter((p: any) => p.in === 'query')
    .map((p: any) => `${p.name}=${p.schema?.example ?? `{${p.name}}`}`)
    ?? []

  let curl = `curl -X ${method.toUpperCase()} "${url}${queryParams.length ? '?' + queryParams.join('&') : ''}"`

  // Header
  const contentType = api.requestBody ? ' -H "Content-Type: application/json"' : ''
  curl += contentType

  // Body
  if (api.requestBody?.content?.['application/json']?.example) {
    const body = JSON.stringify(api.requestBody.content['application/json'].example, null, 2)
    curl += ` \\\n  -d '${body}'`
  } else if (['post', 'put', 'patch'].includes(method.toLowerCase())) {
    curl += ` \\\n  -d '{}'`
  }

  return curl
}

// 复制 cURL
async function copyCurl(path: string, method: string, api: any) {
  const curl = generateCurl(path, method, api)
  try {
    await navigator.clipboard.writeText(curl)
    showSnackbar('cURL 已复制', 'success')
  } catch {
    showSnackbar('复制失败', 'error')
  }
}

// 解析文档获取标签
function parseTags(openapiDoc: any): string[] {
  const tagSet = new Set<string>()
  Object.values(openapiDoc.paths || {}).forEach((pathMethods: any) => {
    Object.values(pathMethods).forEach((method: any) => {
      if (method.tags?.length) {
        method.tags.forEach((tag: string) => tagSet.add(tag))
      }
    })
  })
  return Array.from(tagSet)
}

// 加载文档列表
async function loadDocList() {
  try {
    const response = await configApi.getApiDocs()
    if (response.success) {
      const docs = response.docs || []
      docList.value = docs

      // 加载所有文档详情
      for (const doc of docs) {
        if (!allDocs.value[doc.id]) {
          await loadDocDetail(doc.id)
        }
      }

      // 默认选中第一个服务
      if (docs.length > 0 && !activeService.value) {
        activeService.value = docs[0].id
      }
    }
  } catch (error) {
    console.error('加载文档列表失败:', error)
  }
}

// 加载单个文档详情
async function loadDocDetail(id: number) {
  try {
    const response = await configApi.getApiDocById(id)
    if (response.success && response.doc) {
      const openapiDoc = JSON.parse(response.doc.openapi_data)
      const baseUrlVal = openapiDoc?.servers?.length ? openapiDoc.servers[0] : ''

      allDocs.value[id] = {
        openapiDoc,
        baseUrl: baseUrlVal,
        tags: parseTags(openapiDoc)
      }

      // 如果当前没有 baseUrl，设置默认的
      if (!baseUrl.value && baseUrlVal) {
        baseUrl.value = baseUrlVal
      }
    }
  } catch (error) {
    console.error('加载文档详情失败:', error)
  }
}

// 触发文件选择
function triggerFileInput() {
  fileInputRef.value?.click()
}

// 处理文件变化
function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) return

  importError.value = ''
  filePreview.value = null
  parsedJsonData.value = null
  selectedFileName.value = file.name

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const content = e.target?.result as string
      const json = JSON.parse(content)

      if (!json.openapi && !json.swagger) {
        importError.value = '无效的 OpenAPI 文档格式'
        return
      }

      parsedJsonData.value = content

      const paths = json.paths || {}
      filePreview.value = {
        title: json.info?.title || '未命名',
        version: json.info?.version || '未知版本',
        pathCount: Object.keys(paths).length
      }

      if (!importFormData.value.name && json.info?.title) {
        importFormData.value.name = json.info.title
      }
    } catch {
      importError.value = 'JSON 解析失败'
    }
  }
  reader.readAsText(file)
}

// 导入文档
async function handleImport() {
  if (!parsedJsonData.value || !importFormData.value.name) return

  isImporting.value = true
  importError.value = ''

  try {
    await configApi.addApiDoc({
      name: importFormData.value.name,
      source_file: selectedFileName.value,
      openapi_data: parsedJsonData.value
    })

    showSnackbar('导入成功', 'success')
    closeImportDialog()
    await loadDocList()

    const newDoc = docList.value.find(d => d.name === importFormData.value.name)
    if (newDoc) {
      activeService.value = newDoc.id
    }
  } catch (error) {
    console.error('导入失败:', error)
    showSnackbar('导入失败', 'error')
  } finally {
    isImporting.value = false
  }
}

// 关闭导入对话框
function closeImportDialog() {
  showImportDialog.value = false
  importFormData.value.name = ''
  selectedFileName.value = ''
  parsedJsonData.value = null
  filePreview.value = null
  importError.value = ''
  if (fileInputRef.value) fileInputRef.value.value = ''
}

// 确认删除
function confirmDelete(doc: any) {
  deleteTarget.value = doc
  showDeleteDialog.value = true
}

// 删除文档
async function handleDelete() {
  if (!deleteTarget.value) return

  try {
    await configApi.deleteApiDoc(deleteTarget.value.id)
    showSnackbar('已删除', 'success')

    const deletedId = deleteTarget.value.id
    delete allDocs.value[deletedId]

    if (activeService.value === deletedId) {
      activeService.value = docList.value.length > 0 ? docList.value[0].id : null
    }

    await loadDocList()
  } catch (error) {
    console.error('删除失败:', error)
    showSnackbar('删除失败', 'error')
  } finally {
    showDeleteDialog.value = false
    deleteTarget.value = null
  }
}

// 页面加载
onMounted(async () => {
  await loadDocList()
})
</script>

<style scoped lang="scss">
.api-docs {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  padding: 0;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  background: rgba(var(--v-theme-surface), 0.8);
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  flex-shrink: 0;

  &-left { flex-shrink: 0; }
  &-center {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
  }
  &-right { flex-shrink: 0; }
}

.search-input { min-width: 200px; }

.service-tabs-wrapper {
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(var(--v-theme-surface), 0.5);
  padding: 0 16px;
}

.service-tab {
  text-transform: none !important;
}

.tag-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;

  .tag-tabs { flex: 1; }
}

.search-results-count {
  font-size: 0.85rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
  white-space: nowrap;

  strong {
    color: rgb(var(--v-theme-primary));
  }
}

.docs-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
}

.docs-info-card {
  border: 1px solid rgba(0, 0, 0, 0.08);
  margin-bottom: 16px;
}

.api-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.api-header {
  display: flex;
  align-items: center;
}

.api-path {
  font-family: 'Roboto Mono', monospace;
  font-size: 0.9rem;
}

.method-chip {
  min-width: 50px;
  justify-content: center;
}

.api-detail {
  padding: 8px 0;
}

.params-table {
  font-size: 0.85rem;

  th, td {
    padding: 4px 8px !important;
  }
}

.request-body-schema {
  display: block;
  padding: 8px;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 4px;
  font-size: 0.8rem;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 200px;
  overflow-y: auto;
}

.response-item {
  display: flex;
  align-items: center;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 40px;
}

.api-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.api-method-block {
  padding-top: 8px;
}
</style>
