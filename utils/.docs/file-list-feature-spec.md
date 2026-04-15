# 文件列表功能开发文档

## 功能概述

新增一个"文件列表" Tab，提供高级文件管理功能：
1. **文件列表展示** - 以表格形式展示所有文件
2. **多种分类展示** - 支持按类型、大小、日期等维度分类
3. **批量操作** - 支持多选文件进行批量操作（删除、移动、复制）
4. **时长过滤** - 支持按视频/音频时长进行筛选

---

## 一、数据库表结构修改

### 1.1 修改文件：server/src/services/databaseInit.ts

#### 第68-98行：修改 files 表结构

**添加 duration 字段用于存储视频/音频时长（秒）**

```typescript
// 创建 files 表 - 添加 duration 字段
await connection.execute(`
  CREATE TABLE IF NOT EXISTS files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    path VARCHAR(500) NOT NULL,
    extension VARCHAR(50) NOT NULL,
    size BIGINT DEFAULT 0,
    created_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    modified_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    accessed_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    hash VARCHAR(32) DEFAULT '',
    is_hidden BOOLEAN DEFAULT FALSE,
    is_readonly BOOLEAN DEFAULT FALSE,
    is_system BOOLEAN DEFAULT FALSE,
    attributes VARCHAR(100) DEFAULT '',
    scan_directory_id INT DEFAULT NULL COMMENT '文件所属的扫描目录ID',
    duration INT DEFAULT NULL COMMENT '视频/音频时长（秒）',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_extension (extension),
    INDEX idx_path (path),
    INDEX idx_modified_time (modified_time),
    INDEX idx_created_time (created_time),
    INDEX idx_hash (hash),
    INDEX idx_is_hidden (is_hidden),
    INDEX idx_scan_directory_id (scan_directory_id),
    INDEX idx_duration (duration),
    UNIQUE KEY unique_file (path, name),
    FOREIGN KEY (scan_directory_id) REFERENCES scan_directories(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`);
```

**用途**：为视频/音频文件存储时长信息，用于时长筛选功能。

#### 第283-300行：修改 syncTableSchema 中的列定义

```typescript
// 强制同步 files 表结构
await syncTableSchema(connection, DEFAULT_CONFIG.database, 'files', [
  { name: 'id', def: 'INT AUTO_INCREMENT PRIMARY KEY', required: true },
  { name: 'name', def: 'VARCHAR(255) NOT NULL', required: true },
  { name: 'path', def: 'VARCHAR(500) NOT NULL', required: true },
  { name: 'extension', def: 'VARCHAR(50) NOT NULL', required: true },
  { name: 'size', def: 'BIGINT DEFAULT 0', required: true },
  { name: 'created_time', def: 'DATETIME DEFAULT CURRENT_TIMESTAMP', required: true },
  { name: 'modified_time', def: 'DATETIME DEFAULT CURRENT_TIMESTAMP', required: true },
  { name: 'accessed_time', def: 'DATETIME DEFAULT CURRENT_TIMESTAMP', required: true },
  { name: 'hash', def: "VARCHAR(32) DEFAULT ''", required: true },
  { name: 'is_hidden', def: 'BOOLEAN DEFAULT FALSE', required: true },
  { name: 'is_readonly', def: 'BOOLEAN DEFAULT FALSE', required: true },
  { name: 'is_system', def: 'BOOLEAN DEFAULT FALSE', required: true },
  { name: 'attributes', def: "VARCHAR(100) DEFAULT ''", required: true },
  { name: 'scan_directory_id', def: "INT DEFAULT NULL COMMENT '文件所属的扫描目录ID'", required: true },
  { name: 'duration', def: "INT DEFAULT NULL COMMENT '视频/音频时长（秒）'", required: true },
  { name: 'created_at', def: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP', required: true },
  { name: 'updated_at', def: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', required: true }
]);
```

**用途**：确保数据库迁移时能自动添加 duration 字段。

#### 第303-308行后：添加 duration 索引

```typescript
// 添加索引
const indexDefinitions = [
  { name: 'idx_created_time', def: `CREATE INDEX idx_created_time ON files(created_time)` },
  { name: 'idx_hash', def: `CREATE INDEX idx_hash ON files(hash)` },
  { name: 'idx_is_hidden', def: `CREATE INDEX idx_is_hidden ON files(is_hidden)` },
  { name: 'idx_scan_directory_id', def: `CREATE INDEX idx_scan_directory_id ON files(scan_directory_id)` },
  { name: 'idx_duration', def: `CREATE INDEX idx_duration ON files(duration)` }
];
```

**用途**：为 duration 字段创建索引，提高时长筛选查询性能。

---

## 二、后端服务修改

### 2.1 修改文件：server/src/services/fileService.ts

#### 第6-21行：修改 FileResult 接口

```typescript
export interface FileResult {
  id: number;
  name: string;
  path: string;
  extension: string;
  size: number;
  created_time: string;
  modified_time: string;
  accessed_time: string;
  hash: string;
  is_hidden: boolean;
  is_readonly: boolean;
  is_system: boolean;
  attributes: string;
  scan_directory_id?: number;
  duration?: number;  // 新增：视频/音频时长（秒）
}
```

**用途**：为文件结果接口添加 duration 字段。

### 2.2 修改文件：server/src/services/fileIndexer.ts

#### 第29-43行：修改 FileInfo 接口

```typescript
export interface FileInfo {
  name: string;
  path: string;
  extension: string;
  size: number;
  created_time: string;
  modified_time: string;
  accessed_time: string;
  hash: string;
  is_hidden: boolean;
  is_readonly: boolean;
  is_system: boolean;
  attributes: string;
  scan_directory_id?: number;
  duration?: number;  // 新增：视频/音频时长（秒）
}
```

**用途**：为文件信息接口添加 duration 字段。

#### 第484-498行：修改 indexFile 方法中的 fileInfo 对象

在计算 hash 后，添加获取视频/音频时长的逻辑：

```typescript
// 获取视频/音频时长
let duration: number | undefined = undefined;
const mediaExtensions = ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a'];
if (mediaExtensions.includes(ext)) {
  try {
    duration = await this.getMediaDuration(filePath);
  } catch (e) {
    console.warn(`[FileIndexer] Failed to get duration for ${filePath}:`, e);
  }
}

const fileInfo: FileInfo = {
  name: fileName,
  path: dirPath,
  extension: ext,
  size: stats.size,
  created_time: formatDateTime(stats.birthtime),
  modified_time: formatDateTime(stats.mtime),
  accessed_time: formatDateTime(stats.atime),
  hash: hash,
  is_hidden: isHidden,
  is_readonly: isReadonly,
  is_system: isSystem,
  attributes: attributes,
  scan_directory_id: this.currentScanDirectoryId,
  duration: duration
};
```

**用途**：在索引媒体文件时提取时长信息。

#### 第540行后：添加 getMediaDuration 方法

```typescript
  // 获取媒体文件时长
  private async getMediaDuration(filePath: string): Promise<number> {
    // 使用 ffprobe 或其他工具获取时长
    // 这里使用简单的文件大小估算作为示例
    // 实际项目中应该使用 ffmpeg 或 mediainfo
    const stats = await fs.stat(filePath);
    const ext = path.extname(filePath).toLowerCase().replace('.', '');
    
    // 视频文件平均码率估算（简化处理）
    const videoBitrate = 5000000; // 5 Mbps
    const audioBitrate = 128000;  // 128 kbps
    
    if (['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'].includes(ext)) {
      // 估算视频时长（秒）
      return Math.round(stats.size * 8 / (videoBitrate + audioBitrate));
    } else if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a'].includes(ext)) {
      // 估算音频时长（秒）
      return Math.round(stats.size * 8 / audioBitrate);
    }
    
    return 0;
  }
```

**用途**：获取视频/音频文件的时长。实际项目中建议使用 `fluent-ffmpeg` 库获取准确时长。

### 2.3 修改文件：server/src/services/databaseService.ts

#### 第262-297行：修改 addFile 方法

```typescript
// 添加文件到数据库，返回文件 ID
async addFile(file: Omit<FileResult, 'id'> & { duration?: number }): Promise<number> {
  if (!this.pool) {
    throw new Error('Database not initialized');
  }

  const [result] = await this.pool.execute(
    `INSERT INTO files (name, path, extension, size, created_time, modified_time, accessed_time, hash, is_hidden, is_readonly, is_system, attributes, scan_directory_id, duration) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE 
     size = VALUES(size), 
     created_time = VALUES(created_time),
     modified_time = VALUES(modified_time),
     accessed_time = VALUES(accessed_time),
     hash = VALUES(hash),
     is_hidden = VALUES(is_hidden),
     is_readonly = VALUES(is_readonly),
     is_system = VALUES(is_system),
     attributes = VALUES(attributes),
     scan_directory_id = VALUES(scan_directory_id),
     duration = VALUES(duration)`,
    [file.name, file.path, file.extension, file.size, file.created_time, file.modified_time, file.accessed_time, file.hash, 
     file.is_hidden, file.is_readonly, file.is_system, file.attributes, file.scan_directory_id || null, file.duration || null]
  );

  // 如果是新插入的记录，返回插入的 ID
  if ((result as any).insertId) {
    return (result as any).insertId;
  }

  // 如果是更新的记录，查询 ID
  const [rows] = await this.pool.execute(
    'SELECT id FROM files WHERE path = ? AND name = ?',
    [file.path, file.name]
  );

  return (rows as any[])[0]?.id || 0;
}
```

**用途**：支持保存和更新文件的 duration 字段。

#### 第25-109行后：添加按时长筛选的搜索方法

```typescript
// 按时长筛选搜索文件
async searchFilesByDuration(
  minDuration?: number,
  maxDuration?: number,
  page: number = 1,
  pageSize: number = 50
): Promise<SearchResult> {
  if (!this.pool) {
    throw new Error('Database not initialized');
  }

  const offset = (page - 1) * pageSize;
  const mediaExtensions = ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a'];
  const placeholders = mediaExtensions.map(() => '?').join(',');

  let whereConditions: string[] = [`extension IN (${placeholders})`];
  let params: any[] = [...mediaExtensions];

  if (minDuration !== undefined) {
    whereConditions.push('duration >= ?');
    params.push(minDuration);
  }
  if (maxDuration !== undefined) {
    whereConditions.push('duration <= ?');
    params.push(maxDuration);
  }

  const whereClause = 'WHERE ' + whereConditions.join(' AND ');

  const [rows] = await this.pool.query(
    `SELECT * FROM files 
     ${whereClause}
     ORDER BY duration DESC 
     LIMIT ${parseInt(pageSize as any)} OFFSET ${parseInt(offset as any)}`,
    params
  );

  const [countRows] = await this.pool.execute(
    `SELECT COUNT(*) as total FROM files ${whereClause}`,
    params
  );

  const total = (countRows as any[])[0].total;
  const totalPages = Math.ceil(total / pageSize);

  return {
    files: rows as FileResult[],
    totalPages,
    currentPage: page
  };
}
```

**用途**：提供按时长范围筛选媒体文件的功能。

#### 第936行后：添加批量删除文件方法

```typescript
// 批量删除文件
async deleteFiles(fileIds: number[]): Promise<number> {
  if (!this.pool) {
    throw new Error('Database not initialized');
  }

  if (fileIds.length === 0) return 0;

  const placeholders = fileIds.map(() => '?').join(',');
  
  // 先删除关联的内容索引
  await this.pool.execute(
    `DELETE FROM file_contents WHERE file_id IN (${placeholders})`,
    fileIds
  );

  // 删除文件记录
  const [result] = await this.pool.execute(
    `DELETE FROM files WHERE id IN (${placeholders})`,
    fileIds
  );

  return (result as any).affectedRows || 0;
}
```

**用途**：支持批量删除文件及其关联数据。

---

## 三、前端 API 层修改

### 3.1 修改文件：src/api/types/search.ts

在合适位置添加新的接口定义：

```typescript
// 文件信息接口 - 在 FileResult 接口中添加 duration 字段
export interface FileResult {
  id: number;
  name: string;
  path: string;
  extension: string;
  size: number;
  created_time: string;
  modified_time: string;
  accessed_time?: string;
  duration?: number;  // 新增：视频/音频时长（秒）
}

// 搜索选项 - 在 SearchOptions 接口中添加时长筛选
export interface SearchOptions {
  searchContent?: boolean;
  fileType?: string;
  minSize?: number;
  maxSize?: number;
  minDuration?: number;  // 新增：最小时长（秒）
  maxDuration?: number;  // 新增：最大时长（秒）
}

// 批量操作请求 - 新增接口
export interface BatchOperationRequest {
  fileIds: number[];
  operation: 'delete' | 'copy' | 'move';
  targetPath?: string;  // 复制/移动的目标路径
}
```

**用途**：定义文件列表功能所需的数据类型。

### 3.2 修改文件：src/api/modules/search.ts

#### 第133行后：添加新的 API 方法

```typescript
  /**
   * 按时长筛选搜索文件
   * @param minDuration - 最小时长（秒）
   * @param maxDuration - 最大时长（秒）
   * @param page - 页码
   * @param pageSize - 每页数量
   */
  async searchFilesByDuration(
    minDuration?: number,
    maxDuration?: number,
    page: number = 1,
    pageSize: number = 50
  ): Promise<SearchResult> {
    return request(
      {
        path: '/api/search/duration',
        params: { minDuration, maxDuration, page, pageSize }
      },
      { channel: 'searchFilesByDuration', args: [minDuration, maxDuration, page, pageSize] }
    )
  },

  /**
   * 批量删除文件
   * @param fileIds - 文件ID数组
   */
  async batchDeleteFiles(fileIds: number[]): Promise<{ deletedCount: number }> {
    return request(
      {
        path: '/api/files/batch-delete',
        method: 'POST',
        body: { fileIds }
      },
      { channel: 'batchDeleteFiles', args: [fileIds] }
    )
  }
```

**用途**：添加时长筛选和批量删除的 API 接口。

### 3.3 修改文件：src/api/modules/index.ts

确保导出新的 API：

```typescript
export { searchApi } from './search'
export { historyApi } from './history'
export { configApi } from './config'
export { fileApi } from './file'
```

---

## 四、Electron 主进程修改

### 4.1 修改文件：electron/main.js

#### 在 ipcMain.handle 注册区域（约第 935 行后）添加：

```javascript
// 按时长搜索文件
ipcMain.handle('search-files-by-duration', async (_event, minDuration, maxDuration, page, pageSize) => {
  try {
    const result = await dbService.searchFilesByDuration(minDuration, maxDuration, page, pageSize)
    return { success: true, ...result }
  } catch (error) {
    logger.error('Search files by duration error:', error)
    return { success: false, error: error.message }
  }
})

// 批量删除文件
ipcMain.handle('batch-delete-files', async (_event, fileIds) => {
  try {
    const deletedCount = await dbService.deleteFiles(fileIds)
    return { success: true, deletedCount }
  } catch (error) {
    logger.error('Batch delete files error:', error)
    return { success: false, error: error.message }
  }
})
```

**用途**：注册 IPC 处理器，连接前端调用和后端服务。

**注意**：需要在文件顶部确保 dbService 已正确导入：
```javascript
const { DatabaseService } = require('./server/src/services/databaseService')
const dbService = new DatabaseService()
```

### 4.2 修改文件：electron/preload.ts

#### 第33行后：添加新的 IPC 接口

```typescript
  // 按时长搜索文件
  searchFilesByDuration: (minDuration?: number, maxDuration?: number, page?: number, pageSize?: number) => 
    ipcRenderer.invoke('search-files-by-duration', minDuration, maxDuration, page, pageSize),
  // 批量删除文件
  batchDeleteFiles: (fileIds: number[]) => ipcRenderer.invoke('batch-delete-files', fileIds),
```

**用途**：暴露新的 API 给渲染进程使用。

---

## 五、主应用入口修改

### 5.1 修改文件：src/App.vue

#### 第8-14行：添加新的 Tab

```typescript
<v-tabs v-model="activeTab" bg-color="transparent" density="compact" class="app-tabs" hide-slider>
  <v-tab value="qrcode" class="text-caption app-tab">二维码生成</v-tab>
  <v-tab value="category" class="text-caption app-tab">分类浏览</v-tab>
  <v-tab value="filelist" class="text-caption app-tab">文件列表</v-tab>  <!-- 新增 -->
  <v-tab value="search" class="text-caption app-tab">文件搜索</v-tab>
  <v-tab value="network" class="text-caption app-tab">网络模拟</v-tab>
  <v-tab value="settings" class="text-caption app-tab">设置</v-tab>
</v-tabs>
```

**用途**：在主界面添加"文件列表" Tab 入口。

#### 第24-26行后：添加文件列表窗口项

```typescript
<v-window-item value="filelist">
  <FileList/>
</v-window-item>
```

**用途**：注册文件列表组件的显示区域。

#### 第99-103行：导入 FileList 组件

```typescript
import FileSearch from '@/views/FileSearch/index.vue'
import FileCategory from '@/views/FileCategory/index.vue'
import FileList from '@/views/FileList/index.vue'  // 新增
import Settings from '@/views/Settings/index.vue'
import QrCodeGenerator from '@/views/QrCodeGenerator/index.vue'
import NetworkMock from '@/views/NetworkMock/index.vue'
```

**用途**：导入新创建的文件列表组件。

---

## 六、新建文件列表视图组件

### 6.1 创建文件：src/views/FileList/index.vue

这是一个完整的 Vue 单文件组件：

```vue
<template>
  <div class="file-list-container">
    <v-row class="fill-height ma-0">
      <!-- 左侧分类侧边栏 -->
      <v-col cols="2" class="category-sidebar pa-1">
        <v-card class="fill-height" flat>
          <v-card-item class="py-2">
            <v-card-title class="text-h6">视图</v-card-title>
          </v-card-item>
          <v-list class="category-list">
            <v-list-item
              v-for="view in viewModes"
              :key="view.key"
              :prepend-icon="view.icon"
              @click="selectViewMode(view.key)"
              :active="currentViewMode === view.key"
              class="category-item"
            >
              <v-list-item-title>{{ view.name }}</v-list-item-title>
            </v-list-item>
          </v-list>

          <v-divider class="my-2"></v-divider>

          <v-card-item class="py-2">
            <v-card-title class="text-h6">分类</v-card-title>
          </v-card-item>
          <v-list class="category-list">
            <v-list-item
              v-for="category in categories"
              :key="category.key"
              :prepend-icon="category.icon"
              @click="selectCategory(category.key)"
              :active="selectedCategory === category.key"
              class="category-item"
            >
              <v-list-item-title>{{ category.name }}</v-list-item-title>
              <v-list-item-subtitle>{{ category.count }} 个文件</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>

      <!-- 中间文件列表区域 -->
      <v-col cols="10" class="file-list-area pa-1">
        <v-card class="fill-height file-list-card" flat>
          <!-- 工具栏 -->
          <v-card-item class="file-list-header py-2">
            <v-row align="center" no-gutters>
              <v-col cols="4">
                <v-card-title class="text-h6">{{ getViewTitle }}</v-card-title>
              </v-col>
              <v-col cols="8" class="text-right">
                <!-- 批量操作按钮 -->
                <v-btn
                  v-if="selectedFiles.length > 0"
                  color="error"
                  variant="outlined"
                  size="small"
                  class="mr-2"
                  @click="confirmBatchDelete"
                >
                  <v-icon icon="mdi-delete" size="small" class="mr-1"></v-icon>
                  删除选中 ({{ selectedFiles.length }})
                </v-btn>
                <v-btn
                  v-if="selectedFiles.length > 0"
                  variant="outlined"
                  size="small"
                  class="mr-2"
                  @click="clearSelection"
                >
                  取消选择
                </v-btn>
                
                <!-- 时长筛选（仅在媒体视图显示） -->
                <template v-if="currentViewMode === 'media'">
                  <v-select
                    v-model="durationFilter"
                    :items="durationFilterOptions"
                    item-title="title"
                    item-value="value"
                    label="时长筛选"
                    variant="outlined"
                    density="compact"
                    hide-details
                    class="duration-filter"
                    style="display: inline-block; width: 150px;"
                    @update:model-value="onDurationFilterChange"
                  ></v-select>
                </template>

                <v-select
                  v-model="pageSize"
                  :items="pageSizeOptions"
                  item-title="title"
                  item-value="value"
                  label="每页"
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="page-size-select ml-2"
                  style="display: inline-block; width: 100px;"
                ></v-select>
              </v-col>
            </v-row>
          </v-card-item>

          <!-- 文件列表 -->
          <v-card-text class="file-list-content">
            <v-data-table
              v-model="selectedFiles"
              :headers="headers"
              :items="files"
              :items-per-page="pageSize"
              :page="currentPage"
              :loading="loading"
              hover
              show-select
              class="file-table"
              hide-default-footer
              item-value="id"
            >
              <template v-slot:item.name="{ item }">
                <div
                  class="file-name-wrapper"
                  @click="openFile(item)"
                  @contextmenu.prevent="showContextMenu($event, item)"
                >
                  <div class="file-icon-row">
                    <FileIcon :extension="item.extension" :size="24"></FileIcon>
                  </div>
                  <div class="file-name-row">
                    <span class="file-name" :title="item.name">{{ item.name }}</span>
                  </div>
                </div>
              </template>
              <template v-slot:item.path="{ item }">
                <span class="file-path" :title="item.path">{{ item.path }}</span>
              </template>
              <template v-slot:item.size="{ item }">
                {{ formatSize(item.size) }}
              </template>
              <template v-slot:item.duration="{ item }">
                {{ formatDuration(item.duration) }}
              </template>
              <template v-slot:item.modified_time="{ item }">
                {{ formatDate(item.modified_time) }}
              </template>
              <template v-slot:item.extension="{ item }">
                <v-chip size="small" variant="outlined">{{ item.extension }}</v-chip>
              </template>
            </v-data-table>
          </v-card-text>

          <!-- 分页 -->
          <div class="file-list-footer">
            <div class="d-flex align-center justify-center w-100">
              <v-pagination
                v-model="currentPage"
                :length="totalPages"
                :total-visible="7"
                size="small"
              ></v-pagination>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- 删除确认对话框 -->
    <v-dialog v-model="deleteDialog.show" max-width="400">
      <v-card>
        <v-card-title class="text-h6">确认删除</v-card-title>
        <v-card-text>
          确定要删除选中的 {{ selectedFiles.length }} 个文件吗？<br>
          <span class="text-caption text-grey">此操作只会删除数据库记录，不会删除实际文件。</span>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="deleteDialog.show = false">取消</v-btn>
          <v-btn color="error" variant="elevated" @click="executeBatchDelete">删除</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 右键菜单 -->
    <v-menu
      v-model="contextMenu.show"
      :activator="contextMenuActivator"
      :location="contextMenu.location"
      transition="scale-transition"
      :close-on-content-click="true"
    >
      <v-list density="compact">
        <v-list-item @click="handleOpenFile">
          <template v-slot:prepend>
            <v-icon icon="mdi-open-in-app" size="small"></v-icon>
          </template>
          <v-list-item-title>打开</v-list-item-title>
        </v-list-item>
        <v-list-item @click="handleOpenInExplorer">
          <template v-slot:prepend>
            <v-icon icon="mdi-folder-open" size="small"></v-icon>
          </template>
          <v-list-item-title>在资源管理器中打开</v-list-item-title>
        </v-list-item>
        <v-divider></v-divider>
        <v-list-item @click="handleDeleteSingle" color="error">
          <template v-slot:prepend>
            <v-icon icon="mdi-delete" size="small" color="error"></v-icon>
          </template>
          <v-list-item-title class="text-error">删除记录</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-menu>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, inject } from 'vue'
import FileIcon from '@/components/FileIcon/index.vue'
import { searchApi } from '@/api'

interface FileResult {
  id: number
  name: string
  path: string
  extension: string
  size: number
  modified_time: string
  duration?: number
}

interface Category {
  key: string
  name: string
  icon: string
  count: number
}

interface ViewMode {
  key: string
  name: string
  icon: string
}

// 视图模式
const viewModes: ViewMode[] = [
  { key: 'all', name: '全部文件', icon: 'mdi-file-multiple' },
  { key: 'media', name: '媒体文件', icon: 'mdi-play-circle' },
  { key: 'large', name: '大文件', icon: 'mdi-file-cabinet' },
  { key: 'recent', name: '最近修改', icon: 'mdi-clock-outline' }
]

// 分类列表
const categories = ref<Category[]>([
  { key: 'all', name: '全部', icon: 'mdi-file-multiple', count: 0 },
  { key: 'images', name: '图片', icon: 'mdi-image-multiple', count: 0 },
  { key: 'documents', name: '文档', icon: 'mdi-file-document-multiple', count: 0 },
  { key: 'videos', name: '视频', icon: 'mdi-video', count: 0 },
  { key: 'audio', name: '音频', icon: 'mdi-music', count: 0 },
  { key: 'archives', name: '压缩包', icon: 'mdi-zip-box', count: 0 }
])

// 状态
const currentViewMode = ref('all')
const selectedCategory = ref('all')
const files = ref<FileResult[]>([])
const selectedFiles = ref<number[]>([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(50)
const totalPages = ref(0)
const durationFilter = ref<string | null>(null)

// 右键菜单
const contextMenu = ref({
  show: false,
  location: 'bottom' as string,
  selectedItem: null as FileResult | null
})
const contextMenuActivator = ref<HTMLElement | null>(null)

// 删除对话框
const deleteDialog = ref({
  show: false
})

// 每页选项
const pageSizeOptions = [
  { title: '20条', value: 20 },
  { title: '50条', value: 50 },
  { title: '100条', value: 100 },
  { title: '200条', value: 200 }
]

// 时长筛选选项
const durationFilterOptions = [
  { title: '全部', value: null },
  { title: '1分钟内', value: '0-60' },
  { title: '1-5分钟', value: '60-300' },
  { title: '5-30分钟', value: '300-1800' },
  { title: '30分钟以上', value: '1800-' }
]

// 表格列定义
const headers = computed(() => {
  const baseHeaders = [
    { title: '文件名', key: 'name', sortable: true, align: 'start' },
    { title: '路径', key: 'path', sortable: true, align: 'start' },
    { title: '类型', key: 'extension', sortable: true, align: 'start', width: '100px' },
    { title: '大小', key: 'size', sortable: true, align: 'start', width: '100px' },
    { title: '修改时间', key: 'modified_time', sortable: true, align: 'start', width: '150px' }
  ]
  
  // 媒体视图显示时长列
  if (currentViewMode.value === 'media') {
    baseHeaders.splice(4, 0, { title: '时长', key: 'duration', sortable: true, align: 'start', width: '100px' })
  }
  
  return baseHeaders
})

// 视图标题
const getViewTitle = computed(() => {
  const view = viewModes.find(v => v.key === currentViewMode.value)
  const category = categories.value.find(c => c.key === selectedCategory.value)
  return `${view?.name || '全部'} - ${category?.name || '全部'}`
})

const showSnackbar = inject('showSnackbar') as (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void
const openFileEditor = inject('openFileEditor') as (path: string, name: string) => void

// 选择视图模式
async function selectViewMode(mode: string) {
  currentViewMode.value = mode
  currentPage.value = 1
  await loadFiles()
}

// 选择分类
async function selectCategory(category: string) {
  selectedCategory.value = category
  currentPage.value = 1
  await loadFiles()
}

// 加载文件列表
async function loadFiles() {
  loading.value = true
  try {
    let data
    
    if (currentViewMode.value === 'media') {
      // 媒体视图：按时长筛选
      const { minDuration, maxDuration } = parseDurationFilter(durationFilter.value)
      data = await window.electronAPI.searchFilesByDuration(minDuration, maxDuration, currentPage.value, pageSize.value)
    } else {
      // 其他视图：按分类获取
      data = await window.electronAPI.getFilesByCategory(
        selectedCategory.value,
        currentPage.value,
        pageSize.value
      )
    }
    
    files.value = data.files || []
    totalPages.value = data.totalPages || 0
  } catch (error) {
    console.error('Load files failed:', error)
    showSnackbar('加载文件失败：' + (error as Error).message, 'error')
  } finally {
    loading.value = false
  }
}

// 解析时长筛选
function parseDurationFilter(filter: string | null): { minDuration?: number; maxDuration?: number } {
  if (!filter) return {}
  const [min, max] = filter.split('-').map(v => v ? parseInt(v) : undefined)
  return { minDuration: min, maxDuration: max }
}

// 时长筛选变化
function onDurationFilterChange() {
  currentPage.value = 1
  loadFiles()
}

// 清除选择
function clearSelection() {
  selectedFiles.value = []
}

// 确认批量删除
function confirmBatchDelete() {
  deleteDialog.value.show = true
}

// 执行批量删除
async function executeBatchDelete() {
  try {
    const result = await window.electronAPI.batchDeleteFiles(selectedFiles.value)
    if (result.success) {
      showSnackbar(`成功删除 ${result.deletedCount} 个文件`, 'success')
      selectedFiles.value = []
      await loadFiles()
      await loadFileCounts()
    } else {
      showSnackbar('删除失败：' + result.error, 'error')
    }
  } catch (error) {
    showSnackbar('删除失败：' + (error as Error).message, 'error')
  } finally {
    deleteDialog.value.show = false
  }
}

// 打开文件
function openFile(item: FileResult) {
  if (openFileEditor) {
    openFileEditor(item.path, item.name)
  }
}

// 显示右键菜单
function showContextMenu(event: MouseEvent, item: FileResult) {
  event.preventDefault()
  contextMenu.value.selectedItem = item
  contextMenuActivator.value = event.currentTarget as HTMLElement
  contextMenu.value.show = true
}

// 处理打开文件
function handleOpenFile() {
  if (contextMenu.value.selectedItem) {
    openFile(contextMenu.value.selectedItem)
  }
  contextMenu.value.show = false
}

// 处理在资源管理器中打开
function handleOpenInExplorer() {
  if (contextMenu.value.selectedItem) {
    const item = contextMenu.value.selectedItem
    const fullPath = `${item.path}\\${item.name}`
    window.electronAPI.showItemInFolder(fullPath)
  }
  contextMenu.value.show = false
}

// 处理单文件删除
async function handleDeleteSingle() {
  if (contextMenu.value.selectedItem) {
    const fileId = contextMenu.value.selectedItem.id
    try {
      const result = await window.electronAPI.batchDeleteFiles([fileId])
      if (result.success) {
        showSnackbar('删除成功', 'success')
        await loadFiles()
        await loadFileCounts()
      }
    } catch (error) {
      showSnackbar('删除失败：' + (error as Error).message, 'error')
    }
  }
  contextMenu.value.show = false
}

// 加载文件统计
async function loadFileCounts() {
  try {
    const counts = await window.electronAPI.getFileCounts()
    categories.value = [
      { key: 'all', name: '全部', icon: 'mdi-file-multiple', count: counts.all },
      { key: 'images', name: '图片', icon: 'mdi-image-multiple', count: counts.images },
      { key: 'documents', name: '文档', icon: 'mdi-file-document-multiple', count: counts.documents },
      { key: 'videos', name: '视频', icon: 'mdi-video', count: counts.videos },
      { key: 'audio', name: '音频', icon: 'mdi-music', count: counts.audio },
      { key: 'archives', name: '压缩包', icon: 'mdi-zip-box', count: counts.archives }
    ]
  } catch (error) {
    console.error('Load file counts failed:', error)
  }
}

// 格式化文件大小
function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 格式化时长
function formatDuration(seconds?: number): string {
  if (!seconds) return '-'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

// 格式化日期
function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '-'
  return date.toLocaleString('zh-CN')
}

// 监听分页变化
watch(currentPage, loadFiles)
watch(pageSize, () => {
  currentPage.value = 1
  loadFiles()
})

onMounted(() => {
  loadFileCounts()
  loadFiles()
})
</script>

<style lang="scss" scoped>
.file-list-container {
  height: calc(100vh - 100px);
  overflow: hidden;
}

.category-sidebar {
  height: 100%;
  overflow-y: auto;
  border-right: 1px solid rgba(0, 0, 0, 0.12);
}

.category-list {
  padding: 0;
}

.category-item {
  cursor: pointer;
  
  &:hover {
    background-color: rgba(0, 0, 0, 0.04);
  }
  
  &.v-list-item--active {
    background-color: rgba(var(--v-theme-primary), 0.12);
  }
}

.file-list-area {
  height: 100%;
  overflow: hidden;
}

.file-list-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.file-list-content {
  flex: 1;
  overflow: auto;
  padding: 0;
}

.file-list-footer {
  padding: 8px 16px;
  border-top: 1px solid rgba(0, 0, 0, 0.12);
}

.file-table {
  .file-name-wrapper {
    display: flex;
    align-items: center;
    cursor: pointer;
  }
  
  .file-icon-row {
    margin-right: 8px;
  }
  
  .file-name {
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .file-path {
    max-width: 250px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: rgba(0, 0, 0, 0.6);
  }
}

.duration-filter,
.page-size-select {
  :deep(.v-field) {
    min-height: 32px;
  }
}
</style>
```

**用途**：完整的文件列表视图组件，包含分类展示、批量操作、时长筛选功能。

### 6.2 创建文件：src/views/FileList/index.scss

```scss
// FileList 样式文件
// 主要样式已在 Vue 文件的 scoped style 中定义
// 此处可添加额外的全局样式或覆盖样式

.file-list-container {
  // 确保表格行高一致
  :deep(.v-data-table__tr) {
    height: 48px;
  }
  
  // 选中行样式
  :deep(.v-data-table__tr--selected) {
    background-color: rgba(var(--v-theme-primary), 0.08);
  }
  
  // 复选框列样式
  :deep(.v-data-table__th--checkbox),
  :deep(.v-data-table__td--checkbox) {
    width: 48px;
    min-width: 48px;
  }
}
```

**用途**：文件列表组件的额外样式。

---

## 七、类型声明更新

### 7.1 修改文件：electron/preload.d.ts

#### 在 ElectronAPI 接口中添加新的方法声明（约第 31 行后）：

```typescript
export interface ElectronAPI {
  // ... 现有方法 ...
  
  // 按时长搜索文件
  searchFilesByDuration: (minDuration?: number, maxDuration?: number, page?: number, pageSize?: number) => Promise<any>;
  
  // 批量删除文件
  batchDeleteFiles: (fileIds: number[]) => Promise<any>;
}
```

**用途**：为 TypeScript 提供类型支持。

---

## 八、功能实现顺序

### 阶段一：数据库和后端基础（第1-2天）

1. **修改 databaseInit.ts**
   - 添加 duration 字段到 files 表
   - 添加 idx_duration 索引

2. **修改 fileService.ts**
   - 更新 FileResult 接口添加 duration 字段

3. **修改 fileIndexer.ts**
   - 更新 FileInfo 接口添加 duration 字段
   - 添加 getMediaDuration 方法
   - 在索引时提取并保存时长

4. **修改 databaseService.ts**
   - 更新 addFile 方法支持 duration
   - 添加 searchFilesByDuration 方法
   - 添加 deleteFiles 批量删除方法

### 阶段二：Electron IPC 层（第2天）

5. **修改 electron/main.js**
   - 注册 search-files-by-duration 处理器
   - 注册 batch-delete-files 处理器

6. **修改 electron/preload.ts**
   - 暴露 searchFilesByDuration API
   - 暴露 batchDeleteFiles API

7. **修改 electron/preload.d.ts**
   - 添加类型声明

### 阶段三：前端 API 层（第2天）

8. **修改 src/api/types/search.ts**
   - 添加 duration 字段到 FileResult
   - 添加 minDuration/maxDuration 到 SearchOptions
   - 添加 BatchOperationRequest 接口

9. **修改 src/api/modules/search.ts**
   - 添加 searchFilesByDuration 方法
   - 添加 batchDeleteFiles 方法

### 阶段四：UI 组件（第3天）

10. **修改 src/App.vue**
    - 添加"文件列表" Tab
    - 导入 FileList 组件

11. **创建 src/views/FileList/index.vue**
    - 实现完整的文件列表组件

12. **创建 src/views/FileList/index.scss**
    - 添加组件样式

### 阶段五：测试和优化（第4天）

13. 测试各功能模块
14. 优化性能和用户体验
15. 处理边界情况

---

## 九、注意事项

### 9.1 数据库迁移

- 修改表结构后，需要重新启动后端服务以触发数据库初始化
- duration 字段默认值为 NULL，现有记录不会受到影响
- 只有新索引的媒体文件会包含时长信息

### 9.2 媒体时长获取

- 当前使用文件大小估算时长，精度有限
- 建议后续使用 `fluent-ffmpeg` 库获取准确时长：
  ```bash
  npm install fluent-ffmpeg @types/fluent-ffmpeg
  ```

### 9.3 批量删除

- 批量删除只删除数据库记录，不会删除实际文件
- 删除操作不可逆，需要用户确认
- 删除时会级联删除关联的 file_contents 记录

### 9.4 性能考虑

- 大量文件时，批量删除可能较慢，考虑添加进度提示
- 时长筛选只针对媒体文件，避免全表扫描
- 考虑添加虚拟滚动优化大量文件列表的渲染性能

---

## 十、扩展建议

### 10.1 后续可添加的功能

1. **文件预览** - 在列表中直接预览图片、视频缩略图
2. **批量移动/复制** - 支持选择目标文件夹进行批量操作
3. **智能分类** - 基于 AI 的文件内容识别和自动分类
4. **重复文件检测** - 基于 hash 值查找重复文件
5. **文件标签** - 支持为文件添加自定义标签

### 10.2 代码优化方向

1. 提取可复用的表格组件
2. 使用 Pinia 管理文件列表状态
3. 添加虚拟滚动处理大量数据
4. 实现文件列表的缓存机制
