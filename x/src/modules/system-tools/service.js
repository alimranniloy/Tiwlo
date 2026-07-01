import { ZipArchive } from 'archiver';
import express from 'express';
import { google } from 'googleapis';
import multer from 'multer';
import unzipper from 'unzipper';
import { createReadStream, createWriteStream } from 'node:fs';
import { constants as fsConstants } from 'node:fs';
import { access, cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { execFile, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { resolve4, resolve6 } from 'node:dns/promises';
import net from 'node:net';
import tls from 'node:tls';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPowerDnsConfig, syncPowerDnsDomain } from '../powerdns/service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const fallbackRootDir = resolve(__dirname, '../../../..');
const backupJobs = new Map();
const sslJobs = new Map();
let autoTimer = null;
let autoRunning = false;
let sslAutoTimer = null;
let sslAutoRunning = false;
let sslRunChain = Promise.resolve();
let restartScheduled = false;

const BACKUP_KEY = 'backupAutomation';
const LAST_AUTO_BACKUP_KEY = 'backupAutomationState';
const SSL_KEY = 'sslAutomation';
const LAST_SSL_KEY = 'sslAutomationState';
const DEFAULT_BACKUP_CONFIG = {
  autoEnabled: false,
  intervalMinutes: 360,
  localRetention: 1,
  googleDriveEnabled: false,
  googleDriveFolderId: '',
  googleServiceAccountPath: '',
  googleServiceAccountJson: '',
  driveRetention: 1,
  uploadManualToDrive: false
};
const DEFAULT_SSL_CONFIG = {
  autoEnabled: true,
  primaryDomain: 'tiwlo.com',
  email: 'admin@tiwlo.com',
  domainsText: 'tiwlo.com\nwww.tiwlo.com\nmail.tiwlo.com\ntmail.tiwlo.com\nemail.tiwlo.com',
  includeKnownDomains: true,
  includeWildcard: false,
  staging: false,
  forceRenewal: false
};
const KNOWN_EDGE_PROXY_IPV4_CIDRS = [
  '173.245.48.0/20',
  '103.21.244.0/22',
  '103.22.200.0/22',
  '103.31.4.0/22',
  '141.101.64.0/18',
  '108.162.192.0/18',
  '190.93.240.0/20',
  '188.114.96.0/20',
  '197.234.240.0/22',
  '198.41.128.0/17',
  '162.158.0.0/15',
  '104.16.0.0/13',
  '104.24.0.0/14',
  '172.64.0.0/13',
  '131.0.72.0/22'
];

const ADMIN_ROLES = new Set(['admin', 'super_admin']);

const nowIso = () => new Date().toISOString();

const createJob = (map, type, extra = {}) => {
  const job = {
    id: randomUUID(),
    type,
    status: 'queued',
    progress: 0,
    message: 'Queued',
    log: [],
    pollToken: randomUUID(),
    createdAt: nowIso(),
    updatedAt: nowIso(),
    ...extra
  };
  map.set(job.id, job);
  while (map.size > 60) {
    map.delete(map.keys().next().value);
  }
  return job;
};

const updateJob = (job, patch = {}) => {
  Object.assign(job, patch, { updatedAt: nowIso() });
  if (patch.message) job.log.push({ at: nowIso(), message: patch.message });
  if (job.log.length > 80) job.log.splice(0, job.log.length - 80);
  return job;
};

const publicJob = (job) => ({
  ...job,
  log: job.log.slice(-20)
});

const envFlag = (name, defaultValue = true) => {
  const value = process.env[name];
  if (value === undefined) return defaultValue;
  return !['0', 'false', 'no', 'off'].includes(String(value).trim().toLowerCase());
};

const ensureDir = (path) => mkdir(path, { recursive: true });

const exists = async (path) => {
  try {
    await access(path, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
};

const cleanHost = (value = '') => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/^https?:\/\//, '')
  .replace(/\/.*$/, '')
  .replace(/:\d+$/, '');

const isValidHost = (value = '') => {
  const host = cleanHost(value);
  return host.length > 3 &&
    host.length < 254 &&
    host.includes('.') &&
    !host.includes('*') &&
    /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(host);
};

const rootPaths = (rootDir = fallbackRootDir) => ({
  rootDir,
  backupDir: join(rootDir, '.data', 'backups'),
  restoreDir: join(rootDir, '.data', 'restore-safety'),
  tempDir: join(rootDir, '.data', 'backup-work'),
  uploadsDir: join(rootDir, 'public', 'uploads'),
  logsDir: join(rootDir, '.logs')
});

const readSetting = async (prisma, key, fallback) => {
  const setting = await prisma.systemSetting.findUnique({
    where: { scope_scopeId_key: { scope: 'platform', scopeId: '', key } }
  });
  return setting?.value || fallback;
};

const writeSetting = async (prisma, key, value) => prisma.systemSetting.upsert({
  where: { scope_scopeId_key: { scope: 'platform', scopeId: '', key } },
  create: { scope: 'platform', scopeId: '', key, value },
  update: { value }
});

const hostFromOrigin = (value = '') => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    return cleanHost(new URL(raw.includes('://') ? raw : `https://${raw}`).hostname);
  } catch {
    return cleanHost(raw);
  }
};

const defaultPrimaryDomain = () => {
  const candidates = [
    process.env.TIWLO_SSL_DOMAIN,
    process.env.TIWLO_MAIL_DOMAIN,
    process.env.APP_DOMAIN,
    process.env.FRONTEND_ORIGIN,
    process.env.API_BASE_URL,
    'tiwlo.com'
  ];
  return candidates.map(hostFromOrigin).find(isValidHost) || 'tiwlo.com';
};

const defaultSslConfig = () => {
  const primaryDomain = defaultPrimaryDomain();
  return {
    ...DEFAULT_SSL_CONFIG,
    primaryDomain,
    email: process.env.SSL_EMAIL || process.env.TIWLO_EMAIL || `admin@${primaryDomain}`,
    domainsText: [
      primaryDomain,
      `www.${primaryDomain}`,
      `mail.${primaryDomain}`,
      `tmail.${primaryDomain}`,
      `email.${primaryDomain}`
    ].filter(isValidHost).join('\n')
  };
};

const normalizeDomainListText = (value = '') => Array.from(new Set(String(value || '')
  .split(/[\s,]+/)
  .map(cleanHost)
  .filter(isValidHost))).join('\n');

const sanitizeSslConfig = (input = {}) => {
  const base = defaultSslConfig();
  const primaryDomain = cleanHost(input.primaryDomain || base.primaryDomain);
  const safePrimary = isValidHost(primaryDomain) ? primaryDomain : base.primaryDomain;
  const domainsText = normalizeDomainListText(input.domainsText || input.domains || base.domainsText);
  return {
    autoEnabled: Boolean(input.autoEnabled),
    primaryDomain: safePrimary,
    email: String(input.email || base.email).trim(),
    domainsText,
    includeKnownDomains: input.includeKnownDomains !== false,
    includeWildcard: Boolean(input.includeWildcard),
    staging: Boolean(input.staging),
    forceRenewal: Boolean(input.forceRenewal)
  };
};

const sslConfig = async (prisma) => sanitizeSslConfig({
  ...defaultSslConfig(),
  ...(await readSetting(prisma, SSL_KEY, {}))
});

const parseSslDomains = async (prisma, config, mode = 'all', explicitDomain = '') => {
  const primary = cleanHost(config.primaryDomain || defaultPrimaryDomain());
  const typedDomains = normalizeDomainListText(config.domainsText)
    .split('\n')
    .map(cleanHost)
    .filter(isValidHost);
  const baseDomains = [
    primary,
    `www.${primary}`,
    `mail.${primary}`,
    `tmail.${primary}`,
    `email.${primary}`,
    ...typedDomains
  ];
  const discovered = config.includeKnownDomains ? await knownDomains(prisma).catch(() => []) : [];
  const allDomains = Array.from(new Set([...baseDomains, ...discovered].map(cleanHost).filter(isValidHost)));
  const httpDomains = mode === 'main'
    ? [cleanHost(explicitDomain || primary)].filter(isValidHost)
    : allDomains;
  const wildcardDomains = config.includeWildcard && primary ? [`*.${primary}`] : [];
  return { httpDomains, wildcardDomains };
};

const apexForHost = (host, primaryDomain = '') => {
  const clean = cleanHost(host);
  const primary = cleanHost(primaryDomain);
  if (primary && (clean === primary || clean.endsWith(`.${primary}`))) return primary;
  const parts = clean.split('.').filter(Boolean);
  return parts.length >= 2 ? parts.slice(-2).join('.') : clean;
};

const relativeDnsName = (host, zone) => {
  const clean = cleanHost(host);
  const root = cleanHost(zone);
  if (clean === root) return '@';
  return clean.endsWith(`.${root}`) ? clean.slice(0, -(root.length + 1)) : clean;
};

const expandSslDomainsForMode = (domains, config, mode, explicitDomain = '') => {
  const primary = cleanHost(config.primaryDomain || defaultPrimaryDomain());
  const selected = cleanHost(explicitDomain || primary);
  const all = Array.from(new Set(domains.map(cleanHost).filter(isValidHost)));
  if (mode !== 'main') return all;

  const selectedApex = apexForHost(selected, primary);
  const matching = all.filter((domain) => apexForHost(domain, primary) === selectedApex);
  const defaults = selectedApex === primary
    ? [primary, `www.${primary}`, `mail.${primary}`, `tmail.${primary}`, `email.${primary}`, selected]
    : [selected];
  return Array.from(new Set([...defaults, ...matching].map(cleanHost).filter(isValidHost)));
};

const sortCertificateDomains = (domains, apex) => domains.sort((left, right) => {
  if (left === apex) return -1;
  if (right === apex) return 1;
  if (left === `www.${apex}`) return -1;
  if (right === `www.${apex}`) return 1;
  return left.localeCompare(right);
});

const certificateGroupsForDomains = (domains, config) => {
  const primary = cleanHost(config.primaryDomain || defaultPrimaryDomain());
  const groups = new Map();
  for (const domain of domains.map(cleanHost).filter(isValidHost)) {
    const apex = apexForHost(domain, primary);
    if (!groups.has(apex)) groups.set(apex, { certName: apex, domains: [] });
    const group = groups.get(apex);
    if (!group.domains.includes(domain)) group.domains.push(domain);
  }
  return Array.from(groups.values()).map((group) => ({
    ...group,
    domains: sortCertificateDomains(group.domains, group.certName).slice(0, 95)
  }));
};

const systemOwnerId = async (prisma) => {
  const user = await prisma.user.findFirst({
    where: { role: { in: ['super_admin', 'admin'] } },
    orderBy: { createdAt: 'asc' },
    select: { id: true }
  }).catch(() => null);
  return user?.id || process.env.SYSTEM_ACTOR_ID || null;
};

const ensurePowerDnsSslRecords = async (prisma, domains = []) => {
  const ctx = { prisma };
  const config = await getPowerDnsConfig(ctx).catch(() => null);
  const primary = cleanHost(config?.primaryDomain || defaultPrimaryDomain());
  const serverIp = String(config?.serverIp || process.env.POWERDNS_SERVER_IP || process.env.SERVER_IP || process.env.PUBLIC_IP || '').trim();
  if (!primary || !serverIp || serverIp === 'SERVER_IP') return [];
  const managed = Array.from(new Set(domains.map(cleanHost).filter((domain) => domain === primary || domain.endsWith(`.${primary}`))));
  if (!managed.length) return [];
  const ownerId = await systemOwnerId(prisma);
  if (!ownerId) return [];

  const nameservers = Array.isArray(config.nameservers) && config.nameservers.length
    ? config.nameservers
    : [`ns1.${primary}`, `ns2.${primary}`];
  const zone = await prisma.domain.upsert({
    where: { name: primary },
    create: { ownerId, name: primary, dns: nameservers, status: 'active', records: [] },
    update: { dns: nameservers, status: 'active' }
  });

  for (const domain of managed) {
    await prisma.dnsRecord.upsert({
      where: { id: `ssl_auto_${domain.replace(/[^a-z0-9]+/g, '_')}_a` },
      create: {
        id: `ssl_auto_${domain.replace(/[^a-z0-9]+/g, '_')}_a`,
        domainId: zone.id,
        type: 'A',
        name: relativeDnsName(domain, primary),
        value: serverIp,
        ttl: 300,
        metadata: { source: 'ssl_auto_powerdns', provider: 'powerdns' }
      },
      update: {
        domainId: zone.id,
        type: 'A',
        name: relativeDnsName(domain, primary),
        value: serverIp,
        ttl: 300,
        status: 'active',
        metadata: { source: 'ssl_auto_powerdns', provider: 'powerdns' }
      }
    });
  }

  await syncPowerDnsDomain(ctx, zone.id).catch(() => {});
  return managed;
};

const backupConfig = async (prisma) => ({
  ...DEFAULT_BACKUP_CONFIG,
  ...(await readSetting(prisma, BACKUP_KEY, {}))
});

const sanitizeConfig = (input = {}) => ({
  autoEnabled: Boolean(input.autoEnabled),
  intervalMinutes: Math.max(5, Math.min(10080, Number(input.intervalMinutes || DEFAULT_BACKUP_CONFIG.intervalMinutes))),
  localRetention: Math.max(1, Math.min(50, Number(input.localRetention || DEFAULT_BACKUP_CONFIG.localRetention))),
  googleDriveEnabled: Boolean(input.googleDriveEnabled),
  googleDriveFolderId: String(input.googleDriveFolderId || '').trim(),
  googleServiceAccountPath: String(input.googleServiceAccountPath || '').trim(),
  googleServiceAccountJson: String(input.googleServiceAccountJson || '').trim(),
  driveRetention: Math.max(1, Math.min(30, Number(input.driveRetention || DEFAULT_BACKUP_CONFIG.driveRetention))),
  uploadManualToDrive: Boolean(input.uploadManualToDrive)
});

const runExecFile = (file, args, options = {}) => new Promise((resolveRun, rejectRun) => {
  execFile(file, args, { maxBuffer: 1024 * 1024 * 20, ...options }, (error, stdout, stderr) => {
    if (error) {
      error.stdout = stdout;
      error.stderr = stderr;
      rejectRun(error);
      return;
    }
    resolveRun({ stdout, stderr });
  });
});

const runCommand = (command, args, options = {}, onOutput = () => {}) => new Promise((resolveRun, rejectRun) => {
  const child = spawn(command, args, { shell: false, ...options });
  let stdout = '';
  let stderr = '';
  child.stdout?.on('data', (chunk) => {
    const text = chunk.toString();
    stdout += text;
    onOutput(text);
  });
  child.stderr?.on('data', (chunk) => {
    const text = chunk.toString();
    stderr += text;
    onOutput(text);
  });
  child.on('error', rejectRun);
  child.on('close', (code) => {
    if (code === 0) {
      resolveRun({ stdout, stderr });
      return;
    }
    const error = new Error(`${command} exited with code ${code}`);
    error.stdout = stdout;
    error.stderr = stderr;
    rejectRun(error);
  });
});

const shellCommand = (command) => process.platform === 'win32'
  ? { command: 'cmd.exe', args: ['/d', '/s', '/c', command] }
  : { command: '/bin/sh', args: ['-lc', command] };

const scheduleServerRestart = ({ rootDir, reason = 'restore completed', delayMs = 2500 } = {}) => {
  if (restartScheduled || !envFlag('TIWLO_RESTART_AFTER_RESTORE', true)) return;
  restartScheduled = true;
  const restartCommand = String(process.env.TIWLO_RESTART_COMMAND || '').trim();
  const supervised = Boolean(process.env.pm_id || process.env.PM2_HOME || process.env.INVOCATION_ID);

  setTimeout(() => {
    try {
      if (restartCommand) {
        const shell = shellCommand(restartCommand);
        const child = spawn(shell.command, shell.args, {
          cwd: rootDir || process.cwd(),
          detached: true,
          stdio: 'ignore',
          env: process.env
        });
        child.unref();
      } else if (!supervised) {
        const nodeArgs = process.argv.slice(1);
        const bootstrap = `
          const { spawn } = require('node:child_process');
          setTimeout(() => {
            const child = spawn(process.execPath, ${JSON.stringify(nodeArgs)}, {
              cwd: ${JSON.stringify(process.cwd())},
              env: process.env,
              detached: true,
              stdio: 'ignore'
            });
            child.unref();
          }, ${Number(process.env.TIWLO_RESTART_DELAY_MS || 2500)});
        `;
        const child = spawn(process.execPath, ['-e', bootstrap], {
          detached: true,
          stdio: 'ignore',
          env: process.env
        });
        child.unref();
      }
    } catch (error) {
      console.error('Tiwlo restart scheduling failed:', error.message || error);
    } finally {
      console.log(`Tiwlo backend restarting after ${reason}.`);
      process.exit(0);
    }
  }, delayMs).unref?.();
};

const localToolCandidates = (rootDir, name) => {
  const exe = process.platform === 'win32' ? `${name}.exe` : name;
  return [
    join(rootDir, '.tools', 'postgresql', 'pgsql', 'bin', exe),
    join(rootDir, '.tools', 'git', 'usr', 'bin', exe),
    join(rootDir, '.tools', 'git', 'bin', exe)
  ];
};

const findExecutable = async (rootDir, name) => {
  for (const candidate of localToolCandidates(rootDir, name)) {
    if (await exists(candidate)) return candidate;
  }
  const checker = process.platform === 'win32' ? 'where' : 'which';
  try {
    const { stdout } = await runExecFile(checker, [name]);
    const found = stdout.split(/\r?\n/).map((line) => line.trim()).find(Boolean);
    if (found) return found;
  } catch {
    return name;
  }
  return name;
};

const parseDatabaseUrl = () => {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error('DATABASE_URL is not configured.');
  const url = new URL(raw);
  return {
    host: url.hostname || '127.0.0.1',
    port: url.port || '5432',
    database: decodeURIComponent(url.pathname.replace(/^\//, '')),
    user: decodeURIComponent(url.username || 'postgres'),
    password: decodeURIComponent(url.password || '')
  };
};

const pgEnv = (db) => ({
  ...process.env,
  PGPASSWORD: db.password
});

const pgArgs = (db) => ['-h', db.host, '-p', db.port, '-U', db.user, '-d', db.database];

const createArchive = async ({ zipPath, dumpPath, manifest, uploadsDir }) => new Promise((resolveArchive, rejectArchive) => {
  const output = createWriteStream(zipPath);
  const archive = new ZipArchive({ zlib: { level: 9 } });
  output.on('close', resolveArchive);
  archive.on('error', rejectArchive);
  archive.pipe(output);
  archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });
  archive.file(dumpPath, { name: 'database/database.sql' });
  if (manifest.includes.uploads) {
    archive.directory(uploadsDir, 'public/uploads');
  }
  archive.finalize().catch(rejectArchive);
});

const listBackupFiles = async (rootDir) => {
  const { backupDir } = rootPaths(rootDir);
  await ensureDir(backupDir);
  const files = await readdir(backupDir);
  const rows = [];
  for (const file of files.filter((name) => name.endsWith('.zip'))) {
    const path = join(backupDir, file);
    const fileStat = await stat(path);
    rows.push({
      name: file,
      size: fileStat.size,
      createdAt: fileStat.birthtime.toISOString(),
      updatedAt: fileStat.mtime.toISOString()
    });
  }
  return rows.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
};

const pruneLocalBackups = async (rootDir, keep) => {
  const { backupDir } = rootPaths(rootDir);
  const files = await listBackupFiles(rootDir);
  await Promise.all(files.slice(Math.max(1, keep)).map((file) => rm(join(backupDir, file.name), { force: true })));
};

const googleAuthFromConfig = async (config) => {
  const rawJson = config.googleServiceAccountJson || process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '';
  const jsonPath = config.googleServiceAccountPath || process.env.GOOGLE_SERVICE_ACCOUNT_FILE || '';
  let credentials = null;
  if (rawJson.trim()) {
    credentials = JSON.parse(rawJson);
  } else if (jsonPath.trim()) {
    credentials = JSON.parse(await readFile(jsonPath.trim(), 'utf8'));
  }
  if (!credentials) throw new Error('Google Drive service account JSON or file path is required.');
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.file']
  });
};

