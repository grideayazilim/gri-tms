// Service'ten gelen veriyi çek, state'e aktar, işlem yap. Buradaki state'ler component'larda kullanılacak.
// İlgili işe göre bu dosyaların içeriği değişebilir

import { useState, useEffect } from 'react';
// import { someService } from '../api';

/*
export const useSomething = (initialParams = {}) => {
  // State'ler
  const [data, setData] = useState([]);
  ...

  // Parametre girişi olmadan işlem
  const doSomething = async (customParams = {}) => {
    ...
    setIsLoading(true);
    setError(null);

    try {
      const response = await someService.getSomething(...);

      setData(response.data);
      return { success: true, data: response.data };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };


  // Parametre girişi ile işlem
  const doSomethingWithParameter = async (id, isActive) => {
    ...
  };

  return {
    announcements,
    doSomething,
    doSomethingWithParameter,
  };
};
*/