<template>
  <v-container fluid class="pa-2 settings-container">
    <v-card class="settings-card" flat>
      <v-card-text class="pt-0">
        <v-form>
          <div class="settings-section">
            <h3 class="settings-section-title text-subtitle-1 mb-1">索引排除规则</h3>
            <p class="text-caption text-grey mb-2">
              支持普通字符串匹配或正则表达式。目录规则匹配目录名，路径模式匹配完整路径。
            </p>

            <!-- 规则列表 -->
            <v-data-table
                :headers="excludeRuleHeaders"
                :items="excludeRules"
                item-value="id"
                density="compact"
                hide-default-footer
                class="mb-4 exclude-rules-table"
            >
              <template v-slot:item.is_enabled="{ item }">
                <v-checkbox
                    :model-value="!!item.is_enabled"
                    @update:model-value="(val) => {
                      item.is_enabled = val ? 1 : 0
                      updateExcludeRule(item)
                    }"
                    density="compact"
                    hide-details
                ></v-checkbox>
              </template>

              <template v-slot:item.rule_type="{ item }">
                <v-chip
                    :color="item.rule_type === 'directory' ? 'primary' : 'secondary'"
                    size="small"
                    density="compact"
                >
                  {{ item.rule_type === 'directory' ? '目录' : '路径模式' }}
                </v-chip>
              </template>

              <template v-slot:item.is_regex="{ item }">
                <v-chip
                    :color="item.is_regex ? 'warning' : 'success'"
                    size="small"
                    density="compact"
                    variant="outlined"
                >
                  {{ item.is_regex ? '正则' : '普通' }}
                </v-chip>
              </template>

              <template v-slot:item.actions="{ item }">
                <v-btn
                    icon="mdi-delete"
                    variant="text"
                    density="compact"
                    color="error"
                    @click="deleteExcludeRule(item.id)"
                ></v-btn>
              </template>
            </v-data-table>

            <!-- 添加新规则 -->
            <v-card variant="outlined" class="pa-3 mb-3">
              <div class="text-subtitle-2 mb-2">添加排除规则</div>
              <v-row dense>
                <v-col cols="3">
                  <v-select
                      v-model="newRule.rule_type"
                      :items="[
                      { title: '目录名', value: 'directory' },
                      { title: '路径模式', value: 'path_pattern' }
                    ]"
                      label="规则类型"
                      density="compact"
                      hide-details
                  ></v-select>
                </v-col>
                <v-col cols="4">
                  <v-text-field
                      v-model="newRule.pattern"
                      label="匹配模式"
                      placeholder="如: node_modules 或 \\.log$"
                      density="compact"
                      hide-details
                  ></v-text-field>
                </v-col>
                <v-col cols="3">
                  <v-text-field
                      v-model="newRule.description"
                      label="描述"
                      placeholder="可选"
                      density="compact"
                      hide-details
                  ></v-text-field>
                </v-col>
                <v-col cols="2">
                  <v-checkbox
                      v-model="newRule.is_regex"
                      label="正则"
                      density="compact"
                      hide-details
                  ></v-checkbox>
                </v-col>
              </v-row>
              <v-row dense class="mt-2">
                <v-col cols="12" class="d-flex align-center">
                  <v-text-field
                      v-model="testPath"
                      label="测试路径（可选）"
                      placeholder="输入路径测试规则是否匹配"
                      density="compact"
                      hide-details
                      class="mr-2"
                  ></v-text-field>
                  <v-btn
                      color="secondary"
                      variant="outlined"
                      density="comfortable"
                      @click="testExcludeRule"
                      :disabled="!newRule.pattern || !testPath"
                  >
                    测试
                  </v-btn>
                  <v-spacer></v-spacer>
                  <v-btn
                      color="primary"
                      variant="elevated"
                      density="comfortable"
                      @click="addExcludeRule"
                      :disabled="!newRule.pattern"
                  >
                    添加规则
                  </v-btn>
                </v-col>
              </v-row>
              <v-row v-if="testResult !== null" dense class="mt-2">
                <v-col cols="12">
                  <v-alert
                      :type="testResult ? 'success' : 'info'"
                      :text="testResult ? '✓ 路径匹配此规则' : '✗ 路径不匹配此规则'"
                      density="compact"
                  ></v-alert>
                </v-col>
              </v-row>
            </v-card>
          </div>

          <v-divider class="my-3"></v-divider>

          <div class="settings-section">
            <h3 class="settings-section-title">定时索引</h3>

            <v-checkbox
                v-model="enableSchedule"
                label="启用定时索引"
                color="primary"
                density="compact"
                hide-details
            ></v-checkbox>

            <v-select
                v-if="enableSchedule"
                v-model="config.indexing.schedule"
                :items="scheduleOptions"
                label="索引时间"
                variant="outlined"
                density="compact"
                class="mt-2"
                hide-details
            ></v-select>
          </div>

          <v-divider class="my-3"></v-divider>

          <div class="settings-section">
            <h3 class="settings-section-title">数据库配置</h3>

            <v-btn
                color="primary"
                variant="outlined"
                prepend-icon="mdi-database-cog"
                @click="showConfigDialog = true"
                density="comfortable"
            >
              修改数据库配置
            </v-btn>
          </div>

          <v-divider class="my-3"></v-divider>

          <div class="settings-section">
            <h3 class="settings-section-title">扫描目录</h3>

            <p class="text-caption text-grey mb-2">
              索引只会扫描这里配置的目录
            </p>

            <div v-if="scanRoots.length" class="d-flex flex-wrap mb-2">
              <v-chip
                  v-for="root in scanRoots"
                  :key="root"
                  closable
                  density="comfortable"
                  color="primary"
                  variant="outlined"
                  class="mr-2 mb-2"
                  @click:close="removeScanRoot(root)"
              >
                {{ root }}
              </v-chip>
            </div>
            <div v-else class="text-caption text-grey mb-2">未配置扫描目录</div>

            <div class="settings-actions">
              <v-btn
                  color="primary"
                  variant="outlined"
                  prepend-icon="mdi-folder-plus"
                  density="comfortable"
                  :loading="scanRootsLoading"
                  :disabled="scanRootsLoading"
                  @click="addScanRoot"
              >
                添加目录
              </v-btn>

              <v-btn
                  color="grey"
                  variant="text"
                  density="comfortable"
                  :disabled="scanRoots.length === 0 || scanRootsLoading"
                  @click="clearScanRoots"
              >
                清空
              </v-btn>
            </div>
          </div>

          <v-divider class="my-3"></v-divider>

          <div class="settings-section">
            <h3 class="settings-section-title">索引操作</h3>

            <div class="settings-actions">
              <v-btn
                  color="primary"
                  variant="elevated"
                  prepend-icon="mdi-refresh"
                  @click="startIndex"
                  :loading="indexing"
                  :disabled="indexing"
              >
                开始索引
              </v-btn>

              <v-btn
                  color="grey"
                  variant="outlined"
                  prepend-icon="mdi-stop"
                  @click="stopIndex"
                  :disabled="!indexing"
                  density="comfortable"
              >
                停止索引
              </v-btn>

              <v-btn
                  color="error"
                  variant="outlined"
                  prepend-icon="mdi-delete-forever"
                  @click="showForceReindexDialog = true"
                  :disabled="indexing"
                  density="comfortable"
              >
                强制重新索引
              </v-btn>
            </div>

            <!-- 索引进度显示 -->
            <v-card v-if="indexProgress.show" class="progress-card" variant="outlined">
              <v-card-text class="py-3">
                <div class="d-flex align-center mb-2">
                  <v-progress-linear
                      v-model="indexProgress.percentage"
                      color="primary"
                      height="16"
                      striped
                      class="flex-grow-1 mr-3"
                  >
                    <template v-slot:default="{ value }">
                      <strong>{{ Math.ceil(value) }}%</strong>
                    </template>
                  </v-progress-linear>
                </div>
                <div class="text-caption">
                  <div>当前文件: {{ indexProgress.currentFile }} / {{ indexProgress.totalFiles }}</div>
                  <div class="text-truncate">正在索引: {{ indexProgress.currentPath }}</div>
                </div>
              </v-card-text>
            </v-card>
          </div>

          <v-divider class="my-3"></v-divider>

          <div class="settings-section">
            <h3 class="settings-section-title">索引信息</h3>

            <v-list density="compact" class="config-list">
              <v-list-item class="config-list-item">
                <v-list-item-title class="text-body-2">上次索引时间</v-list-item-title>
                <v-list-item-subtitle class="text-caption">{{ lastIndexedTime }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item class="config-list-item">
                <v-list-item-title class="text-body-2">索引文件总数</v-list-item-title>
                <v-list-item-subtitle class="text-caption">{{ totalFiles }}</v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </div>

          <v-divider class="my-3"></v-divider>

          <div class="settings-section">
            <h3 class="settings-section-title">文件打开方式配置</h3>

            <v-btn
                color="primary"
                variant="outlined"
                prepend-icon="mdi-file-cog"
                @click="showFileOpenConfigDialog = true"
                density="comfortable"
            >
              配置文件打开方式
            </v-btn>
          </div>
        </v-form>
      </v-card-text>

      <v-card-actions class="pt-0 pb-4">
        <v-spacer></v-spacer>
        <v-btn color="primary" variant="elevated" @click="saveSettings" density="comfortable">
          保存设置
        </v-btn>
      </v-card-actions>
    </v-card>

    <DatabaseConfigDialog v-model="showConfigDialog"/>

    <!-- 强制重新索引确认对话框 -->
    <v-dialog v-model="showForceReindexDialog" max-width="500">
      <v-card>
        <v-card-title class="text-h5 text-error">
          <v-icon icon="mdi-alert" class="mr-2"></v-icon>
          确认强制重新索引？
        </v-card-title>
        <v-card-text>
          <p class="mb-2">此操作将：</p>
          <ul class="ml-4">
            <li>删除所有已索引的文件数据</li>
            <li>删除所有文件内容索引</li>
            <li>重新扫描已配置的扫描目录</li>
          </ul>
          <p class="mt-4 text-warning">此操作不可恢复，确定要继续吗？</p>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey" variant="text" @click="showForceReindexDialog = false">
            取消
          </v-btn>
          <v-btn color="error" variant="elevated" @click="forceReindex">
            确认重新索引
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 文件打开方式配置对话框 -->
    <v-dialog v-model="showFileOpenConfigDialog" :width="DIALOG_WIDTH_MEDIUM">
      <v-card>
        <v-card-title class="text-h5">
          <v-icon icon="mdi-file-cog" class="mr-2"></v-icon>
          文件打开方式配置
        </v-card-title>
        <v-card-text>
          <v-data-table
              :items="fileOpenConfigs"
              :headers="[
              { title: '扩展名', key: 'extension', width: '100px' },
              { title: '打开方式', key: 'open_method', width: '120px' },
              { title: '内部查看器', key: 'internal_viewer', width: '140px' },
              { title: '操作', key: 'actions', width: '400px', sortable: false }
            ]"
              class="file-config-table"
          >
            <template v-slot:item.open_method="{ item }">
              <v-chip
                  :color="item.open_method === 'internal' ? 'primary' : 'grey'"
                  size="small"
              >
                {{ item.open_method === 'internal' ? '内部打开' : '系统默认' }}
              </v-chip>
            </template>
            <template v-slot:item.internal_viewer="{ item }">
              <span v-if="item.open_method === 'internal'">
                {{ getViewerLabel(item.internal_viewer) }}
              </span>
              <span v-else class="text-grey">-</span>
            </template>
            <template v-slot:item.actions="{ item }">
              <div class="d-flex align-center py-2">
                <v-select
                    v-model="item.open_method"
                    :items="openMethodOptions"
                    label="打开方式"
                    variant="outlined"
                    density="comfortable"
                    hide-details
                    class="mr-3"
                    style="width: 160px;"
                    @update:model-value="(val) => updateFileOpenConfig(item, val, item.internal_viewer)"
                ></v-select>
                <v-select
                    v-if="item.open_method === 'internal'"
                    v-model="item.internal_viewer"
                    :items="internalViewerOptions"
                    label="查看器"
                    variant="outlined"
                    density="comfortable"
                    hide-details
                    style="width: 160px;"
                    @update:model-value="(val) => updateFileOpenConfig(item, item.open_method, val)"
                ></v-select>
              </div>
            </template>
          </v-data-table>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey" variant="text" @click="showFileOpenConfigDialog = false">
            关闭
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import {ref, computed, onMounted, onUnmounted, inject, watch} from 'vue'
import {useConfigStore, type Config} from '@/stores/config'
import {DIALOG_WIDTH_MEDIUM} from '@/constants/dialog'
import DatabaseConfigDialog from '@/components/DatabaseConfigDialog/index.vue'

