export interface ElectronAPI {
  windowMinimize: () => Promise<void>;
  windowMaximize: () => Promise<void>;
  windowClose: () => Promise<void>;
  windowIsMaximized: () => Promise<boolean>;
  onIndexProgress: (callback: (data: any) => void) => void;
  onIndexComplete: (callback: (data: any) => void) => void;
  onError: (callback: (error: any) => void) => void;
  startIndex: (drives: string[]) => Promise<any>;
  stopIndex: () => Promise<any>;
  getIndexingProgress: () => Promise<any>;
  searchFiles: (query: string, page: number, pageSize: number, options?: any) => Promise<any>;
  searchFileContent: (keyword: string, page: number, pageSize: number) => Promise<any>;
  getFilesByCategory: (category: string, page: number, pageSize: number) => Promise<any>;
  getContentIndexStats: () => Promise<any>;
  getFileCounts: () => Promise<any>;
  loadConfig: () => Promise<any>;
  saveConfig: (config: any) => Promise<any>;
  testDatabaseConnection: (config: any) => Promise<any>;
  openFile: (filePath: string) => Promise<any>;
  parseDocx: (filePath: string) => Promise<any>;
  saveFile: (filePath: string, content: string) => Promise<any>;
  showItemInFolder: (filePath: string) => Promise<any>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
