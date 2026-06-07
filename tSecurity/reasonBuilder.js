import { clean } from './utils.js';

const title = (value) => clean(value).replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();

const categoryFor = (signal = {}) => {
  const text = `${signal.key || ''} ${signal.reason || ''} ${signal.label || ''}`.toLowerCase();
  if (text.includes('credit') || text.includes('promo')) return 'Signup Credit Abuse';
  if (text.includes('existing_account') || text.includes('multiple_signup') || text.includes('identity_mutator')) return 'Multiple Account Pattern';
  if (text.includes('cooldown')) return 'Previous Block Cooldown';
  if (text.includes('automation') || text.includes('robotic') || text.includes('webdriver') || text.includes('low_interaction')) return 'Bot or Automation Pattern';
  if (text.includes('vpn') || text.includes('proxy') || text.includes('tor') || text.includes('hosting') || text.includes('datacenter')) return 'VPN Proxy or Datacenter';
  if (text.includes('dns') || text.includes('email') || text.includes('disposable')) return 'Email Reputation';
  if (text.includes('sql') || text.includes('xss') || text.includes('html') || text.includes('parameter') || text.includes('malformed')) return 'Malicious Input';
  if (text.includes('request') || text.includes('replay') || text.includes('ttl')) return 'Replay or Expired Request';
  if (text.includes('session')) return 'Session Fingerprint Change';
  if (text.includes('clock') || text.includes('timezone')) return 'Clock or Timezone Mismatch';
  if (text.includes('subnet')) return 'Network Burst';
  if (text.includes('mime') || text.includes('file')) return 'File Upload Spoof';
  return 'Security Risk';
};

const detailBits = (signal = {}) => {
  const bits = [];
  if (signal.previousReason) bits.push(`previous: ${signal.previousReason}`);
  if (signal.keyType) bits.push(`key: ${signal.keyType}`);
  if (signal.blockedUntil) bits.push(`until: ${new Date(signal.blockedUntil).toISOString()}`);
  if (signal.elapsedMs !== undefined) bits.push(`elapsed: ${Math.round(Number(signal.elapsedMs || 0))}ms`);
  if (signal.deviceSignupCount !== undefined) bits.push(`device signups: ${signal.deviceSignupCount}`);
  if (signal.ipSignupCount !== undefined) bits.push(`IP signups: ${signal.ipSignupCount}`);
  if (signal.subnetSignupCount !== undefined) bits.push(`subnet signups: ${signal.subnetSignupCount}`);
  if (signal.recent !== undefined && signal.limit !== undefined) bits.push(`recent: ${signal.recent}/${signal.limit}`);
  if (signal.domain) bits.push(`domain: ${signal.domain}`);
  if (signal.country && signal.reportedOffset !== undefined) bits.push(`country: ${signal.country}, offset: ${signal.reportedOffset}`);
  if (signal.score !== undefined) bits.push(`score: ${signal.score}`);
  return bits;
};

const signalLine = (signal = {}) => {
  const reason = clean(signal.reason || signal.label || signal.key || 'Security signal');
  const details = detailBits(signal);
  return details.length ? `${reason} (${details.join(', ')})` : reason;
};

const unique = (items = []) => [...new Set(items.map(clean).filter(Boolean))];

export const buildExactDecisionReason = ({ action = '', signals = [], riskScore = 0, fallbackReason = '' } = {}) => {
  const blockingSignals = signals.filter((signal) => signal.block);
  const scoredSignals = signals
    .filter((signal) => Number(signal.score || 0) > 0)
    .sort((left, right) => Number(right.score || 0) - Number(left.score || 0));
  const evidence = blockingSignals.length ? blockingSignals : scoredSignals;
  const categories = unique(evidence.map(categoryFor));
  const lines = unique(evidence.map(signalLine));
  const primary = categories[0] || title(fallbackReason) || 'Security Risk';
  const actionLabel = title(action || 'gateway');
  const evidenceText = lines.slice(0, 4).join('; ');
  const suffix = evidenceText ? `: ${evidenceText}` : '';
  const reason = clean(`${primary}${suffix}`) || clean(fallbackReason) || 'Security Check Failed';

  return {
    reason: reason.slice(0, 480),
    primary,
    action: actionLabel,
    categories,
    signals: lines.slice(0, 12),
    blockingSignalCount: blockingSignals.length,
    riskSignalCount: scoredSignals.length,
    riskScore: Number(riskScore || 0),
    fallbackReason: clean(fallbackReason)
  };
};
