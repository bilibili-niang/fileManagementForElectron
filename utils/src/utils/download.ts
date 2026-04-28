/**
 * 下载相关工具函数
 */

/**
 * 通过 URL 下载文件
 * @param url - 文件下载链接
 * @param filename - 下载后的文件名(可选)
 */
export function downloadByUrl(url: string, filename?: string): void {
  const a = document.createElement('a')
  a.href = url
  if (filename) {
    a.download = filename
  }
  a.target = '_blank'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

/**
 * 下载 Blob 数据为文件
 * @param blob - Blob 数据
 * @param filename - 下载后的文件名
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob)
  downloadByUrl(url, filename)
  window.URL.revokeObjectURL(url)
}
