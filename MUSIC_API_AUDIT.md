# 音乐 API 调用一致性审计报告

## 结论概览
- **主要调用点**：所有音乐相关请求均集中在 `src/services/musicApiService.js`，通过 `axios.get(API_BASE, { params })` 访问 `search`、`url`、`lyric`、`pic` 四类接口。
- **默认基址**：`API_BASE = process.env.REACT_APP_API_BASE || '/api'`。若未显式配置环境变量，请求会发往当前站点下的 `/api` 路径。
- **环境代理**：
  - 开发环境 (`npm start`) 通过 `src/setupProxy.js` 将 `/api` 代理到 `https://music-api.gdstudio.xyz/api.php`。
  - Netlify 部署使用 `netlify.toml` 的重写规则将 `/api/*` 指向 `https://music-api.gdstudio.xyz/api.php/:splat`。
  - Cloudflare Worker (`worker.js`) 亦固定把 `/api` 转发到 `https://music-api.gdstudio.xyz/api.php` 并注入 CORS 头。
- **差异项**：`Dockerfile` 中的基础镜像默认注入 `REACT_APP_API_BASE="https://music-api.ucds.me/api"`，与指定目标 `https://music-api.gdstudio.xyz/api.php` 不一致。
- **一致性判断**：除 Docker 镜像默认值外，其余开发/部署路径均与目标站点保持一致；Docker 构建若不覆盖环境变量，将指向非预期域名及路径。

## 调用点与实际请求路径
| 功能 | 源文件/行号 (概述) | 请求方法 | 目标路径 | 备注 |
|------|-------------------|----------|----------|------|
| 搜索歌曲 | `musicApiService.searchMusic` | GET | `${API_BASE}?types=search&source=...` | 结果缓存至内存，支持 AbortController |
| 获取音频 URL | `musicApiService.getAudioUrl` | GET | `${API_BASE}?types=url&id=...&br=...` | 带内存缓存与请求去重 |
| 获取歌词 | `musicApiService.getLyrics` | GET | `${API_BASE}?types=lyric&id=...` | 返回 `{ lyric, tlyric }` |
| 获取封面 | `musicApiService.getCoverImage` | GET | `${API_BASE}?types=pic&id=...&size=...` | 过滤非法 ID，缓存 URL |
| 封面加载（UI） | `PlayerContext.fetchCover` | — | 调用 `getCoverImage` | 负责内存及 storage 缓存 |
| 下载音频 | `downloadService` | — | 使用上游 `url` 字段 | 依赖 `getAudioUrl` 返回的实际直链 |

## 配置来源与环境行为
- **环境变量**：
  - README / `FIREBASE_SETUP.md` 指定 `REACT_APP_API_BASE` 默认 `/api`。
  - 项目无 `.env*` 文件（需部署方自行配置）。
- **开发模式** (`npm start`)：`http-proxy-middleware` 将前端对 `/api` 的请求重写为 `https://music-api.gdstudio.xyz/api.php`，满足跨域和路径要求。
- **Netlify**：`[[redirects]]` 把 `/api/*` 定向到目标并保留查询参数；与 CRA 构建产物一同部署即可生效。
- **Cloudflare Worker** (`worker.js`)：限定仅 `/api` 路径可访问，内部把 `/api` 改写为 `/api.php`，并添加宽松的 CORS 头，适合前端直接访问。
- **Docker 镜像**：
  - 在 `node:22-slim` 构建阶段设置 `ENV REACT_APP_API_BASE="https://music-api.ucds.me/api"`。
  - 如未覆盖，该值会被写入构建时的 React 静态资源，导致前端直接请求 `https://music-api.ucds.me/api?types=...`。
  - 该域名与目标 `music-api.gdstudio.xyz/api.php` 不同，且缺少 `.php` 路径，可能返回不同结构或失败。

## 与目标 API (`https://music-api.gdstudio.xyz/api.php`) 的差异分析
| 环境 | 实际请求基址 | 是否一致 | 说明 |
|------|--------------|----------|------|
| 本地开发 | `https://music-api.gdstudio.xyz/api.php`（经 `/api` 代理） | ✅ | 与目标完全一致，参数直通 |
| Netlify 生产 | `https://music-api.gdstudio.xyz/api.php`（经重写） | ✅ | 与目标一致，保持查询参数 |
| Cloudflare Worker 方案 | `https://music-api.gdstudio.xyz/api.php` | ✅ | 显式写死目标域名及路径 |
| Docker 默认 | `https://music-api.ucds.me/api` | ❌ | 域名与路径均不符，需手动覆盖或调整 |

## 潜在风险
1. **Docker 构建指向非预期域**：
   - 若 `https://music-api.ucds.me/api` 与官方接口返回不同或不可用，将导致容器部署的前端无法播放音乐。
   - 缺少 `.php` 路径，可能遇到 404 或不同返回格式。
2. **环境变量缺失**：
   - 如果生产部署未配置反向代理且保留默认 `/api`，将直接请求当前域的 `/api`，可能触发 404 或 CORS 限制。
3. **外部 API 可靠性**：
   - 第三方 API 无鉴权，可能受限于速率、CORS 政策变更或域名失效；缺乏降级方案。

## 建议与最小改动方案
1. **统一配置源**：将 `REACT_APP_API_BASE` 集中定义在环境变量说明中，并提供 `.env.example`（或 README 更明确示例），避免散落在多个文件。
2. **修正 Dockerfile 默认值**：将 `ENV REACT_APP_API_BASE` 更新为 `https://music-api.gdstudio.xyz/api.php`，或改为 `/api` 并搭配 Nginx/Worker 的反代配置。
3. **部署自检**：在 CI 或部署脚本中加入简单的 `curl "$REACT_APP_API_BASE?types=search&name=test"` 健康检查，提前发现域名/路径错误。
4. **容错与监控**（可选）：
   - 为 `musicApiService` 添加对请求失败的兜底提示和重试策略。
   - 记录上游异常以便运维监控（Sentry/Log service）。

如需进一步修正，可另行创建修复任务，重点围绕 Dockerfile 默认值与配置集中化进行最小改动。