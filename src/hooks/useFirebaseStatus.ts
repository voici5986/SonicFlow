import { useState, useEffect, useCallback } from 'react';
import {
  isFirebaseAvailable as getFirebaseAvailability,
  checkFirebaseAvailability,
} from '../services/firebase';
import useNetworkStatus from './useNetworkStatus';
import { toast } from 'react-toastify';
import logger from '../utils/logger';

export interface UseFirebaseStatusOptions {
  showToasts?: boolean;
  manualCheck?: boolean;
}

export interface UseFirebaseStatusResult {
  isAvailable: boolean;
  isChecking: boolean;
  lastChecked: number;
  checkAvailability: (force?: boolean) => Promise<boolean>;
}

/** Firebase 可用性状态管理 Hook。 */
const useFirebaseStatus = (options: UseFirebaseStatusOptions = {}): UseFirebaseStatusResult => {
  const { showToasts = false, manualCheck = false } = options;
  const { isOnline } = useNetworkStatus({ showToasts: false });

  const [isAvailable, setIsAvailable] = useState<boolean>(() => Boolean(getFirebaseAvailability));
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState(Date.now());

  const dispatchFirebaseStatusChange = useCallback((available: boolean) => {
    const event = new CustomEvent('firebaseStatusChange', {
      detail: { available, lastChecked: Date.now() },
    });
    window.dispatchEvent(event);
    logger.log(`[useFirebaseStatus] 已分发Firebase状态变化事件: ${available ? '可用' : '不可用'}`);
  }, []);

  const checkAvailability = useCallback(
    async (force = false): Promise<boolean> => {
      if (isChecking && !force) return isAvailable;

      if (!isOnline) {
        logger.log('[useFirebaseStatus] 网络离线，Firebase不可用');
        setIsAvailable(false);
        setLastChecked(Date.now());
        return false;
      }

      setIsChecking(true);
      try {
        logger.log('[useFirebaseStatus] 开始检查Firebase可用性...');
        const available = Boolean(await checkFirebaseAvailability());

        if (available !== isAvailable) {
          logger.log(`[useFirebaseStatus] Firebase可用性变化: ${available ? '可用' : '不可用'}`);
          setIsAvailable(available);

          if (showToasts) {
            if (available) {
              toast.success('数据库连接已恢复');
            } else {
              toast.error('数据库连接已断开，部分功能可能受限');
            }
          }

          dispatchFirebaseStatusChange(available);
        } else {
          logger.log(`[useFirebaseStatus] Firebase可用性未变化: ${available ? '可用' : '不可用'}`);
        }

        setLastChecked(Date.now());
        return available;
      } catch (error) {
        logger.error('[useFirebaseStatus] Firebase可用性检查失败:', error);

        if (isAvailable) {
          setIsAvailable(false);
          if (showToasts) toast.error('数据库连接出现问题，部分功能可能受限');
          dispatchFirebaseStatusChange(false);
        }

        setLastChecked(Date.now());
        return false;
      } finally {
        setIsChecking(false);
      }
    },
    [isOnline, isAvailable, isChecking, showToasts, dispatchFirebaseStatusChange]
  );

  useEffect(() => {
    if (manualCheck) return;

    if (isOnline) {
      const timer = setTimeout(() => {
        void checkAvailability();
      }, 2000);

      return () => clearTimeout(timer);
    }

    if (isAvailable) {
      setIsAvailable(false);
      setLastChecked(Date.now());

      if (showToasts) toast.error('网络已断开，数据库连接不可用');
      dispatchFirebaseStatusChange(false);
    }
  }, [
    isOnline,
    isAvailable,
    checkAvailability,
    showToasts,
    manualCheck,
    dispatchFirebaseStatusChange,
  ]);

  useEffect(() => {
    if (!manualCheck) void checkAvailability();
  }, [checkAvailability, manualCheck]);

  return { isAvailable, isChecking, lastChecked, checkAvailability };
};

export default useFirebaseStatus;
