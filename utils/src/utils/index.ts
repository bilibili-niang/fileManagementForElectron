/**
 * 工具函数统一入口
 */

export {
  formatSize,
  formatDate,
  formatTime
} from './format'

export {
  getFileExtension,
  getFileCategory,
  isFileCategory,
  getCategoryDisplayName,
  formatFileSize
} from './file'

export {
  escapeHtml,
  highlightCode,
  copyToClipboard
} from './dom'

export {
  isElectron
} from './env'
