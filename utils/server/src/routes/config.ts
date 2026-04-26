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
    
    const affectedRows = await dbService.updateExcludeRule(parseInt(id), updates);
    if (affectedRows === 0) {
      return res.status(404).json({ error: 'Rule not found' });
    }
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
    const affectedRows = await dbService.deleteExcludeRule(parseInt(id));
    if (affectedRows === 0) {
      return res.status(404).json({ error: 'Rule not found' });
    }
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

// 测试接口 - 验证后端是否可达
router.get('/search-history/test', async (req, res) => {
  console.log('[Search History] Test endpoint called');
  res.json({ 
    success: true, 
    message: 'Backend is reachable',
    timestamp: new Date().toISOString()
  });
});

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
    console.log('[Search History] Retrieved history:', history.length, 'items');
    res.json({ success: true, history });
  } catch (error) {
    console.error('[Search History] Get search history error:', error);
    console.error('[Search History] Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    res.status(500).json({ 
      error: 'Failed to get search history',
      details: error instanceof Error ? error.message : String(error)
    });
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
    const affectedRows = await dbService.deleteSearchHistory(parseInt(id));
    if (affectedRows === 0) {
      return res.status(404).json({ error: 'Search history item not found' });
    }
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

// ==================== 计算器历史管理 ====================

// 获取计算器历史
router.get('/calculator-history', async (req, res) => {
  try {
    const { limit = '50' } = req.query;
    const limitNum = parseInt(limit as string, 10);
    const validLimit = isNaN(limitNum) ? 50 : limitNum;

    console.log('[Calculator] 获取历史记录, limit:', validLimit);
    const history = await dbService.getCalculatorHistory(validLimit);
    console.log('[Calculator] 返回历史记录:', history.length, '条');
    res.json({ success: true, history });
  } catch (error) {
    console.error('[Calculator] 获取历史记录错误:', error);
    res.status(500).json({ error: 'Failed to get calculator history', details: (error as Error).message });
  }
});

// 添加计算器历史
router.post('/calculator-history', async (req, res) => {
  try {
    const { expression, result } = req.body;

    if (!expression || result === undefined) {
      return res.status(400).json({ error: 'expression and result are required' });
    }

    await dbService.addCalculatorHistory(expression, String(result));
    res.json({ success: true, message: 'Calculator history added' });
  } catch (error) {
    console.error('Add calculator history error:', error);
    res.status(500).json({ error: 'Failed to add calculator history' });
  }
});

// 清除计算器历史
router.delete('/calculator-history', async (req, res) => {
  try {
    await dbService.clearCalculatorHistory();
    res.json({ success: true, message: 'Calculator history cleared' });
  } catch (error) {
    console.error('Clear calculator history error:', error);
    res.status(500).json({ error: 'Failed to clear calculator history' });
  }
});

// 删除单条计算器历史
router.delete('/calculator-history/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const affectedRows = await dbService.deleteCalculatorHistory(parseInt(id));
    if (affectedRows === 0) {
      return res.status(404).json({ error: 'Calculator history item not found' });
    }
    res.json({ success: true, message: 'Calculator history item deleted' });
  } catch (error) {
    console.error('Delete calculator history error:', error);
    res.status(500).json({ error: 'Failed to delete calculator history item' });
  }
});

// ==================== 二维码配置管理 ====================

// 获取二维码配置
router.get('/qrcode-config', async (req, res) => {
  try {
    const config = await dbService.getQrcodeConfig();
    res.json({ success: true, config });
  } catch (error) {
    console.error('Get qrcode config error:', error);
    res.status(500).json({ error: 'Failed to get qrcode config' });
  }
});

// 保存二维码配置
router.post('/qrcode-config', async (req, res) => {
  try {
    const { base_url, time_api_url, append_time, qr_size, error_correction_level } = req.body;
    await dbService.saveQrcodeConfig({
      base_url,
      time_api_url,
      append_time,
      qr_size,
      error_correction_level
    });
    res.json({ success: true, message: 'Qrcode config saved' });
  } catch (error) {
    console.error('Save qrcode config error:', error);
    res.status(500).json({ error: 'Failed to save qrcode config' });
  }
});

// ==================== 二维码历史管理 ====================

// 获取二维码历史
router.get('/qrcode-history', async (req, res) => {
  try {
    const { limit = '50' } = req.query;
    const limitNum = parseInt(limit as string, 10);
    const validLimit = isNaN(limitNum) ? 50 : limitNum;

    const history = await dbService.getQrcodeHistory(validLimit);
    res.json({ success: true, history });
  } catch (error) {
    console.error('Get qrcode history error:', error);
    res.status(500).json({ error: 'Failed to get qrcode history' });
  }
});

// 添加二维码历史
router.post('/qrcode-history', async (req, res) => {
  try {
    const { base_url, time_api_url, generated_url, append_time, qr_size, error_correction_level } = req.body;

    if (!base_url || !generated_url) {
      return res.status(400).json({ error: 'base_url and generated_url are required' });
    }

    const id = await dbService.addQrcodeHistory({
      base_url,
      time_api_url,
      generated_url,
      append_time,
      qr_size,
      error_correction_level
    });
    res.json({ success: true, id, message: 'Qrcode history added' });
  } catch (error) {
    console.error('Add qrcode history error:', error);
    res.status(500).json({ error: 'Failed to add qrcode history' });
  }
});

