/**
 * API 相关常量
 */

export const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000'

export const API_ENDPOINTS = {
  SEARCH: {
    FILES: '/api/search/files',
    CONTENT: '/api/search/content'
  },
  CONFIG: {
    SEARCH_HISTORY: '/api/config/search-history',
    EXCLUDE_RULES: '/api/config/exclude-rules',
    DEBUG_LOG: '/api/config/debug-log'
  }
} as const

export const DEFAULT_PAGE_SIZE = 50
export const MAX_HISTORY_ITEMS = 20
