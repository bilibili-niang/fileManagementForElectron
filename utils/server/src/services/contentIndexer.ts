import fs from 'fs/promises';
import path from 'path';
import { DatabaseService } from './databaseService';

// 高优先级内容索引（文本文件，内容可搜索）
const HIGH_PRIORITY_TEXT = new Set([
  // 代码文件
  'js', 'ts', 'jsx', 'tsx', 'vue', 'html', 'htm', 'css', 'scss', 'sass', 'less',
  'py', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'go', 'rs', 'rb', 'php', 'swift',
  'kt', 'kts', 'scala', 'r', 'm', 'mm', 'sql', 'sh', 'bash', 'zsh', 'ps1',
  // 配置文件
  'json', 'xml', 'yaml', 'yml', 'toml', 'ini', 'conf', 'config', 'properties',
  'env', 'gitignore', 'dockerignore', 'editorconfig',
  // 文档文件
  'txt', 'md', 'markdown', 'rst', 'log', 'csv', 'tsv'
]);

// 中等优先级（文档，可以提取文本）
const MEDIUM_PRIORITY_DOCS = new Set([
  'docx',   // Word
  'xlsx',   // Excel
  'pptx',   // PowerPoint
  'pdf',    // PDF（基础提取）
  'odt', 'ods', 'odp'  // OpenDocument
]);

// 低优先级（可能包含文本，但大部分是二进制）
const LOW_PRIORITY_BINARY = new Set([
  // 尝试提取文本，但可能失败
  'svg',    // XML 格式，可能包含文本
  'vue',    // 已包含在上面
  'svelte'  // 已包含在上面
]);

// 不支持内容搜索的文件（纯二进制）
const UNSUPPORTED_BINARY = new Set([
  // 可执行文件
  'exe', 'dll', 'so', 'dylib', 'bin', 'msi', 'dmg', 'pkg', 'deb', 'rpm',
  // 图片
  'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'ico', 'tif', 'tiff', 'raw', 'psd', 'ai', 'svg',
  // 视频
  'mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'm4v', 'mpg', 'mpeg', '3gp',
  // 音频
  'mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a', 'opus',
  // 压缩包
  'zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'lz4', 'zst',
  // 旧版 Office
  'doc', 'xls', 'ppt',
  // 数据库
  'db', 'sqlite', 'sqlite3', 'mdb', 'accdb',
  // 字体
  'ttf', 'otf', 'woff', 'woff2', 'eot',
  // 编译后的文件
  'obj', 'o', 'a', 'lib', 'pyc', 'class', 'jar', 'war', 'ear',
  'pdb', 'ilk', 'exp'
]);

export interface FileContent {
  fileId: number;
  content: string;
  contentPreview: string;
}

export interface ContentIndexConfig {
  enableHighPriority: boolean;    // 文本文件（推荐开启）
  enableMediumPriority: boolean;  // 文档（推荐开启）
  enableLowPriority: boolean;     // 尝试索引（可选）
  maxFileSizeMB: number;          // 最大文件大小
}

export class ContentIndexer {
  private dbService: DatabaseService;
  private config: ContentIndexConfig;

  constructor(config: ContentIndexConfig = {
    enableHighPriority: true,
    enableMediumPriority: true,
    enableLowPriority: false,
    maxFileSizeMB: 10
  }) {
    this.dbService = new DatabaseService();
    this.config = config;
  }

  // 更新配置
  setConfig(config: Partial<ContentIndexConfig>) {
    this.config = { ...this.config, ...config };
  }

  // 检查文件是否支持内容索引
  isTextFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase().replace('.', '');
    
    // 如果是明确不支持的二进制文件，直接返回 false
    if (UNSUPPORTED_BINARY.has(ext)) {
      return false;
    }
    
    // 高优先级文本文件
    if (this.config.enableHighPriority && HIGH_PRIORITY_TEXT.has(ext)) {
      return true;
    }
    
    // 中等优先级文档
    if (this.config.enableMediumPriority && MEDIUM_PRIORITY_DOCS.has(ext)) {
      return true;
    }
    
    // 低优先级（可选）
    if (this.config.enableLowPriority && LOW_PRIORITY_BINARY.has(ext)) {
      return true;
    }
    
