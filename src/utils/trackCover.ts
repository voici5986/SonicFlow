import type { Track } from '../types';
import { isRecord } from '../types';

type TrackLike = Track | Record<string, unknown>;

const readNested = (value: unknown, key: string): unknown =>
  isRecord(value) ? value[key] : undefined;

export const getTrackCoverUrl = (track: TrackLike | null | undefined): string => {
  if (!isRecord(track)) return '';

  const candidates = [
    track.picUrl,
    track.pic_url,
    track.cover,
    track.coverUrl,
    track.image,
    track.img,
    readNested(track.al, 'picUrl'),
    readNested(track.al, 'pic_url'),
    readNested(track.album, 'picUrl'),
    readNested(track.album, 'pic_url'),
  ];

  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
};
