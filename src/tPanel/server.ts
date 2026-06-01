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
    "nginx", "certbot", "python3-certbot-nginx", "php-fpm", "php-cli", "php-mysql", "php-curl", "php-zip", "php-mbstring",
    "php-xml", "php-gd", "php-intl", "php-bcmath", "php-soap", "php-opcache", "mariadb-server", "pdns-server", "pdns-backend-mysql", "dnsutils",
    "postfix", "dovecot-core", "dovecot-imapd", "dovecot-pop3d", "opendkim", "opendkim-tools", "rspamd", "mailutils", "libsasl2-modules",
    "zip", "unzip", "tar", "rsync", "logrotate", "cron", "acl"
  ],
  dnf: [
    "nginx", "certbot", "python3-certbot-nginx", "php-fpm", "php-cli", "php-mysqlnd", "php-curl", "php-zip", "php-mbstring",
    "php-xml", "php-gd", "php-intl", "php-bcmath", "php-soap", "php-opcache", "mariadb-server", "pdns", "pdns-backend-mysql", "bind-utils",
    "postfix", "dovecot", "opendkim", "opendkim-tools", "rspamd", "mailx", "cyrus-sasl", "cyrus-sasl-plain",
    "zip", "unzip", "tar", "rsync", "logrotate", "cronie", "acl"
  ],
  yum: [
    "nginx", "certbot", "python3-certbot-nginx", "php-fpm", "php-cli", "php-mysqlnd", "php-curl", "php-zip", "php-mbstring",
    "php-xml", "php-gd", "php-intl", "php-bcmath", "php-soap", "php-opcache", "mariadb-server", "pdns", "pdns-backend-mysql", "bind-utils",
    "postfix", "dovecot", "opendkim", "opendkim-tools", "rspamd", "mailx", "cyrus-sasl", "cyrus-sasl-plain",
    "zip", "unzip", "tar", "rsync", "logrotate", "cronie", "acl"
  ]
};

const HOSTING_STACK_CHECKS = [
  { id: "nginx", label: "Nginx Web Server", command: "nginx", services: ["nginx"], packageNames: { apt: "nginx", dnf: "nginx", yum: "nginx" } },
  { id: "certbot", label: "Auto SSL Certbot", command: "certbot", services: [], packageNames: { apt: "certbot", dnf: "certbot", yum: "certbot" } },
  { id: "php", label: "PHP Runtime", command: "php", services: ["php*-fpm"], packageNames: { apt: "php-fpm", dnf: "php-fpm", yum: "php-fpm" } },
  { id: "mysql", label: "MariaDB/MySQL", command: "mysql", services: ["mariadb", "mysql"], packageNames: { apt: "mariadb-server", dnf: "mariadb-server", yum: "mariadb-server" } },
  { id: "dns", label: "PowerDNS Authoritative", command: "pdns_server", services: ["pdns"], packageNames: { apt: "pdns-server", dnf: "pdns", yum: "pdns" } },
  { id: "mail", label: "Mail Stack", command: "postfix", services: ["postfix", "dovecot"], packageNames: { apt: "postfix", dnf: "postfix", yum: "postfix" } },
  { id: "node", label: "Node.js Runtime", command: "node", services: [], packageNames: { apt: "nodejs", dnf: "nodejs", yum: "nodejs" } }
];

app.use(express.json({ limit: "25mb" }));

const DEFAULT_PACKAGES = [
  { id: "pkg-starter", name: "Starter", quotaMb: 1024, bandwidthGb: 25, domains: 1, emailAccounts: 5, databases: 2, ftpAccounts: 2, nodeApps: 1 },
  { id: "pkg-business", name: "Business", quotaMb: 10240, bandwidthGb: 250, domains: 10, emailAccounts: 50, databases: 10, ftpAccounts: 10, nodeApps: 5 },
  { id: "pkg-agency", name: "Agency", quotaMb: 51200, bandwidthGb: 1000, domains: 50, emailAccounts: 250, databases: 50, ftpAccounts: 50, nodeApps: 25 }
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
  permissions.node = Boolean(permissions.node && Number(account.maxNodeApps ?? account.nodeApps ?? 1) !== 0);
  return Object.fromEntries(Object.entries(permissions).map(([key, value]) => [key, Boolean(value)]));
}

