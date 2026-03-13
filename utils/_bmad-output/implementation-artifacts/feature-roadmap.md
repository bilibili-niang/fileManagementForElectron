# SuperUtils 功能规划与优化路线图

**文档版本:** 1.0  
**创建时间:** 2026-02-10  
**状态:** 规划中

---

## 📊 当前系统评估

### 已实现功能概览

| 模块 | 功能 | 完成度 | 质量评级 |
|------|------|--------|----------|
| 文件索引 | 多盘符并行索引 | 90% | ⭐⭐⭐⭐ |
| 文件名搜索 | 模糊搜索+过滤 | 85% | ⭐⭐⭐⭐ |
| 内容搜索 | 全文检索 | 75% | ⭐⭐⭐ |
| 文件预览 | 悬停预览+对话框 | 80% | ⭐⭐⭐⭐ |
| 分类浏览 | 按类型查看 | 85% | ⭐⭐⭐⭐ |
| 文件编辑 | Monaco编辑器 | 80% | ⭐⭐⭐⭐ |
| 设置管理 | 索引配置+打开方式 | 75% | ⭐⭐⭐ |

---

## 🎯 第一阶段：核心体验优化（2-3周）

### 1.1 搜索体验升级

#### 1.1.1 搜索建议与自动补全
**目标:** 提供实时的搜索建议

**功能细节:**
- 输入时实时显示建议（防抖 150ms）
- 建议来源：
  - 搜索历史（最近 20 条）
  - 文件名前缀匹配
  - 常用扩展名
- 键盘导航支持（↑↓选择，Enter确认）
- 清除历史按钮

**技术实现:**
```typescript
// 新增 API
GET /api/files/search-suggestions?query=xxx&limit=10

// 返回格式
{
  history: ['pdf', 'document 2024'],
  files: ['document.pdf', 'documentation.txt'],
  extensions: ['pdf', 'docx']
}
```

**UI设计:**
- 下拉面板，分组显示（历史/文件/扩展名）
- 高亮匹配部分
- 鼠标悬停高亮

#### 1.1.2 搜索结果高亮
**目标:** 突出显示匹配的关键词

**功能细节:**
- 文件名匹配部分高亮（黄色背景）
- 内容搜索结果显示匹配片段
- 支持多关键词高亮

**技术实现:**
```typescript
// 后端返回匹配位置
{
  name: "document.pdf",
  nameHighlight: [[0, 4]], // 匹配 "docu"
  contentPreview: "...",
  contentHighlights: [[10, 20]]
}
```

#### 1.1.3 高级搜索语法
**目标:** 支持更精确的搜索

**语法支持:**
| 语法 | 说明 | 示例 |
|------|------|------|
| `keyword` | 基础搜索 | `document` |
| `"phrase"` | 短语搜索 | `"annual report"` |
| `+word` | 必须包含 | `+pdf +2024` |
| `-word` | 排除 | `document -draft` |
| `ext:xxx` | 扩展名过滤 | `report ext:pdf` |
| `size:>10MB` | 大小过滤 | `video size:>100MB` |
| `date:>2024-01` | 日期过滤 | `file date:>2024-01-01` |
| `path:xxx` | 路径过滤 | `config path:src` |

**UI设计:**
- 搜索框下方显示解析后的搜索条件
- 提供语法提示按钮
- 保存常用搜索为快捷方式

### 1.2 性能优化

#### 1.2.1 虚拟滚动实现
**目标:** 解决大数据量列表卡顿

**优化范围:**
- 文件搜索结果列表
- 分类浏览文件列表
- 预览面板中的长文本

**技术方案:**
```vue
<!-- 使用 vue-virtual-scroller -->
<RecycleScroller
  class="file-list"
  :items="results"
  :item-size="48"
  key-field="id"
>
  <template #default="{ item }">
    <FileListItem :file="item" />
  </template>
</RecycleScroller>
```

**预期效果:**
- 支持 10万+ 条记录流畅滚动
- 内存占用降低 80%

#### 1.2.2 图片缩略图生成
**目标:** 加快图片预览速度

**功能细节:**
- 索引时生成缩略图（256x256, 512x512）
- 缩略图存储在数据库或文件系统
- 预览时优先加载缩略图
- 点击后加载原图

**数据库表:**
```sql
CREATE TABLE file_thumbnails (
  id INT AUTO_INCREMENT PRIMARY KEY,
  file_id INT NOT NULL,
  size VARCHAR(20) NOT NULL, -- '256x256', '512x512'
  thumbnail BLOB, -- 或存储路径
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
  UNIQUE KEY unique_thumbnail (file_id, size)
);
```

