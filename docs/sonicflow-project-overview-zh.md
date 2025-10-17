# SonicFlow 项目概览（中文）

## 高层概述
- **一句话总结**：SonicFlow 是一款聚合多家在线音乐源、支持跨平台播放/下载/收藏/同步的 React 单页应用。（依据：`README.md`、`src/App.js`）
- **项目使命**：项目希望为喜爱多平台音乐内容的用户提供统一的搜索、在线播放、歌词、无损下载与收藏同步体验。通过智能地区判定（国际/中国/离线模式）与 Firebase 增量同步，在不同网络与合规环境下都能以最小成本获取音乐和个人数据管理能力。（依据：`README.md`、`src/services/regionDetection.js`、`src/services/syncService.js`）

## 技术栈与架构
### 核心技术栈
| 层级 | 选型 | 依据 |
| --- | --- | --- |
| UI 框架 | React 19、React Bootstrap、React Router、React Icons、React Toastify | `package.json`、`src/App.js` |
| 状态与上下文 | React Context（Auth/Region/Player/Favorites/Sync/Device）、自定义 Hooks | `src/contexts/*.js`、`src/hooks/*.js` |
| 数据访问 | Axios；localforage 持久化；Firebase Auth + Firestore | `src/services/musicApiService.js`、`src/services/storage.js`、`src/services/firebase.js` |
| 媒体播放 | `react-player` 包装的音频播放器 | `src/components/AudioPlayer.js` |
| 构建工具 | create-react-app + react-app-rewired、patch-package、Service Worker/PWA | `package.json`、`config-overrides.js`、`public/service-worker.js` |
| 布局与样式 | Bootstrap 5、项目内定制样式表 | `package.json`、`src/styles/*.css` |

### 运行时架构
1. `src/index.js` 载入全局样式后，将应用包裹在 `AuthProvider` 与 `DeviceProvider` 下，同时注册自定义 Service Worker，实现 PWA 与音频元素调试。（参考：`src/index.js`、`src/utils/serviceWorkerRegistration.js`）
2. `src/App.js` 进一步注入 `RegionProvider → SyncProvider → PlayerProvider → FavoritesProvider`，在 `AppContent` 中驱动导航、搜索、播放、下载等核心功能。导航切换使用本地状态，页面组件通过 `React.lazy` 懒加载减小初始包体。（参考：`src/App.js`）
3. 前端状态与服务层分离：演示组件通过 Context 暴露的动作（例如 `usePlayer().handlePlay`、`useFavorites().toggleFavorite`）触发服务层请求或本地存储操作，保持 UI 粒度较小。

### 服务层与数据流
主要数据流如下：
```
[UI 组件 (App.js, pages/*, components/*)]
        ↓ 事件与 Context Action
[上下文层: Auth / Region / Sync / Player / Favorites / Device]
        ↓ 调用
[服务层: musicApiService ↔ downloadService ↔ storage ↔ syncService ↔ regionDetection]
        ↕
[外部依赖: music-api.gdstudio.xyz、Firebase Auth/Firestore、IPinfo、浏览器 IndexedDB/localStorage、Service Worker]
```
- `musicApiService.js` 负责根据 `REACT_APP_API_BASE`（默认 `/api`）封装搜索、播放、封面、歌词请求，并对多源返回结果做结构化处理。
- `downloadService.js` 将音乐链接转换为二进制 Blob 并触发浏览器下载，支持无损音质请求。
- `storage.js` 基于 localforage 管理收藏、历史、搜索记录、封面缓存和本地用户数据，并提供待同步计数、网络状态缓存等工具。
- `syncService.js`（>1000 行）实现 Firebase 子集合增量同步策略，按收藏/历史拆分批量写入，同时监听自定义事件 `SyncEvents`。
- `regionDetection.js` 调用 IPinfo API 判定地区，根据网络与 Firebase 可用性切换 FULL/CHINA/OFFLINE 模式，并向 Service Worker 广播模式变化。

## 目录与入口
| 路径 | 职责概述 |
| --- | --- |
| `src/index.js` | 浏览器入口，挂载 React 组件、注册 Service Worker、注入 Auth/Device 上下文 |
| `src/App.js` | 顶层界面与导航、搜索/结果渲染、播放器与下载入口 |
| `src/pages/` | 功能页面：`Favorites.js`（收藏管理）、`History.js`、`User.js`（账号、同步、缓存工具）、`Auth.js` |
| `src/components/` | UI 组件：播放器、导航栏、收藏按钮、下载提示、PWA 安装提示等 |
| `src/contexts/` | 全局状态：认证、设备、播放器、收藏、区域、同步等 |
| `src/services/` | 功能服务：音乐 API、下载、存储、Firebase、增量同步、区域检测、音频状态管理等 |
| `src/utils/` | 辅助工具：设备检测、错误处理、方向锁定、Service Worker 通信等 |
| `public/` | CRA 静态资源，包含 `china.html`、`offline.html` 等针对模式切换的页面 |
| `conf/nginx.conf` | Docker 生产镜像所用 Nginx 配置，转发根路径到构建产物 |
| `worker.js` | Cloudflare Worker 反向代理模板，将 `/api` 重写到 `music-api.gdstudio.xyz/api.php` |
| `patches/http-proxy+1.18.1.patch` | 针对 `http-proxy` 的 patch-package 修复，确保 Node 18+ 环境可运行 `setupProxy.js` |

## 运行与构建
1. **环境准备**
   - Node.js ≥ 18（`Dockerfile` 使用 `node:22-slim`，推荐 LTS 版本）。
   - npm（Corepack 已在 Docker 镜像中启用）。
   - 需要可访问 `music-api.gdstudio.xyz` 的网络，或自行部署反向代理。
