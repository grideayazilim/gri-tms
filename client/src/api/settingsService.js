// Backend'e istek gönder ve Veri/response çek. Veriyi frontend'in kullanabileceği şekilde map et

import { api } from './httpClient';

// Parametresiz istek
/*
export const getSomething = async (params = {}) => {
  const response = await api.get('/route_path', { params });

  return someMapper(response);
};
*/

// Parametreli istek
/*
export const getSomething = async (param1, param2) => {
  const response = await api.get('/route_path', { param1, param2 });

  return someMapper(response);
};
*/