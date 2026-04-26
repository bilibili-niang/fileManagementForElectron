# 开发环境错误请求日志方案

## 1. 需求概述

在开发环境下，当 HTTP 请求返回非正常响应（非 2xx）时，前端自动将请求的 URL、传参、响应内容发送给后端，后端写入数据库作为日志。同时提供右下角悬浮可拖动按钮，hover 菜单中可查看日志分页内容。按钮位置支持持久化，项目启动时回显。

## 2. 技术选型

### 2.1 存储位置：现有 SQLite 数据库

**选择理由**：
- 项目已使用 SQLite（sql.js），数据库文件位于 `server/src/data/superutils.db`
- AI 可通过 SQL 直接查询，无需额外依赖
- 数据库已有 `debug_logs` 表可参考模式
- 与项目架构一致：`databaseInit.ts` 建表 → `databaseService.ts` 操作 → `routes/xxx.ts` 路由

**新建表名**：`dev_error_logs`（与现有 `debug_logs` 区分）

### 2.2 数据库表结构设计

```sql
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
);

CREATE INDEX IF NOT EXISTS idx_dev_error_logs_status ON dev_error_logs(response_status);
CREATE INDEX IF NOT EXISTS idx_dev_error_logs_created_at ON dev_error_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_dev_error_logs_url ON dev_error_logs(url);
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `url` | TEXT | 完整请求 URL（含查询字符串） |
| `method` | TEXT | HTTP 方法（GET/POST/PUT/DELETE） |
| `request_params` | TEXT | URL 查询参数 JSON 序列化 |
| `request_body` | TEXT | POST/PUT 请求体 JSON 序列化 |
| `response_status` | INTEGER | HTTP 状态码 |
| `response_body` | TEXT | 响应体，超 10KB 截断 |
| `error_message` | TEXT | 错误信息摘要 |
| `created_at` | DATETIME | 记录时间 |

## 3. 架构设计

### 3.1 整体流程

```
[前端 src/api/client.ts] httpRequest()
       │
       │  isDev && !response.ok
       ▼
  提取 { url, method, params, body, status, responseBody }
       │
       │  POST /api/dev-error-log (fire-and-forget, 不阻塞)
       ▼
[后端 server/src/routes/devErrorLog.ts]
       │
       │  dbService.addDevErrorLog()
       ▼
[SQLite server/src/data/superutils.db - dev_error_logs 表]

───────────────────────────────────────────────

[前端 src/components/DevToolsButton/index.vue] 悬浮按钮
       │
       │  hover → v-menu 弹出菜单
       ▼
  ┌──────────────────┐
  │ 📋 查看错误日志   │ ← 点击打开弹窗
  │ 🗑 清空日志      │
  └──────────────────┘
       │
       │  GET /api/dev-error-logs?page=1&pageSize=20
       ▼
[DevErrorLogDialog/index.vue] 分页弹窗
```

### 3.2 前端拦截点分析

**实际代码**（`src/api/client.ts` 第 23-38 行）：

```typescript
async function httpRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`
  const response = await fetch(url, { ... })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  return response.json()
}
```

**改动方式**：在 `!response.ok` 的分支中、`throw` 之前插入日志上报逻辑。

**注意**：项目中还有统一入口 `request()` 函数（第 73-102 行），它调用 `httpRequest()`。只需在 `httpRequest()` 中拦截一次即可覆盖所有请求。

### 3.3 后端架构对齐

参考现有路由结构（以 `config.ts` 为例）：
- **路由层** `server/src/routes/config.ts`：接收 req/res，调用 service
- **服务层** `server/src/services/databaseService.ts`：执行 SQL 操作
- **建表层** `server/src/services/databaseInit.ts`：CREATE TABLE 语句

新模块完全复用此三层结构。

## 4. 后端实现细节

### 4.1 databaseInit.ts 新增建表

在现有建表语句末尾（约第 320 行 `console.log('[DB Init] ✅ All tables initialized successfully')` 之前）追加：

```typescript
// 创建 dev_error_logs 表
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
```

### 4.2 databaseService.ts 新增方法

参照现有方法模式（如 `addDebugLog`、`getDebugLogs`）：

```typescript
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
}> {
  await this.ready();

  const offset = (page - 1) * pageSize;

  // 查数据
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

  // 查总数
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
```

### 4.3 路由文件 devErrorLog.ts（新增）

参照 `server/src/routes/config.ts` 的写法：

