import { ref, inject } from 'vue'
import { fileApi } from '@/api'

const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg']
const docxExtensions = ['docx']
const pdfExtensions = ['pdf']
const audioExtensions = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a']
const videoExtensions = ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm']

export function useFilePreview() {
  const showFileEditor = ref(false)
  const showImagePreview = ref(false)
  const showDocxPreview = ref(false)
  const showMediaPlayer = ref(false)
  const showPdfPreview = ref(false)

  const currentFile = ref({
    path: '',
    name: '',
    content: '',
    size: 0
  })

  const showSnackbar = inject('showSnackbar') as (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void

  function openImagePreview(filePath: string) {
    console.log('[FilePreview] 打开图片预览:', filePath)
    const fileName = filePath.split('\\').pop() || ''
    currentFile.value = {
      path: filePath,
      name: fileName,
      content: ''
    }
    showImagePreview.value = true
  }

  function openPdfPreview(filePath: string) {
    console.log('[FilePreview] 打开 PDF 预览:', filePath)
    const fileName = filePath.split('\\').pop() || ''
    currentFile.value = {
      path: filePath,
      name: fileName,
      content: ''
    }
    showPdfPreview.value = true
  }

  function openDocxPreview(filePath: string) {
    console.log('[FilePreview] 打开 DOCX 预览:', filePath)
    const fileName = filePath.split('\\').pop() || ''
    currentFile.value = {
      path: filePath,
      name: fileName,
      content: ''
    }
    showDocxPreview.value = true
  }

  function openMediaPlayer(filePath: string, fileSize?: number) {
    console.log('[FilePreview] 打开媒体播放器:', filePath)
    const fileName = filePath.split('\\').pop() || ''
    currentFile.value = {
      path: filePath,
      name: fileName,
      content: '',
      size: fileSize || 0
    }
    showMediaPlayer.value = true
  }

  async function openFileEditor(dirPath: string, fileName: string) {
    console.log('[FilePreview] 打开文件:', dirPath, fileName)

    const filePath = `${dirPath}\\${fileName}`
    console.log('[FilePreview] 完整文件路径:', filePath)

    const ext = fileName.split('.').pop()?.toLowerCase() || ''

    if (imageExtensions.includes(ext)) {
      console.log('[FilePreview] 打开图片预览:', fileName)
      currentFile.value = {
        path: filePath,
        name: fileName,
        content: ''
      }
      showImagePreview.value = true
      return
    }

    if (docxExtensions.includes(ext)) {
      console.log('[FilePreview] 打开 docx 预览:', fileName)
      currentFile.value = {
        path: filePath,
        name: fileName,
        content: ''
      }
      showDocxPreview.value = true
      return
    }

    if (pdfExtensions.includes(ext)) {
      console.log('[FilePreview] 打开 PDF 预览:', fileName)
      currentFile.value = {
        path: filePath,
        name: fileName,
        content: ''
      }
      showPdfPreview.value = true
      return
    }

    try {
      console.log('[FilePreview] 读取文本文件:', filePath)
      const result = await window.electronAPI.readFile(filePath)
      console.log('[FilePreview] 读取文件结果:', result)

      if (result.success) {
        currentFile.value = {
          path: filePath,
          name: fileName,
          content: result.content
        }
        showFileEditor.value = true
      } else {
        showSnackbar('无法打开文件: ' + (result.error || ''), 'error')
      }
    } catch (error) {
      console.error('打开文件失败:', error)
      showSnackbar('打开文件失败: ' + (error as Error).message, 'error')
    }
  }

  async function handleFileSave(content: string) {
    console.log('[FilePreview] 保存文件内容:', content.substring(0, 100) + '...')

    try {
      const result = await fileApi.saveFile(currentFile.value.path, content)
      if (result.success) {
        showSnackbar('文件已保存', 'success')
      } else {
        showSnackbar('保存失败', 'error')
      }
    } catch (error) {
      console.error('保存文件失败:', error)
      showSnackbar('保存文件失败: ' + (error as Error).message, 'error')
    }
  }

  return {
    showFileEditor,
    showImagePreview,
    showDocxPreview,
    showMediaPlayer,
    showPdfPreview,
    currentFile,
    openImagePreview,
    openPdfPreview,
    openDocxPreview,
    openMediaPlayer,
    openFileEditor,
    handleFileSave
  }
}
