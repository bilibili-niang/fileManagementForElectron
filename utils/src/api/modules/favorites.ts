import { request } from '../client'

/**
 * 收藏夹相关类型定义
 */
export interface FavoriteItem {
  id: number
  type: 'folder' | 'search' | 'file'
  name: string
  path?: string
  query?: string
  icon: string
  color: string
  sort_order: number
  created_at: string
  updated_at: string
}

export interface FavoriteInput {
  type: 'folder' | 'search' | 'file'
  name: string
  path?: string
  query?: string
  icon?: string
  color?: string
}

/**
 * 最近访问相关类型定义
 */
export interface RecentAccessItem {
  id: number
  file_id: number | null
  path: string
  name: string
  access_type: 'open' | 'preview' | 'edit'
  accessed_at: string
}

export interface RecordAccessInput {
  file_id?: number
  path: string
  name: string
  access_type?: 'open' | 'preview' | 'edit'
}

/**
 * 收藏夹 API
 */
export const favoritesApi = {
  /**
   * 获取收藏列表
   */
  async getFavorites(): Promise<{ success: boolean; data: FavoriteItem[] }> {
    return request({
      path: '/api/favorites',
      method: 'GET'
    })
  },

  /**
   * 添加收藏项
   */
  async addFavorite(data: FavoriteInput): Promise<{ success: boolean; data: FavoriteItem }> {
    return request({
      path: '/api/favorites',
      method: 'POST',
      body: data
    })
  },

  /**
   * 更新收藏项
   */
  async updateFavorite(id: number, data: Partial<FavoriteInput>): Promise<{ success: boolean }> {
    return request({
      path: `/api/favorites/${id}`,
      method: 'PUT',
      body: data
    })
  },

  /**
   * 删除收藏项
   */
  async removeFavorite(id: number): Promise<{ success: boolean }> {
    return request({
      path: `/api/favorites/${id}`,
      method: 'DELETE'
    })
  },

  /**
   * 检查路径是否已收藏
   */
  async isFavorited(path: string): Promise<{ success: boolean; data: { isFavorited: boolean } }> {
    return request({
      path: '/api/favorites/check',
      params: { path }
    })
  }
}

/**
 * 最近访问 API
 */
export const recentApi = {
  /**
   * 获取最近访问记录
   */
  async getRecent(limit: number = 50): Promise<{ success: boolean; data: RecentAccessItem[] }> {
    return request({
      path: '/api/recent',
      params: { limit: String(limit) }
    })
  },

  /**
   * 记录一次文件访问
   */
  async recordAccess(data: RecordAccessInput): Promise<{ success: boolean }> {
    return request({
      path: '/api/recent',
      method: 'POST',
      body: data
    })
  },

  /**
   * 清空所有访问记录
   */
  async clearAll(): Promise<{ success: boolean }> {
    return request({
      path: '/api/recent',
      method: 'DELETE'
    })
  },

  /**
   * 删除单条访问记录
   */
  async removeItem(id: number): Promise<{ success: boolean }> {
    return request({
      path: `/api/recent/${id}`,
      method: 'DELETE'
    })
  },

  /**
   * 获取访问统计信息
   */
  async getStats(): Promise<{
    success: boolean
    data: {
      total: number
      today: number
      thisWeek: number
      mostAccessedPaths: Array<{ path: string; count: number }>
    }
  }> {
    return request({
      path: '/api/recent/stats'
    })
  }
}
