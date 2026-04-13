import express from 'express';
import cors from 'cors';
import { fileRouter } from './routes/files';
import { configRouter } from './routes/config';
import mockRouter, { mockMiddleware, initMockRoutes } from './routes/mock';
import { initializeDatabase } from './services/databaseInit';
import net from 'net';
import os from 'os';

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

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/files', fileRouter);
app.use('/api/config', configRouter);
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

// Mock middleware - 处理动态模拟路由(放在其他路由之后)
app.use(mockMiddleware);

// Initialize database and start server
async function startServer() {
  try {
    // 检查端口是否可用
    const available = await isPortAvailable(PORT);
    if (!available) {
      console.error(`Error: Port ${PORT} is already in use.`);
      console.error('Please either:');
      console.error(`  1. Stop the process using port ${PORT}`);
      console.error(`  2. Set a different port using: set PORT=3001 && pnpm server`);
      process.exit(1);
    }

    // 初始化数据库
    await initializeDatabase();

    // 初始化模拟路由缓存
    await initMockRoutes();

    // 启动服务器
    app.listen(PORT, () => {
      console.log(`Server started successfully on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
