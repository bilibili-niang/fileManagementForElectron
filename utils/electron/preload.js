const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  healthCheck: () => ipcRenderer.invoke('health-check'),

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
  getScanRoots: () => ipcRenderer.invoke('get-scan-roots'),
  saveScanRoots: (roots) => ipcRenderer.invoke('save-scan-roots', roots),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),

  // Indexing
  startIndex: (drives) => ipcRenderer.invoke('start-index', drives),
  stopIndex: () => ipcRenderer.invoke('stop-index'),
  getIndexingProgress: () => ipcRenderer.invoke('get-indexing-progress'),
  forceReindex: (roots) => ipcRenderer.invoke('force-reindex', roots),

  // Search
  searchFiles: (query, page, pageSize, options) => ipcRenderer.invoke('search-files', query, page, pageSize, options),
  searchFileContent: (keyword, page, pageSize) => ipcRenderer.invoke('search-file-content', keyword, page, pageSize),
  getFilesByCategory: (category, page, pageSize) => ipcRenderer.invoke('get-files-by-category', category, page, pageSize),
  getFileCounts: () => ipcRenderer.invoke('get-file-counts'),
  getFileOpenConfigs: () => ipcRenderer.invoke('get-file-open-configs'),
  getFileOpenConfig: (extension) => ipcRenderer.invoke('get-file-open-config', extension),
  saveFileOpenConfig: (payload) => ipcRenderer.invoke('save-file-open-config', payload),
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

  // Listeners
  onIndexProgress: (callback) => ipcRenderer.on('index-progress', callback),
  onIndexComplete: (callback) => ipcRenderer.on('index-complete', callback),
  onError: (callback) => ipcRenderer.on('index-error', callback),
  onBackendReady: (callback) => ipcRenderer.on('backend-ready', callback),
  onBackendError: (callback) => ipcRenderer.on('backend-error', callback),
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
})
