import React from 'react';
import { FaSearch, FaUser, FaTimesCircle } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { useDevice } from '../contexts/DeviceContext';
import '../styles/Header.css';

const Header = ({ 
  activeTab, 
  onTabChange, 
  searchQuery, 
  onSearchChange, 
  onSearchSubmit,
  suggestionsOpen,
  suggestionsLoading,
  suggestions,
  onSearchFocus,
  onSearchBlur,
  onKeyDown,
  onSuggestionPick,
  onShowMore,
  selectedIndex = -1,
  loading 
}) => {
  const { currentUser } = useAuth();
  const { isMobile } = useDevice();

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
  const suggestionData = suggestions || { 
    favorites: [], 
    history: [], 
    searchHistory: [],
    favoritesExtraCount: 0, 
    historyExtraCount: 0 
  };
  const hasQuery = searchQuery && searchQuery.trim().length > 0;

  const handleClearHistory = async (e) => {
    e.stopPropagation();
    try {
      const { clearSearchHistory } = await import('../services/storage');
      await clearSearchHistory();
      // 这里不需要手动刷新状态，因为 App.js 里的 useEffect 监听了 suggestionsOpen
      // 但为了即时反馈，可以触发一个窗口事件或者由 App 传入清空回调
      window.dispatchEvent(new CustomEvent('search_history_cleared'));
    } catch (error) {
      console.error('清空搜索历史失败:', error);
    }
  };

  const handleClear = () => {
    onSearchChange('');
    onSearchFocus && onSearchFocus();
  };

  const renderSuggestions = (extraClass) => {
    if (!suggestionsOpen) return null;

    // 当没有输入时，显示搜索历史
    if (!hasQuery) {
      if (suggestionData.searchHistory.length === 0) return null;

      return (
        <div
          className={`header-search-suggestions ${extraClass || ''}`.trim()}
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="suggestion-section">
            <div className="suggestion-section-title d-flex justify-content-between align-items-center">
              <span>最近搜索</span>
              <span 
                className="clear-history-link" 
                onClick={handleClearHistory}
                style={{ cursor: 'pointer', fontSize: '11px', fontWeight: 'normal' }}
              >
                清空
              </span>
            </div>
            {suggestionData.searchHistory.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  type="button"
                  key={item.id}
                  className={`suggestion-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => onSuggestionPick && onSuggestionPick(item)}
                >
                  <span className="suggestion-title">{item.name}</span>
                  <span className="suggestion-subtitle">{item.artist}</span>
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    const allItems = [
      ...suggestionData.favorites.map(item => ({ ...item, type: 'favorites' })),
      ...suggestionData.history.map(item => ({ ...item, type: 'history' }))
    ];

    let globalIdx = 0;

    return (
      <div
        className={`header-search-suggestions ${extraClass || ''}`.trim()}
        onMouseDown={(e) => e.preventDefault()}
      >
        {suggestionsLoading ? (
          <div className="suggestion-loading">正在匹配...</div>
        ) : (
          <>
            <div className="suggestion-section">
              <div className="suggestion-section-title">收藏中</div>
              {suggestionData.favorites.length > 0 ? (
                suggestionData.favorites.map((item) => {
                  const isSelected = globalIdx === selectedIndex;
                  globalIdx++;
                  return (
                    <button
                      type="button"
                      key={item.id}
                      className={`suggestion-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => onSuggestionPick && onSuggestionPick(item)}
                    >
                      <span className="suggestion-title">{item.name}</span>
                      <span className="suggestion-subtitle">{item.artist}</span>
                    </button>
                  );
                })
              ) : (
                <div className="suggestion-empty">暂无匹配</div>
              )}
              {suggestionData.favoritesExtraCount > 0 && (
                <div 
                  className="suggestion-more" 
                  onClick={() => onShowMore && onShowMore('favorites')}
                >
                  还有 {suggestionData.favoritesExtraCount} 首收藏 →
                </div>
              )}
            </div>

            <div className="suggestion-divider"></div>

            <div className="suggestion-section">
              <div className="suggestion-section-title">历史记录</div>
              {suggestionData.history.length > 0 ? (
                suggestionData.history.map((item) => {
                  const isSelected = globalIdx === selectedIndex;
                  globalIdx++;
                  return (
                    <button
                      type="button"
                      key={item.id}
                      className={`suggestion-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => onSuggestionPick && onSuggestionPick(item)}
                    >
                      <span className="suggestion-title">{item.name}</span>
                      <span className="suggestion-subtitle">{item.artist}</span>
                    </button>
                  );
                })
              ) : (
                <div className="suggestion-empty">暂无匹配</div>
              )}
              {suggestionData.historyExtraCount > 0 && (
                <div 
                  className="suggestion-more" 
                  onClick={() => onShowMore && onShowMore('history')}
                >
                  还有 {suggestionData.historyExtraCount} 首历史 →
                </div>
              )}
            </div>

            <div className="suggestion-footer">按回车搜索全部歌曲</div>
          </>
        )}
      </div>
    );
  };

  // 统一全局搜索框的占位符
  const getPlaceholder = () => {
    return '搜索歌曲、歌手、专辑...';
  };

  return (
    <>
      {/* 桌面端 Header */}
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
                onFocus={onSearchFocus}
                onBlur={onSearchBlur}
                onKeyDown={onKeyDown}
                className="form-control-custom bg-transparent border-0 shadow-none text-sm"
                style={{ fontSize: '0.9rem', height: '100%', outline: 'none' }}
              />
              {searchQuery && (
                <button 
                  type="button" 
                  className="search-clear-btn"
                  onClick={handleClear}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <FaTimesCircle size={14} />
                </button>
              )}
            </div>
          </form>
          {renderSuggestions('desktop-search-suggestions')}
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

      {/* 移动端全局搜索 Header */}
      <div className="app-header-mobile d-lg-none">
        <form onSubmit={onSearchSubmit} className="w-100">
          <div className="mobile-search-wrapper">
            <FaSearch className="mobile-search-icon" />
            <input
                type="search"
                placeholder={getPlaceholder()}
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                onFocus={onSearchFocus}
                onBlur={onSearchBlur}
                onKeyDown={onKeyDown}
                className="mobile-search-input"
              />
              {searchQuery && (
                <button 
                  type="button" 
                  className="mobile-search-clear-btn"
                  onClick={handleClear}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <FaTimesCircle size={16} />
                </button>
              )}
            </div>
        </form>
        {renderSuggestions('mobile-search-suggestions')}
      </div>
    </>
  );
};

export default Header;
