/**
 * Electron API 类型声明
 */

export interface ElectronAPI {
  // 搜索
  searchFiles: (query: string, page: number, pageSize: number, options?: any) => Promise<any>
  searchFileContent: (query: string, page: number, pageSize: number) => Promise<any>

  // 文件操作
  openFile: (path: string) => Promise<void>
  openFileLocation: (path: string) => Promise<void>
  deleteFile: (path: string) => Promise<boolean>
  showItemInFolder: (path: string) => Promise<{ success: boolean; message?: string }>

  // 配置
  loadConfig: () => Promise<any>
  saveConfig: (config: any) => Promise<boolean>
  testDatabaseConnection: (config: any) => Promise<{ success: boolean; message?: string }>
  healthCheck: () => Promise<{ status: string }>
  getScanRoots: () => Promise<{ success: boolean; roots: string[]; error?: string }>
  saveScanRoots: (roots: string[]) => Promise<{ success: boolean; error?: string }>
  selectDirectory: () => Promise<string | null>

  // 历史记录
  getSearchHistory: (limit: number, type?: string) => Promise<any>
  addSearchHistory: (query: string, searchType: string, resultCount: number) => Promise<any>
  deleteSearchHistory: (id: number) => Promise<any>
  clearSearchHistory: () => Promise<any>

  // 索引
  startIndex: (roots: string[]) => Promise<any>
  stopIndex: () => Promise<any>
  forceReindex: (roots: string[]) => Promise<any>
  getIndexingProgress: () => Promise<any>
  onIndexProgress: (callback: (data: any) => void) => void
  onIndexComplete: (callback: (data: any) => void) => void
  onError: (callback: (error: any) => void) => void

  // 预览
  parseDocx: (path: string) => Promise<any>
  saveFile: (path: string, content: string) => Promise<any>
  getFileOpenConfigs: () => Promise<any>
  getFileOpenConfig: (extension: string) => Promise<any>
  saveFileOpenConfig: (payload: any) => Promise<any>

  // 窗口控制
  windowMinimize: () => Promise<void>
  windowMaximize: () => Promise<void>
  windowClose: () => Promise<void>
  windowIsMaximized: () => Promise<boolean>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
