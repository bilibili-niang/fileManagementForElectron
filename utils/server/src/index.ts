import express from 'express';
import cors from 'cors';
import { fileRouter } from './routes/files';
import { configRouter } from './routes/config';
import { fileShareRouter } from './routes/fileShare';
import { devErrorLogRouter } from './routes/devErrorLog';
import { favoritesRouter } from './routes/favorites';
import { recentRouter } from './routes/recent';
import mockRouter, { mockMiddleware, initMockRoutes } from './routes/mock';
import { initializeDatabase } from './services/databaseInit';
import { FileService } from './services/fileService';
import net from 'net';
import os from 'os';
import { execSync } from 'child_process';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

/**
 * 检查端口是否可用
 * @param port - 端口号
 * @returns 是否可用
 */
function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => {
      resolve(false);
    });
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port);
  });
}

/**
 * 获取占用端口的进程 PID
 * @param port - 端口号
 * @returns PID 或 null
 */
function getPortPid(port: number): number | null {
  try {
    const output = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, { encoding: 'utf8' });
    const lines = output.trim().split('\n');
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 5) {
        const pid = parseInt(parts[4], 10);
        if (!isNaN(pid)) {
          return pid;
        }
      }
    }
  } catch (error) {
    // 命令执行失败，可能没有进程占用
  }
  return null;
}

/**
 * 杀掉指定 PID 的进程
 * @param pid - 进程 PID
 */
function killProcess(pid: number): boolean {
  try {
    execSync(`taskkill /F /PID ${pid}`);
    console.log(`[Server] Killed process ${pid}`);
    return true;
  } catch (error) {
    console.error(`[Server] Failed to kill process ${pid}:`, error);
    return false;
  }
}

/**
 * 等待端口释放
 * @param port - 端口号
 * @param maxWaitMs - 最大等待时间（毫秒）
 */
async function waitForPortRelease(port: number, maxWaitMs: number = 5000): Promise<boolean> {
  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitMs) {
    const available = await isPortAvailable(port);
    if (available) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  return false;
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/files', fileRouter);
app.use('/api/config', configRouter);
app.use('/api/file-share', fileShareRouter);
app.use(devErrorLogRouter);
app.use('/api/favorites', favoritesRouter);
app.use('/api/recent', recentRouter);
app.use('/api/mock', mockRouter);

/**
 * 获取本机 IPv4 地址
 * @returns IPv4 地址
 */
function getLocalIpAddress(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const iface = interfaces[name];
    if (iface) {
      for (const info of iface) {
        // 获取 IPv4 且不是内部地址
        if (info.family === 'IPv4' && !info.internal) {
          return info.address;
        }
      }
    }
  }
  return 'localhost';
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    ip: getLocalIpAddress()
  });
});

// 获取文件共享访问地址
app.get('/api/file-share/access-info', (req, res) => {
  const ip = getLocalIpAddress();
  res.json({
    success: true,
    ip,
    port: PORT
  });
});

// Mock middleware - 处理动态模拟路由(放在其他路由之后)
app.use(mockMiddleware);

// Initialize database and start server
async function startServer() {
  try {
    // 检查端口是否可用
    let available = await isPortAvailable(PORT);

    // 如果端口被占用，尝试杀掉占用进程
    if (!available) {
      console.log(`[Server] Port ${PORT} is already in use. Trying to kill the process...`);

      const pid = getPortPid(PORT);
      if (pid) {
        console.log(`[Server] Found process ${pid} using port ${PORT}`);
        const killed = killProcess(pid);

        if (killed) {
          // 等待端口释放
          console.log(`[Server] Waiting for port ${PORT} to be released...`);
          const released = await waitForPortRelease(PORT, 10000);

          if (released) {
            console.log(`[Server] Port ${PORT} is now available`);
            available = true;
          } else {
            console.error(`[Server] Port ${PORT} is still in use after killing process`);
          }
        }
      } else {
        console.error(`[Server] Could not find process using port ${PORT}`);
      }

      // 如果端口仍然不可用，退出
      if (!available) {
        console.error(`Error: Port ${PORT} is still in use.`);
        console.error('Please manually stop the process or use a different port:');
        console.error(`  set PORT=3001 && pnpm server`);
        process.exit(1);
      }
    }

    // 初始化数据库
    await initializeDatabase();

    // 初始化模拟路由缓存
    await initMockRoutes();

    // 启动服务器
    app.listen(PORT);
    console.log(`[Server] Server started on port ${PORT}`);

    // 服务器启动后自动检查并触发文件索引
    setTimeout(async () => {
      try {
        await autoStartIndexing();
      } catch (error) {
        console.error('[AutoIndex] Failed to start auto indexing:', error);
      }
    }, 1000);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

/**
 * 自动启动文件索引
 * 检查数据库中是否已有索引数据，如果没有则自动开始扫描
 */
async function autoStartIndexing(): Promise<void> {
  const fileService = new FileService();

  try {
    // 获取文件总数
    const counts = await fileService.getFileCounts();
    const totalFiles = counts.all || 0;

    // 获取当前索引进度
    const progress = await fileService.getIndexingProgress();

    console.log('[AutoIndex] Current status:', {
      totalFiles,
      isIndexing: progress.isIndexing,
      indexedFiles: progress.currentFile
    });

    // 如果没有索引过且当前没有正在索引，自动开始索引
    if (totalFiles === 0 && !progress.isIndexing) {
      console.log('[AutoIndex] No files indexed, starting automatic indexing...');

      // 获取所有可用驱动器
      const drives = getAvailableDrives();
      console.log('[AutoIndex] Starting indexing for drives:', drives);

      // 开始后台索引
      fileService.startIndexing(drives).catch(error => {
        console.error('[AutoIndex] Background indexing error:', error);
      });
    } else if (progress.isIndexing) {
      console.log('[AutoIndex] Indexing already in progress');
    } else {
      console.log(`[AutoIndex] Already indexed ${totalFiles} files, skipping auto index`);
    }
  } catch (error) {
    console.error('[AutoIndex] Error during auto indexing check:', error);
  }
}

/**
 * 获取所有可用驱动器
 */
function getAvailableDrives(): string[] {
  const platform = os.platform();

  if (platform === 'win32') {
    try {
      const { execSync } = require('child_process');
      const output = execSync('wmic logicaldisk get name', { encoding: 'utf8' });
      return output
        .split('\n')
        .map(line => line.trim())
        .filter(line => /^[A-Z]:$/i.test(line))
        .map(drive => drive.toUpperCase());
    } catch (error) {
      console.error('[AutoIndex] Failed to get drives, using defaults:', error);
      return ['C:', 'D:', 'E:'];
    }
  } else {
    return ['/'];
  }
}

startServer();
