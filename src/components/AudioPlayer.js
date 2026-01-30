import React, { memo } from 'react';
import ProgressBar from './ProgressBar';
import '../styles/AudioPlayer.css';
import useAudioPlayerViewState from '../hooks/useAudioPlayerViewState';
import { usePlayer } from '../contexts/PlayerContext';
import { useDevice } from '../contexts/DeviceContext';
import MobileMiniPlayer from './MobileMiniPlayer';
import MobileExpandedView from './MobileExpandedView';
import DesktopExpandedView from './DesktopExpandedView';
import DesktopPlayerControl from './DesktopPlayerControl';

/**
 * 音频播放器组件
 * 负责音乐播放、控制、歌词显示等功能
 * 使用PlayerContext获取状态和方法
 */
const AudioPlayer = () => {
  const playerContextProps = usePlayer();
  const {
    currentTrack,
    isPlaying,
    lyricExpanded,
    currentLyricIndex,
    playMode,
    togglePlay,
    toggleLyric,
    handlePrevious,
    handleNext,
    handleTogglePlayMode,
    lyricsContainerRef,
    processedLyrics,
    showMobileLyrics,
    setShowMobileLyrics,
    isDragging,
    dragOffsetY,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    // Utilities
    renderPlayModeIcon,
    getPlayModeTitle
  } = useAudioPlayerViewState(playerContextProps);
  
  const { isMobile } = useDevice();
  const playerUrl = playerContextProps.playerUrl;

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
            {/* 移动端迷你播放器 */}
            {isMobile && (
              <MobileMiniPlayer 
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                togglePlay={togglePlay}
                toggleLyric={toggleLyric}
                lyricExpanded={lyricExpanded}
                showMobileLyrics={showMobileLyrics}
                setShowMobileLyrics={setShowMobileLyrics}
                handleTogglePlayMode={handleTogglePlayMode}
                handlePrevious={handlePrevious}
                handleNext={handleNext}
                playMode={playMode}
                getPlayModeTitle={getPlayModeTitle}
                renderPlayModeIcon={renderPlayModeIcon}
              />
            )}

            {/* 桌面端播放控制 */}
            {!isMobile && (
              <DesktopPlayerControl 
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                togglePlay={togglePlay}
                toggleLyric={toggleLyric}
                lyricExpanded={lyricExpanded}
                handlePrevious={handlePrevious}
                handleNext={handleNext}
                handleTogglePlayMode={handleTogglePlayMode}
                playMode={playMode}
                getPlayModeTitle={getPlayModeTitle}
                renderPlayModeIcon={renderPlayModeIcon}
                playerUrl={playerUrl}
              />
            )}
          </div>
        </div>
      </div>

      {/* 展开视图：实现视图分离 */}
      {lyricExpanded && (
        isMobile ? (
          <MobileExpandedView 
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            toggleLyric={toggleLyric}
            showMobileLyrics={showMobileLyrics}
            setShowMobileLyrics={setShowMobileLyrics}
            isDragging={isDragging}
            dragOffsetY={dragOffsetY}
            handleTouchStart={handleTouchStart}
            handleTouchMove={handleTouchMove}
            handleTouchEnd={handleTouchEnd}
            lyricsContainerRef={lyricsContainerRef}
            processedLyrics={processedLyrics}
            currentLyricIndex={currentLyricIndex}
          />
        ) : (
          <DesktopExpandedView 
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            toggleLyric={toggleLyric}
            lyricsContainerRef={lyricsContainerRef}
            processedLyrics={processedLyrics}
            currentLyricIndex={currentLyricIndex}
          />
        )
      )}
    </>
  );
};

export default memo(AudioPlayer);
