import type { InjectionKey } from 'vue'

/**
 * Snackbar 选项
 */
export interface SnackbarOptions {
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  timeout?: number
}

/**
 * Snackbar 注入键
 */
export const ShowSnackbarKey: InjectionKey<(options: SnackbarOptions) => void> =
  Symbol('showSnackbar')

/**
 * 预览选项
 */
export interface PreviewOptions {
  path: string
  name: string
}

/**
 * 图片预览注入键
 */
export const OpenImagePreviewKey: InjectionKey<(options: PreviewOptions) => void> =
  Symbol('openImagePreview')

/**
 * PDF 预览注入键
 */
export const OpenPdfPreviewKey: InjectionKey<(options: PreviewOptions) => void> =
  Symbol('openPdfPreview')

/**
 * Docx 预览注入键
 */
export const OpenDocxPreviewKey: InjectionKey<(options: PreviewOptions) => void> =
  Symbol('openDocxPreview')

/**
 * 媒体播放器注入键
 */
export const OpenMediaPlayerKey: InjectionKey<(options: PreviewOptions) => void> =
  Symbol('openMediaPlayer')

/**
 * 文件编辑器注入键
 */
export const OpenFileEditorKey: InjectionKey<(path: string, name: string) => void> =
  Symbol('openFileEditor')
