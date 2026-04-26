import { ref, computed, watch } from 'vue'

export interface PaginationOptions {
  page?: number
  pageSize?: number
  total?: number
}

export interface PaginationEmits {
  (e: 'update:page', value: number): void
  (e: 'update:pageSize', value: number): void
  (e: 'change', payload: { page: number; pageSize: number }): void
}

export function usePagination(options: PaginationOptions = {}) {
  const page = ref(options.page || 1)
  const pageSize = ref(options.pageSize || 10)
  const total = ref(options.total || 0)

  const totalPages = computed(() => Math.ceil(total.value / pageSize.value))

  const startIndex = computed(() => (page.value - 1) * pageSize.value)
  const endIndex = computed(() => Math.min(startIndex.value + pageSize.value, total.value))

  function setTotal(newTotal: number) {
    total.value = newTotal
    // 如果当前页超出范围，回到最后一页
    if (page.value > totalPages.value && totalPages.value > 0) {
      page.value = totalPages.value
    }
  }

  function setPage(newPage: number) {
    if (newPage >= 1 && newPage <= totalPages.value) {
      page.value = newPage
    }
  }

  function setPageSize(newSize: number) {
    pageSize.value = newSize
    page.value = 1 // 重置到第一页
  }

  function reset() {
    page.value = 1
  }

  function nextPage() {
    if (page.value < totalPages.value) {
      page.value++
    }
  }

  function prevPage() {
    if (page.value > 1) {
      page.value--
    }
  }

  // 页码数组（显示有限页码）
  const visiblePages = computed(() => {
    const pages: (number | '...')[] = []
    const total = totalPages.value
    const current = page.value

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

  return {
    page,
    pageSize,
    total,
    totalPages,
    startIndex,
    endIndex,
    visiblePages,
    setTotal,
    setPage,
    setPageSize,
    reset,
    nextPage,
    prevPage
  }
}
