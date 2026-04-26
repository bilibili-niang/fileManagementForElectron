<template>
  <div class="window-title-bar" @dblclick="toggleMaximize">
    <div class="window-title">
      <slot name="title">{{ title }}</slot>
    </div>
    <div class="window-center">
      <slot></slot>
    </div>
    <!-- 可拖拽区域 -->
    <div
      class="drag-area"
      :class="{ 'is-pressing': isPressing }"
      @mousedown="handleMouseDown"
      @mouseup="handleMouseUp"
      @mouseleave="handleMouseUp"
    >
      <div class="drag-content">
        <v-icon size="16" class="drag-icon">mdi-drag-horizontal-variant</v-icon>
        <span class="drag-text">{{ isPressing ? '长按修改窗口位置' : '拖拽移动' }}</span>
      </div>
    </div>
    <div class="window-controls">
      <!-- 主题切换按钮 - 始终显示 -->
      <button
        class="window-btn theme-toggle"
        @click="toggleTheme"
        :title="themeStore.themeName"
      >
        <v-icon size="14">{{ themeStore.themeIcon }}</v-icon>
      </button>
      <!-- Electron 环境特有的窗口控制按钮 -->
      <template v-if="isElectronEnv">
        <button class="window-btn minimize" @click="minimize" title="最小化">
          <v-icon size="14">mdi-minus</v-icon>
        </button>
        <button class="window-btn maximize" @click="toggleMaximize" :title="isMaximized ? '还原' : '最大化'">
          <v-icon size="14">{{ isMaximized ? 'mdi-window-restore' : 'mdi-window-maximize' }}</v-icon>
        </button>
        <button class="window-btn close" @click="close" title="关闭">
          <v-icon size="14">mdi-close</v-icon>
        </button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import {ref, onMounted} from 'vue'
import {useThemeStore} from '@/stores/theme'
import {isElectron} from '@/utils/env'

/**
 * 组件属性
 */
interface Props {
  title?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: 'SuperUtils'
})

/**
 * 主题 Store
 */
const themeStore = useThemeStore()

const isMaximized = ref(false)
const isPressing = ref(false)

/**
 * 检测是否在 Electron 环境
 */
const isElectronEnv = isElectron()

/**
 * 处理鼠标按下
 */
function handleMouseDown(): void {
  isPressing.value = true
}

/**
 * 处理鼠标释放
 */
function handleMouseUp(): void {
  isPressing.value = false
}

function minimize() {
  if (isElectronEnv) {
    window.electronAPI.windowMinimize()
  }
}

async function toggleMaximize() {
  if (isElectronEnv) {
    await window.electronAPI.windowMaximize()
    isMaximized.value = await window.electronAPI.windowIsMaximized()
  }
}

function close() {
  if (isElectronEnv) {
    window.electronAPI.windowClose()
  }
}

/**
 * 切换主题
 */
async function toggleTheme() {
  await themeStore.toggleTheme()
}

onMounted(async () => {
  if (isElectronEnv) {
    isMaximized.value = await window.electronAPI.windowIsMaximized()
  }
  // 加载主题配置
  await themeStore.loadTheme()
})
</script>

<style scoped lang="scss">
@import './index.scss';
</style>
