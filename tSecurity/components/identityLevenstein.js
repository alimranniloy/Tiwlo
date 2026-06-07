import stringSimilarity from 'string-similarity';
import { clean, normalizeEmail } from '../utils.js';

const normalizeIdentityText = (value) => clean(value)
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9@._+-]+/g, '')
  .replace(/[._+-]+/g, '')
  .trim();

const identityValuesFromPayload = (payload = {}) => {
  const form = payload.form && typeof payload.form === 'object' ? payload.form : payload;
  const email = normalizeEmail(form.email || payload.email);
  const local = email.includes('@') ? email.split('@')[0] : '';
  return [
    form.name,
    form.fullName,
    form.firstName && form.lastName ? `${form.firstName}${form.lastName}` : '',
    form.username,
    local
  ].map(normalizeIdentityText).filter((item) => item.length >= 4);
};

const identityValuesFromEvent = (event = {}) => {
  const payload = event.metadata?.payload || event.metadata?.authPayload || {};
  const email = normalizeEmail(event.email || payload.email);
  const local = email.includes('@') ? email.split('@')[0] : '';
  return [
    payload.name,
    payload.fullName,
    payload.firstName && payload.lastName ? `${payload.firstName}${payload.lastName}` : '',
    payload.username,
    local
  ].map(normalizeIdentityText).filter((item) => item.length >= 4);
};

const highestSimilarity = (leftValues, rightValues) => {
  let best = { score: 0, left: '', right: '' };
  for (const left of leftValues) {
    for (const right of rightValues) {
      if (left === right) continue;
      const score = stringSimilarity.compareTwoStrings(left, right);
      if (score > best.score) best = { score, left, right };
    }
  }
  return best;
};

export const identityLevenstein = async ({ prisma, payload = {}, context = {}, policy = {} }) => {
  const signals = [];
  const values = identityValuesFromPayload(payload);
  if (!values.length || !prisma?.$queryRawUnsafe) {
    return { passed: true, score: 0, signals };
  }

  const lookbackDays = Number(policy.identitySimilarityLookbackDays || policy.cooldownDays || 90);
  const rows = await prisma.$queryRawUnsafe(`
    SELECT "email", "phone", "ipAddress", "ipSubnet", "deviceHash", "reason", "metadata", "createdAt"
    FROM "TSecurityBlockEvent"
    WHERE "createdAt" > CURRENT_TIMESTAMP - ($1::int * INTERVAL '1 day')
      AND (
        ($2 <> '' AND "deviceHash" = $2)
        OR ($3 <> '' AND "ipSubnet" = $3)
        OR ($4 <> '' AND "ipAddress" = $4)
      )
    ORDER BY "createdAt" DESC
    LIMIT 30
  `, lookbackDays, clean(context.deviceHash), clean(context.ipSubnet), clean(context.ipAddress)).catch(() => []);

  const threshold = Number(policy.identitySimilarityThreshold || 0.9);
  for (const event of rows || []) {
    const priorValues = identityValuesFromEvent(event);
    const best = highestSimilarity(values, priorValues);
    if (best.score >= threshold) {
      signals.push({
        key: 'identity_mutator',
        label: 'Identity pattern is similar to a recently blocked attempt',
        score: policy.weights?.identityMutator || 115,
        block: policy.blockOnIdentityMutator !== false,
        reason: 'Identity Mutator Detected',
        similarity: Number(best.score.toFixed(4)),
        current: best.left,
        previous: best.right,
        previousReason: event.reason || ''
      });
      break;
    }
  }

  return {
    passed: !signals.some((signal) => signal.block),
    score: signals.reduce((total, signal) => total + Number(signal.score || 0), 0),
    signals
  };
};
