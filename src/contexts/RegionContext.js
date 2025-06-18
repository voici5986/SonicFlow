import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  initRegionDetection, 
  APP_MODES, 
  handleNetworkStatusChange, 
  isChinaUser,
  getCurrentAppMode,
  APP_EVENTS
} from '../services/regionDetection';
import useNetworkStatus from '../hooks/useNetworkStatus';

// 创建区域上下文
const RegionContext = createContext();

// 区域提供者组件
export const RegionProvider = ({ children }) => {
  const [appMode, setAppMode] = useState(APP_MODES.LOADING);
  const [isLoading, setIsLoading] = useState(true);
  const [isChina, setIsChina] = useState(false);
  
  // 使用自定义Hook管理网络状态，不显示提示（由App.js处理），但监听变化
  const { isOnline } = useNetworkStatus({
    showToasts: false,
    dispatchEvents: false // 区域上下文内部不需要分发事件
  });
  
  // 初始化区域检测
  useEffect(() => {
    const initRegion = async () => {
      try {
        setIsLoading(true);
        const mode = await initRegionDetection();
        console.log(`RegionContext: 初始化完成，应用模式 = ${mode}`);
        setAppMode(mode);
        setIsChina(isChinaUser());
      } catch (error) {
        console.error("区域初始化失败:", error);
        // 失败时使用默认模式
        const fallbackMode = getCurrentAppMode() || APP_MODES.CHINA;
        console.log(`RegionContext: 初始化失败，使用默认模式 = ${fallbackMode}`);
        setAppMode(fallbackMode);
      } finally {
        setIsLoading(false);
      }
    };
    
    initRegion();
  }, []);

  // 监听应用模式变化事件
  useEffect(() => {
    const handleAppModeChange = (event) => {
      if (event.detail && event.detail.mode) {
        const newMode = event.detail.mode;
        console.log(`RegionContext: 接收到应用模式变化事件 ${newMode}`);
        
        // 强制更新状态，即使值相同
        setAppMode(prevMode => {
          console.log(`RegionContext: 更新模式 ${prevMode} -> ${newMode}`);
          return newMode;
        });
        
        setIsChina(isChinaUser());
      }
    };
    
    console.log(`RegionContext: 添加模式变化事件监听器`);
    window.addEventListener(APP_EVENTS.MODE_CHANGED, handleAppModeChange);
    
    return () => {
      console.log(`RegionContext: 移除模式变化事件监听器`);
      window.removeEventListener(APP_EVENTS.MODE_CHANGED, handleAppModeChange);
    };
  }, []);
  
  // 监听网络状态变化，更新应用模式
  useEffect(() => {
    const updateAppMode = async () => {
      try {
        console.log(`RegionContext: 网络状态变为 ${isOnline ? '在线' : '离线'}, 更新应用模式`);
        await handleNetworkStatusChange(isOnline);
        // 不再设置appMode，由事件监听处理
      } catch (error) {
        console.error("处理网络状态变化失败:", error);
      }
    };
    
    // 当网络状态变化时更新模式
    updateAppMode();
  }, [isOnline]);
  
  // 手动刷新区域检测
  const refreshRegionDetection = async () => {
    try {
      console.log(`RegionContext: 手动刷新区域检测`);
      setIsLoading(true);
      await initRegionDetection();
      // 不再设置appMode，由事件监听处理
      const currentMode = getCurrentAppMode();
      console.log(`RegionContext: 刷新完成，当前模式 = ${currentMode}`);
      return currentMode;
    } catch (error) {
      console.error("手动刷新区域检测失败:", error);
      return appMode;
    } finally {
      setIsLoading(false);
    }
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