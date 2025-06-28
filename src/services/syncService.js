import { db, isFirebaseAvailable, checkFirebaseAvailability } from './firebase';
import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { getFavorites, saveFavorites, getHistory, saveHistory, MAX_HISTORY_ITEMS, getNetworkStatus } from './storage';

// 同步时间戳存储键
const SYNC_TIMESTAMP_KEY = 'last_sync_timestamp';

/**
 * 获取上次同步时间戳
 * @param {string} uid 用户ID
 * @returns {Promise<number>} 上次同步时间戳
 */
const getLastSyncTime = async (uid) => {
  try {
    const key = `${SYNC_TIMESTAMP_KEY}_${uid}`;
    const timestamp = localStorage.getItem(key);
    return timestamp ? parseInt(timestamp) : 0;
  } catch (error) {
    console.error('获取同步时间戳失败:', error);
    return 0;
  }
};

/**
 * 保存同步时间戳
 * @param {string} uid 用户ID
 * @param {number} timestamp 时间戳
 */
const saveLastSyncTime = async (uid, timestamp) => {
  try {
    const key = `${SYNC_TIMESTAMP_KEY}_${uid}`;
    localStorage.setItem(key, timestamp.toString());
  } catch (error) {
    console.error('保存同步时间戳失败:', error);
  }
};

/**
 * 获取自上次同步后本地变更的数据
 * @param {number} lastSyncTime 上次同步时间戳
 * @returns {Promise<{favorites: Array, history: Array}>} 本地变更数据
 */
const getLocalChangesSince = async (lastSyncTime) => {
  try {
    // 获取所有本地数据
    const allFavorites = await getFavorites();
    const allHistory = await getHistory();
    
    // 筛选出变更的数据
    // 注意：由于当前数据结构可能没有修改时间戳，我们添加一个检测逻辑
    const changedFavorites = allFavorites.filter(item => {
      // 如果项目有modifiedAt字段，使用它判断
      if (item.modifiedAt) {
        return item.modifiedAt > lastSyncTime;
      }
      // 否则，我们无法确定是否变更，默认包含所有项
      return true;
    });
    
    const changedHistory = allHistory.filter(item => {
      // 历史记录通常有timestamp字段
      return item.timestamp > lastSyncTime;
    });
    
    return {
      favorites: changedFavorites,
      history: changedHistory,
      hasChanges: changedFavorites.length > 0 || changedHistory.length > 0
    };
  } catch (error) {
    console.error('获取本地变更数据失败:', error);
    return { favorites: [], history: [], hasChanges: false };
  }
};

/**
 * 检查是否可以执行同步操作
 * @returns {Promise<{canSync: boolean, error: string|null}>}
 */
const checkSyncAvailability = async () => {
  // 检查Firebase是否可用
  if (!isFirebaseAvailable) {
    console.warn("同步检测: Firebase初始化不可用");
    return { canSync: false, error: '当前处于离线模式，无法同步数据' };
  }
  
  // 进一步检查Firebase连接
  const firebaseAvailable = await checkFirebaseAvailability();
  if (!firebaseAvailable) {
    console.warn("同步检测: Firebase连接测试失败");
    return { canSync: false, error: 'Firebase服务连接失败，无法同步数据' };
  }
  
  // 检查网络连接状态
  const networkStatus = await getNetworkStatus();
  if (!networkStatus.online) {
    console.warn("同步检测: 网络连接不可用");
    return { canSync: false, error: '网络连接已断开，无法同步数据' };
  }
  
  return { canSync: true, error: null };
};

/**
 * 增量同步函数
 * @param {string} uid 用户ID
 * @returns {Promise<{success: boolean, data?: any, error?: any, unchanged?: boolean}>}
 */
