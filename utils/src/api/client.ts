/**
 * API 客户端
 * 统一封装 HTTP 请求和 Electron IPC 调用
 */

/**
 * 判断是否为开发环境
 */
const isDev = (import.meta as any).env?.DEV

/**
 * API 基础 URL
 * 开发环境使用相对路径(通过 Vite 代理)
 * 生产环境使用完整 URL
 */
const API_BASE_URL = isDev ? '' : ((import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000')

import { isElectron } from '../utils/env'

/**
 * 需要跳过日志记录的接口路径
 */
const SKIP_LOG_PATHS = ['/api/dev-error-log', '/api/dev-error-logs']

/**
 * 响应体最大存储大小 (10KB)
 */
const MAX_BODY_SIZE = 10240

/**
 * 开发环境错误日志上报 (fire-and-forget, 不阻塞主流程)
 */
async function recordDevError(
  url: string,
  method: string,
  requestBody: any,
  response: Response
): Promise<void> {
  try {
    let responseBody: string
    try {
      const json = await response.clone().json()
      responseBody = JSON.stringify(json)
    } catch {
      responseBody = await response.clone().text()
    }

    if (responseBody.length > MAX_BODY_SIZE) {
      responseBody = responseBody.substring(0, MAX_BODY_SIZE) + '[...TRUNCATED]'
    }

    fetch(`${API_BASE_URL}/api/dev-error-log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        method,
        request_body: requestBody ? String(requestBody) : null,
        response_status: response.status,
        response_body: responseBody,
        error_message: `HTTP ${response.status}: ${response.statusText}`
      })
    }).catch(() => {})
  } catch {
    /** 静默处理, 不影响主流程 */
  }
}

/**
 * HTTP 请求封装
 */
export async function httpRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  })

  if (!response.ok) {
    /** 开发环境: 异步上报错误日志 (排除自身接口防止循环) */
    if (isDev && !SKIP_LOG_PATHS.some(p => path.includes(p))) {
      recordDevError(url, options.method || 'GET', options.body, response).catch(() => {})
    }
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Electron IPC 调用封装
 */
function electronInvoke<T>(channel: string, ...args: any[]): Promise<T> {
  const electronAPI = (window as any).electronAPI
  if (!electronAPI || !electronAPI[channel]) {
    throw new Error(`Electron API channel not found: ${channel}`)
  }
  return electronAPI[channel](...args)
}

/**
 * 请求配置接口
 */
export interface RequestConfig {
  path: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: any
  params?: Record<string, string | number | boolean | undefined>
}

/**
 * Electron 配置接口
 */
export interface ElectronConfig {
  channel: string
  args?: any[]
}

/**
 * 统一请求方法
 * 自动判断环境并使用合适的调用方式
 */
export async function request<T>(
  httpConfig: RequestConfig,
  electronConfig?: ElectronConfig
): Promise<T> {
  let url = httpConfig.path
  if (httpConfig.params) {
    const params = new URLSearchParams()
    Object.entries(httpConfig.params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value))
      }
    })
    const queryString = params.toString()
    if (queryString) {
      url += `?${queryString}`
    }
  }

  if (isElectron() && electronConfig) {
    return electronInvoke(electronConfig.channel, ...(electronConfig.args || []))
  }

  return httpRequest(url, {
    method: httpConfig.method || 'GET',
    body: httpConfig.body ? JSON.stringify(httpConfig.body) : undefined
  })
}
