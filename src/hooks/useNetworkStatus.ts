import { useState, useEffect, useCallback } from 'react';
import { getNetworkStatus, saveNetworkStatus } from '../services/storage';
import logger from '../utils/logger.js';
import type { ConnectionType, NetworkStatus } from '../types';

export interface UseNetworkStatusOptions {
  showToasts?: boolean;
  dispatchEvents?: boolean;
}

export interface UseNetworkStatusResult {
  isOnline: boolean;
  lastChecked: number;
  connectionType: ConnectionType;
  checkNetworkStatus: () => Promise<NetworkStatus>;
  dispatchNetworkStatusChange: (online: boolean, typeOverride?: ConnectionType) => void;
}

interface NavigatorConnection extends EventTarget {
  effectiveType?: string;
  type?: string;
  saveData?: boolean;
}

const getNavigatorConnection = (): NavigatorConnection | undefined => {
  const navigatorWithConnection = navigator as Navigator & {
    connection?: NavigatorConnection;
  };
  return navigatorWithConnection.connection;
};

/** 网络状态管理 Hook。 */
const useNetworkStatus = (options: UseNetworkStatusOptions = {}): UseNetworkStatusResult => {
  const { dispatchEvents = true } = options;

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastChecked, setLastChecked] = useState(Date.now());
  const [connectionType, setConnectionType] = useState<ConnectionType>('unknown');

  const dispatchNetworkStatusChange = useCallback(
    (online: boolean, typeOverride?: ConnectionType) => {
      if (!dispatchEvents) return;

      const timestamp = Date.now();
      const type = typeOverride ?? connectionType;
      const event = new CustomEvent('networkStatusChange', {
        detail: { online, lastChecked: timestamp, connectionType: type },
      });
      window.dispatchEvent(event);
      setLastChecked(timestamp);
      logger.log(`[useNetworkStatus] 已分发网络状态变化事件: ${online ? '在线' : '离线'}`);
    },
    [dispatchEvents, connectionType]
  );

  const detectConnectionType = useCallback((): ConnectionType => {
    if (!navigator.onLine) {
      setConnectionType('offline');
      return 'offline';
    }

    const connection = getNavigatorConnection();
    if (connection) {
      const type = connection.effectiveType || connection.type || 'unknown';
      const saveData = connection.saveData || false;

      let connectionQuality: ConnectionType = 'unknown';
      if (type === '4g' || type === 'wifi') {
        connectionQuality = 'fast';
      } else if (type === '3g') {
        connectionQuality = 'medium';
      } else if (type === '2g' || type === 'cellular') {
        connectionQuality = 'slow';
      } else if (saveData) {
        connectionQuality = 'saveData';
      }

      setConnectionType(connectionQuality);
      return connectionQuality;
    }

    setConnectionType('unknown');
    return 'unknown';
  }, []);

  const handleOnline = useCallback(() => {
    logger.log('[useNetworkStatus] 网络已恢复连接');
    setIsOnline(true);

    const type = detectConnectionType();
    const timestamp = Date.now();
    saveNetworkStatus({ online: true, lastChecked: timestamp, connectionType: type });
    setLastChecked(timestamp);
    dispatchNetworkStatusChange(true, type);
  }, [dispatchNetworkStatusChange, detectConnectionType]);

  const handleOffline = useCallback(() => {
    logger.log('[useNetworkStatus] 网络连接已断开');
    setIsOnline(false);
    setConnectionType('offline');

    const timestamp = Date.now();
    saveNetworkStatus({ online: false, lastChecked: timestamp, connectionType: 'offline' });
    setLastChecked(timestamp);
    dispatchNetworkStatusChange(false, 'offline');
  }, [dispatchNetworkStatusChange]);

  const checkNetworkStatus = useCallback(async (): Promise<NetworkStatus> => {
    try {
      const status = (await getNetworkStatus()) as NetworkStatus;
      const online = navigator.onLine;
      const type = detectConnectionType();

      setIsOnline(online);
      setLastChecked(Date.now());

      if (status.online !== online || status.connectionType !== type) {
        const newStatus: NetworkStatus = { online, lastChecked: Date.now(), connectionType: type };
        saveNetworkStatus(newStatus);
        dispatchNetworkStatusChange(online, type);
        return newStatus;
      }

      return status;
    } catch (error) {
      logger.error('[useNetworkStatus] 获取网络状态失败:', error);
      const online = navigator.onLine;
      return { online, lastChecked: Date.now(), connectionType: online ? 'unknown' : 'offline' };
    }
  }, [dispatchNetworkStatusChange, detectConnectionType]);

  useEffect(() => {
    void checkNetworkStatus();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const connection = getNavigatorConnection();
    if (connection) connection.addEventListener('change', detectConnectionType);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection) connection.removeEventListener('change', detectConnectionType);
    };
  }, [handleOnline, handleOffline, checkNetworkStatus, detectConnectionType]);

  return {
    isOnline,
    lastChecked,
    connectionType,
    checkNetworkStatus,
    dispatchNetworkStatusChange,
  };
};

export default useNetworkStatus;
