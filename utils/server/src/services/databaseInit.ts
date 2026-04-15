import mysql from 'mysql2/promise';

interface ColumnDef {
  name: string;
  def: string;
  required: boolean;
}

const DEFAULT_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'superutils_file_manager'
};

export async function initializeDatabase(): Promise<void> {
  let connection;
  
  try {
    // 先连接到 MySQL（不指定数据库）
    connection = await mysql.createConnection({
      host: DEFAULT_CONFIG.host,
      port: DEFAULT_CONFIG.port,
      user: DEFAULT_CONFIG.user,
      password: DEFAULT_CONFIG.password
    });

    console.log('Connected to MySQL server');

    // 创建数据库（如果不存在）
    await connection.execute(
      `CREATE DATABASE IF NOT EXISTS ${DEFAULT_CONFIG.database} 
       CHARACTER SET utf8mb4 
       COLLATE utf8mb4_unicode_ci`
    );
    console.log(`Database '${DEFAULT_CONFIG.database}' created or already exists`);

    // 关闭当前连接，使用数据库名重新连接
    await connection.end();

    // 使用数据库名重新连接
    connection = await mysql.createConnection({
      host: DEFAULT_CONFIG.host,
      port: DEFAULT_CONFIG.port,
      user: DEFAULT_CONFIG.user,
      password: DEFAULT_CONFIG.password,
      database: DEFAULT_CONFIG.database
    });

    // 创建扫描目录表（必须先创建，因为 files 表有外键引用）
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS scan_directories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        path VARCHAR(500) NOT NULL UNIQUE,
        name VARCHAR(255) DEFAULT NULL COMMENT '目录名称（可选）',
        is_enabled BOOLEAN DEFAULT TRUE,
        file_count INT DEFAULT 0 COMMENT '该目录下的文件数量（缓存）',
        last_scan_at TIMESTAMP NULL DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_path (path),
        INDEX idx_is_enabled (is_enabled)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('Table "scan_directories" created or already exists');

    // 创建 files 表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS files (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        path VARCHAR(500) NOT NULL,
        extension VARCHAR(50) NOT NULL,
        size BIGINT DEFAULT 0,
        created_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        modified_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        accessed_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        hash VARCHAR(32) DEFAULT '',
        is_hidden BOOLEAN DEFAULT FALSE,
        is_readonly BOOLEAN DEFAULT FALSE,
        is_system BOOLEAN DEFAULT FALSE,
        attributes VARCHAR(100) DEFAULT '',
        scan_directory_id INT DEFAULT NULL COMMENT '文件所属的扫描目录ID',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_name (name),
        INDEX idx_extension (extension),
        INDEX idx_path (path),
        INDEX idx_modified_time (modified_time),
        INDEX idx_created_time (created_time),
        INDEX idx_hash (hash),
        INDEX idx_is_hidden (is_hidden),
        INDEX idx_scan_directory_id (scan_directory_id),
        UNIQUE KEY unique_file (path, name),
        FOREIGN KEY (scan_directory_id) REFERENCES scan_directories(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('Table "files" created or already exists');

    // 创建配置表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS app_config (
        id INT AUTO_INCREMENT PRIMARY KEY,
        config_key VARCHAR(100) NOT NULL UNIQUE,
        config_value TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('Table "app_config" created or already exists');

    // 创建文件打开方式配置表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS file_open_config (
        id INT AUTO_INCREMENT PRIMARY KEY,
        extension VARCHAR(50) NOT NULL UNIQUE,
        open_method ENUM('internal', 'system') DEFAULT 'internal',
        internal_viewer VARCHAR(100) DEFAULT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('Table "file_open_config" created or already exists');

    // 插入默认配置
    const defaultConfigs = [
      { extension: 'txt', open_method: 'internal', internal_viewer: 'editor' },
      { extension: 'md', open_method: 'internal', internal_viewer: 'editor' },
      { extension: 'js', open_method: 'internal', internal_viewer: 'editor' },
      { extension: 'ts', open_method: 'internal', internal_viewer: 'editor' },
      { extension: 'vue', open_method: 'internal', internal_viewer: 'editor' },
      { extension: 'json', open_method: 'internal', internal_viewer: 'editor' },
      { extension: 'yaml', open_method: 'internal', internal_viewer: 'editor' },
      { extension: 'yml', open_method: 'internal', internal_viewer: 'editor' },
      { extension: 'sql', open_method: 'internal', internal_viewer: 'editor' },
      { extension: 'log', open_method: 'internal', internal_viewer: 'editor' },
      { extension: 'jpg', open_method: 'internal', internal_viewer: 'image' },
      { extension: 'jpeg', open_method: 'internal', internal_viewer: 'image' },
      { extension: 'png', open_method: 'internal', internal_viewer: 'image' },
      { extension: 'gif', open_method: 'internal', internal_viewer: 'image' },
      { extension: 'bmp', open_method: 'internal', internal_viewer: 'image' },
      { extension: 'webp', open_method: 'internal', internal_viewer: 'image' },
      { extension: 'pdf', open_method: 'internal', internal_viewer: 'pdf' },
      { extension: 'docx', open_method: 'internal', internal_viewer: 'docx' },
      { extension: 'mp4', open_method: 'internal', internal_viewer: 'media' },
      { extension: 'webm', open_method: 'internal', internal_viewer: 'media' },
      { extension: 'ogg', open_method: 'internal', internal_viewer: 'media' },
      { extension: 'mp3', open_method: 'internal', internal_viewer: 'media' },
      { extension: 'wav', open_method: 'internal', internal_viewer: 'media' }
    ];

    for (const config of defaultConfigs) {
      await connection.execute(`
        INSERT INTO file_open_config (extension, open_method, internal_viewer)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE
        open_method = VALUES(open_method),
        internal_viewer = VALUES(internal_viewer)
      `, [config.extension, config.open_method, config.internal_viewer]);
    }
    console.log('Default file open configs inserted');

    // 创建文件内容表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS file_contents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        file_id INT NOT NULL,
        content LONGTEXT,
        content_preview TEXT,
        indexed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
        UNIQUE KEY unique_file_content (file_id),
        INDEX idx_content (content(255))
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('Table "file_contents" created or already exists');

    // 创建索引排除规则表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS index_exclude_rules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        rule_type ENUM('directory', 'path_pattern') NOT NULL DEFAULT 'directory',
        pattern VARCHAR(255) NOT NULL,
        description VARCHAR(255) DEFAULT '',
        is_regex BOOLEAN DEFAULT FALSE,
        is_enabled BOOLEAN DEFAULT TRUE,
        priority INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_pattern (pattern, rule_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('Table "index_exclude_rules" created or already exists');

    // 插入默认排除规则
    const defaultExcludeRules = [
      { rule_type: 'directory', pattern: 'node_modules', description: 'Node.js 依赖目录', is_regex: false },
      { rule_type: 'directory', pattern: '.git', description: 'Git 版本控制目录', is_regex: false },
      { rule_type: 'directory', pattern: '.svn', description: 'SVN 版本控制目录', is_regex: false },
      { rule_type: 'directory', pattern: 'dist', description: '构建输出目录', is_regex: false },
      { rule_type: 'directory', pattern: 'build', description: '构建输出目录', is_regex: false },
      { rule_type: 'directory', pattern: '.vscode', description: 'VS Code 配置目录', is_regex: false },
      { rule_type: 'directory', pattern: '.idea', description: 'JetBrains 配置目录', is_regex: false },
      { rule_type: 'directory', pattern: '__pycache__', description: 'Python 缓存目录', is_regex: false },
      { rule_type: 'directory', pattern: '.next', description: 'Next.js 构建目录', is_regex: false },
      { rule_type: 'directory', pattern: '.nuxt', description: 'Nuxt.js 构建目录', is_regex: false },
      { rule_type: 'path_pattern', pattern: '\\.log$', description: '日志文件', is_regex: true },
      { rule_type: 'path_pattern', pattern: '\\.tmp$', description: '临时文件', is_regex: true }
    ];

    for (const rule of defaultExcludeRules) {
      try {
        await connection.execute(
          `INSERT IGNORE INTO index_exclude_rules (rule_type, pattern, description, is_regex) 
           VALUES (?, ?, ?, ?)`,
          [rule.rule_type, rule.pattern, rule.description, rule.is_regex]
        );
      } catch (err) {
        console.warn('Failed to insert default exclude rule:', rule.pattern);
      }
    }
    console.log('Default exclude rules inserted');

    // 创建搜索历史表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS search_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        query VARCHAR(500) NOT NULL,
        search_type ENUM('filename', 'content') DEFAULT 'filename',
        result_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_query (query),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('Table "search_history" created or already exists');

    // 创建调试日志表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS debug_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        component VARCHAR(100) NOT NULL,
        message TEXT,
        data JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_component (component),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('Table "debug_logs" created or already exists');

    // 创建模拟路由表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS mock_routes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        path VARCHAR(500) NOT NULL,
        method VARCHAR(10) NOT NULL DEFAULT 'GET',
        response JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_route (path, method),
        INDEX idx_path (path),
        INDEX idx_method (method)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('Table "mock_routes" created or already exists');

    // 创建窗口状态表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS window_state (
        id INT PRIMARY KEY DEFAULT 1,
        width INT DEFAULT 1200,
        height INT DEFAULT 800,
        x INT DEFAULT 0,
        y INT DEFAULT 0,
        is_maximized BOOLEAN DEFAULT FALSE,
        is_fullscreen BOOLEAN DEFAULT FALSE,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('Table "window_state" created or already exists');

    // 强制同步 files 表结构
    await syncTableSchema(connection, DEFAULT_CONFIG.database, 'files', [
      { name: 'id', def: 'INT AUTO_INCREMENT PRIMARY KEY', required: true },
      { name: 'name', def: 'VARCHAR(255) NOT NULL', required: true },
      { name: 'path', def: 'VARCHAR(500) NOT NULL', required: true },
      { name: 'extension', def: 'VARCHAR(50) NOT NULL', required: true },
      { name: 'size', def: 'BIGINT DEFAULT 0', required: true },
      { name: 'created_time', def: 'DATETIME DEFAULT CURRENT_TIMESTAMP', required: true },
      { name: 'modified_time', def: 'DATETIME DEFAULT CURRENT_TIMESTAMP', required: true },
      { name: 'accessed_time', def: 'DATETIME DEFAULT CURRENT_TIMESTAMP', required: true },
      { name: 'hash', def: "VARCHAR(32) DEFAULT ''", required: true },
      { name: 'is_hidden', def: 'BOOLEAN DEFAULT FALSE', required: true },
      { name: 'is_readonly', def: 'BOOLEAN DEFAULT FALSE', required: true },
      { name: 'is_system', def: 'BOOLEAN DEFAULT FALSE', required: true },
      { name: 'attributes', def: "VARCHAR(100) DEFAULT ''", required: true },
      { name: 'scan_directory_id', def: "INT DEFAULT NULL COMMENT '文件所属的扫描目录ID'", required: true },
      { name: 'created_at', def: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP', required: true },
      { name: 'updated_at', def: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', required: true }
    ]);

    // 添加索引
    const indexDefinitions = [
      { name: 'idx_created_time', def: `CREATE INDEX idx_created_time ON files(created_time)` },
      { name: 'idx_hash', def: `CREATE INDEX idx_hash ON files(hash)` },
      { name: 'idx_is_hidden', def: `CREATE INDEX idx_is_hidden ON files(is_hidden)` },
      { name: 'idx_scan_directory_id', def: `CREATE INDEX idx_scan_directory_id ON files(scan_directory_id)` }
    ];

    // 获取现有索引
    const [indexes] = await connection.execute(
      `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'files'`,
      [DEFAULT_CONFIG.database]
    );
    const existingIndexes = (indexes as any[]).map(idx => idx.INDEX_NAME);

    for (const idx of indexDefinitions) {
      if (!existingIndexes.includes(idx.name)) {
        try {
          await connection.execute(idx.def);
          console.log(`Migration: Added index ${idx.name}`);
        } catch (err: any) {
          console.warn(`Migration warning for ${idx.name}:`, err.message);
        }
      } else {
        console.log(`Migration: Index ${idx.name} already exists`);
      }
    }

    console.log('Database initialization completed successfully');

  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

/**
 * 同步表结构 - 强制将表结构同步为期望的状态
 * @param connection - 数据库连接
 * @param database - 数据库名
 * @param tableName - 表名
 * @param expectedColumns - 期望的列定义
 */
async function syncTableSchema(
  connection: mysql.Connection,
  database: string,
  tableName: string,
  expectedColumns: ColumnDef[]
): Promise<void> {
  console.log(`[Sync] Starting schema sync for table: ${tableName}`);
  
  // 获取现有列
  const [columns] = await connection.execute(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    [database, tableName]
  );
  const existingColumns = (columns as any[]).map(col => col.COLUMN_NAME);
  console.log(`[Sync] Existing columns in ${tableName}:`, existingColumns);
  
  // 获取现有索引
  const [indexes] = await connection.execute(
    `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    [database, tableName]
  );
  const existingIndexes = (indexes as any[]).map(idx => idx.INDEX_NAME);
  
  // 1. 添加缺失的列
  for (const col of expectedColumns) {
    if (!existingColumns.includes(col.name)) {
      try {
        await connection.execute(`ALTER TABLE ${tableName} ADD COLUMN ${col.name} ${col.def}`);
        console.log(`[Sync] Added column: ${col.name}`);
      } catch (err: any) {
        console.warn(`[Sync] Warning adding column ${col.name}:`, err.message);
      }
    }
  }
  
  // 2. 删除多余的列（非必需列）
  const expectedColumnNames = expectedColumns.map(col => col.name);
  for (const existingCol of existingColumns) {
    if (!expectedColumnNames.includes(existingCol)) {
      try {
        // 先删除该列上的所有索引
        const colIndexes = existingIndexes.filter(idx => 
          idx.toLowerCase() === `idx_${existingCol}`.toLowerCase() ||
          idx.toLowerCase().includes(existingCol.toLowerCase())
        );
        for (const idxName of colIndexes) {
          if (idxName !== 'PRIMARY') {
            try {
              await connection.execute(`ALTER TABLE ${tableName} DROP INDEX ${idxName}`);
              console.log(`[Sync] Dropped index: ${idxName}`);
            } catch (idxErr: any) {
              console.warn(`[Sync] Warning dropping index ${idxName}:`, idxErr.message);
            }
          }
        }
        
        // 删除列
        await connection.execute(`ALTER TABLE ${tableName} DROP COLUMN ${existingCol}`);
        console.log(`[Sync] Removed column: ${existingCol}`);
      } catch (err: any) {
        console.warn(`[Sync] Warning removing column ${existingCol}:`, err.message);
      }
    }
  }
  
  console.log(`[Sync] Schema sync completed for table: ${tableName}`);
}
