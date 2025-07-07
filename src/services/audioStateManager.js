/**
 * 音频播放状态管理器
 * 使用状态机模式管理音频播放状态，确保在任何时刻只有一个活跃的音频播放请求
 */

// 播放状态枚举
export const AUDIO_STATES = {
  IDLE: 'idle',        // 空闲状态，没有活跃的音频
  LOADING: 'loading',  // 正在加载音频
  PLAYING: 'playing',  // 正在播放
  PAUSED: 'paused',    // 已暂停
  STOPPED: 'stopped'   // 已停止
};

// 播放动作枚举
export const AUDIO_ACTIONS = {
  LOAD: 'load',        // 加载新音频
  PLAY: 'play',        // 播放
  PAUSE: 'pause',      // 暂停
  STOP: 'stop',        // 停止
  ERROR: 'error'       // 发生错误
};

class AudioStateManager {
  constructor() {
    this.currentState = AUDIO_STATES.IDLE;
    this.currentTrack = null;
    this.currentUrl = null;
    this.isLoading = false;
    this.error = null;
    this.listeners = [];
    this.activeRequest = null;
    this.requestId = 0;
  }

  /**
   * 获取当前状态
   * @returns {string} 当前状态
   */
  getState() {
    return this.currentState;
  }

  /**
   * 获取当前曲目
   * @returns {Object|null} 当前曲目
   */
  getCurrentTrack() {
    return this.currentTrack;
  }

  /**
   * 获取当前URL
   * @returns {string|null} 当前URL
   */
  getCurrentUrl() {
    return this.currentUrl;
  }

  /**
   * 是否正在加载
   * @returns {boolean} 是否正在加载
   */
  isLoadingState() {
    return this.isLoading;
  }

  /**
   * 是否正在播放
   * @returns {boolean} 是否正在播放
   */
  isPlayingState() {
    return this.currentState === AUDIO_STATES.PLAYING;
  }

  /**
   * 获取错误信息
   * @returns {Error|null} 错误信息
   */
  getError() {
    return this.error;
  }

