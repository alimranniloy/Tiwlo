import jwt from 'jsonwebtoken';
import { AppError } from '../../core/errors.js';
import { sendTiwloEmail, emailServerAdvice, systemEmailConfig } from '../../core/email.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const MAILBOX_SCOPE = 'admin';
const MAILBOX_SCOPE_ID = 'main-admin';
const MAILBOX_KEY = 'mainAdmin:emailaccounts';

const normalizeAddress = (value = '') => String(value || '').trim().toLowerCase();
const now = () => new Date().toISOString();

function settingRecords(setting) {
  return Array.isArray(setting?.value?.records) ? setting.value.records : [];
}

async function readMailboxSetting(prisma) {
  return prisma.systemSetting.findUnique({
    where: { scope_scopeId_key: { scope: MAILBOX_SCOPE, scopeId: MAILBOX_SCOPE_ID, key: MAILBOX_KEY } }
  }).catch(() => null);
}

async function readMailboxRecords(prisma) {
  return settingRecords(await readMailboxSetting(prisma));
}

async function saveMailboxRecords(prisma, records) {
  return prisma.systemSetting.upsert({
    where: { scope_scopeId_key: { scope: MAILBOX_SCOPE, scopeId: MAILBOX_SCOPE_ID, key: MAILBOX_KEY } },
    create: {
      scope: MAILBOX_SCOPE,
      scopeId: MAILBOX_SCOPE_ID,
      key: MAILBOX_KEY,
      value: { section: 'emailAccounts', records }
    },
    update: { value: { section: 'emailAccounts', records } }
  });
}

function recordAddress(record) {
  return normalizeAddress(record?.data?.address || record?.title);
}

function mailboxHost(domain) {
  return `mail.${domain || 'tiwlo.com'}`;
}

function portalHost(domain) {
  return `email.${domain || 'tiwlo.com'}`;
}

function welcomeMessage(record) {
  const address = recordAddress(record);
  const domain = record?.data?.domain || address.split('@')[1] || 'tiwlo.com';
  return {
    id: `welcome-${record.id}`,
    mailboxId: record.id,
    folder: 'inbox',
    from: 'Tiwlo.com <noreply@tiwlo.com>',
    to: address,
    subject: 'Your Tiwlo Mail inbox is ready',
    body: [
      `Welcome to ${address}.`,
      '',
      `Sign in at https://${portalHost(domain)} with this email address and mailbox password.`,
      `Incoming host: ${mailboxHost(domain)} (IMAP 993 SSL)`,
      `Outgoing host: ${mailboxHost(domain)} (SMTP 465 SSL or 587 STARTTLS)`
    ].join('\n'),
    date: record.createdAt || now(),
    read: false,
    starred: false
  };
}

function messagesForRecord(record) {
  const messages = Array.isArray(record?.data?.messages) ? record.data.messages : [];
  return messages.length ? messages : [welcomeMessage(record)];
}

function publicAccount(record) {
  const address = recordAddress(record);
  const [username, addressDomain] = address.split('@');
  const domain = record?.data?.domain || addressDomain || 'tiwlo.com';
  const messages = messagesForRecord(record);
  const usageMB = messages.reduce((total, message) => total + Buffer.byteLength(`${message.subject || ''}${message.body || ''}`), 0) / 1024 / 1024;
  return {
    id: record.id,
    address,
    username: record?.data?.username || username || '',
    domain,
    hostName: record?.data?.hostName || mailboxHost(domain),
    imapHost: record?.data?.incoming?.host || record?.data?.hostName || mailboxHost(domain),
    smtpHost: record?.data?.outgoing?.host || record?.data?.hostName || mailboxHost(domain),
    portalHost: portalHost(domain),
    quotaMB: Number(record?.data?.quotaMB || record?.data?.quota || 1024),
    usageMB: Number(usageMB.toFixed(3)),
    status: record.status || 'active'
  };
}

function mailboxToken(record) {
  return jwt.sign({ kind: 'mailbox', mailboxId: record.id, address: recordAddress(record) }, JWT_SECRET, { expiresIn: '7d' });
}

