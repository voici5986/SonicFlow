import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  auth, 
  loginWithEmailAndPassword,
  loginWithGoogle,
  registerWithEmailAndPassword,
  logout,
  sendPasswordReset,
  isFirebaseAvailable,
  checkFirebaseAvailability,
  firebaseInitError
} from '../services/firebase';
import { initialSync } from '../services/syncService';
import { toast } from 'react-toastify';
import { saveSyncStatus, getLocalUser, saveLocalUser, getNetworkStatus } from '../services/storage';

// 创建认证上下文
export const AuthContext = createContext();

// 自定义钩子，方便获取认证上下文
export const useAuth = () => useContext(AuthContext);

// 认证提供者组件
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncComplete, setSyncComplete] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(!isFirebaseAvailable);

  // 检测Firebase可用性
  useEffect(() => {
    const checkFirebase = async () => {
      const available = await checkFirebaseAvailability();
      setIsOfflineMode(!available);
      
      if (!available) {
        // 如果Firebase不可用，尝试从本地获取用户数据
        const localUser = getLocalUser();
        if (localUser) {
          setCurrentUser(localUser);
          toast.info('已切换到离线模式，使用本地账户');
        }
      }
    };
    
    checkFirebase();
  }, []);

  // 注册
  const register = async (email, password, displayName) => {
    // 如果处于离线模式，创建本地用户
    if (isOfflineMode) {
      try {
        // 创建简单的本地用户对象
        const localUser = {
          uid: `local_${Date.now()}`,
          email,
          displayName: displayName || email,
          isAnonymous: false,
          isLocal: true
        };
        
        // 保存本地用户
        saveLocalUser(localUser);
        setCurrentUser(localUser);
        toast.success('离线模式：本地账户创建成功');
        return { success: true, user: localUser };
      } catch (err) {
        toast.error('离线模式：创建本地账户失败');
        return { success: false, error: err };
      }
    }
    
    try {
      const { user, error } = await registerWithEmailAndPassword(email, password, displayName);
      if (error) {
        let errorMessage = '注册失败';
        if (error.code === 'auth/email-already-in-use') {
          errorMessage = '该邮箱已被注册';
        } else if (error.code === 'auth/weak-password') {
          errorMessage = '密码强度太弱';
        } else if (error.code === 'auth/invalid-email') {
          errorMessage = '无效的邮箱地址';
        }
        toast.error(errorMessage);
        return { success: false, error };
      }
      
      toast.success('注册成功！');
      return { success: true, user };
    } catch (err) {
      toast.error('注册过程中发生错误');
      return { success: false, error: err };
    }
  };

  // 邮箱密码登录
  const login = async (email, password) => {
    // 如果处于离线模式，尝试获取本地用户
    if (isOfflineMode) {
      try {
        const localUser = getLocalUser();
        
        // 检查本地用户是否存在且邮箱匹配
        if (localUser && localUser.email === email) {
          // 简单模拟密码检查，实际生产中应使用更安全的方式
          setCurrentUser(localUser);
          toast.success('离线模式：本地账户登录成功');
          return { success: true, user: localUser };
        } else {
          toast.error('离线模式：邮箱或密码错误');
          return { success: false, error: new Error('离线模式：邮箱或密码错误') };
        }
      } catch (err) {
        toast.error('离线模式：登录失败');
        return { success: false, error: err };
      }
    }
    
    try {
      const { user, error } = await loginWithEmailAndPassword(email, password);
      if (error) {
        let errorMessage = '登录失败';
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
          errorMessage = '邮箱或密码错误';
        } else if (error.code === 'auth/too-many-requests') {
          errorMessage = '尝试次数过多，请稍后再试';
        }
        toast.error(errorMessage);
        return { success: false, error };
      }
      
      toast.success('登录成功！');
      return { success: true, user };
    } catch (err) {
      toast.error('登录过程中发生错误');
      return { success: false, error: err };
    }
  };

  // Google登录
  const signInWithGoogle = async () => {
    if (isOfflineMode) {
      toast.error('离线模式：Google登录不可用');
      return { success: false, error: new Error('离线模式：Google登录不可用') };
    }
    
    try {
      const { user, error } = await loginWithGoogle();
      if (error) {
        toast.error('Google登录失败');
        return { success: false, error };
      }
      
      toast.success('登录成功！');
      return { success: true, user };
    } catch (err) {
      toast.error('登录过程中发生错误');
      return { success: false, error: err };
    }
  };

  // 退出登录
  const signOut = async () => {
    // 如果是本地用户，直接清除
    if (currentUser?.isLocal) {
      setCurrentUser(null);
      toast.info('您已退出本地账户');
      return { success: true };
    }
    
    try {
      await logout();
      toast.info('您已退出登录');
      return { success: true };
    } catch (err) {
      toast.error('退出登录失败');
      return { success: false, error: err };
    }
  };

  // 重置密码
  const resetPassword = async (email) => {
    if (isOfflineMode) {
      toast.error('离线模式：重置密码功能不可用');
      return { success: false, error: new Error('离线模式：重置密码功能不可用') };
    }
    
    try {
      const { error } = await sendPasswordReset(email);
      if (error) {
        toast.error('重置密码邮件发送失败');
        return { success: false, error };
      }
      
      toast.success('重置密码邮件已发送，请查收');
      return { success: true };
    } catch (err) {
      toast.error('发送重置密码邮件失败');
      return { success: false, error: err };
    }
  };

  // 监听用户登录状态
  useEffect(() => {
    // 离线模式下不需要监听Firebase身份验证状态
    if (isOfflineMode) {
      setLoading(false);
      return () => {};
    }
    
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      setLoading(false);
      
      // 如果用户登录了，执行数据同步
      if (user) {
        setSyncComplete(false);
        try {
          // 先检查网络和Firebase可用性
          console.log('登录后同步：检查网络和Firebase可用性');
          
          // 检查网络状态
          const networkStatus = await getNetworkStatus();
          if (!networkStatus.online) {
            console.warn('网络离线，跳过登录同步');
            setSyncComplete(true);
            await saveSyncStatus({
              loading: false,
              success: false,
              message: '网络离线，同步已跳过',
              timestamp: new Date()
            }, user.uid);
            return;
          }
          
          // 检查Firebase可用性
          const firebaseAvailable = await checkFirebaseAvailability();
          if (!firebaseAvailable) {
            console.warn('Firebase不可用，跳过登录同步');
            setSyncComplete(true);
            await saveSyncStatus({
              loading: false,
              success: false,
              message: 'Firebase不可用，同步已跳过',
              timestamp: new Date()
            }, user.uid);
            return;
          }
          
          // 更新同步状态为"正在同步"
          await saveSyncStatus({
            loading: true,
            success: null,
            message: '登录后自动同步...',
            timestamp: null
          }, user.uid);
          
          // 添加超时处理
          const syncPromise = initialSync(user.uid);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('同步操作超时')), 30000)
          );
          
          // 使用Promise.race确保同步不会永久挂起
          const result = await Promise.race([syncPromise, timeoutPromise])
            .catch(error => {
              console.error('同步超时或出错:', error);
              return { success: false, error: error.message || '同步超时' };
            });
          
          // 根据结果更新同步状态
          if (result && result.success) {
            await saveSyncStatus({
              loading: false,
              success: true,
              message: '登录同步成功',
              timestamp: new Date()
            }, user.uid);
          setSyncComplete(true);
          } else {
            await saveSyncStatus({
              loading: false,
              success: false,
              message: `登录同步失败: ${result?.error || '未知错误'}`,
              timestamp: new Date()
            }, user.uid);
            toast.error('数据同步失败');
            setSyncComplete(true);
          }
        } catch (error) {
          console.error('数据同步失败', error);
          
          // 确保一定会更新同步错误状态
          try {
            await saveSyncStatus({
              loading: false,
              success: false,
              message: `同步错误: ${error.message || '未知错误'}`,
              timestamp: new Date()
            }, user.uid);
          } catch (e) {
            console.error('更新同步状态失败', e);
          }
          
          toast.error('数据同步失败');
        } finally {
          // 确保设置同步完成状态，即使发生错误
          setSyncComplete(true);
        }
      }
    });
    
    return unsubscribe;
  }, [isOfflineMode]);

  // 导出认证上下文值
  const value = {
    currentUser,
    loading,
    syncComplete,
    isOfflineMode,
    register,
    login,
    signInWithGoogle,
    signOut,
    resetPassword
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}; 