```typescript
import { Router } from 'express';
import { DatabaseService } from '../services/databaseService';

const router = Router();
const dbService = new DatabaseService();

const LOG_URL_PREFIX = '/api/dev-error-log';

router.post(LOG_URL_PREFIX, async (req, res) => {
  try {
    await dbService.addDevErrorLog(req.body);
    res.json({ success: true });
  } catch (error) {
    console.error('[DevErrorLog] Failed to save:', error);
    res.status(200).json({ success: false });
  }
});

router.get('/api/dev-error-logs', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const result = await dbService.getDevErrorLogs(page, pageSize);
    res.json(result);
  } catch (error) {
    console.error('[DevErrorLog] Failed to query:', error);
    res.status(500).json({ error: 'Failed to query logs' });
  }
});

router.delete('/api/dev-error-logs', async (req, res) => {
  try {
    await dbService.clearDevErrorLogs();
    res.json({ success: true });
  } catch (error) {
    console.error('[DevErrorLog] Failed to clear:', error);
    res.status(500).json({ error: 'Failed to clear logs' });
  }
});

export { router as devErrorLogRouter };
```

### 4.4 index.ts 注册路由

参照现有注册方式（约第 15-18 行）：

```typescript
import { fileShareRouter } from './routes/fileShare';
import { devErrorLogRouter } from './routes/devErrorLog';  // 新增

app.use(devErrorLogRouter);  // 新增
```

## 5. 前端实现细节

### 5.1 client.ts 错误拦截

在 `httpRequest()` 函数中修改：

```typescript
const isDev = (import.meta as any).env?.DEV;

async function httpRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`
  const response = await fetch(url, { ... })

  if (!response.ok) {
    if (isDev) {
      recordDevError(url, options.method || 'GET', options.body, response).catch(() => {})
    }
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  return response.json()
}

