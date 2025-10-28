import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { playMusic, getCoverImage } from '../services/musicApiService';
import { addToHistory, getCoverFromStorage, saveCoverToStorage } from '../services/storage';
import { handleError, ErrorTypes, ErrorSeverity } from '../utils/errorHandler';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useAuth } from '../contexts/AuthContext';
import { useSync } from '../contexts/SyncContext';
import audioStateManager, { AUDIO_STATES } from '../services/audioStateManager';

const DEFAULT_COVER = '/default_cover.svg';

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
  
  // 添加播放防抖相关引用
  const playDebounceRef = useRef(null);
  const lastPlayTimeRef = useRef(0);
  
  // 监听音频状态管理器的状态变化
  useEffect(() => {
    const removeListener = audioStateManager.addListener((state) => {
      console.log('[PlayerContext] 收到音频状态更新:', state);
      
      // 更新当前曲目
      if (state.track && (!currentTrack || currentTrack.id !== state.track.id)) {
        setCurrentTrack(state.track);
      }
      
      // 更新URL
      if (state.url !== playerUrl) {
        setPlayerUrl(state.url || '');
      }
      
      // 更新播放状态
      const newIsPlaying = state.state === AUDIO_STATES.PLAYING;
      if (isPlaying !== newIsPlaying) {
        setIsPlaying(newIsPlaying);
      }
      
      // 处理错误
      if (state.error) {
        handleError(
          state.error,
          ErrorTypes.PLAYBACK,
          ErrorSeverity.ERROR,
          '播放失败，请重试'
        );
        // 清除防抖定时器
        if (playDebounceRef.current) {
          clearTimeout(playDebounceRef.current);
          playDebounceRef.current = null;
        }
      }
    });
    
    return () => removeListener();
  }, [currentTrack, playerUrl, isPlaying]);
  
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
      // 参数验证
      if (!picId || picId === 'undefined' || picId === 'null') {
        console.warn(`[fetchCover] 无效的封面ID: ${picId}, 音乐源: ${source}`);
        return DEFAULT_COVER;
      }
      
      // 统一使用下划线作为分隔符，与musicApiService保持一致
      const cacheKey = `${source}_${picId}_${size}`;
      
      // 1. 检查内存缓存中是否已有图片URL
      if (coverCache[cacheKey]) {
        return coverCache[cacheKey];
      }
      
      // 2. 检查本地存储缓存
      const localCachedUrl = await getCoverFromStorage(cacheKey);
      if (localCachedUrl) {
        // 更新内存缓存
        setCoverCache(prev => ({
          ...prev,
          [cacheKey]: localCachedUrl
        }));
        return localCachedUrl;
      }
      
      // 3. 从API获取封面URL
      console.log(`[fetchCover] 从API获取封面: source=${source}, picId=${picId}, size=${size}`);
      const coverUrl = await getCoverImage(source, picId, size);
      
      // 4. 更新内存缓存和本地存储
      if (coverUrl && !coverUrl.includes('default_cover')) {
        setCoverCache(prev => ({
          ...prev,
          [cacheKey]: coverUrl
        }));
        
        // 异步保存到本地存储，不阻塞主流程
        saveCoverToStorage(cacheKey, coverUrl).catch(err => 
          console.error('[fetchCover] 保存封面到本地存储失败:', err)
        );
      }
      
      return coverUrl;
    } catch (error) {
      console.error('[fetchCover] 获取封面失败:', error);
      // 返回默认封面
      return DEFAULT_COVER;
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
      console.log('[PlayerContext] togglePlay 被调用，当前状态:', isPlaying ? '播放中' : '已暂停');
      // 使用函数形式的setState，确保获取最新状态值
      setIsPlaying(prevIsPlaying => !prevIsPlaying);
    } else {
      console.log('[PlayerContext] togglePlay 被忽略，没有当前曲目或URL');
    }
  }, [currentTrack, playerUrl, isPlaying]);
  
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
  
  // 处理播放 - 添加防抖机制
  const handlePlay = useCallback(async (track, index = -1, playlist = null) => {
    // 获取当前时间
    const now = Date.now();
    
    // 检查是否在防抖时间内
    if (now - lastPlayTimeRef.current < 1000) {
      console.log('[handlePlay] 防抖机制生效，忽略重复播放请求');
      return;
    }
    
    // 更新最后播放时间
    lastPlayTimeRef.current = now;
    
    try {
      console.log(`[handlePlay] 开始播放: ${track.name} (${track.id})`);
      
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
      
      // 取消当前请求（如果有）
      audioStateManager.cancelCurrentRequest();
      
      // 设置当前播放歌曲 - 现在由状态管理器处理
      // 但仍然需要更新播放列表和索引
      
      // 处理播放列表和索引
      let newPlaylist = playlist || currentPlaylist;
      let newIndex = index;
      
      // 如果提供了新的播放列表，使用它
      if (playlist) {
        console.log(`[handlePlay] 使用新播放列表，长度: ${playlist.length}`);
        setCurrentPlaylist(playlist);
      } 
      // 如果没有播放列表但有结果，使用当前结果作为播放列表
      else if (newPlaylist.length === 0) {
        console.log('[handlePlay] 无播放列表，创建单曲播放列表');
        newPlaylist = [track];
        setCurrentPlaylist(newPlaylist);
      }
      
      // 如果提供了索引，更新当前索引
      if (index >= 0) {
        console.log(`[handlePlay] 使用提供的索引: ${index}`);
        setCurrentIndex(index);
      } else {
        // 否则尝试在播放列表中查找
        const foundIndex = newPlaylist.findIndex(item => item.id === track.id);
        if (foundIndex >= 0) {
          console.log(`[handlePlay] 在播放列表中找到曲目，索引: ${foundIndex}`);
          setCurrentIndex(foundIndex);
          newIndex = foundIndex;
        } else {
          // 如果在播放列表中找不到，添加到播放列表末尾
          console.log('[handlePlay] 曲目不在播放列表中，添加到末尾');
          newPlaylist = [...newPlaylist, track];
          setCurrentPlaylist(newPlaylist);
          setCurrentIndex(newPlaylist.length - 1);
          newIndex = newPlaylist.length - 1;
        }
      }
      
      // 更新播放历史
      setPlayHistory(prev => [...prev, newIndex]);
      
      // 重置进度状态
      console.log('[handlePlay] 重置进度状态');
      setPlayProgress(0);
      setPlayedSeconds(0);
      setTotalSeconds(0);
      
      // 清空之前的歌词
      console.log('[handlePlay] 清空之前的歌词');
      setLyricData({
        rawLyric: '',
        tLyric: '',
        parsedLyric: []
      });
      setCurrentLyricIndex(-1);
      
      // 使用音频状态管理器获取播放URL和歌词，强制刷新不使用缓存
      console.log(`[handlePlay] 获取播放URL和歌词: ${track.name} (${track.id})`);
      const { lyrics } = await playMusic(track, 999, true); // 默认使用最高音质，强制刷新URL
      
      // 处理歌词
      if (lyrics && lyrics.raw) {
        console.log('[handlePlay] 处理歌词数据');
        const parsedLyric = parseLyric(lyrics.raw);
        
        setLyricData({
          rawLyric: lyrics.raw,
          tLyric: lyrics.translated || '',
          parsedLyric
        });
      }
      
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
        try {
          const coverData = await fetchCover(track.source, track.pic_id);
          // 确保封面数据被正确缓存
          setCoverCache(prev => ({
            ...prev,
            [cacheKey]: coverData
          }));
        } catch (error) {
          console.error('[handlePlay] 获取封面失败:', error);
        }
      }

      console.log(`[handlePlay] 播放处理完成: ${track.name} (${track.id})`);
    } catch (error) {
      console.error('[handlePlay] 播放失败:', error);
      handleError(
        error,
        ErrorTypes.PLAYBACK,
        ErrorSeverity.ERROR,
        '播放失败，请重试'
      );
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
    setCurrentPlaylist,
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