const uploadBackupToDrive = async ({ filePath, fileName, config }) => {
  if (!config.googleDriveFolderId) throw new Error('Google Drive folder ID is required.');
  const auth = await googleAuthFromConfig(config);
  const drive = google.drive({ version: 'v3', auth });
  const created = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [config.googleDriveFolderId],
      appProperties: { tiwloBackup: 'true' }
    },
    media: {
      mimeType: 'application/zip',
      body: createReadStream(filePath)
    },
    fields: 'id,name,createdTime,webViewLink'
  });

  const list = await drive.files.list({
    q: `'${config.googleDriveFolderId}' in parents and trashed=false and appProperties has { key='tiwloBackup' and value='true' }`,
    orderBy: 'createdTime desc',
    fields: 'files(id,name,createdTime)'
  });
  const keep = Math.max(1, Number(config.driveRetention || 1));
  await Promise.all((list.data.files || []).slice(keep).map((file) => drive.files.delete({ fileId: file.id })));
  return created.data;
};

const runBackup = async ({ prisma, rootDir, job, actor, source = 'manual', uploadToDrive = false }) => {
  const paths = rootPaths(rootDir);
  const config = await backupConfig(prisma);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const workDir = join(paths.tempDir, `backup-${job.id}`);
  const dumpPath = join(workDir, 'database.sql');
  const fileName = `tiwlo-backup-${stamp}.zip`;
  const zipPath = join(paths.backupDir, fileName);

  try {
    updateJob(job, { status: 'running', progress: 5, message: 'Preparing backup workspace' });
    await ensureDir(paths.backupDir);
    await ensureDir(paths.tempDir);
    await ensureDir(workDir);

    const db = parseDatabaseUrl();
    const pgDump = await findExecutable(rootDir, 'pg_dump');
    updateJob(job, { progress: 20, message: 'Exporting PostgreSQL database' });
    await runExecFile(pgDump, [
      ...pgArgs(db),
      '--no-owner',
      '--no-privileges',
      '--clean',
      '--if-exists',
      '--file',
      dumpPath
    ], { env: pgEnv(db) });

    const uploadsIncluded = await exists(paths.uploadsDir);
    const manifest = {
      app: 'Tiwlo',
      version: 1,
      createdAt: nowIso(),
      source,
      includes: {
        postgresql: true,
        uploads: uploadsIncluded
      },
      database: {
        name: db.database,
        host: db.host,
        port: db.port
      }
    };

    updateJob(job, { progress: 62, message: 'Compressing database and uploads into zip' });
    await createArchive({ zipPath, dumpPath, manifest, uploadsDir: paths.uploadsDir });

    const zipStat = await stat(zipPath);
    await pruneLocalBackups(rootDir, config.localRetention);
    updateJob(job, {
      progress: 88,
      message: 'Local backup file is ready',
      fileName,
      fileSize: zipStat.size,
      downloadUrl: `/admin/backups/download/${encodeURIComponent(fileName)}`
    });

    const shouldUpload = Boolean(config.googleDriveEnabled && (source === 'auto' || uploadToDrive || config.uploadManualToDrive));
    if (shouldUpload) {
      updateJob(job, { progress: 92, message: 'Uploading backup to Google Drive' });
      const driveFile = await uploadBackupToDrive({ filePath: zipPath, fileName, config });
      updateJob(job, { driveFile, message: 'Google Drive backup uploaded' });
    }

    await prisma.auditLog.create({
      data: {
        actorId: actor?.id || null,
        action: source === 'auto' ? 'auto_backup_created' : 'backup_created',
        resource: 'systemBackup',
        resourceId: fileName,
        metadata: { fileName, fileSize: zipStat.size, source, googleDrive: shouldUpload }
      }
    }).catch(() => {});

    updateJob(job, { status: 'completed', progress: 100, message: 'Backup completed' });
  } catch (error) {
    updateJob(job, { status: 'failed', progress: Math.max(job.progress, 1), message: error.message || 'Backup failed', error: error.message || String(error) });
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
};

const extractZip = async (zipPath, targetDir) => {
  await ensureDir(targetDir);
  const directory = await unzipper.Open.file(zipPath);
  const manifestEntry = directory.files.find((file) => file.path === 'manifest.json');
  if (!manifestEntry) throw new Error('Backup manifest.json was not found.');
  const manifest = JSON.parse((await manifestEntry.buffer()).toString('utf8'));
  if (manifest.app !== 'Tiwlo') throw new Error('This zip is not a Tiwlo backup.');
  await directory.extract({ path: targetDir });
  return manifest;
};

const restoreUploads = async ({ rootDir, extractedDir, job }) => {
  const paths = rootPaths(rootDir);
  const extractedUploads = join(extractedDir, 'public', 'uploads');
  if (!(await exists(extractedUploads))) return null;
  await ensureDir(paths.restoreDir);
  let safetyDir = null;
  if (await exists(paths.uploadsDir)) {
    safetyDir = join(paths.restoreDir, `uploads-before-${Date.now()}`);
    updateJob(job, { progress: 72, message: 'Saving current uploads before restore' });
    await cp(paths.uploadsDir, safetyDir, { recursive: true, force: true });
    await rm(paths.uploadsDir, { recursive: true, force: true });
  }
  updateJob(job, { progress: 78, message: 'Restoring uploaded files' });
  await ensureDir(dirname(paths.uploadsDir));
  await cp(extractedUploads, paths.uploadsDir, { recursive: true, force: true });
  return safetyDir;
};

const restoreUploadsSafetyCopy = async ({ rootDir, safetyDir }) => {
  if (!safetyDir || !(await exists(safetyDir))) return;
  const paths = rootPaths(rootDir);
  await rm(paths.uploadsDir, { recursive: true, force: true }).catch(() => {});
  await ensureDir(dirname(paths.uploadsDir));
  await cp(safetyDir, paths.uploadsDir, { recursive: true, force: true });
};

const dumpDatabaseSafetyCopy = async ({ rootDir, db, job }) => {
  const paths = rootPaths(rootDir);
  const pgDump = await findExecutable(rootDir, 'pg_dump');
  await ensureDir(paths.restoreDir);
  const dumpPath = join(paths.restoreDir, `database-before-${Date.now()}.sql`);
  updateJob(job, { progress: 28, message: 'Saving current PostgreSQL data before restore' });
  await runExecFile(pgDump, [
    ...pgArgs(db),
    '--no-owner',
    '--no-privileges',
    '--clean',
    '--if-exists',
    '--file',
    dumpPath
  ], { env: pgEnv(db) });
  return dumpPath;
};

const restoreDatabaseFromSql = async ({ psql, db, sqlPath }) => {
  await runExecFile(psql, [
    ...pgArgs(db),
    '-v',
    'ON_ERROR_STOP=1',
    '-c',
    'DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;'
  ], { env: pgEnv(db) });

  await runExecFile(psql, [
    ...pgArgs(db),
    '-v',
    'ON_ERROR_STOP=1',
    '-f',
    sqlPath
  ], { env: pgEnv(db) });
};

const runRestore = async ({ prisma, rootDir, job, uploadPath, actor }) => {
  const paths = rootPaths(rootDir);
  const workDir = join(paths.tempDir, `restore-${job.id}`);
  let db = null;
  let psql = null;
  let safetyDumpPath = null;
  let uploadSafetyDir = null;
  let restoreStarted = false;
  try {
    updateJob(job, { status: 'running', progress: 8, message: 'Reading backup zip' });
    await ensureDir(paths.tempDir);
    const manifest = await extractZip(uploadPath, workDir);
    const sqlPath = join(workDir, 'database', 'database.sql');
    if (!(await exists(sqlPath))) throw new Error('database/database.sql was not found in the backup.');

    db = parseDatabaseUrl();
    psql = await findExecutable(rootDir, 'psql');
    safetyDumpPath = await dumpDatabaseSafetyCopy({ rootDir, db, job });
    updateJob(job, { progress: 35, message: 'Preparing PostgreSQL restore' });
    await prisma.$disconnect().catch(() => {});

    updateJob(job, { progress: 48, message: 'Importing PostgreSQL data' });
    restoreStarted = true;
    await restoreDatabaseFromSql({ psql, db, sqlPath });
    await prisma.$connect().catch(() => {});

    uploadSafetyDir = await restoreUploads({ rootDir, extractedDir: workDir, job });

    await prisma.auditLog.create({
      data: {
        actorId: actor?.id || null,
        action: 'backup_restored',
        resource: 'systemBackup',
        resourceId: job.id,
        metadata: { manifest }
      }
    }).catch(() => {});

    updateJob(job, { status: 'completed', progress: 100, message: 'Import completed. Restarting server' });
    scheduleServerRestart({ rootDir, reason: 'backup import completed' });
  } catch (error) {
    await prisma.$connect().catch(() => {});
    if (restoreStarted && safetyDumpPath && psql && db && await exists(safetyDumpPath)) {
      try {
        updateJob(job, { progress: Math.max(job.progress, 55), message: 'Restore failed. Rolling back PostgreSQL data' });
        await prisma.$disconnect().catch(() => {});
        await restoreDatabaseFromSql({ psql, db, sqlPath: safetyDumpPath });
        await prisma.$connect().catch(() => {});
        await restoreUploadsSafetyCopy({ rootDir, safetyDir: uploadSafetyDir });
      } catch (rollbackError) {
        await prisma.$connect().catch(() => {});
        updateJob(job, { message: `Rollback failed: ${rollbackError.message || rollbackError}` });
      }
    }
    updateJob(job, { status: 'failed', progress: Math.max(job.progress, 1), message: error.message || 'Import failed', error: error.message || String(error) });
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
    await rm(uploadPath, { force: true }).catch(() => {});
  }
};

const pollTokenFromRequest = (req) => String(req.headers['x-tiwlo-job-token'] || req.query?.token || '');

const isJobPollAuthorized = (req, job) => Boolean(job?.pollToken && pollTokenFromRequest(req) === job.pollToken);

const sendJobStatus = (map, req, res) => {
  const job = map.get(req.params.id);
  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return null;
  }
  res.json({ job: publicJob(job) });
  return job;
};

