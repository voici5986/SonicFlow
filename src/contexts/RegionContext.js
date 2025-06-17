import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  initRegionDetection, 
  APP_MODES, 
  handleNetworkStatusChange, 
  isChinaUser,
  getCurrentAppMode
} from '../services/regionDetection';

// 创建区域上下文
const RegionContext = createContext();

// 区域提供者组件
export const RegionProvider = ({ children }) => {
  const [appMode, setAppMode] = useState(APP_MODES.LOADING);
  const [isLoading, setIsLoading] = useState(true);
  const [isChina, setIsChina] = useState(false);
  
  // 初始化区域检测
  useEffect(() => {
    const initRegion = async () => {
      try {
        setIsLoading(true);
        const mode = await initRegionDetection();
        setAppMode(mode);
        setIsChina(isChinaUser());
        
        // 发送应用模式变化事件
        dispatchAppModeChangeEvent(mode);
      } catch (error) {
        console.error("区域初始化失败:", error);
        // 失败时使用默认模式
        const fallbackMode = getCurrentAppMode() || APP_MODES.CHINA;
        setAppMode(fallbackMode);
        
        // 发送应用模式变化事件
        dispatchAppModeChangeEvent(fallbackMode);
      } finally {
        setIsLoading(false);
      }
    };
    
    initRegion();
  }, []);
  
  // 监听网络状态变化
  useEffect(() => {
    const handleOnline = async () => {
      try {
        const newMode = await handleNetworkStatusChange(true);
        setAppMode(newMode);
        setIsChina(isChinaUser());
        
        // 发送应用模式变化事件
        dispatchAppModeChangeEvent(newMode);
      } catch (error) {
        console.error("处理在线状态变化失败:", error);
      }
    };
    
    const handleOffline = async () => {
      try {
        const newMode = await handleNetworkStatusChange(false);
        setAppMode(newMode);
        
        // 发送应用模式变化事件
        dispatchAppModeChangeEvent(newMode);
      } catch (error) {
        console.error("处理离线状态变化失败:", error);
      }
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // 发送应用模式变化事件
  const dispatchAppModeChangeEvent = (mode) => {
    const event = new CustomEvent('appModeChange', {
      detail: { mode }
    });
    window.dispatchEvent(event);
  };
  
  // 检查功能是否可用
  const isFeatureAvailable = (feature) => {
    // 所有模式都可用的功能
    const alwaysAvailable = ['search', 'play', 'local_favorites', 'local_history'];
    
    // 仅完整模式可用的功能
    const fullModeOnly = ['account', 'cloud_sync', 'firebase'];
    
    // 非离线模式可用的功能
    const onlineModeOnly = ['search_api'];
    
    if (alwaysAvailable.includes(feature)) {
      return true;
    }
    
    if (fullModeOnly.includes(feature) && appMode === APP_MODES.FULL) {
      return true;
    }
    
    if (onlineModeOnly.includes(feature) && appMode !== APP_MODES.OFFLINE) {
      return true;
    }
    
    return false;
  };
  
  // 手动刷新区域检测
  const refreshRegionDetection = async () => {
    try {
      setIsLoading(true);
      const mode = await initRegionDetection();
      setAppMode(mode);
      setIsChina(isChinaUser());
      
      // 发送应用模式变化事件
      dispatchAppModeChangeEvent(mode);
      
      return mode;
    } catch (error) {
      console.error("手动刷新区域检测失败:", error);
      return appMode;
    } finally {
      setIsLoading(false);
    }
  };
  
  // 上下文值
  const contextValue = {
    appMode,
    isLoading,
    isChina,
    isFeatureAvailable,
    refreshRegionDetection,
    APP_MODES
  };
  
  return (
    <RegionContext.Provider value={contextValue}>
      {children}
    </RegionContext.Provider>
  );
};

// 使用区域上下文的钩子
export const useRegion = () => {
  const context = useContext(RegionContext);
  if (!context) {
    throw new Error('useRegion must be used within a RegionProvider');
  }
  return context;
}; 