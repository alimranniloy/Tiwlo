import crypto from 'node:crypto';
import { AppError } from '../../core/errors.js';

const REQUEST_TIMEOUT_MS = 30000;
const HOURS_PER_MONTH = 730;

const zeroDecimalCurrencies = new Set([
  'bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga',
  'pyg', 'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf'
]);

const bkashTokenCache = new Map();

export const PAYMENT_PROVIDERS = ['bkash', 'stripe', 'paypal'];

export const defaultGateways = [
  {
    key: 'bkash',
    name: 'bKash',
    provider: 'bkash',
    status: 'enabled',
    mode: 'live',
    settings: {
      currency: 'BDT',
      exchangeRates: { USD_BDT: 110 },
      supportsRedirectCheckout: true,
      callbackPath: '/payments/bkash/callback'
    }
  },
  {
    key: 'stripe',
    name: 'Stripe',
    provider: 'stripe',
    status: 'enabled',
    mode: 'live',
    settings: {
      currency: 'USD',
      supportsRedirectCheckout: true,
      webhookPath: '/webhooks/stripe'
    }
  },
  {
    key: 'paypal',
    name: 'PayPal',
    provider: 'paypal',
    status: 'enabled',
    mode: 'live',
    settings: {
      currency: 'USD',
      captureMode: 'automatic',
      supportsRedirectCheckout: true
    }
  }
];

export const roundMoney = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

export const hourlyRateFor = (monthlyCost) => roundMoney(Number(monthlyCost || 0) / HOURS_PER_MONTH);

const publicUrlFrom = (...values) => {
  const urls = values.map((value) => String(value || '').trim().replace(/\/+$/, '')).filter(Boolean);
  const publicUrl = urls.find((value) => {
    try {
      const { hostname } = new URL(value);
      return !['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]'].includes(hostname.toLowerCase());
    } catch {
      return false;
    }
  });
  return publicUrl || 'https://tiwlo.com';
};

export const apiBaseUrl = () => publicUrlFrom(
  process.env.API_BASE_URL,
  process.env.PUBLIC_API_URL,
  process.env.APP_URL,
  process.env.FRONTEND_ORIGIN
);

export const frontendBaseUrl = () => publicUrlFrom(
  process.env.PUBLIC_APP_URL,
  process.env.FRONTEND_ORIGIN,
  process.env.APP_URL
);

export const paymentResultUrl = (status, invoiceId, provider, message) => {
  const url = new URL('/invoices', frontendBaseUrl());
  url.searchParams.set('payment', status);
  if (invoiceId) url.searchParams.set('invoice', invoiceId);
  if (provider) url.searchParams.set('provider', provider);
  if (message) url.searchParams.set('message', message);
  return url.toString();
};

const withTimeout = async (url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json') ? await response.json() : await response.text();
    if (!response.ok) {
      const message = typeof payload === 'string'
        ? payload
        : payload?.message || payload?.error_description || payload?.error?.message || JSON.stringify(payload);
      throw new AppError(`${response.status} ${response.statusText}: ${message}`, 'PAYMENT_PROVIDER_ERROR');
    }
    return payload;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new AppError('Payment provider request timed out', 'PAYMENT_PROVIDER_TIMEOUT');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

const compact = (value = {}) => (
  Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== ''))
);

const readSecret = (...values) => {
  const value = values.find((item) => item !== undefined && item !== null && String(item).trim() !== '');
  return typeof value === 'string' ? value.trim() : value;
};

export const providerAmount = (invoice, gateway) => {
  const settings = gateway?.settings || {};
  const targetCurrency = String(settings.currency || invoice.currency || 'USD').toUpperCase();
  let amount = Number(invoice.amount || 0);

  if (targetCurrency !== String(invoice.currency || 'USD').toUpperCase()) {
    const directKey = `${String(invoice.currency || 'USD').toUpperCase()}_${targetCurrency}`;
    const envKey = `PAYMENT_RATE_${directKey}`;
    const defaultRate = directKey === 'USD_BDT' ? 110 : 0;
    const rate = Number(settings.exchangeRates?.[directKey] || process.env[envKey] || defaultRate);
    if (!rate) {
      throw new AppError(`Missing exchange rate for ${directKey}`, 'PAYMENT_CONFIGURATION_REQUIRED');
    }
    amount *= rate;
  }

  return {
    amount: roundMoney(amount),
    currency: targetCurrency
  };
};

const moneyValue = (amount) => roundMoney(amount).toFixed(2);

const stripeMinorAmount = (amount, currency) => {
  const lower = String(currency || 'USD').toLowerCase();
  return zeroDecimalCurrencies.has(lower) ? Math.round(Number(amount || 0)) : Math.round(Number(amount || 0) * 100);
};

