import { useState, useMemo, useCallback } from 'react';

/**
 * Sayfalardaki filtre durumunu (state) yerel olarak tutar ve backend'e yollanacak 
 * apiParams (sorgu parametrelerini) üretir. Bu hook'dan dönen `filters` ve `handleFilterChange` 
 * direkt olarak `<FilterBar />` bileşenine proplanır.
 * 
 * @param {Array} filterConfig - Filtreleri ve API parametrelerini tanımlayan özellikler dizisi.
 *   - `key` (string): State içinde ve FilterBar'da (input name) ayrıştırıcı anahtar kelime. (Zorunlu)
 *   - `apiParam` (string): Eğer backend'e gönderilecekse, URL'deki parametrenin adı (Örn: searchQuery).
 *   - `apiFormat` (function): (Opsiyonel) Eğer input'tan gelen değeri backend'e göndermeden önce 
 *      formatlamak isterseniz kullanılır. Örn: (val) => val.toUpperCase()
 * @param {Object} initialFilters - Sayfa açıldığında başlangıç olarak set edilecek filtreler objesi. 
 * 
 * @example
 * // ==========================================
 * // HİKAYE: Logs Sayfasında Nasıl Kullanıldı?
 * // ==========================================
 * //
 * // 1. Adım: Filtreleri Tanımla (örn: auditLogFilters.jsx)
 * // export const auditLogFilterConfig = [
 * //   { key: 'action', apiParam: 'eventType', label: 'İşlem Tipi', type: 'select', options: ['LOGIN', 'LOGOUT'] },
 * //   { key: 'searchActor', apiParam: 'username', label: 'İşlem Yapan Ara', type: 'text' }
 * // ];
 * // 
 * // 2. Adım: Hook'u Sayfaya Bağla (örn: AuditLogsPage.jsx)
 * // Tanımladığımız filtreyi ve sayfa açılışındaki varsayılan değerleri useFilter'a veriyoruz.
 * // const { filters, apiParams, handleFilterChange } = useFilter(auditLogFilterConfig, { action: '', searchActor: '' });
 * // 
 * // 3. Adım: API'yi Tetikle ve Arayüzü Çiz
 * // apiParams objesi, her filtre değişiminde formatlanmış olarak otomatik baştan üretilir.
 * // useEffect(() => {
 * //   fetchAuditLogs(apiParams);
 * // }, [fetchAuditLogs, apiParams]);
 * // 
 * // return (
 * //   <FilterBar config={auditLogFilterConfig} filters={filters} onFilterChange={handleFilterChange} />
 * // )
 */
export const useFilter = (filterConfig, initialFilters = {}) => {
  const [filters, setFilters] = useState(initialFilters);

  // Input değiştikçe filter state'ini o key'e göre günceller.
  const handleFilterChange = useCallback((key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  // Filtreler veya config değiştikçe backend'in anlayacağı API objesini dinamik üretir.
  const apiParams = useMemo(() => {
    const params = {};
    filterConfig.forEach((config) => {
      const filterValue = filters[config.key];
      
      // Sadece apiParam atanmış ve içi dolu olan değerleri işlemeye alır.
      if (config.apiParam && filterValue !== undefined && filterValue !== null && filterValue !== '') {
        // Eğer formatlama kuralı varsa veriyi formatla (örn: tarihi parçala), yoksa direkt yolla.
        if (config.apiFormat && typeof config.apiFormat === 'function') {
          params[config.apiParam] = config.apiFormat(filterValue);
        } else {
          params[config.apiParam] = filterValue;
        }
      }
    });
    return params;
  }, [filters, filterConfig]);

  return {
    filters,
    apiParams,
    handleFilterChange,
    setFilters,
  };
};