async function recordFromToken(ctx, token) {
  if (!token) throw new AppError('Mailbox login is required.', 'UNAUTHENTICATED');
  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    throw new AppError('Mailbox session expired. Please sign in again.', 'UNAUTHENTICATED');
  }
  if (payload.kind !== 'mailbox' || !payload.mailboxId) {
    throw new AppError('Mailbox session is invalid.', 'UNAUTHENTICATED');
  }
  const records = await readMailboxRecords(ctx.prisma);
  const record = records.find((item) => item.id === payload.mailboxId && recordAddress(item) === normalizeAddress(payload.address));
  if (!record || record.status === 'disabled' || record.status === 'suspended') {
    throw new AppError('Mailbox is not available.', 'FORBIDDEN');
  }
  return { record, records };
}

function requireMailboxPassword(record, password) {
  const saved = String(record?.data?.password || '');
  if (!saved || String(password || '') !== saved) {
    throw new AppError('Invalid mailbox email or password.', 'UNAUTHENTICATED');
  }
}

export const loginMailbox = async (ctx, input) => {
  const address = normalizeAddress(input?.email || input?.address);
  const records = await readMailboxRecords(ctx.prisma);
  const record = records.find((item) => recordAddress(item) === address);
  if (!record) throw new AppError('Invalid mailbox email or password.', 'UNAUTHENTICATED');
  requireMailboxPassword(record, input?.password);
  return {
    token: mailboxToken(record),
    account: publicAccount(record)
  };
};

export const mailboxOverview = async (ctx, token) => {
  const { record } = await recordFromToken(ctx, token);
  return {
    account: publicAccount(record),
    messages: messagesForRecord(record).sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
  };
};

export const sendMailboxMessage = async (ctx, input) => {
  const { record, records } = await recordFromToken(ctx, input?.token);
  const account = publicAccount(record);
  const to = normalizeAddress(input?.to);
  const subject = String(input?.subject || '').trim();
  const body = String(input?.body || '').trim();
  if (!to || !subject || !body) throw new AppError('Recipient, subject, and message are required.', 'BAD_USER_INPUT');

  const result = await sendTiwloEmail(ctx, {
    to,
    fromEmail: account.address,
    fromName: account.username || account.address,
    replyTo: account.address,
    subject,
    title: subject,
    preview: body.slice(0, 160),
    text: body,
    html: body.split(/\r?\n/).map((line) => `<p style="margin:0 0 12px;">${line.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]))}</p>`).join('')
  });

  if (!result.sent) {
    const config = await systemEmailConfig(ctx.prisma);
    const advice = emailServerAdvice(config);
    throw new AppError(`Email could not be sent. ${advice.message}`, 'BAD_USER_INPUT');
  }

  const message = {
    id: `mail-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 8)}`,
    mailboxId: record.id,
    folder: 'sent',
    from: account.address,
    to,
    subject,
    body,
    date: now(),
    read: true,
    starred: false
  };

  const updatedRecords = records.map((item) => {
    if (item.id === record.id) {
      return {
        ...item,
        data: { ...(item.data || {}), messages: [...messagesForRecord(item).filter((mail) => !String(mail.id).startsWith('welcome-')), message] },
        updatedAt: now()
      };
    }
    if (recordAddress(item) === to) {
      return {
        ...item,
        data: {
          ...(item.data || {}),
          messages: [
            ...messagesForRecord(item).filter((mail) => !String(mail.id).startsWith('welcome-')),
            { ...message, id: `${message.id}-inbox`, mailboxId: item.id, folder: 'inbox', read: false }
          ]
        },
        updatedAt: now()
      };
    }
    return item;
  });
  await saveMailboxRecords(ctx.prisma, updatedRecords);
  return message;
};

export const updateMailboxMessage = async (ctx, input) => {
  const { record, records } = await recordFromToken(ctx, input?.token);
  const messages = messagesForRecord(record).map((message) => (
    message.id === input?.id
      ? {
          ...message,
          ...(input.read !== undefined ? { read: Boolean(input.read) } : {}),
          ...(input.folder ? { folder: input.folder } : {}),
          ...(input.starred !== undefined ? { starred: Boolean(input.starred) } : {})
        }
      : message
  ));
  const updated = messages.find((message) => message.id === input?.id);
  if (!updated) throw new AppError('Message was not found.', 'NOT_FOUND');
  await saveMailboxRecords(ctx.prisma, records.map((item) => (
    item.id === record.id ? { ...item, data: { ...(item.data || {}), messages }, updatedAt: now() } : item
  )));
  return updated;
};
