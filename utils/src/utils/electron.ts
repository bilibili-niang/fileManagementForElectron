import { isElectron } from './env'

/**
 * Electron 相关工具函数
 */

/**
 * 在系统文件管理器中打开文件夹
 * @param path - 文件夹路径
 * @returns Promise<void>
 */
export async function openFolderInExplorer(path: string): Promise<void> {
  if (!isElectron()) {
    throw new Error('此功能仅在 Electron 环境中可用')
  }

  const electronAPI = (window as any).electronAPI
  if (!electronAPI?.showItemInFolder) {
    throw new Error('Electron API 不可用')
  }

  await electronAPI.showItemInFolder(path)
}

/**
 * 使用系统默认程序打开文件
 * @param path - 文件路径
 * @returns Promise<void>
 */
export async function openFileWithDefaultApp(path: string): Promise<void> {
  if (!isElectron()) {
    throw new Error('此功能仅在 Electron 环境中可用')
  }

  const electronAPI = (window as any).electronAPI
  if (!electronAPI?.openPath) {
    throw new Error('Electron API 不可用')
  }

  await electronAPI.openPath(path)
}
