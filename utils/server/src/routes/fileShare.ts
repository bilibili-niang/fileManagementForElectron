import { Router, type IRouter } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

const router: IRouter = Router();

// 默认共享文件夹路径 - 放在项目目录下
const getShareFolder = (): string => {
  const shareDir = path.join(process.cwd(), 'share');
  if (!fs.existsSync(shareDir)) {
    fs.mkdirSync(shareDir, { recursive: true });
  }
  return shareDir;
};

// 清理文件名，移除 Windows 不允许的字符
const sanitizeFileName = (fileName: string): string => {
  // Windows 不允许的字符: \ / : * ? " < > |
  return fileName.replace(/[\\\/:*?"<>|]/g, '_');
};

// 验证文件路径是否在共享目录内，防止路径穿越
const isPathSafe = (filePath: string, shareDir: string): boolean => {
  const resolvedPath = path.resolve(filePath);
  const resolvedShareDir = path.resolve(shareDir);
  return resolvedPath.startsWith(resolvedShareDir + path.sep) ||
         resolvedPath === resolvedShareDir;
};

/**
 * 修复中文文件名乱码问题
 * multer 默认使用 Latin-1 编码，需要将 Buffer 转换为 UTF-8
 */
const fixFileNameEncoding = (fileName: string): string => {
  try {
    // 将 Latin-1 编码的字符串转换为 Buffer，再用 UTF-8 解码
    const buffer = Buffer.from(fileName, 'latin1');
    return buffer.toString('utf8');
  } catch {
    return fileName;
  }
};

// 配置 multer 上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const shareDir = getShareFolder();
    cb(null, shareDir);
  },
  filename: (req, file, cb) => {
    // 修复中文文件名乱码
    const fixedName = fixFileNameEncoding(file.originalname);
    // 保留原始文件名，清理特殊字符，避免覆盖
    const sanitizedName = sanitizeFileName(path.basename(fixedName));
    const ext = path.extname(sanitizedName);
    const nameWithoutExt = path.basename(sanitizedName, ext) || 'file';

    let fileName = sanitizedName;
    let counter = 1;

    const shareDir = getShareFolder();
    while (fs.existsSync(path.join(shareDir, fileName))) {
      fileName = `${nameWithoutExt}_${counter}${ext}`;
      counter++;
    }

    cb(null, fileName);
  }
});

const upload = multer({ storage });

// 获取共享文件夹文件列表
router.get('/list', async (req, res) => {
  try {
    const shareDir = getShareFolder();

    if (!fs.existsSync(shareDir)) {
      return res.json({ success: true, files: [] });
    }

    const files = fs.readdirSync(shareDir, { withFileTypes: true });

    const fileList = files
      .filter(dirent => dirent.isFile() && !dirent.name.startsWith('.') && dirent.name !== '.text-records.json')
      .map(dirent => {
        const filePath = path.join(shareDir, dirent.name);
        const stats = fs.statSync(filePath);
        return {
          name: dirent.name,
          displayName: dirent.name,
          type: 'file',
          size: stats.size,
          modifiedTime: stats.mtime.toISOString(),
          createdTime: stats.birthtime.toISOString(),
          extension: path.extname(dirent.name).toLowerCase().slice(1) || ''
        };
      });

    // 获取文本记录列表
    const textRecords = readTextRecords();

    // 合并并排序（按修改时间倒序）
    const allItems = [...fileList, ...textRecords].sort(
      (a, b) => new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime()
    );

    res.json({
      success: true,
      files: allItems,
      folder: shareDir,
      // 规范的数据结构，供 SuperTable 组件使用
      data: allItems,
      total: allItems.length
    });
  } catch (error) {
    console.error('Get file list error:', error);
    res.status(500).json({ success: false, error: 'Failed to get file list' });
  }
});

// 下载文件
router.get('/download/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const shareDir = getShareFolder();
    const filePath = path.join(shareDir, filename);

    // 防止路径穿越攻击
    if (!isPathSafe(filePath, shareDir)) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }

    res.download(filePath, filename);
  } catch (error) {
    console.error('Download file error:', error);
    res.status(500).json({ success: false, error: 'Failed to download file' });
  }
});

// 上传文件
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    
    const fileInfo = {
      name: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      path: req.file.path
    };
    
    res.json({ success: true, file: fileInfo });
  } catch (error) {
    console.error('Upload file error:', error);
    res.status(500).json({ success: false, error: 'Failed to upload file' });
  }
});

// 删除文件
router.delete('/delete/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const shareDir = getShareFolder();
    const filePath = path.join(shareDir, filename);

    // 防止路径穿越攻击
    if (!isPathSafe(filePath, shareDir)) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }

    fs.unlinkSync(filePath);
    res.json({ success: true, message: 'File deleted' });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete file' });
  }
});

/**
 * ==================== 文本记录功能 ====================
 */

/**
 * 文本记录存储文件路径
 */
const getTextRecordsPath = (): string => {
  const shareDir = getShareFolder();
  return path.join(shareDir, '.text-records.json');
};

/**
 * 读取文本记录
 */
const readTextRecords = (): any[] => {
  const recordsPath = getTextRecordsPath();
  if (!fs.existsSync(recordsPath)) {
    return [];
  }
  try {
    const data = JSON.parse(fs.readFileSync(recordsPath, 'utf-8'));
    return data.records || [];
  } catch (error) {
    return [];
  }
};

/**
 * 保存文本记录
 */
const saveTextRecords = (records: any[]): void => {
  const recordsPath = getTextRecordsPath();
  fs.writeFileSync(recordsPath, JSON.stringify({
    records,
    version: '1.0'
  }, null, 2));
};

// 获取文本记录列表
router.get('/text-records', async (req, res) => {
  try {
    const records = readTextRecords();
    res.json({ success: true, records });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get text records' });
  }
});

// 创建文本记录
router.post('/text-records', async (req, res) => {
  try {
    const { displayName, content } = req.body;

    if (!displayName || !content) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const records = readTextRecords();
    const now = new Date().toISOString();
    const id = `text_${Date.now()}`;

    const newRecord = {
      id,
      name: id,
      displayName: displayName.trim(),
      type: 'text',
      content: content.trim(),
      size: content.length,
      createdTime: now,
      modifiedTime: now
    };

    records.push(newRecord);
    saveTextRecords(records);

    res.json({ success: true, record: newRecord });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create text record' });
  }
});

// 更新文本记录
router.put('/text-records/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { displayName, content } = req.body;

    const records = readTextRecords();
    const index = records.findIndex(r => r.id === id);

    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Record not found' });
    }

    records[index] = {
      ...records[index],
      displayName: displayName?.trim() || records[index].displayName,
      content: content?.trim() || records[index].content,
      size: (content?.trim() || records[index].content).length,
      modifiedTime: new Date().toISOString()
    };

    saveTextRecords(records);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update text record' });
  }
});

// 删除文本记录
router.delete('/text-records/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const records = readTextRecords();
    const index = records.findIndex(r => r.id === id);

    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Record not found' });
    }

    records.splice(index, 1);
    saveTextRecords(records);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete text record' });
  }
});

export { router as fileShareRouter };
