import { ensureTSecuritySchema } from '../db/schema.js';
import { clean, hashValue, json, normalizeIp, randomId, requestCountry, sha256, subnetForIp, toApi } from '../utils.js';

const parseUserAgent = (userAgent = '') => {
  const ua = clean(userAgent);
  const browser = /Edg\//.test(ua) ? 'Microsoft Edge'
    : /Chrome\//.test(ua) ? 'Chrome'
      : /Firefox\//.test(ua) ? 'Firefox'
        : /Safari\//.test(ua) ? 'Safari'
          : 'Unknown browser';
  const os = /Windows/i.test(ua) ? 'Windows'
    : /Android/i.test(ua) ? 'Android'
      : /iPhone|iPad|iOS/i.test(ua) ? 'iOS'
        : /Mac OS|Macintosh/i.test(ua) ? 'macOS'
          : /Linux/i.test(ua) ? 'Linux'
            : 'Unknown OS';
  return { browser, os, deviceName: `${browser} on ${os}` };
};

export const buildDeviceFingerprint = ({ req, request = {}, payload = {} }) => {
  const metadata = payload.deviceMetadata || payload.device || payload.form?.deviceMetadata || {};
  const passiveHash = clean(req?.fingerprint?.hash);
  const userAgent = clean(request.userAgent || metadata.userAgent);
  const seed = [
    clean(payload.deviceFingerprint || payload.form?.deviceFingerprint),
    passiveHash,
    userAgent,
    clean(metadata.language),
    clean(metadata.platform),
    clean(metadata.vendor),
    clean(metadata.timezone),
    clean(metadata.screen),
    clean(metadata.hardwareConcurrency),
    clean(metadata.deviceMemory),
    clean(metadata.maxTouchPoints)
  ].filter(Boolean).join('|');
  const hash = hashValue(`device:${seed || userAgent || request.ipAddress || 'unknown'}`);
  return {
    deviceHash: hash,
    fingerprintHint: hash.slice(0, 12),
    passiveHash,
    metadata,
    userAgent
  };
};

export const analyzeDeviceFingerprint = ({ fingerprint = {}, policy = {} }) => {
  const signals = [];
  const metadata = fingerprint.metadata || {};
  if (!fingerprint.deviceHash || fingerprint.deviceHash.length < 24) {
    signals.push({
      key: 'weak_device_fingerprint',
      label: 'Weak device fingerprint',
      score: policy.weights?.weakDevice || 25,
      block: false,
      reason: 'Weak Device Fingerprint'
    });
  }
  if (metadata.webdriver === true || metadata.automation === true) {
    signals.push({
      key: 'browser_automation',
      label: 'Browser automation flag',
      score: 100,
      block: true,
      reason: 'Automation Browser Detected'
    });
  }
  return {
    passed: !signals.some((signal) => signal.block),
    score: signals.reduce((total, signal) => total + Number(signal.score || 0), 0),
    signals
  };
};

export const ensureDeviceSessionTable = ensureTSecuritySchema;

