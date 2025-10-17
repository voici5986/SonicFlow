# 音乐 API 调用一致性审计报告

## 结论概览
- **主要调用点**：音乐相关请求集中在 `src/services/musicApiService.js`，通过 `axios.get(API_BASE, { params })` 访问 `search`、`url`、`lyric`、`pic` 四类接口。
- **默认基址**：新建的 `src/config/apiConfig.js` 统一解析 `REACT_APP_MUSIC_API`（优先）、`REACT_APP_API_BASE` 与默认 `/api`，并处理多余斜杠，确保服务层共享同一基址。
- **环境代理**：
  - 开发 (`npm start`)：`src/setupProxy.js` 将 `/api` 代理到 `https://music-api.gdstudio.xyz/api.php`。
  - Netlify：`netlify.toml` 将 `/api/*` 重写到 `https://music-api.gdstudio.xyz/api.php/:splat`。
  - Cloudflare Worker：`worker.js` 将 `/api` 改写为 `https://music-api.gdstudio.xyz/api.php` 并附带宽松 CORS 头。
- **集中配置与容器对齐**：`Dockerfile` 默认导出 `REACT_APP_MUSIC_API` / `REACT_APP_API_BASE = https://music-api.gdstudio.xyz/api.php`，与 README 示例保持一致，避免构建产物指向历史域名。
- **一致性判断**：本地开发、托管构建（Netlify/Worker）与容器部署均指向 `https://music-api.gdstudio.xyz/api.php`，已与目标站点完全对齐。

## 调用点与实际请求路径
| 功能 | 源文件/方法 | 请求方式 | 实际路径 | 备注 |
|------|-------------|----------|----------|------|
| 搜索歌曲 | `musicApiService.searchMusic` | GET | `${API_BASE}?types=search&source=...` | 支持缓存、可取消请求 |
| 获取音频 URL | `musicApiService.getAudioUrl` | GET | `${API_BASE}?types=url&id=...&br=...` | 带缓存与请求去重 |
| 获取歌词 | `musicApiService.getLyrics` | GET | `${API_BASE}?types=lyric&id=...` | 返回 `{ lyric, tlyric }` |
| 获取封面 | `musicApiService.getCoverImage` | GET | `${API_BASE}?types=pic&id=...&size=...` | 验证参数并缓存 URL |
| 封面加载 | `PlayerContext.fetchCover` | — | 调用 `getCoverImage` | 同步内存与本地缓存 |
| 下载音频 | `downloadService` | — | 复用 `getAudioUrl` 返回的直链 | 处理下载流程 |

## 配置来源与环境行为
- **环境变量**：
  - `src/config/apiConfig.js` 聚合 `REACT_APP_MUSIC_API` / `REACT_APP_API_BASE`，默认回退到 `/api`。
  - README 更新了开发（`/api`）与生产（`https://music-api.gdstudio.xyz/api.php`）的示例配置。
  - 仓库不包含 `.env*`，需由部署方提供。
- **开发模式**：`http-proxy-middleware` 保证 `/api` 指向目标地址，解决跨域。
- **Netlify**：重写规则保留查询参数转发至目标 API。
- **Cloudflare Worker**：限制 `/api` 路径并映射到 `/api.php`，统一 CORS 行为。
- **Docker**：构建阶段注入的环境变量已经改为目标地址，生成的静态资源直接请求 `https://music-api.gdstudio.xyz/api.php`。

## 与目标 API (`https://music-api.gdstudio.xyz/api.php`) 的差异分析
| 环境 | 实际请求基址 | 是否一致 | 说明 |
|------|--------------|----------|------|
| 本地开发 | `https://music-api.gdstudio.xyz/api.php`（经 `/api` 代理） | ✅ | 与目标完全一致 |
| Netlify 生产 | `https://music-api.gdstudio.xyz/api.php`（经重写） | ✅ | 保留查询、无额外参数 |
| Cloudflare Worker | `https://music-api.gdstudio.xyz/api.php` | ✅ | Worker 写死目标域名 |
| Docker 构建 | `https://music-api.gdstudio.xyz/api.php` | ✅ | 构建时注入环境变量 |

## 潜在风险
1. **环境变量缺失**：若生产部署仍沿用默认 `/api` 且未配置反向代理，请求将打到当前域名，可能触发 404 或 CORS 限制。
2. **第三方 API 可靠性**：音乐 API 无鉴权，可能受到速率限制、域名失效或 CORS 政策调整的影响，缺少降级方案。

## 建议与最小改动方案
1. **补充 `.env.example`（可选）**：提供示例文件，降低部署方的配置成本。
2. **部署自检**：在 CI / 部署脚本中加入 `curl "$REACT_APP_MUSIC_API?types=search&name=test"` 等健康检查，及时发现域名或路径变更。
3. **容错与监控**：
   - 在 `musicApiService` 中对高频网络错误增加兜底提示或重试策略。
   - 引入日志/埋点（如 Sentry）追踪上游异常与速率限制。

经过此次集中化与 Docker 调整，仓库默认配置已与目标音乐 API 完全一致，后续仅需按照上述建议持续提升可维护性与可观测性。
