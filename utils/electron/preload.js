const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // Environment flag
  isElectron: true,
  
  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // Window controls
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),
  windowIsMaximized: () => ipcRenderer.invoke('window-is-maximized'),

  // File operations
  openFile: (filePath) => ipcRenderer.invoke('open-file', filePath),
  showItemInFolder: (filePath) => ipcRenderer.invoke('show-item-in-folder', filePath),

  // Config
  loadConfig: () => ipcRenderer.invoke('load-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  testDatabaseConnection: (config) => ipcRenderer.invoke('test-database-connection', config),

  // Indexing
  startIndex: (drives) => ipcRenderer.invoke('start-index', drives),
  stopIndex: () => ipcRenderer.invoke('stop-index'),
  getIndexingProgress: () => ipcRenderer.invoke('get-indexing-progress'),

  // Search
  searchFiles: (query, page, pageSize, options) => ipcRenderer.invoke('search-files', query, page, pageSize, options),
  searchFileContent: (keyword, page, pageSize) => ipcRenderer.invoke('search-file-content', keyword, page, pageSize),
  getFilesByCategory: (category, page, pageSize) => ipcRenderer.invoke('get-files-by-category', category, page, pageSize),
  getFileCounts: () => ipcRenderer.invoke('get-file-counts'),
  getContentIndexStats: () => ipcRenderer.invoke('get-content-index-stats'),

  // File content
  parseDocx: (filePath) => ipcRenderer.invoke('parse-docx', filePath),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  saveFile: (filePath, content) => ipcRenderer.invoke('save-file', filePath, content),

  // Exclude rules
  getExcludeRules: () => ipcRenderer.invoke('get-exclude-rules'),
  addExcludeRule: (rule) => ipcRenderer.invoke('add-exclude-rule', rule),
  updateExcludeRule: (id, updates) => ipcRenderer.invoke('update-exclude-rule', id, updates),
  deleteExcludeRule: (id) => ipcRenderer.invoke('delete-exclude-rule', id),
  testExcludeRule: (pattern, isRegex, testPath) => ipcRenderer.invoke('test-exclude-rule', pattern, isRegex, testPath),

  // Search history
  getSearchHistory: (limit, type) => ipcRenderer.invoke('get-search-history', limit, type),
  getSearchSuggestions: (query, limit) => ipcRenderer.invoke('get-search-suggestions', query, limit),
  addSearchHistory: (query, searchType, resultCount) => ipcRenderer.invoke('add-search-history', query, searchType, resultCount),
  clearSearchHistory: () => ipcRenderer.invoke('clear-search-history'),
  deleteSearchHistory: (id) => ipcRenderer.invoke('delete-search-history', id),

  // Debug log
  addDebugLog: (component, message, data) => ipcRenderer.invoke('add-debug-log', component, message, data),

  // Clipboard
  onClipboardChange: (callback) => ipcRenderer.on('clipboard-change', (_event, data) => callback(data)),
  writeClipboardText: (text) => ipcRenderer.invoke('write-clipboard-text', text),
  removeClipboardListener: (channel) => ipcRenderer.removeAllListeners(channel),

  // Port management
  scanPorts: (ports) => ipcRenderer.invoke('scan-ports', ports),
  killProcess: (pid) => ipcRenderer.invoke('kill-process', pid),

  // Listeners
  onIndexProgress: (callback) => ipcRenderer.on('index-progress', callback),
  onIndexComplete: (callback) => ipcRenderer.on('index-complete', callback),
  onError: (callback) => ipcRenderer.on('index-error', callback),
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
})
