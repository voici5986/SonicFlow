/**
 * 区域检测服务
 * 用于检测用户IP所在区域，并根据区域和网络状态决定应用模式
 */
import { checkFirebaseAvailability } from './firebase';
import { saveNetworkStatus } from './storage';

// IPinfo.io API令牌
const IPINFO_TOKEN = 'f0e3677a212cc4';

// 本地存储键
const STORAGE_KEYS = {
  IP_REGION: 'user_ip_region',       // 用户IP区域 ('CN' 或 'INTERNATIONAL')
  IP_TIMESTAMP: 'user_ip_timestamp', // 上次IP检测时间戳
  APP_MODE: 'app_mode',              // 应用模式
  IP_RECORDS: 'ip_records'           // IP记录历史
};

// 检测间隔时间 (毫秒)
const DETECTION_INTERVAL = {
  CHINA_OFFLINE_MODE: 10 * 1000,     // 中国模式或离线模式: 10秒
  FULL_MODE: 30 * 1000,              // 完整模式: 30秒
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
    
    // 记录IP数据历史
    recordIpData({
      ip: data.ip,
      country: data.country,
      timestamp: Date.now()
    });
    
    console.log(`IP区域检测结果: ${region} (${isChina ? '中国' : '国际'})`);
    return { region, isChina };
  } catch (error) {
    console.error("IP区域检测失败:", error);
    
    // 不再使用缓存的结果，直接抛出错误
    throw new Error("无法检测IP区域");
  }
};

/**
 * 记录IP数据历史，只保留最新3条记录
 * @param {Object} ipData IP数据对象
 */
const recordIpData = (ipData) => {
  try {
    // 获取现有记录
    const recordsJson = localStorage.getItem(STORAGE_KEYS.IP_RECORDS);
    const records = recordsJson ? JSON.parse(recordsJson) : [];
    
    // 添加新记录到头部
    records.unshift(ipData);
    
    // 只保留最新的3条记录
    if (records.length > 3) {
      records.length = 3;
    }
    
    // 保存回本地存储
    localStorage.setItem(STORAGE_KEYS.IP_RECORDS, JSON.stringify(records));
  } catch (error) {
    console.error("记录IP数据失败:", error);
  }
};

/**
 * 检查是否需要重新检测IP
 * @returns {boolean} 是否需要重新检测
 */
export const shouldCheckIp = () => {
  const now = Date.now();
  const timestamp = localStorage.getItem(STORAGE_KEYS.IP_TIMESTAMP);
  const currentMode = localStorage.getItem(STORAGE_KEYS.APP_MODE);
  
  // 如果没有时间戳，需要检测
  if (!timestamp) return true;
  
  // 根据当前模式决定检测间隔
  const interval = (currentMode === APP_MODES.FULL) 
    ? DETECTION_INTERVAL.FULL_MODE 
    : DETECTION_INTERVAL.CHINA_OFFLINE_MODE;
  
  // 检查是否已经超过了间隔时间
  return (now - parseInt(timestamp)) > interval;
};

/**
 * 确定应用模式
 * @param {boolean} isOnline 浏览器报告的网络状态
 * @returns {Promise<string>} 应用模式
 */
