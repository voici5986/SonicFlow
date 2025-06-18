import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import UserProfile from '../components/UserProfile';
import LoginForm from '../components/LoginForm';
import RegisterForm from '../components/RegisterForm';
import { useAuth } from '../contexts/AuthContext';
import { getFavorites, getHistory } from '../services/storage';
import { useRegion } from '../contexts/RegionContext';
import RegionStatus from '../components/RegionStatus';
import { FaHeart, FaHistory } from 'react-icons/fa';

const User = ({ onTabChange }) => {
  const { currentUser } = useAuth();
  const { appMode } = useRegion(); // 添加appMode，确保组件能够响应模式变化
  const [isLogin, setIsLogin] = useState(true);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [historyCount, setHistoryCount] = useState(0);
  
  // 添加调试日志，查看当前模式
  useEffect(() => {
    console.log(`User页面: 当前应用模式 = ${appMode}`);
  }, [appMode]);
  
  // 加载统计数据
  useEffect(() => {
    const loadCounts = async () => {
      const favorites = await getFavorites();
      const history = await getHistory();
      setFavoritesCount(favorites.length);
      setHistoryCount(history.length);
    };
    
    loadCounts();
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
      <Container className="my-4">
        <UserProfile onTabChange={onTabChange} />
      </Container>
    );
  }
  
  // 未登录状态下，显示登录表单、统计卡片和应用模式卡片
  return (
    <Container className="my-3">
      <div className="user-dashboard-guest">
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
          
          {/* 右侧：统计卡片和应用模式区域 */}
          <Col lg={6} className="d-flex flex-column">
            <div className="d-flex flex-column" style={{ gap: '12px' }}>
              {/* 统计卡片 */}
              <Card className="stats-card">
                <Card.Body className="d-flex flex-column stats-card-body">
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
                  
                  <div className="text-muted small mt-2">
                    <p className="mb-1">登录后可以同步您的收藏和历史记录到云端</p>
                  </div>
                </Card.Body>
              </Card>
              
              {/* 应用模式区域 - 使用key强制重新渲染 */}
              <div className="region-status-wrapper">
                <div className="d-flex flex-column">
                  <RegionStatus showDetails={true} key={`region-status-${appMode}`} />
                  <div className="text-muted small mt-2 region-note">
                    <p className="mb-1">登录账号需要完整模式，中国地区用户可能无法登录</p>
                  </div>
                </div>
              </div>
            </div>
          </Col>
        </Row>
      </div>
    </Container>
  );
};

export default User; 