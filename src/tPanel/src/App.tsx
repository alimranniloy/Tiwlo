import { useState, useEffect, useRef } from "react";
import Sidebar from "./components/Sidebar";
import DashboardHome from "./components/DashboardHome";
import FileManager from "./components/FileManager";
import NodeManager from "./components/NodeManager";
import DomainManager from "./components/DomainManager";
import DatabaseManager from "./components/DatabaseManager";
import EmailManager from "./components/EmailManager";
import AICopilot from "./components/AICopilot";
import TPanelExtraManager from "./components/TPanelExtraManager";
import LoginPage from "./components/LoginPage";
import AdminPanel from "./components/AdminPanel";
import BrandLogo from "./components/BrandLogo";
import { Sun, Moon } from "lucide-react";

import { 
  VirtualItem, 
  DomainItem, 
  DatabaseItem, 
  DatabaseUser, 
  NodeApp, 
  EmailAccount, 
  ServerStats, 
  RecentActivity 
} from "./types";

const emptyServerStats: ServerStats = {
  cpu: 0,
  cpuHistory: Array(11).fill(0),
  ram: 0,
  ramMax: 2048,
  ramHistory: Array(9).fill(0),
  disk: 0,
  diskMax: 5120,
  bandwidth: 0,
  bandwidthMax: 500
};

const defaultFiles: VirtualItem[] = [
  {
    id: "root-dir",
    name: "/",
    type: "directory",
    parentId: null,
    size: 4096,
    updatedAt: "2026-05-24 00:00:00",
    permissions: "0755"
  },
  {
    id: "public-html-dir",
    name: "public_html",
    type: "directory",
    parentId: "root-dir",
    size: 4096,
    updatedAt: "2026-05-24 00:00:00",
    permissions: "0755"
  },
  {
    id: "index-php-file",
    name: "index.php",
    type: "file",
    parentId: "public-html-dir",
    size: 96,
    updatedAt: "2026-05-24 00:00:00",
    permissions: "0644",
    content: "<?php\n$site = $_SERVER['HTTP_HOST'] ?? 'tPanel site';\necho \"<h1>Welcome to {$site}</h1>\";\n"
  }
];

const normalizeFiles = (items: unknown): VirtualItem[] => {
  const list = Array.isArray(items) ? items.filter(Boolean) as VirtualItem[] : [];
  if (!list.length) return defaultFiles;
  const hasRoot = list.some((item) => item.id === "root-dir");
  const hasPublicHtml = list.some((item) => item.id === "public-html-dir" || item.name === "public_html");
  const safeList = [
    ...(hasRoot ? [] : [defaultFiles[0]]),
    ...(hasPublicHtml ? [] : [defaultFiles[1]]),
    ...list
  ];
  return safeList.map((item) => ({
    ...item,
    size: Number(item.size || 0),
    updatedAt: item.updatedAt || new Date().toISOString().replace("T", " ").substring(0, 19),
    permissions: item.permissions || (item.type === "directory" ? "0755" : "0644")
  }));
};

