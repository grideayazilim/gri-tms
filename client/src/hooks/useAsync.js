import { useState, useCallback } from 'react';

export function useAsync() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = useCallback(async (asyncFn, { onError } = {}) => {
    setIsLoading(true);
    setError(null);
    try {
      return await asyncFn();
    } catch (err) {
      setError(err.message || 'Bir hata oluştu');
      onError?.(err);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isLoading, error, run };
}
