/**
 * DOM 相关工具函数
 */

/**
 * HTML 转义
 * @param html - 原始 HTML 字符串
 * @returns 转义后的字符串
 */
export function escapeHtml(html: string): string {
  const div = document.createElement('div')
  div.textContent = html
  return div.innerHTML
}

/**
 * 高亮代码中的关键字
 * @param code - 代码字符串
 * @param keyword - 要高亮的关键字
 * @returns 带高亮标记的 HTML 字符串
 */
export function highlightCode(code: string, keyword: string): string {
  if (!keyword) return escapeHtml(code)

  const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escapedKeyword})`, 'gi')

  return escapeHtml(code).replace(
    regex,
    '<mark style="background: yellow; color: black;">$1</mark>'
  )
}

/**
 * 复制文本到剪贴板
 * @param text - 要复制的文本
 */
export async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
  } catch (err) {
    // 降级方案
    const textarea = document.createElement('textarea')
    textarea.value = text
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
  }
}
