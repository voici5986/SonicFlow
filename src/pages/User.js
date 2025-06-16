import React from 'react';
import { Container } from 'react-bootstrap';
import UserProfile from '../components/UserProfile';
import Auth from './Auth';
import { useAuth } from '../contexts/AuthContext';

const User = ({ onTabChange }) => {
  const { currentUser } = useAuth();
  
  return (
    <Container className="my-4">
      {currentUser ? <UserProfile onTabChange={onTabChange} /> : <Auth />}
    </Container>
  );
};

export default User; 