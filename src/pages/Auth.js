import React, { useState } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import LoginForm from '../components/LoginForm';
import RegisterForm from '../components/RegisterForm';

const Auth = ({ onAuthSuccess, closeModal }) => {
  const [isLogin, setIsLogin] = useState(true);
  
  const toggleForm = () => {
    setIsLogin(!isLogin);
  };
  
  const handleAuthSuccess = () => {
    if (onAuthSuccess) {
      onAuthSuccess();
    }
    if (closeModal) {
      closeModal();
    }
  };
  
  return (
    <Container>
      <Row className="justify-content-center">
        <Col md={8} lg={6}>
          {isLogin ? (
            <LoginForm 
              onToggleForm={toggleForm} 
              onLoginSuccess={handleAuthSuccess} 
            />
          ) : (
            <RegisterForm 
              onToggleForm={toggleForm} 
              onRegisterSuccess={handleAuthSuccess} 
            />
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default Auth; 