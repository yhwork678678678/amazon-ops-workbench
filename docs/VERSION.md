# 版本文档

文档版本：`v0.1.0`

最后更新：`2026-08-05`

## 当前状态

当前项目已完成静态 MVP，并已初始化 Git。

当前分支：

```text
main
```

已验证命令：

```powershell
npm run build
```

验证结果：

```text
TypeScript 编译通过
Vite production build 通过
dist/ 构建产物生成成功
```

## 版本记录

### v0.1.4 - 文件区拆分和私密上传

日期：`2026-08-24`

包含内容：

- 文件区拆分为临时文件区和上传文件区。
- 临时文件继续保存在当前浏览器 IndexedDB。
- 上传文件区通过 Cloudflare Worker 写入私密 GitHub 仓库。
- 新增 Worker 部署配置和上传密钥机制，避免前端暴露 GitHub token。

### v0.1.3 - 巡检和备忘提醒

日期：`2026-08-09`

包含内容：

- 巡检流程支持准时或提前提醒。
- 备忘录支持设置日期和时间。
- 增加页面内待办提醒和浏览器系统通知。
- 明确网页关闭后不保证提醒的静态部署边界。

### v0.1.2 - 巡检流程自定义

日期：`2026-08-09`

包含内容：

- 日常巡检流程支持新增、编辑和删除。
- 增加恢复默认流程入口。
- 巡检流程保存到当前浏览器的 `localStorage`。

### v0.1.0 - 初始工作台

日期：`2026-08-05`

对应提交：

```text
5b8d7fc Initial Amazon ops workbench
```

包含内容：

- 初始化 Vite + React + TypeScript 项目。
- 添加亚马逊运营工作台首页。
- 添加常用工具入口。
- 添加利润测算器。
- 添加上架前检查清单。
- 添加浏览器本地临时文件区。
- 添加浏览器本地备忘录。
- 添加 GitHub Pages 部署 workflow。
- 添加 `.gitignore`。

### v0.1.1 - 项目文档

日期：`2026-08-05`

对应提交：

```text
b325231 Add project context documentation
```

包含内容：

- 添加 `AGENTS.md`。
- 添加 `docs/PROJECT_CONTEXT.md`。
- 更新 `README.md`，指向项目文档。

当前后续文档补充：

- 添加 `docs/DESIGN.md`。
- 添加 `docs/CONTENT.md`。
- 添加 `docs/VERSION.md`。
- 更新 `AGENTS.md` 和 `PROJECT_CONTEXT.md` 的文档入口。

## 环境变更记录

### PowerShell 7 安装

日期：`2026-08-05`

原因：

当前默认终端是 Windows PowerShell `5.1.26100.8875`，不支持 `&&` 命令链语法。为了后续开发更顺手，安装 PowerShell 7。

安装方式：

- `winget install --id Microsoft.PowerShell` 曾长时间卡住。
- 已停止卡住的 `winget` 进程。
- 改用 PowerShell 官方 GitHub release ZIP 便携安装。

安装路径：

```text
D:\Tools\PowerShell\current\pwsh.exe
```

版本：

```text
7.6.4
```

校验：

```text
PowerShell-7.6.4-win-x64.zip
SHA-256: 80832551C52809301E6071C8BAC977BEB5A2F1EC953EB4DB9F94DEB953333793
```

说明：

- 用户 Path 已加入 `D:\Tools\PowerShell\current`。
- 新开的终端通常可以直接运行 `pwsh`。
- 当前 Codex 会话如果仍找不到 `pwsh`，使用完整路径即可。

## 下个版本建议

### v0.2.0

目标：让工作台从“固定页面”变成“可自定义个人工具台”。

建议任务：

- 工具链接支持新增、编辑、删除。
- 工具链接保存到 `localStorage`。
- 备忘支持搜索。
- 备忘支持按标签筛选。
- 利润测算支持保存多个产品模板。
- 增加导出/导入 JSON，方便迁移浏览器本地数据。

### v0.3.0

目标：开始处理运营文件。

建议任务：

- 拖入广告 CSV 后本地解析。
- 输出 ACOS、CTR、CVR、花费、订单等基础指标。
- 标记异常广告组和关键词。
- 生成当天广告优化建议。

### v1.0.0

目标：成为可长期使用的个人运营系统。

建议任务：

- 接入 Cloudflare R2 或 Supabase Storage。
- 增加登录。
- 增加远程同步。
- 增加 Amazon SP-API 后端代理。
- 增加安全策略和备份策略。

## 发布检查清单

每次准备发布前：

```powershell
git status --short
npm run build
```

如果要推送 GitHub：

```powershell
git remote -v
git push -u origin main
```

推送后检查：

- GitHub Actions 是否执行成功。
- GitHub Pages Source 是否为 `GitHub Actions`。
- 页面是否能打开。
- 页面刷新后是否仍正常。
- 备忘和文件区是否符合当前“本地保存”边界。
