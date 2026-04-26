# SuperUtils 项目规则

## 技术栈

- **前端**: Electron + Vue 3 + Vuetify 3 + Vite + Pinia + TypeScript
- **后端**: Node.js + Express + SQLite（sql.js）
- **包管理**: pnpm workspace
- **开发**: Vite HMR + tsx watch

## 启动

```bash
pnpm dev          # 同时启动 server + 前端
pnpm dev:server   # 仅后端 (server/src/index.ts)
pnpm dev:client   # 仅前端 (Vite)
pnpm build        # 构建
pnpm pack         # 打包 Electron
```

## 组件规范

组件放在语义化的文件夹中，每个组件包含：
- `index.vue` - 组件入口
- `index.scss` - 样式文件（与 vue 文件同级）

## API 请求规范

使用 `reqResolve` + `reqToast` 处理所有 API 请求：
- 成功不提示：`reqToast({ showSuccess: false, errorMsg: '...' })`
- 成功提示：`reqToast({ successMsg: '删除成功', errorMsg: '...' })`
- **不要**用 `successMsg: ''`（空字符串会让 || 继续执行，反而显示响应 msg）

## 数据库

- 当前使用 SQLite：`server/src/data/superutils.db`
- 数据库操作通过 `server/src/services/databaseService.ts`
- 初始化脚本：`server/src/services/databaseInit.ts`

## 重要路径

- 前端源码：`src/`
- 后端源码：`server/src/`
- 数据库文件：`server/src/data/superutils.db`
- 文档输出：`.docs/YYYY-MM-DD/`

## Git 规范

使用 conventional commits：
- `feat(scope): 新功能`
- `fix(scope): 修复`
- `refactor(scope): 重构`
- `docs(scope): 文档`
- `style(scope): 格式`
- `perf(scope): 性能`
- `chore(scope): 其他`

## 注意事项

- 不修改 `.example/` 目录（示例/参考项目）
- Electron 主进程代码在 `electron/` 目录
- server 使用 tsx 直接运行，不编译也可 dev
