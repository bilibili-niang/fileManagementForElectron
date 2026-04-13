import { Router, type IRouter } from 'express';
import { DatabaseService } from '../services/databaseService';

const router: IRouter = Router();
const dbService = new DatabaseService();

/**
 * 内存缓存,用于快速查找
 */
const mockRoutesCache: Map<string, any> = new Map();

/**
 * 从数据库加载所有模拟路由到缓存
 */
async function loadMockRoutesToCache(): Promise<void> {
  try {
    const routes = await dbService.getMockRoutes();
    mockRoutesCache.clear();

    for (const route of routes) {
      const key = `${route.method}:${route.path}`;
      mockRoutesCache.set(key, route.response);
    }
  } catch (error) {
    console.error('加载模拟路由到缓存失败:', error);
  }
}

/**
 * 获取所有模拟路由
 */
router.get('/routes', async (req, res) => {
  try {
    const routes = await dbService.getMockRoutes();
    res.json({ success: true, routes });
  } catch (error: any) {
    console.error('Get mock routes error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get routes',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * 添加模拟路由
 */
router.post('/routes', async (req, res) => {
  try {
    const { method, path, response } = req.body;

    if (!method || !path) {
      return res.status(400).json({
        success: false,
        error: 'Method and path are required'
      });
    }

    // 保存到数据库
    await dbService.addMockRoute(method, path, response);

    // 更新缓存
    const key = `${method.toUpperCase()}:${path}`;
    mockRoutesCache.set(key, response);

    res.json({ success: true, message: 'Route added successfully' });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to add route'
    });
  }
});

/**
 * 删除模拟路由
 */
router.delete('/routes', async (req, res) => {
  try {
    const { method, path } = req.body;

    if (!method || !path) {
      return res.status(400).json({
        success: false,
        error: 'Method and path are required'
      });
    }

    // 从数据库删除
    await dbService.deleteMockRoute(method, path);

    // 更新缓存
    const key = `${method.toUpperCase()}:${path}`;
    mockRoutesCache.delete(key);

    res.json({ success: true, message: 'Route deleted successfully' });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete route'
    });
  }
});

/**
 * 处理动态路由请求
 * 这个中间件会拦截所有请求,检查是否有匹配的模拟路由
 */
export function mockMiddleware(req: any, res: any, next: any) {
  const key = `${req.method}:${req.path}`;

  if (mockRoutesCache.has(key)) {
    const response = mockRoutesCache.get(key);
    return res.json(response);
  }

  next();
}

/**
 * 初始化加载路由到缓存
 */
export async function initMockRoutes(): Promise<void> {
  await loadMockRoutesToCache();
}

export default router;
