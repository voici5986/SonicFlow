import React, { useEffect, memo, useMemo } from 'react';
import { Row, Col, Button } from 'react-bootstrap';
import {
  FaPlay, FaPause,
  FaStepBackward, FaStepForward, FaTimes
} from 'react-icons/fa';
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
    togglePlay,
    toggleLyric,
    handlePrevious,
    handleNext,
    lyricsContainerRef,
    parseLyric
  } = usePlayer();

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
          <div className="player-content">
            <Row className="align-items-center player-info-controls">
              <Col xs={5} md={3} className="d-flex align-items-center">
                <AlbumCover track={currentTrack} size="small" onClick={toggleLyric} forceFetch={true} />
                <div className="track-info-container">
                  <h6 className="mb-0 text-truncate track-name">{currentTrack.name}</h6>
                  <small className="text-muted text-truncate track-artist">{currentTrack.artist}</small>
                </div>
              </Col>

              <Col xs={7} className="d-md-none">
                <ProgressBar />
              </Col>

              <Col xs={12} md={6} className="d-none d-md-block">
                <ProgressBar />
              </Col>

              <Col xs={12} md={3} className="d-flex justify-content-end control-buttons-container">
                <LyricToggleButton expanded={lyricExpanded} onToggle={toggleLyric} className="p-2 control-button text-danger" />
                <HeartButton track={currentTrack} size={20} className="p-2 control-button text-danger" />

                <Button variant="link" onClick={handlePrevious} className="control-icon-btn"><FaStepBackward /></Button>
                <Button variant="link" onClick={togglePlay} className="control-icon-btn">
                  {isPlaying ? <FaPause size={24} /> : <FaPlay size={24} />}
                </Button>
                <Button variant="link" onClick={handleNext} className="control-icon-btn"><FaStepForward /></Button>
              </Col>
            </Row>
          </div>
        </div>
      </div>

      <div className="player-expanded-view" style={{ display: lyricExpanded ? 'flex' : 'none' }}>
        <Button variant="link" onClick={toggleLyric} className="close-lyrics-btn"><FaTimes /></Button>
        <div className="album-cover-container">
          <AlbumCover track={currentTrack} size="large" forceFetch={true} />
        </div>
        <div className="track-info-expanded">
          <h2 className="track-title">{currentTrack.name}</h2>
          <h4 className="track-artist-album">{currentTrack.artist} - {currentTrack.album}</h4>
          <div className="lyrics-scroll-container" ref={lyricsContainerRef}>
            {processedLyrics.map((line, idx) => (
              <LyricLine key={idx} line={line} isActive={idx === currentLyricIndex} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default memo(AudioPlayer);