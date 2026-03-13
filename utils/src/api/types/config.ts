/**
 * 配置相关类型
 */

/**
 * 数据库配置
 */
export interface DatabaseConfig {
  type: 'sqlite' | 'mysql' | 'postgres'
  host?: string
  port?: number
  username?: string
  password?: string
  database?: string
  charset?: string
}

/**
 * 应用配置
 */
export interface AppConfig {
  database: DatabaseConfig
  drives: string[]
  excludeRules: ExcludeRule[]
}

/**
 * 排除规则
 */
export interface ExcludeRule {
  id?: number
  pattern: string
  type: 'file' | 'directory' | 'extension'
  enabled: boolean
}

/**
 * 调试日志项
 */
export interface DebugLogItem {
  id?: number
  component: string
  message: string
  data?: any
  created_at?: string
}

/**
 * 配置响应
 */
export interface ConfigResponse {
  success: boolean
  config?: AppConfig
  message?: string
}

/**
 * 数据库连接测试结果
 */
export interface DbTestResult {
  success: boolean
  message: string
}
