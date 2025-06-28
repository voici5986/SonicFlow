import React, { useState } from 'react';
import { Button, Modal, ListGroup, Badge, Row, Col } from 'react-bootstrap';
import { FaTrash, FaSync, FaInfoCircle, FaImage } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { clearCache, CACHE_TYPES, getCacheSize, formatBytes } from '../services/cacheService';
import localforage from 'localforage';

const CacheManager = () => {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cacheStats, setCacheStats] = useState(null);
  const [imageCacheStats, setImageCacheStats] = useState(null);

  const handleClose = () => setShow(false);
  const handleShow = () => {
    setShow(true);
    fetchCacheStats();
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

      // 获取图片缓存统计
      const imageCacheSize = await getCacheSize(CACHE_TYPES.COVER_IMAGES_DATA);
      const store = await localforage.createInstance({
        name: 'clMusicApp',
        storeName: CACHE_TYPES.COVER_IMAGES_DATA
      });
      const keys = await store.keys();
      
      setImageCacheStats({
        size: imageCacheSize,
        formattedSize: formatBytes(imageCacheSize),
        count: keys.length,
        percent: (imageCacheSize / (100 * 1024 * 1024)) * 100 // 相对于100MB上限的百分比
      });
      
    } catch (error) {
      console.error('获取缓存统计失败:', error);
      setCacheStats({
        used: '获取失败',
        total: '获取失败',
        percent: 0
      });
      setImageCacheStats({
        size: 0,
        formattedSize: '获取失败',
        count: 0,
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
      await clearCache(type);
      fetchCacheStats();
    } catch (error) {
      console.error('清理缓存失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 清理所有缓存
  const handleClearAllCache = async () => {
    setLoading(true);
    try {
      await clearCache();
      
      // 通知Service Worker清理缓存
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CLEAN_CACHE'
        });
      }
      fetchCacheStats();
    } catch (error) {
      console.error('清理所有缓存失败:', error);
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
      case CACHE_TYPES.COVER_IMAGES_DATA:
        return '封面图片';
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
      <Button 
        variant="outline-secondary" 
        size="sm" 
        onClick={handleShow}
        className="d-flex align-items-center"
      >
        <FaSync className="me-1" /> 缓存管理
      </Button>

      <Modal show={show} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>缓存管理</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loading ? (
            <div className="text-center p-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">加载中...</span>
              </div>
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
                    <div className="progress">
                      <div 
                        className="progress-bar" 
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
                
                {/* 图片缓存统计 */}
                {imageCacheStats && (
                  <div className="mb-3 mt-4">
                    <h5 className="d-flex align-items-center">
                      <FaImage className="me-2" /> 封面图片缓存
                    </h5>
                    <Row className="mb-1">
                      <Col>
                        <span>大小: {imageCacheStats.formattedSize}</span>
                      </Col>
                      <Col className="text-end">
                        <span>图片数量: {imageCacheStats.count}</span>
                      </Col>
                    </Row>
                    <div className="progress">
                      <div 
                        className="progress-bar bg-info" 
                        role="progressbar" 
                        style={{ width: `${imageCacheStats.percent}%` }}
                        aria-valuenow={imageCacheStats.percent} 
                        aria-valuemin="0" 
                        aria-valuemax="100"
                      >
                        {imageCacheStats.percent.toFixed(1)}%
                      </div>
                    </div>
                    <div className="text-end mt-2">
                      <Button 
                        variant="outline-info" 
                        size="sm"
                        onClick={() => handleClearCache(CACHE_TYPES.COVER_IMAGES_DATA)}
                      >
                        <FaTrash className="me-1" /> 清理图片缓存
                      </Button>
                    </div>
                  </div>
                )}
                
                <div className="alert alert-info d-flex align-items-center">
                  <FaInfoCircle className="me-2" />
                  <small>清理缓存可以释放存储空间，但会导致需要重新下载数据</small>
                </div>
              </div>

              <h5>缓存类型</h5>
              <ListGroup className="mb-3">
                {Object.values(CACHE_TYPES).map((type) => (
                  <ListGroup.Item 
                    key={type}
                    className="d-flex justify-content-between align-items-center"
                  >
                    <div>
                      {getCacheTypeName(type)}
                      <Badge bg="secondary" className="ms-2">
                        {type === CACHE_TYPES.SEARCH_RESULTS && '1小时'}
                        {type === CACHE_TYPES.COVER_IMAGES && '24小时'}
                        {type === CACHE_TYPES.COVER_IMAGES_DATA && '7天'}
                        {type === CACHE_TYPES.AUDIO_METADATA && '12小时'}
                        {type === CACHE_TYPES.LYRICS && '24小时'}
                        {type === CACHE_TYPES.AUDIO_URLS && '6小时'}
                      </Badge>
                    </div>
                    <Button 
                      variant="outline-danger" 
                      size="sm"
                      onClick={() => handleClearCache(type)}
                    >
                      <FaTrash /> 清理
                    </Button>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            关闭
          </Button>
          <Button 
            variant="danger" 
            onClick={handleClearAllCache}
            disabled={loading}
          >
            清理所有缓存
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default CacheManager; 