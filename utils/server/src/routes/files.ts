import { Router, type IRouter } from 'express';
import { FileService } from '../services/fileService';
import fs from 'fs';
import path from 'path';

const router: IRouter = Router();
const fileService = new FileService();

// 搜索文件
router.get('/search', async (req, res) => {
  try {
    const { query, page = '1', pageSize = '50', fileType, minSize, maxSize } = req.query;

    // 如果没有搜索关键词，但有其他筛选条件，使用空字符串作为查询
    const searchQuery = query && typeof query === 'string' ? query : '';

    const options: any = {};
    if (fileType) options.fileType = fileType as string;
    if (minSize) options.minSize = parseInt(minSize as string) * 1024 * 1024; // 转换为字节
    if (maxSize) options.maxSize = parseInt(maxSize as string) * 1024 * 1024; // 转换为字节

    const result = await fileService.searchFiles(
      searchQuery,
      parseInt(page as string),
      parseInt(pageSize as string),
      options
    );

    res.json(result);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// 搜索文件内容
router.get('/search-content', async (req, res) => {
  try {
    const { keyword, page = '1', pageSize = '50' } = req.query;

    if (!keyword || typeof keyword !== 'string') {
      return res.status(400).json({ error: 'Keyword parameter is required' });
    }

    const result = await fileService.searchFileContent(
      keyword,
      parseInt(page as string),
      parseInt(pageSize as string)
    );

    res.json(result);
  } catch (error) {
    console.error('Search content error:', error);
    res.status(500).json({ error: 'Failed to search file content' });
  }
});

// 获取内容索引统计
router.get('/content-stats', async (req, res) => {
  try {
    const stats = await fileService.getContentIndexStats();
    res.json(stats);
  } catch (error) {
    console.error('Content stats error:', error);
    res.status(500).json({ error: 'Failed to get content index stats' });
  }
});

// 按分类获取文件
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { page = '1', pageSize = '50' } = req.query;

    const result = await fileService.getFilesByCategory(
      category,
      parseInt(page as string),
      parseInt(pageSize as string)
    );

    res.json(result);
  } catch (error) {
    console.error('Category error:', error);
    res.status(500).json({ error: 'Failed to get files by category' });
  }
});

// 获取文件统计
router.get('/counts', async (req, res) => {
  try {
    const counts = await fileService.getFileCounts();
    res.json(counts);
  } catch (error) {
    console.error('Counts error:', error);
    res.status(500).json({ error: 'Failed to get file counts' });
  }
});

// 开始索引 - 立即返回，在后台运行
router.post('/index/start', async (req, res) => {
  try {
    const { drives } = req.body;
    
    // 立即返回，不等待索引完成
    res.json({ success: true, message: 'Indexing started' });
    
    // 在后台启动索引
    fileService.startIndexing(drives).catch(error => {
      console.error('Background indexing error:', error);
    });
  } catch (error) {
    console.error('Start index error:', error);
    res.status(500).json({ error: 'Failed to start indexing' });
  }
});

// 停止索引
router.post('/index/stop', async (req, res) => {
  try {
    await fileService.stopIndexing();
    res.json({ success: true, message: 'Indexing stopped' });
  } catch (error) {
    console.error('Stop index error:', error);
    res.status(500).json({ error: 'Failed to stop indexing' });
  }
});

// 获取索引进度
router.get('/index/progress', async (req, res) => {
  try {
    const progress = await fileService.getIndexingProgress();
    res.json(progress);
  } catch (error) {
    console.error('Progress error:', error);
    res.status(500).json({ error: 'Failed to get indexing progress' });
  }
});

// 打开文件
router.post('/open', async (req, res) => {
  try {
    const { filePath } = req.body;
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    const content = await fileService.openFile(filePath);
    res.json({ success: true, content });
  } catch (error: any) {
    console.error('Open file error:', error);
    res.status(500).json({ error: error.message || 'Failed to open file' });
  }
});

// 读取文件内容（用于预览）
router.get('/content', async (req, res) => {
  try {
    const filePath = req.query.path as string;

    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    const stats = fs.statSync(filePath);
    const content = await fileService.openFile(filePath);
    res.json({ success: true, content, size: stats.size });
  } catch (error: any) {
    console.error('Read file content error:', error);
    res.status(500).json({ error: error.message || 'Failed to read file content' });
  }
});

// 解析 docx 文件
router.post('/parse-docx', async (req, res) => {
  try {
    const { filePath } = req.body;
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    const result = await fileService.parseDocx(filePath);
    res.json({ success: true, html: result.html, text: result.text });
  } catch (error) {
    console.error('Parse docx error:', error);
    res.status(500).json({ error: 'Failed to parse docx file' });
  }
});

