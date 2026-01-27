import React from 'react';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { FaUser } from 'react-icons/fa';

const DesktopNavbar = ({
  activeTab,
  expanded,
  setExpanded,
  scrolled,
  currentUser,
  handleNavItemClick,
  userInitial,
  navItems
}) => {
  // SonicFlow标志样式 - 调整更紧凑
  const logoStyle = {
    fontFamily: "'Montserrat', sans-serif",
    fontWeight: 700,
    fontSize: '1.6rem',
    color: 'var(--color-text-primary)',
    letterSpacing: '-0.5px', // 减小字间距，使文字更紧凑
    marginLeft: '-2px' // 微调文字位置
  };

  return (
    <Navbar
      expand="lg"
      expanded={expanded}
      onToggle={setExpanded}
      className={`nav-animated ${scrolled ? 'scrolled' : ''}`}
    >
      <Container fluid>
        <Navbar.Brand className="d-flex align-items-center">
          <img
            src="/logo.svg"
            alt="SonicFlow Logo"
            width="38"
            height="38"
            className="logo-image logo-pulse me-1"
            style={{
              filter: 'drop-shadow(0 0 3px rgba(31, 31, 31, 0.25))',
              marginBottom: '2px' // 微调垂直对齐
            }}
          />
          <span className="brand-text" style={logoStyle}>SonicFlow</span>
        </Navbar.Brand>

        {/* 用户头像/登录按钮 */}
        <div className="order-lg-last ms-auto me-2 d-flex align-items-center">
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
                  className="rounded-circle shadow-sm"
                  style={{ width: '32px', height: '32px', objectFit: 'cover' }}
                />
              ) : userInitial ? (
                <div
                  className="rounded-circle d-flex justify-content-center align-items-center shadow-sm"
                  style={{ width: '32px', height: '32px', fontSize: '1rem', backgroundColor: 'var(--color-text-primary)', color: 'var(--card-background)' }}
                >
                  {userInitial}
                </div>
              ) : (
                <FaUser />
              )}
            </Nav.Link>
          ) : (
            <Button
              variant="link"
              size="sm"
              className="d-flex align-items-center justify-content-center minimal-action-btn"
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
            {navItems.map(item => {
              const Icon = item.icon;
              return (
                <Nav.Link
                  key={item.id}
                  active={activeTab === item.id}
                  onClick={() => handleNavItemClick(item.id)}
                  className={`d-flex align-items-center mx-2 mx-md-4 nav-item ${activeTab === item.id ? 'active' : ''}`}
                >
                  <span className="me-1 nav-icon"><Icon /></span> {item.title}
                </Nav.Link>
              );
            })}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default DesktopNavbar;
