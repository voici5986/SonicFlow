export type TrackId = string | number;

export interface TrackArtistObject {
  name?: string;
  [key: string]: unknown;
}

export type TrackArtist = string | TrackArtistObject | Array<string | TrackArtistObject>;

export interface TrackAlbum {
  name?: string;
  artist?: TrackArtist;
  picUrl?: string;
  pic_url?: string;
  [key: string]: unknown;
}

/** Shared shape for music tracks returned by the supported API sources. */
export interface Track {
  id: TrackId;
  name: string;
  artist?: TrackArtist;
  artists?: TrackArtist;
  ar?: TrackArtist;
  album?: string | TrackAlbum;
  al?: TrackAlbum;
  source?: string;
  pic_id?: TrackId | null;
  lyric_id?: TrackId | null;
  [key: string]: unknown;
}

export interface Lyrics {
  raw: string;
  translated: string;
}

export interface AudioUrlResponse {
  url?: string;
  size?: number;
  [key: string]: unknown;
}

export interface FavoriteRecord extends Track {
  modifiedAt?: number;
}

export interface HistoryRecord {
  timestamp: number;
  song: Track;
  [key: string]: unknown;
}

export interface SearchHistoryRecord {
  timestamp: number;
  query: string;
  source: string;
}

export type DeviceType = 'mobile' | 'tablet' | 'desktop';
export type Orientation = 'portrait' | 'landscape';

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  orientation: Orientation;
  deviceType: DeviceType;
  screenInfo: {
    width: number;
    height: number;
    ratio: number;
    pixelRatio: number;
  };
  viewportInfo: {
    width: number;
    height: number;
    ratio: number;
  };
  hasTouchScreen: boolean;
}

export interface AppUser {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  isLocal?: boolean;
  [key: string]: unknown;
}

export interface LyricLine {
  time: number;
  text: string;
  translatedText?: string;
}

export interface LyricData {
  rawLyric: string;
  tLyric: string;
  parsedLyric: LyricLine[];
}

export type ConnectionType = 'unknown' | 'offline' | 'fast' | 'medium' | 'slow' | 'saveData';

export interface NetworkStatus {
  online: boolean;
  lastChecked: number;
  connectionType: ConnectionType | string;
}

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;
