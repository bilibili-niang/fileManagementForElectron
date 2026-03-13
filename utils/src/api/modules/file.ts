import { request } from '../client'

/**
 * 文件操作 API
 */
export const fileApi = {
  /**
   * 打开文件
   * @param filePath - 文件路径
   */
  async openFile(filePath: string): Promise<{ success: boolean; message?: string }> {
    return request(
      {
        path: '/api/files/open',
        method: 'POST',
        body: { filePath }
      },
      { channel: 'openFile', args: [filePath] }
    )
  },

  /**
   * 在文件夹中显示文件
   * @param filePath - 文件路径
   */
  async showItemInFolder(filePath: string): Promise<{ success: boolean; message?: string }> {
    return request(
      {
        path: '/api/files/show-in-folder',
        method: 'POST',
        body: { filePath }
      },
      { channel: 'showItemInFolder', args: [filePath] }
    )
  },

  /**
   * 删除文件
   * @param filePath - 文件路径
   */
  async deleteFile(filePath: string): Promise<{ success: boolean; message?: string }> {
    return request(
      {
        path: '/api/files/delete',
        method: 'POST',
        body: { filePath }
      },
      { channel: 'deleteFile', args: [filePath] }
    )
  },

  /**
   * 解析 Docx 文件
   * @param filePath - 文件路径
   */
  async parseDocx(filePath: string): Promise<{ success: boolean; content?: string; message?: string }> {
    return request(
      {
        path: '/api/files/parse-docx',
        method: 'POST',
        body: { filePath }
      },
      { channel: 'parseDocx', args: [filePath] }
    )
  },

  /**
   * 保存文件
   * @param filePath - 文件路径
   * @param content - 文件内容
   */
  async saveFile(filePath: string, content: string): Promise<{ success: boolean; message?: string }> {
    return request(
      {
        path: '/api/files/save',
        method: 'POST',
        body: { filePath, content }
      },
      { channel: 'saveFile', args: [filePath, content] }
    )
  }
}
