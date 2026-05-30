import jwt from 'jsonwebtoken';
import { createHash, randomInt, randomUUID } from 'node:crypto';
import { execFile, spawn } from 'node:child_process';
import { access, readdir, readFile, stat } from 'node:fs/promises';
import { AppError } from '../../core/errors.js';
import { paragraph, sendTiwloEmail, emailServerAdvice, systemEmailConfig } from '../../core/email.js';
import { defaultNameserversFor, getPowerDnsConfig, serverIpFor, syncPowerDnsDomain } from '../powerdns/service.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const MAILBOX_SCOPE = 'admin';
const MAILBOX_SCOPE_ID = 'main-admin';
const MAILBOX_KEY = 'mainAdmin:emailaccounts';
const MAILBOX_OTP_KEY = 'mainAdmin:mailboxRecoveryOtps';
const RECOVERY_OTP_TTL_MS = 10 * 60 * 1000;
const MAILBOX_HELPER = process.env.TIWLO_MAILBOX_HELPER || '/usr/local/sbin/tiwlo-mailbox-provision';
const MAILBOX_IMPORT_LIMIT = Number(process.env.TIWLO_MAILDIR_IMPORT_LIMIT || 80);

const normalizeAddress = (value = '') => String(value || '').trim().toLowerCase();
const now = () => new Date().toISOString();
const cleanMailboxDomain = (value = '') => normalizeAddress(value || 'tiwlo.com').replace(/^((mail|email|tmail|www)\.)+/, '').replace(/[^a-z0-9.-]/g, '').replace(/^\.+|\.+$/g, '') || 'tiwlo.com';
const cleanMailboxUser = (value = '') => normalizeAddress(value).split('@')[0].replace(/[^a-z0-9._-]/g, '').slice(0, 48);
const isEmail = (value = '') => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeAddress(value));
const otpHash = (value = '') => createHash('sha256').update(`${JWT_SECRET}:${value}`).digest('hex');

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

async function readRecoveryOtpRecords(prisma) {
  const setting = await prisma.systemSetting.findUnique({
    where: { scope_scopeId_key: { scope: MAILBOX_SCOPE, scopeId: MAILBOX_SCOPE_ID, key: MAILBOX_OTP_KEY } }
  }).catch(() => null);
  return Array.isArray(setting?.value?.records) ? setting.value.records : [];
}

async function saveRecoveryOtpRecords(prisma, records) {
  return prisma.systemSetting.upsert({
    where: { scope_scopeId_key: { scope: MAILBOX_SCOPE, scopeId: MAILBOX_SCOPE_ID, key: MAILBOX_OTP_KEY } },
    create: {
      scope: MAILBOX_SCOPE,
      scopeId: MAILBOX_SCOPE_ID,
      key: MAILBOX_OTP_KEY,
      value: { section: 'mailboxRecoveryOtps', records }
    },
    update: { value: { section: 'mailboxRecoveryOtps', records } }
  });
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

function mailboxLocalUser(record) {
  return cleanMailboxUser(record?.data?.username || recordAddress(record).split('@')[0]).slice(0, 31) || 'mailbox';
}

function mailboxHost(domain) {
  const baseDomain = normalizeAddress(domain || 'tiwlo.com').replace(/^((mail|email|tmail)\.)+/, '');
  return `mail.${baseDomain || 'tiwlo.com'}`;
}

function portalHost(domain) {
  const baseDomain = normalizeAddress(domain || 'tiwlo.com').replace(/^((mail|email|tmail)\.)+/, '');
  return `tmail.${baseDomain || 'tiwlo.com'}`;
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

function execFileQuiet(command, args, options = {}) {
  return new Promise((resolve) => {
    execFile(command, args, { timeout: 15000, windowsHide: true, ...options }, (error, stdout, stderr) => {
      resolve({ ok: !error, error, stdout: String(stdout || ''), stderr: String(stderr || '') });
    });
  });
}

function writeProcess(command, args, stdin) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: ['pipe', 'ignore', 'pipe'], windowsHide: true });
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (error) => resolve({ ok: false, error, stderr: error.message }));
    child.on('close', (code) => resolve({ ok: code === 0, stderr }));
    child.stdin.end(stdin);
  });
}

