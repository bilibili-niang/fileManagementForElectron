/**
 * 文件搜索页面常量配置
 */

/**
 * 侧边栏宽度
 */
export const SIDEBAR_WIDTH = 200

/**
 * 默认每页显示文件数
 */
export const DEFAULT_PAGE_SIZE = 50

/**
 * 响应式断点（与 Vuetify 保持一致）
 */
export const BREAKPOINTS = {
  /** 手机端 */
  XS: 600,
  /** 平板端 */
  SM: 960,
  /** 桌面端 */
  MD: 1280,
  /** 大屏幕 */
  LG: 1920
} as const

/**
 * 预览面板默认宽度
 */
export const PREVIEW_PANEL_WIDTH = 350

/**
 * 预览面板最小宽度
 */
export const PREVIEW_PANEL_MIN_WIDTH = 250

/**
 * 预览面板最大宽度
 */
export const PREVIEW_PANEL_MAX_WIDTH = 600

/**
 * Snackbar 显示时长（毫秒）
 */
export const SNACKBAR_TIMEOUT = 3000

/**
 * 索引进度轮询间隔（毫秒）
 */
export const INDEX_POLLING_INTERVAL = 1000

/**
 * 文件分类配置
 */
export const FILE_CATEGORIES = {
  image: {
    label: '图片',
    extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico']
  },
  video: {
    label: '视频',
    extensions: ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm']
  },
  audio: {
    label: '音频',
    extensions: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a']
  },
  document: {
    label: '文档',
    extensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt']
  },
  code: {
    label: '代码',
    extensions: ['js', 'ts', 'vue', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'go', 'rs', 'rb', 'php', 'swift', 'kt', 'html', 'css', 'scss', 'json', 'xml', 'yaml', 'yml']
  },
  archive: {
    label: '压缩包',
    extensions: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz']
  },
  executable: {
    label: '可执行',
    extensions: ['exe', 'msi', 'dmg', 'pkg', 'deb', 'rpm', 'appimage']
  }
} as const
