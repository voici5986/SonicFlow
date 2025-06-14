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

// 添加同步状态存储实例
export const syncStore = localforage.createInstance({
  name: 'clMusicApp',
  storeName: 'syncStatus'
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
  } catch (error) {
    console.error("Error saving favorites:", error);
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
    // 未收藏，则添加到列表开头
    favorites.unshift(track);
    await saveFavorites(favorites);
    return { added: true, full: false };
  }
}

/**
 * 播放历史操作
 */
// 修改最大历史记录数为50条
export const MAX_HISTORY_ITEMS = 50; // 最大历史记录数量

export async function getHistory() {
  try {
    const data = await historyStore.getItem('items');
    return data || [];
  } catch (error) {
    console.error("Error getting history:", error);
    return [];
  }
}

export async function saveHistory(historyArray) {
  try {
    // 确保历史记录不超过最大数量
    const limitedHistory = historyArray.slice(0, MAX_HISTORY_ITEMS);
    await historyStore.setItem('items', limitedHistory);
    return true;
  } catch (error) {
    console.error("Error saving history:", error);
    return false;
  }
}

export async function addToHistory(track) {
  try {
    const history = await getHistory();
    
    // 检查是否已经存在相同歌曲
    const existingIndex = history.findIndex(item => item.song.id === track.id);
    
    if (existingIndex !== -1) {
      // 如果存在，从原位置删除
      history.splice(existingIndex, 1);
    }
    
    // 添加到历史记录的顶部
    history.unshift({
      timestamp: Date.now(),
      song: track
    });
    
    // 如果超过最大记录数，删除最旧的
    if (history.length > MAX_HISTORY_ITEMS) {
      history.length = MAX_HISTORY_ITEMS; // 直接截断数组
    }
    
    await historyStore.setItem('items', history);
    return true;
  } catch (error) {
    console.error("Error adding to history:", error);
    return false;
  }
}

// 清空历史记录
export async function clearHistory() {
  try {
    await historyStore.setItem('items', []);
    return true;
  } catch (error) {
    console.error("Error clearing history:", error);
    return false;
  }
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