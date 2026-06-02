import { useState, useEffect, useRef, FormEvent, Dispatch, SetStateAction } from "react";
import { 
  Plus, 
  Trash2, 
  CheckCircle, 
  Key, 
  HardDrive, 
  Layers, 
  Network, 
  Split, 
  Send, 
  Reply, 
  ShieldCheck, 
  ShieldAlert, 
  Eye, 
  Activity, 
  FileCode2, 
  Gem, 
  ShoppingBag, 
  Clock, 
  Terminal,
  Database,
  RefreshCw,
  Sparkles,
  ArrowUpRight,
  Cpu
} from "lucide-react";
import { DomainItem } from "../types";

interface TPanelExtraManagerProps {
  activeTab: string;
  domains: DomainItem[];
  setDomains: Dispatch<SetStateAction<DomainItem[]>>;
  addActivity: (category: "file" | "domain" | "node" | "db" | "email" | "ssl", message: string) => void;
  account?: any;
  onAccountUpdate?: (account: any) => void;
}

interface SshAccessInfo {
  username: string;
  host: string;
  port: number;
  homeDirectory: string;
  command: string;
  passwordSet: boolean;
  keys: string[];
}

export default function TPanelExtraManager({ activeTab, domains, setDomains, addActivity, account, onAccountUpdate }: TPanelExtraManagerProps) {
  // PERSISTED STATES
  const getPersisted = <T,>(key: string, def: T): T => {
    try {
      const stored = localStorage.getItem(`tpanel_extra_${key}`);
      return stored ? JSON.parse(stored) : def;
    } catch {
      return def;
    }
  };

  const savePersisted = (key: string, val: any) => {
    localStorage.setItem(`tpanel_extra_${key}`, JSON.stringify(val));
  };

  // 1. FTP Accounts
  const [ftpAccounts, setFtpAccounts] = useState<any[]>([]);
  const [ftpConnection, setFtpConnection] = useState<any>(null);
  const [ftpStatus, setFtpStatus] = useState("");
  const [isFtpBusy, setIsFtpBusy] = useState(false);
  const [newFtpUser, setNewFtpUser] = useState("");
  const [newFtpPassword, setNewFtpPassword] = useState("");
  const [newFtpPath, setNewFtpPath] = useState("/public_html");
  const [newFtpQuota, setNewFtpQuota] = useState("Unlimited");

  // 2. Disk Space Analyser
  const [currentDiskUsage, setCurrentDiskUsage] = useState(() => getPersisted("disk_alloc", {
    public_html: 4050, // MB
    node_apps: 2500,
    db_spaces: 1400,
    mailboxes: 800,
    tmp_cache: 1100
  }));

  // 3. PostgreSQL Database
  const [pgDatabases, setPgDatabases] = useState(() => getPersisted("postgre_db", [
    { name: "pg_auth_db", size: "45 MB", owner: "pg_admin", tablesCount: 16 },
    { name: "pg_analytics", size: "118 MB", owner: "pg_analyst", tablesCount: 22 }
  ]));
  const [newPgDbName, setNewPgDbName] = useState("");
  const [newPgUsername, setNewPgUsername] = useState("");

  // 4. Zone DNS records and subdomains are tied directly to Domains & DNS
  const [selectedDNSDomain, setSelectedDNSDomain] = useState(() => domains[0]?.domainName || "");
  const [newRecordType, setNewRecordType] = useState<"A" | "CNAME" | "TXT" | "MX">("A");
  const [newRecordName, setNewRecordName] = useState("");
  const [newRecordValue, setNewRecordValue] = useState("");

  // Subdomains
  const [newSubdomainPrefix, setNewSubdomainPrefix] = useState("");
  const [selectedSubDomain, setSelectedSubDomain] = useState(() => domains[0]?.domainName || "");
  const [subdomainStatus, setSubdomainStatus] = useState("");
  const [isCreatingSubdomain, setIsCreatingSubdomain] = useState(false);

  // 6. Emails extra (Forwarders & Autoresponders)
  const [emailForwarders, setEmailForwarders] = useState(() => getPersisted("forwarders", [
    { source: "info@my-portfolio.com", destination: "alimranniloy610@gmail.com" },
    { source: "dev@hostpro.io", destination: "niloy.dev@gmail.com" }
  ]));
  const [newForwardSource, setNewForwardSource] = useState("");
  const [newForwardDest, setNewForwardDest] = useState("");

  const [autoresponders, setAutoresponders] = useState(() => getPersisted("autoresponders", [
    { address: "info@my-portfolio.com", template: "Thank you for contacting us! We received your mail and will respond in 24 hours." }
  ]));
  const [newAutoAddress, setNewAutoAddress] = useState("");
  const [newAutoBody, setNewAutoBody] = useState("");

  // 7. SSL certificates
  const [sslStatusLogs, setSslStatusLogs] = useState("");
  const [isSslIssuing, setIsSslIssuing] = useState(false);

  // 8. IP Blocker
  const [blockedIPs, setBlockedIPs] = useState(() => getPersisted("blocked_ips", ["192.168.1.100", "45.138.22.9"]));
  const [newBlockedIP, setNewBlockedIP] = useState("");

  // 9. SSH key manager
  const [sshInfo, setSshInfo] = useState<SshAccessInfo | null>(null);
  const [sshStatus, setSshStatus] = useState("");
  const [isSshBusy, setIsSshBusy] = useState(false);
  const [newSshKey, setNewSshKey] = useState("");
  const [newSshPassword, setNewSshPassword] = useState("");

  // 10. Live Visitors & Bandwidth Stats
  const [visitorTraffic, setVisitorTraffic] = useState(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      time: `${i * 2 + 10}:00`,
      hits: Math.floor(Math.random() * 200) + 50,
      visitors: Math.floor(Math.random() * 80) + 20
    }));
  });

  // 11. PHP Selector
  const [selectedPhpVersion, setSelectedPhpVersion] = useState(() => account?.phpSettings?.version || account?.phpVersion || getPersisted("php_version", "8.3"));
  const [phpExtensions, setPhpExtensions] = useState<Record<string, boolean>>(() => getPersisted("php_ext", {
    bcmath: true,
    curl: true,
    dom: true,
    fileinfo: true,
    gd: true,
    intl: true,
    mbstring: true,
    mysqli: true,
    mysqlnd: true,
    opcache: true,
    pdo: true,
    pdo_mysql: true,
    redis: true,
    simplexml: true,
    soap: true,
    xml: true,
    zip: true
  }));
  const [phpIniLimit, setPhpIniLimit] = useState(account?.phpSettings?.ini?.memory_limit || "256M");
  const [phpUploadLimit, setPhpUploadLimit] = useState(account?.phpSettings?.ini?.upload_max_filesize || "128M");
  const [phpPostLimit, setPhpPostLimit] = useState(account?.phpSettings?.ini?.post_max_size || "128M");
  const [phpMaxExecution, setPhpMaxExecution] = useState(account?.phpSettings?.ini?.max_execution_time || "120");
  const [phpMaxInputVars, setPhpMaxInputVars] = useState(account?.phpSettings?.ini?.max_input_vars || "3000");
  const [phpAvailableVersions, setPhpAvailableVersions] = useState<string[]>([]);
  const [phpExtensionRows, setPhpExtensionRows] = useState<Array<{ name: string; installed: boolean; selected: boolean }>>([]);
  const [phpDiagnostics, setPhpDiagnostics] = useState<any>(null);
  const [phpStatusMessage, setPhpStatusMessage] = useState("");
  const [isSavingPhpSettings, setIsSavingPhpSettings] = useState(false);
  const [phpTargetDomain, setPhpTargetDomain] = useState("all");
  const [runtimeDomains, setRuntimeDomains] = useState<any[]>([]);

  // 12. Node.js selector
  const [selectedNodeVersion, setSelectedNodeVersion] = useState(() => account?.nodeVersion || getPersisted("node_version", "24.16.0"));
  const [nodeAvailableVersions, setNodeAvailableVersions] = useState<string[]>([]);
  const [nodeTargetDomain, setNodeTargetDomain] = useState("all");
  const [nodePort, setNodePort] = useState(() => String(account?.nodePort || 3000));
  const [nodeStatusMessage, setNodeStatusMessage] = useState("");
  const [nodeDiagnostics, setNodeDiagnostics] = useState<any>(null);
  const [isSavingNodeSettings, setIsSavingNodeSettings] = useState(false);

  // 13. Ruby manager
  const [rubyApps, setRubyApps] = useState(() => getPersisted("ruby_apps", [
    { rubyVersion: "3.2.1", name: "Rails Ecommerce", port: 5000, status: "Active" }
  ]));
  const [newRubyName, setNewRubyName] = useState("");
  const [newRubyPort, setNewRubyPort] = useState("5000");

  // 13. App Marketplace
  const [appCatalog, setAppCatalog] = useState<any[]>([]);
  const [marketDomains, setMarketDomains] = useState<any[]>([]);
  const [installingApp, setInstallingApp] = useState<string | null>(null);
  const [marketInstallProgress, setMarketInstallProgress] = useState(0);
  const [marketStatus, setMarketStatus] = useState("");
  const [lastInstallCredentials, setLastInstallCredentials] = useState<any>(null);
  const [installedApps, setInstalledApps] = useState<any[]>([]);
  const [appToInstallDomain, setAppToInstallDomain] = useState(() => domains[0]?.domainName || "");
  const [appToInstallPath, setAppToInstallPath] = useState("");
  const [appSiteTitle, setAppSiteTitle] = useState("");
  const [appAdminUsername, setAppAdminUsername] = useState("admin");
  const [appAdminPassword, setAppAdminPassword] = useState("");
  const [appAdminEmail, setAppAdminEmail] = useState("");

  // 14. Cron Jobs State
  const [cronJobs, setCronJobs] = useState(() => getPersisted("cron_jobs", [
    { schedule: "0 0 * * *", command: "php /public_html/cron.php", lastRun: "Today, 00:00 AM" },
    { schedule: "*/15 * * * *", command: "node /root/analytics-sync.js", lastRun: "10 mins ago" }
  ]));
  const [newCronSchedule, setNewCronSchedule] = useState("0 0 * * *");
  const [newCronCommand, setNewCronCommand] = useState("");

  // 15. Terminal Simulator state
  const [terminalLogs, setTerminalLogs] = useState<string[]>(() => [
    "tPanel account shell initializes commands inside your hosting home.",
    "Type a Linux command and press Enter.",
    "account@tpanel:~$ "
  ]);
  const [terminalInputText, setTerminalInputText] = useState("");
  const [isTerminalRunning, setIsTerminalRunning] = useState(false);
  const terminalBottomRef = useRef<HTMLDivElement>(null);

  // Sync state modifications to disk persistence
  useEffect(() => { savePersisted("disk_alloc", currentDiskUsage); }, [currentDiskUsage]);
  useEffect(() => { savePersisted("postgre_db", pgDatabases); }, [pgDatabases]);
  useEffect(() => { savePersisted("forwarders", emailForwarders); }, [emailForwarders]);
  useEffect(() => { savePersisted("autoresponders", autoresponders); }, [autoresponders]);
  useEffect(() => { savePersisted("blocked_ips", blockedIPs); }, [blockedIPs]);
  useEffect(() => { savePersisted("php_version", selectedPhpVersion); }, [selectedPhpVersion]);
  useEffect(() => { savePersisted("php_ext", phpExtensions); }, [phpExtensions]);
  useEffect(() => { savePersisted("node_version", selectedNodeVersion); }, [selectedNodeVersion]);
  useEffect(() => { savePersisted("ruby_apps", rubyApps); }, [rubyApps]);
  useEffect(() => { savePersisted("cron_jobs", cronJobs); }, [cronJobs]);
  useEffect(() => {
    if (!selectedDNSDomain && domains[0]?.domainName) setSelectedDNSDomain(domains[0].domainName);
    if (!selectedSubDomain && domains[0]?.domainName) setSelectedSubDomain(domains[0].domainName);
    if (!appToInstallDomain && domains[0]?.domainName) setAppToInstallDomain(domains[0].domainName);
  }, [domains, selectedDNSDomain, selectedSubDomain, appToInstallDomain]);

  const authToken = () => {
    try {
      return JSON.parse(localStorage.getItem("tpanel_auth") || "null")?.token || "";
    } catch {
      return "";
    }
  };

  const applyFtpPayload = (data: any) => {
    setFtpAccounts(Array.isArray(data.accounts) ? data.accounts : []);
    setFtpConnection({
      host: data.host || account?.domain || "",
      port: Number(data.port || 21),
      limits: data.limits || {}
    });
  };

  const loadFtpAccounts = async () => {
    const token = authToken();
    if (!token) return;
    setIsFtpBusy(true);
    setFtpStatus("Loading FTP accounts from this tPanel server...");
    try {
      const response = await fetch("/api/user/ftp-accounts", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.message || "Unable to load FTP accounts.");
      applyFtpPayload(data);
      const used = Number(data.limits?.usedFtpAccounts || 0);
      const max = Number(data.limits?.maxFtpAccounts || 0);
      setFtpStatus(`FTP service ready. ${used}${max > 0 ? `/${max}` : ""} accounts in use.`);
    } catch (error) {
      setFtpStatus(error instanceof Error ? error.message : "Unable to load FTP accounts.");
    } finally {
      setIsFtpBusy(false);
    }
  };

  const applyAppInstallerPayload = (data: any) => {
    setAppCatalog(Array.isArray(data.catalog) ? data.catalog : []);
    const nextDomains = Array.isArray(data.domains) ? data.domains : [];
    setMarketDomains(nextDomains);
    setInstalledApps(Array.isArray(data.installedApps) ? data.installedApps : []);
    if (nextDomains[0]?.domain && (!appToInstallDomain || !nextDomains.some((item: any) => item.domain === appToInstallDomain))) {
      setAppToInstallDomain(nextDomains[0].domain);
    }
    if (data.account && onAccountUpdate) onAccountUpdate(data.account);
  };

  const loadAppInstaller = async () => {
    const token = authToken();
    if (!token) return;
    setMarketStatus("Loading installer catalog from this server...");
    try {
      const response = await fetch("/api/user/app-installer", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.message || "Unable to load app installer.");
      applyAppInstallerPayload(data);
      setMarketStatus("Installer catalog is ready.");
    } catch (error) {
      setMarketStatus(error instanceof Error ? error.message : "Unable to load app installer.");
    }
  };

  const shellPrompt = (info = sshInfo) => `${info?.username || account?.username || "account"}@tpanel:~$`;

  const terminalBanner = (info: SshAccessInfo | null) => [
    info
      ? `Real shell ready for ${info.username}.`
      : "tPanel account shell initializes commands inside your hosting home.",
    info?.homeDirectory ? `Home: ${info.homeDirectory}` : "Commands are limited to the current hosting account.",
    `${shellPrompt(info)} `
  ];

  const loadSshAccess = async (resetTerminal = false) => {
    const token = authToken();
    if (!token) return;
    setIsSshBusy(true);
    setSshStatus("Loading real shell access...");
    try {
      const response = await fetch("/api/user/ssh-access", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.message || "Shell access is not available for this account.");
      const info: SshAccessInfo = {
        username: data.username,
        host: data.host,
        port: Number(data.port || 22),
        homeDirectory: data.homeDirectory,
        command: data.command,
        passwordSet: Boolean(data.passwordSet),
        keys: Array.isArray(data.keys) ? data.keys : []
      };
      setSshInfo(info);
      setSshStatus(`Shell is active for ${info.username}.`);
      if (resetTerminal) setTerminalLogs(terminalBanner(info));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Shell access is not available.";
      setSshInfo(null);
      setSshStatus(message);
      if (resetTerminal) {
        setTerminalLogs([
          message,
          "Ask the administrator to enable Shell access or upgrade the tPanel package.",
          `${shellPrompt(null)} `
        ]);
      }
    } finally {
      setIsSshBusy(false);
    }
  };

  const hydratePhpSettings = (data: any) => {
    const settings = data?.settings || {};
    const ini = settings.ini || {};
    if (settings.version) setSelectedPhpVersion(settings.version);
    if (ini.memory_limit) setPhpIniLimit(ini.memory_limit);
    if (ini.upload_max_filesize) setPhpUploadLimit(ini.upload_max_filesize);
    if (ini.post_max_size) setPhpPostLimit(ini.post_max_size);
    if (ini.max_execution_time) setPhpMaxExecution(ini.max_execution_time);
    if (ini.max_input_vars) setPhpMaxInputVars(ini.max_input_vars);
    if (Array.isArray(data.availableVersions)) setPhpAvailableVersions(data.availableVersions);
    else if (Array.isArray(data.installedVersions)) setPhpAvailableVersions(data.installedVersions);
    if (Array.isArray(data.extensions)) {
      setPhpExtensionRows(data.extensions);
      setPhpExtensions(Object.fromEntries(data.extensions.map((item: any) => [item.name, Boolean(item.selected)])));
    }
    if (Array.isArray(data.domains)) setRuntimeDomains(data.domains);
    setPhpDiagnostics(data.diagnostics || null);
    if (data.account && onAccountUpdate) onAccountUpdate(data.account);
  };

  const hydrateNodeSettings = (data: any) => {
    const settings = data?.settings || {};
    if (settings.version) setSelectedNodeVersion(settings.version);
    if (settings.nodePort) setNodePort(String(settings.nodePort));
    if (Array.isArray(data.availableVersions)) setNodeAvailableVersions(data.availableVersions);
    else if (Array.isArray(data.installedVersions)) setNodeAvailableVersions(data.installedVersions);
    if (Array.isArray(data.domains)) setRuntimeDomains(data.domains);
    setNodeDiagnostics(data.diagnostics || null);
    if (data.account && onAccountUpdate) onAccountUpdate(data.account);
  };

  const loadPhpSettings = async () => {
    const token = authToken();
    if (!token) return;
    const response = await fetch("/api/user/php-settings", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.message || "Unable to load PHP settings.");
    hydratePhpSettings(data);
  };

  const applyPhpSettings = async () => {
    const token = authToken();
    if (!token) {
      setPhpStatusMessage("User session expired. Log in again.");
      return;
    }
    setIsSavingPhpSettings(true);
    setPhpStatusMessage("Applying PHP runtime...");
    try {
      const response = await fetch("/api/user/php-settings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          phpVersion: selectedPhpVersion,
          targetDomains: phpTargetDomain === "all" ? "all" : [phpTargetDomain],
          extensions: phpExtensions,
          ini: {
            memory_limit: phpIniLimit,
            upload_max_filesize: phpUploadLimit,
            post_max_size: phpPostLimit,
            max_execution_time: phpMaxExecution,
            max_input_vars: phpMaxInputVars
          },
          autoInstall: true
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.message || "Unable to apply PHP settings.");
      hydratePhpSettings(data);
      const missing = Array.isArray(data.missingExtensions) && data.missingExtensions.length
        ? ` Missing: ${data.missingExtensions.join(", ")}.`
        : "";
      setPhpStatusMessage(`PHP ${data.settings?.effectiveVersion || selectedPhpVersion} applied for this account.${missing}`);
      addActivity("node", `PHP runtime applied: ${data.settings?.effectiveVersion || selectedPhpVersion}`);
    } catch (error) {
      setPhpStatusMessage(error instanceof Error ? error.message : "Unable to apply PHP settings.");
    } finally {
      setIsSavingPhpSettings(false);
    }
  };

  useEffect(() => {
    if (activeTab !== "phpversion") return;
    loadPhpSettings().catch((error) => setPhpStatusMessage(error instanceof Error ? error.message : "Unable to load PHP settings."));
  }, [activeTab, account?.username]);

  const loadNodeSettings = async () => {
    const token = authToken();
    if (!token) return;
    const response = await fetch("/api/user/node-settings", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.message || "Unable to load Node.js settings.");
    hydrateNodeSettings(data);
  };

  const applyNodeSettings = async () => {
    const token = authToken();
    if (!token) {
      setNodeStatusMessage("User session expired. Log in again.");
      return;
    }
    setIsSavingNodeSettings(true);
    setNodeStatusMessage("Applying Node.js runtime...");
    try {
      const response = await fetch("/api/user/node-settings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          nodeVersion: selectedNodeVersion,
          nodePort: Number(nodePort || 3000),
          targetDomains: nodeTargetDomain === "all" ? "all" : [nodeTargetDomain],
          autoInstall: true
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.message || "Unable to apply Node.js settings.");
      hydrateNodeSettings(data);
      setNodeStatusMessage(`Node.js ${data.settings?.effectiveVersion || selectedNodeVersion} mapped to ${nodeTargetDomain === "all" ? "all domains" : nodeTargetDomain}.`);
      addActivity("node", `Node.js runtime applied: ${data.settings?.effectiveVersion || selectedNodeVersion}`);
    } catch (error) {
      setNodeStatusMessage(error instanceof Error ? error.message : "Unable to apply Node.js settings.");
    } finally {
      setIsSavingNodeSettings(false);
    }
  };

  useEffect(() => {
    if (activeTab !== "nodeselector") return;
    loadNodeSettings().catch((error) => setNodeStatusMessage(error instanceof Error ? error.message : "Unable to load Node.js settings."));
  }, [activeTab, account?.username]);

  useEffect(() => {
    if (activeTab !== "ssh" && activeTab !== "terminal") return;
    loadSshAccess(activeTab === "terminal").catch(() => undefined);
  }, [activeTab, account?.username]);

  useEffect(() => {
    if (activeTab !== "ftp") return;
    loadFtpAccounts().catch(() => undefined);
  }, [activeTab, account?.username]);

  useEffect(() => {
    if (activeTab !== "marketplace") return;
    loadAppInstaller().catch(() => undefined);
  }, [activeTab, account?.username]);

  // Terminal scroll helper
  useEffect(() => {
    if (terminalBottomRef.current && terminalBottomRef.current.parentElement) {
      terminalBottomRef.current.parentElement.scrollTop = terminalBottomRef.current.parentElement.scrollHeight;
    }
  }, [terminalLogs]);

  // Actions trigger: FTP account builder
  const handleCreateFtpUser = async (e: FormEvent) => {
    e.preventDefault();
    if (!newFtpUser.trim() || !newFtpPassword.trim()) {
      setFtpStatus("FTP username and password are required.");
      return;
    }
    const token = authToken();
    if (!token) {
      setFtpStatus("User session expired. Log in again.");
      return;
    }
    setIsFtpBusy(true);
    setFtpStatus("Creating real FTP user, setting password, and binding folder permissions...");
    try {
      const response = await fetch("/api/user/ftp-accounts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username: newFtpUser,
          password: newFtpPassword,
          path: newFtpPath,
          quota: newFtpQuota
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.message || "Unable to create FTP account.");
      applyFtpPayload(data);
      const created = data.accounts?.[data.accounts.length - 1]?.username || newFtpUser;
      setFtpStatus(`FTP account ${created} is ready on ${data.host || ftpConnection?.host || "server"}:21.`);
      addActivity("file", `FTP username ${created} provisioned for ${newFtpPath}`);
      setNewFtpUser("");
      setNewFtpPassword("");
    } catch (error) {
      setFtpStatus(error instanceof Error ? error.message : "Unable to create FTP account.");
    } finally {
      setIsFtpBusy(false);
    }
  };

  const handleDeleteFtpUser = async (username: string) => {
    const token = authToken();
    if (!token) {
      setFtpStatus("User session expired. Log in again.");
      return;
    }
    setIsFtpBusy(true);
    setFtpStatus(`Deleting FTP user ${username} from the server...`);
    try {
      const response = await fetch(`/api/user/ftp-accounts/${encodeURIComponent(username)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.message || "Unable to delete FTP account.");
      applyFtpPayload(data);
      setFtpStatus(`FTP user ${username} was permanently removed.`);
      addActivity("file", `FTP User ${username} terminated`);
    } catch (error) {
      setFtpStatus(error instanceof Error ? error.message : "Unable to delete FTP account.");
    } finally {
      setIsFtpBusy(false);
    }
  };

  // Disk Cleaner
  const runDiskCleanup = () => {
    setCurrentDiskUsage(prev => ({
      ...prev,
      tmp_cache: 150 // reduced cache
    }));
    addActivity("file", "Server log cycle & tmp-cache file volumes recycled");
  };

  // PostgreSQL Database Builder
  const handleCreatePgDb = (e: FormEvent) => {
    e.preventDefault();
    if (!newPgDbName.trim() || !newPgUsername.trim()) return;
    const cleanDbName = "pg_" + newPgDbName.toLowerCase().replace(/\s+/g, "");
    setPgDatabases(prev => [
      ...prev,
      { name: cleanDbName, size: "8 KB", owner: newPgUsername.toLowerCase(), tablesCount: 0 }
    ]);
    addActivity("db", `PostgreSQL deployment ${cleanDbName} initiated for administrator ${newPgUsername}`);
    setNewPgDbName("");
    setNewPgUsername("");
  };

  const handleDropPgDb = (name: string) => {
    setPgDatabases(prev => prev.filter(d => d.name !== name));
    addActivity("db", `PostgreSQL cluster ${name} deleted`);
  };

  // DNS Record adding
  const handleAddDnsRecordExtra = (e: FormEvent) => {
    e.preventDefault();
    if (!newRecordName || !newRecordValue) return;
    setDomains(prev => prev.map(dom => {
      if (dom.domainName === selectedDNSDomain) {
        return {
          ...dom,
          dnsRecords: [
            ...dom.dnsRecords,
            {
              id: "dns-" + Math.random().toString(36).substr(2, 9),
              type: newRecordType,
              name: newRecordName,
              value: newRecordValue,
              ttl: 14400
            }
          ]
        };
      }
      return dom;
    }));
    addActivity("domain", `Successfully mapped record ${newRecordName} (${newRecordType}) for domain ${selectedDNSDomain}`);
    setNewRecordName("");
    setNewRecordValue("");
  };

  // Subdomain generation
  const handleCreateSubdomain = async (e: FormEvent) => {
    e.preventDefault();
    const prefix = newSubdomainPrefix.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!prefix || !selectedSubDomain) return;
    setIsCreatingSubdomain(true);
    setSubdomainStatus("Creating Nginx route, document root, DNS plan, and Auto SSL queue...");
    try {
      const saved = JSON.parse(localStorage.getItem("tpanel_auth") || "null");
      const response = await fetch("/api/user/subdomains", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${saved?.token || ""}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ prefix, parentDomain: selectedSubDomain })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok || !data.domain) {
        throw new Error(data.message || "Subdomain provisioning failed.");
      }
      const newItem = data.domain as DomainItem;
      setDomains(prev => [newItem, ...prev.filter((dom) => dom.domainName !== newItem.domainName)]);
      addActivity("domain", `Subdomain ${newItem.domainName} now serves files from ${newItem.documentRoot}`);
      setSubdomainStatus(`${newItem.domainName} is mapped to ${newItem.documentRoot}. Auto SSL is queued and will activate when DNS resolves.`);
      setNewSubdomainPrefix("");
    } catch (error: any) {
      setSubdomainStatus(error.message || "Subdomain provisioning failed.");
      addActivity("domain", `Subdomain creation failed for ${prefix}.${selectedSubDomain}`);
    } finally {
      setIsCreatingSubdomain(false);
    }
  };

  // Forwarder Adding
  const handleAddForwarder = (e: FormEvent) => {
    e.preventDefault();
    if (!newForwardSource.trim() || !newForwardDest.trim()) return;
    setEmailForwarders(prev => [...prev, { source: newForwardSource, destination: newForwardDest }]);
    addActivity("email", `Created forwarder mapping for ${newForwardSource} redirects to ${newForwardDest}`);
    setNewForwardSource("");
    setNewForwardDest("");
  };

  // Autoresponder
  const handleSetAutoresponder = (e: FormEvent) => {
    e.preventDefault();
    if (!newAutoAddress.trim() || !newAutoBody.trim()) return;
    setAutoresponders(prev => [...prev, { address: newAutoAddress, template: newAutoBody }]);
    addActivity("email", `Auto-responder configured for ${newAutoAddress}`);
    setNewAutoAddress("");
    setNewAutoBody("");
  };

  // Install application marketplace
  const triggerAppInstallation = async (app: any) => {
    if (installingApp) return;
    if (!appToInstallDomain) {
      setMarketStatus("Select a domain before installing an app.");
      return;
    }
    const token = authToken();
    if (!token) {
      setMarketStatus("User session expired. Log in again.");
      return;
    }
    setInstallingApp(app.id);
    setMarketInstallProgress(8);
    setLastInstallCredentials(null);
    setMarketStatus(`Installing ${app.name} on ${appToInstallDomain}. This may take a few minutes...`);
    const ticker = window.setInterval(() => {
      setMarketInstallProgress((value) => Math.min(value + 7, 90));
    }, 900);
    try {
      const response = await fetch("/api/user/app-installer/install", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          appId: app.id,
          domain: appToInstallDomain,
          path: appToInstallPath,
          siteTitle: appSiteTitle,
          adminUsername: appAdminUsername,
          adminPassword: appAdminPassword,
          adminEmail: appAdminEmail
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.message || "Unable to install application.");
      applyAppInstallerPayload(data);
      setMarketInstallProgress(100);
      const url = data.installation?.url || `https://${appToInstallDomain}`;
      if (data.installation?.adminUsername || data.installation?.adminPassword) {
        setLastInstallCredentials(data.installation);
      }
      setMarketStatus(`${app.name} installed at ${url}.`);
      addActivity("file", `Marketplace deployment: installed ${app.name} on ${appToInstallDomain}`);
      setAppAdminPassword("");
    } catch (error) {
      setMarketStatus(error instanceof Error ? error.message : "Unable to install application.");
      setMarketInstallProgress(0);
    } finally {
      window.clearInterval(ticker);
      setInstallingApp(null);
    }
  };

  // Block Host IP blocker Add
  const handleBlockIP = (e: FormEvent) => {
    e.preventDefault();
    if (!newBlockedIP.trim()) return;
    setBlockedIPs(prev => [...prev, newBlockedIP.trim()]);
    addActivity("ssl", `Malicious Host Blocked on port 80/443: ${newBlockedIP}`);
    setNewBlockedIP("");
  };

  // SSH Key install
  const handleInstallSsh = async (e: FormEvent) => {
    e.preventDefault();
    if (!newSshKey.trim()) return;
    const token = authToken();
    if (!token) {
      setSshStatus("User session expired. Log in again.");
      return;
    }
    setIsSshBusy(true);
    setSshStatus("Installing authorized SSH key...");
    try {
      const response = await fetch("/api/user/ssh-keys", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ publicKey: newSshKey })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.message || "Unable to install SSH key.");
      addActivity("ssl", "SSH authorized key updated for hosting account shell");
      setNewSshKey("");
      await loadSshAccess();
    } catch (error) {
      setSshStatus(error instanceof Error ? error.message : "Unable to install SSH key.");
    } finally {
      setIsSshBusy(false);
    }
  };

  const handleSetSshPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!newSshPassword.trim()) return;
    const token = authToken();
    if (!token) {
      setSshStatus("User session expired. Log in again.");
      return;
    }
    setIsSshBusy(true);
    setSshStatus("Updating SSH password...");
    try {
      const response = await fetch("/api/user/ssh-password", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ password: newSshPassword })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.message || "Unable to update SSH password.");
      if (data.account && onAccountUpdate) onAccountUpdate(data.account);
      setNewSshPassword("");
      addActivity("ssl", "SSH password updated for hosting account shell");
      await loadSshAccess();
    } catch (error) {
      setSshStatus(error instanceof Error ? error.message : "Unable to update SSH password.");
    } finally {
      setIsSshBusy(false);
    }
  };

  // Let's Encrypt Certificate installation
  const runLetsEncryptSSL = () => {
    if (isSslIssuing) return;
    setIsSslIssuing(true);
    setSslStatusLogs("Initiating domain resolution challenge...");
    setTimeout(() => {
      setSslStatusLogs(prev => prev + "\nVerifying ACME challenge endpoints...");
      setTimeout(() => {
        setSslStatusLogs(prev => prev + "\nTLS boundary verification finished success!");
        setTimeout(() => {
          setSslStatusLogs(prev => prev + "\nLet's Encrypt Wildcard Certificate installed to tPanel Keychain!");
          setIsSslIssuing(false);
          // Set SSL active on all domains
          setDomains(prev => prev.map(d => ({
            ...d,
            sslActive: true,
            sslType: "Let's Encrypt",
            sslExpiry: "Aug 24, 2026"
          })));
          addActivity("ssl", "Wildcard TLS security envelope activated successfully");
        }, 1000);
      }, 1000);
    }, 1000);
  };

  // Ruby Manager
  const handleCreateRubyApp = (e: FormEvent) => {
    e.preventDefault();
    if (!newRubyName.trim()) return;
    setRubyApps(prev => [
      ...prev, 
      { rubyVersion: "3.2.1", name: newRubyName, port: parseInt(newRubyPort), status: "Active" }
    ]);
    addActivity("node", `Ruby on Rails thread ${newRubyName} listening on port ${newRubyPort}`);
    setNewRubyName("");
  };

  // Cron Job Addition
  const handleAddCronJob = (e: FormEvent) => {
    e.preventDefault();
    if (!newCronCommand.trim()) return;
    setCronJobs(prev => [
      ...prev,
      { schedule: newCronSchedule, command: newCronCommand, lastRun: "Never" }
    ]);
    addActivity("node", `Cron core automated scheduler updated: ${newCronCommand}`);
    setNewCronCommand("");
  };

  // Interactive account terminal runner
  const runTerminalCommand = async (e: FormEvent) => {
    e.preventDefault();
    const cmd = terminalInputText.trim();
    if (!cmd) return;
    if (cmd === "clear") {
      setTerminalLogs(terminalBanner(sshInfo));
      setTerminalInputText("");
      return;
    }
    const token = authToken();
    if (!token) {
      setTerminalLogs(prev => [...prev, "User session expired. Log in again.", `${shellPrompt()} `]);
      return;
    }
    setTerminalInputText("");
    setIsTerminalRunning(true);
    setTerminalLogs(prev => [...prev, `${shellPrompt()} ${cmd}`]);
    try {
      const response = await fetch("/api/user/terminal", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ command: cmd })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.message || "Unable to run terminal command.");
      const output: string[] = [];
      if (data.stdout) output.push(String(data.stdout).trimEnd());
      if (data.stderr) output.push(String(data.stderr).trimEnd());
      if (Number(data.exitCode || 0) !== 0) output.push(`exit code ${data.exitCode}`);
      if (!output.length) output.push("Done.");
      setTerminalLogs(prev => [...prev, ...output, `${shellPrompt({ ...(sshInfo || {}), username: data.user || sshInfo?.username } as SshAccessInfo)} `]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to run terminal command.";
      setTerminalLogs(prev => [...prev, message, `${shellPrompt()} `]);
    } finally {
      setIsTerminalRunning(false);
    }
  };

  const appDomainOptions = marketDomains.length
    ? marketDomains
    : domains.map((domain) => ({ domain: domain.domainName, label: domain.domainName, documentRoot: domain.documentRoot || "/public_html" }));

  return (
    <div className="space-y-6">
      
      {/* 1. FTP ACCOUNTS tab */}
      {activeTab === "ftp" && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-slate-900 border border-slate-900/40 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-indigo-600/10 rounded-xl text-indigo-400">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-100">FTP Accounts Console</h2>
                <p className="text-xs text-slate-400">Create and authorize FTP accounts for remote deployment access</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
              <div className="bg-slate-950 border border-slate-900/40 rounded-xl p-3">
                <span className="block text-[10px] uppercase tracking-widest text-slate-500 font-bold">FTP Host</span>
                <span className="mt-1 block text-xs text-slate-100 font-mono">{ftpConnection?.host || "Loading..."}</span>
              </div>
              <div className="bg-slate-950 border border-slate-900/40 rounded-xl p-3">
                <span className="block text-[10px] uppercase tracking-widest text-slate-500 font-bold">Port</span>
                <span className="mt-1 block text-xs text-indigo-400 font-mono">{ftpConnection?.port || 21}</span>
              </div>
              <div className="bg-slate-950 border border-slate-900/40 rounded-xl p-3">
                <span className="block text-[10px] uppercase tracking-widest text-slate-500 font-bold">Account Limit</span>
                <span className="mt-1 block text-xs text-slate-100 font-mono">
                  {ftpConnection?.limits?.usedFtpAccounts ?? ftpAccounts.length}
                  {Number(ftpConnection?.limits?.maxFtpAccounts || 0) > 0 ? ` / ${ftpConnection.limits.maxFtpAccounts}` : " / Unlimited"}
                </span>
              </div>
            </div>

            {ftpStatus && (
              <div className="mb-5 rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-3 text-xs text-indigo-100">
                {ftpStatus}
              </div>
            )}

            <form onSubmit={handleCreateFtpUser} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end mb-6">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Log-In User ID</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs text-slate-500 font-mono">user</span>
                  <input
                    type="text"
                    value={newFtpUser}
                    onChange={(e) => setNewFtpUser(e.target.value)}
                    placeholder="niloy"
                    className="w-full bg-slate-950 border border-slate-900/40 rounded-xl pl-12 pr-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">FTP Password</label>
                <input
                  type="password"
                  value={newFtpPassword}
                  onChange={(e) => setNewFtpPassword(e.target.value)}
                  placeholder="8+ characters"
                  className="w-full bg-slate-950 border border-slate-900/40 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Directory Authorization</label>
                <input
                  type="text"
                  value={newFtpPath}
                  onChange={(e) => setNewFtpPath(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-900/40 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Disk Quota Limit</label>
                <select
                  value={newFtpQuota}
                  onChange={(e) => setNewFtpQuota(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-900/40 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50"
                >
                  <option value="Unlimited">Unlimited</option>
                  <option value="1024 MB">1024 MB</option>
                  <option value="2048 MB">2048 MB</option>
                  <option value="5120 MB">5120 MB</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={isFtpBusy}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {isFtpBusy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create Account
              </button>
            </form>

            <div className="overflow-x-auto rounded-xl border border-slate-900/40 bg-slate-950">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-900/40 bg-white/5 text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                    <th className="p-4">FTP Username</th>
                    <th className="p-4">Home Directory</th>
                    <th className="p-4">Disk Quota</th>
                    <th className="p-4 text-center">Usage Size</th>
                    <th className="p-4 text-right">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs text-slate-300">
                  {ftpAccounts.map((account: any, idx: number) => (
                    <tr key={idx} className="hover:bg-white/5">
                      <td className="p-4 font-mono font-medium text-slate-100">{account.username}</td>
                      <td className="p-4 text-slate-400">{account.path || account.homeDirectory}</td>
                      <td className="p-4">{account.quota}</td>
                      <td className="p-4 text-center font-mono text-indigo-400">{account.usage}</td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleDeleteFtpUser(account.username)}
                          disabled={isFtpBusy}
                          className="p-1 text-slate-500 hover:text-rose-500 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!ftpAccounts.length && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-500">
                        No FTP accounts yet. Create one to get real remote file access.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. DISK SPACE ANALYSER */}
      {activeTab === "disk" && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-slate-900 border border-slate-900/40 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-600/10 rounded-xl text-indigo-400">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-100">Disk Space Utilization</h2>
                  <p className="text-xs text-slate-400">Comprehensive mapping of storage block structures & cache volumes</p>
                </div>
              </div>
              <button
                onClick={runDiskCleanup}
                className="bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Sweep Cache logs
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
              {[
                { label: "WordPress/HTML", value: currentDiskUsage.public_html, max: 10000, color: "bg-indigo-500" },
                { label: "Node.js Projects", value: currentDiskUsage.node_apps, max: 5000, color: "bg-amber-500" },
                { label: "Relational DBs", value: currentDiskUsage.db_spaces, max: 3000, color: "bg-purple-500" },
                { label: "Email Mailboxes", value: currentDiskUsage.mailboxes, max: 2000, color: "bg-sky-500" },
                { label: "Temp Cache", value: currentDiskUsage.tmp_cache, max: 2000, color: "bg-rose-500" }
              ].map((disk, idx) => {
                const percent = Math.min((disk.value / disk.max) * 100, 100);
                return (
                  <div key={idx} className="bg-slate-950 border border-slate-900/40 rounded-2xl p-4 flex flex-col justify-between">
                    <span className="text-slate-400 text-[11px] font-semibold uppercase">{disk.label}</span>
                    <div className="border-t border-slate-900/40 pt-4 mt-2">
                      <div className="text-xl font-bold text-slate-100 mb-1">
                        {disk.value} <span className="text-xs text-slate-500">MB</span>
                      </div>
                      <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                        <div className={`h-full ${disk.color}`} style={{ width: `${percent}%` }} />
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 block">Alloc limit: {disk.max} MB</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-slate-950 border border-slate-900/40 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-100 mb-3">Directory Block Distribution Trace</h3>
              <div className="space-y-3 font-mono text-xs text-slate-300">
                <div className="flex justify-between border-b border-slate-900/40 pb-2">
                  <span>/home/tpanel/public_html (~34,203 files - assets, php)</span>
                  <span className="text-indigo-400">4,050,012 KB</span>
                </div>
                <div className="flex justify-between border-b border-slate-900/40 pb-2">
                  <span>/home/tpanel/node_apps (package bundles, javascript runtime)</span>
                  <span className="text-amber-400">2,500,291 KB</span>
                </div>
                <div className="flex justify-between border-b border-slate-900/40 pb-2">
                  <span>/var/lib/mysql (relational table records, logs index)</span>
                  <span className="text-purple-400">1,400,001 KB</span>
                </div>
                <div className="flex justify-between border-b border-slate-900/40 pb-2">
                  <span>/var/mail (maildrop mailboxes folder archives)</span>
                  <span className="text-sky-400">800,421 KB</span>
                </div>
                <div className="flex justify-between">
                  <span>/tmp (temp crashlogs, build dependencies logs)</span>
                  <span className="text-rose-400">{currentDiskUsage.tmp_cache * 1000} KB</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. POSTGRESQL DATABASES */}
      {activeTab === "postgre" && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-indigo-600/10 rounded-xl text-indigo-400">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-100">PostgreSQL Engine Administrator</h2>
                <p className="text-xs text-slate-400">Deploy scalable enterprise PostgreSQL clusters and map user ownership</p>
              </div>
            </div>

            <form onSubmit={handleCreatePgDb} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-6">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">New PostgreSQL DB Name</label>
                <div className="flex items-center">
                  <span className="bg-white/5 border border-r-0 border-slate-700 rounded-l-xl px-3 py-2 text-xs text-slate-500 font-mono">pg_</span>
                  <input
                    type="text"
                    value={newPgDbName}
                    onChange={(e) => setNewPgDbName(e.target.value)}
                    placeholder="analytics"
                    className="w-full bg-slate-950 border border-slate-700 rounded-r-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Database Owner Username</label>
                <input
                  type="text"
                  value={newPgUsername}
                  onChange={(e) => setNewPgUsername(e.target.value)}
                  placeholder="pg_admin"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
                />
              </div>
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Create PostgreSQL DB
              </button>
            </form>

            <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-950">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-700 bg-white/5 text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                    <th className="p-4">PostgreSQL Database</th>
                    <th className="p-4">Database Owner</th>
                    <th className="p-4 text-center">Row Schema Size</th>
                    <th className="p-4 text-center">Active Tables</th>
                    <th className="p-4 text-right">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs text-slate-300">
                  {pgDatabases.map((pg: any, idx: number) => (
                    <tr key={idx} className="hover:bg-white/5">
                      <td className="p-4 font-mono font-medium text-slate-100">{pg.name}</td>
                      <td className="p-4 font-mono text-slate-400">{pg.owner}</td>
                      <td className="p-4 text-center font-mono text-indigo-400">{pg.size}</td>
                      <td className="p-4 text-center">{pg.tablesCount} tables</td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleDropPgDb(pg.name)}
                          className="p-1 text-slate-500 hover:text-rose-500 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 bg-slate-950 border border-slate-700 p-4 rounded-xl text-xs flex gap-3 text-slate-400">
              <Sparkles className="w-5 h-5 text-indigo-400 shrink-0" />
              <div>
                <p className="font-semibold text-slate-250">Interactive Connection String:</p>
                <p className="font-mono mt-1 text-[11px] select-all bg-white/5 p-2 rounded border border-slate-700 overflow-x-auto">
                  postgresql://pg_admin:PASSWORD@164.92.210.82:5432/pg_auth_db?sslmode=require
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. PHPMYADMIN PORTAL */}
      {activeTab === "phpmyadmin" && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-600/10 rounded-xl text-indigo-400">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-100">phpMyAdmin</h2>
                  <p className="text-xs text-slate-400">Open the original server database console installed on this tPanel node.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const token = authToken();
                    const response = await fetch("/api/user/phpmyadmin-url", {
                      headers: { Authorization: `Bearer ${token}` }
                    });
                    const data = await response.json().catch(() => ({}));
                    if (!response.ok || !data.ok) throw new Error(data.message || "phpMyAdmin is not ready.");
                    window.location.assign(data.url || "/phpmyadmin/");
                  } catch (error) {
                    alert(error instanceof Error ? error.message : "phpMyAdmin is not ready.");
                  }
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-indigo-500"
              >
                <ArrowUpRight className="w-4 h-4" />
                Open phpMyAdmin
              </button>
            </div>

            <div className="mt-6 rounded-xl border border-slate-700 bg-slate-950 p-4">
              <p className="text-xs leading-6 text-slate-400">
                The embedded demo database screen has been removed. This shortcut now routes to the package-installed phpMyAdmin service on the server.
              </p>
              </div>
          </div>
        </div>
      )}

      {/* 5. DNS ZONE EDITOR */}
      {activeTab === "dns_zone" && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-indigo-600/10 rounded-xl text-indigo-400">
                <Network className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-100">Advanced Zone DNS Record Editor</h2>
                <p className="text-xs text-slate-400">Add, manage, and audit DNS hosting entries for connected domains</p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center mb-6 border-b border-slate-700 pb-6">
              <div className="w-full md:w-64">
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 font-sans">Active Target Domain</label>
                <select
                  value={selectedDNSDomain}
                  onChange={(e) => setSelectedDNSDomain(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
                >
                  {domains.map((dom, i) => (
                    <option key={i} value={dom.domainName}>{dom.domainName}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Record Appending Form */}
            <form onSubmit={handleAddDnsRecordExtra} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mb-6">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Record Type</label>
                <select
                  value={newRecordType}
                  onChange={(e) => setNewRecordType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
                >
                  <option value="A">A Record (IPv4)</option>
                  <option value="CNAME">CNAME Alias</option>
                  <option value="TXT">TXT Field Info</option>
                  <option value="MX">MX Mail Server</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Record Prefix Key</label>
                <input
                  type="text"
                  value={newRecordName}
                  onChange={(e) => setNewRecordName(e.target.value)}
                  placeholder="e.g. www"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Target/IP Destination Value</label>
                <input
                  type="text"
                  value={newRecordValue}
                  onChange={(e) => setNewRecordValue(e.target.value)}
                  placeholder="e.g. 164.92.210.82"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
                />
              </div>
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add DNS Record
              </button>
            </form>

            {/* active records display */}
            <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-950">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-700 bg-white/5 text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                    <th className="p-4">Resource Host Name</th>
                    <th className="p-4 text-center">Type</th>
                    <th className="p-4 text-center">TTL</th>
                    <th className="p-4">Destination Target Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs text-slate-300">
                  {domains.find(d => d.domainName === selectedDNSDomain)?.dnsRecords.map((rec, i) => (
                    <tr key={i} className="hover:bg-white/5">
                      <td className="p-4 font-mono font-medium text-slate-100">{rec.name}.{selectedDNSDomain}</td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          {rec.type}
                        </span>
                      </td>
                      <td className="p-4 text-center font-mono text-slate-500">{rec.ttl}</td>
                      <td className="p-4 font-mono text-slate-450">{rec.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 6. SUBDOMAINS */}
      {activeTab === "subdomains" && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-indigo-600/10 rounded-xl text-indigo-400">
                <Split className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-100">Create Subdomain Mappings</h2>
                <p className="text-xs text-slate-400">Deploy modular partition interfaces under your core DNS networks</p>
              </div>
            </div>

            <form onSubmit={handleCreateSubdomain} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-6">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Subdomain Name</label>
                <input
                  type="text"
                  value={newSubdomainPrefix}
                  onChange={(e) => setNewSubdomainPrefix(e.target.value)}
                  placeholder="e.g. dev"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Parent Main Domain</label>
                <select
                  value={selectedSubDomain}
                  onChange={(e) => setSelectedSubDomain(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
                >
                  {domains.filter(d => !d.domainName.includes("dev.") && !d.domainName.includes("api.")).map((dom, i) => (
                    <option key={i} value={dom.domainName}>{dom.domainName}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={isCreatingSubdomain}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" /> {isCreatingSubdomain ? "Deploying..." : "Deploy Subdomain"}
              </button>
            </form>

            {subdomainStatus && (
              <div className="mb-6 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-xs font-semibold text-slate-300">
                {subdomainStatus}
              </div>
            )}

            <div className="bg-slate-950 border border-slate-700 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-100 mb-3">Host routing directory table</h3>
              <div className="divide-y divide-white/5 text-xs text-slate-300 font-mono">
                {domains.map((dom, i) => (
                  <div key={i} className="py-2.5 flex justify-between">
                    <span>{dom.domainName}</span>
                    <span className="text-indigo-400">{dom.documentRoot}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. MAIL FORWARDERS */}
      {activeTab === "forwarders" && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-indigo-600/10 rounded-xl text-indigo-400">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-100">Email Redirection Forwarders</h2>
                <p className="text-xs text-slate-400">Map inbound public mails to outer private accounts instantly</p>
              </div>
            </div>

            <form onSubmit={handleAddForwarder} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-6">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Inbound address key</label>
                <input
                  type="text"
                  value={newForwardSource}
                  onChange={(e) => setNewForwardSource(e.target.value)}
                  placeholder="info@my-portfolio.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Forward to Destination</label>
                <input
                  type="text"
                  value={newForwardDest}
                  onChange={(e) => setNewForwardDest(e.target.value)}
                  placeholder="alimranniloy610@gmail.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500"
                />
              </div>
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Create Redirect Link
              </button>
            </form>

            <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-950">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-700 bg-white/5 text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                    <th className="p-4">Inbound Address Alias</th>
                    <th className="p-4 text-center">Redirect Vector</th>
                    <th className="p-4">Destination Mailbox target</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs text-slate-300 font-mono">
                  {emailForwarders.map((fw: any, i: number) => (
                    <tr key={i} className="hover:bg-white/5">
                      <td className="p-4 font-medium text-slate-100">{fw.source}</td>
                      <td className="p-4 text-center text-indigo-400">➜</td>
                      <td className="p-4 text-slate-400">{fw.destination}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 8. AUTORESPONDERS */}
      {activeTab === "autoresponders" && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-indigo-600/10 rounded-xl text-indigo-400">
                <Reply className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-100">Mail Autoresponders Creator</h2>
                <p className="text-xs text-slate-400">Set system-wide auto replies to respond to client letters immediately</p>
              </div>
            </div>

            <form onSubmit={handleSetAutoresponder} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">For Email Account address</label>
                  <input
                    type="text"
                    value={newAutoAddress}
                    onChange={(e) => setNewAutoAddress(e.target.value)}
                    placeholder="info@my-portfolio.com"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Auto Reply body template (HTML / TEXT)</label>
                <textarea
                  value={newAutoBody}
                  onChange={(e) => setNewAutoBody(e.target.value)}
                  rows={3}
                  placeholder="Hi there, thanks for your letter..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50"
                />
              </div>
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2 rounded-lg flex items-center gap-2 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Create Auto-Reply Agent
              </button>
            </form>

            <div className="mt-8 space-y-4">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Active Auto-responders</span>
              {autoresponders.map((au: any, i: number) => (
                <div key={i} className="bg-slate-950 border border-slate-700 p-4 rounded-xl">
                  <div className="text-xs font-bold text-slate-100 mb-1">{au.address}</div>
                  <p className="text-xs text-slate-400 bg-white/5 p-2 rounded border border-slate-700">{au.template}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 9. SSL CERTIFICATES */}
      {activeTab === "ssl" && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-indigo-600/10 rounded-xl text-indigo-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-100">SSL/TLS Security Manager</h2>
                <p className="text-xs text-slate-400">Deploy HTTPS certificate shields to encrypt all incoming user connections</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4 bg-slate-950 border border-slate-700 p-5 rounded-xl">
                <span className="text-xs font-bold text-slate-100 block">One-Click Wildcard SSL (Let's Encrypt)</span>
                <p className="text-xs text-slate-400">Check and issue free 90-day certificates with auto-renewal for all DNS mapped endpoints.</p>
                
                <button
                  onClick={runLetsEncryptSSL}
                  disabled={isSslIssuing}
                  className="bg-indigo-600 text-white hover:bg-indigo-500 transition-colors cursor-pointer px-4 py-2.5 rounded-xl text-xs font-bold w-full flex items-center justify-center gap-2 disabled:bg-slate-800 disabled:text-slate-500"
                >
                  {isSslIssuing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Provisioning HTTPS...
                    </>
                  ) : (
                    "Authorize Let's Encrypt SSL"
                  )}
                </button>
              </div>

              <div className="space-y-2 bg-slate-950 border border-slate-700 p-5 rounded-xl">
                <span className="text-xs font-bold text-slate-100 block">Active Certificates List</span>
                <div className="divide-y divide-white/5 text-xs text-slate-400 font-mono">
                  {domains.map((dom, i) => (
                    <div key={i} className="py-2 flex items-center justify-between">
                      <span>{dom.domainName}</span>
                      {dom.sslActive ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                          <ShieldCheck className="w-3.5 h-3.5" /> SECURE SSL ({dom.sslType})
                        </span>
                      ) : (
                        <span className="text-orange-500 font-semibold text-[11px]">✕ INSECURE HTTP</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {sslStatusLogs && (
              <div className="mt-6 bg-slate-950 border border-slate-700 p-4 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Acme System Logs</span>
                <pre className="font-mono text-[11px] text-indigo-300 mt-2 whitespace-pre-wrap">{sslStatusLogs}</pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 10. IP BLOCK FIREWALL */}
      {activeTab === "ipblocker" && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-indigo-600/10 rounded-xl text-indigo-400">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-100">IP Blocker & Firewall</h2>
                <p className="text-xs text-slate-400">Halt DDOS request waves by blocking unauthorized IP hosts directly</p>
              </div>
            </div>

            <form onSubmit={handleBlockIP} className="flex gap-3 mb-6 max-w-md">
              <input
                type="text"
                value={newBlockedIP}
                onChange={(e) => setNewBlockedIP(e.target.value)}
                placeholder="e.g. 198.51.100.4"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-100"
              />
              <button
                type="submit"
                className="bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs px-4 rounded-xl cursor-pointer"
              >
                Block IP
              </button>
            </form>

            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Banned Address roster</span>
            <div className="mt-3 space-y-2 max-w-md">
              {blockedIPs.map((ip: string, i: number) => (
                <div key={i} className="flex items-center justify-between bg-slate-950 border border-slate-700 p-3 rounded-xl font-mono text-xs">
                  <span className="text-rose-400">{ip} (Ban Status: Active)</span>
                  <button
                    onClick={() => setBlockedIPs(prev => prev.filter(item => item !== ip))}
                    className="text-slate-500 hover:text-indigo-400 transition-colors font-bold cursor-pointer"
                  >
                    Unblock
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 11. SSH SHELL ACCESS KEYS */}
      {activeTab === "ssh" && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-600/10 rounded-xl text-indigo-400">
                <Terminal className="w-5 h-5" />
              </div>
              <div>
                  <h2 className="text-lg font-bold text-slate-100">SSH Shell Access</h2>
                  <p className="text-xs text-slate-400">Real Linux user access for this hosting account only</p>
                </div>
              </div>
              <button
                onClick={() => loadSshAccess()}
                disabled={isSshBusy}
                className="px-3 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 flex items-center gap-2 disabled:opacity-60"
              >
                <RefreshCw className={`w-4 h-4 ${isSshBusy ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>

            {sshStatus && (
              <div className={`mb-5 rounded-xl border px-4 py-3 text-xs ${
                sshInfo ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" : "bg-amber-500/10 border-amber-500/20 text-amber-300"
              }`}>
                {sshStatus}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-6">
                <form onSubmit={handleInstallSsh} className="space-y-4">
                  <label className="block text-xs font-semibold text-slate-400">Paste Authorized Public SSH Key (.pub file contents)</label>
                  <textarea
                    value={newSshKey}
                    onChange={(e) => setNewSshKey(e.target.value)}
                    rows={4}
                    placeholder="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={isSshBusy}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer disabled:opacity-60"
                  >
                    Publish Public Key
                  </button>
                </form>

                <form onSubmit={handleSetSshPassword} className="space-y-4 border-t border-slate-800 pt-5">
                  <label className="block text-xs font-semibold text-slate-400">Set SSH Password</label>
                  <input
                    type="password"
                    minLength={8}
                    value={newSshPassword}
                    onChange={(e) => setNewSshPassword(e.target.value)}
                    placeholder={sshInfo?.passwordSet ? "Enter a new password" : "Create SSH password"}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={isSshBusy}
                    className="bg-slate-100 hover:bg-white text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer disabled:opacity-60"
                  >
                    Save SSH Password
                  </button>
                </form>
              </div>

              <div className="bg-slate-950 border border-slate-700 p-5 rounded-xl text-xs space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-slate-500 font-bold">Linux User</span>
                    <code className="text-emerald-300 font-mono">{sshInfo?.username || account?.username || "Not enabled"}</code>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-slate-500 font-bold">Port</span>
                    <code className="text-slate-200 font-mono">{sshInfo?.port || 22}</code>
                  </div>
                </div>

                <div>
                  <span className="font-bold text-slate-100 text-[11px]">Console connection command:</span>
                  <code className="block mt-1 font-mono text-[11px] select-all p-2 bg-white/5 rounded border border-slate-700 text-amber-400 whitespace-pre-wrap break-all">
                    {sshInfo?.command || "Shell access is disabled for this account."}
                  </code>
                </div>

                <div>
                  <span className="font-bold text-slate-100 text-[11px]">Account home:</span>
                  <code className="block mt-1 font-mono text-[11px] select-all p-2 bg-white/5 rounded border border-slate-700 text-slate-300 whitespace-pre-wrap break-all">
                    {sshInfo?.homeDirectory || account?.homeDirectory || "Unavailable"}
                  </code>
                </div>

                <div className="border-t border-slate-700 pt-3 space-y-2">
                  <span className="font-bold text-slate-100 text-[11px]">Authorized keys ({sshInfo?.keys?.length || 0})</span>
                  {(sshInfo?.keys || []).length > 0 ? (
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {sshInfo?.keys.map((key, idx) => (
                        <pre key={idx} className="p-2.5 bg-white/5 border border-slate-700 rounded font-mono text-[10px] text-slate-400 whitespace-pre-wrap break-all">
                          {key}
                        </pre>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500">No SSH key installed yet.</p>
                  )}
                  <div className="text-[11px] text-slate-400">
                    Password login: <span className={sshInfo?.passwordSet ? "text-emerald-300" : "text-amber-300"}>{sshInfo?.passwordSet ? "Configured" : "Not configured"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 12. LIVE VISITORS LOG */}
      {activeTab === "visitors" && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-600/10 rounded-xl text-indigo-400">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-100">Live Visitor Telemetry Logs</h2>
                  <p className="text-xs text-slate-400">Real-time HTTP traffic tracking and browser metadata inspection</p>
                </div>
              </div>
              <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-bold">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" /> Real-time active connection lines
              </span>
            </div>

            {/* Custom Bar Chart Visualization */}
            <div className="bg-slate-950 border border-slate-700 p-5 rounded-xl mb-6">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-4">Traffic Peaks Index (Past 24 Hours)</span>
              <div className="h-44 flex items-end justify-between gap-1.5">
                {visitorTraffic.map((hour, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full flex flex-col items-end gap-1 flex-1 justify-end">
                      <div className="bg-indigo-500 w-full rounded-sm" style={{ height: `${(hour.hits / 250) * 100}%` }} title={`Hits: ${hour.hits}`} />
                      <div className="bg-amber-500 w-full rounded-sm" style={{ height: `${(hour.visitors / 250) * 100}%` }} title={`Visitors: ${hour.visitors}`} />
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono mt-1">{hour.time}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-center gap-6 mt-4 text-xs font-mono">
                <span className="flex items-center gap-2 text-indigo-400">
                  <span className="w-2.5 h-2.5 bg-indigo-500 rounded" /> Inbound hits trace
                </span>
                <span className="flex items-center gap-2 text-amber-400">
                  <span className="w-2.5 h-2.5 bg-amber-500 rounded" /> Unique IP Clients
                </span>
              </div>
            </div>

            {/* Simulated log tail */}
            <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-950">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="border-b border-slate-700 bg-white/5 text-slate-400 font-semibold">
                    <th className="p-3">IP Address</th>
                    <th className="p-3">Inbound Pathway</th>
                    <th className="p-3 text-center">Protocol Code</th>
                    <th className="p-3">Web Browser / OS Agent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {[
                    { ip: "66.249.66.19", path: "/sitemap.xml", status: "200 OK", agent: "Googlebot/2.1 (Chrome Linux)" },
                    { ip: "157.44.18.232", path: "/api/products", status: "200 OK", agent: "Mozilla/5.0 (iPhone iOS 17.4)" },
                    { ip: "192.138.22.8", path: "/wp-login.php", status: "404 Not Found", agent: "Wget/1.21.1 (Linux)" },
                    { ip: "94.23.41.98", path: "/images/hero.webp", status: "200 OK", agent: "Mozilla/5.0 (Mac OS Chrome 124)" }
                  ].map((log, i) => (
                    <tr key={i} className="hover:bg-white/5">
                      <td className="p-3 font-semibold text-slate-100">{log.ip}</td>
                      <td className="p-3 text-slate-300">{log.path}</td>
                      <td className="p-3 text-center text-emerald-400 font-bold">{log.status}</td>
                      <td className="p-3 text-slate-500">{log.agent}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 13. BANDWIDTH STATS */}
      {activeTab === "bandwidth" && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-indigo-600/10 rounded-xl text-indigo-400">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-100">Bandwidth Performance Stats</h2>
                <p className="text-xs text-slate-400">Verify monthly bandwidth volume allocation grids and billing records</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-slate-950 border border-slate-700 p-5 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-slate-400 text-xs font-semibold uppercase">Monthly Volume Consumed</span>
                  <div className="text-3xl font-bold text-slate-100 mt-1">
                    42.8 <span className="text-sm font-semibold text-slate-500">GB</span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Active Period: Oct 01 - Oct 31, 2024</span>
                </div>
                <div className="w-24 h-24 relative flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="48" cy="48" r="38" stroke="currentColor" strokeWidth="6" className="text-white/5" fill="none" />
                    <circle cx="48" cy="48" r="38" stroke="currentColor" strokeWidth="6" className="text-indigo-500" strokeDasharray="238" strokeDashoffset="120" fill="none" />
                  </svg>
                  <span className="absolute text-xs font-bold text-slate-100">50%</span>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-700 p-5 rounded-xl flex flex-col justify-between">
                <div>
                  <span className="text-slate-400 text-xs font-semibold uppercase font-sans">Active speed telemetry</span>
                  <div className="flex gap-4 mt-3 font-mono text-xs">
                    <div>
                      <span className="text-slate-500 block">Outbound stream rate:</span>
                      <span className="text-indigo-400 font-bold">12.4 MB/s</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Inbound stream rate:</span>
                      <span className="text-amber-400 font-bold">1.8 MB/s</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 14. SELECT PHP VERSION */}
      {activeTab === "phpversion" && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-indigo-600/10 rounded-xl text-indigo-400">
                <FileCode2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-100">Select Active PHP Version Selector</h2>
                <p className="text-xs text-slate-400">Change PHP execution core versions and activate/toggle compiler modules</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 bg-slate-950 border border-slate-700 p-4 rounded-xl mb-6 md:grid-cols-[1fr_220px_180px_auto] md:items-center">
              <div>
                <span className="block text-xs text-slate-400">Account runtime:</span>
                <span className="text-lg font-mono font-bold text-slate-100">
                  PHP {selectedPhpVersion}
                  {account?.domain ? <span className="ml-2 text-xs font-semibold text-slate-500">for {account.domain}</span> : null}
                </span>
                {phpDiagnostics?.phpErrorLog ? (
                  <p className="mt-1 text-[11px] text-amber-400">Recent PHP error log detected below.</p>
                ) : (
                  <p className="mt-1 text-[11px] text-emerald-400">Missing PHP versions and selected extensions install automatically on apply.</p>
                )}
              </div>
              <select
                value={phpTargetDomain}
                onChange={(e) => setPhpTargetDomain(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-xs text-slate-100"
              >
                <option value="all">All domains</option>
                {(runtimeDomains.length ? runtimeDomains : domains.map((domain) => ({ domain: domain.domainName, label: "Domain" }))).map((entry: any) => (
                  <option key={entry.domain} value={entry.domain}>{entry.domain}</option>
                ))}
              </select>
              <select
                value={selectedPhpVersion}
                onChange={(e) => setSelectedPhpVersion(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-xs text-slate-100"
              >
                {(phpAvailableVersions.length ? phpAvailableVersions : ["8.4", "8.3", "8.2", "8.1", "8.0", "7.4"]).map((version) => (
                  <option key={version} value={version}>PHP {version}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={applyPhpSettings}
                disabled={isSavingPhpSettings}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingPhpSettings ? "Applying..." : "Apply"}
              </button>
            </div>

            {runtimeDomains.length > 0 && (
              <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {runtimeDomains.map((entry: any) => (
                  <div key={entry.domain} className="rounded-xl border border-slate-700 bg-slate-950 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-xs font-bold text-slate-100">{entry.domain}</span>
                      <span className="rounded border border-slate-700 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-400">
                        {entry.runtime?.runtime || "php"}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-[11px] text-slate-500">{entry.webPath || entry.documentRoot}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Extensions Selector */}
            <span className="text-[10px] uppercase font-bold text-slate-450 tracking-wider">PHP extension modules</span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
              {(phpExtensionRows.length ? phpExtensionRows : Object.keys(phpExtensions).map((name) => ({ name, installed: true, selected: phpExtensions[name] }))).map((row) => (
                (() => {
                  const extKey = row.name;
                  const checked = Boolean(phpExtensions[extKey]);
                  return (
                <div key={extKey} className="flex items-center justify-between bg-slate-950 border border-slate-700 p-3 rounded-xl">
                  <span className="text-xs font-mono text-slate-100">
                    {extKey}
                    <span className={`ml-1 text-[9px] ${row.installed ? "text-emerald-400" : "text-amber-400"}`}>
                      {row.installed ? "installed" : "missing"}
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const next = { ...phpExtensions, [extKey]: e.target.checked };
                      setPhpExtensions(next);
                    }}
                    className="w-4 h-4 text-indigo-600 border-slate-700 bg-slate-900 focus:ring-0 rounded"
                  />
                </div>
                  );
                })()
              ))}
            </div>

            {/* php.ini overrides */}
            <div className="mt-8 bg-slate-950 border border-slate-700 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-slate-200 mb-3">Account php.ini overrides</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <span className="block text-[11px] text-slate-500">memory_limit</span>
                  <input
                    type="text"
                    value={phpIniLimit}
                    onChange={(e) => setPhpIniLimit(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 p-2 rounded text-xs text-slate-100"
                  />
                </div>
                <div>
                  <span className="block text-[11px] text-slate-500">upload_max_filesize</span>
                  <input
                    type="text"
                    value={phpUploadLimit}
                    onChange={(e) => setPhpUploadLimit(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 p-2 rounded text-xs text-slate-100"
                  />
                </div>
                <div>
                  <span className="block text-[11px] text-slate-500">post_max_size</span>
                  <input
                    type="text"
                    value={phpPostLimit}
                    onChange={(e) => setPhpPostLimit(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 p-2 rounded text-xs text-slate-100"
                  />
                </div>
                <div>
                  <span className="block text-[11px] text-slate-500">max_execution_time</span>
                  <input
                    type="text"
                    value={phpMaxExecution}
                    onChange={(e) => setPhpMaxExecution(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 p-2 rounded text-xs text-slate-100"
                  />
                </div>
                <div>
                  <span className="block text-[11px] text-slate-500">max_input_vars</span>
                  <input
                    type="text"
                    value={phpMaxInputVars}
                    onChange={(e) => setPhpMaxInputVars(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 p-2 rounded text-xs text-slate-100"
                  />
                </div>
              </div>
              {phpStatusMessage && (
                <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900 p-3 text-xs font-semibold text-slate-200">
                  {phpStatusMessage}
                </div>
              )}
              {phpDiagnostics?.phpErrorLog && (
                <pre className="mt-4 max-h-48 overflow-auto rounded-lg border border-amber-500/20 bg-amber-950/20 p-3 text-[11px] text-amber-100">
                  {phpDiagnostics.phpErrorLog}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 15. SELECT NODE VERSION */}
      {activeTab === "nodeselector" && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-emerald-600/10 rounded-xl text-emerald-400">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-100">Node.js Selector</h2>
                <p className="text-xs text-slate-400">Choose the Node.js executable version and map it to all domains or one domain route.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 bg-slate-950 border border-slate-700 p-4 rounded-xl mb-6 md:grid-cols-[1fr_220px_180px_130px_auto] md:items-center">
              <div>
                <span className="block text-xs text-slate-400">Active runtime:</span>
                <span className="text-lg font-mono font-bold text-slate-100">
                  Node.js {selectedNodeVersion}
                  {account?.domain ? <span className="ml-2 text-xs font-semibold text-slate-500">for {account.domain}</span> : null}
                </span>
                <p className="mt-1 text-[11px] text-emerald-400">Missing Node.js versions are downloaded automatically on apply.</p>
              </div>
              <select
                value={nodeTargetDomain}
                onChange={(e) => setNodeTargetDomain(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-xs text-slate-100"
              >
                <option value="all">All domains</option>
                {(runtimeDomains.length ? runtimeDomains : domains.map((domain) => ({ domain: domain.domainName, label: "Domain" }))).map((entry: any) => (
                  <option key={entry.domain} value={entry.domain}>{entry.domain}</option>
                ))}
              </select>
              <select
                value={selectedNodeVersion}
                onChange={(e) => setSelectedNodeVersion(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-xs text-slate-100"
              >
                {(nodeAvailableVersions.length ? nodeAvailableVersions : ["26.3.0", "24.16.0", "22.22.3", "20.20.2", "18.20.8", "16.20.2"]).map((version) => (
                  <option key={version} value={version}>Node.js {version}</option>
                ))}
              </select>
              <input
                type="number"
                min={1024}
                max={65535}
                value={nodePort}
                onChange={(e) => setNodePort(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-xs text-slate-100"
                aria-label="Node.js app port"
              />
              <button
                type="button"
                onClick={applyNodeSettings}
                disabled={isSavingNodeSettings}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingNodeSettings ? "Applying..." : "Apply"}
              </button>
            </div>

            {nodeStatusMessage && (
              <div className="mb-6 rounded-lg border border-slate-700 bg-slate-950 p-3 text-xs font-semibold text-slate-200">
                {nodeStatusMessage}
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {(runtimeDomains.length ? runtimeDomains : domains.map((domain) => ({ domain: domain.domainName, webPath: domain.documentRoot, runtime: { runtime: "php" } }))).map((entry: any) => (
                <div key={entry.domain} className="rounded-xl border border-slate-700 bg-slate-950 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-xs font-bold text-slate-100">{entry.domain}</span>
                    <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${
                      entry.runtime?.runtime === "node" ? "border-emerald-500/20 text-emerald-400" : "border-slate-700 text-slate-400"
                    }`}>
                      {entry.runtime?.runtime || "php"}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-[11px] text-slate-500">{entry.webPath || entry.documentRoot}</p>
                  {entry.runtime?.runtime === "node" && (
                    <p className="mt-2 text-[11px] font-mono text-emerald-400">
                      v{entry.runtime.nodeVersion} :{entry.runtime.nodePort || nodePort}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {nodeDiagnostics?.provisioningLog?.length > 0 && (
              <pre className="mt-6 max-h-48 overflow-auto rounded-lg border border-slate-700 bg-slate-950 p-3 text-[11px] text-slate-300">
                {nodeDiagnostics.provisioningLog.join("\n")}
              </pre>
            )}
          </div>
        </div>
      )}

      {/* 15. RUBY APPLICATION SUITE */}
      {activeTab === "ruby" && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-indigo-600/10 rounded-xl text-indigo-400">
                <Gem className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-100">Ruby Application Coordinator</h2>
                <p className="text-xs text-slate-400">Deploy and scale robust Ruby on Rails, Sinatra or Jekyll rack environments</p>
              </div>
            </div>

            <form onSubmit={handleCreateRubyApp} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-6">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 font-sans">Rails App Module Name</label>
                <input
                  type="text"
                  value={newRubyName}
                  onChange={(e) => setNewRubyName(e.target.value)}
                  placeholder="Sinatra Backend"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 font-sans">Assigned Router Port</label>
                <input
                  type="number"
                  value={newRubyPort}
                  onChange={(e) => setNewRubyPort(e.target.value)}
                  placeholder="3000"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono"
                />
              </div>
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Initialize Ruby Application
              </button>
            </form>

            <span className="text-[10px] uppercase font-bold text-slate-450 tracking-wider">Deploy Ruby Rack apps</span>
            <div className="mt-3 space-y-3">
              {rubyApps.map((app: any, i: number) => (
                <div key={i} className="flex items-center justify-between bg-slate-950 border border-slate-700 p-4 rounded-xl">
                  <div>
                    <span className="font-bold text-slate-100 font-sans">{app.name}</span>
                    <span className="text-[10px] text-slate-500 ml-3">Ruby v{app.rubyVersion}</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono text-xs">
                    <span className="text-indigo-400">Port: {app.port}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{app.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 16. APP MARKETPLACE */}
      {activeTab === "marketplace" && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6 border-b border-slate-700 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-600/10 rounded-xl text-indigo-400">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-100">One-Click App Installer Marketplace</h2>
                  <p className="text-xs text-slate-400">Install real PHP and Node-ready app packages on your selected domain</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadAppInstaller()}
                  disabled={Boolean(installingApp)}
                  className="bg-slate-950 hover:bg-slate-800 disabled:opacity-60 border border-slate-700 text-slate-200 font-semibold text-xs px-3 py-2 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${installingApp ? "animate-spin" : ""}`} /> Refresh
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 mb-6">
              <div className="lg:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Install Domain</label>
                <select
                  value={appToInstallDomain}
                  onChange={(e) => setAppToInstallDomain(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-100"
                >
                  {appDomainOptions.map((dom: any, i: number) => (
                    <option key={i} value={dom.domain}>{dom.label || dom.domain}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Subfolder</label>
                <input
                  type="text"
                  value={appToInstallPath}
                  onChange={(e) => setAppToInstallPath(e.target.value)}
                  placeholder="blank = root"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-100 placeholder-slate-600"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Site Title</label>
                <input
                  type="text"
                  value={appSiteTitle}
                  onChange={(e) => setAppSiteTitle(e.target.value)}
                  placeholder="Website title"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-100 placeholder-slate-600"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Admin User</label>
                <input
                  type="text"
                  value={appAdminUsername}
                  onChange={(e) => setAppAdminUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-100 placeholder-slate-600"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Admin Password</label>
                <input
                  type="password"
                  value={appAdminPassword}
                  onChange={(e) => setAppAdminPassword(e.target.value)}
                  placeholder="auto if blank"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-100 placeholder-slate-600"
                />
              </div>
              <div className="lg:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Admin Email</label>
                <input
                  type="email"
                  value={appAdminEmail}
                  onChange={(e) => setAppAdminEmail(e.target.value)}
                  placeholder={`admin@${appToInstallDomain || "domain.com"}`}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-100 placeholder-slate-600"
                />
              </div>
            </div>

            {/* Installation Indicator Progress Area */}
            {(installingApp || marketStatus) && (
              <div className="bg-slate-950 border border-indigo-500/10 p-5 rounded-xl mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-slate-300 font-semibold">{marketStatus || "Preparing installer..."}</span>
                  {installingApp && <span className="text-xs text-indigo-400 font-mono font-bold">{marketInstallProgress}%</span>}
                </div>
                {installingApp && (
                  <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-full transition-all duration-300" style={{ width: `${marketInstallProgress}%` }} />
                  </div>
                )}
              </div>
            )}

            {lastInstallCredentials && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl mb-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs">
                  <div>
                    <span className="block text-emerald-300 font-bold">{lastInstallCredentials.name} admin login is ready</span>
                    <span className="text-slate-300 font-mono break-all">{lastInstallCredentials.adminUrl || lastInstallCredentials.url}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-slate-200">
                    <span className="font-mono">user: {lastInstallCredentials.adminUsername || "n/a"}</span>
                    <span className="font-mono">pass: {lastInstallCredentials.adminPassword || "set by installer"}</span>
                    <span className="font-mono">email: {lastInstallCredentials.adminEmail || "n/a"}</span>
                    {(lastInstallCredentials.adminUrl || lastInstallCredentials.url) && (
                      <a href={lastInstallCredentials.adminUrl || lastInstallCredentials.url} target="_blank" rel="noreferrer" className="font-bold text-emerald-300 hover:text-emerald-200 inline-flex items-center gap-1">
                        Admin Login <ArrowUpRight className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Catalog Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {appCatalog.map((app, i) => (
                <div key={app.id || i} className="bg-slate-950 border border-slate-700 p-5 rounded-2xl flex flex-col justify-between min-h-56 hover:border-indigo-500/40 transition-colors">
                  <div>
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {app.logo ? (
                          <img src={app.logo} alt={`${app.name} logo`} className="w-11 h-11 rounded-xl bg-white object-cover shrink-0" draggable={false} />
                        ) : (
                          <div className="w-11 h-11 rounded-xl bg-indigo-600/20 flex items-center justify-center text-indigo-300 font-bold shrink-0">
                            {String(app.name || "A").slice(0, 1)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h3 className="text-base font-bold text-slate-100 truncate">{app.name}</h3>
                          <span className="text-[10px] text-slate-500 font-mono">{app.runtime} / {app.category}</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono shrink-0">v{app.version}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-4 leading-relaxed">{app.description}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {app.database && <span className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[10px] font-bold">Database</span>}
                      {app.automatedAdmin && <span className="px-2 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[10px] font-bold">Auto Admin</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => triggerAppInstallation(app)}
                    disabled={Boolean(installingApp) || !appToInstallDomain}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-3 py-2 rounded-lg text-center transition-colors disabled:bg-slate-800 disabled:text-slate-500 cursor-pointer"
                  >
                    {installingApp === app.id ? "Installing..." : `Deploy to ${appToInstallDomain || "domain"}`}
                  </button>
                </div>
              ))}
              {!appCatalog.length && (
                <div className="md:col-span-3 bg-slate-950 border border-slate-700 p-8 rounded-2xl text-center text-sm text-slate-400">
                  {marketStatus || "No app packages are available yet."}
                </div>
              )}
            </div>

            {/* Activated Instances List */}
            <div className="mt-8 bg-slate-950 border border-slate-700 p-5 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-slate-450 tracking-wider">Installed Web Application nodes</span>
              <div className="divide-y divide-white/5 mt-3 text-xs text-slate-300">
                {installedApps.map((app: any, idx: number) => (
                  <div key={idx} className="py-2.5 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-slate-100 mr-3">{app.name}</span>
                      <span className="text-[10px] text-slate-500">v{app.version}</span>
                      {app.adminUsername && <span className="text-[10px] text-indigo-400 ml-3">admin: {app.adminUsername}</span>}
                    </div>
                    <div className="font-mono text-[11px] text-slate-400 text-right">
                      Domain: <span className="text-indigo-400">{app.domain}</span> | path: <span className="text-amber-500">{app.path || "/"}</span>
                      {app.url && (
                        <a href={app.url} target="_blank" rel="noreferrer" className="ml-3 text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1">
                          Open <ArrowUpRight className="w-3 h-3" />
                        </a>
                      )}
                      {app.adminUrl && (
                        <a href={app.adminUrl} target="_blank" rel="noreferrer" className="ml-3 text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1">
                          Admin Login <ArrowUpRight className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
                {!installedApps.length && (
                  <div className="py-5 text-center text-slate-500">
                    Installed apps will appear here after the server finishes provisioning.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 17. CRON JOBS AUTOMATION */}
      {activeTab === "cron" && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-indigo-600/10 rounded-xl text-indigo-400">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-100">Cron Jobs Automated scheduler</h2>
                <p className="text-xs text-slate-400">Configure background cron tasks with minute/hour interval triggers</p>
              </div>
            </div>

            <form onSubmit={handleAddCronJob} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mb-6">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 font-sans">Timing Token</label>
                <select
                  value={newCronSchedule}
                  onChange={(e) => setNewCronSchedule(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
                >
                  <option value="0 0 * * *">Once Per Day (0 0 * * *)</option>
                  <option value="0 * * * *">Every Hour (0 * * * *)</option>
                  <option value="*/15 * * * *">Every 15 Minutes (*/15 * * * *)</option>
                  <option value="0 0 * * 0">Every Sunday (0 0 * * 0)</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 font-sans">Command string to execute</label>
                <input
                  type="text"
                  value={newCronCommand}
                  onChange={(e) => setNewCronCommand(e.target.value)}
                  placeholder="php /home/tpanel/public_html/mailer.php"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500"
                />
              </div>
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add Cron script
              </button>
            </form>

            <span className="text-[10px] uppercase font-bold text-slate-450 tracking-wider">Bespoke active tasks schedulers</span>
            <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-950 mt-3">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="border-b border-slate-700 bg-white/5 text-slate-450 font-semibold">
                    <th className="p-3">Schedule Interval</th>
                    <th className="p-3">System Exec command</th>
                    <th className="p-3">Last Trace Cycle Output</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {cronJobs.map((cj: any, i: number) => (
                    <tr key={i} className="hover:bg-white/5">
                      <td className="p-3 text-indigo-400 font-bold">{cj.schedule}</td>
                      <td className="p-3 text-slate-100">{cj.command}</td>
                      <td className="p-3 text-slate-500">{cj.lastRun}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 18. INTERACTIVE SHELL */}
      {activeTab === "terminal" && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-indigo-600/10 rounded-xl text-indigo-400">
                <Terminal className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-100">Interactive Account Shell</h2>
                <p className="text-xs text-slate-400">Commands run as your hosting Linux user inside the account home</p>
              </div>
            </div>

            <div className="bg-slate-950 rounded-2xl border border-slate-700 p-4 flex flex-col h-96 font-mono text-xs overflow-hidden">
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-slate-300">
                {terminalLogs.map((log, idx) => {
                  if (log.includes("@tpanel:~$")) {
                    return (
                      <div key={idx} className="text-indigo-400 font-semibold">
                        {log}
                      </div>
                    );
                  }
                  return (
                    <div key={idx} className="whitespace-pre-wrap leading-relaxed">
                      {log}
                    </div>
                  );
                })}
                <div ref={terminalBottomRef} />
              </div>

              <form onSubmit={runTerminalCommand} className="flex gap-2 border-t border-slate-700 pt-3 mt-2 shrink-0">
                <span className="text-indigo-400 font-semibold flex items-center shrink-0">{shellPrompt()}</span>
                <input
                  type="text"
                  value={terminalInputText}
                  onChange={(e) => setTerminalInputText(e.target.value)}
                  placeholder={isTerminalRunning ? "Command is running..." : "npm install, ls, php -v, node -v..."}
                  disabled={isTerminalRunning}
                  className="flex-1 bg-transparent border-none outline-none text-slate-200 focus:outline-none focus:ring-0 p-0 text-xs font-mono"
                  autoFocus
                />
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
