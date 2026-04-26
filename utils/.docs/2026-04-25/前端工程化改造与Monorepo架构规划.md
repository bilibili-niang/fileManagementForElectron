# SuperUtils Monorepo 架构改造详细开发文档

> 项目名称：SuperUtils
> 文档版本：v1.0
> 创建日期：2026-04-25
> 目标：规范化项目结构，实现代码复用，支持多端开发

---

## 目录

1. [项目现状分析](#1-项目现状分析)
2. [架构设计目标](#2-架构设计目标)
3. [Monorepo 方案设计](#3-monorepo-方案设计)
4. [目录结构详解](#4-目录结构详解)
5. [各包详细设计](#5-各包详细设计)
6. [共享包设计](#6-共享包设计)
7. [配置文件详解](#7-配置文件详解)
8. [依赖关系图](#8-依赖关系图)
9. [迁移实施方案](#9-迁移实施方案)
10. [脚本设计](#10-脚本设计)
11. [类型系统设计](#11-类型系统设计)
12. [API 层设计](#12-api-层设计)
13. [构建配置](#13-构建配置)
14. [风险与应对](#14-风险与应对)
15. [测试策略](#15-测试策略)
16. [部署策略](#16-部署策略)
17. [开发规范](#17-开发规范)
18. [FAQ](#18-faq)

---

## 1. 项目现状分析

### 1.1 当前项目结构

```
superUtils/
├── package.json              # 前端根配置（混合了 server 依赖）
├── server/                   # 后端服务（独立目录）
│   ├── package.json
│   └── src/
├── src/                      # 前端源码
│   ├── api/
│   ├── components/
│   ├── composables/
│   ├── stores/
│   ├── utils/
│   └── views/
├── electron/                 # Electron 主进程
├── vite.config.ts            # Electron + Vite 配置
├── vite.web.config.ts        # 纯 Web 配置
└── tsconfig.json
```

### 1.2 当前问题清单

#### 1.2.1 依赖管理问题

| 问题 | 当前状态 | 影响 |
|------|----------|------|
| 依赖冗余 | `mysql2`、`typeorm` 同时出现在前端和 server 的 package.json | 安装时间增加，磁盘占用增加 |
| 版本不一致 | 无法保证前后端使用相同版本 | 可能出现兼容性问题 |
| 依赖关系混乱 | 前后端共享类型困难 | 代码重复，维护成本高 |

#### 1.2.2 代码组织问题

| 问题 | 当前状态 | 影响 |
|------|----------|------|
| 类型不共享 | API 类型只定义在前端 | 后端需要手动同步 |
| 常量重复 | 文件分类常量在多处定义 | 修改时容易遗漏 |
| 工具函数重复 | 格式化、验证等函数重复实现 | 代码膨胀 |

#### 1.2.3 构建问题

| 问题 | 当前状态 | 影响 |
|------|----------|------|
| 多份构建配置 | `vite.config.ts` 和 `vite.web.config.ts` 有大量重复 | 维护困难 |
| 构建顺序依赖 | 需要手动确保 server 先构建 | CI/CD 复杂 |
| 开发体验差 | 无法同时启动前后端 | 开发效率低 |

#### 1.2.4 环境适配问题

| 问题 | 当前状态 | 影响 |
|------|----------|------|
| Electron 耦合 | 前端直接使用 `window.electronAPI` | 无法纯 Web 运行 |
| API 调用混乱 | 部分用 fetch，部分用 ipcRenderer | 代码不一致 |

### 1.3 当前文件统计

| 目录 | 文件数 | 说明 |
|------|--------|------|
| `src/api/` | 6 | API 模块 |
| `src/components/` | 12 | 公共组件 |
| `src/composables/` | 6 | Composables |
| `src/stores/` | 4 | Pinia Store |
| `src/views/` | 8 | 页面组件 |
| `server/src/` | 15+ | 后端服务 |
| **总计** | 50+ | |

---

## 2. 架构设计目标

### 2.1 核心目标

| 目标 | 优先级 | 说明 |
|------|--------|------|
| 类型共享 | P0 | 前后端使用同一套类型定义 |
| 依赖统一 | P0 | 消除依赖冗余，统一版本 |
| 独立构建 | P1 | 各包可独立构建和测试 |
| 简洁命令 | P1 | 根目录 package.json 不超过 5 个命令 |
| 开发体验 | P1 | 一键启动所有服务 |

### 2.2 非目标（明确不做的）

| 目标 | 原因 |
|------|------|
| 支持微前端 | 项目规模不需要 |
| 独立部署各包 | 作为一个整体应用部署 |
| 完整的 CI/CD | 需要单独的运维文档 |

### 2.3 设计原则

1. **保持现状优点** - Electron、Vue 3、Vite 技术栈不变
2. **渐进式改造** - 逐步迁移，不破坏现有功能
3. **简单优先** - 优先使用 pnpm workspace，避免过度设计
4. **实用主义** - 只解决实际问题，不追求完美架构

---

## 3. Monorepo 方案设计

### 3.1 方案选择

| 方案 | 优点 | 缺点 | 选择 |
|------|------|------|------|
| pnpm workspace | 简单、成熟、pnpm 优化 | 需要目录重组 | ✅ **推荐** |
| Nx | 功能强大、增量构建 | 复杂度高、学习曲线陡 | ❌ |
| Turborepo | 增量构建、缓存 | 需要额外配置 | ❌ |
| Lerna | 老牌、成熟 | 已停止维护 | ❌ |

### 3.2 pnpm workspace 简介

pnpm workspace 允许在单个代码库中管理多个包，主要特性：

1. **统一依赖安装** - 一次安装所有包的依赖
2. **智能链接** - 同一依赖只安装一份，节约磁盘
3. **跨包引用** - `workspace:*` 语法引用同项目包
4. **独立构建** - 每个包可独立构建

### 3.3 方案架构

```
┌─────────────────────────────────────────────────────────────┐
│                    superUtils Monorepo                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐   │
│  │  apps/web   │    │apps/electron│    │apps/server  │   │
│  │             │    │             │    │             │   │
│  │  Vue 3 UI   │    │ Electron   │    │  Express    │   │
│  │             │    │  Main Proc  │    │   API       │   │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘   │
│         │                    │                    │          │
│         └────────────────────┼────────────────────┘          │
│                              │                               │
│                     ┌─────────▼─────────┐                   │
│                     │ packages/shared   │                   │
│                     │                   │                   │
│                     │  • 类型定义        │                   │
│                     │  • 常量配置        │                   │
│                     │  • 工具函数        │                   │
│                     └───────────────────┘                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.4 包命名规范

| 包名 | 路径 | 说明 |
|------|------|------|
| `@super-utils/shared` | `packages/shared/` | 共享类型和工具 |
| `@super-utils/web` | `apps/web/` | Web 前端 |
| `@super-utils/electron` | `apps/electron/` | Electron 主进程 |
| `@super-utils/server` | `apps/server/` | Express 后端 |

---

## 4. 目录结构详解

### 4.1 完整目录结构

```
superUtils/
│
├── package.json              # 根配置（简洁）
├── pnpm-workspace.yaml       # 工作空间定义
├── tsconfig.base.json        # 基础 TS 配置
│
├── apps/                     # ═══════════════════════════════
│   │                          #     应用层
│   ├── web/                   # ═══════════════════════════════
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── index.html
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── App.vue
│   │   │   ├── api/
│   │   │   │   ├── index.ts
│   │   │   │   ├── client.ts
│   │   │   │   ├── file.ts
│   │   │   │   ├── search.ts
│   │   │   │   └── config.ts
│   │   │   ├── components/
│   │   │   │   ├── PaginationTable/
│   │   │   │   ├── FileIcon/
│   │   │   │   └── ...
│   │   │   ├── composables/
│   │   │   │   ├── usePagination.ts
│   │   │   │   ├── useSnackbar.ts
│   │   │   │   └── ...
│   │   │   ├── stores/
│   │   │   │   ├── config.ts
│   │   │   │   ├── theme.ts
│   │   │   │   └── clipboard.ts
│   │   │   ├── views/
│   │   │   │   ├── FileSearch/
│   │   │   │   ├── FileShare/
│   │   │   │   ├── ClipboardHistory/
│   │   │   │   └── ...
│   │   │   ├── router/
│   │   │   ├── plugins/
│   │   │   ├── styles/
│   │   │   └── env.d.ts
│   │   └── tsconfig.json
│   │
│   ├── electron/             # ═══════════════════════════════
│   │   ├── package.json
│   │   ├── electron-builder.json
│   │   └── src/
│   │       ├── main/
│   │       │   ├── index.ts      # 主进程入口
│   │       │   ├── window.ts     # 窗口管理
│   │       │   ├── menu.ts      # 菜单
│   │       │   └── ipc.ts       # IPC 注册
│   │       ├── preload/
│   │       │   └── index.ts     # 预加载脚本
│   │       └── ipc/
│   │           ├── file.ts       # 文件操作
│   │           ├── config.ts     # 配置操作
│   │           └── index.ts      # 导出
│   │
│   └── server/                 # ═══════════════════════════════
│       ├── package.json
│       └── src/
│           ├── index.ts          # 服务入口
│           ├── routes/
│           │   ├── index.ts
│           │   ├── files.ts
│           │   ├── config.ts
│           │   ├── search.ts
│           │   └── fileShare.ts
│           ├── services/
│           │   ├── index.ts
│           │   ├── fileService.ts
│           │   ├── fileIndexer.ts
│           │   ├── contentIndexer.ts
│           │   ├── databaseService.ts
│           │   └── databaseInit.ts
│           ├── db/
│           │   └── index.ts
│           └── middleware/
│               └── cors.ts
│
├── packages/                   # ═══════════════════════════════
│   │                          #     共享包
│   └── shared/                # ═══════════════════════════════
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts        # 主入口
│           ├── types/
│           │   ├── index.ts
│           │   ├── api.ts      # API 类型
│           │   ├── file.ts     # 文件类型
│           │   ├── config.ts   # 配置类型
│           │   └── response.ts # 响应类型
│           ├── constants/
│           │   ├── index.ts
│           │   ├── fileCategory.ts
│           │   └── httpStatus.ts
│           └── utils/
│               ├── index.ts
│               ├── format.ts
│               ├── validation.ts
│               └── file.ts
│
├── scripts/                   # ═══════════════════════════════
│   │                          #     构建脚本
│   ├── dev.ts                 # 启动开发服务器
│   ├── build.ts               # 全量构建
│   ├── clean.ts               # 清理构建产物
│   └── typecheck.ts           # 类型检查
│
└── docs/                      # 文档（可选）
    └── 2026-04-25/
```

### 4.2 目录命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 组件目录 | 组件名（PascalCase） | `PaginationTable/` |
| 组件文件 | `index.tsx` | `PaginationTable/index.tsx` |
| 组件样式 | `index.scss` | `PaginationTable/index.scss` |
| 工具文件 | 小写 + 连字符 | `formatFileSize.ts` |
| 类型文件 | 小写 + 连字符 | `apiResponse.ts` |
| 常量文件 | 小写 + 连字符 | `fileCategory.ts` |

### 4.3 文件命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| Vue 组件 | PascalCase | `FileSearch.vue` |
| TypeScript 工具 | camelCase 或 kebab-case | `usePagination.ts` |
| 类型定义 | kebab-case | `api-response.ts` |
| 样式文件 | index.scss | `index.scss` |

### 4.4 组件规范详解

#### 4.4.1 组件文件结构

```
src/components/
├── PaginationTable/          # 组件文件夹（PascalCase）
│   ├── index.tsx             # 组件入口（TSX 语法）
│   ├── index.scss            # 组件样式
│   └── types.ts              # 可选：类型定义
├── FileIcon/
│   ├── index.tsx
│   └── index.scss
└── MyDialog/
    ├── index.tsx
    └── index.scss
```

#### 4.4.2 组件命名规范

| 项目 | 规范 | 示例 |
|------|------|------|
| 文件夹 | PascalCase，语义化 | `PaginationTable/` |
| 组件入口 | `index.tsx` | `PaginationTable/index.tsx` |
| 样式文件 | `index.scss` | `PaginationTable/index.scss` |
| 类型文件 | `types.ts` | `PaginationTable/types.ts` |

#### 4.4.3 组件使用方式

```tsx
// 在其他组件中引入
import PaginationTable from '@/components/PaginationTable/index.tsx'
import FileIcon from '@/components/FileIcon/index.tsx'

// 在模板中使用
<PaginationTable data={data} onChange={handleChange} />
<FileIcon type="pdf" />
```

#### 4.4.4 样式规范

**1. 样式文件位置**
- 组件样式必须放在与 `index.tsx` 同级的 `index.scss` 文件中
- 不允许在 `.tsx` 文件中使用 `<style>` 标签

**2. 设计令牌（Design Tokens）**

设计令牌统一存放在 `src/styles/design-tokens.scss`：

```
src/styles/
├── design-tokens.scss        # 设计令牌（颜色、间距、字体等）
├── components.scss           # 通用组件样式
├── transitions.scss         # 过渡动画
└── micro-interactions.scss   # 微交互样式
```

**3. 设计令牌包含内容**

| 系统 | 内容 | 示例 |
|------|------|------|
| 间距 | `$spacing-xs` ~ `$spacing-xxxl` | `$spacing-lg: 16px` |
| 字体 | 字体族、大小、字重 | `$font-size-base: 14px` |
| 颜色 | 主色、功能色、文字色 | `$color-primary: #1976D2` |
| 圆角 | `$radius-sm` ~ `$radius-full` | `$radius-md: 8px` |
| 阴影 | `$shadow-sm` ~ `$shadow-xl` | `$shadow-md: 0 4px 6px rgba(0,0,0,0.1)` |
| 图标尺寸 | `$icon-size-xs` ~ `$icon-size-xxl` | `$icon-size-lg: 24px` |
| 过渡动画 | 时长、缓动函数 | `$duration-fast: 150ms` |
| Z-index | 层级系统 | `$z-index-modal: 1050` |
| 断点 | 响应式断点 | `$breakpoint-md: 960px` |

**4. 样式写法示例**

```scss
// ✅ 推荐：使用设计令牌
@use '@/styles/design-tokens.scss' as tokens;

.my-component {
  // 间距
  padding: tokens.$spacing-md;        // 12px
  margin-bottom: tokens.$spacing-lg;  // 16px

  // 圆角
  border-radius: tokens.$radius-md;    // 8px

  // 字体
  font-size: tokens.$font-size-base;   // 14px

  // 颜色 - 使用 Vuetify 主题变量
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));

  // 过渡动画
  transition: all tokens.$duration-fast tokens.$ease-default;
}

// ✅ 推荐：使用 Vuetify 主题变量
.dialog-content {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-primary), 0.3);
}

// ❌ 避免：硬编码颜色
.bad-example {
  padding: 12px;
  color: #FFFFFF;
  background: #1976D2;
}
```

**5. 响应式样式**

```scss
@use '@/styles/design-tokens.scss' as tokens;

.responsive-component {
  // 默认样式（移动端）
  padding: tokens.$spacing-sm;

  // 平板及以上
  @media (min-width: tokens.$breakpoint-sm) {
    padding: tokens.$spacing-md;
  }

  // 桌面及以上
  @media (min-width: tokens.$breakpoint-md) {
    padding: tokens.$spacing-lg;
  }
}
```

**6. 常用 Mixins**

```scss
@use '@/styles/design-tokens.scss' as tokens;

// 文本截断
.text-ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

// Flex 居中
.center-content {
  display: flex;
  align-items: center;
  justify-content: center;
}

// 禁止用户选择
.no-select {
  user-select: none;
  -webkit-user-select: none;
}
```

#### 4.4.5 页面组件结构

页面组件（views）采用类似目录结构：

```
src/views/
├── FileSearch/              # 页面文件夹
│   ├── index.vue            # 页面入口
│   ├── index.scss           # 页面样式
│   ├── components/          # 页面私有组件
│   │   ├── SearchBox/
│   │   │   ├── index.tsx
│   │   │   └── index.scss
│   │   └── CategorySidebar/
│   │       ├── index.tsx
│   │       └── index.scss
│   ├── composables/          # 页面私有 hooks
│   │   └── useFileSearch.ts
│   └── types.ts             # 页面类型定义
└── Settings/
    ├── index.vue
    └── index.scss
```

---

## 5. 各包详细设计

### 5.1 packages/shared（共享包）

#### 5.1.1 职责

| 职责 | 说明 |
|------|------|
| 类型定义 | API 请求/响应、文件、配置等类型 |
| 常量配置 | 文件分类、HTTP 状态码等常量 |
| 工具函数 | 格式化、验证、文件操作等纯函数 |

#### 5.1.2 依赖

**无任何运行时依赖** - 这是纯 TypeScript 包

#### 5.1.3 导出结构

```typescript
// packages/shared/src/index.ts

// 类型
export * from './types/api'
export * from './types/file'
export * from './types/config'
export * from './types/response'

// 常量
export * from './constants/fileCategory'
export * from './constants/httpStatus'

// 工具
export * from './utils/format'
export * from './utils/validation'
export * from './utils/file'
```

### 5.2 apps/web（Web 前端）

#### 5.2.1 职责

| 职责 | 说明 |
|------|------|
| 用户界面 | Vue 3 + Vuetify 3 组件 |
| 状态管理 | Pinia Store |
| 路由管理 | Vue Router |
| API 调用 | 通过 ApiClient 调用后端 |
| Electron 适配 | 通过 preload 暴露的 API 调用主进程 |

#### 5.2.2 依赖

```json
{
  "dependencies": {
    "@super-utils/shared": "workspace:*",
    "vue": "^3.4.0",
    "vuetify": "^3.6.0",
    "pinia": "^2.1.0",
    "vue-router": "^4.6.4",
    "lodash-es": "^4.17.23",
    "qrcode": "^1.5.4"
  }
}
```

#### 5.2.3 API 层设计

```
apps/web/src/api/
├── index.ts              # 统一导出
├── client.ts             # ApiClient 实现
├── types.ts              # Web 特有类型
├── file.ts               # 文件 API
├── search.ts             # 搜索 API
├── config.ts            # 配置 API
├── favorites.ts         # 收藏 API
└── clipboard.ts         # 剪贴板 API
```

### 5.3 apps/server（Express 后端）

#### 5.3.1 职责

| 职责 | 说明 |
|------|------|
| HTTP API | Express 路由处理 |
| 文件索引 | 文件系统扫描和索引 |
| 内容搜索 | 全文检索 |
| 数据库 | SQLite 操作 |
| 静态资源 | 文件下载、预览 |

#### 5.3.2 依赖

```json
{
  "dependencies": {
    "@super-utils/shared": "workspace:*",
    "express": "^4.18.2",
    "sql.js": "^1.14.1",
    "cors": "^2.8.5",
    "multer": "^1.4.5-lts.1",
    "chokidar": "^3.5.3"
  }
}
```

### 5.4 apps/electron（Electron 主进程）

#### 5.4.1 职责

| 职责 | 说明 |
|------|------|
| 窗口管理 | 创建、管理 BrowserWindow |
| IPC 处理 | 注册和分发 IPC 消息 |
| 系统集成 | 文件操作、系统菜单 |
| 应用生命周期 | 启动、退出、更新 |

#### 5.4.2 依赖

```json
{
  "dependencies": {
    "@super-utils/shared": "workspace:*",
    "@super-utils/server": "workspace:*",
    "electron": "^32.0.0"
  }
}
```

#### 5.4.3 IPC 通信设计

```
┌──────────────────────────────────────────────────────────────┐
│                    Electron IPC 通信架构                       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌─────────┐      ┌─────────────┐      ┌────────────────┐   │
│   │  Main   │◄────►│   Preload   │◄────►│  Renderer      │   │
│   │ Process │      │   Script    │      │  (Vue App)    │   │
│   └────┬────┘      └──────┬──────┘      └───────┬────────┘   │
│        │                   │                       │            │
│        │  ┌───────────────┘                       │            │
│        │  │                                       │            │
│        ▼  ▼                                       ▼            │
│   ┌─────────────┐                        ┌──────────────┐     │
│   │  IPC        │                        │  ApiClient   │     │
│   │  Handlers   │                        │  (IpcBridge) │     │
│   └──────┬──────┘                        └──────────────┘     │
│          │                                                     │
│          │  ┌───────────────────────────────────────────┐      │
│          └──│  Server Services (fileService, etc.)      │      │
│             │  @super-utils/server                       │      │
│             └───────────────────────────────────────────┘      │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 6. 共享包设计

### 6.1 类型定义

#### 6.1.1 API 类型

```typescript
// packages/shared/src/types/api.ts

/** API 统一响应格式 */
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

/** API 错误响应 */
export interface ApiErrorResponse {
  success: false
  error: string
  code?: string
}

/** 分页请求参数 */
export interface PaginationParams {
  page: number
  pageSize: number
}

/** 分页响应 */
export interface PaginatedResponse<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/** API 错误类 */
export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message)
    this.name = 'ApiError'
  }
}
```

#### 6.1.2 文件类型

```typescript
// packages/shared/src/types/file.ts

/** 文件信息 */
export interface FileInfo {
  id: number
  name: string
  path: string
  extension: string
  size: number
  createdTime: string
  modifiedTime: string
  accessedTime: string
  hash?: string
  isHidden?: boolean
  isReadonly?: boolean
  attributes?: string
}

/** 文件分类 */
export type FileCategory =
  | 'image'
  | 'video'
  | 'audio'
  | 'document'
  | 'code'
  | 'archive'
  | 'executable'

/** 文件分类配置 */
export interface FileCategoryConfig {
  id: FileCategory
  name: string
  extensions: string[]
  icon: string
}

/** 搜索选项 */
export interface SearchOptions {
  query?: string
  category?: FileCategory
  extensions?: string[]
  minSize?: number
  maxSize?: number
  dateFrom?: string
  dateTo?: string
  pathPattern?: string
}

/** 搜索结果 */
export interface SearchResult {
  files: FileInfo[]
  total: number
  categories: CategoryCount[]
}

/** 分类统计 */
export interface CategoryCount {
  category: FileCategory
  count: number
}
```

#### 6.1.3 配置类型

```typescript
// packages/shared/src/types/config.ts

/** 应用配置 */
export interface AppConfig {
  mysql: MysqlConfig
  indexing: IndexingConfig
  theme: 'light' | 'dark' | 'system'
  activeTab: string
}

/** MySQL 配置 */
export interface MysqlConfig {
  host: string
  port: number
  username: string
  password: string
  database: string
}

/** 索引配置 */
export interface IndexingConfig {
  drives: string[]
  excludeC: boolean
  excludeNodeModules: boolean
  lastIndexed: string | null
  schedule: string
}
```

### 6.2 常量定义

#### 6.2.1 文件分类常量

```typescript
// packages/shared/src/constants/fileCategory.ts

import type { FileCategoryConfig } from '../types'

export const FILE_CATEGORIES: FileCategoryConfig[] = [
  {
    id: 'image',
    name: '图片',
    extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico'],
    icon: 'mdi-image'
  },
  {
    id: 'video',
    name: '视频',
    extensions: ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'],
    icon: 'mdi-video'
  },
  {
    id: 'audio',
    name: '音频',
    extensions: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a'],
    icon: 'mdi-music'
  },
  {
    id: 'document',
    name: '文档',
    extensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'odt'],
    icon: 'mdi-file-document'
  },
  {
    id: 'code',
    name: '代码',
    extensions: [
      'js', 'ts', 'jsx', 'tsx', 'vue',
      'py', 'java', 'c', 'cpp', 'h', 'hpp', 'cs',
      'go', 'rs', 'rb', 'php', 'swift', 'kt',
      'html', 'htm', 'css', 'scss', 'sass', 'less',
      'json', 'xml', 'yaml', 'yml'
    ],
    icon: 'mdi-code-braces'
  },
  {
    id: 'archive',
    name: '压缩包',
    extensions: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'],
    icon: 'mdi-folder-zip'
  },
  {
    id: 'executable',
    name: '可执行',
    extensions: ['exe', 'msi', 'dmg', 'pkg', 'deb', 'rpm', 'appimage'],
    icon: 'mdi-cog'
  }
]

/** ID -> Config 映射 */
export const FILE_CATEGORY_MAP = new Map<FileCategory, FileCategoryConfig>(
  FILE_CATEGORIES.map(c => [c.id, c])
)

/** 扩展名 -> Config 映射 */
export const FILE_EXTENSION_MAP = new Map<string, FileCategoryConfig>(
  FILE_CATEGORIES.flatMap(c =>
    c.extensions.map(ext => [ext.toLowerCase(), c])
  )
)
```

#### 6.2.2 HTTP 状态码常量

```typescript
// packages/shared/src/constants/httpStatus.ts

/** HTTP 状态码 */
export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  INTERNAL_SERVER_ERROR = 500,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503
}

/** HTTP 状态码文本 */
export const HTTP_STATUS_TEXT: Record<number, string> = {
  [HttpStatus.OK]: 'OK',
  [HttpStatus.CREATED]: 'Created',
  [HttpStatus.NO_CONTENT]: 'No Content',
  [HttpStatus.BAD_REQUEST]: 'Bad Request',
  [HttpStatus.UNAUTHORIZED]: 'Unauthorized',
  [HttpStatus.FORBIDDEN]: 'Forbidden',
  [HttpStatus.NOT_FOUND]: 'Not Found',
  [HttpStatus.CONFLICT]: 'Conflict',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'Unprocessable Entity',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'Internal Server Error',
  [HttpStatus.BAD_GATEWAY]: 'Bad Gateway',
  [HttpStatus.SERVICE_UNAVAILABLE]: 'Service Unavailable'
}
```

### 6.3 工具函数

#### 6.3.1 格式化工具

```typescript
// packages/shared/src/utils/format.ts

/** 格式化文件大小 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Math.round(bytes / Math.pow(k, i) * 100) / 100} ${sizes[i]}`
}

/** 格式化日期时间 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

/** 相对时间格式化 */
export function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  return formatDateTime(new Date(timestamp))
}
```

#### 6.3.2 验证工具

```typescript
// packages/shared/src/utils/validation.ts

/** 验证扩展名 */
export function isValidExtension(ext: string): boolean {
  return /^[a-zA-Z0-9]+$/.test(ext)
}

/** 验证文件路径 */
export function isValidPath(path: string): boolean {
  // Windows 和 Unix 路径基本验证
  return path.length > 0 && !/[<>"|?*]/.test(path)
}

/** 验证文件大小范围 */
export function isValidSizeRange(min?: number, max?: number): boolean {
  if (min !== undefined && max !== undefined) {
    return min >= 0 && max >= min
  }
  return true
}

/** 验证分页参数 */
export function isValidPagination(page: number, pageSize: number): boolean {
  return page >= 1 && pageSize >= 1 && pageSize <= 1000
}
```

---

## 7. 配置文件详解

### 7.1 pnpm-workspace.yaml

```yaml
# pnpm-workspace.yaml
# 定义工作空间中的包

packages:
  # 应用层
  - 'apps/*'

  # 共享包
  - 'packages/*'
```

### 7.2 tsconfig.base.json

```json
// tsconfig.base.json
// 基础 TypeScript 配置，供各包继承

{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "preserve",

    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,

    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,

    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "composite": true,

    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,

    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  }
}
```

### 7.3 packages/shared/tsconfig.json

```json
// packages/shared/tsconfig.json

{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declarationDir": "./dist"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 7.4 apps/web/tsconfig.json

```json
// apps/web/tsconfig.json

{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@super-utils/shared": ["../../packages/shared/src"]
    },
    "types": ["vite/client"]
  },
  "include": ["src/**/*", "src/**/*.vue"],
  "exclude": ["node_modules", "dist"]
}
```

### 7.5 apps/server/tsconfig.json

```json
// apps/server/tsconfig.json

{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "types": ["node"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 7.6 apps/electron/tsconfig.json

```json
// apps/electron/tsconfig.json

{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "types": ["node"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

## 8. 依赖关系图

### 8.1 包依赖关系

```
┌─────────────────────────────────────────────────────────────┐
│                    依赖关系图                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                    packages/shared                           │
│                    (无外部依赖)                               │
│                            ▲                                 │
│                            │                                 │
│           ┌────────────────┼────────────────┐              │
│           │                │                │              │
│           ▼                ▼                ▼              │
│    ┌──────────┐    ┌──────────┐    ┌──────────┐        │
│    │apps/web  │    │apps/server│    │apps/electron│     │
│    │          │    │          │    │          │        │
│    │ Vue 3    │    │ Express  │    │ Electron │        │
│    │ Vuetify  │    │ SQLite   │    │          │        │
│    └─────┬────┘    └─────┬────┘    └─────┬────┘        │
│          │                 │                │              │
│          │                 │                │              │
│          │          ┌──────┴──────┐       │              │
│          │          │              │       │              │
│          │          ▼              │       ▼              │
│          │    ┌──────────┐       │  ┌──────────┐        │
│          └────►│   IPC    │◄─────┘  │  Server   │        │
│               │  Bridge   │         │  Services │        │
│               └───────────┘         └───────────┘        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 运行时依赖流向

```
                    ┌─────────────────┐
                    │   End User      │
                    │   (用户)        │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │   Browser       │
                    │   (浏览器)      │
                    └────────┬────────┘
                             │ HTTP/WebSocket
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    apps/server                             │
│                    (Express API)                           │
│                                                             │
│  /api/files/search  ────►  FileService                  │
│  /api/config          ────►  ConfigService                │
│  /api/file-share     ────►  FileShareService             │
└─────────────────────────────────────────────────────────────┘
                             ▲
                             │ IPC (仅 Electron 模式)
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    apps/electron                            │
│                    (Electron Main)                         │
│                                                             │
│  BrowserWindow ◄──► IPC Handlers ◄──► Server Services   │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. 迁移实施方案

### 9.1 迁移原则

1. **渐进式迁移** - 逐步迁移，不破坏现有功能
2. **功能优先** - 先保证功能正常，再优化结构
3. **测试驱动** - 每一步迁移后验证功能正常
4. **可回滚** - 保留 git 分支，随时可回滚

### 9.2 迁移阶段

#### Phase 1：准备阶段（第 1 天）

| 任务 | 说明 | 产出 |
|------|------|------|
| 创建目录结构 | 创建 `apps/`、`packages/`、`scripts/` | 目录 |
| 配置 workspace | 创建 `pnpm-workspace.yaml` | 配置文件 |
| 创建 shared 包 | 提取类型、常量、工具 | `packages/shared/` |
| 验证构建 | 验证 shared 可独立构建 | 构建成功 |

#### Phase 2：迁移前端（第 2-3 天）

| 任务 | 说明 | 产出 |
|------|------|------|
| 迁移代码 | 移动 `src/` 到 `apps/web/src/` | 完整代码 |
| 更新依赖 | 更新 `package.json` | 新依赖 |
| 更新 imports | 替换 `@/` 为 `@super-utils/shared` | 修改后的代码 |
| 验证构建 | 验证 web 可构建 | 构建成功 |
| 验证运行 | 验证 dev 模式正常运行 | 运行正常 |

#### Phase 3：迁移后端（第 4-5 天）

| 任务 | 说明 | 产出 |
|------|------|------|
| 迁移代码 | 移动 `server/src/` 到 `apps/server/src/` | 完整代码 |
| 更新依赖 | 更新 `package.json` | 新依赖 |
| 更新 imports | 使用 `@super-utils/shared` 类型 | 修改后的代码 |
| 验证构建 | 验证 server 可构建 | 构建成功 |
| 验证运行 | 验证 dev 模式正常运行 | 运行正常 |

#### Phase 4：迁移 Electron（第 6 天）

| 任务 | 说明 | 产出 |
|------|------|------|
| 迁移代码 | 移动 `electron/` 到 `apps/electron/` | 完整代码 |
| 更新依赖 | 更新 `package.json` | 新依赖 |
| 重构 IPC | 使用 server 服务 | 修改后的代码 |
| 验证构建 | 验证 electron 可构建 | 构建成功 |
| 验证运行 | 验证打包后正常运行 | 运行正常 |

#### Phase 5：收尾阶段（第 7 天）

| 任务 | 说明 | 产出 |
|------|------|------|
| 创建脚本 | 创建 `scripts/` 目录脚本 | 构建脚本 |
| 清理代码 | 删除旧目录、配置 | 整洁代码库 |
| 全量测试 | 验证所有构建和运行 | 测试报告 |
| 文档更新 | 更新 README 等文档 | 更新后的文档 |

### 9.3 迁移检查清单

```markdown
## Phase 1 检查清单

- [ ] 创建 `apps/` 目录
- [ ] 创建 `packages/` 目录
- [ ] 创建 `scripts/` 目录
- [ ] 创建 `pnpm-workspace.yaml`
- [ ] 创建 `tsconfig.base.json`
- [ ] 创建 `packages/shared/`
- [ ] 提取类型到 `shared/src/types/`
- [ ] 提取常量到 `shared/src/constants/`
- [ ] 提取工具到 `shared/src/utils/`
- [ ] 验证 `packages/shared` 可构建

## Phase 2 检查清单

- [ ] 创建 `apps/web/` 目录结构
- [ ] 移动前端代码到 `apps/web/src/`
- [ ] 更新 `apps/web/package.json`
- [ ] 更新 `apps/web/tsconfig.json`
- [ ] 更新 Vite 配置
- [ ] 更新 imports（使用 shared）
- [ ] 验证 `apps/web` 可构建
- [ ] 验证 `pnpm -F web dev` 正常运行

## Phase 3 检查清单

- [ ] 创建 `apps/server/` 目录结构
- [ ] 移动后端代码到 `apps/server/src/`
- [ ] 更新 `apps/server/package.json`
- [ ] 更新 `apps/server/tsconfig.json`
- [ ] 更新 imports（使用 shared）
- [ ] 验证 `apps/server` 可构建
- [ ] 验证 `pnpm -F server dev` 正常运行

## Phase 4 检查清单

- [ ] 创建 `apps/electron/` 目录结构
- [ ] 移动 Electron 代码到 `apps/electron/src/`
- [ ] 更新 `apps/electron/package.json`
- [ ] 更新 `apps/electron/tsconfig.json`
- [ ] 重构 IPC 处理器
- [ ] 验证 `apps/electron` 可构建
- [ ] 验证 Electron 打包正常

## Phase 5 检查清单

- [ ] 创建 `scripts/` 目录脚本
- [ ] 更新根目录 `package.json`
- [ ] 删除旧目录（`src/`、`server/`）
- [ ] 删除旧配置文件
- [ ] 全量构建成功
- [ ] 全量开发模式正常运行
- [ ] 更新 README
```

---

## 10. 脚本设计

### 10.1 scripts/dev.ts（开发启动）

```typescript
// scripts/dev.ts
// 一键启动所有开发服务

import { spawn, ChildProcess } from 'child_process'
import { resolve } from 'path'

const root = resolve(__dirname, '..')

interface Service {
  name: string
  command: string
  args: string[]
  color: string
}

const services: Service[] = [
  { name: 'SERVER', command: 'pnpm', args: ['-F', 'server', 'dev'], color: '\x1b[36m' },
  { name: 'WEB', command: 'pnpm', args: ['-F', 'web', 'dev'], color: '\x1b[32m' },
  { name: 'ELECTRON', command: 'pnpm', args: ['-F', 'electron', 'dev'], color: '\x1b[35m' }
]

const processes: ChildProcess[] = []

console.log('\n🚀 Starting SuperUtils development environment...\n')

for (const service of services) {
  console.log(`${service.color}[${service.name}]\x1b[0m Starting...`)

  const proc = spawn(service.command, service.args, {
    cwd: root,
    stdio: 'pipe',
    shell: process.platform === 'win32'
  })

  proc.stdout?.on('data', (data) => {
    process.stdout.write(`${service.color}[${service.name}]\x1b[0m ${data}`)
  })

  proc.stderr?.on('data', (data) => {
    process.stderr.write(`${service.color}[${service.name}]\x1b[0m ${data}`)
  })

  proc.on('close', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`${service.color}[${service.name}]\x1b[0m Process exited with code ${code}`)
    }
  })

  processes.push(proc)
}

// 处理退出
function shutdown() {
  console.log('\n\n👋 Shutting down services...\n')
  for (const proc of processes) {
    proc.kill()
  }
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

console.log('\n📝 Press Ctrl+C to stop all services\n')
```

### 10.2 scripts/build.ts（构建脚本）

```typescript
// scripts/build.ts
// 全量构建脚本

import { execSync } from 'child_process'

async function build() {
  console.log('\n📦 Starting build process...\n')

  const packages = ['shared', 'server', 'web', 'electron']

  for (const pkg of packages) {
    console.log(`Building \`${pkg}\`...`)

    try {
      execSync(`pnpm -F ${pkg} build`, {
        stdio: 'inherit',
        cwd: resolve(__dirname, '..')
      })
      console.log(`✅ \`${pkg}\` built successfully\n`)
    } catch (error) {
      console.error(`❌ Failed to build \`${pkg}\``)
      process.exit(1)
    }
  }

  console.log('\n🎉 All packages built successfully!\n')
}

import { resolve } from 'path'
build().catch(console.error)
```

### 10.3 scripts/clean.ts（清理脚本）

```typescript
// scripts/clean.ts
// 清理构建产物

import { rmSync, existsSync } from 'fs'
import { resolve } from 'path'

const root = resolve(__dirname, '..')
const dirs = [
  'apps/*/dist',
  'apps/*/node_modules',
  'packages/*/dist',
  'packages/*/node_modules'
]

console.log('\n🧹 Cleaning build artifacts...\n')

for (const dir of dirs) {
  const fullPath = resolve(root, dir.replace('*', ''))
  if (existsSync(fullPath)) {
    try {
      rmSync(fullPath, { recursive: true, force: true })
      console.log(`Removed: ${fullPath}`)
    } catch (error) {
      console.error(`Failed to remove: ${fullPath}`)
    }
  }
}

console.log('\n✅ Cleanup completed!\n')
```

---

## 11. 类型系统设计

### 11.1 类型导出策略

```typescript
// packages/shared/src/types/index.ts

// 重新导出所有类型
export * from './api'
export * from './file'
export * from './config'
export * from './response'

// 类型守卫
export * from './guards'
```

### 11.2 类型守卫

```typescript
// packages/shared/src/types/guards.ts

import type { ApiResponse, FileInfo, FileCategory } from '../types'

/** 判断是否为成功响应 */
export function isSuccessResponse<T>(res: ApiResponse<T>): res is ApiResponse<T> & { data: T } {
  return res.success === true && 'data' in res
}

/** 判断是否为文件 */
export function isFileInfo(obj: unknown): obj is FileInfo {
  return typeof obj === 'object' && obj !== null && 'id' in obj && 'name' in obj && 'path' in obj
}

/** 判断是否为有效分类 */
export function isFileCategory(value: string): value is FileCategory {
  const categories: FileCategory[] = ['image', 'video', 'audio', 'document', 'code', 'archive', 'executable']
  return categories.includes(value as FileCategory)
}
```

### 11.3 类型扩展

```typescript
// packages/shared/src/types/extensions.ts

// 扩展已有类型

declare global {
  interface Window {
    electronAPI?: ElectronAPI
    __INITIAL_STATE__?: AppState
  }
}

interface ElectronAPI {
  isElectron: boolean
  getAppVersion: () => Promise<string>
  // ... 其他方法
}

interface AppState {
  config: import('./config').AppConfig
  user?: import('./user').User
}
```

---

## 12. API 层设计

### 12.1 ApiClient 接口

```typescript
// apps/web/src/api/client.ts

import type { ApiResponse, PaginatedResponse } from '@super-utils/shared'

/** API 客户端接口 */
export interface ApiClient {
  /** GET 请求 */
  get<T>(path: string, params?: Record<string, string | number | boolean>): Promise<ApiResponse<T>>

  /** POST 请求 */
  post<T>(path: string, data?: unknown): Promise<ApiResponse<T>>

  /** PUT 请求 */
  put<T>(path: string, data?: unknown): Promise<ApiResponse<T>>

  /** DELETE 请求 */
  delete<T>(path: string): Promise<ApiResponse<T>>

  /** 文件上传 */
  upload<T>(path: string, file: File, onProgress?: (progress: number) => void): Promise<ApiResponse<T>>
}
```

### 12.2 HTTP 客户端实现

```typescript
// apps/web/src/api/httpClient.ts

import type { ApiClient } from './client'
import type { ApiResponse } from '@super-utils/shared'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

export class HttpApiClient implements ApiClient {
  private baseURL: string

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL
  }

  private async request<T>(
    method: string,
    path: string,
    options?: {
      params?: Record<string, string | number | boolean>
      body?: unknown
    }
  ): Promise<ApiResponse<T>> {
    let url = `${this.baseURL}${path}`

    // 处理查询参数
    if (options?.params) {
      const searchParams = new URLSearchParams()
      for (const [key, value] of Object.entries(options.params)) {
        if (value !== undefined) {
          searchParams.append(key, String(value))
        }
      }
      const queryString = searchParams.toString()
      if (queryString) {
        url += `?${queryString}`
      }
    }

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...options?.body ? {} : {}
      },
      body: options?.body ? JSON.stringify(options.body) : undefined
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }

  async get<T>(path: string, params?: Record<string, string | number | boolean>): Promise<ApiResponse<T>> {
    return this.request<T>('GET', path, { params })
  }

  async post<T>(path: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>('POST', path, { body: data })
  }

  async put<T>(path: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', path, { body: data })
  }

  async delete<T>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', path)
  }

  async upload<T>(
    path: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<T>> {
    const formData = new FormData()
    formData.append('file', file)

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress((event.loaded / event.total) * 100)
        }
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText))
          } catch {
            reject(new Error('Invalid JSON response'))
          }
        } else {
          reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`))
        }
      }

      xhr.onerror = () => reject(new Error('Network error'))

      xhr.open('POST', `${this.baseURL}${path}`)
      xhr.send(formData)
    })
  }
}

// 导出单例
export const apiClient = new HttpApiClient()
```

### 12.3 IPC 客户端实现

```typescript
// apps/web/src/api/ipcClient.ts

import type { ApiClient } from './client'
import type { ApiResponse } from '@super-utils/shared'

export class IpcApiClient implements ApiClient {
  private get electronAPI() {
    return (window as Window & { electronAPI?: ElectronAPI }).electronAPI
  }

  private async invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
    if (!this.electronAPI?.[channel]) {
      throw new Error(`Electron API channel not found: ${channel}`)
    }
    return this.electronAPI[channel](...args)
  }

  async get<T>(path: string, params?: Record<string, string | number | boolean>): Promise<ApiResponse<T>> {
    // 将 path 映射到对应的 IPC channel
    const channel = this.pathToChannel('GET', path)
    return this.invoke(channel, params)
  }

  async post<T>(path: string, data?: unknown): Promise<ApiResponse<T>> {
    const channel = this.pathToChannel('POST', path)
    return this.invoke(channel, data)
  }

  async put<T>(path: string, data?: unknown): Promise<ApiResponse<T>> {
    const channel = this.pathToChannel('PUT', path)
    return this.invoke(channel, data)
  }

  async delete<T>(path: string): Promise<ApiResponse<T>> {
    const channel = this.pathToChannel('DELETE', path)
    return this.invoke(channel)
  }

  async upload<T>(
    path: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<T>> {
    // IPC 上传实现
    return this.invoke('upload-file', path, file, onProgress)
  }

  private pathToChannel(method: string, path: string): string {
    // 路径到 channel 的映射
    const mappings: Record<string, string> = {
      '/api/files/search': 'search-files',
      '/api/config': 'get-config',
      // ...
    }
    return mappings[path] || 'unknown-api'
  }
}

interface ElectronAPI {
  [key: string]: (...args: unknown[]) => Promise<unknown>
}
```

### 12.4 API 模块使用示例

```typescript
// apps/web/src/api/file.ts

import { apiClient } from './client'
import type { FileInfo, SearchOptions, PaginatedResponse } from '@super-utils/shared'
import type { ApiResponse } from '@super-utils/shared'

/** 文件 API */
export const fileApi = {
  /** 搜索文件 */
  async search(
    query: string,
    page: number,
    pageSize: number,
    options?: SearchOptions
  ): Promise<ApiResponse<PaginatedResponse<FileInfo>>> {
    return apiClient.post('/api/files/search', {
      query,
      page,
      pageSize,
      ...options
    })
  },

  /** 获取分类文件 */
  async getByCategory(
    category: string,
    page: number,
    pageSize: number
  ): Promise<ApiResponse<PaginatedResponse<FileInfo>>> {
    return apiClient.get('/api/files/category', {
      category,
      page,
      pageSize
    })
  },

  /** 获取分类统计 */
  async getCounts(): Promise<ApiResponse<{ categories: { id: string; count: number }[] }>> {
    return apiClient.get('/api/files/counts')
  },

  /** 打开文件 */
  async openFile(filePath: string): Promise<ApiResponse<void>> {
    return apiClient.post('/api/files/open', { filePath })
  },

  /** 删除文件 */
  async deleteFile(filePath: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/api/files/${encodeURIComponent(filePath)}`)
  }
}
```

---

## 13. 构建配置

### 13.1 Vite 配置（Web）

```typescript
// apps/web/vite.config.ts

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@super-utils/shared': resolve(__dirname, '../../packages/shared/src')
    }
  },

  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },

  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-vue': ['vue', 'vue-router', 'pinia'],
          'vendor-vuetify': ['vuetify']
        }
      }
    }
  }
})
```

### 13.2 TypeScript 配置（Server）

```json
// apps/server/tsconfig.json

