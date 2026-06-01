import { randomBytes, randomUUID, createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import { getActor, isAdmin } from '../../core/auth.js';
import { AppError } from '../../core/errors.js';
import { toApi } from '../../core/format.js';
import { writeAudit } from '../../core/audit.js';
import { invoiceCreditAmount, startInvoicePayment } from '../billing/service.js';

const json = (value, fallback) => JSON.stringify(value ?? fallback);
const text = (value, fallback = '') => String(value ?? fallback).trim();
const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const integer = (value, fallback = 0) => Number.isFinite(Number(value)) ? Math.floor(Number(value)) : fallback;
const normalizeRows = (rows) => toApi(rows || []);
const first = (rows) => normalizeRows(rows)[0] || null;

const ACTIVE_STATUSES = new Set(['active', 'trialing']);
const BLOCKED_STATUSES = new Set(['suspended', 'expired', 'cancelled', 'revoked', 'deleted']);
const TASK_ACTIONS = new Set([
  'create_account',
  'suspend_account',
  'unsuspend_account',
  'terminate_account',
  'change_account_password',
  'change_package',
  'delete_package',
  'sync_dns_zone',
  'restart_service',
  'reload_service',
  'apply_security_rule',
  'run_update',
  'suspend_license',
  'unsuspend_license',
  'renew_required',
  'apply_domain_settings',
  'backup_account',
  'restore_account'
]);

const LICENSE_PAYMENT_PROVIDER = 'credit';
const TPANEL_PACKAGE_SEED_VERSION = 2;
const TPANEL_CAPABILITIES = [
  'accounts',
  'packages',
  'dns',
  'databases',
  'email',
  'nodeApps',
  'ftp',
  'files',
  'services',
  'security',
  'updates',
  'backups',
  'terminal'
];

const DEFAULT_TPANEL_DOMAIN = 'tiwlo.com';
const TPANEL_REQUIRED_PORTS = [
  { port: 22, protocol: 'tcp', service: 'SSH', purpose: 'server login and emergency recovery', public: true },
  { port: 25, protocol: 'tcp', service: 'SMTP', purpose: 'outbound/inbound mail delivery', public: true },
  { port: 53, protocol: 'tcp/udp', service: 'DNS', purpose: 'authoritative DNS zones', public: true },
  { port: 80, protocol: 'tcp', service: 'HTTP', purpose: 'websites, installer, ACME challenge', public: true },
  { port: 110, protocol: 'tcp', service: 'POP3', purpose: 'mailbox access', public: true },
  { port: 143, protocol: 'tcp', service: 'IMAP', purpose: 'mailbox access', public: true },
  { port: 443, protocol: 'tcp', service: 'HTTPS', purpose: 'secure websites and panel domain', public: true },
  { port: 465, protocol: 'tcp', service: 'SMTPS', purpose: 'secure SMTP', public: true },
  { port: 587, protocol: 'tcp', service: 'Submission', purpose: 'authenticated SMTP', public: true },
  { port: 993, protocol: 'tcp', service: 'IMAPS', purpose: 'secure IMAP', public: true },
  { port: 995, protocol: 'tcp', service: 'POP3S', purpose: 'secure POP3', public: true },
  { port: 2086, protocol: 'tcp', service: 'tPanel', purpose: 'local tPanel app', public: false },
  { port: 2087, protocol: 'tcp', service: 'tPanel SSL', purpose: 'secure tPanel app', public: false },
  { port: 3306, protocol: 'tcp', service: 'MySQL/MariaDB', purpose: 'database service, keep private unless required', public: false },
  { port: 5432, protocol: 'tcp', service: 'PostgreSQL', purpose: 'PostgreSQL service, keep private unless required', public: false },
  { port: 6379, protocol: 'tcp', service: 'Redis', purpose: 'cache/session service, keep private', public: false }
];

const defaultPermissions = (overrides = {}) => TPANEL_CAPABILITIES.reduce((acc, key) => ({
  ...acc,
  [key]: overrides[key] ?? true
}), {});

const CONTROL_SECTIONS = [
  {
    key: 'accounts',
    label: 'Account Functions',
    description: 'Create, suspend, unsuspend, terminate, package-change and backup hosting accounts.',
    actions: ['create_account', 'suspend_account', 'unsuspend_account', 'terminate_account', 'change_package', 'backup_account', 'restore_account']
  },
  {
    key: 'packages',
    label: 'Package Manager',
    description: 'Define tPanel account packages and resource limits for accounts on licensed servers.',
    actions: ['upsert_package', 'delete_package']
  },
  {
    key: 'dns',
    label: 'DNS Zone Manager',
    description: 'Create and synchronize DNS zones, A/CNAME/MX/TXT records and nameserver metadata.',
    actions: ['sync_dns_zone']
  },
  {
    key: 'services',
    label: 'Service Manager',
    description: 'Restart or reload Nginx, Apache, PHP-FPM, MariaDB, PostgreSQL, Redis, Mail, DNS and security services.',
    actions: ['restart_service', 'reload_service']
  },
  {
    key: 'security',
    label: 'Security Center',
    description: 'Apply firewall, Fail2ban, ModSecurity, malware scan and brute-force protection rules.',
    actions: ['apply_security_rule']
  },
  {
    key: 'updates',
    label: 'Update Manager',
    description: 'Publish and force tPanel updates with no data loss by queuing update jobs to licensed servers.',
    actions: ['run_update']
  },
  {
    key: 'domainSettings',
    label: 'Domain Settings',
    description: 'Bind a public domain to tPanel, prepare DNS records, and keep installer/API URLs aligned.',
    actions: ['apply_domain_settings']
  },
  {
    key: 'systemStatus',
    label: 'System Status',
    description: 'Track required ports, firewall expectations, node heartbeat data, and service health.',
    actions: ['heartbeat', 'port_check']
  }
];

const defaultPackages = [
  {
    code: 'starter',
    name: 'tPanel Starter',
    description: 'Low-cost tPanel license for small hosting operators.',
    price: 2.99,
    maxAccounts: 10,
    maxDomains: 25,
    maxDatabases: 10,
    maxEmailAccounts: 50,
    maxNodeApps: 5,
    sortOrder: 10,
    features: [
      'tPanel Pro installer',
      'One licensed server IP',
      'Core tPanel account tools',
      'Email, DNS, database, file and Node.js managers'
    ],
    permissions: defaultPermissions({
      services: false,
      security: false,
      updates: false,
      backups: false,
      terminal: false
    })
  },
  {
    code: 'growth',
    name: 'tPanel Growth',
    description: 'For active hosting businesses with more clients.',
    price: 5.99,
    maxAccounts: 75,
    maxDomains: 150,
    maxDatabases: 80,
    maxEmailAccounts: 300,
    maxNodeApps: 30,
    sortOrder: 20,
    features: [
      'Everything in Starter',
      'Higher account and domain limits',
      'Priority update channel',
      'Extended service monitoring'
    ],
    permissions: defaultPermissions({
      backups: false
    })
  },
  {
    code: 'business',
    name: 'tPanel Business',
    description: 'Unlimited tPanel license for agencies and hosting providers.',
    price: 9.99,
    maxAccounts: 0,
    maxDomains: 0,
    maxDatabases: 0,
    maxEmailAccounts: 0,
    maxNodeApps: 0,
    sortOrder: 30,
    features: [
      'Everything in Growth',
      'Unlimited accounts, domains, databases, email and Node.js apps',
      'Forced update controls',
      'Premium support workflow'
    ],
    permissions: defaultPermissions()
  }
];

const TPANEL_TIMESTAMP_TABLES = [
  'TPanelPackage',
  'TPanelLicense',
  'TPanelNode',
  'TPanelUpdate',
  'TPanelAccountPackage',
  'TPanelManagedAccount',
  'TPanelDnsZone',
  'TPanelServiceState',
  'TPanelSecurityRule',
  'TPanelRemoteTask'
];

export const requiredServerPackages = [
  'nginx', 'apache2', 'php', 'php-fpm', 'php-cli', 'php-mysql', 'php-pgsql',
  'php-curl', 'php-gd', 'php-mbstring', 'php-xml', 'php-zip', 'php-bcmath',
  'php-intl', 'php-soap', 'php-imagick', 'php-redis', 'php-opcache',
  'mariadb-server', 'mariadb-client', 'mysql-server', 'mysql-client',
  'postgresql', 'postgresql-contrib', 'redis-server', 'memcached', 'nodejs',
  'npm', 'pm2', 'python3', 'python3-pip', 'python3-venv', 'python3-dev',
  'ruby', 'bundler', 'rbenv', 'openjdk-17-jdk', 'certbot',
  'python3-certbot-nginx', 'python3-certbot-apache', 'pdns-server',
  'pdns-backend-mysql', 'pdns-backend-pgsql', 'postfix', 'dovecot-core', 'dovecot-imapd',
  'dovecot-pop3d', 'opendkim', 'opendkim-tools', 'rspamd', 'mailutils',
  'libsasl2-modules', 'roundcube', 'vsftpd', 'openssh-server', 'ufw', 'firewalld',
  'fail2ban', 'clamav', 'maldet', 'libapache2-mod-security2', 'docker.io',
  'docker-compose-plugin', 'rclone', 'restic', 'borgbackup', 'cron', 'rsync',
  'git', 'curl', 'wget', 'zip', 'unzip', 'tar', 'nano', 'vim', 'htop',
  'net-tools', 'iftop', 'iotop', 'nload', 'sysstat', 'p7zip-full',
  'imagemagick', 'ffmpeg', 'supervisor', 'filebrowser', 'phpmyadmin',
  'adminer', 'composer', 'yarn', 'build-essential', 'software-properties-common',
  'ca-certificates', 'gnupg', 'lsb-release', 'openssl', 'sqlite3', 'logrotate',
  'policycoreutils', 'selinux-utils', 'acme.sh', 'lua5.4', 'brotli',
  'libnginx-mod-http-brotli-filter'
];

const signingSecret = () => (
  process.env.TPANEL_LICENSE_SIGNING_SECRET ||
  process.env.JWT_SECRET ||
  'dev-secret'
);

const apiBaseUrl = () => (
  process.env.API_BASE_URL ||
  process.env.APP_URL ||
  'https://tiwlo.com'
).replace(/\/+$/, '');

const tPanelRepoUrl = () => (
  process.env.TPANEL_REPO_URL ||
  'https://github.com/tiwlo/tpanel.git'
);

const shellEnvValue = (value) => `"${String(value || '').replace(/(["\\$`])/g, '\\$1')}"`;

const addMonths = (date, months) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
};

const invoiceNumber = () => `TPN-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString('hex').toUpperCase()}`;

const licenseKey = () => `tp_live_${randomBytes(24).toString('hex')}`;

const installCommandFor = (key) => `curl -fsSL "${apiBaseUrl()}/tpanel/install.sh" | sudo env TPANEL_LICENSE_KEY=${shellEnvValue(key || 'YOUR_LICENSE_KEY')} bash`;

const assertValidIp = (serverIp) => {
  const value = text(serverIp);
  if (!isIP(value)) {
    throw new AppError('A valid server IPv4 or IPv6 address is required for the license allowlist', 'BAD_USER_INPUT');
  }
  return value;
};

const signLicensePayload = (payload) => (
  createHmac('sha256', signingSecret())
    .update(JSON.stringify(payload))
    .digest('hex')
);

const normalizeIp = (value) => text(value).replace(/^::ffff:/, '');

const isLocalOrPrivateIp = (value) => {
  const ip = normalizeIp(value);
  return !ip ||
    ip === '::1' ||
    ip === '127.0.0.1' ||
    ip.startsWith('127.') ||
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip) ||
    ip.startsWith('fc') ||
    ip.startsWith('fd');
};

const packageLimits = (pkg = {}) => ({
  diskMB: integer(pkg.diskMB, 10240),
  bandwidthGB: integer(pkg.bandwidthGB, 100),
  domains: integer(pkg.domains, 5),
  databases: integer(pkg.databases, 5),
  emailAccounts: integer(pkg.emailAccounts, 25),
  nodeApps: integer(pkg.nodeApps, 3),
  ftpAccounts: integer(pkg.ftpAccounts, 5)
});

const packagePermissions = (pkg = {}) => ({
  ...defaultPermissions(),
  ...(pkg.permissions || pkg.metadata?.permissions || {})
});

const cleanDomain = (value, fallback = DEFAULT_TPANEL_DOMAIN) => {
  const domain = text(value || fallback).toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '')
    .replace(/[^a-z0-9.-]/g, '')
    .replace(/^\.+|\.+$/g, '');
  return domain || fallback;
};

const publicUrlForDomain = (domain, secure = true) => `${secure ? 'https' : 'http'}://${cleanDomain(domain)}`;

const detectedServerIp = (ctx, license) => (
  normalizeIp(license?.serverIp || process.env.TPANEL_SERVER_IP || process.env.SERVER_IP || process.env.PUBLIC_IP || ctx.requestIp || '')
);

const defaultDomainSettings = (ctx, license) => {
  const primaryDomain = DEFAULT_TPANEL_DOMAIN;
  const serverIp = detectedServerIp(ctx, license);
  return {
    primaryDomain,
    panelUrl: publicUrlForDomain(primaryDomain, true),
    detectedServerIp: serverIp,
    installScriptUrl: `${apiBaseUrl()}/tpanel/install.sh`,
    apiBaseUrl: apiBaseUrl(),
    autoDetectIp: true,
    enableNginxProxy: true,
    enableSsl: true,
    dnsRecords: [
      { type: 'A', name: '@', value: serverIp || 'SERVER_IP', ttl: 300 },
      { type: 'A', name: 'www', value: serverIp || 'SERVER_IP', ttl: 300 }
    ],
    ports: TPANEL_REQUIRED_PORTS,
    nginx: {
      serverName: `${primaryDomain} www.${primaryDomain}`,
      proxyTarget: 'http://127.0.0.1:2086',
      requiredLocations: ['/tpanel', '/tpanel/install.sh', '/tpanel/api', '/graphql', '/admin', '/health']
    }
  };
};

const mergeDomainSettings = (ctx, license, saved = {}) => {
  const defaults = defaultDomainSettings(ctx, license);
  const primaryDomain = cleanDomain(saved.primaryDomain || defaults.primaryDomain);
  const serverIp = saved.autoDetectIp === false
    ? text(saved.detectedServerIp || defaults.detectedServerIp)
    : defaults.detectedServerIp;
  return {
    ...defaults,
    ...saved,
    primaryDomain,
    panelUrl: saved.panelUrl || publicUrlForDomain(primaryDomain, saved.enableSsl !== false),
    detectedServerIp: serverIp,
    installScriptUrl: saved.installScriptUrl || defaults.installScriptUrl,
    apiBaseUrl: saved.apiBaseUrl || defaults.apiBaseUrl,
    dnsRecords: Array.isArray(saved.dnsRecords) && saved.dnsRecords.length > 0
      ? saved.dnsRecords.map((record) => ({ ...record, value: record.value === 'SERVER_IP' ? (serverIp || 'SERVER_IP') : record.value }))
      : [
          { type: 'A', name: '@', value: serverIp || 'SERVER_IP', ttl: 300 },
          { type: 'A', name: 'www', value: serverIp || 'SERVER_IP', ttl: 300 }
        ],
    ports: TPANEL_REQUIRED_PORTS,
    updatedAt: saved.updatedAt || null
  };
};

const readTPanelDomainSettings = async (ctx, license) => {
  const row = await ctx.prisma.systemSetting.findUnique({
    where: { scope_scopeId_key: { scope: 'tpanel', scopeId: license?.id || 'global', key: 'domain_settings' } }
  }).catch(() => null);
  return mergeDomainSettings(ctx, license, row?.value || {});
};