async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function provisionOsMailbox(record) {
  if (process.platform === 'win32' || String(process.env.TIWLO_DISABLE_OS_MAILBOX_PROVISION || '').toLowerCase() === 'true') {
    return { ok: false, skipped: true, reason: 'unsupported-platform' };
  }
  const address = recordAddress(record);
  const domain = cleanMailboxDomain(record?.data?.domain || address.split('@')[1]);
  const localUser = mailboxLocalUser(record);
  const password = String(record?.data?.password || '').trim();
  if (!address || !password || ['disabled', 'suspended'].includes(String(record?.status || '').toLowerCase())) {
    return { ok: false, skipped: true, reason: 'inactive-or-missing-password' };
  }

  if (await pathExists(MAILBOX_HELPER)) {
    const result = await execFileQuiet(MAILBOX_HELPER, [localUser, password, domain, address]);
    if (result.ok) return { ok: true, source: 'helper' };
    console.warn('[email] mailbox provision helper failed:', result.stderr || result.error?.message);
  }

  if (typeof process.getuid === 'function' && process.getuid() === 0) {
    const shellPath = await pathExists('/usr/sbin/nologin') ? '/usr/sbin/nologin' : '/bin/false';
    await execFileQuiet('useradd', ['-m', '-d', `/home/${localUser}`, '-s', shellPath, localUser]);
    const passwordResult = await writeProcess('chpasswd', [], `${localUser}:${password}\n`);
    await execFileQuiet('mkdir', ['-p', `/home/${localUser}/Maildir/cur`, `/home/${localUser}/Maildir/new`, `/home/${localUser}/Maildir/tmp`]);
    await execFileQuiet('chown', ['-R', `${localUser}:${localUser}`, `/home/${localUser}/Maildir`]);
    await execFileQuiet('chmod', ['-R', '700', `/home/${localUser}/Maildir`]);
    return { ok: Boolean(passwordResult.ok), source: 'root', error: passwordResult.stderr };
  }

  return { ok: false, skipped: true, reason: 'helper-not-installed' };
}

async function ensureMailboxDns(ctx, record) {
  const address = recordAddress(record);
  const domainName = cleanMailboxDomain(record?.data?.domain || address.split('@')[1]);
  if (!domainName) return null;
  const [config, nameservers, serverIp] = await Promise.all([
    getPowerDnsConfig(ctx).catch(() => null),
    defaultNameserversFor(ctx).catch(() => []),
    serverIpFor(ctx).catch(() => null)
  ]);
  const targetIp = serverIp || config?.serverIp;
  if (!targetIp) return null;
  const mailHost = mailboxHost(domainName);
  const spfAddress = targetIp.includes(':') ? `ip6:${targetIp}` : `ip4:${targetIp}`;
  const baseRecords = [
    { type: targetIp.includes(':') ? 'AAAA' : 'A', name: 'mail', value: targetIp, ttl: 300 },
    { type: targetIp.includes(':') ? 'AAAA' : 'A', name: 'tmail', value: targetIp, ttl: 300 },
    { type: targetIp.includes(':') ? 'AAAA' : 'A', name: 'email', value: targetIp, ttl: 300 },
    { type: 'MX', name: '@', value: mailHost, priority: 10, ttl: 300 },
    { type: 'TXT', name: '@', value: `v=spf1 mx a ${spfAddress} ~all`, ttl: 300 },
    { type: 'TXT', name: '_dmarc', value: `v=DMARC1; p=quarantine; rua=mailto:postmaster@${domainName}`, ttl: 300 }
  ];
  const owner = await ctx.prisma.user.findFirst({ orderBy: { createdAt: 'asc' }, select: { id: true } }).catch(() => null);
  if (!owner?.id) return null;
  const domain = await ctx.prisma.domain.upsert({
    where: { name: domainName },
    create: {
      ownerId: owner.id,
      name: domainName,
      dns: nameservers,
      status: 'active',
      records: baseRecords
    },
    update: {
      dns: nameservers,
      status: 'active',
      records: baseRecords
    }
  });
  for (const recordItem of baseRecords) {
    const id = `mail_${domain.id}_${recordItem.type.toLowerCase()}_${recordItem.name.replace(/[^a-z0-9_-]/gi, '_')}`;
    await ctx.prisma.dnsRecord.upsert({
      where: { id },
      create: {
        id,
        domainId: domain.id,
        type: recordItem.type,
        name: recordItem.name,
        value: recordItem.value,
        ttl: recordItem.ttl,
        priority: recordItem.priority,
        metadata: { provider: 'powerdns', source: 'tmail_auto_mailbox', managed: true }
      },
      update: {
        value: recordItem.value,
        ttl: recordItem.ttl,
        priority: recordItem.priority,
        status: 'active',
        metadata: { provider: 'powerdns', source: 'tmail_auto_mailbox', managed: true }
      }
    });
  }
  await syncPowerDnsDomain(ctx, domain.id).catch(() => null);
  return domain;
}

