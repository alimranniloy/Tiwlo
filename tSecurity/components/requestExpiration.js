const number = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const behaviorFromPayload = (payload = {}) => payload.behavior || payload.form?.behavior || {};

export const requestExpiration = ({ payload = {}, policy = {} }) => {
  const signals = [];
  const behavior = behaviorFromPayload(payload);
  const issuedAt = number(behavior.requestIssuedAt || behavior.pageLoadedAt || behavior.startedAt, 0);
  if (!issuedAt) {
    return { passed: true, score: 0, signals };
  }

  const now = Date.now();
  const ttlMs = Number(policy.requestTtlMs || 10 * 60 * 1000);
  const futureToleranceMs = Number(policy.requestFutureToleranceMs || 90 * 1000);
  if (issuedAt > now + futureToleranceMs) {
    signals.push({
      key: 'request_timestamp_future',
      label: 'Request timestamp is in the future',
      score: policy.weights?.requestReplay || 95,
      block: policy.blockOnRequestReplay !== false,
      reason: 'Request Timestamp Invalid',
      issuedAt,
      now
    });
  } else if (now - issuedAt > ttlMs) {
    signals.push({
      key: 'request_ttl_expired',
      label: 'Form security timestamp expired before submission',
      score: policy.weights?.requestReplay || 95,
      block: policy.blockOnRequestReplay !== false,
      reason: 'Request TTL Expired',
      ageMs: now - issuedAt,
      ttlMs
    });
  }

  return {
    passed: !signals.some((signal) => signal.block),
    score: signals.reduce((total, signal) => total + Number(signal.score || 0), 0),
    signals
  };
};
