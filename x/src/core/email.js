import nodemailer from 'nodemailer';
import dns from 'node:dns/promises';
import net from 'node:net';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_FROM = 'noreply@tiwlo.com';
const SMTP_TIMEOUT_MS = Number(process.env.SMTP_TIMEOUT_MS || 8000);
export const REQUIRED_EMAIL_PORTS = [25, 465, 587, 993, 995];
const FALSE_VALUES = new Set(['0', 'false', 'no', 'off', 'unchecked']);
const LOCAL_SMTP_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);
const EMAIL_LOGO_CID = 'tiwlo-favicon@tiwlo';
const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../..');

function booleanValue(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  return !FALSE_VALUES.has(String(value).trim().toLowerCase());
}

function cleanHost(value = '') {
  return String(value || '')
    .trim()
    .replace(/^smtps?:\/\//i, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '');
}

function cleanMailBaseDomain(value = '') {
  return cleanHost(value).toLowerCase().replace(/^((mail|email|tmail)\.)+/, '') || 'tiwlo.com';
}

function localSmtpUsername(value = '') {
  return String(value || '').trim().split('@')[0].replace(/[^a-zA-Z0-9._-]/g, '') || 'noreply';
}

function extractEmailAddress(value = '') {
  const raw = String(value || '').trim();
  const match = raw.match(/<([^<>@\s]+@[^<>@\s]+)>/);
  return (match?.[1] || raw).replace(/^mailto:/i, '').trim().toLowerCase();
}

function hasEmailAddress(value = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(extractEmailAddress(value));
}

function isLegacySupportReplyTo(replyTo = '', fromEmail = '') {
  const replyAddress = extractEmailAddress(replyTo);
  const fromAddress = extractEmailAddress(fromEmail);
  if (!replyAddress || !fromAddress || replyAddress === fromAddress) return false;
  return /^support@/i.test(replyAddress);
}

function smtpAuthUsernameForHost(username = '', host = '') {
  const raw = String(username || '').trim();
  if (!raw) return raw;
  return LOCAL_SMTP_HOSTS.has(cleanHost(host)) && raw.includes('@') ? localSmtpUsername(raw) : raw;
}

function smtpModeForPort(port, secureInput) {
  const numericPort = Number(port || 465);
  if (numericPort === 465) {
    return { port: numericPort, secure: true, requireTLS: false, label: '465 SSL' };
  }
  if (numericPort === 587) {
    return { port: numericPort, secure: false, requireTLS: true, label: '587 STARTTLS' };
  }
  const secure = booleanValue(secureInput, numericPort === 465);
  return { port: numericPort, secure, requireTLS: false, label: secure ? `${numericPort} SSL` : `${numericPort} plain/STARTTLS` };
}

const isAuthFailure = (errorOrResult = {}) => {
  const responseCode = Number(errorOrResult.responseCode || 0);
  return errorOrResult.code === 'EAUTH' || [454, 530, 534, 535, 538].includes(responseCode);
};

const isConnectionOrHandshakeFailure = (errorOrResult = {}) => {
  const code = errorOrResult.code || '';
  const message = errorOrResult.message || errorOrResult.rawMessage || '';
  return ['ECONNECTION', 'ECONNREFUSED', 'ETIMEDOUT', 'EHOSTUNREACH', 'ENOTFOUND', 'ESOCKET', 'SMTP_VERIFY_FAILED'].includes(code) ||
    /ssl|tls|handshake|wrong version|greeting|socket/i.test(message);
};

const isMessagePolicyFailure = (errorOrResult = {}) => {
  const responseCode = Number(errorOrResult.responseCode || 0);
  return errorOrResult.code === 'EMESSAGE' || [550, 553, 554, 556].includes(responseCode);
};

const isTemporaryMessagePolicyFailure = (errorOrResult = {}) => {
  const responseCode = Number(errorOrResult.responseCode || 0);
  return errorOrResult.code === 'EMESSAGE' && responseCode >= 400 && responseCode < 500;
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function envAuthFallbackConfig(config = {}) {
  const envPassword = process.env.SMTP_PASS;
  if (!envPassword) return null;
  const host = cleanHost(process.env.SMTP_HOST || config.host);
  const username = smtpAuthUsernameForHost(process.env.SMTP_USER || config.username, host);
  const envFromEmail = process.env.MAIL_FROM || (String(process.env.SMTP_USER || '').includes('@') ? process.env.SMTP_USER : config.fromEmail);
  const fromEmail = config.fromEmail || envFromEmail;
  const replyTo = config.replyTo || fromEmail || process.env.MAIL_REPLY_TO;
  if (envPassword === config.password && username === config.username && host === cleanHost(config.host) && fromEmail === config.fromEmail) return null;
  return {
    ...config,
    host,
    port: Number(process.env.SMTP_PORT || config.port || 465),
    username,
    password: envPassword,
    secureSSL: process.env.SMTP_SECURE !== undefined ? process.env.SMTP_SECURE : config.secureSSL ?? config.secure,
    tlsRejectUnauthorized: config.tlsRejectUnauthorized,
    fromEmail,
    replyTo,
    authSource: 'env'
  };
}

function domainFromMailConfig(config = {}) {
  const email = String(config.username || config.fromEmail || process.env.SMTP_USER || process.env.MAIL_FROM || '').trim();
  if (email.includes('@')) return cleanMailBaseDomain(email.split('@').pop());
  const host = cleanHost(config.tlsServername || config.host || process.env.SMTP_PUBLIC_HOST || process.env.SMTP_HOST || '');
  return cleanMailBaseDomain(host);
}

function localMailFallbackConfig(config = {}) {
  return localMailFallbackConfigs(config)[0] || null;
}

function localMailFallbackConfigs(config = {}) {
  if (booleanValue(process.env.SMTP_DISABLE_LOCAL_FALLBACK, false)) return [];
  const currentHost = cleanHost(config.host || '');
  const domain = domainFromMailConfig(config);
  const tlsServername = cleanHost(config.tlsServername || process.env.SMTP_TLS_SERVERNAME || process.env.SMTP_PUBLIC_HOST || `mail.${domain}`);
  const localHost = cleanHost(process.env.SMTP_LOCAL_HOST || '127.0.0.1');
  const currentPort = Number(config.port || process.env.SMTP_PORT || 465);
  const currentMode = smtpModeForPort(currentPort, config.secureSSL ?? config.secure ?? process.env.SMTP_SECURE);
  const localUsername = smtpAuthUsernameForHost(config.username, localHost);
  const publicHost = cleanHost(config.publicHost || process.env.SMTP_PUBLIC_HOST || '');
  const candidates = [
    ...(publicHost && publicHost !== currentHost ? [{
      ...config,
      host: publicHost,
      username: smtpAuthUsernameForHost(config.username, publicHost),
      port: currentMode.port,
      secureSSL: currentMode.secure,
      secure: currentMode.secure,
      requireTLS: currentMode.requireTLS,
      tlsServername: cleanHost(config.tlsServername || publicHost),
      authSource: 'public-host-fallback'
    }] : []),
    {
      ...config,
      host: localHost,
      username: localUsername,
      port: currentMode.port,
      secureSSL: currentMode.secure,
      secure: currentMode.secure,
      requireTLS: currentMode.requireTLS,
      tlsServername,
      tlsRejectUnauthorized: config.tlsRejectUnauthorized,
      authSource: LOCAL_SMTP_HOSTS.has(currentHost) ? 'local-retry' : 'local-loopback'
    },
    {
      ...config,
      host: localHost,
      username: localUsername,
      port: 587,
      secureSSL: false,
      secure: false,
      requireTLS: true,
      tlsServername,
      tlsRejectUnauthorized: config.tlsRejectUnauthorized,
      authSource: 'local-starttls-fallback'
    },
    {
      ...config,
      host: localHost,
      username: localUsername,
      port: 465,
      secureSSL: true,
      secure: true,
      requireTLS: false,
      tlsServername,
      tlsRejectUnauthorized: config.tlsRejectUnauthorized,
      authSource: 'local-ssl-fallback'
    }
  ];
  const seen = new Set();
  return candidates.filter((item) => {
    const key = `${item.host}:${item.port}:${item.secureSSL ? 'ssl' : 'starttls'}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return item.host && item.port;
  });
}

function isSameSmtpMode(a = {}, b = {}) {
  const aMode = smtpModeForPort(a.port, a.secureSSL ?? a.secure);
  const bMode = smtpModeForPort(b.port, b.secureSSL ?? b.secure);
  return cleanHost(a.host) === cleanHost(b.host) && aMode.port === bMode.port && aMode.secure === bMode.secure && aMode.requireTLS === bMode.requireTLS;
}

async function tryLocalMailFallbackDiagnostics(config, originalDiagnostic = {}) {
  const failures = [];
  for (const fallbackConfig of localMailFallbackConfigs(config)) {
    if (isSameSmtpMode(fallbackConfig, config)) continue;
    const fallbackDiagnostic = await diagnoseSmtpConfig(fallbackConfig);
    if (fallbackDiagnostic.ok) {
      return {
        ok: true,
        config: fallbackConfig,
        diagnostic: {
          ...fallbackDiagnostic,
          authSource: fallbackConfig.authSource,
          publicHost: originalDiagnostic.host,
          publicStage: originalDiagnostic.stage,
          publicCode: originalDiagnostic.code,
          fallbacks: failures
        }
      };
    }
    failures.push({
      stage: fallbackDiagnostic.stage,
      code: fallbackDiagnostic.code,
      host: fallbackDiagnostic.host,
      port: fallbackDiagnostic.port,
      smtpMode: fallbackDiagnostic.smtpMode,
      message: fallbackDiagnostic.message
    });
  }
  return { ok: false, failures };
}

function getPrisma(ctxOrPrisma) {
  return ctxOrPrisma?.prisma || ctxOrPrisma;
}

export function appOrigin() {
  return process.env.FRONTEND_ORIGIN || process.env.PUBLIC_APP_URL || process.env.APP_URL || 'https://tiwlo.com';
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function readSavedSystemEmail(prisma) {
  if (!prisma) return {};
  const setting = await prisma.systemSetting.findUnique({
    where: { scope_scopeId_key: { scope: 'platform', scopeId: '', key: 'systemEmail' } }
  }).catch(() => null);
  return setting?.value || {};
}

export async function systemEmailConfig(prisma, override = {}) {
  const saved = await readSavedSystemEmail(prisma);
  const source = { ...saved, ...override };
  const port = Number(source.port || process.env.SMTP_PORT || 465);
  const host = cleanHost(source.host || process.env.SMTP_HOST || process.env.SMTP_LOCAL_HOST);
  const secureFromInput = source.secureSSL ?? source.secure;
  const mode = smtpModeForPort(port, secureFromInput ?? process.env.SMTP_SECURE);
  const tlsServername = cleanHost(source.tlsServername || process.env.SMTP_TLS_SERVERNAME || process.env.SMTP_PUBLIC_HOST || host);
  const username = smtpAuthUsernameForHost(source.username || process.env.SMTP_USER, host);
  const fromEmail = source.fromEmail || process.env.MAIL_FROM || (String(source.username || '').includes('@') ? source.username : DEFAULT_FROM);
  const sourceReplyTo = hasEmailAddress(source.replyTo) && !isLegacySupportReplyTo(source.replyTo, fromEmail)
    ? source.replyTo
    : '';
  return {
    host,
    publicHost: cleanHost(source.publicHost || process.env.SMTP_PUBLIC_HOST || ''),
    port: mode.port,
    secure: mode.secure,
    secureSSL: mode.secure,
    requireTLS: mode.requireTLS,
    smtpMode: mode.label,
    tlsServername,
    tlsRejectUnauthorized: booleanValue(source.tlsRejectUnauthorized ?? process.env.SMTP_TLS_REJECT_UNAUTHORIZED, false),
    username,
    password: source.password || process.env.SMTP_PASS,
    fromEmail,
    fromName: source.fromName || process.env.MAIL_FROM_NAME || 'Tiwlo.com',
    replyTo: sourceReplyTo || fromEmail || process.env.MAIL_REPLY_TO || DEFAULT_FROM
  };
}

function acceptedEmailResult(info = {}, config = {}) {
  const accepted = Array.isArray(info.accepted) ? info.accepted.map(String) : [];
  const rejected = Array.isArray(info.rejected) ? info.rejected.map(String) : [];
  if (accepted.length === 0) {
    const error = new Error(rejected.length
      ? `SMTP rejected recipient: ${rejected.join(', ')}`
      : 'SMTP did not accept the recipient address.');
    error.code = 'EENVELOPE';
    error.responseCode = 550;
    throw error;
  }
  return {
    sent: true,
    messageId: info.messageId || null,
    response: info.response || '',
    accepted,
    rejected,
    advice: emailServerAdvice(config)
  };
}

export function emailServerAdvice(config = {}) {
  const mode = smtpModeForPort(config.port || 465, config.secureSSL ?? config.secure);
  return {
    host: config.host || '',
    port: mode.port,
    secure: mode.secure,
    requireTLS: mode.requireTLS,
    smtpMode: mode.label,
    requiredPorts: REQUIRED_EMAIL_PORTS,
    allowlist: REQUIRED_EMAIL_PORTS.map((item) => `${item}/tcp`),
    message: `Allow SMTP/IMAP ports ${REQUIRED_EMAIL_PORTS.join(', ')} on the mail server firewall. Use ${mode.label} for authenticated outgoing mail.`
  };
}

function createTransporter(config) {
  const mode = smtpModeForPort(config.port, config.secureSSL ?? config.secure);
  const tlsServername = cleanHost(config.tlsServername || config.host);
  return nodemailer.createTransport({
    host: config.host,
    port: mode.port,
    secure: mode.secure,
    requireTLS: mode.requireTLS,
    auth: { user: smtpAuthUsernameForHost(config.username, config.host), pass: config.password },
    tls: {
      ...(tlsServername ? { servername: tlsServername } : {}),
      rejectUnauthorized: booleanValue(config.tlsRejectUnauthorized, false)
    },
    connectionTimeout: SMTP_TIMEOUT_MS,
    greetingTimeout: SMTP_TIMEOUT_MS,
    socketTimeout: SMTP_TIMEOUT_MS,
    ...dkimTransportOptions(config)
  });
}

function dkimPrivateKeyFromEnv() {
  const rawKey = process.env.TIWLO_DKIM_PRIVATE_KEY || process.env.DKIM_PRIVATE_KEY || '';
  if (rawKey) {
    if (/-----BEGIN [A-Z ]+PRIVATE KEY-----/.test(rawKey)) return rawKey.replace(/\\n/g, '\n');
    try {
      const decoded = Buffer.from(rawKey, 'base64').toString('utf8');
      if (/-----BEGIN [A-Z ]+PRIVATE KEY-----/.test(decoded)) return decoded;
    } catch {
      // Fall through to path-based key lookup.
    }
  }

  const rawBase64 = process.env.TIWLO_DKIM_PRIVATE_KEY_BASE64 || process.env.DKIM_PRIVATE_KEY_BASE64 || '';
  if (rawBase64) {
    try {
      const decoded = Buffer.from(rawBase64, 'base64').toString('utf8');
      if (/-----BEGIN [A-Z ]+PRIVATE KEY-----/.test(decoded)) return decoded;
    } catch {
      // Fall through to path-based key lookup.
    }
  }

  const keyPath = process.env.TIWLO_DKIM_PRIVATE_KEY_PATH || process.env.DKIM_PRIVATE_KEY_PATH || '';
  if (keyPath && existsSync(keyPath)) {
    try {
      return readFileSync(keyPath, 'utf8');
    } catch {
      return '';
    }
  }
  return '';
}

function dkimTransportOptions(config = {}) {
  const privateKey = dkimPrivateKeyFromEnv();
  const keySelector = process.env.TIWLO_DKIM_SELECTOR || process.env.DKIM_SELECTOR || '';
  const domainName = cleanMailBaseDomain(process.env.TIWLO_DKIM_DOMAIN || process.env.DKIM_DOMAIN || domainFromMailConfig(config));
  if (!privateKey || !keySelector || !domainName) return {};
  return {
    dkim: {
      domainName,
      keySelector,
      privateKey
    }
  };
}

function smtpEnvelopeFrom(config = {}) {
  if (hasEmailAddress(config.fromEmail)) return extractEmailAddress(config.fromEmail);
  if (hasEmailAddress(config.username)) return extractEmailAddress(config.username);
  const envFrom = process.env.MAIL_FROM;
  if (hasEmailAddress(envFrom)) return extractEmailAddress(envFrom);
  const user = localSmtpUsername(config.username || process.env.SMTP_USER || 'noreply');
  return `${user}@${domainFromMailConfig(config)}`;
}

function brandedAddress(name = 'Tiwlo', email = DEFAULT_FROM) {
  return `"${String(name || 'Tiwlo').replace(/"/g, "'")}" <${email}>`;
}

function deliveryMessage(config, message, { forceSafeFrom = false } = {}) {
  const envelopeFrom = smtpEnvelopeFrom(config);
  const requestedFromEmail = extractEmailAddress(message.from || config.fromEmail || envelopeFrom);
  const visibleFrom = forceSafeFrom
    ? brandedAddress(config.fromName || 'Tiwlo', envelopeFrom)
    : (message.from || brandedAddress(config.fromName || 'Tiwlo', config.fromEmail || envelopeFrom));
  const replyTo = message.replyTo || (requestedFromEmail && requestedFromEmail !== envelopeFrom ? requestedFromEmail : config.replyTo);
  return {
    ...message,
    from: visibleFrom,
    replyTo,
    sender: requestedFromEmail && requestedFromEmail !== envelopeFrom ? brandedAddress(config.fromName || 'Tiwlo', envelopeFrom) : message.sender,
    envelope: {
      from: envelopeFrom,
      to: message.to
    }
  };
}

function emailLogoAttachment() {
  if (!booleanValue(process.env.MAIL_INLINE_LOGO, false)) return null;
  const candidates = [
    process.env.MAIL_LOGO_PATH,
    resolve(repoRoot, 'public', 'brand', 'icon.png'),
    resolve(repoRoot, 'public', 'favicon.ico')
  ].filter(Boolean);
  const logoPath = candidates.find((item) => existsSync(item));
  if (!logoPath) return null;
  return {
    filename: 'tiwlo-favicon.png',
    path: logoPath,
    cid: EMAIL_LOGO_CID,
    contentDisposition: 'inline'
  };
}

function emailLogoSrc(origin = appOrigin()) {
  const configured = String(process.env.MAIL_LOGO_URL || '').trim();
  if (configured) return configured;
  if (booleanValue(process.env.MAIL_INLINE_LOGO, false) && emailLogoAttachment()) return `cid:${EMAIL_LOGO_CID}`;
  return `${String(origin || appOrigin()).replace(/\/$/, '')}/brand/logo.png`;
}

function stripHtml(value = '') {
  return String(value || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function policySafeMessage(message, headers = {}) {
  const text = message.text || stripHtml(message.html) || message.subject || 'Tiwlo notification';
  return {
    to: message.to,
    subject: message.subject,
    text,
    headers: {
      ...headers,
      'X-Tiwlo-Safe-Retry': 'plain-message'
    }
  };
}

async function checkTcpPort(host, port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port, timeout: SMTP_TIMEOUT_MS });
    const done = (ok, error = null) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve({
        ok,
        error: error?.message || null,
        code: error?.code || null
      });
    };
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false, { message: `Connection to ${host}:${port} timed out`, code: 'ETIMEDOUT' }));
    socket.once('error', (error) => done(false, error));
  });
}

