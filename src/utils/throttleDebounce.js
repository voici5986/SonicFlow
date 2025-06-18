import { useCallback, useRef, useState, useEffect } from 'react';

/**
 * 防抖Hook - 将多次触发的事件合并为一次，并在指定时间后执行
 * @param {Function} callback 回调函数
 * @param {number} delay 延迟时间(毫秒)
 * @returns {Function} 防抖处理后的函数
 */
export const useDebounce = (callback, delay = 300) => {
  const timerRef = useRef(null);
  
  return useCallback((...args) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    
    timerRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);
};

/**
 * 节流Hook - 在指定时间内，只执行一次函数调用
 * @param {Function} callback 回调函数
 * @param {number} delay 延迟时间(毫秒)
 * @returns {Function} 节流处理后的函数
 */
export const useThrottle = (callback, delay = 500) => {
  const lastCall = useRef(0);
  
  return useCallback((...args) => {
    const now = new Date().getTime();
    if (now - lastCall.current >= delay) {
      lastCall.current = now;
      callback(...args);
    }
  }, [callback, delay]);
};

/**
 * 防抖值Hook - 对状态值进行防抖处理
 * @param {any} value 原始值
 * @param {number} delay 延迟时间(毫秒)
 * @returns {any} 防抖处理后的值
 */
export const useDebouncedValue = (value, delay = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);
  
  return debouncedValue;
};

/**
 * 防抖函数 - 普通函数版本，用于非Hook环境
 * @param {Function} func 要防抖的函数
 * @param {number} wait 等待时间(毫秒)
 * @returns {Function} 防抖处理后的函数
 */
export const debounce = (func, wait = 300) => {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * 节流函数 - 普通函数版本，用于非Hook环境
 * @param {Function} func 要节流的函数
 * @param {number} limit 限制时间(毫秒)
 * @returns {Function} 节流处理后的函数
 */
export const throttle = (func, limit = 500) => {
  let inThrottle;
  
  return function(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}; 