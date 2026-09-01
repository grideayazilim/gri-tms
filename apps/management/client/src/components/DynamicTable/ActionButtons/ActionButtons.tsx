/* ========================================================================
   ACTION BUTTONS
   Tablolardaki düzenle / sil buton çifti.
   ======================================================================== */
import { FiEdit2, FiTrash2 } from 'react-icons/fi';

import './ActionButtons.scss';

interface ActionButtonsProps {
  onEdit?: () => void;
  onDelete?: () => void;
  /* Silinemeyecek satırlarda düğme gizlenmez, devre dışı bırakılır ve
     sebebi title ile gösterilir — kullanıcı seçeneğin var olduğunu ama neden
     kullanılamadığını görsün. Asıl koruma sunucudadır. */
  deleteDisabled?: boolean;
  deleteTitle?: string;
}

const ActionButtons = ({ onEdit, onDelete, deleteDisabled = false, deleteTitle }: ActionButtonsProps) => (
  <div className="action-buttons">
    {onEdit && (
      <button type="button" className="action-btn edit-btn" onClick={onEdit}>
        <FiEdit2 size={13} />
      </button>
    )}
    {onDelete && (
      <button
        type="button"
        className="action-btn delete-btn"
        onClick={onDelete}
        disabled={deleteDisabled}
        {...(deleteTitle ? { title: deleteTitle } : {})}
      >
        <FiTrash2 size={13} />
      </button>
    )}
  </div>
);

export default ActionButtons;
