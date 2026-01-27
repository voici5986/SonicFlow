import React from 'react';
import { Row, Col, Button } from 'react-bootstrap';
import { FaPlay, FaPause, FaRandom, FaRedoAlt, FaSyncAlt } from 'react-icons/fa';
import { MdSkipPrevious, MdSkipNext } from 'react-icons/md';
import AlbumCover from './AlbumCover';
import HeartButton from './HeartButton';
import ProgressBar from './ProgressBar';
import { FaChevronDown } from 'react-icons/fa';

/**
 * 移动端迷你播放器组件
 * 负责移动端底部的迷你播放条显示，包含歌曲信息、播放控制和进度条
 * 以及展开模式的入口
 */
const MobileMiniPlayer = ({ 
  currentTrack, 
  isPlaying, 
  togglePlay, 
  toggleLyric, 
  lyricExpanded, 
  showMobileLyrics,
  setShowMobileLyrics,
  handleTogglePlayMode,
  handlePrevious,
  handleNext,
  playMode,
  getPlayModeTitle,
  renderPlayModeIcon
}) => {
  return (
    <div className="d-md-none h-100 w-100" style={{ position: 'relative' }}>
      {/* 收起模式：左侧大空间信息，右侧仅红心和播放 */}
      <Row className="align-items-center h-100 m-0">
        <Col xs={8} className="d-flex align-items-center p-0 overflow-hidden" onClick={toggleLyric} style={{ cursor: 'pointer' }}>
          <AlbumCover track={currentTrack} size="small" forceFetch={true} />
          <div className="track-info-container flex-grow-1 ms-2" style={{ minWidth: 0, paddingRight: '10px' }}>
            <h6 className="mb-0 text-truncate track-name" style={{ width: '100%' }}>{currentTrack.name}</h6>
            <small className="text-muted text-truncate track-artist d-block" style={{ width: '100%' }}>{currentTrack.artist}</small>
          </div>
        </Col>
        <Col xs={3} className="d-flex justify-content-end align-items-center p-0" style={{ paddingRight: '12px !important' }}>
          <div className="d-flex align-items-center pe-1.8">
            <HeartButton track={currentTrack} size={24} variant="link" className="control-button accent-control me-4 p-0" />
            <Button variant="link" onClick={togglePlay} className="control-icon-btn accent-control p-0">
              {isPlaying ? <FaPause size={24} /> : <FaPlay size={24} />}
            </Button>
          </div>
        </Col>
      </Row>

      {/* 展开模式下的内容：通过 mobile-expanded-content CSS 控制显示隐藏 */}
      {lyricExpanded && (
        <div className="mobile-expanded-content" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10, pointerEvents: 'none' }}>
          <div className="mobile-expanded-player-content d-flex flex-column h-100 justify-content-end pb-2" style={{ position: 'relative', pointerEvents: 'auto' }}>
            {/* 歌曲信息：移至播放控制上方，作为模块的一部分 */}
            <div className="mobile-track-info-expanded d-md-none">
              <h5 className="track-name">{currentTrack.name}</h5>
              <div className="track-artist">{currentTrack.artist}</div>
            </div>

            {/* 移动端专用的进度条容器：放在歌曲信息和控制按钮之间 */}
            <div className="mobile-progress-container d-md-none px-4 w-100">
              <ProgressBar />
            </div>

            <div className="d-flex align-items-center justify-content-between px-4">
              <div style={{ width: '40px', display: 'flex', justifyContent: 'center' }}>
                <Button 
                  variant="link" 
                  onClick={handleTogglePlayMode} 
                  className="control-icon-btn p-0"
                  title={getPlayModeTitle()}
                >
                  {renderPlayModeIcon()}
                </Button>
              </div>
              
              <div style={{ width: '40px', display: 'flex', justifyContent: 'center' }}>
                <Button variant="link" onClick={handlePrevious} className="control-icon-btn p-0">
                  <MdSkipPrevious size={32} />
                </Button>
              </div>
              
              <div style={{ width: '64px', display: 'flex', justifyContent: 'center' }}>
                <Button variant="link" onClick={togglePlay} className="control-icon-btn accent-control p-0">
                  <div className="play-pause-button" style={{ 
                    backgroundColor: 'transparent', 
                    borderRadius: '0', 
                    color: 'var(--color-accent)',
                    width: '56px',
                    height: '56px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: 'none'
                  }}>
                    {isPlaying ? <FaPause size={48} /> : <FaPlay size={48} className="ms-1" />}
                  </div>
                </Button>
              </div>
              
              <div style={{ width: '40px', display: 'flex', justifyContent: 'center' }}>
                <Button variant="link" onClick={handleNext} className="control-icon-btn p-0">
                  <MdSkipNext size={32} />
                </Button>
              </div>
              
              <div style={{ width: '40px', display: 'flex', justifyContent: 'center' }}>
                <HeartButton track={currentTrack} size={28} variant="link" className="p-0 control-button accent-control" />
              </div>
            </div>
            
            {/* 收起按钮：作为 Flex 序列的最后一项，保持统一间距 */}
            <div className="d-flex justify-content-center mt-2">
              <Button 
                variant="link" 
                onClick={toggleLyric} 
                className="p-0 text-muted opacity-75 no-focus-outline"
                aria-label="收起播放器"
                style={{
                  zIndex: 20005,
                  height: 'auto',
                  padding: '12px',
                  border: 'none',
                  boxShadow: 'none',
                  outline: 'none',
                  background: 'none'
                }}
              >
                <FaChevronDown size={20} />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileMiniPlayer;
