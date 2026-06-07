import { clean, headerValue } from '../utils.js';

const number = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const countryOffsets = {
  BD: [-360],
  SG: [-480],
  IN: [-330],
  PK: [-300],
  NP: [-345],
  LK: [-330],
  AE: [-240],
  SA: [-180],
  GB: [0, -60],
  US: [300, 360, 420, 480, 540, 600, 240],
  CA: [210, 240, 300, 360, 420, 480, 540],
  AU: [-480, -525, -570, -600, -630, -660],
  MY: [-480],
  ID: [-420, -480, -540],
  PH: [-480],
  TH: [-420],
  VN: [-420],
  CN: [-480],
  JP: [-540],
  KR: [-540]
};

const behaviorFromPayload = (payload = {}) => payload.behavior || payload.form?.behavior || {};
const metadataFromPayload = (payload = {}) => payload.deviceMetadata || payload.device || payload.form?.deviceMetadata || {};

export const clockSkewDefender = ({ payload = {}, request = {}, policy = {} }) => {
  const signals = [];
  const behavior = behaviorFromPayload(payload);
  const metadata = metadataFromPayload(payload);
  const now = Date.now();
  const clientEpochMs = number(behavior.clientEpochMs || behavior.submittedAt, 0);
  const toleranceMs = Number(policy.clockSkewToleranceMs || 10 * 60 * 1000);

  if (clientEpochMs > 0) {
    const skewMs = Math.abs(now - clientEpochMs);
    if (skewMs > toleranceMs) {
      signals.push({
        key: 'client_clock_skew',
        label: 'Client clock differs from server time',
        score: policy.weights?.clockSkew || 90,
        block: policy.blockOnClockSkew !== false,
        reason: 'Clock Skew Detected',
        skewMs
      });
    }
  }

  const reportedOffset = number(behavior.timezoneOffsetMinutes ?? metadata.timezoneOffsetMinutes, Number.NaN);
  const country = clean(request.country || metadata.country || headerValue(request.headers || {}, 'cf-ipcountry')).toUpperCase();
  const allowed = countryOffsets[country] || [];
  if (Number.isFinite(reportedOffset) && allowed.length) {
    const withinCountry = allowed.some((offset) => Math.abs(offset - reportedOffset) <= Number(policy.timezoneOffsetToleranceMinutes || 90));
    if (!withinCountry) {
      signals.push({
        key: 'timezone_country_mismatch',
        label: 'Client timezone does not match IP country',
        score: policy.weights?.timezoneMismatch || 80,
        block: policy.blockOnTimezoneMismatch !== false,
        reason: 'Timezone Mismatch Detected',
        country,
        reportedOffset,
        expectedOffsets: allowed
      });
    }
  }

  return {
    passed: !signals.some((signal) => signal.block),
    score: signals.reduce((total, signal) => total + Number(signal.score || 0), 0),
    signals
  };
};
