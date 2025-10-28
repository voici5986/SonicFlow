/**
 * 音乐API服务模块
 * 统一处理音乐相关API调用，包括搜索、获取URL、歌词和封面
 */
import axios from 'axios';
import { getCurrentAppMode, APP_MODES } from '../services/regionDetection';
import { ERROR_MESSAGES } from '../constants/strings';
import { getMemoryCache, setMemoryCache, CACHE_TYPES } from './memoryCache';
import audioStateManager from './audioStateManager';
import { validateSearchResults } from '../utils/dataValidator';

// API地址配置
const API_BASE = process.env.REACT_APP_API_BASE || '/api';

// 添加防重复请求映射
const pendingPlayRequests = new Map();
const pendingUrlRequests = new Map();
const pendingLyricRequests = new Map();

/**
 * 检查是否允许API请求
 * @returns {boolean} 是否允许API请求
 */
const checkApiAccess = () => {
  const currentMode = getCurrentAppMode();
  if (currentMode === APP_MODES.CHINA) {
    throw new Error(ERROR_MESSAGES.REGION_RESTRICTED);
  }
  return true;
};

/**
 * 搜索音乐
 * @param {string} query - 搜索关键词
 * @param {string} source - 音乐源
 * @param {number} count - 结果数量
 * @param {number} page - 页码
 * @returns {Promise<Object>} - 搜索结果
 */
export const searchMusic = async (query, source, count = 20, page = 1) => {
  try {
    checkApiAccess();
    
    // 生成缓存键
    const cacheKey = `${query}_${source}_${count}_${page}`;
    
    // 检查内存缓存
    const cachedResults = getMemoryCache(CACHE_TYPES.SEARCH_RESULTS, cacheKey);
      if (cachedResults) {
      console.log('[searchMusic] 使用内存缓存的搜索结果');
        return cachedResults;
    }
    
    console.log(`[searchMusic] 开始搜索: ${query}, 源: ${source}`);
    
    // 创建可取消的请求
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15秒超时
    
    const response = await axios.get(`${API_BASE}`, {
      params: {
        types: 'search',
        source: source,
        name: query,
        count: count,
        pages: page
      },
      signal: controller.signal
    });
    
    // 清除超时
    clearTimeout(timeoutId);
    
    // 检查响应并校验数据
    if (!response.data) {
      console.log('[searchMusic] API未返回数据');
      return [];
    }

    const validatedData = validateSearchResults(response.data);
    
    if (validatedData.length === 0) {
      console.log('[searchMusic] 搜索结果为空或数据无效');
      return [];
    }
    
    console.log(`[searchMusic] 搜索成功，找到 ${validatedData.length} 条有效结果`);
    
    // 缓存校验后的结果到内存
    setMemoryCache(CACHE_TYPES.SEARCH_RESULTS, cacheKey, validatedData);
    
    return validatedData;
  } catch (error) {
    // 处理取消请求的情况
    if (axios.isCancel(error)) {
      console.error('[searchMusic] 搜索请求超时或被取消');
      throw new Error('搜索请求超时，请稍后重试');
    }
    
    // 处理API访问限制错误
    if (error.message.includes('中国大陆')) {
      console.error('[searchMusic] API访问受限:', error.message);
      throw error;
    }
    
    // 处理网络错误
    if (error.code === 'ERR_NETWORK') {
      console.error('[searchMusic] 网络连接错误:', error);
      throw new Error('网络连接错误，请检查您的网络连接');
    }
    
    console.error('[searchMusic] 搜索音乐失败:', error);
    throw error;
  }
};

/**
 * 获取音频URL
 * @param {Object} track - 歌曲信息
 * @param {number|string} quality - 音质参数，999为无损，320为高音质
 * @param {boolean} forceRefresh - 是否强制刷新（不使用缓存）
 * @returns {Promise<Object>} - 返回API响应结果
 */
