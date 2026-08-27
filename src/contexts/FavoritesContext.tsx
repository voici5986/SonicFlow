import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { getFavorites, toggleFavorite as toggleFavoriteStorage } from '../services/storage';
import type { AppUser, FavoriteRecord, Track, TrackId } from '../types';
import { useAuth } from './AuthContext';
import { useSync } from './SyncContext';
import { triggerDelayedSync } from '../services/syncService';
import logger from '../utils/logger.js';

interface FavoriteToggleResult {
  added: boolean;
  full?: boolean;
  error?: string;
}

export interface FavoritesContextValue {
  favorites: FavoriteRecord[];
  isLoading: boolean;
  isFavorite: (trackId: TrackId | null | undefined) => boolean;
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

  const loadFavorites = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      const favList = (await getFavorites()) as FavoriteRecord[];
      setFavorites(favList);
    } catch (error) {
      logger.error('加载收藏列表失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
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
    (trackId: TrackId | null | undefined): boolean => {
      if (!trackId) return false;
      const idToSearch = String(trackId);
      return favorites.some((item) => String(item.id) === idToSearch);
    },
    [favorites]
  );

  const toggleFavorite = useCallback(
    async (track: Track): Promise<FavoriteToggleResult> => {
      try {
        const result = (await toggleFavoriteStorage(track)) as FavoriteToggleResult;
        if (result.error === 'favorites_limit') return result;

        if (result.added) {
          setFavorites((prev) => [{ ...track, modifiedAt: Date.now() }, ...prev]);
        } else {
          setFavorites((prev) => prev.filter((item) => item.id !== track.id));
        }

        window.dispatchEvent(
          new CustomEvent('favorites_changed', { detail: { track, added: result.added } })
        );

        if (currentUser && !currentUser.isLocal) {
          try {
            const { incrementPendingChanges } = await import('../services/storage');
            await incrementPendingChanges('favorites');
            void updatePendingChanges();
            triggerDelayedSync(currentUser.uid);
          } catch (error) {
            logger.error('更新待同步计数失败:', error);
          }
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
