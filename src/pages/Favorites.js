import React, { useState, useEffect } from 'react';
import { FaPause, FaDownload } from 'react-icons/fa';
import AlbumCover from '../components/AlbumCover';
import HeartButton from '../components/HeartButton';
import MusicCardActions from '../components/MusicCardActions';
import { getFavorites, toggleFavorite, saveFavorites, MAX_FAVORITES_ITEMS } from '../services/storage';
import { toast } from 'react-toastify';
import { searchMusic } from '../services/musicApiService';
import { usePlayer } from '../contexts/PlayerContext';
import { useAuth } from '../contexts/AuthContext';
import { useDownload } from '../contexts/DownloadContext';

const Favorites = ({ globalSearchQuery, onTabChange }) => {
  // 从PlayerContext获取状态和方法
  const { handlePlay, currentTrack, isPlaying } = usePlayer();

  // 从AuthContext获取用户状态
  const { currentUser } = useAuth();

  // 从DownloadContext获取下载状态和方法
  const { isTrackDownloading, handleDownload } = useDownload();

  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  // 新增搜索相关状态
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredFavorites, setFilteredFavorites] = useState([]);

  // 监听全局搜索
  useEffect(() => {
    if (globalSearchQuery !== undefined) {
      setSearchQuery(globalSearchQuery);
      performSearch(globalSearchQuery, favorites);
    }
  }, [globalSearchQuery, favorites]);

  // 将搜索逻辑提取出来
  const performSearch = (query, currentFavorites) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setFilteredFavorites(currentFavorites);
      return;
    }

    const filtered = currentFavorites.filter(track => {
      if (isMatch(track.name, trimmedQuery) || isMatch(track.album, trimmedQuery)) {
        return true;
      }
      return isArtistMatch(track, trimmedQuery);
    });
    setFilteredFavorites(filtered);
  };

  // 定义loadFavorites函数在useEffect之前
  const loadFavorites = async () => {
    setLoading(true);
    try {
      const favItems = await getFavorites();
      setFavorites(favItems);
      setFilteredFavorites(favItems); // 初始化过滤结果
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
        setShowImportModal(true); // 选择文件后显示模态框

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

          const sources = ['netease', 'ytmusic']; // 选择主流音乐平台

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

  // 渲染登录提醒组件
  const renderLoginReminder = () => {
    if (!currentUser) {
      return (
        <div 
          className="login-prompt-container" 
          onClick={() => onTabChange('user')}
        >
          <p className="login-prompt-desc">立即登录，在任何设备继续音乐旅程</p>
        </div>
      );
    }
    return null;
  };

  // 添加单独的播放处理函数
  const handleTrackPlay = (track) => {
    console.log('从收藏播放曲目:', track.id, track.name);
    // 使用当前收藏列表作为播放列表，并找到当前曲目的索引
    const trackIndex = filteredFavorites.findIndex(item => item.id === track.id);
    handlePlay(track, trackIndex >= 0 ? trackIndex : -1, filteredFavorites);
  };

  return (
    <div className="favorites-page page-content-wrapper">
      {/* 移除标题栏，功能已迁移至账号页 */}
      
      {/* 添加登录提醒 */}
      {renderLoginReminder()}

      {loading ? (
        <div className="text-center my-5">
          <span className="spinner-custom"></span>
        </div>
      ) : favorites.length === 0 ? null : filteredFavorites.length === 0 ? (
        <div className="alert-light text-center py-4 rounded" style={{ backgroundColor: 'var(--color-background-alt)', border: '1px solid var(--color-border)' }}>
          <p className="mb-0">没有匹配的收藏歌曲</p>
          <small className="text-muted">
            尝试使用不同的关键词搜索
          </small>
        </div>
      ) : (
        <div className="favorites-grid row g-3">
          {filteredFavorites.map((track, index) => (
            <div key={`${track.id}-${track.source}-${index}`} className="col-12 col-md-6">
              <div 
                className={`music-card ${currentTrack?.id === track.id ? 'is-active' : ''}`}
                onClick={() => handleTrackPlay(track)}
              >
                <div className="music-card-row">
                  <div className="music-card-info">
                    <h6>{track.name}</h6>
                    <small>{track.artist}</small>
                  </div>

                  <MusicCardActions 
                    track={track}
                    isDownloading={isTrackDownloading(track.id)}
                    onDownload={handleDownload}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Favorites; 
