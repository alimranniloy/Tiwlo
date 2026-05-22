import express from "express";
import path from "path";
import os from "os";
import fs from "fs";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { execFile } from "child_process";
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
    "php-xml", "php-gd", "php-intl", "php-bcmath", "php-soap", "php-opcache", "mariadb-server", "bind9", "dnsutils",
    "unzip", "tar", "rsync", "logrotate", "cron", "acl"
  ],
  dnf: [
    "nginx", "certbot", "python3-certbot-nginx", "php-fpm", "php-cli", "php-mysqlnd", "php-curl", "php-zip", "php-mbstring",
    "php-xml", "php-gd", "php-intl", "php-bcmath", "php-soap", "php-opcache", "mariadb-server", "bind", "bind-utils",
    "unzip", "tar", "rsync", "logrotate", "cronie", "acl"
  ],
  yum: [
    "nginx", "certbot", "python3-certbot-nginx", "php-fpm", "php-cli", "php-mysqlnd", "php-curl", "php-zip", "php-mbstring",
    "php-xml", "php-gd", "php-intl", "php-bcmath", "php-soap", "php-opcache", "mariadb-server", "bind", "bind-utils",
    "unzip", "tar", "rsync", "logrotate", "cronie", "acl"
  ]
};

const HOSTING_STACK_CHECKS = [
  { id: "nginx", label: "Nginx Web Server", command: "nginx", services: ["nginx"], packageNames: { apt: "nginx", dnf: "nginx", yum: "nginx" } },
  { id: "certbot", label: "Auto SSL Certbot", command: "certbot", services: [], packageNames: { apt: "certbot", dnf: "certbot", yum: "certbot" } },
  { id: "php", label: "PHP Runtime", command: "php", services: ["php*-fpm"], packageNames: { apt: "php-fpm", dnf: "php-fpm", yum: "php-fpm" } },
  { id: "mysql", label: "MariaDB/MySQL", command: "mysql", services: ["mariadb", "mysql"], packageNames: { apt: "mariadb-server", dnf: "mariadb-server", yum: "mariadb-server" } },
  { id: "dns", label: "DNS Tools", command: "dig", services: ["bind9", "named"], packageNames: { apt: "dnsutils", dnf: "bind-utils", yum: "bind-utils" } },
  { id: "node", label: "Node.js Runtime", command: "node", services: [], packageNames: { apt: "nodejs", dnf: "nodejs", yum: "nodejs" } }
];

app.use(express.json());

const DEFAULT_PACKAGES = [
  { id: "pkg-starter", name: "Starter", quotaMb: 1024, bandwidthGb: 25, domains: 1, emailAccounts: 5, databases: 2, ftpAccounts: 2, nodeApps: 1 },
  { id: "pkg-business", name: "Business", quotaMb: 10240, bandwidthGb: 250, domains: 10, emailAccounts: 50, databases: 10, ftpAccounts: 10, nodeApps: 5 },
  { id: "pkg-agency", name: "Agency", quotaMb: 51200, bandwidthGb: 1000, domains: 50, emailAccounts: 250, databases: 50, ftpAccounts: 50, nodeApps: 25 }
];

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
    fs.writeFileSync(path.join(publicDir, "index.php"), `<?php
$site = "${account.domain}";
echo "<h1>Welcome to {$site}</h1><p>PHP hosting is ready on tPanel.</p>";
`);
    fs.writeFileSync(path.join(publicDir, ".user.ini"), `memory_limit=${account.phpMemoryMb || 256}M
upload_max_filesize=${account.uploadLimitMb || 64}M
post_max_size=${account.uploadLimitMb || 64}M
`);
  } else {
    fs.writeFileSync(path.join(publicDir, "index.html"), `<!doctype html>
<html><head><meta charset="utf-8"><title>${account.domain}</title></head>
<body><h1>${account.domain}</h1><p>Static hosting is ready on tPanel.</p></body></html>
`);
  }
}