const showSnackbar = inject('showSnackbar') as (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void

const configStore = useConfigStore()
const config = ref<Config>({
  mysql: {
    host: 'localhost',
    port: 3306,
    username: '',
    password: '',
    database: 'file_manager'
  },
  indexing: {
    excludeC: true,
    excludeNodeModules: true,
    lastIndexed: null,
    schedule: '0 2 * * *'
  }
})

const enableSchedule = ref(false)
const showConfigDialog = ref(false)
const showForceReindexDialog = ref(false)
const showFileOpenConfigDialog = ref(false)
const indexing = ref(false)
const totalFiles = ref(0)
const scanRoots = ref<string[]>([])
const scanRootsLoading = ref(false)

/**
 * 文件打开方式配置接口
 */
interface FileOpenConfig {
  extension: string
  open_method: 'internal' | 'system'
  internal_viewer: string | null
}

const fileOpenConfigs = ref<FileOpenConfig[]>([])

const openMethodOptions = [
  {title: '内部打开', value: 'internal'},
  {title: '系统默认', value: 'system'}
]

const internalViewerOptions = [
  {title: '文本编辑器', value: 'editor'},
  {title: '图片查看器', value: 'image'},
  {title: 'PDF查看器', value: 'pdf'},
  {title: 'DOCX查看器', value: 'docx'},
  {title: '媒体播放器', value: 'media'}
]

/**
 * 索引进度
 */
const indexProgress = ref({
  show: false,
  percentage: 0,
  currentFile: 0,
  totalFiles: 0,
  currentPath: ''
})

/**
 * 轮询定时器
 */
let progressInterval: ReturnType<typeof setInterval> | null = null

const scheduleOptions = [
  {title: '每天凌晨 2 点', value: '0 2 * * *'},
  {title: '每天凌晨 3 点', value: '0 3 * * *'},
  {title: '每天凌晨 4 点', value: '0 4 * * *'},
  {title: '每天中午 12 点', value: '0 12 * * *'},
  {title: '每天晚上 8 点', value: '0 20 * * *'}
]

// ==================== 排除规则管理 ====================

interface ExcludeRule {
  id: number
  rule_type: 'directory' | 'path_pattern'
  pattern: string
  description: string
  is_regex: boolean
  is_enabled: boolean
  priority: number
}

const excludeRules = ref<ExcludeRule[]>([])
const excludeRuleHeaders = [
  {title: '启用', key: 'is_enabled', width: '80px'},
  {title: '类型', key: 'rule_type', width: '100px'},
  {title: '模式', key: 'pattern'},
  {title: '描述', key: 'description'},
  {title: '匹配方式', key: 'is_regex', width: '100px'},
  {title: '操作', key: 'actions', width: '80px', sortable: false}
]

const newRule = ref({
  rule_type: 'directory' as 'directory' | 'path_pattern',
  pattern: '',
  description: '',
  is_regex: false
})

const testPath = ref('')
const testResult = ref<boolean | null>(null)

// 加载排除规则
async function loadExcludeRules() {
  try {
    // 检测是否在 Electron 环境
    const isElectron = !!(window as any).electronAPI?.getExcludeRules
    let data

    if (isElectron) {
      data = await window.electronAPI.getExcludeRules()
    } else {
      const response = await fetch('http://localhost:3000/api/config/exclude-rules')
      data = await response.json()
    }

    console.log('[Settings] Loaded exclude rules:', data)
    if (data.success) {
      excludeRules.value = data.rules
      console.log('[Settings] excludeRules updated:', excludeRules.value)
    }
  } catch (error) {
    console.error('Failed to load exclude rules:', error)
    showSnackbar('加载排除规则失败', 'error')
  }
}

// 添加排除规则
async function addExcludeRule() {
  try {
    const isElectron = !!(window as any).electronAPI?.addExcludeRule
    let data

    if (isElectron) {
      data = await window.electronAPI.addExcludeRule(newRule.value)
    } else {
      const response = await fetch('http://localhost:3000/api/config/exclude-rules', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(newRule.value)
      })
      data = await response.json()
    }

    if (data.success) {
      showSnackbar('规则添加成功', 'success')
      newRule.value = {rule_type: 'directory', pattern: '', description: '', is_regex: false}
      testPath.value = ''
      testResult.value = null
      await loadExcludeRules()
    } else {
      showSnackbar(data.error || '添加失败', 'error')
    }
  } catch (error) {
    console.error('Failed to add exclude rule:', error)
    showSnackbar('添加规则失败', 'error')
  }
}

