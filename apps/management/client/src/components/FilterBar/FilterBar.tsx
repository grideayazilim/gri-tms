import type { FilterField } from '../../hooks/data/useFilter';

import './FilterBar.scss';

// ─── Tipler ───────────────────────────────────────────────────────────────────

interface FilterBarProps {
  config: readonly FilterField[];
  filters: Partial<Record<string, string>>;
  onFilterChange: (key: string, value: string) => void;
}

// ─── Bileşen ──────────────────────────────────────────────────────────────────

const FilterBar = ({ config, filters, onFilterChange }: FilterBarProps) => {
  return (
    <div className="filter-bar">
      {/* Config içindeki her alanı döngü ile tek tek arayüze bas */}
      {config.map((field) => (
        <div key={field.key} className="floating-group floating-group--on-background">
          {/* Select inputu render et */}
          {field.type === 'select' ? (
            <select
              className="input"
              value={filters[field.key] ?? ''}
              onChange={(e) => onFilterChange(field.key, e.target.value)}
            >
              {field.defaultOption && (
                <option value="">{field.defaultOption}</option>
              )}
              {/* Select'in option'larını yazdır */}
              {field.options.map((opt, idx) => {
                // Seçenek basit bir string (örn: 'ADMIN') veya obje {value: 'ADMIN', label: 'Admin User'} olabilir.
                const isObj = typeof opt === 'object';
                const value = isObj ? opt.value : opt;
                const label = isObj ? opt.label : opt;
                return (
                  <option key={idx} value={value}>
                    {label}
                  </option>
                );
              })}
              </select>
          ) : (
            // Select değilse standart 'input' (text, date vs.) olarak çizer.
            <input
              type={field.type ?? 'text'}
              className="input"
              placeholder=" "
              value={filters[field.key] ?? ''}
              onChange={(e) => onFilterChange(field.key, e.target.value)}
            />
          )}
          <label className="floating-group__label">{field.label}</label>
        </div>
      ))}
    </div>
  );
};

export default FilterBar;
