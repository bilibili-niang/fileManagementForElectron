<template>
  <v-dialog
    :model-value="modelValue"
    max-width="500"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon icon="mdi-upload" class="mr-2"></v-icon>
        上传文件
      </v-card-title>
      <v-card-text>
        <v-file-input
          v-model="localFile"
          label="选择文件"
          prepend-icon="mdi-file"
          show-size
          accept="*"
          density="compact"
          variant="outlined"
        ></v-file-input>
      </v-card-text>
      <v-card-actions class="justify-end">
        <v-btn
          variant="text"
          @click="handleCancel"
        >
          取消
        </v-btn>
        <v-btn
          color="primary"
          :disabled="!localFile || uploading"
          :loading="uploading"
          @click="handleUpload"
        >
          上传
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
  modelValue: boolean
  uploading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  uploading: false
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  upload: [file: File]
  cancel: []
}>()

const localFile = ref<File | null>(null)

watch(() => props.modelValue, (val) => {
  if (val) {
    localFile.value = null
  }
})

function handleUpload() {
  if (localFile.value) {
    emit('upload', localFile.value)
  }
}

function handleCancel() {
  emit('cancel')
  emit('update:modelValue', false)
  localFile.value = null
}
</script>
