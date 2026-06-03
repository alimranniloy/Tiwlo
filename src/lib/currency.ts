export type CurrencyDefinition = {
  code: string;
  name: string;
  symbol: string;
};

export type CurrencySelectionHistoryItem = {
  currency: string;
  changedAt: string;
  scope?: string;
  scopeId?: string;
  actorId?: string;
  source?: 'manual' | 'auto' | 'system';
  detectedCountry?: string | null;
};

export type CurrencyPolicy = {
  baseCurrency: string;
  defaultCurrency: string;
  enabledCurrencies: string[];
  allowedCurrencies: string[];
  rates: Record<string, number>;
  autoSwitch: boolean;
  rateApiEnabled: boolean;
  rateApiUrl: string;
  rateCacheMinutes: number;
  lastUpdatedAt?: string;
  lastSource?: string;
};

export const CURRENCY_POLICY_KEY = 'currencyPolicy';
export const DEFAULT_RATE_API_URL = 'https://api.frankfurter.dev/v2/rates';

const priorityCurrencies: CurrencyDefinition[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: '$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: '$' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: '$' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿' },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨' },
  { code: 'NPR', name: 'Nepalese Rupee', symbol: '₨' },
  { code: 'LKR', name: 'Sri Lankan Rupee', symbol: 'Rs' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱' },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr' },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'E£' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' },
  { code: 'QAR', name: 'Qatari Riyal', symbol: '﷼' },
  { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'د.ك' },
  { code: 'BHD', name: 'Bahraini Dinar', symbol: 'BD' },
  { code: 'OMR', name: 'Omani Rial', symbol: '﷼' }
];

const defaultRates: Record<string, number> = {
  USD: 1,
  BDT: 122.75
};

export const DEFAULT_CURRENCY_POLICY: CurrencyPolicy = {
  baseCurrency: 'USD',
  defaultCurrency: 'USD',
  enabledCurrencies: ['USD', 'BDT'],
  allowedCurrencies: ['USD', 'BDT'],
  rates: defaultRates,
  autoSwitch: true,
  rateApiEnabled: false,
  rateApiUrl: DEFAULT_RATE_API_URL,
  rateCacheMinutes: 1440
};

export const COUNTRY_CURRENCY_MAP: Record<string, string> = {
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

function uniqueCodes(codes: unknown[], fallback: string[] = ['USD']) {
  const next = codes
    .map((code) => normalizeCurrencyCode(code, ''))
    .filter(Boolean);
  const unique = Array.from(new Set(next));
  return unique.length ? unique : fallback;
}

function displayNameForCurrency(code: string) {
  try {
    const names = new (Intl as any).DisplayNames(['en'], { type: 'currency' });
    return names.of(code) || code;
  } catch {
    return code;
  }
}

function symbolForCurrency(code: string) {
  try {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
      maximumFractionDigits: 0
    }).format(0);
    return formatted.replace(/[0-9.,\s]/g, '') || code;
  } catch {
    return code;
  }
}

export function getCurrencyCatalog() {
  const runtimeCodes = (() => {
    try {
      const supportedValuesOf = (Intl as any).supportedValuesOf;
      return typeof supportedValuesOf === 'function' ? supportedValuesOf('currency') as string[] : [];
    } catch {
      return [];
    }
  })();

  const byCode = new Map<string, CurrencyDefinition>();
  priorityCurrencies.forEach((currency) => byCode.set(currency.code, currency));
  runtimeCodes.forEach((code) => {
    const normalized = normalizeCurrencyCode(code, '');
    if (!normalized || byCode.has(normalized)) return;
    byCode.set(normalized, {
      code: normalized,
      name: displayNameForCurrency(normalized),
      symbol: symbolForCurrency(normalized)
    });
  });

  const priority = priorityCurrencies.map((currency) => currency.code);
  return Array.from(byCode.values()).sort((a, b) => {
    const ai = priority.indexOf(a.code);
    const bi = priority.indexOf(b.code);
    if (ai >= 0 || bi >= 0) return (ai >= 0 ? ai : 999) - (bi >= 0 ? bi : 999);
    return a.code.localeCompare(b.code);
  });
}

