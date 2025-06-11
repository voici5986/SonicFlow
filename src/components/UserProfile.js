import React, { useState, useEffect } from 'react';
import { Button, Card, Image, Badge, Spinner, Alert } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { syncFavoritesToCloud, syncFavoritesFromCloud, syncHistoryToCloud, syncHistoryFromCloud } from '../services/syncService';
import { getFavorites, getHistory } from '../services/storage';
import { FaSync, FaCloudUploadAlt, FaCloudDownloadAlt, FaSignOutAlt } from 'react-icons/fa';

const UserProfile = () => {
  const { currentUser, signOut } = useAuth();
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [historyCount, setHistoryCount] = useState(0);
  const [syncStatus, setSyncStatus] = useState({ loading: false, success: null, message: '' });
  
  useEffect(() => {
    loadCounts();
  }, []);
  
  const loadCounts = async () => {
    const favorites = await getFavorites();
    const history = await getHistory();
    setFavoritesCount(favorites.length);
    setHistoryCount(history.length);
  };
  
  const handleSyncToCloud = async () => {
    if (!currentUser) return;
    
    setSyncStatus({ loading: true, success: null, message: '正在同步到云端...' });
    
    try {
      const favResult = await syncFavoritesToCloud(currentUser.uid);
      const histResult = await syncHistoryToCloud(currentUser.uid);
      
      if (favResult.success && histResult.success) {
        setSyncStatus({ loading: false, success: true, message: '同步到云端成功' });
      } else {
        setSyncStatus({ 
          loading: false, 
          success: false, 
          message: `同步失败: ${favResult.error || histResult.error || '未知错误'}`
        });
      }
    } catch (error) {
      setSyncStatus({ loading: false, success: false, message: `同步错误: ${error.message}` });
    }
  };
  
  const handleSyncFromCloud = async () => {
    if (!currentUser) return;
    
    setSyncStatus({ loading: true, success: null, message: '正在从云端同步...' });
    
    try {
      const favResult = await syncFavoritesFromCloud(currentUser.uid);
      const histResult = await syncHistoryFromCloud(currentUser.uid);
      
      if (favResult.success && histResult.success) {
        setSyncStatus({ loading: false, success: true, message: '从云端同步成功' });
        loadCounts(); // 更新计数
      } else {
        setSyncStatus({ 
          loading: false, 
          success: false, 
          message: `同步失败: ${favResult.error || histResult.error || '未知错误'}`
        });
      }
    } catch (error) {
      setSyncStatus({ loading: false, success: false, message: `同步错误: ${error.message}` });
    }
  };
  
  const handleManualSync = async () => {
    if (!currentUser) return;
    
    setSyncStatus({ loading: true, success: null, message: '正在数据同步...' });
    
    try {
      // 执行双向合并操作
      const { initialSync } = await import('../services/syncService');
      const result = await initialSync(currentUser.uid);
      
      if (result.success) {
        setSyncStatus({ loading: false, success: true, message: '数据同步成功' });
        loadCounts(); // 更新计数
      } else {
        setSyncStatus({ loading: false, success: false, message: `同步失败: ${result.error || '未知错误'}` });
      }
    } catch (error) {
      setSyncStatus({ loading: false, success: false, message: `同步错误: ${error.message}` });
    }
  };
  
  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('退出登录失败:', error);
    }
  };
  
  if (!currentUser) {
    return null;
  }
  
  const userInitial = currentUser.displayName ? currentUser.displayName[0].toUpperCase() : 
                     (currentUser.email ? currentUser.email[0].toUpperCase() : '?');
  
  return (
    <Card className="border-0 shadow-sm mb-4">
      <Card.Body>
        <div className="d-flex align-items-center mb-3">
          {currentUser.photoURL ? (
            <Image 
              src={currentUser.photoURL} 
              roundedCircle 
              width={60} 
              height={60} 
              className="me-3" 
            />
          ) : (
            <div 
              className="rounded-circle bg-primary text-white d-flex justify-content-center align-items-center me-3"
              style={{ width: '60px', height: '60px', fontSize: '1.5rem' }}
            >
              {userInitial}
            </div>
          )}
          
          <div>
            <h5 className="mb-0">{currentUser.displayName || '用户'}</h5>
            <p className="text-muted mb-0">{currentUser.email}</p>
          </div>
          
          <Button 
            variant="outline-danger" 
            size="sm"
            className="ms-auto"
            onClick={handleLogout}
          >
            <FaSignOutAlt className="me-1" /> 退出登录
          </Button>
        </div>
        
        <div className="mb-3">
          <Badge bg="primary" className="me-2">
            收藏: {favoritesCount}
          </Badge>
          <Badge bg="secondary">
            历史记录: {historyCount}
          </Badge>
        </div>
        
        {syncStatus.message && (
          <Alert 
            variant={syncStatus.success === null ? 'info' : 
                    syncStatus.success ? 'success' : 'danger'} 
            className="py-2 mb-3"
          >
            {syncStatus.message}
          </Alert>
        )}
        
        <div className="d-flex gap-2 mt-3">
          <Button 
            variant="outline-primary" 
            onClick={handleManualSync}
            disabled={syncStatus.loading}
            className="w-100"
          >
            {syncStatus.loading ? (
              <Spinner animation="border" size="sm" />
            ) : (
              <>
                <FaSync className="me-1" /> 双向同步
              </>
            )}
          </Button>
          
          <Button 
            variant="outline-success" 
            onClick={handleSyncToCloud}
            disabled={syncStatus.loading}
          >
            <FaCloudUploadAlt className="me-1" /> 上传
          </Button>
          
          <Button 
            variant="outline-info" 
            onClick={handleSyncFromCloud}
            disabled={syncStatus.loading}
          >
            <FaCloudDownloadAlt className="me-1" /> 下载
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
};

export default UserProfile; 