const portStatusFromMetrics = (metrics = {}, services = []) => {
  const listeningPorts = new Set((metrics.listeningPorts || metrics.openPorts || []).map((item) => Number(item.port ?? item)));
  const allowedPorts = new Set((metrics.allowedPorts || metrics.firewallAllowedPorts || []).map((item) => Number(item.port ?? item)));
  const servicePorts = new Set(services.map((service) => Number(service.port)).filter(Boolean));
  return TPANEL_REQUIRED_PORTS.map((port) => {
    const open = listeningPorts.has(port.port) || servicePorts.has(port.port);
    const allowed = allowedPorts.has(port.port) || metrics.firewallMode === 'inactive';
    return {
      ...port,
      open,
      allowed,
      status: open ? 'listening' : 'not_reported',
      firewallStatus: allowed ? 'allowed' : 'not_reported'
    };
  });
};

const systemChecksFor = ({ license, node, services, domainSettings }) => {
  const metrics = node?.metrics || {};
  const ports = portStatusFromMetrics(metrics, services);
  return {
    detectedServerIp: domainSettings.detectedServerIp || license?.serverIp || null,
    publicDomain: domainSettings.primaryDomain,
    panelUrl: domainSettings.panelUrl,
    installScriptUrl: domainSettings.installScriptUrl,
    ports,
    services,
    node: node || null,
    firewall: {
      mode: metrics.firewallMode || 'unknown',
      raw: metrics.firewall || null
    },
    checks: {
      heartbeat: node?.lastSeenAt ? 'reported' : 'waiting',
      dns: domainSettings.detectedServerIp ? 'ready_to_point_a_record' : 'server_ip_unknown',
      installerRoute: domainSettings.installScriptUrl ? 'configured' : 'missing',
      postgresql: ports.find((item) => item.port === 5432)?.status || 'not_reported'
    },
    generatedAt: new Date().toISOString()
  };
};

const decoratePackage = (pkg) => pkg ? ({
  ...pkg,
  permissions: packagePermissions(pkg)
}) : null;

const licensePlanLimits = (license = {}) => ({
  accounts: integer(license.packageMaxAccounts ?? license.package?.maxAccounts, 0),
  domains: integer(license.packageMaxDomains ?? license.package?.maxDomains, 0),
  databases: integer(license.packageMaxDatabases ?? license.package?.maxDatabases, 0),
  emailAccounts: integer(license.packageMaxEmailAccounts ?? license.package?.maxEmailAccounts, 0),
  nodeApps: integer(license.packageMaxNodeApps ?? license.package?.maxNodeApps, 0)
});

const isUnlimited = (value) => integer(value, 0) <= 0;

const limitLabel = (value) => isUnlimited(value) ? 'unlimited' : String(integer(value, 0));

const assertCapability = (license, capability, label = capability) => {
  const permissions = packagePermissions(license.package || license);
  if (permissions[capability] === false) {
    throw new AppError(`This tPanel package does not include ${label}`, 'FORBIDDEN');
  }
};

const assertLimitWithinPlan = (license, key, requested, label) => {
  const max = licensePlanLimits(license)[key];
  if (!isUnlimited(max) && integer(requested, 0) > max) {
    throw new AppError(`${label} exceeds this tPanel license limit of ${max}`, 'RESOURCE_EXHAUSTED');
  }
};

const assertUsageWithinPlan = async (ctx, license, key, current, add, label) => {
  const max = licensePlanLimits(license)[key];
  const next = integer(current, 0) + integer(add, 0);
  if (!isUnlimited(max) && next > max) {
    throw new AppError(`${label} limit reached for this tPanel license (${next}/${max})`, 'RESOURCE_EXHAUSTED');
  }
};

const ensureTimestampDefaults = async (prisma) => {
  for (const table of TPANEL_TIMESTAMP_TABLES) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP`);
  }
};

export const ensureTPanelTables = async (prisma) => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "TPanelPackage" (
      "id" TEXT PRIMARY KEY,
      "code" TEXT NOT NULL UNIQUE,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "currency" TEXT NOT NULL DEFAULT 'USD',
      "interval" TEXT NOT NULL DEFAULT 'month',
      "maxAccounts" INTEGER NOT NULL DEFAULT 0,
      "maxDomains" INTEGER NOT NULL DEFAULT 0,
      "maxDatabases" INTEGER NOT NULL DEFAULT 0,
      "maxEmailAccounts" INTEGER NOT NULL DEFAULT 0,
      "maxNodeApps" INTEGER NOT NULL DEFAULT 0,
      "features" JSONB NOT NULL DEFAULT '[]'::jsonb,
      "status" TEXT NOT NULL DEFAULT 'active',
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "metadata" JSONB DEFAULT '{}'::jsonb,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "TPanelLicense" (
      "id" TEXT PRIMARY KEY,
      "ownerId" TEXT NOT NULL,
      "packageId" TEXT NOT NULL,
      "invoiceId" TEXT,
      "licenseKey" TEXT NOT NULL UNIQUE,
      "label" TEXT,
      "serverIp" TEXT NOT NULL,
      "serverFingerprint" TEXT,
      "status" TEXT NOT NULL DEFAULT 'pending_payment',
      "billingStatus" TEXT NOT NULL DEFAULT 'open',
      "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "currency" TEXT NOT NULL DEFAULT 'USD',
      "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "activatedAt" TIMESTAMP(3),
      "currentPeriodStart" TIMESTAMP(3),
      "currentPeriodEnd" TIMESTAMP(3),
      "suspendedAt" TIMESTAMP(3),
      "cancelledAt" TIMESTAMP(3),
      "lastCheckAt" TIMESTAMP(3),
      "lastHeartbeatAt" TIMESTAMP(3),
      "metadata" JSONB DEFAULT '{}'::jsonb,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "TPanelLicense_owner_status_idx" ON "TPanelLicense" ("ownerId", "status")');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "TPanelLicense_serverIp_idx" ON "TPanelLicense" ("serverIp")');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "TPanelNode" (
      "id" TEXT PRIMARY KEY,
      "licenseId" TEXT NOT NULL,
      "serverIp" TEXT NOT NULL,
      "fingerprint" TEXT NOT NULL,
      "hostname" TEXT,
      "os" TEXT,
      "panelVersion" TEXT,
      "agentVersion" TEXT,
      "status" TEXT NOT NULL DEFAULT 'online',
      "message" TEXT,
      "metrics" JSONB DEFAULT '{}'::jsonb,
      "packages" JSONB DEFAULT '[]'::jsonb,
      "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "TPanelNode_license_fingerprint_uidx" ON "TPanelNode" ("licenseId", "fingerprint")');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "TPanelNode_status_idx" ON "TPanelNode" ("status")');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "TPanelUpdate" (
      "id" TEXT PRIMARY KEY,
      "version" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "channel" TEXT NOT NULL DEFAULT 'stable',
      "status" TEXT NOT NULL DEFAULT 'published',
      "isForced" BOOLEAN NOT NULL DEFAULT false,
      "releaseNotes" TEXT,
      "packageUrl" TEXT,
      "checksum" TEXT,
      "rolloutMessage" TEXT,
      "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "metadata" JSONB DEFAULT '{}'::jsonb,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "TPanelUpdate_channel_status_idx" ON "TPanelUpdate" ("channel", "status")');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "TPanelAccountPackage" (
      "id" TEXT PRIMARY KEY,
      "licenseId" TEXT,
      "name" TEXT NOT NULL,
      "code" TEXT NOT NULL,
      "description" TEXT,
      "status" TEXT NOT NULL DEFAULT 'active',
      "diskMB" INTEGER NOT NULL DEFAULT 10240,
      "bandwidthGB" INTEGER NOT NULL DEFAULT 100,
      "domains" INTEGER NOT NULL DEFAULT 5,
      "databases" INTEGER NOT NULL DEFAULT 5,
      "emailAccounts" INTEGER NOT NULL DEFAULT 25,
      "nodeApps" INTEGER NOT NULL DEFAULT 3,
      "ftpAccounts" INTEGER NOT NULL DEFAULT 5,
      "metadata" JSONB DEFAULT '{}'::jsonb,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "TPanelAccountPackage_license_code_uidx" ON "TPanelAccountPackage" (COALESCE("licenseId", \'\'), "code")');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "TPanelAccountPackage_license_status_idx" ON "TPanelAccountPackage" ("licenseId", "status")');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "TPanelManagedAccount" (
      "id" TEXT PRIMARY KEY,
      "licenseId" TEXT NOT NULL,
      "packageId" TEXT,
      "username" TEXT NOT NULL,
      "domain" TEXT NOT NULL,
      "contactEmail" TEXT,
      "ownerName" TEXT,
      "status" TEXT NOT NULL DEFAULT 'queued',
      "ipAddress" TEXT,
      "homeDirectory" TEXT,
      "limits" JSONB NOT NULL DEFAULT '{}'::jsonb,
      "usage" JSONB DEFAULT '{}'::jsonb,
      "metadata" JSONB DEFAULT '{}'::jsonb,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "TPanelManagedAccount_license_username_uidx" ON "TPanelManagedAccount" ("licenseId", "username")');
  await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "TPanelManagedAccount_license_domain_uidx" ON "TPanelManagedAccount" ("licenseId", "domain")');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "TPanelManagedAccount_license_status_idx" ON "TPanelManagedAccount" ("licenseId", "status")');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "TPanelDnsZone" (
      "id" TEXT PRIMARY KEY,
      "licenseId" TEXT NOT NULL,
      "accountId" TEXT,
      "domain" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'active',
      "records" JSONB NOT NULL DEFAULT '[]'::jsonb,
      "serial" TEXT,
      "lastSyncedAt" TIMESTAMP(3),
      "metadata" JSONB DEFAULT '{}'::jsonb,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "TPanelDnsZone_license_domain_uidx" ON "TPanelDnsZone" ("licenseId", "domain")');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "TPanelServiceState" (
      "id" TEXT PRIMARY KEY,
      "licenseId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "displayName" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'unknown',
      "enabled" BOOLEAN NOT NULL DEFAULT true,
      "port" INTEGER,
      "lastRestartAt" TIMESTAMP(3),
      "lastCheckAt" TIMESTAMP(3),
      "metadata" JSONB DEFAULT '{}'::jsonb,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "TPanelServiceState_license_name_uidx" ON "TPanelServiceState" ("licenseId", "name")');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "TPanelSecurityRule" (
      "id" TEXT PRIMARY KEY,
      "licenseId" TEXT NOT NULL,
      "kind" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "action" TEXT NOT NULL DEFAULT 'deny',
      "value" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'active',
      "metadata" JSONB DEFAULT '{}'::jsonb,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "TPanelSecurityRule_license_status_idx" ON "TPanelSecurityRule" ("licenseId", "status")');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "TPanelRemoteTask" (
      "id" TEXT PRIMARY KEY,
      "licenseId" TEXT NOT NULL,
      "accountId" TEXT,
      "action" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'queued',
      "priority" INTEGER NOT NULL DEFAULT 50,
      "payload" JSONB NOT NULL DEFAULT '{}'::jsonb,
      "result" JSONB DEFAULT '{}'::jsonb,
      "requestedById" TEXT,
      "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "dispatchedAt" TIMESTAMP(3),
      "completedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "TPanelRemoteTask_license_status_idx" ON "TPanelRemoteTask" ("licenseId", "status", "priority")');

  await ensureTimestampDefaults(prisma);

  for (const pkg of defaultPackages) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO "TPanelPackage"
        ("id", "code", "name", "description", "price", "currency", "interval",
         "maxAccounts", "maxDomains", "maxDatabases", "maxEmailAccounts",
         "maxNodeApps", "features", "status", "sortOrder", "metadata", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, 'USD', 'month', $6, $7, $8, $9, $10, CAST($11 AS jsonb), 'active', $12, CAST($13 AS jsonb), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT ("code") DO UPDATE SET
        "name" = EXCLUDED."name",
        "description" = EXCLUDED."description",
        "price" = EXCLUDED."price",
        "currency" = EXCLUDED."currency",
        "interval" = EXCLUDED."interval",
        "maxAccounts" = EXCLUDED."maxAccounts",
        "maxDomains" = EXCLUDED."maxDomains",
        "maxDatabases" = EXCLUDED."maxDatabases",
        "maxEmailAccounts" = EXCLUDED."maxEmailAccounts",
        "maxNodeApps" = EXCLUDED."maxNodeApps",
        "features" = EXCLUDED."features",
        "sortOrder" = EXCLUDED."sortOrder",
        "metadata" = EXCLUDED."metadata",
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE COALESCE("TPanelPackage"."metadata"->>'managedBySeed', 'true') <> 'false'
        AND (
          CASE
            WHEN COALESCE("TPanelPackage"."metadata"->>'seedVersion', '') ~ '^[0-9]+$'
            THEN ("TPanelPackage"."metadata"->>'seedVersion')::int
            ELSE 0
          END
        ) < $14
    `, `pkg_${pkg.code}`, pkg.code, pkg.name, pkg.description, pkg.price, pkg.maxAccounts,
      pkg.maxDomains, pkg.maxDatabases, pkg.maxEmailAccounts, pkg.maxNodeApps,
      json(pkg.features, []), pkg.sortOrder, json({
        seeded: true,
        managedBySeed: true,
        seedVersion: TPANEL_PACKAGE_SEED_VERSION,
        permissions: pkg.permissions || defaultPermissions()
      }, {}), TPANEL_PACKAGE_SEED_VERSION);
  }
};

const latestPublishedUpdate = async (prisma) => (
  first(await prisma.$queryRawUnsafe(`
    SELECT * FROM "TPanelUpdate"
    WHERE "status" = 'published'
    ORDER BY "publishedAt" DESC, "createdAt" DESC
    LIMIT 1
  `))
);

const licenseWithJoins = async (prisma, whereSql, ...params) => (
  first(await prisma.$queryRawUnsafe(`
    SELECT l.*,
      p."code" AS "packageCode",
      p."name" AS "packageName",
      p."maxAccounts" AS "packageMaxAccounts",
      p."maxDomains" AS "packageMaxDomains",
      p."maxDatabases" AS "packageMaxDatabases",
      p."maxEmailAccounts" AS "packageMaxEmailAccounts",
      p."maxNodeApps" AS "packageMaxNodeApps",
      p."features" AS "packageFeatures",
      p."price" AS "packagePrice",
      p."currency" AS "packageCurrency",
      p."interval" AS "packageInterval",
      p."status" AS "packageStatus",
      p."sortOrder" AS "packageSortOrder",
      p."metadata" AS "packageMetadata",
      u."name" AS "ownerName",
      u."email" AS "ownerEmail",
      i."number" AS "invoiceNumber",
      i."status" AS "invoiceStatus",
      i."amount" AS "invoiceAmount",
      i."dueDate" AS "invoiceDueDate",
      n."hostname" AS "nodeHostname",
      n."os" AS "nodeOs",
      n."panelVersion" AS "nodePanelVersion",
      n."agentVersion" AS "nodeAgentVersion",
      n."lastSeenAt" AS "nodeLastSeenAt"
    FROM "TPanelLicense" l
    LEFT JOIN "TPanelPackage" p ON p."id" = l."packageId"
    LEFT JOIN "User" u ON u."id" = l."ownerId"
    LEFT JOIN "Invoice" i ON i."id" = l."invoiceId"
    LEFT JOIN "TPanelNode" n ON n."licenseId" = l."id"
    ${whereSql}
    ORDER BY l."createdAt" DESC
  `, ...params))
);

