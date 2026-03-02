import React from 'react';
import { useModal } from '../../../components/Modal';
import './PopUpColumn.scss';

const PopUpColumn = ({ trigger = "Görüntüle", children }) => {
    const { showModal } = useModal();

    const handleClick = () => {
        showModal({
            title: 'Detaylar',
            size: 'medium',
            content: (onClose) => (
                <div className="log-details-modal">
                    {children}
                    <div style={{ marginTop: '20px', textAlign: 'right' }}>
                        <button className="btn btn--outline" onClick={onClose}>Kapat</button>
                    </div>
                </div>
            )
        });
    };

    return (
        <span className="data-popup-trigger" onClick={handleClick}>
            {trigger}
        </span>
    );
};

export default PopUpColumn;