function requestIp(req: express.Request) {
  const forwarded = req.headers["x-forwarded-for"];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return TPANEL_SERVER_IP || String(value || req.ip || req.socket.remoteAddress || "").replace(/^::ffff:/, "");
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
  const serverIp = TPANEL_SERVER_IP || (req ? requestIp(req) : "") || "";
  return {
    primaryDomain: "tiwlo.com",
    panelUrl: "https://tiwlo.com",
    detectedServerIp: serverIp,
    autoDetectIp: true,
    enableNginxProxy: true,
    enableSsl: true,
    dnsRecords: [
      { type: "A", name: "@", value: serverIp || "SERVER_IP", ttl: 300 },
      { type: "A", name: "www", value: serverIp || "SERVER_IP", ttl: 300 }
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
        dnsRecords: saved.dnsRecords || [
          { type: "A", name: "@", value: detectedServerIp || "SERVER_IP", ttl: 300 },
          { type: "A", name: "www", value: detectedServerIp || "SERVER_IP", ttl: 300 }
        ],
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
  if (cleaned && cleaned.includes(".")) return cleaned;
  const settings = readDomainSettings(req);
  const baseDomain = cleanDomain(settings.primaryDomain || "tiwlo.com");
  const label = sanitizeSlug(cleaned || username, username).replace(/[^a-z0-9-]/g, "").slice(0, 63) || username;
  return `${label}.${baseDomain}`;
}

function buildAccountProvisioning(req: express.Request, account: any) {
  const settings = readDomainSettings(req);
  const serverIp = account.dedicatedIp || settings.detectedServerIp || requestIp(req) || "SERVER_IP";
  const primaryDomain = cleanDomain(settings.primaryDomain || "tiwlo.com");
  const autoSubdomain = account.domain.endsWith(`.${primaryDomain}`);
  const aliases = [`www.${account.domain}`];
  return {
    primaryDomain,
    autoSubdomain,
    dnsRecords: [
      { type: "A", host: account.domain, value: serverIp, ttl: 300, status: "ready" },
      { type: "CNAME", host: aliases[0], value: account.domain, ttl: 300, status: "ready" },
      { type: "A", host: `ftp.${account.domain}`, value: serverIp, ttl: 300, status: account.ftpEnabled ? "ready" : "disabled" },
      { type: "A", host: `mail.${account.domain}`, value: serverIp, ttl: 300, status: account.emailEnabled ? "ready" : "disabled" }
    ],
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
  const serverNames = [account.domain, ...(account.provisioning?.vhost?.aliases || [])].join(" ");
  if (account.runtime === "node") {
    return `server {
    listen 80;
    server_name ${serverNames};

    location / {
        proxy_pass http://127.0.0.1:${Number(account.nodePort || 3000)};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
`;
  }

  const phpSock = `/run/php/php${String(account.phpVersion || "8.3").replace(/[^0-9.]/g, "")}-fpm.sock`;
  return `server {
    listen 80;
    server_name ${serverNames};
    root ${account.documentRoot};
    index index.php index.html index.htm;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \\.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:${phpSock};
    }

    location ~ /\\. {
        deny all;
    }
}
`;
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

function applyAccountProvisioning(account: any) {
  if (process.platform === "win32") return;
  const siteName = `tpanel-${account.username}`;
  const availablePath = `/etc/nginx/sites-available/${siteName}.conf`;
  const enabledPath = `/etc/nginx/sites-enabled/${siteName}.conf`;
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
    const domains = [account.domain, ...(account.provisioning?.vhost?.aliases || [])];
    const args = ["--nginx", "--non-interactive", "--agree-tos", "--redirect", "-m", email, ...domains.flatMap((domain: string) => ["-d", domain])];
    execFile("certbot", args, { timeout: 180000 }, (certbotError, certbotStdout, certbotStderr) => {
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

async function verifyLicense(req: express.Request, options: { force?: boolean } = {}) {
  if (!TPANEL_LICENSE_KEY) {
    return { ok: false, status: "unlicensed", message: "TPANEL_LICENSE_KEY is missing. Run sudo tpanel-license-renew with a valid key, or reinstall from Tiwlo." };
  }

  const cacheKey = `${TPANEL_LICENSE_KEY}:${TPANEL_SERVER_IP || requestIp(req)}`;
  if (!options.force && licenseCache?.key === cacheKey && licenseCache.expiresAt > Date.now()) {
    return licenseCache.value;
  }

  const payload = {
    licenseKey: TPANEL_LICENSE_KEY,
    serverIp: requestIp(req),
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
  res.json({ ok: true, settings: readDomainSettings(req) });
});

app.post("/api/panel/domain-settings", requireCapability("dns"), async (req, res) => {
  const current = readDomainSettings(req);
  const primaryDomain = cleanDomain(req.body?.primaryDomain || current.primaryDomain);
  const detectedServerIp = req.body?.autoDetectIp === false
    ? String(req.body?.detectedServerIp || current.detectedServerIp || "")
    : requestIp(req);
  const settings = {
    ...current,
    ...req.body,
    primaryDomain,
    panelUrl: req.body?.panelUrl || `${req.body?.enableSsl === false ? "http" : "https"}://${primaryDomain}`,
    detectedServerIp,
    dnsRecords: [
      { type: "A", name: "@", value: detectedServerIp || "SERVER_IP", ttl: 300 },
      { type: "A", name: "www", value: detectedServerIp || "SERVER_IP", ttl: 300 }
    ],
    ports: REQUIRED_PORTS,
    updatedAt: new Date().toISOString()
  };
  writeDomainSettings(settings);
  res.json({ ok: true, settings });
});

app.get("/api/panel/system-status", async (req, res) => {
  const [ports, firewall] = await Promise.all([listeningPorts(), firewallStatus()]);
  const portSet = new Set(ports);
  const allowedSet = new Set(firewall.allowedPorts);
  const settings = readDomainSettings(req);
  res.json({
    ok: true,
    hostname: os.hostname(),
    detectedServerIp: settings.detectedServerIp || requestIp(req),
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
    const { stdout, stderr } = await execFileAsync("sh", ["-lc", `${installCommand}; systemctl enable --now nginx >/dev/null 2>&1 || true; systemctl enable --now mariadb >/dev/null 2>&1 || systemctl enable --now mysql >/dev/null 2>&1 || true; for svc in $(systemctl list-unit-files --type=service 'php*-fpm.service' 2>/dev/null | awk '/php.*-fpm\\.service/ {print $1}'); do systemctl enable --now "$svc" >/dev/null 2>&1 || true; done`], { timeout: 900000 });
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

app.post("/api/panel/accounts", requireCapability("accounts"), (req, res) => {
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
  if (state.accounts.some((account: any) => account.username === username || account.domain === domain)) {
    res.status(409).json({ ok: false, message: "An account with this username or domain already exists." });
    return;
  }
  const selectedPackage = state.packages.find((pkg: any) => pkg.id === req.body?.packageId) || state.packages[0] || DEFAULT_PACKAGES[0];
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
    writePanelState(withAuditEvent({ ...state, accounts: [account, ...state.accounts] }, {
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
  const allowed = new Set(["suspend", "unsuspend", "terminate"]);
  if (!allowed.has(action)) {
    res.status(400).json({ ok: false, message: "Unsupported account action." });
    return;
  }
  const state = readPanelState();
  const accounts = state.accounts.map((account: any) => {
    if (account.username !== req.params.username) return account;
    const updated = {
      ...account,
      status: action === "unsuspend" ? "active" : action === "terminate" ? "terminated" : "suspended",
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
    return updated;
  });
  writePanelState(withAuditEvent({ ...state, accounts }, {
    actor: actorFromRequest(req),
    action: `account.${action}`,
    target: req.params.username,
    message: `${req.params.username} ${action} command completed.`,
    severity: action === "terminate" ? "danger" : "warning"
  }));
  res.json({ ok: true, accounts: accounts.map(publicAccount) });
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

// Lazy-initialize Gemini client to avoid crashes if API key is not yet set
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined. Please add it to your Settings > Secrets.");
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

    const ai = getGeminiClient();
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
        model: "gemini-3.5-flash",
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
        model: "gemini-3.5-flash",
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
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });
      res.json({ text: response.text });
    }
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ 
      error: error.message || "An error occurred with the Gemini API. Please make sure the GEMINI_API_KEY is configured in your Secrets."
    });
  }
});

// Port and server launch
async function run() {
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