async function recordDevError(
  url: string,
  method: string,
  requestBody: any,
  response: Response
): Promise<void> {
  try {
    let responseBody: string;
    try {
      const json = await response.clone().json();
      responseBody = JSON.stringify(json);
    } catch {
      responseBody = await response.clone().text();
    }

    const MAX_BODY_SIZE = 10240; // 10KB
    if (responseBody.length > MAX_BODY_SIZE) {
      responseBody = responseBody.substring(0, MAX_BODY_SIZE) + '[...TRUNCATED]';
    }

    fetch(`${isDev ? '' : API_BASE_URL}/api/dev-error-log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        method,
        request_body: requestBody ? String(requestBody) : null,
        response_status: response.status,
        response_body: responseBody,
        error_message: `HTTP ${response.status}: ${response.statusText}`
      })
    }).catch(() => {});
  } catch (e) {
    // 静默处理，不影响主流程
  }
}
```

### 5.2 悬浮按钮组件 DevToolsButton

**文件**: `src/components/DevToolsButton/index.vue` + `index.scss`

#### 功能需求

1. **悬浮定位**: 固定在页面右下角，初始默认位置（距右 24px，距底 24px）
2. **可拖拽**: 支持鼠标按住拖动改变位置
3. **hover 菜单**: 使用 Vuetify `v-menu` 展示菜单项
4. **位置持久化**: 拖拽结束后写入 localStorage，key 为 `dev-tools-btn-position`
5. **启动回显**: 组件挂载时从 localStorage 读取位置并应用
6. **仅开发环境显示**: 通过 `isDev` 控制

#### 组件结构

```
<template>
  <div v-if="isDev"
       class="dev-tools-btn"
       :style="{ left: position.x + 'px', top: position.y + 'px' }"
       @mousedown="onDragStart">
    <v-menu :location="'top start'" :close-on-content-click="false">
      <template #activator="{ props }">
        <v-btn v-bind="props" icon size="small" color="primary" elevation="4">
          <v-icon>mdi-bug</v-icon>
        </v-btn>
      </template>
      <v-list density="compact">
        <v-list-item prepend-icon="mdi-text-box-search-outline" title="查看错误日志" @click="showLogDialog = true" />
        <v-list-item prepend-icon="mdi-delete-sweep" title="清空日志" @click="clearLogs" />
      </v-list>
    </v-menu>

    <DevErrorLogDialog v-model="showLogDialog" />
  </div>
</template>
```

#### 拖拽逻辑核心

```typescript
const STORAGE_KEY = 'dev-tools-btn-position'
const DEFAULT_POS = { x: window.innerWidth - 60, y: window.innerHeight - 60 }

const position = ref(loadPosition())

function loadPosition(): { x: number; y: number } {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : DEFAULT_POS
  } catch {
    return DEFAULT_POS
  }
}

function savePosition() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(position.value))
}

let dragging = false
let dragOffset = { x: 0, y: 0 }

function onDragStart(e: MouseEvent) {
  if ((e.target as HTMLElement).closest('.v-menu')) return
  dragging = true
  dragOffset = { x: e.clientX - position.value.x, y: e.clientY - position.value.y }
  document.addEventListener('mousemove', onDragMove)
  document.addEventListener('mouseup', onDragEnd)
}

function onDragMove(e: MouseEvent) {
  if (!dragging) return
  position.value = {
    x: Math.max(0, Math.min(e.clientX - dragOffset.x, window.innerWidth - 48)),
    y: Math.max(0, Math.min(e.clientY - dragOffset.y, window.innerHeight - 48))
  }
}

function onDragEnd() {
  dragging = false
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup', onDragEnd)
  savePosition()
}
```

#### 样式要点

```scss
.dev-tools-btn {
  position: fixed;
  z-index: 9999;
  cursor: grab;
  user-select: none;

  &:active {
    cursor: grabbing;
  }
}
```

### 5.3 日志弹窗组件 DevErrorLogDialog

**文件**: `src/components/DevErrorLogDialog/index.vue` + `index.scss`

#### 功能需求

1. **全屏弹窗**: 使用 `v-dialog` 全屏宽度展示
2. **分页表格**: 展示 id、url、method、status、error_message、created_at 列
3. **响应体展开**: 点击某行可展开查看完整 request_body 和 response_body
4. **分页控件**: 底部分页导航
5. **清空操作**: 顶部工具栏提供清空按钮
6. **状态码颜色**: 4xx 黄色警告，5xx 红色错误

#### API 对接

```typescript
// 查询日志
const { data } = await httpRequest<{ logs: any[]; total: number; totalPages: number }>(
  '/api/dev-error-logs', { params: { page, pageSize } }
)

// 清空日志
await httpRequest('/api/dev-error-logs', { method: 'DELETE' })
```

### 5.4 App.vue 集成

在 `<v-app>` 内部、`<v-snackbar>` 之后添加全局组件：

```vue
<!-- 仅开发环境显示 -->
<DevToolsButton v-if="isElectronEnv || isDev" />
```

放在 App.vue 中确保它在所有页面之上，不受 `v-main` 区域限制。

## 6. 文件变更清单

### 6.1 后端

| 操作 | 文件路径 | 说明 |
|------|----------|------|
| 新建 | `server/src/routes/devErrorLog.ts` | 错误日志 CRUD 路由 |
| 修改 | `server/src/services/databaseInit.ts` | 追加 `dev_error_logs` 建表 SQL |
| 修改 | `server/src/services/databaseService.ts` | 追加 `addDevErrorLog` / `getDevErrorLogs` / `clearDevErrorLogs` |
| 修改 | `server/src/index.ts` | 注册 `devErrorLogRouter` |

### 6.2 前端

| 操作 | 文件路径 | 说明 |
|------|----------|------|
| 修改 | `src/api/client.ts` | 在 `httpRequest()` 中拦截非 2xx 响应并上报 |
| 新建 | `src/components/DevToolsButton/index.vue` | 悬浮可拖动按钮 + hover 菜单 |
| 新建 | `src/components/DevToolsButton/index.scss` | 悬浮按钮样式 |
| 新建 | `src/components/DevErrorLogDialog/index.vue` | 日志分页查看弹窗 |
| 新建 | `src/components/DevErrorLogDialog/index.scss` | 日志弹窗样式 |
| 修改 | `src/App.vue` | 引入并挂载 `DevToolsButton` |

## 7. AI 读取日志的方式

### 方式1: 直接 SQL 查询

```bash
# 最近 20 条错误
sqlite3 server/src/data/superutils.db "SELECT * FROM dev_error_logs ORDER BY created_at DESC LIMIT 20;"

# 按 500 错误筛选
sqlite3 server/src/data/superutils.db "SELECT * FROM dev_error_logs WHERE response_status >= 500;"
```

### 方式2: HTTP 接口查询

```
GET /api/dev-error-logs?page=1&pageSize=20
Response:
{
  "logs": [...],
  "total": 42,
  "totalPages": 3,
  "currentPage": 1
}
```

### 方式3: 页面 UI 查看

点击右下角悬浮按钮 → hover 菜单 → "查看错误日志" → 弹出分页表格。

## 8. 注意事项

### 8.1 防循环触发

- `/api/dev-error-log` POST 接口自身的错误不记录
- `/api/dev-error-logs` GET/DELETE 接口的错误也不记录
- 在 client.ts 中排除这些路径：

```typescript
const SKIP_PATHS = ['/api/dev-error-log', '/api/dev-error-logs']
if (isDev && !SKIP_PATHS.some(p => path.includes(p))) {
  recordDevError(...)
}
```

### 8.2 响应体截断

`response_body` 超过 10KB 时截断，防止超大响应撑爆数据库和 UI 渲染。

### 8.3 日志清理

建议保留最近 7 天的日志，可在 `getDevErrorLogs` 方法初始化时或单独接口中清理：

```sql
DELETE FROM dev_error_logs WHERE created_at < datetime('now', '-7 days')
```

### 8.4 拖拽边界约束

按钮拖拽时限制在视口范围内，不能拖出屏幕外。
