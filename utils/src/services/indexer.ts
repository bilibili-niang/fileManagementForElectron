import { Worker, isMainThread, parentPort, workerData } from 'worker_threads'
import * as fs from 'fs'
import * as path from 'path'
import fg from 'fast-glob'
import { FileIndex, getDataSource } from './database'
import { BrowserWindow } from 'electron'

export interface IndexProgress {
  drive: string
  progress: number
  currentPath: string
  filesIndexed: number
}

export interface IndexComplete {
  drive: string
  totalFiles: number
  duration: number
}

export interface IndexError {
  drive: string
  error: string
}

export interface WorkerTask {
  type: 'index-drive'
  drive: string
  excludePatterns: string[]
  lastIndexedTime?: Date
}

const FILE_CATEGORIES = {
  images: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'bmp', 'webp'],
  documents: ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'xls', 'xlsx', 'ppt', 'pptx'],
  code: ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'h', 'cs', 'go', 'rs', 'php', 'rb', 'swift', 'kt'],
  videos: ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'],
  audio: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma'],
  archives: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'],
  executables: ['exe', 'msi', 'app', 'dmg', 'deb', 'rpm']
}

function getFileCategory(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (!ext) return 'other'

  for (const [category, extensions] of Object.entries(FILE_CATEGORIES)) {
    if (extensions.includes(ext)) {
      return category
    }
  }

  return 'other'
}

function getMainExtension(filename: string): string {
  const parts = filename.split('.')
  if (parts.length < 2) return ''

  const multiExtMap: Record<string, string> = {
    'tar.gz': 'gz',
    'tar.bz2': 'bz2',
    'tar.xz': 'xz'
  }

  const lastTwo = parts.slice(-2).join('.')
  if (multiExtMap[lastTwo]) {
    return multiExtMap[lastTwo]
  }

  return parts.pop() || ''
}

async function indexDrive(
  drive: string,
  excludePatterns: string[],
  lastIndexedTime?: Date,
  mainWindow?: BrowserWindow
): Promise<{ totalFiles: number; duration: number }> {
  const startTime = Date.now()
  let totalFiles = 0
  let processedFiles = 0

  const dataSource = getDataSource()
  if (!dataSource) {
    throw new Error('Database not initialized')
  }

  const fileRepository = dataSource.getRepository(FileIndex)

  const patterns = excludePatterns.map(p => `${drive}/${p}`)
  const files = await fg(`${drive}/**/*`, {
    onlyFiles: true,
    ignore: patterns,
    absolute: true,
    stats: true
  })

  const total = files.length

  for (const file of files) {
    try {
      const stats = await fs.promises.stat(file.path)
      const filename = path.basename(file.path)
      const extension = getMainExtension(filename)
      const modifiedTime = stats.mtime

      const existingFile = await fileRepository.findOne({
        where: { path: file.path }
      })

      if (existingFile) {
        if (modifiedTime > existingFile.modified_time) {
          await fileRepository.update(existingFile.id, {
            name: filename,
            extension,
            size: stats.size,
            modified_time: modifiedTime,
            indexed_time: new Date()
          })
        }
      } else {
        const newFile = new FileIndex()
        newFile.path = file.path
        newFile.name = filename
        newFile.extension = extension
        newFile.size = stats.size
        newFile.modified_time = modifiedTime
        newFile.indexed_time = new Date()
        newFile.name_index = filename
        newFile.extension_index = extension
        await fileRepository.save(newFile)
      }

      totalFiles++
      processedFiles++

      if (mainWindow && processedFiles % 100 === 0) {
        const progress = processedFiles / total
        mainWindow.webContents.send('index-progress', {
          drive,
          progress,
          currentPath: file.path
        } as IndexProgress)
      }
    } catch (error) {
      console.error(`Failed to index file ${file.path}:`, error)
    }
  }

  if (lastIndexedTime) {
    await cleanupDeletedFiles(fileRepository, lastIndexedTime)
  }

  const duration = Date.now() - startTime

  if (mainWindow) {
    mainWindow.webContents.send('index-complete', {
      drive,
      totalFiles,
      duration
    } as IndexComplete)
  }

  return { totalFiles, duration }
}

async function cleanupDeletedFiles(
  fileRepository: any,
  lastIndexedTime: Date
): Promise<void> {
  const files = await fileRepository.find({
    where: {
      indexed_time: { $lt: lastIndexedTime }
    }
  })

  for (const file of files) {
    try {
      await fs.promises.access(file.path)
    } catch {
      await fileRepository.delete(file.id)
    }
  }
}

export async function startIndex(
  drives: string[],
  excludePatterns: string[],
  mainWindow: BrowserWindow
): Promise<void> {
  const config = await loadConfig()
  const lastIndexedTime = config?.indexing.lastIndexedTime
    ? new Date(config.indexing.lastIndexedTime)
    : undefined

  const workers: Worker[] = []

  for (const drive of drives) {
    const worker = new Worker(__filename, {
      workerData: {
        type: 'index-drive',
        drive,
        excludePatterns,
        lastIndexedTime
      } as WorkerTask
    })

    worker.on('message', (data) => {
      if (data.type === 'progress') {
        mainWindow.webContents.send('index-progress', data)
      } else if (data.type === 'complete') {
        mainWindow.webContents.send('index-complete', data)
      } else if (data.type === 'error') {
        mainWindow.webContents.send('error', {
          message: data.error,
          context: `Indexing ${data.drive}`
        })
      }
    })

    worker.on('error', (error) => {
      console.error(`Worker error for drive ${drive}:`, error)
      mainWindow.webContents.send('error', {
        message: error.message,
        context: `Indexing ${drive}`
      })
    })

    workers.push(worker)
  }

  await Promise.all(workers.map(w => w.terminate()))
}

export async function stopIndex(): Promise<void> {
}

async function loadConfig(): Promise<any> {
  const { loadConfig } = await import('./database')
  return loadConfig()
}

if (!isMainThread && parentPort) {
  const task = workerData as WorkerTask

  if (task.type === 'index-drive') {
    indexDrive(task.drive, task.excludePatterns, task.lastIndexedTime)
      .then(result => {
        parentPort?.postMessage({
          type: 'complete',
          drive: task.drive,
          ...result
        } as IndexComplete)
      })
      .catch(error => {
        parentPort?.postMessage({
          type: 'error',
          drive: task.drive,
          error: error.message
        } as IndexError)
      })
  }
}
