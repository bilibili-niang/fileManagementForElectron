import {
  defineComponent,
  ref,
  computed,
  onMounted,
  onUnmounted,
} from 'vue'
import {fileShareApi, type ShareFile} from '@/api'
import {
  useSnackbar
} from '@/composables/useSnackbar'
import {
  formatFileSize,
  getFileIcon,
  downloadByUrl,
  openFolderInExplorer
} from '@/utils'
import {SuperTable} from '@/components/SuperTable'
import QRCode from 'qrcode'
import {useIndexingStore} from '@/stores/indexing'
import ConfirmDialog
  from '@/components/ConfirmDialog/index.vue'
import UploadDialog
  from '@/components/UploadDialog/index.vue'
import UploadProgressDialog
  from '@/components/UploadProgressDialog/index.vue'
import TextRecordDialog
  from '@/components/TextRecordDialog/index.vue'
import ShareDialog
  from '@/components/ShareDialog/index.vue'
import './index.scss'

/**
 * 图片扩展名列表
 */
const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg']

/**
 * 文件共享页面组件
 */
export default defineComponent({
  name: 'FileShare',
  
  setup() {
    const {showSnackbar} = useSnackbar()
    
    /**
     * 加载状态
     */
    const loading = ref(false)
    
    /**
     * 文件夹路径
     */
    const folderPath = ref('')
    
    /**
     * 文件列表
     */
    const files = ref<ShareFile[]>([])
    
    /**
     * 选中的文件列表
     */
    const selectedFiles = ref<ShareFile[]>([])
    
    /**
     * 分享弹窗显示状态
     */
    const showShareDialog = ref(false)
    
    /**
     * 分享信息
     */
    const shareInfo = ref({
      url: '',
      ip: '',
      port: 0
    })
    
    /**
     * 分享加载状态
     */
    const shareLoading = ref(false)
    
    /**
     * 分享二维码
     */
    const shareQrCode = ref('')
    
    /**
     * 图片预览显示状态
     */
    const showImagePreview = ref(false)
    
    /**
     * 预览图片地址
     */
    const previewImageUrl = ref('')
    
    /**
     * 预览文件名
     */
    const previewFileName = ref('')
    
    /**
     * 上传对话框显示状态
     */
    const showUploadDialog = ref(false)
    
    /**
     * 上传中状态
     */
    const uploading = ref(false)
    
    /**
     * 删除对话框显示状态
     */
    const showDeleteDialog = ref(false)
    
    /**
     * 待删除文件
     */
    const fileToDelete = ref<ShareFile | null>(null)
    
    /**
     * 删除中状态
     */
    const deleting = ref(false)
    
    /**
     * 拖拽上传状态
     */
    const isDragging = ref(false)
    
    /**
     * 上传进度对话框显示状态
     */
    const showUploadProgress = ref(false)
    
    /**
     * 上传进度
     */
    const uploadProgress = ref(0)
    
    /**
     * 上传文件名
     */
    const uploadingFileName = ref('')
    
    /**
     * 已上传字节数
     */
    const uploadedBytes = ref(0)
    
    /**
     * 总字节数
     */
    const uploadTotalBytes = ref(0)
    
    /**
     * 上传速度
     */
    const uploadSpeed = ref(0)
    
    /**
     * 上传开始时间
     */
    const uploadStartTime = ref(0)
    
    /**
     * 当前XHR请求
     */
    let currentXhr: XMLHttpRequest | null = null
    
    /**
     * 多文件上传队列
     */
    const uploadQueue = ref<File[]>([])
    
    /**
     * 当前上传文件索引
     */
    const currentUploadIndex = ref(0)
    
    /**
     * 多文件上传总数量
     */
    const totalUploadCount = ref(0)
    
    /**
     * 多文件上传总字节数
     */
    const totalUploadBytes = ref(0)
    
    /**
     * 多文件已上传总字节数
     */
    const totalUploadedBytes = ref(0)
    
    /**
     * 当前文件上传开始时间
     */
    const currentFileStartTime = ref(0)
    
    /**
     * 扫描详情显示状态
     */
    const showScanDetail = ref(false)
    
    /**
     * 文本记录弹窗显示状态
     */
    const showTextRecordDialog = ref(false)
    
    /**
     * 文本记录编辑模式
     */
    const isEditingText = ref(false)
    
    /**
     * 当前编辑的文本记录ID
     */
    const editingTextId = ref<string | null>(null)
    
    /**
     * 文本记录表单
     */
    const textRecordForm = ref({
      displayName: '',
      content: ''
    })
    
    /**
     * 文本记录加载状态
     */
    const textRecordLoading = ref(false)
    
    /**
     * 待删除的文本记录
     */
    const textToDelete = ref<ShareFile | null>(null)
    
    /**
     * 多选模式开关
     */
    const isMultiSelectMode = ref(false)
    
    /**
     * 批量删除对话框显示状态
     */
    const showBatchDeleteDialog = ref(false)
    
    /**
     * 批量删除中状态
     */
    const batchDeleting = ref(false)
    
    /**
     * 使用全局索引进度 Store
     */
    const indexingStore = useIndexingStore()
    
    /**
     * 索引状态
     */
    const indexStatus = computed(() => ({
      isIndexing: indexingStore.isIndexing,
      totalFiles: indexingStore.totalFiles,
      indexedFiles: indexingStore.currentFile,
      currentPath: indexingStore.currentPath
    }))
    
    /**
     * 进度百分比
     */
    const progressPercentage = computed(() => indexingStore.progress)
    
    /**
     * 多文件上传总体进度
     */
    const overallUploadProgress = computed(() => {
      if (totalUploadCount.value <= 1) return uploadProgress.value
      
      // 已完成的文件进度 + 当前文件进度
      const completedBytes = totalUploadedBytes.value
      const currentFileBytes = uploadTotalBytes.value * (uploadProgress.value / 100)
      const totalProgress = ((completedBytes + currentFileBytes) / totalUploadBytes.value) * 100
      return Math.min(Math.round(totalProgress * 10) / 10, 100)
    })
    
    /**
     * 上传剩余时间估算(秒)
     */
    const remainingTime = computed(() => {
      if (uploadSpeed.value <= 0) return 0
      
      // 计算剩余字节数
      const remainingCurrentFile = uploadTotalBytes.value - uploadedBytes.value
      const remainingFiles = totalUploadCount.value - currentUploadIndex.value - 1
      const remainingBytes = remainingCurrentFile + (remainingFiles * (totalUploadBytes.value / totalUploadCount.value))
      
      // 计算剩余时间(秒)
      const bytesPerSecond = uploadSpeed.value * 1024 * 1024
      return Math.ceil(remainingBytes / bytesPerSecond)
    })
    
    /**
     * 格式化日期
     */
    function formatDate(dateString: string): string {
      const date = new Date(dateString)
      return date.toLocaleString('zh-CN')
    }
    
    /**
     * 加载文件列表
     */
    async function loadFiles(): Promise<void> {
      try {
        loading.value = true
        const response = await fileShareApi.getFileList()
        if (response.success) {
          files.value = response.files
          folderPath.value = response.folder
        }
      } catch (error) {
        console.error('Load files error:', error)
        showSnackbar('加载文件列表失败', 'error')
      } finally {
        loading.value = false
      }
    }
    
    /**
     * 取消上传
     */
    function cancelUpload(): void {
      if (currentXhr) {
        currentXhr.abort()
        currentXhr = null
      }
      // 清空上传队列
      uploadQueue.value = []
      showUploadProgress.value = false
      uploading.value = false
      totalUploadCount.value = 0
      currentUploadIndex.value = 0
      showSnackbar('上传已取消', 'info')
    }
    
    /**
     * 下载文件
     */
    function downloadFile(file: ShareFile): void {
      const url = fileShareApi.getDownloadUrl(file.name)
      downloadByUrl(url, file.name)
    }
    
    /**
     * 处理拖拽进入
     */
    function handleDragEnter(e: DragEvent): void {
      e.preventDefault()
      e.stopPropagation()
      isDragging.value = true
    }
    
    /**
     * 处理拖拽悬停
     */
    function handleDragOver(e: DragEvent): void {
      e.preventDefault()
      e.stopPropagation()
    }
    
    /**
     * 处理拖拽离开
     */
    function handleDragLeave(e: DragEvent): void {
      e.preventDefault()
      e.stopPropagation()
      // 只有离开按钮本身时才取消状态，不是子元素
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const x = e.clientX
      const y = e.clientY
      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
        isDragging.value = false
      }
    }
    
    /**
     * 处理文件拖放
     */
    async function handleDrop(e: DragEvent): Promise<void> {
      e.preventDefault()
      e.stopPropagation()
      isDragging.value = false
      
      const files = e.dataTransfer?.files
      if (!files || files.length === 0) return
      
      // 将文件加入上传队列
      const fileArray = Array.from(files)
      await startUploadQueue(fileArray)
    }
    
    /**
     * 开始上传队列
     */
    async function startUploadQueue(files: File[]): Promise<void> {
      if (files.length === 0) return
      
      // 初始化队列状态
      uploadQueue.value = files
      totalUploadCount.value = files.length
      currentUploadIndex.value = 0
      totalUploadBytes.value = files.reduce((sum, file) => sum + file.size, 0)
      totalUploadedBytes.value = 0
      uploadStartTime.value = Date.now()
      
      // 依次上传每个文件
      for (let i = 0; i < files.length; i++) {
        currentUploadIndex.value = i
        const file = files[i]
        await uploadSingleFile(file)
        
        // 累加已上传字节数
        totalUploadedBytes.value += file.size
      }
      
      // 所有文件上传完成，关闭进度对话框
      showUploadProgress.value = false
      uploading.value = false
      
      // 清空队列
      uploadQueue.value = []
      currentUploadIndex.value = 0
      totalUploadCount.value = 0
      showSnackbar(`成功上传 ${files.length} 个文件`, 'success')
      await loadFiles()
      // 刷新 SuperTable
      await superTableRefresh()
    }
    
    /**
     * 上传单个文件
     */
    async function uploadSingleFile(file: File): Promise<void> {
      return new Promise((resolve, reject) => {
        uploading.value = true
        showUploadProgress.value = true
        uploadingFileName.value = file.name
        uploadTotalBytes.value = file.size
        uploadProgress.value = 0
        uploadedBytes.value = 0
        uploadSpeed.value = 0
        currentFileStartTime.value = Date.now()
        
        const {
          promise,
          xhr
        } = fileShareApi.uploadFile(file, (progress) => {
          uploadProgress.value = progress
          uploadedBytes.value = Math.round((progress / 100) * file.size)
          
          const elapsedSeconds = (Date.now() - currentFileStartTime.value) / 1000
          if (elapsedSeconds > 0) {
            const bytesPerSecond = uploadedBytes.value / elapsedSeconds
            uploadSpeed.value = Math.round((bytesPerSecond / 1024 / 1024) * 10) / 10
          }
        })
        
        currentXhr = xhr
        
        promise
          .then((result) => {
            if (result.success) {
              resolve()
            } else {
              showSnackbar(`${file.name}: ${result.error || '上传失败'}`, 'error')
              resolve() // 继续上传下一个
            }
          })
          .catch((error) => {
            console.error('Upload error:', error)
            if ((error as Error).message !== '上传已取消') {
              showSnackbar(`${file.name}: 上传失败`, 'error')
            }
            reject(error)
          })
          .finally(() => {
            currentXhr = null
          })
      })
    }
    
    /**
     * 删除文件
     */
    function deleteFile(file: ShareFile): void {
      fileToDelete.value = file
      showDeleteDialog.value = true
    }
    
    /**
     * 确认删除
     */
    async function confirmDelete(): Promise<void> {
      if (!fileToDelete.value) return
      
      try {
        deleting.value = true
        const result = await fileShareApi.deleteFile(fileToDelete.value.name)
        
        if (result.success) {
          showSnackbar('删除成功', 'success')
          showDeleteDialog.value = false
          fileToDelete.value = null
          await loadFiles()
        } else {
          showSnackbar(result.error || '删除失败', 'error')
        }
      } catch (error) {
        console.error('Delete error:', error)
        showSnackbar('删除失败', 'error')
      } finally {
        deleting.value = false
      }
    }
    
    /**
     * 打开文本记录弹窗
     */
    function openTextRecordDialog(): void {
      isEditingText.value = false
      editingTextId.value = null
      textRecordForm.value = {
        displayName: '',
        content: ''
      }
      showTextRecordDialog.value = true
    }
    
    /**
     * 编辑文本记录
     */
    function editTextRecord(file: ShareFile): void {
      isEditingText.value = true
      editingTextId.value = file.name
      textRecordForm.value = {
        displayName: file.displayName || file.name,
        content: file.content || ''
      }
      showTextRecordDialog.value = true
    }
    
    /**
     * 保存文本记录
     */
    async function saveTextRecord(): Promise<void> {
      if (!textRecordForm.value.displayName.trim()) {
        showSnackbar('请输入标题', 'warning')
        return
      }
      
      textRecordLoading.value = true
      try {
        if (isEditingText.value && editingTextId.value) {
          await fileShareApi.updateTextRecord(editingTextId.value, {
            displayName: textRecordForm.value.displayName,
            content: textRecordForm.value.content
          })
          showSnackbar('更新成功', 'success')
        } else {
          await fileShareApi.createTextRecord({
            displayName: textRecordForm.value.displayName,
            content: textRecordForm.value.content
          })
          showSnackbar('创建成功', 'success')
        }
        showTextRecordDialog.value = false
        await loadFiles()
        // 刷新 SuperTable
        await superTableRefresh()
      } catch (error) {
        showSnackbar('保存失败', 'error')
      } finally {
        textRecordLoading.value = false
      }
    }
    
    /**
     * 删除文本记录（显示确认对话框）
     */
    function deleteTextRecord(file: ShareFile): void {
      textToDelete.value = file
      showDeleteDialog.value = true
    }
    
    /**
     * 确认删除文本记录
     */
    async function confirmDeleteTextRecord(): Promise<void> {
      if (!textToDelete.value) return
      
      try {
        deleting.value = true
        await fileShareApi.deleteTextRecord(textToDelete.value.name)
        showSnackbar('删除成功', 'success')
        showDeleteDialog.value = false
        textToDelete.value = null
        await loadFiles()
      } catch (error) {
        showSnackbar('删除失败', 'error')
      } finally {
        deleting.value = false
      }
    }
    
    /**
     * 确认批量删除
     */
    async function confirmBatchDelete(): Promise<void> {
      if (selectedFiles.value.length === 0) return
      
      try {
        batchDeleting.value = true
        let successCount = 0
        let failCount = 0
        
        for (const file of selectedFiles.value) {
          try {
            if (file.isText) {
              await fileShareApi.deleteTextRecord(file.name)
            } else {
              await fileShareApi.deleteFile(file.name)
            }
            successCount++
          } catch (error) {
            console.error(`Delete ${file.name} error:`, error)
            failCount++
          }
        }
        
        if (successCount > 0) {
          showSnackbar(`成功删除 ${successCount} 个文件${failCount > 0 ? `，${failCount} 个失败` : ''}`, failCount > 0 ? 'warning' : 'success')
        } else {
          showSnackbar('删除失败', 'error')
        }
        
        showBatchDeleteDialog.value = false
        selectedFiles.value = []
        isMultiSelectMode.value = false
        await loadFiles()
      } catch (error) {
        console.error('Batch delete error:', error)
        showSnackbar('批量删除失败', 'error')
      } finally {
        batchDeleting.value = false
      }
    }
    
    /**
     * 打开文件夹
     */
    async function openFolder(): Promise<void> {
      try {
        if (folderPath.value) {
          await openFolderInExplorer(folderPath.value)
        }
      } catch (error) {
        console.error('Open folder error:', error)
        showSnackbar('打开文件夹失败', 'error')
      }
    }
    
    /**
     * 打开分享对话框
     */
    async function openShareDialog(): Promise<void> {
      try {
        shareLoading.value = true
        const res = await fileShareApi.getAccessInfo()
        if (res.success) {
          const frontendPort = window.location.port || '5173'
          const shareUrl = `http://${res.ip}:${frontendPort}/#/fileShare`
          
          shareInfo.value = {
            url: shareUrl,
            ip: res.ip,
            port: frontendPort
          }
          try {
            shareQrCode.value = await QRCode.toDataURL(shareUrl, {
              width: 180,
              margin: 2,
              color: {
                dark: '#000000',
                light: '#ffffff'
              }
            })
          } catch (qrError) {
            console.error('Generate QR code failed:', qrError)
            shareQrCode.value = ''
          }
          showShareDialog.value = true
        } else {
          showSnackbar('获取分享信息失败', 'error')
        }
      } catch (error) {
        console.error('Get share info error:', error)
        showSnackbar('获取分享信息失败', 'error')
      } finally {
        shareLoading.value = false
      }
    }
    
    /**
     * 复制分享链接
     */
    function copyShareUrl(): void {
      navigator.clipboard.writeText(shareInfo.value.url)
      showSnackbar('已复制到剪贴板', 'success')
    }
    
    /**
     * 判断是否为图片
     */
    function isImage(file: ShareFile): boolean {
      return imageExtensions.includes(file.extension.toLowerCase())
    }
    
    /**
     * 预览图片
     */
    function previewImage(file: ShareFile): void {
      if (isImage(file)) {
        previewImageUrl.value = fileShareApi.getDownloadUrl(file.name)
        previewFileName.value = file.name
        showImagePreview.value = true
      }
    }
    
    /**
     * 初始化索引进度状态
     */
    async function initIndexStatus(): Promise<void> {
      await indexingStore.initialize()
    }
    
    onMounted(() => {
      loadFiles()
      initIndexStatus()
    })
    
    onUnmounted(() => {
      // 注意：不要在组件卸载时停止轮询
      // 因为索引进度是全局状态，其他页面可能还在显示
    })
    
    /**
     * 使用 SuperTable 封装表格
     */
    const {
      Table: SuperTableComponent,
      refresh: superTableRefresh
    } = SuperTable<ShareFile>({
      title: {
        title: '文件共享',
        icon: 'mdi-folder-sync',
        color: 'primary'
      },
      toolBar: [
        {
          icon: 'mdi-refresh',
          tooltip: '刷新',
          onClick: () => superTableRefresh()
        },
        {
          icon: 'mdi-share',
          label: '分享',
          onClick: openShareDialog
        },
        {
          icon: 'mdi-note-plus',
          label: '文本记录',
          onClick: openTextRecordDialog
        },
        {
          customRender: () => (
            <v-btn
              variant="outlined"
              color="primary"
              size="small"
              prepend-icon="mdi-upload"
              class={['upload-btn', {'drag-over': isDragging.value}]}
              onClick={() => showUploadDialog.value = true}
              onDragenter={handleDragEnter}
              onDragover={handleDragOver}
              onDragleave={handleDragLeave}
              onDrop={handleDrop}
            >
              <span
                class="d-none d-sm-inline">{isDragging.value ? '释放上传' : '上传文件'}</span>
              <v-icon
                icon={isDragging.value ? 'mdi-file-upload' : 'mdi-upload'}
                class="d-sm-none"></v-icon>
            </v-btn>
          )
        }
      ],
      requestUrl: '/api/file-share/list',
      columns: [
        {
          key: 'name',
          title: '文件名',
          customRender: (record) => (
            <div class="d-flex align-center">
              {record.type === 'text' ? (
                <v-icon icon="mdi-note-text"
                        color="info"
                        class="mr-2"></v-icon>
              ) : (
                <v-icon
                  icon={getFileIcon(record.extension)}
                  class="mr-2"></v-icon>
              )}
              <v-chip
                size="x-small"
                color={record.type === 'text' ? 'info' : 'default'}
                class="mr-2"
              >
                {record.type === 'text' ? '文本' : '文件'}
              </v-chip>
              {record.displayName || record.name}
            </div>
          )
        },
        {
          key: 'size',
          title: '大小',
          customRender: (record) => (
            record.type === 'text' ? `${record.size} 字符` : formatFileSize(record.size)
          )
        },
        {
          key: 'modifiedTime',
          title: '修改时间',
          customRender: (record) => formatDate(record.modifiedTime)
        }
      ],
      actions: [
        {
          icon: 'mdi-download',
          tooltip: '下载',
          show: (record) => record.type !== 'text',
          onClick: (record) => downloadFile(record)
        },
        {
          icon: 'mdi-pencil',
          tooltip: '编辑',
          show: (record) => record.type === 'text',
          onClick: (record) => editTextRecord(record)
        },
        {
          icon: 'mdi-delete',
          tooltip: '删除',
          color: 'error',
          onClick: (record) => {
            if (record.type === 'text') {
              deleteTextRecord(record)
            } else {
              deleteFile(record)
            }
          }
        }
      ],
      multiSelect: true,
      batchActions: [
        {
          icon: 'mdi-delete-sweep',
          label: '批量删除',
          color: 'error',
          show: (selectedRows) => selectedRows.length > 0,
          onClick: (selectedRows) => {
            showSnackbar(`已选中 ${selectedRows.length} 项，批量删除功能待实现`, 'info')
          }
        }
      ],
      onRowClick: (record) => {
        if (record.type === 'text') {
          editTextRecord(record)
        } else {
          previewImage(record)
        }
      }
    })
    
    return () => (
      <v-container fluid
                   class="file-share-container">
        {/* SuperTable 封装表格 */}
        <div class="mb-3">
          <SuperTableComponent/>
        </div>
        
        
        <UploadDialog
          v-model={showUploadDialog.value}
          uploading={uploading.value}
          onUpload={(file: File) => {
            showUploadDialog.value = false
            startUploadQueue([file])
          }}
        />
        
        <ConfirmDialog
          v-model={showDeleteDialog.value}
          title="确认删除"
          titleIcon="mdi-alert"
          titleColor="warning"
          message={textToDelete.value
            ? `确定要删除文本记录 "${textToDelete.value.displayName || textToDelete.value.name}" 吗？`
            : `确定要删除文件 "${fileToDelete.value?.name}" 吗？`
          }
          confirmText="删除"
          confirmColor="error"
          loading={deleting.value}
          onConfirm={() => textToDelete.value ? confirmDeleteTextRecord() : confirmDelete()}
          onCancel={() => {
            textToDelete.value = null;
            fileToDelete.value = null
          }}
        />
        
        <ConfirmDialog
          v-model={showBatchDeleteDialog.value}
          title="确认批量删除"
          titleIcon="mdi-alert"
          titleColor="error"
          message={`确定要删除选中的 ${selectedFiles.value.length} 个文件吗？`}
          hint="此操作不可恢复，请谨慎操作。"
          confirmText="删除"
          confirmColor="error"
          loading={batchDeleting.value}
          items={selectedFiles.value.map(f => f.displayName || f.name)}
          onConfirm={confirmBatchDelete}
        />
        
        <TextRecordDialog
          v-model={showTextRecordDialog.value}
          displayName={textRecordForm.value.displayName}
          content={textRecordForm.value.content}
          isEditing={isEditingText.value}
          loading={textRecordLoading.value}
          onSave={(displayName: string, content: string) => {
            textRecordForm.value.displayName = displayName
            textRecordForm.value.content = content
            saveTextRecord()
          }}
        />
        
        {/* 图片预览对话框 */}
        <v-dialog v-model={showImagePreview.value}
                  max-width="90vw"
                  max-height="90vh">
          <v-card>
            <v-card-item>
              <v-card-title
                class="d-flex align-center">
                <v-icon icon="mdi-image"
                        class="mr-2"></v-icon>
                <span
                  class="text-truncate">{previewFileName.value}</span>
                <v-spacer></v-spacer>
                <v-btn icon="mdi-close"
                       variant="text" size="small"
                       onClick={() => showImagePreview.value = false}></v-btn>
              </v-card-title>
            </v-card-item>
            <v-card-text class="text-center pa-0"
                         style="max-height: 80vh; overflow: auto;">
              <img src={previewImageUrl.value}
                   alt={previewFileName.value}
                   style="max-width: 100%; max-height: 80vh;"/>
            </v-card-text>
          </v-card>
        </v-dialog>
        
        <UploadProgressDialog
          v-model={showUploadProgress.value}
          fileName={uploadingFileName.value}
          progress={uploadProgress.value}
          uploadedBytes={uploadedBytes.value}
          totalBytes={uploadTotalBytes.value}
          speed={uploadSpeed.value}
          currentIndex={currentUploadIndex.value}
          totalCount={totalUploadCount.value}
          overallProgress={overallUploadProgress.value}
          remainingTime={remainingTime.value}
          onCancel={cancelUpload}
        />
        
        <ShareDialog
          v-model={showShareDialog.value}
          url={shareInfo.value.url}
          ip={shareInfo.value.ip}
          port={shareInfo.value.port}
          qrCode={shareQrCode.value}
          onCopy={copyShareUrl}
        />
        
        {/* 底部扫描状态进度条 */}
        <transition name="slide-up">
          {indexStatus.value.isIndexing && (
            <div
              class="scan-progress-bar"
              onMouseenter={() => showScanDetail.value = true}
              onMouseleave={() => showScanDetail.value = false}
            >
              {/* 进度条主体 */}
              <div class="progress-container">
                <v-progress-linear
                  model-value={progressPercentage.value}
                  color="primary"
                  height="4"
                  indeterminate={indexStatus.value.totalFiles === 0}
                ></v-progress-linear>
              </div>
              
              {/* Hover 详情面板 */}
              <transition name="fade">
                {showScanDetail.value && (
                  <div class="scan-detail-panel">
                    <div class="detail-content">
                      <div class="detail-header">
                        <v-icon
                          icon="mdi-magnify-scan"
                          size="small"
                          class="mr-2"
                          color="primary"></v-icon>
                        <span
                          class="text-body-2 font-weight-medium">文件索引进行中</span>
                      </div>
                      <div
                        class="detail-stats mt-2">
                        <div class="stat-item">
                          <span
                            class="stat-label">已索引:</span>
                          <span
                            class="stat-value primary--text">{indexStatus.value.indexedFiles.toLocaleString()}</span>
                        </div>
                        <div
                          class="stat-divider"></div>
                        <div class="stat-item">
                          <span
                            class="stat-label">总数:</span>
                          <span
                            class="stat-value">{indexStatus.value.totalFiles.toLocaleString()}</span>
                        </div>
                        <div
                          class="stat-divider"></div>
                        <div class="stat-item">
                          <span
                            class="stat-label">进度:</span>
                          <span
                            class="stat-value primary--text">{progressPercentage.value.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div
                        class="current-path mt-2 text-truncate">
                        <v-icon icon="mdi-folder"
                                size="x-small"
                                class="mr-1"
                                color="grey"></v-icon>
                        <span
                          class="text-caption text-grey">{indexStatus.value.currentPath || '准备中...'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </transition>
            </div>
          )}
        </transition>
      </v-container>
    )
  }
})
