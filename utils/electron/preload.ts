import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  onIndexProgress: (callback: (data: any) => void) => {
    ipcRenderer.on('index-progress', (_event, data) => callback(data))
  },
  onIndexComplete: (callback: (data: any) => void) => {
    ipcRenderer.on('index-complete', (_event, data) => callback(data))
  },
  onError: (callback: (data: any) => void) => {
    ipcRenderer.on('error', (_event, data) => callback(data))
  },
  startIndex: (drives: string[]) => ipcRenderer.invoke('start-index', drives),
  stopIndex: () => ipcRenderer.invoke('stop-index'),
  searchFiles: (query: string, page: number, pageSize: number, options?: any) => 
    ipcRenderer.invoke('search-files', query, page, pageSize, options),
  getFilesByCategory: (category: string, page: number, pageSize: number) =>
    ipcRenderer.invoke('get-files-by-category', category, page, pageSize),
  getFileCounts: () => ipcRenderer.invoke('get-file-counts'),
  saveConfig: (config: any) => ipcRenderer.invoke('save-config', config),
  loadConfig: () => ipcRenderer.invoke('load-config'),
  testDatabaseConnection: (config: any) => ipcRenderer.invoke('test-database-connection', config),
  openFile: (filePath: string) => ipcRenderer.invoke('open-file', filePath),
  showItemInFolder: (filePath: string) => ipcRenderer.invoke('show-item-in-folder', filePath)
})
