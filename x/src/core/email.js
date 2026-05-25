import nodemailer from 'nodemailer';

const DEFAULT_FROM = 'noreply@tiwlo.app';

function getPrisma(ctxOrPrisma) {
  return ctxOrPrisma?.prisma || ctxOrPrisma;
}

export function appOrigin() {
  return process.env.FRONTEND_ORIGIN || process.env.PUBLIC_APP_URL || process.env.APP_URL || 'https://tiwlo.app';
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function systemEmailConfig(prisma) {
  const setting = await prisma.systemSetting.findUnique({
    where: { scope_scopeId_key: { scope: 'platform', scopeId: '', key: 'systemEmail' } }
  }).catch(() => null);
  const saved = setting?.value || {};
  const port = Number(saved.port || process.env.SMTP_PORT || 465);
  return {
    host: saved.host || process.env.SMTP_HOST,
    port,
    secure: saved.secureSSL !== undefined ? Boolean(saved.secureSSL) : String(process.env.SMTP_SECURE || '').toLowerCase() !== 'false' && port === 465,
    username: saved.username || process.env.SMTP_USER,
    password: saved.password || process.env.SMTP_PASS,
    fromEmail: saved.fromEmail || process.env.MAIL_FROM || DEFAULT_FROM,
    fromName: saved.fromName || process.env.MAIL_FROM_NAME || 'Tiwlo',
    replyTo: saved.replyTo || process.env.MAIL_REPLY_TO || saved.fromEmail || process.env.MAIL_FROM || DEFAULT_FROM
  };
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

export async function sendTiwloEmail(ctxOrPrisma, { to, subject, title, preview, html, text }) {
  const prisma = getPrisma(ctxOrPrisma);
  if (!prisma || !to) return { sent: false, reason: 'missing-recipient' };
  try {
    const config = await systemEmailConfig(prisma);
    if (!config.host || !config.username || !config.password) {
      console.warn('[email] SMTP systemEmail is not configured; skipped', subject);
      return { sent: false, reason: 'not-configured' };
    }
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.username, pass: config.password }
    });
    await transporter.sendMail({
      to,
      from: `"${config.fromName}" <${config.fromEmail}>`,
      replyTo: config.replyTo,
      subject,
      text: text || preview || subject,
      html: brandedHtml({ title: title || subject, preview, bodyHtml: html || `<p>${escapeHtml(text || preview || subject)}</p>` })
    });
    return { sent: true };
  } catch (error) {
    console.warn('[email] send failed:', error?.message || error);
    return { sent: false, reason: 'send-failed' };
  }
}

export function paragraph(value) {
  return `<p style="margin:0 0 14px;">${escapeHtml(value)}</p>`;
}

export function cta(label, href) {
  return `<p style="margin:22px 0 0;"><a href="${escapeHtml(href)}" style="display:inline-block;background:#0069ff;color:#ffffff;text-decoration:none;border-radius:6px;padding:11px 16px;font-weight:bold;">${escapeHtml(label)}</a></p>`;
}