2. **安装依赖**：`npm install`（执行后 `postinstall` 会运行 `patch-package` 应用补丁）。
3. **开发模式**：`npm start`（通过 `react-app-rewired` 启动；`src/setupProxy.js` 将 `/api` 代理到官方音乐 API）。
4. **构建生产包**：`npm run build`（输出至 `build/`）。
5. **单元测试**：`npm test`（沿用 CRA 默认配置与 React Testing Library，当前仓库未提供自定义测试用例）。
6. **Docker 构建/运行**：
   ```bash
   docker build -t sonicflow .
   docker run -d -p 80:80 sonicflow
   ```
   生产镜像使用多阶段构建，将构建产物托管在 Nginx 中。（见 `Dockerfile`）
7. **环境变量**（见 `README.md`、`FIREBASE_SETUP.md`）：
   - 前端 API：`REACT_APP_API_BASE`（默认为 `/api`，需指向反向代理）；
   - 区域检测：`REACT_APP_IPINFO_TOKEN`；
   - Firebase：`REACT_APP_FIREBASE_API_KEY` 等六个基础配置项（启用账号同步时必填）。
   - 开发环境建议在 `.env.development.local` 中设置，生产构建使用 `.env.production.local` 或部署平台环境变量。

## API / 接口
- **多源音乐聚合 API**（`music-api.gdstudio.xyz`，详见 `API.txt` 与 `src/services/musicApiService.js`）
  - 搜索：`GET /api?types=search&source=<平台>&name=<关键词>&count=<数量>&pages=<页码>`。
  - 获取播放地址：`GET /api?types=url&source=<平台>&id=<track_id>&br=<音质>`，`br` 支持 128/192/320/740/999。
  - 获取封面：`GET /api?types=pic&source=<平台>&id=<pic_id>&size=300|500`。
  - 获取歌词：`GET /api?types=lyric&source=<平台>&id=<lyric_id>`。
  - 开发模式下通过 `setupProxy.js` 直接请求 `/api`，生产模式需设置 `REACT_APP_API_BASE` 或部署 `worker.js` 提供的 Cloudflare Worker 反代。
- **下载服务**：`src/services/downloadService.js` 使用浏览器 `fetch`/`axios` 下载音乐二进制流，自动生成 `<a>` 标签触发保存，并处理音质参数与错误提示。
- **Firebase 同步接口**：`src/services/syncService.js` 读取/写入 `users/{uid}` 文档及其 `favorites`、`history` 子集合，采用增量同步与批处理（`writeBatch`）。
- **地区模式事件**：`regionDetection.js` 通过 `CustomEvent('app_mode_changed')` 通知前端和 Service Worker 切换 UI/功能。

## 集成与外部服务
- **音乐数据源**：`https://music-api.gdstudio.xyz` 聚合网易云、QQ、Spotify、Tidal、YouTube Music 等多个平台。（`API.txt`）
- **Firebase**：可选登录与多设备同步，包含 Auth + Firestore；无配置时退化为“本地账户”。（`src/services/firebase.js`、`src/contexts/AuthContext.js`）
- **IPinfo**：IP 区域检测，缺省令牌会使用仓库内写死的 Demo Token，建议自行申请。（`src/services/regionDetection.js`）
- **localforage**：浏览器 IndexedDB/LocalStorage 持久化缓存收藏、历史、封面、同步状态等。（`src/services/storage.js`）
- **Service Worker & PWA**：`public/service-worker.js`、`src/utils/serviceWorkerRegistration.js` 提供离线缓存、更新通知、模式切换推送。
- **Cloudflare Worker 模板**：`worker.js` 提供 `/api` 反向代理示例，便于绕过跨域并隐藏真实 API 源。
- **部署平台支持**：README 中提供 Netlify/Vercel 按钮；`netlify.toml` 针对生产路由及构建命令做配置。

## 当前状态与待办/潜在风险
- **环境依赖显著**：未配置 `REACT_APP_API_BASE` 会默认访问 `/api`，需要在生产端提供反向代理（可复用 `worker.js` 或 `conf/nginx.conf`）。
- **区域检测默认令牌**：`regionDetection.js` 内置了演示用 IPinfo Token（`f0e3677a212cc4`），可能遭受速率限制或失效，部署时需替换。（`src/services/regionDetection.js`）
- **Firebase 为可选功能**：若未配置 Firebase，将启用本地账户模式；同步逻辑庞大且复杂，建议在生产前确认 Firestore 规则与配额。（`src/services/firebase.js`、`src/services/syncService.js`）
- **patch-package 依赖**：`patches/http-proxy+1.18.1.patch` 通过 `postinstall` 应用，升级依赖或跳过 `npm install` 的 `postinstall` 会导致开发代理报错，需要保留或迁移补丁。（`package.json`、`patches/`）
- **前端日志较多**：调试日志广泛存在于 Context 与 Service 中（`App.js`、`PlayerContext.js` 等），生产部署可考虑集中控制或条件编译。
- **同步服务体量大**：`syncService.js` 超过 1000 行，职责涵盖事件派发、批量写入、延迟同步与合并逻辑；后续维护可考虑拆分模块并补充自动化测试。
- **地区模式页面跳转**：中国模式会强制跳转 `china.html`，需要在部署域下预置该静态页；此外 `offline.html` 需与 Service Worker 路由保持一致。（`public/china.html`、`regionDetection.js`）

> 建议首次接手项目的同学按“环境变量 → 本地开发 → Firebase 配置 → 部署（含反代）”的顺序逐步验证，以确保核心功能和同步链路正常。
