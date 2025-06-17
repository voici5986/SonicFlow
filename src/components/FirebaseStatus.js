import React from 'react';
import useFirebaseStatus from '../hooks/useFirebaseStatus';
import '../styles/FirebaseStatus.css';

const FirebaseStatus = () => {
  // 使用自定义Hook管理Firebase状态
  const { isAvailable, isChecking } = useFirebaseStatus({
    showToasts: false, // 不在组件中显示提示，由应用层处理
    manualCheck: false // 自动检查
  });
  
  return (
    <div className={`firebase-status ${isAvailable ? 'available' : 'unavailable'} ${isChecking ? 'checking' : ''}`}>
      <div className="indicator"></div>
      {isAvailable ? '数据库已连接' : '数据库离线'}
    </div>
  );
};

export default FirebaseStatus; 