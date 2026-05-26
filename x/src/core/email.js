import nodemailer from 'nodemailer';
import dns from 'node:dns/promises';
import net from 'node:net';

const DEFAULT_FROM = 'noreply@tiwlo.com';
const SMTP_TIMEOUT_MS = Number(process.env.SMTP_TIMEOUT_MS || 8000);
export const REQUIRED_EMAIL_PORTS = [25, 465, 587, 993, 995];
const FALSE_VALUES = new Set(['0', 'false', 'no', 'off', 'unchecked']);
const LOCAL_SMTP_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);

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

function envAuthFallbackConfig(config = {}) {
  const envPassword = process.env.SMTP_PASS;
  if (!envPassword || envPassword === config.password) return null;
  return {
    ...config,
    host: cleanHost(process.env.SMTP_HOST || config.host),
    port: Number(process.env.SMTP_PORT || config.port || 465),
    username: process.env.SMTP_USER || config.username,
    password: envPassword,
    secureSSL: process.env.SMTP_SECURE !== undefined ? process.env.SMTP_SECURE : config.secureSSL ?? config.secure,
    tlsRejectUnauthorized: config.tlsRejectUnauthorized,
    authSource: 'env'
  };
}

function domainFromMailConfig(config = {}) {
  const email = String(config.username || config.fromEmail || process.env.SMTP_USER || process.env.MAIL_FROM || '').trim();
  if (email.includes('@')) return cleanHost(email.split('@').pop());
  const host = cleanHost(config.tlsServername || config.host || process.env.SMTP_PUBLIC_HOST || process.env.SMTP_HOST || '');
  return cleanHost(host.replace(/^mail\./, '')) || 'tiwlo.com';
}

