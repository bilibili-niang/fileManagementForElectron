---
title: 'Electron 文件管理工具'
slug: 'electron-file-manager-tool'
created: '2026-02-06'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['Electron', 'Vue 3', 'TypeScript', 'Vuetify', 'Pinia', 'MySQL', 'TypeORM', 'Vite']
files_to_modify: ['package.json', 'vite.config.ts', 'tsconfig.json', 'electron/main.ts', 'electron/preload.ts', 'src/main.ts', 'src/App.vue', 'src/stores/index.ts', 'src/components/DatabaseConfigDialog.vue', 'src/components/FileSearch.vue', 'src/components/FileCategory.vue', 'src/services/database.ts', 'src/services/indexer.ts', 'src/services/search.ts']
code_patterns: ['Vue 3 Composition API', 'Pinia stores', 'TypeScript strict mode', 'Electron IPC communication', 'TypeORM entities and repositories', 'Worker threads for parallel processing']
test_patterns: ['Vitest for unit tests', 'Electron testing for IPC', 'Integration tests for database operations']
---

# 技术规格：Electron 文件管理工具

**创建时间：** 2026-02-06

## 概述

### 问题陈述

需要构建一个跨平台的桌面文件管理工具，能够高效搜索和管理电脑上的所有文件。作为个人开发者的工具，参考 Everything 的搜索体验，用户需要快速定位文件，支持按文件名搜索和按文件类型分类搜索，同时需要友好的用户界面和流畅的动画效果。

### 解决方案

使用 Electron + Vue 3 + TypeScript 构建跨平台文件管理工具，采用 Vuetify 作为 UI 库提供优美的 Material Design 动画效果。文件索引在主进程中进行，使用 worker_threads 多核优化，通过 IPC 通信向渲染进程传递进度，使用 MySQL + TypeORM 存储索引数据以支持增量更新。首次启动时引导用户配置数据库连接，支持定时重新索引。

### 范围

**包含范围：**
- Electron + Vue 3 + TSX 项目初始化
- Vuetify UI 集成和主题配置
- Tab 切换页面架构（文件搜索、分类浏览）
- 首次启动数据库配置弹窗（端口、账号、密码，持久化存储）
- 文件索引系统（主进程，worker_threads 多核优化，进度条显示）
- 索引范围：排除 C 盘和所有 node_modules 目录
- 文件名搜索功能（实时搜索，防抖处理，分页显示）
- 文件分类搜索功能（按扩展名分组）
- 增量索引（MySQL + TypeORM，记录文件修改时间）
- 定时重新索引（使用 node-cron）
- 索引进度可视化（线性进度条 + 当前路径）
- 统一异常处理机制

**已实现功能（超出原计划）：**
- ✅ 文件内容搜索（全文检索）
- ✅ 文件预览功能（鼠标悬停预览）
- ✅ 文件编辑器（内置文本编辑器）
- ✅ 图片预览（支持常见格式）
- ✅ 视频/音频播放（内置播放器）
- ✅ PDF 预览
- ✅ Office 文档预览（DOCX、XLSX、PPTX）
- ✅ 右键菜单（打开文件、在资源管理器中显示）
- ✅ 文件打开方式配置（自定义程序打开）

**不包含范围：**
- 文件移动/整理功能（仅索引，不移动）
- 云存储集成

## 开发上下文

### 代码库模式

**全新项目** - 这是一个新项目，没有遗留约束。项目代码将放在 `e:\superUtils` 目录下。

### 参考文件

| 文件 | 用途 |
| ---- | ------- |
| 无 | 新项目 - 无现有文件 |

### 技术决策

**UI 框架：** Vuetify（Material Design，优秀的动画效果）
**状态管理：** Pinia（Vue 3 官方推荐）
**文件遍历：** fast-glob（高性能）
**多核优化：** worker_threads（每个盘符并行索引）
**索引存储：** MySQL + TypeORM（持久化缓存用于增量索引，个人项目）
**进度通信：** Electron IPC（主进程到渲染进程）
**定时任务：** node-cron（定期重新索引）
**构建工具：** Vite（快速开发体验）
**TypeScript：** 完整 TSX 支持以提供类型安全
**索引排除：** C 盘 + 所有 node_modules 目录
**配置存储：** 应用根目录下的 JSON 文件（userData 路径）

