# Electron 手动安装指南

由于网络限制，Electron 二进制文件无法自动下载。请按照以下步骤手动安装：

## 方法 1：手动下载 Electron 二进制文件

1. **下载 Electron 二进制文件**
   - 访问：https://npmmirror.com/mirrors/electron/28.3.3/
   - 下载：`electron-v28.3.3-win32-x64.zip` (Windows 64位)
   - 或访问：https://github.com/electron/electron/releases/download/v28.3.3/electron-v28.3.3-win32-x64.zip

2. **解压文件**
   - 将下载的 zip 文件解压
   - 解压后应该有一个 `electron.exe` 文件

3. **创建目录结构**
   ```
   node_modules/electron/dist/
   ```

4. **复制文件**
   - 将解压后的所有文件复制到 `node_modules/electron/dist/` 目录
   - 确保 `electron.exe` 在 `node_modules/electron/dist/` 目录下

5. **创建 path.txt**
   - 在 `node_modules/electron/` 目录下创建 `path.txt` 文件
   - 内容为：`dist/electron.exe`

## 方法 2：使用有外网访问的机器

1. 在有外网访问的机器上运行：
   ```bash
   pnpm install
   ```

2. 复制整个 `node_modules/electron/` 目录到当前项目

## 方法 3：配置代理允许访问外网

联系网络管理员，允许访问以下域名：
- github.com
- npmmirror.com
- releases.electronjs.org

## 验证安装

运行以下命令验证 Electron 是否正确安装：
```bash
npx electron --version
```

如果显示版本号（如 `v28.3.3`），说明安装成功。

## 启动应用

安装成功后，运行：
```bash
npm run electron:dev
```