#### 1.2.3 搜索结果缓存
**目标:** 减少重复查询

**缓存策略:**
- 内存缓存：最近 50 次搜索结果
- 缓存时间：5 分钟
- 缓存键：搜索条件哈希

**实现:**
```typescript
// 使用 LRU 缓存
import LRU from 'lru-cache';

const searchCache = new LRU({
  max: 50,
  ttl: 1000 * 60 * 5 // 5分钟
});
```

### 1.3 预览系统优化

#### 1.3.1 预览面板增强
**目标:** 提升预览体验

**功能细节:**
- 预览面板可调整大小
- 预览面板可固定（不跟随鼠标）
- 预览面板内支持滚动长内容
- 预览面板内支持复制文本
- 预览面板显示文件元数据（大小、修改时间等）

#### 1.3.2 代码预览语法高亮
**目标:** 代码文件预览更美观

**技术方案:**
- 使用 Prism.js 或 highlight.js
- 根据扩展名自动识别语言
- 显示行号
- 支持主题切换

#### 1.3.3 预览历史
**目标:** 快速回到之前预览的文件

**功能细节:**
- 记录最近预览的 20 个文件
- 在预览面板显示历史列表
- 点击历史项快速预览

---

## 🚀 第二阶段：高级功能（3-4周）

### 2.1 全文搜索引擎集成

#### 2.1.1 Meilisearch 集成
**目标:** 替代 MySQL LIKE 搜索，提升性能

**为什么选择 Meilisearch:**
- 轻量级，易于部署
- 支持中文分词
- 实时索引
- 支持拼写容错
- 支持过滤和排序

**实施步骤:**
1. 部署 Meilisearch 服务
2. 创建索引并同步数据
3. 修改搜索 API 调用
4. 添加搜索配置界面

**索引设计:**
```json
{
  "uid": "files",
  "primaryKey": "id",
  "displayedAttributes": ["id", "name", "path", "extension"],
  "searchableAttributes": ["name", "path", "content"],
  "filterableAttributes": ["extension", "size", "modified_time"],
  "sortableAttributes": ["modified_time", "size", "name"]
}
```

#### 2.1.2 拼音搜索支持
**目标:** 支持中文拼音搜索

**实现方案:**
- 使用 pinyin 库生成拼音索引
- 同时索引中文和拼音
- 支持首字母搜索

**示例:**
- 搜索 "wj" 匹配 "文件"
- 搜索 "wenjian" 匹配 "文件"

### 2.2 文件标签系统

#### 2.2.1 标签管理
**目标:** 为文件添加自定义标签

**功能细节:**
- 创建/编辑/删除标签
- 为文件添加多个标签
- 按标签筛选文件
- 标签云展示

**数据库设计:**
```sql
CREATE TABLE tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  color VARCHAR(7) DEFAULT '#1976d2',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE file_tags (
  file_id INT NOT NULL,
  tag_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (file_id, tag_id),
  FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);
```

#### 2.2.2 智能标签建议
**目标:** 基于文件内容自动建议标签

**实现方案:**
- 分析文件路径和名称
- 提取关键词
- 基于历史标签匹配

### 2.3 文件收藏与快捷方式

#### 2.3.1 收藏功能
**目标:** 收藏常用文件/文件夹

**功能细节:**
- 右键收藏/取消收藏
- 收藏夹侧边栏
- 收藏分类（工作/个人/项目等）
- 快速访问收藏

**UI设计:**
- 左侧边栏显示收藏列表
- 支持拖拽排序
- 支持嵌套文件夹

#### 2.3.2 最近访问
**目标:** 快速回到最近打开的文件

**功能细节:**
- 记录最近打开的 50 个文件
- 按时间分组（今天/昨天/本周/更早）
- 支持固定常用项

---

## 🔧 第三阶段：系统优化（2-3周）

### 3.1 架构优化

#### 3.1.1 WebSocket 实时通信
**目标:** 替代轮询，实现实时更新

**应用场景:**
- 索引进度实时推送
- 文件变更通知
- 多窗口同步

**实现:**
```typescript
// 后端
io.on('connection', (socket) => {
  socket.on('subscribe:index-progress', () => {
    // 订阅索引进度
  });
});

// 前端
socket.on('index-progress', (data) => {
  updateProgress(data);
});
```

#### 3.1.2 Redis 缓存层
**目标:** 提升频繁查询性能

**缓存内容:**
- 文件统计信息
- 分类统计
- 搜索结果（短期）
- 热门文件列表

#### 3.1.3 类型定义统一
**目标:** 前后端共享类型定义

