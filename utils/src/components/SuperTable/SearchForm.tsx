import { defineComponent, ref, h, type VNode, computed } from 'vue'
import type { SearchField, SearchConfig } from './types'

/**
 * 搜索表单组件Props
 */
interface SearchFormProps {
  fields: SearchField[]
  config?: SearchConfig
  values: Record<string, any>
  onSearch: (values: Record<string, any>) => void
  onReset?: () => void
  onChange?: (values: Record<string, any>) => void
  mode?: 'default' | 'compact' | 'toolbar'
}

/**
 * 搜索表单组件
 */
export const SearchForm = defineComponent({
  name: 'SearchForm',

  props: ['fields', 'config', 'values', 'onSearch', 'onReset', 'onChange', 'mode'],

  setup(props: SearchFormProps) {
    const formValues = ref<Record<string, any>>({ ...props.values })
    const showFilterDialog = ref(false)

    // 计算是否在紧凑模式
    const isCompact = computed(() => props.mode === 'compact' || props.mode === 'toolbar')

    // 获取紧凑模式下显示的字段
    const compactFields = computed(() => {
      return props.fields.filter(f => f.showInCompact !== false)
    })

    // 获取需要弹窗的字段（icon/text样式）
    const dialogFields = computed(() => {
      return props.fields.filter(f =>
        f.compactStyle === 'icon' || f.compactStyle === 'text'
      )
    })

    // 计算已选筛选条件数量
    const filterCount = computed(() => {
      return dialogFields.value.filter(f => {
        const value = formValues.value[f.key]
        return value !== undefined && value !== null && value !== ''
      }).length
    })

    /**
     * 处理搜索
     */
    const handleSearch = (): void => {
      props.onSearch({ ...formValues.value })
    }

    /**
     * 处理重置
     */
    const handleReset = (): void => {
      formValues.value = {}
      if (props.onReset) {
        props.onReset()
      }
      if (props.onChange) {
        props.onChange({})
      }
      props.onSearch({})
    }

    /**
     * 处理字段值变化
     */
    const handleFieldChange = (key: string, value: any): void => {
      formValues.value[key] = value
      if (props.onChange) {
        props.onChange({ ...formValues.value })
      }
    }

    /**
     * 渲染紧凑模式字段
     */
    const renderCompactField = (field: SearchField): VNode | null => {
      const value = formValues.value[field.key]
      const style = field.compactStyle || 'full'

      switch (style) {
        case 'full':
          return renderFullField(field)

        case 'icon':
          // 图标按钮，点击打开筛选弹窗
          const hasValue = value !== undefined && value !== null && value !== ''
          return (
            <v-btn
              icon
              size="small"
              variant={hasValue ? 'flat' : 'text'}
              color={hasValue ? 'primary' : undefined}
              onClick={() => showFilterDialog.value = true}
              class="mr-1"
            >
              <v-icon icon={field.compactIcon || getDefaultIcon(field.type)}></v-icon>
              {hasValue && props.config?.filterDialog?.showBadge !== false && (
                <v-badge
                  color={props.config?.filterDialog?.badgeColor || 'primary'}
                  content="1"
                  offset-x="-8"
                  offset-y="8"
                ></v-badge>
              )}
            </v-btn>
          )

        case 'chip':
          // Chip 样式，直接操作
          if (field.type === 'boolean') {
            const isActive = !!value
            const config = field.chipConfig
            return (
              <v-chip
                size="small"
                variant={isActive ? 'elevated' : 'outlined'}
                color={isActive ? (config?.activeColor || 'primary') : undefined}
                onClick={() => handleFieldChange(field.key, !isActive)}
                class="mr-1 cursor-pointer"
              >
                {isActive && config?.activeIcon && (
                  <v-icon icon={config.activeIcon} size="small" start></v-icon>
                )}
                {!isActive && config?.inactiveIcon && (
                  <v-icon icon={config.inactiveIcon} size="small" start></v-icon>
                )}
                {isActive ? (config?.activeText || field.label) : (config?.inactiveText || field.label)}
              </v-chip>
            )
          }
          // select 类型的 chip
          if (field.type === 'select') {
            const selectedOption = field.options?.find(o => o.value === value)
            return (
              <v-select
                modelValue={value}
                onUpdate:modelValue={(val: any) => handleFieldChange(field.key, val)}
                items={field.options || []}
                itemTitle="label"
                itemValue="value"
                density="compact"
                variant="outlined"
                hideDetails
                class="mr-1"
                style={{ width: field.compactWidth || '100px', minWidth: '80px' }}
              ></v-select>
            )
          }
          return renderFullField(field)

        case 'text':
          // 文本按钮
          return (
            <v-btn
              size="small"
              variant="text"
              prependIcon={field.textConfig?.icon || 'mdi-filter'}
              onClick={() => showFilterDialog.value = true}
              class="mr-1"
            >
              {field.textConfig?.label || field.label}
            </v-btn>
          )

        default:
          return renderFullField(field)
      }
    }

    /**
     * 渲染完整字段
     */
    const renderFullField = (field: SearchField): VNode => {
      const commonProps = {
        modelValue: formValues.value[field.key],
        'onUpdate:modelValue': (val: any) => handleFieldChange(field.key, val),
        label: field.label,
        placeholder: field.placeholder,
        density: 'compact' as const,
        variant: 'outlined' as const,
        hideDetails: true,
        class: 'mr-2 mb-2',
        style: { width: field.compactWidth || '150px' }
      }

      switch (field.type) {
        case 'select':
          return (
            <v-select
              {...commonProps}
              items={field.options || []}
              itemTitle="label"
              itemValue="value"
            ></v-select>
          )

        case 'date':
          return <v-text-field {...commonProps} type="date"></v-text-field>

        case 'number':
          return (
            <v-text-field
              {...commonProps}
              type="number"
              min={field.min}
              max={field.max}
            ></v-text-field>
          )

        case 'range':
          // 范围字段渲染为两个数字输入
          return (
            <div class="d-flex align-center mr-2 mb-2">
              <v-text-field
                modelValue={formValues.value[`${field.key}Min`]}
                onUpdate:modelValue={(val: any) => handleFieldChange(`${field.key}Min`, val)}
                placeholder={`最小${field.unit || ''}`}
                density="compact"
                variant="outlined"
                hideDetails
                type="number"
                style={{ width: '120px' }}
              ></v-text-field>
              <span class="mx-1">~</span>
              <v-text-field
                modelValue={formValues.value[`${field.key}Max`]}
                onUpdate:modelValue={(val: any) => handleFieldChange(`${field.key}Max`, val)}
                placeholder={`最大${field.unit || ''}`}
                density="compact"
                variant="outlined"
                hideDetails
                type="number"
                style={{ width: '120px' }}
              ></v-text-field>
            </div>
          )

        case 'boolean':
          return (
            <v-checkbox
              modelValue={!!formValues.value[field.key]}
              onUpdate:modelValue={(val: boolean) => handleFieldChange(field.key, val)}
              label={field.label}
              density="compact"
              hideDetails
              class="mr-2 mb-2"
            ></v-checkbox>
          )

        case 'custom':
          if (field.customRender) {
            return field.customRender({
              value: formValues.value[field.key],
              onChange: (val) => handleFieldChange(field.key, val),
              mode: isCompact.value ? 'compact' : 'default'
            }) as VNode
          }
          return <span>自定义字段</span>

        case 'input':
        default:
          return <v-text-field {...commonProps}></v-text-field>
      }
    }

    /**
     * 获取默认图标
     */
    const getDefaultIcon = (type: string): string => {
      switch (type) {
        case 'select': return 'mdi-filter-variant'
        case 'date': return 'mdi-calendar'
        case 'number':
        case 'range': return 'mdi-numeric'
        case 'boolean': return 'mdi-toggle-switch'
        default: return 'mdi-magnify'
      }
    }

    /**
     * 渲染筛选弹窗
     */
    const renderFilterDialog = (): VNode => {
      const dialogType = props.config?.filterDialog?.type || 'dropdown'
      const dialogTitle = props.config?.filterDialog?.title || '筛选条件'

      const dialogContent = (
        <div class="pa-4">
          {dialogFields.value.map(field => (
            <div key={field.key} class="mb-4">
              <div class="text-caption text-grey mb-1">{field.label}</div>
              {renderFullField(field)}
            </div>
          ))}
          <div class="d-flex justify-end mt-4">
            <v-btn variant="text" size="small" onClick={handleReset} class="mr-2">
              重置
            </v-btn>
            <v-btn color="primary" size="small" onClick={() => {
              handleSearch()
              showFilterDialog.value = false
            }}>
              确定
            </v-btn>
          </div>
        </div>
      )

      if (dialogType === 'dialog') {
        return (
          <v-dialog
            modelValue={showFilterDialog.value}
            onUpdate:modelValue={(val: boolean) => showFilterDialog.value = val}
            maxWidth={props.config?.filterDialog?.width || 400}
          >
            <v-card>
              <v-card-title class="text-h6">{dialogTitle}</v-card-title>
              <v-card-text>{dialogContent}</v-card-text>
            </v-card>
          </v-dialog>
        )
      }

      // dropdown 默认
      return (
        <v-menu
          modelValue={showFilterDialog.value}
          onUpdate:modelValue={(val: boolean) => showFilterDialog.value = val}
          closeOnContentClick={false}
          offset={4}
        >
          {{
            activator: ({ props: menuProps }: { props: any }) => (
              <v-btn
                {...menuProps}
                size="small"
                variant={filterCount.value > 0 ? 'elevated' : 'outlined'}
                color={filterCount.value > 0 ? 'primary' : undefined}
                prependIcon="mdi-filter-variant"
                class="mr-1"
              >
                筛选
                {filterCount.value > 0 && (
                  <v-badge
                    color={props.config?.filterDialog?.badgeColor || 'primary'}
                    content={filterCount.value}
                    inline
                  ></v-badge>
                )}
              </v-btn>
            ),
            default: () => dialogContent
          }}
        </v-menu>
      )
    }

    /**
     * 渲染搜索按钮
     */
    const renderSearchButton = (): VNode | null => {
      const btnConfig = props.config?.buttons?.search
      if (btnConfig?.show === false) return null

      return (
        <v-btn
          color={btnConfig?.color || 'primary'}
          size="small"
          variant={btnConfig?.variant || 'elevated'}
          prependIcon={btnConfig?.icon || 'mdi-magnify'}
          onClick={handleSearch}
          class="mr-1"
        >
          {btnConfig?.text || '搜索'}
        </v-btn>
      )
    }

    /**
     * 渲染重置按钮
     */
    const renderResetButton = (): VNode | null => {
      const btnConfig = props.config?.buttons?.reset
      if (btnConfig?.show === false) return null

      return (
        <v-btn
          color={btnConfig?.color}
          size="small"
          variant={btnConfig?.variant || 'text'}
          prependIcon={btnConfig?.icon || 'mdi-refresh'}
          onClick={handleReset}
          class="mr-1"
        >
          {btnConfig?.text || '重置'}
        </v-btn>
      )
    }

    return () => {
      // toolbar 模式：不换行，所有元素在一行
      if (props.mode === 'toolbar') {
        return (
          <div class="super-table-search-form d-flex align-center flex-wrap">
            {compactFields.value.map(field => (
              <div key={field.key}>{renderCompactField(field)}</div>
            ))}

            {/* 统一筛选按钮（如果有 icon/text 字段） */}
            {dialogFields.value.length > 0 && renderFilterDialog()}

            {/* 搜索按钮 */}
            {renderSearchButton()}

            {/* 重置按钮 */}
            {renderResetButton()}
          </div>
        )
      }

      // compact 模式：紧凑布局
      if (isCompact.value) {
        return (
          <div class="super-table-search-form">
            <div class="d-flex flex-wrap align-center">
              {compactFields.value.map(field => (
                <div key={field.key}>{renderCompactField(field)}</div>
              ))}

              {dialogFields.value.length > 0 && renderFilterDialog()}

              <div class="d-flex align-center mb-2">
                {renderSearchButton()}
                {renderResetButton()}
              </div>
            </div>
          </div>
        )
      }

      // default 模式：原有布局
      return (
        <div class="super-table-search-form">
          <div class="d-flex flex-wrap align-center">
            {props.fields.map(field => (
              <div key={field.key}>{renderFullField(field)}</div>
            ))}

            <div class="d-flex align-center mb-2">
              {renderSearchButton()}
              {renderResetButton()}
            </div>
          </div>
        </div>
      )
    }
  }
})

export default SearchForm
