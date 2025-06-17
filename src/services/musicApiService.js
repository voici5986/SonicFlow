/**
 * 音乐API服务模块
 * 统一处理音乐相关API调用，包括搜索、获取URL、歌词和封面
 */
import axios from 'axios';

// API地址配置
const API_BASE = process.env.REACT_APP_API_BASE || '/api';

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
    const response = await axios.get(`${API_BASE}`, {
      params: {
        types: 'search',
        source: source,
        name: query,
        count: count,
        pages: page
      }
    });
    return response.data;
  } catch (error) {
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
    const response = await axios.get(`${API_BASE}`, {
      params: {
        types: 'url',
        source: track.source,
        id: track.id,
        br: quality
      }
    });
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
    const response = await axios.get(`${API_BASE}`, {
      params: {
        types: 'lyric',
        source: track.source,
        id: track.lyric_id
      }
    });
    return {
      raw: response.data.lyric || '',
      translated: response.data.tlyric || ''
    };
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
    const cacheKey = `${source}-${picId}-${size}`;
    
    // 检查sessionStorage缓存
    const cachedUrl = sessionStorage.getItem(cacheKey);
    if (cachedUrl) return cachedUrl;
    
    const response = await axios.get(`${API_BASE}`, {
      params: {
        types: 'pic',
        source: source,
        id: picId,
        size: size
      }
    });
    
    const url = response.data.url.replace(/\\/g, '');
    
    // 缓存到sessionStorage
    try {
      sessionStorage.setItem(cacheKey, url);
    } catch (e) {
      // 忽略存储错误
    }
    
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
    // 并行请求URL和歌词
    const [audioData, lyrics] = await Promise.all([
      getAudioUrl(track, quality),
      getLyrics(track)
    ]);
    
    // 提取和处理URL
    const url = audioData?.url?.replace(/\\/g, '');
    if (!url) throw new Error('无效的音频链接');
    
    return {
      url,
      lyrics,
      fileSize: audioData.size
    };
  } catch (error) {
    console.error('播放音乐失败:', error);
    throw error;
  }
}; 