import React, { useState, useEffect, useCallback, Suspense, useReducer } from 'react';
import { Container, Row, Col, Form, Button, Card, Spinner } from 'react-bootstrap';
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
import { useAuth } from './contexts/AuthContext';
import { useDevice } from './contexts/DeviceContext';
import { RegionProvider } from './contexts/RegionContext';
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
import { clearExpiredCovers } from './services/storage';
// 导入样式文件
import './styles/AudioPlayer.css';
import './styles/Orientation.css';

// 懒加载页面组件
const Favorites = React.lazy(() => import('./pages/Favorites'));
const History = React.lazy(() => import('./pages/History'));
const User = React.lazy(() => import('./pages/User'));

// 离线模式横幅样式
const offlineBannerStyle = {
  position: 'fixed',
  top: '56px',
  left: 0,
  width: '100%',
  padding: '8px 0',
  backgroundColor: 'var(--color-background-alt)',
  color: 'var(--color-text-secondary)',
  textAlign: 'center',
  zIndex: 1040,
  borderBottom: '1px solid var(--color-border)',
  fontSize: '0.9rem',
  fontWeight: 500,
  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
};

// 搜索状态管理
const searchInitialState = {
  query: '',
  results: [],
  source: 'netease',
  quality: 999,
  loading: false,
  error: null,
};

function searchReducer(state, action) {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'SEARCH_START':
      return { ...state, loading: true, error: null };
    case 'SEARCH_SUCCESS':
      return { ...state, loading: false, results: action.payload };
    case 'SEARCH_FAILURE':
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
}

// 下载上下文
const DownloadContext = React.createContext();
const useDownloadContext = () => React.useContext(DownloadContext);

// 搜索结果项组件
  const SearchResultItem = ({ track, searchResults, quality }) => {
    const { handlePlay, currentTrack, isPlaying } = usePlayer();
    const { downloading, handleDownload } = useDownloadContext();
  
    // 添加单独的播放处理函数
    const handleTrackPlay = (track) => {
      console.log('从搜索结果播放曲目:', track.id, track.name, '音质:', quality);
      // 使用当前搜索结果作为播放列表
      const trackIndex = searchResults.findIndex(item => item.id === track.id);
      handlePlay(track, trackIndex >= 0 ? trackIndex : -1, searchResults, quality);
    };

  return (
    <Card 
      className={`music-card ${currentTrack?.id === track.id ? 'is-active' : ''}`}
      onClick={() => handleTrackPlay(track)}
    >
      <div className="music-card-row">
        <div className="music-card-info">
          <h6>{track.name}</h6>
          <small>{track.artist}</small>
        </div>
        <MusicCardActions 
          track={track}
          isDownloading={downloading}
          onDownload={handleDownload}
        />
      </div>
    </Card>
  );
};

