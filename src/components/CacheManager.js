import React, { useState } from 'react';
import { FaTrash, FaSync, FaInfoCircle, FaImage, FaTimes } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { clearMemoryCache, CACHE_TYPES } from '../services/memoryCache';

const CacheManager = () => {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cacheStats, setCacheStats] = useState(null);

  const handleClose = () => setShow(false);
  const handleShow = () => {
    setShow(true);
    fetchCacheStats();
  };

  // 格式化字节数为可读格式
  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // 获取缓存统计信息
  const fetchCacheStats = async () => {
    setLoading(true);
    try {
      // 使用navigator.storage.estimate()获取存储使用情况
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        const usedBytes = estimate.usage || 0;
        const totalBytes = estimate.quota || 0;
        const percentUsed = totalBytes ? (usedBytes / totalBytes) * 100 : 0;

        setCacheStats({
          used: formatBytes(usedBytes),
          total: formatBytes(totalBytes),
          percent: percentUsed.toFixed(1)
        });
      } else {
        setCacheStats({
          used: '未知',
          total: '未知',
          percent: 0
        });
      }
    } catch (error) {
      console.error('获取缓存统计失败:', error);
      setCacheStats({
        used: '获取失败',
        total: '获取失败',
        percent: 0
      });
    } finally {
      setLoading(false);
    }
  };

  // 清理特定类型的缓存
  const handleClearCache = async (type) => {
    setLoading(true);
    try {
      clearMemoryCache(type);
      toast.success(`已清理${getCacheTypeName(type)}缓存`);
      fetchCacheStats();
    } catch (error) {
      console.error('清理缓存失败:', error);
      toast.error('清理缓存失败');
    } finally {
      setLoading(false);
    }
  };

  // 清理所有缓存
  const handleClearAllCache = async () => {
    setLoading(true);
    try {
      clearMemoryCache();
      
      // 通知Service Worker清理缓存
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CLEAN_CACHE'
        });
      }
      toast.success('已清理所有缓存');
      fetchCacheStats();
    } catch (error) {
      console.error('清理所有缓存失败:', error);
      toast.error('清理所有缓存失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取缓存类型的显示名称
  const getCacheTypeName = (type) => {
    switch (type) {
      case CACHE_TYPES.SEARCH_RESULTS:
        return '搜索结果';
      case CACHE_TYPES.COVER_IMAGES:
        return '封面URL';
      case CACHE_TYPES.AUDIO_METADATA:
        return '音频元数据';
      case CACHE_TYPES.LYRICS:
        return '歌词';
      case CACHE_TYPES.AUDIO_URLS:
        return '音频链接';
      default:
        return '未知类型';
    }
  };

  return (
    <>
      <button 
        onClick={handleShow}
        className="d-flex align-items-center minimal-action-btn"
        style={{ padding: '4px 12px', fontSize: '0.85rem' }}
      >
        <FaSync className="me-1" /> 缓存管理
      </button>

      {show && (
        <div className="modal-overlay-custom" onClick={handleClose}>
          <div className="modal-container-custom" onClick={e => e.stopPropagation()}>
            <div className="modal-header-custom">
              <h5 className="modal-title-custom">缓存管理</h5>
              <button className="modal-close-custom" onClick={handleClose}>
                <FaTimes size={18} />
              </button>
            </div>
            <div className="modal-body-custom">
              {loading ? (
                <div className="text-center p-4">
                  <span className="spinner-custom" style={{ width: '2rem', height: '2rem' }}></span>
                  <p className="mt-2">正在处理...</p>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <h5>存储使用情况</h5>
                    {cacheStats && (
                      <div className="mb-3">
                        <div className="d-flex justify-content-between mb-1">
                          <span>已使用: {cacheStats.used}</span>
                          <span>总容量: {cacheStats.total}</span>
                        </div>
                        <div className="progress-custom">
                          <div 
                            className="progress-bar-custom" 
                            role="progressbar" 
                            style={{ width: `${cacheStats.percent}%` }}
                            aria-valuenow={cacheStats.percent} 
                            aria-valuemin="0" 
                            aria-valuemax="100"
                          >
                            {cacheStats.percent}%
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="alert-custom alert-info-custom d-flex align-items-center">
                      <FaInfoCircle className="me-2" />
                      <small>已切换到内存级缓存，刷新页面或关闭浏览器后缓存会被清除</small>
                    </div>
                  </div>

                  <h5>内存缓存类型</h5>
                  <ul className="list-group-custom mb-3">
                    {Object.values(CACHE_TYPES).map((type) => (
                      <li 
                        key={type}
                        className="list-group-item-custom d-flex justify-content-between align-items-center"
                      >
                        <div>
                          {getCacheTypeName(type)}
                          <span className="badge-custom ms-2" style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                            {type === CACHE_TYPES.SEARCH_RESULTS && '5分钟'}
                            {type === CACHE_TYPES.COVER_IMAGES && '30分钟'}
                            {type === CACHE_TYPES.AUDIO_METADATA && '10分钟'}
                            {type === CACHE_TYPES.LYRICS && '30分钟'}
                            {type === CACHE_TYPES.AUDIO_URLS && '10分钟'}
                          </span>
                        </div>
                        <button 
                          className="minimal-action-btn text-danger border-danger-subtle"
                          style={{ padding: '2px 10px', fontSize: '0.8rem' }}
                          onClick={() => handleClearCache(type)}
                        >
                          <FaTrash /> 清理
                        </button>
                      </li>
                    ))}
                  </ul>
                  
                  <div className="d-grid gap-2">
                    <button 
                      className="btn-primary-custom"
                      style={{ backgroundColor: 'var(--color-danger)', border: 'none', padding: '10px' }}
                      onClick={handleClearAllCache}
                    >
                      <FaTrash className="me-1" /> 清理所有缓存
                    </button>
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer-custom">
              <button 
                className="minimal-action-btn" 
                onClick={handleClose}
                style={{ padding: '8px 20px' }}
              >
                关闭
              </button>
              <button 
                className="btn-primary-custom"
                onClick={handleClearAllCache}
                style={{ padding: '8px 20px' }}
              >
                清理全部缓存
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CacheManager; 