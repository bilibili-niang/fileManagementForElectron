# 表格统一替换为 SuperTable 重构计划

## 一、项目背景

目前项目中表格实现方式不统一，存在多套表格方案：
- `SuperTable`（TSX 通用表格组件，基于 v-data-table）
- `PaginationTable`（TSX 分页表格组件）
- 各页面内联的 `v-data-table`（Vue SFC）
- `v-data-table-server`（服务器端分页表格）

本次重构目标：将可替换的页面内联表格统一替换为 `SuperTable`，减少重复代码，统一交互体验。

---

## 二、现状分析

| 页面 | 文件 | 格式 | 表格类型 | 当前行数 | 能否替换 | 优先级 |
|------|------|------|---------|---------|---------|--------|
| 文件共享 | `views/FileShare/index.tsx` | TSX | SuperTable | 1027 | ✅ 已完成 | - |
| 剪贴板历史 | `views/ClipboardHistory/index.vue` | Vue | v-data-table | 506 | ✅ 适合 | P0 |
| 分类浏览 | `views/FileCategory/index.vue` | Vue | v-data-table | 388 | ✅ 适合 | P1 |
| 设置-排除规则 | `views/Settings/index.vue` | Vue | v-data-table | 866(整体) | ⚠️ 部分适合 | P2 |
| 设置-打开方式 | `views/Settings/index.vue` | Vue | v-data-table | 866(整体) | ❌ 不适合 | - |
| 文件搜索 | `views/FileSearch/index.vue` | Vue | v-data-table-server | 1159 | ❌ 太复杂 | - |
| 分页表格组件 | `components/PaginationTable/index.tsx` | TSX | 原生 table | 约 400 | ⚠️ 可废弃 | P3 |

---

## 三、各页面详细分析

### 3.1 剪贴板历史（ClipboardHistory）- P0

**当前表格特征：**
- 列：content（45%）、source（15%）、time（20%）、action（20%）
- content 列根据 type 渲染三种不同内容：
  - text：文本截断显示
  - image：v-img 预览（60x120）
  - files：文件数量 + 文件名列表
- source 列：应用图标 + 来源应用名
- time 列：时钟图标 + 相对时间（刚刚/X分钟前）
- action 列：复制按钮 + 删除按钮
- 行点击：打开预览对话框
- 分页：自定义分页组件（page-first/prev/page-numbers/next/page-last）
- 数据：Pinia store 本地数组，前端分页

**替换方案：**
1. 文件改名：`ClipboardHistory/index.vue` → `index.tsx`
2. 用 SuperTable 替换 v-data-table：
   - `columns`：4 列均使用 `customRender`
   - `actions`：复制 + 删除两个按钮
   - `onRowClick`：打开预览
   - `pagination`：启用内置分页，pageSize=10
   - `data`：直接传入 `displayHistory`（前端分页数据）
3. 保留原有对话框：清空确认、图片预览、文本预览
4. 删除自定义分页组件代码（被 SuperTable 内置分页替代）

**预计减少行数：** 506 → 约 250 行（减少 250 行）

---

### 3.2 分类浏览（FileCategory）- P1

**当前表格特征：**
- 列：name、path、size、created_time、modified_time、accessed_time、attributes
- name 列：FileIcon 组件 + 文件名（带 title tooltip）
- path 列：路径显示（带 tooltip）
- size 列：formatSize 格式化
- 时间列：formatDate 格式化
- attributes 列：隐藏/只读/系统图标 + "正常" chip
- 行点击：打开文件（根据扩展名选择查看器）
- 右键菜单：打开、在资源管理器中打开
- 分页：v-pagination + pageSize select（20/50/100/200/500）
- 数据：API 请求（`searchApi.getFilesByCategory`）

**替换方案：**
1. 文件改名：`FileCategory/index.vue` → `index.tsx`
2. 用 SuperTable 替换 v-data-table：
   - `columns`：7 列均使用 `customRender`
   - `actions`：无（操作通过行点击和右键菜单完成）
   - `onRowClick`：打开文件
   - `pagination`：启用内置分页，pageSize 可选 [20,50,100,200,500]
   - `requestUrl`：使用 `/api/files/category` 自动请求
   - 或手动传入 items + items-length
3. 右键菜单：保留原有实现，绑定到 SuperTable 的行上
4. 左侧 CategoryList 侧边栏：保留

**难点：**
- 右键菜单需要绑定到 SuperTable 的行元素上，可能需要暴露 row ref
- 或者改用 SuperTable 的 `onRowClick` + 右键事件处理

**预计减少行数：** 388 → 约 200 行（减少 188 行）

---

### 3.3 设置-排除规则表（Settings）- P2

**当前表格特征（第 13-64 行）：**
- 列：is_enabled（checkbox）、rule_type（chip）、pattern、description、is_regex（chip）、actions（删除按钮）
- is_enabled 列：v-checkbox，切换时调用 updateExcludeRule
- rule_type 列：目录/路径模式 chip
- is_regex 列：正则/普通 chip
- actions 列：单个删除按钮
- 数据：本地数组 excludeRules（通过 API 加载）
- 无分页

**替换方案：**
1. 不需要改文件格式（Settings 页面主体不是表格）
2. 在 .vue 文件中通过 `<component :is="ExcludeRuleTable" />` 引入 TSX 子组件
3. 新建 `components/ExcludeRuleTable/index.tsx`，内部使用 SuperTable
4. 或：直接在 Settings/index.vue 中使用 SuperTable（如果在 .vue 中能正确传递 JSX 函数）

