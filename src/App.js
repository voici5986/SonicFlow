import React, { useState, useEffect, useCallback, Suspense, useReducer } from 'react';
import { FaPlay, FaPause, FaDownload } from 'react-icons/fa';
import { toast } from 'react-toastify';
import AlbumCover from './components/AlbumCover';
import HeartButton from './components/HeartButton';
import MusicCardActions from './components/MusicCardActions';
import Navigation from './components/Navigation';
import DeviceDebugger from './components/DeviceDebugger';
import OrientationPrompt from './components/OrientationPrompt';
import InstallPWA from './components/InstallPWA';
import UpdateNotification from './components/UpdateNotification';
import AudioPlayer from './components/AudioPlayer';
import Header from './components/Header';
import { useAuth } from './contexts/AuthContext';
import { useDevice } from './contexts/DeviceContext';
import PlayerProvider, { usePlayer } from './contexts/PlayerContext';
import { lockToPortrait } from './utils/orientationManager';
import { downloadTrack } from './services/downloadService';
import { searchMusic } from './services/musicApiService';
import useNetworkStatus from './hooks/useNetworkStatus';
import useFirebaseStatus from './hooks/useFirebaseStatus';
import {
  handleError,
  ErrorTypes,
  ErrorSeverity,
  checkNetworkStatus,
  validateSearchParams,
  checkDownloadStatus
} from './utils/errorHandler';
import SyncProvider from './contexts/SyncContext';
import FavoritesProvider from './contexts/FavoritesContext';
import { DownloadProvider, useDownload } from './contexts/DownloadContext';
import { clearExpiredCovers } from './services/storage';
import useSearch from './hooks/useSearch';
import SearchResultItem from './components/SearchResultItem';
import SearchService from './services/SearchService';
// 导入样式文件
import './styles/AudioPlayer.css';
import './styles/Orientation.css';
import './styles/Header.css';

// 懒加载页面组件
const Favorites = React.lazy(() => import('./pages/Favorites'));
const History = React.lazy(() => import('./pages/History'));
const User = React.lazy(() => import('./pages/User'));


// 搜索结果项组件 - 已迁移至 components/SearchResultItem.js

