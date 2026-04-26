import {isElectron} from '@/utils/env'

// API 服务配置
const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000'

// 通用请求封装
async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
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

// 搜索历史 API
export const searchHistoryApi = {
  // 获取搜索历史
  async getHistory(type?: string, limit: number = 20) {
    if (isElectron()) {
      return (window as any).electronAPI.getSearchHistory(limit, type)
    }
    const params = new URLSearchParams({ limit: String(limit) })
    if (type) params.append('type', type)
    return request(`/api/config/search-history?${params.toString()}`)
  },

  // 添加搜索历史
  async addHistory(query: string, searchType: string, resultCount: number) {
    if (isElectron()) {
      return (window as any).electronAPI.addSearchHistory(query, searchType, resultCount)
    }
    return request('/api/config/search-history', {
      method: 'POST',
      body: JSON.stringify({ query, search_type: searchType, result_count: resultCount })
    })
  },

  // 删除单条历史
  async deleteHistory(id: number) {
    if (isElectron()) {
      return (window as any).electronAPI.deleteSearchHistory(id)
    }
    return request(`/api/config/search-history/${id}`, { method: 'DELETE' })
  },

  // 清除全部历史
  async clearHistory() {
    if (isElectron()) {
      return (window as any).electronAPI.clearSearchHistory()
    }
    return request('/api/config/search-history', { method: 'DELETE' })
  }
}

// 调试日志 API
export const debugLogApi = {
  async addLog(component: string, message: string, data?: any) {
    if (isElectron()) {
      return (window as any).electronAPI.addDebugLog(component, message, data)
    }
    return request('/api/config/debug-log', {
      method: 'POST',
      body: JSON.stringify({ component, message, data })
    })
  }
}

// 排除规则 API
export const excludeRulesApi = {
  async getRules() {
    if (isElectron()) {
      return (window as any).electronAPI.getExcludeRules()
    }
    return request('/api/config/exclude-rules')
  },

  async addRule(rule: any) {
    if (isElectron()) {
      return (window as any).electronAPI.addExcludeRule(rule)
    }
    return request('/api/config/exclude-rules', {
      method: 'POST',
      body: JSON.stringify(rule)
    })
  },

  async updateRule(id: number, updates: any) {
    if (isElectron()) {
      return (window as any).electronAPI.updateExcludeRule(id, updates)
    }
    return request(`/api/config/exclude-rules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    })
  },

  async deleteRule(id: number) {
    if (isElectron()) {
      return (window as any).electronAPI.deleteExcludeRule(id)
    }
    return request(`/api/config/exclude-rules/${id}`, { method: 'DELETE' })
  }
}

/**
 * API 服务统一入口
 * 用于 HTTP 环境的 API 调用
 */
export const apiService = {
  // 搜索
  async searchFiles(query: string, page: number, pageSize: number, options?: any) {
    return request('/api/search/files', {
      method: 'POST',
      body: JSON.stringify({ query, page, pageSize, options })
    })
  },

  async searchFileContent(keyword: string, page: number, pageSize: number) {
    return request('/api/search/content', {
      method: 'POST',
      body: JSON.stringify({ keyword, page, pageSize })
    })
  },

  async getFilesByCategory(category: string, page: number, pageSize: number) {
    return request(`/api/files/category?category=${category}&page=${page}&pageSize=${pageSize}`)
  },

  // 索引
  async startIndexing(drives: string[]) {
    return request('/api/index/start', {
      method: 'POST',
      body: JSON.stringify({ drives })
    })
  },

  async stopIndexing() {
    return request('/api/index/stop', { method: 'POST' })
  },

  async getIndexingProgress() {
    return request('/api/index/progress')
  },

  async getContentIndexStats() {
    return request('/api/index/content-stats')
  },

  async getFileCounts() {
    return request('/api/files/counts')
  },

  // 配置
  async loadConfig() {
    return request('/api/config')
  },

  async saveConfig(config: any) {
    return request('/api/config', {
      method: 'POST',
      body: JSON.stringify(config)
    })
  },

  async testDatabaseConnection(config: any) {
    return request('/api/config/test-db', {
      method: 'POST',
      body: JSON.stringify(config)
    })
  },

  // 文件操作
  async openFile(filePath: string) {
    return request('/api/files/open', {
      method: 'POST',
      body: JSON.stringify({ filePath })
    })
  },

  async parseDocx(filePath: string) {
    return request('/api/files/parse-docx', {
      method: 'POST',
      body: JSON.stringify({ filePath })
    })
  },

  async saveFile(filePath: string, content: string) {
    return request('/api/files/save', {
      method: 'POST',
      body: JSON.stringify({ filePath, content })
    })
  },

  // 健康检查
  async healthCheck() {
    return request('/api/health')
  }
}
