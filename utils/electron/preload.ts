import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  healthCheck: () => ipcRenderer.invoke('health-check'),
  onIndexProgress: (callback: (data: any) => void) => {
    ipcRenderer.on('index-progress', (_event, data) => callback(data))
  },
  onIndexComplete: (callback: (data: any) => void) => {
    ipcRenderer.on('index-complete', (_event, data) => callback(data))
  },
  onError: (callback: (data: any) => void) => {
    ipcRenderer.on('error', (_event, data) => callback(data))
  },
  startIndex: (roots: string[]) => ipcRenderer.invoke('start-index', roots),
  stopIndex: () => ipcRenderer.invoke('stop-index'),
  forceReindex: (roots: string[]) => ipcRenderer.invoke('force-reindex', roots),
  searchFiles: (query: string, page: number, pageSize: number) => 
    ipcRenderer.invoke('search-files', query, page, pageSize),
  getFilesByCategory: (category: string, page: number, pageSize: number) =>
    ipcRenderer.invoke('get-files-by-category', category, page, pageSize),
  getFileCounts: () => ipcRenderer.invoke('get-file-counts'),
  getFileOpenConfigs: () => ipcRenderer.invoke('get-file-open-configs'),
  getFileOpenConfig: (extension: string) => ipcRenderer.invoke('get-file-open-config', extension),
  saveFileOpenConfig: (payload: any) => ipcRenderer.invoke('save-file-open-config', payload),
  saveConfig: (config: any) => ipcRenderer.invoke('save-config', config),
  loadConfig: () => ipcRenderer.invoke('load-config'),
  testDatabaseConnection: (config: any) => ipcRenderer.invoke('test-database-connection', config),
  getScanRoots: () => ipcRenderer.invoke('get-scan-roots'),
  saveScanRoots: (roots: string[]) => ipcRenderer.invoke('save-scan-roots', roots),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  openFile: (filePath: string) => ipcRenderer.invoke('open-file', filePath),
  showItemInFolder: (filePath: string) => ipcRenderer.invoke('show-item-in-folder', filePath),
  // 按时长搜索文件
  searchFilesByDuration: (minDuration?: number, maxDuration?: number, page?: number, pageSize?: number) =>
    ipcRenderer.invoke('search-files-by-duration', minDuration, maxDuration, page, pageSize),
  // 批量删除文件
  batchDeleteFiles: (fileIds: number[]) => ipcRenderer.invoke('batch-delete-files', fileIds),
})
