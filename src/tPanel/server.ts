import express from "express";
import path from "path";
import os from "os";
import fs from "fs";
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

async function verifyLicense(req: express.Request) {
  if (!TPANEL_LICENSE_KEY) {
    return { ok: false, status: "unlicensed", message: "TPANEL_LICENSE_KEY is missing. Renew or reinstall from Tiwlo." };
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

  const response = await fetch(`${TIWLO_API_URL}/tpanel/api/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { ok: false, status: data.status || "error", message: data.message || "Unable to verify tPanel license" };
  }
  return data;
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
      res.json({ ok: true, role: "admin" });
      return;
    }
    if (TPANEL_USER && TPANEL_USER_PASSWORD && username === TPANEL_USER && password === TPANEL_USER_PASSWORD) {
      res.json({ ok: true, role: "user" });
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