async function checkSmtpHandshake(config) {
  const transporter = createTransporter(config);
  try {
    await transporter.verify();
    transporter.close();
    return { ok: true };
  } catch (error) {
    transporter.close();
    return {
      ok: false,
      error,
      code: error?.code || String(error?.responseCode || 'SMTP_VERIFY_FAILED'),
      responseCode: error?.responseCode || null,
      command: error?.command || null,
      message: error?.message || null
    };
  }
}

export async function diagnoseSmtpConfig(config = {}) {
  const host = cleanHost(config.host || '');
  const mode = smtpModeForPort(config.port || 465, config.secureSSL ?? config.secure);
  const diagnostic = {
    host,
    port: mode.port,
    secure: mode.secure,
    requireTLS: mode.requireTLS,
    smtpMode: mode.label,
    tlsServername: cleanHost(config.tlsServername || host),
    resolvedAddresses: [],
    dnsOk: false,
    tcpOk: false,
    smtpOk: false,
    tcpError: null,
    tcpCode: null
  };

  if (!host) {
    return { ...diagnostic, stage: 'config', ok: false, message: 'SMTP host is missing.' };
  }

  try {
    const addresses = await dns.lookup(host, { all: true });
    diagnostic.resolvedAddresses = addresses.map((item) => item.address);
    diagnostic.dnsOk = diagnostic.resolvedAddresses.length > 0;
  } catch (error) {
    return {
      ...diagnostic,
      stage: 'dns',
      ok: false,
      code: error?.code || 'DNS_ERROR',
      message: `SMTP host ${host} does not resolve from the backend server. Check the A/CNAME record.`
    };
  }

  const tcp = await checkTcpPort(host, mode.port);
  diagnostic.tcpOk = Boolean(tcp.ok);
  diagnostic.tcpError = tcp.error;
  diagnostic.tcpCode = tcp.code;
  if (!tcp.ok) {
    return {
      ...diagnostic,
      stage: 'tcp',
      ok: false,
      code: tcp.code || 'TCP_FAILED',
      message: `Backend cannot connect to ${host}:${mode.port}. Tiwlo will try the local mail listener next; if that also fails, start Postfix/Dovecot and open ${mode.port}/tcp.`
    };
  }

  const smtp = await checkSmtpHandshake({
    ...config,
    host,
    port: mode.port,
    secure: mode.secure,
    secureSSL: mode.secure,
    requireTLS: mode.requireTLS,
    tlsServername: diagnostic.tlsServername
  });

  if (!smtp.ok) {
    const authFailure = isAuthFailure(smtp);
    return {
      ...diagnostic,
      stage: authFailure ? 'smtp-auth' : 'smtp-handshake',
      ok: false,
      code: smtp.code,
      responseCode: smtp.responseCode,
      command: smtp.command,
      rawMessage: smtp.message,
      message: smtpErrorMessage(smtp.error, { ...config, host, port: mode.port, secure: mode.secure, requireTLS: mode.requireTLS }, diagnostic)
    };
  }

  return {
    ...diagnostic,
    smtpOk: true,
    stage: 'smtp',
    ok: true,
    message: `Backend can reach and authenticate with ${host}:${mode.port} using ${mode.label}.`
  };
}

