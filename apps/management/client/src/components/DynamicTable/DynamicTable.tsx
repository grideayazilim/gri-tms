import { memo, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

import type { PaginationMeta } from '@timesheet/shared';

import './DynamicTable.scss';

// ─── Tipler ───────────────────────────────────────────────────────────────────

export interface Column<T> {
  header: ReactNode;
  width?: string;
  accessor?: keyof T;
  render?: (row: T) => ReactNode;
}

interface DynamicTableProps<T extends { id: string | number }> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  pagination?: PaginationMeta;
  onPageChange?: (page: number) => void;
  renderDelayMs?: number;
}

// ─── Satır bileşeni (memoized) ────────────────────────────────────────────────
// row ve columns referansları değişmediği sürece yeniden render edilmez.
// setTimesheets'in .map() içinde değişmeyen satırlar aynı nesne referansını
// döndürdüğünden, sadece gerçekten değişen satır yeniden render edilir.

function TableRow<T extends { id: string | number }>({
  row,
  columns,
}: {
  row: T;
  columns: Column<T>[];
}) {
  return (
    <tr>
      {columns.map((col, colIndex) => (
        <td key={colIndex}>
          {col.render
            ? col.render(row)
            : col.accessor
              ? String(row[col.accessor] ?? '')
              : null}
        </td>
      ))}
    </tr>
  );
}

const MemoizedTableRow = memo(TableRow) as typeof TableRow;

// ─── Bileşen ──────────────────────────────────────────────────────────────────

function DynamicTable<T extends { id: string | number }>({
  columns,
  data,
  loading,
  pagination,
  onPageChange,
  renderDelayMs = 0,
}: DynamicTableProps<T>) {
  const [delayedData, setDelayedData] = useState<T[]>(() => {
    const isTest = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';
    const shouldDelay = !isTest && renderDelayMs > 0;
    return shouldDelay ? [] : (loading ? [] : data);
  });
  const [isDelayedLoading, setIsDelayedLoading] = useState(() => {
    const isTest = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';
    const shouldDelay = !isTest && renderDelayMs > 0;
    return shouldDelay ? true : !!loading;
  });

  useEffect(() => {
    const isTest = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';
    if (isTest || renderDelayMs <= 0) {
      setIsDelayedLoading(!!loading);
      setDelayedData(loading ? [] : data);
      return;
    }

    if (loading) {
      setIsDelayedLoading(true);
      setDelayedData([]);
    } else {
      const timer = setTimeout(() => {
        setDelayedData(data);
        setIsDelayedLoading(false);
      }, renderDelayMs);
      return () => clearTimeout(timer);
    }
  }, [loading, data, renderDelayMs]);

  const hasPagination = pagination && onPageChange;
  const { currentPage = 1, totalPages = 1, totalRecords = delayedData.length, limit = delayedData.length } = pagination ?? {};

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
            {isDelayedLoading ? (
              <tr>
                <td colSpan={columns.length} className="no-data no-data--loading">
                  Yükleniyor...
                </td>
              </tr>
            ) : delayedData.length > 0 ? (
              delayedData.map((row, rowIndex) => (
                <MemoizedTableRow key={row.id ?? rowIndex} row={row} columns={columns} />
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
}

export default DynamicTable;
