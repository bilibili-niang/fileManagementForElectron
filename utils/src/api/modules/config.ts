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
    return request({ path: '/api/health' })
  },

  /**
   * 获取计算器历史
   */
  async getCalculatorHistory(limit: number = 50): Promise<{ success: boolean; history: any[] }> {
    return request({ path: `/api/config/calculator-history?limit=${limit}` })
  },

  /**
   * 添加计算器历史
   */
  async addCalculatorHistory(expression: string, result: string): Promise<{ success: boolean }> {
    return request({
      path: '/api/config/calculator-history',
      method: 'POST',
      body: { expression, result }
    })
  },

  /**
   * 删除计算器历史
   */
  async deleteCalculatorHistory(id: number): Promise<{ success: boolean }> {
    return request({
      path: `/api/config/calculator-history/${id}`,
      method: 'DELETE'
    })
  },

  /**
   * 清除计算器历史
   */
  async clearCalculatorHistory(): Promise<{ success: boolean }> {
    return request({
      path: '/api/config/calculator-history',
      method: 'DELETE'
    })
  },

  /**
   * 获取二维码配置
   */
  async getQrcodeConfig(): Promise<{ success: boolean; config: any }> {
    return request({ path: '/api/config/qrcode-config' })
  },

  /**
   * 保存二维码配置
   */
  async saveQrcodeConfig(config: {
    base_url?: string
    time_api_url?: string
    append_time?: boolean
    qr_size?: number
    error_correction_level?: string
  }): Promise<{ success: boolean }> {
    return request({
      path: '/api/config/qrcode-config',
      method: 'POST',
      body: config
    })
  },

  /**
   * 获取二维码历史
   */
  async getQrcodeHistory(limit: number = 50): Promise<{ success: boolean; history: any[] }> {
    return request({ path: `/api/config/qrcode-history?limit=${limit}` })
  },

  /**
   * 添加二维码历史
   */
  async addQrcodeHistory(history: {
    base_url: string
    time_api_url?: string
    generated_url: string
    append_time: boolean
    qr_size: number
    error_correction_level: string
  }): Promise<{ success: boolean; id: number }> {
    return request({
      path: '/api/config/qrcode-history',
      method: 'POST',
      body: history
    })
  },

  /**
   * 删除二维码历史
   */
  async deleteQrcodeHistory(id: number): Promise<{ success: boolean }> {
    return request({
      path: `/api/config/qrcode-history/${id}`,
      method: 'DELETE'
    })
  },

  /**
   * 清除二维码历史
   */
  async clearQrcodeHistory(): Promise<{ success: boolean }> {
    return request({
      path: '/api/config/qrcode-history',
      method: 'DELETE'
    })
  },

  /**
   * 获取所有倒计时
   */
  async getCountdowns(): Promise<{ success: boolean; countdowns: any[] }> {
    return request({ path: '/api/config/countdowns' })
  },

  /**
   * 添加倒计时
   */
  async addCountdown(countdown: {
    title: string
    date: string | null
    time: string | null
    repeat: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'
  }): Promise<{ success: boolean; id: number }> {
    return request({
      path: '/api/config/countdowns',
      method: 'POST',
      body: countdown
    })
  },

  /**
   * 更新倒计时
   */
  async updateCountdown(id: number, countdown: {
    title?: string
    date?: string | null
    time?: string | null
    repeat?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'
  }): Promise<{ success: boolean }> {
    return request({
      path: `/api/config/countdowns/${id}`,
      method: 'PUT',
      body: countdown
    })
  },

  /**
   * 删除倒计时
   */
  async deleteCountdown(id: number): Promise<{ success: boolean }> {
    return request({
      path: `/api/config/countdowns/${id}`,
      method: 'DELETE'
    })
  },

  /**
   * 获取所有 API 文档列表
   */
  async getApiDocs(): Promise<{ success: boolean; docs: any[] }> {
    return request({ path: '/api/config/api-docs' })
  },

  /**
   * 获取单个 API 文档
   */
  async getApiDocById(id: number): Promise<{ success: boolean; doc: any }> {
    return request({ path: `/api/config/api-docs/${id}` })
  },

  /**
   * 添加 API 文档
   */
  async addApiDoc(data: {
    name: string
    source_file?: string
    openapi_data: string
  }): Promise<{ success: boolean; id: number }> {
    return request({
      path: '/api/config/api-docs',
      method: 'POST',
      body: data
    })
  },

  /**
   * 更新 API 文档
   */
  async updateApiDoc(id: number, data: {
    name?: string
    source_file?: string
    openapi_data?: string
  }): Promise<{ success: boolean }> {
    return request({
      path: `/api/config/api-docs/${id}`,
      method: 'PUT',
      body: data
    })
  },

  /**
   * 删除 API 文档
   */
  async deleteApiDoc(id: number): Promise<{ success: boolean }> {
    return request({
      path: `/api/config/api-docs/${id}`,
      method: 'DELETE'
    })
  }
}
