import React, { useEffect, useState, useCallback } from 'react';
import '../styles/NetworkStatus.css';
import { saveNetworkStatus, getNetworkStatus } from '../services/storage';

// 修改为导航栏内的网络状态指示器
const NetworkStatus = ({ inNavbar = false }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showStatus, setShowStatus] = useState(true); // 默认显示
  const [fadeTimeout, setFadeTimeout] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [checkInterval, setCheckInterval] = useState(null);
  
  // 检测频率配置（毫秒）
  const CHECK_INTERVAL_ONLINE = 60000; // 在线时每60秒检测一次
  const CHECK_INTERVAL_OFFLINE = 15000; // 离线时每15秒检测一次
  
  // 发送网络状态变化的自定义事件
  const dispatchNetworkStatusChange = useCallback((online) => {
    // 创建并分发自定义事件，带有网络状态信息
    const event = new CustomEvent('networkStatusChange', { 
      detail: { online, lastChecked: Date.now() } 
    });
    window.dispatchEvent(event);
    console.log(`已分发网络状态变化事件: ${online ? '在线' : '离线'}`);
  }, []);
  
  // 使用useCallback包装checkNetworkStatus函数，以便在useEffect中安全使用
  const checkNetworkStatus = useCallback(async (showResult = false) => {
    if (isChecking) return;
    
    setIsChecking(true);
    
    try {
      console.log("开始检查网络状态...");
      // 使用fetch请求应用程序的一个资源来测试连接
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('请求超时')), 5000)
      );
      
      const fetchPromise = fetch('/favicon.ico', { 
        method: 'HEAD',
        cache: 'no-store',
        credentials: 'omit',
        mode: 'no-cors'
      });
      
      await Promise.race([fetchPromise, timeoutPromise]);
      
      // 如果请求成功，认为网络在线
      const newStatus = true;
      console.log("网络检查成功，网络在线");
      
      // 如果状态发生变化或需要显示结果，更新状态并显示通知
      if (newStatus !== isOnline || showResult) {
        setIsOnline(newStatus);
        setShowStatus(true);
        await saveNetworkStatus({ online: newStatus, lastChecked: Date.now() });
        
        // 设置隐藏网络状态的定时器，仅当不在导航栏中时
        if (!inNavbar) {
          if (fadeTimeout) clearTimeout(fadeTimeout);
          const timeout = setTimeout(() => setShowStatus(false), 5000); // 增加显示时间到5秒
          setFadeTimeout(timeout);
        }
        
        // 分发网络状态变化事件
        dispatchNetworkStatusChange(newStatus);
        
        // 更新检测频率为在线状态的频率
        updateCheckInterval(true);
        
        if (showResult) {
          console.log("网络连接正常");
        }
      }
    } catch (error) {
      console.error('网络检查失败:', error);
      
      // 请求失败，认为网络离线
      const newStatus = false;
      
      // 更新状态并显示通知
      if (newStatus !== isOnline || showResult) {
        setIsOnline(newStatus);
        setShowStatus(true);
        await saveNetworkStatus({ online: newStatus, lastChecked: Date.now() });
        
        // 离线状态不自动隐藏
        if (fadeTimeout) clearTimeout(fadeTimeout);
        
        // 分发网络状态变化事件
        dispatchNetworkStatusChange(newStatus);
        
        // 更新检测频率为离线状态的频率
        updateCheckInterval(false);
        
        if (showResult) {
          console.log("网络连接失败");
        }
      }
    } finally {
      setIsChecking(false);
    }
  }, [isChecking, isOnline, fadeTimeout, inNavbar, dispatchNetworkStatusChange]);

  // 更新检测频率
  const updateCheckInterval = useCallback((online) => {
    // 清除现有的定时器
    if (checkInterval) {
      clearInterval(checkInterval);
    }
    
    // 根据网络状态设置新的检测频率
    const intervalTime = online ? CHECK_INTERVAL_ONLINE : CHECK_INTERVAL_OFFLINE;
    const newInterval = setInterval(() => checkNetworkStatus(), intervalTime);
    setCheckInterval(newInterval);
    
    console.log(`已调整网络检测频率: ${online ? '60秒/次' : '15秒/次'}`);
  }, [checkInterval, checkNetworkStatus]);

  // 重试连接
  const handleRetry = () => {
    if (!isChecking) {
      checkNetworkStatus(true);
    }
  };

  // 初始化加载存储的网络状态
  useEffect(() => {
    const loadNetworkStatus = async () => {
      const status = await getNetworkStatus();
      
      // 只有当状态真的变化时才更新和分发事件
      if (status.online !== isOnline) {
        setIsOnline(status.online);
        dispatchNetworkStatusChange(status.online);
      }
      
      setShowStatus(true); // 组件挂载时显示状态
      
      // 设置初始显示的自动隐藏，仅当不在导航栏中时
      if (!inNavbar && status.online) { // 只有在在线状态下才自动隐藏
        const timeout = setTimeout(() => setShowStatus(false), 5000);
        setFadeTimeout(timeout);
      }
      
      // 如果上次检查是10分钟前，立即重新检查
      const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
      if (!status.lastChecked || status.lastChecked < tenMinutesAgo) {
        checkNetworkStatus();
      }
      
      // 根据当前状态设置检测频率
      updateCheckInterval(status.online);
    };
    
    loadNetworkStatus();
    
    // 添加在线/离线事件监听
    const handleOnline = () => {
      setIsOnline(true);
      setShowStatus(true);
      saveNetworkStatus({ online: true, lastChecked: Date.now() });
      
      // 分发网络状态变化事件
      dispatchNetworkStatusChange(true);
      
      // 仅当不在导航栏中时设置自动隐藏
      if (!inNavbar) {
        if (fadeTimeout) clearTimeout(fadeTimeout);
        const timeout = setTimeout(() => setShowStatus(false), 5000); // 增加显示时间到5秒
        setFadeTimeout(timeout);
      }
      
      // 更新检测频率
      updateCheckInterval(true);
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setShowStatus(true);
      saveNetworkStatus({ online: false, lastChecked: Date.now() });
      
      // 分发网络状态变化事件
      dispatchNetworkStatusChange(false);
      
      if (fadeTimeout) clearTimeout(fadeTimeout);
      
      // 更新检测频率
      updateCheckInterval(false);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // 立即检查网络状态
    checkNetworkStatus();
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (checkInterval) clearInterval(checkInterval);
      if (fadeTimeout) clearTimeout(fadeTimeout);
    };
  }, [fadeTimeout, checkNetworkStatus, inNavbar, isOnline, dispatchNetworkStatusChange, updateCheckInterval]);

  // 如果是在导航栏中，使用不同的样式
  if (inNavbar) {
    // 只在离线状态下显示
    if (!isOnline) {
      return (
        <div className="network-status-navbar offline">
          <div className="indicator"></div>
          网络离线
        </div>
      );
    }
    // 在线状态下不显示内容
    return null;
  }

  // 默认浮窗样式
  return (
    <div 
      className={`network-status ${isOnline ? 'online' : 'offline'} ${showStatus ? 'show' : ''}`}
    >
      <div className="indicator"></div>
      {isOnline ? '网络已连接' : '网络连接已断开'}
      {!isOnline && (
        <button 
          className="retry-btn" 
          onClick={handleRetry}
          disabled={isChecking}
        >
          {isChecking ? '检测中...' : '重试'}
        </button>
      )}
    </div>
  );
};

export default NetworkStatus; 