**方案:**
- 创建 shared/types 目录
- 使用 TypeScript 项目引用
- 生成 OpenAPI 规范

### 3.2 数据库优化

#### 3.2.1 全文索引
**目标:** 提升内容搜索性能

**MySQL 全文索引:**
```sql
-- 添加全文索引
ALTER TABLE file_contents 
ADD FULLTEXT INDEX ft_content (content) 
WITH PARSER ngram; -- 中文支持

-- 使用全文搜索
SELECT * FROM file_contents 
WHERE MATCH(content) AGAINST('keyword' IN NATURAL LANGUAGE MODE);
```

#### 3.2.2 表分区
**目标:** 支持千万级数据量

**分区策略:**
```sql
-- 按修改时间分区
ALTER TABLE files 
PARTITION BY RANGE (YEAR(modified_time)) (
  PARTITION p2023 VALUES LESS THAN (2024),
  PARTITION p2024 VALUES LESS THAN (2025),
  PARTITION p2025 VALUES LESS THAN (2026),
  PARTITION pfuture VALUES LESS THAN MAXVALUE
);
```

#### 3.2.3 数据归档
**目标:** 清理历史数据

**策略:**
- 自动归档 1 年前的文件记录
- 归档数据存储到单独表
- 支持搜索归档数据（较慢）

### 3.3 安全与稳定性

#### 3.3.1 API 限流
**目标:** 防止滥用

**实现:**
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 每个IP最多100次请求
  message: '请求过于频繁，请稍后再试'
});

app.use('/api/', limiter);
```

#### 3.3.2 文件访问权限检查
**目标:** 防止访问系统敏感文件

**黑名单:**
- Windows 系统目录
- 用户隐私目录
- 配置文件

#### 3.3.3 错误处理完善
**目标:** 统一的错误处理和日志

**实现:**
- 全局错误中间件
- 结构化日志（Winston）
- 错误上报（Sentry）

---

## 🎨 第四阶段：UI/UX 优化（2周）

### 4.1 界面美化

#### 4.1.1 主题系统
**目标:** 支持多种主题

**主题列表:**
- 默认蓝色主题
- 深色主题
- 高对比度主题
- 自定义主题

**实现:**
- Vuetify 主题配置
- CSS 变量
- 主题切换动画

#### 4.1.2 动画效果优化
**目标:** 更流畅的交互体验

**优化点:**
- 页面切换过渡动画
- 列表项加载动画
- 预览面板展开动画
- 搜索结果更新动画

### 4.2 快捷键支持

#### 4.2.1 全局快捷键
**目标:** 键盘快速操作

**快捷键映射:**
| 快捷键 | 功能 |
|--------|------|
| Ctrl+K | 聚焦搜索框 |
| Ctrl+O | 打开选中文件 |
| Ctrl+F | 在结果中搜索 |
| Ctrl+1/2/3 | 切换 Tab |
| Ctrl+R | 刷新索引 |
| Delete | 删除选中（确认后）|
| Ctrl+Shift+P | 命令面板 |

#### 4.2.2 命令面板
**目标:** 快速执行命令

**功能:**
- 显示所有可用命令
- 模糊匹配
- 快捷键提示

### 4.3 响应式优化
**目标:** 适配不同窗口大小

**断点设计:**
- 大屏（>1200px）：完整三栏布局
- 中屏（768-1200px）：双栏布局
- 小屏（<768px）：单栏布局

---

## 📈 性能目标

### 当前性能基准

| 指标 | 当前值 | 目标值 |
|------|--------|--------|
| 索引速度 | ~500 文件/秒 | 1000+ 文件/秒 |
| 搜索响应时间 | 1-3 秒 | <500ms |
| 内存占用 | ~300MB | <500MB |
| 启动时间 | 5 秒 | <3 秒 |
| 大数据列表滚动 | 卡顿（>1000条）| 流畅（10万条）|

### 优化后预期

- **搜索性能提升 5-10 倍**（Meilisearch）
- **内存占用降低 30%**（虚拟滚动）
- **图片预览速度提升 3 倍**（缩略图）
- **首次加载时间减少 50%**（缓存）

---

## 🗓️ 实施计划

### ✅ 第一阶段（已完成）
- [x] 文件索引系统（多盘符并行）
- [x] 文件名搜索（模糊搜索+过滤）
- [x] 文件内容搜索（全文检索）
- [x] 分类浏览（按文件类型）
- [x] 文件预览系统（悬停预览+对话框）
- [x] 文件编辑器（Monaco Editor）
- [x] 右键菜单和打开方式配置
- [x] 设置管理（索引配置）

### 🔄 第二阶段：核心体验优化（进行中）

#### 2.1 预览卡片体验优化（已完成）
**问题反馈：**
- 预览卡片跟随鼠标移动，体验差
- 卡片内容不够精致
- 触发区域过大

**优化方案：**
- [x] **触发区域限制**：只在文件名文字区域 hover 时触发，不在整行触发
- [x] **固定位置显示**：卡片显示在固定位置（文件名右侧 50px），不跟随鼠标
- [x] **编辑器形式预览**：代码文件使用深色主题预览，带语法高亮和行号
- [x] **卡片内可滚动**：鼠标进入卡片后，可以独立滚动预览内容，不影响文件列表
- [x] **平滑显示/隐藏**：添加过渡动画，避免闪烁
- [x] **智能定位**：如果右侧空间不足，自动显示在左侧

#### 2.2 索引排除规则管理（当前重点）
**需求：**
- 当前排除目录是写死的（如 node_modules、C盘等）
- 用户需要灵活配置排除规则
- 支持正则表达式匹配

**优化方案：**
- [ ] **数据库表设计**：创建 `index_exclude_rules` 表存储规则
  - rule_type: 'directory' | 'path_pattern'
  - pattern: 匹配模式（字符串或正则）
  - is_regex: 是否正则表达式
  - is_enabled: 是否启用
  - description: 规则描述
  
- [ ] **后端 API**：
  - GET /api/config/exclude-rules - 获取所有规则
  - POST /api/config/exclude-rules - 添加规则
  - PUT /api/config/exclude-rules/:id - 更新规则
  - DELETE /api/config/exclude-rules/:id - 删除规则
  - POST /api/config/exclude-rules/test - 测试规则

- [ ] **前端界面**：
  - 规则列表展示（启用状态、类型、模式、描述）
  - 添加新规则表单（类型选择、模式输入、描述、正则开关）
  - 规则测试功能（输入路径测试是否匹配）
  - 启用/禁用切换
  - 删除规则

- [ ] **索引逻辑修改**：
  - 索引前加载数据库中的排除规则
  - 支持目录名匹配和路径模式匹配
  - 支持正则表达式匹配
  - 默认包含常用规则（node_modules、.git 等）

**使用示例：**
```
目录规则：
- node_modules → 排除所有 node_modules 目录
- .git → 排除所有 .git 目录

