import React, { useState, useEffect } from 'react';
import { usePlayer } from '../contexts/PlayerContext';

const DEFAULT_COVER = '/default_cover.svg';

/**
 * 统一的专辑封面组件
 * 处理专辑封面的加载、错误处理和缓存使用
 * 
 * @param {Object} props - 组件属性
 * @param {Object} props.track - 歌曲信息对象，包含source和pic_id
 * @param {string|number} props.size - 尺寸，'small'或'large'或具体像素值
 * @param {Function} props.onClick - 点击事件处理函数
 * @param {string} props.className - 额外的CSS类名
 * @param {number} props.imgSize - 图片尺寸像素值，用于fetchCover（默认300）
 * @param {boolean} props.lazy - 是否延迟加载，默认为false
 */
const AlbumCover = ({ 
  track, 
  size = 'small', 
  onClick, 
  className = '',
  imgSize = 300,
  lazy = false
}) => {
  // 从PlayerContext获取封面缓存和获取方法
  const { coverCache, fetchCover } = usePlayer();
  const [imageUrl, setImageUrl] = useState(DEFAULT_COVER);
  const [isLoaded, setIsLoaded] = useState(false);

  // 使用effect处理图片加载
  useEffect(() => {
    // 如果是延迟加载模式，且尚未强制加载，则使用默认封面
    if (lazy && !isLoaded) {
      setImageUrl(DEFAULT_COVER);
      return;
    }

    const loadCover = async () => {
      // 如果没有track或pic_id，使用默认封面
      if (!track || !track.pic_id) {
        setImageUrl(DEFAULT_COVER);
        return;
      }

      try {
        // 生成缓存键 - 使用下划线与PlayerContext保持一致
        const cacheKey = `${track.source}_${track.pic_id}_${imgSize}`;
        
        // 检查缓存
        if (coverCache[cacheKey]) {
          setImageUrl(coverCache[cacheKey]);
          return;
        }
        
        // 尝试获取封面
        const coverUrl = await fetchCover(track.source, track.pic_id, imgSize);
        setImageUrl(coverUrl);
      } catch (error) {
        console.error('[AlbumCover] 加载封面失败:', error);
        setImageUrl(DEFAULT_COVER);
      }
    };

    loadCover();
  }, [track, coverCache, fetchCover, imgSize, lazy, isLoaded]);

  // 错误处理
  const handleImageError = () => {
    console.warn(`[AlbumCover] 封面加载失败: ${imageUrl}`);
    setImageUrl(DEFAULT_COVER);
  };

  // 强制加载封面（用于延迟加载模式）
  const forceLoadCover = async () => {
    if (lazy && !isLoaded && track && track.pic_id) {
      try {
        // 生成缓存键
        const cacheKey = `${track.source}_${track.pic_id}_${imgSize}`;
        
        // 检查缓存
        if (coverCache[cacheKey]) {
          setImageUrl(coverCache[cacheKey]);
          setIsLoaded(true);
          return;
        }
        
        // 获取封面
        const coverUrl = await fetchCover(track.source, track.pic_id, imgSize);
        setImageUrl(coverUrl);
        setIsLoaded(true);
      } catch (error) {
        console.error('[AlbumCover] 强制加载封面失败:', error);
        setImageUrl(DEFAULT_COVER);
      }
    }
  };

  // 确定样式和尺寸
  const getStyles = () => {
    // 如果size是预设值
    if (size === 'small') {
      return {};
    } else if (size === 'large') {
      return {};
    }
    
    // 如果size是具体数值，则使用自定义样式
    return {
      width: typeof size === 'number' ? `${size}px` : size,
      height: typeof size === 'number' ? `${size}px` : size,
      objectFit: 'cover',
      backgroundColor: '#f8f9fa' // 添加浅灰色背景
    };
  };
  
  // 样式类名
  const sizeClass = size === 'small' ? 'player-thumbnail rounded me-2' : 
                   (size === 'large' ? 'album-cover-large' : 'rounded');
  
  // 点击处理函数
  const handleClick = () => {
    // 如果是延迟加载模式，点击时强制加载
    if (lazy && !isLoaded) {
      forceLoadCover();
    }
    // 调用传入的onClick处理函数
    if (onClick) {
      onClick();
    }
  };
  
  // 检查是否使用默认封面
  return (
    <div 
      className={`${className} ${sizeClass} album-cover-wrapper`}
      onClick={handleClick}
      style={{
        display: 'inline-block',
        cursor: (lazy && !isLoaded) || onClick ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#f8f9fa',
        borderRadius: size === 'small' ? '6px' : '10px',
        ...getStyles()
      }}
    >
      <img 
        src={imageUrl}
        alt={size === 'small' ? "当前播放" : "专辑封面"}
        className="album-cover-image"
        style={{ 
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          borderRadius: 'inherit'
        }}
        onError={handleImageError}
        loading="lazy"
      />
    </div>
  );
};

export default AlbumCover;