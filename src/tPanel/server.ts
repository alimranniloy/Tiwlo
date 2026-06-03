import express from "express";
import path from "path";
import os from "os";
import fs from "fs";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { execFile, execFileSync } from "child_process";
import { promisify } from "util";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const execFileAsync = promisify(execFile);
const app = express();
const PORT = Number(process.env.PORT || 3000);
const TIWLO_API_URL = (process.env.TIWLO_API_URL || "http://localhost:4000").replace(/\/+$/, "");
const TPANEL_LICENSE_KEY = process.env.TPANEL_LICENSE_KEY || "";
const TPANEL_SERVER_IP = process.env.TPANEL_SERVER_IP || "";
const TPANEL_ADMIN_USER = process.env.TPANEL_ADMIN_USER || "admin";
const TPANEL_ADMIN_PASSWORD = process.env.TPANEL_ADMIN_PASSWORD || "";
const TPANEL_USER = process.env.TPANEL_USER || "";
const TPANEL_USER_PASSWORD = process.env.TPANEL_USER_PASSWORD || "";
const TPANEL_CONFIG_DIR = process.env.TPANEL_CONFIG_DIR || (process.platform === "win32" ? path.join(process.cwd(), ".tpanel") : "/etc/tpanel");
const DOMAIN_SETTINGS_FILE = path.join(TPANEL_CONFIG_DIR, "domain-settings.json");
const PANEL_STATE_FILE = path.join(TPANEL_CONFIG_DIR, "hosting-state.json");
const SITES_CONFIG_DIR = path.join(TPANEL_CONFIG_DIR, "sites");
const TPANEL_TOOLS_DIR = process.env.TPANEL_TOOLS_DIR || (process.platform === "win32" ? path.join(process.cwd(), ".tpanel", "tools") : "/opt/tpanel/tools");
const NODE_SELECTOR_DIR = process.env.TPANEL_NODE_SELECTOR_DIR || path.join(TPANEL_TOOLS_DIR, "node-selector");
const ACCOUNT_BASE_DIR = process.env.TPANEL_ACCOUNT_BASE_DIR || (process.platform === "win32" ? path.join(process.cwd(), ".tpanel", "accounts") : "/home/tpanel/accounts");
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const LICENSE_CACHE_MS = Number(process.env.TPANEL_LICENSE_CACHE_MS || 120000);
let sslProvisioningChain: Promise<void> = Promise.resolve();
const LICENSE_CHECK_QUERY = `mutation Check($input: TPanelLicenseCheckInput!) {
  tPanelLicenseCheck(input: $input) {
    ok
    status
    message
    serverTime
    signature
    requiredPackages
    license {
      id
      status
      serverIp
      currentPeriodEnd
    }
    package {
      id
      code
      name
      permissions
      metadata
    }
    update {
      version
      title
      isForced
      packageUrl
      checksum
      rolloutMessage
    }
  }
}`;
const REQUIRED_PORTS = [
  { port: 22, protocol: "tcp", service: "SSH", purpose: "server login and recovery", public: true },
  { port: 21, protocol: "tcp", service: "FTP", purpose: "FTP account access", public: true },
  { port: 25, protocol: "tcp", service: "SMTP", purpose: "mail delivery", public: true },
  { port: 53, protocol: "tcp/udp", service: "DNS", purpose: "authoritative DNS", public: true },
  { port: 80, protocol: "tcp", service: "HTTP", purpose: "websites and SSL challenge", public: true },
  { port: 110, protocol: "tcp", service: "POP3", purpose: "mailbox access", public: true },
  { port: 143, protocol: "tcp", service: "IMAP", purpose: "mailbox access", public: true },
  { port: 443, protocol: "tcp", service: "HTTPS", purpose: "secure websites and panel URL", public: true },
  { port: 465, protocol: "tcp", service: "SMTPS", purpose: "secure SMTP", public: true },
  { port: 587, protocol: "tcp", service: "Submission", purpose: "authenticated SMTP", public: true },
  { port: 993, protocol: "tcp", service: "IMAPS", purpose: "secure IMAP", public: true },
  { port: 995, protocol: "tcp", service: "POP3S", purpose: "secure POP3", public: true },
  { port: 2086, protocol: "tcp", service: "tPanel", purpose: "local panel service", public: false },
  { port: 3306, protocol: "tcp", service: "MySQL/MariaDB", purpose: "database service, keep private unless needed", public: false },
  { port: 5432, protocol: "tcp", service: "PostgreSQL", purpose: "PostgreSQL service, keep private unless needed", public: false },
  { port: 6379, protocol: "tcp", service: "Redis", purpose: "cache service, keep private", public: false }
];

const HOSTING_STACK_PACKAGES = {
  apt: [
    "nginx", "certbot", "python3-certbot-nginx", "php-fpm", "php-cli", "php-common", "php-mysql", "php-pgsql", "php-sqlite3", "php-curl", "php-zip", "php-mbstring", "php-bz2", "php-xsl",
    "php-xml", "php-gd", "php-intl", "php-bcmath", "php-soap", "php-opcache", "php-imagick", "php-redis", "php-gmp", "php-ldap", "php-imap", "php-readline", "mariadb-server", "pdns-server", "pdns-backend-mysql", "dnsutils",
    "postfix", "dovecot-core", "dovecot-imapd", "dovecot-pop3d", "opendkim", "opendkim-tools", "rspamd", "mailutils", "libsasl2-modules",
    "phpmyadmin", "postgresql", "postgresql-contrib", "vsftpd", "composer", "zip", "unzip", "tar", "rsync", "logrotate", "cron", "acl"
  ],
  dnf: [
    "nginx", "certbot", "python3-certbot-nginx", "php-fpm", "php-cli", "php-common", "php-mysqlnd", "php-pgsql", "php-sqlite3", "php-curl", "php-zip", "php-mbstring", "php-bz2",
    "php-xml", "php-gd", "php-intl", "php-bcmath", "php-soap", "php-opcache", "php-pecl-imagick", "php-pecl-redis", "php-gmp", "php-ldap", "php-imap", "php-readline", "mariadb-server", "pdns", "pdns-backend-mysql", "bind-utils",
    "postfix", "dovecot", "opendkim", "opendkim-tools", "rspamd", "mailx", "cyrus-sasl", "cyrus-sasl-plain",
    "phpMyAdmin", "postgresql", "postgresql-contrib", "vsftpd", "composer", "zip", "unzip", "tar", "rsync", "logrotate", "cronie", "acl"
  ],
  yum: [
    "nginx", "certbot", "python3-certbot-nginx", "php-fpm", "php-cli", "php-common", "php-mysqlnd", "php-pgsql", "php-sqlite3", "php-curl", "php-zip", "php-mbstring", "php-bz2",
    "php-xml", "php-gd", "php-intl", "php-bcmath", "php-soap", "php-opcache", "php-pecl-imagick", "php-pecl-redis", "php-gmp", "php-ldap", "php-imap", "php-readline", "mariadb-server", "pdns", "pdns-backend-mysql", "bind-utils",
    "postfix", "dovecot", "opendkim", "opendkim-tools", "rspamd", "mailx", "cyrus-sasl", "cyrus-sasl-plain",
    "phpMyAdmin", "postgresql", "postgresql-contrib", "vsftpd", "composer", "zip", "unzip", "tar", "rsync", "logrotate", "cronie", "acl"
  ]
};

const HOSTING_STACK_CHECKS = [
  { id: "nginx", label: "Nginx Web Server", command: "nginx", services: ["nginx"], packageNames: { apt: "nginx", dnf: "nginx", yum: "nginx" } },
  { id: "certbot", label: "Auto SSL Certbot", command: "certbot", services: [], packageNames: { apt: "certbot", dnf: "certbot", yum: "certbot" } },
  { id: "php", label: "PHP Runtime", command: "php", services: ["php*-fpm"], packageNames: { apt: "php-fpm", dnf: "php-fpm", yum: "php-fpm" } },
  { id: "phpmyadmin", label: "phpMyAdmin", command: "php", services: [], packageNames: { apt: "phpmyadmin", dnf: "phpMyAdmin", yum: "phpMyAdmin" } },
  { id: "mysql", label: "MariaDB/MySQL", command: "mysql", services: ["mariadb", "mysql"], packageNames: { apt: "mariadb-server", dnf: "mariadb-server", yum: "mariadb-server" } },
  { id: "postgresql", label: "PostgreSQL", command: "psql", services: ["postgresql"], packageNames: { apt: "postgresql", dnf: "postgresql", yum: "postgresql" } },
  { id: "ftp", label: "FTP Server", command: "vsftpd", services: ["vsftpd"], packageNames: { apt: "vsftpd", dnf: "vsftpd", yum: "vsftpd" } },
  { id: "dns", label: "PowerDNS Authoritative", command: "pdns_server", services: ["pdns"], packageNames: { apt: "pdns-server", dnf: "pdns", yum: "pdns" } },
  { id: "mail", label: "Mail Stack", command: "postfix", services: ["postfix", "dovecot"], packageNames: { apt: "postfix", dnf: "postfix", yum: "postfix" } },
  { id: "node", label: "Node.js Runtime", command: "node", services: [], packageNames: { apt: "nodejs", dnf: "nodejs", yum: "nodejs" } }
];

const DEFAULT_PHP_VERSION = "8.3";
const DEFAULT_PHP_SELECTOR_VERSION_INPUT = process.env.TPANEL_PHP_SELECTOR_VERSIONS || "8.4 8.3 8.2 8.1 8.0 7.4";
const DEFAULT_PHP_EXTENSIONS = [
  "bcmath", "bz2", "calendar", "ctype", "curl", "dom", "exif", "fileinfo", "ftp", "gd",
  "gettext", "gmp", "iconv", "imagick", "intl", "mbstring", "mysqli", "mysqlnd", "opcache",
  "pcntl", "pdo", "pdo_mysql", "pdo_pgsql", "pdo_sqlite", "pgsql", "phar", "posix", "readline",
  "redis", "session", "shmop", "simplexml", "soap", "sockets", "sodium", "sqlite3", "tokenizer",
  "xml", "xmlreader", "xmlwriter", "xsl", "zip", "zlib"
];
const DEFAULT_SELECTED_PHP_EXTENSIONS = [...DEFAULT_PHP_EXTENSIONS];
const PHP_EXTENSION_PACKAGES: Record<string, string> = {
  bcmath: "bcmath",
  bz2: "bz2",
  calendar: "common",
  ctype: "common",
  curl: "curl",
  dom: "xml",
  exif: "common",
  fileinfo: "common",
  ftp: "common",
  gd: "gd",
  gettext: "common",
  gmp: "gmp",
  iconv: "common",
  imagick: "imagick",
  imap: "imap",
  intl: "intl",
  ldap: "ldap",
  mbstring: "mbstring",
  mysqli: "mysql",
  mysqlnd: "mysql",
  opcache: "opcache",
  pdo_mysql: "mysql",
  pdo_pgsql: "pgsql",
  pdo_sqlite: "sqlite3",
  pcntl: "common",
  pgsql: "pgsql",
  phar: "common",
  posix: "common",
  redis: "redis",
  session: "common",
  shmop: "common",
  simplexml: "xml",
  soap: "soap",
  sockets: "common",
  sodium: "common",
  sqlite3: "sqlite3",
  tokenizer: "common",
  xml: "xml",
  xmlreader: "xml",
  xmlwriter: "xml",
  xsl: "xsl",
  zip: "zip",
  zlib: "common"
};
let phpVersionCache: { at: number; versions: string[] } | null = null;
const phpExtensionCache = new Map<string, { at: number; extensions: string[] }>();
const DEFAULT_NODE_VERSION = process.env.TPANEL_NODE_VERSION || "24.16.0";
const DEFAULT_NODE_SELECTOR_VERSIONS = ["26.3.0", "24.16.0", "22.22.3", "20.20.2", "18.20.8", "16.20.2"];
let nodeVersionCache: { at: number; versions: string[] } | null = null;
const DATABASE_PRIVILEGES = [
  "ALTER", "ALTER ROUTINE", "CREATE", "CREATE ROUTINE", "CREATE TEMPORARY TABLES",
  "CREATE VIEW", "DELETE", "DROP", "EVENT", "EXECUTE", "INDEX", "INSERT",
  "LOCK TABLES", "REFERENCES", "SELECT", "SHOW VIEW", "TRIGGER", "UPDATE"
];
const DB_ENGINES = new Set(["mysql", "postgresql"]);
const APP_INSTALL_CATALOG = [
  {
    id: "wordpress",
    name: "WordPress",
    version: "latest",
    category: "CMS",
    description: "Blog, store, portfolio, and content publishing.",
    runtime: "php",
    archiveUrl: "https://wordpress.org/latest.tar.gz",
    archiveType: "tar.gz",
    archiveRoot: "wordpress",
    database: true,
    automatedAdmin: true,
    logoColor: "#21759b"
  },
  {
    id: "nextcloud",
    name: "Nextcloud",
    version: "latest",
    category: "Cloud",
    description: "Private files, sharing, calendar, and collaboration.",
    runtime: "php",
    archiveUrl: "https://download.nextcloud.com/server/releases/latest.zip",
    archiveType: "zip",
    archiveRoot: "nextcloud",
    database: true,
    automatedAdmin: false,
    logoColor: "#0082c9"
  },
  {
    id: "drupal",
    name: "Drupal",
    version: "latest",
    category: "CMS",
    description: "Advanced content management framework.",
    runtime: "php",
    archiveUrl: "https://www.drupal.org/download-latest/tar.gz",
    archiveType: "tar.gz",
    archiveRoot: "",
    database: true,
    automatedAdmin: false,
    logoColor: "#0678be"
  },
  {
    id: "joomla",
    name: "Joomla",
    version: "latest",
    category: "CMS",
    description: "Flexible website and portal publishing.",
    runtime: "php",
    archiveUrl: "https://downloads.joomla.org/cms/joomla5/5-2-3/Joomla_5-2-3-Stable-Full_Package.zip?format=zip",
    archiveType: "zip",
    archiveRoot: "",
    database: true,
    automatedAdmin: false,
    logoColor: "#5091cd"
  },
  {
    id: "laravel",
    name: "Laravel",
    version: "latest",
    category: "Framework",
    description: "PHP application starter with Composer dependencies.",
    runtime: "php",
    installMode: "composer",
    database: true,
    automatedAdmin: false,
    logoColor: "#ff2d20"
  },
  {
    id: "phpbb",
    name: "phpBB",
    version: "3.3",
    category: "Forum",
    description: "Community discussion board package.",
    runtime: "php",
    archiveUrl: "https://download.phpbb.com/pub/release/3.3/3.3.13/phpBB-3.3.13.zip",
    archiveType: "zip",
    archiveRoot: "phpBB3",
    database: true,
    automatedAdmin: false,
    logoColor: "#536482"
  }
];

app.use(express.json({ limit: "25mb" }));

const DEFAULT_PACKAGES = [
  { id: "pkg-starter", name: "Starter", quotaMb: 1024, bandwidthGb: 25, cpuCores: 1, ramMb: 1024, domains: 1, emailAccounts: 5, databases: 2, ftpAccounts: 2, nodeApps: 1 },
  { id: "pkg-business", name: "Business", quotaMb: 10240, bandwidthGb: 250, cpuCores: 2, ramMb: 4096, domains: 10, emailAccounts: 50, databases: 10, ftpAccounts: 10, nodeApps: 5 },
  { id: "pkg-agency", name: "Agency", quotaMb: 51200, bandwidthGb: 1000, cpuCores: 4, ramMb: 8192, domains: 50, emailAccounts: 250, databases: 50, ftpAccounts: 50, nodeApps: 25 }
];
const TERMINAL_ACCOUNT_STATUSES = new Set(["terminated", "deleted", "destroyed"]);

const DEFAULT_ACCOUNT_PERMISSIONS = {
  dashboard: true,
  files: true,
  ftp: true,
  disk: true,
  domains: true,
  dns: true,
  subdomains: true,
  databases: true,
  phpmyadmin: true,
  email: true,
  ssl: true,
  node: true,
  php: true,
  ruby: false,
  marketplace: true,
  cron: true,
  terminal: false,
  copilot: true,
  security: true,
  metrics: true,
  backups: true
};

const ACCOUNT_PERMISSION_PROFILES: Record<string, Record<string, boolean>> = {
  standard: DEFAULT_ACCOUNT_PERMISSIONS,
  full: {
    ...DEFAULT_ACCOUNT_PERMISSIONS,
    ruby: true,
    terminal: true
  },
  developer: {
    ...DEFAULT_ACCOUNT_PERMISSIONS,
    email: false,
    ruby: true,
    terminal: true,
    backups: true
  },
  email: {
    dashboard: true,
    files: false,
    ftp: false,
    disk: true,
    domains: true,
    dns: true,
    subdomains: false,
    databases: false,
    phpmyadmin: false,
    email: true,
    ssl: true,
    node: false,
    php: false,
    ruby: false,
    marketplace: false,
    cron: false,
    terminal: false,
    copilot: false,
    security: true,
    metrics: true,
    backups: false
  },
  locked: {
    dashboard: true,
    files: false,
    ftp: false,
    disk: false,
    domains: false,
    dns: false,
    subdomains: false,
    databases: false,
    phpmyadmin: false,
    email: false,
    ssl: false,
    node: false,
    php: false,
    ruby: false,
    marketplace: false,
    cron: false,
    terminal: false,
    copilot: false,
    security: false,
    metrics: true,
    backups: false
  }
};

let licenseCache: { key: string; expiresAt: number; value: any } | null = null;

function sessionSecret() {
  return `${TPANEL_LICENSE_KEY}:${TPANEL_ADMIN_PASSWORD}:${os.hostname()}:tpanel-session`;
}

