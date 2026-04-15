import mysql from 'mysql2/promise';
import { FileResult, SearchResult, FileCounts } from './fileService';

export class DatabaseService {
  private pool: mysql.Pool | null = null;

  constructor() {
    this.initializePool();
  }

  private initializePool() {
    // 从环境变量或配置文件读取数据库配置
    this.pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '123456',
      database: process.env.DB_NAME || 'superutils_file_manager',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }

  // 搜索文件 - 支持高级搜索语法
  async searchFiles(
    query: string,
    page: number,
    pageSize: number,
    options: {
      searchContent?: boolean;
      fileType?: string;
      minSize?: number;
      maxSize?: number;
    } = {}
  ): Promise<SearchResult> {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }

    const offset = (page - 1) * pageSize;

    // 解析搜索查询
    const searchParams = this.parseSearchQuery(query);

    let whereConditions: string[] = [];
    let params: any[] = [];

    // 文件名搜索
    if (searchParams.name) {
      whereConditions.push('(name LIKE ? OR path LIKE ?)');
      params.push(`%${searchParams.name}%`, `%${searchParams.name}%`);
    }

    // 扩展名过滤
    if (searchParams.extension) {
      whereConditions.push('extension = ?');
      params.push(searchParams.extension.toLowerCase());
    }

    // 文件类型过滤
    if (options.fileType) {
      const extensions = this.getFileTypeExtensions(options.fileType);
      if (extensions.length > 0) {
        const placeholders = extensions.map(() => '?').join(',');
        whereConditions.push(`extension IN (${placeholders})`);
        params.push(...extensions);
      }
    }

    // 文件大小过滤
    if (options.minSize !== undefined) {
      whereConditions.push('size >= ?');
      params.push(options.minSize);
    }
    if (options.maxSize !== undefined) {
      whereConditions.push('size <= ?');
      params.push(options.maxSize);
    }

    // 构建 WHERE 子句
    const whereClause = whereConditions.length > 0
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    // 执行查询
    const [rows] = await this.pool.query(
      `SELECT * FROM files 
       ${whereClause}
       ORDER BY modified_time DESC 
       LIMIT ${parseInt(pageSize as any)} OFFSET ${parseInt(offset as any)}`,
      params
    );

    // 获取总数
    const [countRows] = await this.pool.execute(
      `SELECT COUNT(*) as total FROM files ${whereClause}`,
      params
    );

    const total = (countRows as any[])[0].total;
    const totalPages = Math.ceil(total / pageSize);

