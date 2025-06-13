import React, { useRef, useState, useEffect } from 'react';

// 进度条组件
const ProgressBar = ({ 
  currentTrack, 
  playProgress, 
  totalSeconds, 
  playerRef,
  formatTime,
  deviceType = 'desktop' // 设备类型参数，默认为桌面端
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  // 添加一个状态来记录最后释放的位置
  const [lastReleasedProgress, setLastReleasedProgress] = useState(null);
  // 添加标志，表示是否刚刚释放拖动
  const justReleasedRef = useRef(false);
  const releaseTimeoutRef = useRef(null);
  
  // 用于鼠标位置跟踪
  const progressBarRef = useRef(null);
  const mousePositionRef = useRef({ x: 0, y: 0 });
  
  // 确保mousePositionRef初始值同步
  useEffect(() => {
    if (!isDragging && !justReleasedRef.current) {
      mousePositionRef.current.x = playProgress;
    }
  }, [playProgress, isDragging]);
  
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
        }, 1000);
        
        setIsDragging(false);
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
  }, [isDragging, dragProgress]);
  
  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (releaseTimeoutRef.current) {
        clearTimeout(releaseTimeoutRef.current);
      }
    };
  }, []);
  
  // 鼠标事件处理
  const handleMouseEnter = () => setIsHovering(true);
  const handleMouseLeave = () => setIsHovering(false);
  
  const handleMouseMove = (e) => {
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
      
      // 实时更新播放位置
      if (playerRef.current) {
        playerRef.current.seekTo(boundedPosition);
      }
    }
  };
  
  const handleMouseDown = (e) => {
    if (!currentTrack) return;
    
    setIsDragging(true);
    
    // 计算位置
    const rect = e.currentTarget.getBoundingClientRect();
    const position = (e.clientX - rect.left) / rect.width;
    const boundedPosition = Math.max(0, Math.min(1, position));
    
    // 更新状态
    setDragProgress(boundedPosition * 100);
    
    // 立即应用位置
    if (playerRef.current) {
      playerRef.current.seekTo(boundedPosition);
    }
  };
  
  // 触摸事件处理
  const handleTouchStart = (e) => {
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
    
    // 立即应用位置
    if (playerRef.current) {
      playerRef.current.seekTo(boundedPosition);
    }
  };
  
  const handleTouchMove = (e) => {
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
    
    // 实时更新播放位置
    if (playerRef.current) {
      playerRef.current.seekTo(boundedPosition);
    }
  };
  
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
        padding: '4px 0', 
        marginBottom: '6px',
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
      onTouchEnd={() => {}}
      onTouchCancel={() => {}}
    >
      {/* 进度条容器 */}
      <div 
        className="progress" 
        style={{ 
          height: isHovering ? '8px' : (deviceType === 'mobile' ? '4px' : '6px'), 
          position: 'relative',
          overflow: 'visible', // 允许把手超出边界
          transition: 'height 0.15s ease',
          borderRadius: '3px'
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
            boxShadow: '0 0 6px rgba(0,0,0,0.3)',
            transform: isDragging ? 'scale(1.3)' : 'scale(1.1)',
            opacity: isDragging ? 1 : (isHovering ? 0.9 : 0),
            transition: 'transform 0.2s ease, opacity 0.2s ease', // 只为transform和opacity添加过渡效果
            zIndex: 3
          }}
        />
      </div>
      
      {/* 时间指示器 */}
      {(isDragging || (isHovering && currentTrack)) && (
        <div 
          style={{
            position: 'absolute',
            top: '-28px',
            left: `calc(${isDragging 
              ? dragProgress 
              : (isHovering ? mousePositionRef.current.x : displayProgress)}% - 20px)`,
            backgroundColor: 'rgba(0,0,0,0.7)',
            color: 'white',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '12px',
            userSelect: 'none',
            pointerEvents: 'none',
            opacity: isDragging ? 1 : (isHovering ? 0.9 : 0),
            transition: 'opacity 0.2s ease', // 只为opacity添加过渡效果
            transform: isDragging ? 'translateY(-3px)' : 'none',
            zIndex: 9
          }}
        >
          {formatTime(totalSeconds * (isDragging 
            ? (dragProgress / 100) 
            : (isHovering 
              ? (mousePositionRef.current.x / 100) 
              : (displayProgress / 100))))}
        </div>
      )}
      
      {/* 时间显示 */}
      <div className="time-display" style={{
        fontSize: deviceType === 'mobile' ? '11px' : '12px'
      }}>
        {formatTime(currentTimeInSeconds)}/{formatTime(totalSeconds)}
      </div>
    </div>
  );
};

export default ProgressBar; 