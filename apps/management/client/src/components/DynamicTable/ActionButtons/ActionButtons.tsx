/* ========================================================================
   ACTION BUTTONS
   Tablolardaki düzenle / sil buton çifti.
   ======================================================================== */
import { FiEdit2, FiTrash2 } from 'react-icons/fi';

import './ActionButtons.scss';

interface ActionButtonsProps {
  onEdit?: () => void;
  onDelete?: () => void;
}

const ActionButtons = ({ onEdit, onDelete }: ActionButtonsProps) => (
  <div className="action-buttons">
    {onEdit && (
      <button type="button" className="action-btn edit-btn" onClick={onEdit}>
        <FiEdit2 size={13} />
      </button>
    )}
    {onDelete && (
      <button type="button" className="action-btn delete-btn" onClick={onDelete}>
        <FiTrash2 size={13} />
      </button>
    )}
  </div>
);

export default ActionButtons;
