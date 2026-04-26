<template>
  <div
    v-if="isDev"
    class="dev-tools-btn"
    :style="{ left: position.x + 'px', top: position.y + 'px' }"
    @mousedown="onDragStart"
  >
    <v-menu
      :location="'top start'"
      :close-on-content-click="false"
      :offset="[0, 8]"
    >
      <template #activator="{ props: menuProps }">
        <v-btn
          v-bind="menuProps"
          icon
          size="small"
          color="primary"
          elevation="4"
          class="dev-tools-trigger"
        >
          <v-icon size="18">mdi-bug</v-icon>
        </v-btn>
      </template>
      <v-list density="compact" min-width="180">
        <v-list-item
          prepend-icon="mdi-text-box-search-outline"
          title="查看错误日志"
          @click="showLogDialog = true"
        />
        <v-list-item
          prepend-icon="mdi-delete-sweep-outline"
          title="清空日志"
          @click="clearLogs"
        />
      </v-list>
    </v-menu>

    <DevErrorLogDialog v-model="showLogDialog" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { httpRequest } from '@/api/client'
import DevErrorLogDialog from '../DevErrorLogDialog/index.vue'

const isDev = (import.meta as any).env?.DEV

const showLogDialog = ref(false)

const STORAGE_KEY = 'dev-tools-btn-position'
const BTN_SIZE = 40

const defaultPosition = () => ({
  x: window.innerWidth - BTN_SIZE - 24,
  y: window.innerHeight - BTN_SIZE - 24
})

const position = ref(loadPosition())

function loadPosition(): { x: number; y: number } {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const pos = JSON.parse(saved)
      if (
        typeof pos.x === 'number' &&
        typeof pos.y === 'number' &&
        pos.x >= 0 &&
        pos.y >= 0
      ) {
        return pos
      }
    }
  } catch {
      /** ignore parse error */
    }
  return defaultPosition()
}

function savePosition() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(position.value))
  } catch {
    /** ignore storage error */
  }
}

let dragging = false
let dragOffset = { x: 0, y: 0 }

function onDragStart(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (target.closest('.v-menu, .v-list, .v-overlay')) {
    return
  }

  dragging = true
  dragOffset = {
    x: e.clientX - position.value.x,
    y: e.clientY - position.value.y
  }

  document.addEventListener('mousemove', onDragMove)
  document.addEventListener('mouseup', onDragEnd)
}

function onDragMove(e: MouseEvent) {
  if (!dragging) return

  const maxX = window.innerWidth - BTN_SIZE
  const maxY = window.innerHeight - BTN_SIZE

  position.value = {
    x: Math.max(0, Math.min(e.clientX - dragOffset.x, maxX)),
    y: Math.max(0, Math.min(e.clientY - dragOffset.y, maxY))
  }
}

function onDragEnd() {
  dragging = false
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup', onDragEnd)
  savePosition()
}

async function clearLogs() {
  try {
    await httpRequest('/api/dev-error-logs', { method: 'DELETE' })
  } catch {
    /** 静默处理 */
  }
}
</script>

<style scoped lang="scss" src="./index.scss"></style>
