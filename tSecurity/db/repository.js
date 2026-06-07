import { ensureTSecuritySchema } from './schema.js';
import {
  addDays,
  clean,
  hashValue,
  json,
  normalizeEmail,
  normalizePhone,
  randomId,
  sha256,
  subnetForIp,
  toApi
} from '../utils.js';

export const insertGatewayChallenge = async (prisma, challenge) => {
  await ensureTSecuritySchema(prisma);
  await prisma.$executeRawUnsafe(`
    INSERT INTO "TSecurityGatewayChallenge" (
      "id", "serverPublicKey", "serverPrivateKey", "salt", "requestIp", "userAgent",
      "metadata", "expiresAt", "createdAt"
    )
    VALUES ($1, $2, $3, $4, $5, $6, CAST($7 AS jsonb), $8, CURRENT_TIMESTAMP)
  `, challenge.id, challenge.serverPublicKey, challenge.serverPrivateKey, challenge.salt, challenge.requestIp || '', challenge.userAgent || '', json(challenge.metadata || {}), challenge.expiresAt);
};

export const getGatewayChallenge = async (prisma, id) => {
  await ensureTSecuritySchema(prisma);
  const rows = await prisma.$queryRawUnsafe(`
    SELECT *
    FROM "TSecurityGatewayChallenge"
    WHERE "id" = $1
    LIMIT 1
  `, id);
  return rows?.[0] || null;
};

export const markGatewayChallengeUsed = async (prisma, id) => {
  await prisma.$executeRawUnsafe(`
    UPDATE "TSecurityGatewayChallenge"
    SET "usedAt" = COALESCE("usedAt", CURRENT_TIMESTAMP)
    WHERE "id" = $1
  `, id).catch(() => null);
};

export const insertGatewayTicket = async (prisma, ticket) => {
  await ensureTSecuritySchema(prisma);
  await prisma.$executeRawUnsafe(`
    INSERT INTO "TSecurityGatewayTicket" (
      "id", "tokenHash", "action", "verdict", "riskScore", "reasons", "payloadCiphertext",
      "emailHash", "phoneHash", "deviceHash", "ipAddress", "ipSubnet", "country",
      "metadata", "expiresAt", "createdAt", "updatedAt"
    )
    VALUES ($1, $2, $3, $4, $5, CAST($6 AS jsonb), CAST($7 AS jsonb), $8, $9, $10, $11, $12, $13, CAST($14 AS jsonb), $15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `, ticket.id, ticket.tokenHash, ticket.action, ticket.verdict, ticket.riskScore || 0, json(ticket.reasons || []),
  json(ticket.payloadCiphertext || null), ticket.emailHash || '', ticket.phoneHash || '', ticket.deviceHash || '',
  ticket.ipAddress || '', ticket.ipSubnet || '', ticket.country || '', json(ticket.metadata || {}), ticket.expiresAt);
};

export const findGatewayTicketByTokenHash = async (prisma, tokenHash) => {
  await ensureTSecuritySchema(prisma);
  const rows = await prisma.$queryRawUnsafe(`
    SELECT *
    FROM "TSecurityGatewayTicket"
    WHERE "tokenHash" = $1
    LIMIT 1
  `, tokenHash);
  return rows?.[0] || null;
};

export const markGatewayTicketUsed = async (prisma, id) => {
  await prisma.$executeRawUnsafe(`
    UPDATE "TSecurityGatewayTicket"
    SET "usedAt" = COALESCE("usedAt", CURRENT_TIMESTAMP), "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = $1
  `, id);
};

export const activeCooldownsForKeys = async (prisma, keys = []) => {
  await ensureTSecuritySchema(prisma);
  const hashes = keys.filter((item) => item?.keyHash).map((item) => item.keyHash);
  if (!hashes.length) return [];
  const placeholders = hashes.map((_, index) => `$${index + 1}`).join(', ');
  const rows = await prisma.$queryRawUnsafe(`
    SELECT *
    FROM "TSecurityCooldown"
    WHERE "keyHash" IN (${placeholders}) AND "blockedUntil" > CURRENT_TIMESTAMP
    ORDER BY "blockedUntil" DESC
  `, ...hashes);
  return toApi(rows || []);
};

