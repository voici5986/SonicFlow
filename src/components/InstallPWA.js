import React, { useState, useEffect } from 'react';
import { Button, Toast, ToastContainer } from 'react-bootstrap';
import { FaDownload, FaTimes } from 'react-icons/fa';
import { useDevice } from '../contexts/DeviceContext';

/**
 * PWA安装提示组件
 * 当检测到用户未安装PWA时，显示安装提示
 */
const InstallPWA = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallToast, setShowInstallToast] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const { deviceType } = useDevice();
  
  // 检测是否为已安装的PWA
  useEffect(() => {
    // 通过显示模式检测是否为PWA
    if (window.matchMedia('(display-mode: standalone)').matches || 
        window.navigator.standalone === true) {
      setIsInstalled(true);
    }
    
    // 防止重复显示安装提示
    const hasPromptedBefore = localStorage.getItem('pwaPromptDismissed');
    if (hasPromptedBefore && Date.now() - parseInt(hasPromptedBefore) < 7 * 24 * 60 * 60 * 1000) {
      // 如果在过去7天内已经提示过，不再显示
      return;
    }
    
    // 监听beforeinstallprompt事件
    const handler = (e) => {
      // 阻止Chrome自动显示安装提示
      e.preventDefault();
      // 保存事件，以便稍后触发
      setDeferredPrompt(e);
      // 显示自定义安装提示
      setTimeout(() => {
        setShowInstallToast(true);
      }, 3000); // 延迟3秒显示，避免打扰用户
    };
    
    window.addEventListener('beforeinstallprompt', handler);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);
  
  // 应用安装状态变化监听
  useEffect(() => {
    const handleAppInstalled = () => {
      // 应用被安装时，隐藏提示
      setShowInstallToast(false);
      setDeferredPrompt(null);
      setIsInstalled(true);
      
      // 显示安装成功消息
      alert('SonicFlow已成功安装！您可以从主屏幕启动应用。');
    };
    
    window.addEventListener('appinstalled', handleAppInstalled);
    
    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);
  
  // 处理安装按钮点击
  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      console.log('无法安装，安装提示不可用');
      return;
    }
    
    // 显示安装提示
    deferredPrompt.prompt();
    
    // 等待用户响应
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`用户选择: ${outcome}`);
    
    // 无论结果如何，都清除保存的提示
    setDeferredPrompt(null);
    setShowInstallToast(false);
  };
  
  // 处理关闭提示
  const handleDismiss = () => {
    setShowInstallToast(false);
    // 记录用户关闭时间，避免频繁打扰
    localStorage.setItem('pwaPromptDismissed', Date.now().toString());
  };
  
  // 如果已安装或没有安装提示，不渲染任何内容
  if (isInstalled || !deferredPrompt) {
    return null;
  }
  
  return (
    <ToastContainer position="bottom-center" className="p-3" style={{ zIndex: 'var(--z-index-toast)' }}>
      <Toast 
        show={showInstallToast} 
        onClose={handleDismiss}
        className="bg-white border-primary"
        style={{ maxWidth: '350px' }}
      >
        <Toast.Header closeButton={false}>
          <img 
            src="/logo192.png" 
            className="rounded me-2" 
            alt="SonicFlow Logo"
            height="20"
          />
          <strong className="me-auto">安装SonicFlow</strong>
          <Button 
            variant="link" 
            size="sm" 
            className="p-0 ms-2" 
            onClick={handleDismiss}
            aria-label="关闭"
          >
            <FaTimes />
          </Button>
        </Toast.Header>
        <Toast.Body>
          <div className="mb-2">
            {deviceType === 'mobile' ? 
              '将SonicFlow安装到您的主屏幕，获得更好的使用体验！' :
              '将SonicFlow安装为桌面应用，随时享受音乐！'
            }
          </div>
          <div className="d-flex justify-content-end mt-2">
            <Button 
              variant="primary" 
              size="sm" 
              onClick={handleInstallClick}
              className="d-flex align-items-center"
            >
              <FaDownload className="me-1" />
              <span>立即安装</span>
            </Button>
          </div>
        </Toast.Body>
      </Toast>
    </ToastContainer>
  );
};

export default InstallPWA; 