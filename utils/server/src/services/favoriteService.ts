/**
 * 文件收藏夹服务
 * 提供收藏夹的增删改查功能
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

export class FavoriteService {
  private dbService: any

  constructor(dbService: any) {
    this.dbService = dbService
  }

  /**
   * 获取所有收藏项
   * @returns 收藏列表
   */
  async getFavorites(): Promise<FavoriteItem[]> {
    const db = this.dbService.getDb()
    
    try {
      const results = db.exec(`
        SELECT * FROM file_favorites 
        ORDER BY sort_order ASC, created_at DESC
      `)
      
      if (results.length === 0) {
        return []
      }

      const columns = results[0].columns
      return results[0].values.map((row: any[]) => {
        const item: any = {}
        columns.forEach((col: string, index: number) => {
          item[col] = row[index]
        })
        return item as FavoriteItem
      })
    } catch (error) {
      console.error('[FavoriteService] Failed to get favorites:', error)
      throw error
    }
  }

  /**
   * 添加收藏项
   * @param data - 收藏数据
   * @returns 新创建的收藏项
   */
  async addFavorite(data: FavoriteInput): Promise<FavoriteItem> {
    const db = this.dbService.getDb()
    
    try {
      const now = new Date().toISOString()
      
      db.run(
        `INSERT INTO file_favorites (type, name, path, query, icon, color, sort_order, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.type,
          data.name,
          data.path || null,
          data.query || null,
          data.icon || 'folder',
          data.color || '#1976D2',
          0,
          now,
          now
        ]
      )

      this.dbService.saveDatabase()

      const result = db.exec('SELECT last_insert_rowid() as id')
      const newId = result[0].values[0][0]

      return this.getFavoriteById(newId)
    } catch (error) {
      console.error('[FavoriteService] Failed to add favorite:', error)
      throw error
    }
  }

  /**
   * 更新收藏项
   * @param id - 收藏项 ID
   * @param data - 更新数据
   */
  async updateFavorite(id: number, data: Partial<FavoriteInput>): Promise<void> {
    const db = this.dbService.getDb()
    
    try {
      const updates: string[] = []
      const values: any[] = []

      if (data.name !== undefined) {
        updates.push('name = ?')
        values.push(data.name)
      }
      if (data.path !== undefined) {
        updates.push('path = ?')
        values.push(data.path)
      }
      if (data.query !== undefined) {
        updates.push('query = ?')
        values.push(data.query)
      }
      if (data.icon !== undefined) {
        updates.push('icon = ?')
        values.push(data.icon)
      }
      if (data.color !== undefined) {
        updates.push('color = ?')
        values.push(data.color)
      }

      if (updates.length === 0) {
        return
      }

      updates.push('updated_at = ?')
      values.push(new Date().toISOString())
      values.push(id)

      db.run(
        `UPDATE file_favorites SET ${updates.join(', ')} WHERE id = ?`,
        values
      )

      this.dbService.saveDatabase()
    } catch (error) {
      console.error('[FavoriteService] Failed to update favorite:', error)
      throw error
    }
  }

  /**
   * 删除收藏项
   * @param id - 收藏项 ID
   */
  async removeFavorite(id: number): Promise<void> {
    const db = this.dbService.getDb()
    
    try {
      db.run('DELETE FROM file_favorites WHERE id = ?', [id])
      this.dbService.saveDatabase()
    } catch (error) {
      console.error('[FavoriteService] Failed to remove favorite:', error)
      throw error
    }
  }

  /**
   * 检查路径是否已收藏
   * @param path - 文件/文件夹路径
   * @returns 是否已收藏
   */
  async isFavorited(path: string): Promise<boolean> {
    const db = this.dbService.getDb()
    
    try {
      const result = db.exec(
        'SELECT COUNT(*) as count FROM file_favorites WHERE path = ?',
        [path]
      )
      
      return result[0].values[0][0] > 0
    } catch (error) {
      console.error('[FavoriteService] Failed to check favorite:', error)
      return false
    }
  }

  /**
   * 根据 ID 获取单个收藏项
   * @param id - 收藏项 ID
   * @returns 收藏项详情
   */
  private getFavoriteById(id: number): FavoriteItem {
    const db = this.dbService.getDb()
    
    const result = db.exec('SELECT * FROM file_favorites WHERE id = ?', [id])
    
    if (result.length === 0) {
      throw new Error(`Favorite with id ${id} not found`)
    }

    const columns = result[0].columns
    const row = result[0].values[0]
    const item: any = {}
    columns.forEach((col: string, index: number) => {
      item[col] = row[index]
    })
    
    return item as FavoriteItem
  }
}
