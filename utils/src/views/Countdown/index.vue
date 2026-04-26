<template>
  <v-container fluid class="countdown-container">
    <v-card class="countdown-card" flat>
      <v-card-text>
        <!-- 倒计时列表 -->
        <div class="countdown-list">
          <div class="d-flex justify-space-between align-center mb-4">
            <h3 class="section-title text-h6 mb-0">我的倒计时</h3>
            <div class="d-flex align-center gap-2">
              <v-chip color="primary" variant="text" size="small" class="mr-2">
                {{ countdowns.length }} 个倒计时
              </v-chip>
              <v-btn
                color="primary"
                variant="elevated"
                prepend-icon="mdi-plus"
                @click="openAddDialog"
                density="comfortable"
                size="small"
              >
                新建倒计时
              </v-btn>
            </div>
          </div>
          
          <div v-if="countdowns.length === 0" class="text-center text-grey py-8">
            <v-icon icon="mdi-timer-outline" size="64" class="mb-4"></v-icon>
            <p class="text-body-1">暂无倒计时，请添加第一个倒计时</p>
          </div>

          <v-row v-else dense>
            <v-col
              v-for="countdown in sortedCountdowns"
              :key="countdown.id"
              cols="12"
              sm="6"
              md="4"
              lg="3"
            >
              <v-card
                class="countdown-item"
                variant="outlined"
                :color="getCountdownColor(countdown)"
                :class="{ 'is-expired': countdown.remaining < 0 }"
              >
                <v-card-text class="pa-4">
                  <div class="d-flex justify-space-between align-start mb-2">
                    <div class="countdown-title text-subtitle-1 font-weight-bold">
                      {{ countdown.title }}
                    </div>
                    <div class="countdown-actions">
                      <v-btn
                        icon="mdi-pencil"
                        variant="text"
                        density="compact"
                        color="primary"
                        size="small"
                        class="action-btn edit-btn"
                        @click="openEditDialog(countdown)"
                      ></v-btn>
                      <v-btn
                        icon="mdi-delete"
                        variant="text"
                        density="compact"
                        color="error"
                        size="small"
                        class="action-btn delete-btn"
                        @click="openDeleteDialog(countdown.id)"
                      ></v-btn>
                      <v-btn
                        icon="mdi-dots-vertical"
                        variant="text"
                        density="compact"
                        color="grey"
                        size="small"
                        class="menu-btn"
                      ></v-btn>
                    </div>
                  </div>

                  <!-- 重复类型标签 -->
                  <v-chip 
                    v-if="countdown.repeat && countdown.repeat !== 'none'" 
                    size="x-small" 
                    color="primary" 
                    variant="tonal"
                    class="mb-2"
                  >
                    <v-icon start size="x-small" icon="mdi-refresh"></v-icon>
                    {{ getRepeatLabel(countdown.repeat) }}
                  </v-chip>

                  <div class="countdown-display text-center py-4">
                    <div
                      v-if="countdown.remaining !== null"
                      class="remaining-text"
                      :class="{ 'is-negative': countdown.remaining < 0 }"
                    >
                      <template v-if="countdown.remaining >= 0">
                        <span class="text-caption d-block mb-1">距离还有</span>
                        <template v-if="countdown.time">
                          <div class="time-display">
                            <span class="time-value">{{ countdown.remainingHours }}</span>
                            <span class="time-unit">时</span>
                            <span class="time-value">{{ countdown.remainingMinutes }}</span>
                            <span class="time-unit">分</span>
                            <span class="time-value">{{ countdown.remainingSeconds }}</span>
                            <span class="time-unit">秒</span>
                          </div>
                        </template>
                        <template v-else>
                          <span class="text-h3 font-weight-bold">{{ countdown.remaining }}</span>
                          <span class="text-caption d-block mt-1">天</span>
                        </template>
                      </template>
                      <template v-else>
                        <span class="text-caption d-block mb-1">已过去</span>
                        <template v-if="countdown.time">
                          <div class="time-display">
                            <span class="time-value">{{ Math.abs(countdown.remainingHours) }}</span>
                            <span class="time-unit">时</span>
                            <span class="time-value">{{ Math.abs(countdown.remainingMinutes) }}</span>
                            <span class="time-unit">分</span>
                            <span class="time-value">{{ Math.abs(countdown.remainingSeconds) }}</span>
                            <span class="time-unit">秒</span>
                          </div>
                        </template>
                        <template v-else>
                          <span class="text-h3 font-weight-bold">{{ Math.abs(countdown.remaining) }}</span>
                          <span class="text-caption d-block mt-1">天</span>
                        </template>
                      </template>
                    </div>
                  </div>

                  <div class="countdown-info text-caption text-grey mt-2">
                    <div v-if="countdown.date" class="d-flex align-center mb-1">
                      <v-icon icon="mdi-calendar" size="x-small" class="mr-1"></v-icon>
                      <span>{{ countdown.date }}</span>
                    </div>
                    <div v-if="countdown.time" class="d-flex align-center">
                      <v-icon icon="mdi-clock" size="x-small" class="mr-1"></v-icon>
                      <span>{{ countdown.time }}</span>
                    </div>
                    <div class="d-flex align-center mt-2" v-if="countdown.nextOccurrence">
                      <v-icon icon="mdi-information" size="x-small" class="mr-1"></v-icon>
                      <span>下次：{{ countdown.nextOccurrence }}</span>
                    </div>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </div>
      </v-card-text>
    </v-card>

    <!-- 添加/编辑倒计时对话框 -->
    <v-dialog v-model="formDialog.show" max-width="500px">
      <v-card>
        <v-card-title class="text-h6 pa-4">
          {{ formDialog.isEdit ? '编辑倒计时' : '新建倒计时' }}
        </v-card-title>
        <v-card-text class="pa-4">
          <v-form v-if="formData">
            <v-text-field
              v-model="formData.title"
              label="倒计时标题"
              placeholder="例如：春节、生日、会议等"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-tag"
              clearable
            ></v-text-field>

            <div class="text-subtitle-2 mb-2">倒计时类型</div>
            <v-radio-group v-model="formData.type" row density="compact">
              <v-radio label="日期" value="date"></v-radio>
              <v-radio label="时间" value="time"></v-radio>
            </v-radio-group>

            <v-text-field
              v-if="formData.type === 'date'"
              v-model="formData.date"
              type="date"
              label="目标日期"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-calendar"
            ></v-text-field>

            <v-text-field
              v-if="formData.type === 'time'"
              v-model="formData.time"
              type="time"
              label="目标时间 (24 小时制)"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-clock"
            ></v-text-field>

            <div class="text-subtitle-2 mb-2">重复提醒</div>
            <v-select
              v-model="formData.repeat"
              :items="formRepeatOptions"
              label="选择重复方式"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-refresh"
            ></v-select>
          </v-form>
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer></v-spacer>
          <v-btn
            color="grey"
            variant="text"
            @click="formDialog.show = false"
          >
            取消
          </v-btn>
          <v-btn
            color="primary"
            variant="elevated"
            @click="saveForm"
            :disabled="!canSaveForm"
          >
            {{ formDialog.isEdit ? '保存' : '添加' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 删除确认对话框 -->
    <v-dialog v-model="deleteDialog.show" max-width="400px">
      <v-card>
        <v-card-title class="text-h6 pa-4">
          <v-icon icon="mdi-alert-circle" color="warning" class="mr-2"></v-icon>
          确认删除
        </v-card-title>
        <v-card-text class="pa-4">
          确定要删除倒计时 "{{ deleteDialog.title }}" 吗？此操作无法撤销。
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer></v-spacer>
          <v-btn
            color="grey"
            variant="text"
            @click="deleteDialog.show = false"
          >
            取消
          </v-btn>
          <v-btn
            color="error"
            variant="elevated"
            @click="confirmDelete"
          >
            删除
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { configApi } from '@/api/modules/config'
import './index.sass'

interface CountdownItem {
  id: number
  title: string
  date: string | null
  time: string | null
  repeat: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'
  remaining: number | null
  remainingHours: number | null
  remainingMinutes: number | null
  remainingSeconds: number | null
  nextOccurrence?: string
}

const countdowns = ref<CountdownItem[]>([])
const timerInterval = ref<number | null>(null)

/**
 * 表单对话框状态
 */
const formDialog = ref({
  show: false,
  isEdit: false,
  editId: null as number | null
})

/**
 * 删除确认对话框状态
 */
const deleteDialog = ref({
  show: false,
  id: null as number | null,
  title: ''
})

/**
 * 表单数据
 */
const formData = ref({
  title: '',
  type: 'date' as 'date' | 'time',
  date: '',
  time: '',
  repeat: 'none' as 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'
})

/**
 * 按提醒时间排序的倒计时列表
 * 提醒时间最近的排在前面
 */
const sortedCountdowns = computed(() => {
  return [...countdowns.value].sort((a, b) => {
    // 如果remaining为null，放到最后
    if (a.remaining === null) return 1
    if (b.remaining === null) return -1

    // 时间类型的倒计时使用remainingHours排序
    const aValue = a.time ? (a.remainingHours ?? Infinity) : a.remaining
    const bValue = b.time ? (b.remainingHours ?? Infinity) : b.remaining

    return aValue - bValue
  })
})

const allRepeatOptions = [
  { value: 'none', title: '不重复' },
  { value: 'daily', title: '每天' },
  { value: 'weekly', title: '每周' },
  { value: 'monthly', title: '每月' },
  { value: 'yearly', title: '每年' }
]

/**
 * 表单模式下根据倒计时类型获取可用的重复选项
 */
const formRepeatOptions = computed(() => {
  if (formData.value.type === 'date') {
    return allRepeatOptions.filter(opt => opt.value === 'none' || opt.value === 'monthly' || opt.value === 'yearly')
  }
  return allRepeatOptions
})

/**
 * 验证表单是否可以保存
 */
const canSaveForm = computed(() => {
  if (!formData.value.title.trim()) return false
  if (formData.value.type === 'date') {
    return !!formData.value.date
  } else {
    return !!formData.value.time
  }
})

function openDeleteDialog(id: number) {
  const countdown = countdowns.value.find(c => c.id === id)
  if (countdown) {
    deleteDialog.value.id = id
    deleteDialog.value.title = countdown.title
    deleteDialog.value.show = true
  }
}

async function confirmDelete() {
  if (deleteDialog.value.id !== null) {
    try {
      await configApi.deleteCountdown(deleteDialog.value.id)
      const index = countdowns.value.findIndex(c => c.id === deleteDialog.value.id)
      if (index !== -1) {
        countdowns.value.splice(index, 1)
      }
    } catch (error) {
      console.error('删除倒计时失败:', error)
    }
    deleteDialog.value.show = false
    deleteDialog.value.id = null
    deleteDialog.value.title = ''
  }
}

async function deleteCountdown(id: number) {
  try {
    await configApi.deleteCountdown(id)
    const index = countdowns.value.findIndex(c => c.id === id)
    if (index !== -1) {
      countdowns.value.splice(index, 1)
    }
  } catch (error) {
    console.error('删除倒计时失败:', error)
  }
}

/**
 * 打开添加对话框
 */
function openAddDialog() {
  formDialog.value.isEdit = false
  formDialog.value.editId = null
  formData.value = {
    title: '',
    type: 'date',
    date: '',
    time: '',
    repeat: 'none'
  }
  formDialog.value.show = true
}

/**
 * 打开编辑对话框
 */
function openEditDialog(countdown: CountdownItem) {
  formDialog.value.isEdit = true
  formDialog.value.editId = countdown.id
  // 将 ISO 日期转换为 YYYY-MM-DD 格式
  let dateValue = ''
  if (countdown.date) {
    const dateObj = new Date(countdown.date)
    if (!isNaN(dateObj.getTime())) {
      dateValue = dateObj.toISOString().split('T')[0]
    }
  }
  formData.value = {
    title: countdown.title,
    type: countdown.date ? 'date' : 'time',
    date: dateValue,
    time: countdown.time || '',
    repeat: countdown.repeat
  }
  formDialog.value.show = true
}

/**
 * 保存表单（添加或编辑）
 */
async function saveForm() {
  if (!canSaveForm.value) return

  if (formDialog.value.isEdit && formDialog.value.editId) {
    // 编辑模式
    try {
      await configApi.updateCountdown(formDialog.value.editId, {
        title: formData.value.title.trim(),
        date: formData.value.type === 'date' ? formData.value.date : null,
        time: formData.value.type === 'time' ? formData.value.time : null,
        repeat: formData.value.repeat
      })
      const index = countdowns.value.findIndex(c => c.id === formDialog.value.editId)
      if (index !== -1) {
        countdowns.value[index] = {
          ...countdowns.value[index],
          title: formData.value.title.trim(),
          date: formData.value.type === 'date' ? formData.value.date : null,
          time: formData.value.type === 'time' ? formData.value.time : null,
          repeat: formData.value.repeat
        }
        updateCountdownDetails(countdowns.value[index])
      }
    } catch (error) {
      console.error('更新倒计时失败:', error)
    }
  } else {
    // 添加模式
    try {
      const result = await configApi.addCountdown({
        title: formData.value.title.trim(),
        date: formData.value.type === 'date' ? formData.value.date : null,
        time: formData.value.type === 'time' ? formData.value.time : null,
        repeat: formData.value.repeat
      })
      const countdown: CountdownItem = {
        id: result.id,
        title: formData.value.title.trim(),
        date: formData.value.type === 'date' ? formData.value.date : null,
        time: formData.value.type === 'time' ? formData.value.time : null,
        repeat: formData.value.repeat,
        remaining: null,
        remainingHours: null,
        remainingMinutes: null,
        remainingSeconds: null,
        nextOccurrence: undefined
      }
      countdowns.value.push(countdown)
      updateCountdownDetails(countdown)
    } catch (error) {
      console.error('添加倒计时失败:', error)
    }
  }

  formDialog.value.show = false
}

function getRepeatLabel(repeat: string): string {
  const option = allRepeatOptions.find(opt => opt.value === repeat)
  return option ? option.title : repeat
}

function calculateNextOccurrence(countdown: CountdownItem): { days: number, hours: number, minutes: number, seconds: number, dateString: string } {
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  if (!countdown.date && !countdown.time) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, dateString: '' }
  }

  let target: Date

  if (countdown.date) {
    // 只有日期
    target = new Date(countdown.date)
    target.setHours(0, 0, 0, 0)
  } else {
    // 只有时间
    const [hours, minutes] = countdown.time!.split(':').map(Number)
    target = new Date()
    target.setHours(hours, minutes, 0, 0)
    
    if (target.getTime() < now.getTime()) {
      target.setDate(target.getDate() + 1)
    }
  }

  // 根据重复类型调整目标日期
  if (countdown.repeat !== 'none') {
    while (target.getTime() <= now.getTime()) {
      switch (countdown.repeat) {
        case 'daily':
          target.setDate(target.getDate() + 1)
          break
        case 'weekly':
          target.setDate(target.getDate() + 7)
          break
        case 'monthly':
          target.setMonth(target.getMonth() + 1)
          break
        case 'yearly':
          target.setFullYear(target.getFullYear() + 1)
          break
      }
    }
  }

  const diffMs = target.getTime() - now.getTime()
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  
  // 计算精确的时间差
  const currentNow = new Date()
  const targetTime = new Date(target)
  const exactDiffMs = targetTime.getTime() - currentNow.getTime()
  
  // 计算小时、分钟、秒
  const hours = Math.floor(exactDiffMs / (1000 * 60 * 60))
  const minutes = Math.floor((exactDiffMs % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((exactDiffMs % (1000 * 60)) / 1000)
  
  // 格式化下次发生的时间
  const month = String(target.getMonth() + 1).padStart(2, '0')
  const day = String(target.getDate()).padStart(2, '0')
  const hoursStr = String(target.getHours()).padStart(2, '0')
  const minutesStr = String(target.getMinutes()).padStart(2, '0')
  
  let dateString = `${month}-${day}`
  if (countdown.time) {
    dateString += ` ${hoursStr}:${minutesStr}`
  }

  return { days, hours, minutes, seconds, dateString }
}

function updateCountdownDetails(countdown: CountdownItem) {
  const { days, hours, minutes, seconds, dateString } = calculateNextOccurrence(countdown)
  countdown.remaining = days
  countdown.remainingHours = hours
  countdown.remainingMinutes = minutes
  countdown.remainingSeconds = seconds
  countdown.nextOccurrence = dateString
}

function updateAllCountdowns() {
  countdowns.value.forEach(countdown => {
    updateCountdownDetails(countdown)
  })
}

function getCountdownColor(countdown: CountdownItem): string {
  if (countdown.remaining === null) return 'grey'
  if (countdown.remaining < 0) return 'error'
  if (countdown.remaining <= 3) return 'warning'
  if (countdown.remaining <= 7) return 'orange'
  return 'primary'
}

async function saveCountdowns() {
  try {
    const saved = localStorage.getItem('countdowns')
    if (saved) {
      const data = JSON.parse(saved)
      for (const item of data) {
        try {
          await configApi.addCountdown({
            title: item.title,
            date: item.date,
            time: item.time,
            repeat: item.repeat
          })
        } catch (error) {
          console.error('迁移倒计时失败:', error)
        }
      }
      localStorage.removeItem('countdowns')
    }
  } catch (error) {
    console.error('保存倒计时失败:', error)
  }
}

async function loadCountdowns() {
  try {
    const result = await configApi.getCountdowns()
    if (result.success && result.countdowns) {
      countdowns.value = result.countdowns.map(item => ({
        ...item,
        remaining: null,
        remainingHours: null,
        remainingMinutes: null,
        remainingSeconds: null,
        nextOccurrence: undefined
      }))
      updateAllCountdowns()
    }
  } catch (error) {
    console.error('加载倒计时失败:', error)
  }
}

onMounted(() => {
  loadCountdowns()

  // 每秒更新一次倒计时
  timerInterval.value = window.setInterval(() => {
    updateAllCountdowns()
  }, 1000)
})

onUnmounted(() => {
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
  }
})

watch(() => formData.value.type, (newType) => {
  if (newType === 'date') {
    formData.value.time = ''
  } else {
    formData.value.date = ''
  }
})
</script>
