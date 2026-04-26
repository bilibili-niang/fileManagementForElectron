import { defineComponent, ref, watch, PropType, computed } from 'vue'
import { debounce } from 'lodash-es'

/**
 * 搜索语法解析结果接口
 */
export interface ParsedQuery {
  keywords: string[]
  extensions?: string[]
  sizeRange?: { min?: number; max?: number }
  dateRange?: { from?: string; to?: string }
  pathPattern?: string
  isRegex: boolean
  regexPattern?: string
}

/**
 * SearchBox 组件 Props
 */
export interface SearchBoxProps {
  /**
   * 搜索关键词
   */
  modelValue: string
  /**
   * 是否加载中
   */
  loading?: boolean
  /**
   * 占位提示文本
   */
  placeholder?: string
  /**
   * 是否显示高级筛选选项
   */
  showAdvancedFilters?: boolean
  /**
   * 防抖延迟时间（毫秒）
   */
  debounceDelay?: number
}

/**
 * SearchBox 组件 Emits
 */
export interface SearchBoxEmits {
  (e: 'update:modelValue', value: string): void
  (e: 'search', query: string): void
  (e: 'clear'): void
  (e: 'focus'): void
  (e: 'blur'): void
}

/**
 * 搜索框组件
 * 支持基础搜索和高级语法（ext:, size:, date:, path:, regex:）
 *
 * @example
 * ```vue
 * <SearchBox v-model="query" @search="handleSearch" />
 * ```
 */