路径模式（正则）：
- \\.log$ → 排除所有 .log 文件
- \\.tmp$ → 排除所有临时文件
- C:\\Windows → 排除 Windows 目录
```

- [ ] 搜索建议与自动补全
- [ ] 搜索结果高亮
- [ ] 虚拟滚动实现
- [ ] 图片缩略图生成
- [ ] 搜索缓存

#### 2.3 UI/UX 优化（新）

**问题反馈：**
1. **自定义标题栏固定问题**：页面往下滑动后，顶部的最小化/最大化/关闭按钮会消失，需要固定标题栏
2. **组件间距过大**：整体样式间距太大，需要减小
3. **文件结构不规范**：组件直接放在 `文件名.vue` 中，需要改为 `文件名/index.vue` + `文件名/index.scss` 的结构

**优化方案：**
- [ ] **固定标题栏**：使用 `position: sticky` 或重新设计布局，确保标题栏始终可见
- [ ] **减小组件间距**：全局调整 padding 和 margin，使界面更紧凑
- [ ] **重构文件结构**：
  - 所有组件改为目录形式：`ComponentName/index.vue` + `ComponentName/index.scss`
  - 统一代码组织方式，提高可维护性

#### 2.4 搜索历史记录功能（新）

**需求：**
- 文件名搜索和文件内容搜索支持历史记录
- 历史记录持久化存储（写入数据库）
- 支持移除单个历史记录
- 支持清空全部历史记录
- 搜索框下拉展示历史记录

**技术实现：**
- [ ] **数据库设计**：
  - 表名：`search_history`
  - 字段：`id`, `type`('filename'|'content'), `keyword`, `created_at`
  - 每个用户/设备保留最近 50 条记录

- [ ] **后端 API**：
  - GET /api/search/history?type=filename - 获取搜索历史
  - POST /api/search/history - 添加搜索记录
  - DELETE /api/search/history/:id - 删除单条记录
  - DELETE /api/search/history?type=filename - 清空某类型历史

- [ ] **前端界面**：
  - 搜索框获得焦点时展示历史下拉列表
  - 每条历史记录显示删除按钮（hover 时显示）
  - 底部提供"清空全部"按钮

---

## 🐛 已知 Bug 清单（待修复）

### Bug 1: Electron IPC API 路径不一致
**问题描述**：Electron main.js 中多个 API 路径错误，导致功能无法正常使用
**影响范围**：
- `/api/index/progress` → 应为 `/api/files/index/progress`
- `/api/search/content` → 应为 `/api/files/search-content`
- `/api/search/content-stats` → 应为 `/api/files/content-stats`
**修复方案**：统一检查并修正所有 API 路径
**优先级**：🔴 高

### Bug 2: Vue 响应式对象 IPC 传递失败
**问题描述**：直接传递 Vue 的响应式代理对象给 Electron IPC 会导致 "An object could not be cloned" 错误
**临时修复**：使用 `JSON.parse(JSON.stringify(obj))` 转换
**长期方案**：在 IPC 通信层统一序列化处理，或定义严格的 DTO 类型
**优先级**：🟡 中

### Bug 3: 索引排除规则功能待验证
**问题描述**：虽然已实现数据库表和前端界面，但 Electron 环境下的完整流程需要测试
**测试项**：
- 规则增删改查
- 规则启用/禁用
- 索引时规则生效
**优先级**：🟡 中

### Bug 4: 预览卡片位置优化
**问题描述**：已修复位置计算逻辑，但需要验证不同屏幕尺寸下的表现
**验证项**：
- 右侧空间不足时自动显示在左侧
- 底部空间不足时向上调整
- 卡片内滚动是否正常
**优先级**：🟢 低

---

### 第三阶段：高级功能（3-4周）

#### 3.1 搜索能力增强
- [ ] Meilisearch 集成（全文搜索引擎）
- [ ] 拼音搜索支持
- [ ] 搜索结果高亮显示
- [ ] 搜索建议与自动补全

#### 3.2 文件组织功能
- [ ] 标签系统（创建/编辑/删除标签）
- [ ] 收藏功能（收藏常用文件/文件夹）
- [ ] 最近访问记录
- [ ] 智能文件夹（自动分类：最近下载、大文件等）

#### 3.3 内容索引优化
- [ ] **改进二进制检测算法**
  - 问题：包含 base64 图片的 Vue 文件可能被误判为二进制
  - 方案：检测时跳过 base64 编码区域
  - 影响：提高 Vue、HTML 等文件的内容索引成功率
  
- [ ] **索引状态查看功能**
  - 显示已索引内容文件数量
  - 显示未索引文件列表及原因（太大、二进制、失败等）
  - 支持手动重新索引指定文件
  
- [ ] **索引失败日志**
  - 记录内容索引失败的文件路径和原因
  - 提供日志查看界面
  - 支持导出日志

### 第四阶段：系统优化（2-3周）
- [ ] WebSocket 实时通信
- [ ] Redis 缓存
- [ ] 数据库全文索引
- [ ] 表分区
- [ ] API 限流

### 第五阶段：UI/UX 优化（2周）
- [ ] 主题系统
- [ ] 动画优化
- [ ] 快捷键支持
- [ ] 命令面板
- [ ] 响应式优化

---

## 💡 创新功能建议

### 1. 智能文件夹
自动将文件分类到虚拟文件夹：
- "最近下载"
- "今天修改"
- "大文件"
- "重复文件"

### 2. 文件关系图谱
可视化展示文件之间的关联：
- 同一项目的文件
- 互相引用的代码文件
- 相似内容的文件

### 3. 自然语言搜索
使用 AI 理解搜索意图：
- "找一下上周的 PDF 文档"
- "显示最大的视频文件"
- "搜索包含 TODO 的代码文件"

### 4. 文件版本历史
记录文件变更历史：
- 自动备份修改的文件
- 查看历史版本
- 恢复到指定版本

---

## 📋 技术债务清单

### 高优先级
- [ ] 统一前后端类型定义
- [ ] 完善错误处理
- [ ] 添加单元测试（覆盖率>60%）
- [ ] 移除硬编码配置

### 中优先级
- [ ] 代码重构（FileSearch 组件拆分）
- [ ] 日志系统完善
- [ ] 性能监控
- [ ] 文档完善

### 低优先级
- [ ] 代码风格统一（ESLint）
- [ ] 注释完善
- [ ] 示例代码
- [ ] 开发者文档

---

## 🎯 成功指标

### 用户满意度
- 搜索响应时间 < 500ms（90% 用户认可）
- 界面流畅度评分 > 4.5/5
- 功能完整性评分 > 4/5

### 技术指标
- 单元测试覆盖率 > 70%
- API 响应成功率 > 99.9%
- 内存泄漏检测通过
- 支持 100万+ 文件索引

---

**文档维护:** 随着功能迭代持续更新  
**审核周期:** 每两周评审一次进度