const AppContent = () => {
  const [activeTab, setActiveTab] = useState('home');

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
  }, []);



  const { isOnline } = useNetworkStatus({
    showToasts: true,
    dispatchEvents: true
  });

  // 使用自定义Hook管理Firebase状态
  useFirebaseStatus({
    showToasts: true,
    manualCheck: false
  });

  // 使用自定义Hook管理搜索逻辑
  const { 
    query, 
    results, 
    source, 
    quality, 
    loading, 
    handleSearch, 
    setQuery, 
    setSource, 
    setQuality 
  } = useSearch(isOnline);

  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [localSuggestions, setLocalSuggestions] = useState({ favorites: [], history: [] });
  const [localSuggestionsLoading, setLocalSuggestionsLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const suggestionLimit = 5;

  // 获取搜索历史
  useEffect(() => {
    const fetchSearchHistory = async () => {
      try {
        const { getSearchHistory } = await import('./services/storage');
        const history = await getSearchHistory();
        setSearchHistory(history || []);
      } catch (error) {
        console.error('获取搜索历史失败:', error);
      }
    };

    if (suggestionsOpen && !query.trim()) {
      fetchSearchHistory();
    }

    const handleCleared = () => setSearchHistory([]);
    window.addEventListener('search_history_cleared', handleCleared);
    return () => window.removeEventListener('search_history_cleared', handleCleared);
  }, [suggestionsOpen, query]);

  // 下载相关状态 - 使用全局 Context
  const { downloading, currentDownloadingTrack, handleDownload } = useDownload();

  // 可选音乐源
  const sources = [
    'netease', 'kuwo', 'joox', 'bilibili'
  ];

  // 可选音质
  const qualities = [128, 192, 320, 740, 999];

  // 从PlayerContext获取封面相关方法
  const { setCurrentPlaylist, handlePlay: playTrack } = usePlayer();

  // 当搜索结果变化时，同步更新播放列表
  useEffect(() => {
    if (results && results.length > 0) {
      setCurrentPlaylist(results);
    }
  }, [results, setCurrentPlaylist]);

  const deviceInfo = useDevice();

  const getTrackArtist = (track) => {
    if (!track) return '';
    if (Array.isArray(track.ar)) return track.ar.map(a => a?.name || '').filter(Boolean).join(' / ');
    if (Array.isArray(track.artists)) return track.artists.map(a => a?.name || '').filter(Boolean).join(' / ');
    if (track.artist) {
      return typeof track.artist === 'string' ? track.artist : (track.artist.name || '');
    }
    return '';
  };

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setLocalSuggestions({ favorites: [], history: [] });
      setLocalSuggestionsLoading(false);
      return;
    }

    let active = true;
    setLocalSuggestionsLoading(true);
    const timer = setTimeout(() => {
      SearchService.searchLocal(trimmedQuery)
        .then((result) => {
          if (!active) return;
          setLocalSuggestions(result);
          setLocalSuggestionsLoading(false);
        })
        .catch(() => {
          if (!active) return;
          setLocalSuggestionsLoading(false);
        });
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  const handleSearchFocus = () => {
    setSuggestionsOpen(true);
    setSelectedIndex(-1);
  };
  const handleSearchBlur = () => {
    // 延迟关闭，以便处理建议项的点击
    setTimeout(() => {
      setSuggestionsOpen(false);
      setSelectedIndex(-1);
    }, 200);
  };

  const buildSuggestionItems = (tracks) => {
    return tracks.map((track, index) => ({
      id: track?.id || `${track?.name || 'unknown'}-${index}`,
      name: track?.name || '未命名',
      artist: getTrackArtist(track) || '未知歌手',
      raw: track
    }));
  };

  const handleSuggestionPick = (item) => {
    if (item.isSearchHistory) {
      // 如果是搜索历史建议
      setQuery(item.rawQuery);
      setSource(item.rawSource);
      setSuggestionsOpen(false);
      // 触发搜索
      setTimeout(() => {
        handleSearch();
      }, 0);
      return;
    }

    if (item.raw) {
      // 1. 如果是歌曲建议，直接播放
      playTrack(item.raw, -1, [item.raw], quality);
      // 2. 清空搜索框并关闭建议
      setQuery('');
      setSuggestionsOpen(false);
    } else {
      // 如果没有原始数据，则回退到普通搜索
      setQuery(item.name);
      setSuggestionsOpen(false);
    }
  };

  const favoritesItems = buildSuggestionItems(localSuggestions.favorites || []);
  const historyItems = buildSuggestionItems(localSuggestions.history || []);

  const limitedFavorites = favoritesItems.slice(0, suggestionLimit);
  const limitedHistory = historyItems.slice(0, suggestionLimit);

  // 格式化搜索历史建议
  const historySuggestionItems = searchHistory.slice(0, 5).map((item, index) => ({
    id: `history-${index}-${item.timestamp}`,
    name: item.query,
    artist: `历史搜索 · ${item.source}`,
    isSearchHistory: true,
    rawQuery: item.query,
    rawSource: item.source
  }));

  // 合并后的建议列表，用于键盘导航
  const allLimitedItems = query.trim() 
    ? [...limitedFavorites, ...limitedHistory]
    : historySuggestionItems;

  const handleKeyDown = (e) => {
    if (!suggestionsOpen || allLimitedItems.length === 0) {
      if (e.key === 'Enter') {
        setSuggestionsOpen(false); // 即使没有建议，按回车搜索也应关闭弹窗
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % allLimitedItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + allLimitedItems.length) % allLimitedItems.length);
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && selectedIndex < allLimitedItems.length) {
        e.preventDefault();
        handleSuggestionPick(allLimitedItems[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setSuggestionsOpen(false);
      setSelectedIndex(-1);
    }
  };
  const favoritesExtraCount = Math.max(0, favoritesItems.length - suggestionLimit);
  const historyExtraCount = Math.max(0, historyItems.length - suggestionLimit);

  const handleShowMore = (type) => {
    // 切换到对应的标签页
    if (type === 'favorites') {
      setActiveTab('favorites');
    } else if (type === 'history') {
      setActiveTab('history');
    }
    // 保持当前的 query，页面内会自动过滤
    setSuggestionsOpen(false);
  };

  const renderHomePage = () => {
    const isDesktop = !deviceInfo.isMobile;

    return (
      <div className={`page-content-wrapper ${isDesktop ? 'home-desktop' : ''}`}>
        <div className="home-search-filter-bar mb-4">
          <form onSubmit={handleSearch} className="home-filter-form">
            <div className="d-flex align-items-center flex-wrap gap-3">
              <div className="filter-group d-flex align-items-center">
                <span className="text-muted small me-2">音源:</span>
                <select 
                  className="form-select-custom" 
                  value={source} 
                  onChange={(e) => setSource(e.target.value)} 
                  style={{ height: '38px', width: isDesktop ? '120px' : 'auto', fontSize: '0.85rem', flex: isDesktop ? 'none' : 1 }}
                >
                  {sources.map((src) => (<option key={src} value={src}>{src}</option>))}
                </select>
              </div>
              <div className="filter-group d-flex align-items-center">
                <span className="text-muted small me-2">音质:</span>
                <select 
                  className="form-select-custom" 
                  value={quality} 
                  onChange={(e) => setQuality(e.target.value)} 
                  style={{ height: '38px', width: isDesktop ? '120px' : 'auto', fontSize: '0.85rem', flex: isDesktop ? 'none' : 1 }}
                >
                  {qualities.map((q) => (<option key={q} value={q}>{q === 999 ? '无损' : `${q}kbps`}</option>))}
                </select>
              </div>
              {isDesktop && (
                <button 
                  type="submit" 
                  className="search-submit-btn" 
                  disabled={loading} 
                  style={{ height: '38px', padding: '0 24px', fontSize: '0.85rem' }}
                >
                  {loading ? <span className="spinner-custom" style={{ width: '1rem', height: '1rem' }}></span> : '开始搜索'}
                </button>
              )}
            </div>
          </form>
        </div>

        {results.length > 0 ? (
          <div className={isDesktop ? 'home-results' : ''}>
            <div className={`row g-3 ${isDesktop ? 'home-results-row' : ''}`}>
              {results.map((track) => (
                <div key={track.id} className="col-12 col-md-6 col-lg-4">
                  <SearchResultItem track={track} searchResults={results} quality={quality} />
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  // 渲染不同标签页的内容
  const renderContent = () => {
    const loadingFallback = (
      <div className="text-center my-5">
        <span className="spinner-custom" style={{ width: '2.5rem', height: '2.5rem' }}></span>
        <p className="mt-3">加载中...</p>
      </div>
    );

    switch (activeTab) {
      case 'home':
        return renderHomePage();
      case 'favorites':
        return (
          <Suspense fallback={loadingFallback}>
            <Favorites globalSearchQuery={query} onTabChange={handleTabChange} />
          </Suspense>
        );
      case 'history':
        return (
          <Suspense fallback={loadingFallback}>
            <History globalSearchQuery={query} onTabChange={handleTabChange} />
          </Suspense>
        );
      case 'user':
        return (
          <Suspense fallback={loadingFallback}>
            <User onTabChange={handleTabChange} />
          </Suspense>
        );
      default:
        return renderHomePage();
    }
  };

  // 尝试锁定屏幕方向为竖屏（仅在移动设备和平板上）
  useEffect(() => {
    if (deviceInfo.isMobile || deviceInfo.isTablet) {
      lockToPortrait().then(success => {
        if (process.env.NODE_ENV === 'development') {
          console.log(success ?
            '成功锁定屏幕方向为竖屏' :
            '无法锁定屏幕方向，将使用备选方案'
          );
        }
      });
    }
  }, [deviceInfo.isMobile, deviceInfo.isTablet]);

  // 初始化应用
  useEffect(() => {
    const initialize = async () => {
      try {
        if (process.env.NODE_ENV === 'development') {
          console.log("应用初始化中...");
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error("初始化失败:", error);
        }
      }
    };

    initialize();
  }, []);

  // 启动时清理过期的封面缓存
  useEffect(() => {
    // 异步清理过期封面缓存，不阻塞主流程
    clearExpiredCovers()
      .then(count => {
        console.log(`已清理 ${count} 个过期封面缓存`);
      })
      .catch(error => {
        console.error('清理封面缓存失败:', error);
      });
  }, []);

  return (
    <div className={`app-container ${!deviceInfo.isMobile ? 'desktop-layout' : ''}`}>
      <OrientationPrompt />
      <Header 
        activeTab={activeTab}
        onTabChange={handleTabChange}
        searchQuery={query}
        onSearchChange={setQuery}
        onSearchSubmit={(e) => {
          handleSearch(e);
          setSuggestionsOpen(false); // 提交搜索后关闭建议弹窗
          if (activeTab !== 'home') {
            handleTabChange('home');
          }
        }}
        suggestionsOpen={suggestionsOpen}
        suggestionsLoading={localSuggestionsLoading}
        suggestions={{
          favorites: limitedFavorites,
          history: limitedHistory,
          searchHistory: historySuggestionItems,
          favoritesExtraCount,
          historyExtraCount
        }}
        onSearchFocus={handleSearchFocus}
        onSearchBlur={handleSearchBlur}
        onKeyDown={handleKeyDown}
        selectedIndex={selectedIndex}
        onSuggestionPick={handleSuggestionPick}
        onShowMore={handleShowMore}
        loading={loading}
      />
      <Navigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      <div className={!deviceInfo.isMobile ? 'main-content' : 'main-content'}>
        <div className={!deviceInfo.isMobile ? 'content-area' : 'content-area'}>
          {renderContent()}
        </div>
      </div>

      <AudioPlayer />

      <InstallPWA />
      <UpdateNotification />
      {process.env.NODE_ENV === 'development' && <DeviceDebugger />}
    </div>
  );
};

// 主App组件，只负责提供上下文
const App = () => {
  return (
    <SyncProvider>
      <PlayerProvider>
        <FavoritesProvider>
          <DownloadProvider>
            <AppContent />
          </DownloadProvider>
        </FavoritesProvider>
      </PlayerProvider>
    </SyncProvider>
  );
};

export default App;
