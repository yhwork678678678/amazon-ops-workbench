# 亚马逊运营工作台

一个可部署到 GitHub Pages 的个人亚马逊运营工作台。当前版本是纯静态前端，包含常用工具入口、利润测算、上架检查、浏览器本地临时文件区和运营备忘录。

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

## 数据说明

- 备忘录保存在当前浏览器的 `localStorage`。
- 临时文件保存在当前浏览器的 `IndexedDB`。
- 当前版本不会把文件上传到 GitHub，也不会跨设备同步。

## 项目文档

后续维护前先阅读 `AGENTS.md` 和 `docs/PROJECT_CONTEXT.md`。
