import { EXTENSION_TO_CATEGORY } from '@/constants'

/**
 * 文件相关工具函数
 */

/**
 * 获取文件扩展名
 * @param filename - 文件名
 * @returns 扩展名(小写,不含点)
 */
export function getFileExtension(filename: string): string {
  const ext = filename.split('.').pop()
  return ext ? ext.toLowerCase() : ''
}

/**
 * 获取文件分类
 * @param filename - 文件名或扩展名
 * @returns 文件分类
 */
export function getFileCategory(filename: string): string {
  const ext = getFileExtension(filename)
  return EXTENSION_TO_CATEGORY[ext] || 'other'
}

/**
 * 检查文件是否属于某分类
 * @param filename - 文件名
 * @param category - 分类名
 */
export function isFileCategory(filename: string, category: string): boolean {
  return getFileCategory(filename) === category
}

/**
 * 获取分类的显示名称
 * @param category - 分类键名
 */
export function getCategoryDisplayName(category: string): string {
  const names: Record<string, string> = {
    images: '图片',
    documents: '文档',
    code: '代码',
    videos: '视频',
    audio: '音频',
    archives: '压缩包',
    executables: '可执行文件',
    other: '其他'
  }
  return names[category] || '其他'
}

/**
 * 格式化文件大小
 * @param bytes - 字节数
 * @returns 格式化后的大小字符串
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * 根据文件扩展名获取图标
 * @param extension - 文件扩展名(不含点)
 * @returns Material Design Icons 图标名称
 */
export function getFileIcon(extension: string): string {
  const ext = extension.toLowerCase()
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg']
  const docExts = ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'xls', 'xlsx', 'ppt', 'pptx']
  const videoExts = ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm']
  const audioExts = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a']
  const archiveExts = ['zip', 'rar', '7z', 'tar', 'gz', 'bz2']
  const codeExts = ['js', 'ts', 'jsx', 'tsx', 'vue', 'html', 'css', 'scss', 'json', 'xml', 'py', 'java', 'cpp', 'c', 'h', 'go', 'rs', 'php', 'rb']

  if (imageExts.includes(ext)) return 'mdi-image'
  if (docExts.includes(ext)) return 'mdi-file-document'
  if (videoExts.includes(ext)) return 'mdi-video'
  if (audioExts.includes(ext)) return 'mdi-music'
  if (archiveExts.includes(ext)) return 'mdi-zip-box'
  if (codeExts.includes(ext)) return 'mdi-code-json'

  return 'mdi-file'
}
