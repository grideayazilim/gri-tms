import { useState } from 'react';
import { FiUser, FiUsers } from 'react-icons/fi';
import type { EmployeeListItem, EmployeeType, Result } from '@timesheet/shared';
import SingleEmployeeForm from './SingleEmployeeForm';
import BulkImportView from './BulkImportView';
import './EmployeeModal.scss';

interface EmployeeModalProps {
  employee?: EmployeeListItem;
  onClose: () => void;
  onImportSuccess?: () => void;
  onSave: (data: EmployeeType) => Promise<Result<unknown>>;
}

const EmployeeModal = ({ employee, onClose, onImportSuccess, onSave }: EmployeeModalProps) => {
  const [currentMode, setCurrentMode] = useState<'SINGLE' | 'BULK'>('SINGLE');
  const [isBulkBusy, setIsBulkBusy] = useState(false);

  const showTabs = !employee && !isBulkBusy;

  return (
    <div className="employee-modal">
      {showTabs && (
        <div className="employee-modal__tabs">
          <button
            type="button"
            className={`btn tab-btn ${currentMode === 'SINGLE' ? 'active' : 'btn--secondary'}`}
            onClick={() => setCurrentMode('SINGLE')}
          >
            <FiUser />
            Tekli Giriş
          </button>
          <button
            type="button"
            className={`btn tab-btn ${currentMode === 'BULK' ? 'active' : 'btn--secondary'}`}
            onClick={() => setCurrentMode('BULK')}
          >
            <FiUsers />
            Toplu Giriş
          </button>
        </div>
      )}

      {currentMode === 'SINGLE' ? (
        <SingleEmployeeForm employee={employee} onClose={onClose} onSave={onSave} />
      ) : (
        <BulkImportView onClose={onClose} onBusyChange={setIsBulkBusy} onImportSuccess={onImportSuccess} />
      )}
    </div>
  );
};

export default EmployeeModal;
