import { useReducer, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { searchMusic } from '../services/musicApiService';
import { 
  handleError, 
  ErrorTypes, 
  ErrorSeverity, 
  checkNetworkStatus, 
  validateSearchParams 
} from '../utils/errorHandler';
import useNetworkStatus from './useNetworkStatus';

const searchInitialState = {
  query: '',
  results: [],
  source: 'netease',
  quality: 999,
  loading: false,
  error: null,
};

function searchReducer(state, action) {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'SEARCH_START':
      return { ...state, loading: true, error: null };
    case 'SEARCH_SUCCESS':
      return { ...state, loading: false, results: action.payload };
    case 'SEARCH_FAILURE':
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
}

const useSearch = () => {
  const [state, dispatch] = useReducer(searchReducer, searchInitialState);
  const { query, results, source, quality, loading, error } = state;

  const { isOnline } = useNetworkStatus({
    showToasts: false,
    dispatchEvents: false
  });

  // 监听收藏状态变化，同步更新搜索结果中的心形图标
  useEffect(() => {
    const handleFavoritesChanged = () => {
      // 强制触发一次重新渲染以刷新 SearchResultItem 内部的 HeartButton
      dispatch({ type: 'SEARCH_SUCCESS', payload: [...results] });
    };

    window.addEventListener('favorites_changed', handleFavoritesChanged);
    return () => window.removeEventListener('favorites_changed', handleFavoritesChanged);
  }, [results]);

  const setField = useCallback((field, value) => {
    dispatch({ type: 'SET_FIELD', field, value });
  }, []);

  const handleSearch = useCallback(async (e) => {
    if (e) {
      e.preventDefault();
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('Search triggered with query:', query);
    }

    // 检查网络状态
    if (!checkNetworkStatus(isOnline, '搜索音乐')) {
      return;
    }

    // 验证搜索参数
    if (!validateSearchParams(query)) {
      return;
    }

    dispatch({ type: 'SEARCH_START' });
    try {
      const searchResults = await searchMusic(query, source, 20, 1);

      // 不再预先获取封面图片，只在需要时获取（例如播放时）
      const resultsWithoutCovers = searchResults.map(track => ({ ...track }));

      dispatch({ type: 'SEARCH_SUCCESS', payload: resultsWithoutCovers });

      // 如果没有结果，显示提示
      if (resultsWithoutCovers.length === 0) {
        toast.info(`未找到"${query}"的相关结果`);
      }

      // 添加到搜索历史
      try {
        const { addSearchHistory } = await import('../services/storage');
        addSearchHistory(query, source);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('添加搜索历史失败:', error);
        }
      }

    } catch (error) {
      dispatch({ type: 'SEARCH_FAILURE', payload: error });
      handleError(
        error,
        ErrorTypes.SEARCH,
        ErrorSeverity.ERROR,
        '搜索失败，请重试'
      );
    }
  }, [query, source, isOnline]);

  return {
    ...state,
    setField,
    handleSearch
  };
};

export default useSearch;
