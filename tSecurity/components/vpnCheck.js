import net from 'node:net';
import { clean, headerValue, isPrivateIp, lower, normalizeIp } from '../utils.js';

const providerRegex = /(amazon|aws|azure|microsoft|google cloud|gcp|digitalocean|linode|akamai|oracle|ovh|hetzner|vultr|hosting|cloud|datacenter|data center|vpn|proxy|tor|colo|server)/i;

const withTimeout = async (url, options, timeoutMs) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

const truthy = (...values) => values.some((value) => value === true || value === 'true' || value === 1 || value === '1');

const providerSignals = (payload = {}) => {
  const security = payload.security || payload.threat || payload.risk || {};
  return {
    vpn: truthy(payload.vpn, payload.proxy, security.vpn),
    proxy: truthy(payload.proxy, security.proxy, payload.is_proxy),
    tor: truthy(payload.tor, security.tor, payload.is_tor),
    hosting: truthy(payload.hosting, payload.hostingProvider, payload.is_datacenter, payload.datacenter, security.hosting),
    raw: payload
  };
};

const fetchIpReputation = async (ip, policy) => {
  const urlTemplate = clean(policy.ipReputation?.url);
  if (!urlTemplate || !ip || !net.isIP(ip)) return null;
  const url = urlTemplate.includes('{ip}')
    ? urlTemplate.replace('{ip}', encodeURIComponent(ip))
    : `${urlTemplate}${urlTemplate.includes('?') ? '&' : '?'}ip=${encodeURIComponent(ip)}`;
  const headers = { Accept: 'application/json' };
  if (policy.ipReputation?.token) headers.Authorization = `Bearer ${policy.ipReputation.token}`;
  const response = await withTimeout(url, { headers }, Number(policy.ipReputation?.timeoutMs || 2200)).catch(() => null);
  if (!response?.ok) return null;
  const payload = await response.json().catch(() => null);
  return payload ? providerSignals(payload) : null;
};

export const vpnCheck = async ({ request = {}, policy = {} }) => {
  const headers = request.headers || {};
  const ip = normalizeIp(request.ipAddress);
  const signals = [];

  if (!ip || !net.isIP(ip)) {
    return { passed: true, score: 0, signals };
  }

  if (isPrivateIp(ip) && policy.blockPrivateIps !== true) {
    return { passed: true, score: 0, signals };
  }

  const forwarded = clean(headerValue(headers, 'x-forwarded-for')).split(',').map((item) => item.trim()).filter(Boolean);
  if (forwarded.length > 2) {
    signals.push({
      key: 'proxy_chain',
      label: 'Long proxy forwarding chain',
      score: 45,
      block: false,
      reason: 'Proxy Chain Detected',
      forwardedCount: forwarded.length
    });
  }

  const asn = lower(headerValue(headers, 'x-asn') || headerValue(headers, 'cf-asn') || headerValue(headers, 'x-vercel-ip-asn'));
  const org = lower(headerValue(headers, 'x-as-organization') || headerValue(headers, 'cf-as-organization') || headerValue(headers, 'x-vercel-ip-as-organization'));
  if (providerRegex.test(`${asn} ${org}`)) {
    signals.push({
      key: 'hosting_asn',
      label: 'Datacenter or hosting ASN',
      score: policy.weights?.hosting || 90,
      block: policy.blockOnHosting !== false,
      reason: 'Datacenter IP Detected',
      asn,
      organization: org
    });
  }

  const reputation = await fetchIpReputation(ip, policy);
  if (reputation?.vpn) {
    signals.push({
      key: 'vpn_ip',
      label: 'VPN IP reputation',
      score: policy.weights?.vpn || 100,
      block: policy.blockOnVpn !== false,
      reason: 'VPN Detected'
    });
  }
  if (reputation?.proxy) {
    signals.push({
      key: 'proxy_ip',
      label: 'Proxy IP reputation',
      score: policy.weights?.proxy || 95,
      block: policy.blockOnVpn !== false,
      reason: 'Proxy Detected'
    });
  }
  if (reputation?.tor) {
    signals.push({
      key: 'tor_ip',
      label: 'Tor exit node reputation',
      score: policy.weights?.tor || 120,
      block: policy.blockOnTor !== false,
      reason: 'Tor Detected'
    });
  }
  if (reputation?.hosting) {
    signals.push({
      key: 'hosting_ip',
      label: 'Hosting/datacenter IP reputation',
      score: policy.weights?.hosting || 90,
      block: policy.blockOnHosting !== false,
      reason: 'Datacenter IP Detected'
    });
  }

  return {
    passed: !signals.some((signal) => signal.block),
    score: signals.reduce((total, signal) => total + Number(signal.score || 0), 0),
    signals
  };
};
