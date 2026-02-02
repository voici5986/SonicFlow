import React, { useState } from 'react';
import { FaTrash, FaTimes } from 'react-icons/fa';
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
      <button 
        className="minimal-action-btn text-danger d-flex align-items-center justify-content-center"
        onClick={handleShow}
        style={{ 
          padding: '8px 16px', 
          borderRadius: 'var(--border-radius-md)',
          backgroundColor: 'rgba(231, 76, 60, 0.1)',
          border: '1px solid rgba(231, 76, 60, 0.2)',
          fontSize: '0.9rem',
          fontWeight: '500',
          transition: 'all 0.2s ease',
          height: '40px'
        }}
      >
        <FaTrash className="me-2" /> 清除数据
      </button>

      {showModal && (
        <div className="modal-overlay-custom" onClick={handleClose}>
          <div className="modal-container-custom" onClick={e => e.stopPropagation()}>
            <div className="modal-header-custom border-0 pb-0">
              <h5 className="modal-title-custom fw-bold">清除本地数据</h5>
              <button className="modal-close-custom" onClick={handleClose}>
                <FaTimes size={18} />
              </button>
            </div>
            <div className="modal-body-custom py-4">
              <p className="text-muted small mb-4">请选择要从当前设备移除的数据：</p>
              
              <div className="d-flex flex-column gap-2">
                {[
                  { id: 'clearFavorites', key: 'favorites', label: '收藏的歌曲' },
                  { id: 'clearHistory', key: 'history', label: '播放历史' },
                  { id: 'clearSearchHistory', key: 'searchHistory', label: '搜索历史' },
                  { id: 'clearCache', key: 'cache', label: '缓存数据 (封面、结果等)' },
                  { id: 'clearSyncTimestamp', key: 'syncTimestamp', label: '同步状态 (重置云端同步)' },
                ].map(option => (
                  <div 
                    key={option.id} 
                    className="form-check custom-checkbox-notion p-2 rounded d-flex align-items-center" 
                    style={{ 
                      transition: 'background 0.2s',
                      backgroundColor: 'var(--color-background-alt)',
                      marginBottom: '4px',
                      border: '1px solid var(--color-border)'
                    }}
                  >
                    <input
                      type="checkbox"
                      className="form-check-input ms-0 me-3 mt-0"
                      id={option.id}
                      checked={selectedOptions[option.key]}
                      onChange={() => handleOptionChange(option.key)}
                      style={{ 
                        cursor: 'pointer',
                        width: '18px',
                        height: '18px',
                        flexShrink: 0
                      }}
                    />
                    <label className="form-check-label small mb-0 w-100" htmlFor={option.id} style={{ cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
                      {option.label}
                    </label>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-3 rounded" style={{ backgroundColor: 'rgba(231, 76, 60, 0.05)', border: '1px solid rgba(231, 76, 60, 0.1)' }}>
                <div className="d-flex align-items-start text-danger">
                  <div className="small fw-bold" style={{ whiteSpace: 'nowrap' }}>注意:</div>
                  <div className="ms-2 small">此操作无法撤销。清除后的本地数据将无法恢复。</div>
                </div>
              </div>
            </div>
            <div className="modal-footer-custom border-0 pt-0">
              <button className="minimal-action-btn" onClick={handleClose} style={{ padding: '8px 16px' }}>
                取消
              </button>
              <button 
                className="minimal-action-btn bg-danger text-white border-0" 
                onClick={handleClearData}
                disabled={loading || !Object.values(selectedOptions).some(v => v)}
                style={{ padding: '8px 20px', borderRadius: 'var(--border-radius-md)' }}
              >
                {loading ? <span className="spinner-custom" style={{ width: '1rem', height: '1rem' }}></span> : '确认清除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ClearDataButton; 