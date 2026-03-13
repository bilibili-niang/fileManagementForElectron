/**
 * API 统一入口
 * 所有 API 相关模块和类型通过此处导出
 */

// 客户端
export { request, type RequestConfig, type ElectronConfig } from './client'

// 类型
export * from './types'

// API 模块
export { historyApi, searchApi, configApi, fileApi } from './modules'
