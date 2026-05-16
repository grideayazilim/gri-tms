/* ========================================================================
   USE ASYNC
   Async işlemleri için loading/error state yönetimi ve Result<R> sarmalayıcı.
   ======================================================================== */
import { useState, useCallback } from 'react';

import type { Result } from '@timesheet/shared';
import { getErrorMessage } from '../utils/getErrorMessage';

interface RunOptions {
  onError?: (e: unknown) => void;
}

export function useAsync(): {
  isLoading: boolean;
  error: string | null;
  run: <R>(fn: () => Promise<R>, opts?: RunOptions) => Promise<Result<R>>;
} {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async <R>(
    asyncFn: () => Promise<R>,
    { onError }: RunOptions = {},
  ): Promise<Result<R>> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await asyncFn();
      return { success: true, data };
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'Bir hata oluştu');
      setError(message);
      onError?.(err);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isLoading, error, run };
}