export const gatewayConfig = (gateway) => {
  const credentials = gateway?.credentials || {};
  const settings = gateway?.settings || {};
  const mode = gateway?.mode || settings.mode || process.env.PAYMENT_MODE || 'test';
  const isLive = mode === 'live';

  if (gateway?.provider === 'stripe') {
    return {
      mode,
      secretKey: readSecret(credentials.secretKey, credentials.stripeSecretKey, process.env.STRIPE_SECRET_KEY),
      webhookSecret: readSecret(credentials.webhookSecret, process.env.STRIPE_WEBHOOK_SECRET),
      apiBase: 'https://api.stripe.com',
      settings
    };
  }

  if (gateway?.provider === 'paypal') {
    return {
      mode,
      clientId: readSecret(credentials.clientId, process.env.PAYPAL_CLIENT_ID),
      clientSecret: readSecret(credentials.clientSecret, process.env.PAYPAL_CLIENT_SECRET),
      apiBase: readSecret(settings.apiBase, isLive ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com'),
      brandName: readSecret(settings.brandName, 'Tiwlo'),
      settings
    };
  }

  if (gateway?.provider === 'bkash') {
    return {
      mode,
      appKey: readSecret(credentials.appKey, process.env.BKASH_APP_KEY),
      appSecret: readSecret(credentials.appSecret, process.env.BKASH_APP_SECRET),
      username: readSecret(credentials.username, process.env.BKASH_USERNAME),
      password: readSecret(credentials.password, process.env.BKASH_PASSWORD),
      baseUrl: readSecret(
        settings.baseUrl,
        process.env.BKASH_BASE_URL,
        isLive ? 'https://tokenized.pay.bka.sh/v1.2.0-beta/tokenized' : 'https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized'
      ).replace(/\/+$/, ''),
      settings
    };
  }

  return { mode, settings };
};

const requireConfig = (config, fields, provider) => {
  const missing = fields.filter((field) => !config[field]);
  if (missing.length) {
    throw new AppError(`${provider} is missing ${missing.join(', ')} credentials`, 'PAYMENT_CONFIGURATION_REQUIRED');
  }
};

const providerDescription = (invoice) => {
  const item = Array.isArray(invoice.items?.lineItems) ? invoice.items.lineItems[0] : null;
  return item?.label || `${invoice.scope || 'Tiwlo'} invoice ${invoice.number}`;
};

export const createStripeCheckout = async ({ invoice, gateway, actor }) => {
  const config = gatewayConfig(gateway);
  requireConfig(config, ['secretKey'], 'Stripe');
  const settlement = providerAmount(invoice, gateway);

  const successUrl = `${apiBaseUrl()}/payments/stripe/return?invoiceId=${encodeURIComponent(invoice.id)}&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = paymentResultUrl('cancelled', invoice.id, 'stripe');
  const params = new URLSearchParams();
  params.set('mode', 'payment');
  params.set('success_url', successUrl);
  params.set('cancel_url', cancelUrl);
  params.set('client_reference_id', invoice.id);
  params.set('customer_email', actor?.email || '');
  params.set('metadata[invoiceId]', invoice.id);
  params.set('metadata[ownerId]', invoice.ownerId);
  params.set('metadata[scope]', invoice.scope || 'billing');
  params.set('line_items[0][quantity]', '1');
  params.set('line_items[0][price_data][currency]', settlement.currency.toLowerCase());
  params.set('line_items[0][price_data][unit_amount]', String(stripeMinorAmount(settlement.amount, settlement.currency)));
  params.set('line_items[0][price_data][product_data][name]', providerDescription(invoice));

  const session = await withTimeout(`${config.apiBase}/v1/checkout/sessions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params
  });

  return {
    provider: 'stripe',
    reference: session.id,
    paymentUrl: session.url,
    raw: session,
    settlement
  };
};

export const retrieveStripeSession = async (gateway, sessionId) => {
  const config = gatewayConfig(gateway);
  requireConfig(config, ['secretKey'], 'Stripe');
  return withTimeout(`${config.apiBase}/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers: { Authorization: `Bearer ${config.secretKey}` }
  });
};

export const parseStripeWebhook = (gateway, rawBody, signatureHeader) => {
  const config = gatewayConfig(gateway);
  requireConfig(config, ['webhookSecret'], 'Stripe webhook');
  const parts = Object.fromEntries(String(signatureHeader || '')
    .split(',')
    .map((part) => part.split('='))
    .filter(([key, value]) => key && value));
  const timestamp = parts.t;
  const expected = crypto
    .createHmac('sha256', config.webhookSecret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');

  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(parts.v1 || '');
  if (!parts.v1 || expectedBuffer.length !== receivedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)) {
    throw new AppError('Invalid Stripe webhook signature', 'UNAUTHENTICATED');
  }

  return JSON.parse(rawBody);
};

const paypalAccessToken = async (gateway) => {
  const config = gatewayConfig(gateway);
  requireConfig(config, ['clientId', 'clientSecret'], 'PayPal');
  const body = new URLSearchParams({ grant_type: 'client_credentials' });
  const auth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
  const token = await withTimeout(`${config.apiBase}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  });
  return { token: token.access_token, apiBase: config.apiBase, brandName: config.brandName };
};

