import { useReducer, useCallback, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { searchMusic } from '../services/musicApiService';
import logger from '../utils/logger';
import {
  handleError,
  ErrorTypes,
  ErrorSeverity,
  checkNetworkStatus,
  validateSearchParams,
} from '../utils/errorHandler';

const SEARCH_PAGE_SIZE = 20;

const searchInitialState = {
  query: '',
  results: [],
  source: 'netease',
  quality: 999,
  loading: false,
  loadingMore: false,
  error: null,
  page: 0,
  hasMore: false,
  activeQuery: '',
  activeSource: 'netease',
};

const getTrackKey = (track, index) => `${track?.source || 'unknown'}:${track?.id || index}`;

const dedupeSearchResults = (results) => {
  const existingKeys = new Set();
  return results.filter((track, index) => {
    const key = getTrackKey(track, index);
    if (existingKeys.has(key)) return false;
    existingKeys.add(key);
    return true;
  });
};

const mergeSearchResults = (currentResults, nextResults) =>
  dedupeSearchResults([...currentResults, ...nextResults]);

function searchReducer(state, action) {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'SEARCH_START':
      return { ...state, loading: true, loadingMore: false, error: null };
    case 'SEARCH_SUCCESS':
      return {
        ...state,
        loading: false,
        loadingMore: false,
        error: null,
        results: dedupeSearchResults(action.payload.results),
        page: action.payload.page,
        hasMore: action.payload.hasMore,
        activeQuery: action.payload.query,
        activeSource: action.payload.source,
      };
    case 'SEARCH_FAILURE':
      return { ...state, loading: false, loadingMore: false, error: action.payload };
    case 'LOAD_MORE_START':
      return { ...state, loadingMore: true, error: null };
    case 'LOAD_MORE_SUCCESS':
      return {
        ...state,
        loadingMore: false,
        results: mergeSearchResults(state.results, action.payload.results),
        page: action.payload.page,
        hasMore: action.payload.hasMore,
      };
    case 'LOAD_MORE_FAILURE':
      return { ...state, loadingMore: false, error: action.payload };
    case 'REFRESH_RESULTS':
      return { ...state, results: action.payload };
    default:
      return state;
  }
}

const useSearch = (isOnline) => {
  const [state, dispatch] = useReducer(searchReducer, searchInitialState);
  const { query, results, source, loading, loadingMore, page, hasMore, activeQuery, activeSource } =
    state;

  // RL-4：翻页最小间隔时间戳（用 ref 持久化，避免闭包丢失）
  const lastLoadMoreAtRef = useRef(0);

  const handleSearch = useCallback(
    async (e, q, s) => {
      if (e) e.preventDefault();

      const searchQuery = (q ?? query).trim();
      const searchSource = s ?? source;

      if (!checkNetworkStatus(isOnline, '搜索音乐')) return;
      if (!validateSearchParams(searchQuery)) return;

      const trimmedQuery = searchQuery;
      const effectiveSource = searchSource;
      dispatch({ type: 'SEARCH_START' });
      try {
        const searchResults = await searchMusic(trimmedQuery, effectiveSource, SEARCH_PAGE_SIZE, 1);
        const resultsWithoutCovers = searchResults.map((track) => ({ ...track }));

        dispatch({
          type: 'SEARCH_SUCCESS',
          payload: {
            results: resultsWithoutCovers,
            page: 1,
            hasMore: resultsWithoutCovers.length === SEARCH_PAGE_SIZE,
            query: trimmedQuery,
            source: effectiveSource,
          },
        });

        if (resultsWithoutCovers.length === 0) {
          toast.info(`未找到"${trimmedQuery}"的相关结果`);
        }

        // 添加到搜索历史
        try {
          const { addSearchHistory } = await import('../services/storage');
          addSearchHistory(trimmedQuery, effectiveSource);
        } catch (error) {
          logger.error('添加搜索历史失败:', error);
        }
      } catch (error) {
        dispatch({ type: 'SEARCH_FAILURE', payload: error });
        handleError(error, ErrorTypes.SEARCH, ErrorSeverity.ERROR, '搜索失败，请重试');
      }
    },
    [query, source, isOnline]
  );

  // RL-4：翻页最小间隔，避免连续翻页/连点在短时间内线性耗尽 API 配额
  const LOAD_MORE_MIN_INTERVAL = 800; // ms

  const handleLoadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore) return;
    if (!activeQuery) return;
    if (!checkNetworkStatus(isOnline, '加载更多搜索结果')) return;

    const now = Date.now();
    if (now - lastLoadMoreAtRef.current < LOAD_MORE_MIN_INTERVAL) return; // 节流：过近的请求直接丢弃
    lastLoadMoreAtRef.current = now;

    const nextPage = page + 1;
    dispatch({ type: 'LOAD_MORE_START' });

    try {
      const searchResults = await searchMusic(
        activeQuery,
        activeSource,
        SEARCH_PAGE_SIZE,
        nextPage
      );
      const resultsWithoutCovers = searchResults.map((track) => ({ ...track }));

      dispatch({
        type: 'LOAD_MORE_SUCCESS',
        payload: {
          results: resultsWithoutCovers,
          page: nextPage,
          hasMore: resultsWithoutCovers.length === SEARCH_PAGE_SIZE,
        },
      });

      if (resultsWithoutCovers.length === 0) {
        toast.info('没有更多结果了');
      }
    } catch (error) {
      dispatch({ type: 'LOAD_MORE_FAILURE', payload: error });
      handleError(error, ErrorTypes.SEARCH, ErrorSeverity.ERROR, '加载更多失败，请重试');
    }
  }, [activeQuery, activeSource, hasMore, isOnline, loading, loadingMore, page]);

  // 监听收藏状态变化，同步更新搜索结果（触发重绘）
  useEffect(() => {
    const handleFavoritesChanged = () => {
      dispatch({ type: 'REFRESH_RESULTS', payload: [...results] });
    };

    window.addEventListener('favorites_changed', handleFavoritesChanged);
    return () => window.removeEventListener('favorites_changed', handleFavoritesChanged);
  }, [results]);

  const setQuery = useCallback(
    (val) => dispatch({ type: 'SET_FIELD', field: 'query', value: val }),
    []
  );
  const setSource = useCallback(
    (val) => dispatch({ type: 'SET_FIELD', field: 'source', value: val }),
    []
  );
  const setQuality = useCallback(
    (val) => dispatch({ type: 'SET_FIELD', field: 'quality', value: parseInt(val) }),
    []
  );

  return {
    ...state,
    handleSearch,
    setQuery,
    setSource,
    setQuality,
    handleLoadMore,
  };
};

export default useSearch;
