import path from 'path';
import fs from 'fs';
import initSqlJs from 'sql.js';
import { FileResult, SearchResult, FileCounts } from './fileService';

export class DatabaseService {
  private db: any = null;
  private SQL: any = null;
  private dbPath: string = '';

  constructor() {
    this.initializeDatabase();
  }

  /**
   * 初始化SQLite数据库连接
   * 使用sql.js (纯JavaScript SQLite实现)
   */
  private async initializeDatabase() {
    /**
     * 确定数据库文件存储位置
     * 开发环境: server/data/superutils.db
     * 生产环境: Electron用户数据目录
     */
    const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
    
    if (isDev) {
      this.dbPath = path.join(__dirname, '../data/superutils.db');
    } else {
      const appDataPath = process.env.APPDATA || '/tmp';
      this.dbPath = path.join(appDataPath, 'super-utils', 'data', 'superutils.db');
    }

    // 确保目录存在
    const dbDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    try {
      // 初始化 sql.js
      this.SQL = await initSqlJs({
        locateFile: (file: string) => `node_modules/sql.js/dist/${file}`
      });
      
      // 如果数据库文件已存在,则读取它
      if (fs.existsSync(this.dbPath)) {
        const fileBuffer = fs.readFileSync(this.dbPath);
        this.db = new this.SQL.Database(fileBuffer);
        console.log('[DatabaseService] Loaded existing database:', this.dbPath);
      } else {
        // 创建新数据库并初始化表结构
        const { initializeDatabase } = await import('./databaseInit');
        this.db = await initializeDatabase();
      }
      
      console.log('[DatabaseService] Database initialized successfully');
      
    } catch (error) {
      console.error('[DatabaseService] Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * 保存数据库到文件
   */
  private saveDatabase(): void {
    if (!this.db) return;
    
    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(this.dbPath, buffer);
    } catch (error) {
      console.error('[DatabaseService] Failed to save database:', error);
    }
  }

  /**
   * 等待数据库初始化完成
   */
  async ready(): Promise<void> {
    while (!this.db) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * 获取数据库实例
   */
  getDb(): any {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  // ==================== 文件操作方法 ====================

  /**
   * 搜索文件
   */
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
    await this.ready();
    
    const offset = (page - 1) * pageSize;
    
    let whereClause = '';
    const params: any[] = [];
    
    if (query) {
      whereClause += 'WHERE name LIKE ?';
      params.push(`%${query}%`);
    }
    
    if (options.fileType) {
      whereClause += (whereClause ? ' AND' : 'WHERE') + ' extension = ?';
      params.push(options.fileType);
    }
    
    if (options.minSize !== undefined) {
      whereClause += (whereClause ? ' AND' : 'WHERE') + ' size >= ?';
      params.push(options.minSize);
    }
    
    if (options.maxSize !== undefined) {
      whereClause += (whereClause ? ' AND' : 'WHERE') + ' size <= ?';
      params.push(options.maxSize);
    }

    // 查询数据
    const rows = this.db.exec(
      `SELECT * FROM files ${whereClause} ORDER BY modified_time DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );
    
    const files = rows[0]?.values.map((row: any[]) => ({
      id: row[0],
      name: row[1],
      path: row[2],
      extension: row[3],
      size: row[4],
      created_time: row[5],
      modified_time: row[6],
      accessed_time: row[7],
      hash: row[8],
      is_hidden: Boolean(row[9]),
      is_readonly: Boolean(row[10]),
      is_system: Boolean(row[11]),
      attributes: row[12]
    })) || [];

    // 获取总数
    const countResult = this.db.exec(
      `SELECT COUNT(*) as total FROM files ${whereClause}`,
      params
    );
    const total = countResult[0]?.values[0][0] || 0;

    return {
      files,
      totalPages: Math.ceil(total / pageSize),
      currentPage: page,
      total
    };
  }

  /**
   * 根据ID获取文件
   */
  async getFileById(id: number): Promise<FileResult | null> {
    await this.ready();
    
    const result = this.db.exec('SELECT * FROM files WHERE id = ?', [id]);
    const row = result[0]?.values[0];
    
    if (!row) return null;
    
    return {
      id: row[0],
      name: row[1],
      path: row[2],
      extension: row[3],
      size: row[4],
      created_time: row[5],
      modified_time: row[6],
      accessed_time: row[7],
      hash: row[8],
      is_hidden: Boolean(row[9]),
      is_readonly: Boolean(row[10]),
      is_system: Boolean(row[11]),
      attributes: row[12]
    };
  }

  /**
   * 插入或更新文件
   */
  async upsertFile(file: Omit<FileResult, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
    await this.ready();
    
    // 先尝试插入
    try {
      this.db.run(
        `INSERT OR IGNORE INTO files 
         (name, path, extension, size, created_time, modified_time, accessed_time, hash, is_hidden, is_readonly, is_system, attributes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          file.name,
          file.path,
          file.extension,
          file.size,
          file.created_time,
          file.modified_time,
          file.accessed_time,
          file.hash,
          file.is_hidden ? 1 : 0,
          file.is_readonly ? 1 : 0,
          file.is_system ? 1 : 0,
          file.attributes
        ]
      );
      
      // 获取最后插入的ID
      const insertId = this.db.exec("SELECT last_insert_rowid()");
      const id = insertId[0].values[0][0];
      
      if (id > 0) {
        this.saveDatabase();
        return id;
      }
      
      // 如果因为UNIQUE冲突导致插入失败,则执行UPDATE
      this.db.run(
        `UPDATE files SET
         size = ?, modified_time = ?, accessed_time = ?, hash = ?,
         is_hidden = ?, is_readonly = ?, is_system = ?, attributes = ?
         WHERE path = ? AND name = ?`,
        [
          file.size,
          file.modified_time,
          file.accessed_time,
          file.hash,
          file.is_hidden ? 1 : 0,
          file.is_readonly ? 1 : 0,
          file.is_system ? 1 : 0,
          file.attributes,
          file.path,
          file.name
        ]
      );
      
      // 获取更新后的记录ID
      const updateResult = this.db.exec(
        'SELECT id FROM files WHERE path = ? AND name = ?',
        [file.path, file.name]
      );
      const updatedId = updateResult[0].values[0][0];
      
      this.saveDatabase();
      return updatedId;
      
    } catch (error) {
      console.error('[upsertFile] Error:', error);
      throw error;
    }
  }

  /**
   * 删除文件
   */
  async deleteFile(id: number): Promise<boolean> {
    await this.ready();
    
    this.db.run('DELETE FROM files WHERE id = ?', [id]);
    this.saveDatabase();
    return true; // sql.js 不返回影响行数
  }

  // ==================== 搜索历史操作 ====================

  /**
   * 保存搜索历史
   */
  async saveSearchHistory(query: string, searchType: string, resultCount: number): Promise<void> {
    await this.ready();
    
    this.db.run(
      'INSERT INTO search_history (query, search_type, result_count) VALUES (?, ?, ?)',
      [query, searchType, resultCount]
    );
    this.saveDatabase();
  }

  /**
   * 获取搜索历史
   */
  async getSearchHistory(limit: number = 20, type?: string): Promise<any[]> {
    await this.ready();
    
    let sql = 'SELECT id, query, search_type, result_count, created_at FROM search_history';
    const params: any[] = [];

    if (type) {
      sql += ' WHERE search_type = ?';
      params.push(type);
    }

    sql += ' ORDER BY created_at DESC LIMIT ?';
    const limitInt = parseInt(String(limit), 10) || 20;
    params.push(limitInt);

    const result = this.db.exec(sql, params);
    return result[0]?.values.map((row: any[]) => ({
      id: row[0],
      query: row[1],
      search_type: row[2],
      result_count: row[3],
      created_at: row[4]
    })) || [];
  }

  /**
   * 删除搜索历史
   */
  async deleteSearchHistory(id: number): Promise<number> {
    await this.ready();
    
    this.db.run('DELETE FROM search_history WHERE id = ?', [id]);
    this.saveDatabase();
    return 1; // sql.js 假设成功删除
  }

  /**
   * 清除所有搜索历史
   */
  async clearSearchHistory(): Promise<void> {
    await this.ready();

    this.db.run('DELETE FROM search_history');
    this.saveDatabase();
  }

  // ==================== 排除规则操作 ====================

  /**
   * 获取所有排除规则
   */
  async getExcludeRules(): Promise<any[]> {
    await this.ready();

    const result = this.db.exec(
      'SELECT id, rule_type, pattern, description, is_regex, is_enabled, priority, created_at, updated_at FROM index_exclude_rules ORDER BY priority DESC, created_at DESC'
    );

    return result[0]?.values.map((row: any[]) => ({
      id: row[0],
      rule_type: row[1],
      pattern: row[2],
      description: row[3],
      is_regex: row[4],
      is_enabled: row[5],
      priority: row[6],
      created_at: row[7],
      updated_at: row[8]
    })) || [];
  }

  /**
   * 添加排除规则
   */
  async addExcludeRule(rule: {
    rule_type: string;
    pattern: string;
    description?: string;
    is_regex?: boolean;
    priority?: number;
  }): Promise<number> {
    await this.ready();

    this.db.run(
      'INSERT INTO index_exclude_rules (rule_type, pattern, description, is_regex, priority) VALUES (?, ?, ?, ?, ?)',
      [rule.rule_type, rule.pattern, rule.description || '', rule.is_regex ? 1 : 0, rule.priority || 0]
    );

    const insertId = this.db.exec("SELECT last_insert_rowid()");
    const id = insertId[0].values[0][0];

    this.saveDatabase();
    return id;
  }

  /**
   * 更新排除规则
   */
  async updateExcludeRule(id: number, updates: {
    rule_type?: string;
    pattern?: string;
    description?: string;
    is_regex?: boolean;
    is_enabled?: boolean;
    priority?: number;
  }): Promise<number> {
    await this.ready();

    const setFields: string[] = [];
    const params: any[] = [];

    if (updates.rule_type !== undefined) {
      setFields.push('rule_type = ?');
      params.push(updates.rule_type);
    }
    if (updates.pattern !== undefined) {
      setFields.push('pattern = ?');
      params.push(updates.pattern);
    }
    if (updates.description !== undefined) {
      setFields.push('description = ?');
      params.push(updates.description);
    }
    if (updates.is_regex !== undefined) {
      setFields.push('is_regex = ?');
      params.push(updates.is_regex ? 1 : 0);
    }
    if (updates.is_enabled !== undefined) {
      setFields.push('is_enabled = ?');
      params.push(updates.is_enabled ? 1 : 0);
    }
    if (updates.priority !== undefined) {
      setFields.push('priority = ?');
      params.push(updates.priority);
    }

    if (setFields.length === 0) {
      return 0;
    }

    params.push(id);
    this.db.run(
      `UPDATE index_exclude_rules SET ${setFields.join(', ')} WHERE id = ?`,
      params
    );

    this.saveDatabase();
    return 1;
  }

  /**
   * 删除排除规则
   */
  async deleteExcludeRule(id: number): Promise<number> {
    await this.ready();

    this.db.run('DELETE FROM index_exclude_rules WHERE id = ?', [id]);
    this.saveDatabase();
    return 1;
  }

  // ==================== 调试日志操作 ====================

  /**
   * 添加调试日志
   */
  async addDebugLog(component: string, message: string, data?: any): Promise<void> {
    await this.ready();
    
    this.db.run(
      'INSERT INTO debug_logs (component, message, data) VALUES (?, ?, ?)',
      [component, message, data ? JSON.stringify(data) : null]
    );
    this.saveDatabase();
  }

  /**
   * 获取调试日志
   */
  async getDebugLogs(component?: string, limit: number = 100): Promise<any[]> {
    await this.ready();
    
    let sql = 'SELECT * FROM debug_logs';
    const params: any[] = [];

    if (component) {
      sql += ' WHERE component = ?';
      params.push(component);
    }

    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const result = this.db.exec(sql, params);
    return result[0]?.values || [];
  }

  // ==================== 开发环境错误日志操作 ====================

  /**
   * 写入开发环境错误日志
   */
  async addDevErrorLog(log: {
    url: string;
    method: string;
    request_params?: string;
    request_body?: string;
    response_status: number;
    response_body?: string;
    error_message?: string;
  }): Promise<void> {
    await this.ready();

    this.db.run(
      `INSERT INTO dev_error_logs (url, method, request_params, request_body, response_status, response_body, error_message)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [log.url, log.method, log.request_params || null, log.request_body || null,
        log.response_status, log.response_body || null, log.error_message || null]
    );
    this.saveDatabase();
  }

  /**
   * 分页查询开发环境错误日志
   */
  async getDevErrorLogs(page: number = 1, pageSize: number = 20): Promise<{
    logs: any[];
    total: number;
    totalPages: number;
    currentPage: number;
  }> {
    await this.ready();

    const offset = (page - 1) * pageSize;

    const rows = this.db.exec(
      `SELECT * FROM dev_error_logs ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [pageSize, offset]
    );

    const logs = rows[0]?.values.map((row: any[]) => ({
      id: row[0],
      url: row[1],
      method: row[2],
      request_params: row[3],
      request_body: row[4],
      response_status: row[5],
      response_body: row[6],
      error_message: row[7],
      created_at: row[8]
    })) || [];

    const countResult = this.db.exec('SELECT COUNT(*) as total FROM dev_error_logs');
    const total = countResult[0]?.values[0][0] || 0;

    return {
      logs,
      total,
      totalPages: Math.ceil(total / pageSize),
      currentPage: page
    };
  }

  /**
   * 清空开发环境错误日志
   */
  async clearDevErrorLogs(): Promise<void> {
    await this.ready();

    this.db.run('DELETE FROM dev_error_logs');
    this.saveDatabase();
  }

  // ==================== 计算器历史操作 ====================

  /**
   * 获取计算器历史
   */
  async getCalculatorHistory(limit: number = 50): Promise<any[]> {
    await this.ready();
    
    const safeLimit = parseInt(String(limit), 10) || 50;
    const result = this.db.exec(
      'SELECT id, expression, result, created_at FROM calculator_history ORDER BY created_at DESC LIMIT ?',
      [safeLimit]
    );
    
    return result[0]?.values.map((row: any[]) => ({
      id: row[0],
      expression: row[1],
      result: row[2],
      created_at: row[3]
    })) || [];
  }

  /**
   * 添加计算器历史
   */
  async addCalculatorHistory(expression: string, result: string): Promise<void> {
    await this.ready();
    
    this.db.run(
      'INSERT INTO calculator_history (expression, result) VALUES (?, ?)',
      [expression, result]
    );
    this.saveDatabase();
  }

  /**
   * 删除计算器历史
   */
  async deleteCalculatorHistory(id: number): Promise<number> {
    await this.ready();
    
    this.db.run('DELETE FROM calculator_history WHERE id = ?', [id]);
    this.saveDatabase();
    return 1;
  }

  // ==================== 二维码配置操作 ====================

  /**
   * 获取二维码配置
   */
  async getQrcodeConfig(): Promise<any> {
    await this.ready();
    
    const result = this.db.exec('SELECT * FROM qrcode_config WHERE id = 1');
    const row = result[0]?.values[0];
    
    if (!row) return null;
    
    return {
      id: row[0],
      base_url: row[1],
      time_api_url: row[2],
      append_time: Boolean(row[3]),
      qr_size: row[4],
      error_correction_level: row[5],
      updated_at: row[6]
    };
  }

  /**
   * 保存二维码配置
   */
  async saveQrcodeConfig(config: {
    base_url?: string;
    time_api_url?: string;
    append_time?: boolean;
    qr_size?: number;
    error_correction_level?: string;
  }): Promise<void> {
    await this.ready();
    
    const updates: string[] = [];
    const values: any[] = [];

    if (config.base_url !== undefined) {
      updates.push('base_url = ?');
      values.push(config.base_url);
    }
    if (config.time_api_url !== undefined) {
      updates.push('time_api_url = ?');
      values.push(config.time_api_url);
    }
    if (config.append_time !== undefined) {
      updates.push('append_time = ?');
      values.push(config.append_time ? 1 : 0);
    }
    if (config.qr_size !== undefined) {
      updates.push('qr_size = ?');
      values.push(config.qr_size);
    }
    if (config.error_correction_level !== undefined) {
      updates.push('error_correction_level = ?');
      values.push(config.error_correction_level);
    }

    if (updates.length > 0) {
      values.push(1); // id = 1
      this.db.run(
        `UPDATE qrcode_config SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
      this.saveDatabase();
    }
  }

  /**
   * 获取二维码历史
   */
  async getQrcodeHistory(limit: number = 50): Promise<any[]> {
    await this.ready();
    
    const safeLimit = parseInt(String(limit), 10) || 50;
    const result = this.db.exec(
      'SELECT id, base_url, time_api_url, generated_url, append_time, qr_size, error_correction_level, created_at FROM qrcode_history ORDER BY created_at DESC LIMIT ?',
      [safeLimit]
    );
    
    return result[0]?.values.map((row: any[]) => ({
      id: row[0],
      base_url: row[1],
      time_api_url: row[2],
      generated_url: row[3],
      append_time: Boolean(row[4]),
      qr_size: row[5],
      error_correction_level: row[6],
      created_at: row[7]
    })) || [];
  }

  /**
   * 添加二维码历史
   */
  async addQrcodeHistory(history: {
    base_url: string;
    time_api_url?: string;
    generated_url: string;
    append_time: boolean;
    qr_size: number;
    error_correction_level: string;
  }): Promise<number> {
    await this.ready();
    
    this.db.run(
      'INSERT INTO qrcode_history (base_url, time_api_url, generated_url, append_time, qr_size, error_correction_level) VALUES (?, ?, ?, ?, ?, ?)',
      [
        history.base_url,
        history.time_api_url || '',
        history.generated_url,
        history.append_time ? 1 : 0,
        history.qr_size,
        history.error_correction_level
      ]
    );
    
    const insertId = this.db.exec("SELECT last_insert_rowid()");
    const id = insertId[0].values[0][0];
    
    this.saveDatabase();
    return id;
  }

  /**
   * 删除二维码历史
   */
  async deleteQrcodeHistory(id: number): Promise<number> {
    await this.ready();
    
    this.db.run('DELETE FROM qrcode_history WHERE id = ?', [id]);
    this.saveDatabase();
    return 1;
  }

  // ==================== 倒计时操作 ====================

  /**
   * 获取所有倒计时
   */
  async getCountdowns(): Promise<any[]> {
    await this.ready();
    
    const result = this.db.exec(
      "SELECT id, title, date, time, \"repeat\", created_at, updated_at FROM countdowns ORDER BY created_at DESC"
    );
    
    return result[0]?.values.map((row: any[]) => ({
      id: row[0],
      title: row[1],
      date: row[2],
      time: row[3],
      repeat: row[4],
      created_at: row[5],
      updated_at: row[6]
    })) || [];
  }

  /**
   * 添加倒计时
   */
  async addCountdown(countdown: {
    title: string;
    date: string | null;
    time: string | null;
    repeat: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  }): Promise<number> {
    await this.ready();
    
    this.db.run(
      'INSERT INTO countdowns (title, date, time, "repeat") VALUES (?, ?, ?, ?)',
      [countdown.title, countdown.date, countdown.time, countdown.repeat]
    );
    
    const insertId = this.db.exec("SELECT last_insert_rowid()");
    const id = insertId[0].values[0][0];
    
    this.saveDatabase();
    return id;
  }

  /**
   * 更新倒计时
   */
  async updateCountdown(id: number, countdown: {
    title?: string;
    date?: string | null;
    time?: string | null;
    repeat?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  }): Promise<number> {
    await this.ready();
    
    const updates: string[] = [];
    const params: any[] = [];

    if (countdown.title !== undefined) {
      updates.push('title = ?');
      params.push(countdown.title);
    }
    if (countdown.date !== undefined) {
      updates.push('date = ?');
      params.push(countdown.date);
    }
    if (countdown.time !== undefined) {
      updates.push('time = ?');
      params.push(countdown.time);
    }
    if (countdown.repeat !== undefined) {
      updates.push('"repeat" = ?');
      params.push(countdown.repeat);
    }

    if (updates.length === 0) {
      return 0;
    }

    params.push(id);
    this.db.run(
      `UPDATE countdowns SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    
    this.saveDatabase();
    return 1;
  }

  /**
   * 删除倒计时
   */
  async deleteCountdown(id: number): Promise<number> {
    await this.ready();
    
    this.db.run('DELETE FROM countdowns WHERE id = ?', [id]);
    this.saveDatabase();
    return 1;
  }

  // ==================== API文档管理 ====================

  /**
   * 获取所有API文档
   */
  async getApiDocs(): Promise<any[]> {
    await this.ready();

    const result = this.db.exec(
      'SELECT id, name, source_file, created_at, updated_at FROM api_docs ORDER BY updated_at DESC'
    );

    return result[0]?.values.map((row: any[]) => ({
      id: row[0],
      name: row[1],
      source_file: row[2],
      created_at: row[3],
      updated_at: row[4]
    })) || [];
  }

  /**
   * 获取单个API文档
   */
  async getApiDocById(id: number): Promise<any | null> {
    await this.ready();

    const result = this.db.exec(
      'SELECT id, name, source_file, openapi_data, created_at, updated_at FROM api_docs WHERE id = ?',
      [id]
    );

    if (!result[0]?.values?.length) {
      return null;
    }

    const row = result[0].values[0];
    return {
      id: row[0],
      name: row[1],
      source_file: row[2],
      openapi_data: row[3],
      created_at: row[4],
      updated_at: row[5]
    };
  }

  /**
   * 添加API文档
   */
  async addApiDoc(doc: {
    name: string;
    source_file?: string;
    openapi_data: string;
  }): Promise<number> {
    await this.ready();
    
    this.db.run(
      'INSERT INTO api_docs (name, source_file, openapi_data) VALUES (?, ?, ?)',
      [doc.name, doc.source_file || '', doc.openapi_data]
    );
    
    const insertId = this.db.exec("SELECT last_insert_rowid()");
    const id = insertId[0].values[0][0];
    
    this.saveDatabase();
    return id;
  }

  /**
   * 更新API文档
   */
  async updateApiDoc(id: number, doc: {
    name?: string;
    source_file?: string;
    openapi_data?: string;
  }): Promise<number> {
    await this.ready();
    
    const updates: string[] = [];
    const params: any[] = [];

    if (doc.name !== undefined) {
      updates.push('name = ?');
      params.push(doc.name);
    }
    if (doc.source_file !== undefined) {
      updates.push('source_file = ?');
      params.push(doc.source_file);
    }
    if (doc.openapi_data !== undefined) {
      updates.push('openapi_data = ?');
      params.push(doc.openapi_data);
    }

    if (updates.length === 0) {
      return 0;
    }

    params.push(id);
    this.db.run(
      `UPDATE api_docs SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    
    this.saveDatabase();
    return 1;
  }

  /**
   * 删除API文档
   */
  async deleteApiDoc(id: number): Promise<number> {
    await this.ready();
    
    this.db.run('DELETE FROM api_docs WHERE id = ?', [id]);
    this.saveDatabase();
    return 1;
  }

  // ==================== Mock路由操作 ====================

  /**
   * 获取模拟路由
   */
  async getMockRoutes(): Promise<any[]> {
    await this.ready();
    
    const result = this.db.exec(
      'SELECT * FROM mock_routes ORDER BY created_at DESC'
    );
    
    return result[0]?.values.map((row: any[]) => ({
      id: row[0],
      path: row[1],
      method: row[2],
      response: row[3] ? JSON.parse(row[3]) : null,
      created_at: row[4],
      updated_at: row[5]
    })) || [];
  }

  /**
   * 添加模拟路由
   */
  async addMockRoute(method: string, pathStr: string, response: any): Promise<void> {
    await this.ready();
    
    this.db.run(
      `INSERT OR REPLACE INTO mock_routes (method, path, response, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
      [method, pathStr, JSON.stringify(response)]
    );
    this.saveDatabase();
  }

  /**
   * 删除模拟路由
   */
  async deleteMockRoute(method: string, pathStr: string): Promise<void> {
    await this.ready();
    
    this.db.run('DELETE FROM mock_routes WHERE method = ? AND path = ?', [method, pathStr]);
    this.saveDatabase();
  }

  /**
   * 更新模拟路由
   */
  async updateMockRoute(oldMethod: string, oldPath: string, method: string, pathStr: string, response: any): Promise<void> {
    await this.ready();
    
    this.db.run(
      'UPDATE mockRoutes SET method = ?, path = ?, response = ?, updated_at = CURRENT_TIMESTAMP WHERE method = ? AND path = ?',
      [method, pathStr, JSON.stringify(response), oldMethod, oldPath]
    );
    this.saveDatabase();
  }

  // ==================== 文件打开配置操作 ====================

  /**
   * 获取文件打开配置列表
   */
  async getFileOpenConfigs(): Promise<any[]> {
    await this.ready();
    
    const result = this.db.exec(
      'SELECT * FROM file_open_config ORDER BY extension'
    );
    
    return result[0]?.values.map((row: any[]) => ({
      id: row[0],
      extension: row[1],
      open_method: row[2],
      internal_viewer: row[3],
      updated_at: row[4]
    })) || [];
  }

  /**
   * 获取文件打开配置
   */
  async getFileOpenConfig(extension: string): Promise<any | null> {
    await this.ready();
    
    const result = this.db.exec(
      'SELECT * FROM file_open_config WHERE extension = ?',
      [extension]
    );
    const row = result[0]?.values[0];
    
    if (!row) return null;
    
    return {
      id: row[0],
      extension: row[1],
      open_method: row[2],
      internal_viewer: row[3],
      updated_at: row[4]
    };
  }

  /**
   * 保存文件打开配置
   */
  async saveFileOpenConfig(extension: string, openMethod: string, internalViewer?: string): Promise<void> {
    await this.ready();
    
    this.db.run(
      `INSERT OR REPLACE INTO file_open_config (extension, open_method, internal_viewer, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
      [extension, openMethod, internalViewer]
    );
    this.saveDatabase();
  }

  /**
   * 删除文件打开配置
   */
  async deleteFileOpenConfig(extension: string): Promise<void> {
    await this.ready();
    
    this.db.run('DELETE FROM file_open_config WHERE extension = ?', [extension]);
    this.saveDatabase();
  }

  /**
   * 按分类获取文件列表
   * @param category - 文件分类 (image/video/audio/document/code/archive/executable)
   * @param page - 页码
   * @param pageSize - 每页数量
   */
  async getFilesByCategory(category: string, page: number, pageSize: number): Promise<SearchResult> {
    await this.ready();
    
    const extensions = this.getCategoryExtensions(category);
    
    const offset = (page - 1) * pageSize;
    const placeholders = extensions.map(() => '?').join(',');
    
    const countResult = this.db.exec(
      `SELECT COUNT(*) as total FROM files WHERE extension IN (${placeholders})`,
      extensions
    );
    
    const total = countResult[0]?.values[0][0] || 0;
    
    const result = this.db.exec(
      `SELECT id, name, path, extension, size, modified_time, created_time 
       FROM files 
       WHERE extension IN (${placeholders}) 
       ORDER BY modified_time DESC 
       LIMIT ? OFFSET ?`,
      [...extensions, pageSize, offset]
    );
    
    const files = result[0] ? result[0].values.map((row: any[]) => ({
      id: row[0],
      name: row[1],
      path: row[2],
      extension: row[3],
      size: row[4],
      modified_time: row[5],
      created_time: row[6]
    })) : [];
    
    return { success: true, files, total, page, pageSize };
  }

  /**
   * 获取各分类的文件数量统计
   */
  async getFileCounts(): Promise<FileCounts> {
    await this.ready();
    
    const categories = [
      { key: 'images', exts: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico'] },
      { key: 'videos', exts: ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'] },
      { key: 'audio', exts: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a'] },
      { key: 'documents', exts: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'] },
      { key: 'code', exts: ['js', 'ts', 'vue', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'go', 'rs'] },
      { key: 'archives', exts: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'] },
      { key: 'executables', exts: ['exe', 'msi', 'dmg', 'pkg', 'deb', 'rpm', 'appimage'] }
    ];
    
    const counts: FileCounts = {
      all: 0,
      images: 0,
      videos: 0,
      audio: 0,
      documents: 0,
      code: 0,
      archives: 0,
      executables: 0,
      other: 0
    };
    
    // 获取总数
    const allResult = this.db.exec('SELECT COUNT(*) FROM files');
    counts.all = allResult[0]?.values[0][0] || 0;
    
    // 获取各分类数量
    for (const category of categories) {
      const placeholders = category.exts.map(() => '?').join(',');
      const result = this.db.exec(
        `SELECT COUNT(*) FROM files WHERE extension IN (${placeholders})`,
        category.exts
      );
      
      const count = result[0]?.values[0][0] || 0;
      (counts as any)[category.key] = count;
    }
    
    // 计算其他类型
    const knownExts = categories.flatMap(c => c.exts);
    const knownPlaceholders = knownExts.map(() => '?').join(',');
    const otherResult = this.db.exec(
      `SELECT COUNT(*) FROM files WHERE extension NOT IN (${knownPlaceholders})`,
      knownExts
    );
    counts.other = otherResult[0]?.values[0][0] || 0;
    
    return counts;
  }

  /**
   * 获取分类对应的扩展名列表
   */
  private getCategoryExtensions(category: string): string[] {
    const categoryMap: Record<string, string[]> = {
      image: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico'],
      video: ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'],
      audio: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a'],
      document: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'],
      code: ['js', 'ts', 'vue', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'go', 'rs', 'rb', 'php', 'swift', 'kt', 'html', 'css', 'scss', 'json', 'xml', 'yaml', 'yml'],
      archive: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'],
      executable: ['exe', 'msi', 'dmg', 'pkg', 'deb', 'rpm', 'appimage']
    };
    
    return categoryMap[category] || [];
  }
}
