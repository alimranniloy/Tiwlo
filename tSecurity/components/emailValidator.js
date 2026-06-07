import { DISPOSABLE_EMAIL_DOMAINS } from '../config.js';
import { clean, normalizeEmail } from '../utils.js';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const domainOf = (email = '') => normalizeEmail(email).split('@')[1] || '';

export const validateEmail = ({ payload = {}, policy = {} }) => {
  const email = normalizeEmail(payload.email || payload.form?.email);
  if (!email) {
    return {
      passed: true,
      score: 0,
      signals: []
    };
  }

  const signals = [];
  if (!emailPattern.test(email)) {
    signals.push({
      key: 'invalid_email',
      label: 'Invalid email syntax',
      score: 80,
      block: true,
      reason: 'Invalid Email'
    });
  }

  const domain = domainOf(email);
  const extraDomains = clean(process.env.TSECURITY_DISPOSABLE_EMAIL_DOMAINS)
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  const disposableDomains = new Set([...DISPOSABLE_EMAIL_DOMAINS, ...extraDomains]);
  if (domain && policy.blockOnDisposableEmail !== false && disposableDomains.has(domain)) {
    signals.push({
      key: 'disposable_email',
      label: 'Disposable email provider',
      score: policy.weights?.disposableEmail || 100,
      block: true,
      reason: 'Disposable Email Blocked'
    });
  }

  return {
    passed: !signals.some((signal) => signal.block),
    score: signals.reduce((total, signal) => total + Number(signal.score || 0), 0),
    signals
  };
};
