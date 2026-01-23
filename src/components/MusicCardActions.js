import React from 'react';
import { Button, Spinner } from 'react-bootstrap';
import { FaDownload, FaTrash } from 'react-icons/fa';
import HeartButton from './HeartButton';

/**
 * MusicCardActions - 统一的音乐卡片操作按钮组件
 * 
 * @param {Object} track - 歌曲对象
 * @param {Boolean} isDownloading - 是否正在下载当前歌曲
 * @param {Function} onDownload - 下载回调
 * @param {Boolean} showDelete - 是否显示删除按钮（目前统一用 HeartButton 代替，保留参数供未来扩展）
 * @param {Function} onDelete - 删除回调（目前统一用 HeartButton 的 toggle 逻辑）
 */
const MusicCardActions = ({ 
  track, 
  isDownloading, 
  onDownload, 
  showDelete = false, 
  onDelete = null 
}) => {
  return (
    <div className="music-card-actions" onClick={(e) => e.stopPropagation()}>
      {/* 收藏按钮 - 统一使用 HeartButton */}
      <HeartButton 
        track={track} 
      />

        {/* 删除按钮 - 如果明确需要独立删除按钮则显示 */}
        {showDelete && onDelete && (
          <Button
            variant="outline-danger"
            size="sm"
            className="me-1"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(track);
            }}
          >
            <FaTrash />
          </Button>
        )}

        {/* 下载按钮 - 统一下载状态反馈 */}
        <Button
          variant="outline-success"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onDownload(track);
          }}
          disabled={isDownloading}
        >
          {isDownloading ? (
            <Spinner animation="border" size="sm" />
          ) : (
            <FaDownload />
          )}
        </Button>
    </div>
  );
};

export default MusicCardActions;
