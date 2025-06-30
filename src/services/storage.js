import localforage from 'localforage';

// 配置并创建不同数据类型的存储实例
export const favoritesStore = localforage.createInstance({
  name: 'clMusicApp',
  storeName: 'favorites'
});

export const historyStore = localforage.createInstance({
  name: 'clMusicApp',
  storeName: 'history'
});

// 添加搜索历史存储实例
export const searchHistoryStore = localforage.createInstance({
  name: 'clMusicApp',
  storeName: 'searchHistory'
});

// 添加同步状态存储实例
export const syncStore = localforage.createInstance({
  name: 'clMusicApp',
  storeName: 'syncStatus'
});

// 添加本地用户存储实例
export const userStore = localforage.createInstance({
  name: 'clMusicApp',
  storeName: 'localUser'
});

// 网络状态存储实例
export const networkStore = localforage.createInstance({
  name: 'clMusicApp',
  storeName: 'networkStatus'
});

/**
 * 收藏歌曲操作
 */
// 设置收藏上限为500条
export const MAX_FAVORITES_ITEMS = 500;

export async function getFavorites() {
  try {
    const data = await favoritesStore.getItem('items');
    return data || []; // 如果没有数据，返回空数组
  } catch (error) {
    console.error("Error getting favorites:", error);
    return [];
  }
}

export async function saveFavorites(favoritesArray) {
  try {
    await favoritesStore.setItem('items', favoritesArray);
    return true;
  } catch (error) {
    console.error("保存收藏列表失败:", error);
    return false;
  }
}

// 检查歌曲是否已收藏
export async function isFavorite(trackId) {
  const favorites = await getFavorites();
  return favorites.some(item => item.id === trackId);
}

// 检查收藏是否已满
export async function isFavoritesFull() {
  const favorites = await getFavorites();
  return favorites.length >= MAX_FAVORITES_ITEMS;
}

// 添加或移除收藏
export async function toggleFavorite(track) {
  const favorites = await getFavorites();
  const index = favorites.findIndex(item => item.id === track.id);

  if (index > -1) {
    // 已收藏，则移除
    favorites.splice(index, 1);
    await saveFavorites(favorites);
    return { added: false, full: false };
  } else {
    // 检查是否已达到上限
    if (favorites.length >= MAX_FAVORITES_ITEMS) {
      return { added: false, full: true };
    }
    // 未收藏，则添加到列表开头，并添加修改时间戳
    const trackWithTimestamp = {
      ...track,
      modifiedAt: Date.now() // 添加修改时间戳
    };
    favorites.unshift(trackWithTimestamp);
    await saveFavorites(favorites);
    return { added: true, full: false };
  }
}

/**
 * 本地用户操作
 */
// 保存本地用户信息
export async function saveLocalUser(user) {
  try {
    await userStore.setItem('localUser', user);
    return true;
  } catch (error) {
    console.error("保存本地用户信息失败:", error);
    return false;
  }
}

// 获取本地用户信息
export function getLocalUser() {
  try {
    return userStore.getItem('localUser');
  } catch (error) {
    console.error("获取本地用户信息失败:", error);
    return null;
  }
}

// 删除本地用户信息
export async function removeLocalUser() {
  try {
    await userStore.removeItem('localUser');
    return true;
  } catch (error) {
    console.error("删除本地用户信息失败:", error);
    return false;
  }
}

/**
 * 网络状态操作
 */
// 保存网络状态
export async function saveNetworkStatus(status) {
  try {
    // 确保包含所有必要的字段
    const completeStatus = {
      online: status.online || navigator.onLine,
      lastChecked: status.lastChecked || Date.now(),
      connectionType: status.connectionType || 'unknown'
    };
    
    await networkStore.setItem('status', completeStatus);
    return true;
  } catch (error) {
    console.error("保存网络状态失败:", error);
    return false;
  }
}

// 获取网络状态
export async function getNetworkStatus() {
  try {
    const status = await networkStore.getItem('status');
    if (!status) {
      // 默认状态
      return { 
        online: navigator.onLine, 
        lastChecked: Date.now(),
        connectionType: navigator.onLine ? 'unknown' : 'offline'
      };
    }
    
    // 确保返回的对象包含connectionType字段
    if (!status.connectionType) {
      status.connectionType = status.online ? 'unknown' : 'offline';
    }
    
    return status;
  } catch (error) {
    console.error("获取网络状态失败:", error);
    return { 
      online: navigator.onLine, 
      lastChecked: Date.now(),
      connectionType: navigator.onLine ? 'unknown' : 'offline'
    };
  }
}

/**
 * 通用历史记录操作
 * 用于处理播放历史、搜索历史等
 */
// 定义最大记录数
export const MAX_HISTORY_ITEMS = 100; // 播放历史记录数量
export const MAX_SEARCH_HISTORY_ITEMS = 20; // 搜索历史记录数量

/**
 * 获取历史记录
 * @param {Object} store - 存储实例
 * @returns {Promise<Array>} - 历史记录数组
 */
async function getHistoryGeneric(store) {
  try {
    const data = await store.getItem('items');
    return data || [];
  } catch (error) {
    console.error("Error getting history:", error);
    return [];
  }
}

/**
 * 保存历史记录
 * @param {Object} store - 存储实例
 * @param {Array} historyArray - 历史记录数组
 * @param {number} maxItems - 最大记录数
 * @returns {Promise<boolean>} - 是否成功
 */
async function saveHistoryGeneric(store, historyArray, maxItems) {
  try {
    // 确保历史记录不超过最大数量
    const limitedHistory = historyArray.slice(0, maxItems);
    await store.setItem('items', limitedHistory);
    return true;
  } catch (error) {
    console.error("Error saving history:", error);
    return false;
  }
}

