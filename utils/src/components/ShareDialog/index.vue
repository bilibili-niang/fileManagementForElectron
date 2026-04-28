<template>
  <v-dialog
    :model-value="modelValue"
    max-width="450"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon icon="mdi-share-variant" class="mr-2"></v-icon>
        分享文件共享
      </v-card-title>
      <v-card-text class="text-center">
        <div class="text-body-2 text-grey mb-4">
          扫描二维码或复制链接访问
        </div>
        <div class="qrcode-container mb-4">
          <img
            v-if="qrCode"
            :src="qrCode"
            alt="QR Code"
            width="180"
            height="180"
          />
          <div v-else class="qrcode-placeholder">
            <v-progress-circular indeterminate size="32"></v-progress-circular>
          </div>
        </div>
        <v-text-field
          :model-value="url"
          label="访问地址"
          readonly
          variant="outlined"
          density="compact"
          hide-details
          append-inner-icon="mdi-content-copy"
          @click:append-inner="handleCopy"
          @click="handleCopy"
        ></v-text-field>
        <div class="mt-3 text-caption text-grey">
          IP: {{ ip }}:{{ port }}
        </div>
      </v-card-text>
      <v-card-actions class="justify-end">
        <v-btn variant="text" @click="handleClose">
          关闭
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
interface Props {
  modelValue: boolean
  url: string
  ip: string
  port: number | string
  qrCode: string
}

withDefaults(defineProps<Props>(), {
  url: '',
  ip: '',
  port: 0,
  qrCode: ''
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  copy: []
}>()

function handleCopy() {
  emit('copy')
}

function handleClose() {
  emit('update:modelValue', false)
}
</script>