function smtpErrorMessage(error, config, diagnostic = {}) {
  const code = error?.code || '';
  const responseCode = Number(error?.responseCode || 0);
  const raw = error?.message || 'Unable to send test email.';

  if (code === 'EAUTH' || [454, 530, 534, 535, 538].includes(responseCode)) {
    return `SMTP authentication failed for ${config.username || 'the configured user'}. Check the mailbox exists on the mail server and the SMTP password is correct.`;
  }
  if (code === 'ESOCKET' || /ssl|tls|certificate|wrong version|self-signed/i.test(raw)) {
    if (Number(config.port) === 465) {
      return `SMTP TLS/SSL failed on ${config.host}:465. Tiwlo now forces 465 as SSL; check that Postfix smtps is enabled, the mail certificate is valid, and the mail server is not expecting STARTTLS on this port.`;
    }
    if (Number(config.port) === 587) {
      return `SMTP STARTTLS failed on ${config.host}:587. Tiwlo now uses STARTTLS on 587; check that Postfix submission is enabled and TLS/auth are configured.`;
    }
    return `SMTP TLS/SSL failed on ${config.host}:${config.port}. Use 465 SSL or 587 STARTTLS for authenticated outgoing mail.`;
  }
  if (code === 'SMTP_VERIFY_FAILED') {
    if (Number(config.port) === 465) {
      return `SMTP 465 SSL handshake failed on ${config.host}. Postfix smtps must run with TLS wrapper mode; Tiwlo will also try 587 STARTTLS if enabled.`;
    }
    if (Number(config.port) === 587) {
      return `SMTP 587 STARTTLS handshake failed on ${config.host}. Check Postfix submission TLS/auth settings.`;
    }
    return `SMTP handshake failed on ${config.host}:${config.port}. Check the selected SSL/TLS mode and mail service listener.`;
  }
  if (['ECONNECTION', 'ECONNREFUSED', 'ETIMEDOUT', 'EHOSTUNREACH', 'ENOTFOUND'].includes(code)) {
    if (diagnostic.tcpOk) {
      if (Number(config.port) === 465) {
        return `TCP reaches ${config.host}:465, but the 465 SSL handshake did not complete. Enable Postfix smtps with TLS wrapper mode and restart Postfix/Dovecot.`;
      }
      if (Number(config.port) === 587) {
        return `TCP reaches ${config.host}:587, but STARTTLS did not complete. Enable Postfix submission with STARTTLS and restart Postfix/Dovecot.`;
      }
      return `TCP reaches ${config.host}:${config.port}, but SMTP did not complete. Check Postfix/Dovecot SMTP submission, TLS mode, and auth settings.`;
    }
    return `Cannot reach ${config.host}:${config.port}. Check DNS, firewall, provider security group, and whether SMTP is listening.`;
  }
  if (code === 'EMESSAGE') {
    if (responseCode >= 400 && responseCode < 500) {
      return `${raw} Postfix temporarily rejected the message. Tiwlo config now fails open for unavailable DKIM/policy milters; rerun the update script, then check: sudo postconf milter_default_action smtpd_milters non_smtpd_milters`;
    }
    return `${raw} Tiwlo will retry with the authenticated MAIL FROM identity; if it still fails, check Postfix content policy, DKIM milter, recipient restrictions, and sender domain alignment.`;
  }
  if (code === 'EENVELOPE' || responseCode >= 550) {
    return `SMTP server rejected the sender or recipient. Check From email ${config.fromEmail}, recipient address, SPF/DKIM/DMARC, and relay permissions.`;
  }
  return raw;
}