  /**
   * 添加状态变化监听器
   * @param {Function} listener 监听器函数
   * @returns {Function} 移除监听器的函数
   */
  addListener(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * 通知所有监听器状态变化
   * @private
   */
  notifyListeners() {
    const state = {
      state: this.currentState,
      track: this.currentTrack,
      url: this.currentUrl,
      isLoading: this.isLoading,
      error: this.error
    };

    this.listeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.error('音频状态监听器错误:', error);
      }
    });
  }

  /**
   * 转换状态
   * @private
   * @param {string} action 动作
   * @param {Object} payload 附加数据
   */
  transition(action, payload = {}) {
    console.log(`[AudioStateManager] 状态转换: ${this.currentState} -> ${action}`, payload);

    const prevState = this.currentState;

    switch (this.currentState) {
      case AUDIO_STATES.IDLE:
        if (action === AUDIO_ACTIONS.LOAD) {
          this.currentState = AUDIO_STATES.LOADING;
          this.currentTrack = payload.track || null;
          this.currentUrl = null;
          this.isLoading = true;
          this.error = null;
        }
        break;

      case AUDIO_STATES.LOADING:
        if (action === AUDIO_ACTIONS.PLAY && payload.url) {
          this.currentState = AUDIO_STATES.PLAYING;
          this.currentUrl = payload.url;
          this.isLoading = false;
        } else if (action === AUDIO_ACTIONS.ERROR) {
          this.currentState = AUDIO_STATES.IDLE;
          this.error = payload.error || new Error('未知错误');
          this.isLoading = false;
        } else if (action === AUDIO_ACTIONS.STOP) {
          this.currentState = AUDIO_STATES.IDLE;
          this.isLoading = false;
        }
        break;

      case AUDIO_STATES.PLAYING:
        if (action === AUDIO_ACTIONS.PAUSE) {
          this.currentState = AUDIO_STATES.PAUSED;
        } else if (action === AUDIO_ACTIONS.STOP) {
          this.currentState = AUDIO_STATES.STOPPED;
        } else if (action === AUDIO_ACTIONS.LOAD) {
          this.currentState = AUDIO_STATES.LOADING;
          this.currentTrack = payload.track || null;
          this.currentUrl = null;
          this.isLoading = true;
        } else if (action === AUDIO_ACTIONS.ERROR) {
          this.currentState = AUDIO_STATES.IDLE;
          this.error = payload.error || new Error('播放错误');
        }
        break;

      case AUDIO_STATES.PAUSED:
        if (action === AUDIO_ACTIONS.PLAY) {
          this.currentState = AUDIO_STATES.PLAYING;
        } else if (action === AUDIO_ACTIONS.STOP) {
          this.currentState = AUDIO_STATES.STOPPED;
        } else if (action === AUDIO_ACTIONS.LOAD) {
          this.currentState = AUDIO_STATES.LOADING;
          this.currentTrack = payload.track || null;
          this.currentUrl = null;
          this.isLoading = true;
        }
        break;

      case AUDIO_STATES.STOPPED:
        if (action === AUDIO_ACTIONS.LOAD) {
          this.currentState = AUDIO_STATES.LOADING;
          this.currentTrack = payload.track || null;
          this.currentUrl = null;
          this.isLoading = true;
        } else if (action === AUDIO_ACTIONS.PLAY) {
          this.currentState = AUDIO_STATES.PLAYING;
        }
        break;

      default:
        console.warn(`[AudioStateManager] 未知状态: ${this.currentState}`);
        this.currentState = AUDIO_STATES.IDLE;
    }

    if (prevState !== this.currentState) {
      console.log(`[AudioStateManager] 状态已变更: ${prevState} -> ${this.currentState}`);
      this.notifyListeners();
    }
  }

  /**
   * 加载新音频
   * @param {Object} track 曲目信息
   * @returns {number} 请求ID
   */
  loadTrack(track) {
    // 生成新的请求ID
    const requestId = ++this.requestId;
    this.activeRequest = requestId;

    // 转换到加载状态
    this.transition(AUDIO_ACTIONS.LOAD, { track });

    return requestId;
  }

  /**
   * 设置URL并播放
   * @param {string} url 音频URL
   * @param {number} requestId 请求ID
   * @returns {boolean} 是否成功设置
   */
  setUrlAndPlay(url, requestId) {
    // 检查是否是当前活跃的请求
    if (requestId !== this.activeRequest) {
      console.log(`[AudioStateManager] 忽略过时的请求: ${requestId}, 当前请求: ${this.activeRequest}`);
      return false;
    }

    // 转换到播放状态
    this.transition(AUDIO_ACTIONS.PLAY, { url });
    return true;
  }

  /**
   * 播放
   */
  play() {
    if (this.currentState === AUDIO_STATES.PAUSED) {
      this.transition(AUDIO_ACTIONS.PLAY);
    }
  }

  /**
   * 暂停
   */
  pause() {
    if (this.currentState === AUDIO_STATES.PLAYING) {
      this.transition(AUDIO_ACTIONS.PAUSE);
    }
  }

  /**
   * 停止
   */
  stop() {
    this.transition(AUDIO_ACTIONS.STOP);
  }

  /**
   * 设置错误
   * @param {Error} error 错误信息
   */
  setError(error) {
    this.transition(AUDIO_ACTIONS.ERROR, { error });
  }

  /**
   * 取消当前请求
   */
  cancelCurrentRequest() {
    if (this.isLoading) {
      console.log(`[AudioStateManager] 取消当前请求: ${this.activeRequest}`);
      this.activeRequest = null;
      this.transition(AUDIO_ACTIONS.STOP);
    }
  }

  /**
   * 检查请求是否有效
   * @param {number} requestId 请求ID
   * @returns {boolean} 是否有效
   */
  isValidRequest(requestId) {
    return requestId === this.activeRequest;
  }
}

// 导出单例实例
const audioStateManager = new AudioStateManager();
export default audioStateManager; 