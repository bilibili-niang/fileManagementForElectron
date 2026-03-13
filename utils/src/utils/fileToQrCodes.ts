import QRCode from 'qrcode'

/**
 * 文件分块转二维码配置
 */
interface QrCodeChunkConfig {
  chunkSize: number
  qrSize: number
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H'
}

/**
 * 默认配置
 */
const defaultConfig: QrCodeChunkConfig = {
  chunkSize: 2000,
  qrSize: 512,
  errorCorrectionLevel: 'M'
}

/**
 * 将文件转换为二维码数据URL数组
 * @param file - 文件对象
 * @param config - 配置选项
 * @returns 二维码数据URL数组
 */
export async function fileToQrCodes(
  file: File,
  config: Partial<QrCodeChunkConfig> = {}
): Promise<string[]> {
  const finalConfig = { ...defaultConfig, ...config }

  // 读取文件为 base64
  const base64 = await fileToBase64(file)

  // 分块
  const chunks = splitIntoChunks(base64, finalConfig.chunkSize)

  // 生成二维码
  const qrCodes: string[] = []
  for (let i = 0; i < chunks.length; i++) {
    const chunkData = JSON.stringify({
      index: i,
      total: chunks.length,
      filename: file.name,
      data: chunks[i]
    })

    const dataUrl = await QRCode.toDataURL(chunkData, {
      width: finalConfig.qrSize,
      margin: 2,
      errorCorrectionLevel: finalConfig.errorCorrectionLevel,
      type: 'image/png'
    })

    qrCodes.push(dataUrl)
  }

  return qrCodes
}

/**
 * 文件转 base64
 * @param file - 文件对象
 * @returns base64 字符串
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * 将字符串分块
 * @param str - 原始字符串
 * @param chunkSize - 每块大小
 * @returns 分块后的数组
 */
function splitIntoChunks(str: string, chunkSize: number): string[] {
  const chunks: string[] = []
  for (let i = 0; i < str.length; i += chunkSize) {
    chunks.push(str.slice(i, i + chunkSize))
  }
  return chunks
}

/**
 * 估算需要的二维码数量
 * @param fileSize - 文件大小(字节)
 * @param chunkSize - 每块大小
 * @returns 二维码数量
 */
export function estimateQrCodeCount(fileSize: number, chunkSize: number = 2000): number {
  // base64 编码后大小约为原文件的 4/3
  const base64Size = Math.ceil(fileSize * 4 / 3)
  return Math.ceil(base64Size / chunkSize)
}
