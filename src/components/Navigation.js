import React, { useState } from 'react';
import { Nav, Navbar, Container, Button } from 'react-bootstrap';
import { FaHome, FaHeart, FaHistory, FaUser } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import '../styles/NavigationFix.css';

const Navigation = ({ activeTab, onTabChange, onAuthClick }) => {
  // 添加展开状态控制
  const [expanded, setExpanded] = useState(false);
  const { currentUser } = useAuth();
  
  // 处理菜单项点击事件
  const handleNavItemClick = (id) => {
    onTabChange(id);
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
    <Navbar expand="lg" expanded={expanded} onToggle={setExpanded} className="nav-animated">
      <Container fluid>
        <Navbar.Brand className="d-flex align-items-center">
          <img
            src="/favicon.ico"
            width="30"
            height="30"
            className="d-inline-block align-top me-2 logo-pulse"
            alt="Logo"
          />
          <span style={logoStyle}>SonicFlow</span>
        </Navbar.Brand>

        {/* 用户头像/登录按钮 - 在所有屏幕尺寸显示 */}
        <div className="order-lg-last ms-auto me-2">
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
              onClick={onAuthClick}
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