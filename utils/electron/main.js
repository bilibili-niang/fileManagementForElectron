const { app, BrowserWindow, ipcMain, shell, clipboard } = require('electron')
const path = require('path')
const http = require('http')
const { spawn } = require('child_process')

// ==================== 剪贴板监控 ====================
let clipboardWatcher = null
let lastClipboardText = ''
let lastClipboardImage = null
let lastClipboardFiles = ''
let lastForegroundWindow = 'Unknown'

/**
 * 同步获取当前前台窗口标题（Windows）
 */
function getForegroundWindowTitleSync() {
  try {
    const { execSync } = require('child_process')
    const output = execSync(
      'powershell -NoProfile -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; (Get-Process | Where-Object { $_.MainWindowHandle -ne 0 } | Where-Object { $_.MainWindowTitle -ne \'\' } | Sort-Object -Property LastActiveTime -Descending | Select-Object -First 1).MainWindowTitle"',
      { encoding: 'utf8', timeout: 2000 }
    ).trim()
    return output || 'Unknown'
  } catch (error) {
    return 'Unknown'
  }
}

/**
 * 读取剪贴板中的文件列表（Windows）
 */
function readClipboardFiles() {
  try {
    // 检查剪贴板是否包含文件
    const formats = clipboard.availableFormats()
    if (!formats.includes('FileNameW')) {
      return null
    }

    // 读取文件列表
    const buffer = clipboard.readBuffer('FileNameW')
    if (!buffer || buffer.length === 0) {
      return null
    }

    // Windows 文件列表是以双 null 结尾的字符串数组
    const files = []
    let pos = 0
    while (pos < buffer.length - 1) {
      // 每个文件名以 null 结尾
      let end = pos
      while (end < buffer.length && buffer[end] !== 0) {
        end++
      }
      if (end > pos) {
        const filePath = buffer.slice(pos, end).toString('ucs2').replace(/\\/g, '/')
        if (filePath) {
          files.push(filePath)
        }
      }
      pos = end + 1
    }

    return files.length > 0 ? files.join('\n') : null
  } catch (error) {
    console.error('Read clipboard files error:', error)
    return null
  }
}

/**
 * 启动剪贴板监控
 */
function startClipboardWatcher() {
  if (clipboardWatcher) return

  lastClipboardText = clipboard.readText()
  lastClipboardImage = clipboard.readImage().toDataURL()
  lastClipboardFiles = readClipboardFiles() || ''
  lastForegroundWindow = ''

  // 每 1000ms 检查一次剪贴板变化
  clipboardWatcher = setInterval(() => {
    try {
      const currentText = clipboard.readText()
      const currentImage = clipboard.readImage()
      const currentFiles = readClipboardFiles()

      let newContent = null
      let contentType = null

      // 优先检查文件（文件复制优先级最高）
      if (currentFiles && currentFiles !== lastClipboardFiles) {
        newContent = currentFiles
        contentType = 'files'
        lastClipboardFiles = currentFiles
        lastForegroundWindow = getForegroundWindowTitleSync()
      }
      // 检查文本变化
      else if (currentText !== lastClipboardText) {
        newContent = currentText
        contentType = 'text'
        lastClipboardText = currentText
        lastForegroundWindow = getForegroundWindowTitleSync()
      }
      // 检查图片变化（只在前台窗口变化时检查图片，节省性能）
      else if (!currentImage.isEmpty()) {
        const currentImageData = currentImage.toDataURL()
        if (currentImageData !== lastClipboardImage) {
          newContent = currentImageData
          contentType = 'image'
          lastClipboardImage = currentImageData
          lastForegroundWindow = getForegroundWindowTitleSync()
        }
      }

      if (newContent && mainWindow) {
        mainWindow.webContents.send('clipboard-change', {
          content: newContent,
          type: contentType,
          sourceApp: lastForegroundWindow || 'Unknown',
          timestamp: Date.now()
        })
      }
    } catch (error) {
      // Silent fail for clipboard errors
    }
  }, 1000)
}

