import { beforeEach, describe, expect, it, vi } from 'vitest';

class FakeAudio extends EventTarget {
  src = '';
  preload = '';
  crossOrigin = '';
  paused = true;
  duration = 180;
  currentTime = 0;
  volume = 1;
  error = null;

  load() {}

  async play() {
    this.paused = false;
    this.dispatchEvent(new Event('play'));
  }

  pause() {
    this.paused = true;
    this.dispatchEvent(new Event('pause'));
  }
}

vi.stubGlobal('Audio', FakeAudio);

const { AUDIO_STATES, default: audioStateManager } = await import('../services/audioStateManager');
const { AudioEngine } = await import('../services/AudioEngine');

describe('audio state manager', () => {
  beforeEach(() => {
    audioStateManager.stop();
    audioStateManager.clearError();
  });

  it('loads a track and publishes playback state transitions', async () => {
    const listener = vi.fn();
    const removeListener = audioStateManager.addListener(listener);
    const track = { id: 'track-1', name: 'Song', source: 'netease' };

    audioStateManager.loadTrack(track, '/song.mp3');
    await Promise.resolve();

    expect(audioStateManager.getCurrentTrack()).toEqual(track);
    expect(audioStateManager.getState()).toBe(AUDIO_STATES.PLAYING);
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ state: AUDIO_STATES.PLAYING, track })
    );

    removeListener();
    audioStateManager.pause();
    expect(audioStateManager.getState()).toBe(AUDIO_STATES.PAUSED);
  });

  it('supports stop and recoverable error state', () => {
    const listener = vi.fn();
    audioStateManager.addListener(listener);
    const error = new Error('decode failed');

    audioStateManager.setError(error);
    expect(audioStateManager.getState()).toBe(AUDIO_STATES.ERROR);
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ error }));

    audioStateManager.clearError();
    expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({ error: null }));

    audioStateManager.stop();
    expect(audioStateManager.getState()).toBe(AUDIO_STATES.STOPPED);
  });

  it('covers engine controls and playback failure branches', async () => {
    const engine = new AudioEngine();
    const listener = vi.fn();
    const removeListener = engine.on('play', listener);

    await expect(engine.play()).resolves.toBeUndefined();
    expect(engine.paused).toBe(true);

    const track = { id: 'track-2', name: 'Song 2', source: 'netease' };
    await expect(engine.setSource('/song.mp3', track)).resolves.toBe(true);
    expect(engine.currentTrack).toEqual(track);
    expect(engine.currentTime).toBe(0);
    engine.seek(12);
    expect(engine.currentTime).toBe(12);
    engine.setVolume(2);
    expect(engine.audio.volume).toBe(1);
    engine.setVolume(-1);
    expect(engine.audio.volume).toBe(0);

    listener.mockClear();
    engine.audio.dispatchEvent(new Event('play'));
    expect(listener).toHaveBeenCalled();
    removeListener();
    engine.audio.dispatchEvent(new Event('play'));
    expect(listener).toHaveBeenCalledTimes(1);
    engine.off('pause', listener);

    const blockedEngine = new AudioEngine();
    blockedEngine.audio.src = '/blocked.mp3';
    blockedEngine.audio.play = vi
      .fn()
      .mockRejectedValue(new DOMException('blocked', 'NotAllowedError'));
    await expect(blockedEngine.play()).resolves.toBeUndefined();

    const failedEngine = new AudioEngine();
    failedEngine.audio.play = vi.fn().mockRejectedValue(new Error('playback failed'));
    await expect(failedEngine.setSource('/broken.mp3', track)).resolves.toBe(false);
  });
});
