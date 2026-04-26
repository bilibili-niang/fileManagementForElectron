import { defineComponent, ref, PropType, watch, computed } from 'vue'

/**
 * 预览文件信息接口
 */
export interface PreviewFileInfo {
  id: number
  name: string
  path: string
  extension: string
  size: number
  modified_time: string
  created_time: string
}

/**
 * FilePreviewPanel 组件 Props
 */
export interface FilePreviewPanelProps {
  /**
   * 是否显示预览面板
   */
  modelValue: boolean
  /**
   * 当前预览的文件信息
   */
  file?: PreviewFileInfo | null
  /**
   * 预览内容（HTML 字符串）
   */
  content?: string
  /**
   * 面板宽度（像素）
   */
  width?: number
  /**
   * 最小宽度（像素）
   */
  minWidth?: number
  /**
   * 最大宽度（像素）
   */
  maxWidth?: number
}

/**
 * FilePreviewPanel 组件 Emits
 */
export interface FilePreviewPanelEmits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'close'): void
  (e: 'resize', width: number): void
  (e: 'preview-file', file: PreviewFileInfo): void
}

/**
 * 文件预览面板组件
 * 支持拖拽调整宽度、多种触发方式、Tab 切换
 *
 * @example
 * ```vue
 * <FilePreviewPanel v-model="showPreview" :file="currentFile" :content="previewContent" />
 * ```
 */
