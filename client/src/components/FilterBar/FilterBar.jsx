import './FilterBar.scss';

/**
 * `useFilter` hook'undan gelen konfigürasyona ve state'e göre arayüz çizen dinamik ortak bileşen.
 * 
 * @param {Array} config - `useFilter` ile aynı config dizisini bekler. Görsel özellikleri burada kullanılır.
 *   - `key`: Input'ları ayırmak için eşsiz kimlik (useFilter kısmında tanımlandı).
 *   - `label`: Ekranda input/select'in üstünde görünecek yazı.
 *   - `type`: 'text', 'select', 'date' vs. Hangi HTML input elementinin çizileceğini belirler.
 *   - `options`: SADECE `type: 'select'` ise kullanılır. {value, label} objelerinden oluşacak dropdown seçenekleri.
 *   - `defaultOption`: (Opsiyonel) SADECE `type: 'select'` ise, ilk sıradaki boş varsayılan seçeneğin metni.
 * 
 * @param {Object} filters - `useFilter`'dan dönen, inputların o anki dolu halini barındıran state objesi.
 * @param {Function} onFilterChange - Input değiştiğinde `(key, value)` göndererek `useFilter` içindeki state'i güncelleyen fonksiyon.
 * 
 * // Tam kullanım örneği için useFilter.jsx'e bak
 * // 
 */
const FilterBar = ({ config, filters, onFilterChange }) => {
  return (
    <div className="filter-bar">
      {/* Config içindeki her alanı döngü ile tek tek arayüze bas */}
      {config.map((field) => (
        <div key={field.key} className="floating-group floating-group--on-background">
          {/* Select inputu render et */}
          {field.type === 'select' ? (
            <select
              className="input"
              value={filters[field.key] || ''}
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
              type={field.type || 'text'}
              className="input"
              placeholder=" "
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