// 删除单条二维码历史
router.delete('/qrcode-history/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const affectedRows = await dbService.deleteQrcodeHistory(parseInt(id));
    if (affectedRows === 0) {
      return res.status(404).json({ error: 'Qrcode history item not found' });
    }
    res.json({ success: true, message: 'Qrcode history item deleted' });
  } catch (error) {
    console.error('Delete qrcode history error:', error);
    res.status(500).json({ error: 'Failed to delete qrcode history item' });
  }
});

// 清除二维码历史
router.delete('/qrcode-history', async (req, res) => {
  try {
    await dbService.clearQrcodeHistory();
    res.json({ success: true, message: 'Qrcode history cleared' });
  } catch (error) {
    console.error('Clear qrcode history error:', error);
    res.status(500).json({ error: 'Failed to clear qrcode history' });
  }
});

// ==================== 倒计时管理 ====================

// 获取所有倒计时
router.get('/countdowns', async (req, res) => {
  try {
    const countdowns = await dbService.getCountdowns();
    res.json({ success: true, countdowns });
  } catch (error) {
    console.error('Get countdowns error:', error);
    res.status(500).json({ error: 'Failed to get countdowns' });
  }
});

// 添加倒计时
router.post('/countdowns', async (req, res) => {
  try {
    const { title, date, time, repeat } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }

    if (!date && !time) {
      return res.status(400).json({ error: 'date or time is required' });
    }

    const id = await dbService.addCountdown({
      title,
      date: date || null,
      time: time || null,
      repeat: repeat || 'none'
    });
    res.json({ success: true, id, message: 'Countdown added' });
  } catch (error) {
    console.error('Add countdown error:', error);
    res.status(500).json({ error: 'Failed to add countdown' });
  }
});

// 更新倒计时
router.put('/countdowns/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, date, time, repeat } = req.body;

    const affectedRows = await dbService.updateCountdown(parseInt(id), {
      title,
      date: date !== undefined ? date : undefined,
      time: time !== undefined ? time : undefined,
      repeat
    });

    if (affectedRows === 0) {
      return res.status(404).json({ error: 'Countdown not found' });
    }

    res.json({ success: true, message: 'Countdown updated' });
  } catch (error) {
    console.error('Update countdown error:', error);
    res.status(500).json({ error: 'Failed to update countdown' });
  }
});

// 删除倒计时
router.delete('/countdowns/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const affectedRows = await dbService.deleteCountdown(parseInt(id));

    if (affectedRows === 0) {
      return res.status(404).json({ error: 'Countdown not found' });
    }

    res.json({ success: true, message: 'Countdown deleted' });
  } catch (error) {
    console.error('Delete countdown error:', error);
    res.status(500).json({ error: 'Failed to delete countdown' });
  }
});

// ==================== API 文档管理 ====================

// 获取所有 API 文档
router.get('/api-docs', async (req, res) => {
  try {
    const docs = await dbService.getApiDocs();
    res.json({ success: true, docs });
  } catch (error) {
    console.error('Get api docs error:', error);
    res.status(500).json({ error: 'Failed to get api docs' });
  }
});

// 获取单个 API 文档
router.get('/api-docs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await dbService.getApiDocById(parseInt(id));

    if (!doc) {
      return res.status(404).json({ error: 'Api doc not found' });
    }

    res.json({ success: true, doc });
  } catch (error) {
    console.error('Get api doc error:', error);
    res.status(500).json({ error: 'Failed to get api doc' });
  }
});

// 添加 API 文档
router.post('/api-docs', async (req, res) => {
  try {
    const { name, source_file, openapi_data } = req.body;

    if (!name || !openapi_data) {
      return res.status(400).json({ error: 'name and openapi_data are required' });
    }

    // 验证 JSON 格式
    try {
      JSON.parse(openapi_data);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON format' });
    }

    const id = await dbService.addApiDoc({ name, source_file, openapi_data });
    res.json({ success: true, id, message: 'Api doc added' });
  } catch (error) {
    console.error('Add api doc error:', error);
    res.status(500).json({ error: 'Failed to add api doc' });
  }
});

// 更新 API 文档
router.put('/api-docs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, source_file, openapi_data } = req.body;

    if (openapi_data) {
      try {
        JSON.parse(openapi_data);
      } catch {
        return res.status(400).json({ error: 'Invalid JSON format' });
      }
    }

    const affectedRows = await dbService.updateApiDoc(parseInt(id), {
      name,
      source_file,
      openapi_data
    });

    if (affectedRows === 0) {
      return res.status(404).json({ error: 'Api doc not found' });
    }

    res.json({ success: true, message: 'Api doc updated' });
  } catch (error) {
    console.error('Update api doc error:', error);
    res.status(500).json({ error: 'Failed to update api doc' });
  }
});

// 删除 API 文档
router.delete('/api-docs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const affectedRows = await dbService.deleteApiDoc(parseInt(id));

    if (affectedRows === 0) {
      return res.status(404).json({ error: 'Api doc not found' });
    }

    res.json({ success: true, message: 'Api doc deleted' });
  } catch (error) {
    console.error('Delete api doc error:', error);
    res.status(500).json({ error: 'Failed to delete api doc' });
  }
});

export { router as configRouter };
