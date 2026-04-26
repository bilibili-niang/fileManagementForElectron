import { Router, type IRouter } from 'express';
import { DatabaseService } from '../services/databaseService';
import { FavoriteService } from '../services/favoriteService';

const router: IRouter = Router();

/**
 * 初始化 FavoriteService 实例
 */
let favoriteService: FavoriteService | null = null;

/**
 * 延迟初始化服务（等待数据库就绪）
 */
async function getService(): Promise<FavoriteService> {
  if (!favoriteService) {
    const dbService = new DatabaseService();
    await dbService.ready();
    favoriteService = new FavoriteService(dbService);
  }
  return favoriteService;
}

/**
 * 获取收藏列表
 * GET /api/favorites
 */
router.get('/', async (req, res) => {
  try {
    const service = await getService();
    const favorites = await service.getFavorites();
    res.json({ success: true, data: favorites });
  } catch (error) {
    console.error('[Favorites] Get list error:', error);
    res.status(500).json({ success: false, error: 'Failed to get favorites' });
  }
});

/**
 * 添加收藏项
 * POST /api/favorites
 * Body: { type, name, path?, query?, icon?, color? }
 */
router.post('/', async (req, res) => {
  try {
    const { type, name, path, query, icon, color } = req.body;

    if (!type || !name) {
      return res.status(400).json({
        success: false,
        error: 'type and name are required'
      });
    }

    const validTypes = ['folder', 'search', 'file'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid type. Must be one of: ${validTypes.join(', ')}`
      });
    }

    const service = await getService();
    const favorite = await service.addFavorite({
      type,
      name,
      path,
      query,
      icon,
      color
    });

    res.status(201).json({ success: true, data: favorite });
  } catch (error) {
    console.error('[Favorites] Add error:', error);
    res.status(500).json({ success: false, error: 'Failed to add favorite' });
  }
});

/**
 * 更新收藏项
 * PUT /api/favorites/:id
 * Body: { name?, path?, query?, icon?, color? }
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, path, query, icon, color } = req.body;

    const service = await getService();
    await service.updateFavorite(parseInt(id), {
      name,
      path,
      query,
      icon,
      color
    });

    res.json({ success: true, message: 'Favorite updated' });
  } catch (error: any) {
    console.error('[Favorites] Update error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update favorite'
    });
  }
});

/**
 * 删除收藏项
 * DELETE /api/favorites/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const service = await getService();
    await service.removeFavorite(parseInt(id));

    res.json({ success: true, message: 'Favorite deleted' });
  } catch (error) {
    console.error('[Favorites] Delete error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete favorite' });
  }
});

/**
 * 检查路径是否已收藏
 * GET /api/favorites/check?path=xxx
 */
router.get('/check', async (req, res) => {
  try {
    const { path } = req.query;

    if (!path || typeof path !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'path parameter is required'
      });
    }

    const service = await getService();
    const isFav = await service.isFavorited(path);

    res.json({ success: true, data: { isFavorited: isFav } });
  } catch (error) {
    console.error('[Favorites] Check error:', error);
    res.status(500).json({ success: false, error: 'Failed to check favorite' });
  }
});

export { router as favoritesRouter };
