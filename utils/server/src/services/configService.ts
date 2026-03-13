import fs from 'fs/promises';
import path from 'path';
import { DatabaseService } from './databaseService';

export interface Config {
  mysql: {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
  };
  indexing: {
    excludeC: boolean;
    excludeNodeModules: boolean;
    lastIndexed: string | null;
    schedule: string;
  };
}

const CONFIG_FILE = path.join(process.cwd(), 'config.json');

export class ConfigService {
  private dbService: DatabaseService;

  constructor() {
    this.dbService = new DatabaseService();
  }

  // 加载配置
  async loadConfig(): Promise<Config | null> {
    try {
      const data = await fs.readFile(CONFIG_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      // 如果文件不存在，返回默认配置
      return {
        mysql: {
          host: 'localhost',
          port: 3306,
          username: 'root',
          password: '123456',
          database: 'superutils_file_manager'
        },
        indexing: {
          excludeC: true,
          excludeNodeModules: true,
          lastIndexed: null,
          schedule: ''
        }
      };
    }
  }

  // 保存配置
  async saveConfig(config: Config): Promise<void> {
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  }

  // 测试数据库连接
  async testDatabaseConnection(config: {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
  }): Promise<boolean> {
    try {
      // 创建临时连接池
      const mysql = await import('mysql2/promise');
      const pool = mysql.createPool({
        host: config.host,
        port: config.port,
        user: config.username,
        password: config.password,
        database: config.database,
        waitForConnections: true,
        connectionLimit: 1,
        queueLimit: 0
      });

      await pool.execute('SELECT 1');
      await pool.end();
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }
}
