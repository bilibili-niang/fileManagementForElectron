import VConsole from 'vconsole'
import { isMobile } from '@/utils/device'

/**
 * VConsole 实例
 */
let vConsole: VConsole | null = null

/**
 * 初始化 VConsole
 * 仅在移动端环境初始化
 */
export function initVConsole(): void {
  if (isMobile() && !vConsole) {
    vConsole = new VConsole({
      theme: 'light'
    })
    console.log('[VConsole] 移动端调试工具已初始化')
  }
}

/**
 * 销毁 VConsole
 */
export function destroyVConsole(): void {
  if (vConsole) {
    vConsole.destroy()
    vConsole = null
    console.log('[VConsole] 已销毁')
  }
}

/**
 * 获取 VConsole 实例
 */
export function getVConsole(): VConsole | null {
  return vConsole
}
