import React, { useState, useRef, useEffect } from 'react';
import './DayCell.scss';

const VALID_MARKERS = ['X', 'R', 'I', 'RT', 'DT'];

/**
 * Tek bir gün hücresi — kendi edit state'ini yönetir.
 * @param {object}   days        - row.timesheet_days objesi { "2026-02-01": "X", ... }
 * @param {number}   day         - 1..31
 * @param {function} onDayClick  - (day, newValue) => void
 */
const DayCell = ({ days, day, onDayClick }) => {
    const [editing, setEditing] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const inputRef = useRef(null);

    // Günün mevcut değerini days objesinden bul
    const getValue = () => {
        if (!days) return '';
        const dayStr = day.toString().padStart(2, '0');
        const key = Object.keys(days).find(k => k.endsWith(`-${dayStr}`));
        return key ? days[key] : '';
    };

    useEffect(() => {
        if (editing && inputRef.current) inputRef.current.focus();
    }, [editing]);

    const startEdit = (currentValue) => {
        setEditing(true);
        setInputValue(currentValue);
    };

    const commit = (currentValue) => {
        const upper = inputValue.trim().toUpperCase();
        if (upper === '' || VALID_MARKERS.includes(upper)) {
            onDayClick && onDayClick(day, upper);
        }
        // Geçersizse eski değer korunur, sadece edit modundan çık
        setEditing(false);
        setInputValue('');
    };

    const handleKeyDown = (e, currentValue) => {
        if (e.key === 'Enter') commit(currentValue);
        else if (e.key === 'Escape') { setEditing(false); setInputValue(''); }
    };

    const value = getValue();

    let cls = 'day-cell';
    if (value === 'X') cls += ' status-x';
    if (value === 'R') cls += ' status-r';
    if (value === 'I') cls += ' status-i';
    if (value === 'RT') cls += ' status-rt';
    if (value === 'DT') cls += ' status-dt';
    if (editing) cls += ' editing';

    return (
        <div
            className={cls}
            title={`Gün ${day}: ${value || 'Boş'}`}
            onClick={() => !editing && startEdit(value)}
        >
            {editing ? (
                <input
                    ref={inputRef}
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value.toUpperCase())}
                    onBlur={() => commit(value)}
                    onKeyDown={e => handleKeyDown(e, value)}
                    maxLength={2}
                    style={{
                        width: '100%', height: '100%',
                        border: 'none', background: 'transparent',
                        textAlign: 'center', fontSize: 'inherit',
                        fontWeight: 'bold', color: 'inherit',
                        outline: 'none', cursor: 'text', padding: 0,
                    }}
                    onClick={e => e.stopPropagation()}
                />
            ) : value}
        </div>
    );
};

export default DayCell;
