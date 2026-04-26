<template>
  <div class="search-history-container">
    <v-expand-transition>
      <div v-if="show && (history.length > 0 || suggestions.length > 0)" class="history-dropdown">
        <!-- 搜索建议 -->
        <div v-if="suggestions.length > 0" class="history-section">
          <div class="history-header">
            <v-icon icon="mdi-lightbulb" size="14" color="primary" class="mr-1"></v-icon>
            <span class="text-caption text-medium-emphasis">建议</span>
          </div>
          <div
            v-for="(item, index) in suggestions.slice(0, 3)"
            :key="'suggest-'+index"
            class="history-item"
            @click="$emit('select', item.query)"
          >
            <v-icon icon="mdi-magnify" size="14" color="primary" class="mr-2"></v-icon>
            <span class="history-text">{{ item.query }}</span>
          </div>
        </div>

        <!-- 搜索历史 -->
        <div v-if="history.length > 0" class="history-section">
          <div class="history-header">
            <v-icon icon="mdi-history" size="14" color="grey" class="mr-1"></v-icon>
            <span class="text-caption text-medium-emphasis">历史</span>
            <v-spacer></v-spacer>
            <v-btn
              variant="text"
              density="compact"
              size="small"
              color="error"
              @click="$emit('clear')"
            >
              清除
            </v-btn>
          </div>
          <div
            v-for="item in history.slice(0, 5)"
            :key="item.id"
            class="history-item"
            @click="$emit('select', item.query)"
          >
            <v-icon icon="mdi-clock-outline" size="14" color="grey" class="mr-2"></v-icon>
            <span class="history-text">{{ item.query }}</span>
            <v-spacer></v-spacer>
            <span class="history-meta">{{ formatTime(item.created_at) }}</span>
            <v-btn
              icon="mdi-close"
              variant="text"
              density="compact"
              size="small"
              class="ml-1"
              @click.stop="$emit('delete', item.id)"
            ></v-btn>
          </div>
        </div>
      </div>
    </v-expand-transition>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  show: boolean
  history: Array<{
    id: number
    query: string
    search_type: string
    result_count: number
    created_at: string
  }>
  suggestions: Array<{
    query: string
    type: 'history' | 'file'
  }>
}>()

defineEmits<{
  select: [query: string]
  delete: [id: number]
  clear: []
}>()

function formatTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 60 * 60 * 1000) {
    const minutes = Math.floor(diff / (60 * 1000))
    return minutes < 1 ? '刚刚' : `${minutes}分钟前`
  }
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000))
    return `${hours}小时前`
  }
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    const days = Math.floor(diff / (24 * 60 * 60 * 1000))
    return `${days}天前`
  }
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}
</script>

<style scoped lang="scss">
.search-history-container {
  position: relative;
}

.history-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 100;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-top: 2px;
  max-height: 300px;
  overflow-y: auto;
}

.history-section {
  padding: 4px 0;

  &:not(:last-child) {
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  }
}

.history-header {
  display: flex;
  align-items: center;
  padding: 4px 12px;
  height: 24px;
}

.history-item {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  cursor: pointer;
  transition: background 0.15s;
  min-height: 32px;

  &:hover {
    background: rgba(0, 0, 0, 0.04);
  }
}

.history-text {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.87);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

.history-meta {
  font-size: 11px;
  color: rgba(0, 0, 0, 0.38);
  white-space: nowrap;
}
</style>
