export const normalizeEmail = (email) => {
  const value = String(email || '').trim().toLowerCase();
  return value === 'admin' ? 'admin@tiwlo.app' : value;
};

export const toApi = (value) => {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(toApi);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, toApi(item)]));
  }
  return value;
};

export const removeUndefined = (input = {}) => (
  Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined))
);

export const randomIp = () => {
  const parts = [138, 197, Math.floor(Math.random() * 200) + 20, Math.floor(Math.random() * 200) + 20];
  return parts.join('.');
};

export const slugify = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');
