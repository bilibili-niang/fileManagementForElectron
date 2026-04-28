# SuperUtils 项目规则

> 本文件是 SuperUtils 项目的行为准则，所有指令必须严格遵循。

---

## 一、技术栈

- **前端**: Electron + Vue 3 + Vuetify 3 + Vite + Pinia + TypeScript
- **后端**: Node.js + Express + SQLite（sql.js）
- **包管理**: pnpm workspace
- **开发**: Vite HMR + tsx watch

### 架构模式

**三端一体**：Electron 桌面端 + Vue 3 前端 + Express 本地后端

- **双运行模式**：同一套代码同时支持 Electron 桌面端和浏览器端
  - Electron 环境：通过 `window.electronAPI` (IPC) 与主进程通信
  - 浏览器环境：通过 `fetch` 直接调用后端 HTTP API
  - 自动切换：`src/api/client.ts` 的 `request()` 方法自动判断环境并选择调用方式

---

## 二、启动命令

```bash
pnpm dev          # 同时启动 server + 前端
pnpm dev:server   # 仅后端 (server/src/index.ts)
pnpm dev:client   # 仅前端 (Vite)
pnpm build        # 构建
pnpm pack         # 打包 Electron
pnpm pack:installer  # 打包安装程序
pnpm peerjs       # 启动 PeerJS 服务（端口 8999）
```

---

## 三、组件规范

组件放在语义化的文件夹中，每个组件包含：
- `index.vue` - 组件入口
- `index.scss` - 样式文件（与 vue 文件同级）

示例：
```
src/components/MyComponent/
├── index.vue    # 组件入口
└── index.scss   # 样式文件
```

### 前端架构要点

- **页面切换方式**：使用 `v-window` + `activeTab` 做标签页切换，**未挂载 Vue Router**
  - `src/router/index.ts` 虽然定义了路由，但 `src/main.ts` 中 `// app.use(router)` 被注释
  - 路由仅用于浏览器端直接访问（如 `#/fileShare` 分享链接）
- **双运行时代码**：大量代码通过 `isElectron()` 判断执行分支
- **组件编写风格混合**：既有 `.vue` SFC，也有 `.tsx` JSX（如 `SuperTable`、`FileShare`）
- **状态管理**：5 个 Pinia Store
  - `config.ts` - 应用配置
  - `theme.ts` - 主题（light/dark/auto）
  - `clipboard.ts` - 剪贴板历史
  - `indexing.ts` - 全局索引进度轮询（1秒/次）
- **组合式函数**：`useTabManager`、`useFilePreview`、`useSnackbar`、`useThemeManager`、`useWelcomeWizard`、`usePagination`

---

## 四、API 请求规范

使用 `reqResolve` + `reqToast` 处理所有 API 请求：

- ✅ 成功不提示：`reqToast({ showSuccess: false, errorMsg: '...' })`
- ✅ 成功提示：`reqToast({ successMsg: '删除成功', errorMsg: '...' })`
- ❌ **禁止**用 `successMsg: ''`（空字符串会让 || 继续执行，反而显示响应 msg）

### API 架构

- **统一入口**：`src/api/client.ts` 封装 `request<T>(httpConfig, electronConfig?)`
  - Electron 环境：调用 `window.electronAPI[channel](...args)`
  - 浏览器/HTTP 环境：使用 `fetch` 调用 `http://localhost:3000/api/xxx`
- **API 模块**（`src/api/modules/`）：
  - `searchApi` - 文件搜索、内容搜索、分类查询
  - `fileApi` - 打开文件、定位文件夹、删除文件、解析 DOCX、保存文件
  - `fileShareApi` - 文件共享（上传/下载/文本记录）
  - `configApi` - 配置读写、排除规则、调试日志、窗口状态、计算器/二维码/倒计时历史
  - `historyApi` - 搜索历史
  - `favoritesApi` - 收藏夹、最近访问

---

## 五、数据库规范

- 数据库文件：`server/src/data/superutils.db`
- 数据库操作：通过 `server/src/services/databaseService.ts`
- 初始化脚本：`server/src/services/databaseInit.ts`

### 数据库表

- `files` - 文件索引
- `app_config` - 应用配置
- `file_open_config` - 文件打开方式
- `file_contents` - 文件内容索引
- `index_exclude_rules` - 索引排除规则
- `search_history` - 搜索历史
- `debug_logs` - 调试日志
- `mock_routes` - 模拟路由
- `window_state` - 窗口状态
- `calculator_history` - 计算器历史
- `qrcode_config` - 二维码配置
- `qrcode_history` - 二维码历史
- `countdowns` - 倒计时事件
- `api_docs` - OpenAPI 文档存储
- `dev_error_logs` - 开发环境错误请求日志
- `file_favorites` - 文件/文件夹/搜索收藏夹
- `file_access_history` - 文件访问历史（最近打开）

