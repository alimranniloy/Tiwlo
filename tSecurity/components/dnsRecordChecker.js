import dns from 'node:dns/promises';
import { clean, normalizeEmail } from '../utils.js';

const cache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000;
const blockableDnsCodes = new Set(['ENODATA', 'ENOTFOUND', 'ENOTIMP', 'FORMERR', 'NXDOMAIN']);

const domainFromEmail = (payload = {}) => {
  const form = payload.form && typeof payload.form === 'object' ? payload.form : payload;
  const email = normalizeEmail(form.email || payload.email);
  const domain = email.includes('@') ? email.split('@').pop() : '';
  return clean(domain).toLowerCase();
};

const cachedLookup = async (domain) => {
  const now = Date.now();
  const cached = cache.get(domain);
  if (cached && cached.expiresAt > now) return cached.value;

  const [mxResult, nsResult] = await Promise.allSettled([
    dns.resolveMx(domain),
    dns.resolveNs(domain)
  ]);

  const value = {
    mx: mxResult.status === 'fulfilled' ? mxResult.value || [] : [],
    ns: nsResult.status === 'fulfilled' ? nsResult.value || [] : [],
    mxError: mxResult.status === 'rejected' ? mxResult.reason : null,
    nsError: nsResult.status === 'rejected' ? nsResult.reason : null
  };
  cache.set(domain, { value, expiresAt: now + CACHE_TTL_MS });
  if (cache.size > 10000) {
    for (const [key, entry] of cache.entries()) {
      if (entry.expiresAt <= now) cache.delete(key);
    }
  }
  return value;
};

const dnsCode = (error) => clean(error?.code || error?.errno || error?.message).toUpperCase();

export const dnsRecordChecker = async ({ payload = {}, policy = {} }) => {
  const signals = [];
  const domain = domainFromEmail(payload);
  if (!domain || !domain.includes('.')) {
    return { passed: true, score: 0, signals };
  }

  const allowlist = new Set((policy.emailDnsAllowlist || []).map((item) => clean(item).toLowerCase()).filter(Boolean));
  if (allowlist.has(domain)) {
    return { passed: true, score: 0, signals };
  }

  const records = await cachedLookup(domain);
  const mxCode = dnsCode(records.mxError);
  const nsCode = dnsCode(records.nsError);
  const mxMissing = !records.mx.length;
  const nsMissing = !records.ns.length;
  const blockOnMissingMx = policy.blockOnMissingEmailMx !== false;
  const blockOnMissingNs = policy.blockOnMissingEmailNs !== false;

  if (mxMissing && nsMissing && (blockableDnsCodes.has(mxCode) || blockableDnsCodes.has(nsCode) || !mxCode || !nsCode)) {
    signals.push({
      key: 'email_domain_dns_invalid',
      label: 'Email domain has no usable DNS records',
      score: policy.weights?.invalidEmailDns || 105,
      block: true,
      reason: 'Email Domain DNS Invalid',
      domain,
      mxCode,
      nsCode
    });
  } else if (mxMissing) {
    signals.push({
      key: 'email_domain_mx_missing',
      label: 'Email domain has no MX records',
      score: policy.weights?.missingEmailMx || 90,
      block: blockOnMissingMx,
      reason: 'Email Domain MX Missing',
      domain,
      mxCode
    });
  } else if (nsMissing) {
    signals.push({
      key: 'email_domain_ns_missing',
      label: 'Email domain has no nameserver records',
      score: policy.weights?.missingEmailNs || 60,
      block: blockOnMissingNs,
      reason: 'Email Domain NS Missing',
      domain,
      nsCode
    });
  }

  return {
    passed: !signals.some((signal) => signal.block),
    score: signals.reduce((total, signal) => total + Number(signal.score || 0), 0),
    signals
  };
};
