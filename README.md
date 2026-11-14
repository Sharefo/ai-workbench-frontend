# ai-workbench-frontend

AI 工作台 · 前端。React 19 + TypeScript + Vite 8 + Ant Design 6 + CodeMirror 6。

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
├── App.tsx                     # 工作台外壳：顶部 Tab（首页 / SQL 实验室）
├── pages/
│   ├── HomePage.tsx
│   └── SqlLabPage.tsx          # SQL 实验室：三栏布局与全部状态编排
├── features/sqllab/
│   ├── api.ts                  # 后端接口封装 + SSE 流式读取
│   ├── types.ts                # 与后端 DTO 对齐的 TS 类型
│   ├── session.ts              # 数据空间 id（localStorage）与闯关进度
│   ├── utils/csv.ts
│   ├── components/
│   │   ├── SchemaTree.tsx      # 左：库表结构树 + 样例数据
│   │   ├── SqlEditor.tsx       # 中上：CodeMirror 6 编辑器（表名/字段自动补全）
│   │   ├── ResultPanel.tsx     # 中下：结果表格 / 执行日志
│   │   ├── AiPanel.tsx         # 右：AI 生成 / 修复 / 讲解
│   │   ├── SeedPanel.tsx       # 右：一句话造数
│   │   ├── ExercisePanel.tsx   # 右：闯关练习 + 自动判分
│   │   └── SessionBar.tsx     # 顶：数据空间切换
└── styles/sqllab.css
```

## 技术栈

| 项 | 版本 |
|---|---|
| React | 19.x |
| Vite | 8.x |
| TypeScript | 5.9 |
| Ant Design | 6.x（原生支持 React 19） |
| CodeMirror | 6.x（`@codemirror/lang-sql`，MySQL 方言） |

## 许可证

MIT