// 更新排除规则
async function updateExcludeRule(rule: ExcludeRule) {
  try {
    const isElectron = !!(window as any).electronAPI?.updateExcludeRule
    let data

    if (isElectron) {
      data = await window.electronAPI.updateExcludeRule(rule.id, {is_enabled: rule.is_enabled})
    } else {
      const response = await fetch(`http://localhost:3000/api/config/exclude-rules/${rule.id}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({is_enabled: rule.is_enabled})
      })
      data = await response.json()
    }

    if (!data.success) {
      showSnackbar(data.error || '更新失败', 'error')
    }
  } catch (error) {
    console.error('Failed to update exclude rule:', error)
    showSnackbar('更新规则失败', 'error')
  }
}

// 删除排除规则
async function deleteExcludeRule(id: number) {
  try {
    const isElectron = !!(window as any).electronAPI?.deleteExcludeRule
    let data

    if (isElectron) {
      data = await window.electronAPI.deleteExcludeRule(id)
    } else {
      const response = await fetch(`http://localhost:3000/api/config/exclude-rules/${id}`, {
        method: 'DELETE'
      })
      data = await response.json()
    }

    if (data.success) {
      showSnackbar('规则删除成功', 'success')
      await loadExcludeRules()
    } else {
      showSnackbar(data.error || '删除失败', 'error')
    }
  } catch (error) {
    console.error('Failed to delete exclude rule:', error)
    showSnackbar('删除规则失败', 'error')
  }
}

