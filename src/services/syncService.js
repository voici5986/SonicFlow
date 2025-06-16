import { db, isFirebaseAvailable, checkFirebaseAvailability } from './firebase';
import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { getFavorites, saveFavorites, getHistory, saveHistory, MAX_HISTORY_ITEMS, getNetworkStatus } from './storage';

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
    
    // 根据同步方向执行不同操作
    if (direction === 'toCloud') {
      // 上传到云端
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      // 用户文档不存在，创建新文档
        console.log(`创建新的用户文档: ${uid}`);
        await setDoc(userRef, { [fieldName]: localData });
    } else {
      // 更新现有文档
        console.log(`更新现有用户文档: ${uid}`);
        await updateDoc(userRef, { [fieldName]: localData });
      }
      
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
      console.log(`${errorMsg}从云端下载成功`);
      
      return { success: true, data: cloudData };
      
    } else if (direction === 'merge') {
      // 双向合并
      // 获取云端数据
      console.log(`尝试合并${errorMsg}数据`);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        // 如果云端没有数据，直接上传本地数据
        console.log(`云端没有${errorMsg}数据，上传本地数据`);
        await setDoc(userRef, { [fieldName]: localData });
        return { success: true, data: localData };
      }
      
      const cloudData = userDoc.data()[fieldName] || [];
      console.log(`已获取云端${errorMsg}数据: ${cloudData.length}条`);
      
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
      
      console.log(`${errorMsg}合并完成，共${mergedData.length}条`);
      
      // 保存到本地
      await saveLocalData(mergedData);
      console.log(`合并后的${errorMsg}已保存到本地`);
      
      // 上传到云端
      await updateDoc(userRef, { [fieldName]: mergedData });
      console.log(`合并后的${errorMsg}已上传到云端`);
      
      return { success: true, data: mergedData };
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
    
    // 检查同步可用性
    const { canSync, error } = await checkSyncAvailability();
    if (!canSync) {
      console.warn(`初始同步失败: ${error}`);
      return { success: false, error };
    }
    
    if (!uid) {
      console.warn("初始同步失败: 用户未登录");
      return { success: false, error: '用户未登录' };
    }
    
    // 合并收藏
    console.log("开始合并收藏数据");
    const favResult = await mergeFavorites(uid);
    
    // 合并历史记录
    console.log("开始合并历史记录数据");
    const histResult = await mergeHistory(uid);
    
    const success = favResult.success && histResult.success;
    console.log(`初始同步${success ? '成功' : '失败'}`);
    
    return { 
      success,
      favorites: favResult.data,
      history: histResult.data
    };
  } catch (error) {
    console.error("初始同步失败:", error);
    return { success: false, error };
  }
}; 