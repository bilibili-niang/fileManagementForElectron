import fs from 'fs/promises';
import path from 'path';
import { DatabaseService } from './databaseService';
import { ContentIndexer } from './contentIndexer';
import os from 'os';
import crypto from 'crypto';
import { appendFileSync, mkdirSync, existsSync } from 'fs';

// 日志文件路径
const LOG_DIR = 'E:\\superUtils\\.trae\\test';
const LOG_FILE = path.join(LOG_DIR, 'fileIndexer.log');

// 确保日志目录存在
if (!existsSync(LOG_DIR)) {
  mkdirSync(LOG_DIR, { recursive: true });
}

// 写入日志的辅助函数
function writeLog(message: string) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${message}\n`;
  try {
    appendFileSync(LOG_FILE, logLine);
  } catch (e) {
    console.error('Failed to write log:', e);
  }
}

export interface FileInfo {
  name: string;
  path: string;
  extension: string;
  size: number;
  created_time: string;
  modified_time: string;
  accessed_time: string;
  hash: string;
  is_hidden: boolean;
  is_readonly: boolean;
  is_system: boolean;
  attributes: string;
}

interface IndexProgress {
  progress: number;
  currentPath: string;
  currentFile: number;
  totalFiles: number;
}

export class FileIndexer {
  private dbService: DatabaseService;
  private contentIndexer: ContentIndexer;
  private isIndexing: boolean = false;
  private indexedCount: number = 0;
  private totalFiles: number = 0;
  private currentPath: string = '';
  private onProgress?: (progress: IndexProgress) => void;
  private readonly concurrency: number;
  private indexedPaths: Set<string> = new Set();
  private indexedFileIds: Map<string, number> = new Map();  // 路径 -> fileId
  private indexedFileModifiedTimes: Map<string, string> = new Map();  // 路径 -> modified_time
  private fileQueue: string[] = [];

  constructor() {
    this.dbService = new DatabaseService();
    this.contentIndexer = new ContentIndexer();
    // 限制并发数，避免数据库连接过多
    this.concurrency = Math.min(4, os.cpus().length);
    console.log(`FileIndexer initialized with concurrency: ${this.concurrency}`);
  }

  // 开始索引
  async startIndexing(
    drives: string[],
    options: {
      excludeC?: boolean;
      excludeNodeModules?: boolean;
      incremental?: boolean;
      onProgress?: (progress: IndexProgress) => void;
    } = {}
  ): Promise<void> {
    if (this.isIndexing) {
      throw new Error('Indexing already in progress');
    }

    this.isIndexing = true;
    this.indexedCount = 0;
    this.totalFiles = 0;
    this.currentPath = '';
    this.onProgress = options.onProgress;
    this.indexedPaths.clear();
    this.indexedFileIds.clear();
    this.indexedFileModifiedTimes.clear();

    console.log('Starting file indexing for drives:', drives);
    console.log('Options:', options);

    try {
      // 加载排除规则
      await this.loadExcludeRules();

      // 如果是增量索引，加载已索引的文件路径
      if (options.incremental !== false) {
        await this.loadIndexedPaths();
      }

      // 直接扫描并索引文件，边扫描边处理
      console.log('Scanning and indexing files...');
      let totalFilesFound = 0;
      for (const drive of drives) {
        if (!this.isIndexing) break;
        // 修复驱动器路径格式：确保根目录有反斜杠
        let normalizedDrive = drive;
        // D: -> D:\, E: -> E:\
        if (normalizedDrive.length === 2 && normalizedDrive[1] === ':') {
          normalizedDrive = normalizedDrive + '\\';
        }
        writeLog(`[startIndexing] Scanning drive: ${drive} -> ${normalizedDrive}`);
        const driveFileCount = await this.scanAndIndexFiles(normalizedDrive, options);
        totalFilesFound += driveFileCount;
      }
      this.totalFiles = totalFilesFound;
      console.log(`Total files found and indexed: ${this.totalFiles}`);

      console.log(`Indexing completed. Total files indexed: ${this.indexedCount}`);
    } catch (error) {
      console.error('Indexing error:', error);
      throw error;
    } finally {
      this.isIndexing = false;
    }
  }

  // 停止索引
  stopIndexing(): void {
    console.log('Stopping indexing...');
    this.isIndexing = false;
  }

  // 获取索引进度
  getProgress() {
    return {
      isIndexing: this.isIndexing,
      progress: this.totalFiles > 0 ? this.indexedCount / this.totalFiles : 0,
      currentPath: this.currentPath,
      currentFile: this.indexedCount,
      totalFiles: this.totalFiles
    };
  }

  // 加载已索引的文件路径
  private async loadIndexedPaths(): Promise<void> {
    try {
      // 从数据库加载已索引的文件路径和修改时间
      const files = await this.dbService.getAllFilePaths();
      for (const file of files) {
        // 标准化路径格式
        const normalizedPath = path.normalize(path.join(file.path, file.name));
        this.indexedPaths.add(normalizedPath);
        this.indexedFileIds.set(normalizedPath, file.id);
        this.indexedFileModifiedTimes.set(normalizedPath, file.modified_time);
      }
      console.log(`Loaded ${this.indexedPaths.size} indexed files`);
    } catch (error) {
      console.warn('Failed to load indexed paths:', error);
    }
  }

  // 排除规则缓存
  private excludeRules: Array<{
    rule_type: string;
    pattern: string;
    is_regex: boolean;
  }> = [];

  // 加载排除规则
  async loadExcludeRules(): Promise<void> {
    try {
      this.excludeRules = await this.dbService.getEnabledExcludeRules();
      console.log(`Loaded ${this.excludeRules.length} exclude rules`);
    } catch (error) {
      console.error('Failed to load exclude rules:', error);
      // 使用默认规则
      this.excludeRules = [
        { rule_type: 'directory', pattern: 'node_modules', is_regex: false },
        { rule_type: 'directory', pattern: '.git', is_regex: false },
        { rule_type: 'directory', pattern: '.svn', is_regex: false }
      ];
    }
  }

  // 检查是否应该排除该路径
  private shouldExcludePath(filePath: string): boolean {
    const normalizedPath = filePath.toLowerCase();
    
    for (const rule of this.excludeRules) {
      if (!rule.is_regex) {
        // 简单字符串匹配
        if (rule.rule_type === 'directory') {
          // 目录名匹配（检查路径中是否包含该目录）
          const parts = normalizedPath.split(/[\\/]/);
          if (parts.some(part => part === rule.pattern.toLowerCase())) {
            return true;
          }
        } else {
          // 路径模式匹配（包含即可）
          if (normalizedPath.includes(rule.pattern.toLowerCase())) {
            return true;
          }
        }
      } else {
        // 正则表达式匹配
        try {
          const regex = new RegExp(rule.pattern, 'i');
          if (regex.test(filePath)) {
            return true;
          }
        } catch (e) {
          console.warn(`Invalid regex pattern: ${rule.pattern}`);
        }
      }
    }
    
    return false;
  }

  // 检查是否应该排除该目录（向后兼容）
  private shouldExcludeDir(dirName: string): boolean {
    const normalizedName = dirName.toLowerCase();
    return this.excludeRules.some(rule => 
      rule.rule_type === 'directory' && 
      !rule.is_regex && 
      rule.pattern.toLowerCase() === normalizedName
    );
  }

  // 扫描并索引文件（边扫描边处理）
  private async scanAndIndexFiles(
    dirPath: string,
    options: {
      excludeC?: boolean;
      excludeNodeModules?: boolean;
    }
  ): Promise<number> {
    let fileCount = 0;
    const batchSize = 100;
    const filesToIndex: string[] = [];

    try {
      // 检查目录是否存在且可访问
      const dirStat = await fs.stat(dirPath);
      if (!dirStat.isDirectory()) {
        console.warn(`Not a directory: ${dirPath}`);
        return 0;
      }

      // 调试日志：追踪 superUtils 目录
      if (dirPath.includes('superUtils') || dirPath === 'E:\\' || dirPath === 'E:') {
        writeLog(`[scanAndIndexFiles] Scanning directory: ${dirPath}`);
      }

      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      // 分离文件和目录
      const subDirs: string[] = [];

      for (const entry of entries) {
        if (!this.isIndexing) break;

        const fullPath = path.join(dirPath, entry.name);

        // 调试日志：追踪 tsconfig.json 的路径构建
        if (entry.name === 'tsconfig.json' || entry.name === 'config.json' || entry.name === 'package.json') {
          writeLog(`[scanAndIndexFiles] Building path: dirPath=${dirPath}, entry=${entry.name}, fullPath=${fullPath}`);
        }

        if (entry.isDirectory()) {
          if (this.shouldExcludeDir(entry.name)) {
            console.log(`Skipping excluded directory: ${entry.name}`);
            continue;
          }
          subDirs.push(fullPath);
        } else {
          // 检查文件是否应该被排除
          if (this.shouldExcludePath(fullPath)) {
            console.log(`Skipping excluded file: ${fullPath}`);
            continue;
          }
          
          const normalizedPath = path.normalize(fullPath);
          const isNewFile = !this.indexedPaths.has(normalizedPath);
          const isTextFile = this.contentIndexer.isTextFile(fullPath);
          
          // 检查文件修改时间是否发生变化
          let isModified = false;
          if (!isNewFile) {
            try {
              const stats = await fs.stat(fullPath);
              const currentModifiedTime = stats.mtime.toISOString().slice(0, 19).replace('T', ' ');
              const storedModifiedTime = this.indexedFileModifiedTimes.get(normalizedPath);
              if (currentModifiedTime !== storedModifiedTime) {
                isModified = true;
              }
            } catch (error) {
              console.warn(`Failed to get file stats: ${fullPath}`, error);
            }
          }
          
          if (isNewFile || isModified || isTextFile) {
            filesToIndex.push(fullPath);
            fileCount++;
            // 实时更新 totalFiles，让进度显示更准确
            this.totalFiles++;
          }
        }
      }

      // 批量索引当前目录的文件
      if (filesToIndex.length > 0) {
        for (let i = 0; i < filesToIndex.length && this.isIndexing; i += this.concurrency) {
          const batch = filesToIndex.slice(i, i + this.concurrency);
          
          await Promise.all(
            batch.map(async (filePath) => {
              this.currentPath = filePath;

              try {
                // 检查文件是否仍然存在
                await fs.access(filePath);
                await this.indexFile(filePath);
                this.indexedCount++;
              } catch (error) {
                // 文件不存在或无法访问，跳过
                console.warn(`Skipping file (not accessible): ${filePath}`);
              }
            })
          );

          // 每 100 个文件报告一次进度
          if (this.indexedCount % batchSize === 0 && this.onProgress) {
            this.onProgress({
              progress: this.totalFiles > 0 ? this.indexedCount / this.totalFiles : 0,
              currentPath: this.currentPath,
              currentFile: this.indexedCount,
              totalFiles: this.totalFiles
            });
          }
        }
      }

      // 并行递归扫描子目录（限制并发数）
      for (let i = 0; i < subDirs.length && this.isIndexing; i += this.concurrency) {
        const batch = subDirs.slice(i, i + this.concurrency);
        const subDirResults = await Promise.all(
          batch.map(subDir => 
            this.scanAndIndexFiles(subDir, options).catch(error => {
              console.warn(`Cannot access directory: ${subDir}`);
              return 0;
            })
          )
        );
        // 累加子目录的文件数
        fileCount += subDirResults.reduce((sum, count) => sum + count, 0);
      }
    } catch (error) {
      console.warn(`Cannot read directory: ${dirPath}`, error);
    }

    return fileCount;
  }

  // 索引单个文件
  private async indexFile(filePath: string): Promise<void> {
    try {
      const stats = await fs.stat(filePath);

      // 确保是文件而不是目录
      if (!stats.isFile()) {
        console.warn(`Not a file: ${filePath}`);
        return;
      }

      const ext = path.extname(filePath).toLowerCase().replace('.', '');
      const fileName = path.basename(filePath);
      let dirPath = path.dirname(filePath);

      // 调试日志
      if (fileName === 'config.json' || fileName === 'package.json' || fileName === 'tsconfig.json') {
        writeLog(`[indexFile] Processing ${fileName}:`);
        writeLog(`  filePath: ${filePath}`);
        writeLog(`  dirPath (raw): ${dirPath}`);
      }

      // 修复根目录路径格式：E: -> E:\
      if (dirPath.length === 2 && dirPath[1] === ':') {
        dirPath = dirPath + '\\';
      }

      // 再次调试
      if (fileName === 'config.json' || fileName === 'package.json' || fileName === 'tsconfig.json') {
        writeLog(`  dirPath (fixed): ${dirPath}`);
      }

      // 将日期转换为 MySQL DATETIME 格式 (YYYY-MM-DD HH:MM:SS)
      const formatDateTime = (date: Date): string => {
        return date.getFullYear() + '-' +
          String(date.getMonth() + 1).padStart(2, '0') + '-' +
          String(date.getDate()).padStart(2, '0') + ' ' +
          String(date.getHours()).padStart(2, '0') + ':' +
          String(date.getMinutes()).padStart(2, '0') + ':' +
          String(date.getSeconds()).padStart(2, '0');
      };

      // 计算文件哈希（MD5）- 对大文件设置大小限制
      let hash = '';
      try {
        const MAX_HASH_SIZE = 100 * 1024 * 1024; // 100MB
        if (stats.size <= MAX_HASH_SIZE) {
          const fileBuffer = await fs.readFile(filePath);
          hash = crypto.createHash('md5').update(fileBuffer).digest('hex');
        } else {
          console.log(`Skipping hash calculation for large file: ${filePath} (${stats.size} bytes)`);
          hash = '';
        }
      } catch (hashError) {
        console.warn(`[FileIndexer] Failed to calculate hash for ${filePath}:`, hashError);
        hash = '';
      }

      // 获取文件属性（Windows 系统）
      let isHidden = false;
      let isReadonly = false;
      let isSystem = false;
      let attributes = '';
      
      try {
        // 在 Windows 上使用 fs.constants 检查文件属性
        if (process.platform === 'win32') {
          // 检查是否为隐藏文件（通过文件名）
          if (fileName.startsWith('.')) {
            isHidden = true;
          }
          // 检查文件模式
          const mode = stats.mode;
          isReadonly = (mode & 0o200) === 0; // 检查写权限
        } else {
          // Unix/Linux 系统
          isHidden = fileName.startsWith('.');
          const mode = stats.mode;
          isReadonly = (mode & 0o200) === 0;
        }
        
        // 构建属性字符串
        const attrs = [];
        if (isHidden) attrs.push('隐藏');
        if (isReadonly) attrs.push('只读');
        if (isSystem) attrs.push('系统');
        attributes = attrs.join(',');
      } catch (attrError) {
        console.warn(`[FileIndexer] Failed to get attributes for ${filePath}:`, attrError);
      }

      const fileInfo: FileInfo = {
        name: fileName,
        path: dirPath,
        extension: ext,
        size: stats.size,
        created_time: formatDateTime(stats.birthtime),
        modified_time: formatDateTime(stats.mtime),
        accessed_time: formatDateTime(stats.atime),
        hash: hash,
        is_hidden: isHidden,
        is_readonly: isReadonly,
        is_system: isSystem,
        attributes: attributes
      };

      // 检查文件是否已存在
      const normalizedPath = path.normalize(filePath);
      const existingFileId = this.indexedFileIds.get(normalizedPath);
      let fileId: number;
      
      if (existingFileId) {
        // 文件已存在，更新信息
        fileId = existingFileId;
        console.log(`[FileIndexer] File already exists: ${filePath}, fileId: ${fileId}`);
      } else {
        // 新文件，保存到数据库
        fileId = await this.dbService.addFile(fileInfo);
        console.log(`[FileIndexer] Added new file: ${filePath}, fileId: ${fileId}`);
      }

      // 如果是文本文件，同时索引内容
      const isText = this.contentIndexer.isTextFile(filePath);
      console.log(`[FileIndexer] File ${filePath} isTextFile: ${isText}`);
      
      if (fileId > 0 && isText) {
        try {
          // 检查是否已有内容索引
          const hasContent = await this.dbService.hasContentIndex(fileId);
          console.log(`[FileIndexer] File ${filePath} hasContentIndex: ${hasContent}`);
          
          if (!hasContent) {
            console.log(`[FileIndexer] Starting content indexing for: ${filePath}`);
            await this.contentIndexer.indexFileContent(fileId, filePath);
          } else {
            console.log(`[FileIndexer] Skipping content indexing (already indexed): ${filePath}`);
          }
        } catch (contentError) {
          console.warn(`[FileIndexer] Failed to index content for ${filePath}:`, contentError);
          // 内容索引失败不影响文件索引
        }
      }
    } catch (error) {
      console.warn(`Error indexing file ${filePath}:`, error);
      // 记录警告而不是抛出异常，确保索引过程继续执行
    }
  }
}