// 测试排除规则
async function testExcludeRule() {
  try {
    const response = await fetch('http://localhost:3000/api/config/exclude-rules/test', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        pattern: newRule.value.pattern,
        is_regex: newRule.value.is_regex,
        testPath: testPath.value
      })
    })
    const data = await response.json()
    if (data.success) {
      testResult.value = data.matches
    } else {
      showSnackbar(data.error || '测试失败', 'error')
    }
  } catch (error) {
    console.error('Failed to test exclude rule:', error)
    showSnackbar('测试规则失败', 'error')
  }
}

const lastIndexedTime = computed(() => {
  if (!config.value.indexing.lastIndexed) return '从未索引'
  const date = new Date(config.value.indexing.lastIndexed)
  return date.toLocaleString('zh-CN')
})

onMounted(async () => {
  await configStore.loadConfig()
  if (configStore.config) {
    config.value = {...configStore.config}
    enableSchedule.value = !!config.value.indexing.schedule
  }

  // 启动时检查是否正在索引
  checkIndexingStatus()

  // 获取文件总数
  await loadFileCount()

  // 加载排除规则
  await loadExcludeRules()

  await loadScanRoots()
})

onUnmounted(() => {
  // 清理定时器
  if (progressInterval) {
    clearInterval(progressInterval)
  }
})

