import React, { useState, useEffect } from 'react';
import { Button } from 'react-bootstrap';
import { FaHeart, FaRegHeart } from 'react-icons/fa';
import { isFavorite, toggleFavorite, isFavoritesFull } from '../services/storage';
import { toast } from 'react-toastify';

const HeartButton = ({ 
  track, 
  size = 'sm', 
  className = '', 
  variant = 'outline-danger',
  showText = false,
  onFavoritesChange = null
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
      // 如果当前不是收藏状态，先检查是否已满
      if (!isFav) {
        const full = await isFavoritesFull();
        if (full) {
          toast.error('收藏已达上限(500首)，请删除部分收藏后再试', { 
            icon: '⚠️', 
            className: 'custom-toast error-toast',
            autoClose: 5000
          });
          return;
        }
      }

      const result = await toggleFavorite(track);
      
      if (result.full) {
        toast.error('收藏已达上限(500首)，请删除部分收藏后再试', { 
          icon: '⚠️', 
          className: 'custom-toast error-toast',
          autoClose: 5000
        });
        return;
      }
      
      setIsFav(result.added);
      
      // 通知父组件收藏状态已更改
      if (onFavoritesChange) {
        onFavoritesChange();
      }
      
      // 显示操作反馈
      toast.success(
        result.added ? '已添加到收藏' : '已从收藏中移除', 
        { icon: result.added ? '❤️' : '💔', className: 'custom-toast' }
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