import Database from 'better-sqlite3'

/**
 * 文件查询参数接口
 */
export interface SearchFilesParams {
  query: string
  page: number
  pageSize: number
  fileType?: string
  minSize?: number
  maxSize?: number
}

/**
 * 文件结果接口
 */
export interface FileResult {
  id: number
  name: string
  path: string
  extension: string
  size: number
  created_time: string
  modified_time: string
  accessed_time: string
  hash: string
  is_hidden: boolean
  is_readonly: boolean
  is_system: boolean
  attributes: string
}

/**
 * 搜索结果接口
 */
export interface SearchResult {
  files: FileResult[]
  totalPages: number
  currentPage: number
  total: number
}

/**
 * 解析搜索查询
 * 支持语法：文件名 扩展名（如：document pdf）
 */
function parseSearchQuery(query: string): { name?: string; extension?: string } {
  const result: { name?: string; extension?: string } = {}

  if (!query || !query.trim()) {
    return result
  }

  const parts = query.trim().split(/\s+/)

  if (parts.length >= 2) {
    // 最后一个部分可能是扩展名
    const lastPart = parts[parts.length - 1].toLowerCase()
    if (lastPart.length <= 10 && !lastPart.includes(' ')) {
      result.extension = lastPart.replace('.', '')
      result.name = parts.slice(0, -1).join(' ')
    } else {
      result.name = query
    }
  } else {
    result.name = query
  }

  return result
}

/**
 * 获取文件类型对应的扩展名列表
 */
function getFileTypeExtensions(fileType: string): string[] {
  const typeMap: Record<string, string[]> = {
    image: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'],
    document: ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'xls', 'xlsx', 'ppt', 'pptx'],
    code: ['js', 'ts', 'jsx', 'tsx', 'vue', 'html', 'css', 'py', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'go', 'rs', 'rb', 'php'],
    video: ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv'],
    audio: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma'],
    archive: ['zip', 'rar', '7z', 'tar', 'gz'],
    executable: ['exe', 'msi', 'bat', 'cmd', 'sh']
  }

  return typeMap[fileType.toLowerCase()] || []
}

/**
 * 搜索文件 - SQLite版本(同步)
 */
export function searchFiles(
  db: Database.Database,
  params: SearchFilesParams
): SearchResult {
  const { query, page, pageSize, fileType, minSize, maxSize } = params
  const offset = (page - 1) * pageSize

  // 解析搜索查询
  const searchParams = parseSearchQuery(query)

  const whereConditions: string[] = []
  const sqlParams: any[] = []

  // 文件名搜索 - 只搜索文件名，不搜索路径
  if (searchParams.name) {
    whereConditions.push('name LIKE ?')
    sqlParams.push(`%${searchParams.name}%`)
  }

  // 扩展名过滤
  if (searchParams.extension) {
    whereConditions.push('extension = ?')
    sqlParams.push(searchParams.extension.toLowerCase())
  }

  // 文件类型过滤
  if (fileType) {
    const extensions = getFileTypeExtensions(fileType)
    if (extensions.length > 0) {
      const placeholders = extensions.map(() => '?').join(',')
      whereConditions.push(`extension IN (${placeholders})`)
      sqlParams.push(...extensions)
    }
  }

  // 文件大小过滤
  if (minSize !== undefined) {
    whereConditions.push('size >= ?')
    sqlParams.push(minSize)
  }
  if (maxSize !== undefined) {
    whereConditions.push('size <= ?')
    sqlParams.push(maxSize)
  }

  // 构建 WHERE 子句
  const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : ''

  // 执行查询
  const stmt = db.prepare(
    `SELECT * FROM files 
     ${whereClause}
     ORDER BY modified_time DESC 
     LIMIT ? OFFSET ?`
  )
  const rows = stmt.all(...sqlParams, pageSize, offset) as FileResult[]

  // 获取总数
  const countStmt = db.prepare(
    `SELECT COUNT(*) as total FROM files ${whereClause}`
  )
  const { total } = countStmt.get(...sqlParams) as { total: number }
  const totalPages = Math.ceil(total / pageSize)

  return {
    files: rows,
    totalPages,
    currentPage: page,
    total
  }
}

/**
 * 按分类获取文件 - SQLite版本(同步)
 */
