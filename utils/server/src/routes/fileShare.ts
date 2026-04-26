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

// 配置 multer 上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const shareDir = getShareFolder();
    cb(null, shareDir);
  },
  filename: (req, file, cb) => {
    // 保留原始文件名，清理特殊字符，避免覆盖
    const sanitizedName = sanitizeFileName(path.basename(file.originalname));
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
      .filter(dirent => dirent.isFile())
      .map(dirent => {
        const filePath = path.join(shareDir, dirent.name);
        const stats = fs.statSync(filePath);
        return {
          name: dirent.name,
          size: stats.size,
          modifiedTime: stats.mtime.toISOString(),
          createdTime: stats.birthtime.toISOString(),
          extension: path.extname(dirent.name).toLowerCase().slice(1) || ''
        };
      });
    
    // 按修改时间倒序排列
    fileList.sort((a, b) => new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime());
    
    res.json({ success: true, files: fileList, folder: shareDir });
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

export { router as fileShareRouter };
