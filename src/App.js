import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Container, Row, Col, Form, Button, Card, Spinner, Dropdown } from 'react-bootstrap';
import axios from 'axios';
import ReactPlayer from 'react-player';
import { FaPlay, FaPause, FaDownload, FaMusic, FaChevronDown, FaChevronUp, FaGithub, 
         FaStepBackward, FaStepForward, FaRandom, FaRetweet } from 'react-icons/fa';
import { toast } from 'react-toastify';

// 导入新添加的组件和服务
import Navigation from './components/Navigation';
import HeartButton from './components/HeartButton';
import Favorites from './pages/Favorites';
import History from './pages/History';
import { addToHistory } from './services/storage';

const API_BASE = process.env.REACT_APP_API_BASE || '/api';

const Github = () => {
  return (
    <a
      href="https://github.com/voici5986/cl_music_X"
      target="_blank"
      rel="noopener noreferrer"
      className="github-corner"
      aria-label="View source on GitHub"
    >
      <FaGithub
        size={32}
        className="text-dark"
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 1000,
          transition: 'transform 0.3s ease'
        }}
      />
    </a>
  )
}

const App = () => {
  // 新增当前活动标签页状态
  const [activeTab, setActiveTab] = useState('home');
  
  // 原有状态
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [source, setSource] = useState('netease');
  const [quality, setQuality] = useState('999');
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
  const [playedSeconds, setPlayedSeconds] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);

  const sources = [
    'netease', 'joox', 'tencent', 'tidal', 'spotify',
    'ytmusic', 'qobuz', 'deezer',
    'migu', 'kugou', 'kuwo', 'ximalaya'
  ];

  const qualities = ['128', '192', '320', '740', '999'];

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
    if (!query) return;

    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}`, {
        params: {
          types: 'search',
          source: source,
          name: query,
          count: 20,
          pages: 1
        }
      });
      // 获取结果后处理封面
      const resultsWithCover = await Promise.all(
        response.data.map(async track => ({
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
      const response = await axios.get(`${API_BASE}`, {
        params: {
          types: 'pic',
          source: source,
          id: picId,
          size: size
        }
      });

      const url = response.data.url.replace(/\\/g, '');

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

      const [urlResponse, lyricResponse] = await Promise.all([
        axios.get(API_BASE, {
          params: { types: 'url', source: track.source, id: track.id, br: quality }
        }),
        axios.get(API_BASE, {
          params: { types: 'lyric', source: track.source, id: track.lyric_id }
        })
      ]);
      console.log(urlResponse.data.size);

      const rawLyric = lyricResponse.data.lyric || '';
      const tLyric = lyricResponse.data.tlyric || '';

      setLyricData({
        rawLyric,
        tLyric,
        parsedLyric: parseLyric(rawLyric)
      });

      setPlayerUrl('');
      setIsPlaying(false);

      const response = await axios.get(`${API_BASE}`, {
        params: {
          types: 'url',
          source: track.source,
          id: track.id,
          br: quality
        }
      });

      const url = response.data?.url?.replace(/\\/g, '');
      if (!url) throw new Error('无效的音频链接');

      // 确保状态更新顺序
      setCurrentTrack(track);
      setPlayerUrl(url);
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

  // 播放下一首
  const handleNext = useCallback(async () => {
    if (!currentPlaylist || currentPlaylist.length <= 1) return;
    
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
  }, [currentPlaylist, currentIndex, playMode, playHistory, handlePlay]);
  
  // 播放上一首
  const handlePrev = useCallback(async () => {
    if (!currentPlaylist || currentPlaylist.length <= 1) return;
    
    let prevIndex;
    
    if (playMode === 'random' && playHistory.length > 1) {
      // 随机模式下使用历史记录
      const newHistory = [...playHistory];
      newHistory.pop(); // 移除当前歌曲
      prevIndex = newHistory[newHistory.length - 1]; // 获取前一首歌曲的索引
      setPlayHistory(newHistory);
    } else {
      // 顺序模式或没有历史记录时
      prevIndex = (currentIndex - 1 + currentPlaylist.length) % currentPlaylist.length;
    }
    
    const prevTrack = currentPlaylist[prevIndex];
    if (prevTrack) {
      await handlePlay(prevTrack);
    }
  }, [currentPlaylist, currentIndex, playMode, playHistory, handlePlay]);

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
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
      const response = await axios.get(`${API_BASE}`, {
        params: {
          types: 'url',
          source: track.source,
          id: track.id,
          br: quality
        }
      });

      const downloadUrl = response.data.url.replace(/\\/g, '');
      const link = document.createElement('a');
      link.href = downloadUrl;
      // link.download = `${track.name} - ${track.artist}.mp3`; //下载为mp3格式
      const extension = getFileExtension(downloadUrl);
      link.download = `${track.name} - ${track.artist}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('下载失败，请稍后重试', {
        icon: '❌',
        className: 'custom-toast error-toast'
      });
    }
  };

  // 处理文件名后缀
  const getFileExtension = (url) => {
    try {
      // 处理可能包含反斜杠的URL
      const cleanUrl = url.replace(/\\/g, '');
      const fileName = new URL(cleanUrl).pathname
        .split('/')
        .pop()
        .split(/[#?]/)[0]; // 移除可能的哈希和查询参数

      // 使用正则表达式提取后缀
      const extensionMatch = fileName.match(/\.([a-z0-9]+)$/i);
      return extensionMatch ? extensionMatch[1] : 'audio';
    } catch {
      return 'audio'; // 默认后缀
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

  // 渲染主页/搜索页的内容
  const renderHomePage = () => {
    return (
      <>
        <Form onSubmit={handleSearch} className="mb-4">
          <Row className="g-2">
            <Col md={5}>
              <Form.Control
                type="search"
                placeholder="输入歌曲名、歌手或专辑"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </Col>

            <Col md={3}>
              <Form.Select
                value={source}
                onChange={(e) => setSource(e.target.value)}
              >
                {sources.map(src => (
                  <option key={src} value={src}>{src.toUpperCase()}</option>
                ))}
              </Form.Select>
            </Col>

            <Col md={2}>
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary">
                  音质: {quality}k
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  {qualities.map(q => (
                    <Dropdown.Item key={q} onClick={() => setQuality(q)}>
                      {q}k
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </Col>

            <Col md={2}>
              <Button variant="primary" type="submit" className="w-100">
                搜索
              </Button>
            </Col>
          </Row>
        </Form>

        {loading && (
          <div className="text-center my-4">
            <Spinner animation="border" />
          </div>
        )}

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
                      disabled={loading || (currentTrack?.id === track.id && !playerUrl)}
                    >
                      {loading && currentTrack?.id === track.id ? (
                        <Spinner animation="border" size="sm" />
                      ) : currentTrack?.id === track.id ? (
                        isPlaying ? <FaPause /> : <FaPlay />
                      ) : (
                        <FaPlay />
                      )}
                    </Button>
                    <HeartButton track={track} className="me-1" />
                    <Button
                      variant="outline-success"
                      size="sm"
                      onClick={() => handleDownload(track)}
                    >
                      <FaDownload />
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </>
    );
  };

  // 根据当前活动标签渲染内容
  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return renderHomePage();
      case 'favorites':
        return <Favorites 
                 onPlay={handlePlay} 
                 currentTrack={currentTrack} 
                 isPlaying={isPlaying} 
                 onDownload={handleDownload} 
               />;
      case 'history':
        return <History 
                 onPlay={handlePlay} 
                 currentTrack={currentTrack} 
                 isPlaying={isPlaying} 
                 onDownload={handleDownload} 
               />;
      default:
        return renderHomePage();
    }
  };

  // 添加播放器渲染函数
  const renderAudioPlayer = () => {
    return (
      <div className="fixed-bottom bg-light p-3 border-top"
        style={{
          height: lyricExpanded ? '300px' : 'auto',
          boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
          zIndex: 1000
        }}
      >
        <Row className="align-items-center">
          {/* 左侧：专辑封面和歌曲信息 */}
          <Col md={3}>
            <div className="d-flex">
              {currentTrack && (
                <div className="d-flex align-items-center">
                  <img
                    src={coverCache[`${currentTrack.source}-${currentTrack.pic_id}-300`] || 'default_cover.png'}
                    alt="当前播放"
                    style={{ width: '50px', height: '50px' }}
                    className="me-2 rounded"
                  />
                  <div>
                    <h6 className="mb-0">{currentTrack.name}</h6>
                    <small className="text-muted">{currentTrack.artist}</small>
                  </div>
                </div>
              )}
            </div>
          </Col>

          {/* 中间：进度条和播放控制区域 */}
          <Col md={6}>
            {/* 进度条 */}
            <div className="d-flex align-items-center justify-content-between mb-1">
              <small className="text-muted">{formatTime(playedSeconds)}</small>
              <small className="text-muted">{formatTime(totalSeconds)}</small>
            </div>
            <div className="progress mb-2" style={{ height: '4px', cursor: 'pointer' }}
              onClick={(e) => {
                if (playerRef.current && currentTrack) {
                  const progressBar = e.currentTarget;
                  const position = (e.clientX - progressBar.getBoundingClientRect().left) / progressBar.offsetWidth;
                  playerRef.current.seekTo(position);
                }
              }}
            >
              <div 
                className="progress-bar bg-danger" 
                style={{ width: `${playProgress}%` }}
              ></div>
            </div>
            
            {/* 播放控制按钮 */}
            <div className="d-flex align-items-center justify-content-center">
              <Button
                variant="link"
                onClick={handlePrev}
                disabled={!currentTrack || currentPlaylist.length <= 1}
                className="mx-2"
              >
                <FaStepBackward />
              </Button>
              
              <Button
                variant="link"
                onClick={() => setIsPlaying(!isPlaying)}
                disabled={!currentTrack || !playerUrl}
                className="mx-2"
              >
                {!currentTrack ? (
                  <FaMusic size={24} className="text-muted" />
                ) : isPlaying ? (
                  <FaPause size={24} className="text-danger" />
                ) : (
                  <FaPlay size={24} className="text-danger" />
                )}
              </Button>
              
              <Button
                variant="link"
                onClick={handleNext}
                disabled={!currentTrack || currentPlaylist.length <= 1}
                className="mx-2"
              >
                <FaStepForward />
              </Button>
              
              <Button
                variant="link"
                onClick={handleTogglePlayMode}
                className="mx-2 text-danger"
              >
                {getPlayModeIcon()}
              </Button>
              
              {currentTrack && (
                <HeartButton 
                  track={currentTrack} 
                  size={20} 
                  variant="link"
                />
              )}
            </div>

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
              style={{ display: playerUrl ? 'block' : 'none' }} // 隐藏未初始化的播放器
            />
          </Col>

          {/* 右侧：歌词显示 */}
          <Col md={3}>
            <div className="d-flex align-items-center justify-content-end">
              {/* 当前播放歌词 */}
              <div 
                className="text-truncate mx-2" 
                style={{ maxWidth: '80%', cursor: 'pointer' }}
                onClick={() => setLyricExpanded(!lyricExpanded)}
                title={lyricExpanded ? '收起歌词' : '展开歌词'}
              >
                {lyricData.parsedLyric[currentLyricIndex] ? 
                  lyricData.parsedLyric[currentLyricIndex].text : '暂无歌词'}
              </div>
              
              <Button
                variant="link"
                onClick={() => setLyricExpanded(!lyricExpanded)}
                className="p-0"
                title={lyricExpanded ? '收起歌词' : '展开歌词'}
              >
                {lyricExpanded ? <FaChevronDown /> : <FaChevronUp />}
              </Button>
            </div>
          </Col>
        </Row>
        
        {/* 展开的歌词区域 */}
        {lyricExpanded && (
          <Row className="mt-3">
            <Col>
              <div 
                className="full-lyrics"
                ref={lyricsContainerRef}
                style={{
                  maxHeight: '250px',
                  overflowY: 'auto',
                  textAlign: 'center'
                }}
                onScroll={(e) => {
                  // 记录用户滚动行为
                  sessionStorage.setItem('userScrolled', true);
                }}
              >
                {lyricData.parsedLyric.map((line, index) => (
                  <div
                    key={index}
                    className={`lyric-line ${index === currentLyricIndex ? 'active' : ''}`}
                    data-time={line.time}
                    style={{
                      padding: '4px 0',
                      color: index === currentLyricIndex ? '#dc3545' : '#6c757d',
                      fontWeight: index === currentLyricIndex ? 'bold' : 'normal',
                      transition: 'all 0.3s'
                    }}
                  >
                    <div>{line.text}</div>
                    {lyricData.tLyric && (
                      <div className="translated-lyric" style={{ fontSize: '0.9em' }}>
                        {parseLyric(lyricData.tLyric)[index]?.text}
                      </div>
                    )}
                  </div>
                ))}
                {lyricData.parsedLyric.length === 0 && (
                  <div className="text-center text-muted py-3">暂无歌词</div>
                )}
              </div>
            </Col>
          </Row>
        )}
      </div>
    );
  };

  return (
    <div className="App">
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
      <Container 
        fluid 
        style={{ 
          paddingRight: '60px',  // 添加右侧内边距，为Github图标留出空间
          paddingBottom: lyricExpanded ? '320px' : '120px',
          transition: 'padding 0.3s ease'
        }}
      >
        {renderContent()}
      </Container>
      <Github />
      {currentTrack && renderAudioPlayer()}
      <div className="overlay-background" style={{ display: isPlaying ? 'block' : 'none' }} />
    </div>
  );
};

export default App;