export function getFilesByCategory(
  db: Database.Database,
  category: string,
  page: number,
  pageSize: number
): SearchResult {
  const offset = (page - 1) * pageSize

  const categoryExtensions: Record<string, string[]> = {
    images: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'],
    documents: ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'],
    code: ['js', 'ts', 'jsx', 'tsx', 'vue', 'html', 'css', 'py', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'go', 'rs', 'rb', 'php'],
    videos: ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv'],
    audio: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma'],
    archives: ['zip', 'rar', '7z', 'tar', 'gz'],
    executables: ['exe', 'msi', 'bat', 'cmd', 'sh']
  }

  let whereClause = ''
  const params: any[] = []

  if (category !== 'all') {
    const extensions = categoryExtensions[category]
    if (extensions) {
      const placeholders = extensions.map(() => '?').join(',')
      whereClause = `WHERE extension IN (${placeholders})`
      params.push(...extensions)
    }
  }

  // 执行查询
  const stmt = db.prepare(
    `SELECT * FROM files ${whereClause} ORDER BY modified_time DESC LIMIT ? OFFSET ?`
  )
  const rows = stmt.all(...params, pageSize, offset) as FileResult[]

  // 获取总数
  let countQuery = 'SELECT COUNT(*) as total FROM files'
  if (category !== 'all') {
    const extensions = categoryExtensions[category]
    if (extensions) {
      const placeholders = extensions.map(() => '?').join(',')
      countQuery += ` WHERE extension IN (${placeholders})`
    }
  }

  const countStmt = db.prepare(countQuery)
  const { total } = countStmt.get(...params) as { total: number }
  const totalPages = Math.ceil(total / pageSize)

  return {
    files: rows,
    totalPages,
    currentPage: page,
    total
  }
}

/**
 * 根据ID获取文件 - SQLite版本(同步)
 */
export function getFileById(
  db: Database.Database,
  id: number
): FileResult | null {
  const row = db.prepare('SELECT * FROM files WHERE id = ?').get(id) as FileResult | undefined
  return row || null
}

/**
 * 根据路径获取文件 - SQLite版本(同步)
 */
export function getFileByPath(
  db: Database.Database,
  filePath: string,
  name: string
): FileResult | null {
  const row = db.prepare(
    'SELECT * FROM files WHERE path = ? AND name = ?'
  ).get(filePath, name) as FileResult | undefined
  return row || null
}

/**
 * 插入或更新文件 - SQLite版本(使用INSERT OR IGNORE + UPDATE)
 */
