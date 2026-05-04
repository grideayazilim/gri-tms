import { RiDeleteBinLine } from 'react-icons/ri';
import './Announcements.scss';
import { formatDate } from '../../utils/dateUtils';

interface AnnouncementData {
  id: string;
  title: string;
  content: string;
  createdAt?: string;
  created_at?: string;
  isRead?: boolean;
  is_read?: boolean;
}

interface AnnouncementCardProps {
  announcement: AnnouncementData;
  onDelete: (id: string) => void;
  onRead: (id: string) => void;
  isAdmin: boolean;
}

function AnnouncementCard({ announcement, onDelete, onRead, isAdmin }: AnnouncementCardProps) {
  const isUnread = announcement.isRead === false || announcement.is_read === false;

  const handleMouseEnter = () => {
    if (isUnread && onRead) {
      onRead(announcement.id);
    }
  };

  return (
    <div 
      className={`announcement-card ${isUnread ? 'announcement-card--unread' : ''}`}
      onMouseEnter={handleMouseEnter}
    >
      <div className="announcement-card__header">
        <h4 className="announcement-card__title">{announcement.title}</h4>
        {isAdmin && (
          <button
            className="announcement-card__delete"
            onClick={() => onDelete(announcement.id)}
            title="Sil"
          >
            <RiDeleteBinLine />
          </button>
        )}
      </div>
      
      <p className="announcement-card__content">{announcement.content}</p>
      
      <div className="announcement-card__footer">
        <span className="announcement-card__date">{formatDate(announcement.createdAt || announcement.created_at, 'dd MMMM yyyy HH:mm')}</span>
      </div>
    </div>
  );
}

export default AnnouncementCard;

