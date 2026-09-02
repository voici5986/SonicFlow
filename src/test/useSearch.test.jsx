import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import useSearch from '../hooks/useSearch';
import { searchMusic } from '../services/musicApiService';
import { checkNetworkStatus, handleError, validateSearchParams } from '../utils/errorHandler';

vi.mock('../services/musicApiService', () => ({
  searchMusic: vi.fn(),
}));

vi.mock('../services/storage', () => ({
  addSearchHistory: vi.fn(),
}));

vi.mock('../utils/errorHandler', () => ({
  handleError: vi.fn(),
  ErrorTypes: { SEARCH: 'SEARCH' },
  ErrorSeverity: { ERROR: 'ERROR' },
  checkNetworkStatus: vi.fn(() => true),
  validateSearchParams: vi.fn(() => true),
}));

vi.mock('react-toastify', () => ({
  toast: {
    info: vi.fn(),
  },
}));

vi.mock('../utils/logger', () => ({
  default: {
    error: vi.fn(),
    log: vi.fn(),
    warn: vi.fn(),
  },
}));

const createTracks = (start, count) =>
  Array.from({ length: count }, (_, index) => ({
    id: `${start + index}`,
    name: `Track ${start + index}`,
    source: 'netease',
  }));

describe('useSearch pagination', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    checkNetworkStatus.mockReturnValue(true);
    validateSearchParams.mockReturnValue(true);
  });

  it('loads page 1 then appends page 2 with the current API rule', async () => {
    searchMusic
      .mockResolvedValueOnce(createTracks(1, 20))
      .mockResolvedValueOnce(createTracks(21, 3));

    const { result } = renderHook(() => useSearch(true));

    act(() => {
      result.current.setQuery('周杰伦');
    });

    await act(async () => {
      await result.current.handleSearch({ preventDefault: vi.fn() });
    });

    expect(searchMusic).toHaveBeenCalledWith('周杰伦', 'netease', 20, 1, expect.any(AbortSignal));
    expect(result.current.results).toHaveLength(20);
    expect(result.current.hasMore).toBe(true);

    await act(async () => {
      await result.current.handleLoadMore();
    });

    expect(searchMusic).toHaveBeenLastCalledWith(
      '周杰伦',
      'netease',
      20,
      2,
      expect.any(AbortSignal)
    );
    expect(result.current.results).toHaveLength(23);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.page).toBe(2);
  });

  it('dedupes same-source duplicate ids on the first page', async () => {
    searchMusic.mockResolvedValueOnce([
      { id: '1', name: 'Same A', source: 'netease' },
      { id: '1', name: 'Same B', source: 'netease' },
      { id: '1', name: 'Other Source', source: 'kuwo' },
    ]);

    const { result } = renderHook(() => useSearch(true));

    act(() => {
      result.current.setQuery('重复歌曲');
    });

    await act(async () => {
      await result.current.handleSearch({ preventDefault: vi.fn() });
    });

    expect(result.current.results).toEqual([
      { id: '1', name: 'Same A', source: 'netease' },
      { id: '1', name: 'Other Source', source: 'kuwo' },
    ]);
  });

  it('supports direct search arguments and updates source and quality', async () => {
    searchMusic.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useSearch(true));

    act(() => {
      result.current.setSource('ytmusic');
      result.current.setQuality('320');
    });

    expect(result.current.source).toBe('ytmusic');
    expect(result.current.quality).toBe(320);

    await act(async () => {
      await result.current.handleSearch(null, '  直接搜索  ', 'ytmusic');
    });

    expect(searchMusic).toHaveBeenCalledWith('直接搜索', 'ytmusic', 20, 1, expect.any(AbortSignal));
    expect(result.current.activeQuery).toBe('直接搜索');
    expect(result.current.activeSource).toBe('ytmusic');
  });

  it('keeps the newest search results when an older request finishes last', async () => {
    let resolveFirst;
    searchMusic
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          })
      )
      .mockResolvedValueOnce([{ id: 'new', name: 'New result', source: 'kuwo' }]);

    const { result } = renderHook(() => useSearch(true));

    let firstSearch;
    act(() => {
      firstSearch = result.current.handleSearch(null, 'old query', 'netease');
    });
    await act(async () => {
      await result.current.handleSearch(null, 'new query', 'kuwo');
    });

    await act(async () => {
      resolveFirst([{ id: 'old', name: 'Old result', source: 'netease' }]);
      await firstSearch;
    });

    expect(result.current.activeQuery).toBe('new query');
    expect(result.current.results).toEqual([{ id: 'new', name: 'New result', source: 'kuwo' }]);
  });

  it('keeps an in-flight search result when a newer search is rejected locally', async () => {
    let resolveFirst;
    searchMusic.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirst = resolve;
        })
    );
    const { result } = renderHook(() => useSearch(true));

    let firstSearch;
    act(() => {
      firstSearch = result.current.handleSearch(null, 'old query', 'netease');
    });
    validateSearchParams.mockReturnValue(false);
    await act(async () => {
      await result.current.handleSearch(null, '', 'netease');
    });
    await act(async () => {
      resolveFirst([{ id: 'old', name: 'Old result', source: 'netease' }]);
      await firstSearch;
    });

    // 本地拒绝的“搜索”不应顶掉在途请求：旧结果照常落地，loading 不卡死
    expect(result.current.activeQuery).toBe('old query');
    expect(result.current.results).toEqual([{ id: 'old', name: 'Old result', source: 'netease' }]);
    expect(result.current.loading).toBe(false);
  });

  it('passes an abort signal and cancels a superseded search request', async () => {
    searchMusic.mockResolvedValue([]);

    const { result } = renderHook(() => useSearch(true));

    await act(async () => {
      await result.current.handleSearch(null, 'query A', 'netease');
    });

    const firstSignal = searchMusic.mock.calls[0]?.[4];
    expect(firstSignal).toBeInstanceOf(AbortSignal);

    await act(async () => {
      await result.current.handleSearch(null, 'query B', 'netease');
    });

    // 新搜索会 abort 上一个批次的信号
    expect(firstSignal.aborted).toBe(true);
    expect(searchMusic.mock.calls[1]?.[4]).toBeInstanceOf(AbortSignal);
    expect(searchMusic.mock.calls[1]?.[4]).not.toBe(firstSignal);
  });

  it('stops before the API when offline or when the query is invalid', async () => {
    const { result } = renderHook(() => useSearch(true));

    checkNetworkStatus.mockReturnValue(false);
    await act(async () => {
      await result.current.handleSearch({ preventDefault: vi.fn() });
    });
    expect(searchMusic).not.toHaveBeenCalled();

    checkNetworkStatus.mockReturnValue(true);
    validateSearchParams.mockReturnValue(false);
    await act(async () => {
      await result.current.handleSearch({ preventDefault: vi.fn() }, '无效');
    });
    expect(searchMusic).not.toHaveBeenCalled();
  });

  it('reports search and pagination failures', async () => {
    searchMusic.mockRejectedValueOnce(new Error('search failed'));

    const { result } = renderHook(() => useSearch(true));

    act(() => {
      result.current.setQuery('失败搜索');
    });

    await act(async () => {
      await result.current.handleSearch({ preventDefault: vi.fn() });
    });

    expect(result.current.error).toEqual(new Error('search failed'));
    expect(handleError).toHaveBeenCalledWith(
      expect.any(Error),
      'SEARCH',
      'ERROR',
      '搜索失败，请重试'
    );

    searchMusic
      .mockResolvedValueOnce(createTracks(1, 20))
      .mockRejectedValueOnce(new Error('page failed'));

    await act(async () => {
      await result.current.handleSearch({ preventDefault: vi.fn() });
    });
    await act(async () => {
      await result.current.handleLoadMore();
    });

    expect(result.current.error).toEqual(new Error('page failed'));
    expect(handleError).toHaveBeenLastCalledWith(
      expect.any(Error),
      'SEARCH',
      'ERROR',
      '加载更多失败，请重试'
    );

    const callsAfterFailure = searchMusic.mock.calls.length;
    await act(async () => {
      await result.current.handleLoadMore();
    });
    expect(searchMusic).toHaveBeenCalledTimes(callsAfterFailure);
  });
});
