import geoip from 'geoip-lite';

export const CURRENCY_POLICY_KEY = 'currencyPolicy';

export const DEFAULT_CURRENCY_POLICY = {
  baseCurrency: 'USD',
  defaultCurrency: 'USD',
  enabledCurrencies: ['USD', 'BDT'],
  allowedCurrencies: ['USD', 'BDT'],
  rates: { USD: 1, BDT: 122.75 },
  autoSwitch: true,
  rateApiEnabled: false,
  rateApiUrl: 'https://api.frankfurter.dev/v2/rates',
  rateCacheMinutes: 1440
};

const COUNTRY_CURRENCY_MAP = {
  BD: 'BDT',
  US: 'USD',
  GB: 'GBP',
  EU: 'EUR',
  CA: 'CAD',
  AU: 'AUD',
  IN: 'INR',
  SG: 'SGD',
  MY: 'MYR',
  AE: 'AED',
  SA: 'SAR',
  JP: 'JPY',
  CN: 'CNY',
  TH: 'THB',
  PK: 'PKR',
  NP: 'NPR',
  LK: 'LKR',
  ID: 'IDR',
  PH: 'PHP',
  VN: 'VND',
  KR: 'KRW',
  TR: 'TRY',
  CH: 'CHF',
  ZA: 'ZAR',
  EG: 'EGP',
  NG: 'NGN',
  KE: 'KES',
  QA: 'QAR',
  KW: 'KWD',
  BH: 'BHD',
  OM: 'OMR',
  BR: 'BRL',
  MX: 'MXN'
};

export const normalizeCurrencyCode = (value, fallback = 'USD') => {
  const code = String(value || '').trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : fallback;
};

const uniqueCodes = (codes, fallback = ['USD']) => {
  const next = (Array.isArray(codes) ? codes : [])
    .map((code) => normalizeCurrencyCode(code, ''))
    .filter(Boolean);
  const unique = [...new Set(next)];
  return unique.length ? unique : fallback;
};

export const normalizeCurrencyPolicy = (value = {}, baseFallback = 'USD') => {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const baseCurrency = normalizeCurrencyCode(source.baseCurrency, normalizeCurrencyCode(baseFallback));
  const sourceEnabled = Array.isArray(source.enabledCurrencies) ? source.enabledCurrencies : DEFAULT_CURRENCY_POLICY.enabledCurrencies;
  const sourceAllowed = Array.isArray(source.allowedCurrencies) ? source.allowedCurrencies : [];
  const enabledCurrencies = uniqueCodes([baseCurrency, ...sourceEnabled]);
  const allowedCurrencies = uniqueCodes(sourceAllowed.length ? sourceAllowed : enabledCurrencies, enabledCurrencies)
    .filter((code) => enabledCurrencies.includes(code));
  const rates = {
    ...DEFAULT_CURRENCY_POLICY.rates,
    ...(source.rates || {}),
    [baseCurrency]: 1
  };
  enabledCurrencies.forEach((code) => {
    const rate = Number(rates[code]);
    rates[code] = Number.isFinite(rate) && rate > 0 ? rate : 1;
  });
  const requestedDefault = normalizeCurrencyCode(source.defaultCurrency, '');
  const defaultCurrency = allowedCurrencies.includes(requestedDefault)
    ? requestedDefault
    : allowedCurrencies[0] || baseCurrency;

  return {
    baseCurrency,
    defaultCurrency,
    enabledCurrencies,
    allowedCurrencies: allowedCurrencies.length ? allowedCurrencies : [baseCurrency],
    rates,
    autoSwitch: source.autoSwitch === undefined ? DEFAULT_CURRENCY_POLICY.autoSwitch : Boolean(source.autoSwitch),
    rateApiEnabled: Boolean(source.rateApiEnabled),
    rateApiUrl: String(source.rateApiUrl || DEFAULT_CURRENCY_POLICY.rateApiUrl),
    rateCacheMinutes: Math.max(15, Number(source.rateCacheMinutes || DEFAULT_CURRENCY_POLICY.rateCacheMinutes)),
    lastUpdatedAt: source.lastUpdatedAt,
    lastSource: source.lastSource
  };
};

export const currencyForCountry = (countryCode) => COUNTRY_CURRENCY_MAP[String(countryCode || '').trim().toUpperCase()] || null;

export const isCurrencySelectable = (policy, code) => {
  const normalized = normalizeCurrencyPolicy(policy);
  const currency = normalizeCurrencyCode(code, '');
  return Boolean(currency && normalized.enabledCurrencies.includes(currency) && normalized.allowedCurrencies.includes(currency));
};

export const chooseCurrencyForCountry = (policy, countryCode) => {
  const normalized = normalizeCurrencyPolicy(policy);
  const detected = currencyForCountry(countryCode);
  if (normalized.autoSwitch && detected && isCurrencySelectable(normalized, detected)) return detected;
  if (normalized.autoSwitch && isCurrencySelectable(normalized, 'USD')) return 'USD';
  return normalized.defaultCurrency;
};

export const convertCurrencyAmount = (amount, policy, targetCurrency = 'USD', sourceCurrency) => {
  const normalized = normalizeCurrencyPolicy(policy);
  const source = normalizeCurrencyCode(sourceCurrency || normalized.baseCurrency, normalized.baseCurrency);
  const target = normalizeCurrencyCode(targetCurrency, normalized.defaultCurrency);
  if (source === target) return Number(amount || 0);
  const sourceRate = Number(normalized.rates[source] || (source === normalized.baseCurrency ? 1 : 0));
  const targetRate = Number(normalized.rates[target] || (target === normalized.baseCurrency ? 1 : 0));
  if (!Number.isFinite(sourceRate) || sourceRate <= 0 || !Number.isFinite(targetRate) || targetRate <= 0) {
    return Number(amount || 0);
  }
  return (Number(amount || 0) / sourceRate) * targetRate;
};

export const exchangeRatesForPolicy = (policy) => {
  const normalized = normalizeCurrencyPolicy(policy);
  const pairs = {};
  normalized.enabledCurrencies.forEach((from) => {
    normalized.enabledCurrencies.forEach((to) => {
      if (from === to) return;
      const rate = convertCurrencyAmount(1, normalized, to, from);
      if (Number.isFinite(rate) && rate > 0) pairs[`${from}_${to}`] = rate;
    });
  });
  pairs.USD_BDT = Number(pairs.USD_BDT || normalized.rates.BDT || 122.75);
  pairs.BDT_USD = Number(pairs.BDT_USD || (1 / pairs.USD_BDT));
  return pairs;
};

export const readPlatformCurrencyPolicy = async (prisma) => {
  const setting = await prisma.systemSetting.findUnique({
    where: { scope_scopeId_key: { scope: 'platform', scopeId: '', key: CURRENCY_POLICY_KEY } }
  }).catch(() => null);
  return normalizeCurrencyPolicy(setting?.value || DEFAULT_CURRENCY_POLICY);
};

export const publicCurrencyContext = async (prisma, ipAddress) => {
  const policy = await readPlatformCurrencyPolicy(prisma);
  const cleanIp = String(ipAddress || '').replace(/^::ffff:/, '');
  const geo = cleanIp ? geoip.lookup(cleanIp) : null;
  const detectedCountry = String(geo?.country || '').toUpperCase() || null;
  const detectedCurrency = chooseCurrencyForCountry(policy, detectedCountry);
  return {
    policy,
    detectedCountry,
    detectedCurrency,
    fallbackCurrency: isCurrencySelectable(policy, 'USD') ? 'USD' : policy.defaultCurrency
  };
};
