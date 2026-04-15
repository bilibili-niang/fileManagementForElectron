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
        path: '/api/search/files',
        method: 'POST',
        body: { query, page, pageSize, options }
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
        path: '/api/search/content',
        method: 'POST',
        body: { keyword, page, pageSize }
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
        path: '/api/index/start',
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
      { path: '/api/index/stop', method: 'POST' },
      { channel: 'stopIndex' }
    )
  },

  /**
   * 获取索引进度
   */
  async getIndexingProgress(): Promise<IndexProgress> {
    return request(
      { path: '/api/index/progress' },
      { channel: 'getIndexingProgress' }
    )
  },

  /**
   * 获取内容索引统计
   */
  async getContentIndexStats(): Promise<ContentIndexStats> {
    return request(
      { path: '/api/index/content-stats' },
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
   * 按时长筛选搜索文件
   * @param minDuration - 最小时长（秒）
   * @param maxDuration - 最大时长（秒）
   * @param page - 页码
   * @param pageSize - 每页数量
   */
  async searchFilesByDuration(
    minDuration?: number,
    maxDuration?: number,
    page: number = 1,
    pageSize: number = 50
  ): Promise<SearchResult> {
    return request(
      {
        path: '/api/search/duration',
        params: { minDuration, maxDuration, page, pageSize }
      },
      { channel: 'searchFilesByDuration', args: [minDuration, maxDuration, page, pageSize] }
    )
  },

  /**
   * 批量删除文件
   * @param fileIds - 文件ID数组
   */
  async batchDeleteFiles(fileIds: number[]): Promise<{ deletedCount: number }> {
    return request(
      {
        path: '/api/files/batch-delete',
        method: 'POST',
        body: { fileIds }
      },
      { channel: 'batchDeleteFiles', args: [fileIds] }
    )
  }
}
