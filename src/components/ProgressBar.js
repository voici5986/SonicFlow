import React, { useRef, useState, useEffect, useCallback, memo } from 'react';
import { usePlayer } from '../contexts/PlayerContext';

const ProgressBar = () => {
  const {
    currentTrack,
    playProgress,
    totalSeconds,
    seekTo,
    formatTime,
    isPlaying,
    setIsPlaying
  } = usePlayer();

  const deviceType = 'desktop';

  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [lastReleasedProgress, setLastReleasedProgress] = useState(null);

  const justReleasedRef = useRef(false);
  const releaseTimeoutRef = useRef(null);
  const wasPlayingRef = useRef(false);
  const progressBarRef = useRef(null);

  // 全局事件处理：处理拖拽过程和结束
  useEffect(() => {
    if (!isDragging) return;

    const handleDragMove = (e) => {
      if (!progressBarRef.current || !currentTrack) return;

      // 兼容鼠标和触摸事件
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const rect = progressBarRef.current.getBoundingClientRect();
      const position = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));

      setDragProgress(position * 100);
      // 实时 seek 实现“听音辨位” (Scrubbing)，如果性能有问题可改为仅更新 UI
      seekTo(position * totalSeconds);
    };

    const handleDragEnd = (e) => {
      // 兼容触摸结束
      const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;

      setLastReleasedProgress(dragProgress);
      justReleasedRef.current = true;

      if (releaseTimeoutRef.current) clearTimeout(releaseTimeoutRef.current);
      releaseTimeoutRef.current = setTimeout(() => {
        justReleasedRef.current = false;
        setLastReleasedProgress(null);
      }, 1000);

      setIsDragging(false);

      // 如果之前在播放，则恢复
      if (wasPlayingRef.current) {
        setTimeout(() => setIsPlaying(true), 50);
      }
    };

    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('touchmove', handleDragMove, { passive: false });
    document.addEventListener('mouseup', handleDragEnd);
    document.addEventListener('touchend', handleDragEnd);

    return () => {
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('touchmove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
      document.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging, dragProgress, setIsPlaying, currentTrack, seekTo, totalSeconds]);

  // 只保留 MouseDown/TouchStart 在元素上
  const handleMouseDown = useCallback((e) => {
    if (!currentTrack) return;

    // 阻止默认行为防止选中文本
    // e.preventDefault(); 

    wasPlayingRef.current = isPlaying;
    setIsDragging(true);

    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const position = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));

    setDragProgress(position * 100);
    seekTo(position * totalSeconds);
  }, [currentTrack, isPlaying, seekTo, totalSeconds]);

  const displayProgress = isDragging
    ? dragProgress
    : (justReleasedRef.current && lastReleasedProgress !== null)
      ? lastReleasedProgress
      : playProgress;

  const currentTimeInSeconds = (totalSeconds * displayProgress) / 100;

  return (
    <div
      className="progress-wrapper"
      ref={progressBarRef}
      style={{
        padding: '0',
        marginBottom: '2px',
        cursor: currentTrack ? 'pointer' : 'default',
        position: 'relative'
      }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseDown}
    >
      <div className="time-display" style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.8rem', color: '#555' }}>
        <span>{formatTime(currentTimeInSeconds)}/{formatTime(totalSeconds)}</span>
      </div>

      <div className="progress" style={{ height: isHovering ? '6px' : '4px', position: 'relative', transition: 'height 0.1s' }}>
        <div className="progress-bar bg-danger" style={{ width: `${displayProgress}%`, height: '100%', transition: 'none' }} />
        {(isDragging || isHovering) && (
          <div
            className="progress-handle"
            style={{
              position: 'absolute',
              left: `calc(${displayProgress}% - 8px)`,
              top: '-6px',
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              backgroundColor: '#dc3545',
              boxShadow: '0 0 4px rgba(0,0,0,0.3)',
              zIndex: 10
            }}
          />
        )}
      </div>
    </div>
  );
};

export default memo(ProgressBar);
