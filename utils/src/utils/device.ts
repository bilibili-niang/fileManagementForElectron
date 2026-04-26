/**
 * 判断是否为移动设备
 */
export function isMobile(): boolean {
  const userAgent = navigator.userAgent.toLowerCase()
  const mobileKeywords = [
    'android',
    'iphone',
    'ipad',
    'ipod',
    'windows phone',
    'blackberry',
    'mobile',
    'tablet'
  ]

  return mobileKeywords.some(keyword => userAgent.includes(keyword))
}

/**
 * 判断是否为 iOS 设备
 */
export function isIOS(): boolean {
  const userAgent = navigator.userAgent.toLowerCase()
  return /iphone|ipad|ipod/.test(userAgent)
}

/**
 * 判断是否为 Android 设备
 */
export function isAndroid(): boolean {
  const userAgent = navigator.userAgent.toLowerCase()
  return userAgent.includes('android')
}

/**
 * 判断是否为微信环境
 */
export function isWechat(): boolean {
  const userAgent = navigator.userAgent.toLowerCase()
  return userAgent.includes('micromessenger')
}
