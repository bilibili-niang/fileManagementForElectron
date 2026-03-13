import { Router, type IRouter } from 'express';
import { ConfigService } from '../services/configService';
import { DatabaseService } from '../services/databaseService';

const router: IRouter = Router();
const configService = new ConfigService();
const dbService = new DatabaseService();

// 获取配置
router.get('/', async (req, res) => {
  try {
    const config = await configService.loadConfig();
    res.json(config);
  } catch (error) {
    console.error('Load config error:', error);
    res.status(500).json({ error: 'Failed to load config' });
  }
});

// 保存配置
router.post('/', async (req, res) => {
  try {
    const config = req.body;
    await configService.saveConfig(config);
    res.json({ success: true, message: 'Config saved' });
  } catch (error) {
    console.error('Save config error:', error);
    res.status(500).json({ error: 'Failed to save config' });
  }
});

// 测试数据库连接
router.post('/test-db', async (req, res) => {
  try {
    const { host, port, username, password, database } = req.body;
    const result = await configService.testDatabaseConnection({
      host,
      port,
      username,
      password,
      database
    });
    res.json({ success: result });
  } catch (error) {
    console.error('Test DB error:', error);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// ==================== 索引排除规则管理 ====================

// 获取所有排除规则
router.get('/exclude-rules', async (req, res) => {
  try {
    const rules = await dbService.getExcludeRules();
    res.json({ success: true, rules });
  } catch (error) {
    console.error('Get exclude rules error:', error);
    res.status(500).json({ error: 'Failed to get exclude rules' });
  }
});

// 添加排除规则
router.post('/exclude-rules', async (req, res) => {
  try {
    const { rule_type, pattern, description, is_regex, priority } = req.body;
    
    if (!rule_type || !pattern) {
      return res.status(400).json({ error: 'rule_type and pattern are required' });
    }
    
    // 验证正则表达式
    if (is_regex) {
      try {
        new RegExp(pattern);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid regex pattern' });
      }
    }
    
    const id = await dbService.addExcludeRule({
      rule_type,
      pattern,
      description,
      is_regex,
      priority
    });
    
    res.json({ success: true, id, message: 'Rule added successfully' });
  } catch (error) {
    console.error('Add exclude rule error:', error);
    res.status(500).json({ error: 'Failed to add exclude rule' });
  }
});

// 更新排除规则
router.put('/exclude-rules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // 验证正则表达式
    if (updates.is_regex && updates.pattern) {
      try {
        new RegExp(updates.pattern);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid regex pattern' });
      }
    }
    
    await dbService.updateExcludeRule(parseInt(id), updates);
    res.json({ success: true, message: 'Rule updated successfully' });
  } catch (error) {
    console.error('Update exclude rule error:', error);
    res.status(500).json({ error: 'Failed to update exclude rule' });
  }
});

// 删除排除规则
router.delete('/exclude-rules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await dbService.deleteExcludeRule(parseInt(id));
    res.json({ success: true, message: 'Rule deleted successfully' });
  } catch (error) {
    console.error('Delete exclude rule error:', error);
    res.status(500).json({ error: 'Failed to delete exclude rule' });
  }
});

// 测试正则表达式
router.post('/exclude-rules/test', async (req, res) => {
  try {
    const { pattern, is_regex, testPath } = req.body;
    
    if (!pattern || !testPath) {
      return res.status(400).json({ error: 'pattern and testPath are required' });
    }
    
    let matches = false;
    
    if (is_regex) {
      try {
        const regex = new RegExp(pattern, 'i');
        matches = regex.test(testPath);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid regex pattern' });
      }
    } else {
      matches = testPath.toLowerCase().includes(pattern.toLowerCase());
    }
    
    res.json({ success: true, matches });
  } catch (error) {
    console.error('Test regex error:', error);
    res.status(500).json({ error: 'Failed to test regex' });
  }
});

// ==================== 搜索历史管理 ====================

