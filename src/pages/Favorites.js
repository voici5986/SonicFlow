import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Button, Spinner, Modal, Form, Alert, ProgressBar, Dropdown, InputGroup } from 'react-bootstrap';
import { FaPlay, FaPause, FaDownload, FaTrash, FaFileExport, FaFileImport, FaCloudDownloadAlt, FaGithub, FaExchangeAlt, FaSearch } from 'react-icons/fa';
import { getFavorites, toggleFavorite, saveFavorites, MAX_FAVORITES_ITEMS } from '../services/storage';
import { toast } from 'react-toastify';
import { downloadTrack, downloadTracks } from '../services/downloadService';
import { searchMusic } from '../services/musicApiService';
import { usePlayer } from '../contexts/PlayerContext';
import { useAuth } from '../contexts/AuthContext';

const Favorites = () => {
  // 从PlayerContext获取状态和方法
  const { handlePlay, currentTrack, isPlaying, fetchCover, coverCache } = usePlayer();
  
  // 从AuthContext获取用户状态
  const { currentUser } = useAuth();
  
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
  const [downloadQuality, setDownloadQuality] = useState('999'); // 默认选择无损音质
  // 添加单首歌曲下载状态
  const [downloading, setDownloading] = useState(false);
  const [currentDownloadingTrack, setCurrentDownloadingTrack] = useState(null);
  
  // 新增搜索相关状态
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredFavorites, setFilteredFavorites] = useState([]);

  // 定义loadFavorites函数在useEffect之前
  const loadFavorites = async () => {
    setLoading(true);
    try {
      const favItems = await getFavorites();
      
      // 使用PlayerContext的fetchCover方法获取封面
      const itemsWithCover = await Promise.all(
        favItems.map(async (item) => {
          if (item.pic_id && !item.picUrl) {
            // 先检查PlayerContext的缓存
            const cacheKey = `${item.source}-${item.pic_id}-300`;
            if (coverCache[cacheKey]) {
              return { ...item, picUrl: coverCache[cacheKey] };
            }
            
            // 如果缓存中没有，则使用fetchCover获取
            const coverUrl = await fetchCover(item.source, item.pic_id);
            return { ...item, picUrl: coverUrl };
          }
          return item;
        })
      );
      
      // 添加诊断日志
      console.log(`收藏项数量: ${itemsWithCover.length}`);
      
      // 详细打印收藏数据结构
      console.log("收藏数据结构诊断:");
      console.log("第一个收藏项:", itemsWithCover[0]);
      
      // 查找包含特定日文字符的项目
      const testJapanese = "ずっと";
      const japaneseItems = itemsWithCover.filter(item => {
        // 检查艺术家字段的所有可能形式
        const artistString = typeof item.artist === 'string' ? item.artist : '';
        const artistObj = typeof item.artist === 'object' ? item.artist : null;
        const artists = Array.isArray(item.artists) ? item.artists : [];
        
        // 检查ar字段(网易云音乐常用)
        const ar = Array.isArray(item.ar) ? item.ar : [];
        
        return (
          artistString.includes(testJapanese) || 
          (artistObj && JSON.stringify(artistObj).includes(testJapanese)) ||
          artists.some(a => (typeof a === 'string' && a.includes(testJapanese)) || 
                           (a && typeof a.name === 'string' && a.name.includes(testJapanese))) ||
          ar.some(a => (typeof a === 'string' && a.includes(testJapanese)) || 
                      (a && typeof a.name === 'string' && a.name.includes(testJapanese)))
        );
      });
      
      console.log(`测试日文字符"${testJapanese}"的匹配结果:`, japaneseItems.length);
      
      if (japaneseItems.length > 0) {
        console.log("包含日文字符的项目:");
        japaneseItems.forEach((item, index) => {
          console.log(`项目 ${index+1}:`);
          console.log("- ID:", item.id);
          console.log("- 歌名:", item.name);
          console.log("- 艺术家原始值:", item.artist);
          console.log("- 艺术家类型:", typeof item.artist);
          
          // 如果艺术家是对象，打印其结构
          if (typeof item.artist === 'object' && item.artist !== null) {
            console.log("- 艺术家对象结构:", JSON.stringify(item.artist));
          }
          
          // 检查是否有artists数组
          if (Array.isArray(item.artists)) {
            console.log("- artists数组:", item.artists);
          }
          
          // 检查是否有ar字段(网易云音乐)
          if (Array.isArray(item.ar)) {
            console.log("- ar字段:", item.ar);
          }
          
          // 测试各种字符串方法
          if (typeof item.artist === 'string') {
            console.log("- artist.includes测试:", item.artist.includes(testJapanese));
            console.log("- artist.indexOf测试:", item.artist.indexOf(testJapanese));
            console.log("- artist.search测试:", item.artist.search(testJapanese));
            
            // 打印编码
            console.log("- 艺术家编码:", Array.from(item.artist).map(c => c.charCodeAt(0).toString(16)).join(' '));
            console.log("- 测试字符编码:", Array.from(testJapanese).map(c => c.charCodeAt(0).toString(16)).join(' '));
          }
        });
        
        // 测试所有收藏项的artist字段类型分布
        const artistTypes = {};
        itemsWithCover.forEach(item => {
          const type = typeof item.artist;
          artistTypes[type] = (artistTypes[type] || 0) + 1;
        });
        console.log("艺术家字段类型分布:", artistTypes);
      }
      
      setFavorites(itemsWithCover);
      setFilteredFavorites(itemsWithCover); // 初始化过滤结果
    } catch (error) {
      console.error('加载收藏失败:', error);
      toast.error('加载收藏失败，请重试', { icon: '⚠️' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFavorites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 加载收藏时强制检查日文艺术家
  useEffect(() => {
    if (favorites.length > 0) {
      // 检查是否有日文艺术家数据，并打印详细信息
      const japaneseItems = favorites.filter(item => 
        typeof item.artist === 'string' && 
        /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(item.artist)
      );
      console.log(`日文艺术家测试 - 总数: ${japaneseItems.length}`);
      
      if (japaneseItems.length > 0) {
        // 测试一个已知的日文艺术家名称
        const testArtist = "ずっと真夜中でいいのに。";
        const testItem = japaneseItems.find(item => item.artist.includes(testArtist));
        
        if (testItem) {
          console.log(`找到艺术家"${testArtist}":`);
          console.log(`- 完整艺术家名: ${testItem.artist}`);
          // 测试子字符串搜索
          console.log(`- 测试"ずっと"是否匹配: ${testItem.artist.includes("ずっと")}`);
          console.log(`- 测试"真夜中"是否匹配: ${testItem.artist.includes("真夜中")}`);
          
          // 字符编码测试
          const artistChars = Array.from(testItem.artist);
          const searchChars = Array.from("ずっと");
          console.log(`- 艺术家编码: ${artistChars.map(c => c.charCodeAt(0).toString(16)).join(' ')}`);
          console.log(`- 搜索词编码: ${searchChars.map(c => c.charCodeAt(0).toString(16)).join(' ')}`);
        }
      }
    }
  }, [favorites]);

  const handleRemoveFromFavorites = async (track) => {
    try {
      await toggleFavorite(track);
      // 从当前列表中移除
      setFavorites(prevFavorites => prevFavorites.filter(item => item.id !== track.id));
    } catch (error) {
      console.error('移除收藏失败:', error);
      toast.error('操作失败，请重试', { icon: '⚠️' });
    }
  };

  const handleDownload = async (track) => {
      try {
        console.log('使用内部下载逻辑');
        
        // 设置下载状态
        setDownloading(true);
        setCurrentDownloadingTrack(track);
        
        // 使用下载服务模块
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
        console.error('下载失败:', error);
        toast.error('下载失败，请稍后重试', {
          icon: '❌'
        });
        setDownloading(false);
        setCurrentDownloadingTrack(null);
    }
  };

  // 搜索过滤功能 - 基于诊断结果的全新实现
  const handleSearch = (e) => {
    const query = e.target.value.trim();
    setSearchQuery(query);
    
    if (!query) {
      setFilteredFavorites(favorites);
      return;
    }
    
    console.log(`开始搜索: "${query}"`);
    console.log(`查询编码: ${Array.from(query).map(c => c.charCodeAt(0).toString(16)).join(' ')}`);
    
    // 查找所有匹配的收藏项目
    const filtered = favorites.filter(track => {
      // 检查简单字段
      if (isMatch(track.name, query) || 
          isMatch(track.album, query)) {
        return true;
      }
      
      // 检查艺术家 - 处理多种可能的数据结构
      return isArtistMatch(track, query);
    });
    
    console.log(`找到 ${filtered.length} 个匹配结果`);
    setFilteredFavorites(filtered);
  };

  // 递归搜索任何值是否匹配查询词
  const searchInValue = (value, query) => {
    // 处理字符串直接比较
    if (typeof value === 'string') {
      return isMatch(value, query);
    }
    
    // 处理数组 - 检查数组中的每个元素
    if (Array.isArray(value)) {
      return value.some(item => searchInValue(item, query));
    }
    
    // 处理对象 - 检查所有属性值
    if (value !== null && typeof value === 'object') {
      return Object.values(value).some(propValue => 
        searchInValue(propValue, query)
      );
    }
    
    // 其他类型无法搜索
    return false;
  };

  // 检查字符串是否匹配查询词
  const isMatch = (text, query) => {
    // 处理null/undefined
    if (!text) return false;
    
    // 确保为字符串
    const str = typeof text === 'string' ? text : String(text);
    
    // 1. 精确匹配检查
    if (str === query) return true;
    
    // 2. 包含检查 - 保持原始大小写
    if (str.includes(query)) return true;
    
    // 3. 不区分大小写检查
    const lowerStr = str.toLowerCase();
    const lowerQuery = query.toLowerCase();
    if (lowerStr.includes(lowerQuery)) return true;
    
    // 4. 分词检查 - 适用于由空格分隔的多个单词
    const words = query.split(/\s+/).filter(word => word.length > 0);
    if (words.length > 1) {
      return words.every(word => isMatch(str, word));
    }
    
    return false;
  };

  // 专门检查艺术家字段的匹配
  const isArtistMatch = (track, query) => {
    // 1. 检查artist字段（字符串形式）
    if (typeof track.artist === 'string' && isMatch(track.artist, query)) {
      return true;
    }
    
    // 2. 检查artist字段（对象形式）
    if (track.artist !== null && typeof track.artist === 'object') {
      // 检查name属性
      if (track.artist.name && isMatch(track.artist.name, query)) {
        return true;
      }
      
      // 递归搜索整个对象
      if (searchInValue(track.artist, query)) {
        return true;
      }
    }
    
    // 3. 检查artists数组（某些API返回数组）
    if (Array.isArray(track.artists)) {
      // 检查数组中的每个艺术家
      return track.artists.some(artist => {
        if (typeof artist === 'string') {
          return isMatch(artist, query);
        }
        
        if (artist && typeof artist === 'object') {
          // 检查name属性
          if (artist.name && isMatch(artist.name, query)) {
            return true;
          }
          
          // 递归搜索整个对象
          return searchInValue(artist, query);
        }
        
        return false;
      });
    }
    
    // 4. 检查ar字段（网易云音乐常用）
    if (Array.isArray(track.ar)) {
      return track.ar.some(artist => {
        if (typeof artist === 'string') {
          return isMatch(artist, query);
        }
        
        if (artist && typeof artist === 'object') {
          // 检查name属性
          if (artist.name && isMatch(artist.name, query)) {
            return true;
          }
          
          // 递归搜索整个对象
          return searchInValue(artist, query);
        }
        
        return false;
      });
    }
    
    // 5. 检查album对象中的artist信息
    if (track.al && typeof track.al === 'object') {
      if (searchInValue(track.al, query)) {
        return true;
      }
    }
    
    // 6. 尝试在整个track对象中搜索（仅限特定字段）
    const fieldsToSearch = ['artistsname', 'singer', 'author', 'composer'];
    for (const field of fieldsToSearch) {
      if (track[field] && isMatch(track[field], query)) {
        return true;
      }
    }
    
    return false;
  };

  // 搜索并匹配歌曲
  const searchTrack = async (trackInfo, source) => {
    try {
      // 辅助函数：使用指定关键词搜索歌曲
      const searchWithKeyword = async (keyword, source) => {
        try {
          const results = await searchMusic(keyword, source, 15, 1);
          return { data: results };
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
  
  // 开始批量下载过程
  const startBulkDownload = async () => {
    if (isDownloading || favorites.length === 0) return;
    
    // 使用用户选择的音质
    const actualQuality = downloadQuality;
    
    setIsDownloading(true);
    
    // 使用下载服务模块批量下载
    await downloadTracks(favorites, actualQuality, {
      onStart: () => {
        // 开始批量下载
        setDownloadProgress(0);
      },
      onProgress: (index, progress, status) => {
        // 更新下载进度
        setDownloadProgress(progress);
        
        // 更新单曲下载状态
        const newStatus = [...downloadStatus];
        newStatus[index] = status;
        setDownloadStatus(newStatus);
      },
      onFinish: (successCount, totalCount) => {
        // 下载完成
        setDownloadProgress(100);
        setIsDownloading(false);
      }
    });
  };
  
  // 关闭下载模态框
  const handleCloseDownload = () => {
    if (!isDownloading) {
      setShowDownloadModal(false);
      setDownloadStatus([]);
      setDownloadProgress(0);
    }
  };

  // 渲染登录提醒组件
  const renderLoginReminder = () => {
    if (!currentUser) {
      return (
        <Alert variant="info" className="mb-4 login-reminder">
          <div className="d-flex align-items-center">
            <div className="flex-grow-1">
              <h5 className="mb-1">登录您的账号</h5>
              <p className="mb-0">登录后可以将您的收藏同步到云端，在任何设备上访问您喜爱的音乐。</p>
            </div>
            <div>
              <Button 
                variant="primary" 
                href="#/auth"
                className="ms-3"
              >
                立即登录
              </Button>
            </div>
          </div>
        </Alert>
      );
    }
    return null;
  };

  // 添加单独的播放处理函数
  const handleTrackPlay = (track) => {
    console.log('从收藏播放曲目:', track.id, track.name);
    // 使用当前收藏列表作为播放列表，并找到当前曲目的索引
    const trackIndex = favorites.findIndex(item => item.id === track.id);
    handlePlay(track, trackIndex >= 0 ? trackIndex : -1, favorites);
  };

  return (
    <Container className="my-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center">
          <h1 className="mb-0">我的收藏</h1>
          <span className="ms-3 badge bg-info">{favorites.length}/{MAX_FAVORITES_ITEMS}</span>
        </div>
        <div className="d-flex justify-content-end">
          <Button
            variant="outline-primary" 
            size="sm"
            className="me-2 d-none d-md-inline-flex"
            onClick={() => setShowDownloadModal(true)}
            disabled={favorites.length === 0}
          >
            <FaCloudDownloadAlt className="me-1" /> 批量下载
          </Button>
          <Button
            variant="outline-success" 
            size="sm"
            className="me-2 d-none d-md-inline-flex"
            onClick={handleExport}
            disabled={favorites.length === 0}
          >
            <FaFileExport className="me-1" /> 导出
          </Button>
          <Button
            variant="outline-info" 
            size="sm"
            className="d-none d-md-inline-flex"
            onClick={() => fileInputRef.current.click()}
          >
            <FaFileImport className="me-1" /> 导入
          </Button>
          
          {/* 移动端显示的按钮组 */}
          <div className="d-flex d-md-none">
            <Button
              variant="outline-primary" 
              size="sm"
              className="me-2"
              onClick={() => setShowDownloadModal(true)}
              disabled={favorites.length === 0}
            >
              <FaCloudDownloadAlt /> <span className="d-none d-sm-inline">批量下载</span>
            </Button>
            
            <Dropdown>
              <Dropdown.Toggle variant="outline-secondary" size="sm" id="dropdown-import-export">
                <FaExchangeAlt /> <span className="d-none d-sm-inline">导入导出</span>
              </Dropdown.Toggle>
              <Dropdown.Menu align="end">
                <Dropdown.Item 
                  onClick={handleExport}
                  disabled={favorites.length === 0}
                >
                  <FaFileExport className="me-2" /> 导出收藏
                </Dropdown.Item>
                <Dropdown.Item onClick={() => fileInputRef.current.click()}>
                  <FaFileImport className="me-2" /> 导入收藏
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </div>
        </div>
      </div>
      
      {/* 添加登录提醒 */}
      {renderLoginReminder()}
      
      {/* 添加搜索框 */}
      {favorites.length > 0 && (
        <InputGroup className="mb-4">
          <InputGroup.Text>
            <FaSearch />
          </InputGroup.Text>
          <Form.Control
            placeholder="搜索歌名或艺术家..."
            value={searchQuery}
            onChange={handleSearch}
          />
          {searchQuery && (
            <Button 
              variant="outline-secondary" 
              onClick={() => {
                setSearchQuery('');
                setFilteredFavorites(favorites);
              }}
            >
              清除
            </Button>
          )}
        </InputGroup>
      )}
      
      {/* 显示搜索结果统计 */}
      {searchQuery && (
        <div className="mb-3 text-muted">
          找到 {filteredFavorites.length} 个匹配结果 {filteredFavorites.length === 0 && '(无匹配内容)'}
        </div>
      )}
      
      {/* 隐藏的文件输入框，用于导入功能 */}
      <input 
        type="file" 
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept=".json"
        onChange={handleFileSelect}
      />
      
      {loading ? (
        <div className="text-center my-5">
          <Spinner animation="border" />
        </div>
      ) : favorites.length === 0 ? (
        <Alert variant="light" className="text-center">
          <p className="mb-0">暂无收藏歌曲</p>
          <small className="text-muted">
            您可以在搜索结果中点击❤️收藏歌曲，或者通过导入功能批量添加
          </small>
        </Alert>
      ) : filteredFavorites.length === 0 ? (
        <Alert variant="light" className="text-center">
          <p className="mb-0">没有匹配的收藏歌曲</p>
          <small className="text-muted">
            尝试使用不同的关键词搜索
          </small>
        </Alert>
      ) : (
        <Row className="g-4">
          {filteredFavorites.map((track) => (
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
                      onClick={() => handleTrackPlay(track)}
                      disabled={currentTrack?.id === track.id && !currentTrack?.url}
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
                    <Button 
                      variant="outline-success" 
                      size="sm"
                      onClick={() => handleDownload(track)}
                      disabled={downloading && currentDownloadingTrack?.id === track.id}
                    >
                      {downloading && currentDownloadingTrack?.id === track.id ? 
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

      {/* 导入模态框 */}
      <Modal show={showImportModal} onHide={handleCloseImport} backdrop="static" size="lg">
        <Modal.Header closeButton>
          <Modal.Title>导入收藏</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {importData && (
            <>
              <Alert variant="info">
                <div>检测到 {importData.favorites.length} 首歌曲</div>
                <div>数据版本: {importData.version || '1.0'}</div>
                <div>导出时间: {new Date(importData.timestamp).toLocaleString()}</div>
              </Alert>
              
              <ProgressBar 
                now={importProgress} 
                label={`${importProgress}%`} 
                className="mb-3" 
              />
              
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {importStatus.map((status, index) => (
                  <div key={index} className={`mb-1 ${status.success ? 'text-success' : 'text-danger'}`}>
                    {status.success ? '✓' : '✗'} {status.name} - {status.artist} ({status.message})
                      </div>
                    ))}
              </div>
            </>
            )}
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
            {isImporting ? (
              <>
                <Spinner animation="border" size="sm" className="me-1" />
                导入中...
              </>
            ) : '开始导入'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* 批量下载模态框 */}
      <Modal show={showDownloadModal} onHide={handleCloseDownload} backdrop="static" size="lg">
        <Modal.Header closeButton>
          <Modal.Title>批量下载收藏歌曲</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info">
            将下载您收藏的 {favorites.length} 首歌曲。请选择音质并确认下载。
          </Alert>
          
          <Form.Group className="mb-3">
            <Form.Label>选择音质</Form.Label>
            <Form.Select 
              value={downloadQuality}
              onChange={(e) => setDownloadQuality(e.target.value)}
            >
              <option value="128">128kbps</option>
              <option value="192">192kbps</option>
              <option value="320">320kbps</option>
              <option value="999">无损音质</option>
            </Form.Select>
          </Form.Group>
          
          {isDownloading && (
            <>
              <ProgressBar 
                now={downloadProgress} 
                label={`${downloadProgress}%`} 
                className="mb-3" 
              />
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseDownload} disabled={isDownloading}>
            取消
          </Button>
          <Button 
            variant="primary" 
            onClick={startBulkDownload}
            disabled={isDownloading || favorites.length === 0}
          >
            {isDownloading ? (
              <>
                <Spinner animation="border" size="sm" className="me-1" />
                下载中...
              </>
            ) : '开始下载'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default Favorites;