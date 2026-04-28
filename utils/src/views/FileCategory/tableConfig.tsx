import { SuperTable } from '@/components/SuperTable'
import type { TableColumn } from '@/components/SuperTable/types'
import { searchApi } from '@/api'
import FileIcon from '@/components/FileIcon/index.vue'
import type { Ref } from 'vue'

export interface FileResult {
  id: number
  name: string
  path: string
  extension: string
  size: number
  modified_time: string
  created_time: string
  accessed_time?: string
  is_hidden?: boolean
  is_readonly?: boolean
  is_system?: boolean
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function formatDate(dateStr: string): string {
  if (!dateStr || dateStr === 'null' || dateStr === 'undefined') return '-'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '-'
  return date.toLocaleString('zh-CN')
}

const columns: TableColumn<FileResult>[] = [
  {
    key: 'name',
    title: '文件名',
    customRender: (item) => (
      <div class="file-name-wrapper">
        <div class="file-icon-row">
          <FileIcon extension={item.extension} size={24} />
        </div>
        <div class="file-name-row">
          <span class="file-name" title={item.name}>{item.name}</span>
        </div>
      </div>
    )
  },
  {
    key: 'path',
    title: '路径',
    customRender: (item) => (
      <div class="file-path-wrapper">
        <span class="file-path" title={item.path}>{item.path}</span>
      </div>
    )
  },
  {
    key: 'size',
    title: '大小',
    customRender: (item) => formatSize(item.size)
  },
  {
    key: 'created_time',
    title: '创建时间',
    customRender: (item) => formatDate(item.created_time)
  },
  {
    key: 'modified_time',
    title: '修改时间',
    customRender: (item) => formatDate(item.modified_time)
  },
  {
    key: 'accessed_time',
    title: '访问时间',
    customRender: (item) => formatDate(item.accessed_time || '')
  },
  {
    key: 'attributes',
    title: '属性',
    customRender: (item) => {
      if (!item.is_hidden && !item.is_readonly && !item.is_system) {
        return <v-chip size="x-small" color="success" variant="outlined">正常</v-chip>
      }
      return (
        <div class="file-attributes">
          {item.is_hidden && <v-icon icon="mdi-eye-off" size="small" color="grey" title="隐藏文件" />}
          {item.is_readonly && <v-icon icon="mdi-lock" size="small" color="orange" title="只读文件" />}
          {item.is_system && <v-icon icon="mdi-cog" size="small" color="blue" title="系统文件" />}
        </div>
      )
    }
  }
]

export interface CreateFileCategoryTableOptions {
  category: Ref<string>
  onRowClick: (item: FileResult) => void
  onRowContextmenu: (item: FileResult, event: MouseEvent) => void
}

export function createFileCategoryTable(options: CreateFileCategoryTableOptions) {
  return SuperTable<FileResult>({
    columns,
    requestHandler: async (params) => {
      const response = await searchApi.getFilesByCategory(
        options.category.value,
        params.page,
        params.pageSize
      )
      if (response.success) {
        return {
          data: response.files.map((f: any) => ({
            id: f.id,
            name: f.name,
            path: f.path,
            extension: f.extension,
            size: f.size,
            modified_time: f.modified_time,
            created_time: f.created_time,
            accessed_time: f.accessed_time,
            is_hidden: f.is_hidden,
            is_readonly: f.is_readonly,
            is_system: f.is_system
          })),
          total: response.total
        }
      }
      return { data: [], total: 0 }
    },
    pagination: { pageSize: 100, pageSizes: [20, 50, 100, 200, 500] },
    onRowClick: options.onRowClick,
    onRowContextmenu: options.onRowContextmenu
  })
}
