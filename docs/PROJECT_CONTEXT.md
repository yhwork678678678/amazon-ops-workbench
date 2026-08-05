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
- 常用工具：Seller Central、Amazon Ads、FBA Calculator、Keepa、Helium 10、Brand Analytics 等入口。
- 利润测算：输入售价、采购成本、物流、FBA 费用、广告花费、佣金比例，计算利润、利润率和 ROI。
- 上架前检查：一组本地勾选项，用于 Listing 发布前快速复核。
- 临时文件区：选择文件后保存到当前浏览器的 IndexedDB，可下载、删除。
- 备忘录：保存运营事项到当前浏览器的 localStorage，可新增、删除。

明确不在当前版本内：

- 登录系统。
- 多设备同步。
- 真正的云盘上传。
- Amazon SP-API 授权和自动拉取销售数据。
- 团队协作、权限管理、审计日志。

## 3. 重要边界

GitHub Pages 只能托管静态文件，不能直接保存用户上传文件到服务器。因此当前文件区采用浏览器本地存储。

这意味着：

- 文件只在当前浏览器、当前设备可见。
- 清理浏览器数据可能会删除文件和备忘。
- 换电脑或换浏览器后不会同步。
- 不会把文件上传到 GitHub，也不会进入 Git 历史。

如果未来需要真正临时网盘，优先方案是：

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
- `.github/workflows/deploy.yml`：GitHub Pages 自动部署。
- `AGENTS.md`：给后续 Codex 会话的快速入口。
- `README.md`：给用户和 GitHub 仓库首页看的简短说明。

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
- 工作区顶部是当天工作说明和两个快捷按钮。
- 中部按模块分区：概览、工具、利润、检查、文件、备忘。
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

### 7.2 临时文件 StoredFile

```ts
type StoredFile = {
  id: string
  name: string
  size: number
  type: string
  addedAt: string
  blob: Blob
}
```

存储位置：

```text
IndexedDB: amazon-workbench-file-vault
Object store: files
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