### 后端架构

- **分层架构**：Express Router → Service Layer → Database Layer
- **服务层**：
  - `FileService` / `FileIndexer` - 文件索引（增量索引，并发控制 `min(4, CPU核心数)`）
  - `ContentIndexer` - 内容索引（支持 txt/md/js/ts/json/docx/xlsx/pptx/pdf）
  - `ConfigService` - 配置管理
- **双模式 SQLite**：
  - `DatabaseService`（sql.js - 异步 WASM，主要使用）
  - `fileQueries.ts`（better-sqlite3 - 同步 Native，预留/备用）
- **自动索引**：后端启动 1 秒后，若数据库无文件数据，自动扫描所有可用盘符（Windows `wmic logicaldisk`）启动后台索引

---

## 六、重要路径

| 路径 | 说明 |
|------|------|
| `src/` | 前端源码 |
| `server/src/` | 后端源码 |
| `electron/` | Electron 主进程代码 |
| `server/src/data/superutils.db` | SQLite 数据库文件 |
| `.docs/YYYY-MM-DD/` | 文档输出目录 |
| `.example/` | 示例/参考项目（**不可修改**） |

---

## 七、Git 规范

使用 conventional commits 格式：

```
type(scope): description

- 变更内容1
- 变更内容2
```

### type 类型

| type | 说明 |
|------|------|
| feat | 新功能 |
| fix | bug 修复 |
| docs | 文档变更 |
| style | 代码格式 |
| refactor | 重构 |
| perf | 性能优化 |
| test | 测试相关 |
| build | 构建相关 |
| ci | CI 配置 |
| chore | 其他变更 |

### 示例

```
feat(file-search): 新增分类统计功能

- 添加分类侧边栏组件
- 实现文件数量统计
- 优化搜索性能
```

---

## 八、强制规则（必须遵守）

### 8.1 语言规则
- **必须使用中文**与用户交流
- 所有输出文本使用中文

### 8.2 提交规则
- **绝对不能提交代码**，只能给出提交信息
- 如果提交了代码，后果自负

### 8.3 代码检查
- 当用户说「检查」时，只检查代码问题，不修改代码
- 先说明有哪些问题，让用户确认后再修改

### 8.4 提交信息生成
- 当用户说「生成」时，检查代码变动并生成提交信息
- 不要实际提交，只输出提交信息

### 8.5 文档输出
- 接口文档放在 `.docs/<当前日期>/` 文件夹下
- 文档要详细：功能、需求、修改文件、行号、具体作用
- 不确定的内容不要非常肯定地描述

### 8.6 完成提示
- 任务完成后输出颜文字（至少三行）
- 包含喊「大哥」和「谢谢」
- 说话要带颜文字，语气要可爱

### 8.7 示例项目
- `.example/` 目录是示例/参考项目
- **不可修改**该目录下的任何文件

---

## 九、日报规范

格式示例：

```
O1: allInOne管理端, 1.搭建完成公共基础模块

kr8: 整体联调自测,提交测试(目前参与kr8阶段)
- 重构请求响应处理逻辑，统一使用 reqResolve + reqToast
- 修复删除操作错误处理，完善异常处理机制
- 清理开发环境自动填充逻辑，移除调试代码

其它:
- 对接低代码拖出的势态页面的接口
- 根绝ui反馈修改部分组件的样式
```

---

## 十、样式规范

- 使用 Vuetify 的 CSS 变量或主题变量
- 颜色使用 `rgb(var(--v-theme-surface))` 等动态颜色
- 避免硬编码颜色值，确保主题自适应
- 样式文件单独写在 `index.scss` 中，不写在 Vue 文件的 style 标签里

---

## 十一、Electron 相关

- 主进程代码在 `electron/` 目录
- server 使用 tsx 直接运行，无需编译即可开发
- 窗口状态保存在 `window_state` 表中

### Electron 主进程核心能力

