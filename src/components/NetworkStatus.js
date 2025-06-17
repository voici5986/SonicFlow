import React, { useEffect, useState, useCallback } from 'react';
import '../styles/NetworkStatus.css';
import { saveNetworkStatus, getNetworkStatus } from '../services/storage';

// 网络状态指示器组件
const NetworkStatus = ({ inNavbar = false }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showStatus, setShowStatus] = useState(true); // 默认显示
  const [fadeTimeout, setFadeTimeout] = useState(null);
  
  // 发送网络状态变化的自定义事件
  const dispatchNetworkStatusChange = useCallback((online) => {
    // 创建并分发自定义事件，带有网络状态信息
    const event = new CustomEvent('networkStatusChange', { 
      detail: { online, lastChecked: Date.now() } 
    });
    window.dispatchEvent(event);
    console.log(`已分发网络状态变化事件: ${online ? '在线' : '离线'}`);
  }, []);

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
        const timeout = setTimeout(() => setShowStatus(false), 5000);
        setFadeTimeout(timeout);
      }
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setShowStatus(true);
      saveNetworkStatus({ online: false, lastChecked: Date.now() });
      
      // 分发网络状态变化事件
      dispatchNetworkStatusChange(false);
      
      if (fadeTimeout) clearTimeout(fadeTimeout);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (fadeTimeout) clearTimeout(fadeTimeout);
    };
  }, [isOnline, inNavbar, fadeTimeout, dispatchNetworkStatusChange]);

  // 状态指示器类名
  const statusClassName = `network-status ${isOnline ? 'online' : 'offline'} ${
    showStatus ? 'visible' : 'hidden'
  } ${inNavbar ? 'in-navbar' : ''}`;

  return (
    <div 
      className={statusClassName}
      onMouseEnter={() => setShowStatus(true)}
      onMouseLeave={() => {
        if (isOnline && !inNavbar) {
          if (fadeTimeout) clearTimeout(fadeTimeout);
          const timeout = setTimeout(() => setShowStatus(false), 5000);
          setFadeTimeout(timeout);
        }
      }}
    >
      <div className="status-indicator">
        <span className="status-dot"></span>
        <span className="status-text">
          {isOnline ? '在线' : '离线'}
        </span>
      </div>
    </div>
  );
};

export default NetworkStatus; 