async function deliverEmail(config, message) {
  if (!config.host || !config.username || !config.password) {
    return { sent: false, reason: 'not-configured', advice: emailServerAdvice(config) };
  }
  const transporter = createTransporter(config);
  const logo = emailLogoAttachment();
  const attachments = [
    ...(Array.isArray(message.attachments) ? message.attachments : []),
    ...(logo ? [logo] : [])
  ];
  const headers = {
    'Auto-Submitted': 'auto-generated',
    'X-Auto-Response-Suppress': 'All',
    'X-Tiwlo-Transactional': 'yes',
    ...(message.headers || {})
  };
  try {
    const preparedMessage = { ...message, headers, attachments };
    try {
      const info = await transporter.sendMail(deliveryMessage(config, preparedMessage));
      return acceptedEmailResult(info, config);
    } catch (error) {
      const envelopeFrom = smtpEnvelopeFrom(config);
      const requestedFrom = extractEmailAddress(message.from || config.fromEmail || '');
      if (!isMessagePolicyFailure(error)) {
        throw error;
      }
      if (!isTemporaryMessagePolicyFailure(error) && (!requestedFrom || requestedFrom === envelopeFrom)) {
        throw error;
      }
      let lastError = error;
      const retryMessages = [
        preparedMessage,
        ...(logo ? [{ ...message, headers: { ...headers, 'X-Tiwlo-Safe-Retry': 'no-inline-logo' }, attachments: Array.isArray(message.attachments) ? message.attachments : [] }] : []),
        policySafeMessage(message, headers)
      ];
      if (isTemporaryMessagePolicyFailure(error)) {
        await delay(1200);
      }
      for (const retryMessage of retryMessages) {
        try {
          const info = await transporter.sendMail(deliveryMessage(config, retryMessage, { forceSafeFrom: true }));
          return acceptedEmailResult(info, config);
        } catch (retryError) {
          lastError = retryError;
          if (!isMessagePolicyFailure(retryError)) throw retryError;
          if (isTemporaryMessagePolicyFailure(retryError)) await delay(800);
        }
      }
      throw lastError;
    }
  } finally {
    transporter.close();
  }
}