/**
 * 检查索引状态
 */
async function checkIndexingStatus() {
  try {
    const progress = await window.electronAPI.getIndexingProgress()
    if (progress.isIndexing) {
      indexing.value = true
      indexProgress.value.show = true
      startProgressPolling()
    }
  } catch (error) {
    console.error('Check indexing status failed:', error)
  }
}

/**
 * 开始轮询进度
 */
function startProgressPolling() {
  if (progressInterval) {
    clearInterval(progressInterval)
  }

  progressInterval = setInterval(async () => {
    try {
      const progress = await window.electronAPI.getIndexingProgress()
      console.log('[Settings] 索引进度:', progress)

      indexProgress.value = {
        show: true,
        percentage: progress.progress * 100,
        currentFile: progress.currentFile,
        totalFiles: progress.totalFiles,
        currentPath: progress.currentPath
      }

      // 如果索引完成或已停止
      if (!progress.isIndexing) {
        stopProgressPolling()
        indexing.value = false

        // 只有在有实际进度时才显示完成提示
        if (progress.totalFiles > 0) {
          indexProgress.value.show = false
          totalFiles.value = progress.totalFiles
          config.value.indexing.lastIndexed = new Date().toISOString()
          await saveSettings()
          showSnackbar(`索引完成！共索引 ${progress.totalFiles} 个文件`, 'success')
        }
      }
    } catch (error) {
      console.error('Poll progress error:', error)
      // 发生错误时停止轮询
      stopProgressPolling()
      indexing.value = false
      showSnackbar('索引进度获取失败', 'error')
    }
  }, 500) // 每 500ms 轮询一次
}

