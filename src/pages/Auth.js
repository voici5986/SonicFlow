import React, { useState } from 'react';
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
    <div className="container">
      <div className="row justify-content-center">
        <div className="col-md-8 col-lg-6">
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
        </div>
      </div>
    </div>
  );
};

export default Auth; 