# 亚马逊运营工作台

一个可部署到 GitHub Pages 的个人亚马逊运营工作台。当前版本包含利润测算、私密 GitHub 上传文件区和运营备忘录。

## 本地运行

```powershell
npm install
npm run dev
```

## 构建

```powershell
npm run build
```

## 部署到 GitHub Pages

仓库推送到 GitHub 后，进入仓库的 `Settings` -> `Pages`，把 Source 设置为 `GitHub Actions`。之后推送到 `main` 分支会自动构建并部署 `dist`。

## 部署上传服务

上传文件区需要 Cloudflare Worker 中转，避免把 GitHub token 暴露在网页里。

```powershell
npm run worker:secret:github
npm run worker:secret:key
npm run worker:deploy
```

部署后把 Worker 地址写入本地 `.env.local`：

```text
VITE_UPLOAD_WORKER_URL=https://your-worker.your-subdomain.workers.dev
```

## 数据说明

- 备忘录保存在当前浏览器的 `localStorage`。
- 页面会自动检查新构建；检测到 GitHub Pages 有新版本时自动刷新，不会清除本地备忘和配置。
- 上传文件通过 Cloudflare Worker 写入私密仓库 `amazon-ops-workbench-files`。
- 上传文件区可以刷新私密仓库文件列表、预览图片/PDF/文本/音视频，并下载文件。
- 上传密钥保存在当前浏览器的 `localStorage`，不要把密钥发给无关人员。

## 项目文档

后续维护前先阅读 `AGENTS.md` 和 `docs/PROJECT_CONTEXT.md`。
