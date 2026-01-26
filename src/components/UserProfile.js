import React, { useState, useEffect, useCallback } from 'react';
import { Button, Card, Image, Spinner, Container, Badge } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { getFavorites, getHistory } from '../services/storage';
import { FaHeart, FaHistory, FaSignOutAlt, FaSync } from 'react-icons/fa';
import FirebaseStatus from './FirebaseStatus';
import ClearDataButton from './ClearDataButton';
import { toast } from 'react-toastify';
import { useSync } from '../contexts/SyncContext';
import { initialSync } from '../services/syncService';
import '../styles/UserProfile.css';

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
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // 渲染同步状态
  const renderSyncStatus = () => {
    const timeString = syncStatus.timestamp ? formatTime(syncStatus.timestamp) : '未同步';
    let statusClass = '';
    let statusText = '';
    
    if (syncStatus.loading) {
      statusClass = 'info';
      statusText = `正在同步: ${syncStatus.message}`;
    } else if (syncStatus.success === true) {
      statusClass = 'success';
      statusText = `同步成功: ${timeString}`;
    } else if (syncStatus.success === false) {
      statusClass = 'danger';
      statusText = `同步失败: ${timeString}`;
    } else {
      statusClass = 'secondary';
      statusText = '未同步';
    }
    
    return (
      <div className="sync-status-container">
        <div className={`sync-status ${statusClass}`}>
          {statusText}
        </div>
      </div>
    );
  };
  
  return (
    <div className="user-profile-container">
      <Container>
        <div className="user-dashboard">
          {/* 1. 用户资料卡片 */}
          <Card className="profile-card">
            <Card.Body>
              <div className="avatar-container">
                {currentUser.photoURL ? (
                  <Image 
                    src={currentUser.photoURL} 
                    roundedCircle 
                    className="user-avatar"
                  />
                ) : (
                  <div className="avatar-initial rounded-circle d-flex justify-content-center align-items-center">
                    {userInitial}
                  </div>
                )}
              </div>
              <div className="user-info">
                <h3 className="user-name">{currentUser.displayName || '用户'}</h3>
                <p className="user-email">{currentUser.email}</p>
                <Button 
                  variant="link" 
                  className="logout-button w-100 mt-2"
                  onClick={handleLogout}
                  style={{
                    backgroundColor: 'var(--color-background)',
                    color: 'var(--color-danger)',
                    borderRadius: 'var(--border-radius)',
                    padding: '0.6rem 1rem',
                    fontWeight: '600',
                    textDecoration: 'none',
                    border: '1px solid var(--color-border)',
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <FaSignOutAlt className="me-2" /> 退出登录
                </Button>
              </div>
            </Card.Body>
          </Card>
          
          {/* 2. 统计卡片 */}
          <Card className="stats-card">
            <Card.Body>
              <div 
                className="stats-item clickable" 
                onClick={() => handleStatsCardClick('favorites')}
              >
                <div className="stats-icon favorites">
                  <FaHeart />
                </div>
                <div className="stats-content">
                  <div className="stats-value">{favoritesCount}</div>
                  <p className="stats-label">收藏的歌曲</p>
                </div>
              </div>
              
              <div 
                className="stats-item clickable" 
                onClick={() => handleStatsCardClick('history')}
              >
                <div className="stats-icon history">
                  <FaHistory />
                </div>
                <div className="stats-content">
                  <div className="stats-value">{historyCount}</div>
                  <p className="stats-label">历史记录</p>
                </div>
              </div>
              
              <ClearDataButton onClick={() => {}} />
            </Card.Body>
          </Card>
          
          {/* 3. 同步卡片 */}
          <Card className="sync-card">
            <Card.Body>
              {/* Firebase状态指示器 */}
              <FirebaseStatus />
              
              {/* 同步状态 */}
              {renderSyncStatus()}
              
              {/* 待同步项信息 */}
              {!syncStatus.loading && pendingChanges.count > 0 && (
                <div className="pending-changes-info mb-2 text-center">
                  <Badge bg="warning" text="dark">
                    {pendingChanges.count}项待同步
                    {pendingChanges.details.favorites > 0 && ` (${pendingChanges.details.favorites}收藏)`}
                    {pendingChanges.details.history > 0 && ` (${pendingChanges.details.history}历史)`}
                  </Badge>
                </div>
              )}
              
              {/* 同步按钮 */}
              <Button 
                variant="link" 
                onClick={handleManualSync}
                disabled={syncStatus.loading}
                className="sync-button w-100"
                style={{
                  backgroundColor: 'var(--color-background)',
                  color: 'var(--color-text-primary)',
                  borderRadius: 'var(--border-radius)',
                  padding: '0.6rem 1rem',
                  fontWeight: '600',
                  textDecoration: 'none',
                  border: '1px solid var(--color-border)',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {syncStatus.loading ? (
                  <Spinner animation="border" size="sm" className="me-2" />
                ) : (
                  <>
                    <FaSync className="me-2" /> 
                    同步数据
                    {pendingChanges.count > 0 && !pendingChanges.loading && !syncStatus.loading && (
                      <Badge className="ms-1" bg="light" text="dark" pill>
                        {pendingChanges.count}
                      </Badge>
                    )}
                  </>
                )}
              </Button>
            </Card.Body>
          </Card>
        </div>
      </Container>
    </div>
  );
};

export default UserProfile; 