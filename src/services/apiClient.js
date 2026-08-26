/**
 * API 客户端模块
 * 基于 Axios 的统一请求实例，所有音乐 API 请求都经由 /api-v1 代理发出。
 */
import axios from 'axios';
import { env } from '../config/env';

// 基础地址：Cloudflare Pages / Vercel / Docker 默认保持 /api-v1/api.php，
// 优先读取 VITE_API_BASE，兼容期回退到 REACT_APP_API_BASE。
const apiBase = env.apiBase;

const apiClient = axios.create({
  baseURL: apiBase,
  timeout: 12000, // 默认 12 秒超时，单个请求可通过 config.timeout 覆盖
  headers: {
    'Content-Type': 'application/json',
  },
});

export { apiClient };
export default apiClient;
