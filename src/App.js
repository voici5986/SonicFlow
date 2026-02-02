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

  // 下载相关状态 - 使用全局 Context
  const { downloading, currentDownloadingTrack, handleDownload } = useDownload();

  // 可选音乐源
  const sources = [
    'netease', 'kuwo', 'joox', 'bilibili'
  ];

  // 可选音质
  const qualities = [128, 192, 320, 740, 999];

  // 从PlayerContext获取封面相关方法
  const { setCurrentPlaylist } = usePlayer();

  // 当搜索结果变化时，同步更新播放列表
  useEffect(() => {
    if (results && results.length > 0) {
      setCurrentPlaylist(results);
    }
  }, [results, setCurrentPlaylist]);

  const deviceInfo = useDevice();

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
          if (activeTab !== 'home') {
            handleTabChange('home');
          }
        }}
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
