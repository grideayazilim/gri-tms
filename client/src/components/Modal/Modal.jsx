import { useEffect } from 'react';
import './Modal.scss';

function Modal({
  title,
  content,
  size = 'medium',
  showCloseButton = true,
  zIndex = 3000,
  onClose,
}) {
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose(null);
    }
  };

  const handleEscKey = (e) => {
    if (e.key === 'Escape') {
      onClose(null);
    }
  };

  // ESC key listener
  useEffect(() => {
    window.addEventListener('keydown', handleEscKey);
    return () => window.removeEventListener('keydown', handleEscKey);
  }, []);

  return (
    <div 
      className="modal-overlay" 
      style={{ zIndex }}
      onClick={handleOverlayClick}
    >
      <div 
        className={`modal-container modal-container--${size}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          {showCloseButton && (
            <button 
              className="modal-close"
              onClick={() => onClose(null)}
              aria-label="Kapat"
            >
              ✕
            </button>
          )}
        </div>

        {/* Content */}
        <div className="modal-content">
          {typeof content === 'function' ? content(onClose) : content}
        </div>
      </div>
    </div>
  );
}

export default Modal;