// 保存文件
router.post('/save', async (req, res) => {
  try {
    const { filePath, content } = req.body;
    
    if (!filePath || content === undefined) {
      return res.status(400).json({ error: 'File path and content are required' });
    }

    await fileService.saveFile(filePath, content);
    res.json({ success: true, message: 'File saved' });
  } catch (error) {
    console.error('Save file error:', error);
    res.status(500).json({ error: 'Failed to save file' });
  }
});

// 获取图片文件（用于预览）
router.post('/image', async (req, res) => {
  try {
    const { filePath } = req.body;
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    const imageBuffer = await fileService.getImageBuffer(filePath);
    
    // 根据文件扩展名设置 Content-Type
    const ext = filePath.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'bmp': 'image/bmp',
      'webp': 'image/webp',
      'svg': 'image/svg+xml'
    };
    
    const contentType = mimeTypes[ext || ''] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.send(imageBuffer);
  } catch (error) {
    console.error('Get image error:', error);
    res.status(500).json({ error: 'Failed to get image' });
  }
});

// 用系统默认程序打开文件
router.post('/open-system', async (req, res) => {
  try {
    const { filePath } = req.body;
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    await fileService.openWithSystem(filePath);
    res.json({ success: true, message: 'File opened with system default' });
  } catch (error) {
    console.error('Open with system error:', error);
    res.status(500).json({ error: 'Failed to open file' });
  }
});

// 强制重新索引 - 清除所有数据后重新索引
router.post('/force-reindex', async (req, res) => {
  try {
    const { drives } = req.body;
    
    if (!drives || !Array.isArray(drives) || drives.length === 0) {
      return res.status(400).json({ error: 'Drives array is required' });
    }

    // 先清除所有数据
    await fileService.clearAllData();
    
    // 开始重新索引
    await fileService.startIndexing(drives);

    res.json({ success: true, message: 'Force reindex started' });
  } catch (error: any) {
    console.error('Force reindex error:', error);
    res.status(500).json({ error: error.message || 'Failed to force reindex' });
  }
});

// 清除所有索引数据
router.post('/clear-all-data', async (req, res) => {
  try {
    await fileService.clearAllData();
    res.json({ success: true, message: 'All data cleared' });
  } catch (error: any) {
    console.error('Clear data error:', error);
    res.status(500).json({ error: error.message || 'Failed to clear data' });
  }
});

// 媒体文件流服务（用于播放本地音视频）
router.get('/media', async (req, res) => {
  try {
    const filePath = req.query.path as string;

    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const ext = path.extname(filePath).toLowerCase();

    // 设置 MIME 类型
    const mimeTypes: Record<string, string> = {
      '.mp4': 'video/mp4',
      '.avi': 'video/x-msvideo',
      '.mkv': 'video/x-matroska',
      '.mov': 'video/quicktime',
      '.wmv': 'video/x-ms-wmv',
      '.flv': 'video/x-flv',
      '.webm': 'video/webm',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.flac': 'audio/flac',
      '.aac': 'audio/aac',
      '.ogg': 'audio/ogg',
      '.wma': 'audio/x-ms-wma',
      '.m4a': 'audio/mp4'
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';

    // 处理范围请求（支持视频拖动）
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType
      });

      const stream = fs.createReadStream(filePath, { start, end });
      stream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes'
      });

      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
    }
  } catch (error) {
    console.error('Media stream error:', error);
    res.status(500).json({ error: 'Failed to stream media file' });
  }
});

// 获取文件打开方式配置列表
router.get('/open-configs', async (req, res) => {
  try {
    const configs = await fileService.getFileOpenConfigs();
    res.json({ success: true, configs });
  } catch (error) {
    console.error('Get open configs error:', error);
    res.status(500).json({ error: 'Failed to get file open configs' });
  }
});

// 获取单个文件类型的打开方式配置
router.get('/open-config/:extension', async (req, res) => {
  try {
    const { extension } = req.params;
    const config = await fileService.getFileOpenConfig(extension);
    res.json({ success: true, config });
  } catch (error) {
    console.error('Get open config error:', error);
    res.status(500).json({ error: 'Failed to get file open config' });
  }
});

// 保存文件打开方式配置
router.post('/open-config', async (req, res) => {
  try {
    const { extension, openMethod, internalViewer } = req.body;

    if (!extension || !openMethod) {
      return res.status(400).json({ error: 'Extension and openMethod are required' });
    }

    await fileService.saveFileOpenConfig(extension, openMethod, internalViewer);
    res.json({ success: true, message: 'Config saved' });
  } catch (error) {
    console.error('Save open config error:', error);
    res.status(500).json({ error: 'Failed to save file open config' });
  }
});

// 删除文件打开方式配置
router.delete('/open-config/:extension', async (req, res) => {
  try {
    const { extension } = req.params;
    await fileService.deleteFileOpenConfig(extension);
    res.json({ success: true, message: 'Config deleted' });
  } catch (error) {
    console.error('Delete open config error:', error);
    res.status(500).json({ error: 'Failed to delete file open config' });
  }
});

export { router as fileRouter };
