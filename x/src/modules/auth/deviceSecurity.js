import crypto from 'node:crypto';
import geoip from 'geoip-lite';
import { toApi } from '../../core/format.js';

const hash = (value) => crypto.createHash('sha256').update(String(value || '')).digest('hex');

const clean = (value, fallback = '') => String(value || fallback).trim();
const countryCode = (value = '') => {
  const code = clean(value).toUpperCase();
  return /^[A-Z]{2}$/.test(code) && code !== 'XX' ? code : '';
};

const normalizeIp = (value = '') => {
  const first = clean(value).split(',')[0]?.trim() || '';
  if (!first) return '';
  const forwarded = first.match(/for="?([^";,\s]+)"?/i)?.[1] || first;
  const withoutPrefix = forwarded.replace(/^::ffff:/i, '');
  if (/^\[[^\]]+\](?::\d+)?$/.test(withoutPrefix)) return withoutPrefix.slice(1, withoutPrefix.indexOf(']'));
  if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(withoutPrefix)) return withoutPrefix.replace(/:\d+$/, '');
  return withoutPrefix;
};

const ipPrefix = (ip = '') => {
  const value = normalizeIp(ip);
  if (!value) return '';
  if (value.includes(':')) return value.split(':').slice(0, 4).join(':');
  return value.split('.').slice(0, 3).join('.');
};

const header = (headers = {}, key) => {
  const value = headers[key] || headers[key.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
};

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
  return {
    browser,
    os,
    deviceName: `${browser} on ${os}`
  };
};

const locationFromRequest = (headers = {}, metadata = {}, requestIp = '', input = {}, user = {}) => {
  const ip = normalizeIp(requestIp);
  const geo = ip ? geoip.lookup(ip) : null;
  const headerCountry = countryCode(
    header(headers, 'cf-ipcountry')
    || header(headers, 'x-vercel-ip-country')
    || header(headers, 'x-country-code')
    || header(headers, 'x-appengine-country')
  );
  return {
    country: headerCountry
      || countryCode(geo?.country)
      || countryCode(input.country)
      || countryCode(user.country)
      || countryCode(metadata.country),
    region: clean(
      header(headers, 'cf-region')
      || header(headers, 'x-vercel-ip-country-region')
      || header(headers, 'x-region')
      || geo?.region
      || metadata.region
    ),
    city: clean(
      header(headers, 'cf-ipcity')
      || header(headers, 'x-vercel-ip-city')
      || header(headers, 'x-city')
      || geo?.city
      || metadata.city
    )
  };
};

const publicSession = (session) => toApi(session);

export const ensureDeviceSessionTable = async (prisma) => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "UserDeviceSession" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "fingerprintHash" TEXT NOT NULL,
      "fingerprintHint" TEXT,
      "deviceName" TEXT,
      "browser" TEXT,
      "os" TEXT,
      "userAgent" TEXT,
      "ipAddress" TEXT,
      "ipPrefix" TEXT,
      "country" TEXT,
      "region" TEXT,
      "city" TEXT,
      "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "loginCount" INTEGER NOT NULL DEFAULT 1,
      "lastEvent" TEXT NOT NULL DEFAULT 'login',
      "unusual" BOOLEAN NOT NULL DEFAULT false,
      "unusualReasons" JSONB,
      "metadata" JSONB,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "UserDeviceSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "UserDeviceSession_userId_fingerprintHash_key" ON "UserDeviceSession" ("userId", "fingerprintHash")');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "UserDeviceSession_userId_lastSeenAt_idx" ON "UserDeviceSession" ("userId", "lastSeenAt")');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "UserDeviceSession_unusual_lastSeenAt_idx" ON "UserDeviceSession" ("unusual", "lastSeenAt")');
};

export const recordAuthDeviceSession = async (ctx, user, input = {}, event = 'login') => {
  await ensureDeviceSessionTable(ctx.prisma);
  const metadata = input.deviceMetadata && typeof input.deviceMetadata === 'object' ? input.deviceMetadata : {};
  const userAgent = clean(ctx.userAgent || metadata.userAgent);
  const requestIp = normalizeIp(ctx.requestIp || metadata.ipAddress);
  const fingerprintSeed = clean(input.deviceFingerprint) || `${userAgent}|${requestIp || 'unknown'}|${metadata.screen || ''}|${metadata.timezone || ''}`;
  const fingerprintHash = hash(fingerprintSeed);
  const fingerprintHint = fingerprintHash.slice(0, 12);
  const parsed = parseUserAgent(userAgent);
  const location = locationFromRequest(ctx.requestHeaders, metadata, requestIp, input, user);
  const prefix = ipPrefix(requestIp);
  const previous = await ctx.prisma.userDeviceSession.findMany({
    where: { userId: user.id },
    orderBy: { lastSeenAt: 'desc' },
    take: 12
  });
  const existing = previous.find((session) => session.fingerprintHash === fingerprintHash);
  const reasons = [];
  if (!existing && previous.length > 0) reasons.push('new_device');
  if (prefix && previous.some((session) => session.ipPrefix && session.ipPrefix !== prefix)) reasons.push('new_network');
  if (location.country && previous.some((session) => session.country && session.country !== location.country)) reasons.push('new_country');
  const unusual = reasons.length > 0;
  const now = new Date();
  const data = {
    fingerprintHint,
    deviceName: clean(metadata.deviceName || parsed.deviceName),
    browser: clean(metadata.browser || parsed.browser),
    os: clean(metadata.os || parsed.os),
    userAgent,
    ipAddress: requestIp,
    ipPrefix: prefix,
    ...location,
    lastSeenAt: now,
    lastEvent: event,
    unusual,
    unusualReasons: reasons,
    metadata: {
      timezone: metadata.timezone || '',
      language: metadata.language || '',
      platform: metadata.platform || '',
      vendor: metadata.vendor || '',
      hardwareConcurrency: metadata.hardwareConcurrency || 0,
      deviceMemory: metadata.deviceMemory || 0,
      maxTouchPoints: metadata.maxTouchPoints || 0,
      screen: metadata.screen || ''
    }
  };

  const session = existing
    ? await ctx.prisma.userDeviceSession.update({
      where: { userId_fingerprintHash: { userId: user.id, fingerprintHash } },
      data: {
        ...data,
        loginCount: { increment: 1 }
      }
    })
    : await ctx.prisma.userDeviceSession.create({
      data: {
        userId: user.id,
        fingerprintHash,
        firstSeenAt: now,
        loginCount: 1,
        ...data
      }
    });

  return { session: publicSession(session), unusual, reasons };
};

export const securitySummaryForUser = async (prisma, userId) => {
  await ensureDeviceSessionTable(prisma);
  const sessions = await prisma.userDeviceSession.findMany({
    where: { userId },
    orderBy: { lastSeenAt: 'desc' }
  });
  const first = sessions.reduce((oldest, item) => (!oldest || item.firstSeenAt < oldest.firstSeenAt ? item : oldest), null);
  const last = sessions[0] || null;
  return {
    deviceCount: sessions.length,
    unusualCount: sessions.filter((item) => item.unusual).length,
    firstDevice: first ? publicSession(first) : null,
    lastDevice: last ? publicSession(last) : null,
    lastLocation: last ? [last.city, last.region, last.country].filter(Boolean).join(', ') || last.ipAddress || 'Unknown' : 'Unknown'
  };
};
