export interface ElectronAPI {
  healthCheck: () => Promise<{ status: string }>;
  windowMinimize: () => Promise<void>;
  windowMaximize: () => Promise<void>;
  windowClose: () => Promise<void>;
  windowIsMaximized: () => Promise<boolean>;
  onIndexProgress: (callback: (data: any) => void) => void;
  onIndexComplete: (callback: (data: any) => void) => void;
  onError: (callback: (error: any) => void) => void;
  startIndex: (roots: string[]) => Promise<any>;
  stopIndex: () => Promise<any>;
  forceReindex: (roots: string[]) => Promise<any>;
  getIndexingProgress: () => Promise<any>;
  searchFiles: (query: string, page: number, pageSize: number, options?: any) => Promise<any>;
  searchFileContent: (keyword: string, page: number, pageSize: number) => Promise<any>;
  getFilesByCategory: (category: string, page: number, pageSize: number) => Promise<any>;
  getContentIndexStats: () => Promise<any>;
  getFileCounts: () => Promise<any>;
  getFileOpenConfigs: () => Promise<any>;
  getFileOpenConfig: (extension: string) => Promise<any>;
  saveFileOpenConfig: (payload: any) => Promise<any>;
  loadConfig: () => Promise<any>;
  saveConfig: (config: any) => Promise<any>;
  testDatabaseConnection: (config: any) => Promise<any>;
  getScanRoots: () => Promise<{ success: boolean; roots: string[]; error?: string }>;
  saveScanRoots: (roots: string[]) => Promise<{ success: boolean; error?: string }>;
  selectDirectory: () => Promise<string | null>;
  openFile: (filePath: string) => Promise<any>;
  parseDocx: (filePath: string) => Promise<any>;
  saveFile: (filePath: string, content: string) => Promise<any>;
  showItemInFolder: (filePath: string) => Promise<any>;
  // 按时长搜索文件
  searchFilesByDuration: (minDuration?: number, maxDuration?: number, page?: number, pageSize?: number) => Promise<any>;
  // 批量删除文件
  batchDeleteFiles: (fileIds: number[]) => Promise<any>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
