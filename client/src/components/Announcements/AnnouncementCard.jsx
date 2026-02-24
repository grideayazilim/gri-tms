import { RiDeleteBinLine } from 'react-icons/ri';
import './Announcements.scss';

function AnnouncementCard({ announcement, onDelete, isAdmin }) {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="announcement-card">
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
        <span className="announcement-card__author">{announcement.createdBy}</span>
        <span className="announcement-card__date">{formatDate(announcement.createdAt)}</span>
      </div>
    </div>
  );
}

export default AnnouncementCard;

