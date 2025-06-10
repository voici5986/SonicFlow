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

/**
 * 收藏歌曲操作
 */
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

// 添加或移除收藏
export async function toggleFavorite(track) {
  const favorites = await getFavorites();
  const index = favorites.findIndex(item => item.id === track.id);

  if (index > -1) {
    // 已收藏，则移除
    favorites.splice(index, 1);
  } else {
    // 未收藏，则添加到列表开头
    favorites.unshift(track);
  }
  await saveFavorites(favorites);
  return index === -1; // 返回是否是新添加的 (true = added, false = removed)
}

/**
 * 播放历史操作
 */
const MAX_HISTORY_ITEMS = 100; // 最大历史记录数量

export async function getHistory() {
  try {
    const data = await historyStore.getItem('items');
    return data || [];
  } catch (error) {
    console.error("Error getting history:", error);
    return [];
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
      history.pop();
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