const decorateLicense = (license) => {
  if (!license) return null;
  return {
    ...license,
    installCommand: installCommandFor(license.licenseKey),
    package: {
      id: license.packageId,
      code: license.packageCode,
      name: license.packageName,
      maxAccounts: license.packageMaxAccounts,
      maxDomains: license.packageMaxDomains,
      maxDatabases: license.packageMaxDatabases,
      maxEmailAccounts: license.packageMaxEmailAccounts,
      maxNodeApps: license.packageMaxNodeApps,
      features: license.packageFeatures || [],
      price: license.packagePrice,
      currency: license.packageCurrency,
      interval: license.packageInterval,
      status: license.packageStatus,
      sortOrder: license.packageSortOrder,
      metadata: license.packageMetadata || {},
      permissions: packagePermissions({ metadata: license.packageMetadata || {} })
    },
    owner: license.ownerName || license.ownerEmail ? {
      id: license.ownerId,
      name: license.ownerName,
      email: license.ownerEmail
    } : null,
    invoice: license.invoiceId ? {
      id: license.invoiceId,
      number: license.invoiceNumber,
      status: license.invoiceStatus,
      amount: license.invoiceAmount,
      dueDate: license.invoiceDueDate
    } : null,
    node: license.nodeHostname || license.nodeLastSeenAt ? {
      hostname: license.nodeHostname,
      os: license.nodeOs,
      panelVersion: license.nodePanelVersion,
      agentVersion: license.nodeAgentVersion,
      lastSeenAt: license.nodeLastSeenAt
    } : null
  };
};

const activatePaidLicense = async (ctx, licenseId, months = 1) => {
  const current = first(await ctx.prisma.$queryRawUnsafe('SELECT * FROM "TPanelLicense" WHERE "id" = $1', licenseId));
  if (!current) throw new AppError('tPanel license was not found', 'NOT_FOUND');
  const now = new Date();
  const existingEnd = current.currentPeriodEnd ? new Date(current.currentPeriodEnd) : null;
  const base = existingEnd && existingEnd > now ? existingEnd : now;
  const periodEnd = addMonths(base, Math.max(1, integer(months, 1)));
  await ctx.prisma.$executeRawUnsafe(`
    UPDATE "TPanelLicense"
    SET "status" = 'active',
        "billingStatus" = 'paid',
        "activatedAt" = COALESCE("activatedAt", CURRENT_TIMESTAMP),
        "currentPeriodStart" = COALESCE("currentPeriodStart", CURRENT_TIMESTAMP),
        "currentPeriodEnd" = $2,
        "suspendedAt" = NULL,
        "cancelledAt" = NULL,
        "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = $1
  `, licenseId, periodEnd);
  return decorateLicense(await licenseWithJoins(ctx.prisma, 'WHERE l."id" = $1', licenseId));
};

export const listTPanelPackages = async (ctx, { status } = {}) => {
  await ensureTPanelTables(ctx.prisma);
  const rows = await ctx.prisma.$queryRawUnsafe('SELECT * FROM "TPanelPackage" ORDER BY "sortOrder" ASC, "price" ASC');
  return normalizeRows(rows).filter((pkg) => !status || pkg.status === status).map(decoratePackage);
};

export const upsertTPanelPackage = async (ctx, input) => {
  await ensureTPanelTables(ctx.prisma);
  const id = input.id || `pkg_${text(input.code || input.name).toLowerCase().replace(/[^a-z0-9_-]+/g, '-') || randomUUID()}`;
  const code = text(input.code || input.name).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  const name = text(input.name);
  if (!code || !name) throw new AppError('Package code and name are required', 'BAD_USER_INPUT');
  const metadata = {
    ...(input.metadata || {}),
    managedBySeed: false,
    permissions: {
      ...defaultPermissions(),
      ...(input.metadata?.permissions || input.permissions || {})
    },
    updatedFromAdmin: true
  };
  const values = [
    id,
    code,
    name,
    input.description || null,
    Math.max(0, number(input.price, 0)),
    text(input.currency || 'USD').toUpperCase(),
    text(input.interval || 'month'),
    Math.max(0, integer(input.maxAccounts, 0)),
    Math.max(0, integer(input.maxDomains, 0)),
    Math.max(0, integer(input.maxDatabases, 0)),
    Math.max(0, integer(input.maxEmailAccounts, 0)),
    Math.max(0, integer(input.maxNodeApps, 0)),
    json(input.features, []),
    text(input.status || 'active'),
    integer(input.sortOrder, 100),
    json(metadata, {})
  ];
  const rows = input.id
    ? await ctx.prisma.$queryRawUnsafe(`
        UPDATE "TPanelPackage"
        SET "code" = $2, "name" = $3, "description" = $4, "price" = $5,
            "currency" = $6, "interval" = $7, "maxAccounts" = $8,
            "maxDomains" = $9, "maxDatabases" = $10, "maxEmailAccounts" = $11,
            "maxNodeApps" = $12, "features" = CAST($13 AS jsonb), "status" = $14,
            "sortOrder" = $15, "metadata" = CAST($16 AS jsonb), "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = $1
        RETURNING *
      `, ...values)
    : await ctx.prisma.$queryRawUnsafe(`
        INSERT INTO "TPanelPackage"
          ("id", "code", "name", "description", "price", "currency", "interval",
           "maxAccounts", "maxDomains", "maxDatabases", "maxEmailAccounts",
           "maxNodeApps", "features", "status", "sortOrder", "metadata", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CAST($13 AS jsonb), $14, $15, CAST($16 AS jsonb), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT ("code") DO UPDATE SET
          "name" = EXCLUDED."name",
          "description" = EXCLUDED."description",
          "price" = EXCLUDED."price",
          "currency" = EXCLUDED."currency",
          "interval" = EXCLUDED."interval",
          "maxAccounts" = EXCLUDED."maxAccounts",
          "maxDomains" = EXCLUDED."maxDomains",
          "maxDatabases" = EXCLUDED."maxDatabases",
          "maxEmailAccounts" = EXCLUDED."maxEmailAccounts",
          "maxNodeApps" = EXCLUDED."maxNodeApps",
          "features" = EXCLUDED."features",
          "status" = EXCLUDED."status",
          "sortOrder" = EXCLUDED."sortOrder",
          "metadata" = EXCLUDED."metadata",
          "updatedAt" = CURRENT_TIMESTAMP
        RETURNING *
      `, ...values);
  const pkg = first(rows);
  if (!pkg) throw new AppError('tPanel package was not saved', 'BAD_USER_INPUT');
  await writeAudit(ctx, input.id ? 'update_tpanel_package' : 'upsert_tpanel_package', 'TPanelPackage', pkg.id, { code: pkg.code });
  return decoratePackage(pkg);
};

export const deleteTPanelPackage = async (ctx, id) => {
  await ensureTPanelTables(ctx.prisma);
  const pkg = first(await ctx.prisma.$queryRawUnsafe('SELECT * FROM "TPanelPackage" WHERE "id" = $1', id));
  if (!pkg) throw new AppError('tPanel package was not found', 'NOT_FOUND');
  const activeLicenses = first(await ctx.prisma.$queryRawUnsafe(
    'SELECT COUNT(*)::int AS count FROM "TPanelLicense" WHERE "packageId" = $1 AND "status" NOT IN (\'deleted\', \'cancelled\', \'revoked\')',
    id
  ))?.count || 0;
  if (activeLicenses > 0) {
    await ctx.prisma.$executeRawUnsafe(`
      UPDATE "TPanelPackage"
      SET "status" = 'archived',
          "metadata" = CAST($2 AS jsonb),
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = $1
    `, id, json({ ...(pkg.metadata || {}), managedBySeed: false, archivedAt: new Date().toISOString() }, {}));
  } else {
    await ctx.prisma.$executeRawUnsafe('DELETE FROM "TPanelPackage" WHERE "id" = $1', id);
  }
  await writeAudit(ctx, 'delete_tpanel_package', 'TPanelPackage', id, { code: pkg.code, activeLicenses });
  return true;
};

export const getMyTPanelLicenses = async (ctx) => {
  await ensureTPanelTables(ctx.prisma);
  const actor = await getActor(ctx);
  if (!actor) throw new AppError('Authentication is required', 'UNAUTHENTICATED');
  const rows = await ctx.prisma.$queryRawUnsafe(`
    SELECT l.*, p."code" AS "packageCode", p."name" AS "packageName",
      p."maxAccounts" AS "packageMaxAccounts", p."maxDomains" AS "packageMaxDomains",
      p."maxDatabases" AS "packageMaxDatabases", p."maxEmailAccounts" AS "packageMaxEmailAccounts",
      p."maxNodeApps" AS "packageMaxNodeApps", p."features" AS "packageFeatures",
      p."price" AS "packagePrice", p."currency" AS "packageCurrency",
      p."interval" AS "packageInterval", p."status" AS "packageStatus",
      p."sortOrder" AS "packageSortOrder", p."metadata" AS "packageMetadata",
      i."number" AS "invoiceNumber", i."status" AS "invoiceStatus", i."amount" AS "invoiceAmount", i."dueDate" AS "invoiceDueDate",
      n."hostname" AS "nodeHostname", n."os" AS "nodeOs", n."panelVersion" AS "nodePanelVersion",
      n."agentVersion" AS "nodeAgentVersion", n."lastSeenAt" AS "nodeLastSeenAt"
    FROM "TPanelLicense" l
    LEFT JOIN "TPanelPackage" p ON p."id" = l."packageId"
    LEFT JOIN "Invoice" i ON i."id" = l."invoiceId"
    LEFT JOIN "TPanelNode" n ON n."licenseId" = l."id"
    WHERE l."ownerId" = $1 AND l."status" <> 'deleted'
    ORDER BY l."createdAt" DESC
  `, actor.id);
  return normalizeRows(rows).map(decorateLicense);
};

export const getTPanelLicense = async (ctx, id) => {
  await ensureTPanelTables(ctx.prisma);
  const actor = await getActor(ctx);
  if (!actor) throw new AppError('Authentication is required', 'UNAUTHENTICATED');
  const license = await licenseWithJoins(ctx.prisma, 'WHERE l."id" = $1', id);
  if (!license) throw new AppError('tPanel license was not found', 'NOT_FOUND');
  if (!isAdmin(actor) && license.ownerId !== actor.id) throw new AppError('You cannot access this tPanel license', 'FORBIDDEN');
  return decorateLicense(license);
};

export const updateTPanelLicense = async (ctx, input) => {
  await ensureTPanelTables(ctx.prisma);
  const current = await getTPanelLicense(ctx, input.id);
  const actor = await getActor(ctx);
  const nextServerIp = input.serverIp === undefined ? current.serverIp : assertValidIp(input.serverIp);
  const nextLabel = input.label === undefined ? current.label : text(input.label || current.package?.name || current.serverIp);
  const packageInput = text(input.packageId || input.packageCode || '');
  let nextPackage = null;
  if (packageInput) {
    nextPackage = first(await ctx.prisma.$queryRawUnsafe(
      'SELECT * FROM "TPanelPackage" WHERE "id" = $1 OR "code" = $1 LIMIT 1',
      packageInput
    ));
    if (!nextPackage || nextPackage.status !== 'active') throw new AppError('Selected tPanel package is not available', 'BAD_USER_INPUT');
    if (!isAdmin(actor) && current.status !== 'pending_payment') {
      throw new AppError('Only an administrator can change the package after a license has been paid', 'FORBIDDEN');
    }
  }
  const serverChanged = nextServerIp !== current.serverIp;
  const metadata = {
    ...(current.metadata || {}),
    allowlist: { ...((current.metadata || {}).allowlist || {}), serverIp: nextServerIp },
    editedAt: new Date().toISOString(),
    editedBy: actor?.id || null
  };
  const rows = await ctx.prisma.$queryRawUnsafe(`
    UPDATE "TPanelLicense"
    SET "label" = $2,
        "serverIp" = $3,
        "packageId" = COALESCE($4, "packageId"),
        "serverFingerprint" = CASE WHEN $5 THEN NULL ELSE "serverFingerprint" END,
        "metadata" = CAST($6 AS jsonb),
        "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = $1
    RETURNING *
  `, current.id, nextLabel, nextServerIp, nextPackage?.id || null, serverChanged, json(metadata, {}));
  const updated = first(rows);
  if (!updated) throw new AppError('tPanel license was not updated', 'BAD_USER_INPUT');
  if (serverChanged && ACTIVE_STATUSES.has(current.status)) {
    await queueRemoteTask(ctx, {
      licenseId: current.id,
      action: 'renew_required',
      payload: { reason: 'server_ip_changed', oldServerIp: current.serverIp, newServerIp: nextServerIp },
      priority: 1
    }).catch(() => null);
  }
  await writeAudit(ctx, 'update_tpanel_license', 'tPanelLicense', current.id, {
    serverChanged,
    packageId: nextPackage?.id || current.packageId
  });
  return decorateLicense(await licenseWithJoins(ctx.prisma, 'WHERE l."id" = $1', current.id));
};

export const deleteTPanelLicense = async (ctx, id) => {
  await ensureTPanelTables(ctx.prisma);
  const license = await getTPanelLicense(ctx, id);
  await ctx.prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('DELETE FROM "TPanelRemoteTask" WHERE "licenseId" = $1', id);
    await tx.$executeRawUnsafe('DELETE FROM "TPanelSecurityRule" WHERE "licenseId" = $1', id);
    await tx.$executeRawUnsafe('DELETE FROM "TPanelServiceState" WHERE "licenseId" = $1', id);
    await tx.$executeRawUnsafe('DELETE FROM "TPanelDnsZone" WHERE "licenseId" = $1', id);
    await tx.$executeRawUnsafe('DELETE FROM "TPanelManagedAccount" WHERE "licenseId" = $1', id);
    await tx.$executeRawUnsafe('DELETE FROM "TPanelAccountPackage" WHERE "licenseId" = $1', id);
    await tx.$executeRawUnsafe('DELETE FROM "TPanelNode" WHERE "licenseId" = $1', id);
    await tx.$executeRawUnsafe('DELETE FROM "TPanelLicense" WHERE "id" = $1', id);
  });
  await writeAudit(ctx, 'delete_tpanel_license', 'tPanelLicense', id, {
    ownerId: license.ownerId,
    serverIp: license.serverIp
  });
  return true;
};

export const createTPanelLicenseOrder = async (ctx, input) => {
  await ensureTPanelTables(ctx.prisma);
  const actor = await getActor(ctx);
  if (!actor) throw new AppError('Authentication is required', 'UNAUTHENTICATED');

  const pkg = first(await ctx.prisma.$queryRawUnsafe(
    'SELECT * FROM "TPanelPackage" WHERE "id" = $1 OR "code" = $1 LIMIT 1',
    text(input.packageId || input.packageCode)
  ));
  if (!pkg || pkg.status !== 'active') throw new AppError('Selected tPanel package is not available', 'BAD_USER_INPUT');

  const serverIp = assertValidIp(input.serverIp);
  const months = Math.max(1, Math.min(24, integer(input.months, 1)));
  const amount = number(pkg.price, 0) * months;
  const id = randomUUID();
  const key = licenseKey();
  const now = new Date();
  const dueDate = addMonths(now, 1);

  const invoice = await ctx.prisma.invoice.create({
    data: {
      ownerId: actor.id,
      number: invoiceNumber(),
      amount,
      currency: input.currency || pkg.currency || 'USD',
      status: amount > 0 ? 'open' : 'paid',
      scope: 'tpanel_license',
      scopeId: id,
      dueDate,
      paidAt: amount > 0 ? null : now,
      items: {
        lineItems: [{
          label: `${pkg.name} monthly license`,
          amount,
          quantity: months,
          serverIp
        }],
        tPanel: {
          licenseId: id,
          packageCode: pkg.code,
          serverIp,
          months,
          limits: {
            accounts: pkg.maxAccounts,
            domains: pkg.maxDomains,
            databases: pkg.maxDatabases,
            emailAccounts: pkg.maxEmailAccounts,
            nodeApps: pkg.maxNodeApps
          }
        }
      }
    }
  });

  const status = amount > 0 ? 'pending_payment' : 'active';
  const periodEnd = amount > 0 ? null : addMonths(now, months);
  await ctx.prisma.$executeRawUnsafe(`
    INSERT INTO "TPanelLicense"
      ("id", "ownerId", "packageId", "invoiceId", "licenseKey", "label", "serverIp",
       "status", "billingStatus", "amount", "currency", "activatedAt",
       "currentPeriodStart", "currentPeriodEnd", "metadata", "createdAt", "updatedAt")
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CAST($15 AS jsonb), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `, id, actor.id, pkg.id, invoice.id, key, text(input.label || `${pkg.name} server`), serverIp,
    status, amount > 0 ? 'open' : 'paid', amount, invoice.currency,
    amount > 0 ? null : now, amount > 0 ? null : now, periodEnd,
    json({ order: { months, invoiceId: invoice.id }, allowlist: { serverIp } }, {}));

  await writeAudit(ctx, 'create_tpanel_license_order', 'tPanelLicense', id, { packageCode: pkg.code, serverIp, amount });
  return decorateLicense(await licenseWithJoins(ctx.prisma, 'WHERE l."id" = $1', id));
};