export const upsertCooldown = async (prisma, entry) => {
  await ensureTSecuritySchema(prisma);
  await prisma.$executeRawUnsafe(`
    INSERT INTO "TSecurityCooldown" (
      "id", "keyType", "keyHash", "keyValue", "reason", "blockEventId", "blockedUntil", "createdAt", "updatedAt"
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("keyHash")
    DO UPDATE SET
      "keyType" = EXCLUDED."keyType",
      "keyValue" = EXCLUDED."keyValue",
      "reason" = EXCLUDED."reason",
      "blockEventId" = EXCLUDED."blockEventId",
      "blockedUntil" = GREATEST("TSecurityCooldown"."blockedUntil", EXCLUDED."blockedUntil"),
      "updatedAt" = CURRENT_TIMESTAMP
  `, randomId(), entry.keyType, entry.keyHash, entry.keyValue || '', entry.reason, entry.blockEventId || '', entry.blockedUntil);
};

export const insertBlockEvent = async (prisma, event) => {
  await ensureTSecuritySchema(prisma);
  const id = event.id || randomId();
  await prisma.$executeRawUnsafe(`
    INSERT INTO "TSecurityBlockEvent" (
      "id", "userId", "email", "phone", "ipAddress", "ipSubnet", "country", "deviceHash",
      "eventType", "status", "reason", "reasons", "riskScore", "requestId",
      "payloadHash", "blockedUntil", "metadata", "createdAt", "updatedAt"
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'blocked', $10, CAST($11 AS jsonb), $12, $13, $14, $15, CAST($16 AS jsonb), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `, id, event.userId || '', event.email || '', event.phone || '', event.ipAddress || '', event.ipSubnet || '',
  event.country || '', event.deviceHash || '', event.eventType || 'gateway', event.reason, json(event.reasons || []),
  event.riskScore || 0, event.requestId || '', event.payloadHash || '', event.blockedUntil || null, json(event.metadata || {}));
  return id;
};

export const writeCooldownsForBlock = async (prisma, context, blockEventId, reason, policy) => {
  const blockedUntil = context.blockedUntil || addDays(policy.cooldownDays || 90);
  const entries = cooldownKeysFromContext(context)
    .filter((item) => item.keyHash)
    .map((item) => ({ ...item, blockEventId, reason, blockedUntil }));
  await Promise.all(entries.map((entry) => upsertCooldown(prisma, entry)));
  return blockedUntil;
};

export const cooldownKeysFromContext = (context = {}) => {
  const email = normalizeEmail(context.email);
  const phone = clean(context.phone);
  const deviceHash = clean(context.deviceHash);
  const ip = clean(context.ipAddress);
  const subnet = clean(context.ipSubnet || subnetForIp(ip));
  return [
    email ? { keyType: 'email', keyValue: email, keyHash: hashValue(`email:${email}`) } : null,
    phone ? { keyType: 'phone', keyValue: phone, keyHash: hashValue(`phone:${phone}`) } : null,
    deviceHash ? { keyType: 'device', keyValue: deviceHash, keyHash: hashValue(`device:${deviceHash}`) } : null,
    ip ? { keyType: 'ip', keyValue: ip, keyHash: hashValue(`ip:${ip}`) } : null,
    subnet ? { keyType: 'subnet', keyValue: subnet, keyHash: hashValue(`subnet:${subnet}`) } : null
  ].filter(Boolean);
};

export const contextFromPayload = ({ action, payload = {}, request = {}, deviceHash = '' }) => {
  const email = normalizeEmail(payload.email || payload.form?.email);
  const phone = normalizePhone({
    phone: payload.phone || payload.form?.phone,
    mobileCountryCode: payload.mobileCountryCode || payload.form?.mobileCountryCode
  });
  const ipAddress = clean(request.ipAddress);
  const ipSubnet = subnetForIp(ipAddress);
  return {
    action,
    email,
    phone,
    deviceHash,
    ipAddress,
    ipSubnet,
    country: clean(payload.country || payload.form?.country || request.country).toUpperCase(),
    payloadHash: sha256(JSON.stringify({
      action,
      email,
      phone,
      deviceHash,
      ipAddress,
      ipSubnet
    }))
  };
};