export function upsertFile(
  db: Database.Database,
  file: Omit<FileResult, 'id' | 'created_at' | 'updated_at'>
): number {
  // 先尝试插入
  const insertStmt = db.prepare(
    `INSERT OR IGNORE INTO files 
     (name, path, extension, size, created_time, modified_time, accessed_time, hash, is_hidden, is_readonly, is_system, attributes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
  
  const result = insertStmt.run(
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
  )

  // 检查是否真正插入了新行
  if (result.lastInsertRowid && result.lastInsertRowid > 0) {
    return result.lastInsertRowid as number
  }

  // 如果因为UNIQUE冲突导致插入失败,则执行UPDATE
  const updateStmt = db.prepare(
    `UPDATE files SET
     size = ?, modified_time = ?, accessed_time = ?, hash = ?,
     is_hidden = ?, is_readonly = ?, is_system = ?, attributes = ?
     WHERE path = ? AND name = ?`
  )
  
  updateStmt.run(
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
  )

  // 获取更新后的记录ID
  const existing = db.prepare('SELECT id FROM files WHERE path = ? AND name = ?')
    .get(file.path, file.name) as { id: number }
  
  return existing.id
}

/**
 * 删除文件 - SQLite版本(同步)
 */
export function deleteFile(db: Database.Database, id: number): boolean {
  const result = db.prepare('DELETE FROM files WHERE id = ?').run(id)
  return result.changes > 0
}

/**
 * 获取文件统计 - SQLite版本(同步)
 */
export function getFileCounts(db: Database.Database): {
  all: number
  images: number
  documents: number
  code: number
  videos: number
  audio: number
  archives: number
  executables: number
  other: number
} {
  const categoryQueries = {
    images: ["extension IN ('jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg')"],
    documents: ["extension IN ('pdf', 'doc', 'docx', 'txt', 'rtf', 'odt')"],
    code: ["extension IN ('js', 'ts', 'jsx', 'tsx', 'vue', 'html', 'css', 'py', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'go', 'rs', 'rb', 'php')"],
    videos: ["extension IN ('mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv')"],
    audio: ["extension IN ('mp3', 'wav', 'flac', 'aac', 'ogg', 'wma')"],
    archives: ["extension IN ('zip', 'rar', '7z', 'tar', 'gz')"],
    executables: ["extension IN ('exe', 'msi', 'bat', 'cmd', 'sh')"]
  }

  const allResult = db.prepare('SELECT COUNT(*) as count FROM files').get() as { count: number }
  const all = allResult.count

  const counts: Record<string, number> = { all: all as number }

  for (const [category, conditions] of Object.entries(categoryQueries)) {
    const row = db.prepare(
      `SELECT COUNT(*) as count FROM files WHERE ${conditions[0]}`
    ).get() as { count: number }
    counts[category] = row.count
  }

  // 计算其他类型
  const categorized = Object.values(counts).reduce((a: number, b: number) => a + b, 0) - (all as number)
  counts.other = Math.max(0, (all as number) - categorized)

  return counts as {
    all: number
    images: number
    documents: number
    code: number
    videos: number
    audio: number
    archives: number
    executables: number
    other: number
  }
}

/**
 * 获取所有文件路径 - SQLite版本(同步)
 */
export function getAllFilePaths(db: Database.Database): { id: number; path: string; name: string; modified_time: string }[] {
  return db.prepare('SELECT id, path, name, modified_time FROM files').all() as { id: number; path: string; name: string; modified_time: string }[]
}

/**
 * 获取启用的排除规则 - SQLite版本(同步)
 */
export function getEnabledExcludeRules(db: Database.Database): { rule_type: string; pattern: string; is_regex: boolean }[] {
  return db.prepare(
    'SELECT rule_type, pattern, is_regex FROM index_exclude_rules WHERE is_enabled = 1'
  ).all() as { rule_type: string; pattern: string; is_regex: boolean }[]
}

/**
 * 添加文件 - SQLite版本(同步)
 */
export function addFile(
  db: Database.Database,
  file: Omit<FileResult, 'id' | 'created_at' | 'updated_at'>
): number {
  const result = db.prepare(
    `INSERT INTO files 
     (name, path, extension, size, created_time, modified_time, accessed_time, hash, is_hidden, is_readonly, is_system, attributes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
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
  )
  return result.lastInsertRowid as number
}

/**
 * 检查是否有内容索引 - SQLite版本(同步)
 */
export function hasContentIndex(db: Database.Database, fileId: number): boolean {
  const row = db.prepare('SELECT 1 FROM file_contents WHERE file_id = ?').get(fileId)
  return !!row
}

/**
 * 保存文件内容 - SQLite版本(使用INSERT OR REPLACE)
 */
export function saveFileContent(
  db: Database.Database,
  fileId: number,
  content: string,
  preview: string
): void {
  db.prepare(
    `INSERT OR REPLACE INTO file_contents (file_id, content, content_preview, indexed_at) 
     VALUES (?, ?, ?, CURRENT_TIMESTAMP)`
  ).run(fileId, content, preview)
}

/**
 * 获取排除规则 - SQLite版本(同步)
 */
export function getExcludeRules(db: Database.Database): any[] {
  return db.prepare('SELECT * FROM index_exclude_rules ORDER BY priority DESC').all()
}

/**
 * 添加排除规则 - SQLite版本(同步)
 */
export function addExcludeRule(
  db: Database.Database,
  rule: { rule_type: string; pattern: string; description?: string; is_regex?: boolean; priority?: number }
): number {
  const result = db.prepare(
    `INSERT INTO index_exclude_rules (rule_type, pattern, description, is_regex, priority) 
     VALUES (?, ?, ?, ?, ?)`
  ).run(rule.rule_type, rule.pattern, rule.description || '', rule.is_regex ? 1 : 0, rule.priority || 0)
  return result.lastInsertRowid as number
}

/**
 * 更新排除规则 - SQLite版本(同步)
 */
export function updateExcludeRule(db: Database.Database, id: number, updates: any): number {
  const fields: string[] = []
  const values: any[] = []

  for (const [key, value] of Object.entries(updates)) {
    fields.push(`${key} = ?`)
    values.push(value)
  }
  values.push(id)

  const result = db.prepare(
    `UPDATE index_exclude_rules SET ${fields.join(', ')} WHERE id = ?`
  ).run(...values)
  return result.changes
}

/**
 * 删除排除规则 - SQLite版本(同步)
 */
export function deleteExcludeRule(db: Database.Database, id: number): number {
  const result = db.prepare('DELETE FROM index_exclude_rules WHERE id = ?').run(id)
  return result.changes
}

/**
 * 获取搜索建议 - SQLite版本(同步)
 */
export function getSearchSuggestions(db: Database.Database, keyword: string, limit: number = 10): string[] {
  const rows = db.prepare(
    'SELECT DISTINCT query FROM search_history WHERE query LIKE ? ORDER BY created_at DESC LIMIT ?'
  ).all(`%${keyword}%`, limit) as { query: string }[]
  return rows.map(r => r.query)
}

/**
 * 添加搜索历史 - SQLite版本(使用先更新后插入策略)
 */
export function addSearchHistory(
  db: Database.Database,
  query: string,
  searchType: string,
  resultCount: number
): void {
  // 先尝试更新已存在的记录
  const updateResult = db.prepare(
    `UPDATE search_history SET
     result_count = ?,
     search_count = search_count + 1,
     updated_at = CURRENT_TIMESTAMP
     WHERE query = ? AND search_type = ?`
  ).run(resultCount, query, searchType)
  
  // 如果没有更新任何行(记录不存在),则插入新记录
  if (updateResult.changes === 0) {
    db.prepare(
      `INSERT INTO search_history (query, search_type, result_count, search_count) 
       VALUES (?, ?, ?, 1)`
    ).run(query, searchType, resultCount)
  }
}

/**
 * 清除调试日志 - SQLite版本(同步)
 */
export function clearDebugLogs(db: Database.Database): void {
  db.prepare('DELETE FROM debug_logs').run()
}

/**
 * 获取窗口状态 - SQLite版本(同步)
 */
export function getWindowState(db: Database.Database): any {
  return db.prepare('SELECT * FROM window_state WHERE id = 1').get() || null
}

/**
 * 保存窗口状态 - SQLite版本(使用INSERT OR REPLACE)
 */
export function saveWindowState(db: Database.Database, state: any): void {
  db.prepare(
    `INSERT OR REPLACE INTO window_state (id, width, height, x, y, is_maximized) 
     VALUES (1, ?, ?, ?, ?, ?)`
  ).run(state.width, state.height, state.x, state.y, state.is_maximized ? 1 : 0)
}

/**
 * 获取模拟路由 - SQLite版本(同步)
 */
export function getMockRoutes(db: Database.Database): any[] {
  return db.prepare('SELECT * FROM mock_routes ORDER BY created_at DESC').all()
}

/**
 * 添加模拟路由 - SQLite版本(使用INSERT OR REPLACE)
 */
export function addMockRoute(
  db: Database.Database,
  method: string,
  pathStr: string,
  response: any
): void {
  db.prepare(
    `INSERT OR REPLACE INTO mock_routes (method, path, response, updated_at) 
     VALUES (?, ?, ?, CURRENT_TIMESTAMP)`
  ).run(method, pathStr, JSON.stringify(response))
}

/**
 * 删除模拟路由 - SQLite版本(同步)
 */
export function deleteMockRoute(db: Database.Database, method: string, pathStr: string): void {
  db.prepare('DELETE FROM mock_routes WHERE method = ? AND path = ?').run(method, pathStr)
}

/**
 * 更新模拟路由 - SQLite版本(同步)
 */
export function updateMockRoute(
  db: Database.Database,
  oldMethod: string,
  oldPath: string,
  newMethod: string,
  newPath: string,
  response: any
): void {
  db.prepare(
    'UPDATE mock_routes SET method = ?, path = ?, response = ?, updated_at = CURRENT_TIMESTAMP WHERE method = ? AND path = ?'
  ).run(newMethod, newPath, JSON.stringify(response), oldMethod, oldPath)
}

/**
 * 清除所有数据 - SQLite版本(同步)
 */
export function clearAllData(db: Database.Database): void {
  db.prepare('DELETE FROM file_contents').run()
  db.prepare('DELETE FROM files').run()
}

/**
 * 获取文件打开配置列表 - SQLite版本(同步)
 */
export function getFileOpenConfigs(db: Database.Database): any[] {
  return db.prepare('SELECT * FROM file_open_config ORDER BY extension').all()
}

/**
 * 获取文件打开配置 - SQLite版本(同步)
 */
export function getFileOpenConfig(db: Database.Database, extension: string): any | null {
  return db.prepare('SELECT * FROM file_open_config WHERE extension = ?').get(extension) || null
}

/**
 * 保存文件打开配置 - SQLite版本(使用INSERT OR REPLACE)
 */
export function saveFileOpenConfig(
  db: Database.Database,
  extension: string,
  openMethod: string,
  internalViewer?: string
): void {
  db.prepare(
    `INSERT OR REPLACE INTO file_open_config (extension, open_method, internal_viewer, updated_at) 
     VALUES (?, ?, ?, CURRENT_TIMESTAMP)`
  ).run(extension, openMethod, internalViewer)
}

/**
 * 删除文件打开配置 - SQLite版本(同步)
 */
export function deleteFileOpenConfig(db: Database.Database, extension: string): void {
  db.prepare('DELETE FROM file_open_config WHERE extension = ?').run(extension)
}
