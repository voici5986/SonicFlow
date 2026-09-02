import type { Track, TrackId } from '../types';

const UNKNOWN_SOURCE = 'unknown';

export const normalizeTrackId = (id: TrackId): string => String(id);

export const getTrackSource = (track: Pick<Track, 'source'>): string =>
  track.source?.trim() || UNKNOWN_SOURCE;

export const getTrackKey = (track: Pick<Track, 'id' | 'source'>): string =>
  `${getTrackSource(track)}:${normalizeTrackId(track.id)}`;

export const getTrackDocumentId = (track: Pick<Track, 'id' | 'source'>): string =>
  encodeURIComponent(getTrackKey(track));

export const normalizeTrackIdentity = <T extends Pick<Track, 'id' | 'source'>>(track: T): T => ({
  ...track,
  id: normalizeTrackId(track.id),
  source: getTrackSource(track),
});
