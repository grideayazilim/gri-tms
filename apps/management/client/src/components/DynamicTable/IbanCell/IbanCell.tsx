/* ========================================================================
   IBAN CELL
   IBAN numarasını maskeleyerek gösterir, kopyalama butonu sunar.
   ======================================================================== */
import { useState } from 'react';

import { FiCopy } from 'react-icons/fi';

import './IbanCell.scss';

interface IbanCellProps {
  iban: string;
}

interface TooltipState {
  show: boolean;
  text: string;
  x: number;
  y: number;
  closing: boolean;
}

const IbanCell = ({ iban }: IbanCellProps) => {
  const [tooltipState, setTooltipState] = useState<TooltipState>({ show: false, text: iban, x: 0, y: 0, closing: false });

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipState({ show: true, text: iban, x: rect.left + rect.width / 2, y: rect.top, closing: false });
  };

  const handleMouseLeave = () => {
    setTooltipState(prev => ({ ...prev, closing: true }));
    setTimeout(() => setTooltipState(prev => ({ ...prev, show: false, closing: false })), 150);
  };

  const handleCopy = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    void navigator.clipboard.writeText(iban);
    setTooltipState(prev => ({ ...prev, text: 'Kopyalandı!' }));
    setTimeout(() => {
      setTooltipState(prev => ({ ...prev, text: iban }));
    }, 2000);
  };

  return (
    <div className="iban-cell">
      <span>{iban.slice(0, 14)}...</span>
      <button
        type="button"
        className="iban-cell__copy-btn"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleCopy}
      >
        <FiCopy size={13} />
      </button>

      {tooltipState.show && (
        <div
          className={`date-tooltip ${tooltipState.closing ? 'date-tooltip--closing' : ''}`}
          style={{ top: tooltipState.y, left: tooltipState.x }}
        >
          <span className="date-tooltip__arrow" />
          <div className="date-tooltip__text">{tooltipState.text}</div>
        </div>
      )}
    </div>
  );
};

export default IbanCell;