/**
 * 添加记录到历史
 * @param {Object} store - 存储实例
 * @param {Object|string} item - 要添加的项目
 * @param {number} maxItems - 最大记录数
 * @param {Function} findExistingFn - 查找已存在项的函数
 * @param {Function} createItemFn - 创建新项的函数
 * @returns {Promise<boolean>} - 是否成功
 */
async function addToHistoryGeneric(store, item, maxItems, findExistingFn, createItemFn) {
  try {
    const history = await getHistoryGeneric(store);
    
    // 检查是否已经存在
    const existingIndex = history.findIndex(findExistingFn);
    
    if (existingIndex !== -1) {
      // 如果存在，从原位置删除
      history.splice(existingIndex, 1);
    }
    
    // 添加到历史记录的顶部
    history.unshift(createItemFn(item));
    
    // 如果超过最大记录数，删除最旧的
    if (history.length > maxItems) {
      history.length = maxItems; // 直接截断数组
    }
    
    return await saveHistoryGeneric(store, history, maxItems);
  } catch (error) {
    console.error("Error adding to history:", error);
    return false;
  }
}

/**
 * 清空历史记录
 * @param {Object} store - 存储实例
 * @returns {Promise<boolean>} - 是否成功
 */
async function clearHistoryGeneric(store) {
  try {
    await store.setItem('items', []);
    return true;
  } catch (error) {
    console.error("Error clearing history:", error);
    return false;
  }
}

/**
 * 播放历史操作
 */
// 获取播放历史
export async function getHistory() {
  return getHistoryGeneric(historyStore);
}

// 保存播放历史
export async function saveHistory(historyArray) {
  return saveHistoryGeneric(historyStore, historyArray, MAX_HISTORY_ITEMS);
}

// 添加到播放历史
export async function addToHistory(track) {
  return addToHistoryGeneric(
    historyStore,
    track,
    MAX_HISTORY_ITEMS,
    item => item.song.id === track.id,
    track => ({
      timestamp: Date.now(),
      song: track
    })
  );
}

// 清空播放历史
export async function clearHistory() {
  return clearHistoryGeneric(historyStore);
}

/**
 * 搜索历史操作
 */
// 获取搜索历史
export async function getSearchHistory() {
  return getHistoryGeneric(searchHistoryStore);
}

// 保存搜索历史
export async function saveSearchHistory(historyArray) {
  return saveHistoryGeneric(searchHistoryStore, historyArray, MAX_SEARCH_HISTORY_ITEMS);
}

// 添加搜索历史
export async function addSearchHistory(query, source) {
  return addToHistoryGeneric(
    searchHistoryStore,
    { query, source },
    MAX_SEARCH_HISTORY_ITEMS,
    item => item.query.toLowerCase() === query.toLowerCase() && item.source === source,
    ({ query, source }) => ({
      timestamp: Date.now(),
      query: query,
      source: source
    })
  );
}

// 清空搜索历史
export async function clearSearchHistory() {
  return clearHistoryGeneric(searchHistoryStore);
}

/**
 * 同步状态操作
 */
// 获取同步状态
export async function getSyncStatus(userId) {
  try {
    const key = `sync_status_${userId || 'default'}`;
    const data = await syncStore.getItem(key);
    return data || { loading: false, success: null, message: '', timestamp: null };
  } catch (error) {
    console.error("Error getting sync status:", error);
    return { loading: false, success: null, message: '', timestamp: null };
  }
}

// 保存同步状态
export async function saveSyncStatus(status, userId) {
  try {
    const key = `sync_status_${userId || 'default'}`;
    await syncStore.setItem(key, status);
    return true;
  } catch (error) {
    console.error("Error saving sync status:", error);
    return false;
  }
} 

/**
 * 变更计数器操作 - 用于延迟同步
 */
// 变更计数器键名
const CHANGES_COUNTER_KEY = 'pending_sync_changes';
const CHANGES_TIMESTAMP_KEY = 'last_changes_timestamp';

// 获取待同步变更计数
export async function getPendingSyncChanges() {
  try {
    const counter = await syncStore.getItem(CHANGES_COUNTER_KEY);
    const timestamp = await syncStore.getItem(CHANGES_TIMESTAMP_KEY);
    return {
      favorites: counter?.favorites || 0,
      history: counter?.history || 0,
      timestamp: timestamp || 0
    };
  } catch (error) {
    console.error("获取待同步变更计数失败:", error);
    return { favorites: 0, history: 0, timestamp: 0 };
  }
}

// 保存待同步变更计数
export async function savePendingSyncChanges(counter) {
  try {
    await syncStore.setItem(CHANGES_COUNTER_KEY, counter);
    await syncStore.setItem(CHANGES_TIMESTAMP_KEY, Date.now());
    return true;
  } catch (error) {
    console.error("保存待同步变更计数失败:", error);
    return false;
  }
}

// 增加待同步变更计数
export async function incrementPendingChanges(type) {
  try {
    const counter = await getPendingSyncChanges();
    const newCounter = {
      ...counter,
      [type]: counter[type] + 1
    };
    
    await savePendingSyncChanges(newCounter);
    return newCounter;
  } catch (error) {
    console.error("增加待同步变更计数失败:", error);
    return null;
  }
}

// 重置待同步变更计数
export async function resetPendingChanges() {
  try {
    await syncStore.setItem(CHANGES_COUNTER_KEY, { favorites: 0, history: 0 });
    await syncStore.setItem(CHANGES_TIMESTAMP_KEY, Date.now());
    return true;
  } catch (error) {
    console.error("重置待同步变更计数失败:", error);
    return false;
  }
} 