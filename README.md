# ai-workbench-frontend

AI 工作台 · 前端。React 19 + TypeScript + Vite 8。

## 快速开始

```bash
npm install
npm run dev        # http://localhost:5173
```

其他命令：

```bash
npm run build      # 类型检查 + 生产构建，输出到 dist/
npm run preview    # 本地预览生产构建
npm run typecheck  # 只做类型检查
```

## 与后端联调

`vite.config.ts` 里已配置代理，前端请求 `/api` 和 `/actuator` 会自动转发到 `http://localhost:8080`（后端默认端口），因此开发时不需要处理 CORS。

后端仓库：[Sharefo/ai-workbench-backend](https://github.com/Sharefo/ai-workbench-backend)

## 目录结构

```
src/
├── App.tsx          # 工作台主页面，含后端连通性检查
├── main.tsx         # React 入口
├── index.css        # 全局样式
└── App.css          # 主页面样式
```

## 技术栈

| 项 | 版本 |
|---|---|
| React | 19.x |
| Vite | 8.x |
| TypeScript | 5.9 |

## 许可证

MIT
