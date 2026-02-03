import AuthContainer from './AuthContainer';
import { FaTimes } from 'react-icons/fa';

const AuthModal = ({ show, handleClose, onAuthSuccess }) => {
  if (!show) return null;

  return (
    <div className="modal-overlay-custom" onClick={handleClose}>
      <div 
        className="modal-container-custom" 
        style={{ maxWidth: '500px' }} 
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header-custom border-0 pb-0">
          <button className="modal-close-custom" onClick={handleClose} style={{ top: '15px', right: '15px' }}>
            <FaTimes size={18} />
          </button>
        </div>
        <div className="modal-body-custom pt-0">
          <AuthContainer 
            onAuthSuccess={() => {
              onAuthSuccess && onAuthSuccess();
              handleClose();
            }} 
          />
        </div>
      </div>
    </div>
  );
};

export default AuthModal; 