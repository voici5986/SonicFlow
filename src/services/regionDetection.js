/**
 * 区域检测服务
 * 用于检测用户IP所在区域，并根据区域和网络状态决定应用模式
 */
import { checkFirebaseAvailability } from './firebase';
import { saveNetworkStatus } from './storage';
import { sendMessageToSW } from '../utils/serviceWorkerRegistration';

// 自定义事件名称
export const APP_EVENTS = {
  MODE_CHANGED: 'app_mode_changed',
  NETWORK_CHANGE: 'networkStatusChange',
};

// IPinfo.io API令牌 - 使用环境变量
const IPINFO_TOKEN = process.env.REACT_APP_IPINFO_TOKEN || 'f0e3677a212cc4';

// 本地存储键
const STORAGE_KEYS = {
  IP_REGION: 'user_ip_region',       // 用户IP区域 ('CN' 或 'INTERNATIONAL')
  IP_TIMESTAMP: 'user_ip_timestamp', // 上次IP检测时间戳
  APP_MODE: 'app_mode',              // 应用模式
  IP_RECORDS: 'ip_records',          // IP记录历史
  NETWORK_CHANGE_TIMESTAMP: 'network_change_timestamp' // 上次网络状态变化时间戳
};

// 检测间隔时间 (毫秒)
const DETECTION_INTERVAL = {
  CHINA_OFFLINE_MODE: 10 * 1000,     // 离线模式: 10秒 (中国模式不自动检测)
  FULL_MODE: 30 * 1000,              // 完整模式: 30秒
  NETWORK_CHANGE: 5 * 1000,          // 网络状态变化: 5秒
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
    
    // 检查API令牌是否设置(开发环境友好提示)
    if (process.env.NODE_ENV === 'development' && !process.env.REACT_APP_IPINFO_TOKEN) {
      console.warn("注意：使用了默认IP检测API令牌，建议在.env文件中设置REACT_APP_IPINFO_TOKEN");
    }
    
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
 * @param {boolean} isRefresh 是否由页面刷新触发
 * @param {boolean} isNetworkChange 是否由网络状态变化触发
 * @returns {boolean} 是否需要重新检测
 */
export const shouldCheckIp = (isRefresh = false, isNetworkChange = false) => {
  const now = Date.now();
  const timestamp = localStorage.getItem(STORAGE_KEYS.IP_TIMESTAMP);
  const currentMode = localStorage.getItem(STORAGE_KEYS.APP_MODE);
  
  // 如果没有时间戳，需要检测
  if (!timestamp) return true;
  
  // 如果是网络状态变化触发，检查距上次网络变化是否超过5秒
  if (isNetworkChange) {
    const lastNetworkChange = localStorage.getItem(STORAGE_KEYS.NETWORK_CHANGE_TIMESTAMP);
    if (!lastNetworkChange || (now - parseInt(lastNetworkChange)) > DETECTION_INTERVAL.NETWORK_CHANGE) {
      // 更新网络变化时间戳
      localStorage.setItem(STORAGE_KEYS.NETWORK_CHANGE_TIMESTAMP, now.toString());
      return true;
    }
    return false;
  }
  
  // 如果是页面刷新触发
  if (isRefresh) {
    // 中国模式下不进行定期自动检测，只在用户手动刷新时检测
    if (currentMode === APP_MODES.CHINA) {
      return true; // 中国模式下手动刷新总是触发检测
    }
    
    // 其他模式（完整模式或离线模式）根据间隔时间决定
    const interval = (currentMode === APP_MODES.FULL) 
      ? DETECTION_INTERVAL.FULL_MODE 
      : DETECTION_INTERVAL.CHINA_OFFLINE_MODE;
    
    // 检查是否已经超过了间隔时间
    return (now - parseInt(timestamp)) > interval;
  }
  
  // 默认不触发检测
  return false;
};

/**
 * 确定应用模式
 * @param {boolean} isOnline 浏览器报告的网络状态
 * @returns {Promise<string>} 应用模式
 */
export const determineAppMode = async (isOnline = navigator.onLine, isRefresh = true, isNetworkChange = false) => {
  try {
    console.log(`确定应用模式，当前网络状态: ${isOnline ? '在线' : '离线'}`);
    
    // 检查是否需要重新检测IP
    if (shouldCheckIp(isRefresh, isNetworkChange)) {
      try {
        // 无论网络状态如何，都尝试检测IP
        await detectIpRegion();
      } catch (error) {
        // IP检测失败逻辑
        console.log('IP检测失败');
        
        // 网络离线且IP检测失败，则进入离线模式
        if (!isOnline) {
          console.log('网络离线且IP检测失败，设置为离线模式');
          setAppMode(APP_MODES.OFFLINE);
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
            // 使用与useFirebaseStatus相同的逻辑检测Firebase可用性
            const firebaseAvailable = await checkFirebaseAvailability();
            
            if (firebaseAvailable) {
              console.log('Firebase连接成功，设置为完整模式');
              setAppMode(APP_MODES.FULL);
              return APP_MODES.FULL;
            } else {
              console.log('Firebase连接失败，设置为中国模式');
              setAppMode(APP_MODES.CHINA);
              return APP_MODES.CHINA;
            }
          } catch (error) {
            console.error('Firebase连接检测出错:', error);
            console.log('Firebase连接检测出错，设置为中国模式');
            setAppMode(APP_MODES.CHINA);
            return APP_MODES.CHINA;
          }
        } else {
          console.log('IP历史记录中无国际IP或无记录，默认设置为中国模式');
          setAppMode(APP_MODES.CHINA);
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
        setAppMode(APP_MODES.OFFLINE);
        return APP_MODES.OFFLINE;
      } else {
        console.log('无法获取区域信息但网络在线，默认设置为中国模式');
        setAppMode(APP_MODES.CHINA);
        return APP_MODES.CHINA;
      }
    }
    
    // 如果是中国区域，直接进入中国模式，不检测Firebase
    if (isChina) {
      console.log('检测到中国区域，设置为中国模式');
      setAppMode(APP_MODES.CHINA);
      return APP_MODES.CHINA;
    }
    
    // 如果是国际区域，检查网络状态
    // 如果网络离线，直接进入完整模式
    if (!isOnline) {
      console.log('检测到国际区域且网络离线，设置为完整模式');
      setAppMode(APP_MODES.FULL);
      return APP_MODES.FULL;
    }
    
    // 网络在线，检查Firebase连接
    // 注意：只有国际IP才检查Firebase
    try {
      console.log('检测到国际区域，正在检查Firebase连接...');
      const firebaseAvailable = await checkFirebaseAvailability();
      console.log(`Firebase连接状态: ${firebaseAvailable ? '可用' : '不可用'}`);
      
      if (firebaseAvailable) {
        console.log('Firebase连接成功，设置为完整模式');
        setAppMode(APP_MODES.FULL);
        return APP_MODES.FULL;
      } else {
        console.log('Firebase连接失败，设置为中国模式');
        setAppMode(APP_MODES.CHINA);
        return APP_MODES.CHINA;
      }
    } catch (error) {
      console.error("Firebase连接检查失败:", error);
      
      // Firebase检测失败，设置为中国模式
      console.log('Firebase连接检查失败，设置为中国模式');
      setAppMode(APP_MODES.CHINA);
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
    
    // 确定新的应用模式，将isNetworkChange设为true
    const newMode = await determineAppMode(isOnline, false, true);
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
 * 设置应用模式并保存到本地存储
 * @param {string} mode 应用模式
 */
export const setAppMode = (mode) => {
  try {
    const previousMode = localStorage.getItem(STORAGE_KEYS.APP_MODE);
    
    // 如果模式没有变化，不做任何事情
    if (previousMode === mode) {
      return;
    }
    
    // 保存新模式到本地存储
    localStorage.setItem(STORAGE_KEYS.APP_MODE, mode);
    console.log(`应用模式已更新: ${previousMode || '未设置'} -> ${mode}`);
    
    // 通知Service Worker应用模式变化
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      sendMessageToSW('APP_MODE_CHANGE', { mode });
      console.log('已通知Service Worker应用模式变化');
    }
    
    // 分发模式变化事件
    const event = new CustomEvent(APP_EVENTS.MODE_CHANGED, {
      detail: { mode, previousMode }
    });
    window.dispatchEvent(event);
    
    // 如果是中国模式，并且不是在特定路径下，重定向到china.html
    if (mode === APP_MODES.CHINA) {
      const currentPath = window.location.pathname;
      // 排除已经在china.html页面的情况和静态资源请求
      if (currentPath !== '/china.html' && 
          !currentPath.match(/\.(js|css|png|jpg|jpeg|svg|gif|json|ico)$/)) {
        console.log('检测到中国模式，重定向到区域限制页面');
        window.location.href = '/china.html';
      }
    }
    
  } catch (error) {
    console.error('设置应用模式失败:', error);
  }
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
    
    // 确定初始应用模式（应用启动算作刷新触发）
    const initialMode = await determineAppMode(isOnline, true, false);
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