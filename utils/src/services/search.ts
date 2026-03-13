import { getDataSource } from './database'
import { FileIndex } from './database'

export interface SearchResult {
  files: FileResult[]
  totalPages: number
  currentPage: number
}

export interface FileResult {
  id: number
  name: string
  path: string
  extension: string
  size: number
  modified_time: string
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

export async function searchFiles(
  query: string,
  page: number = 1,
  pageSize: number = 50
): Promise<SearchResult> {
  const dataSource = getDataSource()
  if (!dataSource) {
    throw new Error('Database not initialized')
  }

  const fileRepository = dataSource.getRepository(FileIndex)

  const [files, total] = await fileRepository.findAndCount({
    where: {
      name: { $like: `%${query}%` }
    },
    skip: (page - 1) * pageSize,
    take: pageSize,
    order: {
      name: 'ASC'
    }
  })

  const totalPages = Math.ceil(total / pageSize)

  return {
    files: files.map(f => ({
      id: f.id,
      name: f.name,
      path: f.path,
      extension: f.extension || '',
      size: f.size,
      modified_time: f.modified_time.toISOString()
    })),
    totalPages,
    currentPage: page
  }
}

export async function getFilesByCategory(
  category: string,
  page: number = 1,
  pageSize: number = 50
): Promise<SearchResult> {
  const dataSource = getDataSource()
  if (!dataSource) {
    throw new Error('Database not initialized')
  }

  const fileRepository = dataSource.getRepository(FileIndex)

  let where: any = {}

  if (category !== 'all') {
    const extensions = FILE_CATEGORIES[category as keyof typeof FILE_CATEGORIES]
    if (extensions) {
      where.extension = { $in: extensions }
    }
  }

  const [files, total] = await fileRepository.findAndCount({
    where,
    skip: (page - 1) * pageSize,
    take: pageSize,
    order: {
      name: 'ASC'
    }
  })

  const totalPages = Math.ceil(total / pageSize)

  return {
    files: files.map(f => ({
      id: f.id,
      name: f.name,
      path: f.path,
      extension: f.extension || '',
      size: f.size,
      modified_time: f.modified_time.toISOString()
    })),
    totalPages,
    currentPage: page
  }
}

export async function getFileCountByCategory(): Promise<Record<string, number>> {
  const dataSource = getDataSource()
  if (!dataSource) {
    throw new Error('Database not initialized')
  }

  const fileRepository = dataSource.getRepository(FileIndex)

  const counts: Record<string, number> = {
    all: 0
  }

  for (const [category, extensions] of Object.entries(FILE_CATEGORIES)) {
    const count = await fileRepository.count({
      where: {
        extension: { $in: extensions }
      }
    })
    counts[category] = count
  }

  counts.all = await fileRepository.count()

  return counts
}
