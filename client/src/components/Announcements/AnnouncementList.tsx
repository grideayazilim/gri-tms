import { useEffect } from 'react';
import { RiAddLine, RiLoader4Line } from 'react-icons/ri';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../Modal';
import { useToast } from '../ToastBar/useToast';
import { useAnnouncements } from '../../hooks/data/useAnnouncements';
import AnnouncementCard from './AnnouncementCard';
import AnnouncementForm from './AnnouncementForm';
import './Announcements.scss';

interface AnnouncementListProps {
  onClose?: () => void;
}

function AnnouncementList({ onClose: _onClose }: AnnouncementListProps) {
  const { 
    announcements, 
    isLoading, 
    error, 
    fetchAnnouncements, 
    markAsRead,
    addAnnouncement, 
    removeAnnouncement 
  } = useAnnouncements();
  
  const { isAdmin } = useAuth();
  const { showModal, showConfirm } = useModal();
  const toast = useToast();

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleAddAnnouncement = async () => {
    await showModal({
      title: 'Yeni Duyuru Ekle',
      size: 'medium',
      content: (closeModal) => (
        <AnnouncementForm
          onSubmit={async (newAnnouncement) => {
            const res = await addAnnouncement(newAnnouncement.title, newAnnouncement.content);
            if (res.success) {
              toast({ 
                type: 'success', 
                message: 'Duyuru başarıyla oluşturuldu' 
              });
              closeModal(true);
            } else {
              toast({
                type: 'error',
                message: res.error || 'Duyuru oluşturulamadı'
              });
            }
          }}
          onCancel={() => closeModal(false)}
        />
      ),
    });
  };

  const handleDeleteAnnouncement = async (id: string) => {
    const confirmed = await showConfirm({
      title: 'Duyuruyu Sil',
      message: 'Bu duyuruyu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.',
      type: 'danger',
      confirmText: 'Sil',
      cancelText: 'Vazgeç',
    });

    if (confirmed) {
      const res = await removeAnnouncement(id);
      if (res.success) {
         toast({ 
           type: 'success', 
           message: 'Duyuru silindi' 
         });
      } else {
         toast({
           type: 'error',
           message: res.error || 'Duyuru silinemedi'
         });
      }
    }
  };

  if (isLoading && announcements.length === 0) {
    return (
      <div className="announcement-list__loading" style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
        <RiLoader4Line className="spin-animation" size={32} color="#007bff" />
      </div>
    );
  }

  if (error && announcements.length === 0) {
    return (
      <div className="announcement-list__error" style={{ color: 'red', textAlign: 'center', padding: '2rem' }}>
        İletişim Hatası: {error}
      </div>
    );
  }

  return (
    <div className="announcement-list">
      {isAdmin && (
        <button
          className="btn announcement-list__add-btn"
          onClick={handleAddAnnouncement}
        >
          <RiAddLine />
          Yeni Duyuru Ekle
        </button>
      )}

      {announcements.length === 0 ? (
        <div className="announcement-list__empty">
          <div className="empty-state">
            <div className="empty-state__icon">📢</div>
            <div className="empty-state__title">Henüz duyuru yok</div>
            <div className="empty-state__description">
              {isAdmin ? 'Yeni bir duyuru ekleyerek başlayın.' : 'Şu anda görüntülenecek duyuru bulunmuyor.'}
            </div>
          </div>
        </div>
      ) : (
        <div className="announcement-list__content">
          {announcements.map(announcement => (
            <AnnouncementCard
              key={announcement.id}
              announcement={announcement}
              onDelete={handleDeleteAnnouncement}
              onRead={markAsRead}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default AnnouncementList;

