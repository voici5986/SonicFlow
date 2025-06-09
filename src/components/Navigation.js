import React, { useState } from 'react';
import { Nav, Navbar, Container } from 'react-bootstrap';
import { FaHome, FaHeart, FaHistory } from 'react-icons/fa';

const Navigation = ({ activeTab, onTabChange }) => {
  // 添加展开状态控制
  const [expanded, setExpanded] = useState(false);
  
  // 处理菜单项点击事件
  const handleNavItemClick = (id) => {
    onTabChange(id);
    setExpanded(false); // 自动收起菜单
  };

  // 导航项
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

  // 折叠菜单样式
  const collapseStyle = {
    backgroundColor: '#ffffff',
    borderRadius: '0 0 10px 10px',
    boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
    zIndex: 1050,
    padding: '10px 0'
  };

  return (
    <Navbar bg="light" expand="lg" className="mb-4" expanded={expanded} onToggle={setExpanded}>
      <Container fluid style={{ paddingRight: '60px' }}>
        <Navbar.Brand className="d-flex align-items-center">
          <img
            src="/favicon.ico"
            width="30"
            height="30"
            className="d-inline-block align-top me-2"
            alt="Logo"
          />
          <span style={logoStyle}>SonicFlow</span>
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav" className="justify-content-center" style={collapseStyle}>
          <Nav className="w-100 d-flex justify-content-center">
            {navItems.map(item => (
              <Nav.Link
                key={item.id}
                active={activeTab === item.id}
                onClick={() => handleNavItemClick(item.id)}
                className="d-flex align-items-center mx-2 mx-md-4"
              >
                <span className="me-1">{item.icon}</span> {item.title}
              </Nav.Link>
            ))}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Navigation; 