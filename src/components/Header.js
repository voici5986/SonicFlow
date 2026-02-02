import React from 'react';
import { FaSearch, FaUser } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { useDevice } from '../contexts/DeviceContext';
import '../styles/Header.css';

const Header = ({ 
  activeTab, 
  onTabChange, 
  searchQuery, 
  onSearchChange, 
  onSearchSubmit,
  loading 
}) => {
  const { currentUser } = useAuth();
  const { isMobile } = useDevice();

  if (isMobile) return null;

  // 获取用户初始
  const getUserInitial = () => {
    if (currentUser && currentUser.displayName) {
      return currentUser.displayName.charAt(0).toUpperCase();
    }
    if (currentUser && currentUser.email) {
      return currentUser.email.charAt(0).toUpperCase();
    }
    return null;
  };

  const userInitial = getUserInitial();

  // 根据当前标签页动态显示搜索框的占位符
  const getPlaceholder = () => {
    switch (activeTab) {
      case 'favorites': return '在收藏中搜索歌曲...';
      case 'history': return '在历史记录中搜索...';
      default: return '搜索歌曲、歌手、专辑...';
    }
  };

  return (
    <header className="app-header-desktop d-none d-lg-flex">
      <div className="header-search-container">
        <form onSubmit={onSearchSubmit} className="w-100">
          <div className="input-group-custom header-search-input-group" style={{ flexWrap: 'nowrap' }}>
            <span className="input-group-text-custom bg-transparent border-0 pe-0 d-flex align-items-center justify-content-center">
              <FaSearch className="text-muted" size={14} />
            </span>
            <input
              type="search"
              placeholder={getPlaceholder()}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="form-control-custom bg-transparent border-0 shadow-none text-sm"
              style={{ fontSize: '0.9rem', height: '100%', outline: 'none' }}
            />
          </div>
        </form>
      </div>

      <div className="header-user-container ms-auto">
        <div 
          className="header-user-profile d-flex align-items-center"
          onClick={() => onTabChange('user')}
          style={{ cursor: 'pointer' }}
        >
          <div className="header-user-info text-end me-3 d-none d-xl-block">
            <div className="user-name small fw-bold text-truncate" style={{ maxWidth: '120px' }}>
              {currentUser ? (currentUser.displayName || '已登录用户') : '未登录'}
            </div>
            <div className="user-status text-muted" style={{ fontSize: '0.7rem' }}>
              {currentUser ? '在线' : '点击登录'}
            </div>
          </div>
          
          <div className="header-avatar-wrapper">
            {currentUser && currentUser.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt="Profile"
                className="rounded-circle shadow-sm"
                style={{ width: '32px', height: '32px', objectFit: 'cover' }}
              />
            ) : userInitial ? (
              <div
                className="rounded-circle d-flex justify-content-center align-items-center shadow-sm"
                style={{ width: '32px', height: '32px', fontSize: '0.9rem', backgroundColor: 'var(--color-text-primary)', color: 'var(--card-background)' }}
              >
                {userInitial}
              </div>
            ) : (
              <div
                className="rounded-circle d-flex justify-content-center align-items-center shadow-sm"
                style={{ width: '32px', height: '32px', backgroundColor: 'var(--color-background-alt)', color: 'var(--color-text-tertiary)' }}
              >
                <FaUser size={14} />
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
