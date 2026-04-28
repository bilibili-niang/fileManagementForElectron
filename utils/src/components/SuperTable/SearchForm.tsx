import { defineComponent, ref, h, type VNode } from 'vue'
import type { SearchField } from './types'

/**
 * 搜索表单组件Props
 */
interface SearchFormProps {
  fields: SearchField[]
  onSearch: (values: Record<string, any>) => void
  onReset?: () => void
}

/**
 * 搜索表单组件
 */
export const SearchForm = defineComponent({
  name: 'SearchForm',

  props: ['fields', 'onSearch', 'onReset'],

  setup(props: SearchFormProps) {
    const formValues = ref<Record<string, any>>({})

    /**
     * 处理搜索
     */
    const handleSearch = (): void => {
      props.onSearch(formValues.value)
    }

    /**
     * 处理重置
     */
    const handleReset = (): void => {
      formValues.value = {}
      if (props.onReset) {
        props.onReset()
      }
      props.onSearch({})
    }

    /**
     * 渲染搜索字段
     */
    const renderField = (field: SearchField): VNode => {
      const commonProps = {
        modelValue: formValues.value[field.key],
        'onUpdate:modelValue': (val: any) => {
          formValues.value[field.key] = val
        },
        label: field.label,
        placeholder: field.placeholder,
        density: 'compact' as const,
        variant: 'outlined' as const,
        hideDetails: true,
        class: 'mr-2 mb-2',
        style: { width: '200px' }
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

        case 'input':
        default:
          return <v-text-field {...commonProps}></v-text-field>
      }
    }

    return () => (
      <div class="super-table-search-form">
        <div class="d-flex flex-wrap align-center">
          {props.fields.map((field) => (
            <div key={field.key}>{renderField(field)}</div>
          ))}

          <div class="d-flex align-center mb-2">
            <v-btn
              color="primary"
              size="small"
              prepend-icon="mdi-magnify"
              onClick={handleSearch}
              class="mr-2"
            >
              搜索
            </v-btn>

            {props.onReset && (
              <v-btn
                variant="text"
                size="small"
                prepend-icon="mdi-refresh"
                onClick={handleReset}
              >
                重置
              </v-btn>
            )}
          </div>
        </div>
      </div>
    )
  }
})

export default SearchForm