export const createPaypalOrder = async ({ invoice, gateway }) => {
  const config = gatewayConfig(gateway);
  const { token, apiBase, brandName } = await paypalAccessToken(gateway);
  const settlement = providerAmount(invoice, gateway);
  const returnUrl = `${apiBaseUrl()}/payments/paypal/return?invoiceId=${encodeURIComponent(invoice.id)}`;
  const cancelUrl = paymentResultUrl('cancelled', invoice.id, 'paypal');

  const payload = {
    intent: 'CAPTURE',
    purchase_units: [{
      reference_id: invoice.id,
      custom_id: invoice.id,
      invoice_id: String(invoice.number || invoice.id).slice(0, 127),
      description: providerDescription(invoice).slice(0, 127),
      amount: {
        currency_code: settlement.currency,
        value: moneyValue(settlement.amount)
      }
    }],
    payment_source: {
      paypal: {
        experience_context: compact({
          brand_name: brandName,
          shipping_preference: 'NO_SHIPPING',
          user_action: 'PAY_NOW',
          return_url: returnUrl,
          cancel_url: cancelUrl
        })
      }
    }
  };

  const order = await withTimeout(`${apiBase}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': `${invoice.id}-${Date.now()}`
    },
    body: JSON.stringify(payload)
  });

  const approve = order.links?.find((link) => ['payer-action', 'approve'].includes(link.rel));
  if (!approve?.href) throw new AppError('PayPal did not return an approval URL', 'PAYMENT_PROVIDER_ERROR');

  return {
    provider: 'paypal',
    reference: order.id,
    paymentUrl: approve.href,
    raw: order,
    settlement,
    config
  };
};

export const capturePaypalOrder = async (gateway, orderId, invoiceId) => {
  const { token, apiBase } = await paypalAccessToken(gateway);
  return withTimeout(`${apiBase}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': `${invoiceId || orderId}-capture`
    }
  });
};

const bkashHeaders = (config, token) => ({
  'Content-Type': 'application/json',
  Accept: 'application/json',
  username: config.username,
  password: config.password,
  ...(token ? { Authorization: token, 'X-App-Key': config.appKey } : {})
});

const requestBkashToken = async (gateway, refreshToken) => {
  const config = gatewayConfig(gateway);
  requireConfig(config, ['appKey', 'appSecret', 'username', 'password'], 'bKash');
  const path = refreshToken ? '/checkout/token/refresh' : '/checkout/token/grant';
  const body = {
    app_key: config.appKey,
    app_secret: config.appSecret,
    ...(refreshToken ? { refresh_token: refreshToken } : {})
  };
  const token = await withTimeout(`${config.baseUrl}${path}`, {
    method: 'POST',
    headers: bkashHeaders(config),
    body: JSON.stringify(body)
  });
  if (!token.id_token) {
    throw new AppError(token.statusMessage || 'bKash did not return an id_token', 'PAYMENT_PROVIDER_ERROR');
  }
  const now = Date.now();
  const cached = {
    idToken: token.id_token,
    refreshToken: token.refresh_token || refreshToken,
    expiresAt: now + (Number(token.expires_in || 3600) * 1000) - 60000,
    refreshExpiresAt: now + (28 * 24 * 60 * 60 * 1000),
    signature: `${config.mode}:${config.baseUrl}:${config.appKey}`
  };
  bkashTokenCache.set(gateway.id, cached);
  return cached;
};

export const clearPaymentProviderCache = (gateway) => {
  if (!gateway) return;
  if (gateway.provider === 'bkash' || gateway.key === 'bkash') {
    bkashTokenCache.delete(gateway.id);
  }
};

