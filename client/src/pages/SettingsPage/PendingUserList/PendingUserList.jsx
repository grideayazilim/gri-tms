/* ========================================================================
   PENDING USER LIST (ONAY BEKLEYEN KULLANICILAR LİSTESİ)
   Yeni kayıt olan ve henüz admin onayı almamış kullanıcıları listeler.
   ======================================================================== */
import { FiCheck, FiX } from 'react-icons/fi';
import { USER_ROLE } from '@timesheet/shared';
import './PendingUserList.scss';


const PendingUserList = ({ pendingUsers, onApprove, onReject }) => {
  return (
    <div className="pending-requests-list">
      <h3 className="pending-requests-list__title">
        Onay Bekleyen Kullanıcılar ({pendingUsers.length})
      </h3>
      
      {pendingUsers.length > 0 ? (
        pendingUsers.map(user => (
          <div key={user.id} className="pending-user-card">
             <div className="pending-user-card__info">
               <div className="pending-user-card__name">{user.username}</div>
                <div className="pending-user-card__details">
                  {/* Kullanıcının rolüne göre bağlı olduğu Yerleşke/Birim bilgisini gösterir */}
                  {user.role === USER_ROLE.ADMIN
                   ? 'Yönetici'
                   : user.role === USER_ROLE.RESPONSIBLE
                     ? `Birim Sorumlusu${user.unit?.location?.name ? ` — ${user.unit.location.name}` : ''}${user.unit?.name ? ` / ${user.unit.name}` : ''}`
                     : user.role ?? ''}
               </div>
             </div>
             <div className="pending-user-card__actions">
                <button 
                  className="btn btn--sm" 
                  onClick={() => onApprove(user.id)} 
                  title="Onayla"
                >
                   <FiCheck /> Onayla
                </button>
                <button 
                  className="btn btn--sm btn--danger" 
                  onClick={() => onReject(user.id)} 
                  title="Reddet"
                >
                   <FiX /> Reddet
                </button>
             </div>
          </div>
        ))
      ) : (
        <div className="pending-empty-state">
           Onay bekleyen kullanıcı bulunmuyor.
        </div>
      )}
    </div>
  );
};

export default PendingUserList;
