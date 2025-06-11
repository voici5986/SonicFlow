import React, { useState } from 'react';
import { Form, Button, Card, Row, Col, Alert, Spinner } from 'react-bootstrap';
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
    <Card className="shadow-sm border-0 mb-4">
      <Card.Header className="bg-gradient-primary border-0 text-center">
        <h3 className="text-white mb-0">登录账号</h3>
      </Card.Header>
      <Card.Body className="p-4">
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
            <Button
              variant="link"
              className="p-0 text-decoration-none"
              onClick={handleForgotPassword}
              disabled={loading}
            >
              忘记密码？
            </Button>
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
              <Button
                variant="link"
                onClick={onToggleForm}
                className="p-0 text-decoration-none"
              >
                立即注册
              </Button>
            </p>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default LoginForm; 