export const payTPanelLicenseOrder = async (ctx, { licenseId, provider }) => {
  await ensureTPanelTables(ctx.prisma);
  const license = await getTPanelLicense(ctx, licenseId);
  if (!license.invoiceId) throw new AppError('This tPanel license does not have an invoice', 'BAD_USER_INPUT');
  const requestedProvider = text(provider || LICENSE_PAYMENT_PROVIDER).toLowerCase();
  if (!['credit', 'credits'].includes(requestedProvider)) {
    throw new AppError('tPanel licenses are paid from Tiwlo credit only. Add credit first, then pay with credit.', 'BAD_USER_INPUT');
  }

  const checkout = await startInvoicePayment(ctx, { invoiceId: license.invoiceId, provider: LICENSE_PAYMENT_PROVIDER });
  let updatedLicense = await getTPanelLicense(ctx, licenseId);

  return { license: updatedLicense, checkout };
};

export const renewTPanelLicenseOrder = async (ctx, input) => {
  await ensureTPanelTables(ctx.prisma);
  const license = await getTPanelLicense(ctx, input.licenseId);
  const months = Math.max(1, Math.min(24, integer(input.months, 1)));
  const now = new Date();
  const currentEnd = license.currentPeriodEnd ? new Date(license.currentPeriodEnd) : null;
  if (license.status === 'pending_payment') {
    throw new AppError('Pay the current tPanel invoice from credit before renewing this license', 'BAD_USER_INPUT');
  }
  if (ACTIVE_STATUSES.has(license.status) && currentEnd && currentEnd > now) {
    throw new AppError(`Renewal opens after ${currentEnd.toISOString()}. This license is already active until then.`, 'BAD_USER_INPUT');
  }
  const pkg = first(await ctx.prisma.$queryRawUnsafe('SELECT * FROM "TPanelPackage" WHERE "id" = $1', license.packageId));
  if (!pkg) throw new AppError('tPanel package was not found', 'NOT_FOUND');
  const amount = number(pkg.price, 0) * months;
  const currency = input.currency || pkg.currency || 'USD';
  const owner = await ctx.prisma.user.findUnique({ where: { id: license.ownerId } });
  const creditCharge = invoiceCreditAmount({ amount, currency });
  if (Number(owner?.credits || 0) < creditCharge) {
    throw new AppError(`Insufficient credit balance. Add credit before renewing this ${pkg.name} license.`, 'CREDIT_REQUIRED');
  }
  const invoice = await ctx.prisma.invoice.create({
    data: {
      ownerId: license.ownerId,
      number: invoiceNumber(),
      amount,
      currency,
      status: 'open',
      scope: 'tpanel_license',
      scopeId: license.id,
      dueDate: now,
      items: {
        lineItems: [{ label: `${pkg.name} renewal`, amount, quantity: months, serverIp: license.serverIp }],
        tPanel: { licenseId: license.id, renewal: true, months, packageCode: pkg.code, serverIp: license.serverIp }
      }
    }
  });
  const checkout = await startInvoicePayment(ctx, { invoiceId: invoice.id, provider: LICENSE_PAYMENT_PROVIDER });
  if (checkout.status !== 'paid') {
    throw new AppError(checkout.message || 'Unable to renew from credit balance', 'PAYMENT_REQUIRED');
  }
  await ctx.prisma.$executeRawUnsafe(`
    UPDATE "TPanelLicense"
    SET "invoiceId" = $2,
        "metadata" = CAST($3 AS jsonb),
        "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = $1
  `, license.id, invoice.id, json({ ...(license.metadata || {}), renewal: { months, invoiceId: invoice.id } }, {}));
  await writeAudit(ctx, 'renew_tpanel_license_order', 'tPanelLicense', license.id, { months, amount });
  return decorateLicense(await licenseWithJoins(ctx.prisma, 'WHERE l."id" = $1', license.id));
};

export const adminTPanelOverview = async (ctx) => {
  await ensureTPanelTables(ctx.prisma);
  const summary = first(await ctx.prisma.$queryRawUnsafe(`
    SELECT
      (SELECT COUNT(*)::int FROM "TPanelPackage" WHERE "status" = 'active') AS "packages",
      COUNT(*)::int AS "licenses",
      COUNT(*) FILTER (WHERE l."status" = 'active')::int AS "activeLicenses",
      COUNT(*) FILTER (WHERE l."status" = 'suspended')::int AS "suspendedLicenses",
      COUNT(*) FILTER (WHERE l."status" = 'expired')::int AS "expiredLicenses",
      COUNT(*) FILTER (WHERE l."status" = 'pending_payment')::int AS "pendingLicenses",
      COALESCE(SUM(CASE WHEN l."status" = 'active' THEN l."amount" ELSE 0 END), 0)::float AS "monthlyRevenue",
      COALESCE((SELECT SUM("amount") FROM "Invoice" WHERE "scope" = 'tpanel_license' AND "status" = 'open'), 0)::float AS "dueAmount"
    FROM "TPanelLicense" l
  `)) || {
    packages: 0,
    licenses: 0,
    activeLicenses: 0,
    suspendedLicenses: 0,
    expiredLicenses: 0,
    pendingLicenses: 0,
    monthlyRevenue: 0,
    dueAmount: 0
  };

  const licenses = normalizeRows(await ctx.prisma.$queryRawUnsafe(`
    SELECT l.*, p."code" AS "packageCode", p."name" AS "packageName",
      p."maxAccounts" AS "packageMaxAccounts", p."maxDomains" AS "packageMaxDomains",
      p."maxDatabases" AS "packageMaxDatabases", p."maxEmailAccounts" AS "packageMaxEmailAccounts",
      p."maxNodeApps" AS "packageMaxNodeApps", p."features" AS "packageFeatures",
      p."price" AS "packagePrice", p."currency" AS "packageCurrency",
      p."interval" AS "packageInterval", p."status" AS "packageStatus",
      p."sortOrder" AS "packageSortOrder", p."metadata" AS "packageMetadata",
      u."name" AS "ownerName", u."email" AS "ownerEmail",
      i."number" AS "invoiceNumber", i."status" AS "invoiceStatus", i."amount" AS "invoiceAmount", i."dueDate" AS "invoiceDueDate",
      n."hostname" AS "nodeHostname", n."os" AS "nodeOs", n."panelVersion" AS "nodePanelVersion",
      n."agentVersion" AS "nodeAgentVersion", n."lastSeenAt" AS "nodeLastSeenAt"
    FROM "TPanelLicense" l
    LEFT JOIN "TPanelPackage" p ON p."id" = l."packageId"
    LEFT JOIN "User" u ON u."id" = l."ownerId"
    LEFT JOIN "Invoice" i ON i."id" = l."invoiceId"
    LEFT JOIN "TPanelNode" n ON n."licenseId" = l."id"
    ORDER BY l."createdAt" DESC
    LIMIT 250
  `)).map(decorateLicense);

  const packages = await listTPanelPackages(ctx);
  const updates = normalizeRows(await ctx.prisma.$queryRawUnsafe('SELECT * FROM "TPanelUpdate" ORDER BY "publishedAt" DESC, "createdAt" DESC LIMIT 25'));

  return { summary, licenses, packages, updates };
};

const licenseForControl = async (ctx, licenseId) => {
  const license = await getTPanelLicense(ctx, licenseId);
  if (!ACTIVE_STATUSES.has(license.status)) {
    throw new AppError('This tPanel license must be active before tPanel controls can be changed', 'BAD_USER_INPUT');
  }
  return license;
};

const queueRemoteTask = async (ctx, input) => {
  const actor = await getActor(ctx);
  const action = text(input.action).toLowerCase();
  if (!TASK_ACTIONS.has(action)) throw new AppError('Unsupported tPanel remote action', 'BAD_USER_INPUT');
  const license = await licenseForControl(ctx, input.licenseId);
  const actionCapabilities = {
    create_account: 'accounts',
    suspend_account: 'accounts',
    unsuspend_account: 'accounts',
    terminate_account: 'accounts',
    change_package: 'packages',
    delete_package: 'packages',
    sync_dns_zone: 'dns',
    restart_service: 'services',
    reload_service: 'services',
    apply_security_rule: 'security',
    run_update: 'updates',
    apply_domain_settings: 'dns',
    backup_account: 'backups',
    restore_account: 'backups'
  };
  if (actionCapabilities[action]) assertCapability(license, actionCapabilities[action], `${actionCapabilities[action]} controls`);
  const id = randomUUID();
  const rows = await ctx.prisma.$queryRawUnsafe(`
    INSERT INTO "TPanelRemoteTask"
      ("id", "licenseId", "accountId", "action", "status", "priority", "payload", "requestedById", "createdAt", "updatedAt")
    VALUES ($1, $2, $3, $4, 'queued', $5, CAST($6 AS jsonb), $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING *
  `, id, license.id, input.accountId || null, action, integer(input.priority, 50), json(input.payload, {}), actor?.id || null);
  await writeAudit(ctx, 'queue_tpanel_remote_task', 'tPanelRemoteTask', id, { licenseId: license.id, action });
  return first(rows);
};

export const tPanelControlOverview = async (ctx, { licenseId } = {}) => {
  await ensureTPanelTables(ctx.prisma);
  const actor = await getActor(ctx);
  if (!actor) throw new AppError('Authentication is required', 'UNAUTHENTICATED');
  const licenses = isAdmin(actor)
    ? normalizeRows(await ctx.prisma.$queryRawUnsafe('SELECT * FROM "TPanelLicense" WHERE "status" <> \'deleted\' ORDER BY "createdAt" DESC LIMIT 250'))
    : normalizeRows(await ctx.prisma.$queryRawUnsafe('SELECT * FROM "TPanelLicense" WHERE "ownerId" = $1 AND "status" <> \'deleted\' ORDER BY "createdAt" DESC', actor.id));
  const selectedLicense = licenseId ? await getTPanelLicense(ctx, licenseId) : (licenses[0] ? await getTPanelLicense(ctx, licenses[0].id) : null);
  if (!selectedLicense) {
    return {
      sections: CONTROL_SECTIONS,
      license: null,
      packages: [],
      accounts: [],
      dnsZones: [],
      services: [],
      securityRules: [],
      tasks: [],
      domainSettings: defaultDomainSettings(ctx, null),
      systemStatus: systemChecksFor({ license: null, node: null, services: [], domainSettings: defaultDomainSettings(ctx, null) }),
      requiredPackages: requiredServerPackages
    };
  }

  const [packages, accounts, dnsZones, services, securityRules, tasks, nodeRows] = await Promise.all([
    ctx.prisma.$queryRawUnsafe('SELECT * FROM "TPanelAccountPackage" WHERE "licenseId" = $1 OR "licenseId" IS NULL ORDER BY "createdAt" DESC', selectedLicense.id),
    ctx.prisma.$queryRawUnsafe('SELECT * FROM "TPanelManagedAccount" WHERE "licenseId" = $1 ORDER BY "createdAt" DESC', selectedLicense.id),
    ctx.prisma.$queryRawUnsafe('SELECT * FROM "TPanelDnsZone" WHERE "licenseId" = $1 ORDER BY "domain" ASC', selectedLicense.id),
    ctx.prisma.$queryRawUnsafe('SELECT * FROM "TPanelServiceState" WHERE "licenseId" = $1 ORDER BY "name" ASC', selectedLicense.id),
    ctx.prisma.$queryRawUnsafe('SELECT * FROM "TPanelSecurityRule" WHERE "licenseId" = $1 ORDER BY "createdAt" DESC', selectedLicense.id),
    ctx.prisma.$queryRawUnsafe('SELECT * FROM "TPanelRemoteTask" WHERE "licenseId" = $1 ORDER BY "queuedAt" DESC LIMIT 100', selectedLicense.id),
    ctx.prisma.$queryRawUnsafe('SELECT * FROM "TPanelNode" WHERE "licenseId" = $1 ORDER BY "lastSeenAt" DESC LIMIT 1', selectedLicense.id)
  ]);
  const domainSettings = await readTPanelDomainSettings(ctx, selectedLicense);
  const serviceRows = normalizeRows(services);
  const node = first(nodeRows);

  return {
    sections: CONTROL_SECTIONS,
    license: selectedLicense,
    packages: normalizeRows(packages),
    accounts: normalizeRows(accounts),
    dnsZones: normalizeRows(dnsZones),
    services: serviceRows,
    securityRules: normalizeRows(securityRules),
    tasks: normalizeRows(tasks),
    domainSettings,
    systemStatus: systemChecksFor({ license: selectedLicense, node, services: serviceRows, domainSettings }),
    requiredPackages: requiredServerPackages
  };
};

export const upsertTPanelAccountPackage = async (ctx, input) => {
  await ensureTPanelTables(ctx.prisma);
  const license = await licenseForControl(ctx, input.licenseId);
  assertCapability(license, 'packages', 'package management');
  const id = input.id || randomUUID();
  const name = text(input.name);
  const code = text(input.code || name).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  if (!name || !code) throw new AppError('Package name is required', 'BAD_USER_INPUT');
  const limits = packageLimits(input);
  assertLimitWithinPlan(license, 'domains', limits.domains, 'Package domain allowance');
  assertLimitWithinPlan(license, 'databases', limits.databases, 'Package database allowance');
  assertLimitWithinPlan(license, 'emailAccounts', limits.emailAccounts, 'Package email allowance');
  assertLimitWithinPlan(license, 'nodeApps', limits.nodeApps, 'Package Node.js allowance');
  const existing = input.id
    ? first(await ctx.prisma.$queryRawUnsafe('SELECT "id" FROM "TPanelAccountPackage" WHERE "id" = $1', id))
    : first(await ctx.prisma.$queryRawUnsafe('SELECT "id" FROM "TPanelAccountPackage" WHERE "licenseId" = $1 AND "code" = $2', license.id, code));
  const values = [
    id,
    license.id,
    name,
    code,
    input.description || null,
    text(input.status || 'active'),
    limits.diskMB,
    limits.bandwidthGB,
    limits.domains,
    limits.databases,
    limits.emailAccounts,
    limits.nodeApps,
    limits.ftpAccounts,
    json(input.metadata, {})
  ];
  const rows = existing
    ? await ctx.prisma.$queryRawUnsafe(`
        UPDATE "TPanelAccountPackage"
        SET "licenseId" = $2, "name" = $3, "code" = $4, "description" = $5,
            "status" = $6, "diskMB" = $7, "bandwidthGB" = $8, "domains" = $9,
            "databases" = $10, "emailAccounts" = $11, "nodeApps" = $12,
            "ftpAccounts" = $13, "metadata" = CAST($14 AS jsonb), "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = $1
        RETURNING *
      `, ...values)
    : await ctx.prisma.$queryRawUnsafe(`
        INSERT INTO "TPanelAccountPackage"
          ("id", "licenseId", "name", "code", "description", "status", "diskMB",
           "bandwidthGB", "domains", "databases", "emailAccounts", "nodeApps",
           "ftpAccounts", "metadata", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CAST($14 AS jsonb), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `, ...values);
  const pkg = first(rows);
  await queueRemoteTask(ctx, { licenseId: license.id, action: 'change_package', payload: { package: pkg }, priority: 30 });
  await writeAudit(ctx, input.id ? 'update_tpanel_account_package' : 'create_tpanel_account_package', 'TPanelAccountPackage', pkg.id, { licenseId: license.id, code });
  return pkg;
};

