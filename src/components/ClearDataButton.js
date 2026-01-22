import React, { useState } from 'react';
import { Button, Modal } from 'react-bootstrap';
import { FaTrash } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { clearMemoryCache } from '../services/memoryCache';
import {
  clearHistory,
  clearSearchHistory,
  saveFavorites,
  resetPendingChanges
} from '../services/storage';
import { clearSyncTimestamp } from '../services/syncService';
import { useAuth } from '../contexts/AuthContext';

const ClearDataButton = ({ onClick }) => {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState({
    favorites: false,
    history: true,
    searchHistory: true,
    cache: true,
    syncTimestamp: true
  });

  const { currentUser } = useAuth();

  const handleClose = () => setShowModal(false);
  const handleShow = () => {
    if (onClick) onClick();
    setShowModal(true);
  };

  const handleOptionChange = (option) => {
    setSelectedOptions({
      ...selectedOptions,
      [option]: !selectedOptions[option]
    });
  };

  const handleClearData = async () => {
    setLoading(true);
    try {
      const operations = [];

      // 清除收藏
      if (selectedOptions.favorites) {
        operations.push(saveFavorites([]));
      }

      // 清除历史记录
      if (selectedOptions.history) {
        operations.push(clearHistory());
      }

      // 清除搜索历史
      if (selectedOptions.searchHistory) {
        operations.push(clearSearchHistory());
      }

      // 清除缓存
      if (selectedOptions.cache) {
        operations.push(Promise.resolve(clearMemoryCache()));

        // 通知Service Worker清理缓存
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'CLEAN_CACHE'
          });
        }
      }

      // 清除同步时间戳
      if (selectedOptions.syncTimestamp) {
        const uid = currentUser ? currentUser.uid : null;
        operations.push(clearSyncTimestamp(uid));
      }

      // 重置待同步变更计数
      operations.push(resetPendingChanges());

      // 等待所有操作完成
      await Promise.all(operations);

      // 显示成功消息
      toast.success('本地数据已清除');

      // 触发自定义事件以通知其他组件刷新
      window.dispatchEvent(new CustomEvent('local:data_cleared'));

      // 关闭模态框
      handleClose();
    } catch (error) {
      console.error('清除数据失败:', error);
      toast.error('清除数据时发生错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="stats-item clickable" onClick={handleShow}>
        <div className="stats-icon cache">
          <FaTrash />
        </div>
        <div className="stats-content">
          <div className="stats-value">清除</div>
          <p className="stats-label">本地数据</p>
        </div>
      </div>

      <Modal show={showModal} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>清除本地数据</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>请选择要清除的数据:</p>
          <div className="form-check mb-2">
            <input
              type="checkbox"
              className="form-check-input"
              id="clearFavorites"
              checked={selectedOptions.favorites}
              onChange={() => handleOptionChange('favorites')}
            />
            <label className="form-check-label" htmlFor="clearFavorites">
              收藏的歌曲
            </label>
          </div>
          <div className="form-check mb-2">
            <input
              type="checkbox"
              className="form-check-input"
              id="clearHistory"
              checked={selectedOptions.history}
              onChange={() => handleOptionChange('history')}
            />
            <label className="form-check-label" htmlFor="clearHistory">
              播放历史
            </label>
          </div>
          <div className="form-check mb-2">
            <input
              type="checkbox"
              className="form-check-input"
              id="clearSearchHistory"
              checked={selectedOptions.searchHistory}
              onChange={() => handleOptionChange('searchHistory')}
            />
            <label className="form-check-label" htmlFor="clearSearchHistory">
              搜索历史
            </label>
          </div>
          <div className="form-check mb-2">
            <input
              type="checkbox"
              className="form-check-input"
              id="clearCache"
              checked={selectedOptions.cache}
              onChange={() => handleOptionChange('cache')}
            />
            <label className="form-check-label" htmlFor="clearCache">
              缓存数据 (封面图片、搜索结果等)
            </label>
          </div>
          <div className="form-check mb-2">
            <input
              type="checkbox"
              className="form-check-input"
              id="clearSyncTimestamp"
              checked={selectedOptions.syncTimestamp}
              onChange={() => handleOptionChange('syncTimestamp')}
            />
            <label className="form-check-label" htmlFor="clearSyncTimestamp">
              同步时间戳 (确保下次可从云端获取所有数据)
            </label>
          </div>
          <div className="alert alert-warning mt-3">
            <strong>注意:</strong> 此操作无法撤销。清除后的数据将无法恢复。
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            取消
          </Button>
          <Button
            variant="danger"
            onClick={handleClearData}
            disabled={loading || !Object.values(selectedOptions).some(value => value)}
          >
            {loading ? '清除中...' : '确认清除'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default ClearDataButton; 