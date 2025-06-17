import React, { useState, useEffect } from 'react';
import '../styles/NetworkStatus.css';
import useNetworkStatus from '../hooks/useNetworkStatus';

// 网络状态指示器组件
const NetworkStatus = ({ inNavbar = false }) => {
  const { isOnline } = useNetworkStatus({
    dispatchEvents: true, // 确保继续分发网络状态事件，供其他组件使用
    showToasts: false // 不在这里显示提示，由App.js负责
  });
  
  const [showStatus, setShowStatus] = useState(true); // 默认显示
  const [fadeTimeout, setFadeTimeout] = useState(null);

  useEffect(() => {
    // 组件挂载时显示状态
    setShowStatus(true);
    
    // 设置初始显示的自动隐藏，仅当不在导航栏中时
    if (!inNavbar && isOnline) { // 只有在在线状态下才自动隐藏
      const timeout = setTimeout(() => setShowStatus(false), 5000);
      setFadeTimeout(timeout);
      
      return () => {
        if (timeout) clearTimeout(timeout);
      };
    }
  }, [inNavbar, isOnline]);
  
  // 监听网络状态变化，更新UI
  useEffect(() => {
    // 当网络状态变为在线，且不在导航栏中，设置自动隐藏
    if (isOnline && !inNavbar) {
      setShowStatus(true); // 先显示
      
      // 清除现有计时器
      if (fadeTimeout) clearTimeout(fadeTimeout);
      
      // 设置新计时器
      const timeout = setTimeout(() => setShowStatus(false), 5000);
      setFadeTimeout(timeout);
      
      return () => {
        if (timeout) clearTimeout(timeout);
      };
    } else if (!isOnline) {
      // 离线状态始终显示
      setShowStatus(true);
      
      // 清除现有计时器
      if (fadeTimeout) {
        clearTimeout(fadeTimeout);
        setFadeTimeout(null);
      }
    }
  }, [isOnline, inNavbar, fadeTimeout]);

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