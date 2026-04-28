/**
 * 格式化工具函数
 */

/**
 * 格式化文件大小
 * @param bytes - 字节数
 * @returns 格式化后的字符串,如 "1.5 MB"
 */
export function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

/**
 * 格式化日期时间
 * @param dateString - ISO 日期字符串
 * @returns 本地化日期时间字符串
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN')
}

/**
 * 格式化时间(相对时间)
 * @param dateString - ISO 日期字符串
 * @returns 相对时间,如 "2分钟前"
 */
export function formatTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 30) return `${days}天前`

  return formatDate(dateString)
}

/**
 * 格式化剩余时间
 * @param seconds - 剩余秒数
 * @returns 格式化后的字符串,如 "3分25秒"
 */
export function formatRemainingTime(seconds: number): string {
  if (seconds <= 0) return ''
  if (seconds < 60) return `${seconds}秒`
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}分${secs}秒`
  }
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours}小时${minutes}分`
}
