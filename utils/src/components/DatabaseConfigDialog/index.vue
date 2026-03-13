<template>
  <v-dialog v-model="dialog" max-width="500px" persistent>
    <v-card>
      <v-card-item>
        <v-card-title>
          <span class="text-h5">数据库配置</span>
          <v-spacer></v-spacer>
          <v-btn icon="mdi-close" variant="text" @click="dialog = false"></v-btn>
        </v-card-title>
      </v-card-item>

      <v-card-text>
        <v-form ref="form" v-model="valid">
          <v-text-field
            v-model="formData.host"
            label="主机"
            :rules="[rules.required]"
            variant="outlined"
            prepend-inner-icon="mdi-server"
          ></v-text-field>

          <v-text-field
            v-model.number="formData.port"
            label="端口"
            type="number"
            :rules="[rules.required, rules.portRange]"
            variant="outlined"
            prepend-inner-icon="mdi-ethernet"
          ></v-text-field>

          <v-text-field
            v-model="formData.username"
            label="用户名"
            :rules="[rules.required]"
            variant="outlined"
            prepend-inner-icon="mdi-account"
          ></v-text-field>

          <v-text-field
            v-model="formData.password"
            label="密码"
            type="password"
            :rules="[rules.required]"
            variant="outlined"
            prepend-inner-icon="mdi-lock"
          ></v-text-field>

          <v-divider class="my-4"></v-divider>

          <div class="d-flex justify-end">
            <v-btn color="grey" variant="outlined" @click="dialog = false">
              取消
            </v-btn>
            <v-btn color="primary" variant="elevated" @click="saveConfig" :disabled="!valid" class="ml-2">
              保存
            </v-btn>
          </div>
        </v-form>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted, inject } from 'vue'
import { useConfigStore, type Config } from '@/stores/config'

interface Form {
  host: string
  port: number
  username: string
  password: string
}

const showSnackbar = inject('showSnackbar') as (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const configStore = useConfigStore()

// 默认值
const defaultForm: Form = {
  host: 'localhost',
  port: 3306,
  username: 'root',
  password: '123456'
}

// 使用 reactive 而不是 ref
const formData = reactive<Form>({ ...defaultForm })
const valid = ref(false)
const dialog = ref(props.modelValue)
const isFirstOpen = ref(true)

const rules = {
  required: (value: string) => !!value || '此项为必填项',
  portRange: (value: number) => (value >= 1 && value <= 65535) || '端口范围必须在 1-65535 之间'
}

watch(dialog, (newVal) => {
  emit('update:modelValue', newVal)
})

watch(() => props.modelValue, (newVal) => {
  dialog.value = newVal
  if (newVal && isFirstOpen.value) {
    isFirstOpen.value = false
    loadConfig()
  }
})

onMounted(() => {
  // 确保初始值设置
  Object.assign(formData, defaultForm)
})

async function loadConfig() {
  await configStore.loadConfig()
  if (configStore.config && configStore.config.mysql) {
    // 如果有保存的配置，使用保存的值
    Object.assign(formData, {
      host: configStore.config.mysql.host || defaultForm.host,
      port: configStore.config.mysql.port || defaultForm.port,
      username: configStore.config.mysql.username || defaultForm.username,
      password: configStore.config.mysql.password || defaultForm.password
    })
  } else {
    // 如果没有保存的配置，使用默认值
    Object.assign(formData, defaultForm)
  }
}

async function saveConfig() {
  try {
    const config: Config = {
      mysql: {
        host: formData.host,
        port: formData.port,
        username: formData.username,
        password: formData.password,
        database: 'superutils_file_manager'
      },
      indexing: configStore.config?.indexing || {
        excludeC: true,
        excludeNodeModules: true,
        lastIndexed: null,
        schedule: ''
      }
    }
    
    await configStore.saveConfig(config)
    dialog.value = false
    showSnackbar('数据库配置已保存', 'success')
  } catch (error) {
    console.error('Save config failed:', error)
    showSnackbar('保存配置失败：' + (error as Error).message, 'error')
  }
}
</script>

<style scoped lang="scss">
@import './index.scss';
</style>
