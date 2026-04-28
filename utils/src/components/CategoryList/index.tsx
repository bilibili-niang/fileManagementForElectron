import { defineComponent, computed, PropType, h } from 'vue'
import { useIndexingStore } from '@/stores/indexing'
import { CATEGORY_CONFIGS, type FileCategory } from '@/utils/fileCategory'
import './index.scss'

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
 * 文件分类列表组件
 * 公共组件，可在文件搜索页面和分类浏览页面复用
 *
 * @example
 * ```vue
 * <CategoryList v-model="selectedCategory" @select="handleCategoryChange" />
 * <CategoryList v-model="selectedCategory" show-extra-items @select="handleCategoryChange" @select-favorite="handleFavorite" @select-recent="handleRecent" />
 * ```
 */
export default defineComponent({
  name: 'CategoryList',

  props: {
    modelValue: {
      type: String as PropType<FileCategory>,
      default: 'all'
    },
    showAllItem: {
      type: Boolean,
      default: true
    },
    showExtraItems: {
      type: Boolean,
      default: false
    },
    density: {
      type: String as PropType<'compact' | 'comfortable' | 'default'>,
      default: 'compact'
    }
  },

  emits: ['update:modelValue', 'select', 'select-favorite', 'select-recent'],

  setup(props, { emit }) {
    /**
     * 使用全局索引进度 Store
     */
    const indexingStore = useIndexingStore()

    /**
     * 各分类的文件数量统计 - 从 Store 获取
     */
    const counts = computed(() => indexingStore.fileCounts)

    /**
     * 单数到复数的映射
     * Store 中使用复数形式，但 CATEGORY_CONFIGS 使用单数形式
     */
    const keyMapping: Record<string, string> = {
      'image': 'images',
      'video': 'videos',
      'audio': 'audio',
      'document': 'documents',
      'code': 'code',
      'archive': 'archives',
      'executable': 'executables'
    }

    /**
     * 构建分类列表
     */
    const categories = computed<CategoryItem[]>(() => {
      const allCount = counts.value.all || 0

      const items: CategoryItem[] = []

      // 添加"全部文件"选项
      if (props.showAllItem) {
        items.push({
          key: 'all',
          label: '全部文件',
          icon: 'mdi-folder-multiple-outline',
          count: allCount,
          color: '#1976D2'
        })
      }

      // 添加各分类
      CATEGORY_CONFIGS.forEach(config => {
        items.push({
          key: config.key,
          label: config.label,
          icon: config.icon,
          count: counts.value[keyMapping[config.key] as keyof typeof counts.value] || 0,
          color: config.color
        })
      })

      return items
    })

    /**
     * 处理分类点击
     */
    function handleSelect(category: FileCategory): void {
      emit('update:modelValue', category)
      emit('select', category)
    }

    /**
     * 处理收藏夹点击
     */
    function handleFavorite(): void {
      emit('select-favorite')
    }

    /**
     * 处理最近访问点击
     */
    function handleRecent(): void {
      emit('select-recent')
    }

    return () => (
      <v-list density={props.density} nav class="category-list">
        {/* 分类列表 */}
        {categories.value.map(category => (
          <v-list-item
            key={category.key}
            active={props.modelValue === category.key}
            onClick={() => handleSelect(category.key)}
            class="category-list-item"
          >
            {{
              prepend: () => (
                <v-icon
                  icon={category.icon}
                  size="small"
                  color={props.modelValue === category.key ? 'primary' : category.color}
                />
              ),
              title: () => (
                <span class="category-label">{category.label}</span>
              ),
              append: () => (
                <v-chip
                  size="x-small"
                  variant="tonal"
                  color={props.modelValue === category.key ? 'primary' : (category.count > 0 ? 'primary' : 'grey')}
                  class="category-count"
                >
                  {category.count}
                </v-chip>
              )
            }}
          </v-list-item>
        ))}

        {/* 分隔线和额外项目 */}
        {props.showExtraItems && (
          <>
            <v-divider class="my-2" />

            {/* 收藏夹 */}
            <v-list-item
              onClick={handleFavorite}
              class="category-list-item category-list-item--extra"
            >
              {{
                prepend: () => (
                  <v-icon
                    icon="mdi-star-outline"
                    size="small"
                    color="#FFB300"
                  />
                ),
                title: () => (
                  <span class="category-label">收藏夹</span>
                )
              }}
            </v-list-item>

            {/* 最近访问 */}
            <v-list-item
              onClick={handleRecent}
              class="category-list-item category-list-item--extra"
            >
              {{
                prepend: () => (
                  <v-icon
                    icon="mdi-clock-outline"
                    size="small"
                    color="#757575"
                  />
                ),
                title: () => (
                  <span class="category-label">最近访问</span>
                )
              }}
            </v-list-item>
          </>
        )}
      </v-list>
    )
  }
})
