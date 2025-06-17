/**
 * 区域检测服务
 * 用于检测用户IP所在区域，并根据区域和网络状态决定应用模式
 */
import { checkFirebaseAvailability } from './firebase';
import { getNetworkStatus, saveNetworkStatus } from './storage';

// IPinfo.io API令牌
const IPINFO_TOKEN = 'f0e3677a212cc4';

// 本地存储键
const STORAGE_KEYS = {
  IP_REGION: 'user_ip_region',       // 用户IP区域 ('CN' 或 'INTERNATIONAL')
  IP_TIMESTAMP: 'user_ip_timestamp', // 上次IP检测时间戳
  APP_MODE: 'app_mode'               // 应用模式
};

// 缓存过期时间 (毫秒)
const CACHE_EXPIRY = {
  CHINA: 60 * 60 * 1000,         // 中国用户: 1小时
  INTERNATIONAL: 4 * 60 * 60 * 1000, // 国际用户: 4小时
};

// 应用模式
export const APP_MODES = {
  FULL: 'full',           // 完整模式: 所有功能可用
  CHINA: 'china',         // 中国模式: 账号功能不可用，其他功能正常
  OFFLINE: 'offline',     // 离线模式: 仅本地缓存功能可用
  LOADING: 'loading',     // 加载中: 正在检测
};

/**
 * 检测用户IP所在区域
 * @returns {Promise<{region: string, isChina: boolean}>} 区域信息
 */
export const detectIpRegion = async () => {
  try {
    console.log("开始检测IP区域...");
    const response = await fetch(`https://ipinfo.io/json?token=${IPINFO_TOKEN}`);
    
    if (!response.ok) {
      throw new Error(`IP检测API响应错误: ${response.status}`);
    }
    
    const data = await response.json();
    const isChina = data.country === 'CN';
    const region = isChina ? 'CN' : 'INTERNATIONAL';
    
    // 存储检测结果和时间戳
    localStorage.setItem(STORAGE_KEYS.IP_REGION, region);
    localStorage.setItem(STORAGE_KEYS.IP_TIMESTAMP, Date.now().toString());
    
    console.log(`IP区域检测结果: ${region} (${isChina ? '中国' : '国际'})`);
    return { region, isChina };
  } catch (error) {
    console.error("IP区域检测失败:", error);
    
    // 尝试使用缓存的结果
    const cachedRegion = localStorage.getItem(STORAGE_KEYS.IP_REGION);
    if (cachedRegion) {
      console.log(`使用缓存的IP区域: ${cachedRegion}`);
      return { 
        region: cachedRegion, 
        isChina: cachedRegion === 'CN' 
      };
    }
    
    // 没有缓存结果，返回错误
    throw new Error("无法检测IP区域，且没有缓存结果");
  }
};

/**
 * 检查是否需要重新检测IP
 * @returns {boolean} 是否需要重新检测
 */
export const shouldCheckIp = () => {
  const now = Date.now();
  const region = localStorage.getItem(STORAGE_KEYS.IP_REGION);
  const timestamp = localStorage.getItem(STORAGE_KEYS.IP_TIMESTAMP);
  
  // 检查缓存是否过期
  if (region && timestamp) {
    const expiryTime = region === 'CN' ? CACHE_EXPIRY.CHINA : CACHE_EXPIRY.INTERNATIONAL;
    return (now - parseInt(timestamp)) > expiryTime;
  }
  
  // 没有缓存，需要检测
  return true;
};

/**
 * 确定应用模式
 * @param {boolean} isOnline 浏览器报告的网络状态
 * @returns {Promise<string>} 应用模式
 */
