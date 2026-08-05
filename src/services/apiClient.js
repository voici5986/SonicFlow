/**
 * API 客户端模块
 * 基于 Axios 的统一请求实例，所有音乐 API 请求都经由 /api-v1 代理发出。
 */
import axios from 'axios';

// 基础地址：Cloudflare Pages / Vercel / Docker 默认保持 /api-v1/api.php，
// 可通过环境变量 REACT_APP_API_BASE 覆盖。
const apiBase = process.env.REACT_APP_API_BASE || '/api-v1/api.php';

const apiClient = axios.create({
  baseURL: apiBase,
  timeout: 12000, // 默认 12 秒超时，单个请求可通过 config.timeout 覆盖
  headers: {
    'Content-Type': 'application/json',
  },
});

export { apiClient };
export default apiClient;
