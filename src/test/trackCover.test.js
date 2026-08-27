import { describe, expect, it } from 'vitest';
import { getTrackCoverUrl } from '../utils/trackCover';

describe('getTrackCoverUrl', () => {
  it('uses the first non-empty direct cover field', () => {
    expect(
      getTrackCoverUrl({
        picUrl: '   ',
        pic_url: 'https://example.test/direct.jpg',
        cover: 'https://example.test/ignored.jpg',
      })
    ).toBe('https://example.test/direct.jpg');
  });

  it('falls back to nested album and legacy fields', () => {
    expect(getTrackCoverUrl({ al: { pic_url: 'https://example.test/al.jpg' } })).toBe(
      'https://example.test/al.jpg'
    );
    expect(getTrackCoverUrl({ album: { picUrl: 'https://example.test/album.jpg' } })).toBe(
      'https://example.test/album.jpg'
    );
  });

  it('returns an empty string for missing or non-string values', () => {
    expect(getTrackCoverUrl(null)).toBe('');
    expect(getTrackCoverUrl({ picUrl: 123, album: null })).toBe('');
  });
});
