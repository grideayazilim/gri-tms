import { useState } from 'react';
import { FiCopy } from 'react-icons/fi';

const IbanCell = ({ iban }) => {
    const [tooltipState, setTooltipState] = useState({ show: false, text: iban, x: 0, y: 0, closing: false });

    const handleMouseEnter = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setTooltipState({ show: true, text: iban, x: rect.left + rect.width / 2, y: rect.top, closing: false });
    };

    const handleMouseLeave = () => {
        setTooltipState(prev => ({ ...prev, closing: true }));
        setTimeout(() => setTooltipState(prev => ({ ...prev, show: false, closing: false })), 150);
    };

    const handleCopy = (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(iban);
        setTooltipState(prev => ({ ...prev, text: 'Kopyalandı!' }));
        setTimeout(() => {
            setTooltipState(prev => ({ ...prev, text: iban }));
        }, 2000);
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{iban.slice(0, 6)}...</span>
            <button
                type="button"
                className="action-btn"
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
