import { SuperTable } from '@/components/SuperTable'
import type { TableColumn, ActionColumn } from '@/components/SuperTable/types'
import type { ClipboardItem } from '@/stores/clipboard'

function getFileCount(content: string): number {
  return content.split('\n').filter(f => f.trim()).length
}

function getFileNames(content: string): string {
  const files = content.split('\n').filter(f => f.trim())
  if (files.length <= 2) {
    return files.map(f => f.split('/').pop()).join(', ')
  }
  return files.slice(0, 2).map(f => f.split('/').pop()).join(', ') + '...'
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return '刚刚'
  if (diffMin < 60) return `${diffMin}分钟前`
  if (diffHour < 24) return `${diffHour}小时前`
  if (diffDay < 7) return `${diffDay}天前`

  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const columns: TableColumn<ClipboardItem>[] = [
  {
    key: 'content',
    title: '内容',
    customRender: (item) => {
      if (item.type === 'text') {
        return <span class="text-truncate">{item.content}</span>
      }
      if (item.type === 'image') {
        return (
          <v-img
            src={item.content}
            max-height={60}
            max-width={120}
            contain
            class="rounded"
          />
        )
      }
      if (item.type === 'files') {
        return (
          <div>
            <div class="d-flex align-center gap-1 mb-1">
              <v-icon icon="mdi-file-multiple" size="small" color="primary"></v-icon>
              <span class="text-body-2">{getFileCount(item.content)} 个文件</span>
            </div>
            <div class="file-list text-caption">{getFileNames(item.content)}</div>
          </div>
        )
      }
      return ''
    }
  },
  {
    key: 'source',
    title: '来源',
    customRender: (item) => (
      <div class="d-flex align-center gap-1">
        <v-icon icon="mdi-application" size="x-small"></v-icon>
        <span class="text-caption">{item.sourceApp}</span>
      </div>
    )
  },
  {
    key: 'time',
    title: '时间',
    customRender: (item) => (
      <div class="d-flex align-center gap-1">
        <v-icon icon="mdi-clock-outline" size="x-small"></v-icon>
        <span class="text-caption">{formatTime(item.timestamp)}</span>
      </div>
    )
  }
]

export function createClipboardTable(options: {
  data: () => ClipboardItem[]
  onRowClick: (item: ClipboardItem) => void
  onCopy: (item: ClipboardItem) => void
  onRemove: (id: string) => void
}) {
  const actions: ActionColumn<ClipboardItem>[] = [
    {
      icon: 'mdi-content-copy',
      tooltip: '复制',
      color: 'primary',
      onClick: (item) => options.onCopy(item)
    },
    {
      icon: 'mdi-delete-outline',
      tooltip: '删除',
      color: 'error',
      onClick: (item) => options.onRemove(item.id)
    }
  ]

  return SuperTable<ClipboardItem>({
    columns,
    actions,
    data: options.data,
    pagination: { pageSize: 10, pageSizes: [10, 20, 50] },
    onRowClick: options.onRowClick
  })
}