export async function testTiwloEmail(ctxOrPrisma, input = {}) {
  const prisma = getPrisma(ctxOrPrisma);
  let config = await systemEmailConfig(prisma, input.config || input);
  const to = input.to || input.recipient;
  if (!to) return { ok: false, message: 'Test recipient email is required.', ...emailServerAdvice(config) };
  if (!config.host || !config.username || !config.password) {
    return {
      ok: false,
      stage: 'config',
      code: 'NOT_CONFIGURED',
      message: 'SMTP host, username, and password are required before Tiwlo can send email.',
      to,
      fromEmail: config.fromEmail,
      diagnostic: { host: config.host || '', port: config.port, secure: config.secure },
      ...emailServerAdvice(config)
    };
  }

  let diagnostic = await diagnoseSmtpConfig(config);
  if (!diagnostic.ok && ['dns', 'tcp', 'smtp-handshake'].includes(diagnostic.stage)) {
    const fallback = await tryLocalMailFallbackDiagnostics(config, diagnostic);
    if (fallback.ok) {
      config = fallback.config;
      diagnostic = fallback.diagnostic;
    } else if (fallback.failures.length) {
      diagnostic = {
        ...diagnostic,
        fallback: fallback.failures[0],
        fallbacks: fallback.failures
      };
    }
  }
  if (!diagnostic.ok && diagnostic.stage === 'smtp-auth') {
    const fallbackConfig = envAuthFallbackConfig(config);
    if (fallbackConfig) {
      const fallbackDiagnostic = await diagnoseSmtpConfig(fallbackConfig);
      if (fallbackDiagnostic.ok) {
        config = fallbackConfig;
        diagnostic = { ...fallbackDiagnostic, authSource: 'env-fallback' };
      } else {
        diagnostic = {
          ...diagnostic,
          fallback: {
            stage: fallbackDiagnostic.stage,
            code: fallbackDiagnostic.code,
            host: fallbackDiagnostic.host,
            port: fallbackDiagnostic.port,
            smtpMode: fallbackDiagnostic.smtpMode,
            message: fallbackDiagnostic.message
          }
        };
      }
    }
  }
  if (!diagnostic.ok) {
    return {
      ok: false,
      stage: diagnostic.stage,
      code: diagnostic.code,
      message: diagnostic.message,
      to,
      fromEmail: config.fromEmail,
      diagnostic,
      ...emailServerAdvice(config)
    };
  }

  try {
    const result = await deliverEmail(config, {
      to,
      from: `"${config.fromName}" <${config.fromEmail}>`,
      replyTo: config.replyTo,
      subject: input.subject || 'Tiwlo.com test email',
      text: 'This is a live SMTP test from Tiwlo.com.',
      html: brandedHtml({
        title: 'Tiwlo.com email test',
        preview: 'Your SMTP configuration can send email.',
        bodyHtml: [
          paragraph('Success. Tiwlo.com connected to your SMTP server and sent this test email.'),
          paragraph(emailServerAdvice(config).message)
        ].join('')
      })
    });
    if (!result.sent) {
      return {
        ok: false,
        stage: 'config',
        code: result.reason || 'SEND_FAILED',
        message: result.reason === 'not-configured' ? 'SMTP is not configured.' : 'SMTP send failed.',
        to,
        fromEmail: config.fromEmail,
        diagnostic,
        ...result.advice
      };
    }
    return {
      ok: true,
      stage: 'sent',
      code: 'OK',
      message: `Nodemailer sent a real test email to ${to}.`,
      to,
      fromEmail: config.fromEmail,
      diagnostic,
      ...result.advice
    };
  } catch (error) {
    if ((isConnectionOrHandshakeFailure(error) || isTemporaryMessagePolicyFailure(error)) && config) {
      for (const fallbackConfig of localMailFallbackConfigs(config)) {
        if (isSameSmtpMode(fallbackConfig, config)) continue;
        try {
          const retryDiagnostic = await diagnoseSmtpConfig(fallbackConfig);
          if (retryDiagnostic.ok) {
            const retryResult = await deliverEmail(fallbackConfig, {
              to,
              from: `"${fallbackConfig.fromName}" <${fallbackConfig.fromEmail}>`,
              replyTo: fallbackConfig.replyTo,
              subject: input.subject || 'Tiwlo.com test email',
              text: 'This is a live SMTP test from Tiwlo.com.',
              html: brandedHtml({
                title: 'Tiwlo.com email test',
                preview: 'Your SMTP configuration can send email.',
                bodyHtml: [
                  paragraph('Success. Tiwlo.com connected to your local mail server and sent this test email.'),
                  paragraph(emailServerAdvice(fallbackConfig).message)
                ].join('')
              })
            });
            if (retryResult.sent) {
              return {
                ok: true,
                stage: 'sent',
                code: 'OK',
                message: `Nodemailer sent a real test email to ${to}.`,
                to,
                fromEmail: fallbackConfig.fromEmail,
                diagnostic: { ...retryDiagnostic, authSource: fallbackConfig.authSource },
                ...retryResult.advice
              };
            }
          }
        } catch {
          // Report the original connection error below.
        }
      }
    }
    if (isAuthFailure(error)) {
      const fallbackConfig = envAuthFallbackConfig(config);
      if (fallbackConfig) {
        try {
          const retryDiagnostic = await diagnoseSmtpConfig(fallbackConfig);
          if (retryDiagnostic.ok) {
            const retryResult = await deliverEmail(fallbackConfig, {
              to,
              from: `"${fallbackConfig.fromName}" <${fallbackConfig.fromEmail}>`,
              replyTo: fallbackConfig.replyTo,
              subject: input.subject || 'Tiwlo.com test email',
              text: 'This is a live SMTP test from Tiwlo.com.',
              html: brandedHtml({
                title: 'Tiwlo.com email test',
                preview: 'Your SMTP configuration can send email.',
                bodyHtml: [
                  paragraph('Success. Tiwlo.com connected to your SMTP server and sent this test email.'),
                  paragraph(emailServerAdvice(fallbackConfig).message)
                ].join('')
              })
            });
            if (retryResult.sent) {
              return {
                ok: true,
                stage: 'sent',
                code: 'OK',
                message: `Nodemailer sent a real test email to ${to}.`,
                to,
                fromEmail: fallbackConfig.fromEmail,
                diagnostic: { ...retryDiagnostic, authSource: 'env-fallback' },
                ...retryResult.advice
              };
            }
          }
        } catch {
          // Keep the original auth error below.
        }
      }
    }
    const advice = emailServerAdvice(config);
    return {
      ok: false,
      stage: 'smtp-send',
      code: error?.code || String(error?.responseCode || 'SEND_FAILED'),
      message: smtpErrorMessage(error, config, diagnostic),
      to,
      fromEmail: config.fromEmail,
      diagnostic: {
        ...diagnostic,
        responseCode: error?.responseCode || null,
        command: error?.command || null,
        rawMessage: error?.message || null
      },
      ...advice
    };
  }
}

