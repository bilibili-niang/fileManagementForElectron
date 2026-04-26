import { defineComponent, ref, computed, onMounted, PropType, h } from 'vue'
import { searchApi } from '@/api'
import { CATEGORY_CONFIGS, type FileCategory } from '@/utils/fileCategory'

/**
 * 分类项接口
 */
interface CategoryItem {
  key: FileCategory
  label: string
  icon: string
  count: number
  color: string
}

/**
 * 文件分类侧边栏组件
 * 使用 Vuetify v-list 组件实现
 *
 * @example
 * ```vue
 * <CategorySidebar v-model="selectedCategory" @select="handleCategoryChange" />
 * ```
 */
export default defineComponent({
  name: 'CategorySidebar',

  props: {
    modelValue: {
      type: String as PropType<FileCategory>,
      default: 'all'
    },
    showExtraItems: {
      type: Boolean,
      default: true
    }
  },

  emits: ['update:modelValue', 'select', 'select-favorite', 'select-recent'],

  setup(props, { emit }) {
    /**
     * 各分类的文件数量统计
     */
    const counts = ref<Record<string, number>>({})

    /**
     * 加载状态
     */
    const loading = ref(false)

    /**
     * 构建分类列表
     */
    const categories = computed<CategoryItem[]>(() => {
      const allCount = Object.values(counts.value).reduce((sum, c) => sum + c, 0)

      return [
        {
          key: 'all',
          label: '全部文件',
          icon: 'mdi-folder-multiple-outline',
          count: allCount,
          color: '#1976D2'
        },
        ...CATEGORY_CONFIGS.map(config => ({
          key: config.key,
          label: config.label,
          icon: config.icon,
          count: counts.value[config.key] || 0,
          color: config.color
        }))
      ]
    })

    /**
     * 加载分类统计数据
     */
    async function loadCounts(): Promise<void> {
      loading.value = true
      try {
        const response = await searchApi.getFileCounts()
        if (response && (response as any).success) {
          const data = response as any
          counts.value = {
            all: data.all || 0,
            image: data.images || 0,
            video: data.videos || 0,
            audio: data.audio || 0,
            document: data.documents || 0,
            code: data.code || 0,
            archive: data.archives || 0,
            executable: data.executables || 0,
            other: data.other || 0
          }
        }
      } catch (error) {
        console.error('[CategorySidebar] Failed to load counts:', error)
      } finally {
        loading.value = false
      }
    }

    /**
     * 处理分类点击
     */
    function handleSelect(category: FileCategory): void {
      emit('update:modelValue', category)
      emit('select', category)
    }

    onMounted(() => {
      loadCounts()
    })

    return () => (
      <v-list
        density="compact"
        nav
        class="category-sidebar"
      >
        {/* 分类列表 */}
        {categories.value.map(item => (
          <v-list-item
            key={item.key}
            value={item.key}
            active={props.modelValue === item.key}
            onClick={() => handleSelect(item.key)}
            class="category-item"
          >
            {{
              prepend: () => (
                <v-icon
                  icon={item.icon}
                  size="20"
                  color={props.modelValue === item.key ? 'primary' : undefined}
                  style={{ color: props.modelValue === item.key ? undefined : item.color }}
                />
              ),
              default: () => (
                <v-list-item-title class="category-label">
                  {item.label}
                </v-list-item-title>
              ),
              append: () => (
                <v-chip
                  size="x-small"
                  variant="tonal"
                  color={props.modelValue === item.key ? 'primary' : undefined}
                  class="category-count"
                >
                  {item.count}
                </v-chip>
              )
            }}
          </v-list-item>
        ))}

        {/* 分隔线 */}
        {props.showExtraItems && (
          <>
            <v-divider class="my-2" />
            
            {/* 收藏夹 */}
            <v-list-item
              onClick={() => emit('select-favorite', null)}
              class="category-item category-item--extra"
            >
              {{
                prepend: () => (
                  <v-icon icon="mdi-star-outline" size="20" color="#FFB300" />
                ),
                default: () => (
                  <v-list-item-title class="category-label">
                    收藏夹
                  </v-list-item-title>
                )
              }}
            </v-list-item>

            {/* 最近访问 */}
            <v-list-item
              onClick={() => emit('select-recent', null)}
              class="category-item category-item--extra"
            >
              {{
                prepend: () => (
                  <v-icon icon="mdi-clock-outline" size="20" color="#757575" />
                ),
                default: () => (
                  <v-list-item-title class="category-label">
                    最近访问
                  </v-list-item-title>
                )
              }}
            </v-list-item>
          </>
        )}
      </v-list>
    )
  }
})
