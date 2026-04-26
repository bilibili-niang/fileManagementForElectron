/**
 * 文件分类相关类型定义和工具函数
 */

/**
 * 文件分类枚举
 */
export type FileCategory =
  | 'all'
  | 'image'
  | 'video'
  | 'audio'
  | 'document'
  | 'code'
  | 'archive'
  | 'executable'

/**
 * 分类配置接口
 */
export interface CategoryConfig {
  key: FileCategory
  label: string
  icon: string
  extensions: string[]
  color: string
}

/**
 * 内置分类配置列表
 */
export const CATEGORY_CONFIGS: CategoryConfig[] = [
  {
    key: 'image',
    label: '图片',
    icon: 'mdi-image',
    extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico'],
    color: '#4CAF50'
  },
  {
    key: 'video',
    label: '视频',
    icon: 'mdi-video',
    extensions: ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'],
    color: '#FF9800'
  },
  {
    key: 'audio',
    label: '音频',
    icon: 'mdi-music',
    extensions: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a'],
    color: '#2196F3'
  },
  {
    key: 'document',
    label: '文档',
    icon: 'mdi-file-document',
    extensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'],
    color: '#F44336'
  },
  {
    key: 'code',
    label: '代码',
    icon: 'mdi-code-braces',
    extensions: [
      'js', 'ts', 'vue', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp',
      'h', 'hpp', 'cs', 'go', 'rs', 'rb', 'php', 'swift', 'kt',
      'html', 'css', 'scss', 'sass', 'less', 'json', 'xml', 'yaml', 'yml'
    ],
    color: '#9C27B0'
  },
  {
    key: 'archive',
    label: '压缩包',
    icon: 'mdi-folder-zip',
    extensions: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'],
    color: '#795548'
  },
  {
    key: 'executable',
    label: '可执行',
    icon: 'mdi-cog',
    extensions: ['exe', 'msi', 'dmg', 'pkg', 'deb', 'rpm', 'appimage'],
    color: '#607D8B'
  }
]

/**
 * 根据扩展名获取对应的分类
 * @param extension - 文件扩展名（不含点）
 * @returns 分类配置，未找到返回 null
 */
export function getCategoryByExtension(extension: string): CategoryConfig | null {
  const ext = extension.toLowerCase()
  return CATEGORY_CONFIGS.find(config => config.extensions.includes(ext)) || null
}

/**
 * 根据分类 key 获取配置
 * @param key - 分类标识
 * @returns 分类配置
 */
export function getCategoryConfig(key: FileCategory): CategoryConfig | undefined {
  if (key === 'all') {
    return undefined
  }
  return CATEGORY_CONFIGS.find(config => config.key === key)
}
