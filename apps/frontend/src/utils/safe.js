// Utility pro bezpečné array operace
export const safe = (value) => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object' && value.rows && Array.isArray(value.rows)) return value.rows;
  return [];
};