**项目结构：**
```
e:\superUtils\
├── electron/                      # Electron 主进程
│   ├── main.ts                   # 主进程入口
│   ├── preload.ts                # 预加载脚本
│   └── services/                 # 主进程服务
│       └── fileService.ts        # 文件操作服务
├── server/                        # 后端服务
│   ├── src/
│   │   ├── index.ts              # 服务器入口
│   │   ├── routes/               # API 路由
│   │   │   ├── files.ts          # 文件相关 API
│   │   │   └── config.ts         # 配置 API
│   │   └── services/             # 业务服务
│   │       ├── fileService.ts    # 文件服务
│   │       ├── contentIndexer.ts # 内容索引服务
│   │       └── database.ts       # 数据库服务
│   └── package.json
├── src/                           # Vue 前端
│   ├── main.ts                   # 应用入口
│   ├── App.vue                   # 根组件
│   ├── constants/                # 常量定义
│   │   └── dialog.ts             # 对话框宽度常量
│   ├── stores/                   # Pinia 状态管理
│   │   └── config.ts             # 配置存储
│   ├── components/               # 组件
│   │   ├── DatabaseConfigDialog.vue
│   │   ├── FileEditorDialog.vue  # 文件编辑器
│   │   ├── PdfPreviewDialog.vue  # PDF 预览
│   │   ├── ImagePreviewDialog.vue
│   │   ├── DocxPreviewDialog.vue
│   │   ├── MediaPlayerDialog.vue
│   │   ├── FileIcon/             # 文件图标组件
│   │   └── ConfirmDialog.vue
│   ├── views/                    # 页面视图
│   │   ├── FileSearch/           # 文件搜索
│   │   │   ├── index.vue
│   │   │   └── index.scss
│   │   ├── FileCategory/         # 分类浏览
│   │   │   └── index.vue
│   │   └── Settings/             # 设置页面
│   │       └── index.vue
│   └── services/                 # 前端服务
│       └── api.ts                # API 封装
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## 实施计划

### 任务

**任务 1：项目初始化（P0）**
- 文件：`package.json`, `vite.config.ts`, `tsconfig.json`, `electron/main.ts`, `electron/preload.ts`, `src/main.ts`, `src/App.vue`
- 操作：
  - 创建 package.json，安装依赖（electron, vue, vuetify, typescript, pinia, fast-glob, mysql2, typeorm, node-cron, vite, @vitejs/plugin-vue）
  - 配置 Vite + Vue 3 + TypeScript
  - 配置 Vuetify UI 框架和主题
  - 设置 Electron 主进程和预加载脚本
  - 创建 Vue 应用入口和根组件

**任务 2：数据库服务（P0）**
- 文件：`src/services/database.ts`, `src/stores/index.ts`
- 操作：
  - 创建 TypeORM 实体（FileIndex：id, path, name, extension, size, modified_time, indexed_time）
  - 实现数据库连接管理（MySQL 连接池，配置：最大连接数 10，连接超时 30 秒）
  - 实现配置文件读写（JSON 格式，存储在 userData 路径）
  - 实现数据库初始化和迁移
  - 实现配置验证（端口范围 1-65535，用户名非空，密码非空）

**任务 3：文件索引服务（P0）**
- 文件：`src/services/indexer.ts`, `electron/indexer-worker.ts`
- 操作：
  - 实现文件遍历逻辑（fast-glob，排除 C 盘和所有 node_modules 目录）
  - 实现 Worker 线程并行处理（每个盘符分配一个 Worker）
  - 实现增量索引逻辑（对比文件修改时间，清理已删除文件的记录）
  - 实现进度报告（IPC 通信，主进程汇总进度）
  - 实现定时重新索引（node-cron）
  - 实现并发索引冲突处理（检查是否已有索引任务在运行）

**任务 4：搜索服务（P0）**
- 文件：`src/services/search.ts`
- 操作：
  - 实现文件名搜索（SQL LIKE 查询，使用数据库索引优化，防抖处理 300ms）
  - 实现分类查询（按扩展名分组）
  - 实现分页逻辑（每页 50 条记录，计算总页数，处理边界情况）
  - 实现排序功能（按文件名、修改时间、文件大小排序）

**任务 5：Vue 组件（P0）**
- 文件：`src/components/DatabaseConfigDialog.vue`, `src/components/FileSearch.vue`, `src/components/FileCategory.vue`
- 操作：
  - 数据库配置弹窗（表单验证，测试连接按钮）
  - 文件搜索页面（搜索框 + 结果列表 + 分页）
  - 分类浏览页面（分类树 + 文件列表）
  - Tab 切换页面架构

**任务 6：集成测试（P1）**
- 文件：`tests/**/*.test.ts`
- 操作：
  - 单元测试（Vitest 测试各个服务）
  - 集成测试（Electron IPC 通信测试）
  - E2E 测试（完整的索引和搜索流程）

### 验收标准

**AC 1：项目初始化**
- Given 项目已初始化，when 运行 `npm run dev`，then 应用正常启动并显示主窗口

**AC 2：数据库配置**
- Given 用户首次启动应用，when 填写数据库配置（端口、账号、密码），then 配置保存到 JSON 文件
- Given 用户点击测试连接按钮，when 数据库连接成功，then 显示成功提示

**AC 3：文件索引**
- Given 用户启动索引，when 索引完成，then 所有文件（排除 C 盘和 node_modules）存储到数据库
- Given 索引进行中，when 查看进度条，then 显示当前扫描路径和整体进度

**AC 4：文件搜索**
- Given 用户输入搜索关键词，when 搜索完成，then 显示匹配的文件列表（分页，每页 50 条）
- Given 用户点击搜索结果，when 打开文件，then 使用系统默认程序打开

**AC 5：分类查询**
- Given 用户选择分类（如图片），when 查询完成，then 显示该分类的所有文件

**AC 6：定时索引**
- Given 定时任务已配置（如每天凌晨 2 点），when 到达指定时间，then 自动重新索引

**AC 7：异常处理**
- Given 数据库连接失败，when 发生错误，then 显示错误提示并提供重试按钮
- Given 文件访问权限错误，when 发生错误，then 跳过该文件并记录日志

## 附加上下文

### 依赖项

- electron
- vue
- vuetify
- typescript
- pinia
- fast-glob
- mysql2
- typeorm
- node-cron
- vite
- @vitejs/plugin-vue

### 测试策略

**单元测试（Vitest）**
- 测试数据库服务（连接、查询、插入）
- 测试文件索引服务（遍历、过滤、增量逻辑）
- 测试搜索服务（搜索、分类、分页）
- 测试 Pinia stores（状态管理）

**集成测试（Electron）**
- 测试 IPC 通信（主进程 ↔ 渲染进程）
- 测试 Worker 线程通信
- 测试数据库操作（TypeORM）

**E2E 测试**
- 测试完整的索引流程（配置 → 索引 → 完成）
- 测试完整的搜索流程（搜索 → 结果 → 打开）
- 测试异常处理（连接失败、权限错误）

### 备注

**数据库表结构（TypeORM 实体）：**
```typescript
@Entity('file_index')
export class FileIndex {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 1024 })
  path: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  extension: string;

  @Column({ type: 'bigint' })
  size: number;

  @Column({ type: 'datetime' })
  modified_time: Date;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  indexed_time: Date;

  @Index()
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Index()
  @Column({ type: 'varchar', length: 50, nullable: true })
  extension: string;
}
```

**配置文件格式（JSON）：**
```json
{
  "mysql": {
    "host": "localhost",
    "port": 3306,
    "username": "root",
    "password": "encrypted_password",
    "database": "file_manager"
  },
  "indexing": {
    "excludeC": true,
    "excludeNodeModules": true,
    "lastIndexed": "2026-02-06T10:00:00Z",
    "schedule": "0 2 * * *"
  }
}
```

**IPC 通信协议：**
```typescript
// 主进程 → 渲染进程
interface IndexProgressMessage {
  type: 'index-progress';
  drive: string;
  progress: number; // 0-1
  currentPath: string;
}