export const deleteTPanelAccountPackage = async (ctx, id) => {
  await ensureTPanelTables(ctx.prisma);
  const pkg = first(await ctx.prisma.$queryRawUnsafe('SELECT * FROM "TPanelAccountPackage" WHERE "id" = $1', id));
  if (!pkg) throw new AppError('tPanel account package was not found', 'NOT_FOUND');
  const license = await licenseForControl(ctx, pkg.licenseId);
  assertCapability(license, 'packages', 'package management');
  const activeAccounts = first(await ctx.prisma.$queryRawUnsafe(
    'SELECT COUNT(*)::int AS count FROM "TPanelManagedAccount" WHERE "packageId" = $1 AND "status" NOT IN (\'terminated\', \'deleted\')',
    id
  ))?.count || 0;
  if (activeAccounts > 0) {
    const rows = await ctx.prisma.$queryRawUnsafe(`
      UPDATE "TPanelAccountPackage"
      SET "status" = 'archived',
          "metadata" = CAST($2 AS jsonb),
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = $1
      RETURNING *
    `, id, json({ ...(pkg.metadata || {}), archivedAt: new Date().toISOString(), activeAccounts }, {}));
    await queueRemoteTask(ctx, { licenseId: license.id, action: 'delete_package', payload: { package: first(rows), mode: 'archive' }, priority: 30 });
  } else {
    await ctx.prisma.$executeRawUnsafe('DELETE FROM "TPanelAccountPackage" WHERE "id" = $1 AND "licenseId" = $2', id, license.id);
    await queueRemoteTask(ctx, { licenseId: license.id, action: 'delete_package', payload: { package: pkg, mode: 'delete' }, priority: 30 });
  }
  await writeAudit(ctx, 'delete_tpanel_account_package', 'TPanelAccountPackage', id, { licenseId: license.id, activeAccounts });
  return true;
};

export const createTPanelManagedAccount = async (ctx, input) => {
  await ensureTPanelTables(ctx.prisma);
  const license = await licenseForControl(ctx, input.licenseId);
  assertCapability(license, 'accounts', 'account creation');
  const pkg = input.packageId
    ? first(await ctx.prisma.$queryRawUnsafe('SELECT * FROM "TPanelAccountPackage" WHERE "id" = $1 AND "licenseId" = $2 AND "status" = \'active\'', input.packageId, license.id))
    : null;
  if (input.packageId && !pkg) throw new AppError('Selected tPanel account package is not active', 'BAD_USER_INPUT');
  const activeAccounts = first(await ctx.prisma.$queryRawUnsafe(
    'SELECT COUNT(*)::int AS count FROM "TPanelManagedAccount" WHERE "licenseId" = $1 AND "status" NOT IN (\'terminated\', \'deleted\')',
    license.id
  ))?.count || 0;
  const maxAccounts = integer(license.package?.maxAccounts, 0);
  if (maxAccounts > 0 && activeAccounts >= maxAccounts) {
    throw new AppError('This tPanel license has reached its account limit', 'RESOURCE_EXHAUSTED');
  }
  const packageLimit = pkg ? packageLimits(pkg) : packageLimits(input);
  assertLimitWithinPlan(license, 'domains', packageLimit.domains, 'Account package domain allowance');
  assertLimitWithinPlan(license, 'databases', packageLimit.databases, 'Account package database allowance');
  assertLimitWithinPlan(license, 'emailAccounts', packageLimit.emailAccounts, 'Account package email allowance');
  assertLimitWithinPlan(license, 'nodeApps', packageLimit.nodeApps, 'Account package Node.js allowance');
  const username = text(input.username).toLowerCase();
  const domain = text(input.domain).toLowerCase();
  if (!username || !domain) throw new AppError('Account username and domain are required', 'BAD_USER_INPUT');
  await ctx.prisma.$executeRawUnsafe(`
    DELETE FROM "TPanelDnsZone"
    WHERE "licenseId" = $1
      AND "status" = 'deleted'
      AND LOWER("domain") = $2
  `, license.id, domain);
  await ctx.prisma.$executeRawUnsafe(`
    DELETE FROM "TPanelRemoteTask"
    WHERE "accountId" IN (
      SELECT "id" FROM "TPanelManagedAccount"
      WHERE "licenseId" = $1
        AND "status" IN ('terminated', 'deleted')
        AND (LOWER("username") = $2 OR LOWER("domain") = $3)
    )
  `, license.id, username, domain);
  await ctx.prisma.$executeRawUnsafe(`
    DELETE FROM "TPanelManagedAccount"
    WHERE "licenseId" = $1
      AND "status" IN ('terminated', 'deleted')
      AND (LOWER("username") = $2 OR LOWER("domain") = $3)
  `, license.id, username, domain);
  const id = randomUUID();
  const limits = { ...(pkg ? packageLimits(pkg) : {}), ...(input.limits || {}) };
  assertLimitWithinPlan(license, 'domains', limits.domains, 'Account domain allowance');
  assertLimitWithinPlan(license, 'databases', limits.databases, 'Account database allowance');
  assertLimitWithinPlan(license, 'emailAccounts', limits.emailAccounts, 'Account email allowance');
  assertLimitWithinPlan(license, 'nodeApps', limits.nodeApps, 'Account Node.js allowance');
  const rows = await ctx.prisma.$queryRawUnsafe(`
    INSERT INTO "TPanelManagedAccount"
      ("id", "licenseId", "packageId", "username", "domain", "contactEmail", "ownerName",
       "status", "ipAddress", "homeDirectory", "limits", "usage", "metadata", "createdAt", "updatedAt")
    VALUES ($1, $2, $3, $4, $5, $6, $7, 'queued', $8, $9, CAST($10 AS jsonb), CAST($11 AS jsonb), CAST($12 AS jsonb), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING *
  `, id, license.id, pkg?.id || null, username, domain, input.contactEmail || null, input.ownerName || null,
    input.ipAddress || license.serverIp, input.homeDirectory || `/home/${username}`, json(limits, {}),
    json(input.usage, {}), json(input.metadata, {}));
  const account = first(rows);
  await queueRemoteTask(ctx, { licenseId: license.id, accountId: account.id, action: 'create_account', payload: { account, package: pkg, password: input.password || null }, priority: 10 });
  await writeAudit(ctx, 'create_tpanel_managed_account', 'TPanelManagedAccount', account.id, { licenseId: license.id, username, domain });
  return account;
};

export const updateTPanelManagedAccountStatus = async (ctx, input) => {
  await ensureTPanelTables(ctx.prisma);
  const account = first(await ctx.prisma.$queryRawUnsafe('SELECT * FROM "TPanelManagedAccount" WHERE "id" = $1', input.id));
  if (!account) throw new AppError('tPanel account was not found', 'NOT_FOUND');
  const license = await licenseForControl(ctx, account.licenseId);
  assertCapability(license, 'accounts', 'account controls');
  const status = text(input.status).toLowerCase();
  if (!['active', 'suspended', 'terminated', 'queued', 'error'].includes(status)) {
    throw new AppError('Unsupported account status', 'BAD_USER_INPUT');
  }
  const action = status === 'suspended'
    ? 'suspend_account'
    : status === 'active'
      ? 'unsuspend_account'
      : status === 'terminated'
        ? 'terminate_account'
        : 'create_account';
  const rows = await ctx.prisma.$queryRawUnsafe(`
    UPDATE "TPanelManagedAccount"
    SET "status" = $2, "metadata" = CAST($3 AS jsonb), "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = $1
    RETURNING *
  `, account.id, status, json({ ...(account.metadata || {}), statusNote: input.note || null, statusChangedAt: new Date().toISOString() }, {}));
  const updated = first(rows);
  await queueRemoteTask(ctx, { licenseId: account.licenseId, accountId: account.id, action, payload: { account: updated, note: input.note || null }, priority: 15 });
  await writeAudit(ctx, 'update_tpanel_managed_account_status', 'TPanelManagedAccount', account.id, { status });
  return updated;
};

export const upsertTPanelDnsZone = async (ctx, input) => {
  await ensureTPanelTables(ctx.prisma);
  const license = await licenseForControl(ctx, input.licenseId);
  assertCapability(license, 'dns', 'DNS zone management');
  const id = input.id || randomUUID();
  const domain = text(input.domain).toLowerCase();
  if (!domain) throw new AppError('DNS zone domain is required', 'BAD_USER_INPUT');
  if (!input.id) {
    const existingZones = first(await ctx.prisma.$queryRawUnsafe(
      'SELECT COUNT(*)::int AS count FROM "TPanelDnsZone" WHERE "licenseId" = $1 AND "status" <> \'deleted\'',
      license.id
    ))?.count || 0;
    await assertUsageWithinPlan(ctx, license, 'domains', existingZones, 1, 'DNS zone');
  }
  const existing = input.id
    ? first(await ctx.prisma.$queryRawUnsafe('SELECT "id" FROM "TPanelDnsZone" WHERE "id" = $1', id))
    : first(await ctx.prisma.$queryRawUnsafe('SELECT "id" FROM "TPanelDnsZone" WHERE "licenseId" = $1 AND "domain" = $2', license.id, domain));
  const rows = existing
    ? await ctx.prisma.$queryRawUnsafe(`
        UPDATE "TPanelDnsZone"
        SET "accountId" = $2, "domain" = $3, "status" = $4, "records" = CAST($5 AS jsonb),
            "serial" = $6, "metadata" = CAST($7 AS jsonb), "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = $1
        RETURNING *
      `, existing.id, input.accountId || null, domain, text(input.status || 'active'), json(input.records, []), input.serial || String(Date.now()), json(input.metadata, {}))
    : await ctx.prisma.$queryRawUnsafe(`
        INSERT INTO "TPanelDnsZone"
          ("id", "licenseId", "accountId", "domain", "status", "records", "serial", "metadata", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, CAST($6 AS jsonb), $7, CAST($8 AS jsonb), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `, id, license.id, input.accountId || null, domain, text(input.status || 'active'), json(input.records, []), input.serial || String(Date.now()), json(input.metadata, {}));
  const zone = first(rows);
  await queueRemoteTask(ctx, { licenseId: license.id, accountId: input.accountId || null, action: 'sync_dns_zone', payload: { zone }, priority: 20 });
  await writeAudit(ctx, 'upsert_tpanel_dns_zone', 'TPanelDnsZone', zone.id, { licenseId: license.id, domain });
  return zone;
};

export const updateTPanelDomainSettings = async (ctx, input) => {
  await ensureTPanelTables(ctx.prisma);
  const license = await getTPanelLicense(ctx, input.licenseId);
  const current = await readTPanelDomainSettings(ctx, license);
  const merged = mergeDomainSettings(ctx, license, {
    ...current,
    ...input,
    primaryDomain: cleanDomain(input.primaryDomain || current.primaryDomain),
    autoDetectIp: input.autoDetectIp !== false,
    enableNginxProxy: input.enableNginxProxy !== false,
    enableSsl: input.enableSsl !== false,
    updatedAt: new Date().toISOString()
  });
  delete merged.licenseId;

  await ctx.prisma.systemSetting.upsert({
    where: { scope_scopeId_key: { scope: 'tpanel', scopeId: license.id, key: 'domain_settings' } },
    create: { scope: 'tpanel', scopeId: license.id, key: 'domain_settings', value: merged },
    update: { value: merged }
  });

  if (ACTIVE_STATUSES.has(license.status)) {
    await queueRemoteTask(ctx, {
      licenseId: license.id,
      action: 'apply_domain_settings',
      payload: { domainSettings: merged },
      priority: 18
    });
  }

  await writeAudit(ctx, 'update_tpanel_domain_settings', 'TPanelDomainSettings', license.id, {
    primaryDomain: merged.primaryDomain,
    panelUrl: merged.panelUrl
  });
  return merged;
};

export const upsertTPanelServiceState = async (ctx, input) => {
  await ensureTPanelTables(ctx.prisma);
  const license = await licenseForControl(ctx, input.licenseId);
  assertCapability(license, 'services', 'service controls');
  const name = text(input.name).toLowerCase();
  if (!name) throw new AppError('Service name is required', 'BAD_USER_INPUT');
  const rows = await ctx.prisma.$queryRawUnsafe(`
    INSERT INTO "TPanelServiceState"
      ("id", "licenseId", "name", "displayName", "status", "enabled", "port", "lastCheckAt", "metadata", "createdAt", "updatedAt")
    VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CAST($8 AS jsonb), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("licenseId", "name") DO UPDATE SET
      "displayName" = EXCLUDED."displayName",
      "status" = EXCLUDED."status",
      "enabled" = EXCLUDED."enabled",
      "port" = EXCLUDED."port",
      "lastCheckAt" = CURRENT_TIMESTAMP,
      "metadata" = EXCLUDED."metadata",
      "updatedAt" = CURRENT_TIMESTAMP
    RETURNING *
  `, randomUUID(), license.id, name, input.displayName || name, text(input.status || 'unknown'), input.enabled !== false, input.port || null, json(input.metadata, {}));
  const service = first(rows);
  if (input.queueAction) {
    await queueRemoteTask(ctx, { licenseId: license.id, action: input.queueAction, payload: { service }, priority: 25 });
  }
  return service;
};

export const upsertTPanelSecurityRule = async (ctx, input) => {
  await ensureTPanelTables(ctx.prisma);
  const license = await licenseForControl(ctx, input.licenseId);
  assertCapability(license, 'security', 'security rules');
  const id = input.id || randomUUID();
  const kind = text(input.kind || 'firewall');
  const name = text(input.name || `${kind} rule`);
  const value = text(input.value);
  if (!value) throw new AppError('Security rule value is required', 'BAD_USER_INPUT');
  const existing = input.id ? first(await ctx.prisma.$queryRawUnsafe('SELECT "id" FROM "TPanelSecurityRule" WHERE "id" = $1', id)) : null;
  const values = [id, license.id, kind, name, text(input.action || 'deny'), value, text(input.status || 'active'), json(input.metadata, {})];
  const rows = existing
    ? await ctx.prisma.$queryRawUnsafe(`
        UPDATE "TPanelSecurityRule"
        SET "kind" = $3, "name" = $4, "action" = $5, "value" = $6, "status" = $7,
            "metadata" = CAST($8 AS jsonb), "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = $1 AND "licenseId" = $2
        RETURNING *
      `, ...values)
    : await ctx.prisma.$queryRawUnsafe(`
        INSERT INTO "TPanelSecurityRule"
          ("id", "licenseId", "kind", "name", "action", "value", "status", "metadata", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, CAST($8 AS jsonb), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `, ...values);
  const rule = first(rows);
  await queueRemoteTask(ctx, { licenseId: license.id, action: 'apply_security_rule', payload: { rule }, priority: 20 });
  await writeAudit(ctx, 'upsert_tpanel_security_rule', 'TPanelSecurityRule', rule.id, { licenseId: license.id, kind, action: input.action });
  return rule;
};

export const queueTPanelRemoteTask = async (ctx, input) => {
  await ensureTPanelTables(ctx.prisma);
  if (text(input.action).toLowerCase() === 'run_update') {
    const license = await getTPanelLicense(ctx, input.licenseId);
    assertCapability(license, 'updates', 'update controls');
  }
  return queueRemoteTask(ctx, input);
};