function localMailFallbackConfig(config = {}) {
  if (booleanValue(process.env.SMTP_DISABLE_LOCAL_FALLBACK, false)) return null;
  const currentHost = cleanHost(config.host || '');
  if (!currentHost || LOCAL_SMTP_HOSTS.has(currentHost)) return null;
  const domain = domainFromMailConfig(config);
  const tlsServername = cleanHost(config.tlsServername || process.env.SMTP_TLS_SERVERNAME || process.env.SMTP_PUBLIC_HOST || `mail.${domain}`);
  return {
    ...config,
    host: cleanHost(process.env.SMTP_LOCAL_HOST || '127.0.0.1'),
    port: Number(process.env.SMTP_LOCAL_PORT || config.port || process.env.SMTP_PORT || 465),
    secureSSL: process.env.SMTP_SECURE !== undefined ? process.env.SMTP_SECURE : config.secureSSL ?? config.secure ?? true,
    tlsServername,
    tlsRejectUnauthorized: config.tlsRejectUnauthorized,
    authSource: 'local-loopback'
  };
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
  return {
    host,
    port: mode.port,
    secure: mode.secure,
    secureSSL: mode.secure,
    requireTLS: mode.requireTLS,
    smtpMode: mode.label,
    tlsServername,
    tlsRejectUnauthorized: booleanValue(source.tlsRejectUnauthorized ?? process.env.SMTP_TLS_REJECT_UNAUTHORIZED, false),
    username: source.username || process.env.SMTP_USER,
    password: source.password || process.env.SMTP_PASS,
    fromEmail: source.fromEmail || process.env.MAIL_FROM || DEFAULT_FROM,
    fromName: source.fromName || process.env.MAIL_FROM_NAME || 'Tiwlo.com',
    replyTo: source.replyTo || process.env.MAIL_REPLY_TO || source.fromEmail || process.env.MAIL_FROM || DEFAULT_FROM
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
    auth: { user: config.username, pass: config.password },
    tls: {
      ...(tlsServername ? { servername: tlsServername } : {}),
      rejectUnauthorized: booleanValue(config.tlsRejectUnauthorized, false)
    },
    connectionTimeout: SMTP_TIMEOUT_MS,
    greetingTimeout: SMTP_TIMEOUT_MS,
    socketTimeout: SMTP_TIMEOUT_MS
  });
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
  try {
    await transporter.sendMail(message);
  } finally {
    transporter.close();
  }
  return { sent: true, advice: emailServerAdvice(config) };
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
  if (!diagnostic.ok && ['dns', 'tcp'].includes(diagnostic.stage)) {
    const fallbackConfig = localMailFallbackConfig(config);
    if (fallbackConfig) {
      const fallbackDiagnostic = await diagnoseSmtpConfig(fallbackConfig);
      if (fallbackDiagnostic.ok) {
        config = fallbackConfig;
        diagnostic = {
          ...fallbackDiagnostic,
          authSource: 'local-loopback',
          publicHost: diagnostic.host,
          publicStage: diagnostic.stage,
          publicCode: diagnostic.code
        };
      } else {
        diagnostic = {
          ...diagnostic,
          fallback: {
            stage: fallbackDiagnostic.stage,
            code: fallbackDiagnostic.code,
            host: fallbackDiagnostic.host,
            message: fallbackDiagnostic.message
          }
        };
      }
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
    if (['ECONNECTION', 'ECONNREFUSED', 'ETIMEDOUT', 'EHOSTUNREACH', 'ENOTFOUND', 'ESOCKET'].includes(error?.code) && config) {
      const fallbackConfig = localMailFallbackConfig(config);
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
                diagnostic: { ...retryDiagnostic, authSource: 'local-loopback' },
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

function brandedHtml({ title, preview, bodyHtml }) {
  const origin = appOrigin().replace(/\/$/, '');
  return `
    <div style="margin:0;padding:0;background:#f3f5f9;font-family:Arial,Helvetica,sans-serif;color:#111827;">
      <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preview || title)}</div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f5f9;padding:24px 12px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #e5e8ed;border-radius:8px;overflow:hidden;">
              <tr>
                <td style="padding:22px 24px;border-bottom:1px solid #eef2f7;">
                  <img src="${origin}/brand/logo.png" width="118" alt="Tiwlo" style="display:block;border:0;outline:none;text-decoration:none;">
                </td>
              </tr>
              <tr>
                <td style="padding:28px 24px;">
                  <h1 style="margin:0 0 14px;font-size:22px;line-height:1.25;color:#111827;">${escapeHtml(title)}</h1>
                  <div style="font-size:14px;line-height:1.7;color:#374151;">${bodyHtml}</div>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 24px;background:#f8f9fa;border-top:1px solid #eef2f7;font-size:12px;line-height:1.6;color:#6b7280;">
                  This email was sent by Tiwlo. If you did not request this, please contact support.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;
}

export async function sendTiwloEmail(ctxOrPrisma, { to, subject, title, preview, html, text, fromEmail, fromName, replyTo }) {
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
      html: brandedHtml({ title: title || subject, preview, bodyHtml: html || `<p>${escapeHtml(text || preview || subject)}</p>` })
    });
    return result;
  } catch (error) {
    if (['ECONNECTION', 'ECONNREFUSED', 'ETIMEDOUT', 'EHOSTUNREACH', 'ENOTFOUND', 'ESOCKET'].includes(error?.code) && config) {
      const fallbackConfig = localMailFallbackConfig(config);
      if (fallbackConfig) {
        try {
          const result = await deliverEmail(fallbackConfig, {
            to,
            from: `"${fallbackConfig.fromName}" <${fallbackConfig.fromEmail}>`,
            replyTo: fallbackConfig.replyTo,
            subject,
            text: text || preview || subject,
            html: brandedHtml({ title: title || subject, preview, bodyHtml: html || `<p>${escapeHtml(text || preview || subject)}</p>` })
          });
          return { ...result, authSource: 'local-loopback' };
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
            html: brandedHtml({ title: title || subject, preview, bodyHtml: html || `<p>${escapeHtml(text || preview || subject)}</p>` })
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
  return `<p style="margin:0 0 14px;">${escapeHtml(value)}</p>`;
}

export function cta(label, href) {
  return `<p style="margin:22px 0 0;"><a href="${escapeHtml(href)}" style="display:inline-block;background:#0069ff;color:#ffffff;text-decoration:none;border-radius:6px;padding:11px 16px;font-weight:bold;">${escapeHtml(label)}</a></p>`;
}