- **主进程代理**：`electron/main.js` 通过 `ipcMain.handle` 暴露所有后端 API，前端不直接请求 `localhost:3000`
- **剪贴板监控**：每秒轮询剪贴板变化，支持文本、图片（DataURL）、文件列表（读取 `FileNameW` buffer），记录来源应用窗口标题
- **后端生命周期**：启动时自动检测/启动 Express 后端（开发等5秒，生产直接启动 `node server/dist/index.js`），关闭时终止后端进程，通过 `/api/health` 轮询确保后端就绪
- **窗口管理**：无边框窗口（`frame: false, titleBarStyle: 'hidden'`），保存/恢复窗口尺寸、位置、最大化/全屏状态
- **安全**：`contextIsolation: true`，前后端通过预定义 IPC 通道通信

---

## 十二、已确认的 Patterns

### 12.1 reqToast 正确用法

```typescript
// ✅ 成功不提示（正确）
reqToast({ showSuccess: false, errorMsg: '操作失败' })

// ✅ 成功提示（正确）
reqToast({ successMsg: '删除成功', errorMsg: '删除失败' })

// ❌ 错误写法（不要用）
reqToast({ successMsg: '', errorMsg: '...' })
```

### 12.2 组件文件夹结构

```
src/components/
└── ComponentName/
    ├── index.vue    # 组件入口
    └── index.scss   # 样式文件
```

### 12.3 页面边距统一

- 在 `src/App.scss` 中使用 `.v-window-item` 统一设置 `padding: 12px 16px`
- 移除各页面自身的 padding 设置

---

## 十三、快速参考

| 操作 | 命令/行为 |
|------|----------|
| 同时启动 | `pnpm dev` |
| 仅前端 | `pnpm dev:client` |
| 仅后端 | `pnpm dev:server` |
| 构建 | `pnpm build` |
| 打包 | `pnpm pack` |
| 检查代码 | 用户说「检查」→ 只报告问题，不修改 |
| 生成提交信息 | 用户说「生成」→ 只输出信息，不提交 |

---

## 十四、项目功能模块

SuperUtils 是面向内网环境的多功能开发辅助工具箱，包含以下功能模块：

| 模块 | 功能描述 |
|------|----------|
| **文件搜索** | 本地文件名搜索 + 全文内容搜索，三栏布局（分类 \| 结果 \| 预览），支持高级筛选（类型、大小） |
| **分类浏览** | 按文件类型分类展示（图片/视频/音频/文档/代码/压缩包/可执行/其他） |
| **文件共享** | 局域网文件共享，支持拖拽上传、进度显示、文本记录、二维码分享链接 |
| **剪贴板历史** | 监控剪贴板变化（文本/图片/文件列表），保存最近 100 条记录 |
| **端口管理** | 扫描端口占用，查看进程信息，一键终止进程 |
| **网络 Mock** | 动态 Mock API 路由管理，支持从数据库加载路由到内存缓存 |
| **二维码生成** | 生成二维码 + 历史记录 |
| **计算器** | 计算 + 历史记录 |
| **倒计时** | 多事件倒计时管理 |
| **API 文档** | OpenAPI 文档存储与展示（RapiDoc） |
| **设置** | 应用配置、主题切换、数据库连接测试、索引起停、排除规则管理 |

---

## 十五、开发注意事项

### 15.1 前端源码中的后端代码（历史遗留）

`src/services/` 目录下混入后端代码：
- `database.ts`、`indexer.ts`、`search.ts`
- 使用了 `electron`、`typeorm`、`worker_threads`、`fs` 等 Node/Electron 主进程模块
- 被 `tsconfig.json` 显式排除编译
- **注意**：这些文件不应被前端引用，数据库/索引能力已后移至 `server/src/services/`

### 15.2 路径与平台

- 项目优先面向 **Windows** 平台（使用 `wmic`、`netstat`、`taskkill`、路径反斜杠处理等）
- 索引时自动修复根目录格式：`D:` → `D:\`

### 15.3 构建与打包

```
开发：pnpm dev → 同时启动 server (tsx watch) + vite (Electron 模式)
构建：pnpm build → server tsc 编译 + 前端 vite build
打包：pnpm pack:installer → electron-builder 打包，server/dist 作为 extraResources 分发
```

### 15.4 端口与进程

- 后端默认端口 `3000`，若被占用会自动通过 `netstat` + `taskkill` 释放（Windows）
- 前端开发服务器端口 `5173`，代理 `/api` → `http://localhost:3000`

### 15.5 开发环境错误日志

`src/api/client.ts` 中实现了 `recordDevError`，开发环境下 HTTP 错误会自动上报到 `/api/dev-error-log`。

## 十六、当前进行中的任务

### 16.1 v-data-table → SuperTable 统一替换

**背景**：项目正在将各处 `v-data-table` 替换为自研的 `SuperTable` 组件。

