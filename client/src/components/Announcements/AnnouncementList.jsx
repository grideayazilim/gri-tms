import { useState } from 'react';
import { RiAddLine } from 'react-icons/ri';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../Modal';
import { useToast } from '../ToastBar/ToastContext';
import AnnouncementCard from './AnnouncementCard';
import AnnouncementForm from './AnnouncementForm';
import './Announcements.scss';

// Mock data
const MOCK_ANNOUNCEMENTS = [
  {
    id: '1',
    title: 'Sistem Bakımı',
    content: 'Yarın saat 22:00-23:00 arası sistem bakıma alınacaktır. Bu süre zarfında sisteme erişim sağlanamayacaktır.',
    createdAt: '2026-02-20T10:00:00Z',
    createdBy: 'admin_user'
  },
  {
    id: '2',
    title: 'Puantaj Onay Süresi',
    content: 'Lütfen aylık puantajlarınızı her ayın son iş gününe kadar onaylayınız.',
    createdAt: '2026-02-18T14:30:00Z',
    createdBy: 'admin_user'
  },
  {
    id: '3',
    title: 'Yeni Özellik',
    content: 'Artık puantaj kayıtlarınızı PDF olarak indirebilirsiniz.',
    createdAt: '2026-02-15T09:00:00Z',
    createdBy: 'admin_user'
  },
];

function AnnouncementList({ onClose }) {
  const [announcements, setAnnouncements] = useState(MOCK_ANNOUNCEMENTS);
  const { isAdmin } = useAuth();
  const { showModal, showConfirm } = useModal();
  const toast = useToast();

  const handleAddAnnouncement = async () => {
    const result = await showModal({
      title: 'Yeni Duyuru Ekle',
      size: 'medium',
      content: (closeModal) => (
        <AnnouncementForm
          onSubmit={(newAnnouncement) => {
            setAnnouncements(prev => [newAnnouncement, ...prev]);
            toast({ 
              type: 'success', 
              message: 'Duyuru başarıyla oluşturuldu' 
            });
            closeModal(true);
          }}
          onCancel={() => closeModal(false)}
        />
      ),
    });
  };

  const handleDeleteAnnouncement = async (id) => {
    const confirmed = await showConfirm({
      title: 'Duyuruyu Sil',
      message: 'Bu duyuruyu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.',
      type: 'danger',
      confirmText: 'Sil',
      cancelText: 'Vazgeç',
    });

    if (confirmed) {
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      toast({ 
        type: 'success', 
        message: 'Duyuru silindi' 
      });
    }
  };

  return (
    <div className="announcement-list">
      {isAdmin() && (
        <button
          className="btn btn--primary announcement-list__add-btn"
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
              {isAdmin() ? 'Yeni bir duyuru ekleyerek başlayın.' : 'Şu anda görüntülenecek duyuru bulunmuyor.'}
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
              isAdmin={isAdmin()}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default AnnouncementList;

