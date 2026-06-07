import { clean } from '../utils.js';

const metadataFromPayload = (payload = {}) => payload.deviceMetadata || payload.device || payload.form?.deviceMetadata || {};

const canonicalUa = (value = '') => clean(value)
  .toLowerCase()
  .replace(/\d+(?:\.\d+){1,3}/g, '#')
  .slice(0, 180);

export const sessionLock = ({ payload = {}, fingerprint = {}, policy = {} }) => {
  const metadata = metadataFromPayload(payload);
  const lock = metadata.sessionLock || payload.sessionLock || payload.form?.sessionLock || {};
  const signals = [];
  if (!lock || typeof lock !== 'object' || !Object.keys(lock).length) {
    return { passed: true, score: 0, signals };
  }

  const changedFields = Array.isArray(lock.changedFields) ? lock.changedFields.map((item) => clean(item)) : [];
  const hardChanged = changedFields.filter((field) => ['userAgent', 'platform', 'vendor'].includes(field));
  if (hardChanged.length) {
    signals.push({
      key: 'session_fingerprint_changed',
      label: 'Stored session fingerprint changed on a sensitive action',
      score: policy.weights?.sessionHijack || 120,
      block: policy.blockOnSessionLockMismatch !== false,
      reason: 'Session Fingerprint Changed',
      changedFields: hardChanged
    });
  }

  if (lock.userAgent && metadata.userAgent && canonicalUa(lock.userAgent) !== canonicalUa(metadata.userAgent)) {
    signals.push({
      key: 'session_user_agent_mismatch',
      label: 'Session user-agent binding changed',
      score: policy.weights?.sessionHijack || 120,
      block: policy.blockOnSessionLockMismatch !== false,
      reason: 'Session Hijack Suspected'
    });
  }

  if (lock.platform && metadata.platform && clean(lock.platform) !== clean(metadata.platform)) {
    signals.push({
      key: 'session_platform_mismatch',
      label: 'Session platform binding changed',
      score: policy.weights?.sessionHijack || 120,
      block: policy.blockOnSessionLockMismatch !== false,
      reason: 'Session Hijack Suspected'
    });
  }

  if (lock.deviceHashHint && fingerprint.fingerprintHint && clean(lock.deviceHashHint) !== clean(fingerprint.fingerprintHint)) {
    signals.push({
      key: 'session_device_hash_mismatch',
      label: 'Session device hash hint changed',
      score: policy.weights?.sessionHijack || 120,
      block: false,
      reason: 'Session Device Hash Mismatch'
    });
  }

  return {
    passed: !signals.some((signal) => signal.block),
    score: signals.reduce((total, signal) => total + Number(signal.score || 0), 0),
    signals
  };
};
