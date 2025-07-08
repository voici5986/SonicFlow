import React from 'react';
import ReactDOM from 'react-dom/client';
// 首先导入主题文件
import './styles/theme.css';
import './index.css';
// 其他样式文件
import './styles/App.css';
import './styles/AudioPlayer.css';
import './styles/NavigationFix.css';
import './styles/Orientation.css';
import './styles/UserProfile.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { AuthProvider } from './contexts/AuthContext';
import { DeviceProvider } from './contexts/DeviceContext';
import * as serviceWorkerRegistration from './utils/serviceWorkerRegistration';

// 添加音频元素创建检测
const originalCreateElement = document.createElement;
document.createElement = function(tagName, options) {
  const element = originalCreateElement.call(document, tagName, options);
  if (tagName.toLowerCase() === 'audio') {
    console.log('[音频检测] 创建了新的音频元素', {
      time: new Date().toISOString(),
      stack: new Error().stack
    });
    
    // 拦截audio.play方法
    const originalPlay = element.play;
    element.play = function() {
      console.log('[音频检测] 音频元素play被调用', {
        id: this.id,
        src: this.src,
        time: new Date().toISOString(),
        stack: new Error().stack
      });
      
      // 检查并暂停其他音频元素
      const allAudio = document.querySelectorAll('audio');
      if (allAudio.length > 1) {
        Array.from(allAudio).forEach(audio => {
          if (audio !== this && !audio.paused) {
            console.warn('[音频检测] 检测到其他正在播放的音频，尝试暂停', audio.id);
            try {
              audio.pause();
            } catch(e) {
              console.error('[音频检测] 暂停其他音频失败', e);
            }
          }
        });
      }
      
      return originalPlay.apply(this, arguments);
    };
  }
  return element;
};

const root = ReactDOM.createRoot(document.getElementById('root'));

// 注意：不使用React.StrictMode包裹应用
// 严格模式会导致组件在开发环境下重复渲染，可能导致多次播放音频问题
// 仅在开发环境影响，不影响生产环境
root.render(
    <AuthProvider>
      <DeviceProvider>
    <App />
    <ToastContainer
        position="bottom-right"
      autoClose={3000}
      hideProgressBar={false}
        newestOnTop
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme="colored"
    />
      </DeviceProvider>
    </AuthProvider>
);

// 注册Service Worker，启用PWA功能
serviceWorkerRegistration.register({
  onUpdate: (registration) => {
    console.log('应用有新的更新可用');
    // 可以在这里触发更新通知
  },
  onSuccess: (registration) => {
    console.log('内容已成功缓存，可离线使用');
  }
});

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