const ipv4ToNumber = (ip = '') => ip.split('.').reduce((acc, part) => ((acc << 8) + Number(part || 0)) >>> 0, 0);

const ipv4InCidr = (ip, cidr) => {
  if (!net.isIP(ip) || net.isIP(ip) !== 4) return false;
  const [base, prefixText] = cidr.split('/');
  const prefix = Number(prefixText);
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (ipv4ToNumber(ip) & mask) === (ipv4ToNumber(base) & mask);
};

const isKnownEdgeProxyAddress = (ip) => KNOWN_EDGE_PROXY_IPV4_CIDRS.some((cidr) => ipv4InCidr(ip, cidr));

const configuredServerIps = () => {
  const configured = [
    process.env.SSL_SERVER_IP,
    process.env.PUBLIC_IP,
    process.env.SERVER_IP
  ].flatMap((value) => String(value || '').split(','));
  return Array.from(new Set(configured.map((value) => String(value).trim()).filter((value) => net.isIP(value))));
};

const tcpCheck = (host, port, timeoutMs = 4500) => new Promise((resolveCheck) => {
  const socket = net.createConnection({ host, port });
  let settled = false;
  const done = (result) => {
    if (settled) return;
    settled = true;
    socket.destroy();
    resolveCheck({ port, ...result });
  };
  socket.setTimeout(timeoutMs);
  socket.on('connect', () => done({ ok: true }));
  socket.on('timeout', () => done({ ok: false, error: `timeout after ${timeoutMs}ms` }));
  socket.on('error', (error) => done({ ok: false, error: error.code || error.message || 'connection failed' }));
});

