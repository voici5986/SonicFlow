import localforage from 'localforage';

/**
 * 缓存类型枚举
 */
export const CACHE_TYPES = {
  SEARCH_RESULTS: 'searchResults',
  COVER_IMAGES: 'coverImages',
  COVER_IMAGES_DATA: 'coverImagesData',
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
  [CACHE_TYPES.COVER_IMAGES_DATA]: { ttl: 7 * 24 * 60 * 60 * 1000 }, // 7天
  [CACHE_TYPES.AUDIO_METADATA]: { ttl: 2 * 24 * 60 * 60 * 1000 }, // 2天
  [CACHE_TYPES.LYRICS]: { ttl: 7 * 24 * 60 * 60 * 1000 }, // 7天
  [CACHE_TYPES.AUDIO_URLS]: { ttl: 6 * 60 * 60 * 1000 } // 6小时
};

// 图片缓存配置
const IMAGE_CACHE_CONFIG = {
  MAX_SIZE: 100 * 1024 * 1024, // 100MB 上限
  CLEANUP_THRESHOLD: 0.9, // 当达到90%容量时触发清理
  CLEANUP_TARGET: 0.7 // 清理到70%容量
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
    
    // 如果是图片数据缓存，检查缓存大小
    if (type === CACHE_TYPES.COVER_IMAGES_DATA) {
      await manageCacheSize();
    }
    
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
    CACHE_CONFIG[CACHE_TYPES.COVER_IMAGES_DATA].ttl = 7 * 24 * 60 * 60 * 1000;
    CACHE_CONFIG[CACHE_TYPES.AUDIO_METADATA].ttl = 2 * 24 * 60 * 60 * 1000;
    CACHE_CONFIG[CACHE_TYPES.LYRICS].ttl = 7 * 24 * 60 * 60 * 1000;
    CACHE_CONFIG[CACHE_TYPES.AUDIO_URLS].ttl = 6 * 60 * 60 * 1000;
  }
};

/**
 * 将图片URL转换为Base64数据
 * @param {string} imageUrl - 图片URL
 * @returns {Promise<string|null>} - Base64编码的图片数据
 */
export const imageUrlToBase64 = async (imageUrl) => {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`获取图片失败: ${response.status}`);
    }
    
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('图片转Base64失败:', error);
    return null;
  }
};

/**
 * 缓存封面图片数据
 * @param {string} source - 音乐源
 * @param {string} picId - 图片ID
 * @param {string} imageUrl - 图片URL
 * @param {number} size - 图片尺寸
 * @returns {Promise<string|null>} - Base64编码的图片数据或null
 */
export const cacheCoverImageData = async (source, picId, imageUrl, size = 300) => {
  try {
    const cacheKey = `${source}-${picId}-${size}`;
    
    // 检查是否已缓存
    const existingData = await getCache(CACHE_TYPES.COVER_IMAGES_DATA, cacheKey);
    if (existingData) {
      return existingData.base64;
    }
    
    // 转换图片为Base64
    const base64Data = await imageUrlToBase64(imageUrl);
    if (!base64Data) {
      return null;
    }
    
    // 计算大致大小（Base64字符串长度的约3/4是字节大小）
    const approximateSize = Math.ceil(base64Data.length * 0.75);
    
    // 缓存图片数据
    await setCache(CACHE_TYPES.COVER_IMAGES_DATA, cacheKey, {
      base64: base64Data,
      originalUrl: imageUrl,
      size: approximateSize,
      source,
      picId
    });
    
    return base64Data;
  } catch (error) {
    console.error('缓存封面图片数据失败:', error);
    return null;
  }
};

/**
 * 获取缓存的封面图片数据
 * @param {string} source - 音乐源
 * @param {string} picId - 图片ID
 * @param {number} size - 图片尺寸
 * @returns {Promise<string|null>} - Base64编码的图片数据或null
 */
export const getCachedCoverImageData = async (source, picId, size = 300) => {
  try {
    const cacheKey = `${source}-${picId}-${size}`;
    const cachedData = await getCache(CACHE_TYPES.COVER_IMAGES_DATA, cacheKey);
    
    if (cachedData && cachedData.base64) {
      return cachedData.base64;
    }
    
    return null;
  } catch (error) {
    console.error('获取缓存封面图片数据失败:', error);
    return null;
  }
};

/**
 * 获取缓存大小
 * @param {string} type - 缓存类型
 * @returns {Promise<number>} - 缓存大小（字节）
 */
export const getCacheSize = async (type = CACHE_TYPES.COVER_IMAGES_DATA) => {
  try {
    const store = cacheStores[type];
    const keys = await store.keys();
    
    let totalSize = 0;
    for (const key of keys) {
      const item = await store.getItem(key);
      if (item && item.data) {
        if (type === CACHE_TYPES.COVER_IMAGES_DATA && item.data.size) {
          totalSize += item.data.size;
        } else {
          // 估算其他类型缓存大小
          totalSize += JSON.stringify(item).length * 2;
        }
      }
    }
    
    return totalSize;
  } catch (error) {
    console.error('获取缓存大小失败:', error);
    return 0;
  }
};

/**
 * 管理缓存大小，如果超过阈值则清理最旧的缓存
 * @returns {Promise<boolean>} - 是否执行了清理
 */
export const manageCacheSize = async () => {
  try {
    // 获取当前缓存大小
    const currentSize = await getCacheSize(CACHE_TYPES.COVER_IMAGES_DATA);
    
    // 如果超过阈值，清理缓存
    if (currentSize > IMAGE_CACHE_CONFIG.MAX_SIZE * IMAGE_CACHE_CONFIG.CLEANUP_THRESHOLD) {
      console.log(`图片缓存超过阈值 (${formatBytes(currentSize)}/${formatBytes(IMAGE_CACHE_CONFIG.MAX_SIZE)}), 开始清理...`);
      
      const store = cacheStores[CACHE_TYPES.COVER_IMAGES_DATA];
      const keys = await store.keys();
      
      // 获取所有缓存项及其时间戳
      const items = await Promise.all(
        keys.map(async (key) => {
          const item = await store.getItem(key);
          return {
            key,
            timestamp: item ? item.timestamp : 0,
            size: (item && item.data && item.data.size) ? item.data.size : 0
          };
        })
      );
      
      // 按时间戳排序（最旧的在前）
      items.sort((a, b) => a.timestamp - b.timestamp);
      
      // 计算需要清理的大小
      const targetSize = IMAGE_CACHE_CONFIG.MAX_SIZE * IMAGE_CACHE_CONFIG.CLEANUP_TARGET;
      const sizeToFree = currentSize - targetSize;
      
      // 从最旧的开始删除，直到释放足够空间
      let freedSize = 0;
      let deletedCount = 0;
      
      for (const item of items) {
        if (freedSize >= sizeToFree) break;
        
        await store.removeItem(item.key);
        freedSize += item.size;
        deletedCount++;
      }
      
      console.log(`图片缓存清理完成，删除了 ${deletedCount} 个项目，释放了 ${formatBytes(freedSize)} 空间`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('管理缓存大小失败:', error);
    return false;
  }
};

/**
 * 格式化字节大小
 * @param {number} bytes - 字节数
 * @param {number} decimals - 小数位数
 * @returns {string} - 格式化后的大小
 */
export const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}; 