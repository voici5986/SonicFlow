import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Spinner, Alert } from 'react-bootstrap';
import { FaPlay, FaPause, FaDownload, FaTrash } from 'react-icons/fa';
import { getHistory, clearHistory } from '../services/storage';
import { toast } from 'react-toastify';
import moment from 'moment';
import 'moment/locale/zh-cn';
import AlbumCover from '../components/AlbumCover';
import HeartButton from '../components/HeartButton';
import MusicCardActions from '../components/MusicCardActions';
import './History.css';
import { downloadTrack } from '../services/downloadService';
import { usePlayer } from '../contexts/PlayerContext';
import { useAuth } from '../contexts/AuthContext';

// 设置moment为中文
moment.locale('zh-cn');

const History = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [currentDownloadingTrack, setCurrentDownloadingTrack] = useState(null);
  
  // 从PlayerContext获取状态和方法
  const { handlePlay, currentTrack, isPlaying } = usePlayer();
  
  // 从AuthContext获取用户状态
  const { currentUser } = useAuth();

  // 添加单独的播放处理函数
  const handleTrackPlay = (track) => {
    console.log('从历史记录播放曲目:', track.id, track.name);
    // 创建纯歌曲列表作为播放列表
    const songsList = history.map(item => item.song);
    const trackIndex = songsList.findIndex(item => item.id === track.id);
    handlePlay(track, trackIndex >= 0 ? trackIndex : -1, songsList);
  };

  // 定义loadHistory函数在useEffect之前
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

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 监听收藏状态变化，同步更新历史记录中的心形图标
  useEffect(() => {
    const handleFavoritesChanged = () => {
      setHistory(prev => [...prev]);
    };

    window.addEventListener('favorites_changed', handleFavoritesChanged);
    return () => window.removeEventListener('favorites_changed', handleFavoritesChanged);
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

  // 渲染登录提醒组件
  const renderLoginReminder = () => {
    if (!currentUser) {
      return (
        <div className="login-prompt-container">
          <div className="d-flex align-items-center login-prompt-content">
            <div className="flex-grow-1">
              <p className="login-prompt-desc mb-0">同步播放历史，在任何设备继续音乐旅程。</p>
            </div>
            <div className="login-prompt-action">
              <Button 
                href="#/auth"
                className="ms-md-3 minimal-action-btn"
                style={{ minWidth: '100px' }}
              >
                立即登录
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Container className="my-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>播放历史</h1>
        {history.length > 0 && (
          <Button 
            size="sm"
            className="minimal-action-btn"
            onClick={handleClearHistory}
          >
            <FaTrash className="me-1" /> 清空历史
          </Button>
        )}
      </div>
      
      {/* 添加登录提醒 */}
      {renderLoginReminder()}
      
      {loading ? (
        <div className="text-center my-5">
          <Spinner animation="border" />
        </div>
      ) : history.length === 0 ? null : (
        <Row className="g-3">
          {history.map((item) => (
            <Col key={item.timestamp} xs={12} md={6}>
              <Card 
                className={`music-card ${currentTrack?.id === item.song.id ? 'is-active' : ''}`}
                onClick={() => handleTrackPlay(item.song)}
              >
                <div className="music-card-row">
                  <div className="music-card-info">
                    <h6>{item.song.name}</h6>
                    <small>{item.song.artist}</small>
                  </div>
                  
                  <MusicCardActions 
                    track={item.song}
                    isDownloading={downloading && currentDownloadingTrack?.id === item.song.id}
                    onDownload={handleDownload}
                  />
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </Container>
  );
};

export default History; 
