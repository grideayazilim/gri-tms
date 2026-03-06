/**
 * DynamicTable Bileşeni
 * 
 * Verileri sayfalama (pagination) destekli tablolarda listelemek için kullanılan
 * genel amaçlı (generic) ve tekrar kullanılabilir (reusable) bir React bileşenidir.
 * 
 * @param {Array} columns - Tablonun sütun yapılandırmasını belirten dizi.
 *        Her bir obje şu özelliklere sahip olabilir:
 *        - header: {string|ReactNode} Sütun başlığı
 *        - accessor?: {string} Veri nesnesindeki karşılık gelen anahtar (Örn: 'name'). Sadece 'render' yoksa kullanılır.
 *        - render?: {function} Özel hücre içeriği için (Örn: `(row) => <ComponentX />`). Varsa `accessor` yerine geçer.
 *        - width?: {string} Sütun genişliği (Örn: '120px', '20%'). Verilmezse sütunlar auto width
 * @param {Array} data - Tabloda gösterilecek ham veri dizisi.
 * @param {boolean} loading - Verilerin yüklenme durumu (true ise yükleniyor metni gösterir).
 * @param {number} pageSize - (Varsayılan: 10) Her sayfada gösterilecek maksimun satır sayısı.
 * 
 * ==========================================
 * ÖRNEK KULLANIM:
 * ==========================================
 * 
 * 1. Sayfanın klasöründe column yapılandırması için klasör oluşturun oluşturun:
 * ------------------------------------------
 * const userColumns = [
 *   { header: 'Kullanıcı Adı', accessor: 'username' },
 *   { header: 'Rol', accessor: 'role' },
 *   { header: 'Durum', render: (row) => <span className={`status ${row.status}`}>{row.status}</span> },
 *   { header: 'İşlemler', render: (row) => <ComponentX />, width: '150px' }
 * ];
 * 
 * 2. Bileşeni sayfanızda çağırın ve verileri gönderin:
 * ------------------------------------------
 * import DynamicTable from '../../components/DynamicTable/DynamicTable';
 * 
 * const UsersPage = () => {
 *   const { users, isLoading } = useGetUsers();
 * 
 *   return (
 *     <div className="page-container">
 *       <h2>Kullanıcılar Listesi</h2>
 *       <DynamicTable 
 *         columns={userColumns} 
 *         data={users} 
 *         loading={isLoading} 
 *         pageSize={15} 
 *       />
 *     </div>
 *   );
 * };
 */

import { useState } from 'react';
import './DynamicTable.scss';

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