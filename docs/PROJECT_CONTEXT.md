# 亚马逊运营工作台项目文档

文档版本：`v0.1.0`

最后更新：`2026-08-05`

项目路径：`D:\桌面\工作\工作台`

## 1. 项目定位

这是一个给个人使用的亚马逊运营工作台网站。目标不是做公开营销页，也不是完整 ERP，而是把日常运营里高频使用的入口、计算、临时资料和备忘集中到一个页面。

当前项目优先满足：

- 可以托管到 GitHub Pages。
- 打开即用，不依赖服务器。
- 不上传敏感文件到公网。
- 页面结构清楚，适合每天重复使用。
- 后续可以逐步接入真实业务数据、文件存储或 Amazon SP-API。

## 2. 当前产品范围

当前版本是静态前端 MVP，包含这些模块：

- 概览：展示每日运营巡检流程。
- 日常巡检流程支持在浏览器本地新增、编辑、删除和恢复默认。
- 巡检流程和备忘录支持浏览器打开期间的时间提醒。
- 利润测算：输入售价、采购成本、物流、FBA 费用、广告花费、佣金比例，计算利润、利润率和 ROI。
- 上架前检查：一组本地勾选项，用于 Listing 发布前快速复核。
- 上传文件区：通过 Cloudflare Worker 把文件写入私密 GitHub 仓库 `amazon-ops-workbench-files`。
- 上传文件区支持从私密仓库刷新列表，并通过 Worker 代理预览和下载。
- 备忘录：保存运营事项到当前浏览器的 localStorage，可新增、删除。

明确不在当前版本内：

- 登录系统。
- 完整云盘管理能力，例如云端删除、权限分组、分享链接和审计。
- Amazon SP-API 授权和自动拉取销售数据。
- 团队协作、权限管理、审计日志。

## 3. 重要边界

GitHub Pages 只能托管静态文件，不能直接安全保存用户上传文件到 GitHub 私密仓库。因此当前文件区分为两类：

- 上传文件区：前端把文件发给 Cloudflare Worker，Worker 使用 secret 中的 GitHub token 写入私密仓库 `amazon-ops-workbench-files`。

上传文件命名规则：

- 新上传文件名使用 `YYYY-MM-DD-原文件名` 格式。
- 仓库路径按月份和日期分目录，例如 `uploads/2026-08/25/2026-08-25-report.xlsx`。
- 修改命名规则不会自动改名历史文件。

上传文件区意味着：

- 文件会进入私密 GitHub 仓库和 Git 历史。
- 前端不能保存 GitHub token，只能保存用户输入的上传密钥。
- 上传密钥用于限制公开网页的上传入口，不能替代完整登录系统。
- GitHub 仓库更适合低频小文件归档，不适合大文件或高频网盘。

如果未来需要真正网盘，优先方案是：

- Cloudflare R2 + Worker：适合低成本对象存储和分享链接。
- Supabase Storage：适合带登录、数据库和文件存储的一体化方案。
- GitHub API：只适合保存配置或低频小文件，不适合业务文件网盘。

## 4. 技术栈

当前技术栈：

- Vite
- React
- TypeScript
- lucide-react
- 原生 CSS
- GitHub Actions
- GitHub Pages

选择原因：

- Vite 构建快，部署到 Pages 简单。
- React 适合做交互型工作台。
- TypeScript 方便维护计算和本地数据结构。
- 原生 CSS 足够当前项目使用，避免过早引入 Tailwind 或 UI 框架。
- `base: './'` 让构建产物更适配不同 GitHub Pages 路径。

## 5. 目录结构

```text
D:\桌面\工作\工作台
├─ .github/
│  └─ workflows/
│     └─ deploy.yml
├─ docs/
│  └─ PROJECT_CONTEXT.md
├─ public/
│  ├─ favicon.svg
│  └─ icons.svg
├─ src/
│  ├─ App.tsx
│  ├─ main.tsx
│  └─ style.css
├─ .gitignore
├─ AGENTS.md
├─ README.md
├─ index.html
├─ package.json
├─ package-lock.json
├─ tsconfig.json
└─ vite.config.ts
```