export default defineComponent({
  name: 'SearchBox',

  props: {
    modelValue: {
      type: String,
      required: true
    },
    loading: {
      type: Boolean,
      default: false
    },
    placeholder: {
      type: String,
      default: '搜索文件... 支持语法：ext:pdf size:>10mb'
    },
    showAdvancedFilters: {
      type: Boolean,
      default: true
    },
    debounceDelay: {
      type: Number,
      default: 300
    }
  },

  emits: ['update:modelValue', 'search', 'clear', 'focus', 'blur'],

  setup(props, { emit }) {
    /**
     * 内部输入值
     */
    const internalValue = ref(props.modelValue)

    /**
     * 是否聚焦
     */
    const isFocused = ref(false)

    /**
     * 解析后的查询对象
     */
    const parsedQuery = computed<ParsedQuery>(() => {
      return parseSearchQuery(internalValue.value)
    })

    /**
     * 是否有高级语法
     */
    const hasAdvancedSyntax = computed(() => {
      const { extensions, sizeRange, dateRange, pathPattern, isRegex } = parsedQuery.value
      return !!(extensions?.length || sizeRange || dateRange || pathPattern || isRegex)
    })

    /**
     * 解析搜索查询字符串
     */
    function parseSearchQuery(query: string): ParsedQuery {
      const result: ParsedQuery = {
        keywords: [],
        isRegex: false
      }

      if (!query.trim()) {
        return result
      }

      const parts = query.split(/\s+/).filter(Boolean)

      for (const part of parts) {
        // 正则模式
        if (part.startsWith('regex:')) {
          result.isRegex = true
          result.regexPattern = part.slice(6)
          continue
        }

        // 扩展名筛选
        if (part.toLowerCase().startsWith('ext:')) {
          const exts = part.slice(4).split(',').map(e => e.trim().toLowerCase())
          result.extensions = [...(result.extensions || []), ...exts]
          continue
        }

        // 大小筛选
        const sizeMatch = part.match(/^size:(<|>|)?(\d+(?:\.\d+)?)(kb|mb|gb|tb)?$/i)
        if (sizeMatch) {
          const operator = sizeMatch[1] || ''
          const value = parseFloat(sizeMatch[2])
          const unit = (sizeMatch[3] || 'mb').toLowerCase()
          
          let bytes = value
          switch (unit) {
            case 'kb': bytes *= 1024; break
            case 'mb': bytes *= 1024 * 1024; break
            case 'gb': bytes *= 1024 * 1024 * 1024; break
            case 'tb': bytes *= 1024 * 1024 * 1024 * 1024; break
          }

          if (!result.sizeRange) {
            result.sizeRange = {}
          }

          if (operator === '<') {
            result.sizeRange.max = bytes
          } else if (operator === '>') {
            result.sizeRange.min = bytes
          } else {
            // 范围匹配 size:min-max 或单一值
            const rangeMatch = part.match(/^size:(\d+)-(\d+)(kb|mb|gb|tb)?$/i)
            if (rangeMatch) {
              result.sizeRange.min = parseFloat(rangeMatch[1])
              result.sizeRange.max = parseFloat(rangeMatch[2])
            } else {
              // 精确大小（近似）
              result.sizeRange.min = bytes * 0.9
              result.sizeRange.max = bytes * 1.1
            }
          }
          continue
        }

        // 日期筛选
        if (part.toLowerCase().startsWith('date:')) {
          const dateStr = part.slice(5)
          if (!result.dateRange) {
            result.dateRange = {}
          }

          if (dateStr === 'today') {
            const today = new Date()
            result.dateRange.from = today.toISOString().split('T')[0]
            today.setDate(today.getDate() + 1)
            result.dateRange.to = today.toISOString().split('T')[0]
          } else if (dateStr === 'yesterday') {
            const yesterday = new Date()
            yesterday.setDate(yesterday.getDate() - 1)
            result.dateRange.from = yesterday.toISOString().split('T')[0]
            result.dateRange.to = yesterday.toISOString().split('T')[0]
          } else if (dateStr.startsWith('>')) {
            result.dateRange.from = dateStr.slice(1)
          } else if (dateStr.startsWith('<')) {
            result.dateRange.to = dateStr.slice(1)
          } else {
            // 具体日期
            result.dateRange.from = dateStr
            result.dateRange.to = dateStr
          }
          continue
        }

        // 路径筛选
        if (part.toLowerCase().startsWith('path:')) {
          result.pathPattern = part.slice(5)
          continue
        }

        // 通配符或普通关键词
        if (part.includes('*') || part.includes('?')) {
          result.keywords.push(part.replace(/\*/g, '%').replace(/\?/g, '_'))
        } else {
          result.keywords.push(part)
        }
      }

      return result
    }

    /**
     * 防抖搜索函数
     */
    const debouncedSearch = debounce((value: string) => {
      emit('update:modelValue', value)
      emit('search', value)
    }, props.debounceDelay)

    /**
     * 处理输入变化
     */
    function handleInput(value: string): void {
      internalValue.value = value
      debouncedSearch(value)
    }

    /**
     * 处理回车键
     */
    function handleKeydown(event: KeyboardEvent): void {
      if (event.key === 'Enter') {
        event.preventDefault()
        debouncedSearch.cancel()
        emit('update:modelValue', internalValue.value)
        emit('search', internalValue.value)
      } else if (event.key === 'Escape') {
        handleClear()
      }
    }

    /**
     * 清空搜索
     */
    function handleClear(): void {
      internalValue.value = ''
      emit('update:modelValue', '')
      emit('clear')
    }

    /**
     * 聚焦处理
     */
    function handleFocus(): void {
      isFocused.value = true
      emit('focus')
    }

    /**
     * 失焦处理
     */
    function handleBlur(): void {
      isFocused.value = false
      emit('blur')
    }

    watch(() => props.modelValue, (newVal) => {
      if (newVal !== internalValue.value) {
        internalValue.value = newVal
      }
    })

    return () => (
      <div class={['search-box', { 'search-box--focused': isFocused.value }]}>
        <v-text-field
          model-value={internalValue.value}
          onUpdate:model-value={handleInput}
          placeholder={props.placeholder}
          prepend-inner-icon="mdi-magnify"
          variant={isFocused.value ? 'outlined' : 'solo'}
          density="compact"
          clearable
          hide-details
          loading={props.loading}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeydown={handleKeydown}
          class="search-input"
        />

        {/* 高级语法提示 */}
        {hasAdvancedSyntax.value && (
          <div class="syntax-hint">
            <v-chip size="x-small" color="info" variant="tonal">
              <v-icon icon="mdi-code-tags" size="12" start></v-icon>
              高级语法已启用
            </v-chip>
            
            {parsedQuery.value.extensions && (
              <v-chip size="x-small" color="success" variant="tonal" class="ml-1">
                ext: {parsedQuery.value.extensions.join(', ')}
              </v-chip>
            )}
            
            {parsedQuery.value.sizeRange && (
              <v-chip size="x-small" color="warning" variant="tonal" class="ml-1">
                size: {parsedQuery.value.sizeRange.min ? `>${formatSize(parsedQuery.value.sizeRange.min)}` : ''}{parsedQuery.value.sizeRange.max ? `<${formatSize(parsedQuery.value.sizeRange.max)}` : ''}
              </v-chip>
            )}
          </div>
        )}

        {/* 快捷语法帮助 */}
        {isFocused.value && props.showAdvancedFilters && !internalValue.value && (
          <div class="syntax-help">
            <div class="help-title">支持的搜索语法：</div>
            <div class="help-items">
              <code>{'ext:pdf'}</code>
              <code>{'size:>10mb'}</code>
              <code>{'date:today'}</code>
              <code>{'path:downloads'}</code>
              <code>{'*.js'}</code>
            </div>
          </div>
        )}
      </div>
    )
  }
})

/**
 * 格式化字节数为可读字符串
 */
function formatSize(bytes: number): string {
  if (!bytes) return '0B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024
    i++
  }
  return `${bytes.toFixed(1)}${units[i]}`
}
