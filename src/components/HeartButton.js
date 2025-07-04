import React, { useState, useEffect, useCallback } from 'react';
import { FaHeart, FaRegHeart } from 'react-icons/fa';
import { Button } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { toggleFavorite, isFavorite } from '../services/storage';
import { useAuth } from '../contexts/AuthContext';
import { triggerDelayedSync } from '../services/syncService';
import { useSync } from '../contexts/SyncContext';

const HeartButton = ({ track, className = '', size = 'sm', onToggle, variant = 'outline-danger' }) => {
  const [isFav, setIsFav] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const { currentUser } = useAuth();
  const { updatePendingChanges } = useSync();

  // 检查是否已收藏
  const checkFavoriteStatus = useCallback(async () => {
    if (!track || !track.id) return;
    const favStatus = await isFavorite(track.id);
    setIsFav(favStatus);
  }, [track]);

  // 初始化时检查收藏状态
  useEffect(() => {
    checkFavoriteStatus();
  }, [checkFavoriteStatus]);

  // 处理收藏/取消收藏
  const handleToggleFavorite = async () => {
    if (!track || !track.id || isToggling) return;
    
    setIsToggling(true);
    try {
      // 切换收藏状态
      const result = await toggleFavorite(track);
      
      // 如果收藏列表已满，显示提示
      if (result.error === 'favorites_limit') {
        toast.warning('收藏列表已满，请删除一些收藏后再试');
        return;
      }
      
      // 更新按钮状态
      setIsFav(result.added);
      
      // 如果传入了回调函数，执行它
      if (onToggle) {
        onToggle(result.added);
      }
      
      // 如果已登录并添加了收藏，增加待同步计数，并触发延迟同步
      if (currentUser && !currentUser.isLocal && result.added) {
        try {
          const { incrementPendingChanges } = await import('../services/storage');
          // 增加收藏待同步计数
          await incrementPendingChanges('favorites');
          // 更新待同步项显示
          updatePendingChanges();
          // 触发30秒后的延迟同步
          triggerDelayedSync(currentUser.uid);
        } catch (error) {
          console.error('更新待同步计数失败:', error);
        }
      }
    } catch (error) {
      console.error('Toggle favorite error:', error);
      toast.error('操作失败，请重试');
    } finally {
      setIsToggling(false);
    }
  };

  // 检查size是否为数字，用于图标尺寸
  const iconSize = typeof size === 'number' ? size : undefined;
  const buttonSize = typeof size === 'string' ? size : 'sm';

  return (
    <Button
      variant={variant}
      size={buttonSize}
      className={className}
      onClick={handleToggleFavorite}
      disabled={isToggling}
      title={isFav ? '取消收藏' : '收藏'}
    >
      {isFav ? 
        <FaHeart color="red" size={iconSize} /> : 
        <FaRegHeart size={iconSize} />
      }
    </Button>
  );
};

export default HeartButton; 