const incrementalSync = async (uid) => {
  try {
    console.log('开始增量同步...');
    
    // 检查同步可用性
    const { canSync, error } = await checkSyncAvailability();
    if (!canSync) {
      console.warn(`增量同步失败: ${error}`);
      return { success: false, error };
    }
    
    if (!uid) {
      console.warn('增量同步失败: 用户未登录');
      return { success: false, error: '用户未登录' };
    }
    
    // 获取上次同步时间
    const lastSyncTime = await getLastSyncTime(uid);
    const now = Date.now();
    console.log(`上次同步时间: ${new Date(lastSyncTime).toLocaleString()}`);
    
    // 获取本地变更数据
    const localChanges = await getLocalChangesSince(lastSyncTime);
    console.log(`本地变更: 收藏=${localChanges.favorites.length}条, 历史=${localChanges.history.length}条`);
    
    // 获取用户文档
    const userRef = doc(db, "users", uid);
    const userDoc = await getDoc(userRef);
    const userData = userDoc.exists() ? userDoc.data() : {};
    
    // 获取云端最后更新时间
    const cloudLastUpdated = userData.lastUpdated || 0;
    console.log(`云端最后更新时间: ${new Date(cloudLastUpdated).toLocaleString()}`);
    
    // 如果本地没有变化且云端没有更新，跳过同步
    if (!localChanges.hasChanges && cloudLastUpdated <= lastSyncTime) {
      console.log('没有变化，跳过同步');
      return { success: true, unchanged: true };
    }
    
    // 获取云端数据
    const cloudFavorites = userData.favorites || [];
    const cloudHistory = userData.history || [];
    console.log(`云端数据: 收藏=${cloudFavorites.length}条, 历史=${cloudHistory.length}条`);
    
    // 合并收藏数据
    const mergedFavorites = mergeFavoritesData(
      cloudFavorites, 
      localChanges.favorites
    );
    
    // 合并历史记录
    const mergedHistory = mergeHistoryData(
      cloudHistory, 
      localChanges.history
    );
    
    // 更新到云端
    if (userDoc.exists()) {
      await updateDoc(userRef, {
        favorites: mergedFavorites,
        history: mergedHistory,
        lastUpdated: now
      });
      console.log('云端数据已更新');
    } else {
      await setDoc(userRef, {
        favorites: mergedFavorites,
        history: mergedHistory,
        lastUpdated: now
      });
      console.log('已创建新的用户文档');
    }
    
    // 保存到本地
    await saveFavorites(mergedFavorites);
    await saveHistory(mergedHistory);
    console.log('本地数据已更新');
    
    // 更新同步时间戳
    await saveLastSyncTime(uid, now);
    console.log(`同步完成，新的同步时间: ${new Date(now).toLocaleString()}`);
    
    return { 
      success: true, 
      favorites: mergedFavorites,
      history: mergedHistory
    };
  } catch (error) {
    console.error('增量同步失败:', error);
    return { success: false, error };
  }
};

/**
 * 合并收藏数据
 * @param {Array} cloudData 云端数据
 * @param {Array} localData 本地数据
 * @returns {Array} 合并后的数据
 */
const mergeFavoritesData = (cloudData, localData) => {
  // 使用Map存储最终结果，键为歌曲ID
  const resultMap = new Map();
  
  // 添加所有云端数据
  cloudData.forEach(item => {
    resultMap.set(item.id, {
      ...item,
      modifiedAt: item.modifiedAt || Date.now() // 确保有修改时间
    });
  });
  
  // 添加本地数据，可能覆盖云端数据
  localData.forEach(item => {
    const existingItem = resultMap.get(item.id);
    
    // 如果本地项目更新，或者不存在于云端，则使用本地项目
    if (!existingItem || !existingItem.modifiedAt || 
        (item.modifiedAt && item.modifiedAt >= existingItem.modifiedAt)) {
      resultMap.set(item.id, {
        ...item,
        modifiedAt: item.modifiedAt || Date.now() // 确保有修改时间
      });
    }
  });
  
  return Array.from(resultMap.values());
};

/**
 * 合并历史记录
 * @param {Array} cloudData 云端数据
 * @param {Array} localData 本地数据
 * @returns {Array} 合并后的数据
 */
const mergeHistoryData = (cloudData, localData) => {
  // 使用Map存储最终结果，键为歌曲ID
  const historyMap = new Map();
  
  // 添加云端历史记录
  cloudData.forEach(item => {
    if (item.song && item.song.id) {
      historyMap.set(item.song.id, item);
    }
  });
  
  // 添加本地历史记录，如果相同歌曲则保留最新的时间戳
  localData.forEach(item => {
    if (item.song && item.song.id) {
      const existingItem = historyMap.get(item.song.id);
      if (!existingItem || item.timestamp > existingItem.timestamp) {
        historyMap.set(item.song.id, item);
      }
    }
  });
  
  // 转换回数组并按时间戳排序（最新的在前）
  return Array.from(historyMap.values())
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, MAX_HISTORY_ITEMS); // 限制为最大数量
};

/**
 * 通用同步函数，根据不同参数执行不同的同步行为
 * @param {string} uid 用户ID
 * @param {string} dataType 数据类型 'favorites' | 'history'
 * @param {string} direction 同步方向 'toCloud' | 'fromCloud' | 'merge'
 * @returns {Promise<{success: boolean, data?: any, error?: any}>}
 */
