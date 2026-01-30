import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
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
        <Container className="py-3">
          <UserProfile onTabChange={onTabChange} />
        </Container>
      </div>
    );
  }
  
  // 未登录状态下，显示登录表单和统计卡片
  // 移动端视图：只显示登录表单
  // 桌面端视图：显示两栏布局
  return (
    <div className="user-page-container">
      <Container className="py-3">
        {/* 桌面端布局 */}
        <div className="d-none d-lg-block">
          <Row className="equal-height-row g-3">
            {/* 左侧：登录/注册表单 */}
            <Col lg={6} className="d-flex">
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
            </Col>
            
            {/* 右侧：统计卡片 */}
            <Col lg={6} className="d-flex flex-column">
              <div className="d-flex flex-column h-100" style={{ gap: '12px' }}>
                {/* 统计卡片 */}
                <Card className="stats-card border-0 shadow-sm flex-grow-1" style={{ borderRadius: 'var(--border-radius)', backgroundColor: 'var(--color-background-alt)' }}>
                  <Card.Body className="d-flex flex-column stats-card-body p-4">
                    <h5 className="mb-4 text-start fw-bold" style={{ color: 'var(--color-text-primary)' }}>本地数据统计</h5>
                    <div className="d-flex flex-column gap-3 mb-auto">
                      <div 
                        className="stats-item-notion d-flex align-items-center p-3 rounded-3" 
                        onClick={() => handleStatsCardClick('favorites')}
                        style={{ 
                          cursor: 'pointer',
                          backgroundColor: 'var(--card-background)',
                          border: '1px solid var(--color-border)',
                          transition: 'var(--transition-fast)'
                        }}
                      >
                        <div className="stats-icon-wrapper me-3 d-flex align-items-center justify-content-center" 
                             style={{ 
                               width: '40px', 
                               height: '40px', 
                               borderRadius: '8px', 
                               backgroundColor: 'rgba(209, 92, 92, 0.1)',
                               color: 'var(--color-accent)'
                             }}>
                          <FaHeart size={18} />
                        </div>
                        <div className="flex-grow-1">
                          <div className="small text-muted mb-0">我的收藏</div>
                          <div className="h5 mb-0 fw-bold">{favoritesCount} <span className="small fw-normal text-muted">首歌曲</span></div>
                        </div>
                      </div>
                      
                      <div 
                        className="stats-item-notion d-flex align-items-center p-3 rounded-3" 
                        onClick={() => handleStatsCardClick('history')}
                        style={{ 
                          cursor: 'pointer',
                          backgroundColor: 'var(--card-background)',
                          border: '1px solid var(--color-border)',
                          transition: 'var(--transition-fast)'
                        }}
                      >
                        <div className="stats-icon-wrapper me-3 d-flex align-items-center justify-content-center" 
                             style={{ 
                               width: '40px', 
                               height: '40px', 
                               borderRadius: '8px', 
                               backgroundColor: 'rgba(47, 52, 55, 0.1)',
                               color: 'var(--color-primary)'
                             }}>
                          <FaHistory size={18} />
                        </div>
                        <div className="flex-grow-1">
                          <div className="small text-muted mb-0">最近播放</div>
                          <div className="h5 mb-0 fw-bold">{historyCount} <span className="small fw-normal text-muted">条记录</span></div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-3">
                      <ClearDataButton />
                    </div>
                    
                    <div className="text-muted small mt-4 text-start" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '20px' }}>
                      <p className="mb-2 d-flex align-items-center">
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-accent)', display: 'inline-block', marginRight: '8px' }}></span>
                        登录后可以同步您的收藏和历史记录
                      </p>
                      <p className="mb-0 text-muted opacity-50">版本: {process.env.VITE_APP_VERSION || '1.0.0'}</p>
                    </div>
                  </Card.Body>
                </Card>
              </div>
            </Col>
          </Row>
        </div>

        {/* 移动端/平板端布局 - 居中单栏 */}
        <div className="d-lg-none">
          <div className="auth-form-wrapper mx-auto" style={{ maxWidth: '450px' }}>
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
      </Container>
    </div>
  );
};

export default User; 