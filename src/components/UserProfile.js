import React, { useState, useEffect, useCallback } from 'react';
import { Spinner } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { getFavorites, getHistory, clearHistory, clearSearchHistory, resetPendingChanges } from '../services/storage';
import { clearSyncTimestamp } from '../services/syncService';
import { clearMemoryCache } from '../services/memoryCache';
import { FaHeart, FaHistory, FaSignOutAlt, FaCloud, FaChevronRight, FaTrashAlt } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useSync } from '../contexts/SyncContext';
import { initialSync } from '../services/syncService';
import '../styles/User.mobile.css';

const UserProfile = ({ onTabChange }) => {
  const { currentUser, signOut } = useAuth();
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [historyCount, setHistoryCount] = useState(0);
  const [syncCooldown, setSyncCooldown] = useState(false);
  
  // 使用同步上下文
  const { 
    pendingChanges, 
    syncStatus, 
    startSync,
    handleSyncComplete,
    updatePendingChanges
  } = useSync();
  
  // 加载收藏和历史记录计数
  const loadCounts = useCallback(async () => {
    const favorites = await getFavorites();
    const history = await getHistory();
    setFavoritesCount(favorites.length);
    setHistoryCount(history.length);
  }, []);

  // 组件挂载时加载数据
  useEffect(() => {
    loadCounts();
    updatePendingChanges();
    
    // 监听同步刷新事件
    const handleDataRefreshed = () => {
      loadCounts();
    };

    // 监听收藏状态变化
    const handleFavoritesChanged = () => {
      loadCounts();
    };
    
    window.addEventListener('sync:data_refreshed', handleDataRefreshed);
    window.addEventListener('favorites_changed', handleFavoritesChanged);
    
    return () => {
      window.removeEventListener('sync:data_refreshed', handleDataRefreshed);
      window.removeEventListener('favorites_changed', handleFavoritesChanged);
    };
  }, [loadCounts, updatePendingChanges]);
  
  // 添加本地数据清除事件监听
  useEffect(() => {
    const handleDataCleared = () => {
      loadCounts();
      updatePendingChanges();
      toast.info('本地数据已更新');
    };
    
    window.addEventListener('local:data_cleared', handleDataCleared);
    
    return () => {
      window.removeEventListener('local:data_cleared', handleDataCleared);
    };
  }, [loadCounts, updatePendingChanges]);
  
  // 处理手动同步
  const handleManualSync = async () => {
    if (!currentUser) return;
    
    // 如果在冷却期，显示提示但不执行同步
    if (syncCooldown) {
      toast.info('请稍后再试，系统正在冷却中');
      return;
    }
    
    // 检查是否在短时间内（1分钟）已经同步过
    if (syncStatus.timestamp) {
      const lastSyncTime = new Date(syncStatus.timestamp).getTime();
      const now = Date.now();
      const timeDiff = now - lastSyncTime;
      
      // 如果在1分钟内已同步，提示并返回
      if (timeDiff < 60000) { // 60000毫秒 = 1分钟
        toast.info('刚刚已同步，无需再次同步');
        return;
      }
    }
    
    // 设置冷却状态
    setSyncCooldown(true);
    
    // 使用setTimeout在8秒后解除冷却状态
    setTimeout(() => {
      setSyncCooldown(false);
    }, 8000); // 8秒冷却期
    
    try {
      // 开始同步
      startSync();
      
      // 执行同步
      const result = await initialSync(currentUser.uid);
      
      // 处理同步结果（事件监听器将会自动更新UI）
      if (!result.success) {
        toast.error(`同步失败: ${result.error || '未知错误'}`);
      }
    } catch (error) {
      console.error('手动同步失败:', error);
      handleSyncComplete(false, `同步错误: ${error.message}`);
      toast.error(`同步错误: ${error.message}`);
    }
  };
  
  // 处理退出登录
  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('退出登录失败:', error);
    }
  };
  
  // 处理收藏和历史记录点击
  const handleStatsCardClick = (tabId) => {
    if (onTabChange) {
      onTabChange(tabId);
    }
  };

  // 处理清除数据
  const handleClearData = async () => {
    if (window.confirm('确定要清除本地缓存数据吗？这将清除播放历史、搜索记录和临时缓存，但保留您的收藏。')) {
      try {
        const operations = [];
        
        // 清除历史记录
        operations.push(clearHistory());
        
        // 清除搜索历史
        operations.push(clearSearchHistory());
        
        // 清除内存缓存
        operations.push(Promise.resolve(clearMemoryCache()));
        
        // 通知Service Worker清理缓存
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'CLEAN_CACHE'
          });
        }
        
        // 清除同步时间戳
        if (currentUser) {
          operations.push(clearSyncTimestamp(currentUser.uid));
        }
        
        // 重置待同步变更计数
        operations.push(resetPendingChanges());
        
        await Promise.all(operations);
        
        toast.success('本地缓存已清除');
        
        // 触发自定义事件
        window.dispatchEvent(new Event('local:data_cleared'));
      } catch (error) {
        console.error('清除缓存失败:', error);
        toast.error('清除缓存失败');
      }
    }
  };
  
  if (!currentUser) {
    return null;
  }
  
  const userInitial = currentUser.displayName ? currentUser.displayName[0].toUpperCase() : 
                     (currentUser.email ? currentUser.email[0].toUpperCase() : '?');
  
  // 格式化时间
  const formatTime = (date) => {
    if (!date) return '';
    if (typeof date === 'string') {
      date = new Date(date);
    }
    return date.toLocaleString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 获取同步状态文本
  const getSyncStatusText = () => {
    if (syncStatus.loading) return '正在同步...';
    if (syncStatus.success === true) return `上次同步 ${formatTime(syncStatus.timestamp)}`;
    if (syncStatus.success === false) return '同步失败';
    return '未同步';
  };
  
  return (
    <div>
      {/* 1. 用户信息头部 */}
      <div className="user-header">
        <div className="avatar-rect">
          {currentUser.photoURL ? (
            <img 
              src={currentUser.photoURL} 
              alt="Avatar"
              className="avatar-image"
            />
          ) : (
            userInitial
          )}
        </div>
        <h3 className="user-name-large">{currentUser.displayName || '用户'}</h3>
        <p className="user-email-text">{currentUser.email}</p>
      </div>
      
      {/* 2. 统计/功能卡片列表 */}
      <div className="card-list">
        {/* 收藏卡片 */}
        <div 
          className="long-card" 
          onClick={() => handleStatsCardClick('favorites')}
        >
          <div className="card-icon" style={{ color: '#EB5757' }}>
              <FaHeart />
            </div>
          <div className="card-label">收藏</div>
          <div className="card-number">{favoritesCount}</div>
          <div className="card-arrow">
            <FaChevronRight />
          </div>
        </div>

        {/* 历史卡片 */}
        <div 
          className="long-card" 
          onClick={() => handleStatsCardClick('history')}
        >
          <div className="card-icon" style={{ color: '#787774' }}>
            <FaHistory />
          </div>
          <div className="card-label">历史</div>
          <div className="card-number">{historyCount}</div>
          <div className="card-arrow">
            <FaChevronRight />
          </div>
        </div>
      </div>
      
      <div className="section-title">设置</div>

      {/* 3. 设置列表 */}
      <div className="settings-list">
        {/* 云端同步 */}
        <div className="setting-card" onClick={handleManualSync}>
          <div className="setting-icon" style={{ color: '#4A90E2' }}>
            <FaCloud />
          </div>
          <div className="setting-text">多端数据同步</div>
          <div className="setting-value" style={{ fontSize: '12px' }}>
             {syncStatus.loading ? (
                <Spinner animation="border" size="sm" />
             ) : (
                getSyncStatusText().replace('上次同步 ', '')
             )}
          </div>
          <div className="setting-arrow">
            <FaChevronRight />
          </div>
        </div>
        
        {/* 清除缓存 */}
        <div className="setting-card" onClick={handleClearData}>
          <div className="setting-icon" style={{ color: 'var(--color-text-muted)' }}>
            <FaTrashAlt />
          </div>
          <div className="setting-text">清除本地缓存</div>
          <div className="setting-arrow">
            <FaChevronRight />
          </div>
        </div>
      </div>

      {/* 4. 退出登录 */}
      <div className="logout-section">
        <button className="logout-button" onClick={handleLogout}>
          <FaSignOutAlt /> 退出登录
        </button>
      </div>
      
      <div className="version">SonicFlow v1.0.0</div>
    </div>
  );
};

export default UserProfile; 