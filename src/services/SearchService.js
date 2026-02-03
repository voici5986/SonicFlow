import { getFavorites, getHistory } from './storage';

/**
 * 本地搜索服务
 * 用于从收藏和播放历史中检索歌曲
 */
const SearchService = {
  /**
   * 执行本地模糊搜索
   * @param {string} query - 搜索词
   * @returns {Promise<Object>} - 分类好的结果 { favorites: [], history: [] }
   */
  async searchLocal(query) {
    if (!query || !query.trim()) {
      return { favorites: [], history: [] };
    }

    const normalizedQuery = query.toLowerCase().trim();
    
    try {
      // 并行获取数据
      const [favorites, historyData] = await Promise.all([
        getFavorites(),
        getHistory()
      ]);

      // 1. 匹配收藏
      const matchedFavorites = (favorites || []).filter(track => 
        this._isMatch(track, normalizedQuery)
      );

      // 2. 匹配历史
      const historyTracks = (historyData || []).map(item => item.song).filter(Boolean);
      
      const uniqueHistoryMap = new Map();
      historyTracks.forEach(track => {
        if (track && track.id && !uniqueHistoryMap.has(track.id)) {
          uniqueHistoryMap.set(track.id, track);
        }
      });

      const matchedHistory = Array.from(uniqueHistoryMap.values()).filter(track => 
        this._isMatch(track, normalizedQuery)
      );

      return {
        favorites: matchedFavorites,
        history: matchedHistory
      };
    } catch (error) {
      console.error('SearchService.searchLocal error:', error);
      return { favorites: [], history: [] };
    }
  },

  _isMatch(track, query) {
    if (!track || !query) return false;
    
    try {
      // 获取歌名
      const name = (track.name || '').toString().toLowerCase();
      
      // 获取歌手 - 兼容多种结构
      let artist = '';
      if (Array.isArray(track.ar)) {
        artist = track.ar.map(a => a?.name || '').join(' ').toLowerCase();
      } else if (Array.isArray(track.artists)) {
        artist = track.artists.map(a => a?.name || '').join(' ').toLowerCase();
      } else if (track.artist) {
        artist = (typeof track.artist === 'string' ? track.artist : (track.artist.name || '')).toString().toLowerCase();
      }

      // 获取专辑 - 兼容多种结构
      const album = (
        (track.al && track.al.name) || 
        (track.album && (typeof track.album === 'string' ? track.album : track.album.name)) || 
        ''
      ).toString().toLowerCase();

      // 支持多词搜索 (例如 "周杰伦 晴天")
      const queryWords = query.split(/\s+/).filter(word => word.length > 0);
      
      if (queryWords.length > 1) {
        // 所有关键词都必须匹配（在歌名、歌手或专辑中找到）
        return queryWords.every(word => 
          name.includes(word) || artist.includes(word) || album.includes(word)
        );
      }

      // 单词搜索
      return name.includes(query) || 
             artist.includes(query) || 
             album.includes(query);
    } catch (e) {
      console.warn('Match check failed for track:', track, e);
      return false;
    }
  }
};

export default SearchService;
