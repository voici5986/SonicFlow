import React, { useState, useEffect } from 'react';
import { Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { useRegion } from '../contexts/RegionContext';
import { useDebounce } from '../utils/throttleDebounce';
import { FaEnvelope, FaLock, FaWaveSquare } from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';

/**
 * 登录表单组件
 * @param {function} onToggleForm - 切换到注册表单的回调
 * @param {function} onLoginSuccess - 登录成功的回调
 */
const LoginForm = ({ onToggleForm, onLoginSuccess }) => {
  // 状态
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  
  // 防抖处理后的状态
  const [debouncedEmail, setDebouncedEmail] = useState('');
  const [debouncedPassword, setDebouncedPassword] = useState('');
  
  // 创建防抖处理函数
  const handleEmailChange = useDebounce((value) => {
    setDebouncedEmail(value);
  }, 300);
  
  const handlePasswordChange = useDebounce((value) => {
    setDebouncedPassword(value);
  }, 300);
  
  // 获取认证上下文
  const { login, signInWithGoogle, resetPassword } = useAuth();
  
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
    if (!debouncedEmail || !debouncedPassword) {
      setError('请填写所有必填字段');
      return;
    }
    
    // 检查账号功能是否可用
    if (!accountFeatureAvailable) {
      setError('当前区域无法使用账号功能，请尝试使用VPN或代理服务');
      return;
    }
    
    try {
      setLoading(true);
      
      // 调用认证服务进行登录
      await login(debouncedEmail, debouncedPassword);
      
      // 登录成功，调用回调
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (error) {
      console.error('登录失败:', error);
      
      // 设置错误消息
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        setError('邮箱或密码错误');
      } else if (error.code === 'auth/invalid-email') {
        setError('无效的邮箱格式');
      } else if (error.code === 'auth/too-many-requests') {
        setError('登录尝试次数过多，请稍后再试');
      } else {
        setError('登录失败，请稍后再试');
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    
    try {
      const { success } = await signInWithGoogle();
      if (success) {
        onLoginSuccess && onLoginSuccess();
      }
    } catch (err) {
      setError('Google登录失败，请稍后重试');
    }
    
    setLoading(false);
  };
  
  const handleForgotPassword = async () => {
    if (!email) {
      setError('请输入邮箱地址');
      return;
    }
    
    setLoading(true);
    
    try {
      const { success } = await resetPassword(email);
      if (success) {
        setResetEmailSent(true);
      }
    } catch (err) {
      setError('重置密码邮件发送失败，请稍后重试');
    }
    
    setLoading(false);
  };

  return (
    <div className="auth-form-container">
      {/* 移动端显示的品牌区域 */}
      <div className="brand-section d-lg-none">
        <div className="brand-logo">
          <FaWaveSquare />
        </div>
        <div className="brand-name">SonicFlow</div>
        <div className="brand-tagline">让音乐随心而动</div>
      </div>

      <h3 className="text-center mb-4 d-none d-lg-block">登录账号</h3>
      
      {error && <Alert variant="danger">{error}</Alert>}
      {resetEmailSent && <Alert variant="success">重置密码邮件已发送，请查收</Alert>}
      
      <Form onSubmit={handleSubmit} data-testid="login-form">
        <div className="form-group">
          <div className="input-wrapper">
            <div className="input-icon">
              <FaEnvelope />
            </div>
            <input
              type="email"
              className="input-field"
              placeholder="电子邮箱"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                handleEmailChange(e.target.value);
              }}
              required
              disabled={loading || !accountFeatureAvailable}
            />
          </div>
        </div>

        <div className="form-group">
          <div className="input-wrapper">
            <div className="input-icon">
              <FaLock />
            </div>
            <input
              type="password"
              className="input-field"
              placeholder="密码"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                handlePasswordChange(e.target.value);
              }}
              required
              disabled={loading || !accountFeatureAvailable}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !accountFeatureAvailable}
          className="btn-auth btn-primary-auth"
        >
          {loading ? (
            <Spinner
              as="span"
              animation="border"
              size="sm"
              role="status"
              aria-hidden="true"
            />
          ) : "立即登录"}
        </button>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading || !accountFeatureAvailable}
          className="btn-auth btn-google-auth"
        >
          <FcGoogle /> 使用 Google 账号登录
        </button>

        <div className="d-flex justify-content-between align-items-center mt-4">
          <button
            type="button"
            onClick={handleForgotPassword}
            style={{ cursor: 'pointer', textDecoration: 'none', background: 'none', border: 'none', padding: '0', fontSize: '15px', color: '#4A90E2', fontWeight: '500' }}
          >
            忘记密码？
          </button>
          
          <div>
            <button
              type="button"
              className="text-accent"
              onClick={onToggleForm}
              style={{ cursor: 'pointer', textDecoration: 'none', background: 'none', border: 'none', padding: '0', color: 'var(--color-accent)', fontWeight: '700', fontSize: '15px' }}
            >
              免费注册
            </button>
          </div>
        </div>
      </Form>
    </div>
  );
};

export default LoginForm; 