export const determineAppMode = async (isOnline = navigator.onLine) => {
  try {
    console.log(`确定应用模式，当前网络状态: ${isOnline ? '在线' : '离线'}`);
    
    // 如果浏览器报告离线，直接进入离线模式
    if (!isOnline) {
      console.log('浏览器报告离线，设置为离线模式');
      localStorage.setItem(STORAGE_KEYS.APP_MODE, APP_MODES.OFFLINE);
      return APP_MODES.OFFLINE;
    }
    
    // 检查是否需要重新检测IP
    if (shouldCheckIp()) {
      await detectIpRegion();
    }
    
    // 获取IP区域信息
    const region = localStorage.getItem(STORAGE_KEYS.IP_REGION);
    const isChina = region === 'CN';
    
    console.log(`当前IP区域: ${region || '未知'}`);
    
    // 如果无法获取区域信息，默认进入中国模式
    if (!region) {
      console.log('无法获取区域信息，默认设置为中国模式');
      localStorage.setItem(STORAGE_KEYS.APP_MODE, APP_MODES.CHINA);
      return APP_MODES.CHINA;
    }
    
    // 如果是中国区域，直接进入中国模式
    if (isChina) {
      console.log('检测到中国区域，设置为中国模式');
      localStorage.setItem(STORAGE_KEYS.APP_MODE, APP_MODES.CHINA);
      return APP_MODES.CHINA;
    }
    
    // 如果是国际区域，检查Firebase连接
    try {
      console.log('检测到国际区域，正在检查Firebase连接...');
      const firebaseAvailable = await checkFirebaseAvailability();
      console.log(`Firebase连接状态: ${firebaseAvailable ? '可用' : '不可用'}`);
      
      if (firebaseAvailable) {
        console.log('Firebase可用，设置为完整模式');
        localStorage.setItem(STORAGE_KEYS.APP_MODE, APP_MODES.FULL);
        return APP_MODES.FULL;
      } else {
        console.log('Firebase不可用，设置为中国模式');
        localStorage.setItem(STORAGE_KEYS.APP_MODE, APP_MODES.CHINA);
        return APP_MODES.CHINA;
      }
    } catch (error) {
      console.error("Firebase连接检查失败:", error);
      console.log('Firebase连接检查失败，设置为中国模式');
      localStorage.setItem(STORAGE_KEYS.APP_MODE, APP_MODES.CHINA);
      return APP_MODES.CHINA;
    }
  } catch (error) {
    console.error("确定应用模式失败:", error);
    
    // 错误处理：尝试使用上次的模式
    const lastMode = localStorage.getItem(STORAGE_KEYS.APP_MODE);
    if (lastMode) {
      console.log(`使用上次的应用模式: ${lastMode}`);
      return lastMode;
    }
    
    // 没有上次的模式，根据浏览器网络状态返回
    const defaultMode = navigator.onLine ? APP_MODES.CHINA : APP_MODES.OFFLINE;
    console.log(`没有上次的应用模式，根据网络状态设置为: ${defaultMode}`);
    return defaultMode;
  }
};

/**
 * 处理网络状态变化
 * @param {boolean} isOnline 新的网络状态
 * @returns {Promise<string>} 新的应用模式
 */
export const handleNetworkStatusChange = async (isOnline) => {
  try {
    console.log(`处理网络状态变化: ${isOnline ? '在线' : '离线'}`);
    
    // 更新网络状态存储
    await saveNetworkStatus({ online: isOnline, lastChecked: Date.now() });
    
    // 确定新的应用模式
    const newMode = await determineAppMode(isOnline);
    console.log(`网络状态变化: ${isOnline ? '在线' : '离线'}, 新模式: ${newMode}`);
    
    return newMode;
  } catch (error) {
    console.error("处理网络状态变化失败:", error);
    return localStorage.getItem(STORAGE_KEYS.APP_MODE) || 
           (isOnline ? APP_MODES.CHINA : APP_MODES.OFFLINE);
  }
};

/**
 * 获取当前应用模式
 * @returns {string} 应用模式
 */
export const getCurrentAppMode = () => {
  return localStorage.getItem(STORAGE_KEYS.APP_MODE) || APP_MODES.LOADING;
};

/**
 * 检查是否为中国用户
 * @returns {boolean} 是否为中国用户
 */
export const isChinaUser = () => {
  return localStorage.getItem(STORAGE_KEYS.IP_REGION) === 'CN';
};

/**
 * 初始化区域检测
 * 应在应用启动时调用
 * @returns {Promise<string>} 初始应用模式
 */
export const initRegionDetection = async () => {
  console.log("初始化区域检测...");
  
  try {
    // 确保我们使用最新的网络状态
    const isOnline = navigator.onLine;
    console.log(`浏览器报告的网络状态: ${isOnline ? '在线' : '离线'}`);
    
    // 保存当前网络状态
    await saveNetworkStatus({ online: isOnline, lastChecked: Date.now() });
    
    // 确定初始应用模式
    const initialMode = await determineAppMode(isOnline);
    console.log(`初始应用模式: ${initialMode}`);
    
    return initialMode;
  } catch (error) {
    console.error("初始化区域检测失败:", error);
    
    // 错误处理：尝试使用上次的模式
    const lastMode = localStorage.getItem(STORAGE_KEYS.APP_MODE);
    if (lastMode) {
      console.log(`使用上次的应用模式: ${lastMode}`);
      return lastMode;
    }
    
    // 没有上次的模式，根据浏览器网络状态返回
    const defaultMode = navigator.onLine ? APP_MODES.CHINA : APP_MODES.OFFLINE;
    console.log(`没有上次的应用模式，根据网络状态设置为: ${defaultMode}`);
    return defaultMode;
  }
}; 