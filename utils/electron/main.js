const { app, BrowserWindow, ipcMain, shell, dialog, screen } = require('electron')
const path = require('path')
const http = require('http')
const { spawn } = require('child_process')

let mainWindow = null
let backendProcess = null
let store = null

// 初始化 electron-store (动态导入 ES Module)
async function initStore() {
  const { default: Store } = await import('electron-store')
  store = new Store({
    name: 'window-state',
    defaults: {
      windowState: null
    }
  })
}

// API 配置
const API_HOST = 'localhost'
let API_PORT = 3000

/**
 * 发送 HTTP 请求到后端服务
 */
function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: API_HOST,
      port: API_PORT,
      ...options
    }, (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data)
          resolve(jsonData)
        } catch (e) {
          resolve(data)
        }
      })
    })

    req.on('error', (error) => {
      reject(error)
    })

    if (postData) {
      req.write(JSON.stringify(postData))
    }
    req.end()
  })
}

/**
 * 检查后端服务是否就绪
 * @param {number} timeoutMs 超时时间（毫秒）
 */
function checkBackendReady(port = API_PORT, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now()
    let attemptCount = 0

    const check = () => {
      attemptCount++
      
      // 检查是否超时
      if (Date.now() - startTime > timeoutMs) {
        reject(new Error('Backend service startup timeout'))
        return
      }

      const req = http.request({
        hostname: API_HOST,
        port,
        path: '/api/health',
        method: 'GET',
        timeout: 2000
      }, (res) => {
        let data = ''
        res.on('data', (chunk) => {
          data += chunk
        })
        res.on('end', () => {
          if (res.statusCode !== 200) {
            setTimeout(check, 500)
            return
          }

          try {
            const json = JSON.parse(data)
            if (json && json.status === 'ok') {
              console.log('Backend service is ready')
              resolve(true)
              return
            }
          } catch (_e) {
          }

          setTimeout(check, 500)
        })
      })

      req.on('error', () => {
        // 每10次尝试输出一次日志
        if (attemptCount % 10 === 0) {
          console.log(`Waiting for backend... (${attemptCount} attempts)`)
        }
        setTimeout(check, 500)
      })

      req.on('timeout', () => {
        req.destroy()
        setTimeout(check, 500)
      })

      req.end()
    }

    check()
  })
}

/**
 * 启动后端服务
 */
function startBackend() {
  return new Promise((resolve, reject) => {
    const isDev = !app.isPackaged
    const fs = require('fs')

    /**
     * 根据环境确定后端服务目录
     * 开发环境: ../server
     * 生产环境: resources/server (打包后的路径)
     */
    let serverDir
    if (isDev) {
      serverDir = path.join(__dirname, '../server')
    } else {
      // 生产环境: electron/main.js 在 app.asar 内或 resources/app 下
      serverDir = path.join(process.resourcesPath, 'server')
    }

    console.log('Starting backend server...')
    console.log('Environment:', isDev ? 'development' : 'production')
    console.log('Server directory:', serverDir)

    // 先检查后端是否已经在运行
    checkBackendReady(API_PORT, 1500).then(() => {
      console.log('Backend already running, skip spawn')
      resolve()
    }).catch(() => {
      // 后端未运行，需要启动
      if (isDev) {
        // 开发环境使用 tsx 启动
        const srcPath = path.join(serverDir, 'src/index.ts')
        if (!fs.existsSync(srcPath)) {
          reject(new Error(`Backend source not found: ${srcPath}`))
          return
        }

        console.log('Command: npx tsx watch src/index.ts')
        console.log('Server directory:', serverDir)
        // 使用 pnpm 直接运行 tsx，避免 npx 路径问题
        backendProcess = spawn('pnpm', ['exec', 'tsx', 'watch', 'src/index.ts'], {
          cwd: serverDir,
          stdio: 'pipe',
          windowsHide: true
        })
      } else {
        // 生产环境使用编译后的文件
        const distPath = path.join(serverDir, 'index.js')
        if (!fs.existsSync(distPath)) {
          reject(new Error(`Backend entry not found: ${distPath}`))
          return
        }

        console.log('Command: node index.js')
        backendProcess = spawn('node', [distPath], {
          cwd: serverDir,
          stdio: 'pipe'
        })
      }

      // 监听后端输出
      if (backendProcess.stdout) {
        backendProcess.stdout.on('data', (data) => {
          const output = data.toString().trim()
          console.log('[Backend]', output)
        })
      }

      if (backendProcess.stderr) {
        backendProcess.stderr.on('data', (data) => {
          console.error('[Backend Error]', data.toString().trim())
        })
      }

      backendProcess.on('error', (error) => {
        console.error('Failed to start backend process:', error)
        reject(error)
      })

      backendProcess.on('spawn', () => {
        console.log('Backend process spawned successfully')
      })

      backendProcess.on('exit', (code, signal) => {
        console.log(`Backend process exited with code ${code}, signal: ${signal}`)
        if (code !== 0 && code !== null) {
          console.error(`Backend server exited unexpectedly`)
        }
      })

      checkBackendReady(API_PORT).then(() => {
        console.log('Backend server started successfully')
        resolve()
      }).catch((error) => {
        console.error('Backend ready check failed:', error)
        reject(error)
      })
    })

    /**
     * 启动后端服务
     * 优先使用已编译的 dist/index.js，如果失败则尝试使用 tsx
     */
  })
}