const tlsHostCheck = (host, timeoutMs = 5500) => new Promise((resolveCheck) => {
  const socket = tls.connect({
    host,
    servername: host,
    port: 443,
    rejectUnauthorized: true
  });
  let settled = false;
  const done = (result) => {
    if (settled) return;
    settled = true;
    socket.destroy();
    resolveCheck(result);
  };
  socket.setTimeout(timeoutMs);
  socket.on('secureConnect', () => done({ ok: socket.authorized, error: socket.authorizationError || '' }));
  socket.on('timeout', () => done({ ok: false, error: `TLS timeout after ${timeoutMs}ms` }));
  socket.on('error', (error) => done({ ok: false, error: error.code || error.message || 'TLS check failed' }));
});

const resolveDomainAddresses = async (domain) => {
  const [a, aaaa] = await Promise.all([
    resolve4(domain).catch(() => []),
    resolve6(domain).catch(() => [])
  ]);
  return { a, aaaa, all: [...a, ...aaaa] };
};

const diagnoseSslDomain = async (domain) => {
  const issues = [];
  const warnings = [];
  const addresses = await resolveDomainAddresses(domain);
  if (!addresses.all.length) {
    issues.push(`${domain} DNS A/AAAA record was not found.`);
  }

  const serverIps = configuredServerIps();
  const comparableServerIps = serverIps.filter((ip) => !ip.startsWith('127.') && ip !== '::1');
  if (comparableServerIps.length && addresses.all.length && !addresses.all.some((ip) => comparableServerIps.includes(ip))) {
    warnings.push(`${domain} resolves to ${addresses.all.join(', ')}, not the configured server IP (${comparableServerIps.join(', ')}).`);
  }

  if (addresses.a.some(isKnownEdgeProxyAddress)) {
    warnings.push(`${domain} resolves through a third-party proxy range. HTTP-01 works best when PowerDNS A/AAAA records point directly to this server.`);
  }

  const [http, https] = addresses.all.length
    ? await Promise.all([tcpCheck(domain, 80), tcpCheck(domain, 443)])
    : [{ port: 80, ok: false, error: 'DNS failed' }, { port: 443, ok: false, error: 'DNS failed' }];

  if (!http.ok) {
    issues.push(`Port 80 is not reachable for ${domain}. Let's Encrypt HTTP-01 needs public HTTP access.`);
  }
  if (!https.ok) {
    warnings.push(`Port 443 is not reachable yet for ${domain}. It should open after SSL is installed.`);
  }
  const tlsResult = https.ok ? await tlsHostCheck(domain) : { ok: false, error: https.error || 'port 443 blocked' };
  if (https.ok && !tlsResult.ok) {
    warnings.push(`HTTPS certificate check failed for ${domain}: ${tlsResult.error}. Install SSL for this hostname or fix the Nginx certificate mapping.`);
  }

  return {
    domain,
    status: issues.length ? 'error' : warnings.length ? 'warning' : 'ok',
    addresses: addresses.all,
    ports: { http, https, tls: tlsResult },
    issues,
    warnings
  };
};