async function provisionMailboxRecord(ctx, record) {
  const [osResult] = await Promise.all([
    provisionOsMailbox(record),
    ensureMailboxDns(ctx, record).catch((error) => {
      console.warn('[email] mailbox DNS sync failed:', error?.message || error);
      return null;
    })
  ]);
  return osResult;
}

function parseHeaderBlock(raw = '') {
  const [headerText, ...bodyParts] = String(raw || '').split(/\r?\n\r?\n/);
  const unfolded = headerText.replace(/\r?\n[ \t]+/g, ' ');
  const headers = {};
  unfolded.split(/\r?\n/).forEach((line) => {
    const index = line.indexOf(':');
    if (index > 0) headers[line.slice(0, index).toLowerCase()] = line.slice(index + 1).trim();
  });
  return { headers, body: bodyParts.join('\n\n').trim() };
}

function cleanHeaderAddress(value = '') {
  const match = String(value || '').match(/<([^<>@\s]+@[^<>@\s]+)>/);
  return normalizeAddress(match?.[1] || String(value || '').split(',')[0]);
}

function decodeMimeWords(value = '') {
  return String(value || '').replace(/=\?utf-8\?q\?([^?]+)\?=/gi, (_, encoded) => (
    encoded.replace(/_/g, ' ').replace(/=([a-f0-9]{2})/gi, (hex, code) => String.fromCharCode(parseInt(code, 16)))
  ));
}

function safeMailDate(value, fallbackMs) {
  const parsed = value ? new Date(value) : null;
  if (parsed && !Number.isNaN(parsed.getTime())) return parsed.toISOString();
  return new Date(fallbackMs || Date.now()).toISOString();
}