function publicAccount(account: any) {
  const safe = { ...(account || {}) };
  delete safe.passwordHash;
  safe.passwordSet = Boolean(account?.passwordSet || account?.passwordHash);
  safe.permissionProfile = normalizePermissionProfile(safe.permissionProfile);
  safe.permissions = normalizeAccountPermissions(account?.permissions, account);
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
    fs.writeFileSync(path.join(publicDir, ".user.ini"), `memory_limit=${account.phpMemoryMb || 256}M
upload_max_filesize=${account.uploadLimitMb || 64}M
post_max_size=${account.uploadLimitMb || 64}M
`);
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

function requestIp(req: express.Request) {
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

function buildAccountProvisioning(req: express.Request, account: any) {
  const settings = readDomainSettings(req);
  const serverIp = account.dedicatedIp || settings.detectedServerIp || configuredServerIp(req) || "SERVER_IP";
  const primaryDomain = cleanDomain(settings.primaryDomain || "tiwlo.com");
  const autoSubdomain = account.domain.endsWith(`.${primaryDomain}`);
  const aliases = [`www.${account.domain}`];
  return {
    primaryDomain,
    autoSubdomain,
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
    { serverNames: primaryNames, documentRoot: account.documentRoot },
    ...accountSubdomainRoutes(account).map((route: any) => ({
      serverNames: [route.domain, ...(route.aliases || [])],
      documentRoot: route.documentRoot
    }))
  ].filter((route) => route.serverNames.length);

  return routes.map((route) => [
    nginxHttpServerBlock(account, route.serverNames, route.documentRoot, Boolean(account.sslEnabled && ssl.ready)),
    account.sslEnabled && ssl.ready ? nginxHttpsServerBlock(account, route.serverNames, route.documentRoot) : ""
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
  const conf = `server {
    listen 80;
    server_name ${domain} www.${domain};

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

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

function phpFpmSocket(account: any) {
  return `/run/php/php${String(account.phpVersion || "8.3").replace(/[^0-9.]/g, "")}-fpm.sock`;
}

function nginxContentBlock(account: any, documentRoot: string) {
  const root = toUnixPath(documentRoot);
  if (account.runtime === "node" && path.resolve(documentRoot) === path.resolve(account.documentRoot)) {
    return `    location /.well-known/acme-challenge/ {
        root ${root};
    }

    location / {
        proxy_pass http://127.0.0.1:${Number(account.nodePort || 3000)};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }`;
  }

  return `    root ${root};
    index index.php index.html index.htm;

    location /.well-known/acme-challenge/ {
        root ${root};
    }

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \\.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:${phpFpmSocket(account)};
    }

    location ~ /\\. {
        deny all;
    }`;
}

function nginxHttpServerBlock(account: any, serverNames: string[], documentRoot: string, redirectToHttps: boolean) {
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

${nginxContentBlock(account, documentRoot)}
}
`;
}

function nginxHttpsServerBlock(account: any, serverNames: string[], documentRoot: string) {
  const names = uniqueCleanDomains(serverNames).join(" ");
  const ssl = accountSslPaths(account);
  return `server {
    listen 443 ssl http2;
    server_name ${names};

    ssl_certificate ${ssl.certificate};
    ssl_certificate_key ${ssl.certificateKey};
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

${nginxContentBlock(account, documentRoot)}
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

function reconcileWebRouting() {
  if (process.platform === "win32") return;
  const state = readPanelState();
  const accounts = activePanelAccounts(state);
  if (accounts.length) ensureWebIngress();

  let changed = false;
  for (const account of accounts) {
    removePanelProxyForDomain(account.domain);
    const siteName = `tpanel-${account.username}`;
    const availablePath = `/etc/nginx/sites-available/${siteName}.conf`;
    const enabledPath = `/etc/nginx/sites-enabled/${siteName}.conf`;
    const sslMissing = account.sslEnabled !== false && !accountSslPaths(account).ready;
    if (!fs.existsSync(availablePath) || !fs.existsSync(enabledPath) || sslMissing) {
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

function applyAccountFileOwnership(account: any, targetPath: string) {
  if (process.platform === "win32" || !account?.username) return;
  execFile("chown", ["-R", `${account.username}:${account.username}`, targetPath], { timeout: 120000 }, () => undefined);
}

async function finalizeExtractedFiles(account: any, targetPath: string) {
  if (process.platform === "win32" || !account?.username) return;
  await execFileAsync("chown", ["-R", `${account.username}:${account.username}`, targetPath], { timeout: 300000 });
  await execFileAsync("sh", ["-lc", `
chmod -R u+rwX,go+rX "$TARGET_PATH" >/dev/null 2>&1 || true
find "$TARGET_PATH" -type f \\( -name ".env" -o -name "*.key" -o -name "*.pem" -o -name "id_rsa" \\) -exec chmod 600 {} + >/dev/null 2>&1 || true
`], { env: { ...process.env, TARGET_PATH: targetPath }, timeout: 300000 });
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
  const quotaMb = Number(account.quotaMb || account.limits?.diskMB || account.limits?.disk || 0);
  return Number.isFinite(quotaMb) && quotaMb > 0 ? quotaMb * 1024 * 1024 : Number.POSITIVE_INFINITY;
}

function maxExtractEntries(account: any) {
  const quotaMb = Number(account.quotaMb || account.limits?.diskMB || 1024);
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

function readAccountFiles(account: any) {
  const baseDir = path.resolve(account.homeDirectory);
  const ignoredEntries = new Set(["node_modules", ".git", ".cache", ".tpanel-tmp", ".tpanel_suspended"]);
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
  let count = 1;

  const walk = (currentPath: string, parentId: string, depth: number) => {
    if (depth > 8 || count > 700 || !fs.existsSync(currentPath)) return;
    const entries = fs.readdirSync(currentPath, { withFileTypes: true })
      .filter((entry) => !ignoredEntries.has(entry.name))
      .sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (count > 700) break;
      const filePath = ensureInside(baseDir, path.join(currentPath, entry.name));
      const stat = fs.statSync(filePath);
      const relative = path.relative(baseDir, filePath).replace(/\\/g, "/");
      const id = relative ? `fs-${Buffer.from(relative).toString("base64url")}` : "root-dir";
      const item: any = {
        id,
        name: entry.name,
        type: entry.isDirectory() ? "directory" : "file",
        parentId,
        size: stat.size,
        updatedAt: stat.mtime.toISOString().replace("T", " ").substring(0, 19),
        permissions: entry.isDirectory() ? "0755" : "0644"
      };
      if (!entry.isDirectory() && stat.size <= 262144 && isEditableTextFile(entry.name)) {
        try {
          item.content = fs.readFileSync(filePath, "utf8");
        } catch {
          item.content = "";
        }
      }
      items.push(item);
      count += 1;
      if (entry.isDirectory()) walk(filePath, id, depth + 1);
    }
  };

  fs.mkdirSync(path.join(baseDir, "public_html"), { recursive: true });
  walk(baseDir, "root-dir", 0);
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

function fileOperationResponse(account: any, extra: any = {}) {
  return { ok: true, ...extra, files: readAccountFiles(account) };
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
      nodeApps: account.maxNodeApps || account.nodeApps || 1
    },
    provisioning: account.provisioning || null,
    provisioningLog: readProvisioningLog(account.username),
    permissions: normalizeAccountPermissions(account.permissions, account)
  });
});

app.get("/api/user/files", requireLicense, async (req, res) => {
  const account = requireUserAccount(req, res);
  if (!account) return;
  try {
    res.json({ ok: true, files: readAccountFiles(account) });
  } catch (error: any) {
    res.status(500).json({ ok: false, message: error.message || "Unable to read account files." });
  }
});

app.post("/api/user/files", requireLicense, async (req, res) => {
  const account = requireUserAccount(req, res);
  if (!account) return;
  if (!ensureFileManagerAccess(req, res, account)) return;
  try {
    const files = writeVirtualFilesToAccount(account, req.body?.files || []);
    res.json({ ok: true, files });
  } catch (error: any) {
    res.status(500).json({ ok: false, message: error.message || "Unable to write account files." });
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
    res.json(fileOperationResponse(account, { uploaded: path.basename(targetPath), size: receivedBytes }));
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
    res.json(fileOperationResponse(account, { itemId: virtualIdForRelative(relative), name: path.basename(targetPath) }));
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
    res.json(fileOperationResponse(account, { saved: path.basename(targetPath) }));
  } catch (error: any) {
    res.status(500).json({ ok: false, message: error.message || "Unable to save file." });
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
    res.json(fileOperationResponse(account, { renamed: path.basename(targetPath) }));
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
    res.json(fileOperationResponse(account, { permissions: `0${modeText}` }));
  } catch (error: any) {
    res.status(500).json({ ok: false, message: error.message || "Unable to change permissions." });
  }
});

app.post("/api/user/files/delete", requireLicense, async (req, res) => {
  const account = requireUserAccount(req, res);
  if (!account) return;
  if (!ensureFileManagerAccess(req, res, account)) return;
  try {
    const paths = sourcePathsForIds(account, parseFileOperationBody(req).ids || []);
    for (const targetPath of paths.sort((a, b) => b.length - a.length)) {
      if (fs.existsSync(targetPath)) fs.rmSync(targetPath, { recursive: true, force: true });
    }
    fs.mkdirSync(path.join(account.homeDirectory, "public_html"), { recursive: true });
    res.json(fileOperationResponse(account, { deleted: paths.length }));
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
    res.json(fileOperationResponse(account, { copied: sources.length }));
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
    res.json(fileOperationResponse(account, { moved: sources.length }));
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
    const folderName = `${path.basename(archivePath, path.extname(archivePath))}_extracted`;
    const targetDir = uniquePath(ensureInside(account.homeDirectory, path.join(destinationBase, folderName)));
    try {
      fs.mkdirSync(targetDir, { recursive: true });
      await execFileAsync("unzip", ["-qq", archivePath, "-d", targetDir], { timeout: timeoutForBytes(archiveInfo.uncompressedBytes), maxBuffer: 1024 * 1024 });
      await ensureAccountStorageAvailable(account, 0, "Archive extraction");
      await finalizeExtractedFiles(account, targetDir);
      res.json(fileOperationResponse(account, {
        extractedTo: path.basename(targetDir),
        entries: archiveInfo.entries,
        extractedBytes: archiveInfo.uncompressedBytes
      }));
    } catch (error) {
      if (fs.existsSync(targetDir)) fs.rmSync(targetDir, { recursive: true, force: true });
      throw error;
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
    res.json(fileOperationResponse(account, { archive: path.basename(archivePath) }));
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
    const { stdout, stderr } = await execFileAsync("sh", ["-lc", `${installCommand}; systemctl enable --now nginx >/dev/null 2>&1 || true; systemctl enable --now mariadb >/dev/null 2>&1 || systemctl enable --now mysql >/dev/null 2>&1 || true; systemctl enable --now postfix >/dev/null 2>&1 || true; systemctl enable --now dovecot >/dev/null 2>&1 || true; systemctl enable --now opendkim >/dev/null 2>&1 || true; systemctl enable --now rspamd >/dev/null 2>&1 || true; if command -v ufw >/dev/null 2>&1; then ufw allow 80/tcp >/dev/null 2>&1 || true; ufw allow 443/tcp >/dev/null 2>&1 || true; fi; if command -v firewall-cmd >/dev/null 2>&1; then firewall-cmd --permanent --add-service=http >/dev/null 2>&1 || true; firewall-cmd --permanent --add-service=https >/dev/null 2>&1 || true; firewall-cmd --reload >/dev/null 2>&1 || true; fi; for svc in $(systemctl list-unit-files --type=service 'php*-fpm.service' 2>/dev/null | awk '/php.*-fpm\\.service/ {print $1}'); do systemctl enable --now "$svc" >/dev/null 2>&1 || true; done`], { timeout: 900000 });
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

app.post("/api/panel/packages", requireCapability("packages"), (req, res) => {
  const state = readPanelState();
  const id = sanitizeSlug(req.body?.id || req.body?.name || `pkg-${Date.now()}`, "package");
  const pkg = {
    id,
    name: String(req.body?.name || "Custom Package").trim(),
    quotaMb: Number(req.body?.quotaMb || 1024),
    bandwidthGb: Number(req.body?.bandwidthGb || 100),
    domains: Number(req.body?.domains || 1),
    emailAccounts: Number(req.body?.emailAccounts || 10),
    databases: Number(req.body?.databases || 5),
    ftpAccounts: Number(req.body?.ftpAccounts || 5),
    nodeApps: Number(req.body?.nodeApps || 1)
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
  const numberOr = (value: any, fallback: number) => {
    const next = Number(value);
    return Number.isFinite(next) && next > 0 ? next : fallback;
  };
  const selectedPackage = packageName || req.body?.quotaMb || req.body?.bandwidthGb
    ? {
      ...basePackage,
      id: packageId || basePackage.id || sanitizeSlug(packageName || `pkg-${Date.now()}`, "package"),
      name: packageName || basePackage.name,
      quotaMb: numberOr(req.body?.quotaMb, basePackage.quotaMb || 1024),
      bandwidthGb: numberOr(req.body?.bandwidthGb, basePackage.bandwidthGb || 100),
      domains: numberOr(req.body?.maxDomains, basePackage.domains || 1),
      emailAccounts: numberOr(req.body?.maxEmailAccounts, basePackage.emailAccounts || 10),
      databases: numberOr(req.body?.maxDatabases, basePackage.databases || 5),
      ftpAccounts: numberOr(req.body?.ftpAccounts, basePackage.ftpAccounts || 5),
      nodeApps: numberOr(req.body?.maxNodeApps, basePackage.nodeApps || 1)
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
    nodeVersion: String(req.body?.nodeVersion || "20"),
    nodePort: Number(req.body?.nodePort || 3000),
    quotaMb: Number(req.body?.quotaMb || selectedPackage.quotaMb),
    bandwidthGb: Number(req.body?.bandwidthGb || selectedPackage.bandwidthGb),
    maxDomains: Number(req.body?.maxDomains || selectedPackage.domains),
    maxEmailAccounts: Number(req.body?.maxEmailAccounts || selectedPackage.emailAccounts),
    maxDatabases: Number(req.body?.maxDatabases || selectedPackage.databases),
    maxNodeApps: Number(req.body?.maxNodeApps || selectedPackage.nodeApps),
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