export const getAudioUrl = async (track, quality = 999, forceRefresh = false) => {
  try {
    // 生成请求唯一标识符
    const requestId = `${track.source}_${track.id}_${quality}_${Date.now()}`;
    
    // 检查是否有相同URL的请求正在进行中
    const pendingKey = `${track.source}_${track.id}_${quality}`;
    if (pendingUrlRequests.has(pendingKey) && !forceRefresh) {
      console.log(`[getAudioUrl] 检测到重复请求: ${track.name} (${track.id}), 使用现有请求`);
      return pendingUrlRequests.get(pendingKey);
    }
    
    console.log(`[getAudioUrl] 开始请求: ${track.name} (${track.id}), 请求ID: ${requestId}, 强制刷新: ${forceRefresh}`);
    
    checkApiAccess();
    
    // 生成缓存键
    const cacheKey = `${track.source}_${track.id}_${quality}`;
    
    // 创建一个Promise并存储到映射中
    const urlPromise = (async () => {
      try {
        // 检查内存缓存
        const cachedData = !forceRefresh ? getMemoryCache(CACHE_TYPES.AUDIO_URLS, cacheKey) : null;
        if (cachedData) {
          console.log(`[getAudioUrl] 使用内存缓存的音频URL: ${requestId}`);
          return cachedData;
        }
        
        console.log(`[getAudioUrl] ${forceRefresh ? '强制刷新' : '内存缓存未命中'}，调用API: ${requestId}`);
    
        const response = await axios.get(`${API_BASE}`, {
          params: {
            types: 'url',
            source: track.source,
            id: track.id,
            br: quality
          }
        });
    
        // 缓存结果到内存
        setMemoryCache(CACHE_TYPES.AUDIO_URLS, cacheKey, response.data);
    
        console.log(`[getAudioUrl] 请求完成: ${requestId}`);
        return response.data;
      } finally {
        // 请求完成后从映射中移除
        setTimeout(() => {
          pendingUrlRequests.delete(pendingKey);
          console.log(`[getAudioUrl] 请求映射已清理: ${requestId}`);
        }, 100);
      }
    })();
    
    // 存储Promise到映射中
    pendingUrlRequests.set(pendingKey, urlPromise);
    
    // 返回Promise
    return urlPromise;
  } catch (error) {
    console.error('[getAudioUrl] 获取音频URL失败:', error);
    throw error;
  }
};

/**
 * 获取歌词
 * @param {Object} track - 歌曲信息
 * @returns {Promise<Object>} - 歌词数据
 */
export const getLyrics = async (track) => {
  try {
    // 如果没有歌词ID，返回空歌词
    if (!track.lyric_id) {
      return { raw: '', translated: '' };
    }
    
    // 生成请求唯一标识符
    const requestId = `${track.source}_${track.lyric_id}_${Date.now()}`;
    
    // 检查是否有相同歌词的请求正在进行中
    const pendingKey = `${track.source}_${track.lyric_id}`;
    if (pendingLyricRequests.has(pendingKey)) {
      console.log(`[getLyrics] 检测到重复请求: ${track.name} (${track.lyric_id}), 使用现有请求`);
      return pendingLyricRequests.get(pendingKey);
    }
    
    console.log(`[getLyrics] 开始请求: ${track.name} (${track.lyric_id}), 请求ID: ${requestId}`);
    
    checkApiAccess();
    
    // 生成缓存键
    const cacheKey = `${track.source}_${track.lyric_id}`;
    
    // 创建一个Promise并存储到映射中
    const lyricPromise = (async () => {
      try {
        // 检查内存缓存
        const cachedLyrics = getMemoryCache(CACHE_TYPES.LYRICS, cacheKey);
      if (cachedLyrics) {
          console.log(`[getLyrics] 使用内存缓存的歌词: ${requestId}`);
        return cachedLyrics;
      }
        
        console.log(`[getLyrics] 内存缓存未命中，调用API: ${requestId}`);
    
    const response = await axios.get(`${API_BASE}`, {
      params: {
        types: 'lyric',
        source: track.source,
        id: track.lyric_id
      }
    });
    
    const lyrics = {
      raw: response.data.lyric || '',
      translated: response.data.tlyric || ''
    };
    
        // 缓存结果到内存
        setMemoryCache(CACHE_TYPES.LYRICS, cacheKey, lyrics);
    
        console.log(`[getLyrics] 请求完成: ${requestId}`);
    return lyrics;
      } finally {
        // 请求完成后从映射中移除
        setTimeout(() => {
          pendingLyricRequests.delete(pendingKey);
          console.log(`[getLyrics] 请求映射已清理: ${requestId}`);
        }, 100);
      }
    })();
    
    // 存储Promise到映射中
    pendingLyricRequests.set(pendingKey, lyricPromise);
    
    // 返回Promise
    return lyricPromise;
  } catch (error) {
    console.error('[getLyrics] 获取歌词失败:', error);
    throw error;
  }
};

