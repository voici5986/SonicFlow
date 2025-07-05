import React, { useEffect, useCallback, memo, useMemo, useState } from 'react';
import { Row, Col, Button, Spinner } from 'react-bootstrap';
import ReactPlayer from 'react-player';
import { FaPlay, FaPause, FaDownload, FaMusic, 
         FaStepBackward, FaStepForward, FaRandom, FaRetweet, FaTimes } from 'react-icons/fa';
import HeartButton from './HeartButton';
import ProgressBar from './ProgressBar';
import '../styles/AudioPlayer.css';
import { usePlayer } from '../contexts/PlayerContext';
import { useDevice } from '../contexts/DeviceContext';
import { handleError, ErrorTypes, ErrorSeverity } from '../utils/errorHandler';

/**
 * 专辑封面组件
 * 封装专辑封面的渲染逻辑，减少代码重复
 */
const AlbumCover = ({ track, coverCache, size = 'small', onClick, className = '' }) => {
  const imgSrc = coverCache[`${track.source}-${track.pic_id}-300`] || '/default_cover.png';
  
  return (
    <img 
      src={imgSrc}
      alt={size === 'small' ? "当前播放" : "专辑封面"}
      className={`${className} ${size === 'small' ? 'player-thumbnail rounded me-2' : 'album-cover-large'}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      onError={(e) => {
        e.target.onerror = null;
        e.target.src = '/default_cover.png';
      }}
    />
  );
};

/**
 * 歌词切换按钮组件
 * 封装歌词展开/收起按钮的逻辑，减少代码重复
 */
const LyricToggleButton = ({ expanded, onToggle, className = '', variant = 'link', iconOnly = true, customIcon = null }) => {
  return (
    <Button
      variant={variant}
      onClick={onToggle}
      className={`${className} control-button`}
      aria-label={expanded ? "收起歌词" : "展开歌词"}
      title={expanded ? "收起歌词" : "展开歌词"}
    >
      {customIcon ? (
        customIcon
      ) : iconOnly ? (
        <img 
          src="/lyric.svg" 
          alt="歌词" 
          width="20" 
          height="20" 
          className="lyric-icon"
        />
      ) : (
        expanded ? "收起歌词" : "展开歌词"
      )}
    </Button>
  );
};

/**
 * 单行歌词显示组件
 * 封装收起状态下的单行歌词显示逻辑
 */
const SingleLineLyric = ({ currentLyricText, onToggle }) => {
  return (
    <div 
      onClick={onToggle} 
      style={{ 
        cursor: 'pointer',
        width: '100%',
        textAlign: 'left',
        color: '#555',
        fontSize: '0.95rem',
        marginBottom: '5px',
        padding: '5px 0',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        transition: 'color 0.3s ease',
        position: 'relative',
        bottom: '5px'
      }}
    >
      {currentLyricText || "暂无歌词"}
    </div>
  );
};

/**
 * 歌词行组件
 * 封装歌词行的渲染逻辑，减少代码重复
 */
const LyricLine = ({ line, index, isActive, isNextActive }) => {
  return (
    <div
      key={index}
      className={`lyric-line ${isActive ? 'active' : ''} ${isNextActive ? 'next-active' : ''}`}
      data-time={line.time}
      data-index={index}
      style={{
        padding: isActive ? '10px 15px 10px 20px' : '8px 8px 8px 10px',
        textAlign: 'left',
        width: '100%',
        maxWidth: '100%',
        wordBreak: 'break-word',
        whiteSpace: 'normal',
        overflow: 'hidden',
        boxSizing: 'border-box',
        backgroundColor: 'transparent',
        borderLeft: isActive ? '3px solid #dc3545' : 'none',
        transition: 'none',
        fontWeight: isActive ? '600' : 'normal',
        fontSize: isActive ? '1.15rem' : '1rem',
        color: isActive ? '#222222' : '#999999',
        borderRadius: 0,
        boxShadow: 'none',
        marginBottom: '5px',
        position: 'relative',
        left: isActive ? '10px' : '0'
      }}
    >
      <div style={{ 
        width: '100%', 
        maxWidth: '100%', 
        wordBreak: 'break-word',
        letterSpacing: isActive ? '0.01em' : 'normal'
      }}>
        {line.text}
      </div>
      {line.translatedText && (
        <div style={{ 
          width: '100%', 
          maxWidth: '100%', 
          wordBreak: 'break-word', 
          paddingLeft: 0,
          color: isActive ? '#555' : '#888',
          fontSize: isActive ? '0.95rem' : '0.9rem',
          fontWeight: isActive ? '500' : 'normal'
        }} className="translated-lyric">
          {line.translatedText}
        </div>
      )}
    </div>
  );
};

/**
 * 虚拟滚动歌词组件
 * 封装虚拟滚动歌词的渲染逻辑，减少代码重复
 */
const VirtualizedLyrics = ({ processedLyrics, visibleRange, lyricLineHeight, currentLyricIndex }) => {
  // 如果没有歌词，显示提示
  if (!processedLyrics || processedLyrics.length === 0) {
    return <div className="text-center text-muted py-5">暂无歌词</div>;
  }
  
  // 计算占位元素高度
  const placeholderHeight = visibleRange.start * lyricLineHeight;
  const bottomPlaceholderHeight = Math.max(0, (processedLyrics.length - visibleRange.end) * lyricLineHeight);
  
  return (
    <div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      {placeholderHeight > 0 && (
        <div style={{ height: `${placeholderHeight}px` }}></div>
      )}
      
      {processedLyrics.slice(visibleRange.start, visibleRange.end).map((line, virtualIndex) => {
        const index = visibleRange.start + virtualIndex;
        const isActive = index === currentLyricIndex;
        const isNextActive = index === currentLyricIndex + 1;
        
        return (
          <LyricLine
            key={index}
            line={line}
            index={index}
            isActive={isActive}
            isNextActive={isNextActive}
          />
        );
      })}
      
      {bottomPlaceholderHeight > 0 && (
        <div style={{ height: `${bottomPlaceholderHeight}px` }}></div>
      )}
    </div>
  );
};

/**
 * 播放控制按钮组件
 * 封装播放控制按钮的通用逻辑，减少代码重复
 */
const PlayerControlButton = ({ 
  onClick, 
  disabled = false, 
  className = '', 
  ariaLabel = '', 
  title = '',
  children
}) => {
  return (
    <Button
      variant="link"
      onClick={onClick}
      disabled={disabled}
      className={`control-button control-icon-btn ${className}`}
      aria-label={ariaLabel}
      title={title}
    >
      {children}
    </Button>
  );
};

/**
 * 响应式进度条组件
 * 封装进度条的通用逻辑，适应不同设备类型
 */
const ResponsiveProgressBar = ({ isMobile = false }) => {
  return (
    <div className={isMobile ? "mobile-progress-container" : "progress-control-container"} style={isMobile ? {} : { bottom: '0', marginBottom: '8px' }}>
      <div className="progress-bar-container" style={{ position: 'relative', zIndex: 5 }}>
        <ProgressBar />
      </div>
    </div>
  );
};

/**
 * 音频播放器组件
 * 负责音乐播放、控制、歌词显示等功能
 * 使用PlayerContext获取状态和方法
 */
const AudioPlayer = () => {
  // 从PlayerContext获取所有需要的状态和方法
  const {
  // 播放器状态
  currentTrack,
  playerUrl,
  isPlaying,
  lyricExpanded,
  lyricData,
  currentLyricIndex,
  playMode,
  downloading,
  currentDownloadingTrack,
  coverCache,
  currentPlaylist,
  
    // 方法
  setIsPlaying,
  // eslint-disable-next-line no-unused-vars
  setTotalSeconds,
    togglePlay,
    toggleLyric,
  handleProgress,
  handleEnded,
  handlePrevious,
  handleNext,
  handleTogglePlayMode,
  
  // 引用
  playerRef,
  lyricsContainerRef,
  
  // 工具函数
  parseLyric
  } = usePlayer();

  // 获取设备信息
  const deviceInfo = useDevice();

  // 为虚拟滚动添加的状态
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });
  const [userScrolled, setUserScrolled] = useState(false);
  const [containerHeight, setContainerHeight] = useState(0);
  const [lyricLineHeight, setLyricLineHeight] = useState(40); // 估计的行高
  
  // 设置MediaSession API
  useEffect(() => {
    if (!currentTrack || !playerUrl) return;

    // 检查浏览器是否支持MediaSession API
    if ('mediaSession' in navigator) {
      // 设置媒体会话元数据
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.name,
        artist: currentTrack.artist,
        album: currentTrack.album || '',
        artwork: [
          {
            src: coverCache[`${currentTrack.source}-${currentTrack.pic_id}-300`] || '/default_cover.png',
            sizes: '300x300',
            type: 'image/png'
          }
        ]
      });

      // 设置媒体控制处理程序 - 直接操作ReactPlayer实例，避免状态不同步
      navigator.mediaSession.setActionHandler('play', () => {
        if (playerRef.current) {
          // 修复：直接修改状态而不是调用方法，防止触发多个播放实例
          if (!isPlaying) {
            console.log("MediaSession: play直接设置状态");
            setIsPlaying(true);
          }
        }
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        if (playerRef.current) {
          // 修复：直接修改状态而不是调用方法，防止触发多个播放实例
          if (isPlaying) {
            console.log("MediaSession: pause直接设置状态");
            setIsPlaying(false);
          }
        }
      });

      // 如果播放列表中有多首歌曲，添加上一首/下一首控制
      if (currentPlaylist && currentPlaylist.length > 1) {
        navigator.mediaSession.setActionHandler('previoustrack', handlePrevious);
        navigator.mediaSession.setActionHandler('nexttrack', handleNext);
      } else {
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
      }

      // 设置播放位置更新
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (playerRef.current && details.seekTime) {
          playerRef.current.seekTo(details.seekTime);
        }
      });
    }
    
    // 清理函数
    return () => {
      if ('mediaSession' in navigator) {
        // 清除所有处理程序
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
        navigator.mediaSession.setActionHandler('seekto', null);
      }
    };
  }, [currentTrack, playerUrl, coverCache, currentPlaylist, setIsPlaying, handlePrevious, handleNext, playerRef, isPlaying]);

  // 更新媒体会话播放状态
  useEffect(() => {
    if ('mediaSession' in navigator) {
      if (isPlaying) {
        navigator.mediaSession.playbackState = 'playing';
      } else {
        navigator.mediaSession.playbackState = 'paused';
      }
    }
  }, [isPlaying]);
  
  // 预处理歌词数据
  const processedLyrics = useMemo(() => {
    if (!lyricData || !lyricData.parsedLyric) return [];
    
    // 获取翻译歌词
    const translatedLines = lyricData.tLyric ? parseLyric(lyricData.tLyric) : [];
    
    // 合并原始歌词和翻译
    return lyricData.parsedLyric.map((line, index) => ({
      ...line,
      translatedText: translatedLines[index]?.text || ''
    }));
  }, [lyricData, parseLyric]);
  
  // 计算容器高度和行高
  useEffect(() => {
    if (lyricExpanded && lyricsContainerRef.current) {
      // 设置一个短暂的延迟，确保DOM元素已完全渲染
      setTimeout(() => {
        // 获取容器高度
        setContainerHeight(lyricsContainerRef.current.clientHeight);
        
        // 尝试获取实际行高
        const lines = lyricsContainerRef.current.getElementsByClassName('lyric-line');
        if (lines.length > 0) {
          setLyricLineHeight(lines[0].clientHeight || 40);
        }
      }, 300);
    }
  }, [lyricExpanded, processedLyrics.length, lyricsContainerRef]);
  
  // 计算可见歌词范围
  useEffect(() => {
    if (lyricExpanded && currentLyricIndex >= 0 && lyricsContainerRef.current && !userScrolled) {
      // 设置一个短暂的延迟，确保DOM已更新
      setTimeout(() => {
        if (!lyricsContainerRef.current) return;
        
        // 计算应显示的歌词范围
        const buffer = Math.floor(containerHeight / lyricLineHeight / 2);
        const start = Math.max(0, currentLyricIndex - buffer);
        const end = Math.min(processedLyrics.length, currentLyricIndex + buffer * 2);
        
        setVisibleRange({ start, end });
        
        // 滚动到当前歌词位置
      const activeLines = lyricsContainerRef.current.getElementsByClassName('active');
      if (activeLines.length > 0) {
        activeLines[0].scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
      }
      }, 50);
    }
  }, [currentLyricIndex, lyricExpanded, containerHeight, lyricLineHeight, processedLyrics.length, userScrolled, lyricsContainerRef]);
  
  // 监听用户滚动事件
  const handleLyricScroll = useCallback((e) => {
    setUserScrolled(true);
    
    // 5秒后重置用户滚动状态，恢复自动滚动
    clearTimeout(window.lyricScrollTimer);
    window.lyricScrollTimer = setTimeout(() => {
      setUserScrolled(false);
    }, 5000);
    
    // 根据滚动位置计算可见范围
    const container = lyricsContainerRef.current;
    if (container) {
      const scrollTop = container.scrollTop;
      const start = Math.max(0, Math.floor(scrollTop / lyricLineHeight) - 5);
      const end = Math.min(
        processedLyrics.length,
        Math.ceil((scrollTop + containerHeight) / lyricLineHeight) + 5
      );
      
      setVisibleRange({ start, end });
    }
  }, [containerHeight, lyricLineHeight, processedLyrics.length, lyricsContainerRef]);
  
  // 获取当前播放模式图标
  const getPlayModeIcon = useCallback(() => {
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
  }, [playMode]);
  
  // 处理播放/暂停切换
  const handlePlayPauseToggle = useCallback(() => {
    togglePlay();
  }, [togglePlay]);
  
  // 处理歌词展开/收起
  const handleLyricToggle = useCallback(() => {
    toggleLyric();
    setUserScrolled(false); // 重置用户滚动状态
  }, [toggleLyric]);
  
  // 处理下载当前歌曲
  const handleDownloadCurrent = useCallback(() => {
    if (currentTrack) {
      // 这里需要处理下载逻辑，但PlayerContext中暂未实现
      console.log('下载功能尚未实现');
    }
  }, [currentTrack]);
  
  // 如果没有当前音轨，不渲染任何内容
  if (!currentTrack) return null;
  
  // 增加播放器展开状态的类名
  const playerClassName = `audio-player ${lyricExpanded ? 'expanded' : 'collapsed'}`;
  
  // 渲染虚拟滚动歌词
  const renderVirtualizedLyrics = () => {
    return (
      <VirtualizedLyrics
        processedLyrics={processedLyrics}
        visibleRange={visibleRange}
        lyricLineHeight={lyricLineHeight}
        currentLyricIndex={currentLyricIndex}
      />
    );
  };
  
  return (
    <>
      {/* 背景遮罩 - 仅在展开状态显示 */}
      <div className={`player-backdrop ${lyricExpanded ? 'visible' : ''}`} 
           onClick={handleLyricToggle}></div>
      
      {/* 播放器主体 */}
      <div className={playerClassName}>
        <div 
          className="player-inner" 
          onClick={(e) => {
            // 不再允许点击空白处展开
            // 移动端和桌面端逻辑保持一致
          }} 
          style={{ cursor: 'default' }}
        >
          <div className="player-content">
            {/* 基础播放控制区域 - 在收起和展开状态都显示 */}
            <Row className="align-items-center player-info-controls">
              {/* 左侧：歌曲信息 */}
              <Col xs={5} md={3} className="d-flex align-items-center mb-2 mb-md-0" onClick={(e) => e.stopPropagation()}>
                <div className="d-flex align-items-center">
                  <div className="position-relative">
                    <AlbumCover track={currentTrack} coverCache={coverCache} size="small" onClick={handleLyricToggle} />
                  </div>
                  <div className="track-info-container">
                    <h6 className="mb-0 text-truncate track-name">{currentTrack.name}</h6>
                    <small className="text-muted text-truncate track-artist">{currentTrack.artist}</small>
                  </div>
                </div>
              </Col>
          
              {/* 中间空白区域 - 仅在桌面端显示 */}
              <Col md={6} className="d-none d-md-block">
                {/* 此区域故意留空，为进度条底部定位留出空间 */}
              </Col>
              
              {/* 移动端进度条区域 - 与专辑封面同行 */}
              <Col xs={7} className="d-md-none" onClick={(e) => e.stopPropagation()}>
                <div className="mobile-progress-container">
                  <div className="progress-bar-container" style={{ position: 'relative', zIndex: 5 }}>
                    <ProgressBar />
                  </div>
                </div>
              </Col>
              
              {/* 右侧：播放控制 */}
              <Col xs={12} md={3} className="d-flex justify-content-center justify-content-md-end mt-2 mt-md-0 control-buttons-container" onClick={(e) => e.stopPropagation()}>
                {/* 歌词切换按钮 */}
                <LyricToggleButton expanded={lyricExpanded} onToggle={handleLyricToggle} className="p-2 control-button text-danger control-icon-btn" />
                
                {currentTrack && (
                  <HeartButton 
                    track={currentTrack} 
                    size={20} 
                    variant="link"
                    className="p-2 control-button text-danger control-icon-btn" 
                  />
                )}
                
                <PlayerControlButton 
                  onClick={handlePrevious}
                  disabled={!currentTrack || currentPlaylist.length <= 1}
                  className="mx-1 p-2 text-secondary" 
                  ariaLabel="上一首"
                >
                  <FaStepBackward size={20} />
                </PlayerControlButton>
                
                <PlayerControlButton
                  onClick={handlePlayPauseToggle}
                  disabled={!currentTrack || !playerUrl}
                  className="mx-1 p-1" 
                  ariaLabel={isPlaying ? "暂停" : "播放"}
                >
                  {!currentTrack ? 
                    <FaMusic size={24} className="text-muted" /> 
                   : isPlaying ? 
                    <FaPause size={24} className="text-primary" />
                   : 
                    <FaPlay size={24} className="text-primary" />
                  }
                </PlayerControlButton>
                
                <PlayerControlButton 
                  onClick={handleNext}
                  disabled={!currentTrack || currentPlaylist.length <= 1}
                  className="mx-1 p-2 text-secondary" 
                  ariaLabel="下一首"
                >
                  <FaStepForward size={20} />
                </PlayerControlButton>
                
                <PlayerControlButton
                  onClick={handleTogglePlayMode}
                  className="mx-1 p-2 text-secondary" 
                  ariaLabel="播放模式"
                >
                  {getPlayModeIcon()}
                </PlayerControlButton>
                
                {/* 添加下载按钮 */}
                {currentTrack && (
                  <PlayerControlButton
                    onClick={handleDownloadCurrent}
                    className="mx-1 p-2 text-success" 
                    ariaLabel="下载"
                    title="下载歌曲"
                    disabled={downloading && currentDownloadingTrack?.id === currentTrack.id}
                  >
                    {downloading && currentDownloadingTrack?.id === currentTrack.id ? 
                      <Spinner animation="border" size="sm" /> : 
                      <FaDownload size={20} />
                    }
                  </PlayerControlButton>
                )}
              </Col>
            </Row>
            
            {/* 桌面端：进度条和时间 - 在所有模式下都显示 */}
            <div className="d-none d-md-block progress-control-container" onClick={(e) => e.stopPropagation()}>
              {/* 收起状态下的单行歌词显示 - 仅桌面端显示 */}
              {!lyricExpanded && currentTrack && currentLyricIndex >= 0 && processedLyrics.length > 0 && deviceInfo.isDesktop && (
                <div className="current-lyric-line" onClick={handleLyricToggle}>
                  {processedLyrics[currentLyricIndex]?.text || "暂无歌词"}
                </div>
              )}
              <div className="progress-bar-container" style={{ position: 'relative', zIndex: 5 }}>
                <ProgressBar />
              </div>
            </div>

            {/* ReactPlayer组件 */}
            <ReactPlayer
              ref={playerRef}
              onProgress={handleProgress}
              url={playerUrl}
              playing={isPlaying}
              onReady={() => console.log('播放器就绪')}
              onDuration={(duration) => {
                console.log('音频时长:', duration);
                // 只更新总时长，不调用完整的handleProgress避免重复触发
                setTotalSeconds(duration);
              }}
              onError={(e) => {
                handleError(
                  e,
                  ErrorTypes.PLAYBACK,
                  ErrorSeverity.ERROR,
                  '音频播放失败，该音源可能不可用'
                );
                setIsPlaying(false);
              }}
              onEnded={handleEnded}
              config={{ 
                file: { 
                  forceAudio: true,
                  attributes: {
                    // 禁用HTML5音频元素的原生控制
                    controlsList: 'nodownload'
                  }
                } 
              }}
              height={0}
              style={{ display: playerUrl ? 'block' : 'none' }} 
            />
          </div>
        </div>
      </div>
      
      {/* 歌词展开视图 - 作为独立组件 */}
      <div className="player-expanded-view" style={{ overflow: 'hidden', maxWidth: '100vw', display: lyricExpanded ? 'flex' : 'none' }}>
        {/* 关闭按钮 */}
        <LyricToggleButton 
          expanded={true} 
          onToggle={handleLyricToggle} 
          className="close-lyrics-btn"
          customIcon={<FaTimes />} 
        />
        
        {/* 左侧：大封面 */}
        <div className="album-cover-container">
          <AlbumCover track={currentTrack} coverCache={coverCache} size="large" onClick={handleLyricToggle} />
        </div>
        
        {/* 右侧：详细信息和歌词 */}
        <div className="track-info-expanded" style={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
          <h2 className="track-title" style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentTrack.name}</h2>
          <h4 className="track-artist-album" style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentTrack.artist} - {currentTrack.album}</h4>

          {/* 歌词滚动区域 */}
          <div 
            className="lyrics-scroll-container" 
            ref={lyricsContainerRef}
            onScroll={handleLyricScroll}
            style={{ 
              width: '100%', 
              maxWidth: '100%', 
              overflowX: 'hidden', 
              overflowY: 'auto',
              padding: '15px 15px 15px 20px', /* 增加左内边距为20px，给活动行更多空间 */
              boxSizing: 'border-box'
            }}
          >
            <div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', paddingRight: '15px' }}>
              {renderVirtualizedLyrics()}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// 使用React.memo包装组件，避免不必要的重渲染
export default memo(AudioPlayer); 