export function getCurrencyInfo(code: string) {
  const normalized = normalizeCurrencyCode(code);
  return getCurrencyCatalog().find((currency) => currency.code === normalized) || {
    code: normalized,
    name: displayNameForCurrency(normalized),
    symbol: symbolForCurrency(normalized)
  };
}

export function normalizeCurrencyCode(value: unknown, fallback = 'USD') {
  const code = String(value || '').trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : fallback;
}

export function normalizeCurrencyPolicy(value?: unknown, baseFallback = 'USD'): CurrencyPolicy {
  const source = (value && typeof value === 'object' ? value : {}) as Partial<CurrencyPolicy>;
  const baseCurrency = normalizeCurrencyCode(source.baseCurrency, normalizeCurrencyCode(baseFallback));
  const sourceEnabled = Array.isArray(source.enabledCurrencies) ? source.enabledCurrencies : DEFAULT_CURRENCY_POLICY.enabledCurrencies;
  const sourceAllowed = Array.isArray(source.allowedCurrencies) ? source.allowedCurrencies : [];
  const enabledCurrencies = uniqueCodes([baseCurrency, ...sourceEnabled]);
  const allowedCurrencies = uniqueCodes(
    sourceAllowed.length ? sourceAllowed : enabledCurrencies,
    enabledCurrencies
  ).filter((code) => enabledCurrencies.includes(code));
  const rates = {
    ...defaultRates,
    ...(source.rates || {}),
    [baseCurrency]: 1
  };
  enabledCurrencies.forEach((code) => {
    const rate = Number(rates[code]);
    rates[code] = Number.isFinite(rate) && rate > 0 ? rate : 1;
  });
  const defaultCurrency = allowedCurrencies.includes(normalizeCurrencyCode(source.defaultCurrency, ''))
    ? normalizeCurrencyCode(source.defaultCurrency)
    : allowedCurrencies[0] || baseCurrency;

  return {
    baseCurrency,
    defaultCurrency,
    enabledCurrencies,
    allowedCurrencies: allowedCurrencies.length ? allowedCurrencies : [baseCurrency],
    rates,
    autoSwitch: source.autoSwitch === undefined ? DEFAULT_CURRENCY_POLICY.autoSwitch : Boolean(source.autoSwitch),
    rateApiEnabled: Boolean(source.rateApiEnabled),
    rateApiUrl: String(source.rateApiUrl || DEFAULT_RATE_API_URL),
    rateCacheMinutes: Math.max(15, Number(source.rateCacheMinutes || DEFAULT_CURRENCY_POLICY.rateCacheMinutes)),
    lastUpdatedAt: source.lastUpdatedAt,
    lastSource: source.lastSource
  };
}

export function selectableCurrencyCodes(policy: CurrencyPolicy) {
  const normalized = normalizeCurrencyPolicy(policy);
  return normalized.allowedCurrencies.filter((code) => normalized.enabledCurrencies.includes(code));
}

export function isCurrencySelectable(policy: CurrencyPolicy, code: string) {
  return selectableCurrencyCodes(policy).includes(normalizeCurrencyCode(code, ''));
}

export function currencyForCountry(countryCode?: string | null) {
  const code = String(countryCode || '').trim().toUpperCase();
  return COUNTRY_CURRENCY_MAP[code] || null;
}

export function convertCurrencyAmount(amount: number, policy: CurrencyPolicy, targetCurrency: string, sourceCurrency?: string) {
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
}

export function formatCurrencyAmount(amount: number, currency = 'USD') {
  const code = normalizeCurrencyCode(currency);
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code
    }).format(Number(amount || 0));
  } catch {
    return `${code} ${Number(amount || 0).toFixed(2)}`;
  }
}

export function currencySelectionStorageKey(scope: string, scopeId?: string, actorId?: string) {
  return ['tiwlo', 'currency-selection', scope, scopeId || 'global', actorId || 'guest'].join(':');
}

export function currencyHistoryStorageKey(storageKey: string) {
  return `${storageKey}:history`;
}

export function currencySelectionMetaKey(storageKey: string) {
  return `${storageKey}:meta`;
}