async function importMaildirMessages(ctx, record, records) {
  const localUser = mailboxLocalUser(record);
  const maildir = `/home/${localUser}/Maildir`;
  if (!(await pathExists(maildir))) return { record, records };
  const existingMessages = messagesForRecord(record).filter((mail) => !String(mail.id).startsWith('welcome-'));
  const seen = new Set(existingMessages.map((mail) => mail.externalSource || mail.id));
  const files = [];
  for (const folder of ['new', 'cur']) {
    const dir = `${maildir}/${folder}`;
    if (!(await pathExists(dir))) continue;
    const names = await readdir(dir).catch(() => []);
    for (const name of names) {
      const path = `${dir}/${name}`;
      const info = await stat(path).catch(() => null);
      if (info?.isFile()) files.push({ folder, name, path, mtimeMs: info.mtimeMs });
    }
  }
  const imported = [];
  for (const file of files.sort((a, b) => b.mtimeMs - a.mtimeMs).slice(0, MAILBOX_IMPORT_LIMIT)) {
    const source = `maildir:${localUser}:${file.folder}:${file.name}`;
    if (seen.has(source)) continue;
    const raw = await readFile(file.path, 'utf8').catch(() => '');
    if (!raw) continue;
    const parsed = parseHeaderBlock(raw);
    imported.push({
      id: `external-${createHash('sha1').update(source).digest('hex').slice(0, 20)}`,
      mailboxId: record.id,
      folder: 'inbox',
      from: decodeMimeWords(parsed.headers.from || 'External sender'),
      to: cleanHeaderAddress(parsed.headers.to || recordAddress(record)) || recordAddress(record),
      subject: decodeMimeWords(parsed.headers.subject || '(no subject)'),
      body: parsed.body || stripMailBody(raw),
      date: safeMailDate(parsed.headers.date, file.mtimeMs),
      read: file.folder === 'cur' && /:2,.*S/.test(file.name),
      starred: false,
      externalSource: source
    });
    seen.add(source);
  }
  if (!imported.length) return { record, records };
  const nextRecord = {
    ...record,
    data: {
      ...(record.data || {}),
      messages: [...existingMessages, ...imported].sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime())
    },
    updatedAt: now()
  };
  const nextRecords = records.map((item) => (item.id === record.id ? nextRecord : item));
  await saveMailboxRecords(ctx.prisma, nextRecords);
  return { record: nextRecord, records: nextRecords };
}

