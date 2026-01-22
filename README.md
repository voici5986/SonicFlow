# SonicFlow

一款基于 React + Vite 开发的现代化在线音乐搜索与播放应用，支持多平台聚合搜索、无损音质下载及云端数据同步。

[![Demo](https://img.shields.io/badge/🚀_在线演示-Visit-blue)](https://sonicflow-2gv.pages.dev/)
[![License](https://img.shields.io/github/license/voici5986/SonicFlow)](LICENSE)

🎵 现代化音乐流媒体平台

## 鸣谢

- 本项目基于 [cl-music](https://github.com/lovebai/cl-music) 重构
- 感谢 [GD-Studio](https://music-api.gdstudio.xyz/api.php) 提供音乐 API


## ✨ 核心功能

*   **全平台聚合搜索**：支持网易云、QQ音乐、Spotify、YouTube Music 等 10+ 音乐平台。
*   **无损播放与下载**：支持最高 999k FLAC 无损音质在线播放及直接下载。
*   **云端同步**：基于 Firebase 实现多设备间的收藏夹和播放历史无感同步。
*   **智能区域检测**：自动切换“完整模式”或“中国模式”，适应不同网络环境。
*   **PWA 支持**：可作为本地应用安装，支持离线访问核心功能。
*   **现代化 UI**：沉浸式播放器、双语歌词（支持滚动与预览）、响应式设计。

## 🚀 快速部署

### 方式一：Cloudflare Pages (推荐)

利用 Cloudflare 强大的边缘网络解决 API 跨域与限流问题。

1. **Fork 本仓库**：[![Fork](https://img.shields.io/github/forks/voici5986/SonicFlow?style=social)](https://github.com/voici5986/SonicFlow/fork)
2. **部署到 Cloudflare**：[![Deploy to Cloudflare Pages](https://img.shields.io/badge/Deploy%20to-Cloudflare%20Pages-orange?logo=cloudflare)](https://dash.cloudflare.com/?to=/:account/workers-and-pages/create/pages)

### 方式二：Docker 部署

```bash
docker run -d -p 80:80 --name sonicflow --restart always ghcr.io/voici5986/sonicflow:latest
```

## 🛠️ 本地开发

**环境要求**: Node.js 20.0.0+ (建议使用 [Dockerfile](Dockerfile) 中指定的 24.13.0)

1. **克隆项目**
    ```bash
    git clone https://github.com/voici5986/SonicFlow.git
    cd SonicFlow
    ```

2. **安装依赖**
    ```bash
    npm install
    ```

3. **配置环境变量**
    复制模板并根据需要修改：
    ```bash
    cp .env.example .env.local
    ```

4. **启动开发服务器**
    ```bash
    npm start
    ```
    访问 [http://localhost:3000](http://localhost:3000) 即可。

## ⚙️ 环境变量配置

无论是本地开发还是生产环境部署，你都可以通过环境变量配置 API。请参考 [.env.example](.env.example) 进行配置：

| 变量名 | 描述 | 默认值/示例 |
| :--- | :--- | :--- |
| `REACT_APP_API_BASE` | 后端 API 地址 | `/api-v1` (开发环境代理至生产 API) |
| `REACT_APP_IPINFO_TOKEN` | (可选) IP 区域检测 Token | 前往 [ipinfo.io](https://ipinfo.io) 获取 |
| `FIREBASE_...` | (可选) Firebase 配置项 | 参见 [FIREBASE_SETUP.md](FIREBASE_SETUP.md) |

## 📦 技术栈

*   **核心框架**: React 19, Vite, React Router
*   **UI 组件**: React Bootstrap, React Icons, React Toastify
*   **数据存储**: Localforage (IndexedDB), Firebase
*   **音频引擎**: Native HTML5 Audio

## � 项目结构

```text
SonicFlow/
├── src/
│   ├── components/       # UI 组件
│   ├── contexts/         # 全局状态管理 (Auth, Player, Sync等)
│   ├── services/         # API 请求、Firebase、音频管理
│   ├── hooks/            # 自定义 React Hooks
│   ├── utils/            # 工具函数 (数据校验、错误处理)
│   └── styles/           # CSS 样式
├── functions/            # Cloudflare Pages Functions (API 代理)
├── public/               # 静态资源
└── conf/                 # Nginx 配置
```

## �� 许可证

MIT License