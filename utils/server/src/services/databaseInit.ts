import initSqlJs from 'sql.js';
import path from 'path';
import fs from 'fs';

/**
 * 数据库文件路径配置
 * 开发环境: server/data/superutils.db
 * 生产环境: Electron用户数据目录
 */
const getDatabasePath = (): string => {
  const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
  
  if (isDev) {
    return path.join(__dirname, '../data/superutils.db');
  } else {
    const appDataPath = process.env.APPDATA || '/tmp';
    return path.join(appDataPath, 'super-utils', 'data', 'superutils.db');
  }
};

/**
 * 初始化SQLite数据库
 * 使用sql.js (纯JavaScript SQLite实现)
 * @returns Promise<Database> 数据库实例
 */
export async function initializeDatabase(): Promise<any> {
  let dbPath = getDatabasePath();
  
  // 确保数据目录存在
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log(`[DB Init] Created database directory: ${dbDir}`);
  }

  try {
    // 初始化 sql.js (加载WASM)
    const SQL = await initSqlJs({
      locateFile: (file: string) => `node_modules/sql.js/dist/${file}`
    });
    
    // 如果数据库文件已存在,则读取它
    let db: any;
    if (fs.existsSync(dbPath)) {
      const fileBuffer = fs.readFileSync(dbPath);
      db = new SQL.Database(fileBuffer);
      console.log(`[DB Init] Loaded existing database from: ${dbPath}`);
    } else {
      // 创建新数据库
      db = new SQL.Database();
      console.log(`[DB Init] Created new database at: ${dbPath}`);
    }
    
    console.log('[DB Init] sql.js database initialized successfully');
    
    // ==================== 创建表结构 ====================
    
    // 创建 files 表
    db.run(`
      CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        path TEXT NOT NULL,
        extension TEXT NOT NULL,
        size INTEGER DEFAULT 0,
        created_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        modified_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        accessed_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        hash TEXT DEFAULT '',
        is_hidden INTEGER DEFAULT 0,
        is_readonly INTEGER DEFAULT 0,
        is_system INTEGER DEFAULT 0,
        attributes TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('[DB Init] Table "files" created or already exists');

    // files 表索引
    db.run(`CREATE INDEX IF NOT EXISTS idx_files_name ON files(name)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_files_extension ON files(extension)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_files_path ON files(path)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_files_modified_time ON files(modified_time)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_files_created_time ON files(created_at)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_files_hash ON files(hash)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_files_is_hidden ON files(is_hidden)`);
    db.run(`CREATE UNIQUE INDEX IF NOT EXISTS unique_file ON files(path, name)`);

    // 创建 app_config 表
    db.run(`
      CREATE TABLE IF NOT EXISTS app_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        config_key TEXT NOT NULL UNIQUE,
        config_value TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建 file_open_config 表
    db.run(`
      CREATE TABLE IF NOT EXISTS file_open_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        extension TEXT NOT NULL UNIQUE,
        open_method TEXT DEFAULT 'internal' CHECK(open_method IN ('internal', 'system')),
        internal_viewer TEXT DEFAULT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 插入默认文件打开方式配置
    const defaultConfigs = [
      { extension: 'txt', open_method: 'internal', internal_viewer: 'editor' },
      { extension: 'md', open_method: 'internal', internal_viewer: 'editor' },
      { extension: 'js', open_method: 'internal', internal_viewer: 'editor' },
      { extension: 'ts', open_method: 'internal', internal_viewer: 'editor' },
      { extension: 'vue', open_method: 'internal', internal_viewer: 'editor' },
      { extension: 'html', open_method: 'internal', internal_viewer: 'editor' },
      { extension: 'css', open_method: 'internal', internal_viewer: 'editor' },
      { extension: 'py', open_method: 'internal', internal_viewer: 'editor' },
      { extension: 'json', open_method: 'internal', internal_viewer: 'editor' },
      { extension: 'yaml', open_method: 'internal', internal_viewer: 'editor' },
      { extension: 'jpg', open_method: 'internal', internal_viewer: 'image' },
      { extension: 'jpeg', open_method: 'internal', internal_viewer: 'image' },
      { extension: 'png', open_method: 'internal', internal_viewer: 'image' },
      { extension: 'gif', open_method: 'internal', internal_viewer: 'image' },
      { extension: 'pdf', open_method: 'internal', internal_viewer: 'pdf' },
      { extension: 'docx', open_method: 'internal', internal_viewer: 'docx' },
      { extension: 'mp4', open_method: 'internal', internal_viewer: 'media' },
      { extension: 'mp3', open_method: 'internal', internal_viewer: 'media' }
    ];

    const insertConfig = db.prepare(
      `INSERT OR IGNORE INTO file_open_config (extension, open_method, internal_viewer) VALUES (?, ?, ?)`
    );

    for (const config of defaultConfigs) {
      insertConfig.run(config.extension, config.open_method, config.internal_viewer);
    }
    console.log('[DB Init] Default file open configs inserted');

    // 创建 file_contents 表
    db.run(`
      CREATE TABLE IF NOT EXISTS file_contents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_id INTEGER NOT NULL,
        content TEXT,
        content_preview TEXT,
        indexed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
        UNIQUE (file_id)
      )
    `);
    db.run(`CREATE INDEX IF NOT EXISTS idx_file_contents_file_id ON file_contents(file_id)`);

    // 创建 index_exclude_rules 表
    db.run(`
      CREATE TABLE IF NOT EXISTS index_exclude_rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rule_type TEXT NOT NULL DEFAULT 'directory' CHECK(rule_type IN ('directory', 'path_pattern')),
        pattern TEXT NOT NULL,
        description TEXT DEFAULT '',
        is_regex INTEGER DEFAULT 0,
        is_enabled INTEGER DEFAULT 1,
        priority INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (pattern, rule_type)
      )
    `);

    // 插入默认排除规则
    const defaultExcludeRules = [
      { rule_type: 'directory', pattern: 'node_modules', description: 'Node.js 依赖目录', is_regex: false },
      { rule_type: 'directory', pattern: '.git', description: 'Git 版本控制目录', is_regex: false },
      { rule_type: 'directory', pattern: '.svn', description: 'SVN 版本控制目录', is_regex: false },
      { rule_type: 'directory', pattern: 'dist', description: '构建输出目录', is_regex: false },
      { rule_type: 'directory', pattern: 'build', description: '构建输出目录', is_regex: false },
      { rule_type: 'path_pattern', pattern: '\\.log$', description: '日志文件', is_regex: true },
      { rule_type: 'path_pattern', pattern: '\\.tmp$', description: '临时文件', is_regex: true }
    ];

    const insertRule = db.prepare(
      `INSERT OR IGNORE INTO index_exclude_rules (rule_type, pattern, description, is_regex) VALUES (?, ?, ?, ?)`
    );

    for (const rule of defaultExcludeRules) {
      try {
        insertRule.run(rule.rule_type, rule.pattern, rule.description, rule.is_regex ? 1 : 0);
      } catch (err) {
        console.warn(`[DB Init] Failed to insert default exclude rule:`, rule.pattern);
      }
    }

    // 创建 search_history 表
    db.run(`
      CREATE TABLE IF NOT EXISTS search_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        query TEXT NOT NULL,
        search_type TEXT DEFAULT 'filename' CHECK(search_type IN ('filename', 'content')),
        result_count INTEGER DEFAULT 0,
        search_count INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    db.run(`CREATE INDEX IF NOT EXISTS idx_search_history_query ON search_history(query)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_search_history_created_at ON search_history(created_at)`);
    db.run(`CREATE UNIQUE INDEX IF NOT EXISTS unique_query_type ON search_history(query, search_type)`);

    // 创建 debug_logs 表
    db.run(`
      CREATE TABLE IF NOT EXISTS debug_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        component TEXT NOT NULL,
        message TEXT,
        data TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    db.run(`CREATE INDEX IF NOT EXISTS idx_debug_logs_component ON debug_logs(component)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_debug_logs_created_at ON debug_logs(created_at)`);

    // 创建 mock_routes 表
    db.run(`
      CREATE TABLE IF NOT EXISTS mock_routes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        path TEXT NOT NULL,
        method TEXT NOT NULL DEFAULT 'GET',
        response TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (path, method)
      )
    `);
    db.run(`CREATE INDEX IF NOT EXISTS idx_mock_routes_path ON mock_routes(path)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_mock_routes_method ON mock_routes(method)`);

    // 创建 window_state 表
    db.run(`
      CREATE TABLE IF NOT EXISTS window_state (
        id INTEGER PRIMARY KEY DEFAULT 1,
        width INTEGER DEFAULT 1200,
        height INTEGER DEFAULT 800,
        x INTEGER DEFAULT 0,
        y INTEGER DEFAULT 0,
        is_maximized INTEGER DEFAULT 0,
        is_fullscreen INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    db.prepare(`INSERT OR IGNORE INTO window_state (id) VALUES (1)`).run();

    // 创建 calculator_history 表
    db.run(`
      CREATE TABLE IF NOT EXISTS calculator_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        expression TEXT NOT NULL,
        result TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    db.run(`CREATE INDEX IF NOT EXISTS idx_calculator_history_created_at ON calculator_history(created_at)`);

    // 创建 qrcode_config 表
    db.run(`
      CREATE TABLE IF NOT EXISTS qrcode_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        base_url TEXT DEFAULT 'http://172.19.102.166:8000/#/indexApp',
        time_api_url TEXT DEFAULT 'http://172.19.102.166:8000/client/system/datetime',
        append_time INTEGER DEFAULT 1,
        qr_size INTEGER DEFAULT 256,
        error_correction_level TEXT DEFAULT 'M',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    db.prepare(`INSERT OR IGNORE INTO qrcode_config (id) VALUES (1)`).run();

    // 创建 qrcode_history 表
    db.run(`
      CREATE TABLE IF NOT EXISTS qrcode_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        base_url TEXT NOT NULL,
        time_api_url TEXT DEFAULT '',
        generated_url TEXT NOT NULL,
        append_time INTEGER DEFAULT 0,
        qr_size INTEGER DEFAULT 256,
        error_correction_level TEXT DEFAULT 'M',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    db.run(`CREATE INDEX IF NOT EXISTS idx_qrcode_history_created_at ON qrcode_history(created_at)`);

    // 创建 countdowns 表
    db.run(`
      CREATE TABLE IF NOT EXISTS countdowns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        date TEXT DEFAULT NULL,
        time TEXT DEFAULT NULL,
        "repeat" TEXT DEFAULT 'none' CHECK("repeat" IN ('none', 'daily', 'weekly', 'monthly', 'yearly')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    db.run(`CREATE INDEX IF NOT EXISTS idx_countdowns_created_at ON countdowns(created_at)`);

    // 创建 api_docs 表
    db.run(`
      CREATE TABLE IF NOT EXISTS api_docs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        source_file TEXT DEFAULT '',
        openapi_data TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    /**
     * 创建 dev_error_logs 表 (开发环境错误请求日志)
     */
    db.run(`
      CREATE TABLE IF NOT EXISTS dev_error_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL,
        method TEXT NOT NULL DEFAULT 'GET',
        request_params TEXT,
        request_body TEXT,
        response_status INTEGER NOT NULL,
        response_body TEXT,
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    db.run(`CREATE INDEX IF NOT EXISTS idx_dev_error_logs_status ON dev_error_logs(response_status)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_dev_error_logs_created_at ON dev_error_logs(created_at)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_dev_error_logs_url ON dev_error_logs(url)`);

    /**
     * 创建 file_favorites 表 (文件收藏夹)
     */
    db.run(`
      CREATE TABLE IF NOT EXISTS file_favorites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL CHECK(type IN ('folder', 'search', 'file')),
        name TEXT NOT NULL,
        path TEXT,
        query TEXT,
        icon TEXT DEFAULT 'folder',
        color TEXT DEFAULT '#1976D2',
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    db.run(`CREATE INDEX IF NOT EXISTS idx_favorites_type ON file_favorites(type)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_favorites_created ON file_favorites(created_at)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_favorites_sort_order ON file_favorites(sort_order)`);

    /**
     * 创建 file_access_history 表 (文件访问历史)
     */
    db.run(`
      CREATE TABLE IF NOT EXISTS file_access_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_id INTEGER,
        path TEXT NOT NULL,
        name TEXT NOT NULL,
        access_type TEXT DEFAULT 'open' CHECK(access_type IN ('open', 'preview', 'edit')),
        accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE SET NULL
      )
    `);
    db.run(`CREATE INDEX IF NOT EXISTS idx_access_history_file ON file_access_history(file_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_access_history_time ON file_access_history(accessed_at)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_access_history_path ON file_access_history(path)`);

    console.log('[DB Init] ✅ All tables initialized successfully');
    
    // 保存数据库到文件
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
    console.log(`[DB Init] Database saved to: ${dbPath}`);
    
    return db;
    
  } catch (error) {
    console.error('[DB Init] ❌ Database initialization failed:', error);
    throw error;
  }
}
