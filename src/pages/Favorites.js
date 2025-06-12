import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Button, Spinner, Modal, Form, Alert, ProgressBar } from 'react-bootstrap';
import { FaPlay, FaPause, FaDownload, FaTrash, FaFileExport, FaFileImport, FaCloudDownloadAlt, FaGithub } from 'react-icons/fa';
import { getFavorites, toggleFavorite, saveFavorites, MAX_FAVORITES_ITEMS } from '../services/storage';
import { toast } from 'react-toastify';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE || '/api';

const Favorites = ({ onPlay, currentTrack, isPlaying, onDownload }) => {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState(null);
  const [importStatus, setImportStatus] = useState([]);
  const [importProgress, setImportProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef(null);
  
  // 新增批量下载相关状态
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState([]);
  const [downloadQuality, setDownloadQuality] = useState('320'); // 默认选择320kbps

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    setLoading(true);
    try {
      const favItems = await getFavorites();
      setFavorites(favItems);
    } catch (error) {
      console.error('加载收藏失败:', error);
      toast.error('加载收藏失败，请重试', { icon: '⚠️' });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromFavorites = async (track) => {
    try {
      await toggleFavorite(track);
      // 从当前列表中移除
      setFavorites(prevFavorites => prevFavorites.filter(item => item.id !== track.id));
      toast.success('已从收藏中移除', { icon: '💔' });
    } catch (error) {
      console.error('移除收藏失败:', error);
      toast.error('操作失败，请重试', { icon: '⚠️' });
    }
  };

  const handleDownload = async (track) => {
    // 使用从props传入的onDownload函数
    if (typeof onDownload === 'function') {
      onDownload(track);
    } else {
      console.error('下载功能未实现');
      toast.error('下载功能暂不可用', { icon: '⚠️' });
    }
  };

  // 搜索并匹配歌曲
  const searchTrack = async (trackInfo, source) => {
    try {
      // 辅助函数：使用指定关键词搜索歌曲
      const searchWithKeyword = async (keyword, source) => {
        try {
          return await axios.get(`${API_BASE}`, {
            params: {
              types: 'search',
              source: source,
              name: keyword,
              count: 15, // 增加结果数量
              pages: 1
            }
          });
        } catch (error) {
          console.error(`搜索 "${keyword}" 在 ${source} 失败:`, error);
          return null;
        }
      };
      
      // 1. 尝试完整歌曲名搜索
      let response = await searchWithKeyword(trackInfo.name, source);
      
      // 2. 如果完整搜索失败，尝试简化搜索（移除特殊符号）
      if (!response || !response.data || response.data.length === 0) {
        const simplifiedName = trackInfo.name.replace(/[^\w\s\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/g, '');
        if (simplifiedName !== trackInfo.name) {
          console.log(`尝试简化歌名搜索: ${simplifiedName}`);
          response = await searchWithKeyword(simplifiedName, source);
        }
      }
      
      // 3. 如果还是失败，尝试只用前半部分歌名（处理日文歌名通常很长的情况）
      if (!response || !response.data || response.data.length === 0) {
        const nameFirst = trackInfo.name.split(' ')[0]; // 获取第一个空格前的部分
        if (nameFirst && nameFirst !== trackInfo.name && nameFirst.length > 1) {
          console.log(`尝试使用部分歌名搜索: ${nameFirst}`);
          response = await searchWithKeyword(nameFirst, source);
        }
      }
      
      // 4. 如果歌名搜索都失败，尝试艺术家+简短歌名搜索
      if (!response || !response.data || response.data.length === 0) {
        const shortQuery = `${trackInfo.artist} ${trackInfo.name.substring(0, 5)}`;
        console.log(`尝试艺术家+简短歌名搜索: ${shortQuery}`);
        response = await searchWithKeyword(shortQuery, source);
      }
      
      // 如果所有尝试都失败，返回null
      if (!response || !response.data || response.data.length === 0) {
        return null;
      }
      
      // 搜索成功，开始匹配过程
      console.log(`为 "${trackInfo.name}" 找到 ${response.data.length} 个结果`);
      
      // 1. 尝试通过ID直接匹配
      if (trackInfo.id) {
        const idMatch = response.data.find(item => item.id === trackInfo.id);
        if (idMatch) {
          console.log(`通过ID匹配成功: ${idMatch.name}`);
          return idMatch; // 完美匹配
        }
      }
      
      // 2. 尝试通过URL匹配
      if (trackInfo.url) {
        const urlMatch = response.data.find(item => item.url === trackInfo.url);
        if (urlMatch) {
          console.log(`通过URL匹配成功: ${urlMatch.name}`);
          return urlMatch;
        }
      }

      // 3. 尝试歌曲名和艺术家完全匹配
      const exactMatch = response.data.find(item => 
        item.name.toLowerCase() === trackInfo.name.toLowerCase() && 
        item.artist.toLowerCase() === trackInfo.artist.toLowerCase()
      );
      
      if (exactMatch) {
        console.log(`歌名和艺术家完全匹配成功: ${exactMatch.name}`);
        return exactMatch;
      }
      
      // 4. 找出所有歌名匹配的结果
      const nameMatches = response.data.filter(item => 
        item.name.toLowerCase() === trackInfo.name.toLowerCase()
      );
      
      if (nameMatches.length > 0) {
        console.log(`找到 ${nameMatches.length} 个歌名匹配结果`);
        return nameMatches[0]; // 返回第一个歌名匹配的结果
      }
      
      // 5. 没有精确匹配，尝试部分匹配
      // 检查歌名是否包含或被包含
      const partialMatch = response.data.find(item => 
        item.name.toLowerCase().includes(trackInfo.name.toLowerCase()) || 
        trackInfo.name.toLowerCase().includes(item.name.toLowerCase())
      );
      
      if (partialMatch) {
        console.log(`部分歌名匹配成功: ${partialMatch.name}`);
        return partialMatch;
      }
      
      // 6. 如果没有任何匹配，返回第一个结果作为最佳猜测
      console.log(`无精确匹配，使用第一个结果: ${response.data[0].name}`);
      return response.data[0];
      
    } catch (error) {
      console.error(`在 ${source} 搜索 "${trackInfo.name}" 时发生错误:`, error);
      return null;
    }
  };

  // 导出收藏功能
  const handleExport = () => {
    try {
      // 创建一个包含扩展元数据的导出数据对象
      const exportData = {
        version: '1.1', // 更新版本号标识包含扩展数据
        timestamp: Date.now(),
        favorites: favorites.map(item => ({
          // 基本信息
          name: item.name,
          artist: item.artist,
          album: item.album,
          source: item.source,
          id: item.id,
          pic_id: item.pic_id,
          lyric_id: item.lyric_id,
          
          // 扩展信息（用于更精确匹配）
          url: item.url, // 歌曲详情页URL
          play_url: item.play_url, // 播放URL (如果存在)
          duration: item.duration, // 时长
          picUrl: item.picUrl, // 图片URL
          
          // 其他可能有助于匹配的信息
          alia: item.alia, // 别名
          mark: item.mark, // 标记
          tns: item.tns, // 翻译名
          ar: item.ar, // 完整艺术家信息
          al: item.al, // 完整专辑信息
        }))
      };

      // 将数据转换为 JSON 字符串
      const jsonData = JSON.stringify(exportData, null, 2);
      
      // 创建 Blob 对象
      const blob = new Blob([jsonData], { type: 'application/json' });
      
      // 创建下载链接
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `music_favorites_${new Date().toISOString().split('T')[0]}.json`;
      
      // 触发下载
      document.body.appendChild(link);
      link.click();
      
      // 清理
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      toast.success('收藏导出成功 (包含扩展数据)', { icon: '✅' });
    } catch (error) {
      console.error('导出失败:', error);
      toast.error('导出失败，请重试', { icon: '❌' });
    }
  };

  // 处理文件选择
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        
        // 验证数据格式
        if (!data.favorites || !Array.isArray(data.favorites)) {
          throw new Error('无效的文件格式');
        }
        
        setImportData(data);
        
        // 初始化导入状态
        setImportStatus(data.favorites.map(() => ({ status: 'pending', message: '等待导入' })));
        
        toast.info(`找到 ${data.favorites.length} 首歌曲`, { icon: '📄' });
      } catch (error) {
        console.error('读取文件失败:', error);
        toast.error('无法读取文件或格式不正确', { icon: '❌' });
      }
    };
    
    reader.readAsText(file);
  };

  // 开始导入过程
  const startImport = async () => {
    if (!importData || !importData.favorites || isImporting) {
      return;
    }

    setIsImporting(true);
    
    const currentFavorites = await getFavorites();
    const newFavorites = [...currentFavorites];
    const newStatus = [...importStatus];
    let importedCount = 0;
    
    // 逐个处理歌曲
    for (let i = 0; i < importData.favorites.length; i++) {
      const track = importData.favorites[i];
      
      // 更新进度
      setImportProgress(Math.floor((i / importData.favorites.length) * 100));
      
      try {
        // 首先检查是否已存在相同ID的歌曲
        const existingByIdIndex = currentFavorites.findIndex(item => 
          item.id === track.id && item.source === track.source
        );
        
        if (existingByIdIndex >= 0) {
          newStatus[i] = { status: 'exists', message: '已存在于收藏中' };
          setImportStatus([...newStatus]); // 立即更新状态
          continue;
        }
        
        // 检查是否存在同名歌曲
        const existingByNameIndex = currentFavorites.findIndex(item => 
          item.name === track.name && 
          item.artist === track.artist
        );
        
        if (existingByNameIndex >= 0) {
          newStatus[i] = { status: 'exists', message: '同名歌曲已存在' };
          setImportStatus([...newStatus]); // 立即更新状态
          continue;
        }
        
        // 设置初始匹配状态
        newStatus[i] = { status: 'pending', message: '正在匹配...' };
        setImportStatus([...newStatus]);
        
        // 寻找匹配的歌曲
        let matchedTrack = null;
        
        // 首先在原数据的来源平台上搜索
        matchedTrack = await searchTrack(track, track.source);
        
        // 只有在原平台完全没有找到匹配时，才尝试其他平台
        if (!matchedTrack) {
          newStatus[i] = { status: 'pending', message: '尝试其他平台匹配中...' };
          setImportStatus([...newStatus]);
          
          const sources = ['netease', 'tencent', 'migu']; // 选择主流音乐平台
          
          for (const source of sources) {
            if (source !== track.source) {
              matchedTrack = await searchTrack(track, source);
              if (matchedTrack) {
                newStatus[i] = { status: 'pending', message: `在${source}找到匹配` };
                setImportStatus([...newStatus]);
                break;
              }
            }
          }
        }
        
        if (matchedTrack) {
          console.log("找到匹配歌曲:", matchedTrack.name, "准备添加到收藏");
          
          // 避免重复添加
          const isDuplicate = newFavorites.some(item => 
            item.id === matchedTrack.id && item.source === matchedTrack.source
          );
          
          if (!isDuplicate) {
            // 添加相关的URL字段和封面
            if (!matchedTrack.picUrl && matchedTrack.pic_id) {
              try {
                matchedTrack.picUrl = await fetchCover(matchedTrack.source, matchedTrack.pic_id);
              } catch (error) {
                console.error("获取封面失败:", error);
              }
            }
            
            // 确保添加到新收藏列表开头（与toggleFavorite逻辑一致）
            newFavorites.unshift(matchedTrack);
            importedCount++;
            
            // 更新状态为成功
            newStatus[i] = { 
              status: 'success', 
              message: `成功匹配: ${matchedTrack.source}` 
            };
            console.log(`歌曲 "${track.name}" 成功匹配并添加到收藏`);
          } else {
            newStatus[i] = { status: 'duplicate', message: '重复歌曲' };
          }
        } else {
          newStatus[i] = { status: 'fail', message: '未找到匹配歌曲' };
        }
      } catch (error) {
        console.error(`导入歌曲 "${track.name}" 失败:`, error);
        newStatus[i] = { status: 'error', message: '导入出错' };
      }
      
      // 更新状态
      setImportStatus([...newStatus]);
      
      // 每处理完一首歌曲立即保存一次（而不是每5首保存一次）
      if (importedCount > 0) {
        try {
          await saveFavorites(newFavorites);
          console.log(`已保存 ${importedCount} 首歌曲到收藏`);
        } catch (e) {
          console.error("保存收藏失败:", e);
        }
      }
    }
    
    // 导入完成后刷新收藏列表
    try {
      if (importedCount > 0) {
        await saveFavorites(newFavorites);
        await loadFavorites(); // 重新加载收藏列表
        toast.success(`导入完成，成功添加 ${importedCount} 首歌曲`, { icon: '✅' });
      } else {
        toast.info('没有新增歌曲', { icon: 'ℹ️' });
      }
    } catch (error) {
      console.error("完成导入时出错:", error);
      toast.error("保存收藏失败，请重试", { icon: '❌' });
    }
    
    // 更新完成状态
    setImportProgress(100);
    setIsImporting(false);
  };
  
  // 辅助函数：获取歌曲封面URL
  const fetchCover = async (source, picId, size = 300) => {
    if (!picId) return null;
    try {
      const response = await axios.get(`${API_BASE}`, {
        params: {
          types: 'pic',
          source: source,
          id: picId,
          size: size
        }
      });
      return response.data.url.replace(/\\/g, '');
    } catch (error) {
      console.error('获取封面失败:', error);
      return null;
    }
  };

  // 关闭导入窗口
  const handleCloseImport = () => {
    setShowImportModal(false);
    setImportData(null);
    setImportStatus([]);
    setImportProgress(0);
    setIsImporting(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 处理批量下载
  const handleBulkDownload = async () => {
    if (favorites.length === 0) {
      toast.info('没有收藏的歌曲可下载', { icon: 'ℹ️' });
      return;
    }
    
    setShowDownloadModal(true);
    setDownloadStatus(favorites.map(() => ({ status: 'pending', message: '等待下载' })));
    setDownloadQuality('320'); // 重置为默认音质
  };
  
  // 开始批量下载过程
  const startBulkDownload = async () => {
    if (isDownloading || favorites.length === 0) return;
    
    // 使用用户选择的音质
    const actualQuality = downloadQuality;
    
    setIsDownloading(true);
    let successCount = 0;
    const newStatus = [...downloadStatus];
    
    // 根据音质设置显示名称
    const qualityName = actualQuality === '999' ? '无损音质' : '高音质';
    
    for (let i = 0; i < favorites.length; i++) {
      try {
        // 更新进度
        setDownloadProgress(Math.floor((i / favorites.length) * 100));
        
        // 更新状态为下载中
        newStatus[i] = { status: 'downloading', message: `获取${qualityName}...` };
        setDownloadStatus([...newStatus]);
        
        // 获取下载链接
        const track = favorites[i];
        
        const response = await axios.get(`${API_BASE}`, {
          params: {
            types: 'url',
            source: track.source,
            id: track.id,
            br: actualQuality
          }
        });
        
        const downloadUrl = response.data.url.replace(/\\/g, '');
        if (!downloadUrl) {
          throw new Error('无效的下载链接');
        }
        
        // 确定文件扩展名
        const extension = getFileExtension(downloadUrl);
        const fileName = `${track.name} - ${track.artist}.${extension}`;
        
        // 显示文件大小信息（如果API返回）
        let fileSize = '';
        if (response.data.size) {
          const sizeMB = (parseInt(response.data.size) / (1024 * 1024)).toFixed(2);
          fileSize = ` (${sizeMB} MB)`;
          newStatus[i] = { status: 'downloading', message: `下载中${fileSize}...` };
          setDownloadStatus([...newStatus]);
        }
        
        // 使用现代方法下载文件
        try {
          // 获取音频内容
          newStatus[i] = { status: 'downloading', message: `准备下载${fileSize}...` };
          setDownloadStatus([...newStatus]);
          
          const audioResponse = await fetch(downloadUrl);
          const blob = await audioResponse.blob();
          
          // 创建下载链接
          const blobUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = fileName;
          link.style.display = 'none';
          
          // 下载文件
          document.body.appendChild(link);
          link.click();
          
          // 清理
          setTimeout(() => {
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
          }, 100);
          
        } catch (fetchError) {
          console.error('Fetch下载失败，尝试备用方法:', fetchError);
          
          // 备用下载方法
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.setAttribute('download', fileName);
          link.setAttribute('target', '_blank');
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        
        // 更新成功状态
        successCount++;
        newStatus[i] = { status: 'success', message: `下载成功${fileSize}` };
        
        // 在处理之间添加延迟，避免浏览器拦截
        await new Promise(resolve => setTimeout(resolve, 1500));
        
      } catch (error) {
        console.error(`下载歌曲 "${favorites[i].name}" 失败:`, error);
        newStatus[i] = { status: 'error', message: '下载失败' };
      }
      
      // 更新下载状态
      setDownloadStatus([...newStatus]);
    }
    
    // 完成下载
    setDownloadProgress(100);
    setIsDownloading(false);
    toast.success(`成功下载 ${successCount} 首${qualityName}歌曲`, { icon: '✅' });
  };
  
  // 关闭下载模态框
  const handleCloseDownload = () => {
    if (!isDownloading) {
      setShowDownloadModal(false);
      setDownloadStatus([]);
      setDownloadProgress(0);
    }
  };
  
  // 获取文件扩展名
  const getFileExtension = (url) => {
    try {
      const cleanUrl = url.replace(/\\/g, '');
      const fileName = new URL(cleanUrl).pathname
        .split('/')
        .pop()
        .split(/[#?]/)[0];
        
      // 检查URL中的文件扩展名
      const extensionMatch = fileName.match(/\.([a-z0-9]+)$/i);
      if (extensionMatch) return extensionMatch[1];
      
      // 如果URL没有扩展名，根据音质决定
      if (downloadQuality === '999') return 'flac';
      return 'mp3';
    } catch {
      // 默认扩展名也根据音质决定
      return downloadQuality === '999' ? 'flac' : 'mp3';
    }
  };

  return (
    <Container className="my-4">
      <div className="d-md-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center mb-3 mb-md-0">
          <h1 className="mb-0">我的收藏</h1>
          <span className="ms-3 badge bg-primary">
            {favorites.length}/{MAX_FAVORITES_ITEMS}
          </span>
          <a 
            href="https://github.com/voici5986/cl_music_X" 
            target="_blank" 
            rel="noopener noreferrer"
            className="ms-3 text-dark"
          >
            <FaGithub size={24} />
          </a>
        </div>
        <div className="d-flex flex-wrap justify-content-center justify-content-md-end">
          <Button
            variant="outline-danger" 
            size="sm"
            className="me-2 mb-2 mb-md-0 d-flex align-items-center"
            style={{ height: '38px' }}
            onClick={handleBulkDownload}
            disabled={favorites.length === 0}
          >
            <FaCloudDownloadAlt className="me-1" /> <span>下载全部</span>
          </Button>
          <Button
            variant="outline-success" 
            size="sm"
            className="me-2 mb-2 mb-md-0 d-flex align-items-center"
            style={{ height: '38px' }}
            onClick={handleExport}
            disabled={favorites.length === 0}
          >
            <FaFileExport className="me-1" /> <span>导出收藏</span>
          </Button>
          <Button
            variant="outline-primary" 
            size="sm"
            className="d-flex align-items-center"
            style={{ height: '38px' }}
            onClick={() => setShowImportModal(true)}
          >
            <FaFileImport className="me-1" /> <span>导入收藏</span>
          </Button>
        </div>
      </div>
      
      {loading ? (
        <div className="text-center my-5">
          <Spinner animation="border" />
        </div>
      ) : favorites.length === 0 ? (
        <Alert variant="info" className="text-center">
          <p className="mb-0">暂无收藏的歌曲</p>
        </Alert>
      ) : (
        <Row className="g-4">
          {favorites.map((track) => (
            <Col key={track.id} xs={12} sm={6} md={4} lg={3}>
              <Card className="h-100">
                <Card.Body>
                  <div className="d-flex align-items-center">
                    <img
                      src={track.picUrl || 'default_cover.jpg'}
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
                      <h6 className="mb-1 text-truncate">{track.name}</h6>
                      <small className="text-muted d-block text-truncate">{track.artist}</small>
                      <small className="text-muted d-block text-truncate">{track.album}</small>
                    </div>
                  </div>
                  
                  <div className="mt-2 d-flex justify-content-end">
                    <Button 
                      variant="outline-primary" 
                      size="sm"
                      className="me-1"
                      onClick={() => onPlay(track)}
                      disabled={currentTrack?.id === track.id && !onPlay}
                    >
                      {currentTrack?.id === track.id && isPlaying ? <FaPause /> : <FaPlay />}
                    </Button>
                    <Button 
                      variant="outline-danger" 
                      size="sm"
                      className="me-1"
                      onClick={() => handleRemoveFromFavorites(track)}
                    >
                      <FaTrash />
                    </Button>
                    {onDownload && (
                      <Button 
                        variant="outline-success" 
                        size="sm"
                        onClick={() => handleDownload(track)}
                      >
                        <FaDownload />
                      </Button>
                    )}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* 导入模态框 */}
      <Modal show={showImportModal} onHide={handleCloseImport} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>导入收藏</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>选择收藏文件 (.json)</Form.Label>
              <Form.Control 
                type="file" 
                accept=".json"
                ref={fileInputRef}
                onChange={handleFileSelect}
                disabled={isImporting}
              />
              <Form.Text className="text-muted">
                选择之前导出的收藏列表文件
              </Form.Text>
            </Form.Group>
            
            {importData && (
              <div className="mt-3">
                <p>找到 {importData.favorites.length} 首歌曲</p>
                
                {isImporting && (
                  <div className="mb-3">
                    <div className="d-flex justify-content-between mb-1">
                      <small>正在导入...</small>
                      <small>{importProgress}%</small>
                    </div>
                    <div className="progress" style={{ height: '10px' }}>
                      <div 
                        className="progress-bar" 
                        style={{ width: `${importProgress}%` }}
                        role="progressbar" 
                        aria-valuenow={importProgress} 
                        aria-valuemin="0" 
                        aria-valuemax="100"
                      ></div>
                    </div>
                  </div>
                )}
                
                {importStatus.some(item => item.status !== 'pending') && (
                  <div 
                    style={{ 
                      maxHeight: '200px', 
                      overflowY: 'auto',
                      fontSize: '0.875rem'
                    }}
                  >
                    {importStatus.map((status, index) => (
                      <div 
                        key={index} 
                        className={`d-flex justify-content-between p-1 ${
                          status.status === 'pending' ? 'text-muted' :
                          status.status === 'success' ? 'text-success' :
                          status.status === 'exists' ? 'text-warning' :
                          'text-danger'
                        }`}
                      >
                        <span>
                          {importData.favorites[index].name} - {importData.favorites[index].artist}
                        </span>
                        <span>{status.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseImport} disabled={isImporting}>
            关闭
          </Button>
          <Button 
            variant="primary" 
            onClick={startImport}
            disabled={!importData || isImporting}
          >
            {isImporting ? <><Spinner size="sm" className="me-1" /> 导入中...</> : '开始导入'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* 批量下载模态框 */}
      <Modal show={showDownloadModal} onHide={handleCloseDownload} centered size="lg">
        <Modal.Header closeButton={!isDownloading}>
          <Modal.Title>批量下载收藏歌曲</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>准备下载 {favorites.length} 首歌曲</p>
          
          {/* 音质选择 */}
          {!isDownloading && (
            <div className="mb-3">
              <p className="mb-2">选择下载音质：</p>
              <div className="d-flex flex-column">
                <Form.Check
                  type="radio"
                  id="quality-320"
                  name="download-quality"
                  label="标准高音质 (320kbps，体积适中，直接下载)"
                  checked={downloadQuality === '320'}
                  onChange={() => setDownloadQuality('320')}
                  className="mb-3"
                />
                <Form.Check
                  type="radio"
                  id="quality-999"
                  name="download-quality"
                  label="无损音质 (FLAC格式，音质更佳，文件更大)"
                  checked={downloadQuality === '999'}
                  onChange={() => setDownloadQuality('999')}
                  disabled={false}
                />
              </div>
            </div>
          )}
          
          {isDownloading && (
            <div className="mb-3">
              <div className="d-flex justify-content-between mb-1">
                <small>正在下载，请不要关闭窗口...</small>
                <small>{downloadProgress}%</small>
              </div>
              <ProgressBar 
                now={downloadProgress} 
                style={{ height: '10px' }} 
                variant="success"
                animated={isDownloading}
              />
            </div>
          )}
          
          <div 
            style={{ 
              maxHeight: '300px', 
              overflowY: 'auto',
              fontSize: '0.875rem'
            }}
          >
            {downloadStatus.map((status, index) => (
              <div 
                key={index} 
                className={`d-flex justify-content-between p-1 ${
                  status.status === 'pending' ? 'text-muted' :
                  status.status === 'downloading' ? 'text-primary' :
                  status.status === 'success' ? 'text-success' :
                  'text-danger'
                }`}
              >
                <span>
                  {favorites[index].name} - {favorites[index].artist}
                </span>
                <span>{status.message}</span>
              </div>
            ))}
          </div>
          
          <Alert variant="warning" className="mt-3">
            <small>
              注意：批量下载可能会被浏览器视为弹窗拦截。如果下载不开始，请检查浏览器设置并允许弹窗。
            </small>
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseDownload} disabled={isDownloading}>
            关闭
          </Button>
          <Button 
            variant="primary" 
            onClick={startBulkDownload}
            disabled={isDownloading}
          >
            {isDownloading ? 
              <><Spinner size="sm" className="me-1" /> 下载中...</> : 
              `开始下载 (${downloadQuality === '999' ? '无损音质' : '高音质'})`
            }
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default Favorites; 