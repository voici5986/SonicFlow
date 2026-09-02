import type { Track, TrackArtist } from '../types';
import { isRecord } from '../types';

const isTrackArtist = (value: unknown): value is TrackArtist => {
  if (typeof value === 'string' || isRecord(value)) return true;
  return Array.isArray(value) && value.every((item) => typeof item === 'string' || isRecord(item));
};

function normalizeTrackId(value: unknown, fallback: null): string | null;
function normalizeTrackId(value: unknown, fallback: null): string | null {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : fallback == null
      ? null
      : fallback;
}

const normalizeTrackArtist = (value: unknown): TrackArtist =>
  isTrackArtist(value) ? value : '未知艺术家';

const normalizeAlbum = (value: unknown): string | Record<string, unknown> => {
  if (typeof value === 'string' || isRecord(value)) return value;
  return value == null ? '未知专辑' : String(value);
};

const validateTrack = (track: unknown): Track | null => {
  if (!isRecord(track)) return null;

  const id = normalizeTrackId(track.id, null);
  if (!id || !id.trim()) return null;
  const rawName = track.name;

  return {
    ...track,
    id,
    name: typeof rawName === 'string' ? rawName : rawName == null ? '未知歌曲' : String(rawName),
    artist: normalizeTrackArtist(track.artist),
    album: normalizeAlbum(track.album),
    pic_id: normalizeTrackId(track.pic_id ?? track.picId ?? track.picid, null),
    lyric_id: normalizeTrackId(track.lyric_id ?? track.lyricId ?? track.lyricid, null),
    source: typeof track.source === 'string' ? track.source : 'unknown',
  };
};

export const validateSearchResults = (results: unknown): Track[] => {
  if (!Array.isArray(results)) return [];
  return results.map(validateTrack).filter((track): track is Track => track !== null);
};
