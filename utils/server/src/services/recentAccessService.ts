/**
 * 最近访问记录服务
 * 记录和管理用户对文件的访问历史
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

export class RecentAccessService {
  private dbService: any

  constructor(dbService: any) {
    this.dbService = dbService
  }

  /**
   * 记录一次文件访问
   * @param data - 访问数据
   */
  async recordAccess(data: RecordAccessInput): Promise<void> {
    const db = this.dbService.getDb()
    
    try {
      db.run(
        `INSERT INTO file_access_history (file_id, path, name, access_type, accessed_at) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          data.file_id || null,
          data.path,
          data.name,
          data.access_type || 'open',
          new Date().toISOString()
        ]
      )

      this.dbService.saveDatabase()

      await this.cleanupOldRecords(30)
    } catch (error) {
      console.error('[RecentAccessService] Failed to record access:', error)
      throw error
    }
  }

  /**
   * 获取最近访问记录
   * @param limit - 返回数量限制，默认 50
   * @returns 最近访问列表
   */
  async getRecent(limit: number = 50): Promise<RecentAccessItem[]> {
    const db = this.dbService.getDb()
    
    try {
      const results = db.exec(`
        SELECT * FROM file_access_history 
        ORDER BY accessed_at DESC 
        LIMIT ?
      `, [limit])
      
      if (results.length === 0) {
        return []
      }

      const columns = results[0].columns
      return results[0].values.map((row: any[]) => {
        const item: any = {}
        columns.forEach((col: string, index: number) => {
          item[col] = row[index]
        })
        return item as RecentAccessItem
      })
    } catch (error) {
      console.error('[RecentAccessService] Failed to get recent:', error)
      throw error
    }
  }

  /**
   * 清空所有访问记录
   */
  async clearAll(): Promise<void> {
    const db = this.dbService.getDb()
    
    try {
      db.run('DELETE FROM file_access_history')
      this.dbService.saveDatabase()
    } catch (error) {
      console.error('[RecentAccessService] Failed to clear all:', error)
      throw error
    }
  }

  /**
   * 删除单条访问记录
   * @param id - 记录 ID
   */
  async removeItem(id: number): Promise<void> {
    const db = this.dbService.getDb()
    
    try {
      db.run('DELETE FROM file_access_history WHERE id = ?', [id])
      this.dbService.saveDatabase()
    } catch (error) {
      console.error('[RecentAccessService] Failed to remove item:', error)
      throw error
    }
  }

  /**
   * 清理指定天数前的旧记录
   * @param days - 保留天数，默认 30 天
   * @returns 删除的记录数
   */
  async cleanupOldRecords(days: number = 30): Promise<number> {
    const db = this.dbService.getDb()
    
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - days)

      db.run(
        'DELETE FROM file_access_history WHERE accessed_at < ?',
        [cutoffDate.toISOString()]
      )

      this.dbService.saveDatabase()

      const result = db.exec('SELECT changes()')
      return result[0].values[0][0]
    } catch (error) {
      console.error('[RecentAccessService] Failed to cleanup:', error)
      return 0
    }
  }

  /**
   * 获取访问统计信息
   * @returns 统计数据
   */
  async getStats(): Promise<{
    total: number
    today: number
    thisWeek: number
    mostAccessedPaths: Array<{ path: string; count: number }>
  }> {
    const db = this.dbService.getDb()
    
    try {
      const totalResult = db.exec('SELECT COUNT(*) as count FROM file_access_history')
      const total = totalResult[0].values[0][0]

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayResult = db.exec(
        'SELECT COUNT(*) as count FROM file_access_history WHERE accessed_at >= ?',
        [today.toISOString()]
      )
      const todayCount = todayResult[0].values[0][0]

      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      const weekResult = db.exec(
        'SELECT COUNT(*) as count FROM file_access_history WHERE accessed_at >= ?',
        [weekAgo.toISOString()]
      )
      const weekCount = weekResult[0].values[0][0]

      const pathsResult = db.exec(`
        SELECT path, COUNT(*) as count 
        FROM file_access_history 
        GROUP BY path 
        ORDER BY count DESC 
        LIMIT 10
      `)
      
      let mostAccessedPaths: Array<{ path: string; count: number }> = []
      if (pathsResult.length > 0) {
        const columns = pathsResult[0].columns
        mostAccessedPaths = pathsResult[0].values.map((row: any[]) => ({
          path: row[columns.indexOf('path')],
          count: row[columns.indexOf('count')]
        }))
      }

      return {
        total,
        today: todayCount,
        thisWeek: weekCount,
        mostAccessedPaths
      }
    } catch (error) {
      console.error('[RecentAccessService] Failed to get stats:', error)
      throw error
    }
  }
}