const wildcardSslDiagnostic = (wildcardDomains = []) => {
  if (!wildcardDomains.length) {
    return {
      requested: false,
      status: 'not_requested',
      domains: [],
      message: 'Wildcard SSL is off.'
    };
  }
  return {
    requested: true,
    status: 'powerdns_dns01_required',
    domains: wildcardDomains,
    message: "Wildcard Let's Encrypt certificates require DNS-01 TXT validation. Tiwlo now manages explicit subdomain certificates automatically through PowerDNS; wildcard issuance should use the PowerDNS ACME hook before enabling wildcard mode."
  };
};

const explainCertbotError = (error, domain) => {
  const raw = `${error?.stderr || ''}\n${error?.stdout || ''}\n${error?.message || ''}`.trim();
  if (/could not automatically find a matching server block|no names were found in your configuration files/i.test(raw)) {
    return `${domain}: Nginx has no matching server_name. Add this domain to the Tiwlo Nginx site, reload Nginx, then retry.`;
  }
  if (/unauthorized|invalid response|404|not found/i.test(raw)) {
    return `${domain}: Let's Encrypt could not read the HTTP challenge. Check PowerDNS A/AAAA records, redirects, and port 80 to this server.`;
  }
  if (/timeout|connection refused|connection reset|no route to host/i.test(raw)) {
    return `${domain}: HTTP validation timed out. Open port 80/443 in VPS firewall, provider firewall, and Nginx.`;
  }
  if (/dns problem|nxdomain|no valid a records|no valid aaaa records/i.test(raw)) {
    return `${domain}: DNS does not resolve correctly. Point A/AAAA records to this server before issuing SSL.`;
  }
  if (/rate limit|too many certificates/i.test(raw)) {
    return `${domain}: Let's Encrypt rate limit hit. Wait before retrying or test with staging mode.`;
  }
  if (/wildcard|dns-01/i.test(raw)) {
    return `${domain}: Wildcard certificates need DNS-01 validation; HTTP-01/Nginx cannot issue wildcard certs.`;
  }
  return raw || `${domain}: Certbot failed.`;
};

