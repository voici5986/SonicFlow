import type { Track } from '../types';
import logger from '../utils/logger.js';

export type AudioEngineEvent =
  | 'play'
  | 'pause'
  | 'ended'
  | 'timeupdate'
  | 'loadedmetadata'
  | 'error'
  | 'waiting'
  | 'playing'
  | 'canplay';

type AudioListener = (event: Event) => void;

class AudioEngine {
  readonly audio: HTMLAudioElement;
  private readonly eventListeners = new Map<AudioEngineEvent, AudioListener[]>();
  currentTrack: Track | null = null;

  constructor() {
    this.audio = new Audio();
    this.audio.preload = 'auto';
    this.audio.crossOrigin = 'anonymous';
    this.initEvents();
  }

  private initEvents(): void {
    const events: AudioEngineEvent[] = [
      'play',
      'pause',
      'ended',
      'timeupdate',
      'loadedmetadata',
      'error',
      'waiting',
      'playing',
      'canplay',
    ];

    events.forEach((eventName) => {
      this.audio.addEventListener(eventName, (event) => this.dispatch(eventName, event));
    });

    this.audio.addEventListener('error', () => {
      logger.error('[AudioEngine] 播放错误:', this.audio.error);
    });
  }

  on(event: AudioEngineEvent, callback: AudioListener): () => void {
    const listeners = this.eventListeners.get(event) ?? [];
    listeners.push(callback);
    this.eventListeners.set(event, listeners);
    return () => this.off(event, callback);
  }

  off(event: AudioEngineEvent, callback: AudioListener): void {
    const listeners = this.eventListeners.get(event);
    if (!listeners) return;
    this.eventListeners.set(
      event,
      listeners.filter((listener) => listener !== callback)
    );
  }

  private dispatch(event: AudioEngineEvent, data: Event): void {
    this.eventListeners.get(event)?.forEach((callback) => callback(data));
  }

  async setSource(url: string, track: Track): Promise<boolean> {
    logger.log('[AudioEngine] 设置音源:', url);
    this.currentTrack = track;

    if (!this.audio.paused) this.audio.pause();
    this.audio.src = url;
    this.audio.load();

    try {
      await this.audio.play();
      return true;
    } catch (error) {
      logger.warn('[AudioEngine] 自动播放尝试失败 (通常是浏览器限制):', error);
      return false;
    }
  }

  play(): Promise<void> {
    if (!this.audio.src) return Promise.resolve();
    return this.audio.play().catch((error: unknown) => {
      if (error instanceof DOMException && error.name === 'NotAllowedError') return;
      logger.error('[AudioEngine] 播放失败:', error);
    });
  }

  pause(): void {
    this.audio.pause();
  }

  seek(seconds: number): void {
    if (this.audio.duration) this.audio.currentTime = seconds;
  }

  setVolume(value: number): void {
    this.audio.volume = Math.max(0, Math.min(1, value));
  }

  get duration(): number {
    return this.audio.duration || 0;
  }

  get currentTime(): number {
    return this.audio.currentTime || 0;
  }

  get paused(): boolean {
    return this.audio.paused;
  }
}

const audioEngine = new AudioEngine();
export { AudioEngine };
export default audioEngine;
