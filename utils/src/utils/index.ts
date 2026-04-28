/**
 * 工具函数统一入口
 */

/**
 * 格式化相关
 */
export {
  formatSize,
  formatDate,
  formatTime,
  formatRemainingTime
} from './format'

/**
 * 文件相关
 */
export {
  getFileExtension,
  getFileCategory,
  isFileCategory,
  getCategoryDisplayName,
  formatFileSize,
  getFileIcon
} from './file'

/**
 * DOM 操作相关
 */
export {
  escapeHtml,
  highlightCode,
  copyToClipboard
} from './dom'

/**
 * 下载相关
 */
export {
  downloadByUrl,
  downloadBlob
} from './download'

/**
 * Electron 相关
 */
export {
  openFolderInExplorer,
  openFileWithDefaultApp
} from './electron'

/**
 * 环境检测
 */
export {
  isElectron
} from './env'
