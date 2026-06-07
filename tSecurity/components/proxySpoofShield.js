import requestIp from 'request-ip';
import { clean, headerValue, isPrivateIp, normalizeIp } from '../utils.js';

const ipv4ToInt = (ip) => ip.split('.').reduce((total, part) => ((total << 8) + Number(part)), 0) >>> 0;

const cidrContainsIpv4 = (cidr, ip) => {
  const [range, bitsText = '32'] = clean(cidr).split('/');
  if (!range || !ip || range.includes(':') || ip.includes(':')) return false;
  const bits = Math.max(0, Math.min(32, Number(bitsText)));
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (ipv4ToInt(range) & mask) === (ipv4ToInt(ip) & mask);
};

const trustedProxyCidrs = () => clean(process.env.TSECURITY_TRUSTED_PROXY_CIDRS)
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

const cloudflareHeaderPresent = (headers = {}) => Boolean(
  headerValue(headers, 'cf-ray')
  || headerValue(headers, 'cf-connecting-ip')
  || headerValue(headers, 'cf-ipcountry')
);

const trustedProxy = (remoteIp, headers = {}) => {
  const normalized = normalizeIp(remoteIp);
  if (!normalized) return false;
  if (isPrivateIp(normalized)) return true;
  if (trustedProxyCidrs().some((cidr) => cidrContainsIpv4(cidr, normalized))) return true;
  return cloudflareHeaderPresent(headers) && process.env.TSECURITY_TRUST_CLOUDFLARE_HEADERS === 'true';
};

export const proxySpoofShield = ({ req, request = {}, policy = {} }) => {
  const headers = request.headers || req?.headers || {};
  const remoteIp = normalizeIp(req?.socket?.remoteAddress || req?.connection?.remoteAddress || req?.ip || '');
  const resolvedClientIp = normalizeIp(requestIp.getClientIp(req) || request.ipAddress);
  const forwarded = clean(headerValue(headers, 'x-forwarded-for')).split(',').map((item) => normalizeIp(item)).filter(Boolean);
  const cfIp = normalizeIp(headerValue(headers, 'cf-connecting-ip'));
  const realIp = normalizeIp(headerValue(headers, 'x-real-ip'));
  const signals = [];
  const hasClientOverride = Boolean(cfIp || realIp || forwarded.length);
  const remoteTrusted = trustedProxy(remoteIp, headers);

  if (hasClientOverride && !remoteTrusted) {
    signals.push({
      key: 'untrusted_proxy_header',
      label: 'Client IP override header from an untrusted network',
      score: policy.weights?.proxySpoof || 115,
      block: true,
      reason: 'Proxy Header Spoof Detected',
      remoteIp,
      resolvedClientIp,
      forwardedCount: forwarded.length
    });
  }

  if (cfIp && forwarded.length && forwarded[0] !== cfIp && remoteTrusted) {
    signals.push({
      key: 'cloudflare_ip_mismatch',
      label: 'Cloudflare connecting IP does not match forwarded chain',
      score: policy.weights?.proxySpoof || 115,
      block: true,
      reason: 'Cloudflare Header Spoof Detected',
      cloudflareIp: cfIp,
      firstForwardedIp: forwarded[0]
    });
  }

  if (forwarded.length > Number(policy.maxForwardedHops || 3)) {
    signals.push({
      key: 'excessive_forwarded_hops',
      label: 'Excessive proxy forwarding hops',
      score: 60,
      block: false,
      reason: 'Proxy Chain Anomaly',
      forwardedCount: forwarded.length
    });
  }

  return {
    passed: !signals.some((signal) => signal.block),
    score: signals.reduce((total, signal) => total + Number(signal.score || 0), 0),
    signals,
    clientIp: resolvedClientIp
  };
};
