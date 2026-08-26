const normalizeEnvValue = (value) => {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized && normalized !== 'undefined' ? normalized : undefined;
};

export const resolveEnvValue = (viteValue, legacyValue) =>
  normalizeEnvValue(viteValue) ?? normalizeEnvValue(legacyValue);

const viteEnv = import.meta.env || {};
const legacyEnv = {
  API_BASE: typeof process !== 'undefined' ? process.env.REACT_APP_API_BASE : undefined,
  FIREBASE_API_KEY:
    typeof process !== 'undefined' ? process.env.REACT_APP_FIREBASE_API_KEY : undefined,
  FIREBASE_AUTH_DOMAIN:
    typeof process !== 'undefined' ? process.env.REACT_APP_FIREBASE_AUTH_DOMAIN : undefined,
  FIREBASE_PROJECT_ID:
    typeof process !== 'undefined' ? process.env.REACT_APP_FIREBASE_PROJECT_ID : undefined,
  FIREBASE_STORAGE_BUCKET:
    typeof process !== 'undefined' ? process.env.REACT_APP_FIREBASE_STORAGE_BUCKET : undefined,
  FIREBASE_MESSAGING_SENDER_ID:
    typeof process !== 'undefined' ? process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID : undefined,
  FIREBASE_APP_ID:
    typeof process !== 'undefined' ? process.env.REACT_APP_FIREBASE_APP_ID : undefined,
  FIREBASE_MEASUREMENT_ID:
    typeof process !== 'undefined' ? process.env.REACT_APP_FIREBASE_MEASUREMENT_ID : undefined,
  APP_VERSION: typeof process !== 'undefined' ? process.env.VITE_APP_VERSION : undefined,
};

const envPairs = {
  API_BASE: ['VITE_API_BASE', 'REACT_APP_API_BASE'],
  FIREBASE_API_KEY: ['VITE_FIREBASE_API_KEY', 'REACT_APP_FIREBASE_API_KEY'],
  FIREBASE_AUTH_DOMAIN: ['VITE_FIREBASE_AUTH_DOMAIN', 'REACT_APP_FIREBASE_AUTH_DOMAIN'],
  FIREBASE_PROJECT_ID: ['VITE_FIREBASE_PROJECT_ID', 'REACT_APP_FIREBASE_PROJECT_ID'],
  FIREBASE_STORAGE_BUCKET: ['VITE_FIREBASE_STORAGE_BUCKET', 'REACT_APP_FIREBASE_STORAGE_BUCKET'],
  FIREBASE_MESSAGING_SENDER_ID: [
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'REACT_APP_FIREBASE_MESSAGING_SENDER_ID',
  ],
  FIREBASE_APP_ID: ['VITE_FIREBASE_APP_ID', 'REACT_APP_FIREBASE_APP_ID'],
  FIREBASE_MEASUREMENT_ID: ['VITE_FIREBASE_MEASUREMENT_ID', 'REACT_APP_FIREBASE_MEASUREMENT_ID'],
  APP_VERSION: ['VITE_APP_VERSION', 'VITE_APP_VERSION'],
};

const resolvePair = (name) => {
  const [viteName] = envPairs[name];
  const legacyValue = legacyEnv[name];
  return resolveEnvValue(viteEnv[viteName], legacyValue);
};

export const env = Object.freeze({
  apiBase: resolvePair('API_BASE') || '/api-v1/api.php',
  appVersion: resolvePair('APP_VERSION') || 'dev',
  firebase: Object.freeze({
    apiKey: resolvePair('FIREBASE_API_KEY'),
    authDomain: resolvePair('FIREBASE_AUTH_DOMAIN'),
    projectId: resolvePair('FIREBASE_PROJECT_ID'),
    storageBucket: resolvePair('FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: resolvePair('FIREBASE_MESSAGING_SENDER_ID'),
    appId: resolvePair('FIREBASE_APP_ID'),
    measurementId: resolvePair('FIREBASE_MEASUREMENT_ID'),
  }),
});

export const envConflicts = Object.freeze(
  Object.entries(envPairs)
    .filter(([name, [viteName, legacyName]]) => {
      if (viteName === legacyName) return false;
      const viteValue = normalizeEnvValue(viteEnv[viteName]);
      const legacyValue = normalizeEnvValue(legacyEnv[name]);
      return viteValue !== undefined && legacyValue !== undefined && viteValue !== legacyValue;
    })
    .map(([name]) => name)
);

if (envConflicts.length > 0 && typeof console !== 'undefined') {
  console.warn(`[env] 新旧变量值冲突（已使用 VITE_*）：${envConflicts.join(', ')}`);
}
