import { defineComponent, ref, computed, onMounted, h, type VNode } from 'vue'
import type {
  SuperTableConfig,
  SuperTableReturn,
  TableColumn,
  ToolbarAction,
  ActionColumn,
  RequestParams,
  RequestResponse
} from './types'
import { SearchForm } from './SearchForm'
import './index.scss'

/**
 * 创建请求函数
 */
function createRequestHandler<T>(
  config: SuperTableConfig<T>
): (params: RequestParams) => Promise<RequestResponse<T>> {
  // 本地数据模式：前端分页
  if (config.data) {
    return async (params: RequestParams): Promise<RequestResponse<T>> => {
      const allData = typeof config.data === 'function' ? (config.data as () => T[])() : config.data!
      const total = allData.length
      const start = (params.page - 1) * params.pageSize
      const end = start + params.pageSize
      const data = allData.slice(start, end)
      return { data, total }
    }
  }

  if (config.requestHandler) {
    return config.requestHandler
  }

  if (!config.requestUrl) {
    throw new Error('必须提供 requestUrl、requestHandler 或 data')
  }

  return async (params: RequestParams): Promise<RequestResponse<T>> => {
    const queryParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value))
      }
    })

    const url = `${config.requestUrl}?${queryParams.toString()}`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`请求失败: ${response.status}`)
    }

    const result = await response.json()

    /**
     * 支持两种响应格式:
     * 1. { data: [], total: 0 }
     * 2. { list: [], total: 0 }
     */
    return {
      data: result.data || result.list || [],
      total: result.total || 0
    }
  }
}

/**
 * SuperTable组件
 */
