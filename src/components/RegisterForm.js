import React, { useState, useEffect } from 'react';
import { Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { useRegion } from '../contexts/RegionContext';
import { useDebounce } from '../utils/throttleDebounce';

/**
 * 注册表单组件
 * @param {function} onToggleForm - 切换到登录表单的回调
 * @param {function} onRegisterSuccess - 注册成功的回调
 */
const RegisterForm = ({ onToggleForm, onRegisterSuccess }) => {
  // 状态
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // 防抖处理后的状态
  const [debouncedDisplayName, setDebouncedDisplayName] = useState('');
  const [debouncedEmail, setDebouncedEmail] = useState('');
  const [debouncedPassword, setDebouncedPassword] = useState('');
  const [debouncedConfirmPassword, setDebouncedConfirmPassword] = useState('');
  
  // 创建防抖处理函数
  const handleDisplayNameChange = useDebounce((value) => {
    setDebouncedDisplayName(value);
  }, 300);
  
  const handleEmailChange = useDebounce((value) => {
    setDebouncedEmail(value);
  }, 300);
  
  const handlePasswordChange = useDebounce((value) => {
    setDebouncedPassword(value);
  }, 300);
  
  const handleConfirmPasswordChange = useDebounce((value) => {
    setDebouncedConfirmPassword(value);
  }, 300);
  
  // 获取认证上下文
  const { register } = useAuth();
  
  // 获取区域上下文
  const { isFeatureAvailable } = useRegion();
  
  // 检查账号功能是否可用
  const accountFeatureAvailable = isFeatureAvailable('account');
  
  // 当账号功能不可用时显示警告
  useEffect(() => {
    if (!accountFeatureAvailable) {
      setError('当前区域无法使用账号功能，请尝试使用VPN或代理服务');
    } else {
      setError('');
    }
  }, [accountFeatureAvailable]);
  
  // 处理表单提交
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 清除之前的错误
    setError('');
    
    // 验证输入
    if (!debouncedDisplayName || !debouncedEmail || !debouncedPassword || !debouncedConfirmPassword) {
      setError('请填写所有必填字段');
      return;
    }
    
    // 验证密码
    if (debouncedPassword !== debouncedConfirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }
    
    // 验证密码强度
    if (debouncedPassword.length < 6) {
      setError('密码长度至少为6个字符');
      return;
    }
    
    // 检查账号功能是否可用
    if (!accountFeatureAvailable) {
      setError('当前区域无法使用账号功能，请尝试使用VPN或代理服务');
      return;
    }
    
    try {
      setLoading(true);
      
      // 调用认证服务进行注册
      await register(debouncedEmail, debouncedPassword, debouncedDisplayName);
      
      // 注册成功，调用回调
      if (onRegisterSuccess) {
        onRegisterSuccess();
      }
    } catch (error) {
      console.error('注册失败:', error);
      
      // 设置错误消息
      if (error.code === 'auth/email-already-in-use') {
        setError('该邮箱已被注册');
      } else if (error.code === 'auth/invalid-email') {
        setError('无效的邮箱格式');
      } else if (error.code === 'auth/weak-password') {
        setError('密码强度太弱');
      } else {
        setError('注册失败，请稍后再试');
      }
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="register-form p-4 border rounded shadow-sm bg-white">
      <h4 className="mb-4">创建账号</h4>
      
      {error && <Alert variant="danger">{error}</Alert>}
      
      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3">
          <Form.Label>昵称</Form.Label>
          <Form.Control
            type="text"
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              handleDisplayNameChange(e.target.value);
            }}
            placeholder="请输入您的昵称"
            disabled={loading || !accountFeatureAvailable}
          />
        </Form.Group>
        
        <Form.Group className="mb-3">
          <Form.Label>电子邮箱</Form.Label>
          <Form.Control
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              handleEmailChange(e.target.value);
            }}
            placeholder="请输入您的邮箱"
            disabled={loading || !accountFeatureAvailable}
          />
        </Form.Group>
        
        <Form.Group className="mb-3">
          <Form.Label>密码</Form.Label>
          <Form.Control
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              handlePasswordChange(e.target.value);
            }}
            placeholder="请设置密码"
            disabled={loading || !accountFeatureAvailable}
          />
          <Form.Text className="text-muted">
            密码长度至少为6个字符
          </Form.Text>
        </Form.Group>
        
        <Form.Group className="mb-3">
          <Form.Label>确认密码</Form.Label>
          <Form.Control
            type="password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              handleConfirmPasswordChange(e.target.value);
            }}
            placeholder="请再次输入密码"
            disabled={loading || !accountFeatureAvailable}
          />
        </Form.Group>
        
        <Button 
          variant="primary" 
          type="submit" 
          className="w-100 mb-3"
          disabled={loading || !accountFeatureAvailable}
        >
          {loading ? (
            <>
              <Spinner
                as="span"
                animation="border"
                size="sm"
                role="status"
                aria-hidden="true"
                className="me-2"
              />
              注册中...
            </>
          ) : '注册'}
        </Button>
        
        <div className="text-center">
          <span className="text-muted small">已有账号? </span>
          <button 
            type="button"
            className="text-primary small"
            onClick={onToggleForm}
            style={{ cursor: 'pointer', textDecoration: 'none', background: 'none', border: 'none', padding: '0' }}
          >
            立即登录
          </button>
        </div>
      </Form>
    </div>
  );
};

export default RegisterForm; 