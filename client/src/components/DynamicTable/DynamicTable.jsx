import React, { useState } from 'react';
import './DynamicTable.scss';

/**
 * Genel amaçlı tablo bileşeni.
 *
 * columns: Array<{
 *   header: string | ReactNode,
 *   accessor?: string,          // opsiyonel — sadece render yoksa kullanılır
 *   render?: (row) => ReactNode, // varsa accessor yerine geçer
 *   width?: string,              // opsiyonel, örn. '120px'
 * }>
 *
 * data:     Array<object>
 * loading:  boolean
 * pageSize: number  (default 10)
 */
const DynamicTable = ({ columns, data, loading, pageSize = 10 }) => {
    const [currentPage, setCurrentPage] = useState(1);

    const totalPages = Math.ceil(data.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const currentData = data.slice(startIndex, startIndex + pageSize);

    const handlePageChange = (page) => {
        if (page >= 1 && page <= totalPages) setCurrentPage(page);
    };

    if (loading) return <div className="dynamic-table-loading">Yükleniyor...</div>;

    return (
        <div className="dynamic-table-container">
            <div className="table-wrapper">
                <table className="dynamic-table">
                    <thead>
                        <tr>
                            {columns.map((col, i) => (
                                <th
                                    key={i}
                                    style={col.width ? { width: col.width, minWidth: col.width } : undefined}
                                >
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {currentData.length > 0 ? (
                            currentData.map((row, rowIndex) => (
                                <tr key={row.id ?? rowIndex}>
                                    {columns.map((col, colIndex) => (
                                        <td key={colIndex}>
                                            {col.render
                                                ? col.render(row)
                                                : col.accessor
                                                    ? row[col.accessor]
                                                    : null}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={columns.length} className="no-data">
                                    Veri bulunamadı.
                                </td>
                            </tr>
                        )}
                        {currentData.length < pageSize &&
                            Array.from({ length: pageSize - currentData.length }).map((_, idx) => (
                                <tr key={`empty-${idx}`} className="empty-row">
                                    <td colSpan={columns.length}>&nbsp;</td>
                                </tr>
                            ))
                        }
                    </tbody>
                </table>
            </div>

            <div className="pagination-container">
                <span className="showing-text">
                    {data.length === 0
                        ? 'Kayıt yok'
                        : `${startIndex + 1}–${Math.min(startIndex + pageSize, data.length)} / ${data.length}`}
                </span>
                <div className="pagination-controls">
                    <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="pagination-btn"
                    >
                        &lt;
                    </button>
                    <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages || totalPages === 0}
                        className="pagination-btn"
                    >
                        &gt;
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DynamicTable;