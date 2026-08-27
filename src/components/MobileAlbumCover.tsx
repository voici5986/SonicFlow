import type { CSSProperties } from 'react';
import useAlbumCoverImage from '../hooks/useAlbumCoverImage';
import type { Track } from '../types';

export interface MobileAlbumCoverProps {
  track: Track | null | undefined;
  size?: 'small' | 'large' | string | number;
  isPlaying?: boolean;
  onClick?: () => void;
  className?: string;
  imgSize?: number;
  lazy?: boolean;
  forceFetch?: boolean;
}

const MobileAlbumCover = ({
  track,
  size = 'small',
  isPlaying = false,
  onClick,
  className = '',
  imgSize = 300,
  lazy = false,
  forceFetch = false,
}: MobileAlbumCoverProps) => {
  const { imageUrl, isLoaded, forceLoadCover, handleImageError } = useAlbumCoverImage(
    track,
    imgSize,
    lazy,
    forceFetch
  );

  const getStyles = (): CSSProperties => {
    if (size === 'small' || size === 'large') return {};

    const dimension = typeof size === 'number' ? `${size}px` : size;
    return {
      width: dimension,
      height: dimension,
      objectFit: 'cover',
      backgroundColor: 'var(--card-hover-background)',
    };
  };

  const sizeClass =
    size === 'small'
      ? 'player-thumbnail rounded me-2'
      : size === 'large'
        ? 'album-cover-large'
        : 'rounded';
  const animationClass = size === 'large' && isPlaying ? 'breathing-animation' : '';

  const handleClick = () => {
    if (lazy && !isLoaded) void forceLoadCover();
    onClick?.();
  };

  return (
    <div
      className={`${className} ${sizeClass} ${animationClass} album-cover-wrapper`}
      onClick={handleClick}
      style={{
        display: 'inline-block',
        cursor: (lazy && !isLoaded) || onClick ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: 'var(--color-background-alt)',
        borderRadius: size === 'small' ? 'var(--border-radius-sm)' : 'var(--border-radius-md)',
        ...getStyles(),
      }}
    >
      <img
        src={imageUrl}
        alt={size === 'small' ? '当前播放' : '专辑封面'}
        className="album-cover-image"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          borderRadius: 'inherit',
        }}
        onError={handleImageError}
        loading="lazy"
      />
    </div>
  );
};

export default MobileAlbumCover;
