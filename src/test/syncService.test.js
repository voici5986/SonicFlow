import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  checkFirebaseAvailability,
  firebaseState,
  firestoreGetDoc,
  firestoreGetDocs,
  firestoreSetDoc,
  firestoreUpdateDoc,
  firestoreRunTransaction,
  firestoreWriteBatch,
  getFavorites,
  getFavoritesStrict,
  getFavoriteTombstones,
  getHistory,
  getHistoryStrict,
  getNetworkStatus,
  getPendingSyncChangesStrict,
  resetPendingChanges,
  saveFavorites,
  saveFavoriteTombstones,
  saveHistory,
} = vi.hoisted(() => ({
  checkFirebaseAvailability: vi.fn(),
  firebaseState: { available: false },
  firestoreGetDoc: vi.fn(),
  firestoreGetDocs: vi.fn(),
  firestoreSetDoc: vi.fn(),
  firestoreUpdateDoc: vi.fn(),
  firestoreRunTransaction: vi.fn(),
  firestoreWriteBatch: vi.fn(),
  getFavorites: vi.fn(),
  getFavoritesStrict: vi.fn(),
  getFavoriteTombstones: vi.fn(),
  getHistory: vi.fn(),
  getHistoryStrict: vi.fn(),
  getNetworkStatus: vi.fn(),
  getPendingSyncChangesStrict: vi.fn(),
  resetPendingChanges: vi.fn(),
  saveFavorites: vi.fn(),
  saveFavoriteTombstones: vi.fn(),
  saveHistory: vi.fn(),
}));

vi.mock('../services/firebase', () => ({
  db: {},
  get isFirebaseAvailable() {
    return firebaseState.available;
  },
  checkFirebaseAvailability,
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((...segments) => segments.join('/')),
  doc: vi.fn((...segments) => segments.join('/')),
  getDoc: firestoreGetDoc,
  getDocs: firestoreGetDocs,
  limit: vi.fn((value) => ({ limit: value })),
  orderBy: vi.fn((...values) => ({ orderBy: values })),
  query: vi.fn((reference) => reference),
  setDoc: firestoreSetDoc,
  updateDoc: firestoreUpdateDoc,
  runTransaction: firestoreRunTransaction,
  where: vi.fn((...values) => ({ where: values })),
  writeBatch: firestoreWriteBatch,
}));

vi.mock('../services/storage', () => ({
  MAX_HISTORY_ITEMS: 100,
  getFavorites,
  getFavoritesStrict,
  getFavoriteTombstones,
  getHistory,
  getHistoryStrict,
  getNetworkStatus,
  getPendingSyncChangesStrict,
  resetPendingChanges,
  saveFavorites,
  saveFavoriteTombstones,
  saveHistory,
}));

import {
  addSyncListener,
  cancelDelayedSync,
  clearSyncTimestamp,
  getLocalChangesSince,
  initialSync,
  mergeFavorites,
  mergeHistory,
  removeSyncListener,
  shouldSyncOnLogin,
  SyncEvents,
  triggerDelayedSync,
  triggerEvent,
} from '../services/syncService';