/**
 * 停止剪贴板监控
 */
function stopClipboardWatcher() {
  if (clipboardWatcher) {
    clearInterval(clipboardWatcher)
    clipboardWatcher = null
  }
}

let mainWindow = null
let backendProcess = null
let backendReadyLogged = false

// API 配置
const API_HOST = 'localhost'
const API_PORT = 3000

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
function checkBackendReady(timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now()

    const check = () => {
      // 检查是否超时
      if (Date.now() - startTime > timeoutMs) {
        reject(new Error('Backend service startup timeout'))
        return
      }

      const req = http.request({
        hostname: API_HOST,
        port: API_PORT,
        path: '/api/health',
        method: 'GET',
        timeout: 2000
      }, (res) => {
        if (res.statusCode === 200) {
          if (!backendReadyLogged) {
            console.log('Backend service is ready')
            backendReadyLogged = true
          }
          resolve(true)
        } else {
          setTimeout(check, 500)
        }
      })

      req.on('error', () => {
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

    /**
     * 启动后端服务
     * 优先使用已编译的 dist/index.js，如果失败则尝试使用 pnpm dev
     */
    const distPath = path.join(serverDir, 'dist', 'index.js')

    if (!isDev && fs.existsSync(distPath)) {
      // 生产环境：使用编译后的文件
      console.log('Command: node dist/index.js')
      backendProcess = spawn('node', [distPath], {
        cwd: serverDir,
        stdio: 'pipe'
      })
    } else {
      // 开发环境：使用源码运行
      console.log('Command: pnpm dev:quiet')
      backendProcess = spawn('pnpm', ['dev:quiet'], {
        cwd: serverDir,
        stdio: 'pipe',
        shell: true
      })
    }

    if (backendProcess) {
      backendProcess.stdout.on('data', (data) => {
        const output = data.toString().trim()
        console.log('[Backend]', output)
      })

      backendProcess.stderr.on('data', (data) => {
        console.error('[Backend Error]', data.toString().trim())
      })

      backendProcess.on('error', (error) => {
        console.error('Failed to start backend:', error)
        reject(error)
      })

      backendProcess.on('exit', (code) => {
        if (code !== 0 && code !== null) {
          console.error(`Backend server exited with code ${code}`)
        }
      })

      // 等待后端服务就绪
      checkBackendReady().then(() => {
        console.log('Backend server started successfully')
        resolve()
      })
    }
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
 * 从后端获取窗口状态
 */
async function getWindowState() {
  try {
    const result = await makeRequest({
      path: '/api/config/window-state',
      method: 'GET'
    })
    if (result && result.success) {
      return result.state
    }
  } catch (error) {
    console.error('Failed to get window state:', error)
  }
  return null
}

/**
 * 保存窗口状态到后端
 */
async function saveWindowState(state) {
  try {
    await makeRequest({
      path: '/api/config/window-state',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, state)
  } catch (error) {
    console.error('Failed to save window state:', error)
  }
}

/**
 * 创建窗口
 */
async function createWindow() {
  // 获取保存的窗口状态
  const savedState = await getWindowState()

  const windowOptions = {
    width: 1200,
    height: 800,
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
    windowOptions.width = savedState.width || 1200
    windowOptions.height = savedState.height || 800
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
    // 开发环境默认不打开开发者工具，需要时手动打开
    // mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // 窗口状态变化时保存
  const saveCurrentState = async () => {
    const bounds = mainWindow.getBounds()
    const state = {
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      is_maximized: mainWindow.isMaximized(),
      is_fullscreen: mainWindow.isFullScreen()
    }
    await saveWindowState(state)
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
    stopClipboardWatcher()
  })

  // 启动剪贴板监控
  startClipboardWatcher()
}

app.whenReady().then(async () => {
  // 开发模式下，后端服务由外部启动，这里不再重复启动
  // 仅检查后端是否就绪
  if (!app.isPackaged) {
    try {
      await checkBackendReady(5000) // 开发模式只等待5秒
      console.log('Backend service is ready')
    } catch (error) {
      console.log('Backend service not ready, will try to start...')
      try {
        await startBackend()
      } catch (e) {
        console.error('Failed to start backend:', e)
      }
    }
  } else {
    // 生产模式仍由 Electron 启动后端
    try {
      await startBackend()
    } catch (error) {
      console.error('Failed to start backend:', error)
    }
  }

  createWindow()

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

// Config API
ipcMain.handle('load-config', async () => {
  try {
    console.log('[Electron] load-config: calling backend API...')
    const result = await makeRequest({ path: '/api/config', method: 'GET' })
    console.log('[Electron] load-config: result:', result)
    return result
  } catch (error) {
    console.error('[Electron] Load config error:', error)
    return null
  }
})

ipcMain.handle('save-config', async (_event, config) => {
  try {
    console.log('[Electron] save-config: config:', config)
    const result = await makeRequest({
      path: '/api/config',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, config)
    console.log('[Electron] save-config: result:', result)
    return result
  } catch (error) {
    console.error('[Electron] Save config error:', error)
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

// Indexing API
ipcMain.handle('start-index', async (_event, drives) => {
  try {
    const result = await makeRequest({
      path: '/api/files/index/start',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { drives })
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

// Search API
ipcMain.handle('search-files', async (_event, query, page, pageSize, options) => {
  try {
    const params = new URLSearchParams({
      query: query,  // 修改为 'query' 以匹配后端期望
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

// ==================== 剪贴板 API ====================

ipcMain.handle('write-clipboard-text', (_event, text) => {
  try {
    clipboard.writeText(text)
    // 更新本地缓存，避免触发重复通知
    lastClipboardText = text
    return { success: true }
  } catch (error) {
    console.error('Write clipboard error:', error)
    return { success: false, error: error.message }
  }
})

// ==================== 端口管理 API ====================

// 扫描端口占用情况
ipcMain.handle('scan-ports', async (_event, ports) => {
  try {
    const { execSync } = require('child_process')
    const result = []

    for (const port of ports) {
      try {
        // 使用 netstat 获取端口信息
        const output = execSync('netstat -ano | findstr :' + port, { encoding: 'utf8', timeout: 5000 })
        const lines = output.trim().split('\n')

        for (const line of lines) {
          const parts = line.trim().split(/\s+/)
          if (parts.length >= 5) {
            const localAddress = parts[1]
            const state = parts[3] || 'UNKNOWN'
            const pid = parseInt(parts[4], 10)

            if (!isNaN(pid) && pid > 0) {
              // 获取进程名称
              let processName = ''
              try {
                const taskOutput = execSync('tasklist /FI "PID eq ' + pid + '" /FO CSV /NH', { encoding: 'utf8', timeout: 3000 })
                const match = taskOutput.match(/"([^"]+)"/)
                if (match) {
                  processName = match[1]
                }
              } catch (e) {
                processName = 'Unknown'
              }

              // 判断协议
              const protocol = localAddress.includes(':') && localAddress.split(':')[0].toLowerCase() === 'tcp' ? 'TCP' : 'UDP'

              result.push({
                port,
                pid,
                processName: processName || 'Unknown',
                protocol,
                state
              })
            }
          }
        }
      } catch (e) {
        // 端口未被占用
      }
    }

    return { success: true, ports: result }
  } catch (error) {
    console.error('Scan ports error:', error)
    return { success: false, error: error.message }
  }
})

// 结束进程
ipcMain.handle('kill-process', async (_event, pid) => {
  try {
    const { execSync } = require('child_process')
    execSync(`taskkill /PID ${pid} /F`, { encoding: 'utf8', timeout: 5000 })
    return { success: true }
  } catch (error) {
    console.error('Kill process error:', error)
    return { success: false, error: error.message }
  }
})
