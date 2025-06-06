import React from 'react';
import { Nav, Navbar, Container } from 'react-bootstrap';
import { FaHome, FaHeart, FaHistory } from 'react-icons/fa';

const Navigation = ({ activeTab, onTabChange }) => {
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

  return (
    <Navbar bg="light" expand="lg" className="mb-4">
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
        <Navbar.Collapse id="basic-navbar-nav" className="justify-content-center">
          <Nav className="position-absolute start-50 translate-middle-x">
            {navItems.map(item => (
              <Nav.Link
                key={item.id}
                active={activeTab === item.id}
                onClick={() => onTabChange(item.id)}
                className="d-flex align-items-center mx-4"
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