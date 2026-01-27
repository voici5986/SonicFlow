import React, { useEffect, memo, useMemo, useState } from 'react';
import { Row, Col, Button } from 'react-bootstrap';
import {
  FaPlay, FaPause,
  FaTimes, FaChevronDown,
  FaSyncAlt, FaRandom, FaRedoAlt, FaListUl,
  FaDownload
} from 'react-icons/fa';
import { MdSkipPrevious, MdSkipNext } from 'react-icons/md';
import HeartButton from './HeartButton';
import ProgressBar from './ProgressBar';
import '../styles/AudioPlayer.css';
import { usePlayer } from '../contexts/PlayerContext';
import AlbumCover from './AlbumCover';

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
        padding: '10px 15px',
        textAlign: 'center',
        width: '100%',
        maxWidth: '100%',
        wordBreak: 'break-word',
        whiteSpace: 'normal',
        overflow: 'hidden',
        boxSizing: 'border-box',
        backgroundColor: 'transparent',
        borderLeft: 'none',
        transition: 'all 0.3s ease',
        fontWeight: isActive ? '600' : 'normal',
        fontSize: isActive ? '1.25rem' : '1rem',
        color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
        borderRadius: 0,
        boxShadow: 'none',
        marginBottom: '12px',
        position: 'relative'
      }}
    >
      <div style={{
        width: '100%',
        maxWidth: '100%',
        wordBreak: 'break-word',
        letterSpacing: isActive ? '0.02em' : 'normal'
      }}>
        {line.text}
      </div>
      {line.translatedText && (
        <div style={{
          width: '100%',
          maxWidth: '100%',
          wordBreak: 'break-word',
          paddingLeft: 0,
          marginTop: '6px',
          color: isActive ? 'var(--color-text-tertiary)' : 'var(--color-text-muted)',
          fontSize: isActive ? '1rem' : '0.9rem',
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
 * 音频播放器组件
 * 负责音乐播放、控制、歌词显示等功能
 * 使用PlayerContext获取状态和方法
 */
const AudioPlayer = () => {
  const {
    currentTrack,
    isPlaying,
    lyricExpanded,
    lyricData,
    currentLyricIndex,
    coverCache,
    currentPlaylist,
    playMode,
    togglePlay,
    toggleLyric,
    handlePrevious,
    handleNext,
    handleTogglePlayMode,
    lyricsContainerRef,
    parseLyric
  } = usePlayer();

  const [showMobileLyrics, setShowMobileLyrics] = useState(false);

  // 当歌词界面展开状态变化时，同步 body 类名并处理副作用
  useEffect(() => {
    if (lyricExpanded) {
      // 当展开时，给 body 添加类以隐藏移动端 Tab 栏
      document.body.classList.add('player-expanded');
    } else {
      // 当关闭展开模式时，重置移动端歌词显示状态并移除类
      setShowMobileLyrics(false);
      document.body.classList.remove('player-expanded');
    }
  }, [lyricExpanded]);

  // 添加一个状态用于强制刷新红心图标
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);

  // 渲染播放模式图标
  const renderPlayModeIcon = () => {
    switch (playMode) {
      case 'repeat-one': return <FaRedoAlt size={16} />;
      case 'random': return <FaRandom size={16} />;
      default: return <FaSyncAlt size={16} />;
    }
  };

  // 渲染播放模式标题
  const getPlayModeTitle = () => {
    switch (playMode) {
      case 'repeat-one': return '单曲循环';
      case 'random': return '随机播放';
      default: return '列表循环';
    }
  };

  // 监听收藏状态变化，同步更新播放器内的红心图标
  useEffect(() => {
    const handleFavoritesChanged = () => {
      forceUpdate();
    };

    window.addEventListener('favorites_changed', handleFavoritesChanged);
    return () => window.removeEventListener('favorites_changed', handleFavoritesChanged);
  }, []);

  // MediaSession 同步模块
  useEffect(() => {
    if (!currentTrack || !('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.name,
      artist: currentTrack.artist,
      album: currentTrack.album || '',
      artwork: [{
        src: coverCache[`${currentTrack.source}_${currentTrack.pic_id}_300`] || '/default_cover.svg',
        sizes: '300x300',
        type: 'image/png'
      }]
    });

    navigator.mediaSession.setActionHandler('play', togglePlay);
    navigator.mediaSession.setActionHandler('pause', togglePlay);

    if (currentPlaylist.length > 1) {
      navigator.mediaSession.setActionHandler('previoustrack', handlePrevious);
      navigator.mediaSession.setActionHandler('nexttrack', handleNext);
    }
  }, [currentTrack, coverCache, currentPlaylist, togglePlay, handlePrevious, handleNext]);

  // 更新媒体会话播放状态
  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [isPlaying]);

  const processedLyrics = useMemo(() => {
    if (!lyricData.parsedLyric) return [];
    const translatedLines = lyricData.tLyric ? parseLyric(lyricData.tLyric) : [];
    return lyricData.parsedLyric.map((line, index) => ({
      ...line,
      translatedText: translatedLines[index]?.text || ''
    }));
  }, [lyricData, parseLyric]);

  // 歌词滚动逻辑
  useEffect(() => {
    if (lyricExpanded && currentLyricIndex >= 0 && lyricsContainerRef.current) {
      const activeLine = lyricsContainerRef.current.querySelector('.active');
      if (activeLine) {
        activeLine.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentLyricIndex, lyricExpanded, lyricsContainerRef]);

  if (!currentTrack) return null;

  return (
    <>
      <div className={`player-backdrop ${lyricExpanded ? 'visible' : ''}`} onClick={toggleLyric}></div>
      <div className={`audio-player ${lyricExpanded ? 'expanded' : 'collapsed'}`}>
        <div className="player-inner">
          {/* 进度条：在桌面端绝对定位在顶部 */}
          <div className="progress-control-container">
            <ProgressBar />
          </div>

          <div className="player-content">
            {/* 移动端布局 */}
            <div className="d-md-none h-100 w-100" style={{ position: 'relative' }}>
              {/* 收起模式：左侧大空间信息，右侧仅红心和播放 */}
              <Row className="align-items-center h-100 m-0">
                <Col xs={8} className="d-flex align-items-center p-0 overflow-hidden" onClick={toggleLyric} style={{ cursor: 'pointer' }}>
                  <AlbumCover track={currentTrack} size="small" forceFetch={true} />
                  <div className="track-info-container flex-grow-1 ms-2" style={{ minWidth: 0, paddingRight: '10px' }}>
                    <h6 className="mb-0 text-truncate track-name" style={{ width: '100%' }}>{currentTrack.name}</h6>
                    <small className="text-muted text-truncate track-artist d-block" style={{ width: '100%' }}>{currentTrack.artist}</small>
                  </div>
                </Col>
                <Col xs={3} className="d-flex justify-content-end align-items-center p-0" style={{ paddingRight: '12px !important' }}>
                  <div className="d-flex align-items-center pe-1.8">
                    <HeartButton track={currentTrack} size={24} variant="link" className="control-button accent-control me-4 p-0" />
                    <Button variant="link" onClick={togglePlay} className="control-icon-btn accent-control p-0">
                      {isPlaying ? <FaPause size={24} /> : <FaPlay size={24} />}
                    </Button>
                  </div>
                </Col>
              </Row>

              {/* 展开模式下的内容：通过 mobile-expanded-content CSS 控制显示隐藏 */}
              {lyricExpanded && (
                <div className="mobile-expanded-content" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10, pointerEvents: 'none' }}>
                  <div className="mobile-expanded-player-content d-flex flex-column h-100 justify-content-end pb-2" style={{ position: 'relative', pointerEvents: 'auto' }}>
                    {/* 歌曲信息：移至播放控制上方，作为模块的一部分 */}
                    <div className="mobile-track-info-expanded d-md-none">
                      <h5 className="track-name">{currentTrack.name}</h5>
                      <div className="track-artist">{currentTrack.artist}</div>
                    </div>

                    {/* 移动端专用的进度条容器：放在歌曲信息和控制按钮之间 */}
                    <div className="mobile-progress-container d-md-none px-4 w-100">
                      <ProgressBar />
                    </div>

                    <div className="d-flex align-items-center justify-content-between px-4">
                      <div style={{ width: '40px', display: 'flex', justifyContent: 'center' }}>
                        <Button 
                          variant="link" 
                          onClick={handleTogglePlayMode} 
                          className="control-icon-btn p-0"
                          title={getPlayModeTitle()}
                        >
                          {renderPlayModeIcon()}
                        </Button>
                      </div>
                      
                      <div style={{ width: '40px', display: 'flex', justifyContent: 'center' }}>
                        <Button variant="link" onClick={handlePrevious} className="control-icon-btn p-0">
                          <MdSkipPrevious size={32} />
                        </Button>
                      </div>
                      
                      <div style={{ width: '64px', display: 'flex', justifyContent: 'center' }}>
                        <Button variant="link" onClick={togglePlay} className="control-icon-btn accent-control p-0">
                          <div className="play-pause-button" style={{ 
                            backgroundColor: 'transparent', 
                            borderRadius: '0', 
                            color: 'var(--color-accent)',
                            width: '56px',
                            height: '56px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: 'none'
                          }}>
                            {isPlaying ? <FaPause size={48} /> : <FaPlay size={48} className="ms-1" />}
                          </div>
                        </Button>
                      </div>
                      
                      <div style={{ width: '40px', display: 'flex', justifyContent: 'center' }}>
                        <Button variant="link" onClick={handleNext} className="control-icon-btn p-0">
                          <MdSkipNext size={32} />
                        </Button>
                      </div>
                      
                      <div style={{ width: '40px', display: 'flex', justifyContent: 'center' }}>
                        <HeartButton track={currentTrack} size={28} variant="link" className="p-0 control-button accent-control" />
                      </div>
                    </div>
                    
                    {/* 收起按钮：作为 Flex 序列的最后一项，保持统一间距 */}
                    <div className="d-flex justify-content-center mt-2">
                      <Button 
                        variant="link" 
                        onClick={toggleLyric} 
                        className="p-0 text-muted opacity-75 no-focus-outline"
                        aria-label="收起播放器"
                        style={{
                          zIndex: 20005,
                          height: 'auto',
                          padding: '10px',
                          border: 'none',
                          boxShadow: 'none',
                          outline: 'none',
                          background: 'none'
                        }}
                      >
                        <FaChevronDown size={20} />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 桌面端布局：左中右三段式 */}
            <div className="player-info-controls d-none d-md-flex">
              {/* 左侧：歌曲信息 */}
              <div className="player-left-section">
                <AlbumCover track={currentTrack} size="small" onClick={toggleLyric} forceFetch={true} />
                <div className="track-info-container ms-3">
                  <h6 className="mb-0 text-truncate track-name">{currentTrack.name}</h6>
                  <small className="text-muted text-truncate track-artist">{currentTrack.artist}</small>
                </div>
              </div>

              {/* 中间：播放控制 */}
              <div className="player-center-section">
                <div className="d-flex align-items-center justify-content-center">
                  <div style={{ width: '40px', display: 'flex', justifyContent: 'center' }}>
                    <Button 
                      variant="link" 
                      onClick={handleTogglePlayMode} 
                      className="control-icon-btn p-0"
                      title={getPlayModeTitle()}
                    >
                      {renderPlayModeIcon()}
                    </Button>
                  </div>
                  
                  <Button variant="link" onClick={handlePrevious} className="control-icon-btn p-0 ms-3"><MdSkipPrevious size={28} /></Button>
                  
                  <Button variant="link" onClick={togglePlay} className="control-icon-btn accent-control mx-3 p-0">
                    <div className="play-pause-button" style={{ 
                      backgroundColor: 'var(--color-accent)', 
                      borderRadius: '50%', 
                      color: 'white',
                      width: '42px',
                      height: '42px'
                    }}>
                      {isPlaying ? <FaPause size={18} /> : <FaPlay size={18} className="ms-1" />}
                    </div>
                  </Button>
                  
                  <Button variant="link" onClick={handleNext} className="control-icon-btn p-0 me-3"><MdSkipNext size={28} /></Button>
                  
                  <div style={{ width: '40px', display: 'flex', justifyContent: 'center' }}>
                    <HeartButton track={currentTrack} size={20} variant="link" className="p-0 control-button accent-control" />
                  </div>
                </div>
              </div>

              {/* 右侧：辅助功能 */}
              <div className="player-right-section">
                <LyricToggleButton expanded={lyricExpanded} onToggle={toggleLyric} className="p-2 control-button" />
                <Button 
                  variant="link" 
                  className="p-2 control-button ms-2" 
                  title="下载歌曲"
                  onClick={() => window.open(currentTrack.url || playerUrl, '_blank')}
                >
                  <FaDownload size={18} />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={`player-expanded-view ${showMobileLyrics ? 'mobile-lyrics-active' : ''}`}>
        <Button variant="link" onClick={toggleLyric} className="close-lyrics-btn"><FaTimes /></Button>
        
        <div className="expanded-main-wrapper" onClick={() => {
          if (window.innerWidth <= 768) setShowMobileLyrics(!showMobileLyrics);
        }}>
          <div className="album-info-section">
            <div className="album-cover-container">
              <AlbumCover track={currentTrack} size="large" forceFetch={true} />
            </div>
            <div className="track-details d-none d-md-block">
              <h2 className="track-title">{currentTrack.name}</h2>
              <h4 className="track-artist-album">{currentTrack.artist} - {currentTrack.album}</h4>
            </div>
          </div>
          <div className="lyrics-section">
            <div className="lyrics-scroll-container" ref={lyricsContainerRef}>
              {processedLyrics.map((line, idx) => (
                <LyricLine key={idx} line={line} isActive={idx === currentLyricIndex} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default memo(AudioPlayer);
