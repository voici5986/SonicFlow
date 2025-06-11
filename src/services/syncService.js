import { db } from './firebase';
import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { getFavorites, saveFavorites, getHistory } from './storage';

// 将本地收藏同步到云端
export const syncFavoritesToCloud = async (uid) => {
  try {
    if (!uid) return { success: false, error: '用户未登录' };

    // 获取本地收藏
    const localFavorites = await getFavorites();
    
    // 获取用户文档引用
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      // 用户文档不存在，创建新文档
      await setDoc(userRef, { favorites: localFavorites });
    } else {
      // 更新现有文档
      await updateDoc(userRef, { favorites: localFavorites });
    }
    
    return { success: true };
  } catch (error) {
    console.error("同步收藏到云端失败:", error);
    return { success: false, error };
  }
};

// 将云端收藏同步到本地
export const syncFavoritesFromCloud = async (uid) => {
  try {
    if (!uid) return { success: false, error: '用户未登录' };
    
    // 获取用户文档
    const userDoc = await getDoc(doc(db, "users", uid));
    
    if (!userDoc.exists() || !userDoc.data().favorites) {
      return { success: false, error: '云端数据不存在' };
    }
    
    const cloudFavorites = userDoc.data().favorites;
    
    // 保存到本地
    await saveFavorites(cloudFavorites);
    
    return { success: true, data: cloudFavorites };
  } catch (error) {
    console.error("从云端同步收藏失败:", error);
    return { success: false, error };
  }
};

// 将本地历史记录同步到云端
export const syncHistoryToCloud = async (uid) => {
  try {
    if (!uid) return { success: false, error: '用户未登录' };

    // 获取本地历史记录
    const localHistory = await getHistory();
    
    // 获取用户文档引用
    const userRef = doc(db, "users", uid);
    
    // 更新文档
    await updateDoc(userRef, { history: localHistory });
    
    return { success: true };
  } catch (error) {
    console.error("同步历史记录到云端失败:", error);
    return { success: false, error };
  }
};

// 将云端历史记录同步到本地
export const syncHistoryFromCloud = async (uid) => {
  try {
    if (!uid) return { success: false, error: '用户未登录' };
    
    // 获取用户文档
    const userDoc = await getDoc(doc(db, "users", uid));
    
    if (!userDoc.exists() || !userDoc.data().history) {
      return { success: false, error: '云端历史记录不存在' };
    }
    
    const cloudHistory = userDoc.data().history;
    
    // 保存到本地
    const historyStore = (await import('./storage')).historyStore;
    await historyStore.setItem('items', cloudHistory);
    
    return { success: true, data: cloudHistory };
  } catch (error) {
    console.error("从云端同步历史记录失败:", error);
    return { success: false, error };
  }
};

// 合并本地和云端数据
export const mergeFavorites = async (uid) => {
  try {
    if (!uid) return { success: false, error: '用户未登录' };

    // 获取本地收藏
    const localFavorites = await getFavorites();
    
    // 获取云端收藏
    const userDoc = await getDoc(doc(db, "users", uid));
    
    if (!userDoc.exists()) {
      // 如果云端没有数据，直接上传本地数据
      return await syncFavoritesToCloud(uid);
    }
    
    const cloudFavorites = userDoc.data().favorites || [];
    
    // 合并收藏，确保没有重复
    const mergedFavorites = [...localFavorites];
    
    // 添加云端收藏中本地没有的歌曲
    cloudFavorites.forEach(cloudTrack => {
      if (!localFavorites.some(localTrack => localTrack.id === cloudTrack.id)) {
        mergedFavorites.push(cloudTrack);
      }
    });
    
    // 保存到本地
    await saveFavorites(mergedFavorites);
    
    // 上传到云端
    await updateDoc(doc(db, "users", uid), { favorites: mergedFavorites });
    
    return { success: true, data: mergedFavorites };
  } catch (error) {
    console.error("合并收藏失败:", error);
    return { success: false, error };
  }
};

// 同步器，处理用户登录后的初始化同步
export const initialSync = async (uid) => {
  try {
    if (!uid) return { success: false };
    
    // 合并收藏
    await mergeFavorites(uid);
    
    // 暂时只上传历史记录，不合并
    await syncHistoryToCloud(uid);
    
    return { success: true };
  } catch (error) {
    console.error("初始同步失败:", error);
    return { success: false, error };
  }
}; 