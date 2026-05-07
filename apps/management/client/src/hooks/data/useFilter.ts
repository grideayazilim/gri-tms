/* ========================================================================
   USE FILTER
   Sayfalardaki filtre durumunu (state) yerel olarak tutar ve backend'e
   yollanacak apiParams'ı üretir. <FilterBar /> bileşeniyle birlikte çalışır.

   Text alanları için debounce uygulanır (400ms). Select ve date alanları
   anında apiParams'ı günceller.

   Kullanım örneği:
     const { filters, apiParams, handleFilterChange } = useFilter(
       auditLogFilterConfig,
       { action: '', searchActor: '' },
     );
   ======================================================================== */
import { useState, useMemo, useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from 'react';

function shallowEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((k) => a[k] === b[k]);
}

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

export interface UseFilterReturn<F extends ReadonlyArray<FilterField>> {
  filters: Partial<Record<F[number]['key'], string>>;
  apiParams: Record<string, unknown>;
  handleFilterChange: (key: F[number]['key'], value: string) => void;
  setFilters: Dispatch<SetStateAction<Partial<Record<F[number]['key'], string>>>>;
}

const TEXT_DEBOUNCE_MS = 400;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useFilter<F extends ReadonlyArray<FilterField>>(
  filterConfig: F,
  initialFilters: Partial<Record<F[number]['key'], string>> = {},
): UseFilterReturn<F> {
  type Filters = Partial<Record<F[number]['key'], string>>;

  const [filters, setFilters] = useState<Filters>(initialFilters);
  // Sadece text alanları için debounce'lı değerler tutulur.
  // Select/date alanlar zaten filters'tan anlık okunur.
  const [debouncedTextValues, setDebouncedTextValues] = useState<Record<string, string | undefined>>({});

  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latestFiltersRef = useRef<Filters>(initialFilters);
  // apiParams referans stabilitesi için: content aynıysa eski referansı koru
  const prevApiParamsRef = useRef<Record<string, unknown>>({});

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  const textFieldKeys = useMemo(
    () => new Set(filterConfig.filter((f) => f.type !== 'select' && f.type !== 'date').map((f) => f.key)),
    [filterConfig],
  );

  const handleFilterChange = useCallback(
    (key: F[number]['key'], value: string) => {
      setFilters((prev) => {
        const next = { ...prev, [key]: value };
        latestFiltersRef.current = next;
        return next;
      });

      if (textFieldKeys.has(key as string)) {
        // Text alanı: debounce — 400ms sonra debouncedTextValues güncellenir
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          setDebouncedTextValues((prev) => ({
            ...prev,
            [key as string]: latestFiltersRef.current[key],
          }));
        }, TEXT_DEBOUNCE_MS);
      }
      // Select/date için ek bir şey yapmıyoruz; apiParams zaten filters'tan okur
    },
    [textFieldKeys],
  );

  // Select ve date alanlar filters'tan anlık, text alanlar debouncedTextValues'dan okunur.
  // Bu sayede harici setFilters çağrıları (ör. dönem/lokasyon otomatik seçimi) da çalışır.
  // Ayrıca content aynıysa eski referans korunur → pages'deki useEffect gereksiz yere tetiklenmez.
  const apiParams = useMemo(() => {
    const params: Record<string, unknown> = {};
    for (const config of filterConfig) {
      const isText = textFieldKeys.has(config.key);
      const filterValue = isText
        ? debouncedTextValues[config.key]
        : filters[config.key as F[number]['key']];
      if (config.apiParam && filterValue !== undefined && filterValue !== null && filterValue !== '') {
        params[config.apiParam] = config.apiFormat ? config.apiFormat(filterValue) : filterValue;
      }
    }
    if (shallowEqual(params, prevApiParamsRef.current)) return prevApiParamsRef.current;
    prevApiParamsRef.current = params;
    return params;
  }, [filters, debouncedTextValues, textFieldKeys, filterConfig]);

  return { filters, apiParams, handleFilterChange, setFilters };
}
