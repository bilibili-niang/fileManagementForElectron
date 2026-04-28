# SuperTable 搜索功能增强规划文档

## 1. 背景与现状

### 1.1 当前问题
- 搜索表单固定在表格上方，与标题栏分离
- 搜索字段布局简单，只能横向排列
- 搜索按钮样式固定，无法自定义
- 搜索和工具栏按钮分散在不同区域

### 1.2 目标
将搜索功能与标题栏整合，提供更灵活的布局配置能力。

---

## 2. 功能需求

### 2.1 搜索位置配置

#### 2.1.1 `search.position` 配置项
```typescript
interface SearchConfig {
  position: 'header' | 'toolbar' | 'default'  // 搜索表单位置
  // 'header' - 标题栏下方（当前默认）
  // 'toolbar' - 标题栏右侧，与工具栏按钮同行
  // 'default' - 保持当前行为
}
```

#### 2.1.2 视觉效果
- **header 模式**: 搜索表单在标题栏下方，独占一行
- **toolbar 模式**: 搜索表单在标题栏右侧，与工具栏按钮在同一行

---

### 2.2 搜索布局配置

#### 2.2.1 `search.layout` 配置项
```typescript
interface SearchConfig {
  layout: 'inline' | 'compact' | 'custom'
  // 'inline' - 横向排列（当前默认）
  // 'compact' - 紧凑模式，搜索框 + 下拉筛选 + 按钮
  // 'custom' - 使用自定义渲染
}
```

#### 2.2.2 紧凑模式设计
```
┌─────────────────────────────────────────────────────────┐
│ 标题                    [搜索框🔍][筛选▼][搜索][重置][刷新] │
└─────────────────────────────────────────────────────────┘
```

- 搜索框：主搜索输入，带图标
- 筛选下拉：点击展开更多筛选条件
- 搜索按钮：主操作按钮
- 重置按钮：清空搜索条件
- 工具栏按钮：刷新等其他操作

---

### 2.3 搜索字段增强

#### 2.3.1 字段类型扩展
```typescript
interface SearchField {
  key: string
  label: string
  type: 'input' | 'select' | 'date' | 'number' | 'range' | 'boolean' | 'custom'

  // 新增配置
  showInCompact?: boolean      // 是否在紧凑模式显示
  compactWidth?: string        // 紧凑模式宽度
  compactStyle?: 'full' | 'icon' | 'chip' | 'text'  // 紧凑模式展示样式
  fullWidth?: boolean          // 是否占满一行
  advanced?: boolean           // 是否为高级筛选（收起状态隐藏）

  // 自定义渲染
  customRender?: (props: {
    value: any
    onChange: (value: any) => void
    mode: 'default' | 'compact'  // 当前渲染模式
  }) => VNode
}
```

#### 2.3.2 不同字段类型在紧凑模式下的表现

| 字段类型 | 默认模式 | 紧凑模式 (compactStyle) | 说明 |
|---------|---------|------------------------|------|
| **input** | 完整输入框 | `full`: 简化输入框<br>`icon`: 图标按钮点击展开<br>`text`: 文本按钮 | 主搜索通常用 `full` |
| **select** | 完整下拉框 | `full`: 简化下拉<br>`icon`: 筛选图标+徽章<br>`chip`: 小尺寸选择器 | 单选用 `chip` |
| **date** | 日期选择器 | `full`: 简化日期框<br>`icon`: 日历图标<br>`text`: "日期"文本按钮 | 范围日期用 `icon` |
| **number** | 数字输入框 | `full`: 简化数字框<br>`icon`: 数字范围图标 | 范围数字用 `icon` |
| **range** | 双输入框 | `full`: 简化范围框<br>`icon`: 范围图标+徽章 | 始终建议用 `icon` |
| **boolean** | 复选框 | `icon`: 开关图标<br>`chip`: 切换按钮<br>`text`: 文本标签 | 常用 `chip` 或 `icon` |
| **custom** | 自定义渲染 | 由 customRender 的 mode 参数决定 | 完全自定义 |