/**
 * 停止轮询
 */
function stopProgressPolling() {
  if (progressInterval) {
    clearInterval(progressInterval)
    progressInterval = null
  }
}

/**
 * 开始索引
 */
async function startIndex() {
  if (scanRoots.value.length === 0) {
    showSnackbar('请先添加扫描目录', 'warning')
    return
  }

  indexing.value = true
  indexProgress.value.show = true
  indexProgress.value.percentage = 0

  try {
    const roots = Array.from(scanRoots.value)
    console.log('[Settings] 开始索引，扫描目录:', roots)
    const result = await window.electronAPI.startIndex(roots)
    if (result && (result as any).success === false) {
      throw new Error((result as any).error || '启动索引失败')
    }

    // 启动轮询
    startProgressPolling()
  } catch (error) {
    console.error('Start index failed:', error)
    indexing.value = false
    indexProgress.value.show = false
    stopProgressPolling()
    showSnackbar('启动索引失败：' + (error as Error).message, 'error')
  }
}

/**
 * 停止索引
 */
async function stopIndex() {
  try {
    await window.electronAPI.stopIndex()
    indexing.value = false
    indexProgress.value.show = false
    stopProgressPolling()
    console.log('[Settings] 索引已停止')
    showSnackbar('索引已停止', 'info')
  } catch (error) {
    console.error('Stop index failed:', error)
    showSnackbar('停止索引失败：' + (error as Error).message, 'error')
  }
}

/**
 * 强制重新索引
 */
async function forceReindex() {
  showForceReindexDialog.value = false

  if (scanRoots.value.length === 0) {
    showSnackbar('请先添加扫描目录', 'warning')
    return
  }

  indexing.value = true
  indexProgress.value.show = true
  indexProgress.value.percentage = 0

  try {
    const roots = Array.from(scanRoots.value)
    console.log('[Settings] 强制重新索引，扫描目录:', roots)

    const isElectron = !!(window as any).electronAPI?.forceReindex
    if (isElectron) {
      const result = await window.electronAPI.forceReindex(roots)
      if (result && (result as any).success === false) {
        throw new Error((result as any).error || '强制重新索引失败')
      }
    } else {
      const response = await fetch('/api/files/force-reindex', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roots })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '强制重新索引失败')
      }
    }

    showSnackbar('强制重新索引已启动，正在清除旧数据...', 'info')

    // 重置 sessionStorage 中的索引完成标记
    sessionStorage.removeItem('hasShownIndexComplete')

    // 启动轮询
    startProgressPolling()
  } catch (error) {
    console.error('Force reindex failed:', error)
    indexing.value = false
    indexProgress.value.show = false
    stopProgressPolling()
    showSnackbar('强制重新索引失败：' + (error as Error).message, 'error')
  }
}

/**
 * 保存设置
 */
async function saveSettings() {
  try {
    if (!enableSchedule.value) {
      config.value.indexing.schedule = ''
    }
    // 转换为普通对象，避免 Vue 响应式代理导致的克隆问题
    const plainConfig = JSON.parse(JSON.stringify(config.value))
    await configStore.saveConfig(plainConfig)
    showSnackbar('设置已保存！', 'success')
  } catch (error) {
    console.error('Save settings failed:', error)
    showSnackbar('保存设置失败：' + (error as Error).message, 'error')
  }
}

async function loadScanRoots() {
  try {
    const isElectron = !!(window as any).electronAPI?.getScanRoots
    if (!isElectron) {
      scanRoots.value = []
      return
    }

    scanRootsLoading.value = true
    const result = await window.electronAPI.getScanRoots()
    if (result && (result as any).success === false) {
      throw new Error((result as any).error || '加载扫描目录失败')
    }
    scanRoots.value = Array.isArray((result as any).roots) ? (result as any).roots : []
  } catch (error) {
    console.error('[Settings] 加载扫描目录失败:', error)
    scanRoots.value = []
  } finally {
    scanRootsLoading.value = false
  }
}