export const recordAuthDeviceSession = async (ctx, user, input = {}, event = 'login') => {
  await ensureTSecuritySchema(ctx.prisma);
  const metadata = input.deviceMetadata && typeof input.deviceMetadata === 'object' ? input.deviceMetadata : {};
  const userAgent = clean(ctx.userAgent || metadata.userAgent);
  const requestIp = normalizeIp(ctx.requestIp || metadata.ipAddress);
  const fingerprintSeed = clean(input.deviceFingerprint) || `${userAgent}|${requestIp || 'unknown'}|${metadata.screen || ''}|${metadata.timezone || ''}`;
  const fingerprintHash = hashValue(`auth-device:${fingerprintSeed}`);
  const fingerprintHint = fingerprintHash.slice(0, 12);
  const parsed = parseUserAgent(userAgent);
  const country = requestCountry(ctx.requestHeaders, metadata.country || input.country || user.country);
  const ipPrefix = subnetForIp(requestIp);
  const previous = await ctx.prisma.$queryRawUnsafe(`
    SELECT *
    FROM "UserDeviceSession"
    WHERE "userId" = $1
    ORDER BY "lastSeenAt" DESC
    LIMIT 12
  `, user.id);
  const existing = (previous || []).find((session) => session.fingerprintHash === fingerprintHash);
  const reasons = [];
  if (!existing && previous.length > 0) reasons.push('new_device');
  if (ipPrefix && previous.some((session) => session.ipPrefix && session.ipPrefix !== ipPrefix)) reasons.push('new_network');
  if (country && previous.some((session) => session.country && session.country !== country)) reasons.push('new_country');
  const unusual = reasons.length > 0;
  const data = {
    fingerprintHint,
    deviceName: clean(metadata.deviceName || parsed.deviceName),
    browser: clean(metadata.browser || parsed.browser),
    os: clean(metadata.os || parsed.os),
    userAgent,
    ipAddress: requestIp,
    ipPrefix,
    country,
    region: clean(metadata.region),
    city: clean(metadata.city),
    lastEvent: event,
    unusual,
    unusualReasons: reasons,
    metadata: {
      timezone: metadata.timezone || '',
      language: metadata.language || '',
      platform: metadata.platform || '',
      vendor: metadata.vendor || '',
      hardwareConcurrency: Number(metadata.hardwareConcurrency || 0),
      deviceMemory: Number(metadata.deviceMemory || 0),
      maxTouchPoints: Number(metadata.maxTouchPoints || 0),
      screen: metadata.screen || '',
      passiveHash: sha256(clean(metadata.passiveHash || ''))
    }
  };

  let session;
  if (existing) {
    await ctx.prisma.$executeRawUnsafe(`
      UPDATE "UserDeviceSession"
      SET "fingerprintHint" = $3, "deviceName" = $4, "browser" = $5, "os" = $6,
          "userAgent" = $7, "ipAddress" = $8, "ipPrefix" = $9, "country" = $10,
          "region" = $11, "city" = $12, "lastSeenAt" = CURRENT_TIMESTAMP,
          "loginCount" = "loginCount" + 1, "lastEvent" = $13, "unusual" = $14,
          "unusualReasons" = CAST($15 AS jsonb), "metadata" = CAST($16 AS jsonb),
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE "userId" = $1 AND "fingerprintHash" = $2
    `, user.id, fingerprintHash, data.fingerprintHint, data.deviceName, data.browser, data.os,
    data.userAgent, data.ipAddress, data.ipPrefix, data.country, data.region, data.city,
    data.lastEvent, data.unusual, json(data.unusualReasons), json(data.metadata));
  } else {
    await ctx.prisma.$executeRawUnsafe(`
      INSERT INTO "UserDeviceSession" (
        "id", "userId", "fingerprintHash", "fingerprintHint", "deviceName", "browser", "os",
        "userAgent", "ipAddress", "ipPrefix", "country", "region", "city", "lastEvent",
        "unusual", "unusualReasons", "metadata", "firstSeenAt", "lastSeenAt", "createdAt", "updatedAt"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CAST($16 AS jsonb), CAST($17 AS jsonb), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, randomId(), user.id, fingerprintHash, data.fingerprintHint, data.deviceName, data.browser, data.os,
    data.userAgent, data.ipAddress, data.ipPrefix, data.country, data.region, data.city,
    data.lastEvent, data.unusual, json(data.unusualReasons), json(data.metadata));
  }

  const rows = await ctx.prisma.$queryRawUnsafe(`
    SELECT *
    FROM "UserDeviceSession"
    WHERE "userId" = $1 AND "fingerprintHash" = $2
    LIMIT 1
  `, user.id, fingerprintHash);
  session = rows?.[0] || null;
  return { session: toApi(session), unusual, reasons };
};

export const securitySummaryForUser = async (prisma, userId) => {
  await ensureTSecuritySchema(prisma);
  const sessions = await prisma.$queryRawUnsafe(`
    SELECT *
    FROM "UserDeviceSession"
    WHERE "userId" = $1
    ORDER BY "lastSeenAt" DESC
  `, userId);
  const first = (sessions || []).reduce((oldest, item) => (!oldest || item.firstSeenAt < oldest.firstSeenAt ? item : oldest), null);
  const last = sessions?.[0] || null;
  return toApi({
    deviceCount: sessions?.length || 0,
    unusualCount: (sessions || []).filter((item) => item.unusual).length,
    firstDevice: first,
    lastDevice: last,
    lastLocation: last ? [last.city, last.region, last.country].filter(Boolean).join(', ') || last.ipAddress || 'Unknown' : 'Unknown'
  });
};
