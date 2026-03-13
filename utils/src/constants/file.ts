/**
 * 文件相关常量
 */

/**
 * 文件分类与扩展名映射
 */
export const FILE_CATEGORIES = {
  images: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'bmp', 'webp', 'ico'],
  documents: ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'xls', 'xlsx', 'ppt', 'pptx', 'csv'],
  code: ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'h', 'cs', 'go', 'rs', 'php', 'rb', 'swift', 'kt', 'vue', 'html', 'css', 'scss', 'json', 'xml', 'yaml', 'sql'],
  videos: ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'm4v'],
  audio: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a'],
  archives: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'],
  executables: ['exe', 'msi', 'app', 'dmg', 'deb', 'rpm', 'bat', 'sh']
} as const

export type FileCategory = keyof typeof FILE_CATEGORIES

/**
 * 扩展名到分类的反向映射
 */
export const EXTENSION_TO_CATEGORY: Record<string, FileCategory> = Object.entries(
  FILE_CATEGORIES
).reduce((acc, [category, extensions]) => {
  extensions.forEach(ext => {
    acc[ext] = category as FileCategory
  })
  return acc
}, {} as Record<string, FileCategory>)

/**
 * 文件类型选项(用于下拉选择)
 */
export const FILE_TYPE_OPTIONS = [
  { title: '全部', value: 'all' },
  { title: '图片', value: 'images' },
  { title: '文档', value: 'documents' },
  { title: '代码', value: 'code' },
  { title: '视频', value: 'videos' },
  { title: '音频', value: 'audio' },
  { title: '压缩包', value: 'archives' },
  { title: '可执行文件', value: 'executables' }
]
