import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { downloadTrack } from '../services/downloadService';
import type { Track } from '../types';
import { getTrackKey } from '../utils/trackIdentity';
import {
  handleError,
  ErrorTypes,
  ErrorSeverity,
  checkNetworkStatus,
  checkDownloadStatus,
} from '../utils/errorHandler';
import useNetworkStatus from '../hooks/useNetworkStatus';

interface NetworkStatusHookValue {
  isOnline: boolean;
}

const toError = (value: unknown): Error =>
  value instanceof Error ? value : new Error(typeof value === 'string' ? value : '下载失败');

export interface DownloadContextValue {
  downloading: boolean;
  currentDownloadingTrack: Track | null;
  handleDownload: (track: Track, quality?: number) => Promise<void>;
  isTrackDownloading: (track: Track) => boolean;
}

const DownloadContext = createContext<DownloadContextValue | undefined>(undefined);

export const useDownload = (): DownloadContextValue => {
  const context = useContext(DownloadContext);
  if (!context) throw new Error('useDownload must be used within a DownloadProvider');
  return context;
};

export const DownloadProvider = ({ children }: { children: ReactNode }) => {
  const [downloading, setDownloading] = useState(false);
  const [currentDownloadingTrack, setCurrentDownloadingTrack] = useState<Track | null>(null);
  const { isOnline } = useNetworkStatus({
    showToasts: false,
    dispatchEvents: false,
  }) as NetworkStatusHookValue;

  const handleDownload = useCallback(
    async (track: Track, quality = 999): Promise<void> => {
      if (!checkDownloadStatus(downloading)) return;
      if (!checkNetworkStatus(isOnline, '下载音乐')) return;

      try {
        setDownloading(true);
        setCurrentDownloadingTrack(track);
        await downloadTrack(track, quality);
      } catch (error) {
        handleError(toError(error), ErrorTypes.DOWNLOAD, ErrorSeverity.ERROR, '下载失败，请重试');
      } finally {
        setDownloading(false);
        setCurrentDownloadingTrack(null);
      }
    },
    [downloading, isOnline]
  );

  const isTrackDownloading = useCallback(
    (track: Track): boolean =>
      downloading &&
      currentDownloadingTrack !== null &&
      getTrackKey(currentDownloadingTrack) === getTrackKey(track),
    [downloading, currentDownloadingTrack]
  );

  return (
    <DownloadContext.Provider
      value={{ downloading, currentDownloadingTrack, handleDownload, isTrackDownloading }}
    >
      {children}
    </DownloadContext.Provider>
  );
};
