<template>
  <v-dialog
    :model-value="modelValue"
    max-width="600"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon icon="mdi-note-text" class="mr-2" color="info"></v-icon>
        {{ isEditing ? '编辑文本' : '新建文本' }}
      </v-card-title>
      <v-card-text>
        <v-text-field
          v-model="localDisplayName"
          label="标题"
          placeholder="请输入标题"
          density="compact"
          variant="outlined"
          class="mb-3"
        />
        <v-textarea
          v-model="localContent"
          label="内容"
          placeholder="请输入内容"
          rows="8"
          density="compact"
          variant="outlined"
        />
      </v-card-text>
      <v-card-actions class="justify-end">
        <v-btn variant="text" @click="handleCancel">
          取消
        </v-btn>
        <v-btn
          color="primary"
          :loading="loading"
          @click="handleSave"
        >
          保存
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
  modelValue: boolean
  displayName?: string
  content?: string
  isEditing?: boolean
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  displayName: '',
  content: '',
  isEditing: false,
  loading: false
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  save: [displayName: string, content: string]
  cancel: []
}>()

const localDisplayName = ref(props.displayName)
const localContent = ref(props.content)

watch(() => props.modelValue, (val) => {
  if (val) {
    localDisplayName.value = props.displayName
    localContent.value = props.content
  }
})

function handleSave() {
  emit('save', localDisplayName.value, localContent.value)
}

function handleCancel() {
  emit('cancel')
  emit('update:modelValue', false)
}
</script>
