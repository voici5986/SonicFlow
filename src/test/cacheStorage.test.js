import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearBrowserCaches } from '../utils/cacheStorage';

describe('browser cache cleanup', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('unregisters active workers and deletes every Cache Storage entry', async () => {
    const deleteCache = vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const unregister = vi.fn().mockResolvedValue(true);
    vi.stubGlobal('caches', {
      keys: vi.fn().mockResolvedValue(['workbox-precache', 'image-cache']),
      delete: deleteCache,
    });
    vi.stubGlobal('navigator', {
      serviceWorker: {
        getRegistrations: vi.fn().mockResolvedValue([{ unregister }]),
      },
    });

    await expect(clearBrowserCaches()).resolves.toEqual({
      deletedCaches: 1,
      unregisteredWorkers: 1,
    });
    expect(unregister).toHaveBeenCalledOnce();
    expect(deleteCache).toHaveBeenCalledWith('workbox-precache');
    expect(deleteCache).toHaveBeenCalledWith('image-cache');
  });
});
