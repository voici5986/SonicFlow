export interface FirebaseConfig {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  measurementId?: string;
}

export interface EnvConfig {
  apiBase: string;
  appVersion: string;
  mode: string;
  isDevelopment: boolean;
  isProduction: boolean;
  firebase: FirebaseConfig;
}

type EnvironmentRecord = Record<string, string | undefined>;

declare const process: { env: EnvironmentRecord };

const normalizeEnvValue = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized && normalized !== 'undefined' ? normalized : undefined;
};

export const resolveEnvValue = (viteValue: unknown, legacyValue: unknown): string | undefined =>
  normalizeEnvValue(viteValue) ?? normalizeEnvValue(legacyValue);

const viteEnv = import.meta.env;

const legacyEnv: EnvironmentRecord = {
  // These direct references are intentionally kept for vite-plugin-env-compatible to replace.
  API_BASE: process.env.REACT_APP_API_BASE,
  FIREBASE_API_KEY: process.env.REACT_APP_FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID: process.env.REACT_APP_FIREBASE_APP_ID,
  FIREBASE_MEASUREMENT_ID: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
  APP_VERSION: process.env.VITE_APP_VERSION,
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
} as const;

type EnvName = keyof typeof envPairs;

const resolvePair = (name: EnvName): string | undefined => {
  const [viteName] = envPairs[name];
  return resolveEnvValue(viteEnv[viteName], legacyEnv[name]);
};

export const env: EnvConfig = Object.freeze({
  apiBase: resolvePair('API_BASE') || '/api-v1/api.php',
  appVersion: resolvePair('APP_VERSION') || 'dev',
  mode: viteEnv.MODE || 'development',
  isDevelopment: Boolean(viteEnv.DEV),
  isProduction: Boolean(viteEnv.PROD),
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
  (Object.entries(envPairs) as Array<[EnvName, readonly [string, string]]>)
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
