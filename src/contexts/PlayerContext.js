import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { playMusic, getCoverImage } from '../services/musicApiService';
import { addToHistory } from '../services/storage';
import { handleError, ErrorTypes, ErrorSeverity } from '../utils/errorHandler';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { getCachedCoverImageData, cacheCoverImageData } from '../services/cacheService';
import { useAuth } from '../contexts/AuthContext';
import { useSync } from '../contexts/SyncContext';

// 创建Context
const PlayerContext = createContext();

// 自定义Hook，用于在组件中访问PlayerContext
export const usePlayer = () => useContext(PlayerContext);

export const PlayerProvider = ({ children }) => {
  // 获取网络状态
  const { isOnline } = useNetworkStatus();
  // 获取当前用户
  const { currentUser } = useAuth();
  // 获取同步上下文
  const { updatePendingChanges } = useSync();
  
  // 播放器基础状态
  const [currentTrack, setCurrentTrack] = useState(null);
  const [playerUrl, setPlayerUrl] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  
  // 播放进度相关
  const [playProgress, setPlayProgress] = useState(0);
  const [playedSeconds, setPlayedSeconds] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  
  // 播放列表相关
  const [currentPlaylist, setCurrentPlaylist] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [playMode, setPlayMode] = useState('repeat-all'); // 'repeat-one', 'repeat-all', 'random'
  const [playHistory, setPlayHistory] = useState([]);
  
  // 歌词相关
  const [lyricData, setLyricData] = useState({
    rawLyric: '',
    tLyric: '',
    parsedLyric: []
  });
  const [currentLyricIndex, setCurrentLyricIndex] = useState(-1);
  const [lyricExpanded, setLyricExpanded] = useState(false);
  
  // 封面缓存
  const [coverCache, setCoverCache] = useState({});
  
  // 引用
  const playerRef = useRef(null);
  const lyricsContainerRef = useRef(null);
  
  // 歌词解析函数
  const parseLyric = useCallback((text) => {
    if (!text) return [];
    
    const lines = text.split('\n');
    const pattern = /\[(\d+):(\d+\.\d+)\]/;
    
    return lines.map(line => {
      const match = line.match(pattern);
      if (match) {
        const minutes = parseFloat(match[1]);
        const seconds = parseFloat(match[2]);
        return {
          time: minutes * 60 + seconds,
          text: line.replace(match[0], '').trim()
        };
      }
      return null;
    }).filter(Boolean);
  }, []);
  
  // 格式化时间
  const formatTime = useCallback((seconds) => {
    if (isNaN(seconds)) return "0:00";
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  }, []);
  
  // 获取封面图片
  const fetchCover = useCallback(async (source, picId, size = 300) => {
    try {
      // 生成缓存键
      const cacheKey = `${source}-${picId}-${size}`;
      
      // 1. 首先检查是否有图片数据缓存
      const cachedImageData = await getCachedCoverImageData(source, picId, size);
      if (cachedImageData) {
        // 如果有图片数据缓存，更新内存缓存并返回Base64数据
        setCoverCache(prev => ({
          ...prev,
          [cacheKey]: cachedImageData
        }));
        return cachedImageData;
      }
      
      // 2. 检查内存缓存中是否有URL
      if (coverCache[cacheKey]) {
        // 如果内存中有URL缓存，尝试获取并缓存图片数据
        try {
          const imageData = await cacheCoverImageData(source, picId, coverCache[cacheKey], size);
          if (imageData) {
            // 更新内存缓存
            setCoverCache(prev => ({
              ...prev,
              [cacheKey]: imageData
            }));
            return imageData;
          }
          // 如果图片数据获取失败，继续使用URL
          return coverCache[cacheKey];
        } catch (error) {
          console.warn('图片数据缓存失败，使用URL:', error);
          return coverCache[cacheKey];
        }
      }
      
      // 3. 如果没有任何缓存，从API获取封面URL
      const coverUrl = await getCoverImage(source, picId, size);
      
      // 更新URL内存缓存
      setCoverCache(prev => ({
        ...prev,
        [cacheKey]: coverUrl
      }));
      
      // 4. 尝试缓存图片数据
      try {
        const imageData = await cacheCoverImageData(source, picId, coverUrl, size);
        if (imageData) {
          // 更新内存缓存为Base64数据
          setCoverCache(prev => ({
            ...prev,
            [cacheKey]: imageData
          }));
          return imageData;
        }
      } catch (error) {
        console.warn('获取图片数据失败，使用URL:', error);
      }
      
      return coverUrl;
    } catch (error) {
      console.error('获取封面失败:', error);
      // 确保返回绝对路径的默认封面
      const defaultCover = '/default_cover.png';
      return defaultCover;
    }
  }, [coverCache]);
  
  // 处理进度更新
  const handleProgress = useCallback(({ played, playedSeconds: seconds, loaded, loadedSeconds }) => {
    // 更新进度
    setPlayProgress(played * 100);
    setPlayedSeconds(seconds);
    
    // 更新总时长（如果有效）
    if (playerRef.current) {
      const duration = playerRef.current.getDuration();
      if (!isNaN(duration) && duration > 0) {
        setTotalSeconds(duration);
      }
    }
    
    // 更新当前歌词
    if (lyricData.parsedLyric && lyricData.parsedLyric.length > 0) {
      // 找到当前时间对应的歌词
      let index = lyricData.parsedLyric.findIndex(line => line.time > seconds);
      
      // 如果找不到，说明已经是最后一句或者没有歌词
      if (index === -1) {
        index = lyricData.parsedLyric.length;
      }
      
      // 当前歌词是前一句
      index = Math.max(0, index - 1);
      
      // 如果歌词索引变化了，更新状态
      if (index !== currentLyricIndex) {
        setCurrentLyricIndex(index);
      }
    }
  }, [lyricData.parsedLyric, currentLyricIndex]);
  
  // 播放/暂停切换
  const togglePlay = useCallback(() => {
    // 只在有当前曲目时才切换状态
    if (currentTrack && playerUrl) {
    setIsPlaying(prev => !prev);
    }
  }, [currentTrack, playerUrl]);
  
  // 添加键盘事件监听
  useEffect(() => {
    const handleKeyDown = (e) => {
      // 当按下空格键，且当前没有在输入框/文本区域中
      if (e.code === 'Space' && 
          !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) &&
          !document.activeElement.isContentEditable) {
        e.preventDefault(); // 防止页面滚动
        togglePlay();
      }
    };
    
    // 添加事件监听
    window.addEventListener('keydown', handleKeyDown);
    
    // 清理函数
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [togglePlay]);
  
  // 歌词展开/收起切换
  const toggleLyric = useCallback(() => {
    setLyricExpanded(prev => !prev);
  }, []);
  
  // 处理播放
  const handlePlay = useCallback(async (track, index = -1, playlist = null) => {
    try {
      // 如果离线，显示提示
      if (!isOnline) {
        handleError(
          new Error('您当前处于离线状态'),
          ErrorTypes.NETWORK,
          ErrorSeverity.WARNING,
          '您当前处于离线状态，无法播放在线音乐'
        );
        return;
      }
      
      // 强制停止当前正在播放的音频，避免多个音频同时播放
      if (playerRef.current) {
        // 先暂停当前播放器
        setIsPlaying(false);
        
        // 如果是不同的曲目，清空URL强制停止之前的音频
        if (currentTrack && currentTrack.id !== track.id) {
          setPlayerUrl('');
          
          // 短暂延迟确保之前的播放器已经停止
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      } else {
        // 如果还没有播放器实例，也先确保播放状态为false
        setIsPlaying(false);
      }
      
      // 设置当前播放歌曲
      setCurrentTrack(track);
      
      // 处理播放列表和索引
      let newPlaylist = playlist || currentPlaylist;
      let newIndex = index;
      
      // 如果提供了新的播放列表，使用它
      if (playlist) {
        setCurrentPlaylist(playlist);
      } 
      // 如果没有播放列表但有结果，使用当前结果作为播放列表
      else if (newPlaylist.length === 0) {
        // 这里应该从外部获取结果，但在Context中无法直接访问
        // 所以需要调用方提供playlist参数
        newPlaylist = [track];
        setCurrentPlaylist(newPlaylist);
      }
      
      // 如果提供了索引，更新当前索引
      if (index >= 0) {
        setCurrentIndex(index);
      } else {
        // 否则尝试在播放列表中查找
        const foundIndex = newPlaylist.findIndex(item => item.id === track.id);
        if (foundIndex >= 0) {
          setCurrentIndex(foundIndex);
          newIndex = foundIndex;
        } else {
          // 如果在播放列表中找不到，添加到播放列表末尾
          newPlaylist = [...newPlaylist, track];
          setCurrentPlaylist(newPlaylist);
          setCurrentIndex(newPlaylist.length - 1);
          newIndex = newPlaylist.length - 1;
        }
      }
      
      // 更新播放历史
      setPlayHistory(prev => [...prev, newIndex]);
      
      // 重置进度状态
      setPlayProgress(0);
      setPlayedSeconds(0);
      setTotalSeconds(0);
      
      // 清空之前的URL和歌词
      setPlayerUrl('');
      setLyricData({
        rawLyric: '',
        tLyric: '',
        parsedLyric: []
      });
      setCurrentLyricIndex(-1);
      
      // 获取播放URL和歌词
      const { url, lyrics } = await playMusic(track, 999); // 默认使用最高音质
      
      // 设置URL
      setPlayerUrl(url);
      
      // 处理歌词
      if (lyrics && lyrics.raw) {
        const parsedLyric = parseLyric(lyrics.raw);
        
        setLyricData({
          rawLyric: lyrics.raw,
          tLyric: lyrics.translated || '',
          parsedLyric
        });
      }
      
      // 开始播放
      setIsPlaying(true);
      
      // 添加到历史记录
      addToHistory(track);
      
      // 如果用户已登录，增加历史记录待同步计数并可能触发延迟同步
      try {
        if (currentUser && !currentUser.isLocal) {
          const { incrementPendingChanges } = await import('../services/storage');
          const { triggerDelayedSync } = await import('../services/syncService');
          
          const changes = await incrementPendingChanges('history');
          // 更新待同步项显示
          updatePendingChanges();
          // 如果历史记录变更达到阈值，触发延迟同步
          if (changes && changes.history >= 5) {
            triggerDelayedSync(currentUser.uid);
          }
        }
      } catch (error) {
        console.error('更新历史记录待同步计数失败:', error);
      }
      
      // 获取封面（如果还没有）
      const cacheKey = `${track.source}-${track.pic_id}-300`;
      if (!coverCache[cacheKey]) {
        const coverData = await fetchCover(track.source, track.pic_id);
        // 确保封面数据被正确缓存
        setCoverCache(prev => ({
          ...prev,
          [cacheKey]: coverData
        }));
      }
      
    } catch (error) {
      handleError(
        error,
        ErrorTypes.PLAYBACK,
        ErrorSeverity.ERROR,
        '播放失败，请重试'
      );
      
      // 重置状态
      setIsPlaying(false);
    }
  }, [isOnline, currentPlaylist, parseLyric, coverCache, fetchCover, currentUser, updatePendingChanges]);
  
  // 处理下一首
  const handleNext = useCallback(() => {
    // 如果没有播放列表或只有一首歌，不做任何操作
    if (!currentPlaylist || currentPlaylist.length <= 1) {
      return;
    }
    
    let nextIndex;
    
    // 根据播放模式决定下一首
    if (playMode === 'random') {
      // 随机模式：随机选择一首未播放过的歌曲或最近未播放的歌曲
      const lastPlayed = playHistory.slice(-Math.min(3, currentPlaylist.length));
      
      // 排除最近播放的3首或全部歌曲（如果播放列表少于3首）
      const availableTracks = currentPlaylist
        .map((track, idx) => ({ track, idx }))
        .filter(({ _, idx }) => !lastPlayed.includes(idx));
      
      if (availableTracks.length > 0) {
        // 还有未在最近播放过的歌曲，随机选择一首
        const randomTrack = availableTracks[Math.floor(Math.random() * availableTracks.length)];
        nextIndex = randomTrack.idx;
      } else {
        // 所有歌曲都最近播放过了，随机选择一首不是当前播放的歌曲
        const notCurrentTracks = currentPlaylist
          .map((track, idx) => ({ track, idx }))
          .filter(({ _, idx }) => idx !== currentIndex);
        
        if (notCurrentTracks.length > 0) {
          const randomTrack = notCurrentTracks[Math.floor(Math.random() * notCurrentTracks.length)];
          nextIndex = randomTrack.idx;
        } else {
          // 如果只有一首歌（理论上不会到达这里，因为前面有检查）
          nextIndex = currentIndex;
        }
      }
    } else {
      // 顺序模式：播放下一首
      nextIndex = (currentIndex + 1) % currentPlaylist.length;
    }
    
    // 更新播放历史
    setPlayHistory(prev => [...prev, currentIndex]);
    
    // 播放下一首
    handlePlay(currentPlaylist[nextIndex], nextIndex, currentPlaylist);
  }, [currentPlaylist, currentIndex, playMode, playHistory, handlePlay]);
  
  // 处理播放结束
  const handleEnded = useCallback(() => {
    // 根据播放模式决定下一首
    switch (playMode) {
      case 'repeat-one':
        // 单曲循环，重新播放当前歌曲
        if (playerRef.current) {
          playerRef.current.seekTo(0);
          setIsPlaying(true);
        }
        break;
      case 'random':
        // 随机播放，选择一首未播放过的歌曲
        handleNext();
        break;
      case 'repeat-all':
      default:
        // 列表循环，播放下一首
        handleNext();
        break;
    }
  }, [playMode, handleNext]);
  
  // 处理上一首
  const handlePrevious = useCallback(() => {
    // 如果没有播放列表或只有一首歌，不做任何操作
    if (!currentPlaylist || currentPlaylist.length <= 1) {
      return;
    }
    
    let prevIndex;
    
    // 根据播放模式决定上一首
    if (playMode === 'random' && playHistory.length > 0) {
      // 随机模式：播放历史中的上一首
      const newHistory = [...playHistory];
      prevIndex = newHistory.pop();
      setPlayHistory(newHistory);
    } else {
      // 顺序模式：播放上一首
      prevIndex = (currentIndex - 1 + currentPlaylist.length) % currentPlaylist.length;
    }
    
    // 播放上一首
    handlePlay(currentPlaylist[prevIndex], prevIndex, currentPlaylist);
  }, [currentPlaylist, currentIndex, playMode, playHistory, handlePlay]);
  
  // 处理切换播放模式
  const handleTogglePlayMode = useCallback(() => {
    // 播放模式顺序：repeat-all -> repeat-one -> random -> repeat-all
    const modes = ['repeat-all', 'repeat-one', 'random'];
    const currentIndex = modes.indexOf(playMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    
    // 更新播放模式
    setPlayMode(modes[nextIndex]);
    localStorage.setItem('playMode', modes[nextIndex]);
    
    // 提示已切换模式
    // toast.info(`已切换为${modeNames[modes[nextIndex]]}模式`, {
    //  autoClose: 1500,
    //  hideProgressBar: true,
    //  position: 'bottom-center'
    // });
  }, [playMode]);
  
  // 提供Context值
  const contextValue = {
    // 播放器状态
    currentTrack,
    playerUrl,
    isPlaying,
    playProgress,
    playedSeconds,
    totalSeconds,
    currentPlaylist,
    currentIndex,
    playMode,
    playHistory,
    lyricData,
    currentLyricIndex,
    lyricExpanded,
    coverCache,
    
    // 引用
    playerRef,
    lyricsContainerRef,
    
    // 方法
    setIsPlaying,
    setTotalSeconds,
    togglePlay,
    setLyricExpanded,
    toggleLyric,
    handleProgress,
    handleEnded,
    handlePlay,
    handleNext,
    handlePrevious,
    handleTogglePlayMode,
    formatTime,
    parseLyric,
    fetchCover
  };
  
  return (
    <PlayerContext.Provider value={contextValue}>
      {children}
    </PlayerContext.Provider>
  );
};

export default PlayerProvider; 