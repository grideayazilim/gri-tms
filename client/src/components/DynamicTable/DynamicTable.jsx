import './DynamicTable.scss';

/**
 * @param {Array}    columns
 * @param {Array}    data              - Sunucudan gelen mevcut sayfa verisi
 * @param {boolean}  loading
 * @param {{ currentPage: number, totalPages: number, totalRecords: number }} [pagination]
 * @param {(page: number) => void} [onPageChange]
 */
const DynamicTable = ({ columns, data, loading, pagination, onPageChange }) => {
  if (loading) return <div className="dynamic-table-loading">Yükleniyor...</div>;

  const hasPagination = pagination && onPageChange;
  const { currentPage = 1, totalPages = 1, totalRecords = data.length, limit = data.length } = pagination ?? {};

  const startRecord = totalRecords === 0 ? 0 : (currentPage - 1) * limit + 1;
  const endRecord = Math.min(currentPage * limit, totalRecords);

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
            {data.length > 0 ? (
              data.map((row, rowIndex) => (
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
          </tbody>
        </table>
      </div>

      {hasPagination && (
        <div className="pagination-container">
          <span className="showing-text">
            {totalRecords === 0
              ? 'Kayıt yok'
              : `${startRecord}–${endRecord} / ${totalRecords}`}
          </span>
          <div className="pagination-controls">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="pagination-btn"
            >
              &lt;
            </button>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="pagination-btn"
            >
              &gt;
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DynamicTable;
