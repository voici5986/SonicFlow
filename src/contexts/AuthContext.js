import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  auth, 
  loginWithEmailAndPassword,
  loginWithGoogle,
  registerWithEmailAndPassword,
  logout,
  sendPasswordReset
} from '../services/firebase';
import { initialSync } from '../services/syncService';
import { toast } from 'react-toastify';

// 创建认证上下文
export const AuthContext = createContext();

// 自定义钩子，方便获取认证上下文
export const useAuth = () => useContext(AuthContext);

// 认证提供者组件
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncComplete, setSyncComplete] = useState(false);

  // 注册
  const register = async (email, password, displayName) => {
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
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      setLoading(false);
      
      // 如果用户登录了，执行数据同步
      if (user) {
        setSyncComplete(false);
        try {
          await initialSync(user.uid);
          setSyncComplete(true);
        } catch (error) {
          console.error('数据同步失败', error);
          toast.error('数据同步失败');
        }
      }
    });
    
    return unsubscribe;
  }, []);

  // 导出认证上下文值
  const value = {
    currentUser,
    loading,
    syncComplete,
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