核心文件说明：

- `src/App.tsx`：主业务界面和本地状态逻辑。
- `src/style.css`：完整视觉样式和响应式布局。
- `src/main.tsx`：React 入口。
- `vite.config.ts`：Vite 配置，当前使用 `base: './'`。
- `worker/upload.js`：Cloudflare Worker 上传中转服务。
- `wrangler.toml`：Worker 部署配置，不包含 secret。
- `.github/workflows/deploy.yml`：GitHub Pages 自动部署。
- `AGENTS.md`：给后续 Codex 会话的快速入口。
- `README.md`：给用户和 GitHub 仓库首页看的简短说明。
- `docs/DESIGN.md`：产品、视觉、交互、技术设计细节。
- `docs/CONTENT.md`：页面模块、文案、工具入口和内容维护规范。
- `docs/VERSION.md`：版本记录、当前状态和后续路线。

## 6. 视觉和交互设计

界面类型：运营型 SaaS dashboard。

设计目标：

- 稳定、耐看、适合重复使用。
- 信息密度高，但不拥挤。
- 避免营销页风格、巨型 hero、装饰性卡片堆叠。
- 让“今天要看什么、用什么工具、记录什么”一眼可见。

当前视觉方向：

- 温暖纸色背景。
- 黑色/深墨色文本。
- 青绿色作为主操作和状态色。
- 琥珀色作为亚马逊运营语境里的辅助色。
- 卡片圆角控制在 8px 内。
- 使用 lucide 图标辅助按钮识别。

当前布局：

- 桌面端左侧固定导航，右侧工作区。
- 工作区顶部按需显示通知入口。
- 备忘录位于主内容前部，后面依次是概览、利润测算、上架检查和上传文件区。
- 移动端改为单列布局，导航变成两列按钮。

## 7. 数据模型

### 7.1 备忘录 Note

```ts
type Note = {
  id: string
  title: string
  body: string
  tag: string
  createdAt: string
}
```

存储位置：

```text
localStorage["amazon-workbench-notes"]
```

### 7.2 上传文件 UploadedFile

```ts
type UploadedFile = {
  id: string
  name: string
  size: number
  type: string
  uploadedAt: string
  path: string
  htmlUrl?: string
  commitUrl?: string
  sha?: string
}
```

存储位置：

```text
localStorage["amazon-workbench-uploaded-files"]
localStorage["amazon-workbench-upload-key"]
GitHub private repo: yhwork678678678/amazon-ops-workbench-files
```

上传链路：

```text
GitHub Pages 前端 -> Cloudflare Worker -> GitHub Contents API -> 私密文件仓库
```

读取链路：

```text
GitHub Pages 前端 -> Cloudflare Worker -> GitHub Git Trees / Contents API -> 文件列表、预览或下载
```

### 7.3 利润测算 CalculatorState

```ts
type CalculatorState = {
  salePrice: number
  cost: number
  shipping: number
  fbaFee: number
  adSpend: number
  referralRate: number
}
```

存储位置：

```text
localStorage["amazon-workbench-calculator"]
```

计算逻辑：

```text
referralFee = salePrice * referralRate / 100
totalCost = cost + shipping + fbaFee + adSpend + referralFee
profit = salePrice - totalCost
margin = profit / salePrice * 100
roi = profit / (cost + shipping) * 100
```

### 7.4 巡检流程 Workflow

```ts
type Workflow = {
  id: string
  time: string
  title: string
  body: string
  reminderEnabled: boolean
  reminderMinutes: number
}
```

存储位置：

```text
localStorage["amazon-workbench-workflows"]
```

页面支持新增、编辑、删除和恢复默认流程。数据只保存在当前浏览器，不会上传到 GitHub。

备忘录可选设置 `dueAt` 日期时间。页面每 30 秒检查一次到期项，在未来 24 小时内显示提醒；获得浏览器通知权限后，同时发送系统通知。网页完全关闭时不保证提醒。

## 8. 部署设计

当前部署方式：GitHub Pages + GitHub Actions。

