<template>
  <v-dialog
    :model-value="modelValue"
    max-width="450"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon icon="mdi-upload" class="mr-2" color="primary"></v-icon>
        <span>正在上传</span>
        <span
          v-if="totalCount > 1"
          class="text-caption text-grey ml-2"
        >
          ({{ currentIndex + 1 }} / {{ totalCount }})
        </span>
      </v-card-title>
      <v-card-text class="pt-4">
        <!-- 当前文件名 -->
        <div class="d-flex align-center mb-3">
          <v-icon icon="mdi-file" class="mr-2" color="grey"></v-icon>
          <span class="text-body-2 text-truncate">{{ fileName }}</span>
        </div>

        <!-- 当前文件进度 -->
        <v-progress-linear
          :model-value="progress"
          color="primary"
          height="20"
          striped
          rounded
        >
          <template #default="{ value }">
            <span class="text-white text-caption">{{ Math.ceil(value) }}%</span>
          </template>
        </v-progress-linear>

        <!-- 当前文件信息 -->
        <div class="d-flex justify-space-between mt-2 text-caption text-grey">
          <span>{{ formatFileSize(uploadedBytes) }} / {{ formatFileSize(totalBytes) }}</span>
          <span v-if="speed > 0">{{ speed }} MB/s</span>
        </div>

        <!-- 多文件上传时显示总体进度 -->
        <template v-if="totalCount > 1">
          <v-divider class="my-3"></v-divider>

          <div class="d-flex align-center mb-2">
            <v-icon icon="mdi-folder-multiple" class="mr-2" color="grey" size="small"></v-icon>
            <span class="text-caption text-grey">总体进度</span>
          </div>
          <v-progress-linear
            :model-value="overallProgress"
            color="success"
            height="12"
            rounded
          >
            <template #default="{ value }">
              <span class="text-white text-caption" style="font-size: 10px;">{{ Math.ceil(value) }}%</span>
            </template>
          </v-progress-linear>

          <div class="d-flex justify-space-between mt-2 text-caption text-grey">
            <span>已完成: {{ currentIndex }} / {{ totalCount }} 个文件</span>
            <span v-if="remainingTime > 0">剩余: {{ formatRemainingTime(remainingTime) }}</span>
          </div>
        </template>
      </v-card-text>
      <v-card-actions class="justify-end">
        <v-btn
          color="error"
          variant="text"
          :disabled="progress >= 100 && currentIndex >= totalCount - 1"
          @click="handleCancel"
        >
          取消上传
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { formatFileSize, formatRemainingTime } from '@/utils'

interface Props {
  modelValue: boolean
  fileName: string
  progress: number
  uploadedBytes: number
  totalBytes: number
  speed: number
  currentIndex: number
  totalCount: number
  overallProgress: number
  remainingTime: number
}

withDefaults(defineProps<Props>(), {
  progress: 0,
  uploadedBytes: 0,
  totalBytes: 0,
  speed: 0,
  currentIndex: 0,
  totalCount: 1,
  overallProgress: 0,
  remainingTime: 0
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  cancel: []
}>()

function handleCancel() {
  emit('cancel')
}
</script>
