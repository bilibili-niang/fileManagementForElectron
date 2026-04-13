import fs from 'fs/promises';
import { DatabaseService } from './databaseService';
import { FileIndexer } from './fileIndexer';
import { ContentIndexer } from './contentIndexer';

export interface FileResult {
  id: number;
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

export interface SearchResult {
  files: FileResult[];
  totalPages: number;
  currentPage: number;
}

export interface FileCounts {
  all: number;
  images: number;
  documents: number;
  code: number;
  videos: number;
  audio: number;
  archives: number;
  executables: number;
  other: number;
}

export class FileService {
  private dbService: DatabaseService;
  private fileIndexer: FileIndexer;
  private contentIndexer: ContentIndexer;

  constructor() {
    this.dbService = new DatabaseService();
    this.fileIndexer = new FileIndexer();
    this.contentIndexer = new ContentIndexer();
  }

  // 搜索文件
  async searchFiles(
    query: string,
    page: number,
    pageSize: number,
    options: {
      fileType?: string;
      minSize?: number;
      maxSize?: number;
    } = {}
  ): Promise<SearchResult> {
    return this.dbService.searchFiles(query, page, pageSize, options);
  }

  // 按分类获取文件
  async getFilesByCategory(category: string, page: number, pageSize: number): Promise<SearchResult> {
    return this.dbService.getFilesByCategory(category, page, pageSize);
  }

  // 搜索文件内容
  async searchFileContent(
    keyword: string,
    page: number,
    pageSize: number
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
    return this.contentIndexer.searchContent(keyword, page, pageSize);
  }

  // 获取内容索引统计
  async getContentIndexStats(): Promise<{
    totalFiles: number;
    indexedFiles: number;
    lastIndexed: string | null;
  }> {
    return this.dbService.getContentIndexStats();
  }

  // 获取文件统计
  async getFileCounts(): Promise<FileCounts> {
    return this.dbService.getFileCounts();
  }

  // 开始索引 - 立即返回，在后台运行
  async startIndexing(roots: string[]): Promise<void> {
    console.log('FileService: Starting indexing for roots:', roots);
    
    // 在后台启动索引，不等待完成
    this.fileIndexer.startIndexing(roots, {
      excludeNodeModules: true,
      onProgress: (progress) => {
        console.log(`Indexing progress: ${(progress.progress * 100).toFixed(1)}% - ${progress.currentPath}`);
      }
    }).catch(error => {
      console.error('Background indexing error:', error);
    });
  }

  // 停止索引
  async stopIndexing(): Promise<void> {
    console.log('FileService: Stopping indexing');
    this.fileIndexer.stopIndexing();
  }

  // 获取索引进度
  async getIndexingProgress() {
    return this.fileIndexer.getProgress();
  }

  // 清除所有数据
  async clearAllData(): Promise<void> {
    console.log('FileService: Clearing all data');
    await this.dbService.clearAllData();
  }

  // 获取文件打开方式配置列表
  async getFileOpenConfigs(): Promise<Array<{
    extension: string;
    open_method: string;
    internal_viewer: string | null;
  }>> {
    return this.dbService.getFileOpenConfigs();
  }

  // 获取单个文件类型的打开方式配置
  async getFileOpenConfig(extension: string): Promise<{
    open_method: string;
    internal_viewer: string | null;
  } | null> {
    return this.dbService.getFileOpenConfig(extension);
  }

  // 保存文件打开方式配置
  async saveFileOpenConfig(
    extension: string,
    openMethod: string,
    internalViewer: string | null
  ): Promise<void> {
    await this.dbService.saveFileOpenConfig(extension, openMethod, internalViewer);
  }

  // 删除文件打开方式配置
  async deleteFileOpenConfig(extension: string): Promise<void> {
    await this.dbService.deleteFileOpenConfig(extension);
  }

  // 打开文件
  async openFile(filePath: string): Promise<string> {
    try {
      // 先检查文件是否存在
      await fs.access(filePath);
      const content = await fs.readFile(filePath, 'utf-8');
      return content;
    } catch (error: any) {
      console.error('Error opening file:', error);
      if (error.code === 'ENOENT') {
        throw new Error('文件不存在，可能已被删除或移动');
      }
      throw new Error('Failed to open file');
    }
  }

  // 保存文件
  async saveFile(filePath: string, content: string): Promise<void> {
    try {
      await fs.writeFile(filePath, content, 'utf-8');
    } catch (error) {
      console.error('Error saving file:', error);
      throw new Error('Failed to save file');
    }
  }

  // 获取图片文件 Buffer
  async getImageBuffer(filePath: string): Promise<Buffer> {
    try {
      const buffer = await fs.readFile(filePath);
      return buffer;
    } catch (error) {
      console.error('Error reading image file:', error);
      throw new Error('Failed to read image file');
    }
  }

  // 用系统默认程序打开文件
  async openWithSystem(filePath: string): Promise<void> {
    try {
      const { exec } = await import('child_process');
      const platform = process.platform;
      
      let command: string;
      if (platform === 'win32') {
        command = `start "" "${filePath}"`;
      } else if (platform === 'darwin') {
        command = `open "${filePath}"`;
      } else {
        command = `xdg-open "${filePath}"`;
      }
      
      exec(command, (error) => {
        if (error) {
          console.error('Error opening file with system:', error);
        }
      });
    } catch (error) {
      console.error('Error opening file with system:', error);
      throw new Error('Failed to open file with system');
    }
  }

  // 解析 docx 文件内容为 HTML
  async parseDocx(filePath: string): Promise<{ html: string; text: string }> {
    try {
      const mammoth = await import('mammoth');
      const result = await mammoth.default.convertToHtml({ path: filePath });
      const textResult = await mammoth.default.extractRawText({ path: filePath });
      
      return {
        html: result.value,
        text: textResult.value
      };
    } catch (error) {
      console.error('Error parsing docx:', error);
      throw new Error('Failed to parse docx file');
    }
  }
}
