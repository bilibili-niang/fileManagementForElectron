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
