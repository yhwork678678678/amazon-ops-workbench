# 项目上下文入口

本项目是用户的“亚马逊运营个人工作台”，用于部署到 GitHub Pages。任何后续 Codex 会话进入本仓库后，先阅读：

- `docs/PROJECT_CONTEXT.md`
- `README.md`

## 当前执行原则

- 默认使用简体中文沟通。
- 保持项目可静态部署到 GitHub Pages，除非用户明确要求接入后端。
- 不要把运营文件、账号、API key、cookie、token、真实业务敏感数据提交进仓库。
- 当前临时文件区只使用浏览器 `IndexedDB`，备忘录只使用浏览器 `localStorage`。
- 代码改动后至少运行 `npm run build` 验证。
- 不要提交 `node_modules/`、`dist/`、本地日志或临时文件。

## 当前本机环境提示

- 项目路径：`D:\桌面\工作\工作台`
- Git 默认分支：`main`
- PowerShell 7 便携安装路径：`D:\Tools\PowerShell\current\pwsh.exe`
- 如果当前旧终端找不到 `pwsh`，新开终端通常会继承用户 `Path`；当前会话可直接使用完整路径。
