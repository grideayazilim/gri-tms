import type { ReactNode } from 'react';

import { motion } from 'framer-motion';

import './PageShell.scss';

interface PageShellProps {
  title?: ReactNode;
  headerActions?: ReactNode;
  children: ReactNode;
  isLoading?: boolean;
}

const PageShell = ({ title, headerActions, children }: PageShellProps) => {
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
