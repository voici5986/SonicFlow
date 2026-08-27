/**
 * API 客户端模块
 * 基于 Axios 的统一请求实例，所有音乐 API 请求都经由 /api-v1 代理发出。
 */
import axios, { type AxiosInstance } from 'axios';
import { env } from '../config/env';

const apiClient: AxiosInstance = axios.create({
  baseURL: env.apiBase,
  timeout: 12000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export { apiClient };
export default apiClient;
