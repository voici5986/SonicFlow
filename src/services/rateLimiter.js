/**
 * 全局 API 限流器（滑动窗口）
 * 上游约束：每 5 分钟（300s）最多 50 次请求。
 * 所有经 musicApiService 出站请求都需通过 withRateLimit 排队，
 * 避免触发 429 / 被封 IP。
 */
import logger from '../utils/logger.js';

const WINDOW_MS = 5 * 60 * 1000; // 300000
const MAX_REQUESTS = 50;
const SAFETY_RESERVE = 4; // 留余量，避免顶到硬上限

const timestamps = [];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function acquire() {
  // 循环等待，直到窗口内有空位
  for (;;) {
    const now = Date.now();
    while (timestamps.length && now - timestamps[0] > WINDOW_MS) {
      timestamps.shift();
    }
    if (timestamps.length < MAX_REQUESTS - SAFETY_RESERVE) {
      timestamps.push(now);
      return;
    }
    // 需等待最早的一次离开窗口
    const waitMs = timestamps[0] + WINDOW_MS - now + 50;
    logger.warn(`[RateLimiter] 已达窗口上限，延迟 ${Math.ceil(waitMs)}ms 后再发请求`);
    await sleep(Math.max(0, waitMs));
  }
}

export async function withRateLimit(fn) {
  await acquire();
  return fn();
}

// 供 UI 显示当前剩余配额
export function getRemainingQuota() {
  const now = Date.now();
  while (timestamps.length && now - timestamps[0] > WINDOW_MS) {
    timestamps.shift();
  }
  return Math.max(0, MAX_REQUESTS - SAFETY_RESERVE - timestamps.length);
}
