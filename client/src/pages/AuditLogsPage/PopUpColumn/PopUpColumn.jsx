import React from 'react';
import { useModal } from '../../../components/Modal';
import './PopUpColumn.scss';

const PopUpColumn = ({ trigger = "Görüntüle", children, data }) => {
    const { showModal } = useModal();

    const handleClick = () => {
        showModal({
            title: 'Detaylar',
            size: 'medium',
            content: (onClose) => (
                <div className="log-details-modal">
                    {data ? (
                        Object.entries(data).map(([key, value]) => {
                            if (value == null) return null;
                            return (
                                <div className="data-popup__section" key={key}>
                                    <div className="data-popup__label">{key}</div>
                                    <pre className="data-popup__pre">{JSON.stringify(value, null, 2)}</pre>
                                </div>
                            );
                        })
                    ) : (
                        children
                    )}
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
