import type { ReactNode } from 'react';

import { motion } from 'framer-motion';

import { useAuth } from '../../context/AuthContext';
import { InfoButton } from '../VideoInfoModal/VideoInfoModal';
import type { InfoVideosConfig } from '../VideoInfoModal/VideoInfoModal';

import './PageShell.scss';

interface PageShellProps {
  title?: ReactNode;
  headerActions?: ReactNode;
  children: ReactNode;
  isLoading?: boolean;
  infoVideos?: InfoVideosConfig;
}

const PageShell = ({ title, headerActions, children, infoVideos }: PageShellProps) => {
  const { user } = useAuth();
  const userRole = user?.role;

  const resolvedVideos = infoVideos
    ? ((userRole ? infoVideos.byRole?.[userRole] : undefined) ?? infoVideos.videos ?? [])
    : [];
  const showInfoButton = resolvedVideos.length > 0;

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
          <div className="page-title-group">
            {title && <h1 className="page-title">{title}</h1>}
            {showInfoButton && (
              <InfoButton config={infoVideos!} videos={resolvedVideos} />
            )}
          </div>
          {headerActions && <div className="page-actions">{headerActions}</div>}
        </div>
      )}
      {children}
    </motion.main>
  );
};

export default PageShell;