/**
 * 获取封面图片
 * @param {string} source - 音乐源
 * @param {string} picId - 封面ID
 * @param {number} size - 封面尺寸（只支持300和500）
 * @returns {Promise<string>} - 封面URL或默认封面路径
 */
export const getCoverImage = async (source, picId, size = 300) => {
  try {
    // 验证参数
    if (!picId || picId === 'undefined' || picId === 'null') {
      console.warn(`[getCoverImage] 无效的封面ID: ${picId}, 音乐源: ${source}`);
      return 'default_cover.svg';
    }
    
    // 验证size参数 - 根据API文档只支持300和500
    if (size !== 300 && size !== 500) {
      console.warn(`[getCoverImage] 不支持的尺寸: ${size}, 使用默认300`);
      size = 300;
    }
    
    checkApiAccess();
    
    // 生成缓存键
    const cacheKey = `${source}_${picId}_${size}`;
    
    // 检查内存缓存
    const cachedUrl = getMemoryCache(CACHE_TYPES.COVER_IMAGES, cacheKey);
    if (cachedUrl) {
      return cachedUrl;
    }
    
    console.log(`[getCoverImage] 请求封面: 音乐源=${source}, ID=${picId}, 尺寸=${size}`);
    
    const response = await axios.get(`${API_BASE}`, {
      params: {
        types: 'pic',
        source: source,
        id: picId,
        size: size
      }
    });
    
    // 检查API响应
    if (!response.data || !response.data.url) {
      console.warn(`[getCoverImage] API未返回有效URL: ${JSON.stringify(response.data)}`);
      return 'default_cover.svg';
    }
    
    const url = response.data.url.replace(/\\/g, '');
    
    // 验证URL格式
    if (!url.startsWith('http')) {
      console.warn(`[getCoverImage] 返回的URL格式不正确: ${url}`);
      return 'default_cover.svg';
    }
    
    console.log(`[getCoverImage] 获取成功: ${url.substring(0, 50)}...`);
    
    // 缓存结果到内存
    setMemoryCache(CACHE_TYPES.COVER_IMAGES, cacheKey, url);
    
    return url;
  } catch (error) {
    console.error(`[getCoverImage] 获取封面图片失败: ${source}/${picId}`, error);
    return 'default_cover.svg'; // 返回默认封面
  }
};

/**
 * 完整的播放音乐逻辑（获取URL和歌词）
 * @param {Object} track - 歌曲信息
 * @param {number|string} quality - 音质参数
 * @param {boolean} forceRefresh - 是否强制刷新URL（不使用缓存）
 * @returns {Promise<Object>} - 包含URL、歌词和文件大小的对象
 */