function brandedHtml({ title, preview, bodyHtml, brandName = 'Tiwlo', brandLabel = 'Secure notification' }) {
  const origin = appOrigin().replace(/\/$/, '');
  const logoSrc = emailLogoSrc(origin);
  return `
    <div style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#111827;">
      <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preview || title)}</div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;padding:28px 12px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #e5e7eb;border-radius:2px;overflow:hidden;">
              <tr>
                <td align="center" style="padding:24px 24px 18px;background:#ffffff;border-bottom:1px solid #f1f5f9;">
                  <img src="${escapeHtml(logoSrc)}" width="148" alt="${escapeHtml(brandName)}" style="display:block;width:148px;max-width:70%;height:auto;border:0;outline:none;text-decoration:none;color:#0f172a;font-size:18px;font-weight:800;">
                  <div style="padding-top:8px;font-size:11px;line-height:1.4;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:.08em;">${escapeHtml(brandLabel)}</div>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding:34px 24px 32px;background:#6f63ff;background-image:linear-gradient(135deg,#6b7cff 0%,#7c4dff 100%);">
                  <table role="presentation" cellspacing="0" cellpadding="0">
                    <tr><td align="center" width="56" height="56" style="width:56px;height:56px;border-radius:28px;background:#4ee1d2;color:#ffffff;font-size:34px;font-weight:800;line-height:56px;">✓</td></tr>
                  </table>
                  <div style="margin-top:14px;font-size:30px;line-height:1.15;font-weight:800;color:#ffffff;">${escapeHtml(title)}</div>
                  <div style="margin-top:8px;font-size:14px;line-height:1.6;color:#eef2ff;">${escapeHtml(preview || 'Your account update is ready.')}</div>
                </td>
              </tr>
              <tr>
                <td style="padding:28px 28px 24px;">
                  <div style="font-size:14px;line-height:1.75;color:#334155;">${bodyHtml}</div>
                  <div style="margin-top:26px;border-top:1px solid #eef2f7;padding-top:18px;text-align:center;font-size:11px;line-height:1.6;color:#94a3b8;">
                    This message was sent by ${escapeHtml(brandName)}.
                  </div>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding:18px 24px 24px;background:#ffffff;border-top:1px solid #f1f5f9;font-size:12px;line-height:1.6;color:#64748b;">
                  <strong style="color:#0f172a;">${escapeHtml(brandName)}</strong><br>
                  If you did not request this, contact support at ${escapeHtml(origin)}.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;
}

export async function sendTiwloEmail(ctxOrPrisma, { to, subject, title, preview, html, text, fromEmail, fromName, replyTo, headers, template = 'system' }) {
  const prisma = getPrisma(ctxOrPrisma);
  if (!prisma || !to) return { sent: false, reason: 'missing-recipient' };
  let config = null;
  try {
    config = await systemEmailConfig(prisma, {
      ...(fromEmail ? { fromEmail } : {}),
      ...(fromName ? { fromName } : {}),
      ...(replyTo ? { replyTo } : {})
    });
    if (!config.host || !config.username || !config.password) {
      console.warn('[email] SMTP systemEmail is not configured; skipped', subject);
      return { sent: false, reason: 'not-configured' };
    }
    const result = await deliverEmail(config, {
      to,
      from: `"${config.fromName}" <${config.fromEmail}>`,
      replyTo: config.replyTo,
      subject,
      text: text || preview || subject,
      headers,
      html: template === 'none' ? (html || `<p>${escapeHtml(text || preview || subject)}</p>`) : brandedHtml({
        title: title || subject,
        preview,
        bodyHtml: html || `<p>${escapeHtml(text || preview || subject)}</p>`,
        brandName: config.fromName || fromName || 'Tiwlo',
        brandLabel: extractEmailAddress(config.fromEmail || fromEmail || '') || 'Secure notification'
      })
    });
    return result;
  } catch (error) {
    if ((isConnectionOrHandshakeFailure(error) || isTemporaryMessagePolicyFailure(error)) && config) {
      for (const fallbackConfig of localMailFallbackConfigs(config)) {
        if (isSameSmtpMode(fallbackConfig, config)) continue;
        try {
          const result = await deliverEmail(fallbackConfig, {
            to,
            from: `"${fallbackConfig.fromName}" <${fallbackConfig.fromEmail}>`,
            replyTo: fallbackConfig.replyTo,
            subject,
            text: text || preview || subject,
            headers,
            html: template === 'none' ? (html || `<p>${escapeHtml(text || preview || subject)}</p>`) : brandedHtml({
              title: title || subject,
              preview,
              bodyHtml: html || `<p>${escapeHtml(text || preview || subject)}</p>`,
              brandName: fallbackConfig.fromName || fromName || 'Tiwlo',
              brandLabel: extractEmailAddress(fallbackConfig.fromEmail || fromEmail || '') || 'Secure notification'
            })
          });
          return { ...result, authSource: fallbackConfig.authSource };
        } catch {
          // Report the original connection failure below.
        }
      }
    }
    if (isAuthFailure(error) && config) {
      const fallbackConfig = envAuthFallbackConfig(config);
      if (fallbackConfig) {
        try {
          const result = await deliverEmail(fallbackConfig, {
            to,
            from: `"${fallbackConfig.fromName}" <${fallbackConfig.fromEmail}>`,
            replyTo: fallbackConfig.replyTo,
            subject,
            text: text || preview || subject,
            headers,
            html: template === 'none' ? (html || `<p>${escapeHtml(text || preview || subject)}</p>`) : brandedHtml({
              title: title || subject,
              preview,
              bodyHtml: html || `<p>${escapeHtml(text || preview || subject)}</p>`,
              brandName: fallbackConfig.fromName || fromName || 'Tiwlo',
              brandLabel: extractEmailAddress(fallbackConfig.fromEmail || fromEmail || '') || 'Secure notification'
            })
          });
          return { ...result, authSource: 'env-fallback' };
        } catch {
          // Report the original auth failure below.
        }
      }
    }
    console.warn('[email] send failed:', error?.message || error);
    return {
      sent: false,
      reason: 'send-failed',
      code: error?.code || String(error?.responseCode || ''),
      message: smtpErrorMessage(error, config || await systemEmailConfig(prisma))
    };
  }
}

export function paragraph(value) {
  return `<p style="margin:0 0 15px;color:#334155;">${escapeHtml(value)}</p>`;
}

export function cta(label, href) {
  return `<p style="margin:24px 0 4px;text-align:center;"><a href="${escapeHtml(href)}" style="display:inline-block;background:#0b63f6;color:#ffffff;text-decoration:none;border-radius:4px;padding:12px 20px;font-weight:bold;font-size:14px;">${escapeHtml(label)}</a></p>`;
}