export const determineAppMode = async (isOnline = navigator.onLine) => {
  try {
    console.log(`确定应用模式，当前网络状态: ${isOnline ? '在线' : '离线'}`);
    
    // 检查是否需要重新检测IP
    if (shouldCheckIp()) {
      try {
        // 无论网络状态如何，都尝试检测IP
        await detectIpRegion();
      } catch (error) {
        // IP检测失败，如果网络也离线，则进入离线模式
        if (!isOnline) {
          console.log('网络离线且IP检测失败，设置为离线模式');
          localStorage.setItem(STORAGE_KEYS.APP_MODE, APP_MODES.OFFLINE);
          return APP_MODES.OFFLINE;
        }
        
        // 网络在线但IP检测失败，检查IP历史记录
        console.log('IP检测失败但网络在线，检查IP历史记录');
        const ipRecords = getIpRecords();
        
        // 检查是否有国际IP记录
        const hasInternationalIp = ipRecords.some(record => record.country !== 'CN');
        
        if (hasInternationalIp) {
          console.log('IP历史记录中发现国际IP，尝试检测Firebase连接');
          try {
            const firebaseAvailable = await checkFirebaseAvailability();
            
            if (firebaseAvailable) {
              console.log('Firebase连接成功，设置为完整模式');
              localStorage.setItem(STORAGE_KEYS.APP_MODE, APP_MODES.FULL);
              return APP_MODES.FULL;
            } else {
              console.log('Firebase连接失败，设置为中国模式');
              localStorage.setItem(STORAGE_KEYS.APP_MODE, APP_MODES.CHINA);
              return APP_MODES.CHINA;
            }
          } catch (error) {
            console.error('Firebase连接检测出错:', error);
            console.log('Firebase连接检测出错，设置为中国模式');
            localStorage.setItem(STORAGE_KEYS.APP_MODE, APP_MODES.CHINA);
            return APP_MODES.CHINA;
          }
        } else {
          console.log('IP历史记录中无国际IP或无记录，默认设置为中国模式');
          localStorage.setItem(STORAGE_KEYS.APP_MODE, APP_MODES.CHINA);
          return APP_MODES.CHINA;
        }
      }
    }
    
    // 获取IP区域信息
    const region = localStorage.getItem(STORAGE_KEYS.IP_REGION);
    const isChina = region === 'CN';
    
    console.log(`当前IP区域: ${region || '未知'}`);
    
    // 如果无法获取区域信息，根据网络状态决定
    if (!region) {
      if (!isOnline) {
        console.log('无法获取区域信息且网络离线，设置为离线模式');
        localStorage.setItem(STORAGE_KEYS.APP_MODE, APP_MODES.OFFLINE);
        return APP_MODES.OFFLINE;
      } else {
        console.log('无法获取区域信息但网络在线，默认设置为中国模式');
        localStorage.setItem(STORAGE_KEYS.APP_MODE, APP_MODES.CHINA);
        return APP_MODES.CHINA;
      }
    }
    
    // 如果是中国区域，直接进入中国模式，不检测Firebase
    if (isChina) {
      console.log('检测到中国区域，设置为中国模式');
      localStorage.setItem(STORAGE_KEYS.APP_MODE, APP_MODES.CHINA);
      return APP_MODES.CHINA;
    }
    
    // 如果是国际区域，检查Firebase连接
    // 注意：只有国际IP才检查Firebase
    try {
      console.log('检测到国际区域，正在检查Firebase连接...');
      const firebaseAvailable = await checkFirebaseAvailability();
      console.log(`Firebase连接状态: ${firebaseAvailable ? '可用' : '不可用'}`);
      
      // 无论Firebase是否可用，都进入完整模式
      console.log('设置为完整模式');
      localStorage.setItem(STORAGE_KEYS.APP_MODE, APP_MODES.FULL);
      return APP_MODES.FULL;
    } catch (error) {
      console.error("Firebase连接检查失败:", error);
      
      // Firebase检测失败，也进入完整模式
      console.log('Firebase连接检查失败，仍然设置为完整模式');
      localStorage.setItem(STORAGE_KEYS.APP_MODE, APP_MODES.FULL);
      return APP_MODES.FULL;
    }
  } catch (error) {
    console.error("确定应用模式失败:", error);
    
    // 错误处理：尝试使用上次的模式
    const lastMode = localStorage.getItem(STORAGE_KEYS.APP_MODE);
    if (lastMode) {
      console.log(`使用上次的应用模式: ${lastMode}`);
      return lastMode;
    }
    
    // 没有上次的模式，根据网络状态返回
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
    
    // 强制进行IP检测（通过重置时间戳）
    localStorage.removeItem(STORAGE_KEYS.IP_TIMESTAMP);
    
    // 确定新的应用模式
    const newMode = await determineAppMode(isOnline);
    console.log(`网络状态变化: ${isOnline ? '在线' : '离线'}, 新模式: ${newMode}`);
    
    return newMode;
  } catch (error) {
    console.error("处理网络状态变化失败:", error);
    
    // 如果处理失败，且网络离线，进入离线模式
    if (!isOnline) {
      return APP_MODES.OFFLINE;
    }
    
    // 否则尝试使用上次的模式，或默认为中国模式
    return localStorage.getItem(STORAGE_KEYS.APP_MODE) || APP_MODES.CHINA;
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
 * 获取IP记录历史
 * @returns {Array} IP记录历史数组
 */
export const getIpRecords = () => {
  try {
    const records = localStorage.getItem(STORAGE_KEYS.IP_RECORDS);
    return records ? JSON.parse(records) : [];
  } catch (error) {
    console.error("获取IP记录失败:", error);
    return [];
  }
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
    
    // 强制进行IP检测（通过重置时间戳）
    localStorage.removeItem(STORAGE_KEYS.IP_TIMESTAMP);
    
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
    
    // 没有上次的模式，根据网络状态返回
    const defaultMode = navigator.onLine ? APP_MODES.CHINA : APP_MODES.OFFLINE;
    console.log(`没有上次的应用模式，根据网络状态设置为: ${defaultMode}`);
    return defaultMode;
  }
}; 