#### 2.3.3 紧凑模式样式详解

**compactStyle = 'full'（简化完整）**
```
[input       ] [select ▼] [🔍搜索]
```
- 保留表单元素，但尺寸更小
- 占位符简化或隐藏 label
- 适合 1-2 个主要筛选条件

**compactStyle = 'icon'（图标按钮）**
```
[🔍搜索...    ] [⚙️] [📅] [🔘] [搜索]
```
- 显示为图标按钮
- 点击后展开弹窗/下拉进行筛选
- 有值时显示徽章标记
- 适合多个筛选条件

**compactStyle = 'chip'（标签样式）**
```
[🔍搜索...    ] [类型▼] [状态●] [搜索]
```
- 显示为小尺寸选择器/开关
- 直接操作，无需展开
- 适合布尔值或少量选项

**compactStyle = 'text'（文本按钮）**
```
[🔍搜索...    ] [筛选] [日期] [搜索]
```
- 显示为文本链接/按钮
- 点击后展开筛选面板
- 适合不常用的高级筛选

#### 2.3.4 新增字段类型
- **range**: 范围选择（如文件大小范围）
- **boolean**: 布尔/开关类型
- **custom**: 完全自定义渲染

---

### 2.4 自定义搜索渲染

#### 2.4.1 `search.customRender` 配置
```typescript
interface SearchConfig {
  customRender?: (props: {
    fields: SearchField[]
    values: Record<string, any>
    onSearch: (values: Record<string, any>) => void
    onReset: () => void
  }) => VNode
}
```

#### 2.4.2 使用场景
- 需要特殊布局的搜索表单
- 需要集成第三方搜索组件
- 需要复杂的联动筛选逻辑

---

### 2.5 搜索按钮配置

#### 2.5.1 `search.buttons` 配置
```typescript
interface SearchConfig {
  buttons?: {
    search?: {
      text?: string
      icon?: string
      color?: string
      variant?: 'text' | 'outlined' | 'elevated'
      show?: boolean
    }
    reset?: {
      text?: string
      icon?: string
      show?: boolean
    }
    // 自定义按钮
    custom?: Array<{
      text?: string
      icon?: string
      onClick: () => void
      show?: boolean
    }>
  }
}
```

---

### 2.6 搜索状态管理

#### 2.6.1 暴露搜索状态
```typescript
interface SuperTableReturn<T> {
  // ... 现有属性

  // 新增
  searchValues: Ref<Record<string, any>>
  searchFields: SearchField[]
  isSearching: Ref<boolean>
  setSearchValues: (values: Record<string, any>) => void
  resetSearch: () => void
}
```

#### 2.6.2 外部控制搜索
```typescript
const table = SuperTable({
  search: {
    fields: [...]
  }
})

// 外部设置搜索值
table.setSearchValues({ query: 'test', minSize: 100 })

// 外部触发搜索
table.search({ query: 'test' })
```

---

## 3. API 设计

### 3.1 完整配置示例 - 混合字段类型