const bkashToken = async (gateway, { forceRefresh = false } = {}) => {
  const config = gatewayConfig(gateway);
  const signature = `${config.mode}:${config.baseUrl}:${config.appKey}`;
  if (forceRefresh) bkashTokenCache.delete(gateway.id);
  const cached = bkashTokenCache.get(gateway.id);
  if (cached?.idToken && cached.signature === signature && cached.expiresAt > Date.now()) return cached.idToken;
  if (cached?.refreshToken && cached.signature === signature && cached.refreshExpiresAt > Date.now()) {
    try {
      const refreshed = await requestBkashToken(gateway, cached.refreshToken);
      return refreshed.idToken;
    } catch {
      bkashTokenCache.delete(gateway.id);
    }
  }
  const granted = await requestBkashToken(gateway);
  return granted.idToken;
};

export const createBkashPayment = async ({ invoice, gateway, actor }) => {
  const config = gatewayConfig(gateway);
  requireConfig(config, ['appKey', 'appSecret', 'username', 'password'], 'bKash');
  const idToken = await bkashToken(gateway);
  const settlement = providerAmount(invoice, gateway);
  const callbackURL = `${apiBaseUrl()}/payments/bkash/callback?invoiceId=${encodeURIComponent(invoice.id)}`;
  const payerReference = String(actor?.phone || actor?.email || invoice.ownerId || 'tiwlo').replace(/\s+/g, '').slice(0, 64);
  const payload = {
    mode: '0011',
    payerReference,
    callbackURL,
    amount: moneyValue(settlement.amount),
    currency: settlement.currency,
    intent: 'sale',
    merchantInvoiceNumber: String(invoice.number || invoice.id).slice(0, 64)
  };

  const payment = await withTimeout(`${config.baseUrl}/checkout/create`, {
    method: 'POST',
    headers: bkashHeaders(config, idToken),
    body: JSON.stringify(payload)
  });

  if (payment.statusCode && payment.statusCode !== '0000') {
    throw new AppError(payment.statusMessage || 'bKash create payment failed', 'PAYMENT_PROVIDER_ERROR');
  }
  if (!payment.paymentID || !payment.bkashURL) {
    throw new AppError(payment.statusMessage || 'bKash did not return paymentID and bkashURL', 'PAYMENT_PROVIDER_ERROR');
  }

  return {
    provider: 'bkash',
    reference: payment.paymentID,
    paymentUrl: payment.bkashURL,
    raw: payment,
    settlement
  };
};

export const executeBkashPayment = async (gateway, paymentID) => {
  const config = gatewayConfig(gateway);
  const idToken = await bkashToken(gateway);
  return withTimeout(`${config.baseUrl}/checkout/execute`, {
    method: 'POST',
    headers: bkashHeaders(config, idToken),
    body: JSON.stringify({ paymentID })
  });
};

export const testPaymentGatewayConnection = async (gateway) => {
  const config = gatewayConfig(gateway);
  const startedAt = new Date().toISOString();

  try {
    if (gateway.provider === 'bkash') {
      requireConfig(config, ['appKey', 'appSecret', 'username', 'password'], 'bKash');
      await bkashToken(gateway, { forceRefresh: true });
      return {
        ok: true,
        provider: 'bkash',
        mode: config.mode,
        endpoint: `${config.baseUrl}/checkout/token/grant`,
        message: 'bKash token grant succeeded.',
        checkedAt: startedAt
      };
    }

    if (gateway.provider === 'stripe') {
      requireConfig(config, ['secretKey'], 'Stripe');
      await withTimeout(`${config.apiBase}/v1/balance`, {
        headers: { Authorization: `Bearer ${config.secretKey}` }
      });
      return {
        ok: true,
        provider: 'stripe',
        mode: config.mode,
        endpoint: `${config.apiBase}/v1/balance`,
        message: 'Stripe API key is valid.',
        checkedAt: startedAt
      };
    }

    if (gateway.provider === 'paypal') {
      requireConfig(config, ['clientId', 'clientSecret'], 'PayPal');
      await paypalAccessToken(gateway);
      return {
        ok: true,
        provider: 'paypal',
        mode: config.mode,
        endpoint: `${config.apiBase}/v1/oauth2/token`,
        message: 'PayPal access token succeeded.',
        checkedAt: startedAt
      };
    }

    return {
      ok: false,
      provider: gateway.provider,
      mode: config.mode,
      endpoint: '',
      message: 'This gateway does not support API testing yet.',
      checkedAt: startedAt
    };
  } catch (error) {
    const message = error?.message || 'Gateway test failed.';
    return {
      ok: false,
      provider: gateway.provider,
      mode: config.mode,
      endpoint: gateway.provider === 'bkash' ? `${config.baseUrl}/checkout/token/grant` : config.apiBase || '',
      message: gateway.provider === 'bkash' && message.toLowerCase().includes('app key')
        ? `${message}. Check that bKash mode matches your credentials: sandbox credentials need test mode, live credentials need live mode.`
        : message,
      checkedAt: startedAt
    };
  }
};