export function readStoredCurrencySelection(
  storageKey: string,
  policy: CurrencyPolicy,
  options: { detectedCountry?: string | null; manualOnly?: boolean } = {}
) {
  try {
    const saved = normalizeCurrencyCode(localStorage.getItem(storageKey), '');
    if (!saved || !isCurrencySelectable(policy, saved)) return null;
    const meta = JSON.parse(localStorage.getItem(currencySelectionMetaKey(storageKey)) || 'null');
    const source = String(meta?.source || '').toLowerCase();
    if (options.manualOnly && source !== 'manual') return null;
    const normalized = normalizeCurrencyPolicy(policy);
    const detected = normalized.autoSwitch && options.detectedCountry
      ? currencyForCountry(options.detectedCountry)
      : null;
    if (detected && detected !== saved && isCurrencySelectable(normalized, detected) && source !== 'manual') {
      return null;
    }
    return saved;
  } catch {
    return null;
  }
}

function detectCurrencyFromLocale(policy: CurrencyPolicy) {
  const locale = typeof navigator !== 'undefined' ? navigator.language || '' : '';
  const country = locale.split('-')[1]?.toUpperCase();
  const detected = currencyForCountry(country);
  return detected && isCurrencySelectable(policy, detected) ? detected : null;
}

export function chooseCurrencyForStorage(policy: CurrencyPolicy, storageKey: string, detectedCountry?: string | null) {
  const normalized = normalizeCurrencyPolicy(policy);
  const saved = readStoredCurrencySelection(storageKey, normalized, { detectedCountry });
  if (saved) return saved;
  if (normalized.autoSwitch) {
    const detected = currencyForCountry(detectedCountry) || detectCurrencyFromLocale(normalized);
    if (detected && isCurrencySelectable(normalized, detected)) return detected;
    if (isCurrencySelectable(normalized, 'USD')) return 'USD';
  }
  return normalized.defaultCurrency;
}

export function persistCurrencySelection(
  storageKey: string,
  currency: string,
  context: Omit<CurrencySelectionHistoryItem, 'currency' | 'changedAt'> = {}
) {
  const code = normalizeCurrencyCode(currency);
  try {
    const previous = localStorage.getItem(storageKey);
    localStorage.setItem(storageKey, code);
    localStorage.setItem(currencySelectionMetaKey(storageKey), JSON.stringify({
      ...context,
      source: context.source || 'manual',
      currency: code,
      updatedAt: new Date().toISOString()
    }));
    if (previous === code) return;
    const historyKey = currencyHistoryStorageKey(storageKey);
    const parsed = JSON.parse(localStorage.getItem(historyKey) || '[]');
    const history = Array.isArray(parsed) ? parsed : [];
    const item: CurrencySelectionHistoryItem = {
      ...context,
      currency: code,
      changedAt: new Date().toISOString()
    };
    localStorage.setItem(historyKey, JSON.stringify([item, ...history].slice(0, 25)));
  } catch {
    // Local storage can be unavailable in private or embedded contexts.
  }
}

export async function fetchLiveCurrencyRates(policy: CurrencyPolicy) {
  const normalized = normalizeCurrencyPolicy(policy);
  const quotes = normalized.enabledCurrencies.filter((code) => code !== normalized.baseCurrency);
  const rates: Record<string, number> = { [normalized.baseCurrency]: 1 };

  if (quotes.length) {
    const url = new URL(normalized.rateApiUrl || DEFAULT_RATE_API_URL);
    url.searchParams.set('base', normalized.baseCurrency);
    url.searchParams.set('quotes', quotes.join(','));
    const response = await fetch(url.toString());
    if (!response.ok) throw new Error(`Currency API failed with ${response.status}`);
    const data = await response.json();
    const apiRates = Array.isArray(data)
      ? data.reduce<Record<string, number>>((acc, item) => {
        const quote = normalizeCurrencyCode(item?.quote, '');
        const rate = Number(item?.rate);
        if (quote && Number.isFinite(rate) && rate > 0) acc[quote] = rate;
        return acc;
      }, {})
      : (data?.rates || {});
    quotes.forEach((code) => {
      const rate = Number(apiRates[code]);
      rates[code] = Number.isFinite(rate) && rate > 0 ? rate : Number(normalized.rates[code] || 1);
    });
  }

  return normalizeCurrencyPolicy({
    ...normalized,
    rates: {
      ...normalized.rates,
      ...rates
    },
    lastUpdatedAt: new Date().toISOString(),
    lastSource: normalized.rateApiUrl || DEFAULT_RATE_API_URL
  });
}