export const blockKnownUserByEmail = async (prisma, email, reason) => {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  const user = await prisma.user.findUnique({ where: { email: normalized } }).catch(() => null);
  if (!user) return null;
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { status: 'blocked' }
  }).catch(() => null);
  return updated ? { id: updated.id, email: updated.email, status: updated.status, reason } : null;
};

export const countRecentSignupTicketsForSubnet = async (prisma, subnet, windowMinutes) => {
  if (!subnet) return 0;
  await ensureTSecuritySchema(prisma);
  const rows = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*)::int AS "count"
    FROM "TSecurityGatewayTicket"
    WHERE "action" = 'signup'
      AND "ipSubnet" = $1
      AND "createdAt" > CURRENT_TIMESTAMP - ($2::int * INTERVAL '1 minute')
  `, subnet, Number(windowMinutes || 30));
  return Number(rows?.[0]?.count || 0);
};

export const listBlockEvents = async (prisma, { search = '', reason = '', limit = 100, offset = 0 } = {}) => {
  await ensureTSecuritySchema(prisma);
  const clauses = [];
  const params = [];
  if (search) {
    params.push(`%${search}%`);
    const index = params.length;
    clauses.push(`("email" ILIKE $${index} OR "phone" ILIKE $${index} OR "ipAddress" ILIKE $${index} OR "deviceHash" ILIKE $${index} OR "reason" ILIKE $${index})`);
  }
  if (reason) {
    params.push(reason);
    clauses.push(`"reason" = $${params.length}`);
  }
  params.push(Math.max(1, Math.min(500, Number(limit || 100))));
  const limitIndex = params.length;
  params.push(Math.max(0, Number(offset || 0)));
  const offsetIndex = params.length;
  const rows = await prisma.$queryRawUnsafe(`
    SELECT *
    FROM "TSecurityBlockEvent"
    ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
    ORDER BY "createdAt" DESC
    LIMIT $${limitIndex} OFFSET $${offsetIndex}
  `, ...params);
  return toApi(rows || []);
};

export const blockSummary = async (prisma) => {
  await ensureTSecuritySchema(prisma);
  const [totals, cooldowns, reasons, subnets] = await Promise.all([
    prisma.$queryRawUnsafe(`
      SELECT
        COUNT(*)::int AS "totalBlocked",
        COUNT(*) FILTER (WHERE "createdAt" > CURRENT_TIMESTAMP - INTERVAL '24 hours')::int AS "blocked24h",
        COUNT(DISTINCT NULLIF("email", ''))::int AS "uniqueEmails",
        COUNT(DISTINCT NULLIF("deviceHash", ''))::int AS "uniqueDevices"
      FROM "TSecurityBlockEvent"
    `),
    prisma.$queryRawUnsafe(`
      SELECT COUNT(*)::int AS "activeCooldowns"
      FROM "TSecurityCooldown"
      WHERE "blockedUntil" > CURRENT_TIMESTAMP
    `),
    prisma.$queryRawUnsafe(`
      SELECT "reason", COUNT(*)::int AS "count"
      FROM "TSecurityBlockEvent"
      WHERE "createdAt" > CURRENT_TIMESTAMP - INTERVAL '30 days'
      GROUP BY "reason"
      ORDER BY "count" DESC, "reason" ASC
      LIMIT 8
    `),
    prisma.$queryRawUnsafe(`
      SELECT COUNT(DISTINCT NULLIF("ipSubnet", ''))::int AS "blockedSubnets"
      FROM "TSecurityBlockEvent"
      WHERE "ipSubnet" <> ''
    `)
  ]);
  return toApi({
    ...(totals?.[0] || {}),
    ...(cooldowns?.[0] || {}),
    ...(subnets?.[0] || {}),
    topReasons: reasons || []
  });
};
