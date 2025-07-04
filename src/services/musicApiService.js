/**
 * 音乐API服务模块
 * 统一处理音乐相关API调用，包括搜索、获取URL、歌词和封面
 */
import axios from 'axios';
import { getCurrentAppMode, APP_MODES } from '../services/regionDetection';
import { getCache, setCache, CACHE_TYPES } from './cacheService';

// API地址配置
const API_BASE = process.env.REACT_APP_API_BASE || '/api';

/**
 * 检查是否允许API请求
 * @returns {boolean} 是否允许API请求
 */
const checkApiAccess = () => {
  const currentMode = getCurrentAppMode();
  if (currentMode === APP_MODES.CHINA) {
    throw new Error('因法律风险，本服务不对IP为中国大陆地区的用户开放');
  }
  return true;
};

/**
 * 检查是否应该使用缓存
 * 只有中国模式和离线模式才使用缓存
 * @returns {boolean} 是否应该使用缓存
 */
const shouldUseCache = () => {
  const currentMode = getCurrentAppMode();
  return currentMode === APP_MODES.CHINA || currentMode === APP_MODES.OFFLINE;
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
    
    // 检查是否应该使用缓存
    if (shouldUseCache()) {
      // 检查缓存
      const cachedResults = await getCache(CACHE_TYPES.SEARCH_RESULTS, cacheKey);
      if (cachedResults) {
        console.log('使用缓存的搜索结果');
        return cachedResults;
      }
    }
    
    console.log(`开始搜索: ${query}, 源: ${source}`);
    
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
    
    // 检查响应
    if (!response.data || response.data.length === 0) {
      console.log('搜索结果为空');
      return [];
    }
    
    console.log(`搜索成功，找到 ${response.data.length} 条结果`);
    
    // 无论什么模式，都缓存结果（即使完整模式不使用缓存，也存储以备将来可能切换到其他模式）
    await setCache(CACHE_TYPES.SEARCH_RESULTS, cacheKey, response.data);
    
    return response.data;
  } catch (error) {
    // 处理取消请求的情况
    if (axios.isCancel(error)) {
      console.error('搜索请求超时或被取消');
      throw new Error('搜索请求超时，请稍后重试');
    }
    
    // 处理API访问限制错误
    if (error.message.includes('中国大陆')) {
      console.error('API访问受限:', error.message);
      throw error;
    }
    
    // 处理网络错误
    if (error.code === 'ERR_NETWORK') {
      console.error('网络连接错误:', error);
      throw new Error('网络连接错误，请检查您的网络连接');
    }
    
    console.error('搜索音乐失败:', error);
    throw error;
  }
};

/**
 * 获取音频URL
 * @param {Object} track - 歌曲信息
 * @param {number|string} quality - 音质参数，999为无损，320为高音质
 * @returns {Promise<Object>} - 返回API响应结果
 */
export const getAudioUrl = async (track, quality = 999) => {
  try {
    checkApiAccess();
    
    // 生成缓存键
    const cacheKey = `${track.source}_${track.id}_${quality}`;
    
    // 检查是否应该使用缓存
    if (shouldUseCache()) {
      // 检查缓存
      const cachedData = await getCache(CACHE_TYPES.AUDIO_URLS, cacheKey);
      if (cachedData) {
        console.log('使用缓存的音频URL');
        return cachedData;
      }
    }
    
    const response = await axios.get(`${API_BASE}`, {
      params: {
        types: 'url',
        source: track.source,
        id: track.id,
        br: quality
      }
    });
    
    // 无论什么模式，都缓存结果
    await setCache(CACHE_TYPES.AUDIO_URLS, cacheKey, response.data);
    
    return response.data;
  } catch (error) {
    console.error('获取音频URL失败:', error);
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
    checkApiAccess();
    
    // 生成缓存键
    const cacheKey = `${track.source}_${track.lyric_id}`;
    
    // 检查是否应该使用缓存
    if (shouldUseCache()) {
      // 检查缓存
      const cachedLyrics = await getCache(CACHE_TYPES.LYRICS, cacheKey);
      if (cachedLyrics) {
        console.log('使用缓存的歌词');
        return cachedLyrics;
      }
    }
    
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
    
    // 无论什么模式，都缓存结果
    await setCache(CACHE_TYPES.LYRICS, cacheKey, lyrics);
    
    return lyrics;
  } catch (error) {
    console.error('获取歌词失败:', error);
    throw error;
  }
};

/**
 * 获取封面图片
 * @param {string} source - 音乐源
 * @param {string} picId - 封面ID
 * @param {number} size - 封面尺寸
 * @returns {Promise<string>} - 封面URL
 */
export const getCoverImage = async (source, picId, size = 300) => {
  try {
    checkApiAccess();
    
    // 生成缓存键
    const cacheKey = `${source}_${picId}_${size}`;
    
    // 检查是否应该使用缓存
    if (shouldUseCache()) {
      // 检查缓存
      const cachedUrl = await getCache(CACHE_TYPES.COVER_IMAGES, cacheKey);
      if (cachedUrl) {
        return cachedUrl;
      }
    }
    
    const response = await axios.get(`${API_BASE}`, {
      params: {
        types: 'pic',
        source: source,
        id: picId,
        size: size
      }
    });
    
    const url = response.data.url.replace(/\\/g, '');
    
    // 无论什么模式，都缓存结果
    await setCache(CACHE_TYPES.COVER_IMAGES, cacheKey, url);
    
    return url;
  } catch (error) {
    console.error('获取封面图片失败:', error);
    return 'default_cover.png'; // 返回默认封面
  }
};

/**
 * 完整的播放音乐逻辑（获取URL和歌词）
 * @param {Object} track - 歌曲信息
 * @param {number|string} quality - 音质参数
 * @returns {Promise<Object>} - 包含URL、歌词和文件大小的对象
 */
export const playMusic = async (track, quality = 999) => {
  try {
    checkApiAccess();
    
    // 生成缓存键
    const cacheKey = `play_${track.source}_${track.id}_${quality}`;
    
    // 检查是否应该使用缓存
    if (shouldUseCache()) {
      // 检查缓存
      const cachedData = await getCache(CACHE_TYPES.AUDIO_METADATA, cacheKey);
      if (cachedData) {
        console.log('使用缓存的音乐数据');
        return cachedData;
      }
    }
    
    // 并行请求URL和歌词
    const [audioData, lyrics] = await Promise.all([
      getAudioUrl(track, quality),
      getLyrics(track)
    ]);
    
    // 提取和处理URL
    const url = audioData?.url?.replace(/\\/g, '');
    if (!url) throw new Error('无效的音频链接');
    
    const musicData = {
      url,
      lyrics,
      fileSize: audioData.size
    };
    
    // 无论什么模式，都缓存结果
    await setCache(CACHE_TYPES.AUDIO_METADATA, cacheKey, musicData);
    
    return musicData;
  } catch (error) {
    console.error('播放音乐失败:', error);
    throw error;
  }
}; 