```typescript
const tableConfig: SuperTableConfig<FileItem> = {
  // ... 其他配置

  search: {
    // 位置配置
    position: 'toolbar',  // 搜索放在标题栏右侧

    // 布局配置
    layout: 'compact',    // 紧凑模式

    // 字段配置 - 混合多种类型和样式
    fields: [
      // 1. 主搜索 - 完整输入框
      {
        key: 'query',
        label: '搜索',
        type: 'input',
        placeholder: '搜索文件...',
        showInCompact: true,
        compactStyle: 'full',      // 紧凑模式下保持完整输入框
        compactWidth: '200px'
      },

      // 2. 文件类型 - 图标按钮
      // TODO: 多选功能暂不实现，后续规划
      {
        key: 'fileType',
        label: '类型',
        type: 'select',
        // multiple: true,         // TODO: 多选功能后续支持
        options: [
          { label: '全部', value: '' },
          { label: '图片', value: 'image', icon: 'mdi-image' },
          { label: '视频', value: 'video', icon: 'mdi-video' },
          { label: '文档', value: 'document', icon: 'mdi-file-document' },
          { label: '压缩包', value: 'archive', icon: 'mdi-zip-box' }
        ],
        showInCompact: true,
        compactStyle: 'icon',      // 显示为图标按钮
        compactIcon: 'mdi-filter-variant',  // 自定义图标
        advanced: false            // 始终显示在紧凑模式
      },

      // 3. 日期范围 - 图标按钮（点击展开日期选择）
      {
        key: 'dateRange',
        label: '日期',
        type: 'date',
        range: true,               // 范围选择
        showInCompact: true,
        compactStyle: 'icon',
        compactIcon: 'mdi-calendar-range'
      },

      // 4. 文件大小 - 图标按钮（点击展开范围滑块）
      {
        key: 'sizeRange',
        label: '大小',
        type: 'range',
        min: 0,
        max: 1024,
        unit: 'MB',
        showInCompact: true,
        compactStyle: 'icon',
        compactIcon: 'mdi-tune-variant',  // 滑块图标
        advanced: false
      },

      // 5. 仅看收藏 - Chip 开关（布尔值，直接操作）
      {
        key: 'favorited',
        label: '仅收藏',
        type: 'boolean',
        showInCompact: true,
        compactStyle: 'chip',      // 显示为切换按钮
        chipConfig: {
          activeIcon: 'mdi-star',
          inactiveIcon: 'mdi-star-outline',
          activeColor: 'warning',
          activeText: '已收藏',
          inactiveText: '全部'
        }
      },

      // 6. 排序方式 - Chip 选择器（少量选项）
      {
        key: 'sortBy',
        label: '排序',
        type: 'select',
        options: [
          { label: '时间', value: 'time', icon: 'mdi-clock-outline' },
          { label: '大小', value: 'size', icon: 'mdi-file-size' },
          { label: '名称', value: 'name', icon: 'mdi-alphabetical' }
        ],
        showInCompact: true,
        compactStyle: 'chip',      // 小尺寸选择器
        chipConfig: {
          variant: 'outlined',
          size: 'small'
        }
      },

      // 7. 高级选项 - 文本按钮（点击展开更多）
      {
        key: 'advancedOptions',
        label: '高级',
        type: 'custom',
        showInCompact: true,
        compactStyle: 'text',      // 显示为文本按钮
        textConfig: {
          label: '高级筛选',
          icon: 'mdi-chevron-down'
        },
        // 点击后展开的自定义渲染
        customRender: ({ value, onChange, mode }) => {
          if (mode === 'compact') {
            // 紧凑模式：文本按钮
            return h('v-btn', {
              variant: 'text',
              size: 'small',
              prependIcon: 'mdi-chevron-down',
              onClick: () => openAdvancedPanel()
            }, '高级筛选')
          }
          // 展开模式：复杂表单
          return h(AdvancedFilterForm, { value, onChange })
        }
      },

      // 8. 隐藏字段 - 仅在展开面板显示
      {
        key: 'hiddenFiles',
        label: '显示隐藏文件',
        type: 'boolean',
        showInCompact: false,      // 紧凑模式不显示
        advanced: true             // 标记为高级选项
      }
    ],

    // 筛选弹窗配置（当使用 icon/text 样式的字段时，点击后弹出）
    // 注意：这不是搜索表单的下拉选择，而是筛选条件的编辑弹窗
    filterDialog: {
      type: 'dropdown' | 'dialog' | 'drawer',  // 弹窗类型
      title: '筛选条件',
      width: '400px',              // dialog/drawer 宽度
      showBadge: true,             // 图标上显示已选数量徽章
      badgeColor: 'primary'
    },

    // 按钮配置
    buttons: {
      search: {
        text: '搜索',
        icon: 'mdi-magnify',
        color: 'primary',
        variant: 'elevated',
        show: true
      },
      reset: {
        text: '重置',
        icon: 'mdi-refresh',
        show: true,
        variant: 'text'
      }
    },

    // 自定义渲染（优先级最高）
    // customRender: (props) => h(MyCustomSearch, props)
  },

  toolBar: [
    {
      icon: 'mdi-refresh',
      tooltip: '刷新',
      onClick: () => table.refresh()
    },
    {
      icon: 'mdi-export',
      tooltip: '导出',
      onClick: () => exportData()
    }
  ]
}
```

