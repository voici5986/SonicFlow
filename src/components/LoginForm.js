import React, { useState } from 'react';
import { Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { FaGoogle } from 'react-icons/fa';

const LoginForm = ({ onToggleForm, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  
  const { login, signInWithGoogle, resetPassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const { success, error } = await login(email, password);
      if (success) {
        onLoginSuccess && onLoginSuccess();
      } else if (error) {
        setError(error.message);
      }
    } catch (err) {
      setError('登录失败，请稍后重试');
    }
    
    setLoading(false);
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
    <div className="login-form-container py-3">
      <h3 className="text-center mb-4">登录账号</h3>
      {error && <Alert variant="danger">{error}</Alert>}
      {resetEmailSent && <Alert variant="success">重置密码邮件已发送，请查收</Alert>}
      
      <Form onSubmit={handleSubmit} data-testid="login-form">
        <Form.Group className="mb-3" controlId="formEmail">
          <Form.Label>邮箱地址</Form.Label>
          <Form.Control
            type="email"
            placeholder="请输入邮箱地址"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Form.Group>

        <Form.Group className="mb-3" controlId="formPassword">
          <Form.Label>密码</Form.Label>
          <Form.Control
            type="password"
            placeholder="请输入密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Form.Group>

        <div className="d-flex justify-content-between mb-4">
          <a
            href="#"
            className="text-primary"
            onClick={(e) => {
              e.preventDefault();
              handleForgotPassword();
            }}
            style={{ cursor: 'pointer', textDecoration: 'none' }}
          >
            忘记密码？
          </a>
        </div>

        <Button
          variant="primary"
          type="submit"
          disabled={loading}
          className="w-100 mb-3"
        >
          {loading ? <Spinner animation="border" size="sm" /> : "登录"}
        </Button>

        <div className="text-center mb-3">或</div>

        <Button
          variant="outline-danger"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-100 mb-3"
        >
          <FaGoogle className="me-2" /> Google登录
        </Button>

        <div className="text-center mt-3">
          <p className="mb-0">
            还没有账号？{" "}
            <a
              href="#"
              className="text-primary"
              onClick={(e) => {
                e.preventDefault();
                onToggleForm();
              }}
              style={{ cursor: 'pointer', textDecoration: 'none' }}
            >
              立即注册
            </a>
          </p>
        </div>
      </Form>
    </div>
  );
};

export default LoginForm; 