import './FilterBar.scss';

/**
 * @param {Array} config - Array of filter configurations. 
 *        Example: { key: 'search', label: 'Ara', type: 'text', placeholder: ' ' }
 *              or { key: 'role', label: 'Rol', type: 'select', options: [{value: 'ADMIN', label: 'Admin'}], defaultOption: 'Tüm Roller' }
 * @param {Object} filters - Current filter values object
 * @param {Function} onFilterChange - Function to handle filter changes (key, value)
 */
const FilterBar = ({ config, filters, onFilterChange }) => {
  return (
    <div className="filter-bar">
      {config.map((field) => (
        <div key={field.key} className="floating-group floating-group--on-background">
          {field.type === 'select' ? (
            <select
              className="input"
              value={filters[field.key] || ''}
              onChange={(e) => onFilterChange(field.key, e.target.value)}
            >
              {field.defaultOption && (
                <option value="">{field.defaultOption}</option>
              )}
              {field.options.map((opt, idx) => {
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
            <input
              type={field.type || 'text'}
              className="input"
              placeholder={field.placeholder || " "}
              value={filters[field.key] || ''}
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
