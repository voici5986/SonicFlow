# SonicFlow全平台音乐搜索

一款基于 React + Vite 开发的现代化在线音乐搜索与播放应用，支持多平台聚合搜索、无损音质下载及云端数据同步。

[![GitHub](https://img.shields.io/github/license/voici5986/SonicFlow)](https://github.com/voici5986/SonicFlow)

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

首先 Fork 本仓库：[![Fork](https://img.shields.io/github/forks/voici5986/SonicFlow?style=social)](https://github.com/voici5986/SonicFlow/fork)

然后[![Deploy to Cloudflare Pages](https://img.shields.io/badge/Deploy%20to-Cloudflare%20Pages-orange?logo=cloudflare)](https://dash.cloudflare.com/?to=/:account/workers-and-pages/create/pages) 



### 方式二：Docker 部署

```bash
docker run -d -p 80:80 --restart always ghcr.io/voici5986/sonicflow:latest
```

## 🛠️ 本地开发

**环境要求**: Node.js 24.13.0+

1.  **克隆项目**
    ```bash
    git clone https://github.com/voici5986/SonicFlow.git
    cd SonicFlow
    ```

2.  **安装依赖**
    ```bash
    npm install
    ```

3.  **启动开发服务器**
    ```bash
    npm start
    ```
    访问 `http://localhost:3000` 即可。

## ⚙️ 环境变量配置

无论是本地开发还是生产环境部署，你可能通过环境变量配置 API：

| 变量名 | 描述 | 默认值/示例 |
| 生产环境 | --- | --- |
| `REACT_APP_API_BASE` | 后端 API 地址 | `/api-v1` (Cloudflare 自动代理) |
| `REACT_APP_IPINFO_TOKEN` | (可选) IP区域检测 Token | `your_token` (前往 ipinfo.io 获取) |
| `FIREBASE_...` | (可选) 参见 [FIREBASE_SETUP.md](FIREBASE_SETUP.md) | 用于云端同步 |

## 📦 技术栈

*   **核心框架**: React 19, Vite, React Router
*   **UI 组件**: React Bootstrap, React Icons, React Toastify
*   **数据存储**: Localforage (IndexedDB), Firebase
*   **音频引擎**: Native HTML5 Audio

## 📄 许可证

MIT License