export const adminUpdateTPanelLicenseStatus = async (ctx, { id, status, note }) => {
  await ensureTPanelTables(ctx.prisma);
  const normalized = text(status).toLowerCase();
  if (!['active', 'suspended', 'expired', 'cancelled', 'revoked', 'pending_payment'].includes(normalized)) {
    throw new AppError('Unsupported tPanel license status', 'BAD_USER_INPUT');
  }
  const billingStatus = ACTIVE_STATUSES.has(normalized) ? 'paid' : normalized === 'pending_payment' ? 'open' : normalized;
  const metadata = first(await ctx.prisma.$queryRawUnsafe('SELECT "metadata" FROM "TPanelLicense" WHERE "id" = $1', id))?.metadata || {};
  await ctx.prisma.$executeRawUnsafe(`
    UPDATE "TPanelLicense"
    SET "status" = $2,
        "billingStatus" = $3,
        "suspendedAt" = CASE WHEN $2 = 'suspended' THEN CURRENT_TIMESTAMP ELSE "suspendedAt" END,
        "cancelledAt" = CASE WHEN $2 IN ('cancelled', 'revoked') THEN CURRENT_TIMESTAMP ELSE "cancelledAt" END,
        "metadata" = CAST($4 AS jsonb),
        "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = $1
  `, id, normalized, billingStatus, json({ ...metadata, adminNote: note || metadata.adminNote || null, statusChangedAt: new Date().toISOString() }, {}));
  if (normalized === 'active') await activatePaidLicense(ctx, id, 0);
  const remoteAction = normalized === 'active'
    ? 'unsuspend_license'
    : normalized === 'suspended'
      ? 'suspend_license'
      : BLOCKED_STATUSES.has(normalized) || normalized === 'pending_payment'
        ? 'renew_required'
        : null;
  if (remoteAction) {
    await queueRemoteTask(ctx, {
      licenseId: id,
      action: remoteAction,
      payload: { status: normalized, note: note || null },
      priority: 1
    });
  }
  await writeAudit(ctx, 'admin_update_tpanel_license_status', 'tPanelLicense', id, { status: normalized, note });
  return decorateLicense(await licenseWithJoins(ctx.prisma, 'WHERE l."id" = $1', id));
};

export const adminPublishTPanelUpdate = async (ctx, input) => {
  await ensureTPanelTables(ctx.prisma);
  const id = input.id || randomUUID();
  const version = text(input.version);
  const title = text(input.title);
  if (!version || !title) throw new AppError('Update version and title are required', 'BAD_USER_INPUT');
  const exists = input.id ? first(await ctx.prisma.$queryRawUnsafe('SELECT "id" FROM "TPanelUpdate" WHERE "id" = $1', id)) : null;
  const values = [
    id,
    version,
    title,
    text(input.channel || 'stable'),
    text(input.status || 'published'),
    Boolean(input.isForced),
    input.releaseNotes || null,
    input.packageUrl || null,
    input.checksum || null,
    input.rolloutMessage || null,
    json(input.metadata || {}, {})
  ];
  const rows = exists
    ? await ctx.prisma.$queryRawUnsafe(`
        UPDATE "TPanelUpdate"
        SET "version" = $2, "title" = $3, "channel" = $4, "status" = $5,
            "isForced" = $6, "releaseNotes" = $7, "packageUrl" = $8,
            "checksum" = $9, "rolloutMessage" = $10, "metadata" = CAST($11 AS jsonb),
            "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = $1
        RETURNING *
      `, ...values)
    : await ctx.prisma.$queryRawUnsafe(`
        INSERT INTO "TPanelUpdate"
          ("id", "version", "title", "channel", "status", "isForced",
           "releaseNotes", "packageUrl", "checksum", "rolloutMessage", "metadata", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CAST($11 AS jsonb), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `, ...values);
  await writeAudit(ctx, exists ? 'admin_update_tpanel_release' : 'admin_publish_tpanel_release', 'tPanelUpdate', id, { version, forced: Boolean(input.isForced) });
  return first(rows);
};

const upsertNode = async (ctx, license, input, status, message) => {
  const fingerprint = text(input.fingerprint || input.serverFingerprint || 'unknown');
  await ctx.prisma.$queryRawUnsafe(`
    INSERT INTO "TPanelNode"
      ("id", "licenseId", "serverIp", "fingerprint", "hostname", "os", "panelVersion",
       "agentVersion", "status", "message", "metrics", "packages", "lastSeenAt", "createdAt", "updatedAt")
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CAST($11 AS jsonb), CAST($12 AS jsonb), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("licenseId", "fingerprint") DO UPDATE SET
      "serverIp" = EXCLUDED."serverIp",
      "hostname" = EXCLUDED."hostname",
      "os" = EXCLUDED."os",
      "panelVersion" = EXCLUDED."panelVersion",
      "agentVersion" = EXCLUDED."agentVersion",
      "status" = EXCLUDED."status",
      "message" = EXCLUDED."message",
      "metrics" = EXCLUDED."metrics",
      "packages" = EXCLUDED."packages",
      "lastSeenAt" = CURRENT_TIMESTAMP,
      "updatedAt" = CURRENT_TIMESTAMP
  `, randomUUID(), license.id, input.serverIp || license.serverIp, fingerprint, input.hostname || null,
    input.os || null, input.panelVersion || null, input.agentVersion || null, status, message,
    json(input.metrics, {}), json(input.packages, []));
};

export const verifyTPanelLicense = async (ctx, input) => {
  await ensureTPanelTables(ctx.prisma);
  const key = text(input.licenseKey);
  const reportedIp = normalizeIp(input.serverIp || '');
  const observedIp = normalizeIp(ctx.requestIp || '');
  const serverIp = reportedIp || observedIp;
  const fingerprint = text(input.fingerprint || input.serverFingerprint || '');
  if (!key) throw new AppError('License key is required', 'BAD_USER_INPUT');

  const license = await licenseWithJoins(ctx.prisma, 'WHERE l."licenseKey" = $1', key);
  const update = await latestPublishedUpdate(ctx.prisma);
  const serverTime = new Date().toISOString();
  let ok = false;
  let status = 'not_found';
  let message = 'License was not found.';

  if (license) {
    status = license.status;
    const observedMismatch = observedIp && !isLocalOrPrivateIp(observedIp) && observedIp !== license.serverIp;
    const fingerprintMismatch = license.serverFingerprint && fingerprint && license.serverFingerprint !== fingerprint;
    if (license.serverIp !== serverIp || observedMismatch) {
      message = 'Server IP is not allowlisted for this license.';
    } else if (fingerprintMismatch) {
      message = 'Server fingerprint does not match this tPanel license binding.';
    } else if (license.currentPeriodEnd && new Date(license.currentPeriodEnd) < new Date()) {
      status = 'expired';
      message = 'License has expired. Renew from Tiwlo to resume tPanel services.';
      await ctx.prisma.$executeRawUnsafe(`
        UPDATE "TPanelLicense"
        SET "status" = 'expired', "billingStatus" = 'expired', "lastCheckAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = $1
      `, license.id);
    } else if (ACTIVE_STATUSES.has(license.status)) {
      ok = true;
      message = 'License is active.';
      await ctx.prisma.$executeRawUnsafe(`
        UPDATE "TPanelLicense"
        SET "lastCheckAt" = CURRENT_TIMESTAMP,
            "serverFingerprint" = COALESCE("serverFingerprint", $2),
            "metadata" = CAST($3 AS jsonb),
            "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = $1
      `, license.id, fingerprint || null, json({
        ...(license.metadata || {}),
        lastReportedIp: reportedIp || null,
        lastObservedIp: observedIp || null,
        lastVerifiedAt: serverTime
      }, {}));
    } else if (BLOCKED_STATUSES.has(license.status)) {
      message = `License is ${license.status}.`;
    } else {
      message = 'License is waiting for payment or admin approval.';
    }

    await upsertNode(ctx, license, { ...input, serverIp, fingerprint }, ok ? 'online' : 'blocked', message);
  }

  const payload = {
    ok,
    status,
    licenseId: license?.id || null,
    packageId: license?.packageId || null,
    packageCode: license?.packageCode || null,
    limits: license ? licensePlanLimits(license) : null,
    permissions: license ? packagePermissions({ metadata: license.packageMetadata || {} }) : null,
    serverIp,
    observedIp,
    fingerprint,
    serverTime,
    periodEnd: license?.currentPeriodEnd || null,
    updateVersion: update?.version || null
  };

  return {
    ok,
    status,
    message,
    serverTime,
    signature: signLicensePayload(payload),
    license: license ? decorateLicense({ ...license, status }) : null,
    package: license ? decorateLicense(license).package : null,
    update,
    requiredPackages: requiredServerPackages
  };
};

export const heartbeatTPanelNode = async (ctx, input) => {
  const result = await verifyTPanelLicense(ctx, input);
  if (result.license) {
    await ctx.prisma.$executeRawUnsafe(`
      UPDATE "TPanelLicense"
      SET "lastHeartbeatAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = $1
    `, result.license.id);
  }
  return result;
};

export const getTPanelRemoteTasksForAgent = async (ctx, input) => {
  const result = await verifyTPanelLicense(ctx, input);
  if (!result.ok || !result.license) return { ...result, tasks: [] };
  const tasks = normalizeRows(await ctx.prisma.$queryRawUnsafe(`
    UPDATE "TPanelRemoteTask"
    SET "status" = 'dispatched',
        "dispatchedAt" = COALESCE("dispatchedAt", CURRENT_TIMESTAMP),
        "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" IN (
      SELECT "id" FROM "TPanelRemoteTask"
      WHERE "licenseId" = $1 AND "status" IN ('queued', 'retry')
      ORDER BY "priority" ASC, "queuedAt" ASC
      LIMIT 25
    )
    RETURNING *
  `, result.license.id));
  return { ...result, tasks };
};

export const completeTPanelRemoteTaskForAgent = async (ctx, input) => {
  const result = await verifyTPanelLicense(ctx, input);
  if (!result.ok || !result.license) return { ...result, task: null };
  const status = ['completed', 'failed', 'retry'].includes(text(input.status).toLowerCase())
    ? text(input.status).toLowerCase()
    : 'completed';
  const rows = await ctx.prisma.$queryRawUnsafe(`
    UPDATE "TPanelRemoteTask"
    SET "status" = $3,
        "result" = CAST($4 AS jsonb),
        "completedAt" = CASE WHEN $3 IN ('completed', 'failed') THEN CURRENT_TIMESTAMP ELSE "completedAt" END,
        "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = $1 AND "licenseId" = $2
    RETURNING *
  `, input.taskId, result.license.id, status, json(input.result, {}));
  return { ...result, task: first(rows) };
};

