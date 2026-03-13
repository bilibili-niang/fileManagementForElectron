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
    console.log('Running in Electron environment')
    return
  }

  console.log('Setting up mock Electron API...')

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let globalPollingActive = false

  ;(window as any).electronAPI = {
    windowMinimize: async () => { console.log('Mock: windowMinimize') },
    windowMaximize: async () => { console.log('Mock: windowMaximize') },
    windowClose: async () => { console.log('Mock: windowClose') },
    windowIsMaximized: async () => false,

    onIndexProgress: (_callback: any) => {
      console.log('API: onIndexProgress registered')
    },

    onIndexComplete: (_callback: any) => {
      console.log('API: onIndexComplete registered')
    },

    onError: (_callback: any) => {
      console.log('API: onError registered')
    },

    startIndex: async (drives: string[]) => {
      console.log('API: startIndex called with drives:', drives)
      globalPollingActive = true
      return { success: true }
    },

    stopIndex: async () => {
      console.log('API: stopIndex called')
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

    searchFiles: async (query: string, _page: number, _pageSize: number, options?: any) => {
      console.log('API: searchFiles called with query:', query, 'options:', options)
      return { files: [], total: 0 }
    },

    searchFileContent: async (keyword: string, _page: number, _pageSize: number) => {
      console.log('API: searchFileContent called with keyword:', keyword)
      return { files: [], total: 0 }
    },

    getFilesByCategory: async (category: string, _page: number, _pageSize: number) => {
      console.log('API: getFilesByCategory called with category:', category)
      return { files: [], total: 0 }
    },

    getContentIndexStats: async () => {
      console.log('API: getContentIndexStats called')
      return { totalFiles: 0, indexedFiles: 0, lastIndexed: null }
    },

    getFileCounts: async () => {
      console.log('API: getFileCounts called')
      return mockFileCounts
    },

    loadConfig: async () => {
      console.log('API: loadConfig called')
      return mockConfig
    },

    saveConfig: async (_config: any) => {
      console.log('API: saveConfig called with config:', _config)
      Object.assign(mockConfig, _config)
      return { success: true }
    },

    testDatabaseConnection: async (_config: any) => {
      console.log('API: testDatabaseConnection called')
      return { success: false, message: 'H5环境不支持数据库连接测试' }
    },

    openFile: async (filePath: string) => {
      console.log('API: openFile called with path:', filePath)
      return { success: false, message: 'H5环境不支持打开文件' }
    },

    parseDocx: async (filePath: string) => {
      console.log('API: parseDocx called with path:', filePath)
      return { success: false, message: 'H5环境不支持解析DOCX' }
    },

    saveFile: async (filePath: string, _content: string) => {
      console.log('API: saveFile called with path:', filePath)
      return { success: false, message: 'H5环境不支持保存文件' }
    },

    showItemInFolder: async (filePath: string) => {
      console.log('API: showItemInFolder called with path:', filePath)
      return { success: false, message: 'H5 environment does not support this feature' }
    }
  }

  console.log('Mock Electron API setup complete')
}