const knownDomains = async (prisma) => {
  const [domains, stores] = await Promise.all([
    prisma.domain.findMany({ select: { name: true } }),
    prisma.store.findMany({ select: { domain: true, customDomain: true } })
  ]);
  return Array.from(new Set([
    ...domains.map((item) => item.name),
    ...stores.flatMap((item) => [item.domain, item.customDomain])
  ].map(cleanHost).filter(isValidHost)));
};

const privilegedBashArgs = (body) => {
  if (process.platform !== 'linux') throw new Error('Automatic SSL installation is supported on Linux servers only.');
  return ['-lc', `
set -e
if [ "$(id -u)" -eq 0 ]; then
  SUDO=""
elif command -v sudo >/dev/null 2>&1; then
  SUDO="sudo -n"
else
  echo "Root or passwordless sudo is required for SSL package and Nginx changes." >&2
  exit 1
fi
${body}
`];
};

const installCertbotArgs = () => privilegedBashArgs(`
if ! command -v certbot >/dev/null 2>&1; then
  if command -v apt-get >/dev/null 2>&1; then
    $SUDO env DEBIAN_FRONTEND=noninteractive apt-get update
    $SUDO env DEBIAN_FRONTEND=noninteractive apt-get install -y certbot python3-certbot-nginx ca-certificates openssl cron
  elif command -v dnf >/dev/null 2>&1; then
    $SUDO dnf install -y certbot python3-certbot-nginx ca-certificates openssl cronie
  elif command -v yum >/dev/null 2>&1; then
    $SUDO yum install -y certbot python3-certbot-nginx ca-certificates openssl cronie
  else
    echo "No supported package manager found for certbot." >&2
    exit 1
  fi
fi
$SUDO ufw allow 80/tcp >/dev/null 2>&1 || true
$SUDO ufw allow 443/tcp >/dev/null 2>&1 || true
if command -v systemctl >/dev/null 2>&1; then
  $SUDO systemctl enable --now certbot.timer >/dev/null 2>&1 || true
fi
`);

const reloadNginxArgs = () => privilegedBashArgs(`
if command -v nginx >/dev/null 2>&1; then
  $SUDO nginx -t
  if command -v systemctl >/dev/null 2>&1; then
    $SUDO systemctl reload nginx
  else
    $SUDO nginx -s reload
  fi
fi
`);

const runSsl = async ({ prisma, rootDir, job, actor, input }) => {
  try {
    updateJob(job, { status: 'running', progress: 8, message: 'Preparing SSL request' });
    const current = await sslConfig(prisma);
    const config = sanitizeSslConfig({ ...current, ...(input || {}) });
    const email = String(config.email || process.env.SSL_EMAIL || '').trim();
    if (!email || !email.includes('@')) throw new Error('A valid SSL email is required.');
    const mode = input.mode === 'main' ? 'main' : 'all';
    const { httpDomains, wildcardDomains } = await parseSslDomains(prisma, config, 'all', input.domain);
    const filtered = expandSslDomainsForMode(httpDomains, config, mode, input.domain);
    if (!filtered.length) throw new Error('No valid domain found for SSL.');

    updateJob(job, { progress: 12, message: 'Preparing PowerDNS records for SSL', domains: filtered });
    const powerDnsPrepared = await ensurePowerDnsSslRecords(prisma, filtered).catch(() => []);

    updateJob(job, { progress: 15, message: 'Checking DNS and HTTP reachability', domains: filtered, powerDnsPrepared });
    const diagnostics = await Promise.all(filtered.slice(0, 60).map(diagnoseSslDomain));
    const failed = diagnostics
      .filter((item) => item.status === 'error')
      .map((item) => ({ domain: item.domain, error: item.issues.join(' ') }));
    const readyDomains = filtered.filter((domain) => !failed.some((item) => item.domain === domain));
    const wildcard = wildcardSslDiagnostic(wildcardDomains);
    if (wildcard.requested) {
      failed.push(...wildcard.domains.map((domain) => ({ domain, error: wildcard.message })));
    }
    if (!readyDomains.length) throw new Error(failed[0]?.error || 'No SSL-ready domain found.');
    const requestedDomain = cleanHost(input.domain || config.primaryDomain);
    if (mode === 'main' && failed.some((item) => item.domain === requestedDomain)) {
      throw new Error(failed.find((item) => item.domain === requestedDomain)?.error || failed[0].error);
    }

    updateJob(job, { progress: 25, message: 'Installing certbot and enabling renew timer', diagnostics, wildcard });
    await runCommand('/bin/bash', installCertbotArgs(), { cwd: rootDir }, (text) => {
      if (text.trim()) updateJob(job, { message: text.trim().slice(-240) });
    });

    const certbot = await findExecutable(rootDir, 'certbot');
    const successful = [];
    const groups = certificateGroupsForDomains(readyDomains, config);
    for (const [index, group] of groups.entries()) {
      const args = [
        '--nginx',
        '--non-interactive',
        '--agree-tos',
        '--no-eff-email',
        '--redirect',
        '--expand',
        '--cert-name',
        group.certName,
        '--email',
        email
      ];
      for (const domain of group.domains) args.push('-d', domain);
      if (config.staging) args.push('--staging');
      if (config.forceRenewal || input.forceRenewal) args.push('--force-renewal');

      updateJob(job, {
        progress: 42 + Math.round((index / Math.max(1, groups.length)) * 42),
        message: `Requesting free SSL for ${group.certName} (${group.domains.length} host${group.domains.length === 1 ? '' : 's'})`,
        domains: group.domains
      });
      try {
        await runCommand(certbot, args, { cwd: rootDir }, (text) => {
          const clean = text.trim();
          if (clean) updateJob(job, { message: clean.slice(-260) });
        });
        successful.push(...group.domains);
      } catch (error) {
        const explained = explainCertbotError(error, group.certName);
        failed.push(...group.domains.map((domain) => ({ domain, error: explained })));
        if (mode === 'main' && group.domains.includes(requestedDomain)) throw new Error(explained);
      }
    }
    if (!successful.length) throw new Error(failed[0]?.error || 'No SSL certificate could be issued.');

    await runCommand('/bin/bash', reloadNginxArgs(), { cwd: rootDir }, (text) => {
      const clean = text.trim();
      if (clean) updateJob(job, { message: clean.slice(-260) });
    }).catch((error) => {
      failed.push({ domain: 'nginx', error: error.stderr || error.message || String(error) });
    });

    const state = {
      lastRunAt: nowIso(),
      lastJobId: job.id,
      status: failed.length ? 'warning' : 'ok',
      successful,
      failed
    };
    await writeSetting(prisma, LAST_SSL_KEY, state).catch(() => {});
    await prisma.auditLog.create({
      data: {
        actorId: actor?.id || null,
        action: 'ssl_certificate_requested',
        resource: 'ssl',
        resourceId: filtered.join(','),
        metadata: { domains: filtered, successful, failed, mode, staging: Boolean(config.staging), wildcard }
      }
    }).catch(() => {});

    updateJob(job, {
      status: 'completed',
      progress: 100,
      message: failed.length ? `SSL completed with ${failed.length} warning/error item(s)` : 'SSL installed and auto-renew timer is active',
      domains: successful,
      failedDomains: failed,
      diagnostics,
      wildcard
    });
  } catch (error) {
    await writeSetting(prisma, LAST_SSL_KEY, {
      lastRunAt: nowIso(),
      lastJobId: job.id,
      status: 'failed',
      error: error.message || String(error)
    }).catch(() => {});
    updateJob(job, { status: 'failed', progress: Math.max(job.progress, 1), message: error.message || 'SSL failed', error: error.message || String(error) });
  }
};

