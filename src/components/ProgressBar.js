import React, { useRef, useState, useEffect, useCallback, memo } from 'react';
import { usePlayer } from '../contexts/PlayerContext';

// 进度条组件
const ProgressBar = () => {
  // 从PlayerContext获取所需状态和方法
  const {
  currentTrack, 
  playProgress, 
  totalSeconds, 
  playerRef,
    formatTime,
    isPlaying,
    setIsPlaying  // 获取setIsPlaying方法来控制播放状态
  } = usePlayer();
  
  // 从DeviceContext获取设备类型（这里假设有默认值）
  const deviceType = 'desktop'; // 实际应用中应该从DeviceContext获取
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  // 添加一个状态来记录最后释放的位置
  const [lastReleasedProgress, setLastReleasedProgress] = useState(null);
  // 添加标志，表示是否刚刚释放拖动
  const justReleasedRef = useRef(false);
  const releaseTimeoutRef = useRef(null);
  // 添加标识，用来跟踪是否已经应用了seek操作
  const hasAppliedSeekRef = useRef(false);
  // 记录拖动前的播放状态
  const wasPlayingRef = useRef(false);
  
  // 用于鼠标位置跟踪
  const progressBarRef = useRef(null);
  const mousePositionRef = useRef({ x: 0, y: 0 });
  
  // 确保mousePositionRef初始值同步
  useEffect(() => {
    if (!isDragging && !justReleasedRef.current) {
      mousePositionRef.current.x = playProgress;
    }
  }, [playProgress, isDragging]);
  
  // 记录开始拖动时的播放状态
  useEffect(() => {
    if (isDragging) {
      wasPlayingRef.current = isPlaying;
    }
  }, [isDragging, isPlaying]);
  
  // 全局事件处理
  useEffect(() => {
    if (!isDragging) return;
    
    const handleDragEnd = () => {
      if (isDragging) {
        // 记录释放时的位置
        setLastReleasedProgress(dragProgress);
        
        // 设置刚刚释放的标志
        justReleasedRef.current = true;
        
        // 1秒后重置标志，恢复正常的播放进度更新
        if (releaseTimeoutRef.current) {
          clearTimeout(releaseTimeoutRef.current);
        }
        releaseTimeoutRef.current = setTimeout(() => {
          justReleasedRef.current = false;
          setLastReleasedProgress(null);
          // 重置seek操作标识
          hasAppliedSeekRef.current = false;
        }, 1000);
        
        setIsDragging(false);
        
        // 如果拖动前是播放状态，恢复播放
        if (wasPlayingRef.current) {
          console.log('[ProgressBar] 拖动结束后恢复播放');
          setTimeout(() => {
            setIsPlaying(true);
          }, 50); // 短暂延迟确保seekTo操作已完成
        }
      }
    };
    
    document.addEventListener('mouseup', handleDragEnd);
    document.addEventListener('touchend', handleDragEnd);
    document.addEventListener('touchcancel', handleDragEnd);
    
    return () => {
      document.removeEventListener('mouseup', handleDragEnd);
      document.removeEventListener('touchend', handleDragEnd);
      document.removeEventListener('touchcancel', handleDragEnd);
    };
  }, [isDragging, dragProgress, setIsPlaying]);
  
  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (releaseTimeoutRef.current) {
        clearTimeout(releaseTimeoutRef.current);
      }
    };
  }, []);
  
  // 应用seek操作的安全函数，避免重复调用
  const applySeek = useCallback((position) => {
    if (playerRef.current && !hasAppliedSeekRef.current) {
      playerRef.current.seekTo(position);
      hasAppliedSeekRef.current = true;
      // 100ms后允许再次seek，防止连续多次seek操作
      setTimeout(() => {
        hasAppliedSeekRef.current = false;
      }, 100);
    }
  }, [playerRef]);
  
  // 鼠标事件处理
  const handleMouseEnter = useCallback(() => {
    setIsHovering(true);
  }, []);
  
  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
  }, []);
  
  const handleMouseMove = useCallback((e) => {
    if (!progressBarRef.current || !currentTrack) return;
    
    // 更新鼠标位置
    const rect = progressBarRef.current.getBoundingClientRect();
    const position = (e.clientX - rect.left) / rect.width;
    mousePositionRef.current = { 
      x: Math.max(0, Math.min(1, position)) * 100, 
      y: e.clientY
    };
    
    // 如果在拖动状态，更新进度
    if (isDragging) {
      e.preventDefault();
      const boundedPosition = Math.max(0, Math.min(1, position));
      setDragProgress(boundedPosition * 100);
      
      // 实时更新播放位置，但避免频繁调用
      applySeek(boundedPosition);
    }
  }, [currentTrack, isDragging, applySeek]);
  
  const handleMouseDown = useCallback((e) => {
    if (!currentTrack) return;
    
    setIsDragging(true);
    
    // 计算位置
    const rect = e.currentTarget.getBoundingClientRect();
    const position = (e.clientX - rect.left) / rect.width;
    const boundedPosition = Math.max(0, Math.min(1, position));
    
    // 更新状态
    setDragProgress(boundedPosition * 100);
    
    // 立即应用位置，使用安全的seek函数
    applySeek(boundedPosition);
  }, [currentTrack, applySeek]);
  
  // 触摸事件处理
  const handleTouchStart = useCallback((e) => {
    if (!currentTrack) return;
    
    setIsHovering(true);
    setIsDragging(true);
    
    e.stopPropagation();
    e.preventDefault();
    
    // 计算位置
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0];
    const position = (touch.clientX - rect.left) / rect.width;
    const boundedPosition = Math.max(0, Math.min(1, position));
    
    // 更新状态
    setDragProgress(boundedPosition * 100);
    
    // 立即应用位置，使用安全的seek函数
    applySeek(boundedPosition);
  }, [currentTrack, applySeek]);
  
  const handleTouchMove = useCallback((e) => {
    if (!isDragging || !currentTrack) return;
    
    e.stopPropagation();
    e.preventDefault();
    
    // 计算位置
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0];
    const position = (touch.clientX - rect.left) / rect.width;
    const boundedPosition = Math.max(0, Math.min(1, position));
    
    // 更新状态
    setDragProgress(boundedPosition * 100);
    
    // 实时更新播放位置，使用安全的seek函数
    applySeek(boundedPosition);
  }, [isDragging, currentTrack, applySeek]);
  
  // 空回调函数，避免重新创建
  const handleEmptyEvent = useCallback(() => {}, []);
  
  // 确定当前显示的进度
  const displayProgress = isDragging 
    ? dragProgress 
    : (justReleasedRef.current && lastReleasedProgress !== null) 
      ? lastReleasedProgress 
      : playProgress;
  
  // 计算当前时间（秒）
  const currentTimeInSeconds = (totalSeconds * displayProgress) / 100;
  
  return (
    <div 
      className="progress-wrapper" 
      ref={progressBarRef}
      style={{ 
        padding: '0', 
        marginBottom: '2px',
        cursor: currentTrack ? 'pointer' : 'default',
        position: 'relative',
        touchAction: 'none' // 阻止浏览器默认触摸行为
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleEmptyEvent}
      onTouchCancel={handleEmptyEvent}
    >
      {/* 时间显示 - 移到进度条上方 */}
      <div 
        className="time-display" 
        style={{
          display: 'flex', 
          justifyContent: 'flex-end',
          fontSize: deviceType === 'mobile' ? '0.7rem' : '0.8rem',
          marginBottom: '1px',
          color: '#555',
          fontWeight: '500',
          padding: '0', // 确保对齐
          position: 'relative', // 添加相对定位
          zIndex: 10 // 添加较高的z-index值
        }}
      >
        <span>{formatTime(currentTimeInSeconds)}/{formatTime(totalSeconds)}</span>
      </div>
      
      {/* 进度条容器 */}
      <div 
        className="progress" 
        style={{ 
          height: isHovering ? '6px' : (deviceType === 'mobile' ? '3px' : '4px'), 
          position: 'relative',
          overflow: 'visible', // 允许把手超出边界
          transition: 'height 0.15s ease',
          borderRadius: '3px',
          padding: '0',
          margin: '0'
        }}
      >
        {/* 增大触摸区域 */}
        <div 
          className="progress-bg"
          style={{
            position: 'absolute',
            top: '-10px', 
            left: '0',
            right: '0',
            bottom: '-10px', 
            backgroundColor: '#f8f9fa',
            opacity: 0.01,
            borderRadius: '10px',
            zIndex: 1
          }}
        />
        
        {/* 进度条 */}
        <div 
          className="progress-bar bg-danger" 
          style={{ 
            width: `${displayProgress}%`,
            position: 'relative',
            transition: 'none', // 完全禁用过渡动画
            height: '100%',
            zIndex: 2
          }}
        />
        
        {/* 拖动把手 */}
        <div 
          className="progress-handle"
          style={{
            display: (isDragging || isHovering) ? 'block' : 'none',
            position: 'absolute',
            left: `calc(${displayProgress}% - ${deviceType === 'mobile' ? 8 : 10}px)`,
            top: deviceType === 'mobile' ? '-5px' : '-6px',
            width: deviceType === 'mobile' ? '16px' : '20px',
            height: deviceType === 'mobile' ? '16px' : '20px',
            borderRadius: '50%',
            backgroundColor: '#dc3545',
            boxShadow: '0 0 5px rgba(0,0,0,0.3)',
            zIndex: 3,
            transition: 'transform 0.1s ease',
            transform: (isDragging || isHovering) ? 'scale(1.1)' : 'scale(1)'
          }}
        />
      </div>
    </div>
  );
};

// 使用React.memo包装组件，避免不必要的重渲染
export default memo(ProgressBar); 