import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { Container, Row, Col, Form, Button, Card, Spinner } from 'react-bootstrap';
import { FaPlay, FaPause, FaDownload } from 'react-icons/fa';
import { toast } from 'react-toastify';
import HeartButton from './components/HeartButton';
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
import { handleError, ErrorTypes, ErrorSeverity } from './utils/errorHandler';
import { adjustCacheForOffline } from './services/cacheService';
// 导入导航样式修复
import './styles/NavigationFix.css';
// 导入音频播放器样式
import './styles/AudioPlayer.css';
// 导入屏幕方向样式
import './styles/Orientation.css';

// 改为懒加载
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
  backgroundColor: '#fff3cd',
  color: '#856404',
  textAlign: 'center',
  zIndex: 1040,
  borderBottom: '1px solid #ffeeba',
  fontSize: '0.9rem',
  fontWeight: 500,
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
};

// 下载上下文
const DownloadContext = React.createContext();
const useDownloadContext = () => React.useContext(DownloadContext);

// 搜索结果项组件，使用usePlayer
const SearchResultItem = ({ track }) => {
  const { handlePlay, currentTrack, isPlaying } = usePlayer();
  const { downloading, handleDownload } = useDownloadContext();
  
  return (
    <Card className="h-100">
      <Card.Body>
        <div className="d-flex align-items-center">
          <img
            src={track.picUrl || 'default_cover.jpg'}
            alt="专辑封面"
            className="me-3 rounded"
            style={{ 
              width: '60px', 
              height: '60px',
              objectFit: 'cover',
              backgroundColor: '#f5f5f5' 
            }}
            onError={(e) => {
              e.target.src = 'default_cover.png';
            }}
          />
          <div className="text-truncate">
            <h6 className="mb-1 text-truncate">{track.name}</h6>
            <small className="text-muted d-block text-truncate">{track.artist}</small>
            <small className="text-muted d-block text-truncate">{track.album}</small>
          </div>
        </div>
        
        <div className="mt-2 d-flex justify-content-end">
          <Button 
            variant="outline-primary" 
            size="sm"
            className="me-1"
            onClick={() => handlePlay(track)}
          >
            {currentTrack?.id === track.id && isPlaying ? <FaPause /> : <FaPlay />}
          </Button>
          <HeartButton 
            track={track} 
            className="me-1" 
          />
          <Button 
            variant="outline-success" 
            size="sm"
            onClick={() => handleDownload(track)}
            disabled={downloading}
          >
            <FaDownload />
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
};

// 创建AppContent组件，将使用usePlayer的逻辑移到这里
const AppContent = () => {
  // 新增当前活动标签页状态
  const [activeTab, setActiveTab] = useState('home');
  
  // 定义handleTabChange作为useCallback包装的setActiveTab
  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
  }, []);
  
  // 获取用户认证状态
  const { isOfflineMode } = useAuth();
  
  // 使用自定义Hook管理网络状态
  const { isOnline } = useNetworkStatus({
    showToasts: true, // 显示网络状态变化的提示
    dispatchEvents: true // 分发网络状态变化事件
  });
  
  // 监听网络状态变化，调整缓存策略
  useEffect(() => {
    // 根据网络状态调整缓存策略
    adjustCacheForOffline(isOnline);
    
    // 显示网络状态变化提示
    if (isOnline) {
      console.log('网络已连接，正常模式');
    } else {
      console.log('网络已断开，离线模式');
      toast.info('您已进入离线模式，将使用缓存数据', {
        icon: '📶',
        autoClose: 3000
      });
    }
  }, [isOnline]);
  
  // 使用自定义Hook管理Firebase状态
  useFirebaseStatus({
    showToasts: true, // 显示Firebase状态变化的提示
    manualCheck: false // 自动检查
  });
  
  // 搜索相关状态
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [source, setSource] = useState('netease');
  const [quality, setQuality] = useState(999);
  const [loading, setLoading] = useState(false);
  
  // 下载相关状态
  const [downloading, setDownloading] = useState(false);
  const [currentDownloadingTrack, setCurrentDownloadingTrack] = useState(null);
  
  // 可选音乐源
  const sources = [
    'netease', 'tencent', 'tidal', 'spotify', 'ytmusic',
    'qobuz', 'joox', 'deezer', 'migu', 'kugou', 
    'kuwo', 'ximalaya', 'apple',
  ];

  // 可选音质
  const qualities = [128, 192, 320, 740, 999];

  // 从PlayerContext获取封面相关方法
  const { fetchCover, coverCache } = usePlayer();

  // 搜索处理函数
  const handleSearch = useCallback(async (e) => {
    // 阻止默认表单提交行为
    if (e) {
      e.preventDefault();
    }
    
    // 打印调试信息
    console.log('Search triggered with query:', query);
    
    // 如果离线，显示提示
    if (!isOnline) {
      handleError(
        new Error('您当前处于离线状态'),
        ErrorTypes.NETWORK,
        ErrorSeverity.WARNING,
        '您当前处于离线状态，无法搜索音乐'
      );
      return;
    }
    
    // 检查搜索词是否为空
    if (!query || query.trim() === '') {
      handleError(
        new Error('搜索关键词为空'),
        ErrorTypes.SEARCH,
        ErrorSeverity.INFO,
        '请输入搜索关键词'
      );
      return;
    }

    setLoading(true);
    try {
      // 使用当前query值进行搜索
      const searchResults = await searchMusic(query, source, 20, 1);
      
      // 为每个结果添加封面URL，使用PlayerContext的fetchCover方法
      const resultsWithCover = await Promise.all(
        searchResults.map(async (track) => {
          if (track.pic_id) {
            try {
              // 先检查PlayerContext的缓存
              const cacheKey = `${track.source}-${track.pic_id}-300`;
              if (coverCache[cacheKey]) {
                return { ...track, picUrl: coverCache[cacheKey] };
              }
              
              // 如果缓存中没有，则使用fetchCover获取
              const coverUrl = await fetchCover(track.source, track.pic_id);
              return { ...track, picUrl: coverUrl };
            } catch (error) {
              console.error('获取封面失败:', error);
              return { ...track, picUrl: 'default_cover.png' };
            }
          }
          return { ...track, picUrl: 'default_cover.png' };
        })
      );
      
      setResults(resultsWithCover);
      
      // 如果没有结果，显示提示
      if (resultsWithCover.length === 0) {
        toast.info(`未找到"${query}"的相关结果`);
      }
      
      // 添加到搜索历史
      try {
        const { addSearchHistory } = await import('./services/storage');
        addSearchHistory(query, source);
      } catch (error) {
        console.error('添加搜索历史失败:', error);
      }
      
    } catch (error) {
      handleError(
        error,
        ErrorTypes.SEARCH,
        ErrorSeverity.ERROR,
        '搜索失败，请重试'
      );
    } finally {
      setLoading(false);
    }
  }, [query, source, isOnline, fetchCover, coverCache]);

  // 处理下载
  const handleDownload = useCallback(async (track) => {
    // 如果已经在下载中，不做任何操作
    if (downloading) {
      toast.info('正在下载中，请稍候', { autoClose: 2000 });
      return;
    }
    
    // 如果离线，显示提示
    if (!isOnline) {
      handleError(
        new Error('您当前处于离线状态'),
        ErrorTypes.NETWORK,
        ErrorSeverity.WARNING,
        '您当前处于离线状态，无法下载音乐'
      );
      return;
    }
    
    try {
      setDownloading(true);
      setCurrentDownloadingTrack(track);
      
      await downloadTrack(track, quality);
      
      toast.success('下载完成', {
        autoClose: 2000,
        hideProgressBar: true
      });
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

  // 渲染首页内容
  const renderHomePage = () => {
    return (
      <Container>
        <Form onSubmit={handleSearch} className="mb-4">
          <Row className="g-2 align-items-center">
            <Col xs={12} md={6}>
              <Form.Group>
                <Form.Control
                  type="text"
                  placeholder="输入歌曲、歌手或专辑名称"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      // 直接触发搜索
                      handleSearch();
                    }
                  }}
                />
              </Form.Group>
            </Col>
            <Col xs={6} md={2}>
              <Form.Group>
                <Form.Select 
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                >
                  {sources.map((src) => (
                    <option key={src} value={src}>
                      {src}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col xs={6} md={2}>
              <Form.Group>
                <Form.Select
                  value={quality}
                  onChange={(e) => setQuality(parseInt(e.target.value))}
                >
                  {qualities.map((q) => (
                    <option key={q} value={q}>
                      {q === 999 ? '无损' : `${q}kbps`}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col xs={12} md={2}>
              <Button 
                type="submit" 
                variant="primary" 
                className="w-100" 
                disabled={loading}
              >
                {loading ? <Spinner animation="border" size="sm" /> : '搜索'}
              </Button>
            </Col>
          </Row>
        </Form>

        {results.length > 0 && (
          <Row className="g-4">
            {results.map((track) => (
              <Col key={track.id} xs={12} sm={6} md={4} lg={3}>
                <SearchResultItem track={track} />
              </Col>
            ))}
          </Row>
        )}
      </Container>
    );
  };

  // 修改renderContent函数，添加Suspense包装
  const renderContent = () => {
    // 懒加载页面的加载状态显示
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
  
  // Service Worker注册对象
  // eslint-disable-next-line no-unused-vars
  const [swRegistration, setSwRegistration] = useState(null);
  
  // 获取Service Worker注册对象
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        setSwRegistration(registration);
      });
    }
  }, []);
  
  // 尝试锁定屏幕方向为竖屏（仅在移动设备和平板上）
  useEffect(() => {
    if (deviceInfo.isMobile || deviceInfo.isTablet) {
      // 尝试锁定屏幕方向
      lockToPortrait().then(success => {
        if (success) {
          console.log('成功锁定屏幕方向为竖屏');
        } else {
          console.log('无法锁定屏幕方向，将使用备选方案');
        }
      });
    }
  }, [deviceInfo.isMobile, deviceInfo.isTablet]);

  // 初始化应用
  useEffect(() => {
    // 初始化函数
    const initialize = async () => {
      try {
        console.log("应用初始化中...");
        
        // 加载持久化的网络和区域状态
        // 网络状态已由useNetworkStatus Hook加载
      } catch (error) {
        console.error("初始化失败:", error);
      }
    };
    
    initialize();
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
        
        {/* AudioPlayer现在从PlayerContext获取所有状态 */}
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
      <PlayerProvider>
        <AppContent />
      </PlayerProvider>
    </RegionProvider>
  );
};

export default App;