{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "module": "CommonJS",
    "target": "ES2020",
    "types": ["node"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 13.3 Electron 打包配置

```json
// apps/electron/electron-builder.json

{
  "appId": "com.superutils.app",
  "productName": "SuperUtils",
  "directories": {
    "output": "release"
  },
  "files": [
    "dist/**/*",
    "package.json"
  ],
  "extraResources": [
    {
      "from": "../../apps/server/dist",
      "to": "server"
    }
  ],
  "win": {
    "target": [
      {
        "target": "nsis",
        "arch": ["x64"]
      }
    ]
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true
  }
}
```

---

## 14. 风险与应对

### 14.1 技术风险

| 风险 | 影响 | 概率 | 应对 |
|------|------|------|------|
| 循环依赖 | 构建失败 | 低 | shared 保持纯净，不引入任何运行时依赖 |
| 构建失败 | 项目无法使用 | 中 | 分阶段迁移，每阶段验证 |
| 类型不兼容 | 运行时错误 | 低 | 全量 typecheck |
| 热更新失效 | 开发体验差 | 中 | 验证 pnpm workspace 的硬链接 |

### 14.2 项目风险

| 风险 | 影响 | 概率 | 应对 |
|------|------|------|------|
| 迁移周期长 | 影响其他开发 | 中 | 控制在 1 周内完成 |
| 回滚复杂 | 问题无法修复 | 低 | 使用 git 分支管理 |
| 文档缺失 | 后续维护困难 | 中 | 完整本文档 |

### 14.3 依赖风险

| 风险 | 影响 | 应对 |
|------|------|------|
| pnpm 版本问题 | 安装失败 | 锁定 pnpm 版本 >= 8.0 |
| workspace 缓存 | 构建问题 | 定期清理缓存 |
| 包版本冲突 | 运行时错误 | 使用 `pnpm dedupe` |

---

## 15. 测试策略

### 15.1 单元测试

| 包 | 测试内容 | 工具 |
|------|----------|------|
| `shared` | 类型守卫、工具函数 | Vitest |
| `web` | Composables、Store | Vitest + Vue Test Utils |
| `server` | Service 方法 | Vitest |

### 15.2 集成测试

| 测试 | 说明 | 工具 |
|------|------|------|
| API 测试 | 测试所有 API 端点 | Vitest + Supertest |
| E2E 测试 | 完整用户流程 | Playwright |

### 15.3 测试配置

```json
// vitest.config.ts

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html']
    }
  }
})
```

---

## 16. 部署策略

### 16.1 构建产物

| 包 | 产物 | 部署位置 |
|------|------|----------|
| `shared` | `dist/` | 发布为 npm 包或内嵌 |
| `server` | `dist/` | 独立部署或打包进 Electron |
| `web` | `dist/` | 静态部署 |
| `electron` | `release/` | 打包为安装程序 |

### 16.2 Electron 打包流程

```
┌─────────────────────────────────────────────────────────────┐
│                    Build Process                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. pnpm build (all packages)                             │
│      ├── packages/shared                                   │
│      ├── apps/server                                       │
│      └── apps/web                                          │
│                           │                                │
│                           ▼                                │
│  2. Copy server dist to electron/resources                 │
│                           │                                │
│                           ▼                                │
│  3. electron-builder                                      │
│      └── Creates installer/executable                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 16.3 部署配置

```json
// package.json (根目录)

{
  "scripts": {
    "build": "tsx scripts/build.ts",
    "pack": "pnpm build && electron-builder",
    "pack:dir": "pnpm build && electron-builder --dir"
  }
}
```

---

## 17. 开发规范

### 17.1 代码风格

| 规范 | 说明 |
|------|------|
| 缩进 | 2 空格 |
| 引号 | 单引号（JS/TS）、双引号（Vue template） |
| 分号 | 使用分号 |
| 换行 | LF（Unix 风格） |

### 17.2 Git 规范

| 规范 | 说明 |
|------|------|
| 分支命名 | `feature/`、`fix/`、`refactor/` |
| Commit | 使用 conventional commits |
| PR | PR 需至少 1 人 review |

### 17.3 提交信息格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

**示例：**
```
feat(file-search): 添加分类侧边栏组件

- 新增 CategorySidebar 组件
- 支持 7 种文件分类
- 响应式布局适配

Closes #123
```

### 17.4 导入规范

```typescript
// 1. 外部库
import { ref, computed } from 'vue'
import Vue from 'vue'

// 2. 内部包（shared）
import type { FileInfo } from '@super-utils/shared'

// 3. 相对导入（组件、工具）
import { formatFileSize } from '@/utils/format'
import FileIcon from '@/components/FileIcon/index.tsx'

// 4. 类型导入
import type { Config } from '@/types'
```

---

## 18. FAQ

### Q1: 为什么不直接使用 Nx 或 Turborepo？

**A:** Nx 和 Turborepo 功能强大，但对于当前项目规模可能过度复杂。pnpm workspace 已满足以下需求：
- 统一依赖管理
- 跨包代码共享
- 独立构建
- 增量构建（pnpm 自身优化）

如果未来项目规模增长，可以平滑迁移到 Nx。

### Q2: shared 包可以发布到 npm 吗？

**A:** 可以！只需修改 `packages/shared/package.json`：
```json
{
  "name": "@super-utils/shared",
  "version": "1.0.0",
  "publishConfig": {
    "access": "public"
  }
}
```

### Q3: 如何处理跨平台的路径问题？

**A:** 使用 `path` 模块的跨平台 API：
```typescript
import path from 'path'
// Good: path.join('a', 'b') 自动处理平台差异
// Bad: 'a' + '/' + 'b'
```

### Q4: Electron 的 preload 脚本如何引用 shared？

**A:** preload 脚本独立构建，然后复制到 electron 目录：
```json
// packages/shared/package.json
{
  "scripts": {
    "build": "tsc && cp dist/* ../electron/src/preload/shared/"
  }
}
```

### Q5: 能否在 monorepo 中使用 Vue 的 SFC 单文件组件？

**A:** 可以，但 SFC 不能直接在 shared 包中使用。shared 包只放：
- TypeScript 类型
- 常量
- 纯函数

Vue 组件只能放在 `apps/web/` 中。

### Q6: 如何处理 CSS 变量和主题？

**A:** 建议在 `apps/web/` 中统一管理：
```
apps/web/src/styles/
├── variables.scss    # CSS 变量定义
├── themes/
│   ├── light.scss
│   └── dark.scss
└── index.scss       # 全局样式
```

---

## 附录

### A. 参考资料

| 资源 | 链接 |
|------|------|
| pnpm workspace | https://pnpm.io/workspaces |
| Vite Monorepo | https://vitejs.cn/guide/build.html#multi-page-apps |
| Electron Vite | https://electron-vite.org/ |
| Vue 3 + Monorepo | https://github.com/nicholaslyang/vue3-monorepo |

### B. 术语表

| 术语 | 说明 |
|------|------|
| Monorepo | 单代码库多包管理 |
| Workspace | pnpm 的工作空间概念 |
| Shared | 共享包，包含类型和工具 |
| Apps | 应用层，包含具体业务 |
| Hard Link | 硬链接，pnpm 用于节省磁盘 |

### C. 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| v1.0 | 2026-04-25 | 初始版本 |

---

**文档编制：** AI Assistant
**最后更新：** 2026-04-25
**版本：** v1.0
