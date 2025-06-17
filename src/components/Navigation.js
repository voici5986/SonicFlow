import React, { useState, useEffect } from 'react';
import { Nav, Navbar, Container, Button } from 'react-bootstrap';
import { FaHome, FaHeart, FaHistory, FaUser } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import NetworkStatus from './NetworkStatus';
import RegionStatus from './RegionStatus';
import { useRegion } from '../contexts/RegionContext';
import '../styles/NavigationFix.css';

const Navigation = ({ activeTab, onTabChange, onAuthClick }) => {
  // 添加展开状态控制
  const [expanded, setExpanded] = useState(false);
  // 添加滚动状态
  const [scrolled, setScrolled] = useState(false);
  // 检测窗口宽度用于响应式设计
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const { currentUser } = useAuth();
  const { isFeatureAvailable } = useRegion();
  
  // 监听滚动事件
  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 20;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [scrolled]);
  
  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // 处理菜单项点击事件
  const handleNavItemClick = (id) => {
    // 如果当前已经在用户页面，且点击的还是用户图标，则跳转到搜索页
    if (id === 'user' && activeTab === 'user') {
      onTabChange('home');
    } else {
      onTabChange(id);
    }
    setExpanded(false); // 自动收起菜单
  };

  // 导航项 - 移除账号选项
  const navItems = [
    { id: 'home', title: '搜索', icon: <FaHome /> },
    { id: 'favorites', title: '收藏', icon: <FaHeart /> },
    { id: 'history', title: '历史记录', icon: <FaHistory /> },
  ];

  // SonicFlow标志样式
  const logoStyle = {
    fontFamily: "'Montserrat', sans-serif",
    fontWeight: 700,
    fontSize: '1.5rem',
    background: 'linear-gradient(45deg, #6a11cb 0%, #2575fc 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    textFillColor: 'transparent',
    letterSpacing: '1px'
  };

  // 用户初始头像
  const userInitial = currentUser && currentUser.displayName ? 
    currentUser.displayName[0].toUpperCase() : 
    (currentUser && currentUser.email ? currentUser.email[0].toUpperCase() : null);

  return (
    <Navbar 
      expand="lg" 
      expanded={expanded} 
      onToggle={setExpanded} 
      className={`nav-animated ${scrolled ? 'scrolled' : ''}`}
    >
      <Container fluid>
        <Navbar.Brand className="d-flex align-items-center">
          <span style={logoStyle}>SonicFlow</span>
        </Navbar.Brand>

        {/* 网络状态和区域状态指示器 */}
        <div className="d-flex align-items-center">
          <NetworkStatus inNavbar={true} />
          <RegionStatus showDetails={false} iconOnly={isMobile} />
        </div>

        {/* 用户头像/登录按钮 */}
        <div className="order-lg-last ms-auto me-2">
          {/* 用户头像按钮 */}
          {currentUser ? (
            <Nav.Link
              active={activeTab === 'user'}
              onClick={() => handleNavItemClick('user')}
              className={`d-flex align-items-center justify-content-center nav-item ${activeTab === 'user' ? 'active' : ''}`}
              style={{ width: '40px', height: '40px' }}
            >
              {currentUser.photoURL ? (
                <img 
                  src={currentUser.photoURL}
                  alt="Profile" 
                  className="rounded-circle"
                  style={{ width: '32px', height: '32px' }}
                />
              ) : userInitial ? (
                <div 
                  className="rounded-circle bg-primary text-white d-flex justify-content-center align-items-center"
                  style={{ width: '32px', height: '32px', fontSize: '1rem' }}
                >
                  {userInitial}
                </div>
              ) : (
                <FaUser />
              )}
            </Nav.Link>
          ) : (
            <Button 
              variant="outline-primary" 
              size="sm" 
              className="d-flex align-items-center justify-content-center"
              onClick={() => handleNavItemClick('user')}
              style={{ width: '40px', height: '40px', borderRadius: '50%' }}
            >
              <FaUser />
            </Button>
          )}
        </div>

        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="mx-auto">
            {navItems.map(item => (
              <Nav.Link
                key={item.id}
                active={activeTab === item.id}
                onClick={() => handleNavItemClick(item.id)}
                className={`d-flex align-items-center mx-2 mx-md-4 nav-item ${activeTab === item.id ? 'active' : ''}`}
              >
                <span className="me-1 nav-icon">{item.icon}</span> {item.title}
              </Nav.Link>
            ))}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Navigation; 