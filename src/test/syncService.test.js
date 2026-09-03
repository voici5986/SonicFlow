import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  checkFirebaseAvailability,
  firebaseState,
  firestoreGetCount,
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
  resetPendingChanges,
  saveFavorites,
  saveFavoriteTombstones,
  saveHistory,
} = vi.hoisted(() => ({
  checkFirebaseAvailability: vi.fn(),
  firebaseState: { available: false },
  firestoreGetCount: vi.fn(),
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
  getCountFromServer: firestoreGetCount,
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
  resetPendingChanges,
  saveFavorites,
  saveFavoriteTombstones,
  saveHistory,
}));

import {
  addSyncListener,
  cancelDelayedSync,
  clearSyncTimestamp,
  ensureHistoryLegacyCleanup,
  getLocalChangesSince,
  initialSync,
  mergeFavorites,
  mergeHistory,
  removeSyncListener,
  requestSync,
  resetSyncScheduler,
  shouldSyncOnLogin,
  SyncEvents,
  triggerDelayedSync,
  triggerEvent,
  triggerImmediateSync,
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
    // 默认视为已完成遗留清理，避免常规同步用例被清理逻辑干扰；
    // 需要验证清理本身的用例会先移除该标记。
    localStorage.setItem('history_legacy_cleanup_v1_user-1', 'done');
    firebaseState.available = false;
    checkFirebaseAvailability.mockReset();
    firestoreGetCount.mockReset();
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
    resetPendingChanges.mockReset();
    saveFavorites.mockReset();
    saveFavoriteTombstones.mockReset();
    saveHistory.mockReset();

    firestoreGetCount.mockResolvedValue({ data: () => ({ count: 0 }) });
    resetPendingChanges.mockResolvedValue(true);
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

    await triggerDelayedSync('user-1', 'favorites');
    await vi.advanceTimersByTimeAsync(5000);

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: 'user-1',
        error: '当前处于离线模式，无法同步数据',
      })
    );

    removeSyncListener(SyncEvents.SYNC_FAILED, listener);
    vi.useRealTimers();
  });

  it('cancels a pending delayed sync before logout or account changes', async () => {
    vi.useFakeTimers();
    const started = vi.fn();
    addSyncListener(SyncEvents.SYNC_STARTED, started);

    await triggerDelayedSync('user-1', 'favorites');
    expect(cancelDelayedSync()).toBe(true);
    await vi.advanceTimersByTimeAsync(5000);

    expect(started).not.toHaveBeenCalled();
    expect(cancelDelayedSync()).toBe(false);
    removeSyncListener(SyncEvents.SYNC_STARTED, started);
    vi.useRealTimers();
  });

  it('debounces favorite changes to the latest change', async () => {
    vi.useFakeTimers();
    firebaseState.available = true;
    checkFirebaseAvailability.mockResolvedValue(true);
    firestoreGetDoc.mockResolvedValue({ exists: () => true, data: () => ({ lastUpdated: 0 }) });
    firestoreGetDocs.mockResolvedValue({ forEach: vi.fn() });

    const completed = vi.fn();
    addSyncListener(SyncEvents.SYNC_COMPLETED, completed);

    await triggerDelayedSync('user-1', 'favorites');
    await vi.advanceTimersByTimeAsync(4000);

    // 4 秒时的新收藏应重置 5 秒窗口
    await triggerDelayedSync('user-1', 'favorites');
    await vi.advanceTimersByTimeAsync(4000);
    expect(completed).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1000);
    expect(completed).toHaveBeenCalledTimes(1);

    removeSyncListener(SyncEvents.SYNC_COMPLETED, completed);
    vi.useRealTimers();
  });

  it('batches history changes into a fixed window without resetting the timer', async () => {
    vi.useFakeTimers();
    firebaseState.available = true;
    checkFirebaseAvailability.mockResolvedValue(true);
    firestoreGetDoc.mockResolvedValue({ exists: () => true, data: () => ({ lastUpdated: 0 }) });
    firestoreGetDocs.mockResolvedValue({ forEach: vi.fn() });

    const completed = vi.fn();
    addSyncListener(SyncEvents.SYNC_COMPLETED, completed);

    // 第 0 秒启动 15 秒窗口
    await triggerDelayedSync('user-1', 'history');

    // 第 8 秒、第 12 秒的后续历史不应把窗口继续推后
    await vi.advanceTimersByTimeAsync(8000);
    await triggerDelayedSync('user-1', 'history');
    await vi.advanceTimersByTimeAsync(4000);
    await triggerDelayedSync('user-1', 'history');
    expect(completed).not.toHaveBeenCalled();

    // 第 15 秒窗口到点，整批只同步一次
    await vi.advanceTimersByTimeAsync(3000);
    expect(completed).toHaveBeenCalledTimes(1);

    removeSyncListener(SyncEvents.SYNC_COMPLETED, completed);
    vi.useRealTimers();
  });

  it('reuses the in-flight sync instead of starting a second one', async () => {
    firebaseState.available = true;
    checkFirebaseAvailability.mockResolvedValue(true);

    let releaseGate;
    const gate = new Promise((resolve) => {
      releaseGate = resolve;
    });
    firestoreGetDoc.mockImplementation(() =>
      gate.then(() => ({ exists: () => true, data: () => ({ lastUpdated: 0 }) }))
    );
    firestoreGetDocs.mockResolvedValue({ forEach: vi.fn() });

    const first = triggerImmediateSync('user-1', 'manual');
    const second = triggerImmediateSync('user-1', 'foreground');

    releaseGate();
    const [firstResult, secondResult] = await Promise.all([first, second]);

    expect(secondResult).toBe(firstResult);
    expect(firestoreGetDoc).toHaveBeenCalledTimes(1);
  });

  it('keeps pending changes when a sync fails', async () => {
    firebaseState.available = true;
    checkFirebaseAvailability.mockResolvedValue(true);
    // 云端时间晚于上次同步时间，确保真正走到云端读取再失败，而不是被短路跳过
    firestoreGetDoc.mockResolvedValue({ exists: () => true, data: () => ({ lastUpdated: 1 }) });
    firestoreGetDocs.mockRejectedValue(new Error('firestore read failed'));

    await expect(triggerImmediateSync('user-1', 'manual')).resolves.toMatchObject({
      success: false,
    });
    expect(resetPendingChanges).not.toHaveBeenCalled();
  });

  it('skips sync while offline and schedules at most one fallback retry', async () => {
    vi.useFakeTimers();
    firebaseState.available = true;
    checkFirebaseAvailability.mockResolvedValue(true);

    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });

    const skipped = vi.fn();
    const failed = vi.fn();
    addSyncListener(SyncEvents.SYNC_SKIPPED, skipped);
    addSyncListener(SyncEvents.SYNC_FAILED, failed);

    await triggerImmediateSync('user-1', 'foreground');
    expect(skipped).toHaveBeenCalledTimes(1);
    expect(failed).not.toHaveBeenCalled();

    // 60 秒兜底重试只排一次，之后不再无限循环
    await vi.advanceTimersByTimeAsync(60000);
    expect(skipped).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(60000 * 3);
    expect(skipped).toHaveBeenCalledTimes(2);

    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true });
    removeSyncListener(SyncEvents.SYNC_SKIPPED, skipped);
    removeSyncListener(SyncEvents.SYNC_FAILED, failed);
    vi.useRealTimers();
  });

  it('drops the queued rerun when the scheduler is reset for an account change', async () => {
    firebaseState.available = true;
    checkFirebaseAvailability.mockResolvedValue(true);
    firestoreGetDoc.mockResolvedValue({ exists: () => true, data: () => ({ lastUpdated: 0 }) });
    firestoreGetDocs.mockResolvedValue({ forEach: vi.fn() });

    const completed = vi.fn();
    addSyncListener(SyncEvents.SYNC_COMPLETED, completed);

    const first = requestSync('user-1', 'manual');
    // 第二轮请求落在排队位上
    const queued = requestSync('user-1', 'delayed:favorites');

    // 账号切换时重置调度器，补跑请求必须被丢弃
    expect(resetSyncScheduler()).toBe(false);

    await Promise.all([first, queued]);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(completed).toHaveBeenCalledTimes(1);

    removeSyncListener(SyncEvents.SYNC_COMPLETED, completed);
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

  it('uses a stable source-aware history document id and prunes only the overflow', async () => {
    firebaseState.available = true;
    checkFirebaseAvailability.mockResolvedValue(true);
    getHistory.mockResolvedValue([
      { timestamp: 10, song: { id: '1', source: 'netease', name: 'Song' } },
    ]);
    firestoreGetDoc.mockResolvedValue({ exists: () => true, data: () => ({ lastUpdated: 0 }) });
    getFavorites.mockResolvedValue([]);
    // 121 条 > 阈值 120，应删除最旧的 121 - 100 = 21 条
    firestoreGetCount.mockResolvedValue({ data: () => ({ count: 121 }) });
    firestoreGetDocs
      .mockResolvedValueOnce({ forEach: vi.fn() })
      .mockResolvedValueOnce({ forEach: vi.fn() })
      .mockResolvedValueOnce({
        forEach: (callback) => {
          for (let index = 0; index < 21; index += 1) {
            callback({ id: `oldest-${index}`, data: () => ({ timestamp: index }) });
          }
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
    expect(firestoreGetCount).toHaveBeenCalledTimes(1);
    expect(batches[0].delete).toHaveBeenCalledTimes(21);
    expect(batches[0].delete.mock.calls[0][0]).toContain('oldest-0');
  });

  it('does not read the history collection when it stays within the threshold', async () => {
    firebaseState.available = true;
    checkFirebaseAvailability.mockResolvedValue(true);
    getHistory.mockResolvedValue([
      { timestamp: 10, song: { id: '1', source: 'netease', name: 'Song' } },
    ]);
    firestoreGetDoc.mockResolvedValue({ exists: () => true, data: () => ({ lastUpdated: 0 }) });
    firestoreGetCount.mockResolvedValue({ data: () => ({ count: 120 }) });
    firestoreGetDocs.mockResolvedValue({ forEach: vi.fn() });
    firestoreRunTransaction.mockImplementation(async (_db, callback) =>
      callback({
        get: vi.fn().mockResolvedValue({ exists: () => false, data: () => null }),
        set: vi.fn(),
      })
    );

    await expect(initialSync('user-1')).resolves.toMatchObject({ success: true });

    // 只应有收藏与历史两次增量查询，没有裁剪查询
    expect(firestoreGetDocs).toHaveBeenCalledTimes(2);
    expect(firestoreWriteBatch).not.toHaveBeenCalled();
  });

  it('does not fail the sync when history pruning fails', async () => {
    firebaseState.available = true;
    checkFirebaseAvailability.mockResolvedValue(true);
    getHistory.mockResolvedValue([
      { timestamp: 10, song: { id: '1', source: 'netease', name: 'Song' } },
    ]);
    firestoreGetDoc.mockResolvedValue({ exists: () => true, data: () => ({ lastUpdated: 0 }) });
    firestoreGetCount.mockRejectedValue(new Error('aggregate query failed'));
    firestoreGetDocs.mockResolvedValue({ forEach: vi.fn() });
    firestoreRunTransaction.mockImplementation(async (_db, callback) =>
      callback({
        get: vi.fn().mockResolvedValue({ exists: () => false, data: () => null }),
        set: vi.fn(),
      })
    );

    // 裁剪失败只记录日志，不能把已成功的历史同步判成失败
    await expect(initialSync('user-1')).resolves.toMatchObject({ success: true });
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

  it('syncs regardless of the pending counter, which is only a UI signal', async () => {
    vi.useFakeTimers();
    firebaseState.available = true;
    checkFirebaseAvailability.mockResolvedValue(true);
    firestoreGetDoc.mockResolvedValue({ exists: () => true, data: () => ({ lastUpdated: 0 }) });
    firestoreGetDocs.mockResolvedValue({ forEach: vi.fn() });

    const skipped = vi.fn();
    const completed = vi.fn();
    addSyncListener(SyncEvents.SYNC_SKIPPED, skipped);
    addSyncListener(SyncEvents.SYNC_COMPLETED, completed);

    // 计数器为 0 时 timer 到期仍然同步：同步内容由 getLocalChangesSince 决定，
    // 计数器不再承担闸门职责。
    await triggerDelayedSync('user-1', 'history');
    await vi.advanceTimersByTimeAsync(15000);

    expect(completed).toHaveBeenCalledTimes(1);
    expect(skipped).not.toHaveBeenCalled();

    removeSyncListener(SyncEvents.SYNC_SKIPPED, skipped);
    removeSyncListener(SyncEvents.SYNC_COMPLETED, completed);
    vi.useRealTimers();
  });

  describe('legacy history cleanup', () => {
    it('deduplicates legacy doc ids once and records the migration flag', async () => {
      localStorage.removeItem('history_legacy_cleanup_v1_user-1');
      firestoreGetCount.mockResolvedValue({ data: () => ({ count: 121 }) });
      firestoreGetDocs.mockResolvedValue({
        forEach: (callback) => {
          callback({
            id: 'netease%3A1',
            data: () => ({ timestamp: 120, song: { id: '1', source: 'netease', name: 'Song' } }),
          });
          callback({
            id: '5_1',
            data: () => ({ timestamp: 110, song: { id: '1', source: 'netease', name: 'Song' } }),
          });
        },
      });
      const batches = [];
      firestoreWriteBatch.mockImplementation(() => {
        const batch = {
          set: vi.fn(),
          delete: vi.fn(),
          commit: vi.fn().mockResolvedValue(undefined),
        };
        batches.push(batch);
        return batch;
      });

      await expect(ensureHistoryLegacyCleanup('user-1')).resolves.toBe(true);

      expect(batches[0].delete).toHaveBeenCalledTimes(1);
      expect(batches[0].delete.mock.calls[0][0]).toContain('5_1');
      expect(localStorage.getItem('history_legacy_cleanup_v1_user-1')).toBe('done');
    });

    it('marks the migration complete without scanning when count is within limits', async () => {
      localStorage.removeItem('history_legacy_cleanup_v1_user-1');
      firestoreGetCount.mockResolvedValue({ data: () => ({ count: 60 }) });

      await expect(ensureHistoryLegacyCleanup('user-1')).resolves.toBe(true);

      expect(firestoreGetDocs).not.toHaveBeenCalled();
      expect(localStorage.getItem('history_legacy_cleanup_v1_user-1')).toBe('done');
    });

    it('skips entirely once the migration flag is present', async () => {
      // beforeEach 已预置完成标记
      await expect(ensureHistoryLegacyCleanup('user-1')).resolves.toBe(true);

      expect(firestoreGetCount).not.toHaveBeenCalled();
      expect(firestoreGetDocs).not.toHaveBeenCalled();
    });

    it('does not record the flag when cleanup fails so it retries next sync', async () => {
      localStorage.removeItem('history_legacy_cleanup_v1_user-1');
      firestoreGetCount.mockRejectedValue(new Error('aggregate query failed'));

      await expect(ensureHistoryLegacyCleanup('user-1')).resolves.toBe(false);
      expect(localStorage.getItem('history_legacy_cleanup_v1_user-1')).toBeNull();
    });

    it('runs legacy cleanup before a fresh sync pull on an upgraded device', async () => {
      localStorage.removeItem('history_legacy_cleanup_v1_user-1');
      firebaseState.available = true;
      checkFirebaseAvailability.mockResolvedValue(true);
      firestoreGetDoc.mockResolvedValue({ exists: () => true, data: () => ({ lastUpdated: 0 }) });
      getFavorites.mockResolvedValue([]);
      getHistory.mockResolvedValue([]);
      firestoreGetCount.mockResolvedValue({ data: () => ({ count: 121 }) });
      // 61 首歌，每首新旧两个 docId（稳定 id 先出现、时间更新）
      firestoreGetDocs
        .mockResolvedValueOnce({
          forEach: (callback) => {
            for (let index = 0; index < 121; index += 1) {
              const songId = Math.floor(index / 2);
              callback({
                id: index % 2 === 0 ? `netease%3A${songId}` : `${songId}_1`,
                data: () => ({
                  timestamp: 121 - index,
                  song: { id: `${songId}`, source: 'netease', name: `Song ${songId}` },
                }),
              });
            }
          },
        })
        .mockResolvedValueOnce({ forEach: vi.fn() }) // 云收藏
        .mockResolvedValueOnce({ forEach: vi.fn() }); // 云历史（清理后）
      const batches = [];
      firestoreWriteBatch.mockImplementation(() => {
        const batch = {
          set: vi.fn(),
          delete: vi.fn(),
          commit: vi.fn().mockResolvedValue(undefined),
        };
        batches.push(batch);
        return batch;
      });

      await expect(initialSync('user-1')).resolves.toMatchObject({ success: true });

      // 61 首唯一歌曲在 100 条保留上限内：只删除 60 个遗留重复 docId
      expect(batches[0].delete).toHaveBeenCalledTimes(60);
      expect(batches[0].delete.mock.calls[0][0]).toContain('0_1');
      expect(localStorage.getItem('history_legacy_cleanup_v1_user-1')).toBe('done');
    });
  });
});
