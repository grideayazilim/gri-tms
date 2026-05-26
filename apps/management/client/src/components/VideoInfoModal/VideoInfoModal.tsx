/* ==========================================
   VideoInfoModal — Bilgi Videosu Modal Sistemi
   ========================================== */
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiInfo, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

import './VideoInfoModal.scss';

// ─── Tipler ───────────────────────────────────────────────────────────────────

export interface VideoItem {
  src: string;
  title?: string;
}

export interface InfoVideosConfig {
  modalTitle?: string;
  videos?: VideoItem[];
  byRole?: Partial<Record<'ADMIN' | 'RESPONSIBLE', VideoItem[]>>;
}

// ─── VideoInfoModal Bileşeni ──────────────────────────────────────────────────

interface VideoInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: InfoVideosConfig;
  videos: VideoItem[];
}
function VideoInfoModal({ isOpen, onClose, config, videos }: VideoInfoModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Modal açıldığında indeksi sıfırla
  useEffect(() => {
    if (isOpen) setCurrentIndex(0);
  }, [isOpen]);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleEscKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener('keydown', handleEscKey);
    return () => window.removeEventListener('keydown', handleEscKey);
  }, [isOpen, handleEscKey]);

  if (!isOpen) return null;

  const title = config.modalTitle ?? 'Nasıl Kullanılır?';
  const currentVideo = videos[currentIndex]!;
  const isSingle = videos.length === 1;

  return (
    <AnimatePresence>
      <motion.div
        className="video-info-overlay"
        onClick={handleOverlayClick}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div
          className="video-info-container"
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Başlık */}
          <div className="video-info-header">
            <h3 className="modal-title">{title}</h3>
            <button className="modal-close" onClick={onClose} aria-label="Kapat">✕</button>
          </div>

          {/* Video */}
          <div className="video-info-video">
            <AnimatePresence mode="wait">
              <motion.video
                key={currentVideo.src}
                src={currentVideo.src}
                autoPlay
                muted
                loop
                preload="auto"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
              />
            </AnimatePresence>
          </div>

          {/* Navigasyon */}
          <div className="video-info-nav">
            <button
              className="btn btn--secondary btn--sm"
              onClick={() => setCurrentIndex((i) => i - 1)}
              disabled={isSingle || currentIndex === 0}
            >
              <FiChevronLeft /> Geri
            </button>
            <span className="video-info-nav__counter">
              {currentIndex + 1} / {videos.length}
            </span>
            <button
              className="btn btn--secondary btn--sm"
              onClick={() => setCurrentIndex((i) => i + 1)}
              disabled={isSingle || currentIndex === videos.length - 1}
            >
              İleri <FiChevronRight />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── InfoButton Bileşeni ──────────────────────────────────────────────────────

interface InfoButtonProps {
  config: InfoVideosConfig;
  videos: VideoItem[];
}

export function InfoButton({ config, videos }: InfoButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showPulse, setShowPulse] = useState(false);

  useEffect(() => {
    // 2.7 saniye sonra bilgilendirme halkasını tetikle
    const timer = setTimeout(() => {
      setShowPulse(true);
    }, 2700);

    return () => clearTimeout(timer);
  }, []);

  const handleOpen = () => {
    setIsOpen(true);
    setShowPulse(false); // Modal açıldığında halkayı kaldır
  };

  return (
    <>
      <button
        className={`info-trigger-btn ${showPulse ? 'info-trigger-btn--pulse' : ''}`}
        onClick={handleOpen}
        aria-label="Bilgi videosu"
      >
        <FiInfo />
        {showPulse && <span className="info-btn-pulse-ring" />}
      </button>
      <VideoInfoModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        config={config}
        videos={videos}
      />
    </>
  );
}

export default VideoInfoModal;
