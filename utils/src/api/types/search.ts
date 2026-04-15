import type { PaginatedResult } from './common'

/**
 * 文件搜索结果项
 */
export interface FileResult {
  id: number
  name: string
  path: string
  extension: string
  size: number
  modified_time: string
  contentPreview?: string
  matchCount?: number
  duration?: number  // 新增：视频/音频时长（秒）
}

/**
 * 搜索结果
 */
export type SearchResult = PaginatedResult<FileResult>

/**
 * 搜索选项
 */
export interface SearchOptions {
  fileType?: string
  minSize?: number
  maxSize?: number
  minDuration?: number  // 新增：最小时长（秒）
  maxDuration?: number  // 新增：最大时长（秒）
}

/**
 * 批量操作请求
 */
export interface BatchOperationRequest {
  fileIds: number[]
  operation: 'delete' | 'copy' | 'move'
  targetPath?: string  // 复制/移动的目标路径
}

/**
 * 内容搜索结果项
 */
export interface ContentSearchResult {
  id: number
  name: string
  path: string
  extension: string
  size: number
  modified_time: string
  preview: string
  matchCount: number
}

/**
 * 索引进度
 */
export interface IndexProgress {
  progress: number
  currentPath: string
  currentFile?: string
  totalFiles: number
  isIndexing: boolean
}

/**
 * 索引完成结果
 */
export interface IndexCompleteResult {
  totalFiles: number
  duration: number
}

/**
 * 内容索引统计
 */
export interface ContentIndexStats {
  totalFiles: number
  indexedFiles: number
  lastIndexed: string | null
}

/**
 * 文件分类统计
 */
export interface FileCountByCategory {
  all: number
  images: number
  documents: number
  code: number
  videos: number
  audio: number
  archives: number
  executables: number
}
