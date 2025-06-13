/**
 * 屏幕方向管理工具
 * 提供强制竖屏和屏幕方向变化监听功能
 */

/**
 * 检查浏览器是否支持Screen Orientation API
 * @returns {boolean} 是否支持Screen Orientation API
 */
export const isOrientationApiSupported = () => {
  // 检查window对象是否存在（服务器端渲染兼容）
  if (typeof window === 'undefined') return false;
  
  // 使用window.screen而不是直接使用screen全局变量
  return (
    window.screen &&
    window.screen.orientation &&
    typeof window.screen.orientation.lock === 'function' &&
    typeof window.screen.orientation.unlock === 'function'
  );
};

/**
 * 尝试锁定屏幕方向为竖屏
 * @returns {Promise<boolean>} 是否成功锁定
 */
export const lockToPortrait = async () => {
  // 检查是否支持Screen Orientation API
  if (!isOrientationApiSupported()) {
    console.log('当前浏览器不支持Screen Orientation API，无法锁定屏幕方向');
    return false;
  }

  try {
    // 尝试锁定屏幕方向为竖屏
    await window.screen.orientation.lock('portrait');
    console.log('已锁定屏幕方向为竖屏');
    return true;
  } catch (error) {
    console.error('锁定屏幕方向失败:', error);
    return false;
  }
};

/**
 * 解锁屏幕方向
 * @returns {boolean} 是否成功解锁
 */
export const unlockOrientation = () => {
  // 检查是否支持Screen Orientation API
  if (!isOrientationApiSupported()) {
    console.log('当前浏览器不支持Screen Orientation API，无需解锁屏幕方向');
    return false;
  }

  try {
    // 尝试解锁屏幕方向
    window.screen.orientation.unlock();
    console.log('已解锁屏幕方向');
    return true;
  } catch (error) {
    console.error('解锁屏幕方向失败:', error);
    return false;
  }
};

/**
 * 获取当前屏幕方向
 * @returns {string} 屏幕方向 ('portrait', 'landscape' 或 'unknown')
 */
export const getCurrentOrientation = () => {
  // 检查window对象是否存在（服务器端渲染兼容）
  if (typeof window === 'undefined') return 'unknown';
  
  if (isOrientationApiSupported()) {
    // 使用Screen Orientation API获取屏幕方向
    const orientation = window.screen.orientation.type;
    if (orientation.includes('portrait')) {
      return 'portrait';
    } else if (orientation.includes('landscape')) {
      return 'landscape';
    }
  }

  // 回退方案：使用窗口尺寸判断
  if (window.innerHeight > window.innerWidth) {
    return 'portrait';
  } else if (window.innerWidth > window.innerHeight) {
    return 'landscape';
  }

  return 'unknown';
};

/**
 * 添加屏幕方向变化监听器
 * @param {Function} callback 当屏幕方向变化时调用的回调函数
 * @returns {Function} 移除监听器的函数
 */
export const addOrientationChangeListener = (callback) => {
  // 检查window对象是否存在（服务器端渲染兼容）
  if (typeof window === 'undefined') return () => {};
  
  const handleOrientationChange = () => {
    const orientation = getCurrentOrientation();
    callback(orientation);
  };

  if (isOrientationApiSupported()) {
    // 使用Screen Orientation API监听屏幕方向变化
    window.screen.orientation.addEventListener('change', handleOrientationChange);
  } else {
    // 回退方案：使用resize事件监听屏幕方向变化
    window.addEventListener('resize', handleOrientationChange);
  }

  // 返回移除监听器的函数
  return () => {
    if (isOrientationApiSupported()) {
      window.screen.orientation.removeEventListener('change', handleOrientationChange);
    } else {
      window.removeEventListener('resize', handleOrientationChange);
    }
  };
};

// 创建一个命名对象，代替匿名导出
const orientationManager = {
  isOrientationApiSupported,
  lockToPortrait,
  unlockOrientation,
  getCurrentOrientation,
  addOrientationChangeListener
};

export default orientationManager; 