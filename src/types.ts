export type TrackArtist =
  | string
  | { name?: string; [key: string]: unknown }
  | Array<string | { name?: string; [key: string]: unknown }>;

/** Shared shape for music tracks returned by the supported API sources. */
export interface Track {
  id: string | number;
  name: string;
  artist?: TrackArtist;
  artists?: TrackArtist;
  album?: string | { name?: string; [key: string]: unknown };
  source?: string;
  pic_id?: string | number | null;
  lyric_id?: string | number | null;
  [key: string]: unknown;
}