### 3.2 不同场景的配置推荐

#### 场景 1：简单搜索（1-2 个条件）
```typescript
search: {
  position: 'toolbar',
  layout: 'compact',
  fields: [
    { key: 'query', type: 'input', compactStyle: 'full', compactWidth: '250px' },
    { key: 'type', type: 'select', options: [...], compactStyle: 'chip' }
  ]
}
```

#### 场景 2：中等复杂度（3-5 个条件）
```typescript
search: {
  position: 'toolbar',
  layout: 'compact',
  fields: [
    { key: 'query', type: 'input', compactStyle: 'full' },
    { key: 'category', type: 'select', compactStyle: 'icon' },  // 点击弹出筛选弹窗
    { key: 'date', type: 'date', compactStyle: 'icon' },        // 点击弹出日期选择
    { key: 'status', type: 'boolean', compactStyle: 'chip' }    // 直接切换
  ],
  filterDialog: { type: 'dropdown' }  // 配置筛选弹窗类型
}
```

#### 场景 3：复杂筛选（5+ 个条件）
```typescript
search: {
  position: 'header',  // 空间更大，放在标题栏下方
  layout: 'inline',
  fields: [
    { key: 'query', type: 'input' },
    { key: 'types', type: 'select', multiple: true },
    { key: 'sizeRange', type: 'range' },
    { key: 'dateRange', type: 'date', range: true },
    { key: 'status', type: 'select' },
    { key: 'tags', type: 'custom', customRender: ... }
  ]
}
```

---

## 4. 界面设计

### 4.1 紧凑模式 - 混合字段类型示例

#### 场景 A：主搜索 + 图标筛选
```
┌──────────────────────────────────────────────────────────────┐
│ 文件列表                   [🔍 搜索...] [⚙️³] [📅¹] [🔘] [🔄] │
├──────────────────────────────────────────────────────────────┤
│ 文件名        大小      修改时间              操作            │
├──────────────────────────────────────────────────────────────┤
│ ...                                                         │
└──────────────────────────────────────────────────────────────┘

配置说明:
- query (input): compactStyle='full' - 主搜索框
- type (select): compactStyle='icon' - 类型筛选，有3个选中项
- date (date): compactStyle='icon' - 日期筛选，有1个值
- status (boolean): compactStyle='icon' - 状态开关
- refresh (toolBar): 刷新按钮
```

#### 场景 B：主搜索 + Chip 快速筛选
```
┌──────────────────────────────────────────────────────────────┐
│ 文件列表          [🔍 搜索...] [图片▼] [仅收藏●] [搜索] [🔄] │
├──────────────────────────────────────────────────────────────┤
│ 文件名        大小      修改时间              操作            │
├──────────────────────────────────────────────────────────────┤
│ ...                                                         │
└──────────────────────────────────────────────────────────────┘

配置说明:
- query (input): compactStyle='full'
- category (select): compactStyle='chip' - 小尺寸下拉
- favorited (boolean): compactStyle='chip' - 开关按钮
```

#### 场景 C：纯图标工具栏（空间极窄）
```
┌──────────────────────────────────────────────────┐
│ 文件列表              [🔍] [⚙️] [📅] [🔘] [🔄] │
├──────────────────────────────────────────────────┤
│ 文件名   大小   修改时间        操作              │
├──────────────────────────────────────────────────┤
│ ...                                             │
└──────────────────────────────────────────────────┘

配置说明:
- query (input): compactStyle='icon' - 点击展开搜索输入
- type (select): compactStyle='icon'
- date (date): compactStyle='icon'
- status (boolean): compactStyle='icon'
```

