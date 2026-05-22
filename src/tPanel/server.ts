import express from "express";
import path from "path";
import os from "os";
import fs from "fs";
import { createHmac, timingSafeEqual } from "crypto";
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

app.use(express.json());

const DEFAULT_PACKAGES = [
  { id: "pkg-starter", name: "Starter", quotaMb: 1024, bandwidthGb: 25, domains: 1, emailAccounts: 5, databases: 2, ftpAccounts: 2, nodeApps: 1 },
  { id: "pkg-business", name: "Business", quotaMb: 10240, bandwidthGb: 250, domains: 10, emailAccounts: 50, databases: 10, ftpAccounts: 10, nodeApps: 5 },
  { id: "pkg-agency", name: "Agency", quotaMb: 51200, bandwidthGb: 1000, domains: 50, emailAccounts: 250, databases: 50, ftpAccounts: 50, nodeApps: 25 }
];

let licenseCache: { key: string; expiresAt: number; value: any } | null = null;

function sessionSecret() {
  return `${TPANEL_LICENSE_KEY}:${TPANEL_ADMIN_PASSWORD}:${os.hostname()}:tpanel-session`;
}

function signSessionPayload(payload: string) {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

function createSession(role: string) {
  const payload = Buffer.from(JSON.stringify({ role, exp: Date.now() + SESSION_TTL_MS })).toString("base64url");
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

function readPanelState() {
  try {
    if (fs.existsSync(PANEL_STATE_FILE)) {
      const saved = JSON.parse(fs.readFileSync(PANEL_STATE_FILE, "utf8"));
      return {
        packages: Array.isArray(saved.packages) && saved.packages.length ? saved.packages : DEFAULT_PACKAGES,
        accounts: Array.isArray(saved.accounts) ? saved.accounts : [],
        updatedAt: saved.updatedAt || null
      };
    }
  } catch {
    // fall through to defaults
  }
  return { packages: DEFAULT_PACKAGES, accounts: [], updatedAt: null };
}

function writePanelState(state: any) {
  fs.mkdirSync(TPANEL_CONFIG_DIR, { recursive: true });
  fs.writeFileSync(PANEL_STATE_FILE, JSON.stringify({ ...state, updatedAt: new Date().toISOString() }, null, 2));
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

app.get("/api/license/status", async (req, res) => {
  try {
    res.json(await verifyLicense(req));
  } catch (error: any) {
    res.status(503).json({ ok: false, status: "offline", message: error.message || "License check failed" });
  }
});

app.get("/api/auth/session", async (req, res) => {
  try {
    const header = String(req.headers.authorization || "");
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    const session = verifySession(token);
    if (!session) {
      res.status(401).json({ ok: false });
      return;
    }
    const license = await verifyLicense(req);
    if (!license.ok) {
      res.status(402).json(license);
      return;
    }
    res.json({ ok: true, role: session.role, expiresAt: session.exp });
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
    res.status(401).json({ ok: false, message: "Invalid tPanel username or password." });
  } catch (error: any) {
    res.status(503).json({ ok: false, message: error.message || "Unable to sign in." });
  }
});

app.use("/api/panel", requireLicense);

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

app.get("/api/panel/accounts", requireCapability("accounts"), (_req, res) => {
  const state = readPanelState();
  res.json({ ok: true, accounts: state.accounts, packages: state.packages, updatedAt: state.updatedAt });
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
  writePanelState({ ...state, packages });
  res.json({ ok: true, package: pkg, packages });
});

app.post("/api/panel/accounts", requireCapability("accounts"), (req, res) => {
  const state = readPanelState();
  const username = sanitizeSlug(req.body?.username, "account").replace(/[^a-z0-9_]/g, "").slice(0, 16);
  const domain = cleanDomain(req.body?.domain || `${username}.local`);
  if (!username || username.length < 3) {
    res.status(400).json({ ok: false, message: "Username must be at least 3 characters." });
    return;
  }
  if (state.accounts.some((account: any) => account.username === username || account.domain === domain)) {
    res.status(409).json({ ok: false, message: "An account with this username or domain already exists." });
    return;
  }
  const selectedPackage = state.packages.find((pkg: any) => pkg.id === req.body?.packageId) || state.packages[0] || DEFAULT_PACKAGES[0];
  const homeDirectory = path.join(ACCOUNT_BASE_DIR, username);
  const account = {
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
    ftpEnabled: req.body?.ftpEnabled !== false,
    shellAccess: Boolean(req.body?.shellAccess),
    mysqlEnabled: req.body?.mysqlEnabled !== false,
    emailEnabled: req.body?.emailEnabled !== false,
    sslEnabled: req.body?.sslEnabled !== false,
    dedicatedIp: String(req.body?.dedicatedIp || "").trim(),
    passwordSet: Boolean(req.body?.password),
    homeDirectory,
    documentRoot: path.join(homeDirectory, "public_html"),
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  try {
    writeStarterSite(account);
    writePanelState({ ...state, accounts: [account, ...state.accounts] });
    res.json({ ok: true, account });
  } catch (error: any) {
    res.status(500).json({ ok: false, message: error.message || "Unable to create account files." });
  }
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
    return {
      ...account,
      status: action === "unsuspend" ? "active" : action === "terminate" ? "terminated" : "suspended",
      updatedAt: new Date().toISOString()
    };
  });
  writePanelState({ ...state, accounts });
  res.json({ ok: true, accounts });
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
