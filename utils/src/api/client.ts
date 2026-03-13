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

/**
 * 检查是否在 Electron 环境
 */
function isElectron(): boolean {
  return !!(window as any).electronAPI
}

/**
 * HTTP 请求封装
 */
async function httpRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  })

  if (!response.ok) {
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
  // 构建 URL
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

  // Electron 环境优先使用 IPC
  if (isElectron() && electronConfig) {
    return electronInvoke(electronConfig.channel, ...(electronConfig.args || []))
  }

  // HTTP 请求
  return httpRequest(url, {
    method: httpConfig.method || 'GET',
    body: httpConfig.body ? JSON.stringify(httpConfig.body) : undefined
  })
}
