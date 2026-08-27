import logger from '../utils/logger.js';

const WINDOW_MS = 5 * 60 * 1000;
const MAX_REQUESTS = 50;
const SAFETY_RESERVE = 4;

const timestamps: number[] = [];

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const pruneExpired = (now: number): void => {
  while (timestamps.length && now - timestamps[0] > WINDOW_MS) timestamps.shift();
};

async function acquire(): Promise<void> {
  for (;;) {
    const now = Date.now();
    pruneExpired(now);
    if (timestamps.length < MAX_REQUESTS - SAFETY_RESERVE) {
      timestamps.push(now);
      return;
    }

    const waitMs = timestamps[0] + WINDOW_MS - now + 50;
    logger.warn(`[RateLimiter] 已达窗口上限，延迟 ${Math.ceil(waitMs)}ms 后再发请求`);
    await sleep(Math.max(0, waitMs));
  }
}

export async function withRateLimit<T>(fn: () => T | Promise<T>): Promise<T> {
  await acquire();
  return fn();
}

export function getRemainingQuota(): number {
  pruneExpired(Date.now());
  return Math.max(0, MAX_REQUESTS - SAFETY_RESERVE - timestamps.length);
}
