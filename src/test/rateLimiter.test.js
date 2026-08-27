import { describe, expect, it } from 'vitest';
import { getRemainingQuota, withRateLimit } from '../services/rateLimiter';

describe('rate limiter', () => {
  it('executes a request and returns its result', async () => {
    await expect(withRateLimit(async () => 'ok')).resolves.toBe('ok');
  });

  it('reports a bounded remaining quota', () => {
    const remaining = getRemainingQuota();
    expect(remaining).toBeGreaterThanOrEqual(0);
    expect(remaining).toBeLessThan(50);
  });
});
