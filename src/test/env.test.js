import { describe, expect, it } from 'vitest';
import { resolveEnvValue } from '../config/env';

describe('environment compatibility adapter', () => {
  it('prefers a non-empty VITE value over the legacy value', () => {
    expect(resolveEnvValue('https://vite.example/api', 'https://legacy.example/api')).toBe(
      'https://vite.example/api'
    );
  });

  it('falls back to legacy values during the migration window', () => {
    expect(resolveEnvValue('', '/api-v1/api.php')).toBe('/api-v1/api.php');
    expect(resolveEnvValue(undefined, 'legacy-value')).toBe('legacy-value');
  });

  it('treats blank and literal undefined values as missing', () => {
    expect(resolveEnvValue('   ', 'undefined')).toBeUndefined();
    expect(resolveEnvValue('undefined', '')).toBeUndefined();
  });
});
