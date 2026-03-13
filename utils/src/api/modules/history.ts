import { request } from '../client'
import type { AddHistoryParams, HistoryResponse } from '../types'

/**
 * 搜索历史 API
 */
export const historyApi = {
  /**
   * 获取搜索历史
   * @param type - 搜索类型
   * @param limit - 限制数量
   */
  async getHistory(type?: string, limit: number = 20): Promise<HistoryResponse> {
    return request(
      {
        path: '/api/config/search-history',
        params: { limit, type }
      },
      { channel: 'getSearchHistory', args: [limit, type] }
    )
  },

  /**
   * 添加搜索历史
   * @param params - 添加参数
   */
  async addHistory(params: AddHistoryParams): Promise<{ success: boolean }> {
    return request(
      {
        path: '/api/config/search-history',
        method: 'POST',
        body: {
          query: params.query,
          search_type: params.searchType,
          result_count: params.resultCount
        }
      },
      { channel: 'addSearchHistory', args: [params.query, params.searchType, params.resultCount] }
    )
  },

  /**
   * 删除单条历史
   * @param id - 历史记录 ID
   */
  async deleteHistory(id: number): Promise<{ success: boolean }> {
    return request(
      { path: `/api/config/search-history/${id}`, method: 'DELETE' },
      { channel: 'deleteSearchHistory', args: [id] }
    )
  },

  /**
   * 清除全部历史
   */
  async clearHistory(): Promise<{ success: boolean }> {
    return request(
      { path: '/api/config/search-history', method: 'DELETE' },
      { channel: 'clearSearchHistory' }
    )
  }
}
