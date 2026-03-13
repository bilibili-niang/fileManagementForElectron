import { DataSource, Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm'
import mysql from 'mysql2/promise'
import * as fs from 'fs'
import * as path from 'path'
import { app } from 'electron'

export interface Config {
  mysql: {
    host: string
    port: number
    username: string
    password: string
    database: string
  }
  indexing: {
    excludeC: boolean
    excludeNodeModules: boolean
    lastIndexed: string | null
    schedule: string
  }
}

@Entity('file_index')
export class FileIndex {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: 'varchar', length: 1024 })
  path: string

  @Column({ type: 'varchar', length: 255 })
  name: string

  @Column({ type: 'varchar', length: 50, nullable: true })
  extension: string

  @Column({ type: 'bigint' })
  size: number

  @Column({ type: 'datetime' })
  modified_time: Date

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  indexed_time: Date

  @Index()
  @Column({ type: 'varchar', length: 255 })
  name_index: string

  @Index()
  @Column({ type: 'varchar', length: 50, nullable: true })
  extension_index: string
}

let dataSource: DataSource | null = null

export async function createDataSource(config: Config): Promise<DataSource> {
  if (dataSource) {
    return dataSource
  }

  dataSource = new DataSource({
    type: 'mysql',
    host: config.mysql.host,
    port: config.mysql.port,
    username: config.mysql.username,
    password: config.mysql.password,
    database: config.mysql.database,
    entities: [FileIndex],
    synchronize: true,
    logging: false,
    extra: {
      connectionLimit: 10,
      connectTimeout: 30000
    }
  })

  await dataSource.initialize()
  return dataSource
}

export async function testConnection(config: Config): Promise<boolean> {
  try {
    const connection = await mysql.createConnection({
      host: config.mysql.host,
      port: config.mysql.port,
      user: config.mysql.username,
      password: config.mysql.password,
      database: config.mysql.database
    })
    await connection.end()
    return true
  } catch (error) {
    console.error('Database connection test failed:', error)
    throw error
  }
}

export async function saveConfig(config: Config): Promise<void> {
  const configPath = path.join(app.getPath('userData'), 'config.json')
  await fs.promises.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8')
}

export async function loadConfig(): Promise<Config | null> {
  const configPath = path.join(app.getPath('userData'), 'config.json')
  try {
    const data = await fs.promises.readFile(configPath, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    return null
  }
}

export function validateConfig(config: Config): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!config.mysql.host || config.mysql.host.trim() === '') {
    errors.push('主机地址不能为空')
  }

  if (config.mysql.port < 1 || config.mysql.port > 65535) {
    errors.push('端口范围必须在 1-65535 之间')
  }

  if (!config.mysql.username || config.mysql.username.trim() === '') {
    errors.push('用户名不能为空')
  }

  if (!config.mysql.password || config.mysql.password.trim() === '') {
    errors.push('密码不能为空')
  }

  if (!config.mysql.database || config.mysql.database.trim() === '') {
    errors.push('数据库名称不能为空')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

export function getDataSource(): DataSource | null {
  return dataSource
}

export async function closeDataSource(): Promise<void> {
  if (dataSource) {
    await dataSource.destroy()
    dataSource = null
  }
}