interface IndexCompleteMessage {
  type: 'index-complete';
  totalFiles: number;
  duration: number;
}

interface ErrorMessage {
  type: 'error';
  message: string;
  context: string;
}

// 渲染进程 → 主进程
interface StartIndexMessage {
  type: 'start-index';
  drives: string[];
}

interface StopIndexMessage {
  type: 'stop-index';
}

interface SearchMessage {
  type: 'search';
  query: string;
  page: number;
  pageSize: number;
}

// 主进程 → Worker 线程
interface WorkerTaskMessage {
  type: 'index-drive';
  drive: string;
  excludePatterns: string[];
  lastIndexedTime?: Date;
}

// Worker 线程 → 主进程
interface WorkerProgressMessage {
  type: 'progress';
  drive: string;
  progress: number;
  currentPath: string;
  filesIndexed: number;
}

interface WorkerCompleteMessage {
  type: 'complete';
  drive: string;
  totalFiles: number;
  duration: number;
}

interface WorkerErrorMessage {
  type: 'error';
  drive: string;
  error: string;
}
```

**文件分类规则：**
```typescript
const FILE_CATEGORIES = {
  images: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'bmp', 'webp'],
  documents: ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'xls', 'xlsx', 'ppt', 'pptx'],
  code: ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'h', 'cs', 'go', 'rs', 'php', 'rb', 'swift', 'kt'],
  videos: ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'],
  audio: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma'],
  archives: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'],
  executables: ['exe', 'msi', 'app', 'dmg', 'deb', 'rpm']
};

