import { Router, type IRouter } from 'express';
import { DatabaseService } from '../services/databaseService';
import { RecentAccessService } from '../services/recentAccessService';

const router: IRouter = Router();

/**
 * 初始化 RecentAccessService 实例
 */
let recentAccessService: RecentAccessService | null = null;

/**
 * 延迟初始化服务（等待数据库就绪）
 */
async function getService(): Promise<RecentAccessService> {
  if (!recentAccessService) {
    const dbService = new DatabaseService();
    await dbService.ready();
    recentAccessService = new RecentAccessService(dbService);
  }
  return recentAccessService;
}

/**
 * 获取最近访问记录
 * GET /api/recent?limit=50
 */
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    
    const service = await getService();
    const recentItems = await service.getRecent(limit);

    res.json({ success: true, data: recentItems });
  } catch (error) {
    console.error('[Recent] Get list error:', error);
    res.status(500).json({ success: false, error: 'Failed to get recent access' });
  }
});

/**
 * 记录一次文件访问
 * POST /api/recent
 * Body: { file_id?, path, name, access_type? }
 */
router.post('/', async (req, res) => {
  try {
    const { file_id, path, name, access_type } = req.body;

    if (!path || !name) {
      return res.status(400).json({
        success: false,
        error: 'path and name are required'
      });
    }

    const validTypes = ['open', 'preview', 'edit'];
    if (access_type && !validTypes.includes(access_type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid access_type. Must be one of: ${validTypes.join(', ')}`
      });
    }

    const service = await getService();
    await service.recordAccess({
      file_id,
      path,
      name,
      access_type: access_type || 'open'
    });

    res.status(201).json({ success: true, message: 'Access recorded' });
  } catch (error) {
    console.error('[Recent] Record error:', error);
    res.status(500).json({ success: false, error: 'Failed to record access' });
  }
});

/**
 * 清空所有访问记录
 * DELETE /api/recent
 */
router.delete('/', async (req, res) => {
  try {
    const service = await getService();
    await service.clearAll();

    res.json({ success: true, message: 'All recent access records cleared' });
  } catch (error) {
    console.error('[Recent] Clear all error:', error);
    res.status(500).json({ success: false, error: 'Failed to clear records' });
  }
});

/**
 * 删除单条访问记录
 * DELETE /api/recent/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const service = await getService();
    await service.removeItem(parseInt(id));

    res.json({ success: true, message: 'Record deleted' });
  } catch (error) {
    console.error('[Recent] Delete item error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete record' });
  }
});

/**
 * 获取访问统计信息
 * GET /api/recent/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const service = await getService();
    const stats = await service.getStats();

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('[Recent] Stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to get stats' });
  }
});

export { router as recentRouter };
