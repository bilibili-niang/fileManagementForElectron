<template>
  <v-dialog
    :model-value="modelValue"
    max-width="450"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon
          :icon="titleIcon || 'mdi-alert'"
          :color="titleColor || 'warning'"
          class="mr-2"
        ></v-icon>
        {{ title || '确认' }}
      </v-card-title>
      <v-card-text>
        <p v-if="message" class="mb-2">{{ message }}</p>
        <p v-if="hint" class="text-caption text-grey">{{ hint }}</p>
        <v-list
          v-if="items && items.length > 0"
          density="compact"
          max-height="200"
          class="mt-3"
        >
          <v-list-item
            v-for="(item, index) in displayedItems"
            :key="index"
          >
            <v-list-item-title class="text-caption text-truncate">
              {{ item }}
            </v-list-item-title>
          </v-list-item>
          <v-list-item v-if="remainingCount > 0">
            <v-list-item-title class="text-caption text-grey">
              还有 {{ remainingCount }} 项...
            </v-list-item-title>
          </v-list-item>
        </v-list>
      </v-card-text>
      <v-card-actions class="justify-end">
        <v-btn
          variant="text"
          @click="handleCancel"
        >
          {{ cancelText || '取消' }}
        </v-btn>
        <v-btn
          :color="confirmColor || 'primary'"
          :loading="loading"
          @click="handleConfirm"
        >
          {{ confirmText || '确认' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  modelValue: boolean
  title?: string
  titleIcon?: string
  titleColor?: string
  message?: string
  hint?: string
  confirmText?: string
  confirmColor?: string
  cancelText?: string
  loading?: boolean
  items?: string[]
  maxItems?: number
}

const props = withDefaults(defineProps<Props>(), {
  title: '确认',
  titleIcon: 'mdi-alert',
  titleColor: 'warning',
  confirmText: '确认',
  cancelText: '取消',
  maxItems: 5
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
  cancel: []
}>()

const displayedItems = computed(() => {
  if (!props.items) return []
  return props.items.slice(0, props.maxItems)
})

const remainingCount = computed(() => {
  if (!props.items) return 0
  return Math.max(0, props.items.length - props.maxItems)
})

function handleConfirm() {
  emit('confirm')
}

function handleCancel() {
  emit('cancel')
  emit('update:modelValue', false)
}
</script>