部署 workflow：

```text
.github/workflows/deploy.yml
```

触发条件：

- 推送到 `main` 分支。
- 手动 `workflow_dispatch`。

GitHub 仓库设置：

1. 打开仓库 `Settings`。
2. 进入 `Pages`。
3. Source 选择 `GitHub Actions`。
4. 推送 `main` 后自动构建并部署。

构建命令：

```powershell
npm run build
```

产物目录：

```text
dist/
```

## 9. 本地开发命令

安装依赖：

```powershell
npm install
```

启动开发服务器：

```powershell
npm run dev
```

构建验证：

```powershell
npm run build
```

类型检查：

```powershell
npm run check
```

PowerShell 7 当前可用路径：

```powershell
D:\Tools\PowerShell\current\pwsh.exe
```

如果新终端已继承用户 Path，可以直接运行：

```powershell
pwsh
```

## 10. Git 状态

当前仓库已初始化为 Git 仓库。

默认分支：

```text
main
```

首个提交：

```text
5b8d7fc Initial Amazon ops workbench
```

当前 `.gitignore` 已忽略：

- `node_modules/`
- `dist/`
- `.vite/`
- `*.local`
- 常见 npm/yarn/pnpm debug 日志
- `.DS_Store`
- `Thumbs.db`
- `.dev-server.*`

## 11. 后续功能路线

### v0.2 建议优先级

- 增加工具链接管理：支持用户自己新增、编辑、删除常用链接。
- 增加备忘搜索和标签筛选。
- 增加利润测算模板：按站点、品类、产品保存多组测算。
- 增加 CSV 解析入口：先支持广告报表或业务报表拖入后本地解析。

### v0.3 建议优先级

- 增加本地导入/导出：把备忘、工具链接、测算配置导出为 JSON。
- 增加工作日报：从备忘和检查项生成当天运营记录。
- 增加库存预警计算器：根据 7/14/30 天日均销量估算可售天数。

### v1.0 可选方向

- 接 Cloudflare R2 做真正临时网盘。
- 接 Supabase 做登录、数据库和文件存储。
- 接 Amazon SP-API 做订单、库存、广告、财务等数据看板。
- 加权限和加密策略，避免运营敏感数据泄露。

## 12. 开发注意事项

- 不要把真实运营数据写进示例代码。
- 不要把用户文件放进 `public/` 或提交进 Git。
- 不要在仓库里保存 Amazon、GitHub、Cloudflare、Supabase 等 token。
- 改动涉及界面时，要检查桌面和移动端布局。
- 改动涉及本地存储时，要考虑旧数据兼容。
- 改动完成后运行 `npm run build`。

## 13. 当前已验证事项

截至 `2026-08-05`：

- `npm run build` 可通过。
- PowerShell 7.6.4 已下载并解压到 `D:\Tools\PowerShell\current`。
- PowerShell 7 的 `&&` 命令链已用完整路径验证可用。
- 用户 Path 已加入 `D:\Tools\PowerShell\current`，新终端应可直接使用 `pwsh`。
- `winget install Microsoft.PowerShell` 曾长时间卡住，已停止该 `winget` 进程，改用官方 ZIP 便携安装。
- PowerShell ZIP 的 SHA-256 已校验匹配官方 release：`80832551C52809301E6071C8BAC977BEB5A2F1EC953EB4DB9F94DEB953333793`。

## 14. 给后续 Codex 的快速接手步骤

进入项目后先执行：

```powershell
git status --short
npm run build
```

如果要启动本地预览：

```powershell
npm run dev
```

如果当前终端仍是 Windows PowerShell 5.1，需要 PowerShell 7 语法时：

```powershell
& "D:\Tools\PowerShell\current\pwsh.exe"
```

如果用户要求部署到 GitHub：

1. 确认是否已有远程仓库。
2. 如无远程仓库，创建 GitHub repo 或让用户指定 repo 名称。
3. 添加 remote。
4. 推送 `main`。
5. 确认 Pages Source 是 `GitHub Actions`。
6. 查看 Actions 部署结果。
