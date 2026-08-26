import { beforeEach, describe, expect, it, vi } from 'vitest';

const { stores, resetStores } = vi.hoisted(() => {
  const stores = new Map();
  const resetStores = () => {
    for (const store of stores.values()) store.data.clear();
  };

  return { stores, resetStores };
});

vi.mock('localforage', () => ({
  default: {
    INDEXEDDB: 'indexeddb',
    LOCALSTORAGE: 'localstorage',
    createInstance: ({ storeName }) => {
      const existing = stores.get(storeName);
      if (existing) return existing.api;

      const data = new Map();
      const api = {
        getItem: async (key) => data.get(key) ?? null,
        setItem: async (key, value) => {
          data.set(key, value);
          return value;
        },
        removeItem: async (key) => data.delete(key),
        keys: async () => [...data.keys()],
        clear: async () => data.clear(),
      };
      stores.set(storeName, { api, data });
      return api;
    },
  },
}));

import {
  addSearchHistory,
  addToHistory,
  getFavorites,
  getHistory,
  getSearchHistory,
  getCoverFromStorage,
  saveCoverToStorage,
  saveFavorites,
  toggleFavorite,
} from '../services/storage';

describe('storage service', () => {
  beforeEach(() => {
    resetStores();
  });

  it('persists and toggles favorites with a modification timestamp', async () => {
    const track = { id: 'track-1', name: 'Song', source: 'netease' };

    await expect(toggleFavorite(track)).resolves.toMatchObject({ added: true, full: false });
    await expect(getFavorites()).resolves.toEqual([
      expect.objectContaining({ ...track, modifiedAt: expect.any(Number) }),
    ]);

    await expect(toggleFavorite(track)).resolves.toMatchObject({ added: false, full: false });
    await expect(getFavorites()).resolves.toEqual([]);
  });

  it('deduplicates search history case-insensitively and keeps newest first', async () => {
    await addSearchHistory('Hello', 'netease');
    await addSearchHistory('World', 'netease');
    await addSearchHistory('hello', 'netease');

    await expect(getSearchHistory()).resolves.toEqual([
      expect.objectContaining({ query: 'hello', source: 'netease' }),
      expect.objectContaining({ query: 'World', source: 'netease' }),
    ]);
  });

  it('moves repeated tracks to the top of playback history', async () => {
    const track = { id: 'track-1', name: 'Song', source: 'netease' };
    await addToHistory(track);
    await addToHistory({ ...track, name: 'Song (updated)' });

    const history = await getHistory();
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ song: { id: 'track-1', name: 'Song (updated)' } });
  });

  it('does not cache default covers and returns cached cover URLs', async () => {
    await expect(saveCoverToStorage('default', '/default_cover.svg')).resolves.toBe(false);
    await expect(getCoverFromStorage('default')).resolves.toBeNull();

    await expect(saveCoverToStorage('cover-1', 'https://example.test/cover.jpg')).resolves.toBe(
      true
    );
    await expect(getCoverFromStorage('cover-1')).resolves.toBe('https://example.test/cover.jpg');
  });

  it('returns the favorites limit result without dropping existing data', async () => {
    const favorites = Array.from({ length: 500 }, (_, index) => ({ id: `track-${index}` }));
    await saveFavorites(favorites);

    await expect(toggleFavorite({ id: 'new-track' })).resolves.toMatchObject({
      added: false,
      full: true,
      error: 'favorites_limit',
    });
    await expect(getFavorites()).resolves.toHaveLength(500);
  });
});
