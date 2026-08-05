# OTONEI

OTONEI 是一个基于 React 19 + Vite 8 的在线音乐搜索、播放、下载和收藏同步应用。

## 功能

- 多音源搜索：网易云、酷我、JOOX、Bilibili
- 在线播放和音质选择：128、192、320、740、999
- 收藏、播放历史、搜索历史
- PWA 安装和更新提示
- Firebase 云端同步（可选）

## 技术栈

- React 19
- Vite 8
- Context API + 自定义 Hooks
- Localforage / IndexedDB
- Firebase Auth / Firestore
- vite-plugin-pwa
- Vitest / ESLint / Prettier

## 本地开发

要求：

- Node.js >= 20.19.0（CI 与部署使用 22.x / 24.x）
- pnpm >= 10.33.0（推荐与 CI 一致使用 10.33.0，11.x 已验证兼容）

安装和启动：

```bash
pnpm install
pnpm start
```

默认开发地址是 `http://localhost:3000`。

## 环境变量

复制 `.env.example` 为 `.env.local`。

| 变量                                     | 说明                    | 默认值            |
| ---------------------------------------- | ----------------------- | ----------------- |
| `REACT_APP_API_BASE`                     | 音乐 API 入口           | `/api-v1/api.php` |
| `REACT_APP_FIREBASE_API_KEY`             | Firebase API Key        | 可选              |
| `REACT_APP_FIREBASE_AUTH_DOMAIN`         | Firebase Auth 域名      | 可选              |
| `REACT_APP_FIREBASE_PROJECT_ID`          | Firebase 项目 ID        | 可选              |
| `REACT_APP_FIREBASE_STORAGE_BUCKET`      | Firebase Storage Bucket | 可选              |
| `REACT_APP_FIREBASE_MESSAGING_SENDER_ID` | Firebase Sender ID      | 可选              |
| `REACT_APP_FIREBASE_APP_ID`              | Firebase App ID         | 可选              |
| `REACT_APP_FIREBASE_MEASUREMENT_ID`      | Firebase Measurement ID | 可选              |

不配置 Firebase 时，应用会进入本地/降级模式。

## 常用命令

```bash
pnpm run lint
pnpm test
pnpm run format:check
pnpm run build
pnpm run serve
```

## 正式发布

使用 PowerShell 脚本 `release.ps1` 执行严格校验与 semantic-release 自动发版：

```powershell
.\release.ps1                # 交互选择（创建正式版本 / 仅运行质量门禁）
.\release.ps1 -Release       # 直接创建正式版本（跳过菜单，仍会二次确认）
.\release.ps1 -ValidateOnly  # 只运行质量门禁，不修改 Git
```

发布流程：

1. 5 道质量门禁：锁定依赖安装、Prettier 格式、ESLint、Vitest、生产构建、依赖审计
2. semantic-release dry-run 预演并计算下一个版本
3. 二次确认后更新 `package.json` 与 `CHANGELOG.md`、创建 Git 提交和 `vX.Y.Z` 标签并推送

前置要求：`main` 分支、Git 工作区干净、自上一标签起存在 `fix`/`feat` 或破坏性变更提交。标签推送后，GitHub Actions 自动构建多架构 Docker 镜像推送到 GHCR，Cloudflare Pages 与 Vercel 自动触发部署。

## 部署

### Cloudflare Pages

推荐部署到 Cloudflare Pages。项目已包含：

- `functions/api-v1/[[path]].js`：只代理 `/api-v1` 和 `/api-v1/api.php` 到上游 `api.php`
- `public/_routes.json`：只让 `/api-v1` 命中 Pages Functions，静态资源不消耗 Functions 调用
- `public/_redirects`：SPA 路由回退到 `index.html`
- `public/_headers`：静态资源安全头和基础缓存策略
- `wrangler.toml`：声明 Pages 输出目录和 Functions 兼容日期

构建命令：

```bash
pnpm run build
```

输出目录：

```text
build
```

建议环境变量：

```text
NODE_VERSION=22.16.0
PNPM_VERSION=10.33.0
REACT_APP_API_BASE=/api-v1/api.php
```

### Vercel

`vercel.json` 已配置：

- `/api-v1` -> `https://music-api.gdstudio.xyz/api.php`
- `/api-v1/api.php` -> `https://music-api.gdstudio.xyz/api.php`
- 其他路径回退到 SPA 入口

### Docker

```bash
docker build -t otonei .
docker run -d -p 80:80 --name otonei --restart always otonei
```

Nginx 会提供静态文件，并代理 `/api-v1` 到音乐 API。

## 项目结构

```text
src/
  components/   UI 组件
  contexts/     全局状态
  hooks/        自定义 Hooks
  pages/        页面
  services/     API、存储、同步、音频服务
  styles/       样式
  test/         单元测试
  utils/        工具函数
functions/      Cloudflare Pages Functions
conf/           Nginx 配置
docs/           补充文档
```

## 质量检查

CI 会执行：

- `pnpm run format:check`
- `pnpm run lint`
- `pnpm test`
- `pnpm run build`
- `pnpm audit --prod`

## 许可证

MIT