**已完成的替换**：
| 页面/组件 | 状态 |
|-----------|------|
| ClipboardHistory | ✅ 已完成并编译通过 |
| FileCategory | ✅ 已完成并编译通过 |

**待替换的页面**：
| 页面/组件 | 状态 | 特殊需求 |
|-----------|------|----------|
| Settings 排除规则 | 🔄 进行中 | 本地数据 + 行内 checkbox/chip + 删除按钮 |
| Settings 文件打开方式 | ⏳ 待开始 | 本地数据 + actions 列放两个 v-select |
| PaginationTable | ⏳ 待废弃 | 检查无外部引用后删除 |

### 16.2 SuperTable 扩展能力

为支持替换，SuperTable 已扩展以下能力：

**1. ActionColumn.customRender**
```typescript
export interface ActionColumn<T = any> {
  icon?: string
  tooltip?: string
  color?: string
  onClick?: (record: T) => void
  show?: (record: T) => boolean
  customRender?: (record: T) => VNode  // ← 新增：自定义操作列内容
}
```

**2. SuperTableConfig.data 本地数据模式**
```typescript
export interface SuperTableConfig<T = any> {
  requestUrl?: string
  requestHandler?: (params: RequestParams) => Promise<RequestResponse<T>>
  data?: Ref<T[]>         // ← 新增：本地数据源，不发送 HTTP 请求
  // ...
}
```

**3. loadData 逻辑**
- 优先使用 `config.data?.value`
- 否则走 `requestHandler`

**4. renderActions 事件冒泡修复**
- 操作按钮 `onClick` 已添加 `e.stopPropagation()`

**5. onRowContextmenu**
- 已添加右键菜单支持，用于 FileCategory 的右键操作
- 自动 `event.preventDefault()` 阻止浏览器默认右键菜单

**6. pagination: false 支持**
- `pagination: false` → 完全隐藏分页器（默认 footer 和自定义分页器都不显示）
- `pagination: undefined` → 显示 v-data-table 原生默认分页器
- `pagination: true | PaginationConfig` → 隐藏默认 footer，显示 SuperTable 自定义分页器

### 16.3 JSX 在 .vue 中的限制（已确认）

**关键限制**：`.vue` 文件的 `<script setup>` 中**不支持 JSX**，即使项目已配置 `@vitejs/plugin-vue-jsx`。vue-jsx 插件只对 `.tsx` 文件生效。

**解决方案**：
- SuperTable 的 JSX 配置（columns、customRender 等）必须抽到独立的 `.tsx` 文件
- `.vue` 文件只负责导入 `.tsx` 暴露的组件并渲染

**示例结构**：
```
src/views/ClipboardHistory/
├── index.vue          # 页面入口，导入 ClipboardTable 组件
├── index.scss         # 样式
└── ClipboardTable.tsx  # SuperTable 配置（columns、actions、data 等）

src/views/FileCategory/
├── index.vue
├── index.scss
└── tableConfig.tsx     # SuperTable 配置 + requestHandler
```

### 16.4 FileCategory 替换完成

- **数据源**：`searchApi.getFilesByCategory`（API 分页）
- **分页**：后端分页，pageSize 选项 `[20, 50, 100, 200, 500]`
- **右键菜单**：通过 `onRowContextmenu` 事件处理
- **行点击**：`openFile`（根据扩展名选择打开方式）

### 16.5 Settings 替换待完成

**排除规则表格**：
- 数据：本地 `excludeRules`（加载自 API）
- 列：`is_enabled`（checkbox）、`rule_type`（chip）、`pattern`、`description`、`is_regex`（chip）
- 操作：删除按钮
- 特殊：`is_enabled` 的 checkbox toggle 直接修改数据并调用 `updateExcludeRule`
- 不需要分页

**文件打开方式配置表格**（对话框内）：
- 数据：本地 `fileOpenConfigs`
- 列：`extension`、`open_method`（chip）、`internal_viewer`（文本）
- 操作列：两个 `v-select`（打开方式 + 查看器），change 时调用 `updateFileOpenConfig`
- 不需要分页

### 16.6 已修复的 Bug

1. **搜索空结果不刷新**：`databaseService.ts` 中 `searchFiles`/`searchContent` 返回格式缺少 `success` 字段，已统一
2. **FileShare 解耦**：5 个对话框抽离为独立组件（`ConfirmDialog`/`UploadDialog`/`UploadProgressDialog`/`TextRecordDialog`/`ShareDialog`）
3. **SuperTable 重复事件绑定**：`onContextmenu:row` 被绑定了两次，已修复