export const buildInstallScript = ({ license }) => {
  const api = apiBaseUrl();
  const installerLicense = String(license || '').replace(/(["\\$`])/g, '\\$1');

  if (process.env.TPANEL_INSTALLER_MODE !== 'legacy') {
    return `#!/usr/bin/env bash
set -euo pipefail

TPANEL_DEFAULT_API_BASE="${api}"
export TPANEL_API_BASE="\${TPANEL_API_BASE:-$TPANEL_DEFAULT_API_BASE}"
export TPANEL_LICENSE_KEY="\${TPANEL_LICENSE_KEY:-${installerLicense}}"
if [ -z "\${TPANEL_LICENSE_KEY:-}" ] && [ "$#" -gt 0 ]; then
  export TPANEL_LICENSE_KEY="$1"
fi

INSTALLER_URL="\${TPANEL_INSTALLER_URL:-https://raw.githubusercontent.com/alimranniloy/Tiwlo/main/scripts/install-tpanel-node.sh}"
if command -v curl >/dev/null 2>&1; then
  curl -fsSL "$INSTALLER_URL" | bash
elif command -v wget >/dev/null 2>&1; then
  wget -qO- "$INSTALLER_URL" | bash
else
  echo "curl or wget is required to download the tPanel installer."
  exit 1
fi
`;
  }

  const repo = tPanelRepoUrl();
  const packages = requiredServerPackages.join(' ');
  const quotedLicense = String(license || '').replace(/"/g, '\\"');

  return `#!/usr/bin/env bash
set -euo pipefail

API_BASE="${api}"
LICENSE_KEY="${quotedLicense}"
LICENSE_KEY="\${TPANEL_LICENSE_KEY:-$LICENSE_KEY}"
if [ -z "$LICENSE_KEY" ] && [ "$#" -gt 0 ]; then
  LICENSE_KEY="$1"
fi
TPANEL_DIR="/opt/tpanel"
SOURCE_DIR="$TPANEL_DIR/source"
APP_DIR="$SOURCE_DIR/src/tPanel"
TPANEL_PORT="\${TPANEL_PORT:-2086}"
TPANEL_DOMAIN="\${TPANEL_DOMAIN:-tiwlo.com}"
REPO_URL="${repo}"
NPM_BIN="\$(command -v npm || true)"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this installer as root: curl -fsSL $API_BASE/tpanel/install.sh | sudo env TPANEL_LICENSE_KEY=KEY bash"
  exit 1
fi

if [ -z "$LICENSE_KEY" ]; then
  echo "Missing tPanel license key."
  echo "Use: curl -fsSL $API_BASE/tpanel/install.sh | sudo env TPANEL_LICENSE_KEY=YOUR_LICENSE_KEY bash"
  exit 1
fi

SERVER_IP="$(curl -fsS https://api.ipify.org || hostname -I | awk '{print $1}')"
FINGERPRINT="$(cat /etc/machine-id 2>/dev/null || hostname)"
HOSTNAME_VALUE="$(hostname -f 2>/dev/null || hostname)"
OS_VALUE="$(. /etc/os-release && echo "$ID-$VERSION_ID")"

echo "Welcome to tPanel Pro by Tiwlo"
echo "Checking license for $SERVER_IP..."

VERIFY_PAYLOAD="{\\"licenseKey\\":\\"$LICENSE_KEY\\",\\"serverIp\\":\\"$SERVER_IP\\",\\"fingerprint\\":\\"$FINGERPRINT\\",\\"hostname\\":\\"$HOSTNAME_VALUE\\",\\"os\\":\\"$OS_VALUE\\",\\"agentVersion\\":\\"1.0.0\\"}"
GRAPHQL_PAYLOAD="{\\"query\\":\\"mutation Check(\\$input: TPanelLicenseCheckInput!) { tPanelLicenseCheck(input: \\$input) { ok status message serverTime } }\\",\\"variables\\":{\\"input\\":$VERIFY_PAYLOAD}}"
VERIFY_RESPONSE="$(curl -fsS -X POST "$API_BASE/tpanel/api/verify" -H "Content-Type: application/json" -d "$VERIFY_PAYLOAD" 2>/dev/null || true)"
if ! echo "$VERIFY_RESPONSE" | grep -q '"ok":true'; then
  VERIFY_RESPONSE="$(curl -fsS -X POST "$API_BASE/graphql" -H "Content-Type: application/json" -d "$GRAPHQL_PAYLOAD" 2>/dev/null || true)"
fi
if ! echo "$VERIFY_RESPONSE" | grep -q '"ok":true'; then
  echo "License validation failed:"
  echo "$VERIFY_RESPONSE"
  exit 1
fi

echo "License active. Installing required packages..."

if command -v apt-get >/dev/null 2>&1; then
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -y
  apt-get install -y ${packages} || true
elif command -v dnf >/dev/null 2>&1; then
  dnf install -y epel-release || true
  dnf install -y ${packages} || true
elif command -v yum >/dev/null 2>&1; then
  yum install -y epel-release || true
  yum install -y ${packages} || true
else
  echo "Unsupported Linux package manager. Install packages manually, then rerun."
  exit 1
fi

echo "Package installation phase complete."
NPM_BIN="$(command -v npm || true)"
if [ -z "$NPM_BIN" ]; then
  echo "npm was not found after package installation. Install Node.js/npm, then rerun."
  exit 1
fi

if [ -d "$SOURCE_DIR/.git" ]; then
  git -C "$SOURCE_DIR" pull --ff-only
else
  rm -rf "$SOURCE_DIR"
  mkdir -p "$TPANEL_DIR"
  git clone "$REPO_URL" "$SOURCE_DIR"
fi
echo "Clone done"

cd "$APP_DIR"
npm install
npm run build

mkdir -p /etc/tpanel /var/lib/tpanel /var/log/tpanel
ADMIN_PASSWORD="\${TPANEL_ADMIN_PASSWORD:-}"
if [ -z "$ADMIN_PASSWORD" ] && [ -s /root/tpanel-admin-password.txt ]; then
  ADMIN_PASSWORD="$(cat /root/tpanel-admin-password.txt)"
fi
if [ -z "$ADMIN_PASSWORD" ] && [ -f /etc/tpanel/agent.env ]; then
  ADMIN_PASSWORD="$(grep -E '^TPANEL_ADMIN_PASSWORD=' /etc/tpanel/agent.env | tail -n1 | cut -d= -f2- || true)"
fi
if [ -z "$ADMIN_PASSWORD" ]; then
  ADMIN_PASSWORD="$(openssl rand -base64 32 | tr -dc 'A-Za-z0-9' | head -c 20)"
fi
printf '%s\\n' "$ADMIN_PASSWORD" >/root/tpanel-admin-password.txt
chmod 600 /root/tpanel-admin-password.txt

cat >/etc/tpanel/agent.env <<ENV
API_BASE=$API_BASE
LICENSE_KEY=$LICENSE_KEY
SERVER_IP=$SERVER_IP
FINGERPRINT=$FINGERPRINT
HOSTNAME_VALUE=$HOSTNAME_VALUE
OS_VALUE=$OS_VALUE
SOURCE_DIR=$SOURCE_DIR
APP_DIR=$APP_DIR
TPANEL_PORT=$TPANEL_PORT
TPANEL_DOMAIN=$TPANEL_DOMAIN
TIWLO_API_URL=$API_BASE
TPANEL_LICENSE_KEY=$LICENSE_KEY
TPANEL_SERVER_IP=$SERVER_IP
TPANEL_SERVER_FINGERPRINT=$FINGERPRINT
TPANEL_ADMIN_USER=admin
TPANEL_ADMIN_PASSWORD=$ADMIN_PASSWORD
NODE_ENV=production
PORT=$TPANEL_PORT
ENV
chmod 600 /etc/tpanel/agent.env

cat >/etc/tpanel/domain-settings.json <<DOMAINJSON
{
  "primaryDomain": "$TPANEL_DOMAIN",
  "panelUrl": "https://$TPANEL_DOMAIN",
  "detectedServerIp": "$SERVER_IP",
  "autoDetectIp": true,
  "enableNginxProxy": true,
  "enableSsl": true
}
DOMAINJSON
chmod 600 /etc/tpanel/domain-settings.json

cat >/usr/local/sbin/tpanel-agent <<'PY'
#!/usr/bin/env python3
import json
import os
import pathlib
import re
import shutil
import socket
import subprocess
import sys
import urllib.error
import urllib.request

CONFIG = {}
for raw in pathlib.Path("/etc/tpanel/agent.env").read_text().splitlines():
    if "=" in raw and not raw.strip().startswith("#"):
        key, value = raw.split("=", 1)
        CONFIG[key.strip()] = value.strip()

API_BASE = CONFIG.get("API_BASE", "").rstrip("/")
LICENSE_KEY = CONFIG.get("LICENSE_KEY", "")
SERVER_IP = CONFIG.get("SERVER_IP", "")
FINGERPRINT = CONFIG.get("FINGERPRINT", "")
SOURCE_DIR = CONFIG.get("SOURCE_DIR", "/opt/tpanel/source")
APP_DIR = CONFIG.get("APP_DIR", "/opt/tpanel/source/src/tPanel")
LOG_FILE = "/var/log/tpanel/agent.log"

SERVICES = {
    "nginx": "nginx",
    "apache": "apache2",
    "apache2": "apache2",
    "httpd": "httpd",
    "php-fpm": "php-fpm",
    "mariadb": "mariadb",
    "mysql": "mysql",
    "postgresql": "postgresql",
    "redis": "redis-server",
    "redis-server": "redis-server",
    "memcached": "memcached",
    "postfix": "postfix",
    "dovecot": "dovecot",
    "powerdns": "pdns",
    "pdns": "pdns",
    "fail2ban": "fail2ban",
    "docker": "docker",
    "tpanel": "tpanel",
}

def log(message):
    pathlib.Path("/var/log/tpanel").mkdir(parents=True, exist_ok=True)
    with open(LOG_FILE, "a", encoding="utf-8") as handle:
        handle.write(message + "\\n")

def payload(extra=None):
    data = {
        "licenseKey": LICENSE_KEY,
        "serverIp": SERVER_IP,
        "fingerprint": FINGERPRINT,
        "hostname": socket.getfqdn() or socket.gethostname(),
        "os": CONFIG.get("OS_VALUE", sys.platform),
        "agentVersion": "1.1.0",
    }
    if extra:
        data.update(extra)
    return data

def post(path, data, timeout=60):
    body = json.dumps(data).encode("utf-8")
    request = urllib.request.Request(
        API_BASE + path,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8") or "{}")

def run(args, cwd=None, timeout=900):
    completed = subprocess.run(args, cwd=cwd, text=True, capture_output=True, timeout=timeout)
    output = (completed.stdout or "") + (completed.stderr or "")
    if completed.returncode != 0:
        raise RuntimeError("Command failed: " + " ".join(args) + "\\n" + output[-2000:])
    return output[-4000:]

def run_sh(command, timeout=120):
    return run(["sh", "-lc", command], timeout=timeout)

def safe_name(value, fallback="item"):
    value = re.sub(r"[^a-zA-Z0-9_.-]", "", str(value or ""))
    return value[:64] or fallback

def clean_domain(value, fallback="tiwlo.com"):
    value = str(value or fallback).lower()
    value = re.sub(r"^https?://", "", value)
    value = re.sub(r"/.*$", "", value)
    value = re.sub(r":\\d+$", "", value)
    value = re.sub(r"[^a-z0-9.-]", "", value)
    value = re.sub(r"^\\.+|\\.+$", "", value)
    return value or fallback

def ensure_web_ingress():
    return run_sh("""
if command -v systemctl >/dev/null 2>&1; then
  systemctl enable --now nginx >/dev/null 2>&1 || true
fi
if command -v ufw >/dev/null 2>&1; then
  ufw allow 80/tcp >/dev/null 2>&1 || true
  ufw allow 443/tcp >/dev/null 2>&1 || true
fi
if command -v firewall-cmd >/dev/null 2>&1; then
  firewall-cmd --permanent --add-service=http >/dev/null 2>&1 || true
  firewall-cmd --permanent --add-service=https >/dev/null 2>&1 || true
  firewall-cmd --reload >/dev/null 2>&1 || true
fi
if command -v iptables >/dev/null 2>&1; then
  iptables -C INPUT -p tcp --dport 80 -j ACCEPT >/dev/null 2>&1 || iptables -I INPUT -p tcp --dport 80 -j ACCEPT >/dev/null 2>&1 || true
  iptables -C INPUT -p tcp --dport 443 -j ACCEPT >/dev/null 2>&1 || iptables -I INPUT -p tcp --dport 443 -j ACCEPT >/dev/null 2>&1 || true
fi
""", timeout=180)

def reload_nginx():
    if not shutil.which("nginx"):
        return
    run(["nginx", "-t"], timeout=60)
    run(["systemctl", "reload", "nginx"], timeout=120)

def local_account_domains(account):
    domains = [clean_domain(account.get("domain"), "")]
    provisioning = account.get("provisioning") or {}
    vhost = provisioning.get("vhost") or {}
    domains += [clean_domain(item, "") for item in (vhost.get("aliases") or [])]
    for route in (vhost.get("subdomains") or []):
        domains.append(clean_domain(route.get("domain"), ""))
        domains += [clean_domain(item, "") for item in (route.get("aliases") or [])]
    return {item for item in domains if "." in item}

def domain_owned_by_account(domain):
    state_path = pathlib.Path("/etc/tpanel/hosting-state.json")
    if not state_path.exists():
        return False
    try:
        state = json.loads(state_path.read_text(encoding="utf-8") or "{}")
    except Exception:
        return False
    clean = clean_domain(domain, "")
    for account in state.get("accounts") or []:
        status = str(account.get("status") or "").lower()
        if status in {"terminated", "deleted", "destroyed"}:
            continue
        if clean in local_account_domains(account):
            return True
    return False

def remove_panel_proxy_for_domain(domain):
    clean = clean_domain(domain, "")
    changed = False
    for name in ("tpanel-panel.conf", "tpanel.conf"):
        available = pathlib.Path("/etc/nginx/sites-available") / name
        enabled = pathlib.Path("/etc/nginx/sites-enabled") / name
        raw = available.read_text(encoding="utf-8") if available.exists() else ""
        if ("server_name " + clean + " www." + clean + ";") in raw or ("server_name " + clean + ";") in raw:
            for target in (enabled, available):
                try:
                    if target.exists() or target.is_symlink():
                        target.unlink()
                        changed = True
                except FileNotFoundError:
                    pass
    if changed:
        reload_nginx()

def remove_legacy_panel_proxy_for_domain(domain):
    clean = clean_domain(domain, "")
    available = pathlib.Path("/etc/nginx/sites-available/tpanel.conf")
    enabled = pathlib.Path("/etc/nginx/sites-enabled/tpanel.conf")
    raw = available.read_text(encoding="utf-8") if available.exists() else ""
    if ("server_name " + clean + " www." + clean + ";") not in raw and ("server_name " + clean + ";") not in raw:
        return
    for target in (enabled, available):
        try:
            if target.exists() or target.is_symlink():
                target.unlink()
        except FileNotFoundError:
            pass

def safe_account(account):
    username = safe_name(account.get("username", ""), "account").lower()
    if not re.match(r"^[a-z_][a-z0-9_-]{0,30}$", username):
        raise ValueError("Invalid account username")
    home = str(account.get("homeDirectory") or "/home/" + username)
    if not home.startswith("/home/"):
        home = "/home/" + username
    domain = safe_name(account.get("domain", ""), "domain.local")
    return username, home, domain

def write_json(path, data):
    target = pathlib.Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(data, indent=2, sort_keys=True), encoding="utf-8")

def local_tpanel_base():
    return "http://127.0.0.1:" + str(CONFIG.get("TPANEL_PORT", "2086")).strip()

def local_tpanel_admin_token():
    password_path = pathlib.Path("/root/tpanel-admin-password.txt")
    password = password_path.read_text(encoding="utf-8").strip() if password_path.exists() else ""
    if not password:
        password = CONFIG.get("TPANEL_ADMIN_PASSWORD", "")
    if not password:
        return ""
    payload_data = json.dumps({"username": "admin", "password": password}).encode("utf-8")
    req = urllib.request.Request(local_tpanel_base() + "/api/auth/login", data=payload_data, method="POST", headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as response:
        result = json.loads(response.read().decode("utf-8") or "{}")
    return result.get("token") or ""

def local_tpanel_post(path, data):
    token = local_tpanel_admin_token()
    if not token:
        raise RuntimeError("Local tPanel admin token is unavailable")
    payload_data = json.dumps(data or {}).encode("utf-8")
    req = urllib.request.Request(
        local_tpanel_base() + path,
        data=payload_data,
        method="POST",
        headers={"Content-Type": "application/json", "Authorization": "Bearer " + token}
    )
    with urllib.request.urlopen(req, timeout=60) as response:
        return json.loads(response.read().decode("utf-8") or "{}")

def handle_create_account(task):
    task_payload = task.get("payload") or {}
    account = task_payload.get("account") or {}
    username, home, domain = safe_account(account)
    password = task_payload.get("password")
    try:
        if password:
            result = local_tpanel_post("/api/panel/accounts", {
                "username": username,
                "domain": domain,
                "password": str(password),
                "displayName": account.get("ownerName") or domain,
                "ownerEmail": account.get("contactEmail") or "",
                "contactEmail": account.get("contactEmail") or "",
                "quotaMb": (account.get("limits") or {}).get("diskMB") or (account.get("limits") or {}).get("disk") or 1024,
                "bandwidthGb": (account.get("limits") or {}).get("bandwidthGB") or 100,
                "shellAccess": True
            })
            if result.get("ok"):
                return {"username": username, "domain": domain, "home": home, "localPanel": True}
    except Exception as exc:
        pathlib.Path(LOG_FILE).parent.mkdir(parents=True, exist_ok=True)
        with open(LOG_FILE, "a", encoding="utf-8") as log:
            log.write("local account API fallback for " + username + ": " + str(exc) + "\\n")
    if shutil.which("id") and subprocess.run(["id", "-u", username], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode != 0:
        run(["useradd", "-m", "-d", home, "-s", "/bin/bash", username], timeout=120)
    pathlib.Path(home, "public_html").mkdir(parents=True, exist_ok=True)
    index = pathlib.Path(home, "public_html", "index.html")
    if not index.exists():
        index.write_text("<h1>Welcome to tPanel Pro By Tiwlo</h1>\\n", encoding="utf-8")
    if password:
        subprocess.run(["chpasswd"], input=username + ":" + str(password), text=True, check=True, timeout=60)
    shutil.chown(home, user=username, group=username)
    write_json("/etc/tpanel/accounts/" + username + ".json", account)
    return {"username": username, "domain": domain, "home": home}

def handle_account_status(task, status):
    account = (task.get("payload") or {}).get("account") or {}
    username, home, domain = safe_account(account)
    try:
        action = "unsuspend" if status == "active" else "suspend" if status == "suspended" else "terminate"
        result = local_tpanel_post("/api/panel/accounts/" + username + "/" + action, {})
        if result.get("ok"):
            return {"username": username, "domain": domain, "status": status, "localPanel": True}
    except Exception as exc:
        pathlib.Path(LOG_FILE).parent.mkdir(parents=True, exist_ok=True)
        with open(LOG_FILE, "a", encoding="utf-8") as log:
            log.write("local account status fallback for " + username + ": " + str(exc) + "\\n")
    public_html = pathlib.Path(home, "public_html")
    if status == "suspended":
        pathlib.Path(home, ".tpanel_suspended").write_text("suspended\\n", encoding="utf-8")
        if public_html.exists():
            public_html.chmod(0o000)
        if shutil.which("usermod"):
            subprocess.run(["usermod", "-L", username], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    elif status == "active":
        marker = pathlib.Path(home, ".tpanel_suspended")
        if marker.exists():
            marker.unlink()
        if public_html.exists():
            public_html.chmod(0o755)
        if shutil.which("usermod"):
            subprocess.run(["usermod", "-U", username], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    else:
        base = pathlib.Path("/home").resolve()
        target = pathlib.Path(home).resolve()
        if str(target).startswith(str(base) + "/") and target.name == username and target.exists():
            shutil.rmtree(target, ignore_errors=True)
        pathlib.Path("/etc/tpanel/accounts/" + username + ".json").unlink(missing_ok=True)
        if shutil.which("usermod"):
            subprocess.run(["usermod", "-L", username], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return {"username": username, "domain": domain, "status": status}

def handle_account_password(task):
    task_payload = task.get("payload") or {}
    account = task_payload.get("account") or {}
    username, home, domain = safe_account(account)
    password = task_payload.get("password")
    if not password or len(str(password)) < 8:
        raise ValueError("Password must be at least 8 characters")
    try:
        result = local_tpanel_post("/api/panel/accounts/" + username + "/password", {"password": str(password)})
        if result.get("ok"):
            return {"username": username, "domain": domain, "passwordUpdated": True, "localPanel": True}
    except Exception as exc:
        pathlib.Path(LOG_FILE).parent.mkdir(parents=True, exist_ok=True)
        with open(LOG_FILE, "a", encoding="utf-8") as log:
            log.write("local password API fallback for " + username + ": " + str(exc) + "\\n")
    subprocess.run(["chpasswd"], input=username + ":" + str(password), text=True, check=True, timeout=60)
    return {"username": username, "domain": domain, "passwordUpdated": True}

def handle_service(task, action):
    raw = task.get("payload") or {}
    service = raw.get("service") or {}
    name = safe_name(service.get("name") or raw.get("serviceName") or raw.get("name"), "")
    mapped = SERVICES.get(name)
    if not mapped:
        raise ValueError("Service is not allowlisted: " + name)
    run(["systemctl", action, mapped], timeout=180)
    return {"service": mapped, "action": action}

def handle_dns(task):
    zone = (task.get("payload") or {}).get("zone") or {}
    domain = safe_name(zone.get("domain"), "zone.local")
    write_json("/etc/tpanel/dns/" + domain + ".json", zone)
    return {"domain": domain, "records": len(zone.get("records") or [])}

def handle_security(task):
    rule = (task.get("payload") or {}).get("rule") or {}
    value = str(rule.get("value") or "").strip()
    action = str(rule.get("action") or "deny").lower()
    kind = str(rule.get("kind") or "firewall").lower()
    if kind == "firewall" and value and shutil.which("ufw"):
        verb = "allow" if action == "allow" else "deny"
        run(["ufw", verb, "from", value], timeout=120)
    write_json("/etc/tpanel/security/" + safe_name(rule.get("id") or rule.get("name"), "rule") + ".json", rule)
    return {"kind": kind, "action": action, "value": value}

def handle_domain_settings(task):
    raw = task.get("payload") or {}
    settings = raw.get("domainSettings") or {}
    write_json("/etc/tpanel/domain-settings.json", settings)
    domain = clean_domain(settings.get("primaryDomain"), "tiwlo.com")
    port = CONFIG.get("TPANEL_PORT", "2086")
    ensure_web_ingress()
    if domain_owned_by_account(domain):
        remove_panel_proxy_for_domain(domain)
        return {"domain": domain, "settingsPath": "/etc/tpanel/domain-settings.json", "panelProxy": "removed_for_hosted_domain"}
    if domain != "tiwlo.com" and shutil.which("nginx"):
        remove_legacy_panel_proxy_for_domain(domain)
        conf = f"""server {{
    listen 80;
    server_name {domain} www.{domain};

    location /.well-known/acme-challenge/ {{
        root /var/www/html;
    }}

    location / {{
        proxy_pass http://127.0.0.1:{port};
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }}
}}
"""
        pathlib.Path("/etc/nginx/sites-available").mkdir(parents=True, exist_ok=True)
        pathlib.Path("/etc/nginx/sites-available/tpanel-panel.conf").write_text(conf, encoding="utf-8")
        enabled = pathlib.Path("/etc/nginx/sites-enabled/tpanel-panel.conf")
        enabled.parent.mkdir(parents=True, exist_ok=True)
        if enabled.exists() or enabled.is_symlink():
            enabled.unlink()
        enabled.symlink_to("/etc/nginx/sites-available/tpanel-panel.conf")
        reload_nginx()
    return {"domain": domain, "settingsPath": "/etc/tpanel/domain-settings.json", "panelProxy": "configured"}

def handle_update(task):
    run(["git", "-C", SOURCE_DIR, "pull", "--ff-only"], timeout=600)
    run(["npm", "install"], cwd=APP_DIR, timeout=900)
    run(["npm", "run", "build"], cwd=APP_DIR, timeout=900)
    subprocess.Popen(["systemctl", "restart", "tpanel"])
    return {"updated": True, "source": SOURCE_DIR}

def handle_license(task, state):
    write_json("/var/lib/tpanel/license-state.json", {"state": state, "payload": task.get("payload") or {}})
    return {"state": state}

def handle_package_upsert(task):
    raw = task.get("payload") or {}
    package = raw.get("package") or {}
    code = safe_name(package.get("code") or package.get("name"), "package")
    write_json("/etc/tpanel/packages/" + code + ".json", package)
    return {"package": code, "status": package.get("status") or "active"}

def handle_package_delete(task):
    raw = task.get("payload") or {}
    package = raw.get("package") or {}
    code = safe_name(package.get("code") or package.get("name"), "package")
    path = pathlib.Path("/etc/tpanel/packages/" + code + ".json")
    if path.exists():
        path.unlink()
    return {"package": code, "mode": raw.get("mode") or "delete"}

HANDLERS = {
    "create_account": handle_create_account,
    "change_account_password": handle_account_password,
    "change_package": handle_package_upsert,
    "delete_package": handle_package_delete,
    "suspend_account": lambda task: handle_account_status(task, "suspended"),
    "unsuspend_account": lambda task: handle_account_status(task, "active"),
    "terminate_account": lambda task: handle_account_status(task, "terminated"),
    "sync_dns_zone": handle_dns,
    "apply_domain_settings": handle_domain_settings,
    "restart_service": lambda task: handle_service(task, "restart"),
    "reload_service": lambda task: handle_service(task, "reload"),
    "apply_security_rule": handle_security,
    "run_update": handle_update,
    "suspend_license": lambda task: handle_license(task, "suspended"),
    "unsuspend_license": lambda task: handle_license(task, "active"),
    "renew_required": lambda task: handle_license(task, "renew_required"),
}

def complete(task_id, status, result):
    post("/tpanel/api/tasks/" + task_id + "/complete", payload({"taskId": task_id, "status": status, "result": result}), timeout=60)

def main():
    result = post("/tpanel/api/tasks", payload(), timeout=60)
    tasks = result.get("tasks") or []
    for task in tasks:
        task_id = str(task.get("id"))
        action = str(task.get("action") or "")
        try:
            handler = HANDLERS.get(action)
            if not handler:
                raise ValueError("Unsupported local action: " + action)
            output = handler(task)
            complete(task_id, "completed", output)
            log("completed " + task_id + " " + action)
        except Exception as error:
            complete(task_id, "failed", {"error": str(error)})
            log("failed " + task_id + " " + action + " " + str(error))

if __name__ == "__main__":
    main()
PY
chmod 700 /usr/local/sbin/tpanel-agent

cat >/usr/local/sbin/tpanel-heartbeat <<'PY'
#!/usr/bin/env python3
import json
import pathlib
import socket
import subprocess
import sys
import urllib.request

CONFIG = {}
for raw in pathlib.Path("/etc/tpanel/agent.env").read_text().splitlines():
    if "=" in raw and not raw.strip().startswith("#"):
        key, value = raw.split("=", 1)
        CONFIG[key.strip()] = value.strip()

def run(args, timeout=15):
    try:
        return subprocess.run(args, text=True, capture_output=True, timeout=timeout).stdout
    except Exception:
        return ""

def listening_ports():
    output = run(["sh", "-lc", "ss -lntH 2>/dev/null || netstat -lnt 2>/dev/null"])
    ports = set()
    for line in output.splitlines():
        parts = line.split()
        address = parts[3] if len(parts) > 3 else (parts[-1] if parts else "")
        if ":" in address:
            candidate = address.rsplit(":", 1)[-1]
            if candidate.isdigit():
                ports.add(int(candidate))
    return [{"port": port} for port in sorted(ports)]

def allowed_ports():
    output = run(["sh", "-lc", "ufw status 2>/dev/null || firewall-cmd --list-ports 2>/dev/null || true"])
    ports = set()
    for token in output.replace(",", " ").split():
        token = token.split("/", 1)[0]
        if token.isdigit():
            ports.add(int(token))
    mode = "inactive" if "inactive" in output.lower() else ("active" if output.strip() else "unknown")
    return mode, [{"port": port} for port in sorted(ports)], output[-4000:]

def installed_packages():
    output = run(["sh", "-lc", "dpkg-query -W -f='\${Package}\\n' 2>/dev/null || rpm -qa 2>/dev/null || true"], timeout=30)
    return output.splitlines()[:500]

def post():
    firewall_mode, firewall_ports, firewall_raw = allowed_ports()
    payload = {
        "licenseKey": CONFIG.get("LICENSE_KEY") or CONFIG.get("TPANEL_LICENSE_KEY"),
        "serverIp": CONFIG.get("SERVER_IP") or CONFIG.get("TPANEL_SERVER_IP"),
        "fingerprint": CONFIG.get("FINGERPRINT") or CONFIG.get("TPANEL_SERVER_FINGERPRINT"),
        "hostname": socket.getfqdn() or socket.gethostname(),
        "os": CONFIG.get("OS_VALUE") or sys.platform,
        "agentVersion": "1.1.0",
        "metrics": {
            "listeningPorts": listening_ports(),
            "allowedPorts": firewall_ports,
            "firewallMode": firewall_mode,
            "firewall": firewall_raw,
        },
        "packages": installed_packages(),
    }
    body = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        CONFIG.get("API_BASE", "").rstrip("/") + "/tpanel/api/heartbeat",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=45) as response:
        print(response.read().decode("utf-8"))

if __name__ == "__main__":
    post()
PY
chmod 700 /usr/local/sbin/tpanel-heartbeat

cat >/etc/systemd/system/tpanel.service <<SERVICE
[Unit]
Description=tPanel Pro By Tiwlo
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=$APP_DIR
EnvironmentFile=/etc/tpanel/agent.env
ExecStart=$NPM_BIN run start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICE

cat >/usr/local/sbin/tpanel-update <<'BASH'
#!/usr/bin/env bash
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root: sudo tpanel-update"
  exit 1
fi

. /etc/tpanel/agent.env
cd "$SOURCE_DIR"
git pull --ff-only
cd "$APP_DIR"
npm install
npm run build
systemctl restart tpanel
echo "tPanel updated. Database and user data were not removed."
BASH
chmod 700 /usr/local/sbin/tpanel-update

systemctl daemon-reload
systemctl enable --now postfix >/dev/null 2>&1 || true
systemctl enable --now dovecot >/dev/null 2>&1 || true
systemctl enable --now opendkim >/dev/null 2>&1 || true
systemctl enable --now rspamd >/dev/null 2>&1 || true
systemctl enable --now tpanel

if command -v ufw >/dev/null 2>&1; then
  ufw allow OpenSSH >/dev/null 2>&1 || true
  ufw allow 80/tcp >/dev/null 2>&1 || true
  ufw allow 443/tcp >/dev/null 2>&1 || true
  ufw allow 25/tcp >/dev/null 2>&1 || true
  ufw allow 110/tcp >/dev/null 2>&1 || true
  ufw allow 143/tcp >/dev/null 2>&1 || true
  ufw allow 465/tcp >/dev/null 2>&1 || true
  ufw allow 587/tcp >/dev/null 2>&1 || true
  ufw allow 993/tcp >/dev/null 2>&1 || true
  ufw allow 995/tcp >/dev/null 2>&1 || true
  ufw allow "$TPANEL_PORT/tcp" >/dev/null 2>&1 || true
fi

if command -v firewall-cmd >/dev/null 2>&1; then
  firewall-cmd --permanent --add-service=http >/dev/null 2>&1 || true
  firewall-cmd --permanent --add-service=https >/dev/null 2>&1 || true
  firewall-cmd --permanent --add-port="$TPANEL_PORT/tcp" >/dev/null 2>&1 || true
  firewall-cmd --reload >/dev/null 2>&1 || true
fi

if command -v iptables >/dev/null 2>&1; then
  iptables -C INPUT -p tcp --dport 80 -j ACCEPT >/dev/null 2>&1 || iptables -I INPUT -p tcp --dport 80 -j ACCEPT >/dev/null 2>&1 || true
  iptables -C INPUT -p tcp --dport 443 -j ACCEPT >/dev/null 2>&1 || iptables -I INPUT -p tcp --dport 443 -j ACCEPT >/dev/null 2>&1 || true
fi

if command -v nginx >/dev/null 2>&1 && [ -n "$TPANEL_DOMAIN" ] && [ "$TPANEL_DOMAIN" != "tiwlo.com" ]; then
  systemctl enable --now nginx >/dev/null 2>&1 || true
  cat >/etc/nginx/sites-available/tpanel-panel.conf <<NGINX
server {
    listen 80;
    server_name $TPANEL_DOMAIN www.$TPANEL_DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        proxy_pass http://127.0.0.1:$TPANEL_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \\$host;
        proxy_set_header X-Real-IP \\$remote_addr;
        proxy_set_header X-Forwarded-For \\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\$scheme;
    }
}
NGINX
  if grep -q "server_name $TPANEL_DOMAIN www.$TPANEL_DOMAIN;" /etc/nginx/sites-available/tpanel.conf 2>/dev/null; then
    rm -f /etc/nginx/sites-enabled/tpanel.conf /etc/nginx/sites-available/tpanel.conf
  fi
  ln -sf /etc/nginx/sites-available/tpanel-panel.conf /etc/nginx/sites-enabled/tpanel-panel.conf
  nginx -t && systemctl reload nginx || true
  if command -v certbot >/dev/null 2>&1 && getent hosts "$TPANEL_DOMAIN" | grep -q "$SERVER_IP"; then
    certbot --nginx -d "$TPANEL_DOMAIN" -d "www.$TPANEL_DOMAIN" --non-interactive --agree-tos -m "admin@$TPANEL_DOMAIN" || true
  fi
fi

mkdir -p /var/lib/tpanel
cat >/etc/cron.d/tpanel-license-check <<CRON
*/10 * * * * root /usr/local/sbin/tpanel-heartbeat >/dev/null 2>&1 || true
* * * * * root /usr/local/sbin/tpanel-agent >/dev/null 2>&1 || true
CRON

echo "tPanel Pro is running on port $TPANEL_PORT."
echo "Admin login: admin"
echo "Admin password saved at /root/tpanel-admin-password.txt"
echo "Open http://$SERVER_IP:$TPANEL_PORT/tpanel or configure Nginx to proxy /tpanel to this service."
`;
};

export const registerTPanelRoutes = (app, { prisma, requestIp: readRequestIp }) => {
  const routeIp = (req) => readRequestIp ? readRequestIp(req) : req.ip;

  app.post('/tpanel/api/verify', async (req, res) => {
    try {
      const result = await verifyTPanelLicense({ prisma, requestIp: routeIp(req) }, req.body || {});
      res.json(result);
    } catch (error) {
      res.status(400).json({ ok: false, status: 'error', message: error.message || 'License verification failed' });
    }
  });

  app.post('/tpanel/api/heartbeat', async (req, res) => {
    try {
      const result = await heartbeatTPanelNode({ prisma, requestIp: routeIp(req) }, req.body || {});
      res.json(result);
    } catch (error) {
      res.status(400).json({ ok: false, status: 'error', message: error.message || 'tPanel heartbeat failed' });
    }
  });

  app.post('/tpanel/api/tasks', async (req, res) => {
    try {
      const result = await getTPanelRemoteTasksForAgent({ prisma, requestIp: routeIp(req) }, req.body || {});
      res.json(result);
    } catch (error) {
      res.status(400).json({ ok: false, status: 'error', message: error.message || 'tPanel task polling failed', tasks: [] });
    }
  });

  app.post('/tpanel/api/tasks/:id/complete', async (req, res) => {
    try {
      const result = await completeTPanelRemoteTaskForAgent({ prisma, requestIp: routeIp(req) }, { ...(req.body || {}), taskId: req.params.id });
      res.json(result);
    } catch (error) {
      res.status(400).json({ ok: false, status: 'error', message: error.message || 'tPanel task completion failed' });
    }
  });

  app.get('/tpanel/install.sh', (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.type('text/x-shellscript').send(buildInstallScript({ license: req.query.license || '' }));
  });
};
