import crypto from 'node:crypto';
import net from 'node:net';

export const clean = (value, fallback = '') => String(value ?? fallback).trim();

export const lower = (value) => clean(value).toLowerCase();

export const normalizeEmail = (value) => lower(value);

export const normalizePhone = ({ phone, mobileCountryCode } = {}) => {
  const raw = clean(phone).replace(/\D/g, '');
  const dial = clean(mobileCountryCode).replace(/\D/g, '');
  if (!raw) return '';
  if (dial && raw.startsWith(dial)) return `+${raw}`;
  const local = raw.replace(/^0+/, '');
  return dial ? `+${dial}${local}` : local;
};

export const normalizeIp = (value = '') => {
  const first = clean(value).split(',')[0]?.trim() || '';
  const forwarded = first.match(/for="?([^";,\s]+)"?/i)?.[1] || first;
  const withoutPrefix = forwarded.replace(/^::ffff:/i, '');
  if (/^\[[^\]]+\](?::\d+)?$/.test(withoutPrefix)) return withoutPrefix.slice(1, withoutPrefix.indexOf(']'));
  if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(withoutPrefix)) return withoutPrefix.replace(/:\d+$/, '');
  return withoutPrefix;
};

export const headerValue = (headers = {}, key) => {
  const value = headers[key] ?? headers[key.toLowerCase()];
  return Array.isArray(value) ? value[0] : value || '';
};

export const requestCountry = (headers = {}, fallback = '') => {
  const value = clean(
    headerValue(headers, 'cf-ipcountry')
    || headerValue(headers, 'x-vercel-ip-country')
    || headerValue(headers, 'x-country-code')
    || fallback
  ).toUpperCase();
  return /^[A-Z]{2}$/.test(value) && value !== 'XX' ? value : '';
};

export const hashValue = (value, pepper = process.env.TSECURITY_HASH_PEPPER || process.env.JWT_SECRET || 'dev-secret') => (
  crypto.createHmac('sha256', pepper).update(clean(value)).digest('hex')
);

export const sha256 = (value) => crypto.createHash('sha256').update(clean(value)).digest('hex');

export const randomId = () => crypto.randomUUID();

export const randomToken = (bytes = 32) => base64url(crypto.randomBytes(bytes));

export const addSeconds = (seconds) => new Date(Date.now() + Number(seconds || 0) * 1000);

export const addDays = (days) => new Date(Date.now() + Number(days || 0) * 24 * 60 * 60 * 1000);

export const json = (value) => JSON.stringify(value ?? null);

export const toApi = (value) => {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(toApi);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, toApi(item)]));
  }
  return value;
};

export const base64url = (input) => Buffer.from(input)
  .toString('base64')
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=+$/g, '');

export const fromBase64url = (value) => {
  const text = clean(value).replace(/-/g, '+').replace(/_/g, '/');
  const padding = text.length % 4 ? '='.repeat(4 - (text.length % 4)) : '';
  return Buffer.from(`${text}${padding}`, 'base64');
};

export const subnetForIp = (ipValue = '') => {
  const ip = normalizeIp(ipValue);
  if (!ip) return '';
  if (net.isIPv4(ip)) return ip.split('.').slice(0, 3).join('.') + '.0/24';
  if (net.isIPv6(ip)) return ip.split(':').slice(0, 4).join(':') + '::/64';
  return '';
};

export const isPrivateIp = (ipValue = '') => {
  const ip = normalizeIp(ipValue);
  if (!net.isIP(ip)) return false;
  if (net.isIPv6(ip)) {
    return ip === '::1' || ip.toLowerCase().startsWith('fc') || ip.toLowerCase().startsWith('fd') || ip.toLowerCase().startsWith('fe80:');
  }
  const parts = ip.split('.').map((part) => Number(part));
  return parts[0] === 10
    || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
    || (parts[0] === 192 && parts[1] === 168)
    || parts[0] === 127
    || (parts[0] === 169 && parts[1] === 254);
};

export const compact = (value = {}) => Object.fromEntries(
  Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== '')
);

export class TSecurityError extends Error {
  constructor(message, code = 'TSECURITY_BLOCKED', metadata = {}) {
    super(message);
    this.name = 'TSecurityError';
    this.extensions = { code, ...metadata };
  }
}
