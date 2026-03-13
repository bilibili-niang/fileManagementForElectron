/**
 * 搜索历史相关类型
 */

/**
 * 搜索历史记录项
 */
export interface SearchHistoryItem {
  id: number
  query: string
  search_type: 'filename' | 'content'
  result_count: number
  created_at: string
}

/**
 * 添加历史记录参数
 */
export interface AddHistoryParams {
  query: string
  searchType: 'filename' | 'content'
  resultCount: number
}

/**
 * 历史记录响应
 */
export interface HistoryResponse {
  success: boolean
  history: SearchHistoryItem[]
}
