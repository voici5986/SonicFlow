import { useState, useEffect } from 'react';
import { usePlayer } from '../contexts/PlayerContext';
import logger from '../utils/logger.js';
import { getTrackCoverUrl } from '../utils/trackCover';
import type { Track, TrackId } from '../types';

const DEFAULT_COVER = '/default_cover.svg';

interface PlayerCoverContext {
  coverCache: Record<string, string>;
  fetchCover: (source: string | undefined, picId: TrackId, size?: number) => Promise<string>;
}

export interface UseAlbumCoverImageResult {
  imageUrl: string;
  isLoaded: boolean;
  forceLoadCover: () => Promise<void>;
  handleImageError: () => void;
}

/** 专辑封面图片获取 Hook。 */
const useAlbumCoverImage = (
  track: Track | null | undefined,
  imgSize = 500,
  lazy = false,
  forceFetch = false
): UseAlbumCoverImageResult => {
  const { coverCache, fetchCover } = usePlayer() as PlayerCoverContext;
  const [imageUrl, setImageUrl] = useState(DEFAULT_COVER);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (lazy && !isLoaded) {
      setImageUrl(DEFAULT_COVER);
      return;
    }

    const loadCover = async () => {
      const directCoverUrl = getTrackCoverUrl(track);
      if (directCoverUrl) {
        setImageUrl(directCoverUrl);
        return;
      }

      if (!track || !track.pic_id) {
        setImageUrl(DEFAULT_COVER);
        return;
      }

      try {
        const cacheKey = `${track.source}_${track.pic_id}_${imgSize}`;
        if (!forceFetch && coverCache[cacheKey]) {
          setImageUrl(coverCache[cacheKey]);
          return;
        }

        const coverUrl = await fetchCover(track.source, track.pic_id, imgSize);
        setImageUrl(coverUrl);
      } catch (error) {
        logger.error('[useAlbumCoverImage] 加载封面失败:', error);
        setImageUrl(DEFAULT_COVER);
      }
    };

    void loadCover();
  }, [track, coverCache, fetchCover, imgSize, lazy, isLoaded, forceFetch]);

  const handleImageError = () => {
    logger.warn(`[useAlbumCoverImage] 封面加载失败: ${imageUrl}`);
    setImageUrl(DEFAULT_COVER);
  };

  const forceLoadCover = async (): Promise<void> => {
    if (!lazy || isLoaded || !track || !track.pic_id) return;

    try {
      const directCoverUrl = getTrackCoverUrl(track);
      if (directCoverUrl) {
        setImageUrl(directCoverUrl);
        setIsLoaded(true);
        return;
      }

      const cacheKey = `${track.source}_${track.pic_id}_${imgSize}`;
      if (coverCache[cacheKey]) {
        setImageUrl(coverCache[cacheKey]);
        setIsLoaded(true);
        return;
      }

      const coverUrl = await fetchCover(track.source, track.pic_id, imgSize);
      setImageUrl(coverUrl);
      setIsLoaded(true);
    } catch (error) {
      logger.error('[useAlbumCoverImage] 强制加载封面失败:', error);
      setImageUrl(DEFAULT_COVER);
    }
  };

  return { imageUrl, isLoaded, forceLoadCover, handleImageError };
};

export default useAlbumCoverImage;
