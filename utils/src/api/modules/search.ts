import { request } from '../client'
import type {
  SearchResult,
  SearchOptions,
  ContentSearchResult,
  IndexProgress,
  ContentIndexStats,
  FileCountByCategory
} from '../types'

/**
 * 搜索 API
 */
export const searchApi = {
  /**
   * 搜索文件
   * @param query - 搜索关键词
   * @param page - 页码
   * @param pageSize - 每页数量
   * @param options - 搜索选项
   */
  async searchFiles(
    query: string,
    page: number,
    pageSize: number,
    options?: SearchOptions
  ): Promise<SearchResult> {
    return request(
      {
        path: '/api/files/search',
        method: 'GET',
        params: { query, page: String(page), pageSize: String(pageSize), ...options }
      },
      { channel: 'searchFiles', args: [query, page, pageSize, options] }
    )
  },

  /**
   * 搜索文件内容
   * @param keyword - 关键词
   * @param page - 页码
   * @param pageSize - 每页数量
   */
  async searchFileContent(
    keyword: string,
    page: number,
    pageSize: number
  ): Promise<{ results: ContentSearchResult[]; totalPages: number }> {
    return request(
      {
        path: '/api/files/search-content',
        method: 'GET',
        params: { keyword, page: String(page), pageSize: String(pageSize) }
      },
      { channel: 'searchFileContent', args: [keyword, page, pageSize] }
    )
  },

  /**
   * 按分类获取文件
   * @param category - 分类
   * @param page - 页码
   * @param pageSize - 每页数量
   */
  async getFilesByCategory(
    category: string,
    page: number,
    pageSize: number
  ): Promise<SearchResult> {
    return request(
      {
        path: '/api/files/category',
        params: { category, page, pageSize }
      },
      { channel: 'getFilesByCategory', args: [category, page, pageSize] }
    )
  },

  /**
   * 开始索引
   * @param drives - 驱动器列表
   */
  async startIndexing(drives: string[]): Promise<{ success: boolean }> {
    return request(
      {
        path: '/api/files/index/start',
        method: 'POST',
        body: { drives }
      },
      { channel: 'startIndex', args: [drives] }
    )
  },

  /**
   * 停止索引
   */
  async stopIndexing(): Promise<{ success: boolean }> {
    return request(
      { path: '/api/files/index/stop', method: 'POST' },
      { channel: 'stopIndex' }
    )
  },

  /**
   * 获取索引进度
   */
  async getIndexingProgress(): Promise<IndexProgress> {
    return request(
      { path: '/api/files/index/progress' },
      { channel: 'getIndexingProgress' }
    )
  },

  /**
   * 获取内容索引统计
   */
  async getContentIndexStats(): Promise<ContentIndexStats> {
    return request(
      { path: '/api/files/content-stats' },
      { channel: 'getContentIndexStats' }
    )
  },

  /**
   * 获取文件分类统计
   */
  async getFileCounts(): Promise<FileCountByCategory> {
    return request(
      { path: '/api/files/counts' },
      { channel: 'getFileCounts' }
    )
  },

  /**
   * 获取搜索历史
   * @param limit - 返回数量限制
   */
  async getSearchHistory(limit: number = 10): Promise<{ success: boolean; history: any[] }> {
    return request(
      { path: '/api/files/search/history', params: { limit: String(limit) } },
      { channel: 'getSearchHistory', args: [limit] }
    )
  },

  /**
   * 保存搜索历史
   * @param query - 搜索关键词
   * @param searchType - 搜索类型
   */
  async saveSearchHistory(query: string, searchType: string): Promise<{ success: boolean }> {
    return request(
      { path: '/api/files/search/history', method: 'POST', body: { query, searchType } },
      { channel: 'saveSearchHistory', args: [query, searchType] }
    )
  },

  /**
   * 删除搜索历史
   * @param id - 历史记录ID
   */
  async removeSearchHistory(id: number): Promise<{ success: boolean }> {
    return request(
      { path: `/api/files/search/history/${id}`, method: 'DELETE' },
      { channel: 'removeSearchHistory', args: [id] }
    )
  },

  /**
   * 强制重新索引
   * 清除所有数据并重新开始索引
   * @param drives - 驱动器列表
   */
  async forceReindex(drives: string[]): Promise<{ success: boolean }> {
    return request(
      {
        path: '/api/files/force-reindex',
        method: 'POST',
        body: { drives }
      }
    )
  },

  /**
   * 搜索文件（别名，兼容旧代码）
   */
  async search(params: any): Promise<any> {
    return this.searchFiles(params.query, params.page, params.pageSize, params)
  },

  /**
   * 搜索文件内容（别名，兼容旧代码）
   */
  async searchContent(params: { query: string; page: number; pageSize: number }): Promise<any> {
    return this.searchFileContent(params.query, params.page, params.pageSize)
  }
}
