import React, { useState, useEffect } from 'react';
import { usePlayer } from '../contexts/PlayerContext';

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
 */
const AlbumCover = ({ 
  track, 
  size = 'small', 
  onClick, 
  className = '',
  imgSize = 300
}) => {
  // 从PlayerContext获取封面缓存和获取方法
  const { coverCache, fetchCover } = usePlayer();
  const [imageUrl, setImageUrl] = useState(null);

  // 使用effect处理图片加载
  useEffect(() => {
    const loadCover = async () => {
      // 重置状态
      setImageUrl(null);

      // 如果没有track或pic_id，使用默认封面
      if (!track || !track.pic_id) {
        setImageUrl('/default_cover.png');
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
        setImageUrl('/default_cover.png');
      }
    };

    loadCover();
  }, [track, coverCache, fetchCover, imgSize]);

  // 错误处理
  const handleImageError = () => {
    console.warn(`[AlbumCover] 封面加载失败: ${imageUrl}`);
    setImageUrl('/default_cover.png');
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
      backgroundColor: '#f5f5f5'
    };
  };
  
  // 样式类名
  const sizeClass = size === 'small' ? 'player-thumbnail rounded me-2' : 
                   (size === 'large' ? 'album-cover-large' : 'rounded');
  
  return (
    <img 
      src={imageUrl || '/default_cover.png'}
      alt={size === 'small' ? "当前播放" : "专辑封面"}
      className={`${className} ${sizeClass}`}
      onClick={onClick}
      style={{ 
        cursor: onClick ? 'pointer' : 'default',
        ...getStyles()
      }}
      onError={handleImageError}
      loading="lazy"
    />
  );
};

export default AlbumCover; 