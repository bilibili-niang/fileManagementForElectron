import { defineComponent, ref, computed, watch } from 'vue'

interface Header {
  title: string
  key: string
  width?: string
}

interface Props {
  data?: any[]
  headers?: Header[]
  loading?: boolean
  total?: number
  page?: number
  pageSize?: number
  emptyText?: string
  showPagination?: boolean
  showPageSize?: boolean
  showJumpTo?: boolean
  serverSide?: boolean
  pageSizeOptions?: number[]
}

export default defineComponent({
  name: 'PaginationTable',
  props: {
    data: {
      type: Array,
      default: () => []
    },
    headers: {
      type: Array,
      default: () => []
    },
    loading: {
      type: Boolean,
      default: false
    },
    total: {
      type: Number,
      default: 0
    },
    page: {
      type: Number,
      default: 1
    },
    pageSize: {
      type: Number,
      default: 10
    },
    emptyText: {
      type: String,
      default: '暂无数据'
    },
    showPagination: {
      type: Boolean,
      default: true
    },
    showPageSize: {
      type: Boolean,
      default: true
    },
    showJumpTo: {
      type: Boolean,
      default: false
    },
    serverSide: {
      type: Boolean,
      default: false
    },
    pageSizeOptions: {
      type: Array,
      default: () => [10, 20, 50, 100]
    }
  },
  emits: ['page-change', 'page-size-change', 'change'],
  setup(props, { emit, slots }) {
    const localPage = ref(props.page)
    const localPageSize = ref(props.pageSize)
    const jumpPage = ref(props.page)

    const totalPages = computed(() => Math.ceil(props.total / localPageSize.value))
    const startIndex = computed(() => (localPage.value - 1) * localPageSize.value)
    const endIndex = computed(() => Math.min(startIndex.value + localPageSize.value, props.total))

    const displayData = computed(() => {
      if (props.serverSide) return props.data as any[]
      return (props.data as any[]).slice(startIndex.value, endIndex.value)
    })

    const visiblePages = computed(() => {
      const pages: (number | '...')[] = []
      const total = totalPages.value
      const current = localPage.value

      if (total <= 7) {
        for (let i = 1; i <= total; i++) pages.push(i)
      } else {
        pages.push(1)
        if (current > 3) pages.push('...')
        for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
          pages.push(i)
        }
        if (current < total - 2) pages.push('...')
        pages.push(total)
      }

      return pages
    })

    watch(() => props.page, (val) => { localPage.value = val })
    watch(() => props.pageSize, (val) => { localPageSize.value = val })

    function goToPage(p: number) {
      if (p < 1 || p > totalPages.value) return
      localPage.value = p
      emit('page-change', p)
      emit('change', { page: p, pageSize: localPageSize.value })
    }

    function prevPage() {
      goToPage(localPage.value - 1)
    }

    function nextPage() {
      goToPage(localPage.value + 1)
    }

    function handlePageSizeChange(size: number) {
      localPageSize.value = size
      localPage.value = 1
      emit('page-size-change', size)
      emit('change', { page: 1, pageSize: size })
    }

    function handleJump() {
      const p = parseInt(jumpPage.value as any)
      if (!isNaN(p)) {
        goToPage(p)
      }
      jumpPage.value = localPage.value
    }

    function renderTableHeaders() {
      const tableHeaders = props.headers as Header[]

      return (
        <thead>
          <tr>
            {slots['table-head']
              ? slots['table-head']()
              : tableHeaders.map((header) => (
                  <th key={header.key} style={{ width: header.width }} class="text-left font-weight-bold">
                    {header.title}
                  </th>
                ))
            }
          </tr>
        </thead>
      )
    }

    function renderTableBody() {
      return (
        <tbody>
          {(displayData.value || []).map((item, index) => (
            <tr key={item.id || index}>
              {slots['table-row']
                ? slots['table-row']({ item, index })
                : slots['table-body']
                  ? slots['table-body']({ data: [item], index })
                  : (props.headers as Header[]).map((header) => (
                      <td key={header.key}>{item[header.key]}</td>
                    ))
              }
            </tr>
          ))}
        </tbody>
      )
    }

    function renderEmptyState() {
      return (
        <div class="empty-state">
          {slots.empty ? (
            slots.empty()
          ) : (
            <>
              <v-icon icon="mdi-table-off" size={48} color="grey" />
              <p class="text-body-2 text-grey mt-2">{props.emptyText}</p>
            </>
          )}
        </div>
      )
    }

    function renderLoadingState() {
      return (
        <div class="loading-state">
          <v-progress-circular indeterminate color="primary" />
        </div>
      )
    }

    function renderPaginationControls() {
      return (
        <>
          {props.showPageSize && (
            <div class="page-size-select">
              <span class="text-caption">每页</span>
              <v-select
                modelValue={localPageSize.value}
                items={props.pageSizeOptions}
                density="compact"
                variant="outlined"
                hide-details
                class="page-size-input"
                onUpdate:modelValue={(val: number) => handlePageSizeChange(val)}
              />
              <span class="text-caption">条</span>
            </div>
          )}

          <v-btn
            icon="mdi-page-first"
            variant="text"
            density="compact"
            disabled={localPage.value <= 1}
            onClick={() => goToPage(1)}
          />

          <v-btn
            icon="mdi-chevron-left"
            variant="text"
            density="compact"
            disabled={localPage.value <= 1}
            onClick={() => prevPage()}
          />

          <div class="page-numbers">
            {visiblePages.value.map((p, index) => (
              <v-btn
                key={index}
                variant={p === localPage.value ? 'flat' : 'text'}
                color={p === localPage.value ? 'primary' : undefined}
                density="compact"
                class="page-btn"
                disabled={p === '...'}
                onClick={() => typeof p === 'number' && goToPage(p)}
              >
                {String(p)}
              </v-btn>
            ))}
          </div>

          <v-btn
            icon="mdi-chevron-right"
            variant="text"
            density="compact"
            disabled={localPage.value >= totalPages.value}
            onClick={() => nextPage()}
          />

          <v-btn
            icon="mdi-page-last"
            variant="text"
            density="compact"
            disabled={localPage.value >= totalPages.value}
            onClick={() => goToPage(totalPages.value)}
          />

          {props.showJumpTo && (
            <div class="jump-to">
              <span class="text-caption">跳至</span>
              <v-text-field
                modelValue={jumpPage.value}
                type="number"
                density="compact"
                variant="outlined"
                hide-details
                class="jump-input"
                min={1}
                max={totalPages.value}
                onKeyup={(e: KeyboardEvent) => e.key === 'Enter' && handleJump()}
                onUpdate:modelValue={(val: any) => { jumpPage.value = val }}
              />
              <span class="text-caption">页</span>
            </div>
          )}
        </>
      )
    }

    return () => (
      <div class="pagination-table">
        <div class="table-container">
          {displayData.value.length === 0 && !props.loading
            ? renderEmptyState()
            : (
              <>
                <table class="data-table">
                  {renderTableHeaders()}
                  {renderTableBody()}
                </table>
                {props.loading && renderLoadingState()}
              </>
            )
          }
        </div>

        {props.showPagination && props.total > 0 && (
          <div class="pagination-bar">
            <div class="pagination-info">
              显示 {startIndex.value + 1}-{endIndex.value} ，共 {props.total} 条
            </div>
            <div class="pagination-controls">
              {renderPaginationControls()}
            </div>
          </div>
        )}
      </div>
    )
  }
})
