import React, { useEffect, useCallback, memo } from 'react';
import { Row, Col, Button, Spinner } from 'react-bootstrap';
import ReactPlayer from 'react-player';
import { FaPlay, FaPause, FaDownload, FaMusic, 
         FaStepBackward, FaStepForward, FaRandom, FaRetweet } from 'react-icons/fa';
import HeartButton from './HeartButton';
import ProgressBar from './ProgressBar';
import '../styles/AudioPlayer.css';
import { usePlayer } from '../contexts/PlayerContext';

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

      // 设置媒体控制处理程序
      navigator.mediaSession.setActionHandler('play', () => {
        setIsPlaying(true);
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        setIsPlaying(false);
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
  }, [currentTrack, playerUrl, coverCache, currentPlaylist, setIsPlaying, handlePrevious, handleNext, playerRef]);

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
  
  // 添加歌词滚动效果
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
  }, [currentLyricIndex, lyricExpanded, lyricsContainerRef]);
  
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
  }, [toggleLyric]);
  
  // 处理下载当前歌曲
  const handleDownloadCurrent = useCallback(() => {
    if (currentTrack) {
      // 这里需要处理下载逻辑，但PlayerContext中暂未实现
      // 可以通过props传入或在PlayerContext中实现
      console.log('下载功能尚未实现');
    }
  }, [currentTrack]);
  
  // 如果没有当前音轨，不渲染任何内容
  if (!currentTrack) return null;
  
  // 获取设备信息（这里假设已经有了deviceInfo）
  // 在实际应用中，应该从DeviceContext获取
  const deviceInfo = { isDesktop: true, deviceType: 'desktop' };
  
  // 增加播放器展开状态的类名
  const playerClassName = `audio-player ${lyricExpanded ? 'expanded' : 'collapsed'}`;
  
  return (
    <>
      {/* 背景遮罩 - 仅在展开状态显示 */}
      <div className={`player-backdrop ${lyricExpanded ? 'visible' : ''}`} 
           onClick={handleLyricToggle}></div>
      
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
                  <ProgressBar />
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
                  onClick={handleLyricToggle}
                  className="p-2 control-button text-danger control-icon-btn"
                  aria-label={lyricExpanded ? "收起歌词" : "展开歌词"}
                  title={lyricExpanded ? "收起歌词" : "展开歌词"}
                >
                  <img 
                    src="/lyric.svg" 
                    alt="歌词" 
                    width="20" 
                    height="20" 
                    style={{ 
                      filter: 'drop-shadow(0 0 1px rgba(255, 0, 0, 0.5))'
                    }}
                  />
                </Button>
                
                {currentTrack && (
                  <HeartButton 
                    track={currentTrack} 
                    size={20} 
                    variant="link"
                    className="p-2 control-button text-danger control-icon-btn" 
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
                  onClick={handlePlayPauseToggle}
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
                    onClick={handleDownloadCurrent}
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
                    <ProgressBar />
                  </div>
                </div>
              </div>
            )}

            {/* ReactPlayer组件 */}
            <ReactPlayer
              ref={playerRef}
              onProgress={handleProgress}
              url={playerUrl}
              playing={isPlaying}
              onReady={() => console.log('播放器就绪')}
              onDuration={(duration) => {
                console.log('音频时长:', duration);
                // 直接设置总时长
                if (typeof handleProgress === 'function') {
                  handleProgress({
                    played: 0,
                    playedSeconds: 0,
                    loaded: 0,
                    loadedSeconds: duration
                  });
                }
              }}
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
                              {parseLyric(lyricData.tLyric)[index]?.text || ''}
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

// 使用React.memo包装组件，避免不必要的重渲染
export default memo(AudioPlayer); 