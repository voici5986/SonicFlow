import type { Track } from '../types';
import { isRecord } from '../types';

type TrackLike = Track | Record<string, unknown>;

const toRecord = (track: TrackLike | null | undefined): Record<string, unknown> | null =>
  isRecord(track) ? track : null;

const readArtistName = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (isRecord(value) && typeof value.name === 'string') return value.name;
  return '';
};

const readArtistList = (value: unknown): string => {
  if (!Array.isArray(value)) return '';
  return value.map(readArtistName).filter(Boolean).join(' / ');
};

export const getTrackArtist = (track: TrackLike | null | undefined): string => {
  const record = toRecord(track);
  if (!record) return '';

  const arArtist = readArtistList(record.ar);
  if (arArtist) return arArtist;

  const artists = readArtistList(record.artists);
  if (artists) return artists;

  const artistList = readArtistList(record.artist);
  if (artistList) return artistList;

  const artist = readArtistName(record.artist);
  if (artist) return artist;

  for (const key of ['artistsname', 'singer', 'author', 'composer']) {
    const value = record[key];
    if (value !== undefined && value !== null && String(value)) return String(value);
  }

  const album = isRecord(record.al) ? record.al : null;
  return album ? readArtistName(album.artist) : '';
};