const DEFAULT_USER_PERMISSIONS: Record<string, boolean> = {
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

const TAB_PERMISSION_MAP: Record<string, string> = {
  dashboard: "dashboard",
  files: "files",
  ftp: "ftp",
  disk: "disk",
  databases: "databases",
  postgre: "databases",
  phpmyadmin: "phpmyadmin",
  domains: "domains",
  dns_zone: "dns",
  subdomains: "subdomains",
  emails: "email",
  forwarders: "email",
  autoresponders: "email",
  ssl: "ssl",
  ipblocker: "security",
  ssh: "terminal",
  visitors: "metrics",
  bandwidth: "metrics",
  node: "node",
  phpversion: "php",
  ruby: "ruby",
  marketplace: "marketplace",
  cron: "cron",
  terminal: "terminal",
  copilot: "copilot"
};

const ROUTE_TO_TAB: Record<string, string> = {
  "/dashboard": "dashboard",
  "/files": "files",
  "/node": "node",
  "/domains": "domains",
  "/databases": "databases",
  "/emails": "emails",
  "/copilot": "copilot",
  "/ftp": "ftp",
  "/disk": "disk",
  "/postgre": "postgre",
  "/phpmyadmin": "phpmyadmin",
  "/dns-zone": "dns_zone",
  "/subdomains": "subdomains",
  "/forwarders": "forwarders",
  "/autoresponders": "autoresponders",
  "/ssl": "ssl",
  "/ipblocker": "ipblocker",
  "/ssh": "ssh",
  "/visitors": "visitors",
  "/bandwidth": "bandwidth",
  "/phpversion": "phpversion",
  "/ruby": "ruby",
  "/marketplace": "marketplace",
  "/cron": "cron",
  "/terminal": "terminal"
};

const TAB_TO_ROUTE = Object.fromEntries(Object.entries(ROUTE_TO_TAB).map(([route, tab]) => [tab, route]));

const tabFromLocation = () => ROUTE_TO_TAB[window.location.pathname] || "dashboard";

const dnsRecordsForDomain = (account: any, domainName: string): any[] => {
  const domain = String(domainName || "").toLowerCase();
  const records = Array.isArray(account.provisioning?.dnsRecords) ? account.provisioning.dnsRecords : [];
  const matched = records.filter((record: any) => {
    const host = String(record.host || "").toLowerCase();
    return host === domain || host.endsWith(`.${domain}`);
  });
  const source = matched.length ? matched : [{ type: "A", host: domain, name: "@", value: account.provisioning?.detectedServerIp || "SERVER_IP", ttl: 300 }];
  return source.map((record: any, index: number) => {
    const host = String(record.host || record.name || domain).toLowerCase();
    const name = record.name || (host === domain ? "@" : host.replace(`.${domain}`, ""));
    return {
      id: `dns-${index}-${host || "record"}`,
      type: record.type || "A",
      name,
      value: record.value || "",
      ttl: Number(record.ttl || 300)
    };
  });
};

const domainsFromAccount = (account: any): DomainItem[] => {
  if (!account?.domain) return [];
  const sslActive = account.provisioning?.ssl?.status === "active";
  const sslType = account.sslEnabled === false ? "None" : "Let's Encrypt";
  const primary: DomainItem = {
    id: `dom-${account.domain}`,
    domainName: account.domain,
    documentRoot: "/public_html",
    sslActive,
    sslType,
    dnsRecords: dnsRecordsForDomain(account, account.domain)
  };
  const subdomains = Array.isArray(account.provisioning?.vhost?.subdomains)
    ? account.provisioning.vhost.subdomains.map((route: any) => ({
      id: `dom-${route.domain}`,
      domainName: route.domain,
      documentRoot: route.webPath || "/public_html",
      sslActive,
      sslType,
      dnsRecords: dnsRecordsForDomain(account, route.domain)
    }))
    : [];
  return [primary, ...subdomains];
};

const mergeAccountDomains = (saved: DomainItem[], account: any): DomainItem[] => {
  const accountDomains = domainsFromAccount(account);
  const seen = new Set(accountDomains.map((domain) => domain.domainName));
  return [
    ...accountDomains,
    ...saved.filter((domain) => !seen.has(domain.domainName))
  ];
};

export default function App() {
  const [activeTab, setActiveTab] = useState<string>(() => tabFromLocation());
  const [licenseStatus, setLicenseStatus] = useState<any | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [authReady, setAuthReady] = useState(false);
  const [currentAccount, setCurrentAccount] = useState<any | null>(null);
  const [storageScope, setStorageScope] = useState("guest");
  const userPermissions = { ...DEFAULT_USER_PERMISSIONS, ...(currentAccount?.permissions || {}) };
  const canAccessTab = (tabId: string) => Boolean(userPermissions[TAB_PERMISSION_MAP[tabId] || tabId]);
  const allowedTabs = Object.keys(TAB_PERMISSION_MAP).filter((tabId) => canAccessTab(tabId));
  const setPermittedActiveTab = (tabId: string) => {
    const nextTab = canAccessTab(tabId) ? tabId : "dashboard";
    setActiveTab(nextTab);
    const route = TAB_TO_ROUTE[nextTab] || "/dashboard";
    if (window.location.pathname !== route) window.history.pushState(null, "", route);
  };

  const handleLogin = async (user: string, pass: string) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: user, password: pass })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) {
      throw new Error(result.message || "Invalid tPanel username or password.");
    }
    if (result.token) {
      localStorage.setItem("tpanel_auth", JSON.stringify({ token: result.token, role: result.role, expiresAt: result.expiresAt, account: result.account || null }));
    }
    setCurrentAccount(result.account || null);
    if (result.role === "admin") {
      setIsLoggedIn(true);
      setIsAdmin(true);
      setActiveTab("dashboard");
      window.history.replaceState(null, "", "/admin");
    } else {
      setIsLoggedIn(true);
      setIsAdmin(false);
      setActiveTab("dashboard");
      window.history.replaceState(null, "", "/dashboard");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("tpanel_auth");
    setIsLoggedIn(false);
    setIsAdmin(false);
    setCurrentAccount(null);
    setActiveTab("dashboard");
    window.history.replaceState(null, "", "/login");
  };

  const handleAccountUpdate = (account: any) => {
    if (!account) return;
    setCurrentAccount(account);
    setStoredAuthAccount(account);
    setDomains((current) => mergeAccountDomains(current, account));
  };

  // Dynamic Day/Night Mode: default to light as requested
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      const saved = localStorage.getItem("tpanel_theme");
      return (saved as "light" | "dark") || "light";
    } catch {
      return "light";
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
    }
    localStorage.setItem("tpanel_theme", theme);
  }, [theme]);

  // Persisted state loading helper
  const storageKey = (key: string, scope = storageScope) => `tpanel_${scope}_${key}`;
  const getPersistedState = <T,>(key: string, backup: T, scope = "guest"): T => {
    try {
      const value = localStorage.getItem(storageKey(key, scope));
      if (value) return JSON.parse(value);
      if (scope !== "guest" && scope !== "admin") return backup;
      const legacy = localStorage.getItem(`tpanel_${key}`);
      return legacy ? JSON.parse(legacy) : backup;
    } catch {
      return backup;
    }
  };

  const setStoredAuthAccount = (account: any) => {
    try {
      const saved = JSON.parse(localStorage.getItem("tpanel_auth") || "null");
      if (saved?.token) {
        localStorage.setItem("tpanel_auth", JSON.stringify({ ...saved, account }));
      }
    } catch {
      // Ignore local session cache write failures.
    }
  };

  const persistScopedState = (key: string, value: unknown) => {
    try {
      localStorage.setItem(storageKey(key), JSON.stringify(value));
    } catch {
      // Browser storage can be unavailable in private mode or full disks.
    }
  };

  const loadScopedState = <T,>(key: string, backup: T, scope: string): T => {
    try {
      const value = localStorage.getItem(storageKey(key, scope));
      return value ? JSON.parse(value) : backup;
    } catch {
      return backup;
    }
  };

  // State Hooks
  const [files, setFiles] = useState<VirtualItem[]>(() => normalizeFiles(getPersistedState("files", defaultFiles)));
  const [domains, setDomains] = useState<DomainItem[]>(() => getPersistedState("domains", []));
  const [databases, setDatabases] = useState<DatabaseItem[]>(() => getPersistedState("databases", []));
  const [dbUsers, setDbUsers] = useState<DatabaseUser[]>(() => getPersistedState("dbUsers", []));
  const [nodeApps, setNodeApps] = useState<NodeApp[]>(() => getPersistedState("nodeApps", []));
  const [emails, setEmails] = useState<EmailAccount[]>(() => getPersistedState("emails", []));
  const [serverStats, setServerStats] = useState<ServerStats>(() => getPersistedState("serverStats", emptyServerStats));
  const [activities, setActivities] = useState<RecentActivity[]>(() => getPersistedState("activities", []));
  const [, setServerFilesReady] = useState(false);
  const reconciledSubdomains = useRef<Set<string>>(new Set());

  useEffect(() => {
    let mounted = true;
    const restoreSession = async () => {
      try {
        const saved = JSON.parse(localStorage.getItem("tpanel_auth") || "null");
        if (!saved?.token || (saved.expiresAt && saved.expiresAt < Date.now())) {
          localStorage.removeItem("tpanel_auth");
          return;
        }
        const response = await fetch("/api/auth/session", {
          headers: { Authorization: `Bearer ${saved.token}` }
        });
        const data = await response.json().catch(() => ({}));
        if (!mounted || !response.ok || !data.ok) {
          localStorage.removeItem("tpanel_auth");
          return;
        }
        setIsLoggedIn(true);
        setIsAdmin(data.role === "admin");
        setCurrentAccount(data.account || saved.account || null);
        if (window.location.pathname === "/" || window.location.pathname === "/login") {
          window.history.replaceState(null, "", data.role === "admin" ? "/admin" : "/dashboard");
        } else if (data.role !== "admin") {
          const nextTab = tabFromLocation();
          setActiveTab(canAccessTab(nextTab) ? nextTab : "dashboard");
        }
      } catch {
        localStorage.removeItem("tpanel_auth");
      } finally {
        if (mounted) setAuthReady(true);
      }
    };
    const loadLicense = async () => {
      try {
        const response = await fetch("/api/license/status");
        const data = await response.json();
        if (mounted) setLicenseStatus(data);
      } catch {
        if (mounted) setLicenseStatus({ ok: false, status: "offline", message: "Unable to reach license service." });
      }
    };
    restoreSession();
    loadLicense();
    const timer = window.setInterval(loadLicense, 10 * 60 * 1000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      if (isAdmin) return;
      const nextTab = tabFromLocation();
      setActiveTab(canAccessTab(nextTab) ? nextTab : "dashboard");
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [currentAccount, isAdmin]);

  useEffect(() => {
    if (isLoggedIn && !isAdmin && !canAccessTab(activeTab)) {
      setPermittedActiveTab("dashboard");
    }
  }, [activeTab, currentAccount, isAdmin, isLoggedIn]);

  useEffect(() => {
    const nextScope = isAdmin ? "admin" : currentAccount?.username ? `account_${currentAccount.username}` : "guest";
    if (nextScope === storageScope) return;
    setServerFilesReady(false);
    setFiles(normalizeFiles(getPersistedState("files", defaultFiles, nextScope)));
    const scopedDomains = getPersistedState("domains", [], nextScope);
    setDomains(!isAdmin && currentAccount ? mergeAccountDomains(scopedDomains, currentAccount) : scopedDomains);
    setDatabases(getPersistedState("databases", [], nextScope));
    setDbUsers(getPersistedState("dbUsers", [], nextScope));
    setNodeApps(getPersistedState("nodeApps", [], nextScope));
    setEmails(getPersistedState("emails", [], nextScope));
    setServerStats(loadScopedState("serverStats", emptyServerStats, nextScope));
    setActivities(getPersistedState("activities", [], nextScope));
    setStorageScope(nextScope);
  }, [currentAccount?.username, isAdmin, storageScope]);

  useEffect(() => {
    if (!isLoggedIn || isAdmin || !currentAccount) return;
    setDomains((current) => mergeAccountDomains(current, currentAccount));
  }, [currentAccount?.domain, currentAccount?.username, currentAccount?.provisioning?.ssl?.status, currentAccount?.provisioning?.vhost?.subdomains, isAdmin, isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn || isAdmin || !currentAccount?.domain || !domains.length) return;
    const known = new Set((currentAccount.provisioning?.vhost?.subdomains || []).map((route: any) => route.domain));
    const suffix = `.${currentAccount.domain}`;
    const candidates = domains
      .filter((domain) => domain.domainName.endsWith(suffix))
      .filter((domain) => domain.domainName !== currentAccount.domain)
      .filter((domain) => !known.has(domain.domainName))
      .filter((domain) => !reconciledSubdomains.current.has(domain.domainName))
      .slice(0, 5);
    if (!candidates.length) return;
    const saved = JSON.parse(localStorage.getItem("tpanel_auth") || "null");
    if (!saved?.token) return;
    candidates.forEach((domain) => {
      const prefix = domain.domainName.slice(0, -suffix.length);
      if (!prefix || prefix.includes(".")) return;
      reconciledSubdomains.current.add(domain.domainName);
      fetch("/api/user/subdomains", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${saved.token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ prefix, parentDomain: currentAccount.domain })
      }).catch(() => {
        reconciledSubdomains.current.delete(domain.domainName);
      });
    });
  }, [currentAccount?.domain, currentAccount?.username, currentAccount?.provisioning?.vhost?.subdomains, domains, isAdmin, isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn || isAdmin || !currentAccount) {
      setServerFilesReady(false);
      return;
    }
    let mounted = true;
    const loadServerFiles = async () => {
      try {
        const saved = JSON.parse(localStorage.getItem("tpanel_auth") || "null");
        if (!saved?.token) {
          if (mounted) setServerFilesReady(false);
          return;
        }
        const response = await fetch("/api/user/files", {
          headers: { Authorization: `Bearer ${saved.token}` }
        });
        const data = await response.json().catch(() => ({}));
        if (!mounted || !response.ok || !data.ok || !Array.isArray(data.files)) {
          if (mounted) setServerFilesReady(false);
          return;
        }
        setFiles(normalizeFiles(data.files));
        setServerFilesReady(true);
      } catch {
        // Keep browser-side file state usable if the filesystem sync endpoint is unavailable.
        if (mounted) setServerFilesReady(false);
      }
    };
    loadServerFiles();
    return () => {
      mounted = false;
    };
  }, [currentAccount?.username, isAdmin, isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn || isAdmin) return;
    let mounted = true;
    const refreshAccount = async () => {
      try {
        const saved = JSON.parse(localStorage.getItem("tpanel_auth") || "null");
        if (!saved?.token) return;
        const response = await fetch("/api/user/summary", {
          headers: { Authorization: `Bearer ${saved.token}` }
        });
        const data = await response.json().catch(() => ({}));
        if (!mounted || !response.ok || !data.ok || !data.account) return;
        setCurrentAccount(data.account);
        setStoredAuthAccount(data.account);
      } catch {
        // Keep the current session usable if the background refresh misses once.
      }
    };
    refreshAccount();
    const timer = window.setInterval(refreshAccount, 60 * 1000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [isLoggedIn, isAdmin]);

  // External trigger for parent AI Copilot Chat
  const [openAiPromptTrigger, setOpenAiPromptTrigger] = useState("");

  // Sync to outer LocalStorage persistence
  useEffect(() => {
    persistScopedState("files", files);
  }, [files, storageScope]);

  useEffect(() => {
    persistScopedState("domains", domains);
  }, [domains, storageScope]);

  useEffect(() => {
    persistScopedState("databases", databases);
  }, [databases, storageScope]);

  useEffect(() => {
    persistScopedState("dbUsers", dbUsers);
  }, [dbUsers, storageScope]);

  useEffect(() => {
    persistScopedState("nodeApps", nodeApps);
  }, [nodeApps, storageScope]);

  useEffect(() => {
    persistScopedState("emails", emails);
  }, [emails, storageScope]);

  useEffect(() => {
    persistScopedState("serverStats", serverStats);
  }, [serverStats, storageScope]);

  useEffect(() => {
    persistScopedState("activities", activities);
  }, [activities, storageScope]);

  // Method to push active event logging traces
  const addActivity = (category: "file" | "domain" | "node" | "db" | "email" | "ssl", message: string) => {
    const time = new Date().toLocaleTimeString("en-GB", { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const newActivity: RecentActivity = {
      id: "act-" + Math.random().toString(36).substr(2, 9),
      time,
      category,
      message
    };
    setActivities(prev => [newActivity, ...prev.slice(0, 40)]); // keep top 40 tracks
  };

  // Method to direct file assistant prompt mapping to Copilot panel automatically
  const openAiWithPrompt = (prompt: string) => {
    if (!canAccessTab("copilot")) {
      addActivity("file", "AI Copilot is disabled for this hosting account.");
      return;
    }
    setOpenAiPromptTrigger(prompt);
    setPermittedActiveTab("copilot");
  };

  // Badge counters
  const runningAppsCount = nodeApps.filter(a => a.status === "running").length;
  const unreadMailsCount = emails.reduce((sum, acc) => {
    const unread = acc.mails.filter(m => m.from !== acc.address && !m.read).length;
    return sum + unread;
  }, 0);
  const dbsCount = databases.length;

  const getTabHeadingInfo = (tabId: string) => {
    switch (tabId) {
      case "dashboard":
        return { title: "System Overview", subtitle: `Server IP: ${licenseStatus?.license?.serverIp || licenseStatus?.serverIp || "Auto detected"}` };
      case "files":
        return { title: "File Manager Workspace", subtitle: "Root Path: /public_html" };
      case "node":
        return { title: "Node.js App Ecosystem", subtitle: "Active Ports & Live Memory Allocation" };
      case "domains":
        return { title: "Domains & Route Maps", subtitle: "DNS Zone Records & SSL Binding Status" };
      case "databases":
        return { title: "MySQL Database Clusters", subtitle: "Relational Tables & Access Users" };
      case "emails":
        return { title: "Secure Mail Terminals", subtitle: "Corporate Mailbox Exchange & Sandbox" };
      case "copilot":
        return { title: "AI Terminal Copilot", subtitle: "Interactive Shell & Orchestration Copilot" };
      case "ftp":
        return { title: "FTP Port & Server Manager", subtitle: "Access Tokens, Quota Limits & Remote Deployments" };
      case "disk":
        return { title: "Disk Volume & Storage Audit", subtitle: "Physical Cluster Breakdown, Cache Recyclers & Log Blocks" };
      case "postgre":
        return { title: "PostgreSQL Database Engine", subtitle: "Deploy Relational PGSQL Clusters & Map Host Credentials" };
      case "phpmyadmin":
        return { title: "phpMyAdmin MySQL Browser", subtitle: "Interactive Relational Schemas & Direct SQL Query Core" };
      case "dns_zone":
        return { title: "DNS Zone Record Coordinator", subtitle: "Update Namespace Mapping Records (A, CNAME, MX, TXT)" };
      case "subdomains":
        return { title: "Subdomain Route Deployments", subtitle: "Activate Modular Namespace Partitions Under Host Domains" };
      case "forwarders":
        return { title: "Email Redirect Forwarders", subtitle: "Establish Redirection Vectors from Public Boxes to Private" };
      case "autoresponders":
        return { title: "Autoresponder Reply Engines", subtitle: "Design Automated Reply Subjects & Body Templates" };
      case "ssl":
        return { title: "Wildcard SSL/TLS Shields", subtitle: "Deploy HTTPS Let's Encrypt Certificate Envelopes" };
      case "ipblocker":
        return { title: "IP Firewall & Block Rules", subtitle: "Filter Malicious DDOS Threat Origins on Ports 80 & 443" };
      case "ssh":
        return { title: "SSH Shell Access Keys", subtitle: "Establish Authorized Host Key Files for Console Shells" };
      case "visitors":
        return { title: "Live User Traffic & Visitors", subtitle: "Real-time Hits, Client User-Agent Strings & Latency" };
      case "bandwidth":
        return { title: "Bandwidth Flow Analytics", subtitle: "Monthly Usage Gauges & Outbound Flow Limits" };
      case "phpversion":
        return { title: "Select Server PHP Version", subtitle: "Swap PHP Compilation Runtimes & Toggle Module Extensions" };
      case "ruby":
        return { title: "Ruby App Rack Coordinator", subtitle: "Launch & Coordinate Sinatra, Rails & Jekyll Rack Servers" };
      case "marketplace":
        return { title: "One-Click Installer Marketplace", subtitle: "Deploy WordPress, Laravel, Nextcloud & Ghost Instantly" };
      case "cron":
        return { title: "Cron Automated Schedulers", subtitle: "Trigger Background Scripts & Automation Commands Regularly" };
      case "terminal":
        return { title: "Interactive Server Bash SSH", subtitle: "Execute Core Kernel Scripts in tPanel Console Shell" };
      default:
        return { title: "System Overview", subtitle: `Server IP: ${licenseStatus?.license?.serverIp || licenseStatus?.serverIp || "Auto detected"}` };
    }
  };

  if (licenseStatus && !licenseStatus.ok) {
    const renewCommand = `sudo env TPANEL_LICENSE_KEY="${licenseStatus.licenseKey || "YOUR_LICENSE_KEY"}" tpanel-license-renew`;
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-lg w-full rounded-lg border border-red-500/20 bg-slate-900 p-8 text-center shadow-2xl">
          <BrandLogo compact className="mx-auto mb-5 h-14 w-14" />
          <h1 className="text-2xl font-black tracking-tight">tPanel License Check Failed</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            {licenseStatus.message || "Refresh the active license on this server, then restart the panel service."}
          </p>
          <div className="mt-5 rounded border border-slate-800 bg-slate-950 p-3 text-left">
            <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-500">Server command</p>
            <code className="block whitespace-pre-wrap break-all text-[12px] font-bold text-slate-200">{renewCommand}</code>
          </div>
        </div>
      </div>
    );
  }

  if (!authReady) {
    return <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center text-sm font-bold">Loading tPanel...</div>;
  }

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (isAdmin) {
    return <AdminPanel onLogout={handleLogout} />;
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-950 text-slate-300 antialiased selection:bg-indigo-500/20 selection:text-indigo-300 transition-colors duration-250">
      
      {/* Sidebar navigation - Hidden when File Manager is maximized to full-screen */}
      {activeTab !== "files" && (
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setPermittedActiveTab}
          runningAppsCount={runningAppsCount}
          unreadMailsCount={unreadMailsCount}
          dbsCount={dbsCount}
          onLogout={handleLogout}
          allowedTabs={allowedTabs}
        />
      )}

      {/* Main active Tab screen */}
      <main className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header - Hidden when File Manager is maximized to full-screen */}
        {activeTab !== "files" && (
          <header className="h-20 border-b border-slate-700 bg-slate-900 flex items-center justify-between px-6 lg:px-10 shrink-0 transition-colors duration-250">
            <div>
              <h1 className="text-xl font-semibold text-slate-100 tracking-tight">{getTabHeadingInfo(activeTab).title}</h1>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{getTabHeadingInfo(activeTab).subtitle}</p>
            </div>
            <div className="flex items-center gap-4 sm:gap-6">
              
              {/* Day / Night Mode Toggle Switch */}
              <button
                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                className="p-2 sm:px-3 sm:py-2 rounded-xl border border-slate-700 bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-all flex items-center gap-2 cursor-pointer focus:outline-none"
                title={theme === "light" ? "Switch to Night Mode" : "Switch to Day Mode"}
                id="theme-toggle-trigger"
              >
                {theme === "light" ? (
                  <>
                    <Sun className="w-4 h-4 text-amber-500 animate-[spin_10s_linear_infinite]" />
                    <span className="text-xs font-bold font-mono tracking-wide text-slate-500 uppercase hidden sm:inline">Day</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 text-indigo-400 animate-pulse" />
                    <span className="text-xs font-bold font-mono tracking-wide text-slate-400 uppercase hidden sm:inline">Night</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest hidden md:inline">
                  All Services Online
                </span>
              </div>
              
              <BrandLogo compact className="h-10 w-10" />
            </div>
          </header>
        )}

        {/* Inner Content Area - Removed lock height/overflow to scroll natively together */}
        <div className={`flex-1 ${activeTab === "files" ? "p-4 sm:p-6" : "p-4 sm:p-6 lg:p-10"} max-w-full`}>
          <div className="max-w-7xl mx-auto space-y-8">
            {activeTab !== "files" && currentAccount && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Hosting Account</p>
                  <p className="mt-1 truncate text-sm font-black text-slate-100">{currentAccount.username} / {currentAccount.domain}</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Package</p>
                  <p className="mt-1 truncate text-sm font-black text-slate-100">{currentAccount.packageName || currentAccount.packageId || "Custom"}</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Storage / Bandwidth</p>
                  <p className="mt-1 text-sm font-black text-slate-100">{currentAccount.quotaMb || 0} MB / {currentAccount.bandwidthGb || 0} GB</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Panel Access</p>
                  <p className="mt-1 text-sm font-black text-emerald-400">{Object.values(userPermissions).filter(Boolean).length} tools enabled</p>
                </div>
              </div>
            )}
            
            {activeTab === "dashboard" && (
            <DashboardHome 
              stats={serverStats} 
              setStats={setServerStats} 
              activities={activities}
              setActivities={setActivities}
              domains={domains}
              setActiveTab={setPermittedActiveTab}
              addActivity={addActivity}
              account={currentAccount}
            />
          )}

          {activeTab === "files" && (
            <FileManager 
              files={files} 
              setFiles={setFiles} 
              addActivity={addActivity}
              openAiWithPrompt={openAiWithPrompt}
              setActiveTab={setPermittedActiveTab}
            />
          )}

          {activeTab === "node" && (
            <NodeManager 
              nodeApps={nodeApps} 
              setNodeApps={setNodeApps} 
              domains={domains}
              files={files}
              addActivity={addActivity}
            />
          )}

          {activeTab === "domains" && (
            <DomainManager 
              domains={domains} 
              setDomains={setDomains} 
              onAccountUpdate={handleAccountUpdate}
              addActivity={addActivity}
            />
          )}

          {(activeTab === "databases" || activeTab === "phpmyadmin") && (
            <DatabaseManager 
              databases={databases} 
              setDatabases={setDatabases} 
              dbUsers={dbUsers}
              setDbUsers={setDbUsers}
              addActivity={addActivity}
              initialTab={activeTab === "phpmyadmin" ? "phpmyadmin" : "overview"}
            />
          )}

          {activeTab === "emails" && (
            <EmailManager 
              emails={emails} 
              setEmails={setEmails} 
              domains={domains}
              addActivity={addActivity}
            />
          )}

          {activeTab === "copilot" && (
            <AICopilot 
              openAiPromptTrigger={openAiPromptTrigger}
              setOpenAiPromptTrigger={setOpenAiPromptTrigger}
            />
          )}

          {!["dashboard", "files", "node", "domains", "databases", "emails", "copilot", "phpmyadmin"].includes(activeTab) && (
            <TPanelExtraManager 
              activeTab={activeTab}
              domains={domains}
              setDomains={setDomains}
              addActivity={addActivity}
            />
          )}

        </div>
      </div>
    </main>

  </div>
  );
}