/**
 * 获取文件分类
 * @param filename 文件名
 * @returns 分类名称，如果没有匹配则返回 'other'
 */
function getFileCategory(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (!ext) return 'other';

  for (const [category, extensions] of Object.entries(FILE_CATEGORIES)) {
    if (extensions.includes(ext)) {
      return category;
    }
  }

  return 'other';
}

/**
 * 处理多个扩展名（如 .tar.gz）
 * @param filename 文件名
 * @returns 主要扩展名
 */
function getMainExtension(filename: string): string {
  const parts = filename.split('.');
  if (parts.length < 2) return '';

  // 特殊处理常见的多扩展名
  const multiExtMap: Record<string, string> = {
    'tar.gz': 'gz',
    'tar.bz2': 'bz2',
    'tar.xz': 'xz'
  };

  const lastTwo = parts.slice(-2).join('.');
  if (multiExtMap[lastTwo]) {
    return multiExtMap[lastTwo];
  }

  return parts.pop() || '';
}
```

**用户界面设计：**

**主窗口布局：**
```
┌─────────────────────────────────────────────────────────────┐
│  文件管理工具                              [最小化] [关闭] │
├─────────────────────────────────────────────────────────────┤
│  [文件搜索] [分类浏览] [设置]                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [搜索框]                                    [搜索按钮]   │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 文件名        │ 路径              │ 大小    │ 修改时间 │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ example.txt   │ D:\Documents      │ 1.2 KB  │ 2026-02-06│   │
│  │ photo.jpg    │ D:\Pictures       │ 3.5 MB  │ 2026-02-05│   │
│  │ ...          │ ...               │ ...      │ ...       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                             │
│  [上一页] 第 1/10 页 [下一页]                              │
│                                                             │
│  索引状态: [████████░░] 80% - 正在索引 D:\Projects       │
└─────────────────────────────────────────────────────────────┘
```

**数据库配置弹窗：**
```
┌─────────────────────────────────────────────────────────────┐
│  数据库配置                                    [×]       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  主机: [localhost________________________]                   │
│                                                             │
│  端口: [3306________________________]                       │
│                                                             │
│  用户名: [root________________________]                       │
│                                                             │
│  密码: [••••••••••••••••••••••••••••••••••••••]   │
│                                                             │
│  数据库: [file_manager________________]                       │
│                                                             │
│  [测试连接] [保存] [取消]                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**分类浏览页面：**
```
┌─────────────────────────────────────────────────────────────┐
│  文件管理工具                              [最小化] [关闭] │
├─────────────────────────────────────────────────────────────┤
│  [文件搜索] [分类浏览] [设置]                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  分类树              │  文件列表                           │
│  ┌───────────────┐  │  ┌─────────────────────────────┐   │
│  │ 📁 图片 (123) │  │  │ 文件名        │ 大小    │   │
│  │ 📁 文档 (456) │  │  ├─────────────────────────────┤   │
│  │ 📁 代码 (789) │  │  │ photo.jpg    │ 3.5 MB  │   │
│  │ 📁 视频 (234) │  │  │ image.png    │ 2.1 MB  │   │
│  │ 📁 音频 (567) │  │  │ ...          │ ...      │   │
│  │ 📁 压缩包 (89)│  │  └─────────────────────────────┘   │
│  │ 📁 可执行 (12) │  │                                   │
│  │ 📁 其他 (345) │  │                                   │
│  └───────────────┘  │                                   │
│                     │                                   │
└─────────────────────────────────────────────────────────────┘
```

