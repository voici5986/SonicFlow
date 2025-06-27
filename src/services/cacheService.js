import localforage from 'localforage';

/**
 * 缓存类型枚举
 */
export const CACHE_TYPES = {
  SEARCH_RESULTS: 'searchResults',
  COVER_IMAGES: 'coverImages',
  AUDIO_METADATA: 'audioMetadata',
  LYRICS: 'lyrics',
  AUDIO_URLS: 'audioUrls'
};

/**
 * 缓存配置（过期时间）
 */
const CACHE_CONFIG = {
  [CACHE_TYPES.SEARCH_RESULTS]: { ttl: 60 * 60 * 1000 }, // 1小时
  [CACHE_TYPES.COVER_IMAGES]: { ttl: 24 * 60 * 60 * 1000 }, // 24小时
  [CACHE_TYPES.AUDIO_METADATA]: { ttl: 12 * 60 * 60 * 1000 }, // 12小时
  [CACHE_TYPES.LYRICS]: { ttl: 24 * 60 * 60 * 1000 }, // 24小时
  [CACHE_TYPES.AUDIO_URLS]: { ttl: 6 * 60 * 60 * 1000 } // 6小时
};

/**
 * 为每种缓存类型创建localforage实例
 */
const cacheStores = {};
Object.keys(CACHE_TYPES).forEach(type => {
  cacheStores[CACHE_TYPES[type]] = localforage.createInstance({
    name: 'clMusicApp',
    storeName: CACHE_TYPES[type]
  });
});

/**
 * 检查缓存项是否过期
 * @param {Object} cacheItem - 缓存项
 * @returns {boolean} - 是否过期
 */
const isExpired = (cacheItem) => {
  return !cacheItem || !cacheItem.timestamp || 
    (Date.now() - cacheItem.timestamp > cacheItem.ttl);
};

/**
 * 设置缓存
 * @param {string} type - 缓存类型
 * @param {string} key - 缓存键
 * @param {*} data - 要缓存的数据
 * @returns {Promise<*>} - 缓存的数据
 */
export const setCache = async (type, key, data) => {
  try {
    const config = CACHE_CONFIG[type] || { ttl: 30 * 60 * 1000 }; // 默认30分钟
    const cacheItem = {
      data,
      timestamp: Date.now(),
      ttl: config.ttl
    };
    
    await cacheStores[type].setItem(key, cacheItem);
    return data;
  } catch (error) {
    console.warn(`设置缓存失败 (${type}/${key}):`, error);
    return data; // 即使缓存失败，仍返回原始数据
  }
};

/**
 * 获取缓存
 * @param {string} type - 缓存类型
 * @param {string} key - 缓存键
 * @returns {Promise<*|null>} - 缓存的数据或null
 */
export const getCache = async (type, key) => {
  try {
    const cacheItem = await cacheStores[type].getItem(key);
    
    if (cacheItem && !isExpired(cacheItem)) {
      return cacheItem.data;
    }
    
    // 如果过期或不存在，返回null
    if (cacheItem) {
      // 可选：删除过期缓存
      await cacheStores[type].removeItem(key);
    }
    
    return null;
  } catch (error) {
    console.warn(`获取缓存失败 (${type}/${key}):`, error);
    return null;
  }
};

/**
 * 清除特定类型的缓存
 * @param {string} type - 缓存类型，如果不提供则清除所有缓存
 * @returns {Promise<boolean>} - 是否成功
 */
export const clearCache = async (type) => {
  try {
    if (type && cacheStores[type]) {
      // 清除特定类型的缓存
      await cacheStores[type].clear();
    } else if (!type) {
      // 清除所有缓存
      await Promise.all(
        Object.values(cacheStores).map(store => store.clear())
      );
    }
    return true;
  } catch (error) {
    console.warn(`清除缓存失败:`, error);
    return false;
  }
};

/**
 * 根据网络状态调整缓存策略
 * @param {boolean} isOnline - 是否在线
 */
export const adjustCacheForOffline = (isOnline) => {
  if (!isOnline) {
    // 离线模式下延长所有缓存时间
    Object.keys(CACHE_CONFIG).forEach(type => {
      CACHE_CONFIG[type].ttl *= 3; // 延长3倍
    });
  } else {
    // 恢复默认缓存时间
    CACHE_CONFIG[CACHE_TYPES.SEARCH_RESULTS].ttl = 60 * 60 * 1000;
    CACHE_CONFIG[CACHE_TYPES.COVER_IMAGES].ttl = 24 * 60 * 60 * 1000;
    CACHE_CONFIG[CACHE_TYPES.AUDIO_METADATA].ttl = 12 * 60 * 60 * 1000;
    CACHE_CONFIG[CACHE_TYPES.LYRICS].ttl = 24 * 60 * 60 * 1000;
    CACHE_CONFIG[CACHE_TYPES.AUDIO_URLS].ttl = 6 * 60 * 60 * 1000;
  }
}; 