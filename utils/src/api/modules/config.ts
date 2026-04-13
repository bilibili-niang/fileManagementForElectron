import { request } from '../client'
import type {
  AppConfig,
  DbTestResult,
  ExcludeRule,
  DebugLogItem
} from '../types'

/**
 * 配置 API
 */
export const configApi = {
  /**
   * 加载配置
   */
  async loadConfig(): Promise<AppConfig> {
    return request(
      { path: '/api/config' },
      { channel: 'loadConfig' }
    )
  },

  /**
   * 保存配置
   * @param config - 配置对象
   */
  async saveConfig(config: AppConfig): Promise<{ success: boolean }> {
    return request(
      {
        path: '/api/config',
        method: 'POST',
        body: config
      },
      { channel: 'saveConfig', args: [config] }
    )
  },

  /**
   * 测试数据库连接
   * @param config - 数据库配置
   */
  async testDatabaseConnection(config: any): Promise<DbTestResult> {
    return request(
      {
        path: '/api/config/test-db',
        method: 'POST',
        body: config
      },
      { channel: 'testDatabaseConnection', args: [config] }
    )
  },

  /**
   * 获取排除规则
   */
  async getExcludeRules(): Promise<{ success: boolean; rules: ExcludeRule[] }> {
    return request(
      { path: '/api/config/exclude-rules' },
      { channel: 'getExcludeRules' }
    )
  },

  /**
   * 添加排除规则
   * @param rule - 规则对象
   */
  async addExcludeRule(rule: ExcludeRule): Promise<{ success: boolean }> {
    return request(
      {
        path: '/api/config/exclude-rules',
        method: 'POST',
        body: rule
      },
      { channel: 'addExcludeRule', args: [rule] }
    )
  },

  /**
   * 更新排除规则
   * @param id - 规则 ID
   * @param updates - 更新内容
   */
  async updateExcludeRule(id: number, updates: Partial<ExcludeRule>): Promise<{ success: boolean }> {
    return request(
      {
        path: `/api/config/exclude-rules/${id}`,
        method: 'PUT',
        body: updates
      },
      { channel: 'updateExcludeRule', args: [id, updates] }
    )
  },

  /**
   * 删除排除规则
   * @param id - 规则 ID
   */
  async deleteExcludeRule(id: number): Promise<{ success: boolean }> {
    return request(
      { path: `/api/config/exclude-rules/${id}`, method: 'DELETE' },
      { channel: 'deleteExcludeRule', args: [id] }
    )
  },

  /**
   * 添加调试日志
   * @param log - 日志项
   */
  async addDebugLog(log: DebugLogItem): Promise<{ success: boolean }> {
    return request(
      {
        path: '/api/config/debug-log',
        method: 'POST',
        body: log
      },
      { channel: 'addDebugLog', args: [log.component, log.message, log.data] }
    )
  },

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{ status: string }> {
    return request(
      { path: '/api/health' },
      { channel: 'healthCheck' }
    )
  }
}
