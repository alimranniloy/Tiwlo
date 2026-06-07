import crypto from 'node:crypto';
import { getGatewayChallenge, insertGatewayChallenge, markGatewayChallengeUsed } from '../db/repository.js';
import { ensureTSecuritySchema } from '../db/schema.js';
import { addSeconds, base64url, fromBase64url, json, randomId, TSecurityError } from '../utils.js';
import { DEFAULT_POLICY } from '../config.js';

const ECDH_CURVE = 'prime256v1';
const GATEWAY_INFO = Buffer.from('tiwlo-tsecurity-gateway-v1');
const STORAGE_INFO = Buffer.from('tiwlo-tsecurity-storage-v1');

const storageRootSecret = () => process.env.TSECURITY_STORAGE_SECRET || process.env.JWT_SECRET || 'dev-secret';

const hkdf = (secret, salt, info = GATEWAY_INFO) => Buffer.from(
  crypto.hkdfSync('sha256', Buffer.from(secret), Buffer.from(salt), Buffer.from(info), 32)
);

const aesGcmEncrypt = (key, payload, aad = '') => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  if (aad) cipher.setAAD(Buffer.from(aad));
  const body = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    iv: base64url(iv),
    data: base64url(Buffer.concat([body, tag]))
  };
};

const aesGcmDecrypt = (key, sealed, aad = '') => {
  const iv = fromBase64url(sealed?.iv || '');
  const encrypted = fromBase64url(sealed?.data || '');
  if (iv.length !== 12 || encrypted.length <= 16) {
    throw new TSecurityError('Malformed encrypted payload.', 'BAD_USER_INPUT');
  }
  const body = encrypted.subarray(0, -16);
  const tag = encrypted.subarray(-16);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  if (aad) decipher.setAAD(Buffer.from(aad));
  decipher.setAuthTag(tag);
  const text = Buffer.concat([decipher.update(body), decipher.final()]).toString('utf8');
  return JSON.parse(text);
};

export const createGatewayChallenge = async (prisma, request = {}, policy = DEFAULT_POLICY) => {
  await ensureTSecuritySchema(prisma);
  const ecdh = crypto.createECDH(ECDH_CURVE);
  ecdh.generateKeys();
  const id = randomId();
  const salt = crypto.randomBytes(16);
  const expiresAt = addSeconds(policy.challengeTtlSeconds || DEFAULT_POLICY.challengeTtlSeconds);
  await insertGatewayChallenge(prisma, {
    id,
    serverPublicKey: base64url(ecdh.getPublicKey()),
    serverPrivateKey: base64url(ecdh.getPrivateKey()),
    salt: base64url(salt),
    requestIp: request.ipAddress || '',
    userAgent: request.userAgent || '',
    metadata: { route: request.route || '' },
    expiresAt
  });
  return {
    id,
    key: base64url(ecdh.getPublicKey()),
    salt: base64url(salt),
    alg: 'ECDH-P256+A256GCM',
    expiresAt: expiresAt.toISOString()
  };
};

export const openGatewayEnvelope = async (prisma, envelope = {}) => {
  const challengeId = envelope.cid || envelope.challengeId || '';
  const challenge = await getGatewayChallenge(prisma, challengeId);
  if (!challenge) throw new TSecurityError('Security sync expired. Please retry.', 'TSECURITY_CHALLENGE_EXPIRED');
  if (challenge.usedAt) throw new TSecurityError('Security sync was already used. Please retry.', 'TSECURITY_CHALLENGE_REPLAYED');
  if (new Date(challenge.expiresAt).getTime() < Date.now()) {
    throw new TSecurityError('Security sync expired. Please retry.', 'TSECURITY_CHALLENGE_EXPIRED');
  }

  const clientPublicKey = fromBase64url(envelope.pub || envelope.clientPublicKey || '');
  const ecdh = crypto.createECDH(ECDH_CURVE);
  ecdh.setPrivateKey(fromBase64url(challenge.serverPrivateKey));
  const shared = ecdh.computeSecret(clientPublicKey);
  const key = hkdf(shared, fromBase64url(challenge.salt), GATEWAY_INFO);
  const payload = aesGcmDecrypt(key, { iv: envelope.iv, data: envelope.data }, challenge.id);
  await markGatewayChallengeUsed(prisma, challenge.id);
  return {
    challenge,
    payload,
    seal: (responsePayload) => aesGcmEncrypt(key, responsePayload, challenge.id)
  };
};

const storageKey = () => {
  const root = crypto.createHash('sha256').update(storageRootSecret()).digest();
  return hkdf(root, Buffer.from('tSecurity-storage-salt'), STORAGE_INFO);
};

export const encryptTicketPayload = (payload = {}) => aesGcmEncrypt(storageKey(), payload, 'ticket');

export const decryptTicketPayload = (sealed = {}) => aesGcmDecrypt(storageKey(), sealed, 'ticket');

export const sealedResponse = (seal, payload) => ({
  sealed: true,
  ...seal(payload)
});

export const parseGatewayBody = (body = {}) => {
  if (!body || typeof body !== 'object') throw new TSecurityError('Security payload is required.', 'BAD_USER_INPUT');
  if (body.sealed && body.cid && body.pub && body.iv && body.data) return body;
  if (body.payload && typeof body.payload === 'object') return body.payload;
  throw new TSecurityError('Encrypted security payload is required.', 'BAD_USER_INPUT', { expected: 'sealed' });
};

export const safeTicketPayload = (payload = {}) => {
  const clone = JSON.parse(json(payload));
  if (clone.password) clone.password = '[redacted]';
  if (clone.form?.password) clone.form.password = '[redacted]';
  return clone;
};
