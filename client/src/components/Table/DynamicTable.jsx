import React, { useState, useEffect } from 'react';
import DayCell from './DayCell';
import './DynamicTable.scss';

/**
 * columns içindeki isDaysColumn:true olan kolonu, currentMonthDays adet ayrı kolona genişletir.
 * Geri kalan kolonlar olduğu gibi kalır.
 * "Expanded" kolonlar: { __dayCol: true, day: N, accessor, onDayClick } formatında.
 */
const expandColumns = (columns) =>
    columns.flatMap(col => {
        if (!col.isDaysColumn) return [col];
        const n = col.currentMonthDays || 31;
        return Array.from({ length: n }, (_, i) => ({
            __dayCol: true,
            day: i + 1,
            accessor: col.accessor,   // 'timesheet_days'
            onDayClick: col.onDayClick, // (row, day, value) => void
        }));
    });

/** Toplam kolon sayısını hesaplar (expand edilmiş) */
const expandedLength = (columns) =>
    columns.reduce((acc, col) => acc + (col.isDaysColumn ? (col.currentMonthDays || 31) : 1), 0);

const DynamicTable = ({ columns, data, loading, pageSize = 10, onSave }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedLocation, setSelectedLocation] = useState('');
    const [selectedUnit, setSelectedUnit] = useState('');
    const [filteredData, setFilteredData] = useState(data);

    const locations = [...new Set(data.map(item => item.location))].filter(Boolean);
    const units = [...new Set(data.map(item => item.unit))].filter(Boolean);

    // Filtre uygulaması — data VEYA filtreler değişince güncellenir
    useEffect(() => {
        let result = data;
        if (selectedLocation) result = result.filter(item => item.location === selectedLocation);
        if (selectedUnit) result = result.filter(item => item.unit === selectedUnit);
        setFilteredData(result);
    }, [data, selectedLocation, selectedUnit]);

    // Sayfa sıfırlama — sadece FİLTRE değişince (data değişince değil)
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedLocation, selectedUnit]);

    const totalPages = Math.ceil(filteredData.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const currentData = filteredData.slice(startIndex, startIndex + pageSize);

    const handlePageChange = (page) => {
        if (page >= 1 && page <= totalPages) setCurrentPage(page);
    };

    // Genişletilmiş kolon listesi
    const expanded = expandColumns(columns);
    const totalCols = expandedLength(columns);

    if (loading) return <div className="dynamic-table-loading">Yükleniyor...</div>;

    return (
        <div className="dynamic-table-container">

            {/* Filter & Save Bar */}
            <div className="table-toolbar">
                <div className="toolbar-filters">
                    <div className="filter-group">
                        <label className="filter-label">Yerleşke</label>
                        <select className="filter-select" value={selectedLocation} onChange={e => setSelectedLocation(e.target.value)}>
                            <option value="">Tümü</option>
                            {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                        </select>
                    </div>
                    <div className="filter-group">
                        <label className="filter-label">Birim</label>
                        <select className="filter-select" value={selectedUnit} onChange={e => setSelectedUnit(e.target.value)}>
                            <option value="">Tümü</option>
                            {units.map(unit => <option key={unit} value={unit}>{unit}</option>)}
                        </select>
                    </div>
                </div>
                {onSave && (
                    <button className="save-btn" onClick={() => onSave(data)}>Kaydet</button>
                )}
            </div>

            <div className="table-wrapper">
                <table className="dynamic-table">
                    <thead>
                        <tr>
                            {expanded.map((col, i) =>
                                col.__dayCol ? (
                                    /* Her gün için tek <th> — gün numarası */
                                    <th key={`day-th-${col.day}`} className="th-day">
                                        {col.day}
                                    </th>
                                ) : (
                                    <th
                                        key={i}
                                        style={{ width: col.width }}
                                        className={col.isCountCol ? 'th-count' : undefined}
                                    >
                                        {col.header}
                                    </th>
                                )
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {currentData.length > 0 ? (
                            currentData.map((row, rowIndex) => (
                                <tr key={rowIndex}>
                                    {expanded.map((col, colIndex) =>
                                        col.__dayCol ? (
                                            /* Her gün için tek <td> — DayCell */
                                            <td key={`day-td-${col.day}`} className="td-day">
                                                <DayCell
                                                    days={row[col.accessor]}
                                                    day={col.day}
                                                    onDayClick={(day, value) =>
                                                        col.onDayClick && col.onDayClick(row, day, value)
                                                    }
                                                />
                                            </td>
                                        ) : (
                                            <td
                                                key={colIndex}
                                                className={col.isCountCol ? 'td-count' : undefined}
                                            >
                                                {col.render ? col.render(row) : row[col.accessor]}
                                            </td>
                                        )
                                    )}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={totalCols} className="no-data">Veri bulunamadı.</td>
                            </tr>
                        )}
                        {currentData.length < pageSize &&
                            Array.from({ length: pageSize - currentData.length }).map((_, idx) => (
                                <tr key={`empty-${idx}`} className="empty-row">
                                    <td colSpan={totalCols}>&nbsp;</td>
                                </tr>
                            ))
                        }
                    </tbody>
                </table>
            </div>

            <div className="pagination-container">
                <span className="showing-text">
                    Showing {filteredData.length === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + pageSize, filteredData.length)} of {filteredData.length}
                </span>
                <div className="pagination-controls">
                    <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="pagination-btn">&lt;</button>
                    <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages || totalPages === 0} className="pagination-btn">&gt;</button>
                </div>
            </div>

        </div>
    );
};

export default DynamicTable;