const enqueueSslOperation = (operation) => {
  const next = sslRunChain.catch(() => undefined).then(operation);
  sslRunChain = next.catch(() => undefined);
  return next;
};

const runSslRenew = async ({ prisma, rootDir, job, actor, input = {} }) => {
  try {
    updateJob(job, { status: 'running', progress: 12, message: 'Preparing certificate renewal' });
    await runCommand('/bin/bash', installCertbotArgs(), { cwd: rootDir }, (text) => {
      if (text.trim()) updateJob(job, { message: text.trim().slice(-240) });
    });
    const certbot = await findExecutable(rootDir, 'certbot');
    const args = ['renew', '--non-interactive'];
    if (input.dryRun) args.push('--dry-run');
    if (input.forceRenewal) args.push('--force-renewal');
    updateJob(job, { progress: 45, message: 'Running certbot renew' });
    const { stdout, stderr } = await runCommand(certbot, args, { cwd: rootDir }, (text) => {
      const clean = text.trim();
      if (clean) updateJob(job, { message: clean.slice(-260) });
    });
    await runCommand('/bin/bash', reloadNginxArgs(), { cwd: rootDir }).catch(() => {});
    await writeSetting(prisma, LAST_SSL_KEY, {
      lastRenewAt: nowIso(),
      lastJobId: job.id,
      status: 'ok',
      output: `${stdout || ''}\n${stderr || ''}`.trim()
    }).catch(() => {});
    await prisma.auditLog.create({
      data: {
        actorId: actor?.id || null,
        action: 'ssl_certificate_renewed',
        resource: 'ssl',
        resourceId: 'certbot-renew',
        metadata: { dryRun: Boolean(input.dryRun), forceRenewal: Boolean(input.forceRenewal) }
      }
    }).catch(() => {});
    updateJob(job, { status: 'completed', progress: 100, message: 'SSL renewal completed' });
  } catch (error) {
    await writeSetting(prisma, LAST_SSL_KEY, {
      lastRenewAt: nowIso(),
      lastJobId: job.id,
      status: 'failed',
      error: error.stderr || error.message || String(error)
    }).catch(() => {});
    updateJob(job, { status: 'failed', progress: Math.max(job.progress, 1), message: error.stderr || error.message || 'SSL renewal failed', error: error.stderr || error.message || String(error) });
  }
};

const certbotStatus = async (rootDir, prisma) => {
  const config = await sslConfig(prisma);
  const { httpDomains, wildcardDomains } = await parseSslDomains(prisma, config, 'all');
  const domains = httpDomains.slice(0, 60);
  const [diagnostics, state] = await Promise.all([
    Promise.all(domains.map(diagnoseSslDomain)).catch(() => []),
    readSetting(prisma, LAST_SSL_KEY, {}).catch(() => ({}))
  ]);
  const wildcard = wildcardSslDiagnostic(wildcardDomains);
  let installed = false;
  let output = 'certbot is not available';
  try {
    const certbot = await findExecutable(rootDir, 'certbot');
    const result = await runExecFile(certbot, ['certificates'], { cwd: rootDir });
    installed = true;
    output = result.stdout || 'Certbot is installed, but no certificates were listed yet.';
  } catch (error) {
    output = error.stderr || error.message || output;
  }
  let timerStatus = 'unknown';
  try {
    const { stdout } = await runExecFile('systemctl', ['is-active', 'certbot.timer']);
    timerStatus = stdout.trim() || 'unknown';
  } catch (error) {
    timerStatus = error.stdout?.trim?.() || 'inactive';
  }
  return {
    installed,
    output,
    config,
    domains,
    diagnostics,
    wildcard,
    autoRenew: {
      enabled: Boolean(config.autoEnabled),
      timerStatus,
      active: timerStatus === 'active'
    },
    jobs: Array.from(sslJobs.values()).slice(-8).reverse().map(publicJob),
    state
  };
};

export const queueSslInstallForDomains = async ({ prisma, domains = [], actor = null, rootDir = fallbackRootDir } = {}) => {
  const validDomains = Array.from(new Set(domains.map(cleanHost).filter(isValidHost)));
  if (!validDomains.length || process.platform !== 'linux') return null;
  const current = await sslConfig(prisma);
  const domainsText = normalizeDomainListText([
    current.domainsText,
    validDomains.join('\n')
  ].filter(Boolean).join('\n'));
  const next = sanitizeSslConfig({
    ...current,
    autoEnabled: true,
    includeKnownDomains: true,
    includeWildcard: false,
    domainsText
  });
  await writeSetting(prisma, SSL_KEY, next).catch(() => {});
  const job = createJob(sslJobs, 'ssl-auto-domain', { source: 'powerdns', domains: validDomains });
  enqueueSslOperation(() => runSsl({ prisma, rootDir, job, actor, input: { ...next, mode: 'all' } }));
  return publicJob(job);
};

