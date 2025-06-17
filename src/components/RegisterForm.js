import React, { useState } from 'react';
import { Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';

const RegisterForm = ({ onToggleForm, onRegisterSuccess }) => {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 验证表单
    if (password !== confirmPassword) {
      return setError('两次输入的密码不一致');
    }
    
    if (password.length < 6) {
      return setError('密码长度至少为6位');
    }
    
    setError('');
    setLoading(true);
    
    try {
      const { success, error } = await register(email, password, displayName);
      if (success) {
        onRegisterSuccess && onRegisterSuccess();
      } else if (error) {
        setError(error.message);
      }
    } catch (err) {
      setError('注册失败，请稍后重试');
    }
    
    setLoading(false);
  };

  return (
    <div className="register-form-container py-3">
      <h3 className="text-center mb-4">注册账号</h3>
      {error && <Alert variant="danger">{error}</Alert>}
      
      <Form onSubmit={handleSubmit} data-testid="register-form">
        <Form.Group className="mb-3" controlId="formDisplayName">
          <Form.Label>用户名</Form.Label>
          <Form.Control
            type="text"
            placeholder="请输入用户名"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
        </Form.Group>

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
            placeholder="请输入密码（至少6位）"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Form.Group>

        <Form.Group className="mb-4" controlId="formConfirmPassword">
          <Form.Label>确认密码</Form.Label>
          <Form.Control
            type="password"
            placeholder="请再次输入密码"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </Form.Group>

        <Button
          variant="primary"
          type="submit"
          disabled={loading}
          className="w-100 mb-3"
        >
          {loading ? <Spinner animation="border" size="sm" /> : "注册"}
        </Button>

        <div className="text-center mt-3">
          <p className="mb-0">
            已有账号？{" "}
            <a
              href="#"
              className="text-primary"
              onClick={(e) => {
                e.preventDefault();
                onToggleForm();
              }}
              style={{ cursor: 'pointer', textDecoration: 'none' }}
            >
              立即登录
            </a>
          </p>
        </div>
      </Form>
    </div>
  );
};

export default RegisterForm; 