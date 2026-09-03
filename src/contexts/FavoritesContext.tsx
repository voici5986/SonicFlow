import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { getFavorites, toggleFavorite as toggleFavoriteStorage } from '../services/storage';
import type { AppUser, FavoriteRecord, Track } from '../types';
import { useAuth } from './AuthContext';
import { useSync } from './SyncContext';
import { triggerDelayedSync } from '../services/syncService';
import logger from '../utils/logger.js';
import { getTrackKey } from '../utils/trackIdentity';

interface FavoriteToggleResult {
  added: boolean;
  full?: boolean;
  error?: string;
}

export interface FavoritesContextValue {
  favorites: FavoriteRecord[];
  isLoading: boolean;
  isFavorite: (track: Pick<Track, 'id' | 'source'> | null | undefined) => boolean;
  toggleFavorite: (track: Track) => Promise<FavoriteToggleResult>;
}

const FavoritesContext = createContext<FavoritesContextValue | undefined>(undefined);

export const useFavorites = (): FavoritesContextValue => {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error('useFavorites must be used within a FavoritesProvider');
  return context;
};

export const FavoritesProvider = ({ children }: { children: ReactNode }) => {
  const [favorites, setFavorites] = useState<FavoriteRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser } = useAuth() as { currentUser: AppUser | null };
  const { updatePendingChanges } = useSync();
  const activeUserIdRef = useRef(currentUser?.uid);
  activeUserIdRef.current = currentUser?.uid;

  const loadFavorites = useCallback(async (): Promise<void> => {
    const requestedUserId = currentUser?.uid;
    try {
      setIsLoading(true);
      const favList = (await getFavorites(requestedUserId)) as FavoriteRecord[];
      if (activeUserIdRef.current !== requestedUserId) return;
      setFavorites(favList);
    } catch (error) {
      logger.error('加载收藏列表失败:', error);
    } finally {
      if (activeUserIdRef.current === requestedUserId) setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    setFavorites([]);
    void loadFavorites();
  }, [loadFavorites]);

  useEffect(() => {
    const handleExternalDataChange = () => {
      void loadFavorites();
    };
    const handleLocalDataCleared = (event: Event) => {
      const detail = (event as CustomEvent<{ favorites?: boolean }>).detail;
      if (detail?.favorites) void loadFavorites();
    };

    window.addEventListener('local:data_cleared', handleLocalDataCleared);
    window.addEventListener('sync:data_refreshed', handleExternalDataChange);

    return () => {
      window.removeEventListener('local:data_cleared', handleLocalDataCleared);
      window.removeEventListener('sync:data_refreshed', handleExternalDataChange);
    };
  }, [loadFavorites]);

  const isFavorite = useCallback(
    (track: Pick<Track, 'id' | 'source'> | null | undefined): boolean => {
      if (!track?.id) return false;
      const trackKey = getTrackKey(track);
      return favorites.some((item) => getTrackKey(item) === trackKey);
    },
    [favorites]
  );

  const toggleFavorite = useCallback(
    async (track: Track): Promise<FavoriteToggleResult> => {
      try {
        const requestedUserId = currentUser?.uid;
        const result = (await toggleFavoriteStorage(
          track,
          requestedUserId
        )) as FavoriteToggleResult;
        if (result.error === 'favorites_limit') return result;

        if (activeUserIdRef.current === requestedUserId) {
          if (result.added) {
            setFavorites((prev) => [{ ...track, modifiedAt: Date.now() }, ...prev]);
          } else {
            setFavorites((prev) => prev.filter((item) => getTrackKey(item) !== getTrackKey(track)));
          }

          window.dispatchEvent(
            new CustomEvent('favorites_changed', { detail: { track, added: result.added } })
          );
        }

        if (currentUser && !currentUser.isLocal) {
          // pending 只是 UI 信号：计数保存失败只降级界面展示，
          // 不能阻断 5 秒延迟同步 —— 收藏本身已保存成功。
          try {
            const { incrementPendingChanges } = await import('../services/storage');
            const pending = await incrementPendingChanges('favorites', currentUser.uid);
            if (pending) {
              void updatePendingChanges();
            } else {
              logger.warn('更新待同步收藏计数失败，仅影响界面展示');
            }
          } catch (error) {
            logger.warn('更新待同步收藏计数失败，仅影响界面展示:', error);
          }
          triggerDelayedSync(currentUser.uid, 'favorites');
        }

        return result;
      } catch (error) {
        logger.error('切换收藏状态失败:', error);
        return { added: false, error: 'toggle_failed' };
      }
    },
    [currentUser, updatePendingChanges]
  );

  return (
    <FavoritesContext.Provider value={{ favorites, isLoading, isFavorite, toggleFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
};
