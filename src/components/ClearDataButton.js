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
      <div 
        className="stats-item-notion d-flex align-items-center p-3 rounded-3" 
        onClick={handleShow}
        style={{ 
          cursor: 'pointer',
          backgroundColor: 'var(--card-background)',
          border: '1px dashed var(--color-danger)',
          transition: 'var(--transition-fast)',
          opacity: 0.8
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(231, 76, 60, 0.05)';
          e.currentTarget.style.opacity = 1;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--card-background)';
          e.currentTarget.style.opacity = 0.8;
        }}
      >
        <div className="stats-icon-wrapper me-3 d-flex align-items-center justify-content-center" 
             style={{ 
               width: '40px', 
               height: '40px', 
               borderRadius: '8px', 
               backgroundColor: 'rgba(231, 76, 60, 0.1)',
               color: 'var(--color-danger)'
             }}>
          <FaTrash size={16} />
        </div>
        <div className="flex-grow-1 text-start">
          <div className="small text-danger fw-bold mb-0">管理本地数据</div>
          <div className="small text-muted mb-0">清除缓存或重置同步</div>
        </div>
      </div>

      <Modal show={showModal} onHide={handleClose} centered className="notion-modal">
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="h5 fw-bold">清除本地数据</Modal.Title>
        </Modal.Header>
        <Modal.Body className="py-4">
          <p className="text-muted small mb-4">请选择要从当前设备移除的数据：</p>
          
          <div className="d-flex flex-column gap-2">
            {[
              { id: 'clearFavorites', key: 'favorites', label: '收藏的歌曲' },
              { id: 'clearHistory', key: 'history', label: '播放历史' },
              { id: 'clearSearchHistory', key: 'searchHistory', label: '搜索历史' },
              { id: 'clearCache', key: 'cache', label: '缓存数据 (封面、结果等)' },
              { id: 'clearSyncTimestamp', key: 'syncTimestamp', label: '同步状态 (重置云端同步)' },
            ].map(option => (
              <div key={option.id} className="form-check custom-checkbox-notion p-2 rounded" style={{ transition: 'background 0.2s' }}>
                <input
                  type="checkbox"
                  className="form-check-input ms-0 me-3"
                  id={option.id}
                  checked={selectedOptions[option.key]}
                  onChange={() => handleOptionChange(option.key)}
                  style={{ cursor: 'pointer' }}
                />
                <label className="form-check-label small" htmlFor={option.id} style={{ cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
                  {option.label}
                </label>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 rounded" style={{ backgroundColor: 'rgba(231, 76, 60, 0.05)', border: '1px solid rgba(231, 76, 60, 0.1)' }}>
            <div className="d-flex align-items-start text-danger">
              <div className="small fw-bold">注意:</div>
              <div className="ms-2 small">此操作无法撤销。清除后的本地数据将无法恢复。</div>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button variant="link" className="text-muted text-decoration-none small" onClick={handleClose} disabled={loading}>
            取消
          </Button>
          <Button
            variant="danger"
            className="px-4 py-2 small fw-bold"
            onClick={handleClearData}
            disabled={loading || !Object.values(selectedOptions).some(value => value)}
            style={{ borderRadius: '8px' }}
          >
            {loading ? '正在处理...' : '确认清除'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default ClearDataButton; 