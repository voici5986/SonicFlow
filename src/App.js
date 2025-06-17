import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { Container, Row, Col, Form, Button, Card, Spinner } from 'react-bootstrap';
import ReactPlayer from 'react-player';
import { FaPlay, FaPause, FaDownload, FaMusic, 
         FaStepBackward, FaStepForward, FaRandom, FaRetweet } from 'react-icons/fa';
import { toast } from 'react-toastify';
// import { RiRepeatOneLine } from 'react-icons/ri';
import HeartButton from './components/HeartButton';
import Navigation from './components/Navigation';
import ProgressBar from './components/ProgressBar';
import DeviceDebugger from './components/DeviceDebugger';
import OrientationPrompt from './components/OrientationPrompt';
import InstallPWA from './components/InstallPWA';
import UpdateNotification from './components/UpdateNotification';
import { useAuth } from './contexts/AuthContext';
import { useDevice } from './contexts/DeviceContext';
import { RegionProvider } from './contexts/RegionContext';
import { addToHistory } from './services/storage';
import { lockToPortrait } from './utils/orientationManager';
import { downloadTrack } from './services/downloadService';
import { searchMusic, playMusic, getCoverImage } from './services/musicApiService';
import useNetworkStatus from './hooks/useNetworkStatus';
import useFirebaseStatus from './hooks/useFirebaseStatus';
// 导入导航样式修复
import './styles/NavigationFix.css';
// 导入音频播放器样式
import './styles/AudioPlayer.css';
// 导入屏幕方向样式
import './styles/Orientation.css';
// 导入网络状态样式
import './styles/NetworkStatus.css';

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

const App = () => {
  // 新增当前活动标签页状态
  const [activeTab, setActiveTab] = useState('home');
  
  // 定义handleTabChange作为setActiveTab的别名
  const handleTabChange = setActiveTab;
  
  // 获取用户认证状态
  const { isOfflineMode } = useAuth();
  
  // 使用自定义Hook管理网络状态
  const { isOnline } = useNetworkStatus({
    showToasts: true, // 显示网络状态变化的提示
    dispatchEvents: true // 分发网络状态变化事件
  });
  
  // 使用自定义Hook管理Firebase状态
  // eslint-disable-next-line no-unused-vars
  const { isAvailable: _isFirebaseAvailable } = useFirebaseStatus({
    showToasts: true, // 显示Firebase状态变化的提示
    manualCheck: false // 自动检查
  });
  
  // 原有状态
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [source, setSource] = useState('netease');
  const [quality, setQuality] = useState(999);
  const [loading, setLoading] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [playerUrl, setPlayerUrl] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const playerRef = useRef(null);
  const [coverCache, setCoverCache] = useState({});
  const [lyricData, setLyricData] = useState({
    rawLyric: '',
    tLyric: '',
    parsedLyric: []
  });
  const [currentLyricIndex, setCurrentLyricIndex] = useState(-1);
  const [lyricExpanded, setLyricExpanded] = useState(false);
  const lyricsContainerRef = useRef(null);

  // 修改播放器控制相关状态
  const [currentPlaylist, setCurrentPlaylist] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [playMode, setPlayMode] = useState('repeat-all'); // 'repeat-one', 'repeat-all', 'random'
  const [playHistory, setPlayHistory] = useState([]); // 随机播放模式下的播放历史
  
  // 添加播放进度相关状态
  const [playProgress, setPlayProgress] = useState(0);
  // 即使看似未使用，但实际在handleProgress函数中会被使用
  // eslint-disable-next-line no-unused-vars
  const [playedSeconds, setPlayedSeconds] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);

  // 下载相关状态
  const [downloading, setDownloading] = useState(false);
  const [currentDownloadingTrack, setCurrentDownloadingTrack] = useState(null);
  
  const sources = [
    'netease', 'joox', 'tencent', 'tidal', 'spotify',
    'korean', 'kuwo', 'migu', 'kugou', 'qq',
  ];

  const qualities = [128, 192, 320, 740, 999];

  const parseLyric = (text) => {
    const lines = text.split('\n');
    const pattern = /\[(\d+):(\d+\.\d+)\]/;
    
    return lines.map(line => {
      const match = line.match(pattern);
      if (match) {
        const minutes = parseFloat(match[1]);
        const seconds = parseFloat(match[2]);
        return {
          time: minutes * 60 + seconds,
          text: line.replace(match[0], '').trim()
        };
      }
      return null;
    }).filter(Boolean);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    
    // 如果离线，显示提示
    if (!isOnline) {
      toast.error('您当前处于离线状态，无法搜索音乐');
      return;
    }
    
    if (!query) {
      toast.warning('请输入搜索关键词');
      return;
    }

    setLoading(true);
    try {
      // 使用新的musicApiService进行搜索
      const searchResults = await searchMusic(query, source, 20, 1);
      
      // 获取结果后处理封面
      const resultsWithCover = await Promise.all(
        searchResults.map(async track => ({
          ...track,
          picUrl: await fetchCover(track.source, track.pic_id)
        }))
      );
      
      setResults(resultsWithCover);
    } catch (error) {
      console.error('Search error:', error);
      toast.error('搜索失败，请稍后重试', {
        icon: '❌',
        className: 'custom-toast error-toast'
      });
    }
    setLoading(false);
  };
  