export const playMusic = async (track, quality = 999, forceRefresh = false) => {
  try {
    // 使用音频状态管理器加载新曲目
    const requestId = audioStateManager.loadTrack(track);
    console.log(`[playMusic] 开始请求: ${track.name} (${track.id}), 请求ID: ${requestId}, 强制刷新: ${forceRefresh}`);
    
    // 生成请求唯一标识符
    const pendingKey = `${track.source}_${track.id}_${quality}`;
    
    // 检查是否有相同播放请求正在进行中
    if (pendingPlayRequests.has(pendingKey) && !forceRefresh) {
      console.log(`[playMusic] 检测到重复播放请求: ${track.name} (${track.id}), 使用现有请求`);
      return pendingPlayRequests.get(pendingKey);
    }
    
    checkApiAccess();
    
    // 生成缓存键
    const cacheKey = `play_${track.source}_${track.id}_${quality}`;
    
    // 创建一个Promise并存储到映射中
    const playPromise = (async () => {
      try {
        // 检查请求是否仍然有效
        if (!audioStateManager.isValidRequest(requestId)) {
          console.log(`[playMusic] 请求已取消: ${requestId}`);
          throw new Error('请求已取消');
        }
    
        // 检查内存缓存
        const cachedData = !forceRefresh ? getMemoryCache(CACHE_TYPES.AUDIO_METADATA, cacheKey) : null;
        if (cachedData) {
          console.log(`[playMusic] 使用内存缓存的音乐数据: ${requestId}`);
          
          // 再次检查请求是否仍然有效
          if (!audioStateManager.isValidRequest(requestId)) {
            console.log(`[playMusic] 请求已取消: ${requestId}`);
            throw new Error('请求已取消');
          }
          
          // 设置URL并播放
          audioStateManager.setUrlAndPlay(cachedData.url, requestId);
          
          return cachedData;
        }
        
        console.log(`[playMusic] ${forceRefresh ? '强制刷新' : '内存缓存未命中'}，调用API: ${requestId}`);
        
        // 再次检查请求是否仍然有效
        if (!audioStateManager.isValidRequest(requestId)) {
          console.log(`[playMusic] 请求已取消: ${requestId}`);
          throw new Error('请求已取消');
        }
    
        // 并行请求URL和歌词
        const [audioData, lyrics] = await Promise.all([
          // 传递forceRefresh参数给getAudioUrl
          getAudioUrl(track, quality, forceRefresh),
          getLyrics(track)
        ]);
        
        // 再次检查请求是否仍然有效
        if (!audioStateManager.isValidRequest(requestId)) {
          console.log(`[playMusic] 请求已取消: ${requestId}`);
          throw new Error('请求已取消');
        }
    
        // 提取和处理URL
        const url = audioData?.url?.replace(/\\/g, '');
        if (!url) throw new Error('无效的音频链接');
    
        const musicData = {
          url,
          lyrics,
          fileSize: audioData.size
        };
    
        // 缓存结果到内存
        setMemoryCache(CACHE_TYPES.AUDIO_METADATA, cacheKey, musicData);
    
        // 设置URL并播放
        audioStateManager.setUrlAndPlay(url, requestId);
        
        console.log(`[playMusic] 请求完成: ${requestId}`);
        return musicData;
      } catch (error) {
        // 设置错误状态
        audioStateManager.setError(error);
        throw error;
      } finally {
        // 请求完成后从映射中移除
        setTimeout(() => {
          pendingPlayRequests.delete(pendingKey);
          console.log(`[playMusic] 请求映射已清理: ${requestId}`);
        }, 100);
      }
    })();
    
    // 存储Promise到映射中
    pendingPlayRequests.set(pendingKey, playPromise);
    
    // 返回Promise
    return playPromise;
  } catch (error) {
    console.error('[playMusic] 播放音乐失败:', error);
    console.error(`[playMusic] 失败详情 - 曲目: ${track?.name || '未知'}, ID: ${track?.id || '未知'}, 请求ID: ${audioStateManager.activeRequest || '未知'}`);
    // 设置错误状态
    audioStateManager.setError(error);
    throw error;
  }
}; 