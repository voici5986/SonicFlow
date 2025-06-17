import { useState, useEffect, useCallback } from 'react';
import { getNetworkStatus, saveNetworkStatus } from '../services/storage';
import { toast } from 'react-toastify';

/**
 * 网络状态管理Hook
 * 
 * @param {Object} options 配置选项
 * @param {boolean} options.showToasts 是否显示网络状态变化的提示
 * @param {boolean} options.dispatchEvents 是否分发自定义事件
 * @returns {Object} 网络状态相关数据和方法
 */
export const useNetworkStatus = (options = {}) => {
  const { 
    showToasts = false, 
    dispatchEvents = true 
  } = options;
  
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastChecked, setLastChecked] = useState(Date.now());
  
  // 发送网络状态变化的自定义事件
  const dispatchNetworkStatusChange = useCallback((online) => {
    if (!dispatchEvents) return;
    
    // 创建并分发自定义事件，带有网络状态信息
    const timestamp = Date.now();
    const event = new CustomEvent('networkStatusChange', { 
      detail: { online, lastChecked: timestamp } 
    });
    window.dispatchEvent(event);
    setLastChecked(timestamp);
    console.log(`[useNetworkStatus] 已分发网络状态变化事件: ${online ? '在线' : '离线'}`);
  }, [dispatchEvents]);

  // 处理网络在线事件
  const handleOnline = useCallback(() => {
    console.log('[useNetworkStatus] 网络已恢复连接');
    setIsOnline(true);
    
    // 保存到本地存储
    const timestamp = Date.now();
    saveNetworkStatus({ online: true, lastChecked: timestamp });
    setLastChecked(timestamp);
    
    // 分发网络状态变化事件
    dispatchNetworkStatusChange(true);
    
    // 显示提示
    if (showToasts) {
      toast.success('网络已恢复连接');
    }
  }, [showToasts, dispatchNetworkStatusChange]);
  
  // 处理网络离线事件
  const handleOffline = useCallback(() => {
    console.log('[useNetworkStatus] 网络连接已断开');
    setIsOnline(false);
    
    // 保存到本地存储
    const timestamp = Date.now();
    saveNetworkStatus({ online: false, lastChecked: timestamp });
    setLastChecked(timestamp);
    
    // 分发网络状态变化事件
    dispatchNetworkStatusChange(false);
    
    // 显示提示
    if (showToasts) {
      toast.error('网络连接已断开，部分功能可能受限');
    }
  }, [showToasts, dispatchNetworkStatusChange]);
  
  // 手动检查网络状态
  const checkNetworkStatus = useCallback(async () => {
    try {
      const status = await getNetworkStatus();
      
      // 只有当状态与当前不同时才更新
      if (status.online !== isOnline) {
        setIsOnline(status.online);
        setLastChecked(status.lastChecked || Date.now());
        
        // 分发网络状态变化事件
        dispatchNetworkStatusChange(status.online);
      }
      
      return status;
    } catch (error) {
      console.error('[useNetworkStatus] 获取网络状态失败:', error);
      return { online: navigator.onLine, lastChecked: Date.now() };
    }
  }, [isOnline, dispatchNetworkStatusChange]);

  // 初始化网络状态并添加事件监听
  useEffect(() => {
    // 初始化时从存储中加载网络状态
    const initNetworkStatus = async () => {
      await checkNetworkStatus();
    };
    
    initNetworkStatus();
    
    // 添加浏览器网络事件监听
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // 组件卸载时清理
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline, checkNetworkStatus]);

  return {
    isOnline,
    lastChecked,
    checkNetworkStatus,
    dispatchNetworkStatusChange
  };
};

export default useNetworkStatus; 