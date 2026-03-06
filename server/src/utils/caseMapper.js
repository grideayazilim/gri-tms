// Tek bir string'i snake_case'den camelCase'e çevir
function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

// Obje/Array key'lerini snake_case'den camelCase'e çevir
export function toCamelCase(data) {
  if (data === null || data === undefined) {
    return data;
  }

  if (data instanceof Date) {
    return data.toISOString(); // Or simply return data
  }

  // Array ise her elemanı çevir
  if (Array.isArray(data)) {
    return data.map(toCamelCase);
  }

  if (typeof data !== 'object') {
    return data;
  }

  // Object ise key'leri çevir
  const result = {};
  for (const key in data) {
    if (data.hasOwnProperty(key)) {
      const camelKey = snakeToCamel(key);
      result[camelKey] = toCamelCase(data[key]);
    }
  }
  return result;
}
