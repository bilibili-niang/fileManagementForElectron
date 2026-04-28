import {
  defineComponent,
  computed,
  PropType,
  watch
} from 'vue'
import {
  CATEGORY_CONFIGS,
  type FileCategory
} from '@/utils/fileCategory'
import {useIndexingStore} from '@/stores/indexing'

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
  
  setup(props, {emit}) {
    /**
     * 使用全局索引进度 Store
     */
    const indexingStore = useIndexingStore()
    
    /**
     * 各分类的文件数量统计 - 从 Store 获取
     */
    const counts = computed(() => indexingStore.fileCounts)
    
    /**
     * 构建分类列表
     * 注意：Store 中使用复数形式（images, videos），但 CATEGORY_CONFIGS 使用单数形式（image, video）
     * 需要进行映射转换
     */
    const categories = computed<CategoryItem[]>(() => {
      // 使用后端返回的 all 作为总数，而不是累加各个分类
      const allCount = counts.value.all || 0
      
      // 单数到复数的映射
      const keyMapping: Record<string, string> = {
        'image': 'images',
        'video': 'videos',
        'audio': 'audio',
        'document': 'documents',
        'code': 'code',
        'archive': 'archives',
        'executable': 'executables'
      }
      
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
          count: counts.value[keyMapping[config.key] as keyof typeof counts.value] || 0,
          color: config.color
        }))
      ]
    })
    
    /**
     * 处理分类点击
     */
    function handleSelect(category: FileCategory): void {
      emit('update:modelValue', category)
      emit('select', category)
    }
    
    /**
     * 监听 Store 中的文件统计变化
     */
    watch(() => indexingStore.fileCounts, (newCounts) => {
      console.log('[CategorySidebar] File counts updated from store:', newCounts)
    }, {immediate: true})
    
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
                  style={{color: props.modelValue === item.key ? undefined : item.color}}
                />
              ),
              default: () => (
                <v-list-item-title
                  class="category-label">
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
            <v-divider class="my-2"/>
            
            {/* 收藏夹 */}
            <v-list-item
              onClick={() => emit('select-favorite', null)}
              class="category-item category-item--extra"
            >
              {{
                prepend: () => (
                  <v-icon icon="mdi-star-outline"
                          size="20"
                          color="#FFB300"/>
                ),
                default: () => (
                  <v-list-item-title
                    class="category-label">
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
                  <v-icon icon="mdi-clock-outline"
                          size="20"
                          color="#757575"/>
                ),
                default: () => (
                  <v-list-item-title
                    class="category-label">
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
