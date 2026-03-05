import { useState, useMemo, useCallback } from 'react';

/**
 * useFilter Hook'u
 * 
 * Sayfalardaki filtreleme mantığını ve filtre durumunu (state) merkezi bir şekilde yönetmek için kullanılır.
 * 
 * @param {Array} data - Filtrelenecek olan ham veri dizisi (Örn: kullanıcılar, çalışanlar, loglar)
 * @param {Array} filterConfig - Filtre tanımlarını içeren konfigürasyon dizisi.
 * @param {Object} initialFilters - Başlangıç filtre değerleri (Örn: { role: 'ADMIN', search: '' })
 * 
 * @returns {Object} - { filteredData, filters, handleFilterChange, setFilters }
 * 
 * ==========================================
 * ÖRNEK KULLANIM:
 * ==========================================
 * 
 * 1. Sayfanız için bir konfigürasyon dosyası (örn: userFilters.jsx) oluşturun:
 * ------------------------------------------
 * export const userFilterConfig = [
 *   { 
 *     key: 'search', 
 *     label: 'Arama', 
 *     type: 'text', 
 *     apply: (item, value) => item.name.toLowerCase().includes(value.toLowerCase()) 
 *   }
 * ];
 * 
 * 2. Sayfanızda hook'u çağırın ve FilterBar'a bağlayın:
 * ------------------------------------------
 * import { useFilter } from '../../hooks/useFilter';
 * import { userFilterConfig } from './userFilters';
 * import FilterBar from '../../components/FilterBar/FilterBar';
 * 
 * const UsersPage = () => {
 *   const users = [...]; // Verileriniz
 * 
 *   // Hook'tan dönen değerleri alın
 *   const { filteredData, filters, handleFilterChange } = useFilter(users, userFilterConfig, {
 *     search: '' // Başlangıç state değerleri
 *   });
 * 
 *   return (
 *     <div>
 *       <FilterBar 
 *         config={userFilterConfig} 
 *         filters={filters} 
 *         onFilterChange={handleFilterChange} 
 *       />
 *       
 *       <Table data={filteredData} />
 *     </div>
 *   );
 * };
 * 
 * ==========================================
 * Geleceğe Yönelik (Query Params):
 * Not: İlerleyen süreçte filtreleri url query string'den okumak istersen (`?search=ali&role=ADMIN`),
 * sadece bu hook'un içindeki `useState` kullanımını `useSearchParams` (react-router-dom) ile
 * değiştirmen yeterli olacaktır. Componentler tarafında hiçbir kodu değiştirmene gerek kalmayacak.
 */
export const useFilter = (data, filterConfig, initialFilters = {}) => {
  const [filters, setFilters] = useState(initialFilters);

  const handleFilterChange = useCallback((key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const filteredData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];

    return data.filter((item) => {
      // Her bir konfigürasyon kuralı (filter definition) için kontrol et
      return filterConfig.every((config) => {
        const filterValue = filters[config.key];
        
        // Eğer bu filtre için state'de bir değer seçilmediyse/boşsa, bu filtreyi atla (true dön)
        if (filterValue === undefined || filterValue === null || filterValue === '') {
          return true;
        }

        // Eğer config'te özel bir apply metodu tanımlanmışsa onu kullan
        if (config.apply && typeof config.apply === 'function') {
          return config.apply(item, filterValue);
        }

        // Apply metodu tanımlanmamışsa varsayılan davranış olarak eşitlik kontrolü yap (opsiyonel)
        return item[config.key] === filterValue;
      });
    });
  }, [data, filters, filterConfig]);

  return {
    filteredData,
    filters,
    handleFilterChange,
    setFilters,
  };
};