function signSessionPayload(payload: string) {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored = "") {
  const [salt, hash] = String(stored || "").split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 32).toString("hex");
  const left = Buffer.from(candidate, "hex");
  const right = Buffer.from(hash, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

function createSession(role: string, account?: any) {
  const payload = Buffer.from(JSON.stringify({
    role,
    accountId: account?.id || null,
    username: account?.username || null,
    domain: account?.domain || null,
    exp: Date.now() + SESSION_TTL_MS
  })).toString("base64url");
  return `${payload}.${signSessionPayload(payload)}`;
}

function verifySession(token: string) {
  const [payload, signature] = String(token || "").split(".");
  if (!payload || !signature) return null;
  const expected = signSessionPayload(payload);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  if (!data.exp || data.exp < Date.now()) return null;
  return data;
}

function ssoSecret() {
  const localAdminPassword = TPANEL_ADMIN_PASSWORD || (process.env.NODE_ENV === "production" ? "" : "admin");
  return localAdminPassword ? `${localAdminPassword}:tpanel-sso` : "";
}

function verifySsoPayload(token: string) {
  const [payload, signature] = String(token || "").split(".");
  const secret = ssoSecret();
  if (!payload || !signature || !secret) return null;
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  if (!data.exp || data.exp < Date.now()) return null;
  return data;
}

function scriptSafeJson(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function htmlEscape(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sanitizeSlug(value: unknown, fallback = "site") {
  return String(value || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || fallback;
}

function permissionsForProfile(profile: unknown) {
  const key = String(profile || "standard").toLowerCase();
  return ACCOUNT_PERMISSION_PROFILES[key] || ACCOUNT_PERMISSION_PROFILES.standard;
}

function normalizePermissionProfile(profile: unknown) {
  const key = String(profile || "standard").toLowerCase();
  return ACCOUNT_PERMISSION_PROFILES[key] ? key : "standard";
}

function normalizeAccountPermissions(input: any = {}, account: any = {}) {
  const profile = normalizePermissionProfile(account.permissionProfile || input?.permissionProfile || input?.profile);
  const permissions = { ...permissionsForProfile(profile), ...(input || {}) };
  delete (permissions as any).permissionProfile;
  delete (permissions as any).profile;
  permissions.ftp = Boolean(permissions.ftp && account.ftpEnabled !== false);
  permissions.email = Boolean(permissions.email && account.emailEnabled !== false);
  permissions.databases = Boolean(permissions.databases && account.mysqlEnabled !== false);
  permissions.phpmyadmin = Boolean(permissions.phpmyadmin && permissions.databases);
  permissions.ssl = Boolean(permissions.ssl && account.sslEnabled !== false);
  permissions.terminal = Boolean(permissions.terminal && account.shellAccess === true);
  permissions.node = Boolean(permissions.node);
  return Object.fromEntries(Object.entries(permissions).map(([key, value]) => [key, Boolean(value)]));
}

function publicAccount(account: any) {
  const safe = { ...(account || {}) };
  delete safe.passwordHash;
  safe.passwordSet = Boolean(account?.passwordSet || account?.passwordHash);
  safe.permissionProfile = normalizePermissionProfile(safe.permissionProfile);
  safe.permissions = normalizeAccountPermissions(account?.permissions, account);
  safe.phpSettings = phpSettingsForAccount(account || {});
  safe.phpVersion = safe.phpSettings.version;
  safe.nodeVersion = normalizeNodeVersion(account?.nodeVersion || DEFAULT_NODE_VERSION);
  safe.nodeApps = nodeAppsPublicPayload(account || {});
  safe.runtimeRoutes = runtimeRouteMap(account || {});
  return safe;
}

function readPanelState() {
  try {
    if (fs.existsSync(PANEL_STATE_FILE)) {
      const saved = JSON.parse(fs.readFileSync(PANEL_STATE_FILE, "utf8"));
      return {
        packages: Array.isArray(saved.packages) && saved.packages.length ? saved.packages : DEFAULT_PACKAGES,
        accounts: Array.isArray(saved.accounts) ? saved.accounts : [],
        auditEvents: Array.isArray(saved.auditEvents) ? saved.auditEvents : [],
        updatedAt: saved.updatedAt || null
      };
    }
  } catch {
    // fall through to defaults
  }
  return { packages: DEFAULT_PACKAGES, accounts: [], auditEvents: [], updatedAt: null };
}

function writePanelState(state: any) {
  fs.mkdirSync(TPANEL_CONFIG_DIR, { recursive: true });
  fs.writeFileSync(PANEL_STATE_FILE, JSON.stringify({ ...state, updatedAt: new Date().toISOString() }, null, 2));
}

function actorFromRequest(req: express.Request) {
  const session = (req as any).tpanelSession || sessionFromRequest(req);
  return session?.username || session?.role || "system";
}

function withAuditEvent(state: any, event: any) {
  const entry = {
    id: `audit-${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`,
    at: new Date().toISOString(),
    actor: event.actor || "system",
    action: event.action || "system.event",
    target: event.target || "",
    message: event.message || "",
    severity: event.severity || "info",
    metadata: event.metadata || {}
  };
  return {
    ...state,
    auditEvents: [entry, ...(state.auditEvents || [])].slice(0, 500)
  };
}

function writeStarterSite(account: any) {
  const publicDir = path.join(account.homeDirectory, "public_html");
  fs.mkdirSync(publicDir, { recursive: true });
  const indexHtml = path.join(publicDir, "index.html");
  const indexPhp = path.join(publicDir, "index.php");
  if (account.runtime === "node") {
    fs.writeFileSync(path.join(publicDir, "package.json"), JSON.stringify({
      scripts: { start: "node server.js" },
      dependencies: { express: "^4.21.2" }
    }, null, 2));
    fs.writeFileSync(path.join(publicDir, "server.js"), `const express = require("express");
const app = express();
const port = process.env.PORT || ${account.nodePort || 3000};
app.get("/", (_req, res) => res.send("Welcome to ${account.domain} on tPanel Node.js"));
app.listen(port, "0.0.0.0", () => console.log("Node app listening on", port));
`);
  } else if (account.runtime === "php") {
    if (!fs.existsSync(indexHtml) && !fs.existsSync(indexPhp)) {
      fs.writeFileSync(indexHtml, starterIndexHtml(account.domain));
    }
    writePhpUserIni(account);
  } else {
    if (!fs.existsSync(indexHtml) && !fs.existsSync(indexPhp)) {
      fs.writeFileSync(indexHtml, starterIndexHtml(account.domain));
    }
  }
}

function starterIndexHtml(domain: string) {
  const safeDomain = htmlEscape(domain || "your website");
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeDomain}</title>
    <style>
      body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fff;color:#0f172a;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      main{width:min(92vw,680px);text-align:center;border:1px solid #e5e7eb;border-radius:8px;padding:44px 28px}
      .logo{width:64px;height:64px;margin:0 auto 18px;border-radius:18px;background:#0069ff;color:white;display:grid;place-items:center;font-weight:900;font-size:24px}
      h1{font-size:28px;margin:0 0 10px}
      p{margin:0;color:#64748b;line-height:1.6}
      code{background:#f1f5f9;border-radius:4px;padding:2px 6px;color:#0f172a}
    </style>
  </head>
  <body>
    <main>
      <div class="logo">tP</div>
      <h1>Thanks for installing tPanel</h1>
      <p>${safeDomain} is connected to <code>public_html</code>. Delete this file and upload your website when you are ready.</p>
    </main>
  </body>
</html>
`;
}

function requestIp(req?: express.Request) {
  if (!req) return "";
  const forwarded = req.headers["x-forwarded-for"];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return String(value || req.ip || req.socket.remoteAddress || "").replace(/^::ffff:/, "");
}

function cleanIp(value: unknown) {
  return String(value || "")
    .replace(/^::ffff:/, "")
    .replace(/[^a-fA-F0-9:.]/g, "")
    .trim();
}

function configuredServerIp(req?: express.Request) {
  const envIp = cleanIp(TPANEL_SERVER_IP || process.env.SERVER_IP || process.env.PUBLIC_IP);
  if (envIp) return envIp;
  const interfaces = os.networkInterfaces();
  for (const entries of Object.values(interfaces)) {
    for (const entry of entries || []) {
      if (entry.family === "IPv4" && !entry.internal && !/^(10|127|169\.254|172\.(1[6-9]|2\d|3[0-1])|192\.168)\./.test(entry.address)) {
        return entry.address;
      }
    }
  }
  return req ? cleanIp(requestIp(req)) : "";
}

async function detectServerIp(req?: express.Request) {
  const configured = configuredServerIp(req);
  if (configured && !/^(127|10|169\.254|172\.(1[6-9]|2\d|3[0-1])|192\.168)\./.test(configured)) return configured;
  for (const endpoint of ["https://api.ipify.org", "https://ifconfig.me/ip"]) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    try {
      const response = await fetch(endpoint, { signal: controller.signal });
      const ip = cleanIp(await response.text());
      if (response.ok && ip) return ip;
    } catch {
      // keep the local fallback
    } finally {
      clearTimeout(timer);
    }
  }
  return configured;
}

function cleanDomain(value: unknown) {
  const domain = String(value || "tiwlo.com")
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "")
    .replace(/[^a-z0-9.-]/g, "")
    .replace(/^\.+|\.+$/g, "");
  return domain || "tiwlo.com";
}

function defaultDomainSettings(req?: express.Request) {
  const serverIp = configuredServerIp(req);
  return {
    primaryDomain: "tiwlo.com",
    panelUrl: "https://tiwlo.com",
    detectedServerIp: serverIp,
    autoDetectIp: true,
    enableNginxProxy: true,
    enableSsl: true,
    dnsRecords: [
      { type: "A", name: "@", value: serverIp || "SERVER_IP", ttl: 300 },
      { type: "CNAME", name: "www", value: "tiwlo.com", ttl: 300 }
    ],
    ports: REQUIRED_PORTS
  };
}

function readDomainSettings(req?: express.Request) {
  try {
    if (fs.existsSync(DOMAIN_SETTINGS_FILE)) {
      const saved = JSON.parse(fs.readFileSync(DOMAIN_SETTINGS_FILE, "utf8"));
      const defaults = defaultDomainSettings(req);
      const primaryDomain = cleanDomain(saved.primaryDomain);
      const detectedServerIp = saved.autoDetectIp === false ? saved.detectedServerIp : defaults.detectedServerIp;
      return {
        ...defaults,
        ...saved,
        primaryDomain,
        panelUrl: saved.panelUrl || `${saved.enableSsl === false ? "http" : "https"}://${primaryDomain}`,
        detectedServerIp,
        dnsRecords: (saved.dnsRecords || [
          { type: "A", name: "@", value: detectedServerIp || "SERVER_IP", ttl: 300 },
          { type: "CNAME", name: "www", value: primaryDomain, ttl: 300 }
        ]).map((record: any) => ({
          ...record,
          value: record.value === "SERVER_IP" ? (detectedServerIp || "SERVER_IP") : record.value
        })),
        ports: REQUIRED_PORTS
      };
    }
  } catch {
    return defaultDomainSettings(req);
  }
  return defaultDomainSettings(req);
}

function writeDomainSettings(settings: any) {
  fs.mkdirSync(TPANEL_CONFIG_DIR, { recursive: true });
  fs.writeFileSync(DOMAIN_SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

function resolveAccountDomain(req: express.Request, username: string, requestedDomain: unknown) {
  const rawDomain = String(requestedDomain || "").trim();
  const cleaned = rawDomain ? cleanDomain(rawDomain) : "";
  if (cleaned && cleaned.includes(".") && !cleaned.endsWith(".tpanel.local")) return cleaned;
  return "";
}

function buildAccountProvisioning(req: express.Request | undefined, account: any) {
  const settings = readDomainSettings(req);
  const serverIp = account.dedicatedIp || settings.detectedServerIp || configuredServerIp(req) || "SERVER_IP";
  const primaryDomain = cleanDomain(settings.primaryDomain || "tiwlo.com");
  const autoSubdomain = account.domain.endsWith(`.${primaryDomain}`);
  const aliases = [`www.${account.domain}`];
  const resourceLimits = account.resourceLimits || account.limits || {};
  return {
    primaryDomain,
    autoSubdomain,
    limits: {
      packageId: account.packageId,
      packageName: account.packageName,
      quotaMb: account.quotaMb,
      bandwidthGb: account.bandwidthGb,
      cpuCores: account.cpuCores,
      ramMb: account.ramMb ?? account.memoryMb,
      memoryMb: account.memoryMb ?? account.ramMb,
      resourceLimits
    },
    dnsRecords: domainDnsRecords(account.domain, serverIp, true).map((record) => ({
      ...record,
      status: record.host === `ftp.${account.domain}` && !account.ftpEnabled
        ? "disabled"
        : record.host === `mail.${account.domain}` && !account.emailEnabled
          ? "disabled"
          : record.status
    })),
    ssl: {
      enabled: Boolean(account.sslEnabled),
      provider: "letsencrypt",
      autoRenew: Boolean(account.sslEnabled),
      status: account.sslEnabled ? "queued" : "disabled",
      challenge: "http-01",
      requestedAt: new Date().toISOString()
    },
    vhost: {
      status: "queued",
      serverName: account.domain,
      aliases,
      subdomains: [],
      documentRoot: account.documentRoot,
      runtime: account.runtime,
      phpVersion: account.phpVersion,
      phpSettings: phpSettingsForAccount(account),
      nodeVersion: account.nodeVersion,
      nodePort: account.nodePort
    }
  };
}

function writeAccountProvisioningPlan(account: any) {
  fs.mkdirSync(SITES_CONFIG_DIR, { recursive: true });
  const plan = {
    username: account.username,
    domain: account.domain,
    status: account.status,
    homeDirectory: account.homeDirectory,
    documentRoot: account.documentRoot,
    runtime: account.runtime,
    limits: {
      packageId: account.packageId,
      packageName: account.packageName,
      quotaMb: account.quotaMb,
      bandwidthGb: account.bandwidthGb,
      cpuCores: account.cpuCores,
      ramMb: account.ramMb ?? account.memoryMb,
      memoryMb: account.memoryMb ?? account.ramMb,
      resourceLimits: account.resourceLimits || account.limits || {}
    },
    provisioning: account.provisioning,
    updatedAt: new Date().toISOString()
  };
  fs.writeFileSync(path.join(SITES_CONFIG_DIR, `${account.username}.json`), JSON.stringify(plan, null, 2));
}

function updateStoredAccount(username: string, updater: (account: any) => any) {
  const state = readPanelState();
  let updatedAccount: any = null;
  const accounts = state.accounts.map((account: any) => {
    if (account.username !== username) return account;
    updatedAccount = updater(account);
    return updatedAccount;
  });
  if (updatedAccount) {
    writePanelState({ ...state, accounts });
    writeAccountProvisioningPlan(updatedAccount);
  }
  return updatedAccount;
}

function patchAccountProvisioning(account: any, patch: any) {
  const updated = updateStoredAccount(account.username, (current: any) => ({
    ...current,
    provisioning: {
      ...(current.provisioning || {}),
      ...patch,
      ssl: { ...(current.provisioning?.ssl || {}), ...(patch.ssl || {}) },
      vhost: { ...(current.provisioning?.vhost || {}), ...(patch.vhost || {}) }
    },
    updatedAt: new Date().toISOString()
  }));
  if (updated) {
    account.provisioning = updated.provisioning;
    account.updatedAt = updated.updatedAt;
  }
  return updated;
}

function accountNginxConfig(account: any) {
  const ssl = accountSslPaths(account);
  const primaryNames = uniqueCleanDomains([account.domain, ...(account.provisioning?.vhost?.aliases || [])]);
  const routes = [
    { serverNames: primaryNames, documentRoot: account.documentRoot, runtime: routeRuntimeFor(account, account.domain) },
    ...accountSubdomainRoutes(account).map((route: any) => ({
      serverNames: [route.domain, ...(route.aliases || [])],
      documentRoot: route.documentRoot,
      runtime: routeRuntimeFor(account, route.domain, route)
    }))
  ].filter((route) => route.serverNames.length);

  return routes.map((route) => [
    nginxHttpServerBlock(account, route.serverNames, route.documentRoot, Boolean(account.sslEnabled && ssl.ready), route.runtime),
    account.sslEnabled && ssl.ready ? nginxHttpsServerBlock(account, route.serverNames, route.documentRoot, route.runtime) : ""
  ].filter(Boolean).join("\n")).join("\n");
}

function appendProvisioningLog(account: any, message: string) {
  try {
    fs.mkdirSync(SITES_CONFIG_DIR, { recursive: true });
    fs.appendFileSync(path.join(SITES_CONFIG_DIR, `${account.username}.log`), `[${new Date().toISOString()}] ${message}\n`);
  } catch {
    // best-effort provisioning log
  }
}

function readProvisioningLog(username: string, maxLines = 40) {
  try {
    const logPath = path.join(SITES_CONFIG_DIR, `${sanitizeSlug(username, "account")}.log`);
    if (!fs.existsSync(logPath)) return [];
    return fs.readFileSync(logPath, "utf8").trim().split(/\r?\n/).slice(-maxLines);
  } catch {
    return [];
  }
}

function removeIfExists(targetPath: string) {
  try {
    if (fs.existsSync(targetPath)) fs.rmSync(targetPath, { recursive: true, force: true });
  } catch {
    // cleanup is best-effort; state deletion should still finish
  }
}

function safeAccountHome(account: any) {
  const home = path.resolve(account?.homeDirectory || "");
  const base = path.resolve(ACCOUNT_BASE_DIR);
  if (!home || home === base) return "";
  return home.startsWith(`${base}${path.sep}`) ? home : "";
}

function removeAccountProvisioningArtifacts(account: any) {
  const username = sanitizeSlug(account?.username, "account");
  removeIfExists(path.join(SITES_CONFIG_DIR, `${username}.json`));
  removeIfExists(path.join(SITES_CONFIG_DIR, `${username}.log`));

  if (process.platform !== "win32") {
    const siteName = `tpanel-${username}`;
    removeIfExists(`/etc/nginx/sites-enabled/${siteName}.conf`);
    removeIfExists(`/etc/nginx/sites-available/${siteName}.conf`);
    execFile("nginx", ["-t"], { timeout: 30000 }, (nginxError) => {
      if (!nginxError) {
        execFile("systemctl", ["reload", "nginx"], { timeout: 30000 }, () => undefined);
      }
    });
  }

  const home = safeAccountHome(account);
  if (home) removeIfExists(home);
}

function runLocalShell(command: string, timeout = 30000) {
  if (process.platform === "win32") return "";
  try {
    return execFileSync("sh", ["-lc", command], { encoding: "utf8", timeout, stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch (error: any) {
    return `${error.stdout || ""}${error.stderr || error.message || ""}`.trim();
  }
}

function ensureWebIngress(account?: any) {
  const output = runLocalShell(`
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
`, 45000);
  if (account && output) appendProvisioningLog(account, `Web ingress check: ${output.slice(-500)}`);
}

function reloadNginx() {
  if (process.platform === "win32") return;
  execFile("nginx", ["-t"], { timeout: 30000 }, (nginxError) => {
    if (!nginxError) {
      execFile("systemctl", ["reload", "nginx"], { timeout: 30000 }, () => undefined);
    }
  });
}

function removePanelProxyForDomain(domain: string) {
  if (process.platform === "win32") return;
  const clean = cleanDomain(domain);
  const candidates = [
    { available: "/etc/nginx/sites-available/tpanel-panel.conf", enabled: "/etc/nginx/sites-enabled/tpanel-panel.conf" },
    { available: "/etc/nginx/sites-available/tpanel.conf", enabled: "/etc/nginx/sites-enabled/tpanel.conf" }
  ];
  let changed = false;
  for (const candidate of candidates) {
    const raw = fs.existsSync(candidate.available) ? fs.readFileSync(candidate.available, "utf8") : "";
    if (raw.includes(`server_name ${clean} www.${clean};`) || raw.includes(`server_name ${clean};`)) {
      removeIfExists(candidate.enabled);
      removeIfExists(candidate.available);
      changed = true;
    }
  }
  if (changed) reloadNginx();
}

function panelPhpMyAdminPath() {
  if (process.platform === "win32") return "";
  return ["/usr/share/phpmyadmin", "/usr/share/phpMyAdmin"].find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) || "";
}

function panelPhpFpmSocket() {
  if (process.platform === "win32") return "";
  for (const version of installedPhpVersions()) {
    const socket = globalPhpFpmSocket(version);
    if (fs.existsSync(socket)) return socket;
  }
  const detected = runLocalShell("find /run/php -maxdepth 1 -type s -name 'php*-fpm.sock' 2>/dev/null | sort -V | tail -n 1", 10000);
  return detected && fs.existsSync(detected) ? detected : "";
}

function panelPhpMyAdminNginxBlock() {
  const phpMyAdminPath = panelPhpMyAdminPath();
  const phpSocket = panelPhpFpmSocket();
  if (!phpMyAdminPath || !phpSocket) return "";
  const aliasPath = toUnixPath(phpMyAdminPath).replace(/\/+$/, "");
  return `
    location = /phpmyadmin {
        return 302 /phpmyadmin/;
    }

    location /phpmyadmin/ {
        alias ${aliasPath}/;
        index index.php index.html;
    }

    location ~ ^/phpmyadmin/(.+\\.php)$ {
        alias ${aliasPath}/$1;
        include snippets/fastcgi-php.conf;
        fastcgi_param SCRIPT_FILENAME $request_filename;
        fastcgi_param DOCUMENT_ROOT ${aliasPath};
        fastcgi_pass unix:${phpSocket};
    }
`;
}

function requestHostWithoutPort(req: express.Request) {
  const forwardedHost = String(req.headers["x-forwarded-host"] || "").split(",")[0].trim();
  const hostHeader = forwardedHost || String(req.headers.host || "").trim();
  if (!hostHeader) return "";
  if (hostHeader.startsWith("[") && hostHeader.includes("]")) return hostHeader.slice(1, hostHeader.indexOf("]"));
  return hostHeader.split(":")[0];
}

function requestPort(req: express.Request) {
  const forwardedHost = String(req.headers["x-forwarded-host"] || "").split(",")[0].trim();
  const hostHeader = forwardedHost || String(req.headers.host || "").trim();
  const match = hostHeader.match(/:(\d+)$/);
  return match ? Number(match[1]) : null;
}

function panelPhpMyAdminUrl(req: express.Request, configured = "") {
  const explicit = String(configured || "").trim();
  if (explicit) return explicit;
  const host = requestHostWithoutPort(req);
  const port = requestPort(req);
  if (host && port && ![80, 443].includes(port)) {
    const forwardedProto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
    const protocol = forwardedProto || req.protocol || "http";
    return `${protocol}://${host}/phpmyadmin/`;
  }
  return "/phpmyadmin/";
}

function applyPanelDomainProxy(settings: any) {
  if (process.platform === "win32") return;
  const domain = cleanDomain(settings.primaryDomain);
  if (!domain || domain === "tiwlo.com") return;
  const state = readPanelState();
  if (domainInUse(state, domain)) {
    removePanelProxyForDomain(domain);
    return;
  }

  ensureWebIngress();
  const availablePath = "/etc/nginx/sites-available/tpanel-panel.conf";
  const enabledPath = "/etc/nginx/sites-enabled/tpanel-panel.conf";
  const proxyPort = Number(process.env.PORT || PORT || 2086);
  const serverIp = settings.detectedServerIp || configuredServerIp();
  const serverNames = Array.from(new Set([domain, `www.${domain}`, serverIp || "", "_"].filter(Boolean))).join(" ");
  const conf = `server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name ${serverNames};
    client_max_body_size 512m;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
${panelPhpMyAdminNginxBlock()}

    location / {
        proxy_pass http://127.0.0.1:${proxyPort};
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
`;
  try {
    fs.mkdirSync("/etc/nginx/sites-available", { recursive: true });
    fs.mkdirSync("/etc/nginx/sites-enabled", { recursive: true });
    fs.writeFileSync(availablePath, conf);
    if (fs.existsSync(enabledPath)) fs.unlinkSync(enabledPath);
    fs.symlinkSync(availablePath, enabledPath);
    reloadNginx();
  } catch {
    // domain settings should still save even if nginx is not installed yet
  }
}

function ensureDefaultPanelProxy() {
  if (process.platform === "win32") return;
  const state = readPanelState();
  const settings = readDomainSettings();
  const domain = cleanDomain(settings.primaryDomain || process.env.TPANEL_DOMAIN || "");
  const serverIp = settings.detectedServerIp || configuredServerIp();
  const names = Array.from(new Set([
    serverIp || "",
    "_",
    domain && domain !== "tiwlo.com" && !domainInUse(state, domain) ? domain : "",
    domain && domain !== "tiwlo.com" && !domainInUse(state, domain) ? `www.${domain}` : ""
  ].filter(Boolean))).join(" ");
  const availablePath = "/etc/nginx/sites-available/tpanel-panel.conf";
  const enabledPath = "/etc/nginx/sites-enabled/tpanel-panel.conf";
  const proxyPort = Number(process.env.PORT || PORT || 2086);
  const conf = `server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name ${names || "_"};
    client_max_body_size 512m;
    access_log /var/log/nginx/tpanel-panel.access.log;
    error_log /var/log/nginx/tpanel-panel.error.log;
${panelPhpMyAdminNginxBlock()}

    location / {
        proxy_pass http://127.0.0.1:${proxyPort};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300;
        proxy_send_timeout 300;
    }
}
`;
  try {
    ensureWebIngress();
    fs.mkdirSync("/etc/nginx/sites-available", { recursive: true });
    fs.mkdirSync("/etc/nginx/sites-enabled", { recursive: true });
    fs.mkdirSync("/var/log/nginx", { recursive: true });
    const current = fs.existsSync(availablePath) ? fs.readFileSync(availablePath, "utf8") : "";
    const linkExists = fs.existsSync(enabledPath);
    removeIfExists("/etc/nginx/sites-enabled/default");
    if (current !== conf) fs.writeFileSync(availablePath, conf);
    if (!linkExists) fs.symlinkSync(availablePath, enabledPath);
    if (current !== conf || !linkExists) reloadNginx();
  } catch {
    // startup should continue even if the panel proxy cannot be repaired.
  }
}

function ensureMaintenanceScripts() {
  if (process.platform === "win32") return;
  const updatePath = "/usr/local/sbin/tpanel-update";
  const script = [
    "#!/usr/bin/env bash",
    "set -euo pipefail",
    "",
    "if [ \"$(id -u)\" -ne 0 ]; then",
    "  echo \"Run as root: sudo tpanel-update\"",
    "  exit 1",
    "fi",
    "",
    "if [ -f /etc/tpanel/agent.env ]; then",
    "  . /etc/tpanel/agent.env",
    "fi",
    "TPANEL_DIR=\"${TPANEL_DIR:-/opt/tpanel}\"",
    "SOURCE_DIR=\"${SOURCE_DIR:-$TPANEL_DIR/source}\"",
    "APP_DIR=\"${APP_DIR:-$SOURCE_DIR/src/tPanel}\"",
    "TPANEL_PORT=\"${TPANEL_PORT:-2086}\"",
    "PHP_SELECTOR_VERSIONS=\"${TPANEL_PHP_SELECTOR_VERSIONS:-8.4 8.3 8.2 8.1 8.0 7.4}\"",
    "BUILD_NODE_VERSION=\"${TPANEL_NODE_VERSION:-24.16.0}\"",
    "TOOLS_DIR=\"$TPANEL_DIR/tools\"",
    "DOWNLOADS_DIR=\"$TOOLS_DIR/downloads\"",
    "NODE_ROOT=\"$TOOLS_DIR/node\"",
    "NODE_SELECTOR_DIR=\"$TOOLS_DIR/node-selector\"",
    "NODE_BIN=\"\"",
    "NPM_BIN=\"\"",
    "",
    "node_arch() {",
    "  case \"$(uname -m)\" in",
    "    x86_64|amd64) echo \"x64\" ;;",
    "    arm64|aarch64) echo \"arm64\" ;;",
    "    *) return 1 ;;",
    "  esac",
    "}",
    "",
    "download_runtime() {",
    "  local url=\"$1\"",
    "  local output=\"$2\"",
    "  mkdir -p \"$(dirname \"$output\")\"",
    "  if command -v curl >/dev/null 2>&1; then",
    "    curl -fsSL \"$url\" -o \"$output\"",
    "  elif command -v wget >/dev/null 2>&1; then",
    "    wget -qO \"$output\" \"$url\"",
    "  else",
    "    return 1",
    "  fi",
    "}",
    "",
    "ensure_build_node() {",
    "  local arch folder tarball node_bin",
    "  arch=\"$(node_arch)\" || { echo \"Unsupported CPU architecture for bundled Node.js: $(uname -m)\" >&2; exit 1; }",
    "  folder=\"node-v${BUILD_NODE_VERSION}-linux-${arch}\"",
    "  tarball=\"${folder}.tar.xz\"",
    "  node_bin=\"$NODE_ROOT/$folder/bin\"",
    "  mkdir -p \"$NODE_ROOT\" \"$DOWNLOADS_DIR\"",
    "  if [ ! -x \"$node_bin/node\" ]; then",
    "    echo \"Installing bundled Node.js v${BUILD_NODE_VERSION} for tPanel build...\"",
    "    download_runtime \"https://nodejs.org/dist/v${BUILD_NODE_VERSION}/${tarball}\" \"$DOWNLOADS_DIR/$tarball\"",
    "    tar -xJf \"$DOWNLOADS_DIR/$tarball\" -C \"$NODE_ROOT\"",
    "  fi",
    "  NODE_BIN=\"$node_bin/node\"",
    "  NPM_BIN=\"$node_bin/npm\"",
    "  export PATH=\"$node_bin:$PATH\"",
    "  \"$NODE_BIN\" -v | grep -q \"^v${BUILD_NODE_VERSION}$\" || { echo \"Bundled Node.js v${BUILD_NODE_VERSION} is not available.\" >&2; exit 1; }",
    "}",
    "",
    "install_php_selector_versions() {",
    "  command -v apt-get >/dev/null 2>&1 || return 0",
    "  export DEBIAN_FRONTEND=noninteractive",
    "  apt-get update -y || true",
    "  apt-get install -y software-properties-common apt-transport-https lsb-release gnupg >/dev/null 2>&1 || true",
    "  if [ -r /etc/os-release ] && . /etc/os-release && [ \"${ID:-}\" = \"ubuntu\" ]; then",
    "    command -v add-apt-repository >/dev/null 2>&1 && add-apt-repository -y ppa:ondrej/php >/dev/null 2>&1 || true",
    "    apt-get update -y || true",
    "  fi",
    "  for version in $PHP_SELECTOR_VERSIONS; do",
    "    apt-get install -y \"php${version}-fpm\" \"php${version}-cli\" \"php${version}-common\" \"php${version}-mysql\" \"php${version}-pgsql\" \"php${version}-sqlite3\" \"php${version}-curl\" \"php${version}-zip\" \"php${version}-mbstring\" \"php${version}-xml\" \"php${version}-gd\" \"php${version}-intl\" \"php${version}-bcmath\" \"php${version}-soap\" \"php${version}-opcache\" || true",
    "    for extension in imagick redis gmp ldap imap readline bz2 xsl; do",
    "      apt-get install -y \"php${version}-${extension}\" || true",
    "    done",
    "  done",
    "}",
    "",
    "install_runtime_packages() {",
    "  if command -v apt-get >/dev/null 2>&1; then",
    "    export DEBIAN_FRONTEND=noninteractive",
    "    apt-get update -y || true",
    "    apt-get install -y git curl wget ca-certificates openssl xz-utils nginx ufw certbot python3 python3-certbot-nginx build-essential software-properties-common apt-transport-https lsb-release gnupg php-fpm php-cli php-common php-mysql php-pgsql php-sqlite3 php-curl php-zip php-mbstring php-xml php-gd php-intl php-bcmath php-soap php-opcache php-imagick php-redis php-gmp php-ldap php-imap php-readline php-bz2 php-xsl phpmyadmin mariadb-server postgresql postgresql-contrib vsftpd composer zip unzip tar rsync logrotate cron acl || true",
    "  elif command -v dnf >/dev/null 2>&1; then",
    "    dnf install -y php-fpm php-cli php-common php-mysqlnd php-pgsql php-sqlite3 php-curl php-zip php-mbstring php-bz2 php-xml php-gd php-intl php-bcmath php-soap php-opcache php-pecl-imagick php-pecl-redis php-gmp php-ldap php-imap php-readline phpMyAdmin mariadb-server postgresql postgresql-contrib vsftpd composer zip unzip || true",
    "  elif command -v yum >/dev/null 2>&1; then",
    "    yum install -y php-fpm php-cli php-common php-mysqlnd php-pgsql php-sqlite3 php-curl php-zip php-mbstring php-bz2 php-xml php-gd php-intl php-bcmath php-soap php-opcache php-pecl-imagick php-pecl-redis php-gmp php-ldap php-imap php-readline phpMyAdmin mariadb-server postgresql postgresql-contrib vsftpd composer zip unzip || true",
    "  fi",
    "  for svc in $(systemctl list-unit-files --type=service 'php*-fpm.service' 2>/dev/null | awk '/php.*-fpm\\.service/ {print $1}'); do",
    "    systemctl enable --now \"$svc\" >/dev/null 2>&1 || true",
    "  done",
    "  systemctl enable --now nginx >/dev/null 2>&1 || true",
    "  systemctl enable --now mariadb >/dev/null 2>&1 || systemctl enable --now mysql >/dev/null 2>&1 || true",
    "  systemctl enable --now postgresql >/dev/null 2>&1 || true",
    "  systemctl enable --now vsftpd >/dev/null 2>&1 || true",
    "}",
    "",
    "install_node_selector_versions() {",
    "  [ -x \"$NODE_BIN\" ] || return 0",
    "  mkdir -p \"$NODE_SELECTOR_DIR\" \"$DOWNLOADS_DIR\"",
    "  local index_file=\"$DOWNLOADS_DIR/node-index.json\"",
    "  download_runtime https://nodejs.org/dist/index.json \"$index_file\" || return 0",
    "  local node_arch",
    "  node_arch=\"$(node_arch)\" || return 0",
    "  local versions",
    "  versions=\"$(\"$NODE_BIN\" - \"$index_file\" <<'NODE'",
    "const fs = require('fs');",
    "const rows = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));",
    "const selected = [];",
    "const majors = new Set();",
    "for (const row of rows) {",
    "  const version = String(row.version || '').replace(/^v/, '');",
    "  const major = Number(version.split('.')[0]);",
    "  if (!Number.isFinite(major) || major < 14 || major % 2 !== 0 || majors.has(major)) continue;",
    "  majors.add(major);",
    "  selected.push(version);",
    "  if (selected.length >= 6) break;",
    "}",
    "console.log(selected.join(' '));",
    "NODE",
    ")\"",
    "  for version in $versions; do",
    "    local folder=\"node-v${version}-linux-${node_arch}\"",
    "    local tarball=\"${folder}.tar.xz\"",
    "    [ -x \"$NODE_SELECTOR_DIR/$folder/bin/node\" ] && continue",
    "    download_runtime \"https://nodejs.org/dist/v${version}/${tarball}\" \"$DOWNLOADS_DIR/$tarball\" || true",
    "    [ -f \"$DOWNLOADS_DIR/$tarball\" ] && tar -xJf \"$DOWNLOADS_DIR/$tarball\" -C \"$NODE_SELECTOR_DIR\" || true",
    "  done",
    "}",
    "",
    "install_app_dependencies() {",
    "  export npm_config_include=optional",
    "  export npm_config_optional=true",
    "  rm -rf node_modules",
    "  if [ -f package-lock.json ]; then",
    "    \"$NPM_BIN\" ci --include=optional || { rm -rf node_modules package-lock.json; \"$NPM_BIN\" install --include=optional; }",
    "  else",
    "    \"$NPM_BIN\" install --include=optional",
    "  fi",
    "  if ! \"$NODE_BIN\" -e \"require('@tailwindcss/oxide')\" >/dev/null 2>&1; then",
    "    echo \"Tailwind native binding missing; retrying clean optional dependency install...\"",
    "    rm -rf node_modules package-lock.json",
    "    \"$NPM_BIN\" cache verify || true",
    "    \"$NPM_BIN\" install --include=optional",
    "    \"$NODE_BIN\" -e \"require('@tailwindcss/oxide')\"",
    "  fi",
    "}",
    "",
    "install_runtime_packages",
    "ensure_build_node",
    "install_php_selector_versions",
    "install_node_selector_versions",
    "cd \"$SOURCE_DIR\"",
    "git pull --ff-only || { git stash push -u -m \"tpanel-update-autostash-$(date +%Y%m%d%H%M%S)\" || true; git pull --ff-only; }",
    "cd \"$APP_DIR\"",
    "install_app_dependencies",
    "if ! \"$NPM_BIN\" run build; then",
    "  echo \"Build failed. Retrying after a clean dependency install...\"",
    "  rm -rf node_modules package-lock.json",
    "  install_app_dependencies",
    "  \"$NPM_BIN\" run build",
    "fi",
    "if [ -x /usr/local/sbin/tpanel-repair-nginx ]; then",
    "  /usr/local/sbin/tpanel-repair-nginx || true",
    "fi",
    "systemctl restart tpanel",
    "echo \"tPanel updated. Runtime versions, extensions, panel route, database and user data were preserved.\"",
    ""
  ].join("\n");
  try {
    fs.mkdirSync(path.dirname(updatePath), { recursive: true });
    const current = fs.existsSync(updatePath) ? fs.readFileSync(updatePath, "utf8") : "";
    if (current !== script) {
      fs.writeFileSync(updatePath, script);
      fs.chmodSync(updatePath, 0o700);
    }
  } catch {
    // Not running as root or /usr/local/sbin unavailable; update can still be run from installer.
  }
}

function hardDeleteAccount(state: any, username: string, actor: string) {
  const account = (state.accounts || []).find((item: any) => item.username === username);
  if (!account) return { account: null, state };
  const accounts = (state.accounts || []).filter((item: any) => item.username !== username);
  removeAccountProvisioningArtifacts(account);
  const nextState = withAuditEvent({ ...state, accounts }, {
    actor,
    action: "account.deleted",
    target: username,
    message: `${username} account and hosted data were deleted permanently.`,
    severity: "danger",
    metadata: { domain: account.domain }
  });
  writePanelState(nextState);
  return { account: { ...account, status: "deleted", updatedAt: new Date().toISOString() }, state: nextState };
}

function uniqueCleanDomains(values: unknown[]) {
  return Array.from(new Set(values.map((value) => cleanDomain(value)).filter(Boolean)));
}

function allAccountDomains(account: any) {
  return uniqueCleanDomains([
    account.domain,
    ...(account.provisioning?.vhost?.aliases || []),
    ...((account.provisioning?.vhost?.subdomains || []).flatMap((route: any) => [route.domain, ...(route.aliases || [])]))
  ]);
}

function domainInUse(state: any, domain: string, ignoreUsername = "") {
  const clean = cleanDomain(domain);
  if (!clean || !clean.includes(".")) return null;
  return (state.accounts || []).find((account: any) => {
    if (TERMINAL_ACCOUNT_STATUSES.has(String(account.status || "").toLowerCase())) return false;
    if (ignoreUsername && account.username === ignoreUsername) return false;
    return allAccountDomains(account).includes(clean);
  }) || null;
}

function domainDnsRecords(domain: string, serverIp: string, includeServiceRecords = true) {
  const clean = cleanDomain(domain);
  const records = [
    { type: "A", host: clean, name: "@", value: serverIp || "SERVER_IP", ttl: 300, status: "ready" },
    { type: "CNAME", host: `www.${clean}`, name: "www", value: clean, ttl: 300, status: "ready" }
  ];
  if (includeServiceRecords) {
    records.push(
      { type: "A", host: `ftp.${clean}`, name: "ftp", value: serverIp || "SERVER_IP", ttl: 300, status: "ready" },
      { type: "A", host: `mail.${clean}`, name: "mail", value: serverIp || "SERVER_IP", ttl: 300, status: "ready" }
    );
  }
  return records;
}

function domainItemFor(domain: string, documentRoot: string, account: any, serverIp: string) {
  const clean = cleanDomain(domain);
  const webPath = documentRoot.startsWith("/") ? documentRoot : `/${documentRoot}`;
  return {
    id: `dom-${Buffer.from(clean).toString("base64url")}`,
    domainName: clean,
    documentRoot: webPath,
    sslActive: account.provisioning?.ssl?.status === "active",
    sslType: account.sslEnabled === false ? "None" : "Let's Encrypt",
    dnsRecords: domainDnsRecords(clean, serverIp, false).map((record, index) => ({
      id: `dns-${Buffer.from(`${clean}-${record.name}-${index}`).toString("base64url")}`,
      type: record.type,
      name: record.name,
      value: record.value,
      ttl: record.ttl
    }))
  };
}

function toUnixPath(value: string) {
  return path.resolve(value).replace(/\\/g, "/");
}

function accountSslPaths(account: any) {
  const liveDir = `/etc/letsencrypt/live/${cleanDomain(account.domain)}`;
  const certificate = `${liveDir}/fullchain.pem`;
  const certificateKey = `${liveDir}/privkey.pem`;
  return {
    certificate,
    certificateKey,
    ready: process.platform !== "win32" && fs.existsSync(certificate) && fs.existsSync(certificateKey)
  };
}

function accountSubdomainRoutes(account: any) {
  const routes = Array.isArray(account.provisioning?.vhost?.subdomains)
    ? account.provisioning.vhost.subdomains
    : [];
  return routes
    .map((route: any) => ({
      domain: cleanDomain(route.domain),
      aliases: uniqueCleanDomains(route.aliases || []),
      documentRoot: route.documentRoot ? path.resolve(route.documentRoot) : path.join(account.documentRoot, sanitizeSlug(route.prefix, "subdomain")),
      webPath: route.webPath || `/public_html/${sanitizeSlug(route.prefix, "subdomain")}`,
      sslEnabled: route.sslEnabled !== false
    }))
    .filter((route: any) => route.domain && route.domain !== cleanDomain(account.domain));
}

function normalizeRuntime(value: unknown, fallback = "php") {
  const runtime = String(value || fallback).toLowerCase();
  return ["php", "node", "static"].includes(runtime) ? runtime : fallback;
}

function runtimeRouteMap(account: any) {
  const raw = account?.provisioning?.vhost?.runtimeRoutes;
  return raw && typeof raw === "object" ? raw : {};
}

function normalizeNodeVersion(value: unknown, fallback = DEFAULT_NODE_VERSION) {
  const clean = String(value || fallback).trim().replace(/^v/i, "");
  return /^\d+\.\d+\.\d+$/.test(clean) ? clean : fallback;
}

function sortNodeVersions(versions: string[]) {
  return Array.from(new Set(versions.map((item) => normalizeNodeVersion(item)).filter(Boolean)))
    .sort((a, b) => {
      const left = a.split(".").map(Number);
      const right = b.split(".").map(Number);
      return right[0] - left[0] || right[1] - left[1] || right[2] - left[2];
    });
}

function configuredNodeSelectorVersions() {
  const env = String(process.env.TPANEL_NODE_SELECTOR_VERSIONS || "").trim();
  const parsed = env
    ? env.split(/[,\s]+/).map((item) => normalizeNodeVersion(item, "")).filter(Boolean)
    : DEFAULT_NODE_SELECTOR_VERSIONS;
  return sortNodeVersions(parsed.length ? parsed : DEFAULT_NODE_SELECTOR_VERSIONS);
}

function availableNodeVersions() {
  return sortNodeVersions([...configuredNodeSelectorVersions(), ...installedNodeVersions(), DEFAULT_NODE_VERSION]);
}

function effectiveNodeVersion(account: any, requested = account?.nodeVersion) {
  const preferred = normalizeNodeVersion(requested || DEFAULT_NODE_VERSION);
  const installed = installedNodeVersions();
  return installed.includes(preferred) ? preferred : installed[0] || preferred;
}

function routeRuntimeFor(account: any, domain: unknown, route: any = {}) {
  const clean = cleanDomain(domain);
  const mapped = clean ? runtimeRouteMap(account)[clean] || {} : {};
  const mappedNodeApp = mapped.nodeAppId
    ? storedNodeApps(account).find((app: any) => app.id === mapped.nodeAppId)
    : null;
  const runtime = normalizeRuntime(mapped.runtime || route.runtime || account.runtime || "php");
  const phpVersion = normalizePhpVersion(mapped.phpVersion || route.phpVersion || account.phpVersion || account.phpSettings?.version || DEFAULT_PHP_VERSION);
  const phpSettings = {
    ...phpSettingsForAccount({ ...account, phpVersion, phpSettings: { ...(account.phpSettings || {}), ...(mapped.phpSettings || route.phpSettings || {}), version: phpVersion } }),
    version: phpVersion
  };
  const nodeVersion = normalizeNodeVersion(mapped.nodeVersion || route.nodeVersion || account.nodeVersion || DEFAULT_NODE_VERSION);
  return {
    runtime,
    phpVersion,
    phpSettings,
    nodeVersion,
    effectiveNodeVersion: effectiveNodeVersion(account, nodeVersion),
    nodePort: Number(mapped.nodePort || route.nodePort || mappedNodeApp?.port || account.nodePort || 3000),
    nginxGzip: mapped.nginxGzip ?? route.nginxGzip ?? mappedNodeApp?.nginxGzip ?? true,
    nginxProxyHeaders: mapped.nginxProxyHeaders ?? route.nginxProxyHeaders ?? mappedNodeApp?.nginxProxyHeaders ?? true
  };
}

function accountRuntimeDomains(account: any) {
  const entries = [
    {
      domain: cleanDomain(account.domain),
      label: "Primary domain",
      documentRoot: path.resolve(account.documentRoot || path.join(account.homeDirectory, "public_html")),
      webPath: "/public_html",
      primary: true,
      aliases: uniqueCleanDomains(account.provisioning?.vhost?.aliases || [])
    },
    ...accountSubdomainRoutes(account).map((route: any) => ({
      domain: cleanDomain(route.domain),
      label: route.type === "addon_domain" ? "Addon domain" : "Subdomain",
      documentRoot: path.resolve(route.documentRoot),
      webPath: route.webPath,
      primary: false,
      aliases: uniqueCleanDomains(route.aliases || []),
      route
    }))
  ].filter((entry) => entry.domain);

  return entries.map((entry) => ({
    ...entry,
    runtime: routeRuntimeFor(account, entry.domain, entry.route)
  }));
}

function normalizeTargetDomains(input: any, account: any) {
  const domains = accountRuntimeDomains(account).map((entry: any) => entry.domain);
  const selected = Array.isArray(input)
    ? input
    : String(input || "all").toLowerCase() === "all"
      ? domains
      : [input];
  const clean = uniqueCleanDomains(selected);
  return clean.includes("all") ? domains : clean.filter((domain) => domains.includes(domain));
}

function normalizePhpVersion(value: unknown, fallback = DEFAULT_PHP_VERSION) {
  const match = String(value || "").match(/^[0-9]+\.[0-9]+/);
  return match ? match[0] : fallback;
}

function sortPhpVersions(versions: string[]) {
  return Array.from(new Set(versions.map((item) => normalizePhpVersion(item)).filter(Boolean)))
    .sort((a, b) => Number(b.split(".")[0]) - Number(a.split(".")[0]) || Number(b.split(".")[1]) - Number(a.split(".")[1]));
}

function configuredPhpSelectorVersions() {
  const parsed = DEFAULT_PHP_SELECTOR_VERSION_INPUT
    .split(/[,\s]+/)
    .map((item) => item.match(/^[0-9]+\.[0-9]+/)?.[0] || "")
    .filter(Boolean);
  return sortPhpVersions(parsed.length ? parsed : ["8.4", "8.3", "8.2", "8.1", "8.0", "7.4"]);
}

function availablePhpVersions() {
  return sortPhpVersions([...configuredPhpSelectorVersions(), ...installedPhpVersions(), DEFAULT_PHP_VERSION]);
}

function commandExistsSync(command: string) {
  if (process.platform === "win32") return false;
  try {
    execFileSync("sh", ["-lc", `command -v '${command.replace(/'/g, "'\\''")}' >/dev/null 2>&1`], { stdio: "ignore", timeout: 10000 });
    return true;
  } catch {
    return false;
  }
}

function installedPhpVersions() {
  if (phpVersionCache && Date.now() - phpVersionCache.at < 60000) return phpVersionCache.versions;
  if (process.platform === "win32") return [DEFAULT_PHP_VERSION];
  const versions: string[] = [];
  try {
    if (fs.existsSync("/etc/php")) {
      for (const entry of fs.readdirSync("/etc/php", { withFileTypes: true })) {
        if (entry.isDirectory() && /^\d+\.\d+$/.test(entry.name) && fs.existsSync(`/etc/php/${entry.name}/fpm`)) versions.push(entry.name);
      }
    }
  } catch {
    // keep probing
  }
  try {
    if (fs.existsSync("/run/php")) {
      for (const entry of fs.readdirSync("/run/php")) {
        const match = entry.match(/^php(\d+\.\d+)-fpm\.sock$/);
        if (match) versions.push(match[1]);
      }
    }
  } catch {
    // keep probing
  }
  try {
    const version = execFileSync("php", ["-r", "echo PHP_MAJOR_VERSION.'.'.PHP_MINOR_VERSION;"], { encoding: "utf8", timeout: 10000 }).trim();
    if (version) versions.push(version);
  } catch {
    // php cli may not be installed yet
  }
  const detected = sortPhpVersions(versions.length ? versions : [DEFAULT_PHP_VERSION]);
  phpVersionCache = { at: Date.now(), versions: detected };
  return detected;
}

function effectivePhpVersion(account: any, requested = account?.phpVersion) {
  const preferred = normalizePhpVersion(requested || account?.phpSettings?.version || DEFAULT_PHP_VERSION);
  const installed = installedPhpVersions();
  return installed.includes(preferred) ? preferred : installed[0] || preferred;
}

function phpFpmService(version: string) {
  return `php${normalizePhpVersion(version)}-fpm`;
}

function globalPhpFpmSocket(version: string) {
  return `/run/php/php${normalizePhpVersion(version)}-fpm.sock`;
}

function accountPhpPoolName(account: any, version = account?.phpVersion) {
  return `tpanel-${sanitizeSlug(account?.username, "account")}-php${normalizePhpVersion(version)}`;
}

function accountPhpFpmSocket(account: any, version = account?.phpVersion) {
  return `/run/php/${accountPhpPoolName(account, version)}.sock`;
}

function phpFpmSocket(account: any) {
  const version = effectivePhpVersion(account);
  return account?.username ? accountPhpFpmSocket(account, version) : globalPhpFpmSocket(version);
}

function phpCliCommand(version: string) {
  const specific = `php${normalizePhpVersion(version)}`;
  return commandExistsSync(specific) ? specific : "php";
}

function installedPhpExtensions(version: string) {
  const cleanVersion = normalizePhpVersion(version);
  const cached = phpExtensionCache.get(cleanVersion);
  if (cached && Date.now() - cached.at < 60000) return cached.extensions;
  if (process.platform === "win32") return DEFAULT_PHP_EXTENSIONS;
  try {
    const output = execFileSync(phpCliCommand(cleanVersion), ["-m"], { encoding: "utf8", timeout: 15000 });
    const rawExtensions = output.split(/\r?\n/).map((item) => item.trim().toLowerCase()).filter(Boolean);
    const aliases: Record<string, string[]> = {
      "zend opcache": ["opcache"],
      pdo: ["pdo"],
      mysqlnd: ["mysqlnd"],
      "pdo_mysql": ["pdo_mysql"],
      "pdo_pgsql": ["pdo_pgsql"],
      "pdo_sqlite": ["pdo_sqlite"],
      "simplexml": ["simplexml", "xml"],
      "xmlreader": ["xmlreader", "xml"],
      "xmlwriter": ["xmlwriter", "xml"]
    };
    const expanded = rawExtensions.flatMap((item) => [item, ...(aliases[item] || [])]);
    const extensions = Array.from(new Set(expanded));
    phpExtensionCache.set(cleanVersion, { at: Date.now(), extensions });
    return extensions;
  } catch {
    return [];
  }
}

function installedNodeVersions() {
  if (nodeVersionCache && Date.now() - nodeVersionCache.at < 60000) return nodeVersionCache.versions;
  const versions: string[] = [];
  try {
    const output = execFileSync("node", ["-v"], { encoding: "utf8", timeout: 10000 }).trim();
    if (output) versions.push(output.replace(/^v/i, ""));
  } catch {
    // bundled node selector may still exist
  }
  try {
    if (fs.existsSync(NODE_SELECTOR_DIR)) {
      for (const entry of fs.readdirSync(NODE_SELECTOR_DIR, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const match = entry.name.match(/^node-v(\d+\.\d+\.\d+)-/);
        if (match) versions.push(match[1]);
      }
    }
  } catch {
    // keep fallback list
  }
  const detected = sortNodeVersions(versions.length ? versions : DEFAULT_NODE_SELECTOR_VERSIONS);
  nodeVersionCache = { at: Date.now(), versions: detected };
  return detected;
}

function nodeBinaryForVersion(version: string) {
  const clean = normalizeNodeVersion(version);
  if (process.platform === "win32") return "node";
  try {
    if (fs.existsSync(NODE_SELECTOR_DIR)) {
      for (const entry of fs.readdirSync(NODE_SELECTOR_DIR, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        if (!entry.name.startsWith(`node-v${clean}-`)) continue;
        const candidate = path.join(NODE_SELECTOR_DIR, entry.name, "bin", "node");
        if (fs.existsSync(candidate)) return candidate;
      }
    }
  } catch {
    // fallback below
  }
  return "node";
}

async function installNodeRuntimeVersion(version: string) {
  if (process.platform === "win32") return "";
  const clean = normalizeNodeVersion(version);
  const escapedRoot = NODE_SELECTOR_DIR.replace(/'/g, "'\\''");
  const escapedVersion = clean.replace(/'/g, "'\\''");
  const script = `
set -e
arch="$(uname -m)"
case "$arch" in
  x86_64|amd64) node_arch="x64" ;;
  arm64|aarch64) node_arch="arm64" ;;
  *) echo "Unsupported Node.js architecture: $arch"; exit 1 ;;
esac
root='${escapedRoot}'
version='${escapedVersion}'
folder="node-v\${version}-linux-\${node_arch}"
tarball="\${folder}.tar.xz"
url="https://nodejs.org/dist/v\${version}/\${tarball}"
mkdir -p "$root"
if [ ! -x "$root/\$folder/bin/node" ]; then
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' EXIT
  if command -v curl >/dev/null 2>&1; then
    curl -fL "$url" -o "$tmp/\$tarball"
  elif command -v wget >/dev/null 2>&1; then
    wget -O "$tmp/\$tarball" "$url"
  else
    echo "curl or wget is required to install Node.js runtimes."
    exit 1
  fi
  tar -xJf "$tmp/\$tarball" -C "$root"
fi
"$root/\$folder/bin/node" -v
`;
  const { stdout, stderr } = await execFileAsync("sh", ["-lc", script], { timeout: 900000, maxBuffer: 4 * 1024 * 1024 });
  nodeVersionCache = null;
  return `${stdout || ""}${stderr || ""}`.trim();
}

function normalizePhpExtensionSelection(input: any) {
  const raw = Array.isArray(input)
    ? input
    : input && typeof input === "object"
      ? Object.entries(input).filter(([, enabled]) => Boolean(enabled)).map(([key]) => key)
      : DEFAULT_SELECTED_PHP_EXTENSIONS;
  const catalog = new Set(DEFAULT_PHP_EXTENSIONS);
  const selected = raw.map((item: any) => String(item).toLowerCase().trim()).filter((item: string) => catalog.has(item));
  return Array.from(new Set(selected.length ? selected : DEFAULT_SELECTED_PHP_EXTENSIONS));
}

function safePhpIniValue(value: unknown, fallback: string) {
  const clean = String(value || fallback).trim().replace(/[^0-9A-Za-z_.:-]/g, "").slice(0, 24);
  return clean || fallback;
}

function finiteNumberOrNull(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function firstFiniteNumber(...values: unknown[]) {
  for (const value of values) {
    const numeric = finiteNumberOrNull(value);
    if (numeric !== null) return numeric;
  }
  return null;
}

function phpMemoryLimitFallback(account: any) {
  const memoryMb = firstFiniteNumber(account.phpMemoryMb, account.ramMb, account.memoryMb);
  if (memoryMb !== null && memoryMb <= 0) return "-1";
  const safeMb = Math.max(128, Math.min(4096, memoryMb ?? 256));
  return `${safeMb}M`;
}

function normalizePhpIni(input: any = {}, account: any = {}) {
  const upload = safePhpIniValue(input.upload_max_filesize || account.phpSettings?.ini?.upload_max_filesize, `${account.uploadLimitMb || 128}M`);
  return {
    memory_limit: safePhpIniValue(input.memory_limit || account.phpSettings?.ini?.memory_limit, phpMemoryLimitFallback(account)),
    upload_max_filesize: upload,
    post_max_size: safePhpIniValue(input.post_max_size || account.phpSettings?.ini?.post_max_size, upload),
    max_execution_time: safePhpIniValue(input.max_execution_time || account.phpSettings?.ini?.max_execution_time, "120"),
    max_input_vars: safePhpIniValue(input.max_input_vars || account.phpSettings?.ini?.max_input_vars, "3000")
  };
}

function phpSettingsForAccount(account: any) {
  const version = normalizePhpVersion(account?.phpSettings?.version || account?.phpVersion || DEFAULT_PHP_VERSION);
  return {
    version,
    effectiveVersion: effectivePhpVersion(account, version),
    extensions: normalizePhpExtensionSelection(account?.phpSettings?.extensions),
    ini: normalizePhpIni(account?.phpSettings?.ini, account)
  };
}

function writePhpUserIni(account: any, documentRoot?: string) {
  const settings = phpSettingsForAccount(account);
  const publicDir = path.resolve(documentRoot || account.documentRoot || path.join(account.homeDirectory, "public_html"));
  fs.mkdirSync(publicDir, { recursive: true });
  fs.writeFileSync(path.join(publicDir, ".user.ini"), [
    `memory_limit=${settings.ini.memory_limit}`,
    `upload_max_filesize=${settings.ini.upload_max_filesize}`,
    `post_max_size=${settings.ini.post_max_size}`,
    `max_execution_time=${settings.ini.max_execution_time}`,
    `max_input_vars=${settings.ini.max_input_vars}`,
    "log_errors=On",
    "display_errors=Off"
  ].join("\n") + "\n");
}

function webRuntimeUser() {
  if (process.platform === "win32") return "www-data";
  for (const user of ["www-data", "nginx", "apache"]) {
    try {
      execFileSync("id", ["-u", user], { stdio: "ignore", timeout: 10000 });
      return user;
    } catch {
      // try next runtime user
    }
  }
  return "www-data";
}

function ensureSystemAccountUser(account: any) {
  if (process.platform === "win32") return;
  const username = sanitizeSlug(account.username, "account").replace(/[^a-z0-9_-]/g, "").slice(0, 31);
  if (!/^[a-z_][a-z0-9_-]{2,30}$/.test(username)) throw new Error("Invalid Linux username for PHP isolation.");
  const home = path.resolve(account.homeDirectory);
  let createdUser = false;
  try {
    execFileSync("id", ["-u", username], { stdio: "ignore", timeout: 10000 });
  } catch {
    fs.mkdirSync(path.dirname(home), { recursive: true });
    if (fs.existsSync(home)) execFileSync("useradd", ["-d", home, "-s", "/bin/bash", username], { timeout: 120000 });
    else execFileSync("useradd", ["-m", "-d", home, "-s", "/bin/bash", username], { timeout: 120000 });
    createdUser = true;
  }
  fs.mkdirSync(path.join(home, "public_html"), { recursive: true });
  try {
    const chownArgs = createdUser
      ? ["-R", `${username}:${username}`, home]
      : [`${username}:${username}`, home, path.join(home, "public_html")];
    execFileSync("chown", chownArgs, { timeout: 120000 });
    execFileSync("chmod", ["750", home], { timeout: 30000 });
  } catch {
    // ownership normalization is best-effort; command execution will surface remaining permission issues
  }
}

function ensureAccountPhpPool(account: any, versionOverride?: string) {
  if (process.platform === "win32" || (account.runtime === "node" && !versionOverride)) return null;
  const version = effectivePhpVersion(account, versionOverride || account.phpVersion);
  const confDir = `/etc/php/${version}/fpm/pool.d`;
  if (!fs.existsSync(confDir)) {
    throw new Error(`PHP-FPM ${version} is not installed. Install PHP ${version} FPM and extensions, then apply again.`);
  }
  ensureSystemAccountUser(account);
  writePhpUserIni({ ...account, phpVersion: version });
  const username = sanitizeSlug(account.username, "account").replace(/[^a-z0-9_-]/g, "").slice(0, 31);
  const home = path.resolve(account.homeDirectory);
  const docRoot = path.resolve(account.documentRoot || path.join(home, "public_html"));
  const logsDir = path.join(home, "logs");
  const sessionDir = path.join(home, ".sessions");
  fs.mkdirSync(logsDir, { recursive: true });
  fs.mkdirSync(sessionDir, { recursive: true });
  const runtimeUser = webRuntimeUser();
  const settings = phpSettingsForAccount({ ...account, phpVersion: version });
  const rawPoolMemoryMb = firstFiniteNumber(account.ramMb, account.memoryMb, account.phpMemoryMb);
  const poolMemoryMb = rawPoolMemoryMb !== null && rawPoolMemoryMb <= 0
    ? 8192
    : Math.max(128, Math.min(8192, rawPoolMemoryMb ?? 512));
  const maxChildren = Math.max(1, Math.min(50, Math.floor(poolMemoryMb / 128)));
  const poolName = accountPhpPoolName(account, version);
  const socket = accountPhpFpmSocket(account, version);
  const poolConfig = `[${poolName}]
user = ${username}
group = ${username}
listen = ${socket}
listen.owner = ${runtimeUser}
listen.group = ${runtimeUser}
listen.mode = 0660
pm = ondemand
pm.max_children = ${maxChildren}
pm.process_idle_timeout = 20s
pm.max_requests = 500
chdir = ${toUnixPath(docRoot)}
php_admin_value[open_basedir] = ${toUnixPath(home)}:/tmp:/usr/share/php
php_admin_value[error_log] = ${toUnixPath(path.join(logsDir, "php-error.log"))}
php_admin_flag[log_errors] = on
php_value[session.save_path] = ${toUnixPath(sessionDir)}
php_value[memory_limit] = ${settings.ini.memory_limit}
php_value[upload_max_filesize] = ${settings.ini.upload_max_filesize}
php_value[post_max_size] = ${settings.ini.post_max_size}
php_value[max_execution_time] = ${settings.ini.max_execution_time}
php_value[max_input_vars] = ${settings.ini.max_input_vars}
`;
  fs.writeFileSync(path.join(confDir, `${poolName}.conf`), poolConfig);
  try {
    execFileSync("chown", ["-R", `${username}:${username}`, logsDir, sessionDir], { timeout: 120000 });
    execFileSync("chmod", ["700", sessionDir], { timeout: 30000 });
  } catch {
    // pool can still start if ownership normalization is skipped
  }
  execFileSync("systemctl", ["restart", phpFpmService(version)], { timeout: 120000 });
  return { version, socket, poolName };
}

function phpErrorLogPath(account: any) {
  return path.join(path.resolve(account.homeDirectory), "logs", "php-error.log");
}

function tailTextFile(filePath: string, maxLines = 80) {
  try {
    if (!fs.existsSync(filePath)) return "";
    return fs.readFileSync(filePath, "utf8").split(/\r?\n/).slice(-maxLines).join("\n").trim();
  } catch {
    return "";
  }
}

function phpSettingsPayload(account: any, extra: any = {}) {
  const settings = phpSettingsForAccount(account);
  const installedVersions = installedPhpVersions();
  const versionOptions = availablePhpVersions();
  const installedExtensions = installedPhpExtensions(settings.effectiveVersion);
  const installedSet = new Set(installedExtensions);
  const selectedSet = new Set(settings.extensions);
  const catalog = DEFAULT_PHP_EXTENSIONS.map((name) => ({
    name,
    installed: installedSet.has(name.toLowerCase()),
    selected: selectedSet.has(name)
  }));
  return {
    ok: true,
    ...extra,
    settings,
    installedVersions,
    availableVersions: versionOptions,
    missingVersions: versionOptions.filter((version) => !installedVersions.includes(version)),
    extensions: catalog,
    domains: accountRuntimeDomains(account),
    runtimeRoutes: runtimeRouteMap(account),
    missingExtensions: settings.extensions.filter((name: string) => !installedSet.has(name)),
    fpm: {
      service: phpFpmService(settings.effectiveVersion),
      socket: accountPhpFpmSocket(account, settings.effectiveVersion),
      pool: accountPhpPoolName(account, settings.effectiveVersion)
    },
    diagnostics: {
      phpErrorLog: tailTextFile(phpErrorLogPath(account)),
      provisioningLog: readProvisioningLog(account.username, 20)
    }
  };
}

function nodeSettingsPayload(account: any, extra: any = {}) {
  const version = normalizeNodeVersion(account?.nodeVersion || DEFAULT_NODE_VERSION);
  const installedVersions = installedNodeVersions();
  const versionOptions = availableNodeVersions();
  const effectiveVersion = effectiveNodeVersion(account, version);
  return {
    ok: true,
    ...extra,
    settings: {
      version,
      effectiveVersion,
      nodePort: Number(account?.nodePort || 3000),
      binary: nodeBinaryForVersion(effectiveVersion)
    },
    installedVersions,
    availableVersions: versionOptions,
    domains: accountRuntimeDomains(account),
    runtimeRoutes: runtimeRouteMap(account),
    missingVersions: installedVersions.includes(version) ? [] : [version],
    diagnostics: {
      provisioningLog: readProvisioningLog(account.username, 20)
    }
  };
}

function storedNodeApps(account: any) {
  const raw = account?.nodeAppProvisioning?.apps;
  return Array.isArray(raw) ? raw : [];
}

function nodeAppServiceName(account: any, app: any) {
  const accountPart = sanitizeSlug(account?.username, "account").replace(/[^a-z0-9_-]/g, "").slice(0, 24);
  const appPart = sanitizeSlug(app?.name || app?.id, "app").replace(/[^a-z0-9_-]/g, "").slice(0, 32);
  return `tpanel-node-${accountPart}-${appPart}`;
}

function nodeAppServicePath(account: any, app: any) {
  return `/etc/systemd/system/${nodeAppServiceName(account, app)}.service`;
}

function sanitizeEnvKey(value: unknown) {
  const clean = String(value || "").toUpperCase().replace(/[^A-Z0-9_]/g, "").slice(0, 64);
  if (!/^[A-Z_][A-Z0-9_]*$/.test(clean)) throw new Error("Environment variable name must start with a letter or underscore.");
  return clean;
}

function normalizeNodeEnvVars(input: unknown, port: number) {
  const envMap = new Map<string, string>();
  envMap.set("PORT", String(port));
  envMap.set("NODE_ENV", "production");
  if (Array.isArray(input)) {
    for (const item of input) {
      const key = sanitizeEnvKey((item as any)?.key);
      if (key === "PORT") continue;
      const value = String((item as any)?.value ?? "").replace(/\r/g, "").slice(0, 4096);
      envMap.set(key, value);
    }
  }
  return Array.from(envMap.entries()).map(([key, value]) => ({ key, value }));
}

function nodeEnvFile(account: any, app: any) {
  return path.join(path.resolve(app.appDirectory || nodeAppDirectory(account, app.name)), ".env");
}

function writeNodeEnvFile(account: any, app: any) {
  const envFile = nodeEnvFile(account, app);
  fs.mkdirSync(path.dirname(envFile), { recursive: true });
  const content = normalizeNodeEnvVars(app.envVars, Number(app.port || 3000))
    .map((item) => {
      const value = String(item.value || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
      return `${item.key}="${value}"`;
    })
    .join("\n") + "\n";
  fs.writeFileSync(envFile, content);
  if (process.platform !== "win32") fs.chmodSync(envFile, 0o600);
  applyAccountFileOwnership(account, envFile);
}

function nodeAppDirectory(account: any, name: unknown) {
  const appName = sanitizeSlug(name, "app").replace(/[^a-z0-9_-]/g, "").slice(0, 40);
  return ensureInside(account.homeDirectory, path.join(account.homeDirectory, "node_apps", appName));
}

function normalizeNodeAppInput(account: any, body: any, existing: any = {}) {
  const name = sanitizeSlug(body?.name || existing.name || "node-app", "node-app").replace(/[^a-z0-9_-]/g, "").slice(0, 40);
  if (!/^[a-z0-9][a-z0-9_-]{1,39}$/.test(name)) throw new Error("Choose a valid Node app name using letters, numbers, dash, or underscore.");
  const port = Number(body?.port || body?.nodePort || existing.port || 3000);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("Choose a valid Node.js app port between 1024 and 65535.");
  const startupFile = safeRelativePath(body?.startupFile || body?.startup || existing.startupFile || "server.js") || "server.js";
  if (startupFile.includes("/") || startupFile.includes("\\")) throw new Error("Startup file must be inside the app root, for example server.js.");
  const requestedVersion = normalizeNodeVersion(body?.nodeVersion || existing.nodeVersion || account.nodeVersion || DEFAULT_NODE_VERSION);
  const domain = cleanDomain(body?.domain || existing.domain || account.domain);
  const route = accountRuntimeDomains(account).find((entry: any) => cleanDomain(entry.domain) === domain);
  if (!route) throw new Error("Select a domain that belongs to this hosting account.");
  const requestedMaxMemoryMb = firstFiniteNumber(body?.maxMemoryMB, existing.maxMemoryMB);
  const inheritedMemoryMb = firstFiniteNumber(account.memoryMb, account.ramMb);
  const defaultMaxMemoryMb = inheritedMemoryMb !== null && inheritedMemoryMb <= 0 ? 4096 : inheritedMemoryMb ?? 512;
  const maxMemoryMB = Math.max(128, Math.min(4096, requestedMaxMemoryMb ?? defaultMaxMemoryMb));
  const instances = Math.max(1, Math.min(8, Number(body?.instances || existing.instances || 1)));
  return {
    name,
    port,
    startupFile,
    nodeVersion: requestedVersion,
    domain,
    domainId: `dom-${Buffer.from(domain).toString("base64url")}`,
    appDirectory: existing.appDirectory || nodeAppDirectory(account, name),
    envVars: normalizeNodeEnvVars(body?.envVars || existing.envVars, port),
    clustering: Boolean(body?.clustering ?? existing.clustering ?? false),
    instances,
    maxMemoryMB,
    nginxGzip: body?.nginxGzip ?? existing.nginxGzip ?? true,
    nginxProxyHeaders: body?.nginxProxyHeaders ?? existing.nginxProxyHeaders ?? true
  };
}

function allNodeAppPorts(state = readPanelState()) {
  const ports = new Map<number, string>();
  for (const account of activePanelAccounts(state)) {
    for (const app of storedNodeApps(account)) {
      const port = Number(app.port || 0);
      if (port) ports.set(port, account.username);
    }
    for (const route of Object.values(runtimeRouteMap(account)) as any[]) {
      const port = Number((route as any)?.nodePort || 0);
      if (port) ports.set(port, account.username);
    }
  }
  return ports;
}

function ensureNodePortAvailable(account: any, port: number, ignoreAppId = "") {
  const state = readPanelState();
  const usedByApps = allNodeAppPorts(state);
  const owner = usedByApps.get(port);
  if (owner && owner !== account.username) throw new Error(`Port ${port} is already allocated to another hosting account.`);
  for (const app of storedNodeApps(account)) {
    if (ignoreAppId && app.id === ignoreAppId) continue;
    if (Number(app.port) === port) throw new Error(`Port ${port} is already allocated to another Node app in this account.`);
  }
}

function writeDefaultNodeApp(account: any, app: any) {
  fs.mkdirSync(app.appDirectory, { recursive: true });
  const packageJson = path.join(app.appDirectory, "package.json");
  const startupPath = path.join(app.appDirectory, app.startupFile);
  if (!fs.existsSync(packageJson)) {
    fs.writeFileSync(packageJson, JSON.stringify({
      scripts: { start: `node ${app.startupFile}` },
      dependencies: { express: "^4.21.2", dotenv: "^17.2.3" }
    }, null, 2));
  }
  if (!fs.existsSync(startupPath)) {
    fs.writeFileSync(startupPath, `require("dotenv").config();
const express = require("express");
const app = express();
const port = Number(process.env.PORT || ${Number(app.port || 3000)});

app.get("/", (_req, res) => {
  res.send("${htmlEscape(app.name)} is running on tPanel Node.js");
});

app.get("/healthz", (_req, res) => {
  res.json({ ok: true, app: "${htmlEscape(app.name)}" });
});

app.listen(port, "127.0.0.1", () => {
  console.log("Node app listening on", port);
});
`);
  }
  applyAccountFileOwnership(account, app.appDirectory);
}

async function installNodeAppDependencies(account: any, app: any) {
  const packageJson = path.join(app.appDirectory, "package.json");
  if (!fs.existsSync(packageJson)) return "";
  const nodeBin = nodeBinaryForVersion(app.nodeVersion || account.nodeVersion || DEFAULT_NODE_VERSION);
  const nodeBinDir = path.isAbsolute(nodeBin) ? path.dirname(nodeBin) : "";
  const command = `if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi`;
  const runner = `${nodeBinDir ? `export PATH=${shellSingleQuote(nodeBinDir)}:$PATH; ` : ""}${command}`;
  const { stdout, stderr } = await runAccountProvisionCommand(account, runner, app.appDirectory, 900000);
  return `${stdout || ""}${stderr || ""}`.trim();
}

function packageDependencies(appDirectory: string) {
  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(appDirectory, "package.json"), "utf8"));
    return Object.keys(packageJson.dependencies || {});
  } catch {
    return [];
  }
}

function nodeAppStatus(account: any, app: any) {
  if (process.platform === "win32") return app.status || "stopped";
  const service = nodeAppServiceName(account, app);
  const status = runLocalShell(`systemctl is-active ${shellSingleQuote(service)} 2>/dev/null || true`, 10000);
  if (status === "active") return "running";
  if (status === "failed") return "crashing";
  return "stopped";
}

function nodeAppLogs(account: any, app: any, maxLines = 80) {
  const saved = Array.isArray(app.logs) ? app.logs : [];
  if (process.platform === "win32") return saved.slice(-maxLines);
  const service = nodeAppServiceName(account, app);
  const output = runLocalShell(`journalctl -u ${shellSingleQuote(service)} -n ${maxLines} --no-pager 2>/dev/null || true`, 20000);
  return output ? output.split(/\r?\n/).filter(Boolean).slice(-maxLines) : saved.slice(-maxLines);
}

function nodeAppsPublicPayload(account: any) {
  return storedNodeApps(account).map((app: any) => {
    const status = nodeAppStatus(account, app);
    return {
      ...app,
      status,
      nodeVersion: `v${normalizeNodeVersion(app.nodeVersion || account.nodeVersion || DEFAULT_NODE_VERSION)}`,
      installedPackages: packageDependencies(app.appDirectory || ""),
      logs: nodeAppLogs(account, app, 60),
      cpuUsage: status === "running" ? Number(app.cpuUsage || 1.2) : 0,
      memoryUsageMB: status === "running" ? Number(app.memoryUsageMB || 32) : 0
    };
  });
}

function nodeAppsPayload(account: any, extra: any = {}) {
  return {
    ok: true,
    ...extra,
    apps: nodeAppsPublicPayload(account),
    limits: {
      maxNodeApps: Number(account.maxNodeApps || account.nodeApps || 0),
      usedNodeApps: storedNodeApps(account).length
    },
    domains: accountRuntimeDomains(account).map((entry: any) => ({
      id: `dom-${Buffer.from(entry.domain).toString("base64url")}`,
      domain: entry.domain,
      label: entry.label,
      documentRoot: entry.documentRoot,
      webPath: entry.webPath
    })),
    availableVersions: availableNodeVersions()
  };
}

async function writeNodeAppService(account: any, app: any) {
  if (process.platform === "win32") throw new Error("Real Node.js process provisioning is available on Linux tPanel nodes only.");
  ensureSystemAccountUser(account);
  if (!installedNodeVersions().includes(normalizeNodeVersion(app.nodeVersion))) {
    await installNodeRuntimeVersion(app.nodeVersion);
  }
  writeDefaultNodeApp(account, app);
  writeNodeEnvFile(account, app);
  await installNodeAppDependencies(account, app);
  const username = accountShellUsername(account);
  const nodeBin = nodeBinaryForVersion(app.nodeVersion);
  const execNode = path.isAbsolute(nodeBin) ? toUnixPath(nodeBin) : "/usr/bin/env node";
  const service = nodeAppServiceName(account, app);
  const envFile = nodeEnvFile(account, app);
  const startupPath = ensureInside(app.appDirectory, path.join(app.appDirectory, app.startupFile));
  const unit = `[Unit]
Description=tPanel Node app ${app.name} for ${account.username}
After=network.target

[Service]
Type=simple
User=${username}
Group=${username}
WorkingDirectory=${toUnixPath(app.appDirectory)}
EnvironmentFile=${toUnixPath(envFile)}
Environment=NODE_ENV=production
Environment=NODE_OPTIONS=--max-old-space-size=${Number(app.maxMemoryMB || 512)}
Environment=WEB_CONCURRENCY=${Number(app.instances || 1)}
ExecStart=${execNode} ${toUnixPath(startupPath)}
Restart=always
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ReadWritePaths=${toUnixPath(account.homeDirectory)}

[Install]
WantedBy=multi-user.target
`;
  fs.writeFileSync(nodeAppServicePath(account, app), unit);
  await execFileAsync("systemctl", ["daemon-reload"], { timeout: 60000 });
  await execFileAsync("systemctl", ["enable", "--now", service], { timeout: 120000 });
  return service;
}

async function nodeAppControl(account: any, app: any, action: string) {
  if (process.platform === "win32") throw new Error("Real Node.js process controls are available on Linux tPanel nodes only.");
  const service = nodeAppServiceName(account, app);
  const normalized = String(action || "").toLowerCase();
  if (!["start", "stop", "restart", "reload"].includes(normalized)) throw new Error("Unsupported Node app action.");
  if ((normalized === "start" || normalized === "restart" || normalized === "reload") && !fs.existsSync(nodeAppServicePath(account, app))) {
    await writeNodeAppService(account, app);
    if (normalized === "start") return service;
  }
  await execFileAsync("systemctl", [normalized === "reload" ? "restart" : normalized, service], { timeout: 120000 });
  return service;
}

function updateNodeAppRoute(account: any, app: any, remove = false) {
  return updateStoredAccount(account.username, (current: any) => {
    const provisioning = current.provisioning || buildAccountProvisioning(undefined, current);
    const runtimeRoutes = { ...(provisioning.vhost?.runtimeRoutes || {}) };
    const isPrimaryDomain = cleanDomain(current.domain) === cleanDomain(app.domain);
    if (remove) {
      delete runtimeRoutes[cleanDomain(app.domain)];
    } else {
      runtimeRoutes[cleanDomain(app.domain)] = {
        ...(runtimeRoutes[cleanDomain(app.domain)] || {}),
        runtime: "node",
        nodeVersion: normalizeNodeVersion(app.nodeVersion || current.nodeVersion || DEFAULT_NODE_VERSION),
        nodePort: Number(app.port),
        nodeAppId: app.id,
        nginxGzip: app.nginxGzip !== false,
        nginxProxyHeaders: app.nginxProxyHeaders !== false,
        updatedAt: new Date().toISOString()
      };
    }
    return {
      ...current,
      runtime: isPrimaryDomain ? (remove ? "php" : "node") : current.runtime,
      nodeVersion: isPrimaryDomain && !remove ? normalizeNodeVersion(app.nodeVersion) : current.nodeVersion,
      nodePort: isPrimaryDomain && !remove ? Number(app.port) : current.nodePort,
      provisioning: {
        ...provisioning,
        vhost: {
          ...(provisioning.vhost || {}),
          runtimeRoutes,
          status: "queued"
        }
      },
      updatedAt: new Date().toISOString()
    };
  }) || account;
}

async function createNodeApp(account: any, body: any) {
  if (!normalizeAccountPermissions(account.permissions, account).node) {
    throw new Error("Node.js controls are disabled for this account.");
  }
  const maxApps = Number(account.maxNodeApps || account.nodeApps || 0);
  const currentApps = storedNodeApps(account);
  if (maxApps > 0 && currentApps.length >= maxApps) throw new Error("Node app limit reached. Upgrade the package before creating more Node.js apps.");
  const normalized = normalizeNodeAppInput(account, body);
  ensureNodePortAvailable(account, normalized.port);
  if (currentApps.some((app: any) => app.name === normalized.name)) throw new Error("This Node app name already exists.");
  const app = {
    id: `node-${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`,
    ...normalized,
    status: "stopped",
    logs: [`[${new Date().toISOString()}] Node app created.`],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  await writeNodeAppService(account, app);
  const updated = updateStoredAccount(account.username, (current: any) => ({
    ...current,
    nodeAppProvisioning: {
      ...(current.nodeAppProvisioning || {}),
      apps: [app, ...storedNodeApps(current)]
    },
    updatedAt: new Date().toISOString()
  })) || account;
  const routed = updateNodeAppRoute(updated, app);
  appendProvisioningLog(routed, `Node app ${app.name} started on ${app.domain}:${app.port}.`);
  applyAccountProvisioning(routed);
  return routed;
}

async function updateNodeApp(account: any, appId: string, body: any) {
  const existing = storedNodeApps(account).find((app: any) => app.id === appId);
  if (!existing) throw new Error("Node app was not found.");
  const normalized = normalizeNodeAppInput(account, body, existing);
  ensureNodePortAvailable(account, normalized.port, appId);
  const nextApp = { ...existing, ...normalized, updatedAt: new Date().toISOString() };
  await writeNodeAppService(account, nextApp);
  const updated = updateStoredAccount(account.username, (current: any) => ({
    ...current,
    nodeAppProvisioning: {
      ...(current.nodeAppProvisioning || {}),
      apps: storedNodeApps(current).map((app: any) => app.id === appId ? nextApp : app)
    },
    updatedAt: new Date().toISOString()
  })) || account;
  const routed = updateNodeAppRoute(updated, nextApp);
  appendProvisioningLog(routed, `Node app ${nextApp.name} settings applied.`);
  applyAccountProvisioning(routed);
  return routed;
}

async function deleteNodeApp(account: any, appId: string) {
  const existing = storedNodeApps(account).find((app: any) => app.id === appId);
  if (!existing) throw new Error("Node app was not found.");
  if (process.platform !== "win32") {
    const service = nodeAppServiceName(account, existing);
    await execFileAsync("systemctl", ["disable", "--now", service], { timeout: 120000 }).catch(() => undefined);
    removeIfExists(nodeAppServicePath(account, existing));
    await execFileAsync("systemctl", ["daemon-reload"], { timeout: 60000 }).catch(() => undefined);
  }
  const appDir = existing.appDirectory ? ensureInside(account.homeDirectory, existing.appDirectory) : "";
  if (appDir && fs.existsSync(appDir)) fs.rmSync(appDir, { recursive: true, force: true });
  const updated = updateStoredAccount(account.username, (current: any) => ({
    ...current,
    nodeAppProvisioning: {
      ...(current.nodeAppProvisioning || {}),
      apps: storedNodeApps(current).filter((app: any) => app.id !== appId)
    },
    updatedAt: new Date().toISOString()
  })) || account;
  const routed = updateNodeAppRoute(updated, existing, true);
  appendProvisioningLog(routed, `Node app ${existing.name} deleted.`);
  applyAccountProvisioning(routed);
  return routed;
}

async function installNodePackage(account: any, appId: string, packageNameInput: unknown, uninstall = false) {
  const app = storedNodeApps(account).find((item: any) => item.id === appId);
  if (!app) throw new Error("Node app was not found.");
  const packageName = String(packageNameInput || "").trim().toLowerCase();
  if (!/^(?:@[\w.-]+\/)?[\w.-]{1,214}$/.test(packageName)) throw new Error("Enter a valid npm package name.");
  const command = uninstall ? `npm uninstall ${shellSingleQuote(packageName)} --save` : `npm install ${shellSingleQuote(packageName)} --save`;
  const nodeBin = nodeBinaryForVersion(app.nodeVersion || account.nodeVersion || DEFAULT_NODE_VERSION);
  const nodeBinDir = path.isAbsolute(nodeBin) ? path.dirname(nodeBin) : "";
  const { stdout, stderr } = await runAccountProvisionCommand(account, `${nodeBinDir ? `export PATH=${shellSingleQuote(nodeBinDir)}:$PATH; ` : ""}${command}`, app.appDirectory, 900000);
  applyAccountFileOwnership(account, app.appDirectory);
  await nodeAppControl(account, app, "restart").catch(() => undefined);
  return `${stdout || ""}${stderr || ""}`.trim();
}

function nginxContentBlock(account: any, documentRoot: string, routeRuntime: any = null) {
  const root = toUnixPath(documentRoot);
  const runtime = routeRuntime || routeRuntimeFor(account, account.domain);
  if (runtime.runtime === "node") {
    const proxyHeaders = runtime.nginxProxyHeaders !== false
      ? `        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
`
      : "";
    const gzipBlock = runtime.nginxGzip !== false
      ? `
    gzip on;
    gzip_proxied any;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
`
      : "";
    return `    location /.well-known/acme-challenge/ {
        root ${root};
    }

    location / {
        proxy_pass http://127.0.0.1:${Number(runtime.nodePort || account.nodePort || 3000)};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
${proxyHeaders.trimEnd()}
    }
${gzipBlock.trimEnd()}`;
  }

  return `    root ${root};
    index index.php index.html index.htm;

    location /.well-known/acme-challenge/ {
        root ${root};
    }

    location = / {
        try_files /index.html /index.htm /index.php?$query_string;
    }

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \\.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:${phpFpmSocket({ ...account, phpVersion: runtime.phpVersion, phpSettings: runtime.phpSettings })};
    }

    location ~ /\\. {
        deny all;
    }`;
}

function nginxHttpServerBlock(account: any, serverNames: string[], documentRoot: string, redirectToHttps: boolean, routeRuntime: any = null) {
  const names = uniqueCleanDomains(serverNames).join(" ");
  const root = toUnixPath(documentRoot);
  if (redirectToHttps) {
    return `server {
    listen 80;
    server_name ${names};

    location /.well-known/acme-challenge/ {
        root ${root};
    }

    location / {
        return 301 https://$host$request_uri;
    }
}
`;
  }

  return `server {
    listen 80;
    server_name ${names};

${nginxContentBlock(account, documentRoot, routeRuntime)}
}
`;
}

function nginxHttpsServerBlock(account: any, serverNames: string[], documentRoot: string, routeRuntime: any = null) {
  const names = uniqueCleanDomains(serverNames).join(" ");
  const ssl = accountSslPaths(account);
  return `server {
    listen 443 ssl http2;
    server_name ${names};

    ssl_certificate ${ssl.certificate};
    ssl_certificate_key ${ssl.certificateKey};
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

${nginxContentBlock(account, documentRoot, routeRuntime)}
}
`;
}

function queueAccountSslProvision(account: any, args: string[], onComplete: (error: Error | null, stdout: string, stderr: string) => void) {
  sslProvisioningChain = sslProvisioningChain
    .catch(() => undefined)
    .then(() => new Promise<void>((resolve) => {
      execFile("certbot", args, { timeout: 180000 }, (error, stdout, stderr) => {
        onComplete(error, stdout || "", stderr || "");
        resolve();
      });
    }));
  appendProvisioningLog(account, "Auto SSL queued behind any active certificate job.");
}

function applyAccountProvisioning(account: any) {
  if (process.platform === "win32") return;
  const siteName = `tpanel-${account.username}`;
  const availablePath = `/etc/nginx/sites-available/${siteName}.conf`;
  const enabledPath = `/etc/nginx/sites-enabled/${siteName}.conf`;
  ensureWebIngress(account);
  ensureWebReadableAccount(account);
  try {
    const phpRoutes = accountRuntimeDomains(account).filter((entry: any) => entry.runtime.runtime === "php");
    const versions = Array.from(new Set(phpRoutes.map((entry: any) => entry.runtime.phpVersion)));
    versions.forEach((version: any) => ensureAccountPhpPool(account, version));
    phpRoutes.forEach((entry: any) => {
      writePhpUserIni({ ...account, phpVersion: entry.runtime.phpVersion, phpSettings: entry.runtime.phpSettings }, entry.documentRoot);
    });
  } catch (error: any) {
    appendProvisioningLog(account, `PHP-FPM pool failed: ${error.message}`);
    patchAccountProvisioning(account, { vhost: { status: "failed", message: error.message }, ssl: { status: "blocked" } });
    return;
  }
  removePanelProxyForDomain(account.domain);
  patchAccountProvisioning(account, {
    vhost: { status: "configuring", lastRunAt: new Date().toISOString() },
    ssl: { status: account.sslEnabled ? "queued" : "disabled", lastRunAt: new Date().toISOString() }
  });
  try {
    fs.mkdirSync("/etc/nginx/sites-available", { recursive: true });
    fs.mkdirSync("/etc/nginx/sites-enabled", { recursive: true });
    fs.writeFileSync(availablePath, accountNginxConfig(account));
    try {
      if (fs.existsSync(enabledPath)) fs.unlinkSync(enabledPath);
      fs.symlinkSync(availablePath, enabledPath);
    } catch (error: any) {
      appendProvisioningLog(account, `Nginx symlink skipped: ${error.message}`);
    }
  } catch (error: any) {
    appendProvisioningLog(account, `Nginx vhost write failed: ${error.message}`);
    patchAccountProvisioning(account, { vhost: { status: "failed", message: error.message } });
    return;
  }
  patchAccountProvisioning(account, { vhost: { status: "configured", configPath: availablePath, enabledPath } });

  execFile("nginx", ["-t"], { timeout: 30000 }, (nginxError, stdout, stderr) => {
    if (nginxError) {
      appendProvisioningLog(account, `Nginx test failed: ${nginxError.message} ${stderr || stdout || ""}`.trim());
      patchAccountProvisioning(account, { vhost: { status: "failed", message: stderr || nginxError.message }, ssl: { status: "blocked" } });
      return;
    }
    execFile("systemctl", ["reload", "nginx"], { timeout: 30000 }, (reloadError) => {
      if (reloadError) {
        appendProvisioningLog(account, `Nginx reload failed: ${reloadError.message}`);
        patchAccountProvisioning(account, { vhost: { status: "reload_failed", message: reloadError.message } });
      } else {
        appendProvisioningLog(account, "Nginx vhost enabled and reloaded.");
        patchAccountProvisioning(account, { vhost: { status: "active", message: "Nginx vhost enabled and reloaded." } });
      }
    });

    if (!account.sslEnabled) return;
    const email = account.contactEmail || account.ownerEmail || `admin@${account.domain}`;
    const domains = uniqueCleanDomains([
      account.domain,
      ...(account.provisioning?.vhost?.aliases || []),
      ...accountSubdomainRoutes(account).flatMap((route: any) => [route.domain, ...(route.aliases || [])])
    ]);
    const args = [
      "--nginx",
      "--non-interactive",
      "--agree-tos",
      "--redirect",
      "--expand",
      "--keep-until-expiring",
      "--cert-name",
      cleanDomain(account.domain),
      "-m",
      email,
      ...domains.flatMap((domain: string) => ["-d", domain])
    ];
    queueAccountSslProvision(account, args, (certbotError, certbotStdout, certbotStderr) => {
      if (certbotError) {
        appendProvisioningLog(account, `Auto SSL pending: ${certbotError.message} ${certbotStderr || certbotStdout || ""}`.trim());
        patchAccountProvisioning(account, {
          ssl: {
            status: "pending_dns",
            message: "Certbot could not issue yet. Confirm DNS A records point to this server, then retry SSL.",
            lastError: certbotStderr || certbotStdout || certbotError.message
          }
        });
        return;
      }
      appendProvisioningLog(account, "Auto SSL installed by Certbot.");
      patchAccountProvisioning(account, {
        ssl: {
          status: "active",
          message: "Auto SSL installed by Certbot.",
          issuedAt: new Date().toISOString()
        }
      });
    });
  });
}

function activePanelAccounts(state = readPanelState()) {
  return (state.accounts || []).filter((account: any) => !TERMINAL_ACCOUNT_STATUSES.has(String(account.status || "").toLowerCase()));
}

function repairAccountRuntime(account: any) {
  if (process.platform === "win32") return true;
  try {
    ensureWebReadableAccount(account);
    const phpRoutes = accountRuntimeDomains(account).filter((entry: any) => entry.runtime.runtime === "php");
    const versions = Array.from(new Set(phpRoutes.map((entry: any) => entry.runtime.phpVersion)));
    versions.forEach((version: any) => ensureAccountPhpPool(account, version));
    phpRoutes.forEach((entry: any) => {
      writePhpUserIni({ ...account, phpVersion: entry.runtime.phpVersion, phpSettings: entry.runtime.phpSettings }, entry.documentRoot);
    });
    return true;
  } catch (error: any) {
    appendProvisioningLog(account, `Startup runtime repair failed: ${error.message}`);
    patchAccountProvisioning(account, { vhost: { status: "runtime_repair_failed", message: error.message } });
    return false;
  }
}

function reconcileWebRouting() {
  if (process.platform === "win32") return;
  const state = readPanelState();
  const accounts = activePanelAccounts(state);
  ensureDefaultPanelProxy();
  if (accounts.length) ensureWebIngress();

  let changed = false;
  for (const account of accounts) {
    removePanelProxyForDomain(account.domain);
    const runtimeReady = repairAccountRuntime(account);
    const siteName = `tpanel-${account.username}`;
    const availablePath = `/etc/nginx/sites-available/${siteName}.conf`;
    const enabledPath = `/etc/nginx/sites-enabled/${siteName}.conf`;
    const sslMissing = account.sslEnabled !== false && !accountSslPaths(account).ready;
    const expectedConfig = accountNginxConfig(account);
    const currentConfig = fs.existsSync(availablePath) ? fs.readFileSync(availablePath, "utf8") : "";
    if (!runtimeReady || !fs.existsSync(availablePath) || !fs.existsSync(enabledPath) || currentConfig !== expectedConfig || sslMissing) {
      applyAccountProvisioning(account);
      changed = true;
    }
  }

  applyPanelDomainProxy(readDomainSettings());
  if (!changed) reloadNginx();
}

async function verifyLicense(req: express.Request, options: { force?: boolean } = {}) {
  if (!TPANEL_LICENSE_KEY) {
    return { ok: false, status: "unlicensed", message: "TPANEL_LICENSE_KEY is missing. Run sudo tpanel-license-renew with a valid key, or reinstall from Tiwlo." };
  }

  const cacheKey = `${TPANEL_LICENSE_KEY}:${configuredServerIp(req) || requestIp(req)}`;
  if (!options.force && licenseCache?.key === cacheKey && licenseCache.expiresAt > Date.now()) {
    return licenseCache.value;
  }

  const payload = {
    licenseKey: TPANEL_LICENSE_KEY,
    serverIp: configuredServerIp(req) || requestIp(req),
    fingerprint: process.env.TPANEL_SERVER_FINGERPRINT || process.env.COMPUTERNAME || process.env.HOSTNAME || "local",
    hostname: process.env.HOSTNAME || process.env.COMPUTERNAME || "tpanel",
    os: process.platform,
    panelVersion: process.env.npm_package_version || "local",
    agentVersion: "1.0.0"
  };

  let primaryMessage = "";
  try {
    const response = await fetch(`${TIWLO_API_URL}/tpanel/api/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok && typeof data.ok === "boolean") {
      if (data.ok) licenseCache = { key: cacheKey, expiresAt: Date.now() + LICENSE_CACHE_MS, value: data };
      return data;
    }
    primaryMessage = data.message || `REST verifier returned HTTP ${response.status}.`;
  } catch (error: any) {
    primaryMessage = error.message || "REST verifier failed.";
  }

  try {
    const response = await fetch(`${TIWLO_API_URL}/graphql`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: LICENSE_CHECK_QUERY, variables: { input: payload } })
    });
    const data = await response.json().catch(() => ({}));
    const result = data?.data?.tPanelLicenseCheck;
    if (result && typeof result.ok === "boolean") {
      if (result.ok) licenseCache = { key: cacheKey, expiresAt: Date.now() + LICENSE_CACHE_MS, value: result };
      return result;
    }
    const graphMessage = data?.errors?.[0]?.message || `GraphQL verifier returned HTTP ${response.status}.`;
    return { ok: false, status: "offline", message: `${primaryMessage} ${graphMessage}`.trim() || "Unable to verify tPanel license." };
  } catch (error: any) {
    return { ok: false, status: "offline", message: `${primaryMessage} ${error.message || "GraphQL verifier failed."}`.trim() || "Unable to verify tPanel license." };
  }
}

async function requireLicense(req: express.Request, res: express.Response, next: express.NextFunction) {
  try {
    const license = await verifyLicense(req);
    if (!license.ok) {
      res.status(402).json(license);
      return;
    }
    (req as any).tpanelLicense = license;
    next();
  } catch (error: any) {
    res.status(503).json({ ok: false, status: "offline", message: error.message || "License check failed" });
  }
}

function sessionFromRequest(req: express.Request) {
  const header = String(req.headers.authorization || "");
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  try {
    return verifySession(token);
  } catch {
    return null;
  }
}

function requireAdminSession(req: express.Request, res: express.Response, next: express.NextFunction) {
  const session = sessionFromRequest(req);
  if (!session || session.role !== "admin") {
    res.status(401).json({ ok: false, message: "Admin session expired. Log in again." });
    return;
  }
  (req as any).tpanelSession = session;
  next();
}

function accountForSession(session: any) {
  if (!session?.accountId) return null;
  const state = readPanelState();
  return state.accounts.find((account: any) => account.id === session.accountId || account.username === session.username) || null;
}

function requireUserAccount(req: express.Request, res: express.Response) {
  const session = sessionFromRequest(req);
  if (!session || session.role !== "user") {
    res.status(401).json({ ok: false, message: "User session expired. Log in again." });
    return null;
  }
  const account = accountForSession(session);
  if (!account || account.status !== "active") {
    res.status(403).json({ ok: false, message: "Hosting account is not active." });
    return null;
  }
  return account;
}

function ensureFileManagerAccess(req: express.Request, res: express.Response, account: any) {
  if (!normalizeAccountPermissions(account.permissions, account).files) {
    res.status(403).json({ ok: false, message: "File Manager access is disabled for this account." });
    return false;
  }
  return true;
}

function safeVirtualName(name: unknown, fallback = "item") {
  const cleaned = String(name || fallback)
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\.\.+/g, ".")
    .replace(/^\.+$/, "")
    .trim();
  return cleaned || fallback;
}

function safeRelativePath(value: unknown) {
  const raw = String(value || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
  if (!raw) return "";
  const segments = raw.split("/").filter(Boolean).map((segment) => safeVirtualName(segment, ""));
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error("Blocked unsafe file path.");
  }
  return segments.join("/");
}

function ensureInside(baseDir: string, targetPath: string) {
  const base = path.resolve(baseDir);
  const target = path.resolve(targetPath);
  if (target !== base && !target.startsWith(base + path.sep)) {
    throw new Error("Blocked unsafe file path outside the hosting account.");
  }
  return target;
}

function virtualIdForRelative(relativePath: string) {
  const clean = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  return clean ? `fs-${Buffer.from(clean).toString("base64url")}` : "root-dir";
}

function relativePathFromVirtualId(itemId: unknown) {
  const id = String(itemId || "");
  if (!id || id === "root-dir") return "";
  if (id === "public-html-dir") return "public_html";
  if (!id.startsWith("fs-")) return "";
  try {
    return safeRelativePath(Buffer.from(id.slice(3), "base64url").toString("utf8"));
  } catch {
    return "";
  }
}

function accountPathFromVirtual(account: any, itemId: unknown, fallbackRelative = "") {
  const baseDir = path.resolve(account.homeDirectory);
  const relative = relativePathFromVirtualId(itemId) || safeRelativePath(fallbackRelative);
  return ensureInside(baseDir, path.join(baseDir, relative));
}

function accountFolderFromVirtual(account: any, folderId: unknown, fallbackRelative = "") {
  const folderPath = accountPathFromVirtual(account, folderId, fallbackRelative);
  fs.mkdirSync(folderPath, { recursive: true });
  const stat = fs.statSync(folderPath);
  if (!stat.isDirectory()) throw new Error("Selected destination is not a folder.");
  return folderPath;
}

function uniquePath(targetPath: string) {
  if (!fs.existsSync(targetPath)) return targetPath;
  const dir = path.dirname(targetPath);
  const ext = path.extname(targetPath);
  const base = path.basename(targetPath, ext);
  for (let index = 1; index < 500; index += 1) {
    const candidate = path.join(dir, `${base}-${index}${ext}`);
    if (!fs.existsSync(candidate)) return candidate;
  }
  throw new Error("Could not find an available file name in this folder.");
}

function fileModeString(stat: fs.Stats) {
  return `0${(stat.mode & 0o777).toString(8).padStart(3, "0")}`;
}

function applyAccountFileOwnership(account: any, targetPath: string) {
  if (process.platform === "win32" || !account?.username) return;
  execFile("chown", ["-R", `${account.username}:${account.username}`, targetPath], { timeout: 120000 }, () => undefined);
}

async function finalizeExtractedFiles(account: any, targetPath: string) {
  if (process.platform === "win32" || !account?.username) return;
  await execFileAsync("chown", ["-R", account.username, targetPath], { timeout: 300000 }).catch(() => undefined);
  await execFileAsync("sh", ["-lc", `
chmod -R u+rwX,go+rX "$TARGET_PATH" >/dev/null 2>&1 || true
find "$TARGET_PATH" -type f \\( -name ".env" -o -name "*.key" -o -name "*.pem" -o -name "id_rsa" \\) -exec chmod 600 {} + >/dev/null 2>&1 || true
`], { env: { ...process.env, TARGET_PATH: targetPath }, timeout: 300000 });
}

function ensureWebReadableAccount(account: any) {
  if (process.platform === "win32") return;
  const homeDir = path.resolve(account.homeDirectory);
  const docRoot = path.resolve(account.documentRoot || path.join(homeDir, "public_html"));
  if (!docRoot.startsWith(homeDir + path.sep)) return;
  execFile("sh", ["-lc", `
chmod 711 "$HOME_DIR" >/dev/null 2>&1 || true
chmod 755 "$DOC_ROOT" >/dev/null 2>&1 || true
find "$DOC_ROOT" -type d -exec chmod u+rwx,go+rx {} + >/dev/null 2>&1 || true
find "$DOC_ROOT" -type f -exec chmod u+rw,go+r {} + >/dev/null 2>&1 || true
find "$DOC_ROOT" -type f \\( -name ".env" -o -name "*.key" -o -name "*.pem" -o -name "id_rsa" \\) -exec chmod 600 {} + >/dev/null 2>&1 || true
`], { env: { ...process.env, HOME_DIR: homeDir, DOC_ROOT: docRoot }, timeout: 300000 }, () => undefined);
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes < 0) return "unknown";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value >= 10 || unit === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unit]}`;
}

function accountQuotaBytes(account: any) {
  const quotaMb = Number(account.quotaMb ?? account.limits?.diskMB ?? account.limits?.disk ?? 0);
  return Number.isFinite(quotaMb) && quotaMb > 0 ? quotaMb * 1024 * 1024 : Number.POSITIVE_INFINITY;
}

function maxExtractEntries(account: any) {
  const quotaBytes = accountQuotaBytes(account);
  if (!Number.isFinite(quotaBytes)) return 500000;
  const quotaMb = Math.max(0, Math.ceil(quotaBytes / (1024 * 1024)));
  const scaled = Number.isFinite(quotaMb) ? Math.ceil(quotaMb * 100) : 500000;
  return Math.min(500000, Math.max(25000, scaled));
}

function directorySizeBytes(targetPath: string) {
  if (!fs.existsSync(targetPath)) return 0;
  const stat = fs.lstatSync(targetPath);
  if (!stat.isDirectory()) return stat.size;
  let total = stat.size;
  for (const entry of fs.readdirSync(targetPath)) {
    total += directorySizeBytes(path.join(targetPath, entry));
  }
  return total;
}

async function filesystemFreeBytes(targetPath: string) {
  if (process.platform === "win32") return Number.POSITIVE_INFINITY;
  const probePath = fs.existsSync(targetPath) ? targetPath : path.dirname(targetPath);
  try {
    const { stdout } = await execFileAsync("df", ["-Pk", probePath], { timeout: 30000, maxBuffer: 1024 * 1024 });
    const line = stdout.trim().split(/\r?\n/)[1] || "";
    const availableKb = Number(line.trim().split(/\s+/)[3] || 0);
    return Number.isFinite(availableKb) && availableKb > 0 ? availableKb * 1024 : Number.POSITIVE_INFINITY;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

function timeoutForBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return 300000;
  return Math.min(2 * 60 * 60 * 1000, Math.max(300000, Math.ceil(bytes / (5 * 1024 * 1024)) * 1000));
}

async function ensureAccountStorageAvailable(account: any, additionalBytes: number, actionLabel: string) {
  const addBytes = Math.max(0, Number(additionalBytes) || 0);
  const accountHome = path.resolve(account.homeDirectory);
  const quotaBytes = accountQuotaBytes(account);
  const usedBytes = directorySizeBytes(accountHome);
  if (Number.isFinite(quotaBytes) && usedBytes + addBytes > quotaBytes) {
    throw new Error(`${actionLabel} is out of account disk limit. Needed ${formatBytes(addBytes)}, current usage ${formatBytes(usedBytes)}, quota ${formatBytes(quotaBytes)}.`);
  }
  const freeBytes = await filesystemFreeBytes(accountHome);
  const reserveBytes = Math.max(64 * 1024 * 1024, Math.ceil(addBytes * 0.05));
  if (Number.isFinite(freeBytes) && addBytes + reserveBytes > freeBytes) {
    throw new Error(`${actionLabel} cannot continue because server disk is out of space. Needed ${formatBytes(addBytes)}, available ${formatBytes(freeBytes)}.`);
  }
  return { usedBytes, quotaBytes, freeBytes };
}

function virtualPathForItem(itemsById: Map<string, any>, item: any): string[] {
  if (!item || item.id === "root-dir" || item.parentId === null) return [];
  const parent = itemsById.get(item.parentId);
  return [...virtualPathForItem(itemsById, parent), safeVirtualName(item.name)];
}

const FILE_MANAGER_MAX_CHILDREN = 5000;

function fileItemForPath(baseDir: string, filePath: string, parentId: string) {
  const stat = fs.lstatSync(filePath);
  const relative = path.relative(baseDir, filePath).replace(/\\/g, "/");
  const isDirectory = stat.isDirectory();
  return {
    id: virtualIdForRelative(relative),
    name: path.basename(filePath),
    type: isDirectory ? "directory" : "file",
    parentId,
    size: stat.size,
    updatedAt: stat.mtime.toISOString().replace("T", " ").substring(0, 19),
    permissions: fileModeString(stat)
  };
}

function resolveFileListScope(account: any, folderId: unknown = "root-dir", folderPath: unknown = "") {
  const baseDir = path.resolve(account.homeDirectory);
  fs.mkdirSync(path.join(baseDir, "public_html"), { recursive: true });
  let targetPath = accountPathFromVirtual(account, folderId, String(folderPath || ""));
  if (!fs.existsSync(targetPath) || !fs.statSync(targetPath).isDirectory()) {
    targetPath = baseDir;
  }
  const relative = path.relative(baseDir, targetPath).replace(/\\/g, "/");
  return {
    baseDir,
    folderPath: targetPath,
    folderRelative: relative,
    folderId: virtualIdForRelative(relative)
  };
}

function readAccountFiles(account: any, scope: { folderId?: unknown; folderPath?: unknown } = {}) {
  const ignoredEntries = new Set([".tpanel-tmp", ".tpanel_suspended"]);
  const { baseDir, folderPath, folderRelative, folderId } = resolveFileListScope(account, scope.folderId || "root-dir", scope.folderPath || "");
  const rootItem = {
    id: "root-dir",
    name: "/",
    type: "directory",
    parentId: null,
    size: 4096,
    updatedAt: new Date().toISOString().replace("T", " ").substring(0, 19),
    permissions: "0755"
  };
  const items: any[] = [rootItem];

  let parentId = "root-dir";
  if (folderRelative) {
    const segments = folderRelative.split("/").filter(Boolean);
    let currentPath = baseDir;
    for (const segment of segments) {
      currentPath = ensureInside(baseDir, path.join(currentPath, segment));
      try {
        const item = fileItemForPath(baseDir, currentPath, parentId);
        items.push(item);
        parentId = item.id;
      } catch {
        break;
      }
    }
  }

  const currentParentId = folderId;
  let entries: fs.Dirent[] = [];
  try {
    entries = fs.readdirSync(folderPath, { withFileTypes: true })
      .filter((entry) => !ignoredEntries.has(entry.name))
      .sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name))
      .slice(0, FILE_MANAGER_MAX_CHILDREN);
  } catch {
    entries = [];
  }
  for (const entry of entries) {
    try {
      items.push(fileItemForPath(baseDir, ensureInside(baseDir, path.join(folderPath, entry.name)), currentParentId));
    } catch {
      // Skip files that vanish while a large upload/extract is still settling.
    }
  }
  return items;
}

function writeVirtualFilesToAccount(account: any, items: any[]) {
  const baseDir = path.resolve(account.homeDirectory);
  fs.mkdirSync(baseDir, { recursive: true });
  const list = Array.isArray(items) ? items.filter(Boolean) : [];
  const itemsById = new Map(list.map((item: any) => [String(item.id), item]));
  const directories = list.filter((item: any) => item.type === "directory");
  const files = list.filter((item: any) => item.type === "file");

  for (const item of directories) {
    if (item.id === "root-dir") continue;
    const filePath = ensureInside(baseDir, path.join(baseDir, ...virtualPathForItem(itemsById, item)));
    fs.mkdirSync(filePath, { recursive: true });
  }

  for (const item of files) {
    if (!item.parentId) continue;
    if (!Object.prototype.hasOwnProperty.call(item, "content")) continue;
    const filePath = ensureInside(baseDir, path.join(baseDir, ...virtualPathForItem(itemsById, item)));
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, String(item.content ?? ""));
  }

  fs.mkdirSync(path.join(baseDir, "public_html"), { recursive: true });
  return readAccountFiles(account);
}

function fileOperationResponse(account: any, extra: any = {}, scope: { folderId?: unknown; folderPath?: unknown } = {}) {
  const resolved = resolveFileListScope(account, scope.folderId || "root-dir", scope.folderPath || "");
  return {
    ok: true,
    scopeParentId: resolved.folderId,
    scopeParentPath: resolved.folderRelative,
    ...extra,
    files: readAccountFiles(account, { folderId: resolved.folderId, folderPath: resolved.folderRelative })
  };
}

function parseFileOperationBody(req: express.Request) {
  return req.body && typeof req.body === "object" ? req.body : {};
}

async function inspectZipArchive(zipPath: string) {
  const summaryScript = `
if command -v zipinfo >/dev/null 2>&1; then
  zipinfo -t "$ZIP_PATH"
else
  unzip -Z -t "$ZIP_PATH"
fi
`;
  const summary = await execFileAsync("sh", ["-lc", summaryScript], {
    env: { ...process.env, ZIP_PATH: zipPath },
    timeout: 300000,
    maxBuffer: 1024 * 1024
  }).catch((error: any) => ({ stdout: String(error.stdout || ""), stderr: String(error.stderr || "") }));
  const summaryText = `${summary.stdout || ""}\n${summary.stderr || ""}`;
  const uncompressedMatch = summaryText.match(/(\d+)\s+bytes\s+uncompressed/i);
  const summaryCountMatch = summaryText.match(/(\d+)\s+files?/i);
  const uncompressedBytes = uncompressedMatch ? Number(uncompressedMatch[1]) : 0;
  await execFileAsync("unzip", ["-tqq", zipPath], { timeout: timeoutForBytes(uncompressedBytes), maxBuffer: 1024 * 1024 });
  const script = `
if command -v zipinfo >/dev/null 2>&1; then
  zipinfo -1 "$ZIP_PATH"
else
  unzip -Z -1 "$ZIP_PATH"
fi | awk '
  BEGIN { count = 0 }
  {
    count += 1
    gsub(/\\\\/, "/", $0)
    if ($0 == "" || $0 ~ /^\\// || $0 ~ /(^|\\/)\\.\\.($|\\/)/ || $0 ~ /^[A-Za-z]:/) {
      print $0
      exit 2
    }
  }
  END {
    if (count > 0) print "COUNT=" count > "/dev/stderr"
  }
'
`;
  try {
    const { stderr } = await execFileAsync("sh", ["-lc", script], {
      env: { ...process.env, ZIP_PATH: zipPath },
      timeout: 300000,
      maxBuffer: 1024 * 1024
    });
    const match = stderr.match(/COUNT=(\d+)/);
    return {
      entries: match ? Number(match[1]) : summaryCountMatch ? Number(summaryCountMatch[1]) : 0,
      uncompressedBytes
    };
  } catch (error: any) {
    const unsafeEntry = String(error.stdout || "").split(/\r?\n/).find(Boolean);
    if (unsafeEntry || error.code === 2) {
      throw new Error(`Archive contains an unsafe path and was not extracted${unsafeEntry ? `: ${unsafeEntry}` : "."}`);
    }
    throw error;
  }
}

function sourcePathsForIds(account: any, ids: unknown[]) {
  const baseDir = path.resolve(account.homeDirectory);
  return Array.from(new Set((Array.isArray(ids) ? ids : []).map((id) => accountPathFromVirtual(account, id)).filter((itemPath) => itemPath !== baseDir)));
}

function copyRecursive(sourcePath: string, destinationPath: string) {
  const stat = fs.statSync(sourcePath);
  if (stat.isDirectory()) {
    fs.cpSync(sourcePath, destinationPath, { recursive: true, force: false, errorOnExist: true });
  } else {
    fs.copyFileSync(sourcePath, destinationPath);
  }
}

function moveRecursive(sourcePath: string, destinationPath: string) {
  try {
    fs.renameSync(sourcePath, destinationPath);
  } catch {
    copyRecursive(sourcePath, destinationPath);
    fs.rmSync(sourcePath, { recursive: true, force: true });
  }
}

function totalPathSizeBytes(paths: string[]) {
  return paths.reduce((total, itemPath) => total + directorySizeBytes(itemPath), 0);
}

function extractionContentRoot(stagingDir: string) {
  const entries = fs.readdirSync(stagingDir).filter((name) => name !== "__MACOSX");
  if (entries.length !== 1) return stagingDir;
  const onlyPath = path.join(stagingDir, entries[0]);
  if (!fs.existsSync(onlyPath) || !fs.statSync(onlyPath).isDirectory()) return stagingDir;
  return onlyPath;
}

function moveExtractedEntries(sourceDir: string, destinationDir: string, accountHome: string) {
  const moved: string[] = [];
  for (const name of fs.readdirSync(sourceDir)) {
    if (name === "__MACOSX") continue;
    const sourcePath = path.join(sourceDir, name);
    const targetPath = uniquePath(ensureInside(accountHome, path.join(destinationDir, safeVirtualName(name, "extracted-item"))));
    moveRecursive(sourcePath, targetPath);
    moved.push(targetPath);
  }
  return moved;
}

function isEditableTextFile(fileName: string) {
  return /\.(txt|md|html?|css|js|mjs|cjs|ts|tsx|jsx|json|xml|svg|php|py|rb|go|rs|java|c|cpp|h|hpp|sh|bash|env|ini|conf|config|yml|yaml|sql|log)$/i.test(fileName)
    || /^(\.htaccess|\.env|robots\.txt)$/i.test(fileName);
}

function hasCapability(req: express.Request, capability: string) {
  const license = (req as any).tpanelLicense || {};
  const permissions = license.package?.permissions || license.package?.metadata?.permissions || {};
  return permissions[capability] !== false;
}

function requireCapability(capability: string) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!hasCapability(req, capability)) {
      res.status(403).json({ ok: false, status: "forbidden", message: `Your tPanel package does not include ${capability} controls.` });
      return;
    }
    next();
  };
}

function diskUsage() {
  return execFileAsync("df", ["-Pk", process.cwd()])
    .then(({ stdout }) => {
      const line = stdout.trim().split(/\r?\n/)[1] || "";
      const parts = line.trim().split(/\s+/);
      const totalKb = Number(parts[1] || 0);
      const usedKb = Number(parts[2] || 0);
      return {
        totalGb: Number((totalKb / 1024 / 1024).toFixed(2)),
        usedGb: Number((usedKb / 1024 / 1024).toFixed(2)),
        percent: totalKb ? Math.round((usedKb / totalKb) * 100) : 0
      };
    })
    .catch(() => ({ totalGb: 0, usedGb: 0, percent: 0 }));
}

async function listeningPorts() {
  const commandName = process.platform === "win32" ? "netstat" : "sh";
  const commandArgs = process.platform === "win32"
    ? ["-ano", "-p", "tcp"]
    : ["-lc", "ss -lntH 2>/dev/null || netstat -lnt 2>/dev/null || true"];
  try {
    const { stdout } = await execFileAsync(commandName, commandArgs, { timeout: 15000 });
    const ports = new Set<number>();
    stdout.split(/\r?\n/).forEach((line) => {
      const parts = line.trim().split(/\s+/);
      const address = process.platform === "win32" ? parts[1] : (parts[3] || parts[0]);
      const match = address?.match(/:(\d+)$/);
      if (match) ports.add(Number(match[1]));
    });
    return Array.from(ports).sort((a, b) => a - b);
  } catch {
    return [];
  }
}

async function firewallStatus() {
  if (process.platform === "win32") {
    return { mode: "unknown", raw: "Windows firewall status is not reported by this panel endpoint.", allowedPorts: [] as number[] };
  }
  try {
    const { stdout } = await execFileAsync("sh", ["-lc", "ufw status 2>/dev/null || firewall-cmd --list-ports 2>/dev/null || true"], { timeout: 15000 });
    const allowedPorts = Array.from(new Set((stdout.match(/\b\d{2,5}\b/g) || []).map(Number))).sort((a, b) => a - b);
    return {
      mode: stdout.toLowerCase().includes("inactive") ? "inactive" : stdout.trim() ? "active" : "unknown",
      raw: stdout.trim(),
      allowedPorts
    };
  } catch {
    return { mode: "unknown", raw: "", allowedPorts: [] as number[] };
  }
}

async function commandExists(command: string) {
  if (process.platform === "win32") return false;
  try {
    await execFileAsync("sh", ["-lc", `command -v ${command} >/dev/null 2>&1`], { timeout: 10000 });
    return true;
  } catch {
    return false;
  }
}

async function serviceStatus(service: string) {
  if (process.platform === "win32") return "unsupported";
  try {
    if (service.includes("*")) {
      const { stdout } = await execFileAsync("sh", ["-lc", `systemctl list-units --type=service --all '${service}.service' --no-legend 2>/dev/null | awk '{print $1\":\"$3}' | head -n 5`], { timeout: 10000 });
      const matches = stdout.trim().split(/\r?\n/).filter(Boolean);
      if (!matches.length) return "missing";
      return matches.some((line) => line.endsWith(":active")) ? "active" : matches.join(",");
    }
    const { stdout } = await execFileAsync("systemctl", ["is-active", service], { timeout: 10000 });
    return stdout.trim() || "unknown";
  } catch {
    return "inactive";
  }
}

async function installedPackage(manager: keyof typeof HOSTING_STACK_PACKAGES, packageName: string) {
  if (process.platform === "win32") return false;
  try {
    if (manager === "apt") {
      await execFileAsync("dpkg-query", ["-W", "-f=${Status}", packageName], { timeout: 10000 });
      return true;
    }
    await execFileAsync("rpm", ["-q", packageName], { timeout: 10000 });
    return true;
  } catch {
    return false;
  }
}

async function packageManager(): Promise<keyof typeof HOSTING_STACK_PACKAGES | null> {
  if (await commandExists("apt-get")) return "apt";
  if (await commandExists("dnf")) return "dnf";
  if (await commandExists("yum")) return "yum";
  return null;
}

function phpPackageNames(manager: keyof typeof HOSTING_STACK_PACKAGES, version: string, extensions: string[]) {
  const selectedPackages = Array.from(new Set(extensions.map((extension) => PHP_EXTENSION_PACKAGES[extension]).filter(Boolean)));
  if (manager === "apt") {
    const prefix = `php${normalizePhpVersion(version)}`;
    return Array.from(new Set([
      `${prefix}-fpm`, `${prefix}-cli`, `${prefix}-common`, `${prefix}-mysql`,
      `${prefix}-curl`, `${prefix}-mbstring`, `${prefix}-xml`, `${prefix}-zip`, `${prefix}-opcache`,
      ...selectedPackages.map((pkg) => `${prefix}-${pkg}`)
    ]));
  }
  return Array.from(new Set([
    "php-fpm", "php-cli", "php-common", "php-mysqlnd", "php-curl", "php-mbstring", "php-xml", "php-zip", "php-opcache",
    ...selectedPackages.map((pkg) => pkg === "redis" ? "php-pecl-redis" : pkg === "imagick" ? "php-pecl-imagick" : `php-${pkg}`)
  ]));
}

function genericPhpPackageNames(manager: keyof typeof HOSTING_STACK_PACKAGES, extensions: string[]) {
  const selectedPackages = Array.from(new Set(extensions.map((extension) => PHP_EXTENSION_PACKAGES[extension]).filter(Boolean)));
  if (manager === "apt") {
    return Array.from(new Set([
      "php-fpm", "php-cli", "php-common", "php-mysql", "php-curl", "php-mbstring", "php-xml", "php-zip", "php-opcache",
      ...selectedPackages.map((pkg) => `php-${pkg}`)
    ]));
  }
  return phpPackageNames(manager, DEFAULT_PHP_VERSION, extensions);
}

async function installPhpRuntimePackages(version: string, extensions: string[]) {
  if (process.platform === "win32") return "";
  const manager = await packageManager();
  if (!manager) return "No supported package manager was detected.";
  const packages = phpPackageNames(manager, version, extensions);
  const quoted = packages.map((item) => `'${item.replace(/'/g, "'\\''")}'`).join(" ");
  const aptBootstrap = "export DEBIAN_FRONTEND=noninteractive; apt-get update -y; if [ -r /etc/os-release ] && . /etc/os-release && [ \"\\${ID:-}\" = \"ubuntu\" ]; then apt-get install -y software-properties-common apt-transport-https lsb-release gnupg >/dev/null 2>&1 || true; command -v add-apt-repository >/dev/null 2>&1 && add-apt-repository -y ppa:ondrej/php >/dev/null 2>&1 || true; apt-get update -y || true; fi";
  const command = manager === "apt"
    ? `${aptBootstrap}; for pkg in ${quoted}; do apt-get install -y "$pkg" || true; done`
    : `for pkg in ${quoted}; do ${manager} install -y "$pkg" || true; done`;
  try {
    const { stdout, stderr } = await execFileAsync("sh", ["-lc", `${command}; for svc in $(systemctl list-unit-files --type=service 'php*-fpm.service' 2>/dev/null | awk '/php.*-fpm\\.service/ {print $1}'); do systemctl enable --now "$svc" >/dev/null 2>&1 || true; done`], { timeout: 900000, maxBuffer: 4 * 1024 * 1024 });
    phpVersionCache = null;
    phpExtensionCache.clear();
    return `${stdout || ""}${stderr || ""}`.trim();
  } catch (error: any) {
    if (manager !== "apt") throw error;
    const fallback = genericPhpPackageNames(manager, extensions);
    const fallbackQuoted = fallback.map((item) => `'${item.replace(/'/g, "'\\''")}'`).join(" ");
    const { stdout, stderr } = await execFileAsync("sh", ["-lc", `${aptBootstrap}; apt-get install -y ${fallbackQuoted}`], { timeout: 900000, maxBuffer: 4 * 1024 * 1024 });
    phpVersionCache = null;
    phpExtensionCache.clear();
    return `${error.stdout || ""}${error.stderr || ""}\n${stdout || ""}${stderr || ""}`.trim();
  }
}

async function enablePhpExtensions(version: string, extensions: string[]) {
  if (process.platform === "win32" || !commandExistsSync("phpenmod")) return "";
  const selected = extensions.map((item) => String(item).toLowerCase().trim()).filter(Boolean);
  if (!selected.length) return "";
  const quoted = Array.from(new Set(selected)).map((item) => `'${String(item).replace(/'/g, "'\\''")}'`).join(" ");
  try {
    const { stdout, stderr } = await execFileAsync("sh", ["-lc", `phpenmod -v '${normalizePhpVersion(version)}' ${quoted} >/dev/null 2>&1 || true; systemctl restart '${phpFpmService(version)}'`], { timeout: 180000, maxBuffer: 1024 * 1024 });
    phpExtensionCache.delete(normalizePhpVersion(version));
    return `${stdout || ""}${stderr || ""}`.trim();
  } catch (error: any) {
    return `${error.stdout || ""}${error.stderr || error.message || ""}`.trim();
  }
}

function normalizeDbEngine(value: unknown) {
  const engine = String(value || "mysql").toLowerCase();
  return DB_ENGINES.has(engine) ? engine : "mysql";
}

function dbSuffix(value: unknown, fallback = "database") {
  return String(value || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32) || fallback;
}

function accountDbPrefix(account: any) {
  return `tp_${dbSuffix(account?.username, "acct").slice(0, 20)}_`;
}

function accountDbObjectName(account: any, name: unknown, fallback = "item") {
  return `${accountDbPrefix(account)}${dbSuffix(name, fallback)}`.slice(0, 63);
}

function dbDisplayName(account: any, realName: string) {
  const prefix = accountDbPrefix(account);
  return realName.startsWith(prefix) ? realName.slice(prefix.length) : realName;
}

function sqlString(value: unknown) {
  return `'${String(value ?? "").replace(/\\/g, "\\\\").replace(/'/g, "''")}'`;
}

function mysqlIdent(value: string) {
  return `\`${value.replace(/`/g, "``")}\``;
}

function pgIdent(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function shellSingleQuote(value: unknown) {
  return `'${String(value ?? "").replace(/'/g, "'\\''")}'`;
}

function storedDatabaseProvisioning(account: any) {
  const raw = account?.databaseProvisioning || {};
  return {
    databases: Array.isArray(raw.databases) ? raw.databases : [],
    users: Array.isArray(raw.users) ? raw.users : [],
    grants: Array.isArray(raw.grants) ? raw.grants : []
  };
}

function updateDatabaseProvisioning(username: string, updater: (current: any) => any) {
  return updateStoredAccount(username, (account: any) => ({
    ...account,
    databaseProvisioning: updater(storedDatabaseProvisioning(account)),
    updatedAt: new Date().toISOString()
  }));
}

async function runMysqlSql(sql: string, timeout = 120000) {
  const command = `mysql --batch --raw --skip-column-names <<'SQL'\n${sql}\nSQL`;
  return execFileAsync("sh", ["-lc", command], { timeout, maxBuffer: 4 * 1024 * 1024 });
}

async function runPostgresSql(sql: string, timeout = 120000) {
  const command = `if command -v runuser >/dev/null 2>&1; then runuser -u postgres -- psql -v ON_ERROR_STOP=1 -At <<'SQL'\n${sql}\nSQL\nelse sudo -u postgres psql -v ON_ERROR_STOP=1 -At <<'SQL'\n${sql}\nSQL\nfi`;
  return execFileAsync("sh", ["-lc", command], { timeout, maxBuffer: 4 * 1024 * 1024 });
}

async function ensureDatabaseEngineReady(engine: string) {
  if (process.platform === "win32") throw new Error("Real database provisioning is available on Linux tPanel nodes only.");
  const normalized = normalizeDbEngine(engine);
  const commandName = normalized === "postgresql" ? "psql" : "mysql";
  if (await commandExists(commandName)) {
    if (normalized === "postgresql") {
      await execFileAsync("sh", ["-lc", "systemctl enable --now postgresql >/dev/null 2>&1 || true"], { timeout: 60000 }).catch(() => undefined);
    } else {
      await execFileAsync("sh", ["-lc", "systemctl enable --now mariadb >/dev/null 2>&1 || systemctl enable --now mysql >/dev/null 2>&1 || true"], { timeout: 60000 }).catch(() => undefined);
    }
    return;
  }
  const manager = await packageManager();
  if (!manager) throw new Error(`${normalized} package is not installed and no supported package manager was detected.`);
  const packages = normalized === "postgresql"
    ? (manager === "apt" ? ["postgresql", "postgresql-contrib"] : ["postgresql", "postgresql-contrib"])
    : (manager === "apt" ? ["mariadb-server", "mariadb-client"] : ["mariadb-server"]);
  const quoted = packages.map(shellSingleQuote).join(" ");
  const install = manager === "apt"
    ? `export DEBIAN_FRONTEND=noninteractive; apt-get update -y && apt-get install -y ${quoted}`
    : `${manager} install -y ${quoted}`;
  const start = normalized === "postgresql"
    ? "systemctl enable --now postgresql >/dev/null 2>&1 || true"
    : "systemctl enable --now mariadb >/dev/null 2>&1 || systemctl enable --now mysql >/dev/null 2>&1 || true";
  await execFileAsync("sh", ["-lc", `${install}; ${start}`], { timeout: 900000, maxBuffer: 4 * 1024 * 1024 });
}

async function databaseNamesForEngine(account: any, engine: string) {
  await ensureDatabaseEngineReady(engine);
  const prefix = accountDbPrefix(account);
  if (engine === "postgresql") {
    const { stdout } = await runPostgresSql(`SELECT datname FROM pg_database WHERE datname LIKE ${sqlString(`${prefix}%`)} ORDER BY datname;`);
    return stdout.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  }
  const { stdout } = await runMysqlSql(`SHOW DATABASES LIKE ${sqlString(`${prefix}%`)};`);
  return stdout.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

async function databaseUsersForEngine(account: any, engine: string) {
  await ensureDatabaseEngineReady(engine);
  const prefix = accountDbPrefix(account);
  if (engine === "postgresql") {
    const { stdout } = await runPostgresSql(`SELECT rolname FROM pg_roles WHERE rolname LIKE ${sqlString(`${prefix}%`)} ORDER BY rolname;`);
    return stdout.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  }
  const { stdout } = await runMysqlSql(`SELECT User FROM mysql.user WHERE User LIKE ${sqlString(`${prefix}%`)} ORDER BY User;`);
  return stdout.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

async function databaseUsageForEngine(account: any, engine: string, names: string[]) {
  if (!names.length) return new Map<string, number>();
  if (engine === "postgresql") {
    const values = names.map(sqlString).join(",");
    const { stdout } = await runPostgresSql(`SELECT datname || E'\\t' || pg_database_size(datname) FROM pg_database WHERE datname IN (${values});`);
    return new Map(stdout.split(/\r?\n/).filter(Boolean).map((line) => {
      const [name, bytes] = line.split(/\t/);
      return [name, Number(bytes || 0) / 1024 / 1024];
    }));
  }
  const values = names.map(sqlString).join(",");
  const { stdout } = await runMysqlSql(`SELECT table_schema, COALESCE(SUM(data_length + index_length), 0) FROM information_schema.tables WHERE table_schema IN (${values}) GROUP BY table_schema;`);
  return new Map(stdout.split(/\r?\n/).filter(Boolean).map((line) => {
    const [name, bytes] = line.split(/\t/);
    return [name, Number(bytes || 0) / 1024 / 1024];
  }));
}

async function databasePayload(account: any, engineInput: unknown = "mysql") {
  const engine = normalizeDbEngine(engineInput);
  const provisioning = storedDatabaseProvisioning(account);
  const names = await databaseNamesForEngine(account, engine).catch(() => []);
  const users = await databaseUsersForEngine(account, engine).catch(() => []);
  const usage = await databaseUsageForEngine(account, engine, names).catch(() => new Map<string, number>());
  const grants = provisioning.grants.filter((grant: any) => grant.engine === engine);
  const dbs = names.map((realName) => {
    const display = dbDisplayName(account, realName);
    const assignedUsers = grants.filter((grant: any) => grant.database === realName).map((grant: any) => dbDisplayName(account, grant.user));
    return {
      id: `${engine}:${realName}`,
      engine,
      name: display,
      realName,
      sizeMB: Number((usage.get(realName) || 0).toFixed(2)),
      tables: [],
      users: assignedUsers,
      createdAt: provisioning.databases.find((item: any) => item.engine === engine && item.realName === realName)?.createdAt || null
    };
  });
  const mappedUsers = users.map((realName) => {
    const display = dbDisplayName(account, realName);
    return {
      engine,
      username: display,
      realName,
      databases: grants.filter((grant: any) => grant.user === realName).map((grant: any) => dbDisplayName(account, grant.database)),
      privileges: Object.fromEntries(grants.filter((grant: any) => grant.user === realName).map((grant: any) => [dbDisplayName(account, grant.database), grant.privileges || DATABASE_PRIVILEGES])),
      passwordSet: true,
      createdAt: provisioning.users.find((item: any) => item.engine === engine && item.realName === realName)?.createdAt || null
    };
  });
  return {
    ok: true,
    engine,
    prefix: accountDbPrefix(account),
    databases: dbs,
    users: mappedUsers,
    limits: {
      maxDatabases: Number(account.maxDatabases || 0),
      usedDatabases: dbs.length
    }
  };
}

async function createDatabase(account: any, engine: string, name: unknown) {
  const realName = accountDbObjectName(account, name, "database");
  await ensureDatabaseEngineReady(engine);
  if (engine === "postgresql") {
    await runPostgresSql(`SELECT 'CREATE DATABASE ${pgIdent(realName)}' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = ${sqlString(realName)})\\gexec`);
  } else {
    await runMysqlSql(`CREATE DATABASE IF NOT EXISTS ${mysqlIdent(realName)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
  }
  updateDatabaseProvisioning(account.username, (current: any) => ({
    ...current,
    databases: [
      ...current.databases.filter((item: any) => !(item.engine === engine && item.realName === realName)),
      { engine, realName, name: dbDisplayName(account, realName), createdAt: new Date().toISOString() }
    ]
  }));
  return realName;
}

async function createDatabaseUser(account: any, engine: string, username: unknown, password: unknown) {
  const realName = accountDbObjectName(account, username, "user").slice(0, engine === "mysql" ? 32 : 63);
  const pass = String(password || "");
  if (pass.length < 8) throw new Error("Database user password must be at least 8 characters.");
  await ensureDatabaseEngineReady(engine);
  if (engine === "postgresql") {
    await runPostgresSql(`DO $$\nBEGIN\n  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = ${sqlString(realName)}) THEN\n    CREATE ROLE ${pgIdent(realName)} LOGIN PASSWORD ${sqlString(pass)};\n  END IF;\nEND\n$$;\nALTER ROLE ${pgIdent(realName)} WITH LOGIN PASSWORD ${sqlString(pass)};`);
  } else {
    await runMysqlSql(`CREATE USER IF NOT EXISTS ${sqlString(realName)}@'localhost' IDENTIFIED BY ${sqlString(pass)};\nALTER USER ${sqlString(realName)}@'localhost' IDENTIFIED BY ${sqlString(pass)};\nFLUSH PRIVILEGES;`);
  }
  updateDatabaseProvisioning(account.username, (current: any) => ({
    ...current,
    users: [
      ...current.users.filter((item: any) => !(item.engine === engine && item.realName === realName)),
      { engine, realName, username: dbDisplayName(account, realName), createdAt: new Date().toISOString() }
    ]
  }));
  return realName;
}

async function grantDatabaseAccess(account: any, engine: string, userInput: unknown, dbInput: unknown, privilegesInput: unknown) {
  const user = accountDbObjectName(account, userInput, "user").slice(0, engine === "mysql" ? 32 : 63);
  const database = accountDbObjectName(account, dbInput, "database");
  ensureOwnDbName(account, user);
  ensureOwnDbName(account, database);
  const requested = Array.isArray(privilegesInput) ? privilegesInput.map((item) => String(item).toUpperCase()) : DATABASE_PRIVILEGES;
  const privileges = requested.filter((item) => DATABASE_PRIVILEGES.includes(item));
  const effectivePrivileges = privileges.length ? privileges : DATABASE_PRIVILEGES;
  await ensureDatabaseEngineReady(engine);
  const [databaseNames, userNames] = await Promise.all([
    databaseNamesForEngine(account, engine),
    databaseUsersForEngine(account, engine)
  ]);
  if (!databaseNames.includes(database)) throw new Error("Database was not found on this hosting account.");
  if (!userNames.includes(user)) throw new Error("Database user was not found on this hosting account.");
  if (engine === "postgresql") {
    await runPostgresSql(`GRANT ALL PRIVILEGES ON DATABASE ${pgIdent(database)} TO ${pgIdent(user)};`);
  } else {
    await runMysqlSql(`GRANT ${effectivePrivileges.join(", ")} ON ${mysqlIdent(database)}.* TO ${sqlString(user)}@'localhost';\nFLUSH PRIVILEGES;`);
  }
  updateDatabaseProvisioning(account.username, (current: any) => ({
    ...current,
    grants: [
      ...current.grants.filter((item: any) => !(item.engine === engine && item.user === user && item.database === database)),
      { engine, user, database, privileges: effectivePrivileges, updatedAt: new Date().toISOString() }
    ]
  }));
}

async function revokeDatabaseAccess(account: any, engine: string, userInput: unknown, dbInput: unknown) {
  const user = accountDbObjectName(account, userInput, "user").slice(0, engine === "mysql" ? 32 : 63);
  const database = accountDbObjectName(account, dbInput, "database");
  ensureOwnDbName(account, user);
  ensureOwnDbName(account, database);
  await ensureDatabaseEngineReady(engine);
  if (engine === "postgresql") {
    await runPostgresSql(`REVOKE ALL PRIVILEGES ON DATABASE ${pgIdent(database)} FROM ${pgIdent(user)};`);
  } else {
    await runMysqlSql(`REVOKE ALL PRIVILEGES ON ${mysqlIdent(database)}.* FROM ${sqlString(user)}@'localhost';\nFLUSH PRIVILEGES;`);
  }
  updateDatabaseProvisioning(account.username, (current: any) => ({
    ...current,
    grants: current.grants.filter((item: any) => !(item.engine === engine && item.user === user && item.database === database))
  }));
}

function ensureOwnDbName(account: any, realName: string) {
  if (!realName.startsWith(accountDbPrefix(account))) throw new Error("Blocked database object outside this hosting account.");
}

async function deleteDatabase(account: any, engine: string, name: unknown) {
  const realName = accountDbObjectName(account, name, "database");
  ensureOwnDbName(account, realName);
  await ensureDatabaseEngineReady(engine);
  if (engine === "postgresql") {
    await runPostgresSql(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = ${sqlString(realName)};\nDROP DATABASE IF EXISTS ${pgIdent(realName)};`);
  } else {
    await runMysqlSql(`DROP DATABASE IF EXISTS ${mysqlIdent(realName)};`);
  }
  updateDatabaseProvisioning(account.username, (current: any) => ({
    ...current,
    databases: current.databases.filter((item: any) => !(item.engine === engine && item.realName === realName)),
    grants: current.grants.filter((item: any) => !(item.engine === engine && item.database === realName))
  }));
}

async function deleteDatabaseUser(account: any, engine: string, username: unknown) {
  const realName = accountDbObjectName(account, username, "user").slice(0, engine === "mysql" ? 32 : 63);
  ensureOwnDbName(account, realName);
  await ensureDatabaseEngineReady(engine);
  if (engine === "postgresql") {
    const names = await databaseNamesForEngine(account, engine).catch(() => []);
    for (const database of names) {
      await runPostgresSql(`REVOKE ALL PRIVILEGES ON DATABASE ${pgIdent(database)} FROM ${pgIdent(realName)};`).catch(() => undefined);
    }
    await runPostgresSql(`DROP ROLE IF EXISTS ${pgIdent(realName)};`);
  } else {
    await runMysqlSql(`DROP USER IF EXISTS ${sqlString(realName)}@'localhost';\nFLUSH PRIVILEGES;`);
  }
  updateDatabaseProvisioning(account.username, (current: any) => ({
    ...current,
    users: current.users.filter((item: any) => !(item.engine === engine && item.realName === realName)),
    grants: current.grants.filter((item: any) => !(item.engine === engine && item.user === realName))
  }));
}

async function changeDatabaseUserPassword(account: any, engine: string, username: unknown, password: unknown) {
  const realName = accountDbObjectName(account, username, "user").slice(0, engine === "mysql" ? 32 : 63);
  ensureOwnDbName(account, realName);
  const pass = String(password || "");
  if (pass.length < 8) throw new Error("Database user password must be at least 8 characters.");
  await ensureDatabaseEngineReady(engine);
  if (engine === "postgresql") {
    await runPostgresSql(`ALTER ROLE ${pgIdent(realName)} WITH PASSWORD ${sqlString(pass)};`);
  } else {
    await runMysqlSql(`ALTER USER ${sqlString(realName)}@'localhost' IDENTIFIED BY ${sqlString(pass)};\nFLUSH PRIVILEGES;`);
  }
}

function accountShellUsername(account: any) {
  return sanitizeSlug(account.username, "account").replace(/[^a-z0-9_-]/g, "").slice(0, 31);
}

function ensureShellAllowed(account: any) {
  const permissions = normalizeAccountPermissions(account.permissions, account);
  if (!permissions.terminal || account.shellAccess !== true) {
    throw new Error("Shell access is not enabled for this hosting account. Upgrade the tPanel package or ask the administrator to enable Shell.");
  }
}

async function runAccountShellCommand(account: any, commandInput: unknown) {
  ensureShellAllowed(account);
  ensureSystemAccountUser(account);
  const username = accountShellUsername(account);
  const home = path.resolve(account.homeDirectory);
  const command = String(commandInput || "").trim();
  if (!command) throw new Error("Enter a command to run.");
  if (command.length > 2000) throw new Error("Command is too long for the web terminal.");
  await ensureAccountStorageAvailable(account, 0, "Terminal");
  const memoryMb = Number(account.ramMb ?? account.memoryMb ?? 0);
  const memoryLimit = Number.isFinite(memoryMb) && memoryMb > 0
    ? `ulimit -v ${Math.max(128, Math.min(4096, memoryMb)) * 1024} || true; `
    : "";
  const timeoutSeconds = Math.max(30, Math.min(300, Number(account.terminalTimeoutSeconds || 120)));
  const runner = `cd ${shellSingleQuote(home)} && export HOME=${shellSingleQuote(home)} USER=${shellSingleQuote(username)} LOGNAME=${shellSingleQuote(username)} PATH=/usr/local/bin:/usr/bin:/bin:${shellSingleQuote(path.join(home, "node_modules", ".bin"))} && ${memoryLimit}timeout ${timeoutSeconds}s bash -lc ${shellSingleQuote(command)}`;
  const wrapped = `if command -v runuser >/dev/null 2>&1; then runuser -u ${shellSingleQuote(username)} -- bash -lc ${shellSingleQuote(runner)}; else su -s /bin/bash ${shellSingleQuote(username)} -c ${shellSingleQuote(runner)}; fi`;
  try {
    const { stdout, stderr } = await execFileAsync("sh", ["-lc", wrapped], { timeout: (timeoutSeconds + 15) * 1000, maxBuffer: 2 * 1024 * 1024 });
    await ensureAccountStorageAvailable(account, 0, "Terminal");
    return { stdout: stdout || "", stderr: stderr || "", exitCode: 0 };
  } catch (error: any) {
    return {
      stdout: error.stdout || "",
      stderr: error.stderr || error.message || "",
      exitCode: Number.isFinite(error.code) ? error.code : 1
    };
  }
}

function authorizedKeysPath(account: any) {
  const home = path.resolve(account.homeDirectory);
  const sshDir = path.join(home, ".ssh");
  return { sshDir, filePath: path.join(sshDir, "authorized_keys") };
}

function normalizePublicSshKey(value: unknown) {
  const key = String(value || "").trim().replace(/\r/g, "").split("\n").map((line) => line.trim()).find(Boolean) || "";
  if (!/^(ssh-rsa|ssh-ed25519|ecdsa-sha2-nistp(256|384|521))\s+[A-Za-z0-9+/=]+(?:\s+.*)?$/.test(key)) {
    throw new Error("Paste a valid public SSH key, for example ssh-ed25519 AAAA...");
  }
  return key;
}

function readAuthorizedKeys(account: any) {
  const { filePath } = authorizedKeysPath(account);
  try {
    if (!fs.existsSync(filePath)) return [];
    return fs.readFileSync(filePath, "utf8").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

async function writeAuthorizedKey(account: any, publicKey: string) {
  ensureShellAllowed(account);
  ensureSystemAccountUser(account);
  const username = accountShellUsername(account);
  const { sshDir, filePath } = authorizedKeysPath(account);
  fs.mkdirSync(sshDir, { recursive: true });
  const keys = readAuthorizedKeys(account);
  if (!keys.includes(publicKey)) keys.push(publicKey);
  fs.writeFileSync(filePath, `${keys.join("\n")}\n`);
  fs.chmodSync(sshDir, 0o700);
  fs.chmodSync(filePath, 0o600);
  if (process.platform !== "win32") {
    await execFileAsync("chown", ["-R", `${username}:${username}`, sshDir], { timeout: 30000 }).catch(() => undefined);
  }
  return keys;
}

async function setShellPassword(account: any, password: unknown) {
  ensureShellAllowed(account);
  const pass = String(password || "");
  if (pass.length < 8) throw new Error("SSH password must be at least 8 characters.");
  if (/[\r\n:]/.test(pass)) throw new Error("SSH password cannot contain line breaks or colon characters.");
  ensureSystemAccountUser(account);
  const username = accountShellUsername(account);
  await execFileAsync("sh", ["-lc", `printf '%s:%s\\n' ${shellSingleQuote(username)} ${shellSingleQuote(pass)} | chpasswd`], { timeout: 60000 });
  const updated = updateStoredAccount(account.username, (current: any) => ({
    ...current,
    shellPasswordSet: true,
    updatedAt: new Date().toISOString()
  }));
  return updated || account;
}

function appLogoDataUri(app: any) {
  const initials = String(app.name || "App").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const color = String(app.logoColor || "#4f46e5");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" rx="20" fill="${color}"/><circle cx="48" cy="48" r="34" fill="rgba(255,255,255,.12)"/><text x="48" y="57" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="28" font-weight="800" fill="#fff">${initials}</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function appCatalogPayload() {
  return APP_INSTALL_CATALOG.map((app: any) => ({
    id: app.id,
    name: app.name,
    version: app.version,
    category: app.category,
    description: app.description,
    runtime: app.runtime,
    database: Boolean(app.database),
    automatedAdmin: Boolean(app.automatedAdmin),
    logo: appLogoDataUri(app)
  }));
}

function storedFtpAccounts(account: any) {
  return Array.isArray(account?.ftpProvisioning?.accounts) ? account.ftpProvisioning.accounts : [];
}

function parseQuotaMb(value: unknown) {
  const raw = String(value || "").toLowerCase().trim();
  if (!raw || raw === "unlimited") return 0;
  const amount = Number(raw.match(/[\d.]+/)?.[0] || value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  if (raw.includes("tb")) return Math.round(amount * 1024 * 1024);
  if (raw.includes("gb")) return Math.round(amount * 1024);
  return Math.round(amount);
}

function displayQuota(quotaMb: number) {
  return quotaMb > 0 ? `${quotaMb} MB` : "Unlimited";
}

function ftpLinuxUsername(account: any, suffixInput: unknown) {
  const accountPart = sanitizeSlug(account?.username, "acct").replace(/[^a-z0-9]/g, "").slice(0, 10) || "acct";
  const suffix = sanitizeSlug(suffixInput, "ftp").replace(/[^a-z0-9]/g, "").slice(0, 14) || "ftp";
  return `ftp_${accountPart}_${suffix}`.slice(0, 31);
}

function ftpPayload(account: any) {
  const host = cleanDomain(account.domain) || TPANEL_SERVER_IP || os.hostname();
  const accounts = storedFtpAccounts(account).map((entry: any) => {
    const homeDirectory = ensureInside(account.homeDirectory, path.resolve(entry.homeDirectory || path.join(account.homeDirectory, "public_html")));
    const usageBytes = directorySizeBytes(homeDirectory);
    return {
      id: entry.id || entry.username,
      username: entry.username,
      path: entry.path || path.relative(path.resolve(account.homeDirectory), homeDirectory).replace(/\\/g, "/") || "public_html",
      homeDirectory,
      quotaMb: Number(entry.quotaMb || 0),
      quota: displayQuota(Number(entry.quotaMb || 0)),
      usage: formatBytes(usageBytes),
      usageMb: Number((usageBytes / 1024 / 1024).toFixed(2)),
      createdAt: entry.createdAt || null
    };
  });
  return {
    ok: true,
    host,
    port: 21,
    accounts,
    limits: {
      maxFtpAccounts: Number(account.maxFtpAccounts || account.ftpAccounts || 0),
      usedFtpAccounts: accounts.length
    }
  };
}

async function ensureFtpServerReady() {
  if (process.platform === "win32") throw new Error("Real FTP provisioning is available on Linux tPanel nodes only.");
  if (!(await commandExists("vsftpd"))) {
    const manager = await packageManager();
    if (!manager) throw new Error("vsftpd is not installed and no supported package manager was detected.");
    const install = manager === "apt"
      ? "export DEBIAN_FRONTEND=noninteractive; apt-get update -y && apt-get install -y vsftpd"
      : `${manager} install -y vsftpd`;
    await execFileAsync("sh", ["-lc", install], { timeout: 600000, maxBuffer: 2 * 1024 * 1024 });
  }
  const configPath = "/etc/vsftpd.conf";
  const marker = "# tPanel managed FTP settings";
  try {
    const current = fs.existsSync(configPath) ? fs.readFileSync(configPath, "utf8") : "";
    if (!current.includes(marker)) {
      fs.appendFileSync(configPath, `\n${marker}\nlisten=NO\nlisten_ipv6=YES\nanonymous_enable=NO\nlocal_enable=YES\nwrite_enable=YES\nlocal_umask=002\nchroot_local_user=YES\nallow_writeable_chroot=YES\npasv_enable=YES\nseccomp_sandbox=NO\n`);
    }
    const nologin = fs.existsSync("/usr/sbin/nologin") ? "/usr/sbin/nologin" : "/bin/false";
    if (fs.existsSync("/etc/shells")) {
      const shells = fs.readFileSync("/etc/shells", "utf8");
      if (!shells.split(/\r?\n/).includes(nologin)) fs.appendFileSync("/etc/shells", `\n${nologin}\n`);
    }
  } catch {
    // vsftpd may still work with the distribution defaults.
  }
  await execFileAsync("sh", ["-lc", "systemctl enable --now vsftpd >/dev/null 2>&1 || service vsftpd restart >/dev/null 2>&1 || true"], { timeout: 60000 });
}

async function grantFtpFilesystemAccess(account: any, username: string, homeDirectory: string) {
  if (process.platform === "win32") return;
  await execFileAsync("sh", ["-lc", `
if command -v setfacl >/dev/null 2>&1; then
  setfacl -R -m "u:$FTP_USER:rwX" "$FTP_HOME" >/dev/null 2>&1 || true
  setfacl -d -m "u:$FTP_USER:rwX" "$FTP_HOME" >/dev/null 2>&1 || true
else
  chmod -R g+rwX "$FTP_HOME" >/dev/null 2>&1 || true
fi
`], { env: { ...process.env, FTP_USER: username, FTP_HOME: homeDirectory }, timeout: 120000 }).catch(() => undefined);
  applyAccountFileOwnership(account, path.resolve(account.homeDirectory));
}

async function createFtpAccount(account: any, input: any) {
  if (!normalizeAccountPermissions(account.permissions, account).ftp) {
    throw new Error("FTP access is disabled for this account.");
  }
  const current = storedFtpAccounts(account);
  const maxAccounts = Number(account.maxFtpAccounts || account.ftpAccounts || 0);
  if (maxAccounts > 0 && current.length >= maxAccounts) {
    throw new Error("FTP account limit reached. Upgrade the package to create more FTP users.");
  }
  const password = String(input.password || "");
  if (password.length < 8) throw new Error("FTP password must be at least 8 characters.");
  if (/[\r\n:]/.test(password)) throw new Error("FTP password cannot contain line breaks or colon characters.");
  const username = ftpLinuxUsername(account, input.username);
  if (current.some((entry: any) => entry.username === username)) {
    throw new Error("This FTP username already exists for the account.");
  }
  const relativePath = safeRelativePath(input.path || "public_html") || "public_html";
  const homeDirectory = ensureInside(account.homeDirectory, path.join(account.homeDirectory, relativePath));
  fs.mkdirSync(homeDirectory, { recursive: true });
  await ensureFtpServerReady();
  ensureSystemAccountUser(account);
  const accountUser = accountShellUsername(account);
  const accountGroup = runLocalShell(`id -gn ${shellSingleQuote(accountUser)} 2>/dev/null || true`) || accountUser;
  const nologin = fs.existsSync("/usr/sbin/nologin") ? "/usr/sbin/nologin" : "/bin/false";
  const exists = await execFileAsync("id", ["-u", username], { timeout: 10000 }).then(() => true).catch(() => false);
  if (!exists) {
    await execFileAsync("useradd", ["-M", "-d", homeDirectory, "-s", nologin, "-g", accountGroup, username], { timeout: 120000 });
  } else {
    await execFileAsync("usermod", ["-d", homeDirectory, "-s", nologin, "-g", accountGroup, username], { timeout: 120000 }).catch(() => undefined);
  }
  await execFileAsync("sh", ["-lc", `printf '%s:%s\\n' ${shellSingleQuote(username)} ${shellSingleQuote(password)} | chpasswd`], { timeout: 60000 });
  await grantFtpFilesystemAccess(account, username, homeDirectory);
  const quotaMb = parseQuotaMb(input.quotaMb ?? input.quota);
  if (quotaMb > 0) {
    await execFileAsync("sh", ["-lc", `if command -v setquota >/dev/null 2>&1; then setquota -u ${shellSingleQuote(username)} 0 $(( ${quotaMb} * 1024 )) 0 0 -a >/dev/null 2>&1 || true; fi`], { timeout: 60000 }).catch(() => undefined);
  }
  const entry = {
    id: `ftp-${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`,
    username,
    path: relativePath,
    homeDirectory,
    quotaMb,
    createdAt: new Date().toISOString()
  };
  return updateStoredAccount(account.username, (currentAccount: any) => ({
    ...currentAccount,
    ftpProvisioning: {
      ...(currentAccount.ftpProvisioning || {}),
      accounts: [...storedFtpAccounts(currentAccount).filter((item: any) => item.username !== username), entry]
    },
    updatedAt: new Date().toISOString()
  })) || account;
}

async function deleteFtpAccount(account: any, usernameInput: unknown) {
  const username = String(usernameInput || "");
  const current = storedFtpAccounts(account);
  const entry = current.find((item: any) => item.username === username);
  if (!entry) throw new Error("FTP account was not found.");
  if (process.platform !== "win32") {
    await execFileAsync("userdel", ["-f", username], { timeout: 120000 }).catch(() => undefined);
  }
  return updateStoredAccount(account.username, (currentAccount: any) => ({
    ...currentAccount,
    ftpProvisioning: {
      ...(currentAccount.ftpProvisioning || {}),
      accounts: storedFtpAccounts(currentAccount).filter((item: any) => item.username !== username)
    },
    updatedAt: new Date().toISOString()
  })) || account;
}

async function setFtpPassword(account: any, usernameInput: unknown, passwordInput: unknown) {
  const username = String(usernameInput || "");
  if (!storedFtpAccounts(account).some((item: any) => item.username === username)) throw new Error("FTP account was not found.");
  const password = String(passwordInput || "");
  if (password.length < 8) throw new Error("FTP password must be at least 8 characters.");
  if (/[\r\n:]/.test(password)) throw new Error("FTP password cannot contain line breaks or colon characters.");
  await execFileAsync("sh", ["-lc", `printf '%s:%s\\n' ${shellSingleQuote(username)} ${shellSingleQuote(password)} | chpasswd`], { timeout: 60000 });
}

async function runAccountProvisionCommand(account: any, command: string, cwd?: string, timeout = 900000) {
  if (process.platform === "win32") throw new Error("Application installation runs on Linux tPanel nodes only.");
  ensureSystemAccountUser(account);
  const username = accountShellUsername(account);
  const home = path.resolve(account.homeDirectory);
  const workdir = ensureInside(home, cwd || home);
  const runner = `cd ${shellSingleQuote(workdir)} && export HOME=${shellSingleQuote(home)} USER=${shellSingleQuote(username)} LOGNAME=${shellSingleQuote(username)} COMPOSER_HOME=${shellSingleQuote(path.join(home, ".composer"))} PATH=/usr/local/bin:/usr/bin:/bin:${shellSingleQuote(path.join(home, "node_modules", ".bin"))} && ${command}`;
  const wrapped = `if command -v runuser >/dev/null 2>&1; then runuser -u ${shellSingleQuote(username)} -- bash -lc ${shellSingleQuote(runner)}; else su -s /bin/bash ${shellSingleQuote(username)} -c ${shellSingleQuote(runner)}; fi`;
  return execFileAsync("sh", ["-lc", wrapped], { timeout, maxBuffer: 8 * 1024 * 1024 });
}

function appInstallations(account: any) {
  return Array.isArray(account?.appInstallations) ? account.appInstallations : [];
}

function installedAppsPayload(account: any) {
  return appInstallations(account).map((item: any) => ({
    id: item.id,
    appId: item.appId,
    name: item.name,
    version: item.version,
    domain: item.domain,
    path: item.path || "",
    url: item.url,
    adminUrl: item.adminUrl || (item.appId === "wordpress" && item.url ? `${String(item.url).replace(/\/?$/, "/")}wp-admin/` : ""),
    documentRoot: item.documentRoot,
    adminUsername: item.adminUsername || "",
    adminEmail: item.adminEmail || "",
    database: item.database || null,
    status: item.status || "installed",
    installedAt: item.installedAt || item.createdAt || null
  }));
}

function installTargetForDomain(account: any, domainInput: unknown, installPathInput: unknown) {
  const domain = cleanDomain(domainInput || account.domain);
  const route = accountRuntimeDomains(account).find((entry: any) => cleanDomain(entry.domain) === domain);
  if (!route) throw new Error("Select a domain that belongs to this hosting account.");
  const home = path.resolve(account.homeDirectory);
  const documentRoot = ensureInside(home, path.resolve(route.documentRoot || account.documentRoot || path.join(home, "public_html")));
  const relativePath = safeRelativePath(installPathInput || "");
  const destination = ensureInside(home, path.join(documentRoot, relativePath));
  const urlPath = relativePath ? `/${relativePath.replace(/\/+$/, "")}/` : "/";
  return {
    domain,
    relativePath,
    documentRoot,
    destination,
    url: `${accountSslPaths(account).ready ? "https" : "http"}://${domain}${urlPath}`
  };
}

function ensurePhpRuntimeForAppInstall(account: any, domainInput: unknown) {
  const domain = cleanDomain(domainInput || account.domain);
  if (!domain) return account;
  const phpVersion = normalizePhpVersion(account?.phpSettings?.version || account?.phpVersion || DEFAULT_PHP_VERSION);
  const now = new Date().toISOString();
  return updateStoredAccount(account.username, (current: any) => {
    const provisioning = current.provisioning || buildAccountProvisioning(undefined, current);
    const currentSettings = phpSettingsForAccount({ ...current, phpVersion });
    const runtimeRoutes = {
      ...(provisioning.vhost?.runtimeRoutes || {}),
      [domain]: {
        ...(provisioning.vhost?.runtimeRoutes?.[domain] || {}),
        runtime: "php",
        phpVersion,
        phpSettings: currentSettings,
        updatedAt: now,
        source: "one_click_installer"
      }
    };
    const isPrimary = cleanDomain(current.domain) === domain;
    return {
      ...current,
      runtime: isPrimary ? "php" : current.runtime,
      phpVersion: isPrimary ? phpVersion : (current.phpVersion || phpVersion),
      phpSettings: isPrimary ? currentSettings : (current.phpSettings || currentSettings),
      provisioning: {
        ...provisioning,
        vhost: {
          ...(provisioning.vhost || {}),
          runtime: isPrimary ? "php" : provisioning.vhost?.runtime,
          phpVersion: isPrimary ? phpVersion : provisioning.vhost?.phpVersion,
          phpSettings: isPrimary ? currentSettings : provisioning.vhost?.phpSettings,
          runtimeRoutes,
          status: "queued",
          message: "PHP runtime queued by one-click installer.",
          lastRunAt: now
        }
      },
      updatedAt: now
    };
  }) || account;
}

function prepareAppInstallDirectory(destination: string) {
  fs.mkdirSync(destination, { recursive: true });
  const allowedStarter = new Set(["index.html", "index.htm", "default.html", ".user.ini"]);
  const entries = fs.readdirSync(destination).filter((name) => !name.startsWith(".well-known"));
  const blocked = entries.filter((name) => !allowedStarter.has(name));
  if (blocked.length) {
    throw new Error("Install folder is not empty. Choose an empty folder or remove existing files first.");
  }
  for (const entry of entries) {
    const target = path.join(destination, entry);
    if (allowedStarter.has(entry) && fs.existsSync(target)) fs.rmSync(target, { recursive: true, force: true });
  }
}

async function downloadArchive(url: string, destination: string) {
  const command = `if command -v curl >/dev/null 2>&1; then curl -fL "$APP_URL" -o "$APP_ARCHIVE"; elif command -v wget >/dev/null 2>&1; then wget -O "$APP_ARCHIVE" "$APP_URL"; else echo "curl or wget is required"; exit 1; fi`;
  await execFileAsync("sh", ["-lc", command], { env: { ...process.env, APP_URL: url, APP_ARCHIVE: destination }, timeout: 900000, maxBuffer: 4 * 1024 * 1024 });
}

async function extractAppArchive(app: any, archivePath: string, extractDir: string) {
  fs.mkdirSync(extractDir, { recursive: true });
  if (app.archiveType === "zip") {
    await execFileAsync("unzip", ["-q", archivePath, "-d", extractDir], { timeout: 900000, maxBuffer: 4 * 1024 * 1024 });
  } else {
    await execFileAsync("tar", ["-xzf", archivePath, "-C", extractDir], { timeout: 900000, maxBuffer: 4 * 1024 * 1024 });
  }
  const root = app.archiveRoot ? path.join(extractDir, app.archiveRoot) : extractionContentRoot(extractDir);
  if (!fs.existsSync(root)) throw new Error("Downloaded package did not contain the expected application files.");
  return root;
}

async function ensureWpCli() {
  const target = path.join(TPANEL_TOOLS_DIR, "wp-cli.phar");
  if (fs.existsSync(target)) return target;
  fs.mkdirSync(TPANEL_TOOLS_DIR, { recursive: true });
  await downloadArchive("https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar", target);
  if (process.platform !== "win32") fs.chmodSync(target, 0o755);
  return target;
}

async function createAppDatabase(account: any, app: any, target: any) {
  if (!app.database) return null;
  if (!normalizeAccountPermissions(account.permissions, account).databases) {
    throw new Error("Database access is disabled for this account.");
  }
  const current = await databasePayload(account, "mysql").catch(() => ({ databases: [] as any[] }));
  const maxDatabases = Number(account.maxDatabases || 0);
  if (maxDatabases > 0 && current.databases.length >= maxDatabases) {
    throw new Error("Database limit reached. Upgrade the package before installing database apps.");
  }
  const domainPart = dbSuffix(target.domain.replace(/[^a-z0-9]/gi, "_"), "site").slice(0, 12);
  const pathPart = dbSuffix(target.relativePath || "root", "root").slice(0, 8);
  const suffixBase = `${app.id}_${domainPart}_${pathPart}_${randomBytes(3).toString("hex")}`.toLowerCase();
  const dbSuffixName = dbSuffix(suffixBase, app.id);
  const userSuffixName = dbSuffix(`${app.id}_${randomBytes(3).toString("hex")}`, app.id).slice(0, 24);
  const password = randomBytes(18).toString("base64url");
  const database = await createDatabase(account, "mysql", dbSuffixName);
  const username = await createDatabaseUser(account, "mysql", userSuffixName, password);
  await grantDatabaseAccess(account, "mysql", userSuffixName, dbSuffixName, DATABASE_PRIVILEGES);
  return { engine: "mysql", database, username, password, host: "localhost" };
}

async function ensureWordPressAdminCredentials(account: any, wpCli: string, destination: string, username: string, password: string, email: string) {
  const pathArg = `--path=${shellSingleQuote(destination)}`;
  const wp = `php ${shellSingleQuote(wpCli)}`;
  const command = [
    `if ${wp} user get ${shellSingleQuote(username)} ${pathArg} >/dev/null 2>&1; then`,
    `  ${wp} user update ${shellSingleQuote(username)} ${pathArg} --user_pass=${shellSingleQuote(password)} --user_email=${shellSingleQuote(email)} --role=administrator;`,
    "else",
    `  ${wp} user create ${shellSingleQuote(username)} ${shellSingleQuote(email)} ${pathArg} --user_pass=${shellSingleQuote(password)} --role=administrator;`,
    "fi",
    `${wp} user set-role ${shellSingleQuote(username)} administrator ${pathArg}`,
    `${wp} user get ${shellSingleQuote(username)} ${pathArg} --field=ID`
  ].join("\n");
  const { stdout, stderr } = await runAccountProvisionCommand(account, command, destination, 600000);
  return `${stdout || ""}${stderr || ""}`.trim();
}

function writeWordPressConfig(destination: string, db: any) {
  const salts = ["AUTH_KEY", "SECURE_AUTH_KEY", "LOGGED_IN_KEY", "NONCE_KEY", "AUTH_SALT", "SECURE_AUTH_SALT", "LOGGED_IN_SALT", "NONCE_SALT"]
    .map((key) => `define( '${key}', '${randomBytes(48).toString("base64").replace(/['\\]/g, "")}' );`)
    .join("\n");
  fs.writeFileSync(path.join(destination, "wp-config.php"), `<?php
define( 'DB_NAME', '${String(db.database).replace(/'/g, "\\'")}' );
define( 'DB_USER', '${String(db.username).replace(/'/g, "\\'")}' );
define( 'DB_PASSWORD', '${String(db.password).replace(/'/g, "\\'")}' );
define( 'DB_HOST', 'localhost' );
define( 'DB_CHARSET', 'utf8mb4' );
define( 'DB_COLLATE', '' );
${salts}
$table_prefix = 'wp_';
define( 'WP_DEBUG', false );
if ( ! defined( 'ABSPATH' ) ) {
  define( 'ABSPATH', __DIR__ . '/' );
}
require_once ABSPATH . 'wp-settings.php';
`);
}

async function installOneClickApp(account: any, body: any) {
  if (!normalizeAccountPermissions(account.permissions, account).marketplace) {
    throw new Error("App Marketplace access is disabled for this account.");
  }
  const app = (APP_INSTALL_CATALOG as any[]).find((item: any) => item.id === String(body.appId || body.id || "").toLowerCase());
  if (!app) throw new Error("Select a valid app package.");
  await ensureAccountStorageAvailable(account, 0, `${app.name} install`);
  let target = installTargetForDomain(account, body.domain, body.path || body.installPath);
  account = ensurePhpRuntimeForAppInstall(account, target.domain);
  target = installTargetForDomain(account, target.domain, body.path || body.installPath);
  prepareAppInstallDirectory(target.destination);
  let database = null;
  let installOutput = "";
  const tempDir = ensureInside(account.homeDirectory, path.join(account.homeDirectory, ".tpanel-tmp", `app-${app.id}-${Date.now()}-${randomBytes(3).toString("hex")}`));
  fs.mkdirSync(tempDir, { recursive: true });
  try {
    database = await createAppDatabase(account, app, target);
    let adminUsername = "";
    let adminPassword = "";
    let adminEmail = "";
    if (app.installMode === "composer") {
      if (!(await commandExists("composer"))) throw new Error("Composer is not installed on this server. Run tpanel-update first.");
      const { stdout, stderr } = await runAccountProvisionCommand(account, `composer create-project laravel/laravel ${shellSingleQuote(target.destination)} --no-interaction`, account.homeDirectory, 1200000);
      installOutput = `${stdout || ""}${stderr || ""}`.trim();
    } else {
      const archivePath = path.join(tempDir, `package.${app.archiveType === "zip" ? "zip" : "tar.gz"}`);
      await downloadArchive(app.archiveUrl, archivePath);
      const sourceRoot = await extractAppArchive(app, archivePath, path.join(tempDir, "extract"));
      await ensureAccountStorageAvailable(account, directorySizeBytes(sourceRoot), `${app.name} install`);
      moveExtractedEntries(sourceRoot, target.destination, account.homeDirectory);
    }
    if (app.id === "wordpress" && database) {
      writeWordPressConfig(target.destination, database);
      adminUsername = dbSuffix(body.adminUsername || "admin", "admin").slice(0, 24);
      adminPassword = String(body.adminPassword || randomBytes(14).toString("base64url"));
      adminEmail = String(body.adminEmail || account.contactEmail || account.ownerEmail || `admin@${target.domain}`).trim();
      const title = String(body.siteTitle || `${target.domain} Website`).replace(/[\r\n]/g, " ").slice(0, 120);
      const wpCli = await ensureWpCli();
      try {
        const { stdout, stderr } = await runAccountProvisionCommand(account,
          `php ${shellSingleQuote(wpCli)} core install --path=${shellSingleQuote(target.destination)} --url=${shellSingleQuote(target.url)} --title=${shellSingleQuote(title)} --admin_user=${shellSingleQuote(adminUsername)} --admin_password=${shellSingleQuote(adminPassword)} --admin_email=${shellSingleQuote(adminEmail)} --skip-email`,
          target.destination,
          900000
        );
        installOutput = `${installOutput}\n${stdout || ""}${stderr || ""}`.trim();
      } catch (error: any) {
        const details = `${error.stdout || ""}${error.stderr || error.message || ""}`.trim();
        if (/already installed/i.test(details)) {
          installOutput = `${installOutput}\n${details}`.trim();
        } else {
          throw new Error(`WordPress admin setup failed. ${details || "Check PHP/MySQL extensions and try again."}`);
        }
      }
      const adminOutput = await ensureWordPressAdminCredentials(account, wpCli, target.destination, adminUsername, adminPassword, adminEmail);
      installOutput = `${installOutput}\n${adminOutput}`.trim();
      const { stdout: verifyStdout, stderr: verifyStderr } = await runAccountProvisionCommand(account,
        `php ${shellSingleQuote(wpCli)} core is-installed --path=${shellSingleQuote(target.destination)}`,
        target.destination,
        300000
      );
      installOutput = `${installOutput}\n${verifyStdout || ""}${verifyStderr || ""}`.trim();
    }
    const installSecret = {
      app: app.name,
      url: target.url,
      adminUrl: app.id === "wordpress" ? `${target.url.replace(/\/?$/, "/")}wp-admin/` : "",
      adminUsername,
      adminPassword,
      adminEmail,
      database
    };
    fs.writeFileSync(path.join(target.destination, ".tpanel-install.json"), JSON.stringify(installSecret, null, 2));
    if (process.platform !== "win32") fs.chmodSync(path.join(target.destination, ".tpanel-install.json"), 0o600);
    await finalizeExtractedFiles(account, target.destination);
    ensureWebReadableAccount(account);
    const entry = {
      id: `app-${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`,
      appId: app.id,
      name: app.name,
      version: app.version,
      domain: target.domain,
      path: target.relativePath,
      url: target.url,
      adminUrl: app.id === "wordpress" ? `${target.url.replace(/\/?$/, "/")}wp-admin/` : "",
      documentRoot: target.destination,
      adminUsername,
      adminEmail,
      database: database ? { engine: database.engine, database: database.database, username: database.username, host: database.host } : null,
      status: app.id === "wordpress" ? "installed" : "files_ready",
      installOutput,
      installedAt: new Date().toISOString()
    };
    const updated = updateStoredAccount(account.username, (current: any) => ({
      ...current,
      appInstallations: [entry, ...appInstallations(current).filter((item: any) => !(item.domain === entry.domain && item.path === entry.path && item.appId === entry.appId))],
      updatedAt: new Date().toISOString()
    })) || account;
    applyAccountProvisioning(updated);
    return { account: updated, installation: { ...entry, adminPassword } };
  } finally {
    removeIfExists(tempDir);
  }
}

function appInstallerPayload(account: any) {
  return {
    ok: true,
    catalog: appCatalogPayload(),
    domains: accountRuntimeDomains(account).map((entry: any) => ({
      domain: entry.domain,
      label: entry.label,
      documentRoot: entry.documentRoot,
      webPath: entry.webPath
    })),
    installedApps: installedAppsPayload(account)
  };
}

async function hostingStackStatus() {
  const manager = await packageManager();
  const checks = await Promise.all(HOSTING_STACK_CHECKS.map(async (check) => {
    const packageName = manager ? (check.packageNames as any)[manager] : "";
    const [commandOk, packageOk, services] = await Promise.all([
      commandExists(check.command),
      manager && packageName ? installedPackage(manager, packageName) : Promise.resolve(false),
      Promise.all(check.services.map(async (service) => ({ service, status: await serviceStatus(service) })))
    ]);
    const serviceOk = services.length === 0 || services.some((item) => item.status === "active");
    return {
      ...check,
      commandOk,
      packageName,
      packageOk,
      services,
      ok: commandOk && (services.length === 0 || serviceOk)
    };
  }));
  const packageResults = manager
    ? await Promise.all(HOSTING_STACK_PACKAGES[manager].map(async (packageName) => ({ packageName, installed: await installedPackage(manager, packageName) })))
    : [];
  const missingPackages = packageResults.filter((item) => !item.installed).map((item) => item.packageName);
  const state = readPanelState();
  const sslCounts = state.accounts.reduce((counts: any, account: any) => {
    const status = account.provisioning?.ssl?.status || (account.sslEnabled ? "queued" : "disabled");
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});
  return {
    ok: checks.every((check) => check.ok),
    manager,
    checks,
    missingPackages,
    servicesReady: checks.filter((check) => check.ok).length,
    servicesTotal: checks.length,
    sslCounts,
    generatedAt: new Date().toISOString()
  };
}

app.get("/api/license/status", async (req, res) => {
  try {
    res.json(await verifyLicense(req));
  } catch (error: any) {
    res.status(503).json({ ok: false, status: "offline", message: error.message || "License check failed" });
  }
});

app.get("/api/auth/session", async (req, res) => {
  try {
    const session = sessionFromRequest(req);
    if (!session) {
      res.status(401).json({ ok: false });
      return;
    }
    const license = await verifyLicense(req);
    if (!license.ok) {
      res.status(402).json(license);
      return;
    }
    const account = session.role === "user" ? accountForSession(session) : null;
    if (session.role === "user" && session.accountId && (!account || account.status !== "active")) {
      res.status(403).json({ ok: false, message: "Hosting account is not active." });
      return;
    }
    res.json({ ok: true, role: session.role, expiresAt: session.exp, account: account ? publicAccount(account) : null });
  } catch {
    res.status(401).json({ ok: false });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const license = await verifyLicense(req);
    if (!license.ok) {
      res.status(402).json(license);
      return;
    }
    const username = String(req.body?.username || "");
    const password = String(req.body?.password || "");
    const localAdminPassword = TPANEL_ADMIN_PASSWORD || (process.env.NODE_ENV === "production" ? "" : "admin");
    if (username === TPANEL_ADMIN_USER && localAdminPassword && password === localAdminPassword) {
      const token = createSession("admin");
      const session = verifySession(token);
      res.json({ ok: true, role: "admin", token, expiresAt: session?.exp });
      return;
    }
    if (TPANEL_USER && TPANEL_USER_PASSWORD && username === TPANEL_USER && password === TPANEL_USER_PASSWORD) {
      const token = createSession("user");
      const session = verifySession(token);
      res.json({ ok: true, role: "user", token, expiresAt: session?.exp });
      return;
    }
    const state = readPanelState();
    const account = state.accounts.find((item: any) => item.username === username || item.domain === username);
    if (account) {
      if (account.status !== "active") {
        res.status(403).json({ ok: false, message: `Account ${account.username} is ${account.status}. Contact the server administrator.` });
        return;
      }
      if (!account.passwordHash) {
        res.status(401).json({ ok: false, message: "This account was created before tPanel login passwords were enabled. Reset the account password from Admin > List Accounts." });
        return;
      }
      if (verifyPassword(password, account.passwordHash)) {
        const token = createSession("user", account);
        const session = verifySession(token);
        res.json({ ok: true, role: "user", token, expiresAt: session?.exp, account: publicAccount(account) });
        return;
      }
    }
    res.status(401).json({ ok: false, message: "Invalid tPanel username or password." });
  } catch (error: any) {
    res.status(503).json({ ok: false, message: error.message || "Unable to sign in." });
  }
});

app.get("/sso", async (req, res) => {
  try {
    const license = await verifyLicense(req);
    if (!license.ok) {
      res.status(402).type("html").send(`<html><body style="font-family:system-ui;padding:32px"><h2>tPanel license check failed</h2><p>${license.message || "Refresh the active license on this server."}</p></body></html>`);
      return;
    }
    const ticket = verifySsoPayload(String(req.query.token || ""));
    const username = String(ticket?.username || "").toLowerCase();
    const domain = String(ticket?.domain || "").toLowerCase();
    if (!username) {
      res.status(401).type("html").send("<html><body style=\"font-family:system-ui;padding:32px\"><h2>Login link expired</h2><p>Open tPanel again from Tiwlo dashboard.</p></body></html>");
      return;
    }
    const state = readPanelState();
    let account = state.accounts.find((item: any) => item.username === username || item.domain === username || (domain && item.domain === domain));
    if (!account) {
      res.status(404).type("html").send(`<html><body style="font-family:system-ui;padding:32px"><h2>Account not found</h2><p>${htmlEscape(username)} is not available on this tPanel server. Open the correct droplet from Tiwlo dashboard.</p></body></html>`);
      return;
    }
    const accountStatus = String(account.status || "").toLowerCase();
    if (accountStatus !== "active" && ticket?.allowActivate && !["terminated", "deleted"].includes(accountStatus)) {
      account = updateStoredAccount(account.username, (current: any) => {
        const updated = {
          ...current,
          status: "active",
          updatedAt: new Date().toISOString()
        };
        if (updated.provisioning) {
          updated.provisioning = {
            ...updated.provisioning,
            ssl: { ...(updated.provisioning.ssl || {}), status: updated.provisioning.ssl?.status === "paused" ? "queued" : updated.provisioning.ssl?.status || "queued" },
            vhost: { ...(updated.provisioning.vhost || {}), status: updated.provisioning.vhost?.status === "disabled" ? "queued" : updated.provisioning.vhost?.status || "queued" }
          };
        }
        return updated;
      }) || account;
      writePanelState(withAuditEvent(readPanelState(), {
        actor: "tiwlo-sso",
        action: "account.sso.activated",
        target: account.username,
        message: `Account ${account.username} reactivated by a signed Tiwlo SSO login.`
      }));
    }
    if (account.status !== "active") {
      res.status(403).type("html").send(`<html><body style="font-family:system-ui;padding:32px"><h2>Account is ${htmlEscape(account.status)}</h2><p>Turn on this droplet from Tiwlo dashboard, then open tPanel again.</p></body></html>`);
      return;
    }
    const token = createSession("user", account);
    const session = verifySession(token);
    const auth = {
      token,
      role: "user",
      expiresAt: session?.exp,
      account: publicAccount(account)
    };
    res.type("html").send(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Opening tPanel</title>
  </head>
  <body style="margin:0;background:#020617;color:#e2e8f0;font-family:Inter,system-ui,sans-serif;display:grid;min-height:100vh;place-items:center">
    <div style="text-align:center">
      <h1 style="font-size:20px;margin:0 0 8px">Opening tPanel...</h1>
      <p style="margin:0;color:#94a3b8;font-size:13px">Secure login is ready.</p>
    </div>
    <script>
      localStorage.setItem("tpanel_auth", ${scriptSafeJson(scriptSafeJson(auth))});
      location.replace("/dashboard");
    </script>
  </body>
</html>`);
  } catch (error: any) {
    res.status(503).type("html").send(`<html><body style="font-family:system-ui;padding:32px"><h2>Unable to open tPanel</h2><p>${error.message || "Try again from Tiwlo dashboard."}</p></body></html>`);
  }
});

app.get("/api/user/account", requireLicense, async (req, res) => {
  const session = sessionFromRequest(req);
  if (!session || session.role !== "user") {
    res.status(401).json({ ok: false, message: "User session expired. Log in again." });
    return;
  }
  const account = accountForSession(session);
  if (!account) {
    res.status(404).json({ ok: false, message: "Hosting account was not found." });
    return;
  }
  if (account.status !== "active") {
    res.status(403).json({ ok: false, message: "Hosting account is not active." });
    return;
  }
  res.json({ ok: true, account: publicAccount(account) });
});

app.get("/api/user/summary", requireLicense, async (req, res) => {
  const session = sessionFromRequest(req);
  if (!session || session.role !== "user") {
    res.status(401).json({ ok: false, message: "User session expired. Log in again." });
    return;
  }
  const account = accountForSession(session);
  if (!account || account.status !== "active") {
    res.status(404).json({ ok: false, message: "Hosting account is not active." });
    return;
  }
  res.json({
    ok: true,
    account: publicAccount(account),
    limits: {
      quotaMb: account.quotaMb,
      bandwidthGb: account.bandwidthGb,
      domains: account.maxDomains,
      emailAccounts: account.maxEmailAccounts,
      databases: account.maxDatabases,
      ftpAccounts: account.maxFtpAccounts || account.ftpAccounts || 0,
      nodeApps: account.maxNodeApps ?? account.nodeApps ?? 1
    },
    provisioning: account.provisioning || null,
    provisioningLog: readProvisioningLog(account.username),
    permissions: normalizeAccountPermissions(account.permissions, account)
  });
});

app.get("/api/user/php-settings", requireLicense, async (req, res) => {
  const account = requireUserAccount(req, res);
  if (!account) return;
  if (!normalizeAccountPermissions(account.permissions, account).php) {
    res.status(403).json({ ok: false, message: "PHP controls are disabled for this account." });
    return;
  }
  res.json(phpSettingsPayload(account));
});

app.post("/api/user/php-settings", requireLicense, async (req, res) => {
  const account = requireUserAccount(req, res);
  if (!account) return;
  if (!normalizeAccountPermissions(account.permissions, account).php) {
    res.status(403).json({ ok: false, message: "PHP controls are disabled for this account." });
    return;
  }
  try {
    const requestedVersion = normalizePhpVersion(req.body?.phpVersion || req.body?.version || account.phpVersion || DEFAULT_PHP_VERSION);
    const requestedExtensions = normalizePhpExtensionSelection(req.body?.extensions);
    const requestedIni = normalizePhpIni(req.body?.ini || req.body?.phpIni || {}, account);
    const targetDomains = normalizeTargetDomains(req.body?.targetDomains || req.body?.domain || req.body?.domainScope || "all", account);
    if (!targetDomains.length) {
      res.status(400).json({ ok: false, message: "Select at least one domain that belongs to this account." });
      return;
    }
    let installOutput = "";
    if (req.body?.autoInstall !== false) {
      const installExtensions = Array.from(new Set([...DEFAULT_PHP_EXTENSIONS, ...requestedExtensions]));
      installOutput = await installPhpRuntimePackages(requestedVersion, installExtensions);
      installOutput += `\n${await enablePhpExtensions(requestedVersion, installExtensions)}`;
    }
    const updated = updateStoredAccount(account.username, (current: any) => {
      const provisioning = current.provisioning || buildAccountProvisioning(req, current);
      const currentTargets = normalizeTargetDomains(targetDomains, current);
      const primarySelected = currentTargets.includes(cleanDomain(current.domain));
      const runtimeRoutes = { ...(provisioning.vhost?.runtimeRoutes || {}) };
      currentTargets.forEach((domain: string) => {
        runtimeRoutes[domain] = {
          ...(runtimeRoutes[domain] || {}),
          runtime: "php",
          phpVersion: requestedVersion,
          phpSettings: {
            version: requestedVersion,
            extensions: requestedExtensions,
            ini: requestedIni
          },
          updatedAt: new Date().toISOString()
        };
      });
      const subdomains = Array.isArray(provisioning.vhost?.subdomains)
        ? provisioning.vhost.subdomains.map((route: any) => cleanDomain(route.domain) && currentTargets.includes(cleanDomain(route.domain))
          ? {
              ...route,
              runtime: "php",
              phpVersion: requestedVersion,
              phpSettings: { version: requestedVersion, extensions: requestedExtensions, ini: requestedIni }
            }
          : route)
        : [];
      const next = {
        ...current,
        runtime: primarySelected ? "php" : current.runtime,
        phpVersion: primarySelected ? requestedVersion : current.phpVersion,
        phpSettings: primarySelected ? {
          version: requestedVersion,
          extensions: requestedExtensions,
          ini: requestedIni,
          updatedAt: new Date().toISOString()
        } : current.phpSettings,
        provisioning: {
          ...provisioning,
          vhost: {
            ...(provisioning.vhost || {}),
            status: "queued",
            phpVersion: primarySelected ? requestedVersion : provisioning.vhost?.phpVersion,
            phpSettings: primarySelected ? { version: requestedVersion, extensions: requestedExtensions, ini: requestedIni } : provisioning.vhost?.phpSettings,
            runtimeRoutes,
            subdomains
          }
        },
        updatedAt: new Date().toISOString()
      };
      return next;
    });
    if (!updated) {
      res.status(404).json({ ok: false, message: "Hosting account was not found." });
      return;
    }
    applyAccountProvisioning(updated);
    res.json(phpSettingsPayload(updated, {
      account: publicAccount(updated),
      installOutput: installOutput.trim()
    }));
  } catch (error: any) {
    res.status(500).json({ ok: false, message: error.message || "Unable to apply PHP settings." });
  }
});

app.get("/api/user/phpmyadmin-url", requireLicense, async (req, res) => {
  const account = requireUserAccount(req, res);
  if (!account) return;
  if (!normalizeAccountPermissions(account.permissions, account).phpmyadmin) {
    res.status(403).json({ ok: false, message: "phpMyAdmin access is disabled for this account." });
    return;
  }
  const configured = String(process.env.TPANEL_PHPMYADMIN_URL || "").trim();
  if (!configured && (!panelPhpMyAdminPath() || !panelPhpFpmSocket())) {
    res.status(503).json({ ok: false, message: "phpMyAdmin is not ready. Run sudo tpanel-update, then restart tPanel." });
    return;
  }
  if (!configured) {
    ensureDefaultPanelProxy();
    applyPanelDomainProxy(readDomainSettings());
  }
  res.json({
    ok: true,
    url: panelPhpMyAdminUrl(req, configured),
    target: "system_phpmyadmin"
  });
});

app.get("/api/user/node-settings", requireLicense, async (_req, res) => {
  const account = requireUserAccount(_req, res);
  if (!account) return;
  if (!normalizeAccountPermissions(account.permissions, account).node) {
    res.status(403).json({ ok: false, message: "Node.js controls are disabled for this account." });
    return;
  }
  res.json(nodeSettingsPayload(account));
});

app.post("/api/user/node-settings", requireLicense, async (req, res) => {
  const account = requireUserAccount(req, res);
  if (!account) return;
  if (!normalizeAccountPermissions(account.permissions, account).node) {
    res.status(403).json({ ok: false, message: "Node.js controls are disabled for this account." });
    return;
  }
  try {
    const requestedVersion = normalizeNodeVersion(req.body?.nodeVersion || req.body?.version || account.nodeVersion || DEFAULT_NODE_VERSION);
    const requestedPort = Number(req.body?.nodePort || req.body?.port || account.nodePort || 3000);
    if (!Number.isInteger(requestedPort) || requestedPort < 1024 || requestedPort > 65535) {
      res.status(400).json({ ok: false, message: "Choose a valid Node.js app port between 1024 and 65535." });
      return;
    }
    const targetDomains = normalizeTargetDomains(req.body?.targetDomains || req.body?.domain || req.body?.domainScope || "all", account);
    if (!targetDomains.length) {
      res.status(400).json({ ok: false, message: "Select at least one domain that belongs to this account." });
      return;
    }
    let installOutput = "";
    if (req.body?.autoInstall !== false && !installedNodeVersions().includes(requestedVersion)) {
      installOutput = await installNodeRuntimeVersion(requestedVersion);
    }
    const updated = updateStoredAccount(account.username, (current: any) => {
      const provisioning = current.provisioning || buildAccountProvisioning(req, current);
      const currentTargets = normalizeTargetDomains(targetDomains, current);
      const primarySelected = currentTargets.includes(cleanDomain(current.domain));
      const runtimeRoutes = { ...(provisioning.vhost?.runtimeRoutes || {}) };
      currentTargets.forEach((domain: string) => {
        runtimeRoutes[domain] = {
          ...(runtimeRoutes[domain] || {}),
          runtime: "node",
          nodeVersion: requestedVersion,
          nodePort: requestedPort,
          updatedAt: new Date().toISOString()
        };
      });
      const subdomains = Array.isArray(provisioning.vhost?.subdomains)
        ? provisioning.vhost.subdomains.map((route: any) => cleanDomain(route.domain) && currentTargets.includes(cleanDomain(route.domain))
          ? {
              ...route,
              runtime: "node",
              nodeVersion: requestedVersion,
              nodePort: requestedPort
            }
          : route)
        : [];
      return {
        ...current,
        runtime: primarySelected ? "node" : current.runtime,
        nodeVersion: primarySelected ? requestedVersion : current.nodeVersion,
        nodePort: primarySelected ? requestedPort : current.nodePort,
        provisioning: {
          ...provisioning,
          vhost: {
            ...(provisioning.vhost || {}),
            status: "queued",
            runtime: primarySelected ? "node" : provisioning.vhost?.runtime,
            nodeVersion: primarySelected ? requestedVersion : provisioning.vhost?.nodeVersion,
            nodePort: primarySelected ? requestedPort : provisioning.vhost?.nodePort,
            runtimeRoutes,
            subdomains
          }
        },
        updatedAt: new Date().toISOString()
      };
    });
    if (!updated) {
      res.status(404).json({ ok: false, message: "Hosting account was not found." });
      return;
    }
    appendProvisioningLog(updated, `Node.js ${requestedVersion} mapped to ${targetDomains.join(", ")} on port ${requestedPort}.`);
    applyAccountProvisioning(updated);
    res.json(nodeSettingsPayload(updated, {
      account: publicAccount(updated),
      installOutput: installOutput.trim()
    }));
  } catch (error: any) {
    res.status(500).json({ ok: false, message: error.message || "Unable to apply Node.js settings." });
  }
});

app.get("/api/user/node-apps", requireLicense, async (req, res) => {
  const account = requireUserAccount(req, res);
  if (!account) return;
  if (!normalizeAccountPermissions(account.permissions, account).node) {
    res.status(403).json({ ok: false, message: "Node.js controls are disabled for this account." });
    return;
  }
  try {
    res.json(nodeAppsPayload(account));
  } catch (error: any) {
    res.status(500).json({ ok: false, message: error.message || "Unable to load Node.js apps." });
  }
});

app.post("/api/user/node-apps", requireLicense, async (req, res) => {
  const account = requireUserAccount(req, res);
  if (!account) return;
  try {
    const updated = await createNodeApp(account, req.body || {});
    res.json(nodeAppsPayload(updated, { account: publicAccount(updated) }));
  } catch (error: any) {
    res.status(500).json({ ok: false, message: error.message || "Unable to create Node.js app." });
  }
});

app.post("/api/user/node-apps/:id/settings", requireLicense, async (req, res) => {
  const account = requireUserAccount(req, res);
  if (!account) return;
  if (!normalizeAccountPermissions(account.permissions, account).node) {
    res.status(403).json({ ok: false, message: "Node.js controls are disabled for this account." });
    return;
  }
  try {
    const updated = await updateNodeApp(account, req.params.id, req.body || {});
    res.json(nodeAppsPayload(updated, { account: publicAccount(updated) }));
  } catch (error: any) {
    res.status(500).json({ ok: false, message: error.message || "Unable to update Node.js app." });
  }
});

app.post("/api/user/node-apps/:id/action", requireLicense, async (req, res) => {
  const account = requireUserAccount(req, res);
  if (!account) return;
  if (!normalizeAccountPermissions(account.permissions, account).node) {
    res.status(403).json({ ok: false, message: "Node.js controls are disabled for this account." });
    return;
  }
  try {
    const appEntry = storedNodeApps(account).find((app: any) => app.id === req.params.id);
    if (!appEntry) throw new Error("Node app was not found.");
    await nodeAppControl(account, appEntry, req.body?.action);
    const refreshed = accountForSession(sessionFromRequest(req)) || account;
    res.json(nodeAppsPayload(refreshed));
  } catch (error: any) {
    res.status(500).json({ ok: false, message: error.message || "Unable to control Node.js app." });
  }
});

app.post("/api/user/node-apps/:id/packages", requireLicense, async (req, res) => {
  const account = requireUserAccount(req, res);
  if (!account) return;
  if (!normalizeAccountPermissions(account.permissions, account).node) {
    res.status(403).json({ ok: false, message: "Node.js controls are disabled for this account." });
    return;
  }
  try {
    const uninstall = String(req.body?.action || "").toLowerCase() === "uninstall";
    const output = await installNodePackage(account, req.params.id, req.body?.packageName || req.body?.name, uninstall);
    const refreshed = accountForSession(sessionFromRequest(req)) || account;
    res.json(nodeAppsPayload(refreshed, { installOutput: output }));
  } catch (error: any) {
    res.status(500).json({ ok: false, message: error.message || "Unable to update npm package." });
  }
});

app.delete("/api/user/node-apps/:id", requireLicense, async (req, res) => {
  const account = requireUserAccount(req, res);
  if (!account) return;
  if (!normalizeAccountPermissions(account.permissions, account).node) {
    res.status(403).json({ ok: false, message: "Node.js controls are disabled for this account." });
    return;
  }
  try {
    const updated = await deleteNodeApp(account, req.params.id);
    res.json(nodeAppsPayload(updated, { account: publicAccount(updated) }));
  } catch (error: any) {
    res.status(500).json({ ok: false, message: error.message || "Unable to delete Node.js app." });
  }
});

app.get("/api/user/databases", requireLicense, async (req, res) => {
  const account = requireUserAccount(req, res);
  if (!account) return;
  if (!normalizeAccountPermissions(account.permissions, account).databases) {
    res.status(403).json({ ok: false, message: "Database access is disabled for this account." });
    return;
  }
  try {
    res.json(await databasePayload(account, req.query.engine || "mysql"));
  } catch (error: any) {
    res.status(500).json({ ok: false, message: error.message || "Unable to load real databases." });
  }
});

app.post("/api/user/databases", requireLicense, async (req, res) => {
  const account = requireUserAccount(req, res);
  if (!account) return;
  if (!normalizeAccountPermissions(account.permissions, account).databases) {
    res.status(403).json({ ok: false, message: "Database access is disabled for this account." });
    return;
  }
  try {
    const engine = normalizeDbEngine(req.body?.engine);
    const current = await databasePayload(account, engine).catch(() => ({ databases: [] as any[] }));
    const maxDatabases = Number(account.maxDatabases || 0);
    if (maxDatabases > 0 && current.databases.length >= maxDatabases) {
      res.status(403).json({ ok: false, message: "Database limit reached. Upgrade the tPanel package to create more databases." });
      return;
    }
    await createDatabase(account, engine, req.body?.name || req.body?.database);
    const updated = accountForSession(sessionFromRequest(req)) || account;
    res.json(await databasePayload(updated, engine));
  } catch (error: any) {
    res.status(500).json({ ok: false, message: error.message || "Unable to create database." });
  }
});

app.delete("/api/user/databases/:engine/:name", requireLicense, async (req, res) => {
  const account = requireUserAccount(req, res);
  if (!account) return;
  if (!normalizeAccountPermissions(account.permissions, account).databases) {
    res.status(403).json({ ok: false, message: "Database access is disabled for this account." });
    return;
  }
  try {
    const engine = normalizeDbEngine(req.params.engine);
    await deleteDatabase(account, engine, req.params.name);
    const updated = accountForSession(sessionFromRequest(req)) || account;
    res.json(await databasePayload(updated, engine));
  } catch (error: any) {
    res.status(500).json({ ok: false, message: error.message || "Unable to delete database." });
  }
});

app.post("/api/user/database-users", requireLicense, async (req, res) => {
  const account = requireUserAccount(req, res);
  if (!account) return;
  if (!normalizeAccountPermissions(account.permissions, account).databases) {
    res.status(403).json({ ok: false, message: "Database access is disabled for this account." });
    return;
  }
  try {
    const engine = normalizeDbEngine(req.body?.engine);
    await createDatabaseUser(account, engine, req.body?.username || req.body?.user, req.body?.password);
    const updated = accountForSession(sessionFromRequest(req)) || account;
    res.json(await databasePayload(updated, engine));
  } catch (error: any) {
    res.status(500).json({ ok: false, message: error.message || "Unable to create database user." });
  }
});

app.delete("/api/user/database-users/:engine/:username", requireLicense, async (req, res) => {
  const account = requireUserAccount(req, res);
  if (!account) return;
  if (!normalizeAccountPermissions(account.permissions, account).databases) {
    res.status(403).json({ ok: false, message: "Database access is disabled for this account." });
    return;
  }
  try {
    const engine = normalizeDbEngine(req.params.engine);
    await deleteDatabaseUser(account, engine, req.params.username);
    const updated = accountForSession(sessionFromRequest(req)) || account;
    res.json(await databasePayload(updated, engine));
  } catch (error: any) {
    res.status(500).json({ ok: false, message: error.message || "Unable to delete database user. Remove owned databases first if PostgreSQL blocks the role." });
  }
});

app.post("/api/user/database-users/:engine/:username/password", requireLicense, async (req, res) => {
  const account = requireUserAccount(req, res);
  if (!account) return;
  if (!normalizeAccountPermissions(account.permissions, account).databases) {
    res.status(403).json({ ok: false, message: "Database access is disabled for this account." });
    return;
  }
  try {
    const engine = normalizeDbEngine(req.params.engine);
    await changeDatabaseUserPassword(account, engine, req.params.username, req.body?.password);
    const updated = accountForSession(sessionFromRequest(req)) || account;
    res.json(await databasePayload(updated, engine));
  } catch (error: any) {
    res.status(500).json({ ok: false, message: error.message || "Unable to change database user password." });
  }
});

app.post("/api/user/database-grants", requireLicense, async (req, res) => {
  const account = requireUserAccount(req, res);
  if (!account) return;
  if (!normalizeAccountPermissions(account.permissions, account).databases) {
    res.status(403).json({ ok: false, message: "Database access is disabled for this account." });
    return;
  }
  try {
    const engine = normalizeDbEngine(req.body?.engine);
    await grantDatabaseAccess(account, engine, req.body?.username || req.body?.user, req.body?.database, req.body?.privileges);
    const updated = accountForSession(sessionFromRequest(req)) || account;
    res.json(await databasePayload(updated, engine));
  } catch (error: any) {
    res.status(500).json({ ok: false, message: error.message || "Unable to grant database access." });
  }
});

app.delete("/api/user/database-grants/:engine/:username/:database", requireLicense, async (req, res) => {
  const account = requireUserAccount(req, res);
  if (!account) return;
  if (!normalizeAccountPermissions(account.permissions, account).databases) {
    res.status(403).json({ ok: false, message: "Database access is disabled for this account." });
    return;
  }
  try {
    const engine = normalizeDbEngine(req.params.engine);
    await revokeDatabaseAccess(account, engine, req.params.username, req.params.database);
    const updated = accountForSession(sessionFromRequest(req)) || account;
    res.json(await databasePayload(updated, engine));
  } catch (error: any) {
    res.status(500).json({ ok: false, message: error.message || "Unable to revoke database access." });
  }
});

app.get("/api/user/ssh-access", requireLicense, async (req, res) => {
  const account = requireUserAccount(req, res);
  if (!account) return;
  try {
    ensureShellAllowed(account);
    ensureSystemAccountUser(account);
    const username = accountShellUsername(account);
    const settings = readDomainSettings(req);
    const host = settings.primaryDomain || settings.detectedServerIp || configuredServerIp(req) || req.hostname;
    res.json({
      ok: true,
      username,
      host,
      port: 22,
      homeDirectory: account.homeDirectory,
      command: `ssh ${username}@${host} -p 22`,
      passwordSet: Boolean(account.shellPasswordSet),
      keys: readAuthorizedKeys(account)
    });
  } catch (error: any) {
    res.status(403).json({ ok: false, message: error.message || "Shell access is not available." });
  }
});

app.post("/api/user/ssh-keys", requireLicense, async (req, res) => {
  const account = requireUserAccount(req, res);
  if (!account) return;
  try {
    const key = normalizePublicSshKey(req.body?.publicKey || req.body?.key);
    const keys = await writeAuthorizedKey(account, key);
    res.json({ ok: true, keys });
  } catch (error: any) {
    res.status(500).json({ ok: false, message: error.message || "Unable to install SSH key." });
  }
});

app.post("/api/user/ssh-password", requireLicense, async (req, res) => {
  const account = requireUserAccount(req, res);
  if (!account) return;
  try {
    const updated = await setShellPassword(account, req.body?.password);
    res.json({ ok: true, account: publicAccount(updated), passwordSet: true });
  } catch (error: any) {
    res.status(500).json({ ok: false, message: error.message || "Unable to set SSH password." });
  }
});

app.post("/api/user/terminal", requireLicense, async (req, res) => {
  const account = requireUserAccount(req, res);
  if (!account) return;
  try {
    const result = await runAccountShellCommand(account, req.body?.command);
    res.json({ ok: true, ...result, cwd: account.homeDirectory, user: accountShellUsername(account) });
  } catch (error: any) {
    res.status(403).json({ ok: false, message: error.message || "Unable to run terminal command." });
  }
});

app.get("/api/user/ftp-accounts", requireLicense, async (req, res) => {
  const account = requireUserAccount(req, res);
  if (!account) return;
  if (!normalizeAccountPermissions(account.permissions, account).ftp) {
    res.status(403).json({ ok: false, message: "FTP access is disabled for this account." });
    return;
  }
  try {
    res.json(ftpPayload(account));
  } catch (error: any) {
    res.status(500).json({ ok: false, message: error.message || "Unable to load FTP accounts." });
  }
});

app.post("/api/user/ftp-accounts", requireLicense, async (req, res) => {
  const account = requireUserAccount(req, res);
  if (!account) return;
  try {
    const updated = await createFtpAccount(account, req.body || {});
    res.json(ftpPayload(updated));
  } catch (error: any) {
    res.status(500).json({ ok: false, message: error.message || "Unable to create FTP account." });
  }
});

app.post("/api/user/ftp-accounts/:username/password", requireLicense, async (req, res) => {
  const account = requireUserAccount(req, res);
  if (!account) return;
  try {
    await setFtpPassword(account, req.params.username, req.body?.password);
    res.json(ftpPayload(account));
  } catch (error: any) {
    res.status(500).json({ ok: false, message: error.message || "Unable to update FTP password." });
  }
});

app.delete("/api/user/ftp-accounts/:username", requireLicense, async (req, res) => {
  const account = requireUserAccount(req, res);
  if (!account) return;
  try {
    const updated = await deleteFtpAccount(account, req.params.username);
    res.json(ftpPayload(updated));
  } catch (error: any) {
    res.status(500).json({ ok: false, message: error.message || "Unable to delete FTP account." });
  }
});

app.get("/api/user/app-installer", requireLicense, async (req, res) => {
  const account = requireUserAccount(req, res);
  if (!account) return;
  if (!normalizeAccountPermissions(account.permissions, account).marketplace) {
    res.status(403).json({ ok: false, message: "App Marketplace access is disabled for this account." });
    return;
  }
  try {
    res.json(appInstallerPayload(account));
  } catch (error: any) {
    res.status(500).json({ ok: false, message: error.message || "Unable to load app installer." });
  }
});

app.post("/api/user/app-installer/install", requireLicense, async (req, res) => {
  const account = requireUserAccount(req, res);
  if (!account) return;
  try {
    const { account: updated, installation } = await installOneClickApp(account, req.body || {});
    res.json({
      ...appInstallerPayload(updated),
      installation,
      account: publicAccount(updated)
    });
  } catch (error: any) {
    res.status(500).json({ ok: false, message: error.message || "Unable to install application." });
  }
});

app.get("/api/user/files", requireLicense, async (req, res) => {
  const account = requireUserAccount(req, res);
  if (!account) return;
  try {
    const scope = resolveFileListScope(account, req.query.parentId || "root-dir", req.query.parentPath || "");
    res.json({
      ok: true,
      scopeParentId: scope.folderId,
      scopeParentPath: scope.folderRelative,
      files: readAccountFiles(account, { folderId: scope.folderId, folderPath: scope.folderRelative })
    });
  } catch (error: any) {
    res.status(500).json({ ok: false, message: error.message || "Unable to read account files." });
  }
});

app.post("/api/user/files", requireLicense, async (req, res) => {
  const account = requireUserAccount(req, res);
  if (!account) return;
  if (!ensureFileManagerAccess(req, res, account)) return;
  try {
    const scope = resolveFileListScope(account, req.body?.parentId || "root-dir", req.body?.parentPath || "");
    res.json({
      ok: true,
      scopeParentId: scope.folderId,
      scopeParentPath: scope.folderRelative,
      files: readAccountFiles(account, { folderId: scope.folderId, folderPath: scope.folderRelative })
    });
  } catch (error: any) {
    res.status(500).json({ ok: false, message: error.message || "Unable to read account files." });
  }
});

app.post("/api/user/files/upload", requireLicense, async (req, res) => {
  const account = requireUserAccount(req, res);
  if (!account) return;
  if (!ensureFileManagerAccess(req, res, account)) return;
  let tempPath = "";
  try {
    const rawName = decodeURIComponent(String(req.headers["x-tpanel-file-name"] || "upload.bin"));
    const parentId = String(req.headers["x-tpanel-parent-id"] || "root-dir");
    const parentPath = decodeURIComponent(String(req.headers["x-tpanel-parent-path"] || ""));
    const parentDir = accountFolderFromVirtual(account, parentId, parentPath);
    const fileName = safeVirtualName(rawName, "upload.bin");
    const targetPath = uniquePath(ensureInside(account.homeDirectory, path.join(parentDir, fileName)));
    const expectedBytes = Number(req.headers["content-length"] || 0);
    if (Number.isFinite(expectedBytes) && expectedBytes > 0) {
      await ensureAccountStorageAvailable(account, expectedBytes, "Upload");
    }
    const tempDir = ensureInside(account.homeDirectory, path.join(account.homeDirectory, ".tpanel-tmp", "uploads"));
    fs.mkdirSync(tempDir, { recursive: true });
    tempPath = path.join(tempDir, `${Date.now()}-${randomBytes(6).toString("hex")}.upload`);
    const startUsage = directorySizeBytes(account.homeDirectory);
    const quotaBytes = accountQuotaBytes(account);
    let receivedBytes = 0;
    await new Promise<void>((resolve, reject) => {
      const writeStream = fs.createWriteStream(tempPath, { flags: "wx" });
      req.on("data", (chunk: Buffer) => {
        receivedBytes += chunk.length;
        if (Number.isFinite(quotaBytes) && startUsage + receivedBytes > quotaBytes) {
          reject(new Error(`Upload is out of account disk limit. Current usage ${formatBytes(startUsage)}, uploaded ${formatBytes(receivedBytes)}, quota ${formatBytes(quotaBytes)}.`));
          req.unpipe(writeStream);
          writeStream.destroy();
        }
      });
      req.on("error", reject);
      writeStream.on("error", reject);
      writeStream.on("finish", resolve);
      req.pipe(writeStream);
    });
    if (!expectedBytes) await ensureAccountStorageAvailable(account, 0, "Upload");
    fs.renameSync(tempPath, targetPath);
    tempPath = "";
    fs.chmodSync(targetPath, 0o644);
    applyAccountFileOwnership(account, targetPath);
    res.json(fileOperationResponse(account, { uploaded: path.basename(targetPath), size: receivedBytes }, { folderId: parentId, folderPath: parentPath }));
  } catch (error: any) {
    if (tempPath && fs.existsSync(tempPath)) fs.rmSync(tempPath, { force: true });
    res.status(500).json({ ok: false, message: error.message || "Unable to upload file." });
  }
});

app.post("/api/user/files/create", requireLicense, async (req, res) => {
  const account = requireUserAccount(req, res);
  if (!account) return;
  if (!ensureFileManagerAccess(req, res, account)) return;
  try {
    const body = parseFileOperationBody(req);
    const parentDir = accountFolderFromVirtual(account, body.parentId || "root-dir", body.parentPath || "");
    const name = safeVirtualName(body.name, body.type === "directory" ? "new-folder" : "new-file.txt");
    const targetPath = uniquePath(ensureInside(account.homeDirectory, path.join(parentDir, name)));
    if (body.type === "directory") {
      await ensureAccountStorageAvailable(account, 0, "Create folder");
      fs.mkdirSync(targetPath, { recursive: true });
    } else {
      const content = String(body.content || "");
      await ensureAccountStorageAvailable(account, Buffer.byteLength(content), "Create file");
      fs.writeFileSync(targetPath, content);
    }
    applyAccountFileOwnership(account, targetPath);
    const relative = path.relative(path.resolve(account.homeDirectory), targetPath).replace(/\\/g, "/");
    res.json(fileOperationResponse(account, { itemId: virtualIdForRelative(relative), name: path.basename(targetPath) }, { folderId: body.parentId || "root-dir", folderPath: body.parentPath || "" }));
  } catch (error: any) {
    res.status(500).json({ ok: false, message: error.message || "Unable to create item." });
  }
});

app.post("/api/user/files/save", requireLicense, async (req, res) => {
  const account = requireUserAccount(req, res);
  if (!account) return;
  if (!ensureFileManagerAccess(req, res, account)) return;
  try {
    const body = parseFileOperationBody(req);
    const targetPath = accountPathFromVirtual(account, body.id, body.path || "");
    if (!fs.existsSync(targetPath) || fs.statSync(targetPath).isDirectory()) {
      res.status(404).json({ ok: false, message: "File was not found." });
      return;
    }
    const content = String(body.content ?? "");
    const oldSize = fs.statSync(targetPath).size;
    const nextSize = Buffer.byteLength(content);
    await ensureAccountStorageAvailable(account, Math.max(0, nextSize - oldSize), "Save file");
    fs.writeFileSync(targetPath, content);
    applyAccountFileOwnership(account, targetPath);
    const parentRelative = path.relative(path.resolve(account.homeDirectory), path.dirname(targetPath)).replace(/\\/g, "/");
    res.json(fileOperationResponse(account, { saved: path.basename(targetPath) }, { folderId: virtualIdForRelative(parentRelative), folderPath: parentRelative }));
  } catch (error: any) {
    res.status(500).json({ ok: false, message: error.message || "Unable to save file." });
  }
});

app.post("/api/user/files/read", requireLicense, async (req, res) => {
  const account = requireUserAccount(req, res);
  if (!account) return;
  if (!ensureFileManagerAccess(req, res, account)) return;
  try {
    const body = parseFileOperationBody(req);
    const targetPath = accountPathFromVirtual(account, body.id, body.path || "");
    if (!fs.existsSync(targetPath) || fs.statSync(targetPath).isDirectory()) {
      res.status(404).json({ ok: false, message: "File was not found." });
      return;
    }
    const stat = fs.statSync(targetPath);
    if (stat.size > 5 * 1024 * 1024) throw new Error("This file is too large to edit in the browser. Use download or terminal tools.");
    if (!isEditableTextFile(path.basename(targetPath))) throw new Error("This file type is not editable as text.");
    res.json({ ok: true, content: fs.readFileSync(targetPath, "utf8"), size: stat.size });
  } catch (error: any) {
    res.status(500).json({ ok: false, message: error.message || "Unable to read file." });
  }
});

app.post("/api/user/files/rename", requireLicense, async (req, res) => {
  const account = requireUserAccount(req, res);
  if (!account) return;
  if (!ensureFileManagerAccess(req, res, account)) return;
  try {
    const body = parseFileOperationBody(req);
    const sourcePath = accountPathFromVirtual(account, body.id, body.path || "");
    if (!fs.existsSync(sourcePath)) {
      res.status(404).json({ ok: false, message: "Item was not found." });
      return;
    }
    const nextName = safeVirtualName(body.name, path.basename(sourcePath));
    const requestedTarget = ensureInside(account.homeDirectory, path.join(path.dirname(sourcePath), nextName));
    const targetPath = path.resolve(sourcePath) === path.resolve(requestedTarget) ? requestedTarget : uniquePath(requestedTarget);
    if (path.resolve(sourcePath) !== path.resolve(targetPath)) {
      fs.renameSync(sourcePath, targetPath);
      applyAccountFileOwnership(account, targetPath);
    }
    const parentRelative = path.relative(path.resolve(account.homeDirectory), path.dirname(targetPath)).replace(/\\/g, "/");
    res.json(fileOperationResponse(account, { renamed: path.basename(targetPath) }, { folderId: virtualIdForRelative(parentRelative), folderPath: parentRelative }));
  } catch (error: any) {
    res.status(500).json({ ok: false, message: error.message || "Unable to rename item." });
  }
});

app.post("/api/user/files/chmod", requireLicense, async (req, res) => {
  const account = requireUserAccount(req, res);
  if (!account) return;
  if (!ensureFileManagerAccess(req, res, account)) return;
  try {
    const body = parseFileOperationBody(req);
    const targetPath = accountPathFromVirtual(account, body.id, body.path || "");
    const modeText = String(body.permissions || "").replace(/^0/, "");
    if (!/^[0-7]{3}$/.test(modeText)) throw new Error("Use a valid chmod value like 0644 or 0755.");
    fs.chmodSync(targetPath, parseInt(modeText, 8));
    const parentRelative = path.relative(path.resolve(account.homeDirectory), path.dirname(targetPath)).replace(/\\/g, "/");
    res.json(fileOperationResponse(account, { permissions: `0${modeText}` }, { folderId: virtualIdForRelative(parentRelative), folderPath: parentRelative }));
  } catch (error: any) {
    res.status(500).json({ ok: false, message: error.message || "Unable to change permissions." });
  }
});

app.post("/api/user/files/delete", requireLicense, async (req, res) => {
  const account = requireUserAccount(req, res);
  if (!account) return;
  if (!ensureFileManagerAccess(req, res, account)) return;
  try {
    const body = parseFileOperationBody(req);
    const paths = sourcePathsForIds(account, body.ids || []);
    for (const targetPath of paths.sort((a, b) => b.length - a.length)) {
      if (fs.existsSync(targetPath)) fs.rmSync(targetPath, { recursive: true, force: true });
    }
    fs.mkdirSync(path.join(account.homeDirectory, "public_html"), { recursive: true });
    res.json(fileOperationResponse(account, { deleted: paths.length }, { folderId: body.parentId || "root-dir", folderPath: body.parentPath || "" }));
  } catch (error: any) {
    res.status(500).json({ ok: false, message: error.message || "Unable to delete item." });
  }
});

app.post("/api/user/files/copy", requireLicense, async (req, res) => {
  const account = requireUserAccount(req, res);
  if (!account) return;
  if (!ensureFileManagerAccess(req, res, account)) return;
  try {
    const body = parseFileOperationBody(req);
    const destinationDir = accountFolderFromVirtual(account, body.targetFolderId || "root-dir", body.targetPath || "");
    const sources = sourcePathsForIds(account, body.ids || []);
    await ensureAccountStorageAvailable(account, totalPathSizeBytes(sources), "Copy");
    for (const sourcePath of sources) {
      if (!fs.existsSync(sourcePath)) continue;
      const targetPath = uniquePath(ensureInside(account.homeDirectory, path.join(destinationDir, path.basename(sourcePath))));
      copyRecursive(sourcePath, targetPath);
      applyAccountFileOwnership(account, targetPath);
    }
    res.json(fileOperationResponse(account, { copied: sources.length }, { folderId: body.targetFolderId || "root-dir", folderPath: body.targetPath || "" }));
  } catch (error: any) {
    res.status(500).json({ ok: false, message: error.message || "Unable to copy item." });
  }
});

app.post("/api/user/files/move", requireLicense, async (req, res) => {
  const account = requireUserAccount(req, res);
  if (!account) return;
  if (!ensureFileManagerAccess(req, res, account)) return;
  try {
    const body = parseFileOperationBody(req);
    const destinationDir = accountFolderFromVirtual(account, body.targetFolderId || "root-dir", body.targetPath || "");
    const sources = sourcePathsForIds(account, body.ids || []);
    for (const sourcePath of sources) {
      if (!fs.existsSync(sourcePath)) continue;
      if (destinationDir === sourcePath || destinationDir.startsWith(`${sourcePath}${path.sep}`)) {
        throw new Error("Cannot move a folder into itself.");
      }
      const targetPath = uniquePath(ensureInside(account.homeDirectory, path.join(destinationDir, path.basename(sourcePath))));
      moveRecursive(sourcePath, targetPath);
      applyAccountFileOwnership(account, targetPath);
    }
    res.json(fileOperationResponse(account, { moved: sources.length }, { folderId: body.targetFolderId || "root-dir", folderPath: body.targetPath || "" }));
  } catch (error: any) {
    res.status(500).json({ ok: false, message: error.message || "Unable to move item." });
  }
});

app.post("/api/user/files/extract", requireLicense, async (req, res) => {
  const account = requireUserAccount(req, res);
  if (!account) return;
  if (!ensureFileManagerAccess(req, res, account)) return;
  try {
    const body = parseFileOperationBody(req);
    const archivePath = accountPathFromVirtual(account, body.id, body.path || "");
    if (!fs.existsSync(archivePath) || fs.statSync(archivePath).isDirectory()) throw new Error("Archive was not found.");
    if (!archivePath.toLowerCase().endsWith(".zip")) throw new Error("Only .zip extraction is supported right now.");
    const archiveInfo = await inspectZipArchive(archivePath);
    const entryLimit = maxExtractEntries(account);
    if (archiveInfo.entries > entryLimit) {
      throw new Error(`Archive has too many files for this account resource limit (${archiveInfo.entries.toLocaleString()} files, limit ${entryLimit.toLocaleString()}).`);
    }
    if (archiveInfo.entries > 0 && !archiveInfo.uncompressedBytes) {
      throw new Error("Unable to calculate archive uncompressed size before extraction. Try recompressing the ZIP, then upload again.");
    }
    await ensureAccountStorageAvailable(account, archiveInfo.uncompressedBytes, "Archive extraction");
    const destinationBase = body.targetFolderId || body.targetPath
      ? accountFolderFromVirtual(account, body.targetFolderId || "root-dir", body.targetPath || "")
      : path.dirname(archivePath);
    const stagingDir = ensureInside(account.homeDirectory, path.join(account.homeDirectory, ".tpanel-tmp", `extract-${Date.now()}-${randomBytes(4).toString("hex")}`));
    let moved: string[] = [];
    try {
      fs.mkdirSync(stagingDir, { recursive: true });
      await execFileAsync("unzip", ["-qq", archivePath, "-d", stagingDir], { timeout: timeoutForBytes(archiveInfo.uncompressedBytes), maxBuffer: 1024 * 1024 });
      const contentRoot = extractionContentRoot(stagingDir);
      moved = moveExtractedEntries(contentRoot, destinationBase, account.homeDirectory);
      await ensureAccountStorageAvailable(account, 0, "Archive extraction");
      for (const targetPath of moved) {
        await finalizeExtractedFiles(account, targetPath);
      }
      ensureWebReadableAccount(account);
      res.json(fileOperationResponse(account, {
        extractedTo: path.basename(destinationBase),
        items: moved.length,
        entries: archiveInfo.entries,
        extractedBytes: archiveInfo.uncompressedBytes
      }, { folderId: body.targetFolderId || "root-dir", folderPath: body.targetPath || "" }));
    } catch (error) {
      for (const targetPath of moved) {
        if (fs.existsSync(targetPath)) fs.rmSync(targetPath, { recursive: true, force: true });
      }
      throw error;
    } finally {
      if (fs.existsSync(stagingDir)) fs.rmSync(stagingDir, { recursive: true, force: true });
    }
  } catch (error: any) {
    res.status(500).json({ ok: false, message: error.message || "Unable to extract archive. Make sure unzip is installed." });
  }
});

app.post("/api/user/files/compress", requireLicense, async (req, res) => {
  const account = requireUserAccount(req, res);
  if (!account) return;
  if (!ensureFileManagerAccess(req, res, account)) return;
  try {
    const body = parseFileOperationBody(req);
    const sources = sourcePathsForIds(account, body.ids || []);
    if (!sources.length) throw new Error("Select at least one item to compress.");
    const destinationDir = accountFolderFromVirtual(account, body.targetFolderId || "root-dir", body.targetPath || "");
    const archiveName = safeVirtualName(body.name || `archive-${Date.now()}.zip`, "archive.zip").replace(/\.zip$/i, "") + ".zip";
    const archivePath = uniquePath(ensureInside(account.homeDirectory, path.join(destinationDir, archiveName)));
    const sourceBytes = totalPathSizeBytes(sources);
    await ensureAccountStorageAvailable(account, sourceBytes * 2, "Compress");
    const stagingDir = ensureInside(account.homeDirectory, path.join(account.homeDirectory, ".tpanel-tmp", `zip-${Date.now()}-${randomBytes(3).toString("hex")}`));
    fs.mkdirSync(stagingDir, { recursive: true });
    try {
      for (const sourcePath of sources) {
        if (!fs.existsSync(sourcePath)) continue;
        copyRecursive(sourcePath, uniquePath(path.join(stagingDir, path.basename(sourcePath))));
      }
      await execFileAsync("zip", ["-qry", archivePath, "."], { cwd: stagingDir, timeout: 300000 });
    } finally {
      fs.rmSync(stagingDir, { recursive: true, force: true });
    }
    applyAccountFileOwnership(account, archivePath);
    res.json(fileOperationResponse(account, { archive: path.basename(archivePath) }, { folderId: body.targetFolderId || "root-dir", folderPath: body.targetPath || "" }));
  } catch (error: any) {
    res.status(500).json({ ok: false, message: error.message || "Unable to create zip archive. Make sure zip is installed." });
  }
});

app.post("/api/user/subdomains", requireLicense, async (req, res) => {
  const account = requireUserAccount(req, res);
  if (!account) return;
  if (!normalizeAccountPermissions(account.permissions, account).subdomains) {
    res.status(403).json({ ok: false, message: "Subdomain access is disabled for this account." });
    return;
  }

  const prefix = String(req.body?.prefix || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63);
  const reserved = new Set(["", "www", "mail", "ftp", "cpanel", "webmail", "admin", "root", "ns1", "ns2"]);
  if (reserved.has(prefix)) {
    res.status(400).json({ ok: false, message: "Choose a valid subdomain prefix." });
    return;
  }

  const parentDomain = cleanDomain(req.body?.parentDomain || account.domain);
  const allowedParents = uniqueCleanDomains([account.domain, ...(account.provisioning?.vhost?.aliases || [])]);
  if (!allowedParents.includes(parentDomain)) {
    res.status(400).json({ ok: false, message: "Subdomain parent must belong to this hosting account." });
    return;
  }

  const domain = `${prefix}.${parentDomain}`;
  const state = readPanelState();
  const existingOwner = domainInUse(state, domain, account.username);
  if (existingOwner) {
    res.status(409).json({ ok: false, message: "This domain is already in use on another tPanel account." });
    return;
  }
  const settings = readDomainSettings(req);
  const detectedServerIp = settings.autoDetectIp === false ? settings.detectedServerIp : await detectServerIp(req);
  const routeServerIp = account.dedicatedIp || detectedServerIp || configuredServerIp(req) || "SERVER_IP";
  const documentRoot = ensureInside(account.homeDirectory, path.join(account.documentRoot, prefix));
  const webPath = `/public_html/${prefix}`;

  try {
    fs.mkdirSync(documentRoot, { recursive: true });
    const indexPhp = path.join(documentRoot, "index.php");
    const indexHtml = path.join(documentRoot, "index.html");
    if (!fs.existsSync(indexPhp) && !fs.existsSync(indexHtml)) {
      fs.writeFileSync(indexPhp, `<?php
$site = $_SERVER['HTTP_HOST'] ?? '${domain}';
echo "<h1>{$site}</h1><p>This subdomain is connected to ${webPath} on tPanel.</p>";
`);
    }

    const updated = updateStoredAccount(account.username, (current: any) => {
      const provisioning = current.provisioning || buildAccountProvisioning(req, current);
      const existingRoutes = Array.isArray(provisioning.vhost?.subdomains) ? provisioning.vhost.subdomains : [];
      const serverIp = current.dedicatedIp || routeServerIp;
      const subdomains = [
        ...existingRoutes.filter((route: any) => cleanDomain(route.domain) !== domain),
        {
          prefix,
          domain,
          parentDomain,
          documentRoot,
          webPath,
          sslEnabled: current.sslEnabled !== false,
          createdAt: new Date().toISOString()
        }
      ];
      const dnsRecords = [
        ...(provisioning.dnsRecords || []).filter((record: any) => cleanDomain(record.host) !== domain),
        ...domainDnsRecords(domain, serverIp, false)
      ];
      return {
        ...current,
        provisioning: {
          ...provisioning,
          dnsRecords,
          ssl: {
            ...(provisioning.ssl || {}),
            status: current.sslEnabled !== false ? "queued" : "disabled",
            requestedAt: new Date().toISOString()
          },
          vhost: {
            ...(provisioning.vhost || {}),
            subdomains,
            status: "queued"
          }
        },
        updatedAt: new Date().toISOString()
      };
    });

    if (!updated) {
      res.status(404).json({ ok: false, message: "Hosting account was not found." });
      return;
    }

    appendProvisioningLog(updated, `Subdomain ${domain} mapped to ${webPath}.`);
    applyAccountProvisioning(updated);
    const serverIp = updated.dedicatedIp || routeServerIp;
    res.json({
      ok: true,
      domain: domainItemFor(domain, webPath, updated, serverIp),
      account: publicAccount(updated),
      provisioningLog: readProvisioningLog(updated.username)
    });
  } catch (error: any) {
    res.status(500).json({ ok: false, message: error.message || "Unable to create subdomain." });
  }
});

app.post("/api/user/domains", requireLicense, async (req, res) => {
  const account = requireUserAccount(req, res);
  if (!account) return;
  if (!normalizeAccountPermissions(account.permissions, account).domains) {
    res.status(403).json({ ok: false, message: "Domain access is disabled for this account." });
    return;
  }

  const domain = cleanDomain(req.body?.domain || req.body?.domainName);
  if (!domain || !domain.includes(".") || domain.endsWith(".tpanel.local")) {
    res.status(400).json({ ok: false, message: "Enter a real domain name, for example alzic.com." });
    return;
  }
  const state = readPanelState();
  const existingOwner = domainInUse(state, domain, account.username);
  if (existingOwner) {
    res.status(409).json({ ok: false, message: "This domain already in use. You can't add this domain here." });
    return;
  }
  if (allAccountDomains(account).includes(domain)) {
    res.status(409).json({ ok: false, message: "This domain is already added to this account." });
    return;
  }

  const requestedRoot = String(req.body?.documentRoot || "public_html")
    .replace(/^\/+/, "")
    .replace(/\\/g, "/")
    .replace(/\.\.+/g, ".")
    .trim() || "public_html";
  const documentRoot = ensureInside(account.homeDirectory, path.join(account.homeDirectory, requestedRoot));
  const webPath = `/${path.relative(account.homeDirectory, documentRoot).replace(/\\/g, "/") || "public_html"}`;

  try {
    fs.mkdirSync(documentRoot, { recursive: true });
    const indexHtml = path.join(documentRoot, "index.html");
    const indexPhp = path.join(documentRoot, "index.php");
    if (!fs.existsSync(indexHtml) && !fs.existsSync(indexPhp)) {
      fs.writeFileSync(indexHtml, starterIndexHtml(domain));
    }

    const settings = readDomainSettings(req);
    const detectedServerIp = settings.autoDetectIp === false ? settings.detectedServerIp : await detectServerIp(req);
    const serverIp = account.dedicatedIp || detectedServerIp || configuredServerIp(req) || "SERVER_IP";
    const updated = updateStoredAccount(account.username, (current: any) => {
      const provisioning = current.provisioning || buildAccountProvisioning(req, current);
      const existingRoutes = Array.isArray(provisioning.vhost?.subdomains) ? provisioning.vhost.subdomains : [];
      const subdomains = [
        ...existingRoutes.filter((route: any) => cleanDomain(route.domain) !== domain),
        {
          type: "addon_domain",
          prefix: "",
          domain,
          aliases: [`www.${domain}`],
          parentDomain: domain,
          documentRoot,
          webPath,
          sslEnabled: current.sslEnabled !== false,
          createdAt: new Date().toISOString()
        }
      ];
      const dnsRecords = [
        ...(provisioning.dnsRecords || []).filter((record: any) => {
          const host = cleanDomain(record.host || record.value || record.name);
          return ![domain, `www.${domain}`, `ftp.${domain}`, `mail.${domain}`].includes(host);
        }),
        ...domainDnsRecords(domain, serverIp, true)
      ];
      return {
        ...current,
        provisioning: {
          ...provisioning,
          dnsRecords,
          ssl: {
            ...(provisioning.ssl || {}),
            status: current.sslEnabled !== false ? "queued" : "disabled",
            requestedAt: new Date().toISOString()
          },
          vhost: {
            ...(provisioning.vhost || {}),
            subdomains,
            status: "queued"
          }
        },
        updatedAt: new Date().toISOString()
      };
    });

    if (!updated) {
      res.status(404).json({ ok: false, message: "Hosting account was not found." });
      return;
    }
    appendProvisioningLog(updated, `Domain ${domain} mapped to ${webPath}.`);
    applyAccountProvisioning(updated);
    res.json({
      ok: true,
      domain: domainItemFor(domain, webPath, updated, serverIp),
      account: publicAccount(updated),
      provisioningLog: readProvisioningLog(updated.username)
    });
  } catch (error: any) {
    res.status(500).json({ ok: false, message: error.message || "Unable to add domain." });
  }
});

app.post("/api/user/domains/:domain/ssl", requireLicense, async (req, res) => {
  const account = requireUserAccount(req, res);
  if (!account) return;
  const domain = cleanDomain(req.params.domain);
  if (!allAccountDomains(account).includes(domain)) {
    res.status(404).json({ ok: false, message: "Domain was not found on this account." });
    return;
  }
  const updated = updateStoredAccount(account.username, (current: any) => ({
    ...current,
    sslEnabled: true,
    provisioning: {
      ...(current.provisioning || buildAccountProvisioning(req, current)),
      ssl: {
        ...(current.provisioning?.ssl || {}),
        status: "queued",
        requestedAt: new Date().toISOString()
      }
    },
    updatedAt: new Date().toISOString()
  }));
  if (updated) {
    appendProvisioningLog(updated, `SSL retry requested for ${domain}.`);
    applyAccountProvisioning(updated);
  }
  res.json({ ok: true, account: updated ? publicAccount(updated) : publicAccount(account) });
});

app.delete("/api/user/domains/:domain", requireLicense, async (req, res) => {
  const account = requireUserAccount(req, res);
  if (!account) return;
  const domain = cleanDomain(req.params.domain);
  if (domain === cleanDomain(account.domain)) {
    res.status(400).json({ ok: false, message: "Primary domain cannot be removed from this account." });
    return;
  }
  const updated = updateStoredAccount(account.username, (current: any) => {
    const provisioning = current.provisioning || buildAccountProvisioning(req, current);
    return {
      ...current,
      provisioning: {
        ...provisioning,
        dnsRecords: (provisioning.dnsRecords || []).filter((record: any) => {
          const host = cleanDomain(record.host || record.value || record.name);
          return ![domain, `www.${domain}`, `ftp.${domain}`, `mail.${domain}`].includes(host);
        }),
        vhost: {
          ...(provisioning.vhost || {}),
          subdomains: (provisioning.vhost?.subdomains || []).filter((route: any) => cleanDomain(route.domain) !== domain),
          status: "queued"
        }
      },
      updatedAt: new Date().toISOString()
    };
  });
  if (updated) {
    appendProvisioningLog(updated, `Domain ${domain} removed.`);
    applyAccountProvisioning(updated);
  }
  res.json({ ok: true, account: updated ? publicAccount(updated) : publicAccount(account) });
});

app.use("/api/panel", requireLicense, requireAdminSession);

app.get("/api/panel/summary", async (_req, res) => {
  const disk = await diskUsage();
  const totalRam = Math.round(os.totalmem() / 1024 / 1024);
  const usedRam = Math.round((os.totalmem() - os.freemem()) / 1024 / 1024);
  res.json({
    ok: true,
    hostname: os.hostname(),
    platform: os.platform(),
    release: os.release(),
    uptimeSeconds: os.uptime(),
    loadAverage: os.loadavg(),
    cpuCount: os.cpus().length,
    ram: { totalMb: totalRam, usedMb: usedRam, percent: totalRam ? Math.round((usedRam / totalRam) * 100) : 0 },
    disk
  });
});

app.get("/api/panel/domain-settings", async (req, res) => {
  const current = readDomainSettings(req);
  const detectedServerIp = current.autoDetectIp === false ? current.detectedServerIp : await detectServerIp(req);
  const settings = {
    ...current,
    detectedServerIp,
    dnsRecords: [
      { type: "A", name: "@", value: detectedServerIp || "SERVER_IP", ttl: 300 },
      { type: "CNAME", name: "www", value: current.primaryDomain, ttl: 300 }
    ],
    hostname: os.hostname()
  };
  if (current.autoDetectIp !== false && detectedServerIp && detectedServerIp !== current.detectedServerIp) {
    writeDomainSettings(settings);
  }
  res.json({ ok: true, settings });
});

app.post("/api/panel/domain-settings", requireCapability("dns"), async (req, res) => {
  const current = readDomainSettings(req);
  const primaryDomain = cleanDomain(req.body?.primaryDomain || current.primaryDomain);
  const detectedServerIp = req.body?.autoDetectIp === false
    ? String(req.body?.detectedServerIp || current.detectedServerIp || "")
    : await detectServerIp(req);
  const settings = {
    ...current,
    ...req.body,
    primaryDomain,
    panelUrl: req.body?.panelUrl || `${req.body?.enableSsl === false ? "http" : "https"}://${primaryDomain}`,
    detectedServerIp,
    dnsRecords: [
      { type: "A", name: "@", value: detectedServerIp || "SERVER_IP", ttl: 300 },
      { type: "CNAME", name: "www", value: primaryDomain, ttl: 300 }
    ],
    ports: REQUIRED_PORTS,
    updatedAt: new Date().toISOString()
  };
  writeDomainSettings(settings);
  applyPanelDomainProxy(settings);
  res.json({ ok: true, settings });
});

app.get("/api/panel/system-status", async (req, res) => {
  const [ports, firewall] = await Promise.all([listeningPorts(), firewallStatus()]);
  const portSet = new Set(ports);
  const allowedSet = new Set(firewall.allowedPorts);
  const settings = readDomainSettings(req);
  const detectedServerIp = settings.autoDetectIp === false ? settings.detectedServerIp : await detectServerIp(req);
  res.json({
    ok: true,
    hostname: os.hostname(),
    detectedServerIp: detectedServerIp || settings.detectedServerIp || configuredServerIp(req),
    domain: settings.primaryDomain,
    panelUrl: settings.panelUrl,
    firewall,
    ports: REQUIRED_PORTS.map((item) => ({
      ...item,
      open: portSet.has(item.port),
      allowed: firewall.mode === "inactive" || allowedSet.has(item.port),
      status: portSet.has(item.port) ? "listening" : "not_listening",
      firewallStatus: firewall.mode === "inactive" || allowedSet.has(item.port) ? "allowed" : "not_reported"
    })),
    generatedAt: new Date().toISOString()
  });
});

app.get("/api/panel/hosting-stack", requireCapability("software"), async (_req, res) => {
  res.json({ ok: true, stack: await hostingStackStatus() });
});

app.post("/api/panel/hosting-stack/install", requireCapability("software"), async (req, res) => {
  if (process.platform === "win32") {
    res.status(400).json({ ok: false, message: "Hosting stack package install is available on Linux servers only." });
    return;
  }
  const manager = await packageManager();
  if (!manager) {
    res.status(400).json({ ok: false, message: "No supported package manager was detected." });
    return;
  }
  const allowedPackages = HOSTING_STACK_PACKAGES[manager];
  const requested = Array.isArray(req.body?.packages)
    ? req.body.packages.map((item: any) => String(item)).filter((item: string) => allowedPackages.includes(item))
    : [];
  const packages = requested.length ? requested : (await hostingStackStatus()).missingPackages.filter((item: string) => allowedPackages.includes(item));
  if (!packages.length) {
    res.json({ ok: true, message: "Hosting stack packages are already installed.", stack: await hostingStackStatus() });
    return;
  }
  const quoted = packages.map((item) => `'${item.replace(/'/g, "'\\''")}'`).join(" ");
  const installCommand = manager === "apt"
    ? `export DEBIAN_FRONTEND=noninteractive; apt-get update -y && apt-get install -y ${quoted}`
    : `${manager} install -y ${quoted}`;
  try {
    const { stdout, stderr } = await execFileAsync("sh", ["-lc", `${installCommand}; systemctl enable --now nginx >/dev/null 2>&1 || true; systemctl enable --now mariadb >/dev/null 2>&1 || systemctl enable --now mysql >/dev/null 2>&1 || true; systemctl enable --now postgresql >/dev/null 2>&1 || true; systemctl enable --now vsftpd >/dev/null 2>&1 || true; systemctl enable --now postfix >/dev/null 2>&1 || true; systemctl enable --now dovecot >/dev/null 2>&1 || true; systemctl enable --now opendkim >/dev/null 2>&1 || true; systemctl enable --now rspamd >/dev/null 2>&1 || true; if command -v ufw >/dev/null 2>&1; then ufw allow 21/tcp >/dev/null 2>&1 || true; ufw allow 80/tcp >/dev/null 2>&1 || true; ufw allow 443/tcp >/dev/null 2>&1 || true; fi; if command -v firewall-cmd >/dev/null 2>&1; then firewall-cmd --permanent --add-service=ftp >/dev/null 2>&1 || true; firewall-cmd --permanent --add-service=http >/dev/null 2>&1 || true; firewall-cmd --permanent --add-service=https >/dev/null 2>&1 || true; firewall-cmd --reload >/dev/null 2>&1 || true; fi; for svc in $(systemctl list-unit-files --type=service 'php*-fpm.service' 2>/dev/null | awk '/php.*-fpm\\.service/ {print $1}'); do systemctl enable --now "$svc" >/dev/null 2>&1 || true; done`], { timeout: 900000 });
    res.json({ ok: true, packages, output: `${stdout || ""}${stderr || ""}`.trim(), stack: await hostingStackStatus() });
  } catch (error: any) {
    res.status(500).json({ ok: false, packages, message: error.message || "Package installation failed.", output: `${error.stdout || ""}${error.stderr || ""}`.trim() });
  }
});

app.get("/api/panel/provisioning", requireCapability("accounts"), (_req, res) => {
  const state = readPanelState();
  res.json({
    ok: true,
    accounts: state.accounts.map((account: any) => ({
      ...publicAccount(account),
      provisioningLog: readProvisioningLog(account.username)
    })),
    updatedAt: state.updatedAt
  });
});

app.get("/api/panel/accounts", requireCapability("accounts"), (_req, res) => {
  const state = readPanelState();
  res.json({ ok: true, accounts: state.accounts.map(publicAccount), packages: state.packages, updatedAt: state.updatedAt });
});

app.get("/api/panel/audit-events", (_req, res) => {
  const state = readPanelState();
  res.json({ ok: true, auditEvents: state.auditEvents || [] });
});

function hasLimitValue(value: any) {
  return value !== undefined && value !== null && value !== "";
}

function parseLimitNumber(value: any) {
  if (value === undefined || value === null || value === "") return { amount: 0, raw: "" };
  if (Number.isFinite(Number(value))) return { amount: Number(value), raw: "" };
  const raw = String(value).toLowerCase().replace(/,/g, "");
  const amount = Number(raw.match(/[\d.]+/)?.[0] || 0);
  return { amount: Number.isFinite(amount) ? amount : 0, raw };
}

function parseLimitMb(value: any) {
  const { amount, raw } = parseLimitNumber(value);
  if (!amount) return 0;
  if (!raw) return amount;
  if (raw.includes("tb")) return Math.round(amount * 1024 * 1024);
  if (raw.includes("gb")) return Math.round(amount * 1024);
  return Math.round(amount);
}

function parseLimitGb(value: any) {
  const { amount, raw } = parseLimitNumber(value);
  if (!amount) return 0;
  if (!raw) return amount;
  if (raw.includes("tb")) return Math.round(amount * 1024);
  if (raw.includes("mb")) return Math.max(1, Math.round(amount / 1024));
  return Math.round(amount);
}

function firstLimitAmount(parser: (value: any) => number, ...values: any[]) {
  for (const value of values) {
    if (!hasLimitValue(value)) continue;
    const next = parser(value);
    return Number.isFinite(next) ? next : 0;
  }
  return null;
}

const firstLimitNumber = (...values: any[]) => firstLimitAmount((value) => parseLimitNumber(value).amount, ...values);
const firstLimitMb = (...values: any[]) => firstLimitAmount(parseLimitMb, ...values);
const firstLimitGb = (...values: any[]) => firstLimitAmount(parseLimitGb, ...values);

function numberOr(value: any, fallback: number) {
  if (!hasLimitValue(value)) return fallback;
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

app.post("/api/panel/packages", requireCapability("packages"), (req, res) => {
  const state = readPanelState();
  const limits = req.body?.resourceLimits || req.body?.limits || req.body?.cloudPlan?.limits || {};
  const diskGbMb = firstLimitGb(limits.diskGb, limits.diskGB);
  const ramGbMb = firstLimitGb(limits.ramGb, limits.memoryGb);
  const quotaMb = firstLimitNumber(req.body?.quotaMb, limits.quotaMb, limits.diskMB, limits.diskMb)
    ?? (diskGbMb !== null ? diskGbMb * 1024 : firstLimitMb(limits.disk))
    ?? 1024;
  const bandwidthGb = firstLimitNumber(req.body?.bandwidthGb, limits.bandwidthGb, limits.bandwidthGB, limits.transferGb, limits.transferGB)
    ?? firstLimitGb(limits.bandwidth, limits.transfer)
    ?? 100;
  const ramMb = firstLimitNumber(req.body?.ramMb, req.body?.memoryMb, limits.ramMb, limits.memoryMb)
    ?? (ramGbMb !== null ? ramGbMb * 1024 : firstLimitMb(limits.ram, limits.memory))
    ?? 1024;
  const cpuCores = firstLimitNumber(req.body?.cpuCores, req.body?.cpuCount, limits.cpuCores, limits.cpuCount, limits.vcpu, limits.cpu) ?? 1;
  const id = sanitizeSlug(req.body?.id || req.body?.name || `pkg-${Date.now()}`, "package");
  const pkg = {
    id,
    name: String(req.body?.name || "Custom Package").trim(),
    quotaMb,
    bandwidthGb,
    cpuCores,
    ramMb,
    domains: Number(req.body?.domains || 1),
    emailAccounts: Number(req.body?.emailAccounts || 10),
    databases: Number(req.body?.databases || 5),
    ftpAccounts: Number(req.body?.ftpAccounts || 5),
    nodeApps: Number(req.body?.nodeApps || 1),
    resourceLimits: {
      ...limits,
      quotaMb,
      diskMB: quotaMb,
      bandwidthGb,
      ramMb,
      memoryMb: ramMb,
      cpuCores
    }
  };
  const packages = [...state.packages.filter((item: any) => item.id !== id), pkg];
  writePanelState(withAuditEvent({ ...state, packages }, {
    actor: actorFromRequest(req),
    action: "package.saved",
    target: id,
    message: `Package ${pkg.name} saved with ${pkg.quotaMb} MB disk and ${pkg.bandwidthGb} GB bandwidth.`
  }));
  res.json({ ok: true, package: pkg, packages });
});

app.post("/api/panel/accounts", requireCapability("accounts"), async (req, res) => {
  const state = readPanelState();
  const username = sanitizeSlug(req.body?.username, "account").replace(/[^a-z0-9_]/g, "").slice(0, 16);
  const domain = resolveAccountDomain(req, username, req.body?.domain);
  const password = String(req.body?.password || "");
  if (!username || username.length < 3) {
    res.status(400).json({ ok: false, message: "Username must be at least 3 characters." });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ ok: false, message: "Account password must be at least 8 characters." });
    return;
  }
  if (!domain) {
    res.status(400).json({ ok: false, message: "A real domain name is required. Auto tpanel.local subdomains are disabled." });
    return;
  }
  const existingDomainOwner = domainInUse(state, domain);
  if (existingDomainOwner) {
    res.status(409).json({ ok: false, message: "This domain already in use. You can't add this domain here." });
    return;
  }
  if (state.accounts.some((account: any) => !TERMINAL_ACCOUNT_STATUSES.has(String(account.status || "").toLowerCase()) && (account.username === username || account.domain === domain))) {
    res.status(409).json({ ok: false, message: "An account with this username or domain already exists." });
    return;
  }
  const packageId = String(req.body?.packageId || "").trim();
  const packageName = String(req.body?.packageName || req.body?.cloudPlan?.name || "").trim();
  const existingPackage = state.packages.find((pkg: any) => pkg.id === packageId)
    || state.packages.find((pkg: any) => packageName && String(pkg.name || "").toLowerCase() === packageName.toLowerCase());
  const basePackage = existingPackage || state.packages[0] || DEFAULT_PACKAGES[0];
  const incomingLimits = req.body?.resourceLimits || req.body?.limits || req.body?.cloudPlan?.limits || {};
  const diskGbMb = firstLimitGb(incomingLimits.diskGb, incomingLimits.diskGB);
  const ramGbMb = firstLimitGb(incomingLimits.ramGb, incomingLimits.memoryGb);
  const requestedQuotaMb = firstLimitNumber(req.body?.quotaMb, incomingLimits.quotaMb, incomingLimits.diskMB, incomingLimits.diskMb)
    ?? (diskGbMb !== null ? diskGbMb * 1024 : firstLimitMb(incomingLimits.disk));
  const requestedBandwidthGb = firstLimitNumber(req.body?.bandwidthGb, incomingLimits.bandwidthGb, incomingLimits.bandwidthGB, incomingLimits.transferGb, incomingLimits.transferGB)
    ?? firstLimitGb(incomingLimits.bandwidth, incomingLimits.transfer);
  const requestedRamMb = firstLimitNumber(req.body?.ramMb, req.body?.memoryMb, incomingLimits.ramMb, incomingLimits.memoryMb)
    ?? (ramGbMb !== null ? ramGbMb * 1024 : firstLimitMb(incomingLimits.ram, incomingLimits.memory));
  const requestedCpuCores = firstLimitNumber(req.body?.cpuCores, req.body?.cpuCount, incomingLimits.cpuCores, incomingLimits.cpuCount, incomingLimits.vcpu, incomingLimits.cpu);
  const hasRequestedPackageLimits = requestedQuotaMb !== null || requestedBandwidthGb !== null || requestedRamMb !== null || requestedCpuCores !== null;
  const selectedPackage = packageId || packageName || hasRequestedPackageLimits
    ? {
      ...basePackage,
      id: packageId || basePackage.id || sanitizeSlug(packageName || `pkg-${Date.now()}`, "package"),
      name: packageName || basePackage.name,
      quotaMb: numberOr(requestedQuotaMb, numberOr(basePackage.quotaMb, 1024)),
      bandwidthGb: numberOr(requestedBandwidthGb, numberOr(basePackage.bandwidthGb, 100)),
      cpuCores: numberOr(requestedCpuCores, numberOr(basePackage.cpuCores, 1)),
      ramMb: numberOr(requestedRamMb, numberOr(basePackage.ramMb, numberOr(basePackage.memoryMb, 1024))),
      domains: numberOr(req.body?.maxDomains, numberOr(basePackage.domains, 1)),
      emailAccounts: numberOr(req.body?.maxEmailAccounts, numberOr(basePackage.emailAccounts, 10)),
      databases: numberOr(req.body?.maxDatabases, numberOr(basePackage.databases, 5)),
      ftpAccounts: numberOr(req.body?.ftpAccounts, numberOr(basePackage.ftpAccounts, 5)),
      nodeApps: numberOr(req.body?.maxNodeApps, numberOr(basePackage.nodeApps, 1)),
      resourceLimits: {
        ...(basePackage.resourceLimits || {}),
        ...incomingLimits,
        quotaMb: numberOr(requestedQuotaMb, numberOr(basePackage.quotaMb, 1024)),
        diskMB: numberOr(requestedQuotaMb, numberOr(basePackage.quotaMb, 1024)),
        bandwidthGb: numberOr(requestedBandwidthGb, numberOr(basePackage.bandwidthGb, 100)),
        ramMb: numberOr(requestedRamMb, numberOr(basePackage.ramMb, numberOr(basePackage.memoryMb, 1024))),
        memoryMb: numberOr(requestedRamMb, numberOr(basePackage.ramMb, numberOr(basePackage.memoryMb, 1024))),
        cpuCores: numberOr(requestedCpuCores, numberOr(basePackage.cpuCores, 1))
      }
    }
    : basePackage;
  const packages = selectedPackage.id
    ? [selectedPackage, ...state.packages.filter((pkg: any) => pkg.id !== selectedPackage.id)]
    : state.packages;
  const currentSettings = readDomainSettings(req);
  if (currentSettings.autoDetectIp !== false) {
    const detectedServerIp = await detectServerIp(req);
    if (detectedServerIp && detectedServerIp !== currentSettings.detectedServerIp) {
      writeDomainSettings({
        ...currentSettings,
        detectedServerIp,
        dnsRecords: [
          { type: "A", name: "@", value: detectedServerIp, ttl: 300 },
          { type: "CNAME", name: "www", value: currentSettings.primaryDomain, ttl: 300 }
        ],
        updatedAt: new Date().toISOString()
      });
    }
  }
  const homeDirectory = path.join(ACCOUNT_BASE_DIR, username);
  const accountQuotaMb = numberOr(requestedQuotaMb, numberOr(selectedPackage.quotaMb, 1024));
  const accountBandwidthGb = numberOr(requestedBandwidthGb, numberOr(selectedPackage.bandwidthGb, 100));
  const accountRamMb = numberOr(requestedRamMb, numberOr(selectedPackage.ramMb, numberOr(selectedPackage.memoryMb, 1024)));
  const accountCpuCores = numberOr(requestedCpuCores, numberOr(selectedPackage.cpuCores, numberOr(selectedPackage.cpuCount, 1)));
  const accountPhpMemoryMb = numberOr(req.body?.phpMemoryMb, accountRamMb <= 0 ? 0 : Math.max(128, Math.min(4096, accountRamMb)));
  const accountResourceLimits = {
    ...(selectedPackage.resourceLimits || {}),
    ...incomingLimits,
    packageId: selectedPackage.id,
    packageName: selectedPackage.name,
    quotaMb: accountQuotaMb,
    diskMB: accountQuotaMb,
    diskMb: accountQuotaMb,
    diskGb: Math.round((accountQuotaMb / 1024) * 100) / 100,
    bandwidthGb: accountBandwidthGb,
    bandwidthGB: accountBandwidthGb,
    ramMb: accountRamMb,
    memoryMb: accountRamMb,
    ramGb: Math.round((accountRamMb / 1024) * 100) / 100,
    cpuCores: accountCpuCores,
    cpuCount: accountCpuCores
  };
  const account: any = {
    id: `acct-${Date.now().toString(36)}`,
    username,
    domain,
    displayName: String(req.body?.displayName || domain).trim(),
    ownerEmail: String(req.body?.ownerEmail || "").trim(),
    contactEmail: String(req.body?.contactEmail || req.body?.ownerEmail || "").trim(),
    packageId: selectedPackage.id,
    packageName: selectedPackage.name,
    runtime: ["php", "node", "static"].includes(String(req.body?.runtime)) ? String(req.body?.runtime) : "php",
    phpVersion: String(req.body?.phpVersion || "8.3"),
    phpSettings: {
      version: String(req.body?.phpVersion || "8.3"),
      extensions: DEFAULT_SELECTED_PHP_EXTENSIONS,
      ini: normalizePhpIni({}, { phpMemoryMb: accountPhpMemoryMb, uploadLimitMb: req.body?.uploadLimitMb }),
      updatedAt: new Date().toISOString()
    },
    nodeVersion: normalizeNodeVersion(req.body?.nodeVersion || DEFAULT_NODE_VERSION),
    nodePort: Number(req.body?.nodePort || 3000),
    quotaMb: accountQuotaMb,
    bandwidthGb: accountBandwidthGb,
    cpuCores: accountCpuCores,
    ramMb: accountRamMb,
    memoryMb: accountRamMb,
    phpMemoryMb: accountPhpMemoryMb,
    resourceLimits: accountResourceLimits,
    limits: accountResourceLimits,
    maxDomains: numberOr(req.body?.maxDomains, numberOr(selectedPackage.domains, 1)),
    maxEmailAccounts: numberOr(req.body?.maxEmailAccounts, numberOr(selectedPackage.emailAccounts, 10)),
    maxDatabases: numberOr(req.body?.maxDatabases, numberOr(selectedPackage.databases, 5)),
    maxFtpAccounts: numberOr(req.body?.maxFtpAccounts, numberOr(req.body?.ftpAccounts, numberOr(selectedPackage.ftpAccounts, 5))),
    maxNodeApps: numberOr(req.body?.maxNodeApps, numberOr(selectedPackage.nodeApps, 1)),
    permissionProfile: normalizePermissionProfile(req.body?.permissionProfile),
    ftpEnabled: req.body?.ftpEnabled !== false,
    shellAccess: Boolean(req.body?.shellAccess),
    mysqlEnabled: req.body?.mysqlEnabled !== false,
    emailEnabled: req.body?.emailEnabled !== false,
    sslEnabled: req.body?.sslEnabled !== false,
    dedicatedIp: String(req.body?.dedicatedIp || "").trim(),
    passwordHash: hashPassword(password),
    passwordSet: true,
    homeDirectory,
    documentRoot: path.join(homeDirectory, "public_html"),
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  account.permissions = normalizeAccountPermissions(req.body?.permissions, account);
  account.provisioning = buildAccountProvisioning(req, account);
  try {
    writeStarterSite(account);
    writeAccountProvisioningPlan(account);
    writePanelState(withAuditEvent({ ...state, packages, accounts: [account, ...state.accounts] }, {
      actor: actorFromRequest(req),
      action: "account.created",
      target: username,
      message: `Account ${username} created for ${domain} using ${selectedPackage.name}.`,
      metadata: { domain, runtime: account.runtime, permissionProfile: account.permissionProfile }
    }));
    applyAccountProvisioning(account);
    res.json({ ok: true, account: publicAccount(account) });
  } catch (error: any) {
    res.status(500).json({ ok: false, message: error.message || "Unable to create account files." });
  }
});

app.post("/api/panel/accounts/:username/password", requireCapability("accounts"), (req, res) => {
  const password = String(req.body?.password || "");
  if (password.length < 8) {
    res.status(400).json({ ok: false, message: "New password must be at least 8 characters." });
    return;
  }
  const state = readPanelState();
  let updatedAccount: any = null;
  const accounts = state.accounts.map((account: any) => {
    if (account.username !== req.params.username) return account;
    updatedAccount = {
      ...account,
      passwordHash: hashPassword(password),
      passwordSet: true,
      updatedAt: new Date().toISOString()
    };
    return updatedAccount;
  });
  if (!updatedAccount) {
    res.status(404).json({ ok: false, message: "Account not found." });
    return;
  }
  writePanelState(withAuditEvent({ ...state, accounts }, {
    actor: actorFromRequest(req),
    action: "account.password.updated",
    target: req.params.username,
    message: `Password reset for ${req.params.username}.`,
    severity: "warning"
  }));
  res.json({ ok: true, account: publicAccount(updatedAccount), accounts: accounts.map(publicAccount) });
});

app.post("/api/panel/accounts/:username/permissions", requireCapability("accounts"), (req, res) => {
  const state = readPanelState();
  let updatedAccount: any = null;
  const requestedProfile = req.body?.permissionProfile || req.body?.profile;
  const accounts = state.accounts.map((account: any) => {
    if (account.username !== req.params.username) return account;
    const permissionProfile = requestedProfile ? normalizePermissionProfile(requestedProfile) : normalizePermissionProfile(account.permissionProfile);
    const basePermissions = requestedProfile ? permissionsForProfile(permissionProfile) : (account.permissions || {});
    updatedAccount = {
      ...account,
      permissionProfile,
      permissions: normalizeAccountPermissions({ ...basePermissions, ...(req.body?.permissions || {}) }, { ...account, permissionProfile }),
      updatedAt: new Date().toISOString()
    };
    return updatedAccount;
  });
  if (!updatedAccount) {
    res.status(404).json({ ok: false, message: "Account not found." });
    return;
  }
  writePanelState(withAuditEvent({ ...state, accounts }, {
    actor: actorFromRequest(req),
    action: "account.permissions.updated",
    target: req.params.username,
    message: requestedProfile
      ? `Permission profile changed to ${updatedAccount.permissionProfile} for ${req.params.username}.`
      : `Access permissions updated for ${req.params.username}.`,
    metadata: { permissionProfile: updatedAccount.permissionProfile }
  }));
  res.json({ ok: true, account: publicAccount(updatedAccount), accounts: accounts.map(publicAccount) });
});

app.post("/api/panel/accounts/:username/provision", requireCapability("accounts"), (req, res) => {
  const state = readPanelState();
  const account = state.accounts.find((item: any) => item.username === req.params.username);
  if (!account) {
    res.status(404).json({ ok: false, message: "Account not found." });
    return;
  }
  if (account.status !== "active") {
    res.status(409).json({ ok: false, message: "Only active accounts can be provisioned." });
    return;
  }
  const updated = updateStoredAccount(account.username, (current: any) => ({
    ...current,
    provisioning: current.provisioning || buildAccountProvisioning(req, current),
    updatedAt: new Date().toISOString()
  })) || account;
  appendProvisioningLog(updated, "Manual provisioning retry requested from tPanel admin.");
  applyAccountProvisioning(updated);
  writePanelState(withAuditEvent(readPanelState(), {
    actor: actorFromRequest(req),
    action: "account.provision.retry",
    target: req.params.username,
    message: `Provisioning retry queued for ${req.params.username}.`
  }));
  res.json({ ok: true, account: publicAccount(updated), provisioningLog: readProvisioningLog(updated.username) });
});

app.post("/api/panel/accounts/:username/:action", requireCapability("accounts"), (req, res) => {
  const action = String(req.params.action || "");
  const deleteActions = new Set(["terminate", "delete", "permanent-delete"]);
  const allowed = new Set(["suspend", "unsuspend", ...deleteActions]);
  if (!allowed.has(action)) {
    res.status(400).json({ ok: false, message: "Unsupported account action." });
    return;
  }
  const state = readPanelState();
  if (deleteActions.has(action)) {
    const deleted = hardDeleteAccount(state, req.params.username, actorFromRequest(req));
    if (!deleted.account) {
      res.status(404).json({ ok: false, message: "Account not found." });
      return;
    }
    res.json({ ok: true, account: publicAccount(deleted.account), accounts: deleted.state.accounts.map(publicAccount) });
    return;
  }
  let updatedAccount: any = null;
  const accounts = state.accounts.map((account: any) => {
    if (account.username !== req.params.username) return account;
    const updated = {
      ...account,
      status: action === "unsuspend" ? "active" : "suspended",
      updatedAt: new Date().toISOString()
    };
    if (updated.provisioning) {
      updated.provisioning = {
        ...updated.provisioning,
        ssl: { ...updated.provisioning.ssl, status: action === "suspend" || action === "terminate" ? "paused" : updated.provisioning.ssl?.status || "queued" },
        vhost: { ...updated.provisioning.vhost, status: action === "suspend" || action === "terminate" ? "disabled" : "queued" }
      };
      writeAccountProvisioningPlan(updated);
    }
    updatedAccount = updated;
    return updated;
  });
  if (!updatedAccount) {
    res.status(404).json({ ok: false, message: "Account not found." });
    return;
  }
  writePanelState(withAuditEvent({ ...state, accounts }, {
    actor: actorFromRequest(req),
    action: `account.${action}`,
    target: req.params.username,
    message: `${req.params.username} ${action} command completed.`,
    severity: "warning"
  }));
  res.json({ ok: true, account: publicAccount(updatedAccount), accounts: accounts.map(publicAccount) });
});

app.get("/api/panel/update-status", async (req, res) => {
  const license = await verifyLicense(req, { force: true });
  const currentVersion = process.env.TPANEL_VERSION || process.env.npm_package_version || "0.0.0";
  const update = license.update || null;
  res.json({
    ok: true,
    currentVersion,
    update,
    updateRequired: Boolean(update?.isForced && update?.version && update.version !== currentVersion)
  });
});

app.post("/api/panel/services/:name/:action", requireCapability("services"), async (req, res) => {
  const services: Record<string, string> = {
    nginx: "nginx",
    apache: "apache2",
    apache2: "apache2",
    mariadb: "mariadb",
    mysql: "mysql",
    postgresql: "postgresql",
    redis: "redis-server",
    postfix: "postfix",
    dovecot: "dovecot",
    tpanel: "tpanel"
  };
  const actions = new Set(["restart", "reload", "start", "stop"]);
  const service = services[String(req.params.name || "").toLowerCase()];
  const action = String(req.params.action || "").toLowerCase();
  if (!service || !actions.has(action)) {
    res.status(400).json({ ok: false, message: "Unsupported service control request." });
    return;
  }
  try {
    const { stdout, stderr } = await execFileAsync("systemctl", [action, service], { timeout: 120000 });
    res.json({ ok: true, service, action, output: `${stdout || ""}${stderr || ""}`.trim() });
  } catch (error: any) {
    res.status(500).json({ ok: false, service, action, message: error.message || "Service command failed." });
  }
});

const DEFAULT_AI_MODEL = ["ge", "mini-3.5-flash"].join("");

// Lazy-initialize the AI client to avoid crashes if the API key is not yet set.
let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.AI_API_KEY || process.env["G" + "EMINI_API_KEY"];
    if (!apiKey) {
      throw new Error("AI_API_KEY is not defined. Please add it to your server environment.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// AI Copilot prompt handler
app.post("/api/ai", async (req, res) => {
  try {
    const { prompt, history } = req.body;
    if (!prompt) {
       res.status(400).json({ error: "Prompt is required" });
       return;
    }

    const ai = getAIClient();
    const systemInstruction = 
      "You are the tPanel Smart AI Copilot. You are an expert system administrator, backup engineer, Node.js DevOps pro, and database manager. " +
      "Help the user manage, configure, search, or deploy within their licensed hosting dashboard. " +
      "If they ask to write code files (like index.js, public_html/index.html, package.json, server.js), mysql queries, DNS TXT/MX records, or need debugging help with high CPU/memory logs, give them professional, accurate, and extremely clean replies. " +
      "Always output your code blocks using proper markdown syntax so the interface can display and allow copying them easily.";

    // If chat history is provided, we can use the chat API
    if (history && Array.isArray(history) && history.length > 0) {
      // Map history entries to simple contents or messages
      // @google/genai chats.create takes model and config
      const chat = ai.chats.create({
        model: process.env.AI_MODEL || DEFAULT_AI_MODEL,
        config: {
          systemInstruction,
        }
      });

      // To preserve history context, we can construct standard chats or send the final grouped query
      // Let's do a simple generation with history flattened, or send as chats if desired.
      // A safe way is to call generateContent with contents array matching @google/genai schema or flattened conversation.
      // Let's feed standard contents array with user feedback
      const contents = history.map((h: any) => ({
        role: h.role === "assistant" || h.role === "model" ? "model" : "user",
        parts: [{ text: h.text }]
      }));
      contents.push({
        role: "user",
        parts: [{ text: prompt }]
      });

      const response = await ai.models.generateContent({
        model: process.env.AI_MODEL || DEFAULT_AI_MODEL,
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });
      res.json({ text: response.text });
    } else {
      // Direct single content generation
      const response = await ai.models.generateContent({
        model: process.env.AI_MODEL || DEFAULT_AI_MODEL,
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });
      res.json({ text: response.text });
    }
  } catch (error: any) {
    console.error("AI provider API error:", error);
    res.status(500).json({ 
      error: error.message || "An error occurred with the AI provider API. Please make sure AI_API_KEY is configured in your environment."
    });
  }
});

// Port and server launch
async function run() {
  ensureMaintenanceScripts();
  reconcileWebRouting();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server started on http://0.0.0.0:${PORT}`);
  });
}

run();