// 获取搜索历史
router.get('/search-history', async (req, res) => {
  try {
    const { limit = '20', type } = req.query;

    /**
     * 解析 limit 参数
     * 确保返回有效的数字，默认为 20
     */
    const limitNum = parseInt(limit as string, 10);
    const validLimit = isNaN(limitNum) ? 20 : limitNum;

    console.log('[Search History] Query params:', { limit: validLimit, type });

    const history = await dbService.getSearchHistory(
      validLimit,
      type as string | undefined
    );
    res.json({ success: true, history });
  } catch (error) {
    console.error('Get search history error:', error);
    res.status(500).json({ error: 'Failed to get search history' });
  }
});

// 获取搜索建议
router.get('/search-suggestions', async (req, res) => {
  try {
    const { query, limit = 10 } = req.query;
    
    if (!query) {
      return res.json({ success: true, suggestions: [] });
    }
    
    const suggestions = await dbService.getSearchSuggestions(
      query as string,
      parseInt(limit as string)
    );
    res.json({ success: true, suggestions });
  } catch (error) {
    console.error('Get search suggestions error:', error);
    res.status(500).json({ error: 'Failed to get search suggestions' });
  }
});

// 添加搜索历史
router.post('/search-history', async (req, res) => {
  try {
    const { query, search_type = 'filename', result_count = 0 } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'query is required' });
    }
    
    await dbService.addSearchHistory(query, search_type, result_count);
    res.json({ success: true, message: 'Search history added' });
  } catch (error) {
    console.error('Add search history error:', error);
    res.status(500).json({ error: 'Failed to add search history' });
  }
});

// 清除搜索历史
router.delete('/search-history', async (req, res) => {
  try {
    await dbService.clearSearchHistory();
    res.json({ success: true, message: 'Search history cleared' });
  } catch (error) {
    console.error('Clear search history error:', error);
    res.status(500).json({ error: 'Failed to clear search history' });
  }
});

// 删除单条搜索历史
router.delete('/search-history/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await dbService.deleteSearchHistory(parseInt(id));
    res.json({ success: true, message: 'Search history item deleted' });
  } catch (error) {
    console.error('Delete search history error:', error);
    res.status(500).json({ error: 'Failed to delete search history item' });
  }
});

// ==================== 调试日志 API ====================

// 添加调试日志
router.post('/debug-log', async (req, res) => {
  try {
    const { component, message, data } = req.body;
    
    if (!component || !message) {
      return res.status(400).json({ error: 'component and message are required' });
    }
    
    await dbService.addDebugLog(component, message, data);
    res.json({ success: true, message: 'Debug log added' });
  } catch (error) {
    console.error('Add debug log error:', error);
    res.status(500).json({ error: 'Failed to add debug log' });
  }
});

// 获取调试日志
router.get('/debug-logs', async (req, res) => {
  try {
    const { component, limit = 100 } = req.query;
    const logs = await dbService.getDebugLogs(
      component as string | undefined,
      parseInt(limit as string)
    );
    res.json({ success: true, logs });
  } catch (error) {
    console.error('Get debug logs error:', error);
    res.status(500).json({ error: 'Failed to get debug logs' });
  }
});

// 清除调试日志
router.delete('/debug-logs', async (req, res) => {
  try {
    await dbService.clearDebugLogs();
    res.json({ success: true, message: 'Debug logs cleared' });
  } catch (error) {
    console.error('Clear debug logs error:', error);
    res.status(500).json({ error: 'Failed to clear debug logs' });
  }
});

// ==================== 窗口状态管理 ====================

// 获取窗口状态
router.get('/window-state', async (req, res) => {
  try {
    const state = await dbService.getWindowState();
    res.json({ success: true, state });
  } catch (error) {
    console.error('Get window state error:', error);
    res.status(500).json({ error: 'Failed to get window state' });
  }
});

// 保存窗口状态
router.post('/window-state', async (req, res) => {
  try {
    const { width, height, x, y, is_maximized, is_fullscreen } = req.body;
    await dbService.saveWindowState({
      width,
      height,
      x,
      y,
      is_maximized,
      is_fullscreen
    });
    res.json({ success: true, message: 'Window state saved' });
  } catch (error) {
    console.error('Save window state error:', error);
    res.status(500).json({ error: 'Failed to save window state' });
  }
});

export { router as configRouter };
