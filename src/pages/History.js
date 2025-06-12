import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Spinner, Alert } from 'react-bootstrap';
import { FaPlay, FaPause, FaDownload, FaTrash } from 'react-icons/fa';
import { getHistory, clearHistory } from '../services/storage';
import { toast } from 'react-toastify';
import moment from 'moment';
import 'moment/locale/zh-cn';
import HeartButton from '../components/HeartButton';
import './History.css';

// 设置moment为中文
moment.locale('zh-cn');

const History = ({ onPlay, currentTrack, isPlaying, onDownload }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const historyItems = await getHistory();
      setHistory(historyItems);
    } catch (error) {
      console.error('加载历史记录失败:', error);
      toast.error('加载历史记录失败，请重试', { icon: '⚠️' });
    } finally {
      setLoading(false);
    }
  };

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
                      onClick={() => onPlay(item.song)}
                      disabled={currentTrack?.id === item.song.id && !currentTrack?.url}
                    >
                      {currentTrack?.id === item.song.id && isPlaying ? <FaPause /> : <FaPlay />}
                    </Button>
                    <Button 
                      variant="outline-danger" 
                      size="sm"
                      className="me-1"
                      onClick={() => handleClearHistory()}
                    >
                      <FaTrash />
                    </Button>
                    <Button 
                      variant="outline-success" 
                      size="sm"
                      onClick={() => onDownload(item.song)}
                    >
                      <FaDownload />
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