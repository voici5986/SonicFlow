import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  checkFirebaseAvailability,
  getFavorites,
  getHistory,
  getNetworkStatus,
  getPendingSyncChanges,
  resetPendingChanges,
  saveFavorites,
  saveHistory,
} = vi.hoisted(() => ({
  checkFirebaseAvailability: vi.fn(),
  getFavorites: vi.fn(),
  getHistory: vi.fn(),
  getNetworkStatus: vi.fn(),
  getPendingSyncChanges: vi.fn(),
  resetPendingChanges: vi.fn(),
  saveFavorites: vi.fn(),
  saveHistory: vi.fn(),
}));

vi.mock('../services/firebase', () => ({
  db: {},
  isFirebaseAvailable: false,
  checkFirebaseAvailability,
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  limit: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  where: vi.fn(),
  writeBatch: vi.fn(),
}));

vi.mock('../services/storage', () => ({
  MAX_HISTORY_ITEMS: 100,
  getFavorites,
  getHistory,
  getNetworkStatus,
  getPendingSyncChanges,
  resetPendingChanges,
  saveFavorites,
  saveHistory,
}));

import {
  addSyncListener,
  clearSyncTimestamp,
  getLocalChangesSince,
  initialSync,
  removeSyncListener,
  SyncEvents,
  triggerEvent,
} from '../services/syncService';

describe('sync service safeguards', () => {
  beforeEach(() => {
    checkFirebaseAvailability.mockReset();
    getFavorites.mockReset();
    getHistory.mockReset();
    getNetworkStatus.mockReset();
    getPendingSyncChanges.mockReset();
    resetPendingChanges.mockReset();
    saveFavorites.mockReset();
    saveHistory.mockReset();

    getFavorites.mockResolvedValue([]);
    getHistory.mockResolvedValue([]);
    getNetworkStatus.mockResolvedValue({ online: true });
  });

  it('adds, triggers, and removes sync listeners', () => {
    const listener = vi.fn();
    addSyncListener(SyncEvents.SYNC_STARTED, listener);

    triggerEvent(SyncEvents.SYNC_STARTED, { uid: 'user-1' });
    expect(listener).toHaveBeenCalledWith({ uid: 'user-1' });

    removeSyncListener(SyncEvents.SYNC_STARTED, listener);
    triggerEvent(SyncEvents.SYNC_STARTED, { uid: 'user-2' });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('returns a safe no-sync result when Firebase is unavailable', async () => {
    await expect(initialSync('user-1')).resolves.toMatchObject({
      success: false,
      error: '当前处于离线模式，无法同步数据',
    });
  });

  it('classifies local changes using modification timestamps', async () => {
    getFavorites.mockResolvedValue([
      { id: 'changed', modifiedAt: 200 },
      { id: 'old', modifiedAt: 50 },
      { id: 'first-sync' },
    ]);
    getHistory.mockResolvedValue([{ timestamp: 300 }, { timestamp: 20 }]);

    await expect(getLocalChangesSince(100)).resolves.toEqual({
      favorites: [{ id: 'changed', modifiedAt: 200 }],
      history: [{ timestamp: 300 }],
      hasChanges: true,
    });
  });

  it('clears one user sync timestamp without touching unrelated keys', async () => {
    const data = new Map([
      ['last_sync_timestamp_user-1', '100'],
      ['last_sync_timestamp_user-2', '200'],
      ['other', 'keep'],
    ]);
    const localStorageMock = {
      getItem: (key) => data.get(key) ?? null,
      key: (index) => [...data.keys()][index] ?? null,
      removeItem: (key) => data.delete(key),
      setItem: (key, value) => data.set(key, value),
      get length() {
        return data.size;
      },
    };
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: localStorageMock,
    });

    await expect(clearSyncTimestamp('user-1')).resolves.toBe(true);
    expect(data.has('last_sync_timestamp_user-1')).toBe(false);
    expect(data.has('last_sync_timestamp_user-2')).toBe(true);
    expect(data.has('other')).toBe(true);
  });
});