/**
 * 停止后端服务
 */
function stopBackend() {
  if (backendProcess) {
    console.log('Stopping backend server...')
    backendProcess.kill()
    backendProcess = null
  }
}

/**
 * 从本地存储获取窗口状态
 * 如果没有持久化数据，返回 null
 */
function getWindowState() {
  try {
    if (!store) return null
    const state = store.get('windowState')
    if (state) {
      // 验证窗口状态是否在有效屏幕范围内
      const displays = screen.getAllDisplays()
      const isValidPosition = displays.some(display => {
        const { x, y, width, height } = display.bounds
        // 检查窗口是否在屏幕范围内（允许部分超出）
        return state.x >= x - state.width + 100 &&
               state.x < x + width - 100 &&
               state.y >= y - state.height + 100 &&
               state.y < y + height - 100
      })
      
      if (isValidPosition) {
        return state
      }
    }
  } catch (error) {
    console.error('获取窗口状态失败:', error)
  }
  return null
}

/**
 * 保存窗口状态到本地存储
 */
function saveWindowState(state) {
  try {
    if (!store) return
    store.set('windowState', state)
  } catch (error) {
    console.error('保存窗口状态失败:', error)
  }
}

/**
 * 获取主屏幕的默认窗口尺寸（屏幕尺寸的 80%）
 */
function getDefaultWindowSize() {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.workAreaSize
  
  // 默认窗口尺寸为屏幕的 80%
  const defaultWidth = Math.floor(width * 0.8)
  const defaultHeight = Math.floor(height * 0.8)
  
  return {
    width: defaultWidth,
    height: defaultHeight
  }
}

/**
 * 创建窗口
 */
function createWindow() {
  // 获取保存的窗口状态
  const savedState = getWindowState()
  
  // 获取默认窗口尺寸（基于主屏幕）
  const defaultSize = getDefaultWindowSize()

  const windowOptions = {
    width: defaultSize.width,
    height: defaultSize.height,
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  }

  // 如果有保存的状态,使用保存的状态
  if (savedState) {
    windowOptions.width = savedState.width || defaultSize.width
    windowOptions.height = savedState.height || defaultSize.height
    windowOptions.x = savedState.x
    windowOptions.y = savedState.y
  }

  mainWindow = new BrowserWindow(windowOptions)

  // 恢复最大化或全屏状态
  if (savedState) {
    if (savedState.is_fullscreen) {
      mainWindow.setFullScreen(true)
    } else if (savedState.is_maximized) {
      mainWindow.maximize()
    }
  }

  // 使用 app.isPackaged 判断是否为开发环境
  if (!app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173')
    // 开发环境默认打开开发者工具
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // 窗口状态变化时保存
  const saveCurrentState = () => {
    const bounds = mainWindow.getBounds()
    const state = {
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      is_maximized: mainWindow.isMaximized(),
      is_fullscreen: mainWindow.isFullScreen()
    }
    saveWindowState(state)
  }

  // 监听窗口状态变化事件
  mainWindow.on('resize', saveCurrentState)
  mainWindow.on('move', saveCurrentState)
  mainWindow.on('maximize', saveCurrentState)
  mainWindow.on('unmaximize', saveCurrentState)
  mainWindow.on('enter-full-screen', saveCurrentState)
  mainWindow.on('leave-full-screen', saveCurrentState)

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(async () => {
  // 初始化 store
  await initStore()

  // 立即创建窗口，不等待后端
  createWindow()

  // 异步启动后端服务
  startBackend().then(() => {
    console.log('Backend server started successfully')
    // 通知渲染进程后端已就绪
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('backend-ready')
    }
  }).catch((error) => {
    console.error('Failed to start backend:', error)
    // 通知渲染进程后端启动失败
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('backend-error', error.message)
    }
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  stopBackend()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  stopBackend()
})

// ==================== IPC Handlers ====================

ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})

ipcMain.handle('health-check', async () => {
  try {
    return await makeRequest({ path: '/api/health', method: 'GET' })
  } catch (error) {
    console.error('Health check error:', error)
    return { status: 'error' }
  }
})