describe('sync service safeguards', () => {
  beforeEach(() => {
    const localData = new Map();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key) => localData.get(key) ?? null,
        setItem: (key, value) => localData.set(key, value),
        removeItem: (key) => localData.delete(key),
        key: (index) => [...localData.keys()][index] ?? null,
        get length() {
          return localData.size;
        },
      },
    });
    firebaseState.available = false;
    checkFirebaseAvailability.mockReset();
    firestoreGetDoc.mockReset();
    firestoreGetDocs.mockReset();
    firestoreSetDoc.mockReset();
    firestoreUpdateDoc.mockReset();
    firestoreRunTransaction.mockReset();
    firestoreWriteBatch.mockReset();
    getFavorites.mockReset();
    getFavoritesStrict.mockReset();
    getFavoriteTombstones.mockReset();
    getHistory.mockReset();
    getHistoryStrict.mockReset();
    getNetworkStatus.mockReset();
    getPendingSyncChangesStrict.mockReset();
    resetPendingChanges.mockReset();
    saveFavorites.mockReset();
    saveFavoriteTombstones.mockReset();
    saveHistory.mockReset();

    getFavorites.mockResolvedValue([]);
    getFavoritesStrict.mockImplementation((...args) => getFavorites(...args));
    getFavoriteTombstones.mockResolvedValue([]);
    getHistory.mockResolvedValue([]);
    getHistoryStrict.mockImplementation((...args) => getHistory(...args));
    getNetworkStatus.mockResolvedValue({ online: true });
    firestoreSetDoc.mockResolvedValue(undefined);
    firestoreUpdateDoc.mockResolvedValue(undefined);
    firestoreRunTransaction.mockImplementation(async (_db, callback) =>
      callback({
        get: vi.fn().mockResolvedValue({ exists: () => false, data: () => null }),
        set: vi.fn(),
      })
    );
    saveFavoriteTombstones.mockResolvedValue(true);
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
      favoriteTombstones: [],
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

  it('skips merge and login checks when Firebase is unavailable', async () => {
    await expect(mergeFavorites('user-1')).resolves.toMatchObject({
      success: false,
      error: '当前处于离线模式，无法同步数据',
    });
    await expect(mergeHistory('user-1')).resolves.toMatchObject({
      success: false,
      error: '当前处于离线模式，无法同步数据',
    });
    await expect(shouldSyncOnLogin('user-1')).resolves.toEqual({
      shouldSync: false,
      reason: '当前处于离线模式，无法同步数据',
    });
  });

  it('reports delayed sync cancellation when Firebase is unavailable', async () => {
    vi.useFakeTimers();
    const listener = vi.fn();
    addSyncListener(SyncEvents.SYNC_FAILED, listener);

    await triggerDelayedSync('user-1');
    await vi.advanceTimersByTimeAsync(30000);

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: 'user-1',
        error: '当前处于离线模式，无法同步数据',
        syncType: 'delayed',
      })
    );

    removeSyncListener(SyncEvents.SYNC_FAILED, listener);
    vi.useRealTimers();
  });

  it('cancels a pending delayed sync before logout or account changes', async () => {
    vi.useFakeTimers();
    const started = vi.fn();
    addSyncListener(SyncEvents.SYNC_STARTED, started);

    await triggerDelayedSync('user-1');
    expect(cancelDelayedSync()).toBe(true);
    await vi.advanceTimersByTimeAsync(30000);

    expect(started).not.toHaveBeenCalled();
    expect(cancelDelayedSync()).toBe(false);
    removeSyncListener(SyncEvents.SYNC_STARTED, started);
    vi.useRealTimers();
  });

  it('does not report success or advance the timestamp when a cloud read fails', async () => {
    firebaseState.available = true;
    checkFirebaseAvailability.mockResolvedValue(true);
    firestoreGetDoc.mockResolvedValue({ exists: () => true, data: () => ({ lastUpdated: 1 }) });
    firestoreGetDocs.mockRejectedValue(new Error('firestore read failed'));

    const data = new Map();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key) => data.get(key) ?? null,
        setItem: (key, value) => data.set(key, value),
        removeItem: (key) => data.delete(key),
        key: (index) => [...data.keys()][index] ?? null,
        get length() {
          return data.size;
        },
      },
    });

    await expect(initialSync('user-1')).resolves.toMatchObject({ success: false });
    expect(data.has('last_sync_timestamp_user-1')).toBe(false);
  });

  it('does not advance the timestamp when local sync storage cannot be read', async () => {
    firebaseState.available = true;
    checkFirebaseAvailability.mockResolvedValue(true);
    getFavoritesStrict.mockRejectedValue(new Error('indexeddb read failed'));

    await expect(initialSync('user-1')).resolves.toMatchObject({ success: false });
    expect(localStorage.getItem('last_sync_timestamp_user-1')).toBeNull();
  });

  it('does not report success or advance the timestamp when a cloud write fails', async () => {
    firebaseState.available = true;
    checkFirebaseAvailability.mockResolvedValue(true);
    getFavorites.mockResolvedValue([{ id: '1', source: 'netease', modifiedAt: 10 }]);
    firestoreGetDoc.mockResolvedValue({ exists: () => true, data: () => ({ lastUpdated: 0 }) });
    firestoreGetDocs.mockResolvedValue({ forEach: vi.fn() });
    firestoreRunTransaction.mockRejectedValue(new Error('firestore write failed'));

    const data = new Map();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key) => data.get(key) ?? null,
        setItem: (key, value) => data.set(key, value),
        removeItem: (key) => data.delete(key),
        key: (index) => [...data.keys()][index] ?? null,
        get length() {
          return data.size;
        },
      },
    });

    await expect(initialSync('user-1')).resolves.toMatchObject({ success: false });
    expect(data.has('last_sync_timestamp_user-1')).toBe(false);
  });

  it('writes only bounded schema fields to Firestore', async () => {
    firebaseState.available = true;
    checkFirebaseAvailability.mockResolvedValue(true);
    getFavorites.mockResolvedValue([
      {
        id: '1',
        source: 'netease',
        name: 'Song',
        artist: { name: 'Artist', injected: 'ignored' },
        album: { name: 'Album', huge: 'ignored' },
        pic_id: 'cover',
        lyric_id: 'lyric',
        arbitraryNestedData: { payload: 'must not reach Firestore' },
        modifiedAt: 10,
      },
    ]);
    firestoreGetDoc.mockResolvedValue({ exists: () => true, data: () => ({ lastUpdated: 0 }) });
    firestoreGetDocs.mockResolvedValue({ forEach: vi.fn() });
    const transactionSet = vi.fn();
    firestoreRunTransaction.mockImplementation(async (_db, callback) =>
      callback({
        get: vi.fn().mockResolvedValue({ exists: () => false, data: () => null }),
        set: transactionSet,
      })
    );

    await expect(initialSync('user-1')).resolves.toMatchObject({ success: true });
    expect(transactionSet).toHaveBeenCalledWith(expect.anything(), {
      id: '1',
      source: 'netease',
      name: 'Song',
      artist: 'Artist',
      album: 'Album',
      pic_id: 'cover',
      lyric_id: 'lyric',
      modifiedAt: 10,
    });
  });

  it('preserves source-specific local fields when newer cloud data is merged', async () => {
    firebaseState.available = true;
    checkFirebaseAvailability.mockResolvedValue(true);
    getFavorites.mockResolvedValue([
      {
        id: '1',
        source: 'netease',
        name: 'Local name',
        ar: [{ name: 'Raw artist' }],
        modifiedAt: 10,
      },
    ]);
    getHistory.mockResolvedValue([
      {
        timestamp: 10,
        song: { id: '2', source: 'kuwo', name: 'Local history', al: { picUrl: 'raw-cover' } },
      },
    ]);
    firestoreGetDoc.mockResolvedValue({ exists: () => true, data: () => ({ lastUpdated: 20 }) });
    firestoreGetDocs
      .mockResolvedValueOnce({
        forEach: (callback) =>
          callback({
            id: 'netease%3A1',
            data: () => ({ id: '1', source: 'netease', name: 'Cloud name', modifiedAt: 20 }),
          }),
      })
      .mockResolvedValueOnce({
        forEach: (callback) =>
          callback({
            id: 'kuwo%3A2',
            data: () => ({
              timestamp: 20,
              song: { id: '2', source: 'kuwo', name: 'Cloud history' },
            }),
          }),
      });
    saveFavorites.mockResolvedValue(true);
    saveHistory.mockResolvedValue(true);

    await expect(initialSync('user-1')).resolves.toMatchObject({ success: true });
    expect(saveFavorites).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          name: 'Cloud name',
          ar: [{ name: 'Raw artist' }],
          modifiedAt: 20,
        }),
      ],
      'user-1'
    );
    expect(saveHistory).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          timestamp: 20,
          song: expect.objectContaining({
            name: 'Cloud history',
            al: { picUrl: 'raw-cover' },
          }),
        }),
      ],
      'user-1'
    );
  });

  it('applies a newer cloud favorite tombstone without uploading stale local data', async () => {
    firebaseState.available = true;
    checkFirebaseAvailability.mockResolvedValue(true);
    getFavorites.mockResolvedValue([{ id: '1', source: 'netease', modifiedAt: 10 }]);
    firestoreGetDoc.mockResolvedValue({ exists: () => true, data: () => ({ lastUpdated: 20 }) });
    firestoreGetDocs
      .mockResolvedValueOnce({
        forEach: (callback) =>
          callback({
            id: 'netease%3A1',
            data: () => ({
              id: '1',
              source: 'netease',
              modifiedAt: 20,
              deletedAt: 20,
            }),
          }),
      })
      .mockResolvedValueOnce({ forEach: vi.fn() });
    saveFavorites.mockResolvedValue(true);

    await expect(initialSync('user-1')).resolves.toMatchObject({ success: true });
    expect(firestoreRunTransaction).not.toHaveBeenCalled();
    expect(saveFavorites).toHaveBeenCalledWith([], 'user-1');
    expect(saveFavoriteTombstones).toHaveBeenCalledWith(
      [expect.objectContaining({ id: '1', source: 'netease', deletedAt: 20 })],
      'user-1'
    );
  });

  it('uses a stable source-aware history document id and prunes legacy duplicates', async () => {
    firebaseState.available = true;
    checkFirebaseAvailability.mockResolvedValue(true);
    getHistory.mockResolvedValue([
      { timestamp: 10, song: { id: '1', source: 'netease', name: 'Song' } },
    ]);
    firestoreGetDoc.mockResolvedValue({ exists: () => true, data: () => ({ lastUpdated: 0 }) });
    firestoreGetDocs
      .mockResolvedValueOnce({ forEach: vi.fn() })
      .mockResolvedValueOnce({ forEach: vi.fn() })
      .mockResolvedValueOnce({
        forEach: (callback) => {
          callback({
            id: 'netease%3A1',
            data: () => ({ timestamp: 10, song: { id: '1', source: 'netease' } }),
          });
          callback({
            id: '5_1',
            data: () => ({ timestamp: 5, song: { id: '1', source: 'netease' } }),
          });
        },
      });
    const transactionSet = vi.fn();
    firestoreRunTransaction.mockImplementation(async (_db, callback) =>
      callback({
        get: vi.fn().mockResolvedValue({ exists: () => false, data: () => null }),
        set: transactionSet,
      })
    );
    const batches = [];
    firestoreWriteBatch.mockImplementation(() => {
      const batch = { set: vi.fn(), delete: vi.fn(), commit: vi.fn().mockResolvedValue(undefined) };
      batches.push(batch);
      return batch;
    });

    await expect(initialSync('user-1')).resolves.toMatchObject({ success: true });
    expect(transactionSet.mock.calls[0][0]).toContain('netease%3A1');
    expect(batches[0].delete.mock.calls[0][0]).toContain('5_1');
  });

  it('does not overwrite a newer favorite written after the cloud snapshot', async () => {
    firebaseState.available = true;
    checkFirebaseAvailability.mockResolvedValue(true);
    getFavorites.mockResolvedValue([{ id: '1', source: 'netease', modifiedAt: 10 }]);
    firestoreGetDoc.mockResolvedValue({ exists: () => true, data: () => ({ lastUpdated: 0 }) });
    firestoreGetDocs.mockResolvedValue({ forEach: vi.fn() });
    const transactionSet = vi.fn();
    firestoreRunTransaction.mockImplementation(async (_db, callback) =>
      callback({
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({ id: '1', source: 'netease', modifiedAt: 20 }),
        }),
        set: transactionSet,
      })
    );

    await expect(initialSync('user-1')).resolves.toMatchObject({ success: false });
    expect(transactionSet).not.toHaveBeenCalled();
    expect(localStorage.getItem('last_sync_timestamp_user-1')).toBeNull();
  });

  it('emits a skipped event without presenting insufficient changes as completed', async () => {
    vi.useFakeTimers();
    firebaseState.available = true;
    checkFirebaseAvailability.mockResolvedValue(true);
    getPendingSyncChangesStrict.mockResolvedValue({ favorites: 0, history: 1 });
    const skipped = vi.fn();
    const completed = vi.fn();
    addSyncListener(SyncEvents.SYNC_SKIPPED, skipped);
    addSyncListener(SyncEvents.SYNC_COMPLETED, completed);

    await triggerDelayedSync('user-1');
    await vi.advanceTimersByTimeAsync(30000);

    expect(skipped).toHaveBeenCalledWith(
      expect.objectContaining({ uid: 'user-1', reason: '变更不足，跳过同步' })
    );
    expect(completed).not.toHaveBeenCalled();

    removeSyncListener(SyncEvents.SYNC_SKIPPED, skipped);
    removeSyncListener(SyncEvents.SYNC_COMPLETED, completed);
    vi.useRealTimers();
  });
});
