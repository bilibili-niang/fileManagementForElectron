# 开发环境错误日志功能

## 功能概述

在开发环境下，自动捕获并记录 API 请求错误，提供可视化的错误日志查看工具。

## 需求背景

开发过程中，前端发送的 API 请求可能因各种原因失败（如后端接口未启动、参数错误、后端报错等）。目前这些错误只在浏览器控制台显示，容易被忽略，且刷新页面后日志丢失。本功能提供持久化的错误日志记录和便捷的查看工具。

## 实现方案

### 后端实现

#### 1. 数据库表 `dev_error_logs`

**文件**: `server/src/services/databaseInit.ts` (约第 320 行附近)

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
)
```

**索引**:
- `idx_dev_error_logs_status` - 按响应状态查询
- `idx_dev_error_logs_created_at` - 按时间排序
- `idx_dev_error_logs_url` - 按 URL 搜索

#### 2. 数据库操作

**文件**: `server/src/services/databaseService.ts` (约第 390 行附近)

新增 `DatabaseService` 类的三个方法：

| 方法 | 功能 | 参数 | 返回值 |
|------|------|------|--------|
| `addDevErrorLog()` | 写入错误日志 | `{url, method, request_params, request_body, response_status, response_body, error_message}` | `Promise<void>` |
| `getDevErrorLogs()` | 分页查询日志 | `page`, `pageSize` | `{logs[], total, totalPages, currentPage}` |
| `clearDevErrorLogs()` | 清空所有日志 | 无 | `Promise<void>` |

#### 3. API 路由

**文件**: `server/src/routes/devErrorLog.ts` (新建)

| 路由 | 方法 | 功能 |
|------|------|------|
| `/api/dev-error-log` | POST | 写入单条错误日志 |
| `/api/dev-error-logs` | GET | 分页查询日志 (query: `page`, `pageSize`) |
| `/api/dev-error-logs` | DELETE | 清空所有日志 |

#### 4. 路由注册

**文件**: `server/src/index.ts` (约第 48 行)

```typescript
import { devErrorLogRouter } from './routes/devErrorLog';
// ...
app.use(devErrorLogRouter);
```

### 前端实现

#### 1. 错误日志自动上报

**文件**: `src/api/client.ts` (约第 20-70 行)

在 `httpRequest` 函数中，当 `response.ok === false` 时：
- 检测是否为开发环境 (`isDev`)
- 排除自身的 `/api/dev-error-log` 接口（防止循环）
- 异步调用 `recordDevError()` 上报错误信息

**关键代码**:
```typescript
if (!response.ok) {
  // 开发环境: 异步上报错误日志 (排除自身接口防止循环)
  if (isDev && !SKIP_LOG_PATHS.some(p => path.includes(p))) {
    recordDevError(url, options.method || 'GET', options.body, response).catch(() => {})
  }
  throw new Error(`HTTP ${response.status}: ${response.statusText}`)
}
```

**限制**:
- 响应体最大存储 10KB，超出部分截断
- 使用 `response.clone()` 避免消费原 body
- 失败时静默处理，不影响主流程

#### 2. 开发工具按钮

**文件**: `src/components/DevToolsButton/index.vue` (新建)

功能：
- 仅开发环境显示 (`v-if="isDev"`)
- 可拖拽定位，位置保存到 localStorage
- 点击展开菜单：
  - 查看错误日志
  - 清空日志

**样式**: `src/components/DevToolsButton/index.scss`

#### 3. 错误日志对话框

**文件**: `src/components/DevErrorLogDialog/index.vue` (新建)

功能：
- 分页展示错误日志（每页 15 条）
- 显示状态码、方法、URL、时间
- 点击行展开详情：请求 URL、请求体、响应体、错误信息
- 支持清空所有日志

**样式**: `src/components/DevErrorLogDialog/index.scss`

**已知问题**：
- 样式使用硬编码浅色背景，在暗色主题下显示可能不佳（待修复）

#### 4. 组件集成

**文件**: `src/App.vue` (约第 148 行)

```vue
<DevToolsButton />
```

在 `<v-snackbar>` 之后引入 `DevToolsButton` 组件。

## 文件变更清单

### 新增文件

| 文件路径 | 说明 |
|----------|------|
| `server/src/routes/devErrorLog.ts` | 后端路由处理 |
| `src/components/DevToolsButton/index.vue` | 开发工具按钮组件 |
| `src/components/DevToolsButton/index.scss` | 按钮样式 |
| `src/components/DevErrorLogDialog/index.vue` | 错误日志对话框 |
| `src/components/DevErrorLogDialog/index.scss` | 对话框样式 |

### 修改文件

| 文件路径 | 修改内容 |
|----------|----------|
| `server/config.json` | `activeTab` 改为 `api-docs` (非本次功能相关) |
| `server/src/index.ts` | 注册 `devErrorLogRouter` |
| `server/src/services/databaseInit.ts` | 新增 `dev_error_logs` 表初始化 |
| `server/src/services/databaseService.ts` | 新增 3 个数据库操作方法 |
| `src/App.vue` | 引入 `DevToolsButton` 组件 |
| `src/api/client.ts` | 新增错误日志自动上报逻辑 |

## 待优化项

1. **暗色模式适配** - `DevErrorLogDialog` 的样式使用硬编码浅色背景
2. **Response Body 消费** - `response.clone()` 后原 body 被消费，可能影响后续错误处理
3. **日志过期清理** - 建议添加定时任务清理 N 天前的日志

## 测试验证

1. 启动开发环境 (`pnpm dev`)
2. 触发一个失败的 API 请求（如访问不存在的接口）
3. 点击右下角的 🐛 按钮
4. 验证错误日志是否正确显示
5. 点击展开查看详情
6. 测试清空功能
