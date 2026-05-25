import nodemailer from 'nodemailer';
import dns from 'node:dns/promises';
import net from 'node:net';

const DEFAULT_FROM = 'noreply@tiwlo.com';
const SMTP_TIMEOUT_MS = Number(process.env.SMTP_TIMEOUT_MS || 8000);
export const REQUIRED_EMAIL_PORTS = [25, 465, 587, 993, 995];

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
  const secureFromInput = source.secureSSL ?? source.secure;
  const secure = secureFromInput !== undefined
    ? Boolean(secureFromInput)
    : String(process.env.SMTP_SECURE || '').toLowerCase() !== 'false' && port === 465;
  return {
    host: source.host || process.env.SMTP_HOST,
    port,
    secure,
    username: source.username || process.env.SMTP_USER,
    password: source.password || process.env.SMTP_PASS,
    fromEmail: source.fromEmail || process.env.MAIL_FROM || DEFAULT_FROM,
    fromName: source.fromName || process.env.MAIL_FROM_NAME || 'Tiwlo.com',
    replyTo: source.replyTo || process.env.MAIL_REPLY_TO || source.fromEmail || process.env.MAIL_FROM || DEFAULT_FROM
  };
}

export function emailServerAdvice(config = {}) {
  const port = Number(config.port || 465);
  return {
    host: config.host || '',
    port,
    secure: Boolean(config.secure),
    requiredPorts: REQUIRED_EMAIL_PORTS,
    allowlist: REQUIRED_EMAIL_PORTS.map((item) => `${item}/tcp`),
    message: `Allow SMTP/IMAP ports ${REQUIRED_EMAIL_PORTS.join(', ')} on the mail server firewall. Use ${port === 465 ? '465 SSL' : '587 STARTTLS'} for authenticated outgoing mail.`
  };
}

function createTransporter(config) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.username, pass: config.password },
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

export async function diagnoseSmtpConfig(config = {}) {
  const host = config.host || '';
  const port = Number(config.port || 465);
  const diagnostic = {
    host,
    port,
    secure: Boolean(config.secure),
    resolvedAddresses: [],
    dnsOk: false,
    tcpOk: false,
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

  const tcp = await checkTcpPort(host, port);
  diagnostic.tcpOk = Boolean(tcp.ok);
  diagnostic.tcpError = tcp.error;
  diagnostic.tcpCode = tcp.code;
  if (!tcp.ok) {
    return {
      ...diagnostic,
      stage: 'tcp',
      ok: false,
      code: tcp.code || 'TCP_FAILED',
      message: `Backend cannot connect to ${host}:${port}. Open this port on the VPS firewall, provider security group, and mail service listener.`
    };
  }

  return { ...diagnostic, stage: 'smtp', ok: true, message: `Backend can reach ${host}:${port}.` };
}

function smtpErrorMessage(error, config, diagnostic = {}) {
  const code = error?.code || '';
  const responseCode = Number(error?.responseCode || 0);
  const raw = error?.message || 'Unable to send test email.';

  if (code === 'EAUTH' || [454, 530, 534, 535, 538].includes(responseCode)) {
    return `SMTP authentication failed for ${config.username || 'the configured user'}. Check the mailbox exists on the mail server and the SMTP password is correct.`;
  }
  if (code === 'ESOCKET' || /ssl|tls|certificate|wrong version|self-signed/i.test(raw)) {
    return `SMTP TLS/SSL failed on ${config.host}:${config.port}. Use SSL/TLS on port 465, or use port 587 with SSL/TLS unchecked for STARTTLS.`;
  }
  if (['ECONNECTION', 'ECONNREFUSED', 'ETIMEDOUT', 'EHOSTUNREACH', 'ENOTFOUND'].includes(code)) {
    if (diagnostic.tcpOk) {
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
  await transporter.sendMail(message);
  return { sent: true, advice: emailServerAdvice(config) };
}

export async function testTiwloEmail(ctxOrPrisma, input = {}) {
  const prisma = getPrisma(ctxOrPrisma);
  const config = await systemEmailConfig(prisma, input.config || input);
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

  const diagnostic = await diagnoseSmtpConfig(config);
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
  try {
    const config = await systemEmailConfig(prisma, {
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
    console.warn('[email] send failed:', error?.message || error);
    return {
      sent: false,
      reason: 'send-failed',
      code: error?.code || String(error?.responseCode || ''),
      message: smtpErrorMessage(error, await systemEmailConfig(prisma))
    };
  }
}

export function paragraph(value) {
  return `<p style="margin:0 0 14px;">${escapeHtml(value)}</p>`;
}

export function cta(label, href) {
  return `<p style="margin:22px 0 0;"><a href="${escapeHtml(href)}" style="display:inline-block;background:#0069ff;color:#ffffff;text-decoration:none;border-radius:6px;padding:11px 16px;font-weight:bold;">${escapeHtml(label)}</a></p>`;
}