const fetchCover = async (source, picId, size = 300) => {
  const cacheKey = `${source}-${picId}-${size}`;
  
  // 检查缓存
  if (coverCache[cacheKey]) return coverCache[cacheKey];

  try {
    // 使用新的API服务获取封面
    const url = await getCoverImage(source, picId, size);
    
    // 更新缓存
    setCoverCache(prev => ({
      ...prev,
      [cacheKey]: url
    }));
    
    return url;
  } catch (error) {
    console.error('封面获取失败:', error);
    return 'default_cover.jpg'; 
  }
};

  const handlePlay = useCallback(async (track) => {
    if (currentTrack?.id === track.id) {
      setIsPlaying(!isPlaying);
      return;
    }

    try {
      // 设置当前播放列表和索引
      let playlist = [];
      let index = -1;
      
      // 根据当前活动标签页判断播放列表来源
      if (activeTab === 'home') {
        playlist = [...results];
      } else if (activeTab === 'favorites') {
        // 如果是从收藏页面播放，则获取收藏列表
        const getFavorites = async () => {
          try {
            const { getFavorites } = await import('./services/storage');
            return await getFavorites();
          } catch (error) {
            console.error('获取收藏列表失败:', error);
            return [];
          }
        };
        
        const favorites = await getFavorites();
        if (favorites && favorites.length > 0) {
          playlist = favorites;
        } else {
          playlist = [track];
        }
      } else if (activeTab === 'history') {
        // 如果是从历史记录页面播放，则获取历史记录
        const getHistory = async () => {
          try {
            const { getHistory } = await import('./services/storage');
            const history = await getHistory();
            return history.map(item => item.song);
          } catch (error) {
            console.error('获取历史记录失败:', error);
            return [];
          }
        };
        
        const historyTracks = await getHistory();
        if (historyTracks && historyTracks.length > 0) {
          playlist = historyTracks;
        } else {
          playlist = [track];
        }
      }
      
      // 如果列表为空，将当前歌曲作为唯一项
      if (playlist.length === 0) {
        playlist = [track];
      }
      
      // 查找歌曲在播放列表中的索引
      index = playlist.findIndex(item => item.id === track.id);
      if (index === -1) {
        // 如果在列表中找不到，添加到列表并设置索引
        playlist.push(track);
        index = playlist.length - 1;
      }
      
      setCurrentPlaylist(playlist);
      setCurrentIndex(index);
      setPlayHistory([index]);

      // 使用新的musicApiService获取音频URL和歌词
      setIsPlaying(false);
      setPlayerUrl('');
      
      // 调用播放服务获取所有所需数据
      const musicData = await playMusic(track, quality);
      
      // 处理歌词
      setLyricData({
        rawLyric: musicData.lyrics.raw,
        tLyric: musicData.lyrics.translated,
        parsedLyric: parseLyric(musicData.lyrics.raw)
      });
      
      // 更新播放状态
      setCurrentTrack(track);
      setPlayerUrl(musicData.url);
      setIsPlaying(true);
      
      // 添加到播放历史
      addToHistory(track);

    } catch (error) {
      console.error('Play error:', error);
      setIsPlaying(false);
      setPlayerUrl('');
      toast.warning('当前音频无效不可用', {
        icon: '⚠️',
        className: 'custom-toast warning-toast'
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, results, quality, currentTrack, isPlaying]);

  // 添加检查播放列表是否有效的函数
  const isPlaylistValid = useCallback(() => {
    return currentPlaylist && currentPlaylist.length > 1;
  }, [currentPlaylist]);

  // 优化handleNext函数
  const handleNext = useCallback(async () => {
    if (!isPlaylistValid()) return;
    
    let nextIndex;
    
    if (playMode === 'random') {
      // 随机模式：生成一个不在最近播放历史中的随机索引
      let randomPool = [];
      for (let i = 0; i < currentPlaylist.length; i++) {
        // 最近播放过的歌曲(保留最后一个作为当前歌曲)不进入随机池
        if (!playHistory.slice(0, -1).includes(i)) {
          randomPool.push(i);
        }
      }
      
      // 如果随机池为空（已经播放了所有歌曲），则重置历史
      if (randomPool.length === 0) {
        randomPool = Array.from(Array(currentPlaylist.length).keys());
        randomPool = randomPool.filter(i => i !== currentIndex);
        setPlayHistory([currentIndex]);
      }
      
      // 从随机池中选择一个索引
      const randomIdx = Math.floor(Math.random() * randomPool.length);
      nextIndex = randomPool[randomIdx];
      
      // 更新播放历史
      setPlayHistory(prev => [...prev, nextIndex]);
    } else {
      // 顺序模式：直接取下一首
      nextIndex = (currentIndex + 1) % currentPlaylist.length;
    }
    
    const nextTrack = currentPlaylist[nextIndex];
    if (nextTrack) {
      await handlePlay(nextTrack);
    }
  }, [currentPlaylist, currentIndex, playMode, playHistory, handlePlay, isPlaylistValid]);
  
  // 优化handlePrevious函数
  const handlePrevious = useCallback(async () => {
    if (!isPlaylistValid()) return;
    
    // 计算上一首歌的索引
    let newIndex;
    if (playMode === 'random') {
      // 随机模式下，返回到播放历史中的上一首
      if (playHistory.length > 1) {
        // 移除当前歌曲
        const newHistory = [...playHistory];
        newHistory.pop();
        // 获取历史中的上一首
        const prevTrack = newHistory[newHistory.length - 1];
        // 更新历史
        setPlayHistory(newHistory);
        // 找到该歌曲在播放列表中的索引
        newIndex = currentPlaylist.findIndex(track => track.id === prevTrack.id);
        if (newIndex === -1) newIndex = 0; // 如果找不到，默认第一首
      } else {
        // 如果没有历史，随机选择一首
        newIndex = Math.floor(Math.random() * currentPlaylist.length);
      }
    } else {
      // 顺序模式下，简单地选择上一首
      newIndex = (currentIndex - 1 + currentPlaylist.length) % currentPlaylist.length;
    }
    
    // 播放选定的歌曲
    if (newIndex >= 0 && newIndex < currentPlaylist.length) {
      setCurrentIndex(newIndex);
      await handlePlay(currentPlaylist[newIndex]);
    }
  }, [currentPlaylist, currentIndex, playMode, playHistory, handlePlay, isPlaylistValid]);

  // 处理歌曲结束事件
  const handleEnded = useCallback(() => {
    switch (playMode) {
      case 'repeat-one':
        // 单曲循环：重新播放当前歌曲
        if (playerRef.current) {
          playerRef.current.seekTo(0);
          setIsPlaying(true);
        }
        break;
      case 'random':
        // 随机模式：自动播放下一首（随机选择）
        handleNext();
        break;
      default:
        // 列表循环：自动播放下一首
        handleNext();
        break;
    }
  }, [playMode, handleNext]);

  // 切换播放模式
  const handleTogglePlayMode = () => {
    setPlayMode(current => {
      const nextMode = (() => {
        switch (current) {
          case 'repeat-all': return 'repeat-one';
          case 'repeat-one': return 'random';
          case 'random': default: return 'repeat-all';
        }
      })();
      
      // 移除弹窗提醒
      return nextMode;
    });
  };
  
  // 获取当前播放模式图标
  const getPlayModeIcon = () => {
    switch (playMode) {
      case 'repeat-one':
        return (
          <div className="position-relative" style={{ width: "24px", height: "24px", display: "inline-block" }} title="单曲循环">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 7H17V10L21 6L17 2V5H5V11H7V7Z" fill="currentColor"/>
              <path d="M17 17H7V14L3 18L7 22V19H19V13H17V17Z" fill="currentColor"/>
              <text x="12" y="15" fontSize="9" fontWeight="bold" fill="currentColor" textAnchor="middle">1</text>
            </svg>
          </div>
        );
      case 'random':
        return <FaRandom size={18} title="随机播放" />;
      default: // repeat-all
        return <FaRetweet size={18} title="列表循环" />;
    }
  };

  const useThrottle = (callback, delay) => {
    const lastCall = useRef(0);
    
    return useCallback((...args) => {
      const now = new Date().getTime();
      if (now - lastCall.current >= delay) {
        lastCall.current = now;
        callback(...args);
      }
    }, [callback, delay]);
  };

  // 格式化时间显示
  const formatTime = (seconds) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  // 修改handleProgress处理进度更新
  const handleProgress = useThrottle((state) => {
    const currentTime = state.playedSeconds;
    const duration = state.loadedSeconds > 0 ? playerRef.current?.getDuration() || 0 : 0;
    
    // 更新播放进度
    setPlayProgress(duration > 0 ? (currentTime / duration) * 100 : 0);
    setPlayedSeconds(currentTime);
    setTotalSeconds(duration);
    
    // 更新歌词显示
    const lyrics = lyricData.parsedLyric;
    
    let newIndex = -1;
    for (let i = lyrics.length - 1; i >= 0; i--) {
      if (currentTime >= lyrics[i].time) {
        newIndex = i;
        break;
      }
    }
  
    if (newIndex !== currentLyricIndex) {
      setCurrentLyricIndex(newIndex);
    }
  }, 500); // 节流500ms

  const handleDownload = async (track) => {
    try {
      setDownloading(true); // 添加下载状态
      setCurrentDownloadingTrack(track);
      
      // 使用下载服务模块处理下载
      await downloadTrack(
        track, 
        quality, 
        () => {
          // 下载开始回调，这里已经设置了状态，无需额外操作
        },
        () => {
          // 下载结束回调
          setDownloading(false);
          setCurrentDownloadingTrack(null);
        }
      );
    } catch (error) {
      console.error('Download error:', error);
      toast.error('下载失败，请稍后重试', {
        icon: '❌',
        duration: 3000
      });
      setDownloading(false);
      setCurrentDownloadingTrack(null);
    }
  };

  // 添加滚动效果
  useEffect(() => {
    if (lyricExpanded && currentLyricIndex >= 0 && lyricsContainerRef.current) {
      const activeLines = lyricsContainerRef.current.getElementsByClassName('active');
      if (activeLines.length > 0) {
        activeLines[0].scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
      }
    }
  }, [currentLyricIndex, lyricExpanded]);

  // 渲染加载中状态
  // eslint-disable-next-line no-unused-vars
  const renderLoader = () => {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" />
        <p className="mt-3">加载中...</p>
      </div>
    );
  };

  // 渲染主页/搜索页的内容
  const renderHomePage = () => {
  return (
      <Container className="my-4">
      <Form onSubmit={handleSearch} className="mb-4">
          <Row className="align-items-end g-2">
            <Col xs={12} md={6}>
              <Form.Group>
            <Form.Control
                  type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
                  placeholder="输入歌曲名、艺术家或专辑"
                  autoFocus
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
              <Button type="submit" variant="primary" className="w-100" disabled={loading}>
                {loading ? <Spinner animation="border" size="sm" /> : '搜索'}
            </Button>
          </Col>
        </Row>
      </Form>

        {results.length > 0 && (
          <Row className="g-4">
        {results.map((track) => (
              <Col key={track.id} xs={12} sm={6} md={4} lg={3}>
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
                        disabled={currentTrack?.id === track.id && !currentTrack?.url}
                      >
                        {currentTrack?.id === track.id && isPlaying ? <FaPause /> : <FaPlay />}
                      </Button>
                        <HeartButton 
                          track={track} 
                        className="me-1" 
                          onFavoritesChange={() => {
                            // 如果当前在收藏页面，刷新收藏列表
                            if (activeTab === 'favorites') {
                              loadFavorites();
                            }
                          }}
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
            <Favorites onPlay={handlePlay} />
          </Suspense>
        );
      case 'history':
        return (
          <Suspense fallback={loadingFallback}>
            <History onPlay={handlePlay} />
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

  // 在App组件中添加loadFavorites函数
  const loadFavorites = async () => {
    if (activeTab === 'favorites') {
      // 通知Favorites组件重新加载数据
      // 这里通过事件总线或其他方式通知，或者在Favorites组件中处理
      // 这个示例中我们将简单地重新设置activeTab来触发Favorites组件重新渲染
      setActiveTab('temp');
      setTimeout(() => setActiveTab('favorites'), 10);
    }
  };

  // 优化renderAudioPlayer函数
  const renderAudioPlayer = () => {
    // 如果没有当前音轨，不渲染任何内容
    if (!currentTrack) return null;
    
    // 增加播放器展开状态的类名
    const playerClassName = `audio-player ${lyricExpanded ? 'expanded' : 'collapsed'}`;
    
    return (
      <>
        {/* 背景遮罩 - 仅在展开状态显示 */}
        <div className={`player-backdrop ${lyricExpanded ? 'visible' : ''}`} 
             onClick={() => setLyricExpanded(false)}></div>
        
        <div className={playerClassName}>
          {/* 添加内部容器以控制溢出 */}
          <div className="player-inner">
            <div className="player-content">
              {/* 基础播放控制区域 - 在收起和展开状态都显示 */}
              <Row className="align-items-center player-info-controls">
          {/* 左侧：歌曲信息 */}
                <Col xs={6} md={3} className="d-flex align-items-center mb-2 mb-md-0">
              <div className="d-flex align-items-center">
                <img 
                  src={coverCache[`${currentTrack.source}-${currentTrack.pic_id}-300`] || 'default_cover.png'}
                  alt="当前播放"
                  style={{ width: '50px', height: '50px' }}
                  className="me-2 rounded"
                />
                <div>
                      <h6 className="mb-0 text-truncate" style={{maxWidth: 'calc(30vw - 20px)'}}>{currentTrack.name}</h6>
                      <small className="text-muted text-truncate" style={{maxWidth: 'calc(30vw - 20px)', display: 'block'}}>{currentTrack.artist}</small>
                </div>
              </div>
          </Col>
          
                {/* 移动端和平板：进度条在歌曲信息右侧 */}
                <Col xs={6} className="d-flex d-md-none align-items-center">
                  <div className="mobile-progress-container">
              <ProgressBar 
                currentTrack={currentTrack}
                playProgress={playProgress}
                totalSeconds={totalSeconds}
                playerRef={playerRef}
                formatTime={formatTime}
                      deviceType={deviceInfo.deviceType}
              />
            </div>
                </Col>
            
                {/* 中间空白区域 - 仅在桌面端显示 */}
                <Col md={6} className="d-none d-md-block">
                  {/* 此区域故意留空，为进度条底部定位留出空间 */}
                </Col>
                
                {/* 右侧：播放控制 */}
                <Col xs={12} md={3} className="d-flex justify-content-center justify-content-md-end mt-2 mt-md-0 control-buttons-container">
                  {/* 歌词切换按钮 */}
                  <Button
                    variant="link"
                    onClick={() => setLyricExpanded(!lyricExpanded)}
                    className="p-2 control-button text-info control-icon-btn"
                    aria-label={lyricExpanded ? "收起歌词" : "展开歌词"}
                    title={lyricExpanded ? "收起歌词" : "展开歌词"}
                  >
                    <span style={{ 
                      fontWeight: 'bold', 
                      fontSize: '1.1rem',
                      fontFamily: 'SimSun, "宋体", serif' 
                    }}>
                      词
                    </span>
                  </Button>
                  
                  {currentTrack && (
                    <HeartButton 
                      track={currentTrack} 
                      size={20} 
                      variant="link"
                      className="p-2 control-button control-icon-btn" 
                      onFavoritesChange={loadFavorites}
                    />
                  )}
                  
              <Button 
                variant="link" 
                onClick={handlePrevious}
                disabled={!currentTrack || currentPlaylist.length <= 1}
                className="mx-1 p-2 control-button text-secondary control-icon-btn" 
                aria-label="上一首"
              >
                <FaStepBackward size={20} />
              </Button>
              
              <Button
                variant="link"
                onClick={() => setIsPlaying(!isPlaying)}
                disabled={!currentTrack || !playerUrl}
                className="mx-1 p-1 control-button control-icon-btn" 
                aria-label={isPlaying ? "暂停" : "播放"}
              >
                {!currentTrack ? 
                  <FaMusic size={24} className="text-muted" /> 
                 : isPlaying ? 
                  <FaPause size={24} className="text-primary" />
                 : 
                  <FaPlay size={24} className="text-primary" />
                }
              </Button>
              
              <Button 
                variant="link" 
                onClick={handleNext}
                disabled={!currentTrack || currentPlaylist.length <= 1}
                className="mx-1 p-2 control-button text-secondary control-icon-btn" 
                aria-label="下一首"
              >
                <FaStepForward size={20} />
              </Button>
              
              <Button
                variant="link"
                onClick={handleTogglePlayMode}
                className="mx-1 p-2 text-secondary control-button control-icon-btn" 
                aria-label="播放模式"
              >
                {getPlayModeIcon()}
              </Button>
              
              {/* 添加下载按钮 */}
              {currentTrack && (
                <Button
                  variant="link"
                  onClick={() => handleDownload(currentTrack)}
                  className="mx-1 p-2 text-success control-button control-icon-btn" 
                  aria-label="下载"
                  title="下载歌曲"
                  disabled={downloading && currentDownloadingTrack?.id === currentTrack.id}
                >
                  {downloading && currentDownloadingTrack?.id === currentTrack.id ? 
                    <Spinner animation="border" size="sm" /> : 
                    <FaDownload size={20} />
                  }
                </Button>
              )}
                </Col>
              </Row>
              
              {/* 桌面端：进度条和时间 - 绝对定位在底部 */}
              {deviceInfo.isDesktop && (
                <div className="d-none d-md-block progress-control-container">
                  {/* 收起状态下的单行歌词显示 */}
                  {!lyricExpanded && currentTrack && (
                    <div className="current-lyric-line text-left">
                      {lyricData.parsedLyric.length > 0 && currentLyricIndex >= 0 ? 
                        lyricData.parsedLyric[currentLyricIndex]?.text || "暂无歌词" 
                        : "暂无歌词"}
            </div>
                  )}
                  <div className="d-flex align-items-center">
                    <div className="progress-bar-container">
                      <ProgressBar 
                        currentTrack={currentTrack}
                        playProgress={playProgress}
                        totalSeconds={totalSeconds}
                        playerRef={playerRef}
                        formatTime={formatTime}
                        deviceType={deviceInfo.deviceType}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 恢复ReactPlayer组件 */}
            <ReactPlayer
              ref={playerRef}
              onProgress={handleProgress}
              url={playerUrl}
              playing={isPlaying}
              onReady={() => console.log('播放器就绪')}
              onError={(e) => {
                console.error('播放错误:', e);
                setIsPlaying(false);
              }}
              onEnded={handleEnded}
              config={{ file: { forceAudio: true } }}
              height={0}
                style={{ display: playerUrl ? 'block' : 'none' }} 
            />

              {/* 展开状态下的额外内容 */}
              {lyricExpanded && currentTrack && (
                <div className="player-expanded-view">
                  {/* 左侧：大封面 */}
                  <img 
                    src={coverCache[`${currentTrack.source}-${currentTrack.pic_id}-300`] || 'default_cover.png'}
                    alt="专辑封面"
                    className="album-cover-large"
                  />
                  
                  {/* 右侧：详细信息和歌词 */}
                  <div className="track-info-expanded">
                    <h2>{currentTrack.name}</h2>
                    <h4>{currentTrack.artist} - {currentTrack.album}</h4>
          
                    {/* 歌词滚动区域 */}
            <div 
                      className="lyrics-scroll-container" 
            ref={lyricsContainerRef}
            onScroll={(e) => {
              sessionStorage.setItem('userScrolled', true);
            }}
            >
                      {lyricData.parsedLyric.length > 0 ? (
                        lyricData.parsedLyric.map((line, index) => (
              <div
                key={index}
                className={`lyric-line ${index === currentLyricIndex ? 'active' : ''} ${index === currentLyricIndex + 1 ? 'next-active' : ''}`}
                data-time={line.time}
                    style={{
                              padding: '8px 0',
                      color: index === currentLyricIndex ? '#333333' : (index === currentLyricIndex + 1 ? '#666666' : '#999999'),
                      fontWeight: index === currentLyricIndex ? '500' : 'normal',
                      transition: 'all 0.3s'
                    }}
              >
                  <div>{line.text}</div>
                  {lyricData.tLyric && (
                              <div className="translated-lyric" style={{ fontSize: '0.9em', marginTop: '4px' }}>
                      {parseLyric(lyricData.tLyric)[index]?.text}
                    </div>
                  )}
                </div>
                        ))
                      ) : (
                        <div className="text-center text-muted py-5">暂无歌词</div>
              )}
                </div>
                  </div>
                </div>
        )}
      </div>
          </div>
        </div>
      </>
    );
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
    // ... existing code ...
    
    // 初始化函数
    const initialize = async () => {
      try {
        console.log("应用初始化中...");
        
        // 加载持久化的网络和区域状态
        // 网络状态已由useNetworkStatus Hook加载
        
        // ... existing code ...
        
        // setIsInitialized(true);
        // setIsLoading(false);
      } catch (error) {
        console.error("初始化失败:", error);
        // setIsLoading(false);
      }
    };
    
    initialize();
    
    // ... existing code ...
  }, []);

  return (
    <RegionProvider>
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
        
        {currentTrack && renderAudioPlayer()}
        
        <InstallPWA />
        <UpdateNotification />
        {process.env.NODE_ENV === 'development' && <DeviceDebugger />}
      </div>
    </RegionProvider>
  );
};

export default App;