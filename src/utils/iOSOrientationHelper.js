/**
 * iOS专用屏幕方向辅助工具
 * 提供iOS设备上的方向检测和处理功能
 */

/**
 * 检测是否为iOS设备
 * @returns {boolean} 是否为iOS设备
 */
export const isIOS = () => {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
};

/**
 * 检测是否为iOS PWA模式
 * @returns {boolean} 是否为iOS PWA模式
 */
export const isIOSPWA = () => {
  return isIOS() && window.navigator.standalone === true;
};

/**
 * 检测iOS设备的当前方向
 * @returns {string} 'portrait' 或 'landscape'
 */
export const getIOSOrientation = () => {
  if (typeof window === 'undefined') return 'portrait';
  
  // 使用窗口尺寸判断方向
  const orientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
  return orientation;
};

/**
 * 添加iOS方向变化监听器
 * @param {Function} callback 当方向变化时调用的回调函数
 * @returns {Function} 移除监听器的函数
 */
export const addIOSOrientationListener = (callback) => {
  if (typeof window === 'undefined') return () => {};
  
  const handleResize = () => {
    const orientation = getIOSOrientation();
    callback(orientation);
  };
  
  window.addEventListener('resize', handleResize);
  
  // 返回移除监听器的函数
  return () => {
    window.removeEventListener('resize', handleResize);
  };
};

/**
 * 在iOS设备上显示方向提示
 * @param {string} orientation 当前方向
 * @returns {JSX.Element|null} 方向提示组件或null
 */
export const showIOSOrientationPrompt = (orientation) => {
  if (!isIOS() || orientation === 'portrait') {
    return null;
  }
  
  // 返回提示组件
  return {
    type: 'orientation-prompt',
    message: '请旋转设备至竖屏模式以获得最佳体验',
  };
};

/**
 * 应用iOS方向限制
 * 由于iOS不支持JavaScript API锁定方向，此函数主要通过CSS和视觉提示实现
 */
export const applyIOSOrientationLock = () => {
  if (!isIOS()) return;
  
  // 添加iOS专用类到body
  document.body.classList.add('ios-device');
  
  // 如果是PWA模式，添加额外的类
  if (isIOSPWA()) {
    document.body.classList.add('ios-pwa');
  }
  
  // 监听方向变化
  const currentOrientation = getIOSOrientation();
  if (currentOrientation === 'landscape') {
    document.body.classList.add('ios-landscape');
  }
  
  // 添加方向变化监听器
  addIOSOrientationListener((newOrientation) => {
    if (newOrientation === 'landscape') {
      document.body.classList.add('ios-landscape');
    } else {
      document.body.classList.remove('ios-landscape');
    }
  });
};

export default {
  isIOS,
  isIOSPWA,
  getIOSOrientation,
  addIOSOrientationListener,
  showIOSOrientationPrompt,
  applyIOSOrientationLock
}; 