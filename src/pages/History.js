import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Spinner, Alert } from 'react-bootstrap';
import { FaPlay, FaPause, FaDownload, FaTrash } from 'react-icons/fa';
import { getHistory, clearHistory } from '../services/storage';
import { toast } from 'react-toastify';
import moment from 'moment';
import 'moment/locale/zh-cn';
import HeartButton from '../components/HeartButton';
import './History.css';
import { downloadTrack } from '../services/downloadService';
import { usePlayer } from '../contexts/PlayerContext';

// 设置moment为中文
moment.locale('zh-cn');

const History = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [currentDownloadingTrack, setCurrentDownloadingTrack] = useState(null);
  
  // 从PlayerContext获取状态和方法
  const { handlePlay, currentTrack, isPlaying, fetchCover, coverCache } = usePlayer();

  // 定义loadHistory函数在useEffect之前
  const loadHistory = async () => {
    setLoading(true);
    try {
      const historyItems = await getHistory();
      
      // 使用PlayerContext的fetchCover方法获取封面
      const itemsWithCover = await Promise.all(
        historyItems.map(async (item) => {
          if (item.song.pic_id && !item.song.picUrl) {
            // 先检查PlayerContext的缓存
            const cacheKey = `${item.song.source}-${item.song.pic_id}-300`;
            if (coverCache[cacheKey]) {
              return { 
                ...item, 
                song: { ...item.song, picUrl: coverCache[cacheKey] } 
              };
            }
            
            // 如果缓存中没有，则使用fetchCover获取
            const coverUrl = await fetchCover(item.song.source, item.song.pic_id);
            return { 
              ...item, 
              song: { ...item.song, picUrl: coverUrl } 
            };
          }
          return item;
        })
      );
      
      setHistory(itemsWithCover);
    } catch (error) {
      console.error('加载历史记录失败:', error);
      toast.error('加载历史记录失败，请重试', { icon: '⚠️' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClearHistory = async () => {
    if (window.confirm('确定要清空全部历史记录吗？此操作不可恢复。')) {
      try {
        await clearHistory();
        setHistory([]);
        toast.success('历史记录已清空', { icon: '✅' });
      } catch (error) {
        console.error('清空历史记录失败:', error);
        toast.error('操作失败，请重试', { icon: '⚠️' });
      }
    }
  };

  const formatCompactTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return moment(date).format('MM-DD  HH:mm');
  };

  // 处理下载功能
  const handleDownload = async (track) => {
    try {
      // 使用下载服务模块处理下载
      setDownloading(true);
      setCurrentDownloadingTrack(track);
      
      await downloadTrack(
        track, 
        999, // 使用无损音质
        null, // 下载开始回调
        () => {
          // 下载结束回调
          setDownloading(false);
          setCurrentDownloadingTrack(null);
        }
      );
    } catch (error) {
      console.error('Download error:', error);
      toast.error('下载失败，请稍后重试', {
        icon: '❌',
        duration: 3000
      });
      setDownloading(false);
      setCurrentDownloadingTrack(null);
    }
  };

  return (
    <Container className="my-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>播放历史</h1>
        {history.length > 0 && (
          <Button 
            variant="outline-danger" 
            size="sm"
            onClick={handleClearHistory}
          >
            <FaTrash className="me-1" /> 清空历史
          </Button>
        )}
      </div>
      
      {loading ? (
        <div className="text-center my-5">
          <Spinner animation="border" />
        </div>
      ) : history.length === 0 ? (
        <Alert variant="info" className="text-center">
          <p className="mb-0">暂无播放历史记录</p>
        </Alert>
      ) : (
        <Row className="g-4">
          {history.map((item) => (
            <Col key={item.timestamp} xs={12} sm={6} md={4} lg={3}>
              <Card 
                className="h-100 history-card-timestamp" 
                data-id={item.song.id} 
                data-timestamp={formatCompactTimestamp(item.timestamp)}
              >
                <Card.Body>
                  <div className="d-flex align-items-center">
                    <img
                      src={item.song.picUrl || 'default_cover.jpg'}
                      alt="专辑封面"
                      className="me-3 rounded"
                      style={{ 
                        width: '60px', 
                        height: '60px',
                        objectFit: 'cover',
                        backgroundColor: '#f5f5f5' 
                      }}
                      onError={(e) => {
                        e.target.src = 'default_cover.png';
                      }}
                    />
                    <div className="text-truncate">
                      <h6 className="mb-1 text-truncate">{item.song.name}</h6>
                      <small className="text-muted d-block text-truncate">{item.song.artist}</small>
                      <small className="text-muted d-block text-truncate">{item.song.album}</small>
                    </div>
                  </div>
                  
                  <div className="mt-2 d-flex justify-content-end">
                      <Button 
                        variant="outline-primary" 
                        size="sm"
                        className="me-1"
                        onClick={() => handlePlay(item.song)}
                        disabled={currentTrack?.id === item.song.id && !currentTrack?.url}
                      >
                        {currentTrack?.id === item.song.id && isPlaying ? <FaPause /> : <FaPlay />}
                      </Button>
                    <HeartButton 
                      track={item.song} 
                      size={16}
                      variant="outline-danger"
                      className="me-1" 
                    />
                    <Button 
                      variant="outline-success" 
                      size="sm"
                      onClick={() => handleDownload(item.song)}
                      disabled={downloading && currentDownloadingTrack?.id === item.song.id}
                    >
                      {downloading && currentDownloadingTrack?.id === item.song.id ? 
                        <Spinner animation="border" size="sm" /> : 
                        <FaDownload />
                      }
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </Container>
  );
};

export default History; 