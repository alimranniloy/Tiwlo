import express from "express";
import path from "path";
import os from "os";
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

app.use(express.json());

function requestIp(req: express.Request) {
  const forwarded = req.headers["x-forwarded-for"];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return TPANEL_SERVER_IP || String(value || req.ip || req.socket.remoteAddress || "").replace(/^::ffff:/, "");
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

app.post("/api/panel/services/:name/:action", async (req, res) => {
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
      "You are the CPanel Smart AI Copilot. You are an expert system administrator, backup engineer, Node.js DevOps pro, and database manager. " +
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