### 4.2 筛选弹窗（filterDialog）

当字段使用 `compactStyle: 'icon'` 或 `compactStyle: 'text'` 时，点击后需要弹出筛选弹窗来编辑该字段的值。

#### 方案 A：每个字段独立触发（不推荐）
```
┌────────────────────────────────────────────────────────────┐
│ 文件列表                   [🔍 搜索...] [⚙️³▼] [📅¹▼] [🔘] │
├────────────────────────────────────────────────────────────┤
│ ┌─ 类型筛选 ─────────────────────────────────────────┐    │
│ │ [☑图片] [☑视频] [☑文档] [☐其他]                   │    │
│ │                                    [确定] [重置]   │    │
│ └────────────────────────────────────────────────────┘    │
├────────────────────────────────────────────────────────────┤
│ 文件名        大小      修改时间              操作          │
└────────────────────────────────────────────────────────────┘
```
- 每个图标点击后显示自己的下拉面板
- 问题：界面分散，多个弹窗可能重叠

#### 方案 B：统一筛选按钮（推荐）
```
┌────────────────────────────────────────────────────────────┐
│ 文件列表                   [🔍 搜索...] [筛选³] [🔘] [🔄] │
├────────────────────────────────────────────────────────────┤
│ ┌─ 筛选条件 ─────────────────────────────────────────┐    │
│ │ 类型:  [图片 ▼] [视频 ▼] [文档 ▼] ...              │    │
│ │ 日期:  [2024/01/01 ~ 2024/12/31    ]               │    │
│ │                                                    │    │
│ │         [重置]              [确定]                 │    │
│ └────────────────────────────────────────────────────┘    │
├────────────────────────────────────────────────────────────┤
│ 文件名        大小      修改时间              操作          │
└────────────────────────────────────────────────────────────┘
```
- 所有 `icon`/`text` 字段共用一个"筛选"按钮
- 点击后统一显示所有需要弹窗的字段
- 显示已选数量徽章（如"筛选³"表示有3个条件）

#### 方案 C：居中弹窗（字段较多时）
```
┌────────────────────────────────────────┐
│ ┌─ 筛选条件 ──────────────── [X] ──┐   │
│ │                                  │   │
│ │ 文件类型: [图片 ▼]               │   │
│ │           [视频 ▼]               │   │
│ │           [文档 ▼]               │   │
│ │                                  │   │
│ │ 修改日期: [开始日期] ~ [结束日期]│   │
│ │                                  │   │
│ │ 仅收藏:   [开关 ●]               │   │
│ │                                  │   │
│ │         [重置]      [取消] [确定]│   │
│ └──────────────────────────────────┘   │
└────────────────────────────────────────┘
```
- 使用 `filterDialog: { type: 'dialog' }`
- 适合字段较多或需要更复杂的布局

### 4.3 Header 模式（默认）
```
┌────────────────────────────────────────────────────────────┐
│ 文件列表                                    [刷新] [导出]  │
├────────────────────────────────────────────────────────────┤
│ 搜索: [              ] 最小: [  ] 最大: [  ] [搜索] [重置] │
├────────────────────────────────────────────────────────────┤
│ 文件名        大小      修改时间              操作          │
├────────────────────────────────────────────────────────────┤
│ ...                                                       │
└────────────────────────────────────────────────────────────┘
```

---

## 5. 实现规划

### 5.1 阶段一：基础功能
- [ ] 添加 `search.position` 配置
- [ ] 实现 toolbar 位置模式
- [ ] 调整搜索表单渲染逻辑

### 5.2 阶段二：布局优化
- [ ] 添加 `search.layout` 配置
- [ ] 实现 compact 模式
- [ ] 添加 `showInCompact` 字段配置

### 5.3 阶段三：高级功能
- [ ] 添加 `search.buttons` 配置
- [ ] 实现 `search.customRender`
- [ ] 暴露搜索状态和方法

