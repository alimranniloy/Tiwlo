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
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const fallbackRootDir = resolve(__dirname, '../../../..');
const backupJobs = new Map();
const sslJobs = new Map();
let autoTimer = null;
let autoRunning = false;

const BACKUP_KEY = 'backupAutomation';
const LAST_AUTO_BACKUP_KEY = 'backupAutomationState';
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
  if (!(await exists(extractedUploads))) return;
  await ensureDir(paths.restoreDir);
  if (await exists(paths.uploadsDir)) {
    const safetyDir = join(paths.restoreDir, `uploads-before-${Date.now()}`);
    updateJob(job, { progress: 72, message: 'Saving current uploads before restore' });
    await cp(paths.uploadsDir, safetyDir, { recursive: true, force: true });
    await rm(paths.uploadsDir, { recursive: true, force: true });
  }
  updateJob(job, { progress: 78, message: 'Restoring uploaded files' });
  await ensureDir(dirname(paths.uploadsDir));
  await cp(extractedUploads, paths.uploadsDir, { recursive: true, force: true });
};

const runRestore = async ({ prisma, rootDir, job, uploadPath, actor }) => {
  const paths = rootPaths(rootDir);
  const workDir = join(paths.tempDir, `restore-${job.id}`);
  try {
    updateJob(job, { status: 'running', progress: 8, message: 'Reading backup zip' });
    await ensureDir(paths.tempDir);
    const manifest = await extractZip(uploadPath, workDir);
    const sqlPath = join(workDir, 'database', 'database.sql');
    if (!(await exists(sqlPath))) throw new Error('database/database.sql was not found in the backup.');

    const db = parseDatabaseUrl();
    const psql = await findExecutable(rootDir, 'psql');
    updateJob(job, { progress: 35, message: 'Preparing PostgreSQL restore' });
    await prisma.$disconnect().catch(() => {});
    await runExecFile(psql, [
      ...pgArgs(db),
      '-v',
      'ON_ERROR_STOP=1',
      '-c',
      'DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;'
    ], { env: pgEnv(db) });

    updateJob(job, { progress: 48, message: 'Importing PostgreSQL data' });
    await runExecFile(psql, [
      ...pgArgs(db),
      '-v',
      'ON_ERROR_STOP=1',
      '-f',
      sqlPath
    ], { env: pgEnv(db) });
    await prisma.$connect().catch(() => {});

    await restoreUploads({ rootDir, extractedDir: workDir, job });

    await prisma.auditLog.create({
      data: {
        actorId: actor?.id || null,
        action: 'backup_restored',
        resource: 'systemBackup',
        resourceId: job.id,
        metadata: { manifest }
      }
    }).catch(() => {});

    updateJob(job, { status: 'completed', progress: 100, message: 'Import completed' });
  } catch (error) {
    await prisma.$connect().catch(() => {});
    updateJob(job, { status: 'failed', progress: Math.max(job.progress, 1), message: error.message || 'Import failed', error: error.message || String(error) });
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
    await rm(uploadPath, { force: true }).catch(() => {});
  }
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

const installCertbotArgs = () => {
  if (process.platform !== 'linux') throw new Error('Automatic SSL installation is supported on Linux servers only.');
  return ['-lc', 'if ! command -v certbot >/dev/null 2>&1; then if command -v apt-get >/dev/null 2>&1; then apt-get update && apt-get install -y certbot python3-certbot-nginx; elif command -v dnf >/dev/null 2>&1; then dnf install -y certbot python3-certbot-nginx; elif command -v yum >/dev/null 2>&1; then yum install -y certbot python3-certbot-nginx; else echo "No supported package manager found for certbot" >&2; exit 1; fi; fi'];
};

const runSsl = async ({ prisma, rootDir, job, actor, input }) => {
  try {
    updateJob(job, { status: 'running', progress: 8, message: 'Preparing SSL request' });
    const email = String(input.email || process.env.SSL_EMAIL || '').trim();
    if (!email || !email.includes('@')) throw new Error('A valid SSL email is required.');
    const mode = input.mode === 'all' ? 'all' : 'main';
    const domains = mode === 'all'
      ? await knownDomains(prisma)
      : [cleanHost(input.domain || process.env.APP_DOMAIN || process.env.FRONTEND_ORIGIN || '')].filter(Boolean);
    const filtered = Array.from(new Set(domains.filter(isValidHost)));
    if (!filtered.length) throw new Error('No valid domain found for SSL.');

    updateJob(job, { progress: 20, message: 'Installing certbot if needed', domains: filtered });
    await runCommand('/bin/bash', installCertbotArgs(), { cwd: rootDir }, (text) => {
      if (text.trim()) updateJob(job, { message: text.trim().slice(-240) });
    });

    const certbot = await findExecutable(rootDir, 'certbot');
    const successful = [];
    const failed = [];
    for (const [index, domain] of filtered.entries()) {
      const args = [
        'certonly',
        '--nginx',
        '--non-interactive',
        '--agree-tos',
        '--email',
        email,
        '-d',
        domain
      ];
      if (input.staging) args.push('--staging');
      if (input.forceRenewal) args.push('--force-renewal');

      updateJob(job, {
        progress: 45 + Math.round((index / Math.max(1, filtered.length)) * 40),
        message: `Requesting SSL for ${domain}`
      });
      try {
        await runCommand(certbot, args, { cwd: rootDir }, (text) => {
          const clean = text.trim();
          if (clean) updateJob(job, { message: clean.slice(-260) });
        });
        successful.push(domain);
      } catch (error) {
        failed.push({ domain, error: error.stderr || error.message || String(error) });
        if (mode === 'main') throw error;
      }
    }
    if (!successful.length) throw new Error(failed[0]?.error || 'No SSL certificate could be issued.');

    await runCommand('/bin/bash', ['-lc', 'if command -v nginx >/dev/null 2>&1; then nginx -t && systemctl reload nginx || true; fi'], { cwd: rootDir }, (text) => {
      const clean = text.trim();
      if (clean) updateJob(job, { message: clean.slice(-260) });
    });

    await prisma.auditLog.create({
      data: {
        actorId: actor?.id || null,
        action: 'ssl_certificate_requested',
        resource: 'ssl',
        resourceId: filtered.join(','),
        metadata: { domains: filtered, successful, failed, mode, staging: Boolean(input.staging) }
      }
    }).catch(() => {});

    updateJob(job, {
      status: 'completed',
      progress: 100,
      message: failed.length ? `SSL completed with ${failed.length} failed domain(s)` : 'SSL job completed',
      domains: successful,
      failedDomains: failed
    });
  } catch (error) {
    updateJob(job, { status: 'failed', progress: Math.max(job.progress, 1), message: error.message || 'SSL failed', error: error.message || String(error) });
  }
};

const certbotStatus = async (rootDir) => {
  try {
    const certbot = await findExecutable(rootDir, 'certbot');
    const { stdout } = await runExecFile(certbot, ['certificates'], { cwd: rootDir });
    return { installed: true, output: stdout };
  } catch (error) {
    return { installed: false, output: error.stderr || error.message || 'certbot is not available' };
  }
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

export const registerSystemToolRoutes = (app, { prisma, userFromRequest, rootDir = fallbackRootDir }) => {
  const router = express.Router();
  const paths = rootPaths(rootDir);
  const upload = multer({ dest: join(paths.tempDir, 'uploads'), limits: { fileSize: 1024 * 1024 * 1024 * 4 } });

  router.use(async (req, res, next) => {
    const user = await userFromRequest(req);
    if (!user || !ADMIN_ROLES.has(user.role)) {
      res.status(user ? 403 : 401).json({ error: user ? 'Admin access required' : 'Authentication required' });
      return;
    }
    req.tiwloUser = user;
    next();
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
    const job = backupJobs.get(req.params.id);
    if (!job) {
      res.status(404).json({ error: 'Backup job not found' });
      return;
    }
    res.json({ job: publicJob(job) });
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
    res.json(await certbotStatus(rootDir));
  });

  router.post('/ssl/apply', async (req, res) => {
    const job = createJob(sslJobs, 'ssl', { mode: req.body?.mode || 'main' });
    runSsl({ prisma, rootDir, job, actor: req.tiwloUser, input: req.body || {} });
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
