import type { VNode } from 'vue'

/**
 * 表格列配置
 */
export interface TableColumn<T = any> {
  /** 列标识 */
  key: string
  /** 列标题 */
  title: string
  /** 数据字段名，默认为key */
  dataIndex?: string
  /** 简单格式化函数 */
  format?: (value: any, record: T) => string
  /** 自定义渲染函数 */
  customRender?: (record: T, index: number) => VNode | string
  /** 是否可排序 */
  sortable?: boolean
  /** 列宽度 */
  width?: string | number
}

/**
 * 工具栏按钮配置
 */
export interface ToolbarAction {
  /** 图标 */
  icon?: string
  /** 按钮文字 */
  label?: string
  /** 按钮颜色 */
  color?: string
  /** 提示文字 */
  tooltip?: string
  /** 点击事件（使用自定义渲染时可不传） */
  onClick?: () => void
  /** 是否显示 */
  show?: () => boolean
  /** 自定义渲染 */
  customRender?: () => VNode
}

/**
 * 操作列按钮配置
 */
export interface ActionColumn<T = any> {
  /** 图标 */
  icon?: string
  /** 提示文字 */
  tooltip?: string
  /** 按钮颜色 */
  color?: string
  /** 点击事件 */
  onClick?: (record: T) => void
  /** 是否显示 */
  show?: (record: T) => boolean
  /** 自定义渲染（支持表单控件等复杂内容） */
  customRender?: (record: T) => VNode | null
}

/**
 * 批量操作按钮配置
 */
export interface BatchAction<T = any> {
  /** 图标 */
  icon?: string
  /** 按钮文字 */
  label: string
  /** 按钮颜色 */
  color?: string
  /** 点击事件 */
  onClick: (selectedRows: T[]) => void
  /** 是否显示 */
  show?: (selectedRows: T[]) => boolean
}

/**
 * 搜索字段配置
 */
export interface SearchField {
  /** 字段名 */
  key: string
  /** 标签 */
  label: string
  /** 类型 */
  type: 'input' | 'select' | 'date'
  /** 选项（select类型使用） */
  options?: { label: string; value: any }[]
  /** 占位符 */
  placeholder?: string
}

/**
 * 分页配置
 */
export interface PaginationConfig {
  /** 当前页 */
  page?: number
  /** 每页条数 */
  pageSize?: number
  /** 可选每页条数 */
  pageSizes?: number[]
  /** 总条数 */
  total?: number
}

/**
 * 请求参数
 */
export interface RequestParams {
  page: number
  pageSize: number
  [key: string]: any
}

/**
 * 请求响应
 */
export interface RequestResponse<T = any> {
  data: T[]
  total: number
}

/**
 * 表格标题栏配置
 */
export interface TableTitleConfig {
  /** 标题文字 */
  title?: string
  /** 标题图标 */
  icon?: string
  /** 标题颜色 */
  color?: string
  /** 自定义渲染 */
  customRender?: () => VNode
}

/**
 * SuperTable配置
 */
export interface SuperTableConfig<T = any> {
  /** 本地数据源（与 requestUrl/requestHandler 二选一） */
  data?: T[] | (() => T[])
  /** 请求URL */
  requestUrl?: string
  /** 自定义请求处理函数 */
  requestHandler?: (params: RequestParams) => Promise<RequestResponse<T>>
  /** 列配置 */
  columns: TableColumn<T>[]
  /** 工具栏配置 */
  toolBar?: ToolbarAction[]
  /** 自定义工具栏渲染 */
  customToolbar?: () => VNode
  /** 操作列配置 */
  actions?: ActionColumn<T>[]
  /** 是否开启多选 */
  multiSelect?: boolean
  /** 批量操作按钮配置（多选时显示） */
  batchActions?: BatchAction<T>[]
  /** 行点击事件 */
  onRowClick?: (record: T) => void
  /** 行右键菜单事件 */
  onRowContextmenu?: (record: T, event: MouseEvent) => void
  /** 行右键菜单事件 */
  onRowContextmenu?: (record: T, event: MouseEvent) => void
  /** 分页配置 */
  pagination?: PaginationConfig | boolean
  /** 搜索配置 */
  search?: {
    fields: SearchField[]
  }
  /** 行唯一标识字段 */
  rowKey?: string
  /** 表格高度 */
  height?: string | number
  /** 是否显示加载状态 */
  showLoading?: boolean
  /** 表格标题栏配置 */
  title?: TableTitleConfig
  /** 是否显示标题栏 */
  showTitle?: boolean
}

/**
 * SuperTable返回对象
 */
export interface SuperTableReturn<T = any> {
  /** 表格组件 */
  Table: () => VNode
  /** 表格数据引用 */
  dataRef: { value: T[] }
  /** 加载状态引用 */
  loadingRef: { value: boolean }
  /** 选中的行数据（多选时有效） */
  selectedRowsRef: { value: T[] }
  /** 刷新方法 */
  refresh: () => Promise<void>
  /** 搜索方法 */
  search: (values: Record<string, any>) => Promise<void>
  /** 分页信息 */
  paginationRef: {
    value: {
      page: number
      pageSize: number
      total: number
    }
  }
  /** 切换多选模式 */
  toggleMultiSelect: () => void
  /** 清空选中 */
  clearSelection: () => void
}
