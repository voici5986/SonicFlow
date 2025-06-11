import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import UserProfile from '../components/UserProfile';
import Auth from './Auth';
import { useAuth } from '../contexts/AuthContext';

const User = () => {
  const { currentUser } = useAuth();
  
  return (
    <Container>
      <Row className="justify-content-center my-4">
        <Col md={8}>
          <Card className="shadow-sm border-0 mb-4">
            <Card.Header className="bg-gradient-primary border-0">
              <h3 className="text-white mb-0">账号中心</h3>
            </Card.Header>
            <Card.Body>
              {currentUser ? <UserProfile /> : <Auth />}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default User; 