async function saveScanRoots(roots: string[]) {
  const isElectron = !!(window as any).electronAPI?.saveScanRoots
  if (!isElectron) return

  scanRootsLoading.value = true
  try {
    const result = await window.electronAPI.saveScanRoots(roots)
    if (result && (result as any).success === false) {
      throw new Error((result as any).error || '保存扫描目录失败')
    }
    scanRoots.value = roots
    showSnackbar('扫描目录已保存', 'success')
  } catch (error) {
    console.error('[Settings] 保存扫描目录失败:', error)
    showSnackbar('保存扫描目录失败：' + (error as Error).message, 'error')
  } finally {
    scanRootsLoading.value = false
  }
}

async function addScanRoot() {
  const isElectron = !!(window as any).electronAPI?.selectDirectory
  if (!isElectron) return

  const selected = await window.electronAPI.selectDirectory()
  if (!selected) return

  const next = Array.from(new Set([...scanRoots.value, selected].map((x) => x.trim()).filter(Boolean)))
  await saveScanRoots(next)
}

async function removeScanRoot(root: string) {
  const next = scanRoots.value.filter((x) => x !== root)
  await saveScanRoots(next)
}

async function clearScanRoots() {
  await saveScanRoots([])
}

/**
 * 获取文件总数
 */
async function loadFileCount() {
  try {
    const isElectron = !!(window as any).electronAPI?.getFileCounts
    if (isElectron) {
      const counts = await window.electronAPI.getFileCounts()
      totalFiles.value = counts.all || 0
      console.log('[Settings] 文件总数:', totalFiles.value)
      return
    }

    const response = await fetch('/api/files/counts')
    const counts = await response.json()
    totalFiles.value = counts.all || 0
    console.log('[Settings] 文件总数:', totalFiles.value)
  } catch (error) {
    console.error('[Settings] 获取文件总数失败:', error)
  }
}

/**
 * 获取文件打开方式配置列表
 */
async function loadFileOpenConfigs() {
  try {
    const isElectron = !!(window as any).electronAPI?.getFileOpenConfigs
    if (isElectron) {
      const data = await window.electronAPI.getFileOpenConfigs()
      fileOpenConfigs.value = data.configs || []
      console.log('[Settings] 加载文件打开配置:', fileOpenConfigs.value.length)
      return
    }

    const response = await fetch('/api/files/open-configs')
    if (!response.ok) {
      throw new Error('获取文件打开配置失败')
    }
    const data = await response.json()
    fileOpenConfigs.value = data.configs || []
    console.log('[Settings] 加载文件打开配置:', fileOpenConfigs.value.length)
  } catch (error) {
    console.error('[Settings] 获取文件打开配置失败:', error)
  }
}

/**
 * 更新文件打开方式配置
 */
async function updateFileOpenConfig(item: FileOpenConfig, openMethod: string, internalViewer: string | null) {
  try {
    const payload = {
      extension: item.extension.toLowerCase(),
      openMethod: openMethod,
      internalViewer: openMethod === 'internal' ? internalViewer : null
    }

    const isElectron = !!(window as any).electronAPI?.saveFileOpenConfig
    if (isElectron) {
      const result = await window.electronAPI.saveFileOpenConfig(payload)
      if (result && result.success === false) {
        throw new Error(result.error || '更新配置失败')
      }
      showSnackbar('配置已更新', 'success')
      await loadFileOpenConfigs()
      return
    }

    const response = await fetch('/api/files/open-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || '更新配置失败')
    }

    showSnackbar('配置已更新', 'success')
    await loadFileOpenConfigs()
  } catch (error) {
    console.error('[Settings] 更新配置失败:', error)
    showSnackbar('更新配置失败', 'error')
  }
}

/**
 * 获取查看器标签
 */
function getViewerLabel(viewer: string | null): string {
  const option = internalViewerOptions.find(opt => opt.value === viewer)
  return option ? option.title : viewer || '-'
}

/**
 * 监听对话框打开，加载配置
 */
watch(showFileOpenConfigDialog, (newVal) => {
  if (newVal) {
    loadFileOpenConfigs()
  }
})
</script>

<style lang="scss" scoped>
@import './index.scss';
</style>