    // 未知扩展名，尝试检测
    return this.config.enableLowPriority;
  }

  // 获取文件优先级
  getFilePriority(filePath: string): 'high' | 'medium' | 'low' | 'none' {
    const ext = path.extname(filePath).toLowerCase().replace('.', '');
    
    if (HIGH_PRIORITY_TEXT.has(ext)) return 'high';
    if (MEDIUM_PRIORITY_DOCS.has(ext)) return 'medium';
    if (LOW_PRIORITY_BINARY.has(ext)) return 'low';
    if (UNSUPPORTED_BINARY.has(ext)) return 'none';
    return 'low'; // 未知类型尝试索引
  }

  // 检查是否是文档格式
  isDocumentFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase().replace('.', '');
    return MEDIUM_PRIORITY_DOCS.has(ext);
  }

  // 读取文件内容
  async readFileContent(filePath: string): Promise<string | null> {
    try {
      // 检查文件大小
      const stats = await fs.stat(filePath);
      const maxSize = this.config.maxFileSizeMB * 1024 * 1024;
      
      if (stats.size > maxSize) {
        console.log(`File too large (${(stats.size / 1024 / 1024).toFixed(2)}MB), skipping: ${filePath}`);
        return null;
      }

      const ext = path.extname(filePath).toLowerCase().replace('.', '');

      // 根据文件类型选择不同的读取方式
      if (MEDIUM_PRIORITY_DOCS.has(ext)) {
        return await this.extractDocumentText(filePath, ext);
      }

      // 普通文本文件
      const buffer = await fs.readFile(filePath);
      
      // 检查是否是二进制文件
      if (this.isBinaryBuffer(buffer)) {
        console.log(`Binary file detected, skipping: ${filePath}`);
        return null;
      }

      return buffer.toString('utf-8');
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
      return null;
    }
  }

  // 从文档中提取文本
  private async extractDocumentText(filePath: string, ext: string): Promise<string | null> {
    try {
      switch (ext) {
        case 'docx':
          return await this.extractDocxText(filePath);
        case 'pdf':
          return await this.extractPdfText(filePath);
        case 'xlsx':
          return await this.extractXlsxText(filePath);
        case 'pptx':
          return await this.extractPptxText(filePath);
        default:
          console.log(`Unsupported document format: ${ext}`);
          return null;
      }
    } catch (error) {
      console.error(`Error extracting text from ${filePath}:`, error);
      return null;
    }
  }

  // 提取 docx 文本
  private async extractDocxText(filePath: string): Promise<string | null> {
    try {
      const mammoth = await import('mammoth');
      const result = await mammoth.default.extractRawText({ path: filePath });
      return result.value;
    } catch (error) {
      console.error('Error extracting docx text:', error);
      return null;
    }
  }

  // 提取 pdf 文本
  private async extractPdfText(filePath: string): Promise<string | null> {
    try {
      const buffer = await fs.readFile(filePath);
      const content = buffer.toString('utf-8');
      
      // 提取括号中的文本
      const textMatches = content.match(/\(([^)]+)\)/g);
      if (textMatches) {
        return textMatches.map(m => m.slice(1, -1)).join(' ');
      }
      
      // 提取 stream 中的文本
      const streamMatches = content.match(/stream\s*([\s\S]*?)\s*endstream/g);
      if (streamMatches) {
        return streamMatches.join(' ').substring(0, 50000);
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting pdf text:', error);
      return null;
    }
  }

  // 提取 xlsx 文本
  private async extractXlsxText(filePath: string): Promise<string | null> {
    try {
      const buffer = await fs.readFile(filePath);
      const content = buffer.toString('utf-8');
      
      const textMatches = content.match(/<t>([^<]+)<\/t>/g);
      if (textMatches) {
        return textMatches.map(m => m.replace(/<\/?t>/g, '')).join(' ');
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting xlsx text:', error);
      return null;
    }
  }

  // 提取 pptx 文本
  private async extractPptxText(filePath: string): Promise<string | null> {
    try {
      const buffer = await fs.readFile(filePath);
      const content = buffer.toString('utf-8');
      
      const textMatches = content.match(/<a:t>([^<]+)<\/a:t>/g);
      if (textMatches) {
        return textMatches.map(m => m.replace(/<\/?a:t>/g, '')).join(' ');
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting pptx text:', error);
      return null;
    }
  }

  // 检查缓冲区是否是二进制
  private isBinaryBuffer(buffer: Buffer): boolean {
    const sampleSize = Math.min(buffer.length, 8000);
    for (let i = 0; i < sampleSize; i++) {
      if (buffer[i] === 0) {
        return true;
      }
    }
    return false;
  }

  // 生成内容预览
  generatePreview(content: string, maxLength: number = 500): string {
    if (content.length <= maxLength) {
      return content;
    }
    return content.substring(0, maxLength) + '...';
  }

  // 索引单个文件的内容
  async indexFileContent(fileId: number, filePath: string): Promise<boolean> {
    const ext = path.extname(filePath).toLowerCase().replace('.', '');
    
    if (!this.isTextFile(filePath)) {
      console.log(`[ContentIndexer] Skipping non-text file: ${filePath} (ext: ${ext})`);
      return false;
    }

    console.log(`[ContentIndexer] Indexing file: ${filePath} (ext: ${ext})`);

    const content = await this.readFileContent(filePath);
    if (!content) {
      console.log(`[ContentIndexer] No content extracted from: ${filePath}`);
      return false;
    }

    console.log(`[ContentIndexer] Extracted ${content.length} chars from: ${filePath}`);

    const preview = this.generatePreview(content);
    
    try {
      await this.dbService.saveFileContent(fileId, content, preview);
      console.log(`[ContentIndexer] Successfully indexed: ${filePath}`);
      return true;
    } catch (error) {
      console.error(`[ContentIndexer] Error saving file content for ${filePath}:`, error);
      return false;
    }
  }

  // 搜索文件内容
  async searchContent(
    keyword: string,
    page: number = 1,
    pageSize: number = 50
  ): Promise<{
    results: Array<{
      id: number;
      name: string;
      path: string;
      extension: string;
      size: number;
      modified_time: string;
      contentPreview: string;
      matchCount: number;
    }>;
    totalPages: number;
    currentPage: number;
  }> {
    return this.dbService.searchFileContent(keyword, page, pageSize);
  }

  // 获取内容索引统计
  async getStats(): Promise<{
    totalIndexed: number;
    byPriority: {
      high: number;
      medium: number;
      low: number;
    };
  }> {
    // 这里可以从数据库查询统计信息
    return {
      totalIndexed: 0,
      byPriority: { high: 0, medium: 0, low: 0 }
    };
  }
}
