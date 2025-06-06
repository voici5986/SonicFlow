import React, { useState, useEffect } from 'react';
import { Button } from 'react-bootstrap';
import { FaHeart, FaRegHeart } from 'react-icons/fa';
import { isFavorite, toggleFavorite } from '../services/storage';
import { toast } from 'react-toastify';

const HeartButton = ({ 
  track, 
  size = 'sm', 
  className = '', 
  variant = 'outline-danger',
  showText = false
}) => {
  const [isFav, setIsFav] = useState(false);

  // 组件挂载时检查歌曲是否已收藏
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      const favStatus = await isFavorite(track.id);
      setIsFav(favStatus);
    };
    
    checkFavoriteStatus();
  }, [track.id]);

  // 切换收藏状态
  const handleToggleFavorite = async () => {
    try {
      const isAdded = await toggleFavorite(track);
      setIsFav(isAdded);
      
      // 显示操作反馈
      toast.success(
        isAdded ? '已添加到收藏' : '已从收藏中移除', 
        { icon: isAdded ? '❤️' : '💔', className: 'custom-toast' }
      );
    } catch (error) {
      console.error('收藏操作失败:', error);
      toast.error('操作失败，请重试', { icon: '⚠️', className: 'custom-toast error-toast' });
    }
  };

  // 检查size是否为数字，用于图标尺寸
  const iconSize = typeof size === 'number' ? size : undefined;
  const buttonSize = typeof size === 'string' ? size : 'sm';

  return (
    <Button
      onClick={handleToggleFavorite}
      variant={variant}
      size={buttonSize}
      className={className}
      title={isFav ? '取消收藏' : '收藏'}
    >
      {isFav ? 
        <FaHeart color="red" size={iconSize} /> : 
        <FaRegHeart size={iconSize} />
      }
      {showText && (
        <span className="ms-1">{isFav ? '已收藏' : '收藏'}</span>
      )}
    </Button>
  );
};

export default HeartButton; 