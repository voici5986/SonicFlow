import React, { useState, useEffect } from 'react';
import { Toast, Button } from 'react-bootstrap';
import { FaSync } from 'react-icons/fa';
import { sendMessageToSW } from '../utils/serviceWorkerRegistration';

/**
 * 应用更新通知组件
 * 当检测到应用有新版本时，提示用户刷新
 */
const UpdateNotification = ({ registration }) => {
  const [showUpdateToast, setShowUpdateToast] = useState(false);
  
  useEffect(() => {
    // 如果没有registration，则不需要显示更新通知
    if (!registration) return;
    
    // 检查是否有新的Service Worker等待安装
    const checkUpdate = () => {
      if (registration.waiting) {
        // 有新版本等待安装
        setShowUpdateToast(true);
      }
    };
    
    // 初始检查
    checkUpdate();
    
    // 监听新版本安装事件
    const handleUpdate = () => {
      if (registration.waiting) {
        setShowUpdateToast(true);
      }
    };
    
    // 监听onupdatefound事件
    registration.addEventListener('updatefound', handleUpdate);
    
    return () => {
      registration.removeEventListener('updatefound', handleUpdate);
    };
  }, [registration]);
  
  // 处理更新应用按钮点击
  const handleUpdateClick = () => {
    setShowUpdateToast(false);
    
    if (registration && registration.waiting) {
      // 发送消息给等待中的Service Worker，通知它接管并刷新页面
      sendMessageToSW('SKIP_WAITING');
      
      // 延迟刷新页面，确保Service Worker有时间处理消息
      setTimeout(() => {
        window.location.reload();
      }, 300);
    }
  };
  
  if (!showUpdateToast) {
    return null;
  }
  
  return (
    <div 
      style={{ 
        position: 'fixed', 
        bottom: '20px', 
        right: '20px', 
        zIndex: 1050 
      }}
    >
      <Toast 
        show={showUpdateToast} 
        onClose={() => setShowUpdateToast(false)}
        className="bg-info text-white"
      >
        <Toast.Header className="bg-info text-white">
          <strong className="me-auto">应用更新</strong>
        </Toast.Header>
        <Toast.Body>
          <p className="mb-2">发现新版本！更新以获取最新功能和修复。</p>
          <div className="d-flex justify-content-end">
            <Button 
              variant="light" 
              size="sm" 
              onClick={handleUpdateClick}
              className="d-flex align-items-center"
            >
              <FaSync className="me-1" />
              <span>立即更新</span>
            </Button>
          </div>
        </Toast.Body>
      </Toast>
    </div>
  );
};

export default UpdateNotification; 