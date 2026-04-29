/* ========================================================================
   USE FILTER
   Sayfalardaki filtre durumunu (state) yerel olarak tutar ve backend'e
   yollanacak apiParams'ı üretir. <FilterBar /> bileşeniyle birlikte çalışır.

   Kullanım örneği:
     const { filters, apiParams, handleFilterChange } = useFilter(
       auditLogFilterConfig,
       { action: '', searchActor: '' },
     );
   ======================================================================== */
import { useState, useMemo, useCallback, type Dispatch, type SetStateAction } from 'react';

// ─── Tip tanımları ─────────────────────────────────────────────────────────────

type Option = { value: string; label: string };

export type SelectField = {
  key: string;
  apiParam?: string;
  label: string;
  type: 'select';
  options: ReadonlyArray<Option | string>;
  defaultOption?: string;
  apiFormat?: (v: string) => unknown;
};

export type TextField = {
  key: string;
  apiParam?: string;
  label: string;
  type?: 'text' | 'date';
  apiFormat?: (v: string) => unknown;
};

export type FilterField = SelectField | TextField;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useFilter<F extends ReadonlyArray<FilterField>>(
  filterConfig: F,
  initialFilters: Partial<Record<F[number]['key'], string>> = {},
): {
  filters: Partial<Record<F[number]['key'], string>>;
  apiParams: Record<string, unknown>;
  handleFilterChange: (key: F[number]['key'], value: string) => void;
  setFilters: Dispatch<SetStateAction<Partial<Record<F[number]['key'], string>>>>;
} {
  const [filters, setFilters] = useState<Partial<Record<F[number]['key'], string>>>(initialFilters);

  const handleFilterChange = useCallback((key: F[number]['key'], value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const apiParams = useMemo(() => {
    const params: Record<string, unknown> = {};
    for (const config of filterConfig) {
      const filterValue = filters[config.key as F[number]['key']];
      if (config.apiParam && filterValue !== undefined && filterValue !== null && filterValue !== '') {
        params[config.apiParam] = config.apiFormat ? config.apiFormat(filterValue) : filterValue;
      }
    }
    return params;
  }, [filters, filterConfig]);

  return { filters, apiParams, handleFilterChange, setFilters };
}
