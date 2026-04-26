/**
 * 环境检测工具函数
 */

/**
 * 判断是否运行在 Electron 环境中
 * 通过 preload 脚本注入的 electronAPI.isElectron 标识判断
 */
export function isElectron(): boolean {
  return !!(window as any).electronAPI?.isElectron
}