**设置页面：**
```
┌─────────────────────────────────────────────────────────────┐
│  设置                                          [×]       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  索引设置:                                                │
│  ☑ 排除 C 盘                                              │
│  ☑ 排除 node_modules 目录                                   │
│                                                             │
│  定时索引:                                                 │
│  ☑ 启用定时索引                                           │
│  [每天凌晨 2 点 ▼]                                         │
│                                                             │
│  数据库配置:                                                │
│  [修改数据库配置...]                                         │
│                                                             │
│  [保存] [取消]                                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**颜色方案（Vuetify 主题）：**
- 主色：#1976D2（蓝色）
- 次要色：#424242（深灰色）
- 背景色：#F5F5F5（浅灰色）
- 文本色：#212121（深灰色）
- 成功色：#4CAF50（绿色）
- 错误色：#F44336（红色）
- 警告色：#FF9800（橙色）

**字体：**
- 系统默认字体（Windows：Microsoft YaHei UI）
- 代码字体：Consolas 或 Monaco

**动画效果：**
- 页面切换：淡入淡出（300ms）
- 搜索结果加载：从上到下依次显示（100ms 间隔）
- 进度条：平滑过渡（200ms）
- 按钮悬停：轻微放大（1.05 倍，150ms）

**风险和注意事项：**
- Worker 线程崩溃时需要自动重启
- 大量文件索引时需要优化内存使用
- 数据库连接失败需要提供友好的错误提示
- 文件访问权限错误需要跳过并记录日志
- 定时索引需要支持暂停和取消

**错误处理策略：**
- 数据库连接失败：显示错误提示，提供重试按钮，记录错误日志
- 文件访问权限错误：跳过该文件，记录警告日志，继续索引
- Worker 线程崩溃：自动重启 Worker，记录错误日志，通知用户
- 磁盘空间不足：停止索引，显示错误提示，记录错误日志
- 网络问题（MySQL 连接）：显示错误提示，提供重试按钮，记录错误日志
- 配置文件损坏：使用默认配置，显示警告提示，记录错误日志

**日志策略：**
- 日志级别：DEBUG（开发环境）、INFO（生产环境）、WARN（警告）、ERROR（错误）
- 日志存储：`logs/` 目录（应用根目录）
- 日志轮转：每天一个文件，保留最近 7 天的日志
- 日志格式：`[时间] [级别] [上下文] 消息`
- 日志示例：
  ```
  [2026-02-06 10:00:00] [INFO] [Indexer] 开始索引 D: 盘
  [2026-02-06 10:00:01] [WARN] [Indexer] 跳过无权限文件: D:\System Volume Information\file.txt
  [2026-02-06 10:00:02] [ERROR] [Database] 数据库连接失败: Connection refused
  ```

**测试覆盖率目标：**
- 单元测试覆盖率：≥ 80%
- 集成测试覆盖率：≥ 60%
- E2E 测试覆盖率：核心流程 100%

**部署和打包方案：**
- 使用 electron-builder 打包应用
- 支持 Windows（NSIS 安装包）
- 打包命令：`npm run build`
- 输出目录：`dist/`

**性能基准：**
- 索引速度：≥ 1000 文件/秒（SSD）
- 搜索响应时间：≤ 500ms（100 万条记录）
- 内存使用：≤ 500MB（索引中）
- 启动时间：≤ 3 秒

**性能优化：**
- 使用数据库索引（path、name、extension）加速查询
- 搜索结果使用虚拟滚动避免大量 DOM
- Worker 线程并行处理提高索引速度
- 增量索引避免重复扫描

**已实现的高级功能：**

### 鼠标悬停预览系统
- **触发方式**：鼠标悬停在文件列表项上 200ms 后显示
- **位置**：鼠标右侧 50px，自动调整避免超出屏幕
- **交互**：鼠标可移入预览面板，不会消失
- **支持类型**：
  - 图片：jpg, png, gif, svg 等（直接显示）
  - 视频/音频：mp4, mp3 等（带播放控制）
  - 文本/代码：js, vue, py 等（显示前 30 行）
  - PDF：显示图标和信息
  - Office：docx, xlsx, pptx（显示类型图标）
  - 其他：显示文件基本信息

### 文件内容搜索
- 支持全文检索（代码、文档、配置文件）
- 显示匹配数量和预览片段
- 索引状态实时显示

### 内置文件编辑器
- 支持文本文件编辑
- 语法高亮
- 自动保存

### 文件打开方式配置
- 支持自定义程序打开文件
- 按扩展名配置
- 支持内部查看器

**未来考虑（不在当前范围）：**
- 文件移动/整理功能
- 文件标签系统
- 文件收藏功能
