import { motion } from 'framer-motion';
import './PageShell.scss';

const PageShell = ({ title, headerActions, children }) => {
  return (
    <motion.main 
      className="page-container"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 15, opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {(title || headerActions) && (
        <div className="page-header">
           {title && <h1 className="page-title">{title}</h1>}
           {headerActions && <div className="page-actions">{headerActions}</div>}
        </div>
      )}
      {children}
    </motion.main>
  );
};

export default PageShell;