**难点：**
- is_enabled 列是 checkbox，SuperTable 的 customRender 返回 VNode，可以渲染 v-checkbox
- 但 checkbox 的 @update:model-value 事件需要修改原数组，需要确认 SuperTable 是否支持可变数据

**预计减少行数：** 该表格区域约 50 行 → 约 20 行（减少 30 行）

---

### 3.4 设置-文件打开方式配置表（Settings）- 不建议替换

**当前表格特征（第 338-388 行）：**
- 在 v-dialog 对话框内
- actions 列包含两个 v-select（打开方式、查看器选择）
- 这不是简单的操作按钮，而是表单控件

**不建议替换原因：**
- SuperTable 的 actions 只支持图标按钮，不支持复杂表单控件
- 强行替换会导致代码更复杂

---

### 3.5 文件搜索（FileSearch）- 不建议替换

**当前表格特征：**
- 使用 v-data-table-server（服务器端分页）
- 有复杂的高级筛选、行内预览、选中状态
- 与 SuperTable 的功能差异较大

**不建议替换原因：**
- 改动风险大
- v-data-table-server 的功能 SuperTable 尚未完全支持

---

### 3.6 PaginationTable 组件 - P3

**当前状态：**
- 独立的通用分页表格组件（TSX）
- 使用原生 `<table>` 标签
- 功能较简单

**处理方案：**
- 如果 ClipboardHistory 和 FileCategory 都改用 SuperTable，PaginationTable 可能不再被使用
- 检查是否有其他页面使用 PaginationTable
- 如无使用，可标记为废弃

---

## 四、重构方案

### 4.1 技术方案

**核心思路：.vue → .tsx**

由于 SuperTable 的 API 基于 JSX（customRender、actions 需要传入 VNode 函数），在 .vue 的 template 中无法直接使用。因此将目标页面从 .vue 改为 .tsx。

**具体步骤：**
1. 新建 `index.tsx`，复制 .vue 的 `<script setup>` 逻辑
2. 将 template 中的 HTML 转为 JSX
3. 用 SuperTable 替换 v-data-table
4. 删除旧的 `index.vue` 和 `index.scss`（如果样式简单可内联）
5. 更新路由/App.vue 中的引用

### 4.2 SuperTable 适配

需要确认/增强 SuperTable 的能力：

| 功能 | 当前支持 | 需要增强 |
|------|---------|---------|
| customRender 返回 VNode | ✅ | - |
| actions 图标按钮 | ✅ | - |
| onRowClick | ✅ | - |
| 分页 | ✅ | - |
| 右键菜单支持 | ❌ | 需要暴露行元素或事件 |
| 前端分页（本地数组） | ⚠️ | 需确认 dataRef 是否支持本地数据 |

---

## 五、执行计划

### 阶段一：ClipboardHistory（预计 2-3 小时）
1. 新建 `ClipboardHistory/index.tsx`
2. 迁移 script 逻辑到 setup 函数
3. 用 SuperTable 配置 columns + actions + onRowClick + pagination
4. 保留预览对话框（图片预览、文本预览）
5. 删除自定义分页代码
6. 删除旧 `index.vue`
7. 验证编译 + 功能测试

### 阶段二：FileCategory（预计 3-4 小时）
1. 新建 `FileCategory/index.tsx`
2. 迁移 script 逻辑
3. 用 SuperTable 配置 7 列 + onRowClick + pagination
4. 保留右键菜单（需要适配）
5. 删除旧 `index.vue` 和 `index.scss`
6. 验证编译 + 功能测试

### 阶段三：Settings 排除规则表（预计 1-2 小时）
1. 新建 `components/ExcludeRuleTable/index.tsx`
2. 抽取排除规则表格逻辑到独立组件
3. 在 Settings/index.vue 中引入使用
4. 验证编译 + 功能测试

### 阶段四：PaginationTable 废弃检查（预计 0.5 小时）
1. 全局搜索 PaginationTable 引用
2. 如无引用，删除组件
3. 如有引用，评估是否替换

---

## 六、风险与注意事项

1. **右键菜单**：FileCategory 的右键菜单依赖 v-menu + activator，在 TSX 中实现方式不同
2. **样式迁移**：.vue 的 scoped style 需要转为 index.scss 或内联 style
3. **类型定义**：.vue 文件中的 interface 需要正确迁移到 .tsx
4. **inject 注入**：.vue 中使用 inject 获取的全局方法（showSnackbar、openImagePreview 等），在 .tsx 中需要确保 provide/inject 正常工作
5. **Pinia store**：ClipboardHistory 使用 computed 绑定 store，.tsx 中 ref/computed 行为一致

---

## 七、预计收益

| 项目 | 当前总行数 | 重构后预计 | 减少 |
|------|-----------|-----------|------|
| ClipboardHistory | 506 | 250 | 256 |
| FileCategory | 388 | 200 | 188 |
| Settings 排除规则 | 50 | 20 | 30 |
| **合计** | **944** | **470** | **474** |

---

## 八、建议优先级

1. **先做 ClipboardHistory**（最简单，风险最低，收益明确）
2. **再做 FileCategory**（较复杂，但有 ClipboardHistory 经验后更稳）
3. **Settings 排除规则表可选**（改动量小，收益也小）
4. **PaginationTable 最后检查**

---

> 文档生成时间：2026-04-28  
> 作者：Kimi Code CLI