export default defineComponent({
  name: 'FilePreviewPanel',

  props: {
    modelValue: {
      type: Boolean,
      default: false
    },
    file: {
      type: Object as PropType<PreviewFileInfo>,
      default: null
    },
    content: {
      type: String,
      default: ''
    },
    width: {
      type: Number,
      default: 350
    },
    minWidth: {
      type: Number,
      default: 250
    },
    maxWidth: {
      type: Number,
      default: 600
    }
  },

  emits: ['update:modelValue', 'close', 'resize', 'preview-file'],

  setup(props, { emit }) {
    /**
     * 内部面板宽度
     */
    const panelWidth = ref(props.width)

    /**
     * 是否正在拖拽调整大小
     */
    const isResizing = ref(false)

    /**
     * 当前激活的 Tab
     */
    const activeTab = ref<'preview' | 'info' | 'related'>('preview')

    /**
     * 拖拽起始位置
     */
    let resizeStartX = 0
    let resizeStartWidth = 0

    /**
     * 格式化文件大小
     */
    const formattedSize = computed(() => {
      if (!props.file) return ''
      return formatFileSize(props.file.size)
    })

    /**
     * 格式化修改时间
     */
    const formattedModifiedTime = computed(() => {
      if (!props.file?.modified_time) return ''
      return new Date(props.file.modified_time).toLocaleString('zh-CN')
    })

    /**
     * 格式化创建时间
     */
    const formattedCreatedTime = computed(() => {
      if (!props.file?.created_time) return ''
      return new Date(props.file.created_time).toLocaleString('zh-CN')
    })

    /**
     * 开始拖拽调整大小
     */
    function startResize(event: MouseEvent): void {
      isResizing.value = true
      resizeStartX = event.clientX
      resizeStartWidth = panelWidth.value

      document.addEventListener('mousemove', handleResize)
      document.addEventListener('mouseup', stopResize)
      event.preventDefault()
    }

    /**
     * 拖拽中
     */
    function handleResize(event: MouseEvent): void {
      if (!isResizing.value) return

      const deltaX = event.clientX - resizeStartX
      let newWidth = resizeStartWidth - deltaX // 向左拖拽增加宽度

      newWidth = Math.max(props.minWidth, Math.min(props.maxWidth, newWidth))
      panelWidth.value = newWidth
      emit('resize', newWidth)
    }

    /**
     * 停止拖拽
     */
    function stopResize(): void {
      isResizing.value = false
      document.removeEventListener('mousemove', handleResize)
      document.removeEventListener('mouseup', stopResize)
    }

    /**
     * 关闭面板
     */
    function handleClose(): void {
      emit('update:modelValue', false)
      emit('close')
    }

    /**
     * 双击标题栏切换收起状态
     */
    function handleTitleDoubleClick(): void {
      if (panelWidth.value === props.minWidth) {
        panelWidth.value = props.width
        emit('resize', props.width)
      } else {
        panelWidth.value = props.minWidth
        emit('resize', props.minWidth)
      }
    }

    watch(() => props.modelValue, (newVal) => {
      if (newVal && props.file) {
        activeTab.value = 'preview'
      }
    })

    return () => (
      <div
        class={['file-preview-panel', { 'file-preview-panel--visible': props.modelValue }]}
        style={{ width: `${panelWidth.value}px` }}
      >
        {/* 标题栏 */}
        <div class="preview-header" onDblclick={handleTitleDoubleClick}>
          <div class="preview-title">
            <v-icon icon={getFileIcon(props.file?.extension || '')} size="18" class="mr-2" />
            <span class="title-text">{props.file?.name || '预览'}</span>
          </div>
          
          <div class="preview-actions">
            <v-btn
              icon="mdi-window-minimize"
              variant="text"
              density="compact"
              size="small"
              title="最小化"
              onClick={() => {
                panelWidth.value = props.minWidth
                emit('resize', props.minWidth)
              }}
            />
            <v-btn
              icon="mdi-close"
              variant="text"
              density="compact"
              size="small"
              title="关闭"
              onClick={handleClose}
            />
          </div>

          {/* 拖拽手柄 */}
          <div
            class={['resize-handle', { 'resize-handle--active': isResizing.value }]}
            onMousedown={startResize}
          />
        </div>

        {/* Tab 切换栏 */}
        <div class="preview-tabs">
          <button
            class={['tab-btn', { 'tab-btn--active': activeTab.value === 'preview' }]}
            onClick={() => (activeTab.value = 'preview')}
          >
            <v-icon icon="mdi-eye" size="14" start></v-icon>
            预览
          </button>
          <button
            class={['tab-btn', { 'tab-btn--active': activeTab.value === 'info' }]}
            onClick={() => (activeTab.value = 'info')}
          >
            <v-icon icon="mdi-information" size="14" start></v-icon>
            信息
          </button>
        </div>

        {/* 内容区域 */}
        <div class="preview-content">
          {/* 预览 Tab */}
          {activeTab.value === 'preview' && (
            <div class="preview-tab-content" v-html={props.content || '<div class="empty-hint">选择一个文件以预览</div>'} />
          )}

          {/* 信息 Tab */}
          {activeTab.value === 'info' && props.file && (
            <div class="info-tab-content">
              <div class="info-row">
                <span class="info-label">文件名</span>
                <span class="info-value">{props.file.name}</span>
              </div>
              <div class="info-row">
                <span class="info-label">类型</span>
                <span class="info-value">{props.file.extension.toUpperCase()}</span>
              </div>
              <div class="info-row">
                <span class="info-label">大小</span>
                <span class="info-value">{formattedSize.value}</span>
              </div>
              <div class="info-row">
                <span class="info-label">修改时间</span>
                <span class="info-value">{formattedModifiedTime.value}</span>
              </div>
              <div class="info-row">
                <span class="info-label">创建时间</span>
                <span class="info-value">{formattedCreatedTime.value}</span>
              </div>
              <div class="info-row">
                <span class="info-label">路径</span>
                <span class="info-value info-value--path">{props.file.path}</span>
              </div>
            </div>
          )}
        </div>

        {/* 底部状态栏 */}
        {props.file && (
          <div class="preview-footer">
            <span>{formattedSize.value}</span>
            <span>•</span>
            <span>修改于 {formattedModifiedTime.value}</span>
          </div>
        )}
      </div>
    )
  }
})

/**
 * 获取文件类型对应的图标名称
 */
function getFileIcon(extension: string): string {
  const ext = extension.toLowerCase()
  
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext)) {
    return 'mdi-image'
  }
  if (['mp4', 'avi', 'mkv', 'mov', 'wmv'].includes(ext)) {
    return 'mdi-video'
  }
  if (['mp3', 'wav', 'flac', 'aac'].includes(ext)) {
    return 'mdi-music'
  }
  if (['pdf'].includes(ext)) {
    return 'mdi-file-pdf-box'
  }
  if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) {
    return 'mdi-file-document'
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return 'mdi-folder-zip'
  }
  if (['js', 'ts', 'vue', 'py', 'java', 'go', 'rs'].includes(ext)) {
    return 'mdi-code-braces'
  }
  
  return 'mdi-file'
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes: number): string {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024
    i++
  }
  return `${bytes.toFixed(1)} ${units[i]}`
}