// Config API
ipcMain.handle('load-config', async () => {
  try {
    return await makeRequest({ path: '/api/config', method: 'GET' })
  } catch (error) {
    console.error('Load config error:', error)
    return null
  }
})

ipcMain.handle('save-config', async (_event, config) => {
  try {
    const result = await makeRequest({
      path: '/api/config',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, config)
    return result
  } catch (error) {
    console.error('Save config error:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

ipcMain.handle('test-database-connection', async (_event, config) => {
  try {
    const result = await makeRequest({
      path: '/api/config/test-db',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, config)
    return result
  } catch (error) {
    console.error('Test DB connection error:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

ipcMain.handle('get-scan-roots', async () => {
  try {
    const result = await makeRequest({ path: '/api/config/scan-roots', method: 'GET' })
    if (result && result.error) {
      throw new Error(result.error)
    }
    return result
  } catch (error) {
    console.error('Get scan roots error:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error), roots: [] }
  }
})

ipcMain.handle('save-scan-roots', async (_event, roots) => {
  try {
    const result = await makeRequest({
      path: '/api/config/scan-roots',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { roots })
    if (result && result.error) {
      throw new Error(result.error)
    }
    return result
  } catch (error) {
    console.error('Save scan roots error:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

ipcMain.handle('select-directory', async () => {
  try {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })
    if (result.canceled) return null
    return result.filePaths && result.filePaths[0] ? result.filePaths[0] : null
  } catch (error) {
    console.error('Select directory error:', error)
    return null
  }
})

// Indexing API
ipcMain.handle('start-index', async (_event, roots) => {
  try {
    const result = await makeRequest({
      path: '/api/files/index/start',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { roots })
    if (result && result.error) {
      throw new Error(result.error)
    }
    return result
  } catch (error) {
    console.error('Start index error:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

ipcMain.handle('stop-index', async () => {
  try {
    return await makeRequest({
      path: '/api/files/index/stop',
      method: 'POST'
    })
  } catch (error) {
    console.error('Stop index error:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

ipcMain.handle('get-indexing-progress', async () => {
  try {
    return await makeRequest({ path: '/api/files/index/progress', method: 'GET' })
  } catch (error) {
    console.error('Get progress error:', error)
    return { isIndexing: false, progress: 0 }
  }
})

ipcMain.handle('force-reindex', async (_event, roots) => {
  try {
    return await makeRequest({
      path: '/api/files/force-reindex',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { roots })
  } catch (error) {
    console.error('Force reindex error:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

// Search API
ipcMain.handle('search-files', async (_event, query, page, pageSize, options) => {
  try {
    const params = new URLSearchParams({
      q: query,
      page: String(page),
      pageSize: String(pageSize),
      ...(options || {})
    })
    return await makeRequest({ path: `/api/files/search?${params.toString()}`, method: 'GET' })
  } catch (error) {
    console.error('Search files error:', error)
    return { files: [], total: 0 }
  }
})

ipcMain.handle('search-file-content', async (_event, keyword, page, pageSize) => {
  try {
    const params = new URLSearchParams({
      keyword,
      page: String(page),
      pageSize: String(pageSize)
    })
    return await makeRequest({ path: `/api/files/search-content?${params.toString()}`, method: 'GET' })
  } catch (error) {
    console.error('Search content error:', error)
    return { files: [], total: 0 }
  }
})

ipcMain.handle('get-files-by-category', async (_event, category, page, pageSize) => {
  try {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
    return await makeRequest({ path: `/api/files/category/${encodeURIComponent(category)}?${params.toString()}`, method: 'GET' })
  } catch (error) {
    console.error('Get files by category error:', error)
    return { files: [], total: 0 }
  }
})

ipcMain.handle('get-file-counts', async () => {
  try {
    return await makeRequest({ path: '/api/files/counts', method: 'GET' })
  } catch (error) {
    console.error('Get file counts error:', error)
    return {}
  }
})

ipcMain.handle('get-file-open-configs', async () => {
  try {
    return await makeRequest({ path: '/api/files/open-configs', method: 'GET' })
  } catch (error) {
    console.error('Get file open configs error:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error), configs: [] }
  }
})

ipcMain.handle('get-file-open-config', async (_event, extension) => {
  try {
    return await makeRequest({ path: `/api/files/open-config/${encodeURIComponent(extension)}`, method: 'GET' })
  } catch (error) {
    console.error('Get file open config error:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error), config: null }
  }
})

ipcMain.handle('save-file-open-config', async (_event, payload) => {
  try {
    return await makeRequest({
      path: '/api/files/open-config',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, payload)
  } catch (error) {
    console.error('Save file open config error:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

// File operations
ipcMain.handle('open-file', async (_event, filePath) => {
  try {
    await shell.openPath(filePath)
    return { success: true }
  } catch (error) {
    console.error('Open file error:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

ipcMain.handle('show-item-in-folder', async (_event, filePath) => {
  try {
    await shell.showItemInFolder(filePath)
    return { success: true }
  } catch (error) {
    console.error('Show item in folder error:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

// ==================== 排除规则 API ====================

ipcMain.handle('get-exclude-rules', async () => {
  try {
    return await makeRequest({ path: '/api/config/exclude-rules', method: 'GET' })
  } catch (error) {
    console.error('Get exclude rules error:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

ipcMain.handle('add-exclude-rule', async (_event, rule) => {
  try {
    return await makeRequest({
      path: '/api/config/exclude-rules',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, rule)
  } catch (error) {
    console.error('Add exclude rule error:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

ipcMain.handle('update-exclude-rule', async (_event, id, updates) => {
  try {
    return await makeRequest({
      path: `/api/config/exclude-rules/${id}`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }, updates)
  } catch (error) {
    console.error('Update exclude rule error:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

ipcMain.handle('delete-exclude-rule', async (_event, id) => {
  try {
    return await makeRequest({ path: `/api/config/exclude-rules/${id}`, method: 'DELETE' })
  } catch (error) {
    console.error('Delete exclude rule error:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

ipcMain.handle('test-exclude-rule', async (_event, data) => {
  try {
    return await makeRequest({
      path: '/api/config/exclude-rules/test',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, data)
  } catch (error) {
    console.error('Test exclude rule error:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

// ==================== 窗口控制 API ====================

ipcMain.handle('window-minimize', () => {
  if (mainWindow) mainWindow.minimize()
})

ipcMain.handle('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
  }
})

ipcMain.handle('window-close', () => {
  if (mainWindow) mainWindow.close()
})

ipcMain.handle('window-is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false
})

// ==================== 内容索引统计 API ====================

ipcMain.handle('get-content-index-stats', async () => {
  try {
    return await makeRequest({ path: '/api/files/content-stats', method: 'GET' })
  } catch (error) {
    console.error('Get content index stats error:', error)
    return { totalFiles: 0, indexedFiles: 0 }
  }
})

// ==================== 搜索历史 API ====================

ipcMain.handle('get-search-history', async (_event, limit = 20, type) => {
  try {
    const params = new URLSearchParams({ limit: String(limit) })
    // 只添加非空的 type 参数
    if (type && type.trim() !== '') {
      params.append('type', type.trim())
    }
    return await makeRequest({ path: `/api/config/search-history?${params.toString()}`, method: 'GET' })
  } catch (error) {
    console.error('Get search history error:', error)
    return { success: false, history: [] }
  }
})

ipcMain.handle('get-search-suggestions', async (_event, query, limit = 10) => {
  try {
    const params = new URLSearchParams({ query, limit: String(limit) })
    return await makeRequest({ path: `/api/config/search-suggestions?${params.toString()}`, method: 'GET' })
  } catch (error) {
    console.error('Get search suggestions error:', error)
    return { success: false, suggestions: [] }
  }
})

ipcMain.handle('add-search-history', async (_event, query, searchType, resultCount) => {
  try {
    return await makeRequest({
      path: '/api/config/search-history',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { query, search_type: searchType, result_count: resultCount })
  } catch (error) {
    console.error('Add search history error:', error)
    return { success: false }
  }
})

ipcMain.handle('clear-search-history', async () => {
  try {
    return await makeRequest({ path: '/api/config/search-history', method: 'DELETE' })
  } catch (error) {
    console.error('Clear search history error:', error)
    return { success: false }
  }
})

ipcMain.handle('delete-search-history', async (_event, id) => {
  try {
    return await makeRequest({ path: `/api/config/search-history/${id}`, method: 'DELETE' })
  } catch (error) {
    console.error('Delete search history error:', error)
    return { success: false }
  }
})

// ==================== 文件内容操作 API ====================

ipcMain.handle('parse-docx', async (_event, filePath) => {
  try {
    return await makeRequest({ path: `/api/files/parse-docx?path=${encodeURIComponent(filePath)}`, method: 'GET' })
  } catch (error) {
    console.error('Parse docx error:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

ipcMain.handle('read-file', async (_event, filePath) => {
  try {
    return await makeRequest({ path: `/api/files/content?path=${encodeURIComponent(filePath)}`, method: 'GET' })
  } catch (error) {
    console.error('Read file error:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

ipcMain.handle('save-file', async (_event, filePath, content) => {
  try {
    return await makeRequest({
      path: '/api/files/save',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { path: filePath, content })
  } catch (error) {
    console.error('Save file error:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

// ==================== 调试日志 API ====================

ipcMain.handle('add-debug-log', async (_event, component, message, data) => {
  console.log(`[Debug] ${component}: ${message}`, data)
  return { success: true }
})