const syncData = async (uid, dataType, direction) => {
  try {
    console.log(`开始${dataType}同步，方向: ${direction}`);
    
    // 检查同步可用性
    const { canSync, error } = await checkSyncAvailability();
    if (!canSync) {
      console.warn(`${dataType}同步失败: ${error}`);
      return { success: false, error };
    }
    
    if (!uid) {
      console.warn(`${dataType}同步失败: 用户未登录`);
      return { success: false, error: '用户未登录' };
    }

    // 根据数据类型确定使用的函数和字段名
    const isHistory = dataType === 'history';
    const getLocalData = isHistory ? getHistory : getFavorites;
    const saveLocalData = isHistory ? saveHistory : saveFavorites;
    const fieldName = isHistory ? 'history' : 'favorites';
    const errorMsg = isHistory ? '历史记录' : '收藏';

    // 获取本地数据
    const localData = await getLocalData();
    console.log(`已获取本地${errorMsg}数据: ${localData.length}条`);
    
    // 获取用户文档引用
    const userRef = doc(db, "users", uid);
    const now = Date.now();
    
    // 根据同步方向执行不同操作
    if (direction === 'toCloud') {
      // 上传到云端
      const userSnap = await getDoc(userRef);
    
      if (!userSnap.exists()) {
        // 用户文档不存在，创建新文档
        console.log(`创建新的用户文档: ${uid}`);
        await setDoc(userRef, { 
          [fieldName]: localData,
          lastUpdated: now
        });
      } else {
        // 更新现有文档
        console.log(`更新现有用户文档: ${uid}`);
        await updateDoc(userRef, { 
          [fieldName]: localData,
          lastUpdated: now
        });
      }
      
      // 更新同步时间戳
      await saveLastSyncTime(uid, now);
      console.log(`${errorMsg}上传到云端成功`);
      return { success: true };
      
    } else if (direction === 'fromCloud') {
      // 从云端下载
      console.log(`尝试从云端下载${errorMsg}`);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists() || !userDoc.data()[fieldName]) {
        console.warn(`云端${errorMsg}不存在`);
        return { success: false, error: `云端${errorMsg}不存在` };
      }
      
      const cloudData = userDoc.data()[fieldName];
      console.log(`已获取云端${errorMsg}数据: ${cloudData.length}条`);
      
      // 保存到本地
      await saveLocalData(cloudData);
      
      // 更新同步时间戳
      await saveLastSyncTime(uid, now);
      console.log(`${errorMsg}从云端下载成功`);
      
      return { success: true, data: cloudData };
      
    } else if (direction === 'merge') {
      // 使用增量同步进行合并
      return await incrementalSync(uid);
    }
    
    console.warn(`无效的同步方向: ${direction}`);
    return { success: false, error: '无效的同步方向' };
  } catch (error) {
    console.error(`同步${dataType}失败:`, error);
    return { success: false, error };
  }
};

// 将本地收藏同步到云端
export const syncFavoritesToCloud = async (uid) => {
  return syncData(uid, 'favorites', 'toCloud');
};

// 将云端收藏同步到本地
export const syncFavoritesFromCloud = async (uid) => {
  return syncData(uid, 'favorites', 'fromCloud');
};

// 将本地历史记录同步到云端
export const syncHistoryToCloud = async (uid) => {
  return syncData(uid, 'history', 'toCloud');
};

// 将云端历史记录同步到本地
export const syncHistoryFromCloud = async (uid) => {
  return syncData(uid, 'history', 'fromCloud');
};

// 合并本地和云端收藏数据
export const mergeFavorites = async (uid) => {
  return syncData(uid, 'favorites', 'merge');
};

// 合并历史记录数据
export const mergeHistory = async (uid) => {
  return syncData(uid, 'history', 'merge');
};

// 同步器，处理用户登录后的初始化同步
export const initialSync = async (uid) => {
  try {
    console.log("开始初始同步操作");
    
    // 直接调用增量同步
    const result = await incrementalSync(uid);
    
    // 如果没有变化，也算成功
    if (result.unchanged) {
      console.log("初始同步：没有变化需要同步");
      return { 
        success: true,
        favorites: result.favorites,
        history: result.history
      };
    }
    
    console.log(`初始同步${result.success ? '成功' : '失败'}`);
    return result;
  } catch (error) {
    console.error("初始同步失败:", error);
    return { success: false, error };
  }
}; 