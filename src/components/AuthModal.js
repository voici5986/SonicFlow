import Auth from '../pages/Auth';
import { FaTimes } from 'react-icons/fa';

const AuthModal = ({ show, handleClose, onAuthSuccess }) => {
  if (!show) return null;

  return (
    <div className="modal-overlay-custom" onClick={handleClose}>
      <div 
        className="modal-container-custom" 
        style={{ maxWidth: '600px' }} 
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header-custom">
          <h5 className="modal-title-custom">账号登录</h5>
          <button className="modal-close-custom" onClick={handleClose}>
            <FaTimes size={18} />
          </button>
        </div>
        <div className="modal-body-custom p-0">
          <Auth onAuthSuccess={onAuthSuccess} closeModal={handleClose} />
        </div>
      </div>
    </div>
  );
};

export default AuthModal; 