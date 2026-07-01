const LOCAL_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:4000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3002',
  'http://127.0.0.1:4000',
  'http://127.0.0.1:5173'
];

const splitEnvList = (value) => String(value || '')
  .split(/[\s,]+/)
  .map((item) => item.trim())
  .filter(Boolean);

export const normalizeOrigin = (value) => {
  if (!value) return '';
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}`;
  } catch {
    return '';
  }
};

const normalizeHostname = (value) => {
  const raw = String(value || '').split(',')[0].trim();
  if (!raw) return '';

  try {
    return new URL(raw.includes('://') ? raw : `http://${raw}`).hostname.toLowerCase();
  } catch {
    return raw.replace(/:\d+$/, '').replace(/^\[|\]$/g, '').toLowerCase();
  }
};

const isLocalOrigin = (origin) => {
  try {
    const { hostname } = new URL(origin);
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  } catch {
    return false;
  }
};

const requestHostnames = (req = {}) => [
  req.headers?.['x-forwarded-host'],
  req.headers?.['x-original-host'],
  req.headers?.host
].flatMap(splitEnvList).map(normalizeHostname).filter(Boolean);

const isSameRequestHostname = (origin, req) => {
  try {
    const originHostname = new URL(origin).hostname.toLowerCase();
    return requestHostnames(req).includes(originHostname);
  } catch {
    return false;
  }
};

const envAllowsAllCors = (env) => (
  env.CORS_ALLOW_ALL === 'true' ||
  env.CORS_ORIGIN === '*' ||
  splitEnvList(env.CORS_ORIGIN).includes('*') ||
  splitEnvList(env.CORS_ORIGINS).includes('*')
);

const configuredOrigins = (env) => new Set([
  ...LOCAL_ORIGINS,
  ...splitEnvList(env.FRONTEND_ORIGIN),
  ...splitEnvList(env.CORS_ORIGIN),
  ...splitEnvList(env.CORS_ORIGINS),
  ...splitEnvList(env.APP_URL),
  ...splitEnvList(env.PUBLIC_APP_URL),
  ...splitEnvList(env.API_BASE_URL)
].map(normalizeOrigin).filter(Boolean));

export const isCorsOriginAllowed = (origin, req = {}, env = process.env) => {
  if (!origin) return true;
  if (origin === 'null') return env.CORS_ALLOW_NULL_ORIGIN === 'true';
  if (envAllowsAllCors(env)) return true;

  const normalized = normalizeOrigin(origin);
  if (!normalized) return false;

  return configuredOrigins(env).has(normalized) ||
    isLocalOrigin(normalized) ||
    isSameRequestHostname(normalized, req);
};

export const createCorsOptionsDelegate = (env = process.env) => (req, callback) => {
  const origin = req.headers?.origin;
  callback(null, {
    origin: isCorsOriginAllowed(origin, req, env),
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Automation-Token', 'X-Tiwlo-Pay-Key', 'X-Tiwlo-Pay-Secret', 'Idempotency-Key', 'Apollo-Require-Preflight', 'X-Requested-With'],
    maxAge: 86400
  });
};
