import React from 'react';
import { Modal } from 'react-bootstrap';
import Auth from '../pages/Auth';

const AuthModal = ({ show, handleClose, onAuthSuccess }) => {
  return (
    <Modal
      show={show}
      onHide={handleClose}
      size="lg"
      backdrop="static"
      keyboard={false}
      centered
    >
      <Modal.Header closeButton>
        <Modal.Title>账号登录</Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-0">
        <Auth onAuthSuccess={onAuthSuccess} closeModal={handleClose} />
      </Modal.Body>
    </Modal>
  );
};

export default AuthModal; 