### 5.4 阶段四：字段增强
- [ ] 添加 range 字段类型
- [ ] 添加 custom 字段类型
- [ ] 实现高级筛选折叠功能

---

## 6. 兼容性

### 6.1 向后兼容
- 默认 `position: 'default'` 保持现有行为
- 默认 `layout: 'inline'` 保持现有布局
- 现有配置无需修改即可继续使用

### 6.2 迁移指南
```typescript
// 旧配置
search: {
  fields: [...]
}

// 新配置（等效）
search: {
  position: 'default',
  layout: 'inline',
  fields: [...]
}

// 优化后的配置
search: {
  position: 'toolbar',
  layout: 'compact',
  fields: [
    { key: 'query', label: '搜索', type: 'input', showInCompact: true },
    { key: 'size', label: '大小', type: 'range', advanced: true }
  ]
}
```

---

## 7. 待讨论问题

### 7.1 布局与空间

1. **toolbar 模式下的空间问题**：如果搜索字段过多，如何处理？
   - ~~方案 A：超出部分自动隐藏到"更多"下拉菜单~~
   - ~~方案 B：提供横向滚动~~
   - **方案 C：自动换行展示**（推荐）
   - 方案 D：强制限制字段数量

2. **移动端适配**：
   - toolbar 模式在移动端如何处理？
   - 是否需要自动切换到 header 模式？
   - 是否需要为移动端提供专门的 `mobileStyle` 配置？

### 7.2 搜索触发方式

3. **搜索触发方式**：
   - 方案 A：点击搜索按钮触发
   - 方案 B：输入框回车触发 + 按钮触发
   - 方案 C：防抖自动搜索（输入后延迟触发）
   - 方案 D：可配置触发方式

4. **图标/Chip 按钮的触发**：
   - 点击后立即触发搜索？
   - 还是等用户完成多个选择后统一触发？

### 7.3 字段类型与样式

5. **compactStyle 的默认值**：
   - 是否根据字段类型自动选择最佳 `compactStyle`？
   - 例如：boolean 默认 'chip'，select 默认 'icon'，input 默认 'full'

6. **多选 select 的紧凑展示**：
   - 图标上如何显示多选数量？
   - 是否需要显示已选项的标签列表？

7. **range 类型的紧凑展示**：
   - 图标模式：点击后展开双滑块还是两个输入框？
   - 是否需要显示当前范围的文本摘要（如 "10-100MB"）？

8. **boolean 类型的样式统一**：
   - 使用 switch 开关还是 checkbox？
   - chip 模式下是显示 "仅收藏" 还是 "显示全部"？

### 7.4 筛选弹窗（filterDialog）

9. **筛选弹窗的内容**：
   - 只显示 `compactStyle: 'icon'` 和 `compactStyle: 'text'` 的字段？
   - 还是显示所有 `advanced: true` 的字段？
   - 还是显示所有字段（包括已在紧凑模式显示的）？

10. **筛选弹窗的样式**：
    - **dropdown**：下拉面板，显示在按钮下方，适合 1-3 个字段
    - **dialog**：居中弹窗，适合 3-8 个字段
    - **drawer**：侧边抽屉，适合 8+ 个字段或复杂表单

11. **筛选弹窗的触发方式**：
    - 每个 `icon`/`text` 字段单独触发自己的弹窗？
    - 还是所有 `icon`/`text` 字段共用一个"筛选"按钮，点击后显示所有字段？
    - 推荐：共用一个筛选按钮，避免界面过于分散

### 7.5 数据与状态

11. **筛选条件持久化**：
    - 是否需要保存用户的筛选条件到 localStorage？
    - 保存哪些字段？所有还是仅标记为 `persist: true` 的？

12. **搜索值的数据格式**：
    - range 类型的值是 `{ min, max }` 还是 `[min, max]`？
    - date 范围是字符串数组还是对象？
    - 是否需要统一的值格式化配置？

---

## 8. 参考组件

- Ant Design Pro Table
- Element Plus Pro Table
- Vuetify Data Table (v-data-table)
