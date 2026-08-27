import { memo } from 'react';
import '../styles/AudioPlayer.css';
import useAudioPlayerViewState from '../hooks/useAudioPlayerViewState';
import { usePlayer } from '../contexts/PlayerContext';
import { useDevice } from '../contexts/DeviceContext';
import MobilePlayerView from './MobilePlayerView';
import DesktopPlayerView from './DesktopPlayerView';

/** 音频播放器容器，负责将状态分发到移动端或桌面端视图。 */
const AudioPlayer = () => {
  const playerContextProps = usePlayer();
  const viewState = useAudioPlayerViewState();
  const { isMobile } = useDevice();
  const { currentTrack } = viewState;

  if (!currentTrack) return null;

  return isMobile ? (
    <MobilePlayerView {...viewState} />
  ) : (
    <DesktopPlayerView {...viewState} playerUrl={playerContextProps.playerUrl} />
  );
};

export default memo(AudioPlayer);