export function SuperTable<T extends Record<string, any> = any>(
  config: SuperTableConfig<T>
): SuperTableReturn<T> {
  /**
   * 数据状态
   */
  const dataRef = ref<T[]>([])
  const loadingRef = ref(false)
  const selectedRowsRef = ref<T[]>([])
  /**
   * 是否启用多选功能（显示多选按钮）
   */
  const multiSelectEnabled = ref(config.multiSelect || false)
  /**
   * 多选模式是否开启（用户点击按钮后开启）
   */
  const isMultiSelectMode = ref(false)

  /**
   * 分页状态
   */
  const paginationConfig = config.pagination !== false
    ? {
        page: 1,
        pageSize: 20,
        total: 0,
        ...(typeof config.pagination === 'object' ? config.pagination : {})
      }
    : null

  const paginationRef = ref(paginationConfig)

  /**
   * 搜索状态
   */
  const searchValues = ref<Record<string, any>>({})

  /**
   * 请求处理器
   */
  const requestHandler = createRequestHandler(config)

  /**
   * 加载数据
   */
  const loadData = async (): Promise<void> => {
    loadingRef.value = true

    try {
      const params: RequestParams = {
        page: paginationRef.value?.page || 1,
        pageSize: paginationRef.value?.pageSize || 10,
        ...searchValues.value
      }

      const response = await requestHandler(params)

      dataRef.value = response.data

      if (paginationRef.value) {
        paginationRef.value.total = response.total
      }
    } catch (error) {
      console.error('加载数据失败:', error)
    } finally {
      loadingRef.value = false
    }
  }

  /**
   * 刷新方法
   */
  const refresh = async (): Promise<void> => {
    await loadData()
  }

  /**
   * 搜索方法
   */
  const search = async (values: Record<string, any>): Promise<void> => {
    searchValues.value = values
    if (paginationRef.value) {
      paginationRef.value.page = 1
    }
    await loadData()
  }

  /**
   * 切换多选模式
   */
  const toggleMultiSelectMode = (): void => {
    isMultiSelectMode.value = !isMultiSelectMode.value
    if (!isMultiSelectMode.value) {
      selectedRowsRef.value = []
    }
  }

  /**
   * 切换行选中状态
   */
  const toggleRowSelection = (row: T): void => {
    const rowKey = config.rowKey || 'id'
    const index = selectedRowsRef.value.findIndex(
      (item) => item[rowKey] === row[rowKey]
    )

    if (index > -1) {
      selectedRowsRef.value.splice(index, 1)
    } else {
      selectedRowsRef.value.push(row)
    }
  }

  /**
   * 检查行是否被选中
   */
  const isRowSelected = (row: T): boolean => {
    const rowKey = config.rowKey || 'id'
    return selectedRowsRef.value.some((item) => item[rowKey] === row[rowKey])
  }

  /**
   * 全选/取消全选
   */
  const toggleSelectAll = (): void => {
    if (selectedRowsRef.value.length === dataRef.value.length) {
      selectedRowsRef.value = []
    } else {
      selectedRowsRef.value = [...dataRef.value]
    }
  }

  /**
   * 处理分页变化
   */
  const handlePageChange = (page: number): void => {
    if (paginationRef.value) {
      paginationRef.value.page = page
      loadData()
    }
  }

  /**
   * 处理每页条数变化
   */
  const handlePageSizeChange = (pageSize: number): void => {
    if (paginationRef.value) {
      paginationRef.value.pageSize = pageSize
      paginationRef.value.page = 1
      loadData()
    }
  }

  /**
   * 渲染标题栏
   */
  const renderTitle = (): VNode | null => {
    if (config.showTitle === false) {
      return null
    }

    // 如果有自定义标题渲染函数，优先使用
    if (config.title?.customRender) {
      return config.title.customRender()
    }

    // 如果没有标题配置，但有工具栏，渲染默认工具栏
    if (!config.title && !config.toolBar?.length) {
      return null
    }

    return (
      <div class="super-table-title-bar">
        <div class="super-table-title-left">
          {config.title?.icon && (
            <v-icon
              icon={config.title.icon}
              color={config.title.color || 'primary'}
              class="mr-2"
            ></v-icon>
          )}
          {config.title?.title && (
            <span class="super-table-title-text">{config.title.title}</span>
          )}
        </div>
        <div class="super-table-title-right">
          {/* 批量操作按钮（多选模式且有选中项时显示） */}
          {isMultiSelectMode.value && selectedRowsRef.value.length > 0 && config.batchActions && (
            <div class="super-table-batch-actions mr-2">
              {config.batchActions.map((action, index) => {
                if (action.show && !action.show(selectedRowsRef.value)) {
                  return null
                }
                return (
                  <v-btn
                    key={index}
                    size="small"
                    color={action.color}
                    variant="outlined"
                    prepend-icon={action.icon}
                    onClick={() => action.onClick(selectedRowsRef.value)}
                    class="mr-2"
                  >
                    {action.label}
                  </v-btn>
                )
              })}
            </div>
          )}
          {renderToolbarButtons()}
        </div>
      </div>
    )
  }

  /**
   * 渲染工具栏按钮
   */
  const renderToolbarButtons = (): VNode | null => {
    // 如果有自定义工具栏渲染函数，优先使用
    if (config.customToolbar) {
      return config.customToolbar()
    }

    if (!config.toolBar || config.toolBar.length === 0) {
      return null
    }

    return (
      <div class="super-table-toolbar">
        {multiSelectEnabled.value && (
          <v-btn
            icon
            variant={isMultiSelectMode.value ? 'flat' : 'text'}
            size="small"
            color={isMultiSelectMode.value ? 'primary' : undefined}
            onClick={toggleMultiSelectMode}
            class="mr-2"
          >
            <v-icon
              icon={
                isMultiSelectMode.value
                  ? 'mdi-checkbox-marked'
                  : 'mdi-checkbox-blank-outline'
              }
            ></v-icon>
            多选
          </v-btn>
        )}

        {config.toolBar.map((action, index) => {
          if (action.show && !action.show()) {
            return null
          }

          // 如果有自定义渲染函数，使用自定义渲染
          if (action.customRender) {
            return action.customRender()
          }

          return (
            <v-btn
              key={action.label || action.icon || index}
              icon={!action.label}
              variant={action.label ? 'outlined' : 'text'}
              size="small"
              color={action.color}
              onClick={action.onClick}
              class={action.label ? 'mr-2' : ''}
              title={action.tooltip}
            >
              {action.icon && <v-icon icon={action.icon}></v-icon>}
              {action.label && (
                <span class="d-none d-sm-inline ml-1">{action.label}</span>
              )}
            </v-btn>
          )
        })}
      </div>
    )
  }

  /**
   * 渲染表格单元格
   */
  const renderCell = (column: TableColumn<T>, record: T, index: number): VNode | string => {
    if (column.customRender) {
      return column.customRender(record, index)
    }

    const dataIndex = column.dataIndex || column.key
    const value = record[dataIndex]

    if (column.format) {
      return column.format(value, record)
    }

    return String(value ?? '')
  }

  /**
   * 渲染操作列
   */
  const renderActions = (record: T): VNode | null => {
    if (!config.actions || config.actions.length === 0) {
      return null
    }

    return (
      <div class="d-flex align-center">
        {config.actions.map((action, index) => {
          if (action.show && !action.show(record)) {
            return null
          }

          // 自定义渲染优先
          if (action.customRender) {
            return (
              <div key={'action-custom-' + index} onClick={(e: Event) => e.stopPropagation()}>
                {action.customRender(record)}
              </div>
            )
          }

          return (
            <v-btn
              key={action.icon + index}
              icon
              size="small"
              variant="text"
              color={action.color}
              onClick={(e: Event) => {
                e.stopPropagation()
                action.onClick?.(record)
              }}
              title={action.tooltip}
            >
              <v-icon icon={action.icon}></v-icon>
            </v-btn>
          )
        })}
      </div>
    )
  }

  /**
   * 构建表头
   */
  const headers = computed(() => {
    const result: any[] = []

    /**
     * 多选列
     */
    if (isMultiSelectMode.value) {
      result.push({
        key: 'selection',
        title: '',
        sortable: false,
        width: '50px'
      })
    }

    /**
     * 数据列
     */
    config.columns.forEach((column) => {
      result.push({
        key: column.key,
        title: column.title,
        sortable: column.sortable || false,
        width: column.width
      })
    })

    /**
     * 操作列
     */
    if (config.actions && config.actions.length > 0) {
      result.push({
        key: 'actions',
        title: '操作',
        sortable: false,
        width: '120px'
      })
    }

    return result
  })

  /**
   * 表格组件
   */
  const TableComponent = defineComponent({
    name: 'SuperTable',

    setup() {
      onMounted(() => {
        loadData()
      })

      return () => (
        <div class="super-table-container">
          {renderTitle()}

          {/* 搜索表单 */}
          {config.search && config.search.fields.length > 0 && (
            <SearchForm
              fields={config.search.fields}
              onSearch={search}
            ></SearchForm>
          )}

          <v-card variant="outlined" class="super-table-card">
            {loadingRef.value && (
              <v-progress-linear indeterminate color="primary"></v-progress-linear>
            )}

            <v-data-table
              items={dataRef.value}
              headers={headers.value}
              item-key={config.rowKey || 'id'}
              density="compact"
              no-data-text="暂无数据"
              hide-default-footer={config.pagination !== undefined}
              {...(config.onRowClick ? {
                'onClick:row': (_: any, { item }: { item: T }) => config.onRowClick!(item)
              } : {})}
              {...(config.onRowContextmenu ? {
                'onContextmenu:row': (_: any, { item, event }: { item: T, event: MouseEvent }) => {
                  event.preventDefault()
                  config.onRowContextmenu!(item, event)
                }
              } : {})}
            >
              {{
                /* 表头多选框 */
                'header.selection': () =>
                  isMultiSelectMode.value && (
                    <v-checkbox
                      model-value={
                        selectedRowsRef.value.length === dataRef.value.length &&
                        dataRef.value.length > 0
                      }
                      indeterminate={
                        selectedRowsRef.value.length > 0 &&
                        selectedRowsRef.value.length < dataRef.value.length
                      }
                      onClick={toggleSelectAll}
                      hide-details
                      density="compact"
                    ></v-checkbox>
                  ),

                /* 行多选框 */
                'item.selection': ({ item }: { item: T }) =>
                  isMultiSelectMode.value && (
                    <v-checkbox
                      model-value={isRowSelected(item)}
                      onClick={() => toggleRowSelection(item)}
                      hide-details
                      density="compact"
                    ></v-checkbox>
                  ),

                /* 数据列 */
                ...config.columns.reduce((slots, column) => {
                  slots[`item.${column.key}`] = ({ item, index }: { item: T; index: number }) => {
                    const content = renderCell(column, item, index)
                    const isSelected = isRowSelected(item)

                    return (
                      <span class={isSelected ? 'text-primary font-weight-medium' : ''}>
                        {content}
                      </span>
                    )
                  }
                  return slots
                }, {} as Record<string, any>),

                /* 操作列 */
                'item.actions': ({ item }: { item: T }) => renderActions(item)
              }}
            </v-data-table>

            {/* 分页 */}
            {paginationRef.value && (
              <div class="super-table-pagination">
                <v-pagination
                  model-value={paginationRef.value.page}
                  length={Math.ceil(paginationRef.value.total / paginationRef.value.pageSize)}
                  total-visible={7}
                  onUpdate:model-value={handlePageChange}
                ></v-pagination>

                <div class="d-flex align-center pagination-right">
                  <v-select
                    model-value={paginationRef.value.pageSize}
                    items={[
                      { title: '20 条/页', value: 20 },
                      { title: '50 条/页', value: 50 },
                      { title: '200 条/页', value: 200 },
                      { title: '1000 条/页', value: 1000 }
                    ]}
                    density="compact"
                    variant="outlined"
                    hide-details
                    class="page-size-select"
                    style={{ width: '130px', minWidth: '130px' }}
                    onUpdate:model-value={handlePageSizeChange}
                  ></v-select>

                  <span class="text-caption text-grey">
                    共 {paginationRef.value.total} 条
                  </span>
                </div>
              </div>
            )}
          </v-card>
        </div>
      )
    }
  })

  /**
   * 切换多选模式（暴露给外部使用）
   */
  const toggleMultiSelect = (): void => {
    toggleMultiSelectMode()
  }

  /**
   * 清空选中（暴露给外部使用）
   */
  const clearSelection = (): void => {
    selectedRowsRef.value = []
  }

  return {
    Table: () => h(TableComponent),
    dataRef: dataRef as { value: T[] },
    loadingRef: loadingRef as { value: boolean },
    selectedRowsRef: selectedRowsRef as { value: T[] },
    refresh,
    search,
    paginationRef: paginationRef as {
      value: { page: number; pageSize: number; total: number }
    },
    toggleMultiSelect,
    clearSelection
  }
}

export default SuperTable