function stripMailBody(raw = '') {
  return String(raw || '').split(/\r?\n\r?\n/).slice(1).join('\n\n').trim();
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

async function allowedMailboxDomains(ctx) {
  const config = await getPowerDnsConfig(ctx).catch(() => null);
  const domains = await ctx.prisma.domain.findMany({
    where: { status: { not: 'deleted' } },
    select: { name: true }
  }).catch(() => []);
  return Array.from(new Set([
    cleanMailboxDomain(config?.primaryDomain || process.env.TIWLO_MAIL_DOMAIN || process.env.APP_DOMAIN || 'tiwlo.com'),
    ...domains.map((item) => cleanMailboxDomain(item.name))
  ].filter(Boolean)));
}

export const requestMailboxRecoveryOtp = async (ctx, input = {}) => {
  const username = cleanMailboxUser(input.username || input.email);
  const requestedDomain = cleanMailboxDomain(input.domain || String(input.email || '').split('@').pop() || '');
  const domains = await allowedMailboxDomains(ctx);
  const domain = domains.includes(requestedDomain) ? requestedDomain : domains[0] || requestedDomain;
  const address = normalizeAddress(input.email || `${username}@${domain}`);
  const recoveryEmail = normalizeAddress(input.recoveryEmail);
  if (!username || username.length < 3) throw new AppError('Choose an email name first.', 'BAD_USER_INPUT');
  if (!isEmail(recoveryEmail)) throw new AppError('A valid recovery email is required.', 'BAD_USER_INPUT');
  if (recoveryEmail === address) throw new AppError('Recovery email must be different from the new TMail address.', 'BAD_USER_INPUT');

  const records = await readMailboxRecords(ctx.prisma);
  if (records.some((item) => recordAddress(item) === address)) {
    throw new AppError('That TMail address is already taken.', 'BAD_USER_INPUT');
  }

  const code = String(randomInt(100000, 999999));
  const expiresAt = new Date(Date.now() + RECOVERY_OTP_TTL_MS).toISOString();
  const existingOtps = await readRecoveryOtpRecords(ctx.prisma);
  const liveOtps = existingOtps.filter((item) => new Date(item.expiresAt).getTime() > Date.now());
  const nextRecord = {
    id: `recovery-otp-${randomUUID()}`,
    address,
    recoveryEmail,
    codeHash: otpHash(code),
    attempts: 0,
    createdAt: now(),
    expiresAt
  };
  await saveRecoveryOtpRecords(ctx.prisma, [
    nextRecord,
    ...liveOtps.filter((item) => !(item.address === address && item.recoveryEmail === recoveryEmail))
  ]);

  const otpDelivery = await sendTiwloEmail(ctx, {
    to: recoveryEmail,
    subject: 'Verify your TMail recovery email',
    title: 'Verify your recovery email',
    preview: `Your TMail verification code is ${code}`,
    text: `Use ${code} to verify the recovery email for ${address}. This code expires in 10 minutes.`,
    html: [
      paragraph(`Use this code to verify the recovery email for ${address}.`),
      `<div style="margin:22px 0;padding:16px 20px;border-radius:10px;background:#eef4ff;border:1px solid #cfe0ff;font-size:28px;letter-spacing:6px;font-weight:800;text-align:center;color:#0b63f6;">${code}</div>`,
      paragraph('This code expires in 10 minutes. If you did not request this, you can safely ignore the email.')
    ].join('')
  });
  if (!otpDelivery.sent) {
    throw new AppError(`Recovery OTP email could not be sent. ${otpDelivery.message || otpDelivery.reason || 'Check SMTP delivery.'}`, 'BAD_USER_INPUT');
  }

  return {
    ok: true,
    message: `OTP sent to ${recoveryEmail}.`,
    recoveryEmail,
    expiresAt
  };
};

async function verifyMailboxRecoveryOtp(ctx, { address, recoveryEmail, code }) {
  const normalizedCode = String(code || '').trim();
  if (!/^\d{6}$/.test(normalizedCode)) throw new AppError('Enter the 6 digit recovery email OTP.', 'BAD_USER_INPUT');
  const records = await readRecoveryOtpRecords(ctx.prisma);
  const liveRecords = records.filter((item) => new Date(item.expiresAt).getTime() > Date.now());
  const otpRecord = liveRecords.find((item) => item.address === address && item.recoveryEmail === recoveryEmail);
  if (!otpRecord) {
    await saveRecoveryOtpRecords(ctx.prisma, liveRecords);
    throw new AppError('Recovery email OTP expired. Send a new code.', 'BAD_USER_INPUT');
  }
  if (Number(otpRecord.attempts || 0) >= 5) {
    await saveRecoveryOtpRecords(ctx.prisma, liveRecords.filter((item) => item.id !== otpRecord.id));
    throw new AppError('Too many OTP attempts. Send a new code.', 'BAD_USER_INPUT');
  }
  if (otpRecord.codeHash !== otpHash(normalizedCode)) {
    await saveRecoveryOtpRecords(ctx.prisma, liveRecords.map((item) => (
      item.id === otpRecord.id ? { ...item, attempts: Number(item.attempts || 0) + 1 } : item
    )));
    throw new AppError('Recovery email OTP is incorrect.', 'BAD_USER_INPUT');
  }
  await saveRecoveryOtpRecords(ctx.prisma, liveRecords.filter((item) => item.id !== otpRecord.id));
  return true;
}

export const registerMailbox = async (ctx, input = {}) => {
  const username = cleanMailboxUser(input.username || input.email);
  const requestedDomain = cleanMailboxDomain(input.domain || String(input.email || '').split('@').pop() || '');
  const domains = await allowedMailboxDomains(ctx);
  const domain = domains.includes(requestedDomain) ? requestedDomain : domains[0] || requestedDomain;
  const address = normalizeAddress(`${username}@${domain}`);
  const password = String(input.password || '').trim();
  const recoveryEmail = normalizeAddress(input.recoveryEmail);
  if (!username || username.length < 3) throw new AppError('Choose an email name with at least 3 characters.', 'BAD_USER_INPUT');
  if (!/^[a-z0-9](?:[a-z0-9._-]{1,46}[a-z0-9])$/.test(username)) throw new AppError('Email name can use letters, numbers, dots, dashes, and underscores.', 'BAD_USER_INPUT');
  if (!password || password.length < 8) throw new AppError('Use a mailbox password with at least 8 characters.', 'BAD_USER_INPUT');
  if (!domains.includes(domain)) throw new AppError('This mail domain is not available for self signup.', 'BAD_USER_INPUT');
  if (!isEmail(recoveryEmail)) throw new AppError('A valid recovery email is required.', 'BAD_USER_INPUT');
  if (recoveryEmail === address) throw new AppError('Recovery email must be different from your TMail address.', 'BAD_USER_INPUT');

  const records = await readMailboxRecords(ctx.prisma);
  if (records.some((item) => recordAddress(item) === address)) {
    throw new AppError('That TMail address is already taken.', 'BAD_USER_INPUT');
  }
  await verifyMailboxRecoveryOtp(ctx, { address, recoveryEmail, code: input.recoveryOtp });

  const hostName = mailboxHost(domain);
  const nextRecord = {
    id: `mailbox-${randomUUID()}`,
    title: address,
    status: 'active',
    createdAt: now(),
    updatedAt: now(),
    data: {
      username,
      domain,
      address,
      password,
      displayName: String(input.displayName || username).trim().slice(0, 80),
      recoveryEmail,
      recoveryEmailVerifiedAt: now(),
      hostName,
      portalHost: portalHost(domain),
      quotaMB: Number(input.quotaMB || 1024),
      ssl: true,
      blueBadgeEnabled: false,
      bimi: { enabled: false, status: 'off' },
      incoming: { host: hostName, protocol: 'IMAP', port: 993, ssl: true },
      outgoing: { host: hostName, protocol: 'SMTP', port: 465, ssl: true },
      messages: []
    }
  };
  nextRecord.data.messages = [welcomeMessage(nextRecord)];
  await saveMailboxRecords(ctx.prisma, [...records, nextRecord]);
  await provisionMailboxRecord(ctx, nextRecord).catch((error) => {
    console.warn('[email] mailbox provisioning failed:', error?.message || error);
  });
  return {
    token: mailboxToken(nextRecord),
    account: publicAccount(nextRecord)
  };
};

export const loginMailbox = async (ctx, input) => {
  const address = normalizeAddress(input?.email || input?.address);
  const records = await readMailboxRecords(ctx.prisma);
  const record = records.find((item) => recordAddress(item) === address);
  if (!record) throw new AppError('Invalid mailbox email or password.', 'UNAUTHENTICATED');
  requireMailboxPassword(record, input?.password);
  provisionMailboxRecord(ctx, record).catch((error) => {
    console.warn('[email] mailbox login provisioning failed:', error?.message || error);
  });
  return {
    token: mailboxToken(record),
    account: publicAccount(record)
  };
};

export const mailboxOverview = async (ctx, token) => {
  const { record, records } = await recordFromToken(ctx, token);
  const synced = await importMaildirMessages(ctx, record, records).catch((error) => {
    console.warn('[email] maildir import failed:', error?.message || error);
    return { record, records };
  });
  return {
    account: publicAccount(synced.record),
    messages: messagesForRecord(synced.record).sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
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
    throw new AppError(`Email could not be sent. ${result.message || advice.message}`, 'BAD_USER_INPUT');
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

export const syncEmailAccountRecords = async (ctx, records = []) => {
  const mailboxRecords = Array.isArray(records) ? records : [];
  const results = [];
  for (const record of mailboxRecords) {
    if (!recordAddress(record)) continue;
    const result = await provisionMailboxRecord(ctx, record).catch((error) => ({
      ok: false,
      error: error?.message || String(error)
    }));
    results.push({ address: recordAddress(record), ...result });
  }
  return results;
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