const AppContent = () => {
  const [activeTab, setActiveTab] = useState('home');

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
  }, []);

  const { isOfflineMode } = useAuth();

  const { isOnline } = useNetworkStatus({
    showToasts: true,
    dispatchEvents: true
  });

  // 使用自定义Hook管理Firebase状态
  useFirebaseStatus({
    showToasts: true,
    manualCheck: false
  });

  // 搜索相关状态
  const [searchState, dispatch] = useReducer(searchReducer, searchInitialState);
  const { query, results, source, quality, loading } = searchState;

  // 监听收藏状态变化，同步更新搜索结果中的心形图标
  useEffect(() => {
    const handleFavoritesChanged = () => {
      // 强制触发一次重新渲染以刷新 SearchResultItem 内部的 HeartButton
      dispatch({ type: 'SEARCH_SUCCESS', payload: [...results] });
    };

    window.addEventListener('favorites_changed', handleFavoritesChanged);
    return () => window.removeEventListener('favorites_changed', handleFavoritesChanged);
  }, [results]);

  // 下载相关状态
  const [downloading, setDownloading] = useState(false);
  const [currentDownloadingTrack, setCurrentDownloadingTrack] = useState(null);

  // 可选音乐源
  const sources = [
    'netease', 'kuwo', 'joox', 'bilibili'
  ];

  // 可选音质
  const qualities = [128, 192, 320, 740, 999];

  // 从PlayerContext获取封面相关方法
  const { setCurrentPlaylist } = usePlayer();

  // 搜索处理函数
  const handleSearch = useCallback(async (e) => {
    if (e) {
      e.preventDefault();
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('Search triggered with query:', query);
    }

    // 检查网络状态
    if (!checkNetworkStatus(isOnline, '搜索音乐')) {
      return;
    }

    // 验证搜索参数
    if (!validateSearchParams(query)) {
      return;
    }

    dispatch({ type: 'SEARCH_START' });
    try {
      const searchResults = await searchMusic(query, source, 20, 1);

      // 不再预先获取封面图片，只在需要时获取（例如播放时）
      // 这样可以显著减少API调用次数
      const resultsWithoutCovers = searchResults.map(track => ({ ...track }));

      dispatch({ type: 'SEARCH_SUCCESS', payload: resultsWithoutCovers });

      // 如果没有结果，显示提示
      if (resultsWithoutCovers.length === 0) {
        toast.info(`未找到"${query}"的相关结果`);
      }

      // 添加到搜索历史
      try {
        const { addSearchHistory } = await import('./services/storage');
        addSearchHistory(query, source);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('添加搜索历史失败:', error);
        }
      }

    } catch (error) {
      dispatch({ type: 'SEARCH_FAILURE', payload: error });
      handleError(
        error,
        ErrorTypes.SEARCH,
        ErrorSeverity.ERROR,
        '搜索失败，请重试'
      );
    }
  }, [query, source, isOnline]);

  // 处理下载
  const handleDownload = useCallback(async (track) => {
    // 检查是否正在下载
    if (!checkDownloadStatus(downloading)) {
      return;
    }

    // 检查网络状态
    if (!checkNetworkStatus(isOnline, '下载音乐')) {
      return;
    }

    try {
      setDownloading(true);
      setCurrentDownloadingTrack(track);

      await downloadTrack(track, quality);

    } catch (error) {
      handleError(
        error,
        ErrorTypes.DOWNLOAD,
        ErrorSeverity.ERROR,
        '下载失败，请重试'
      );
    } finally {
      setDownloading(false);
      setCurrentDownloadingTrack(null);
    }
  }, [downloading, isOnline, quality]);

  // 当搜索结果变化时，同步更新播放列表
  useEffect(() => {
    if (results && results.length > 0) {
      setCurrentPlaylist(results);
    }
  }, [results, setCurrentPlaylist]);

  // 渲染首页内容
  const renderHomePage = () => {
    return (
      <Container>
        <Form onSubmit={handleSearch} className="mb-4">
          <Row className="g-2 align-items-stretch">
            <Col xs={12} md={6}>
              <Form.Control
                type="search"
                enterKeyHint="search"
                placeholder="输入歌曲、歌手或专辑名称"
                value={query}
                onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'query', value: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    // 确保失去焦点，收起键盘
                    e.target.blur();
                    e.preventDefault();
                    handleSearch();
                  }
                }}
                style={{ height: '48px' }}
              />
            </Col>
            <Col xs={6} md={2}>
              <Form.Select
                value={source}
                onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'source', value: e.target.value })}
                style={{ height: '48px' }}
              >
                {sources.map((src) => (
                  <option key={src} value={src}>
                    {src}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col xs={6} md={2}>
              <Form.Select
                value={quality}
                onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'quality', value: parseInt(e.target.value) })}
                style={{ height: '48px' }}
              >
                {qualities.map((q) => (
                  <option key={q} value={q}>
                    {q === 999 ? '无损' : `${q}kbps`}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col xs={12} md={2}>
              <Button
                type="submit"
                variant="link"
                className="w-100 search-submit-btn"
                disabled={loading}
                style={{
                  backgroundColor: 'var(--color-background)',
                  color: 'var(--color-text-primary)',
                  borderRadius: 'var(--border-radius)',
                  padding: '0',
                  fontWeight: '600',
                  textDecoration: 'none',
                  border: '1px solid var(--color-border)',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '48px'
                }}
              >
                {loading ? <Spinner animation="border" size="sm" /> : '开始搜索'}
              </Button>
            </Col>
          </Row>
        </Form>

        {results.length > 0 && (
          <Row className="g-3">
            {results.map((track) => (
              <Col key={track.id} xs={12} md={6}>
                <SearchResultItem track={track} searchResults={results} quality={quality} />
              </Col>
            ))}
          </Row>
        )}
      </Container>
    );
  };

  // 渲染不同标签页的内容
  const renderContent = () => {
    const loadingFallback = (
      <div className="text-center my-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">加载中...</p>
      </div>
    );

    switch (activeTab) {
      case 'home':
        return renderHomePage();
      case 'favorites':
        return (
          <Suspense fallback={loadingFallback}>
            <Favorites />
          </Suspense>
        );
      case 'history':
        return (
          <Suspense fallback={loadingFallback}>
            <History />
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

  // 使用设备检测功能
  const deviceInfo = useDevice();

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

  // 下载上下文值
  const downloadContextValue = {
    downloading,
    currentDownloadingTrack,
    handleDownload
  };

  return (
    <DownloadContext.Provider value={downloadContextValue}>
      <div className="app-container">
        <OrientationPrompt />
        <Navigation
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />

        {isOfflineMode && (
          <div style={offlineBannerStyle}>
            当前处于离线模式，仅可访问已缓存的内容
          </div>
        )}

        <Container fluid className="mt-4 pb-5">
          {renderContent()}
        </Container>

        <AudioPlayer />

        <InstallPWA />
        <UpdateNotification />
        {process.env.NODE_ENV === 'development' && <DeviceDebugger />}
      </div>
    </DownloadContext.Provider>
  );
};

// 主App组件，只负责提供上下文
const App = () => {
  return (
    <RegionProvider>
      <SyncProvider>
        <PlayerProvider>
          <FavoritesProvider>
            <AppContent />
          </FavoritesProvider>
        </PlayerProvider>
      </SyncProvider>
    </RegionProvider>
  );
};

export default App;
