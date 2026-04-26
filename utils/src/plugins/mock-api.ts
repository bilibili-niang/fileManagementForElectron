// Mock API implementation - no external dependencies needed

/**
 * 模拟配置数据
 */
const mockConfig = {
  mysql: {
    host: '',
    port: 3306,
    username: '',
    password: '',
    database: ''
  },
  indexing: {
    excludeC: true,
    excludeNodeModules: true,
    lastIndexed: null,
    schedule: '0 2 * * *'
  }
}

/**
 * 模拟文件计数数据
 */
const mockFileCounts = {
  total: 0,
  categories: {
    image: 0,
    document: 0,
    code: 0,
    video: 0,
    audio: 0,
    archive: 0,
    executable: 0,
    other: 0
  }
}

export function setupMockApi() {
  const isElectron = !!(window as any).electronAPI

  if (isElectron) {
    return
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let globalPollingActive = false

  ;(window as any).electronAPI = {
    windowMinimize: async () => { },
    windowMaximize: async () => { },
    windowClose: async () => { },
    windowIsMaximized: async () => false,

    onIndexProgress: (_callback: any) => {
    },

    onIndexComplete: (_callback: any) => {
    },

    onError: (_callback: any) => {
    },

    startIndex: async (drives: string[]) => {
      globalPollingActive = true
      return { success: true }
    },

    stopIndex: async () => {
      globalPollingActive = false
      return { success: true }
    },

    getIndexingProgress: async () => {
      return {
        isIndexing: globalPollingActive,
        progress: 0,
        currentPath: '',
        currentFile: '',
        totalFiles: 0,
        indexedFiles: 0
      }
    },

    searchFiles: async (query: string, _page: number, _pageSize: number, _options?: any) => {
      return { files: [], total: 0 }
    },

    searchFileContent: async (keyword: string, _page: number, _pageSize: number) => {
      return { files: [], total: 0 }
    },

    getFilesByCategory: async (category: string, _page: number, _pageSize: number) => {
      return { files: [], total: 0 }
    },

    getContentIndexStats: async () => {
      return { totalFiles: 0, indexedFiles: 0, lastIndexed: null }
    },

    getFileCounts: async () => {
      return mockFileCounts
    },

    loadConfig: async () => {
      return mockConfig
    },

    saveConfig: async (config: any) => {
      Object.assign(mockConfig, config)
      return { success: true }
    },

    testDatabaseConnection: async (_config: any) => {
      return { success: false, message: 'H5环境不支持数据库连接测试' }
    },

    openFile: async (_filePath: string) => {
      return { success: false, message: 'H5环境不支持打开文件' }
    },

    parseDocx: async (_filePath: string) => {
      return { success: false, message: 'H5环境不支持解析DOCX' }
    },

    saveFile: async (filePath: string, _content: string) => {
      return { success: false, message: 'H5环境不支持保存文件' }
    },

    showItemInFolder: async (_filePath: string) => {
      return { success: false, message: 'H5 environment does not support this feature' }
    },

    // Port management
    scanPorts: async (_ports: number[]) => {
      return { success: false, ports: [], message: 'H5环境不支持端口扫描' }
    },

    killProcess: async (_pid: number) => {
      return { success: false, message: 'H5环境不支持结束进程' }
    }
  }
}
