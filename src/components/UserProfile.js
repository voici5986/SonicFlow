import React, { useState, useEffect } from 'react';
import { Button, Card, Image, Spinner, Container } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { getFavorites, getHistory, getSyncStatus, saveSyncStatus } from '../services/storage';
import { FaHeart, FaHistory, FaSignOutAlt, FaSync, FaGlobe, FaGlobeAsia, FaExclamationTriangle, FaWifi } from 'react-icons/fa';
import FirebaseStatus from './FirebaseStatus';
import { useRegion } from '../contexts/RegionContext';
import '../styles/UserProfile.css';

const UserProfile = ({ onTabChange }) => {
  const { currentUser, signOut } = useAuth();
  const { appMode, refreshRegionDetection, APP_MODES, isLoading } = useRegion();
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [historyCount, setHistoryCount] = useState(0);
  const [syncStatus, setSyncStatus] = useState({ 
    loading: false, 
    success: null, 
    message: '', 
    timestamp: null 
  });
  
  // 获取模式图标
  const getModeIcon = () => {
    switch (appMode) {
      case APP_MODES.FULL:
        return <FaGlobe className="mode-icon full" />;
      case APP_MODES.CHINA:
        return <FaGlobeAsia className="mode-icon china" />;
      case APP_MODES.OFFLINE:
        return <FaExclamationTriangle className="mode-icon offline" />;
      default:
        return <FaWifi className="mode-icon loading pulse" />;
    }
  };
  
  // 获取模式名称
  const getModeName = () => {
    switch (appMode) {
      case APP_MODES.FULL:
        return '完整模式';
      case APP_MODES.CHINA:
        return '中国模式';
      case APP_MODES.OFFLINE:
        return '离线模式';
      default:
        return '加载中...';
    }
  };
  
  // 加载同步状态
  const loadSyncStatus = async () => {
    if (currentUser) {
      const savedStatus = await getSyncStatus(currentUser.uid);
      setSyncStatus(savedStatus);
    }
  };
  
  useEffect(() => {
    loadCounts();
    loadSyncStatus();
  }, [currentUser]); // 添加currentUser作为依赖
  
  // 更新同步状态并保存到缓存
  const updateSyncStatus = async (newStatus) => {
    setSyncStatus(newStatus);
    if (currentUser) {
      await saveSyncStatus(newStatus, currentUser.uid);
    }
  };
  
  const loadCounts = async () => {
    const favorites = await getFavorites();
    const history = await getHistory();
    setFavoritesCount(favorites.length);
    setHistoryCount(history.length);
  };
  
  const handleManualSync = async () => {
    if (!currentUser) return;
    
    await updateSyncStatus({ loading: true, success: null, message: '正在数据同步...', timestamp: null });
    
    try {
      const { initialSync } = await import('../services/syncService');
      const result = await initialSync(currentUser.uid);
      
      if (result.success) {
        await updateSyncStatus({ 
          loading: false, 
          success: true, 
          message: '数据同步成功', 
          timestamp: new Date() 
        });
        loadCounts(); // 更新计数
      } else {
        await updateSyncStatus({ 
          loading: false, 
          success: false, 
          message: `同步失败: ${result.error || '未知错误'}`, 
          timestamp: new Date() 
        });
      }
    } catch (error) {
      await updateSyncStatus({ 
        loading: false, 
        success: false, 
        message: `同步错误: ${error.message}`, 
        timestamp: new Date() 
      });
    }
  };
  
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
                  variant="outline-danger" 
                  className="logout-button w-100 mt-2"
                  onClick={handleLogout}
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
            </Card.Body>
          </Card>
          
          {/* 3. 同步卡片 */}
          <Card className="sync-card">
            <Card.Body>
              {/* Firebase状态指示器 */}
              <FirebaseStatus />
              
              {/* 同步状态 */}
              {renderSyncStatus()}
              
              {/* 同步按钮 */}
              <Button 
                variant="primary" 
                onClick={handleManualSync}
                disabled={syncStatus.loading}
                className="sync-button w-100"
              >
                {syncStatus.loading ? (
                  <Spinner animation="border" size="sm" className="me-2" />
                ) : (
                  <><FaSync className="me-2" /> 同步数据</>
                )}
              </Button>
            </Card.Body>
          </Card>
          
          {/* 4. 应用模式卡片 - 简化版 */}
          <Card className="app-mode-card">
            <Card.Body className="d-flex flex-column align-items-center">
              <div className="app-mode-content">
                {getModeIcon()}
                <h3 className="app-mode-name">{getModeName()}</h3>
                <p className="app-mode-description">所有功能可用</p>
                <Button 
                  variant="primary" 
                  className="refresh-button"
                  onClick={refreshRegionDetection}
                  disabled={isLoading}
                >
                  {isLoading ? '检测中...' : '刷新检测'}
                </Button>
              </div>
            </Card.Body>
          </Card>
        </div>
      </Container>
    </div>
  );
};

export default UserProfile; 