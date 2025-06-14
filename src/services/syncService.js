import { db } from './firebase';
import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { getFavorites, saveFavorites, getHistory, saveHistory, MAX_HISTORY_ITEMS } from './storage';

/**
 * 通用同步函数，根据不同参数执行不同的同步行为
 * @param {string} uid 用户ID
 * @param {string} dataType 数据类型 'favorites' | 'history'
 * @param {string} direction 同步方向 'toCloud' | 'fromCloud' | 'merge'
 * @returns {Promise<{success: boolean, data?: any, error?: any}>}
 */
const syncData = async (uid, dataType, direction) => {
  try {
    if (!uid) return { success: false, error: '用户未登录' };

    // 根据数据类型确定使用的函数和字段名
    const isHistory = dataType === 'history';
    const getLocalData = isHistory ? getHistory : getFavorites;
    const saveLocalData = isHistory ? saveHistory : saveFavorites;
    const fieldName = isHistory ? 'history' : 'favorites';
    const errorMsg = isHistory ? '历史记录' : '收藏';

    // 获取本地数据
    const localData = await getLocalData();
    
    // 获取用户文档引用
    const userRef = doc(db, "users", uid);
    
    // 根据同步方向执行不同操作
    if (direction === 'toCloud') {
      // 上传到云端
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      // 用户文档不存在，创建新文档
        await setDoc(userRef, { [fieldName]: localData });
    } else {
      // 更新现有文档
        await updateDoc(userRef, { [fieldName]: localData });
      }
      
      return { success: true };
      
    } else if (direction === 'fromCloud') {
      // 从云端下载
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists() || !userDoc.data()[fieldName]) {
        return { success: false, error: `云端${errorMsg}不存在` };
      }
      
      const cloudData = userDoc.data()[fieldName];
      
      // 保存到本地
      await saveLocalData(cloudData);
      
      return { success: true, data: cloudData };
      
    } else if (direction === 'merge') {
      // 双向合并
      // 获取云端数据
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        // 如果云端没有数据，直接上传本地数据
        await setDoc(userRef, { [fieldName]: localData });
        return { success: true, data: localData };
      }
      
      const cloudData = userDoc.data()[fieldName] || [];
      
      // 根据数据类型执行不同的合并策略
      let mergedData;
      
      if (isHistory) {
        // 历史记录合并策略 - 使用 Map 保留最新的时间戳
        const historyMap = new Map();
        
        // 先添加本地历史记录
        localData.forEach(item => {
          historyMap.set(item.song.id, item);
        });
        
        // 添加云端历史记录，如果相同歌曲则保留最新的时间戳
        cloudData.forEach(item => {
          const existingItem = historyMap.get(item.song.id);
          if (!existingItem || item.timestamp > existingItem.timestamp) {
            historyMap.set(item.song.id, item);
          }
        });
        
        // 转换回数组并按时间戳排序（最新的在前）
        mergedData = Array.from(historyMap.values())
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, MAX_HISTORY_ITEMS); // 限制为最大数量
      } else {
        // 收藏合并策略 - 添加不重复的收藏
        mergedData = [...localData];
        
        // 添加云端收藏中本地没有的歌曲
        cloudData.forEach(cloudTrack => {
          if (!localData.some(localTrack => localTrack.id === cloudTrack.id)) {
            mergedData.push(cloudTrack);
    }
        });
      }
      
      // 保存到本地
      await saveLocalData(mergedData);
      
      // 上传到云端
      await updateDoc(userRef, { [fieldName]: mergedData });
      
      return { success: true, data: mergedData };
    }
    
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
    if (!uid) return { success: false };
    
    // 合并收藏
    const favResult = await mergeFavorites(uid);
    
    // 合并历史记录
    const histResult = await mergeHistory(uid);
    
    return { 
      success: favResult.success && histResult.success,
      favorites: favResult.data,
      history: histResult.data
    };
  } catch (error) {
    console.error("初始同步失败:", error);
    return { success: false, error };
  }
}; 