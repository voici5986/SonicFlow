const normalizeBaseUrl = (value) => {
  if (!value || typeof value !== 'string') {
    return '/api';
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed === '/') {
    return '/api';
  }

  return trimmed.replace(/\/+$/, '');
};

const API_BASE = normalizeBaseUrl(
  process.env.REACT_APP_MUSIC_API ??
  process.env.REACT_APP_API_BASE ??
  '/api'
);

export const isAbsoluteApiBase = /^https?:\/\//i.test(API_BASE);

export { API_BASE };
export default API_BASE;