export const startBackupAutomation = ({ prisma, rootDir = fallbackRootDir }) => {
  if (autoTimer) clearInterval(autoTimer);
  autoTimer = setInterval(async () => {
    if (autoRunning) return;
    const config = await backupConfig(prisma).catch(() => null);
    if (!config?.autoEnabled) return;
    const state = await readSetting(prisma, LAST_AUTO_BACKUP_KEY, {}).catch(() => ({}));
    const lastAt = state.lastBackupAt ? new Date(state.lastBackupAt).getTime() : 0;
    const dueAt = lastAt + Number(config.intervalMinutes || 360) * 60 * 1000;
    if (Date.now() < dueAt) return;
    autoRunning = true;
    const job = createJob(backupJobs, 'backup', { source: 'auto' });
    await runBackup({ prisma, rootDir, job, actor: null, source: 'auto', uploadToDrive: true });
    await writeSetting(prisma, LAST_AUTO_BACKUP_KEY, { lastBackupAt: nowIso(), lastJobId: job.id, status: job.status }).catch(() => {});
    autoRunning = false;
  }, 60 * 1000);
};

export const startSslAutomation = ({ prisma, rootDir = fallbackRootDir }) => {
  if (sslAutoTimer) clearInterval(sslAutoTimer);
  sslAutoTimer = setInterval(async () => {
    if (sslAutoRunning) return;
    const config = await sslConfig(prisma).catch(() => null);
    if (!config?.autoEnabled) return;
    const state = await readSetting(prisma, LAST_SSL_KEY, {}).catch(() => ({}));
    const lastAt = state.lastRenewAt || state.lastRunAt;
    const lastTime = lastAt ? new Date(lastAt).getTime() : 0;
    const dueAt = lastTime + 24 * 60 * 60 * 1000;
    if (Date.now() < dueAt) return;
    sslAutoRunning = true;
    const job = createJob(sslJobs, 'ssl-auto-apply', { source: 'auto' });
    await enqueueSslOperation(() => runSsl({ prisma, rootDir, job, actor: null, input: { ...config, mode: 'all' } }));
    sslAutoRunning = false;
  }, 60 * 60 * 1000);
};

export const registerSystemToolRoutes = (app, { prisma, userFromRequest, rootDir = fallbackRootDir }) => {
  const router = express.Router();
  const paths = rootPaths(rootDir);
  const upload = multer({ dest: join(paths.tempDir, 'uploads'), limits: { fileSize: 1024 * 1024 * 1024 * 4 } });

  router.get('/backups/jobs/:id', (req, res, next) => {
    const job = backupJobs.get(req.params.id);
    if (job && isJobPollAuthorized(req, job)) {
      res.json({ job: publicJob(job) });
      return;
    }
    next();
  });

  router.use(async (req, res, next) => {
    try {
      const user = await userFromRequest(req);
      if (!user || !ADMIN_ROLES.has(user.role)) {
        res.status(user ? 403 : 401).json({ error: user ? 'Tiwlo Team access required' : 'Authentication required' });
        return;
      }
      req.tiwloUser = user;
      next();
    } catch (error) {
      res.status(503).json({ error: error.message || 'Authentication is temporarily unavailable' });
    }
  });

  router.get('/backups', async (_req, res) => {
    const [config, files, state] = await Promise.all([
      backupConfig(prisma),
      listBackupFiles(rootDir),
      readSetting(prisma, LAST_AUTO_BACKUP_KEY, {})
    ]);
    res.json({
      config: { ...config, googleServiceAccountJson: config.googleServiceAccountJson ? '[saved]' : '' },
      files,
      jobs: Array.from(backupJobs.values()).slice(-10).reverse().map(publicJob),
      state
    });
  });

  router.put('/backups/config', async (req, res) => {
    const current = await backupConfig(prisma);
    const next = sanitizeConfig({
      ...current,
      ...(req.body || {}),
      googleServiceAccountJson: req.body?.googleServiceAccountJson === '[saved]' ? current.googleServiceAccountJson : req.body?.googleServiceAccountJson
    });
    await writeSetting(prisma, BACKUP_KEY, next);
    res.json({ ok: true, config: { ...next, googleServiceAccountJson: next.googleServiceAccountJson ? '[saved]' : '' } });
  });

  router.post('/backups/create', async (req, res) => {
    const job = createJob(backupJobs, 'backup', { source: 'manual' });
    runBackup({ prisma, rootDir, job, actor: req.tiwloUser, source: 'manual', uploadToDrive: Boolean(req.body?.uploadToDrive) });
    res.status(202).json({ job: publicJob(job) });
  });

  router.get('/backups/jobs/:id', (req, res) => {
    sendJobStatus(backupJobs, req, res);
  });

  router.get('/backups/download/:name', async (req, res) => {
    const safeName = String(req.params.name || '').replace(/[/\\]/g, '');
    const filePath = join(paths.backupDir, safeName);
    if (!safeName.endsWith('.zip') || !(await exists(filePath))) {
      res.status(404).json({ error: 'Backup file not found' });
      return;
    }
    res.download(filePath, safeName);
  });

  router.post('/backups/import', upload.single('backup'), async (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: 'Backup zip file is required' });
      return;
    }
    const job = createJob(backupJobs, 'restore', { sourceFile: req.file.originalname });
    runRestore({ prisma, rootDir, job, uploadPath: req.file.path, actor: req.tiwloUser });
    res.status(202).json({ job: publicJob(job) });
  });

  router.get('/ssl/status', async (_req, res) => {
    res.json(await certbotStatus(rootDir, prisma));
  });

  router.put('/ssl/config', async (req, res) => {
    const current = await sslConfig(prisma);
    const next = sanitizeSslConfig({ ...current, ...(req.body || {}) });
    await writeSetting(prisma, SSL_KEY, next);
    await prisma.auditLog.create({
      data: {
        actorId: req.tiwloUser?.id || null,
        action: 'ssl_config_updated',
        resource: 'ssl',
        resourceId: next.primaryDomain,
        metadata: { autoEnabled: next.autoEnabled, includeWildcard: next.includeWildcard }
      }
    }).catch(() => {});
    res.json({ ok: true, config: next });
  });

  router.post('/ssl/apply', async (req, res) => {
    const current = await sslConfig(prisma);
    const input = { ...current, ...(req.body || {}) };
    const next = sanitizeSslConfig(input);
    if (req.body?.saveConfig !== false) await writeSetting(prisma, SSL_KEY, next);
    const job = createJob(sslJobs, 'ssl', { mode: req.body?.mode || 'all' });
    enqueueSslOperation(() => runSsl({ prisma, rootDir, job, actor: req.tiwloUser, input: { ...next, mode: req.body?.mode || 'all', domain: req.body?.domain } }));
    res.status(202).json({ job: publicJob(job) });
  });

  router.post('/ssl/renew', async (req, res) => {
    const job = createJob(sslJobs, 'ssl-renew', { source: 'manual' });
    enqueueSslOperation(() => runSslRenew({ prisma, rootDir, job, actor: req.tiwloUser, input: req.body || {} }));
    res.status(202).json({ job: publicJob(job) });
  });

  router.get('/ssl/jobs/:id', (req, res) => {
    const job = sslJobs.get(req.params.id);
    if (!job) {
      res.status(404).json({ error: 'SSL job not found' });
      return;
    }
    res.json({ job: publicJob(job) });
  });

  app.use('/admin', router);
};
