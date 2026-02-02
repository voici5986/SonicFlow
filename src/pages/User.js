import React, { useState, useEffect } from 'react';
import UserProfile from '../components/UserProfile';
import LoginForm from '../components/LoginForm';
import RegisterForm from '../components/RegisterForm';
import ClearDataButton from '../components/ClearDataButton';
import { useAuth } from '../contexts/AuthContext';
import { getFavorites, getHistory } from '../services/storage';
import { FaHeart, FaHistory } from 'react-icons/fa';
import '../styles/User.mobile.css'; // 引入新的移动端优先样式

const User = ({ onTabChange }) => {
  const { currentUser } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [historyCount, setHistoryCount] = useState(0);
  
  // 加载统计数据
  useEffect(() => {
    const loadCounts = async () => {
      const favorites = await getFavorites();
      const history = await getHistory();
      setFavoritesCount(favorites.length);
      setHistoryCount(history.length);
    };
    
    loadCounts();
    
    // 监听数据清除事件
    const handleDataCleared = () => {
      loadCounts();
    };
    
    window.addEventListener('local:data_cleared', handleDataCleared);
    
    return () => {
      window.removeEventListener('local:data_cleared', handleDataCleared);
    };
  }, []);
  
  // 处理表单切换
  const toggleForm = () => {
    setIsLogin(!isLogin);
  };
  
  // 处理登录/注册成功
  const handleAuthSuccess = () => {
    // 不需要做任何事情，因为User组件会自动根据currentUser的变化重新渲染
  };
  
  // 处理统计卡片点击
  const handleStatsCardClick = (tabId) => {
    if (onTabChange) {
      onTabChange(tabId);
    }
  };
  
  // 已登录状态下，显示用户资料
  if (currentUser) {
    return (
      <div className="user-page-container">
        <div className="py-3 px-3">
          <UserProfile onTabChange={onTabChange} />
        </div>
      </div>
    );
  }
  
  // 未登录状态下，显示登录表单和统计卡片
  // 移动端视图：只显示登录表单
  // 桌面端视图：显示两栏布局
  return (
    <div className="user-page-container">
      <div className="py-3 px-3">
        {/* 桌面端布局 */}
        <div className="d-none d-lg-block">
          <div className="row equal-height-row g-3">
            {/* 左侧：登录/注册表单 */}
            <div className="col-lg-6 d-flex">
              <div className="flex-grow-1">
                {isLogin ? (
                  <LoginForm 
                    onToggleForm={toggleForm} 
                    onLoginSuccess={handleAuthSuccess} 
                  />
                ) : (
                  <RegisterForm 
                    onToggleForm={toggleForm} 
                    onRegisterSuccess={handleAuthSuccess} 
                  />
                )}
              </div>
            </div>
            
            {/* 右侧：统计卡片 */}
            <div className="col-lg-6 d-flex flex-column">
              <div className="d-flex flex-column h-100" style={{ gap: '12px' }}>
                {/* 统计卡片 */}
                <div className="stats-card border-0 shadow-sm flex-grow-1" style={{ borderRadius: 'var(--border-radius)', backgroundColor: 'var(--color-background-alt)', overflow: 'hidden' }}>
                  <div className="d-flex flex-column stats-card-body p-4">
                    <div className="stats-header mb-4">
                      <h4 className="fw-bold mb-0">本地统计</h4>
                      <p className="text-muted small mb-0">数据仅存储在当前设备</p>
                    </div>
                    
                    <div className="row g-4 flex-grow-1">
                      <div className="col-6">
                        <div 
                          className="stats-item p-3 h-100 d-flex flex-column align-items-center justify-content-center text-center clickable"
                          onClick={() => handleStatsCardClick('favorites')}
                          style={{ 
                            borderRadius: '12px', 
                            backgroundColor: 'rgba(255, 107, 107, 0.05)',
                            transition: 'all 0.2s ease',
                            border: '1px solid rgba(255, 107, 107, 0.1)'
                          }}
                        >
                          <FaHeart className="text-danger mb-2" size={24} />
                          <div className="stats-value h3 fw-bold mb-0 text-danger">{favoritesCount}</div>
                          <div className="stats-label text-muted small">收藏</div>
                        </div>
                      </div>
                      <div className="col-6">
                        <div 
                          className="stats-item p-3 h-100 d-flex flex-column align-items-center justify-content-center text-center clickable"
                          onClick={() => handleStatsCardClick('history')}
                          style={{ 
                            borderRadius: '12px', 
                            backgroundColor: 'rgba(77, 171, 245, 0.05)',
                            transition: 'all 0.2s ease',
                            border: '1px solid rgba(77, 171, 245, 0.1)'
                          }}
                        >
                          <FaHistory className="text-primary mb-2" size={24} />
                          <div className="stats-value h3 fw-bold mb-0 text-primary">{historyCount}</div>
                          <div className="stats-label text-muted small">历史</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* 数据清理卡片 */}
                <div className="p-3 shadow-sm" style={{ borderRadius: 'var(--border-radius)', backgroundColor: 'var(--color-background-alt)', border: '1px solid var(--color-border)' }}>
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <h6 className="mb-1 fw-bold">隐私与存储</h6>
                      <p className="text-muted small mb-0">清除所有本地缓存、收藏和历史记录</p>
                    </div>
                    <ClearDataButton />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 移动端布局 */}
        <div className="d-block d-lg-none">
          {isLogin ? (
            <LoginForm 
              onToggleForm={toggleForm} 
              onLoginSuccess={handleAuthSuccess} 
            />
          ) : (
            <RegisterForm 
              onToggleForm={toggleForm} 
              onRegisterSuccess={handleAuthSuccess} 
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default User; 