    return {
      files: rows as FileResult[],
      totalPages,
      currentPage: page
    };
  }

  // 解析搜索查询
  private parseSearchQuery(query: string): {
    name?: string;
    extension?: string;
  } {
    const result: { name?: string; extension?: string } = {};

    // 检查是否有扩展名过滤 (例如: "document pdf" 或 "image jpg")
    const parts = query.trim().split(/\s+/);

    if (parts.length >= 2) {
      // 最后一部分可能是扩展名
      const lastPart = parts[parts.length - 1].toLowerCase();
      if (lastPart.length <= 10 && !lastPart.includes(' ')) {
        result.extension = lastPart.replace('.', '');
        result.name = parts.slice(0, -1).join(' ');
      } else {
        result.name = query;
      }
    } else {
      result.name = query;
    }

    return result;
  }

  // 获取文件类型对应的扩展名列表
  private getFileTypeExtensions(fileType: string): string[] {
    const typeMap: Record<string, string[]> = {
      'image': ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'],
      'document': ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'xls', 'xlsx', 'ppt', 'pptx'],
      'code': ['js', 'ts', 'jsx', 'tsx', 'vue', 'html', 'css', 'py', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'go', 'rs', 'rb', 'php'],
      'video': ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv'],
      'audio': ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma'],
      'archive': ['zip', 'rar', '7z', 'tar', 'gz'],
      'executable': ['exe', 'msi', 'bat', 'cmd', 'sh']
    };

    return typeMap[fileType.toLowerCase()] || [];
  }

  // 按分类获取文件
  async getFilesByCategory(category: string, page: number, pageSize: number): Promise<SearchResult> {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }

    const offset = (page - 1) * pageSize;

    let whereClause = '';
    const params: any[] = [];

    if (category !== 'all') {
      const categoryExtensions: Record<string, string[]> = {
        'images': ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'],
        'documents': ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'],
        'code': ['js', 'ts', 'jsx', 'tsx', 'vue', 'html', 'css', 'py', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'go', 'rs', 'rb', 'php'],
        'videos': ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv'],
        'audio': ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma'],
        'archives': ['zip', 'rar', '7z', 'tar', 'gz'],
        'executables': ['exe', 'msi', 'bat', 'cmd', 'sh']
      };

      const extensions = categoryExtensions[category];
      if (extensions) {
        const placeholders = extensions.map(() => '?').join(',');
        whereClause = `WHERE extension IN (${placeholders})`;
        params.push(...extensions);
      }
    }

    // 使用 query 方法而不是 execute，避免参数类型问题
    const [rows] = await this.pool.query(
      `SELECT * FROM files ${whereClause} ORDER BY modified_time DESC LIMIT ${parseInt(pageSize as any)} OFFSET ${parseInt(offset as any)}`,
      params
    );

    // 获取总数
    let countQuery = 'SELECT COUNT(*) as total FROM files';
    const countParams: any[] = [];

    if (category !== 'all') {
      const categoryExtensions: Record<string, string[]> = {
        'images': ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'],
        'documents': ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'],
        'code': ['js', 'ts', 'jsx', 'tsx', 'vue', 'html', 'css', 'py', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'go', 'rs', 'rb', 'php'],
        'videos': ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv'],
        'audio': ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma'],
        'archives': ['zip', 'rar', '7z', 'tar', 'gz'],
        'executables': ['exe', 'msi', 'bat', 'cmd', 'sh']
      };

      const extensions = categoryExtensions[category];
      if (extensions) {
        const placeholders = extensions.map(() => '?').join(',');
        countQuery += ` WHERE extension IN (${placeholders})`;
        countParams.push(...extensions);
      }
    }

    const [countRows] = await this.pool.execute(countQuery, countParams);
    const total = (countRows as any[])[0].total;
    const totalPages = Math.ceil(total / pageSize);

    return {
      files: rows as FileResult[],
      totalPages,
      currentPage: page
    };
  }

  // 获取文件统计
  async getFileCounts(): Promise<FileCounts> {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }

    const [allResult] = await this.pool.execute('SELECT COUNT(*) as count FROM files');

    const categoryQueries = [
      { name: 'images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'] },
      { name: 'documents', extensions: ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'] },
      { name: 'code', extensions: ['js', 'ts', 'jsx', 'tsx', 'vue', 'html', 'css', 'py', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'go', 'rs', 'rb', 'php'] },
      { name: 'videos', extensions: ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv'] },
      { name: 'audio', extensions: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma'] },
      { name: 'archives', extensions: ['zip', 'rar', '7z', 'tar', 'gz'] },
      { name: 'executables', extensions: ['exe', 'msi', 'bat', 'cmd', 'sh'] }
    ];

    const counts: any = {
      all: (allResult as any[])[0].count
    };

    for (const category of categoryQueries) {
      const placeholders = category.extensions.map(() => '?').join(',');
      const [result] = await this.pool.execute(
        `SELECT COUNT(*) as count FROM files WHERE extension IN (${placeholders})`,
        category.extensions
      );
      counts[category.name] = (result as any[])[0].count;
    }

    // 计算其他
    const values = Object.values(counts) as number[];
    const otherCount = counts.all - values.reduce((a: number, b: number) => a + b, 0) + counts.all;
    counts.other = Math.max(0, otherCount);

    return counts as FileCounts;
  }

  // 添加文件到数据库，返回文件 ID
  async addFile(file: Omit<FileResult, 'id'>): Promise<number> {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }

    const [result] = await this.pool.execute(
      `INSERT INTO files (name, path, extension, size, created_time, modified_time, accessed_time, hash, is_hidden, is_readonly, is_system, attributes, scan_directory_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
       size = VALUES(size), 
       created_time = VALUES(created_time),
       modified_time = VALUES(modified_time),
       accessed_time = VALUES(accessed_time),
       hash = VALUES(hash),
       is_hidden = VALUES(is_hidden),
       is_readonly = VALUES(is_readonly),
       is_system = VALUES(is_system),
       attributes = VALUES(attributes),
       scan_directory_id = VALUES(scan_directory_id)`,
      [file.name, file.path, file.extension, file.size, file.created_time, file.modified_time, file.accessed_time, file.hash, 
       file.is_hidden, file.is_readonly, file.is_system, file.attributes, file.scan_directory_id || null]
    );

    // 如果是新插入的记录，返回插入的 ID
    if ((result as any).insertId) {
      return (result as any).insertId;
    }

    // 如果是更新的记录，查询 ID
    const [rows] = await this.pool.execute(
      'SELECT id FROM files WHERE path = ? AND name = ?',
      [file.path, file.name]
    );

    return (rows as any[])[0]?.id || 0;
  }

  // 获取所有文件路径（用于增量索引）
  async getAllFilePaths(): Promise<{ id: number; path: string; name: string; modified_time: string }[]> {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }

    const [rows] = await this.pool.execute(
      'SELECT id, path, name, modified_time FROM files'
    );

    return rows as { id: number; path: string; name: string; modified_time: string }[];
  }

  // 保存文件内容
  async saveFileContent(fileId: number, content: string, preview: string): Promise<void> {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }

    await this.pool.execute(
      `INSERT INTO file_contents (file_id, content, content_preview) 
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE 
       content = VALUES(content), 
       content_preview = VALUES(content_preview),
       indexed_at = CURRENT_TIMESTAMP`,
      [fileId, content, preview]
    );
  }

  // 检查文件是否已有内容索引
  async hasContentIndex(fileId: number): Promise<boolean> {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }

    const [rows] = await this.pool.execute(
      'SELECT 1 FROM file_contents WHERE file_id = ?',
      [fileId]
    );

    return (rows as any[]).length > 0;
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
    if (!this.pool) {
      throw new Error('Database not initialized');
    }

    const offset = (page - 1) * pageSize;

    // 使用 LIKE 搜索（支持中文）
    const searchPattern = `%${keyword}%`;
    
    const [rows] = await this.pool.query(
      `SELECT 
        f.id, f.name, f.path, f.extension, f.size, f.modified_time,
        fc.content_preview as contentPreview,
        1 as matchCount
       FROM files f
       INNER JOIN file_contents fc ON f.id = fc.file_id
       WHERE LOWER(fc.content) LIKE LOWER(?)
       ORDER BY f.modified_time DESC
       LIMIT ${parseInt(pageSize as any)} OFFSET ${parseInt(offset as any)}`,
      [searchPattern]
    );

    // 获取总数
    const [countRows] = await this.pool.execute(
      `SELECT COUNT(*) as total 
       FROM files f
       INNER JOIN file_contents fc ON f.id = fc.file_id
       WHERE LOWER(fc.content) LIKE LOWER(?)`,
      [searchPattern]
    );

    const total = (countRows as any[])[0].total;
    const totalPages = Math.ceil(total / pageSize);

    return {
      results: rows as any[],
      totalPages,
      currentPage: page
    };
  }

  // 获取内容索引统计
  async getContentIndexStats(): Promise<{
    totalFiles: number;
    indexedFiles: number;
    lastIndexed: string | null;
  }> {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }

    // 获取总文件数
    const [totalResult] = await this.pool.execute('SELECT COUNT(*) as count FROM files');
    const totalFiles = (totalResult as any[])[0].count;

    // 获取已索引内容的文件数
    const [indexedResult] = await this.pool.execute('SELECT COUNT(*) as count FROM file_contents');
    const indexedFiles = (indexedResult as any[])[0].count;

    // 获取最后索引时间
    const [lastIndexedResult] = await this.pool.execute(
      'SELECT MAX(indexed_at) as lastIndexed FROM file_contents'
    );
    const lastIndexed = (lastIndexedResult as any[])[0].lastIndexed;

    return {
      totalFiles,
      indexedFiles,
      lastIndexed
    };
  }

  // 获取扩展名统计（用于调试）
  async getExtensionStats(): Promise<Array<{ extension: string; count: number }>> {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }

    const [rows] = await this.pool.execute(`
      SELECT extension, COUNT(*) as count 
      FROM files 
      WHERE extension IN ('js', 'ts', 'vue', 'html', 'css', 'json', 'md', 'txt', 'py', 'java', 'docx', 'pdf', 'xlsx')
      GROUP BY extension 
      ORDER BY count DESC
      LIMIT 20
    `);

    return rows as any[];
  }

  // 清除所有数据
  async clearAllData(): Promise<void> {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }

    await this.pool.execute('SET FOREIGN_KEY_CHECKS = 0');
    await this.pool.execute('TRUNCATE TABLE file_contents');
    await this.pool.execute('TRUNCATE TABLE files');
    await this.pool.execute('TRUNCATE TABLE scan_directories');
    await this.pool.execute('TRUNCATE TABLE search_history');
    await this.pool.execute('TRUNCATE TABLE debug_logs');
    await this.pool.execute('TRUNCATE TABLE index_exclude_rules');
    await this.pool.execute('TRUNCATE TABLE file_open_config');
    await this.pool.execute('SET FOREIGN_KEY_CHECKS = 1');
    
    // 清除配置表中的扫描目录配置
    await this.pool.execute(
      "DELETE FROM app_config WHERE config_key = 'scan_roots'"
    );
    
    console.log('DatabaseService: All data cleared');
  }

  // 获取文件打开方式配置
  async getFileOpenConfigs(): Promise<Array<{
    extension: string;
    open_method: string;
    internal_viewer: string | null;
  }>> {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }

    const [rows] = await this.pool.execute(
      'SELECT extension, open_method, internal_viewer FROM file_open_config ORDER BY extension'
    );

    return rows as any[];
  }

  // 获取单个文件类型的打开方式配置
  async getFileOpenConfig(extension: string): Promise<{
    open_method: string;
    internal_viewer: string | null;
  } | null> {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }

    const [rows] = await this.pool.execute(
      'SELECT open_method, internal_viewer FROM file_open_config WHERE extension = ?',
      [extension.toLowerCase()]
    );

    const results = rows as any[];
    if (results.length === 0) {
      return null;
    }

    return {
      open_method: results[0].open_method,
      internal_viewer: results[0].internal_viewer
    };
  }

  // 保存文件打开方式配置
  async saveFileOpenConfig(
    extension: string,
    openMethod: string,
    internalViewer: string | null
  ): Promise<void> {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }

    await this.pool.execute(
      `INSERT INTO file_open_config (extension, open_method, internal_viewer)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
       open_method = VALUES(open_method),
       internal_viewer = VALUES(internal_viewer)`,
      [extension.toLowerCase(), openMethod, internalViewer]
    );
  }

  // 删除文件打开方式配置
  async deleteFileOpenConfig(extension: string): Promise<void> {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }

    await this.pool.execute(
      'DELETE FROM file_open_config WHERE extension = ?',
      [extension.toLowerCase()]
    );
  }

  // 测试连接
  async testConnection(): Promise<boolean> {
    try {
      if (!this.pool) return false;
      await this.pool.execute('SELECT 1');
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }

  async getAppConfigValue(key: string): Promise<string | null> {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }

    const [rows] = await this.pool.execute(
      'SELECT config_value FROM app_config WHERE config_key = ? LIMIT 1',
      [key]
    );

    const results = rows as any[];
    if (results.length === 0) return null;
    return results[0].config_value ?? null;
  }

  async setAppConfigValue(key: string, value: string | null): Promise<void> {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }

    await this.pool.execute(
      `INSERT INTO app_config (config_key, config_value)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE
       config_value = VALUES(config_value)`,
      [key, value]
    );
  }

  async getScanRoots(): Promise<string[]> {
    const raw = await this.getAppConfigValue('scan_roots');
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((x) => typeof x === 'string' && x.trim()).map((x) => x.trim());
    } catch {
      return [];
    }
  }

  async setScanRoots(roots: string[]): Promise<void> {
    if (!this.pool) return;
    
    const normalized = Array.from(
      new Set(
        (roots || [])
          .filter((x) => typeof x === 'string')
          .map((x) => x.trim())
          .filter(Boolean)
      )
    );

    try {
      // 获取现有的扫描目录
      const [existingDirs] = await this.pool.execute(
        'SELECT id, path FROM scan_directories'
      );
      const existingPaths = new Map((existingDirs as any[]).map(d => [d.path, d.id]));

      // 找出需要删除的目录（在数据库中但不在新列表中）
      const pathsToDelete: number[] = [];
      for (const [path, id] of existingPaths) {
        if (!normalized.some(newPath => 
          path.toLowerCase() === newPath.toLowerCase()
        )) {
          pathsToDelete.push(id);
        }
      }

      // 删除不再使用的扫描目录（级联删除会自动清理 files 表）
      if (pathsToDelete.length > 0) {
        console.log('Removing scan directories:', pathsToDelete);
        const placeholders = pathsToDelete.map(() => '?').join(',');
        await this.pool.execute(
          `DELETE FROM scan_directories WHERE id IN (${placeholders})`,
          pathsToDelete
        );
      }

      // 添加新的扫描目录
      for (const root of normalized) {
        if (!existingPaths.has(root)) {
          // 从路径中提取目录名称
          const pathParts = root.split(/[\\/]/);
          const name = pathParts[pathParts.length - 1] || root;
          
          await this.pool.execute(
            `INSERT INTO scan_directories (path, name) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE path = VALUES(path)`,
            [root, name]
          );
        }
      }

      // 同时更新 app_config 保持兼容性
      await this.setAppConfigValue('scan_roots', JSON.stringify(normalized));
    } catch (error) {
      console.error('Error setting scan roots:', error);
      throw error;
    }
  }

  // 获取扫描目录及其ID
  async getScanDirectories(): Promise<Array<{id: number; path: string; name: string}>> {
    if (!this.pool) return [];
    
    const [rows] = await this.pool.execute(
      'SELECT id, path, name FROM scan_directories WHERE is_enabled = TRUE ORDER BY id'
    );
    
    return rows as Array<{id: number; path: string; name: string}>;
  }

  // 根据路径获取扫描目录ID
  async getScanDirectoryIdByPath(path: string): Promise<number | null> {
    if (!this.pool) return null;
    
    const [rows] = await this.pool.execute(
      'SELECT id FROM scan_directories WHERE path = ?',
      [path]
    );
    
    const result = rows as any[];
    return result[0]?.id || null;
  }

  // 更新扫描目录的文件数量和最后扫描时间
  async updateScanDirectoryStats(directoryId: number, fileCount: number): Promise<void> {
    if (!this.pool) return;
    
    await this.pool.execute(
      `UPDATE scan_directories 
       SET file_count = ?, last_scan_at = NOW() 
       WHERE id = ?`,
      [fileCount, directoryId]
    );
  }

  // ==================== 索引排除规则管理 ====================

  // 获取所有排除规则
  async getExcludeRules(): Promise<Array<{
    id: number;
    rule_type: string;
    pattern: string;
    description: string;
    is_regex: boolean;
    is_enabled: boolean;
    priority: number;
  }>> {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }

    const [results] = await this.pool.execute(
      `SELECT id, rule_type, pattern, description, is_regex, is_enabled, priority 
       FROM index_exclude_rules 
       ORDER BY priority DESC, created_at ASC`
    );

    return results as any[];
  }

  // 获取启用的排除规则（用于索引时）
  async getEnabledExcludeRules(): Promise<Array<{
    rule_type: string;
    pattern: string;
    is_regex: boolean;
  }>> {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }

    const [results] = await this.pool.execute(
      `SELECT rule_type, pattern, is_regex 
       FROM index_exclude_rules 
       WHERE is_enabled = TRUE
       ORDER BY priority DESC`
    );

    return results as any[];
  }

  // 添加排除规则
  async addExcludeRule(rule: {
    rule_type: string;
    pattern: string;
    description?: string;
    is_regex?: boolean;
    priority?: number;
  }): Promise<number> {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }

    const [result] = await this.pool.execute(
      `INSERT INTO index_exclude_rules (rule_type, pattern, description, is_regex, priority)
       VALUES (?, ?, ?, ?, ?)`,
      [rule.rule_type, rule.pattern, rule.description || '', rule.is_regex || false, rule.priority || 0]
    );

    return (result as any).insertId;
  }

  // 更新排除规则
  async updateExcludeRule(id: number, updates: {
    rule_type?: string;
    pattern?: string;
    description?: string;
    is_regex?: boolean;
    is_enabled?: boolean;
    priority?: number;
  }): Promise<void> {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.rule_type !== undefined) {
      fields.push('rule_type = ?');
      values.push(updates.rule_type);
    }
    if (updates.pattern !== undefined) {
      fields.push('pattern = ?');
      values.push(updates.pattern);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.is_regex !== undefined) {
      fields.push('is_regex = ?');
      values.push(updates.is_regex);
    }
    if (updates.is_enabled !== undefined) {
      fields.push('is_enabled = ?');
      values.push(updates.is_enabled);
    }
    if (updates.priority !== undefined) {
      fields.push('priority = ?');
      values.push(updates.priority);
    }

    if (fields.length === 0) return;

    values.push(id);
    await this.pool.execute(
      `UPDATE index_exclude_rules SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  // 删除排除规则
  async deleteExcludeRule(id: number): Promise<void> {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }

    await this.pool.execute(
      'DELETE FROM index_exclude_rules WHERE id = ?',
      [id]
    );
  }

  // ==================== 搜索历史管理 ====================

  // 添加搜索历史
  async addSearchHistory(query: string, searchType: string = 'filename', resultCount: number = 0): Promise<void> {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }

    // 先删除相同查询的历史记录（避免重复）
    await this.pool.execute(
      'DELETE FROM search_history WHERE query = ? AND search_type = ?',
      [query, searchType]
    );

    // 插入新的历史记录
    await this.pool.execute(
      `INSERT INTO search_history (query, search_type, result_count, created_at)
       VALUES (?, ?, ?, NOW())`,
      [query, searchType, resultCount]
    );

    // 只保留最近 50 条记录
    await this.pool.execute(`
      DELETE FROM search_history 
      WHERE id NOT IN (
        SELECT id FROM (
          SELECT id FROM search_history 
          ORDER BY created_at DESC 
          LIMIT 50
        ) AS tmp
      )
    `);
  }

  // 获取搜索历史
  async getSearchHistory(limit: number = 20, searchType?: string): Promise<Array<{
    id: number;
    query: string;
    search_type: string;
    result_count: number;
    created_at: string;
  }>> {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }

    let sql = `SELECT id, query, search_type, result_count, created_at 
               FROM search_history`;
    let params: any[] = [];

    if (searchType) {
      sql += ' WHERE search_type = ?';
      params.push(searchType);
    }

    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(Math.floor(limit));

    console.log('[getSearchHistory] SQL:', sql);
    console.log('[getSearchHistory] Params:', params);

    const [results] = await this.pool.execute(sql, params);
    return results as any[];
  }

  // 搜索历史建议
  async getSearchSuggestions(partialQuery: string, limit: number = 10): Promise<Array<{
    query: string;
    type: 'history' | 'file';
  }>> {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }

    // 从历史记录中搜索匹配的建议
    const [results] = await this.pool.execute(
      `SELECT query, 'history' as type 
       FROM search_history 
       WHERE query LIKE ? 
       ORDER BY created_at DESC 
       LIMIT ?`,
      [`%${partialQuery}%`, limit]
    );

    return results as any[];
  }

  // 清除搜索历史
  async clearSearchHistory(): Promise<void> {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }

    await this.pool.execute('DELETE FROM search_history');
  }

  // 删除单条搜索历史
  async deleteSearchHistory(id: number): Promise<void> {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }

    await this.pool.execute(
      'DELETE FROM search_history WHERE id = ?',
      [id]
    );
  }

  // ==================== 调试日志 ====================

  // 添加调试日志
  async addDebugLog(component: string, message: string, data?: any): Promise<void> {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }

    await this.pool.execute(
      `INSERT INTO debug_logs (component, message, data, created_at)
       VALUES (?, ?, ?, NOW())`,
      [component, message, data ? JSON.stringify(data) : null]
    );
  }

  // 获取调试日志
  async getDebugLogs(component?: string, limit: number = 100): Promise<Array<{
    id: number;
    component: string;
    message: string;
    data: any;
    created_at: string;
  }>> {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }

    let sql = `SELECT id, component, message, data, created_at FROM debug_logs`;
    let params: any[] = [];

    if (component) {
      sql += ' WHERE component = ?';
      params.push(component);
    }

    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const [results] = await this.pool.execute(sql, params);
    return (results as any[]).map(row => ({
      ...row,
      data: row.data ? JSON.parse(row.data) : null
    }));
  }

  // 清除调试日志
  async clearDebugLogs(): Promise<void> {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }

    await this.pool.execute('DELETE FROM debug_logs');
  }

  // ==================== 模拟路由管理 ====================

  /**
   * 获取所有模拟路由
   * @returns 模拟路由列表
   */
  async getMockRoutes(): Promise<Array<{
    id: number;
    path: string;
    method: string;
    response: any;
    created_at: Date;
    updated_at: Date;
  }>> {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }

    const [results] = await this.pool.execute(
      `SELECT id, path, method, response, created_at, updated_at 
       FROM mock_routes 
       ORDER BY created_at DESC`
    );

    return (results as any[]).map(row => ({
      ...row,
      response: typeof row.response === 'string' ? JSON.parse(row.response) : row.response
    }));
  }

  /**
   * 添加模拟路由
   * @param method - HTTP请求方法
   * @param path - 路由路径
   * @param response - 响应数据
   */
  async addMockRoute(
    method: string,
    path: string,
    response: any
  ): Promise<void> {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }

    const responseJson = typeof response === 'string' ? response : JSON.stringify(response);

    await this.pool.execute(
      `INSERT INTO mock_routes (method, path, response) 
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE 
       response = VALUES(response),
       updated_at = CURRENT_TIMESTAMP`,
      [method.toUpperCase(), path, responseJson]
    );
  }

  /**
   * 删除模拟路由
   * @param method - HTTP请求方法
   * @param path - 路由路径
   */
  async deleteMockRoute(method: string, path: string): Promise<void> {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }

    await this.pool.execute(
      'DELETE FROM mock_routes WHERE method = ? AND path = ?',
      [method.toUpperCase(), path]
    );
  }

  // ==================== 窗口状态管理 ====================

  /**
   * 获取窗口状态
   * @returns 窗口状态
   */
  async getWindowState(): Promise<{
    width: number;
    height: number;
    x: number;
    y: number;
    is_maximized: boolean;
    is_fullscreen: boolean;
  } | null> {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }

    const [rows] = await this.pool.execute(
      'SELECT width, height, x, y, is_maximized, is_fullscreen FROM window_state WHERE id = 1'
    );

    const results = rows as any[];
    if (results.length === 0) {
      return null;
    }

    return {
      width: results[0].width,
      height: results[0].height,
      x: results[0].x,
      y: results[0].y,
      is_maximized: results[0].is_maximized === 1,
      is_fullscreen: results[0].is_fullscreen === 1
    };
  }

  /**
   * 保存窗口状态
   * @param state - 窗口状态
   */
  async saveWindowState(state: {
    width: number;
    height: number;
    x: number;
    y: number;
    is_maximized: boolean;
    is_fullscreen: boolean;
  }): Promise<void> {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }

    await this.pool.execute(
      `INSERT INTO window_state (id, width, height, x, y, is_maximized, is_fullscreen)
       VALUES (1, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       width = VALUES(width),
       height = VALUES(height),
       x = VALUES(x),
       y = VALUES(y),
       is_maximized = VALUES(is_maximized),
       is_fullscreen = VALUES(is_fullscreen)`,
      [state.width, state.height, state.x, state.y, state.is_maximized ? 1 : 0, state.is_fullscreen ? 1 : 0]
    );
  }
}
