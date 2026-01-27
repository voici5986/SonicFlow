import React from 'react';
import { Card } from 'react-bootstrap';
import { usePlayer } from '../contexts/PlayerContext';
import { useDownload } from '../contexts/DownloadContext';
import MusicCardActions from './MusicCardActions';

const SearchResultItem = ({ track, searchResults, quality }) => {
  const { handlePlay, currentTrack } = usePlayer();
  const { downloading, handleDownload } = useDownload();

  // 添加单独的播放处理函数
  const handleTrackPlay = (track) => {
    console.log('从搜索结果播放曲目:', track.id, track.name, '音质:', quality);
    // 使用当前搜索结果作为播放列表
    const trackIndex = searchResults.findIndex(item => item.id === track.id);
    handlePlay(track, trackIndex >= 0 ? trackIndex : -1, searchResults, quality);
  };

  return (
    <Card 
      className={`music-card ${currentTrack?.id === track.id ? 'is-active' : ''}`}
      onClick={() => handleTrackPlay(track)}
    >
      <div className="music-card-row">
        <div className="music-card-info">
          <h6>{track.name}</h6>
          <small>{track.artist}</small>
        </div>
        <MusicCardActions 
          track={track}
          isDownloading={downloading}
          onDownload={handleDownload}
        />
      </div>
    </Card>
  );
};

export default SearchResultItem;
