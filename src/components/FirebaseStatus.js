import React, { useState, useEffect, useCallback } from 'react';
import { isFirebaseAvailable, checkFirebaseAvailability } from '../services/firebase';
import { getNetworkStatus } from '../services/storage';
import '../styles/FirebaseStatus.css';

const FirebaseStatus = () => {
  const [isAvailable, setIsAvailable] = useState(isFirebaseAvailable);
  const [isNetworkOnline, setIsNetworkOnline] = useState(navigator.onLine);
  const [isChecking, setIsChecking] = useState(false);
  
  // 检查Firebase可用性，完全依赖于网络状态
  const checkAvailability = useCallback(async () => {
    if (isChecking) return;
    
    setIsChecking(true);
    try {
      console.log("开始检查数据库可用性...");
      
      // 先检查网络状态
      const networkStatus = await getNetworkStatus();
      setIsNetworkOnline(networkStatus.online);
      
      // 如果网络离线，数据库也必定不可用
      if (!networkStatus.online) {
        console.log("网络离线，数据库不可用");
        setIsAvailable(false);
        setIsChecking(false);
        return;
      }
      
      // 网络在线的情况下，检查Firebase可用性
      const available = await checkFirebaseAvailability();
      console.log(`数据库可用性检查结果: ${available ? '可用' : '不可用'}`);
      setIsAvailable(available);
    } catch (error) {
      console.error("数据库可用性检查出错:", error);
      setIsAvailable(false);
    } finally {
      setIsChecking(false);
    }
  }, [isChecking]);
  
  // 移除对浏览器原生online/offline事件的重复监听，只在组件挂载时检查一次
  useEffect(() => {
    // 组件挂载时检查一次
    checkAvailability();
  }, [checkAvailability]);
  
  // 监听网络状态变化的事件，通过自定义事件从NetworkStatus组件获取更精确的状态
  useEffect(() => {
    const handleNetworkStatusChange = (event) => {
      const { online } = event.detail;
      setIsNetworkOnline(online);
      
      if (!online) {
        setIsAvailable(false);
      } else {
        // 网络恢复时，延迟检查数据库状态
        setTimeout(() => checkAvailability(), 2000);
      }
    };
    
    // 监听自定义网络状态变化事件
    window.addEventListener('networkStatusChange', handleNetworkStatusChange);
    
    return () => {
      window.removeEventListener('networkStatusChange', handleNetworkStatusChange);
    };
  }, [checkAvailability]);
  
  return (
    <div className={`firebase-status ${isAvailable ? 'available' : 'unavailable'} ${isChecking ? 'checking' : ''}`}>
      <div className="indicator"></div>
      {isAvailable ? '数据库已连接' : '数据库离线'}
    </div>
  );
};

export default FirebaseStatus; 