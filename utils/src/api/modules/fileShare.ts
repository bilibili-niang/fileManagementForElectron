import { request } from '../client'

/**
 * 共享项类型
 */
export type ShareItemType = 'file' | 'text'

/**
 * 共享文件接口
 */
export interface ShareFile {
  name: string
  displayName: string
  type: ShareItemType
  size: number
  modifiedTime: string
  createdTime: string
  extension: string
  content?: string
}

/**
 * 文本记录接口
 */
export interface TextRecord {
  id: string
  name: string
  displayName: string
  type: 'text'
  content: string
  size: number
  createdTime: string
  modifiedTime: string
}

/**
 * 创建文本记录请求
 */
export interface CreateTextRecordRequest {
  displayName: string
  content: string
}

export interface FileListResponse {
  success: boolean
  files: ShareFile[]
  folder: string
}

export interface AccessInfo {
  success: boolean
  ip: string
  port: number
}

export const fileShareApi = {
  /**
   * 获取共享文件列表
   */
  async getFileList(): Promise<FileListResponse> {
    return request({
      path: '/api/file-share/list',
      method: 'GET'
    })
  },

  /**
   * 获取文件共享访问信息
   */
  async getAccessInfo(): Promise<AccessInfo> {
    return request({
      path: '/api/file-share/access-info',
      method: 'GET'
    })
  },

  /**
   * 上传文件
   * @param file - 文件对象
   * @param onProgress - 进度回调函数
   * @returns 返回包含 xhr 对象和 Promise 的对象,用于取消上传
   */
  uploadFile(
    file: File,
    onProgress?: (progress: number) => void
  ): {
    promise: Promise<{ success: boolean; file?: any; error?: string }>
    xhr: XMLHttpRequest
  } {
    const formData = new FormData()
    formData.append('file', file)

    const isDev = (import.meta as any).env?.DEV
    const API_BASE_URL = isDev ? '' : ((import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000')

    const xhr = new XMLHttpRequest()

    const promise = new Promise<{ success: boolean; file?: any; error?: string }>((resolve, reject) => {
      /**
       * 上传进度监听
       */
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = Math.round((event.loaded / event.total) * 100)
          onProgress(progress)
        }
      })

      /**
       * 上传完成
       */
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText)
            resolve(response)
          } catch (error) {
            reject(new Error('解析响应失败'))
          }
        } else {
          reject(new Error(`上传失败: ${xhr.statusText}`))
        }
      })

      /**
       * 上传错误
       */
      xhr.addEventListener('error', () => {
        reject(new Error('上传过程中发生错误'))
      })

      /**
       * 上传取消
       */
      xhr.addEventListener('abort', () => {
        reject(new Error('上传已取消'))
      })

      xhr.open('POST', `${API_BASE_URL}/api/file-share/upload`)
      xhr.send(formData)
    })

    return { promise, xhr }
  },

  /**
   * 删除文件
   * @param filename - 文件名
   */
  async deleteFile(filename: string): Promise<{ success: boolean; message?: string; error?: string }> {
    return request({
      path: `/api/file-share/delete/${encodeURIComponent(filename)}`,
      method: 'DELETE'
    })
  },

  /**
   * 获取下载文件的 URL
   * @param filename - 文件名
   */
  getDownloadUrl(filename: string): string {
    const isDev = (import.meta as any).env?.DEV
    const API_BASE_URL = isDev ? '' : ((import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000')
    return `${API_BASE_URL}/api/file-share/download/${encodeURIComponent(filename)}`
  },

  /**
   * 获取文本记录列表
   */
  async getTextRecords(): Promise<{ success: boolean; records: TextRecord[] }> {
    return request({
      path: '/api/file-share/text-records',
      method: 'GET'
    })
  },

  /**
   * 创建文本记录
   */
  async createTextRecord(data: CreateTextRecordRequest): Promise<{ success: boolean; record: TextRecord }> {
    return request({
      path: '/api/file-share/text-records',
      method: 'POST',
      body: data
    })
  },

  /**
   * 更新文本记录
   */
  async updateTextRecord(id: string, data: CreateTextRecordRequest): Promise<{ success: boolean }> {
    return request({
      path: `/api/file-share/text-records/${encodeURIComponent(id)}`,
      method: 'PUT',
      body: data
    })
  },

  /**
   * 删除文本记录
   */
  async deleteTextRecord(id: string): Promise<{ success: boolean }> {
    return request({
      path: `/api/file-share/text-records/${encodeURIComponent(id)}`,
      method: 'DELETE'
    })
  }
}
