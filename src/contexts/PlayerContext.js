import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { playMusic } from '../services/musicApiService';
import { addToHistory, getCoverFromStorage } from '../services/storage';
import { handleError, ErrorTypes, ErrorSeverity } from '../utils/errorHandler';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useAuth } from '../contexts/AuthContext';
import { useSync } from '../contexts/SyncContext';
import audioStateManager, { AUDIO_STATES } from '../services/audioStateManager';
import audioEngine from '../services/AudioEngine';

const DEFAULT_COVER = '/default_cover.svg';
const PlayerContext = createContext();
export const usePlayer = () => useContext(PlayerContext);

export const PlayerProvider = ({ children }) => {
  const { isOnline } = useNetworkStatus();
  const { currentUser } = useAuth();
  const { updatePendingChanges } = useSync();

  // 状态维护
  const [currentTrack, setCurrentTrack] = useState(null);
  const [playerUrl, setPlayerUrl] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [playProgress, setPlayProgress] = useState(0);
  const [playedSeconds, setPlayedSeconds] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [currentPlaylist, setCurrentPlaylist] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [playMode, setPlayMode] = useState(localStorage.getItem('playMode') || 'repeat-all');
  const [playHistory, setPlayHistory] = useState([]);
  const [lyricData, setLyricData] = useState({ rawLyric: '', tLyric: '', parsedLyric: [] });
  const [currentLyricIndex, setCurrentLyricIndex] = useState(-1);
  const [lyricExpanded, setLyricExpanded] = useState(false);
  const [coverCache, setCoverCache] = useState({});

  const lyricsContainerRef = useRef(null);

  // 1. 核心状态同步：从 AudioEngine 采集实时数据
  useEffect(() => {
    const updateProgress = () => {
      const current = audioEngine.currentTime;
      const duration = audioEngine.duration;
      setPlayedSeconds(current);
      if (duration > 0) {
        setTotalSeconds(duration);
        setPlayProgress((current / duration) * 100);
      }

      // 更新歌词索引
      if (lyricData.parsedLyric.length > 0) {
        let index = lyricData.parsedLyric.findIndex(line => line.time > current);
        index = index === -1 ? lyricData.parsedLyric.length - 1 : Math.max(0, index - 1);
        if (index !== currentLyricIndex) {
          setCurrentLyricIndex(index);
        }
      }
    };

    const cleanupTime = audioEngine.on('timeupdate', updateProgress);
    const cleanupPlay = audioEngine.on('play', () => setIsPlaying(true));
    const cleanupPause = audioEngine.on('pause', () => setIsPlaying(false));
    const cleanupEnded = audioEngine.on('ended', () => handleEnded());

    return () => {
      cleanupTime();
      cleanupPlay();
      cleanupPause();
      cleanupEnded();
    };
  }, [lyricData.parsedLyric, currentLyricIndex]);

  // 处理状态管理器的状态变化（主要用于切歌和URL更新）
  useEffect(() => {
    return audioStateManager.addListener((state) => {
      if (state.track) setCurrentTrack(state.track);
      if (state.url) setPlayerUrl(state.url);
      if (state.error) {
        handleError(state.error, ErrorTypes.PLAYBACK, ErrorSeverity.ERROR, '播放器引擎错误');
      }
    });
  }, []);

  // 歌词解析
  const parseLyric = useCallback((text) => {
    if (!text) return [];
    const lines = text.split('\n');
    const pattern = /\[(\d+):(\d+\.\d+)\]/;
    return lines.map(line => {
      const match = line.match(pattern);
      if (match) {
        const minutes = parseFloat(match[1]);
        const seconds = parseFloat(match[2]);
        return { time: minutes * 60 + seconds, text: line.replace(match[0], '').trim() };
      }
      return null;
    }).filter(Boolean);
  }, []);

  const formatTime = useCallback((seconds) => {
    if (isNaN(seconds)) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  }, []);

  // 播放控制
  const togglePlay = useCallback(() => {
    if (isPlaying) {
      audioEngine.pause();
    } else {
      audioEngine.play();
    }
  }, [isPlaying]);

  const toggleLyric = useCallback(() => setLyricExpanded(prev => !prev), []);

  const handlePlay = useCallback(async (track, index = -1, playlist = null) => {
    try {
      if (!isOnline) {
        toast.warn('离线状态无法播放在线音乐'); // 假设全局有toast或通过其他方式提示
        return;
      }

      // 更新列表逻辑
      if (playlist) setCurrentPlaylist(playlist);
      if (index >= 0) setCurrentIndex(index);

      // 重置 UI 进度项（防止旧歌进度闪烁）
      setPlayProgress(0);
      setPlayedSeconds(0);
      setTotalSeconds(0);
      setLyricData({ rawLyric: '', tLyric: '', parsedLyric: [] });
      setCurrentLyricIndex(-1);

      // 加载并播放
      const musicData = await playMusic(track, 999, true);

      if (musicData.lyrics && musicData.lyrics.raw) {
        setLyricData({
          rawLyric: musicData.lyrics.raw,
          tLyric: musicData.lyrics.translated || '',
          parsedLyric: parseLyric(musicData.lyrics.raw)
        });
      }

      addToHistory(track);
    } catch (error) {
      console.error('[PlayerContext] handlePlay error:', error);
    }
  }, [isOnline, parseLyric]);

  const handleNext = useCallback(() => {
    if (currentPlaylist.length <= 1) return;
    let nextIndex = (currentIndex + 1) % currentPlaylist.length;
    if (playMode === 'random') {
      nextIndex = Math.floor(Math.random() * currentPlaylist.length);
    }
    handlePlay(currentPlaylist[nextIndex], nextIndex, currentPlaylist);
  }, [currentPlaylist, currentIndex, playMode, handlePlay]);

  const handlePrevious = useCallback(() => {
    if (currentPlaylist.length <= 1) return;
    const prevIndex = (currentIndex - 1 + currentPlaylist.length) % currentPlaylist.length;
    handlePlay(currentPlaylist[prevIndex], prevIndex, currentPlaylist);
  }, [currentPlaylist, currentIndex, handlePlay]);

  const handleEnded = useCallback(() => {
    if (playMode === 'repeat-one') {
      audioEngine.seek(0);
      audioEngine.play();
    } else {
      handleNext();
    }
  }, [playMode, handleNext]);

  const handleTogglePlayMode = useCallback(() => {
    const modes = ['repeat-all', 'repeat-one', 'random'];
    const idx = modes.indexOf(playMode);
    const nextMode = modes[(idx + 1) % modes.length];
    setPlayMode(nextMode);
    localStorage.setItem('playMode', nextMode);
  }, [playMode]);

  const seekTo = useCallback((seconds) => {
    audioEngine.seek(seconds);
  }, []);

  const contextValue = {
    currentTrack, playerUrl, isPlaying, playProgress, playedSeconds, totalSeconds,
    currentPlaylist, currentIndex, playMode, lyricData, currentLyricIndex, lyricExpanded,
    coverCache, lyricsContainerRef,
    setIsPlaying, setTotalSeconds, setCurrentPlaylist, togglePlay, setLyricExpanded,
    toggleLyric, handleProgress: () => { }, // 兼容性空函数，现在由监听器处理
    handleEnded, handlePlay, handleNext, handlePrevious, handleTogglePlayMode,
    formatTime, parseLyric, seekTo
  };

  return <PlayerContext.Provider value={contextValue}>{children}</PlayerContext.Provider>;
};

export default PlayerProvider;
