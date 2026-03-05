import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
    <AnimatePresence>
      <motion.div 
        className="modal-overlay" 
        style={{ zIndex }}
        onClick={handleOverlayClick}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div 
          className={`modal-container modal-container--${size}`}
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
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
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default Modal;

