import React, { useEffect, useState, useMemo } from "react";
import { 
  Users, 
  Terminal, 
  Settings, 
  Box, 
  Database, 
  Mail, 
  Search, 
  Menu, 
  X,
  Plus,
  ArrowRight,
  ShieldCheck,
  HardDrive,
  Activity,
  Globe,
  Cpu,
  LogOut,
  ChevronRight,
  Zap,
  Server,
  Key,
  Lock,
  Cloud,
  FileCode,
  Wifi,
  ExternalLink,
  LifeBuoy,
  Grid,
  Hash,
  Download,
  Upload,
  RefreshCw,
  MoreVertical,
  Monitor,
  Eye,
  Trash2,
  List,
  Folder,
  Gem,
  ShieldAlert,
  Clock,
  Unlock,
  RotateCw
} from "lucide-react";
import BrandLogo from "./BrandLogo";

interface AdminPanelProps {
  onLogout: () => void;
}

// Comprehensive tPanel modules list
const MODULES = [
  // Server Configuration
  { id: "config-basic", label: "Basic tPanel Setup", icon: Settings, category: "server" },
  { id: "config-domain", label: "Domain Settings", icon: Globe, category: "server" },
  { id: "config-change", label: "Change Hostname", icon: Globe, category: "server" },
  { id: "config-tweak", label: "Tweak Settings", icon: Zap, category: "server" },
  { id: "config-update", label: "Update Preferences", icon: Activity, category: "server" },
  { id: "config-initial", label: "Initial Quota Setup", icon: HardDrive, category: "server" },
  { id: "config-remote", label: "Remote Access Key", icon: Key, category: "server" },
  { id: "config-stats", label: "Statistics Software Configuration", icon: Activity, category: "server" },
  { id: "config-locales", label: "Locales Manager", icon: Globe, category: "server" },
  { id: "config-time", label: "Server Time", icon: Activity, category: "server" },
  { id: "config-background", label: "Background Process Killer", icon: Trash2, category: "server" },

  // Account Functions
  { id: "acc-create", label: "Create a New Account", icon: Plus, category: "account" },
  { id: "acc-list", label: "List Accounts", icon: Box, category: "account" },
  { id: "acc-modify", label: "Modify an Account", icon: Settings, category: "account" },
  { id: "acc-password", label: "Password Modification", icon: Lock, category: "account" },
  { id: "acc-quota", label: "Quota Modification", icon: HardDrive, category: "account" },
  { id: "acc-suspend", label: "Manage Account Suspension", icon: ShieldCheck, category: "account" },
  { id: "acc-terminate", label: "Terminate an Account", icon: X, category: "account" },
  { id: "acc-upgrade", label: "Upgrade/Downgrade an Account", icon: ArrowRight, category: "account" },
  { id: "acc-limit", label: "Limit Bandwidth Usage", icon: Wifi, category: "account" },
  { id: "acc-skele", label: "Skeleton Directory", icon: Box, category: "account" },
  { id: "acc-restore", label: "Restore a Full Backup/cpmove File", icon: Download, category: "account" },

  // Multi Account Functions
  { id: "multi-modify", label: "Modify Multiple Accounts", icon: Users, category: "multi" },
  { id: "multi-terminate", label: "Terminate Multiple Accounts", icon: Trash2, category: "multi" },
  { id: "multi-quota", label: "Change Multiple Quotas", icon: HardDrive, category: "multi" },
  { id: "multi-pass", label: "Change Multiple Passwords", icon: Lock, category: "multi" },

  // DNS Functions
  { id: "dns-add", label: "Add a DNS Zone", icon: Plus, category: "dns" },
  { id: "dns-edit", label: "Edit DNS Zone", icon: FileCode, category: "dns" },
  { id: "dns-park", label: "Park a Domain", icon: Globe, category: "dns" },
  { id: "dns-delete", label: "Delete a DNS Zone", icon: X, category: "dns" },
  { id: "dns-reset", label: "Reset a DNS Zone", icon: Activity, category: "dns" },
  { id: "dns-mx", label: "Edit MX Entry", icon: Mail, category: "dns" },
  { id: "dns-sync", label: "Synchronize DNS Records", icon: RefreshCw, category: "dns" },
  { id: "dns-cluster", label: "DNS Cluster", icon: Grid, category: "dns" },

  // SQL Services
  { id: "sql-root", label: "MySQL® Root Manager", icon: Database, category: "sql" },
  { id: "sql-pass", label: "MySQL® Password Modification", icon: Lock, category: "sql" },
  { id: "sql-repair", label: "Repair Databases", icon: Activity, category: "sql" },
  { id: "sql-show", label: "Show MySQL® Processes", icon: Cpu, category: "sql" },
  { id: "sql-remote", label: "Additional MySQL® Access Hosts", icon: Globe, category: "sql" },
  { id: "sql-upgrade", label: "MySQL®/MariaDB Upgrade", icon: Zap, category: "sql" },

  // IP Functions
  { id: "ip-add", label: "Add a New IP Address", icon: Plus, category: "ip" },
  { id: "ip-list", label: "Show IP Address Usage", icon: Activity, category: "ip" },
  { id: "ip-rebuild", label: "Rebuild IP Address Pool", icon: Zap, category: "ip" },
  { id: "ip-change", label: "Change a Site's IP Address", icon: ArrowRight, category: "ip" },
  { id: "ip-delegate", label: "IP Delegation", icon: Users, category: "ip" },

  // Security Center
  { id: "sec-terminal", label: "Terminal Access", icon: Terminal, category: "security" },
  { id: "sec-cphulk", label: "tPanel Brute Force Protection", icon: ShieldCheck, category: "security" },
  { id: "sec-shell", label: "Manage Shell Access", icon: Terminal, category: "security" },
  { id: "sec-ssh", label: "Manage SSH Keys", icon: Key, category: "security" },
  { id: "sec-firewall", label: "ConfigServer Firewall (CSF)", icon: Lock, category: "security" },
  { id: "sec-compiler", label: "Compiler Access", icon: Terminal, category: "security" },
  { id: "sec-api", label: "Manage API Tokens", icon: Key, category: "security" },
  { id: "sec-modsec", label: "ModSecurity™ Configuration", icon: ShieldCheck, category: "security" },

  // Software
  { id: "soft-easy", label: "EasyApache 4", icon: Server, category: "software" },
  { id: "soft-module", label: "PHP Modules & Extensions", icon: FileCode, category: "software" },
  { id: "soft-update", label: "System Update Manager", icon: Activity, category: "software" },
  { id: "soft-python", label: "Python Apps Manager", icon: Terminal, category: "software" },
  { id: "soft-node", label: "Node.js Selector", icon: Zap, category: "software" },
  { id: "soft-ruby", label: "Ruby on Rails Manager", icon: FileCode, category: "software" },
  { id: "soft-sitejet", label: "Sitejet Builder", icon: Globe, category: "software" },

  // Email
  { id: "mail-repair", label: "Repair Mail Configuration", icon: Mail, category: "email" },
  { id: "mail-stats", label: "Mail Delivery Reports", icon: Activity, category: "email" },
  { id: "mail-queue", label: "Mail Queue Manager", icon: Activity, category: "email" },
  { id: "mail-filter", label: "tPanel Anti-Spam Setup", icon: ShieldCheck, category: "email" },
  { id: "mail-relay", label: "Relay Subnets", icon: Wifi, category: "email" },

  // System Health
  { id: "sys-status", label: "Server Status", icon: Activity, category: "system" },
  { id: "sys-process", label: "Process Manager", icon: Cpu, category: "system" },
  { id: "sys-usage", label: "Daily Process Log", icon: HardDrive, category: "system" },
  { id: "sys-resource", label: "Resource Usage Manager", icon: Activity, category: "system" },
  { id: "sys-top", label: "Process Monitor", icon: Monitor, category: "system" },

  // Packages
  { id: "pkg-add", label: "Add a Package", icon: Plus, category: "packages" },
  { id: "pkg-edit", label: "Edit a Package", icon: Settings, category: "packages" },
  { id: "pkg-delete", label: "Delete a Package", icon: X, category: "packages" },
  { id: "pkg-list", label: "List Packages", icon: Box, category: "packages" },
  
  // Backup
  { id: "bak-wizard", label: "Backup Wizard", icon: Download, category: "backup" },
  { id: "bak-config", label: "Backup Configuration", icon: Settings, category: "backup" },
  { id: "bak-restore", label: "Restore Backups", icon: Upload, category: "backup" },

  // Service Configuration
  { id: "srv-manager", label: "Service Manager", icon: Server, category: "services" },
  { id: "srv-apache", label: "Apache Configuration", icon: Settings, category: "services" },
  { id: "srv-php", label: "PHP Manager", icon: FileCode, category: "services" },
  { id: "srv-ftp", label: "FTP Server Selection", icon: Globe, category: "services" },

  // Clusters
  { id: "cls-config", label: "Cluster Configuration", icon: Cloud, category: "clusters" },
  { id: "cls-status", label: "Cluster Status", icon: Activity, category: "clusters" },

  // Support
  { id: "sup-center", label: "Support Center", icon: LifeBuoy, category: "support" },
  { id: "sup-docs", label: "Documentation", icon: FileCode, category: "support" },

  // Reboot
  { id: "rb-grace", label: "Graceful Server Reboot", icon: RefreshCw, category: "reboot" },
  { id: "rb-force", label: "Forceful Server Reboot", icon: Zap, category: "reboot" },

  // Additional Categories to reach 100+
  { id: "srv-status", label: "Service Status Monitor", icon: Activity, category: "services" },
  { id: "srv-restart", label: "Restart All Services", icon: RefreshCw, category: "services" },
  { id: "srv-tail", label: "Live Log Tailer", icon: Terminal, category: "services" },
  
  { id: "sec-ssh-config", label: "SSH Configuration", icon: Key, category: "security" },
  { id: "sec-hosts", label: "Host Access Control", icon: Lock, category: "security" },
  { id: "sec-pci", label: "PCI Compliance Scan", icon: ShieldCheck, category: "security" },
  
  { id: "dns-mx-config", label: "MX Entry Configuration", icon: Mail, category: "dns" },
  { id: "dns-ptr", label: "Reverse DNS Setup", icon: Globe, category: "dns" },
  { id: "dns-ptr-list", label: "List DNS Zones", icon: List, category: "dns" },

  { id: "acc-skeleton", label: "Custom Skeleton Directory", icon: Folder, category: "account" },
  { id: "acc-move", label: "Move Account to New Drive", icon: HardDrive, category: "account" },
  { id: "acc-verify", label: "Verify Account Integrity", icon: ShieldCheck, category: "account" },

  { id: "net-setup", label: "Basic Network Setup", icon: Wifi, category: "network" },
  { id: "net-ip-pool", label: "IP Address Pool Manager", icon: Grid, category: "network" },
  
  { id: "sql-profile", label: "SQL User Profiling", icon: Users, category: "sql" },
  { id: "sql-dump", label: "Full SQL Backup", icon: Download, category: "sql" },
  
  { id: "mail-trace", label: "Track Delivery Status", icon: Search, category: "email" },
  { id: "mail-archiver", label: "Email Archiver Premium", icon: Box, category: "email" },
  
  { id: "soft-wp", label: "WordPress® Manager", icon: Globe, category: "software" },
  { id: "soft-one-click", label: "One-Click App Installer", icon: Zap, category: "software" },
  { id: "soft-perl", label: "Perl Modules", icon: FileCode, category: "software" },
  { id: "soft-gem", label: "RubyGems Manager", icon: Gem, category: "software" },
  { id: "soft-system", label: "System Software Update", icon: RefreshCw, category: "software" },
  
  { id: "mail-box", label: "BoxTrapper", icon: Lock, category: "email" },
  { id: "mail-grey", label: "Greylisting Manager", icon: ShieldCheck, category: "email" },
  { id: "mail-mx", label: "Remote MX Wizard", icon: Globe, category: "email" },
  { id: "mail-disk", label: "Manage Disk Usage", icon: HardDrive, category: "email" },

  { id: "sys-check", label: "Check Server Status", icon: Activity, category: "system" },
  { id: "sys-health", label: "Relational DB Health", icon: Database, category: "system" },
  { id: "sys-logs", label: "Error Log Console", icon: Terminal, category: "system" },
  
  { id: "srv-http", label: "HTTP Server Config", icon: Settings, category: "services" },
  { id: "srv-mysql", label: "MySQL Configuration", icon: Database, category: "services" },
  { id: "srv-bind", label: "Bind DNS Manager", icon: Globe, category: "services" },

  { id: "net-firewall-rules", label: "Advanced Firewall Rules", icon: ShieldAlert, category: "network" },
  { id: "net-route", label: "Static IP Routing", icon: Globe, category: "network" },
  
  { id: "bak-destination", label: "Backup Destinations", icon: Cloud, category: "backup" },
  { id: "bak-schedule", label: "Backup Schedule Editor", icon: Clock, category: "backup" },

  { id: "cls-node", label: "Manage Cluster Nodes", icon: Grid, category: "clusters" },
  { id: "cls-remote", label: "Remote Cluster Access", icon: Key, category: "clusters" },
  
  { id: "sup-tickets", label: "Support Tickets", icon: LifeBuoy, category: "support" },
  { id: "sup-news", label: "Service News & Alerts", icon: Activity, category: "support" },
  { id: "sup-chat", label: "Live Admin Chat", icon: Mail, category: "support" },

  // Specialized 410 Category requested
  { id: "soft-410", label: "410 Gone Page Manager", icon: ShieldAlert, category: "software" },
  { id: "soft-redirect", label: "Redirection Console", icon: ArrowRight, category: "software" },

  // Network Expansion
  { id: "net-monitor", label: "Network Traffic Monitor", icon: Activity, category: "network" },
  { id: "net-ddos", label: "DDoS Protection Suite", icon: ShieldCheck, category: "network" },
  { id: "net-ipv6", label: "IPv6 Configuration", icon: Globe, category: "network" },
  { id: "net-vpn", label: "Client VPN Access", icon: Lock, category: "network" },
  { id: "net-dnssec", label: "DNSSEC Manager", icon: Key, category: "network" },
  { id: "net-whois", label: "WHOIS Lookup Tool", icon: Search, category: "network" },
  { id: "net-bandwidth", label: "Bandwidth Thresholds", icon: Wifi, category: "network" },
  { id: "net-resolver", label: "DNS Resolver Config", icon: Settings, category: "network" },
  { id: "net-hosts-file", label: "Local Hosts Editor", icon: FileCode, category: "network" },

  // Server Expansion
  { id: "srv-kernel", label: "Kernel Parameter Tuner", icon: Cpu, category: "server" },
  { id: "srv-memlimit", label: "Memory Limit Controls", icon: Activity, category: "server" },
  { id: "srv-diskquota", label: "Global Disk Quotas", icon: HardDrive, category: "server" },
  { id: "srv-process-kill", label: "Auto Process Reaper", icon: Trash2, category: "server" },
  { id: "srv-cron-global", label: "Global Cron Manager", icon: Clock, category: "server" },
  { id: "srv-env-global", label: "Global Env Variables", icon: Settings, category: "server" },
  { id: "srv-mount", label: "Mount Point Manager", icon: Folder, category: "server" },
  { id: "srv-swap", label: "Swap File Config", icon: Activity, category: "server" },
  { id: "srv-raid", label: "RAID Status Monitor", icon: Box, category: "server" },

  // Security Expansion
  { id: "sec-2fa", label: "Two-Factor Auth (2FA)", icon: Lock, category: "security" },
  { id: "sec-waf", label: "Web App Firewall", icon: ShieldCheck, category: "security" },
  { id: "sec-scanner", label: "Malware Scanner", icon: Search, category: "security" },
  { id: "sec-brute", label: "Brute Force Logs", icon: List, category: "security" },
  { id: "sec-audit", label: "Security Audit Logs", icon: Activity, category: "security" },
  { id: "sec-ssl-wildcard", label: "Wildcard SSL Setup", icon: ShieldCheck, category: "security" },
  { id: "sec-pgp", label: "PGP Key Manager", icon: Key, category: "security" },
  { id: "sec-antispam", label: "Global Spam Filter", icon: ShieldAlert, category: "security" },

  // Email Expansion
  { id: "mail-dkim", label: "DKIM/DMARC Manager", icon: Key, category: "email" },
  { id: "mail-spf", label: "SPF Record Manager", icon: List, category: "email" },
  { id: "mail-autoauth", label: "SMTP Auth Bypass", icon: Unlock, category: "email" },
  { id: "mail-relay-host", label: "Smarthost Relay", icon: Globe, category: "email" },
  { id: "mail-bounce", label: "Bounce Detector", icon: Activity, category: "email" },
  { id: "mail-list", label: "Mailing List Manager", icon: Users, category: "email" },
  { id: "mail-forward", label: "Forwarder Matrix", icon: ArrowRight, category: "email" },

  // SQL Expansion
  { id: "sql-slowlog", label: "Slow Query Log", icon: Clock, category: "sql" },
  { id: "sql-optimize", label: "Table Optimizer", icon: Zap, category: "sql" },
  { id: "sql-engine", label: "Storage Engine Tuner", icon: Settings, category: "sql" },
  { id: "sql-backup-auto", label: "Automated DB Backups", icon: Download, category: "sql" },
  { id: "sql-restore-point", label: "DB Restore Points", icon: RotateCw, category: "sql" },

  // Backup Expansion
  { id: "bak-cloud", label: "Cloud Backup Sync", icon: Cloud, category: "backup" },
  { id: "bak-ftp", label: "Offsite FTP Backups", icon: Globe, category: "backup" },
  { id: "bak-s3", label: "Amazon S3 Backups", icon: Box, category: "backup" },
  { id: "bak-retention", label: "Retention Policy", icon: Clock, category: "backup" },
  { id: "bak-verify", label: "Backup Integrity Check", icon: ShieldCheck, category: "backup" },
  
  // Software Expansion
  { id: "soft-java", label: "Java App Manager", icon: Box, category: "software" },
  { id: "soft-docker", label: "Container Console", icon: Box, category: "software" },
  { id: "soft-git", label: "Git Version Control", icon: Terminal, category: "software" },
  { id: "soft-composer", label: "PHP Composer Manager", icon: FileCode, category: "software" },
  { id: "soft-npm", label: "Global NPM Manager", icon: Zap, category: "software" }
];

const CATEGORIES = [
  { id: "all", label: "All Modules", icon: Search },
  { id: "server", label: "Server Configuration", icon: Settings },
  { id: "account", label: "Account Functions", icon: Users },
  { id: "multi", label: "Multi Account Functions", icon: Users },
  { id: "dns", label: "DNS Functions", icon: Globe },
  { id: "sql", label: "SQL Services", icon: Database },
  { id: "ip", label: "IP Functions", icon: Globe },
  { id: "security", label: "Security Center", icon: ShieldCheck },
  { id: "software", label: "Software", icon: Terminal },
  { id: "email", label: "Email", icon: Mail },
  { id: "system", label: "System Health", icon: Activity },
  { id: "packages", label: "Packages", icon: Box },
  { id: "services", label: "Service Configuration", icon: Server },
  { id: "backup", label: "Backup", icon: HardDrive },
  { id: "clusters", label: "Clusters", icon: Cloud },
  { id: "support", label: "Support", icon: LifeBuoy },
  { id: "reboot", label: "System Reboot", icon: Zap },
  { id: "network", label: "Network Management", icon: Wifi },
];

const moduleDescription = (module: any) => {
  const descriptions: Record<string, string> = {
    "acc-create": "Provision a hosting account with domain, package, PHP/Node runtime, FTP, email, database, SSL, and shell controls.",
    "acc-list": "Review active, suspended, and terminated hosting accounts with quick root actions.",
    "pkg-add": "Create reusable hosting packages for disk, bandwidth, domains, email, database, FTP, and Node app limits.",
    "pkg-list": "Audit package limits and assign them during account provisioning.",
    "config-domain": "Manage the panel domain, detected server IP, DNS records, proxy mode, and SSL preference.",
    "sys-status": "Inspect live service ports, firewall visibility, detected IP, and server health.",
    "sec-terminal": "Use the root console for guided server checks and operational commands."
  };
  if (descriptions[module.id]) return descriptions[module.id];
  const category = CATEGORIES.find((item) => item.id === module.category)?.label || module.category;
  return `${category} control surface with saved configuration, audit-ready settings, and service actions.`;
};

const defaultAccountForm = {
  displayName: "",
  domain: "",
  username: "",
  password: "",
  ownerEmail: "",
  contactEmail: "",
  packageId: "pkg-starter",
  runtime: "php",
  phpVersion: "8.3",
  nodeVersion: "20",
  nodePort: 3000,
  quotaMb: "",
  bandwidthGb: "",
  maxDomains: "",
  maxEmailAccounts: "",
  maxDatabases: "",
  maxNodeApps: "",
  ftpEnabled: true,
  shellAccess: false,
  mysqlEnabled: true,
  emailEnabled: true,
  sslEnabled: true,
  dedicatedIp: "",
  permissionProfile: "standard",
  permissions: {
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
  }
};

const ACCOUNT_PERMISSION_ITEMS = [
  ["files", "Files"],
  ["ftp", "FTP"],
  ["domains", "Domains"],
  ["dns", "DNS"],
  ["subdomains", "Subdomains"],
  ["databases", "MySQL"],
  ["phpmyadmin", "phpMyAdmin"],
  ["email", "Email"],
  ["ssl", "SSL"],
  ["node", "Node.js"],
  ["php", "PHP"],
  ["marketplace", "Apps"],
  ["cron", "Cron"],
  ["terminal", "Shell"],
  ["copilot", "AI"],
  ["security", "Security"],
  ["metrics", "Metrics"],
  ["backups", "Backups"]
];

const ACCOUNT_PERMISSION_PROFILES = [
  {
    id: "standard",
    label: "Standard Hosting",
    description: "Balanced website, email, database, SSL, apps, and metrics access.",
    permissions: defaultAccountForm.permissions
  },
  {
    id: "full",
    label: "Full Control",
    description: "All user panel tools enabled, with shell still controlled by shell access.",
    permissions: { ...defaultAccountForm.permissions, ruby: true, terminal: true }
  },
  {
    id: "developer",
    label: "Developer",
    description: "Node, PHP, Git/app tools, cron, backups, and shell-ready access.",
    permissions: { ...defaultAccountForm.permissions, email: false, ruby: true, terminal: true }
  },
  {
    id: "email",
    label: "Email Only",
    description: "Mail, DNS, SSL, security, and usage metrics without hosting tools.",
    permissions: {
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
    }
  },
  {
    id: "locked",
    label: "Locked View",
    description: "Read-only dashboard and metrics while the account is restricted.",
    permissions: {
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
  }
];

const permissionsForProfile = (profileId: string) => {
  return ACCOUNT_PERMISSION_PROFILES.find((profile) => profile.id === profileId)?.permissions || defaultAccountForm.permissions;
};

const authHeaders = (headers: Record<string, string> = {}) => {
  try {
    const saved = JSON.parse(localStorage.getItem("tpanel_auth") || "null");
    return saved?.token ? { ...headers, Authorization: `Bearer ${saved.token}` } : headers;
  } catch {
    return headers;
  }
};

export default function AdminPanel({ onLogout }: AdminPanelProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [currentModule, setCurrentModule] = useState<string | null>(null);
  const [terminalLogs, setTerminalLogs] = useState<string[]>(["tPanel Host Shell (root@tpanel) initialized.", "Type 'help' for command list.", "root@tpanel:~# "]);
  const [terminalInput, setTerminalInput] = useState("");
  const [domainSettings, setDomainSettings] = useState<any>({
    primaryDomain: "tiwlo.com",
    panelUrl: "https://tiwlo.com",
    detectedServerIp: "",
    autoDetectIp: true,
    enableNginxProxy: true,
    enableSsl: true,
    dnsRecords: []
  });
  const [systemStatus, setSystemStatus] = useState<any | null>(null);
  const [summary, setSummary] = useState<any | null>(null);
  const [hostingState, setHostingState] = useState<any>({ accounts: [], packages: [] });
  const [accountForm, setAccountForm] = useState<any>(defaultAccountForm);
  const [packageForm, setPackageForm] = useState<any>({ name: "", quotaMb: 1024, bandwidthGb: 100, domains: 1, emailAccounts: 10, databases: 5, ftpAccounts: 5, nodeApps: 1 });
  const [updateStatus, setUpdateStatus] = useState<any | null>(null);
  const [stackStatus, setStackStatus] = useState<any | null>(null);
  const [provisioningState, setProvisioningState] = useState<any>({ accounts: [] });
  const [auditEvents, setAuditEvents] = useState<any[]>([]);
  const [stackInstallOutput, setStackInstallOutput] = useState("");
  const [isInstallingStack, setIsInstallingStack] = useState(false);
  const [panelNotice, setPanelNotice] = useState("");
  const [panelError, setPanelError] = useState("");

  const filteredModules = useMemo(() => {
    return MODULES.filter(m => 
      (activeCategory === "all" || m.category === activeCategory) &&
      m.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [activeCategory, searchQuery]);

  // Group modules by category for the sidebar
  const groupedModules = useMemo(() => {
    const groups: Record<string, typeof MODULES> = {};
    MODULES.forEach(m => {
      if (!groups[m.category]) groups[m.category] = [];
      groups[m.category].push(m);
    });
    return groups;
  }, []);

  const loadSummary = async () => {
    const response = await fetch("/api/panel/summary", { headers: authHeaders() });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.message || "Unable to load dashboard summary.");
    setSummary(data);
  };

  const loadHosting = async () => {
    const response = await fetch("/api/panel/accounts", { headers: authHeaders() });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.message || "Unable to load hosting accounts.");
    setHostingState(data);
    if (data.packages?.[0]?.id && accountForm.packageId === "pkg-starter") {
      setAccountForm((current: any) => ({ ...current, packageId: data.packages[0].id }));
    }
  };

  const loadUpdateStatus = async () => {
    const response = await fetch("/api/panel/update-status", { headers: authHeaders() });
    const data = await response.json();
    if (response.ok && data.ok) setUpdateStatus(data);
  };

  const loadStackStatus = async () => {
    const response = await fetch("/api/panel/hosting-stack", { headers: authHeaders() });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.message || "Unable to load hosting stack status.");
    setStackStatus(data.stack);
  };

  const loadProvisioning = async () => {
    const response = await fetch("/api/panel/provisioning", { headers: authHeaders() });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.message || "Unable to load provisioning status.");
    setProvisioningState(data);
  };

  const loadAudit = async () => {
    const response = await fetch("/api/panel/audit-events", { headers: authHeaders() });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.message || "Unable to load audit events.");
    setAuditEvents(data.auditEvents || []);
  };

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([loadSummary(), loadHosting(), loadUpdateStatus(), loadStackStatus(), loadProvisioning(), loadAudit()]).then((results) => {
      if (!mounted) return;
      const failed = results.find((result) => result.status === "rejected") as PromiseRejectedResult | undefined;
      if (failed) setPanelError(failed.reason?.message || "Unable to load tPanel dashboard data.");
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadDomainSettings = async () => {
      try {
        const response = await fetch("/api/panel/domain-settings", { headers: authHeaders() });
        const data = await response.json();
        if (mounted && data.settings) setDomainSettings(data.settings);
      } catch (error: any) {
        if (mounted) setPanelError(error.message || "Unable to load domain settings.");
      }
    };
    if (currentModule === "config-domain") loadDomainSettings();
    return () => {
      mounted = false;
    };
  }, [currentModule]);

  useEffect(() => {
    let mounted = true;
    const loadSystemStatus = async () => {
      try {
        const response = await fetch("/api/panel/system-status", { headers: authHeaders() });
        const data = await response.json();
        if (mounted) setSystemStatus(data);
      } catch (error: any) {
        if (mounted) setPanelError(error.message || "Unable to load system status.");
      }
    };
    if (currentModule === "sys-status") loadSystemStatus();
    return () => {
      mounted = false;
    };
  }, [currentModule]);

  useEffect(() => {
    if (["acc-create", "acc-list", "pkg-add", "pkg-list"].includes(currentModule || "")) {
      loadHosting().catch((error) => setPanelError(error.message || "Unable to load hosting data."));
    }
  }, [currentModule]);

  useEffect(() => {
    if (["acc-list", "soft-easy", "soft-module", "soft-system", "srv-manager", "srv-status", "sys-status"].includes(currentModule || "")) {
      loadStackStatus().catch((error) => setPanelError(error.message || "Unable to load hosting stack status."));
      loadProvisioning().catch((error) => setPanelError(error.message || "Unable to load provisioning status."));
    }
  }, [currentModule]);

  useEffect(() => {
    if (currentModule === "sec-audit") {
      loadAudit().catch((error) => setPanelError(error.message || "Unable to load audit events."));
    }
  }, [currentModule]);

  const saveDomainSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    setPanelNotice("");
    setPanelError("");
    try {
      const response = await fetch("/api/panel/domain-settings", {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(domainSettings)
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.message || "Unable to save domain settings.");
      setDomainSettings(data.settings);
      setPanelNotice("Domain settings saved. DNS records and proxy plan refreshed.");
    } catch (error: any) {
      setPanelError(error.message || "Unable to save domain settings.");
    }
  };

  const createAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    setPanelNotice("");
    setPanelError("");
    try {
      const response = await fetch("/api/panel/accounts", {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(accountForm)
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.message || "Unable to create hosting account.");
      setPanelNotice(`Account ${data.account.username} created for ${data.account.domain}. Login is ready, DNS plan is generated, and Auto SSL is queued.`);
      setAccountForm(defaultAccountForm);
      await loadHosting();
      await loadAudit();
    } catch (error: any) {
      setPanelError(error.message || "Unable to create hosting account.");
    }
  };

  const createPackage = async (event: React.FormEvent) => {
    event.preventDefault();
    setPanelNotice("");
    setPanelError("");
    try {
      const response = await fetch("/api/panel/packages", {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(packageForm)
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.message || "Unable to save package.");
      setPanelNotice(`Package ${data.package.name} saved.`);
      setPackageForm({ name: "", quotaMb: 1024, bandwidthGb: 100, domains: 1, emailAccounts: 10, databases: 5, ftpAccounts: 5, nodeApps: 1 });
      await loadHosting();
      await loadAudit();
    } catch (error: any) {
      setPanelError(error.message || "Unable to save package.");
    }
  };

  const runAccountAction = async (username: string, action: string) => {
    setPanelNotice("");
    setPanelError("");
    if (["terminate", "delete", "permanent-delete"].includes(action)) {
      const confirmed = window.confirm(`Permanently delete ${username}? This removes the account, hosted files, domains, DNS, SSL/vhost data, and provisioning records.`);
      if (!confirmed) return;
    }
    try {
      const response = await fetch(`/api/panel/accounts/${username}/${action}`, { method: "POST", headers: authHeaders() });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.message || "Account action failed.");
      setHostingState((current: any) => ({ ...current, accounts: data.accounts }));
      setProvisioningState((current: any) => ({
        ...current,
        accounts: action === "delete" || action === "terminate" || action === "permanent-delete"
          ? (current.accounts || []).filter((account: any) => account.username !== username)
          : current.accounts
      }));
      setPanelNotice(["terminate", "delete", "permanent-delete"].includes(action)
        ? `${username} permanently deleted with domains, DNS, SSL, and hosted files.`
        : `${username} ${action} command completed.`);
      loadAudit().catch(() => null);
    } catch (error: any) {
      setPanelError(error.message || "Account action failed.");
    }
  };

  const updateAccountPassword = async (username: string, password: string) => {
    setPanelNotice("");
    setPanelError("");
    if (!password || password.length < 8) {
      setPanelError("New account password must be at least 8 characters.");
      return;
    }
    try {
      const response = await fetch(`/api/panel/accounts/${username}/password`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ password })
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.message || "Password update failed.");
      setHostingState((current: any) => ({ ...current, accounts: data.accounts }));
      setPanelNotice(`${username} password updated. The user can now log in from the tPanel login page.`);
      loadAudit().catch(() => null);
    } catch (error: any) {
      setPanelError(error.message || "Password update failed.");
    }
  };

  const updateAccountPermissions = async (username: string, permissions: Record<string, boolean> = {}, permissionProfile?: string) => {
    setPanelNotice("");
    setPanelError("");
    try {
      const response = await fetch(`/api/panel/accounts/${username}/permissions`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ permissions, permissionProfile })
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.message || "Permission update failed.");
      setHostingState((current: any) => ({ ...current, accounts: data.accounts }));
      setProvisioningState((current: any) => ({
        ...current,
        accounts: (current.accounts || []).map((account: any) => account.username === username ? { ...account, permissions: data.account.permissions, permissionProfile: data.account.permissionProfile } : account)
      }));
      setPanelNotice(permissionProfile ? `${username} switched to ${permissionProfile} access profile.` : `${username} access permissions updated.`);
      loadAudit().catch(() => null);
    } catch (error: any) {
      setPanelError(error.message || "Permission update failed.");
    }
  };

  const installMissingStack = async () => {
    setPanelNotice("");
    setPanelError("");
    setStackInstallOutput("");
    setIsInstallingStack(true);
    try {
      const response = await fetch("/api/panel/hosting-stack/install", {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ packages: stackStatus?.missingPackages || [] })
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.message || "Hosting stack install failed.");
      setStackStatus(data.stack);
      setStackInstallOutput(data.output || data.message || "Hosting stack is ready.");
      setPanelNotice("Hosting stack packages installed and services enabled.");
    } catch (error: any) {
      setPanelError(error.message || "Hosting stack install failed.");
    } finally {
      setIsInstallingStack(false);
    }
  };

  const retryProvisioning = async (username: string) => {
    setPanelNotice("");
    setPanelError("");
    try {
      const response = await fetch(`/api/panel/accounts/${username}/provision`, {
        method: "POST",
        headers: authHeaders()
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.message || "Provisioning retry failed.");
      await Promise.all([loadHosting(), loadProvisioning(), loadStackStatus(), loadAudit()]);
      setPanelNotice(`${username} provisioning retry started. Auto SSL will become active after DNS points to this server.`);
    } catch (error: any) {
      setPanelError(error.message || "Provisioning retry failed.");
    }
  };

  const loadOne = Number(summary?.loadAverage?.[0] || 0);
  const activeAccountCount = hostingState.accounts?.filter((account: any) => account.status !== "terminated").length || 0;
  const adminChartValues = useMemo(() => {
    const loadPercent = Math.min(100, Math.round((loadOne / Math.max(1, summary?.cpuCount || 1)) * 100));
    const ramPercent = Number(summary?.ram?.percent || 0);
    const diskPercent = Number(summary?.disk?.percent || 0);
    return [18, 24, 31, 28, 42, 37, 49, 45, 58, 52, 64, 61].map((seed, index) => {
      const mix = seed + (loadPercent * 0.28) + (ramPercent * 0.18) + (diskPercent * 0.12) + (index % 3) * 4;
      return Math.max(8, Math.min(96, Math.round(mix)));
    });
  }, [loadOne, summary]);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans antialiased overflow-hidden">
      
      {/* Sidebar - Flexible & Searchable */}
      <aside 
        className={`bg-slate-900 border-r border-slate-900/40 flex flex-col shrink-0 overflow-hidden relative z-50 transition-all duration-300 ${isSidebarOpen ? "w-[280px]" : "w-0 lg:w-[70px]"}`}
      >
        {/* Sidebar Header */}
        <div className="p-4 flex items-center justify-between border-b border-slate-900/40 h-16 shrink-0">
          {isSidebarOpen ? (
            <div className="flex items-center gap-3 overflow-hidden">
               <BrandLogo variant="dark" className="h-10 w-36 shrink-0" />
            </div>
          ) : (
            <BrandLogo compact className="h-9 w-9 mx-auto" />
          )}
          {isSidebarOpen && (
            <button onClick={() => setIsSidebarOpen(false)} className="p-1.5 hover:bg-slate-800 rounded text-slate-400 transition-colors">
              <ChevronRight className="w-4 h-4 transform rotate-180" />
            </button>
          )}
        </div>

        {/* Sidebar Search - Only visible when open */}
        {isSidebarOpen && (
          <div className="p-4 border-b border-slate-900/40 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input 
                type="text"
                placeholder="Search modules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-900/40 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-[#0069ff] transition-all"
              />
            </div>
          </div>
        )}

        {/* Navigation Categories */}
        <nav className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id);
                if (!isSidebarOpen) setIsSidebarOpen(true);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group ${
                activeCategory === cat.id 
                  ? "bg-[#0069ff] text-white" 
                  : "text-slate-400 hover:bg-slate-800"
              }`}
            >
              <cat.icon className={`w-4 h-4 shrink-0 transition-colors ${activeCategory === cat.id ? "text-white" : "group-hover:text-[#0069ff]"}`} />
              {isSidebarOpen && <span className="text-[11px] font-bold tracking-wide text-left">{cat.label}</span>}
              {isSidebarOpen && activeCategory === cat.id && <ChevronRight className="w-3 h-3 ml-auto opacity-50" />}
            </button>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-900/40 shrink-0">
           {isSidebarOpen ? (
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <BrandLogo compact className="h-8 w-8" />
                   <div className="overflow-hidden">
                      <p className="text-[11px] font-bold text-slate-100 truncate">root</p>
                      <p className="text-[10px] text-slate-500 truncate">Node v24.15</p>
                   </div>
                </div>
                <button onClick={onLogout} className="p-2 hover:bg-rose-500/10 hover:text-rose-500 rounded-lg text-slate-400 transition-colors">
                   <LogOut className="w-4 h-4" />
                </button>
             </div>
           ) : (
             <button onClick={() => setIsSidebarOpen(true)} className="mx-auto block p-2 hover:bg-slate-800 rounded-lg text-slate-400">
                <Menu className="w-5 h-5" />
             </button>
           )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-950 relative">
        
        {/* Top Navbar */}
        <header className="h-16 border-b border-slate-900/40 flex items-center justify-between px-6 shrink-0 bg-slate-950/50 backdrop-blur-md sticky top-0 z-40">
          <div className="flex items-center gap-4">
            {!isSidebarOpen && (
              <button 
                onClick={() => setIsSidebarOpen(true)} 
                className="p-1.5 hover:bg-slate-800 rounded text-slate-100 transition-colors border border-slate-900/40 lg:hidden"
              >
                <Menu className="w-4 h-4" />
              </button>
            )}
            <div className="flex items-center gap-2 text-sm">
               <span className="text-slate-500 font-medium">tPanel</span>
               <ChevronRight className="w-3 h-3 text-slate-700" />
               <span className="text-slate-100 font-bold tracking-tight">
                {activeCategory === "all" ? "Dashboard" : CATEGORIES.find(c => c.id === activeCategory)?.label}
               </span>
               {currentModule && (
                 <>
                   <ChevronRight className="w-3 h-3 text-slate-700" />
                   <span className="text-[#0069ff] font-bold tracking-tight truncate max-w-[150px]">
                     {MODULES.find(m => m.id === currentModule)?.label}
                   </span>
                 </>
               )}
            </div>
          </div>

          <div className="flex items-center gap-4">
             <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full h-7">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Server Live</span>
             </div>
             <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white transition-colors">
                <Settings className="w-4 h-4" />
             </button>
          </div>
        </header>

        {/* Dynamic Content View */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          <div className="w-full max-w-none mx-auto space-y-8">
            
            {!currentModule ? (
              <>
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                   <div>
                      <h1 className="text-2xl md:text-3xl font-black text-slate-100 tracking-tight">
                        {activeCategory === "all" ? "Server Administration Dashboard" : CATEGORIES.find(c => c.id === activeCategory)?.label}
                      </h1>
                      <p className="text-sm text-slate-500 mt-1 font-medium">Root hosting controls for accounts, packages, DNS, services, security, backups, and updates.</p>
                   </div>
                   <div className="flex gap-2">
                      <button className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-bold text-slate-300 hover:bg-slate-800 transition-colors">
                        Documentation
                      </button>
                      <button onClick={() => setCurrentModule("acc-create")} className="px-4 py-2 bg-[#0069ff] rounded-lg text-xs font-bold text-white hover:bg-[#0055d4] transition-all">
                        Create Account
                      </button>
                   </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                   <StatCard label="Load Average" value={loadOne.toFixed(2)} icon={Cpu} color="text-sky-400" />
                   <StatCard label="Memory Usage" value={`${summary?.ram?.usedMb || 0} / ${summary?.ram?.totalMb || 0} MB`} icon={Activity} color="text-amber-400" />
                   <StatCard label="Accounts" value={String(activeAccountCount)} icon={Users} color="text-emerald-400" />
                   <StatCard label="Storage" value={`${summary?.disk?.percent || 0}% full`} icon={HardDrive} color="text-rose-400" />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                  <div className="xl:col-span-2 bg-slate-900/40 border border-slate-800 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <h2 className="text-sm font-black text-slate-100">Server Resource Chart</h2>
                        <p className="text-[11px] text-slate-500">Live trend line with CPU, RAM, disk, and account pressure.</p>
                      </div>
                      <button onClick={() => loadSummary().catch((error) => setPanelError(error.message))} className="p-2 rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800">
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5">
                      <AdminResourceChart values={adminChartValues} />
                      <div className="space-y-4">
                        <UsageBar label="CPU Load" value={Math.min(100, Math.round(((summary?.loadAverage?.[0] || 0) / Math.max(1, summary?.cpuCount || 1)) * 100))} tone="bg-sky-500" />
                        <UsageBar label="RAM Usage" value={summary?.ram?.percent || 0} tone="bg-amber-500" />
                        <UsageBar label="Disk Usage" value={summary?.disk?.percent || 0} tone="bg-rose-500" />
                      </div>
                    </div>
                  </div>
                  <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5">
                    <h2 className="text-sm font-black text-slate-100">Forced Update Channel</h2>
                    <p className="text-[11px] text-slate-500 mt-1">Central tPanel releases are checked by every installed server.</p>
                    <div className="mt-5 space-y-3 text-xs">
                      <div className="flex justify-between"><span className="text-slate-500">Current</span><span className="font-black text-slate-100">{updateStatus?.currentVersion || "0.0.0"}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Published</span><span className="font-black text-slate-100">{updateStatus?.update?.version || "none"}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Mode</span><span className={`font-black ${updateStatus?.updateRequired ? "text-rose-400" : "text-emerald-400"}`}>{updateStatus?.updateRequired ? "update required" : "ready"}</span></div>
                    </div>
                    <button onClick={() => setCurrentModule("soft-update")} className="mt-5 w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold text-slate-200 hover:border-[#0069ff]">Open Update Manager</button>
                  </div>
                </div>

                <HostingStackOverview
                  stack={stackStatus}
                  provisioning={provisioningState}
                  onOpenStack={() => setCurrentModule("soft-easy")}
                  onOpenAccounts={() => setCurrentModule("acc-list")}
                />

                <div>
                  <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 mb-6 flex items-center gap-2">
                    <Box className="w-4 h-4" />
                    Available Modules ({filteredModules.length})
                  </h2>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-2 pb-20">
                    {filteredModules.map((module) => (
                      <button
                        key={module.id}
                        onClick={() => setCurrentModule(module.id)}
                        className="flex items-center gap-3 text-left bg-slate-900/50 border border-slate-800 rounded-lg p-3 hover:border-[#0069ff]/60 hover:bg-slate-900/80 focus:outline-none focus:border-[#0069ff] transition-all group relative overflow-hidden"
                      >
                        <div className="absolute top-0 left-0 w-1 h-full bg-[#0069ff] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="p-2.5 bg-slate-950 rounded-lg text-[#0069ff] border border-slate-800 group-hover:bg-[#0069ff]/10 transition-all shrink-0">
                           <module.icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-black text-slate-100 text-xs uppercase tracking-wider leading-snug group-hover:text-[#66a3ff] transition-colors">{module.label}</h3>
                          <p className="text-[10px] text-slate-400 mt-1 font-medium leading-relaxed truncate">{moduleDescription(module)}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-6">
                <button 
                  onClick={() => setCurrentModule(null)}
                  className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-100 transition-colors px-3 py-1.5 border border-slate-800 rounded-lg hover:border-slate-700"
                >
                  <ChevronRight className="w-3 h-3 transform rotate-180" />
                  Back to Dashboard
                </button>

                <div className="bg-slate-900/40 border border-slate-900/30 rounded-2xl p-6 md:p-10 min-h-[500px] flex flex-col items-center justify-center text-center">
                   {currentModule === "config-domain" ? (
                     <form onSubmit={saveDomainSettings} className="w-full max-w-5xl text-left space-y-6">
                       <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                         <div>
                           <h1 className="text-3xl font-black text-slate-100 tracking-tighter">Domain Settings</h1>
                           <p className="text-sm text-slate-500 mt-2">Default domain is tiwlo.com. Change it after the A record points to this server IP.</p>
                         </div>
                         <button className="px-5 py-2.5 bg-[#0069ff] text-white font-bold rounded-xl hover:bg-[#0055d4] transition-all text-sm">Save Settings</button>
                       </div>
                       {(panelNotice || panelError) && (
                         <div className={`rounded-xl border px-4 py-3 text-sm font-bold ${panelError ? "border-rose-500/20 bg-rose-500/10 text-rose-300" : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"}`}>
                           {panelError || panelNotice}
                         </div>
                       )}
                       <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                         <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-5 space-y-4">
                           <label className="block">
                             <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Primary Domain</span>
                             <input value={domainSettings.primaryDomain || ""} onChange={(e) => setDomainSettings((current: any) => ({ ...current, primaryDomain: e.target.value, panelUrl: current.enableSsl === false ? `http://${e.target.value}` : `https://${e.target.value}` }))} className="mt-2 w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 outline-none focus:border-[#0069ff]" />
                           </label>
                           <label className="block">
                             <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Panel URL</span>
                             <input value={domainSettings.panelUrl || ""} onChange={(e) => setDomainSettings((current: any) => ({ ...current, panelUrl: e.target.value }))} className="mt-2 w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 outline-none focus:border-[#0069ff]" />
                           </label>
                           <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                             {[
                               ["autoDetectIp", "Auto IP"],
                               ["enableNginxProxy", "Nginx Proxy"],
                               ["enableSsl", "HTTPS"]
                             ].map(([key, label]) => (
                               <label key={key} className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-300">
                                 <input type="checkbox" checked={domainSettings[key] !== false} onChange={(e) => setDomainSettings((current: any) => ({ ...current, [key]: e.target.checked }))} />
                                 {label}
                               </label>
                             ))}
                           </div>
                         </div>
                         <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-5">
                           <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Detected Server IP</p>
                           <p className="mt-2 font-mono text-lg font-black text-emerald-400">{domainSettings.detectedServerIp || "Waiting for heartbeat"}</p>
                           <div className="mt-5 overflow-hidden rounded-lg border border-slate-800">
                             <table className="w-full text-xs">
                               <thead className="bg-slate-900 text-slate-500 uppercase"><tr><th className="p-3 text-left">Type</th><th className="p-3 text-left">Name</th><th className="p-3 text-left">Value</th></tr></thead>
                               <tbody>
                                 {(domainSettings.dnsRecords || []).map((record: any, index: number) => (
                                   <tr key={`${record.name}-${index}`} className="border-t border-slate-800 text-slate-300"><td className="p-3 font-bold">{record.type}</td><td className="p-3 font-mono">{record.name}</td><td className="p-3 font-mono">{record.value}</td></tr>
                                 ))}
                               </tbody>
                             </table>
                           </div>
                         </div>
                       </div>
                     </form>
                   ) : currentModule === "sys-status" ? (
                     <div className="w-full max-w-6xl text-left space-y-6">
                       <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                         <div>
                           <h1 className="text-3xl font-black text-slate-100 tracking-tighter">System Status</h1>
                           <p className="text-sm text-slate-500 mt-2">Detected IP, firewall mode, and required service ports.</p>
                         </div>
                         <button onClick={() => setCurrentModule("sys-status")} className="px-5 py-2.5 bg-slate-900 border border-slate-800 text-slate-200 font-bold rounded-xl hover:bg-slate-800 transition-all text-sm">Refresh</button>
                       </div>
                       <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                         <StatCard label="Detected IP" value={systemStatus?.detectedServerIp || "-"} icon={Globe} color="text-sky-400" />
                         <StatCard label="Domain" value={systemStatus?.domain || "-"} icon={Globe} color="text-emerald-400" />
                         <StatCard label="Firewall" value={systemStatus?.firewall?.mode || "unknown"} icon={ShieldCheck} color="text-amber-400" />
                         <StatCard label="Ports Seen" value={String((systemStatus?.ports || []).filter((p: any) => p.open).length)} icon={Activity} color="text-rose-400" />
                       </div>
                       <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/40">
                         <table className="w-full min-w-[820px] text-xs">
                           <thead className="bg-slate-900 text-slate-500 uppercase"><tr><th className="p-3 text-left">Port</th><th className="p-3 text-left">Service</th><th className="p-3 text-left">Purpose</th><th className="p-3 text-left">Listening</th><th className="p-3 text-left">Firewall</th></tr></thead>
                           <tbody>
                             {(systemStatus?.ports || []).map((port: any) => (
                               <tr key={`${port.port}-${port.protocol}`} className="border-t border-slate-800 text-slate-300">
                                 <td className="p-3 font-mono font-black text-slate-100">{port.port}/{port.protocol}</td>
                                 <td className="p-3 font-bold">{port.service}</td>
                                 <td className="p-3 text-slate-500">{port.purpose}</td>
                                 <td className={`p-3 font-black ${port.open ? "text-emerald-400" : "text-rose-400"}`}>{port.status}</td>
                                 <td className={`p-3 font-black ${port.allowed ? "text-emerald-400" : "text-amber-400"}`}>{port.firewallStatus}</td>
                               </tr>
                             ))}
                           </tbody>
                         </table>
                       </div>
                     </div>
                   ) : currentModule === "acc-create" ? (
                     <form onSubmit={createAccount} className="w-full max-w-6xl text-left space-y-6">
                       <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                         <div>
                           <h1 className="text-3xl font-black text-slate-100 tracking-tight">Create a New Account</h1>
                           <p className="text-sm text-slate-500 mt-2">Provision a cPanel-style hosting account with login access, package limits, website runtime, DNS, email, FTP, database, and automatic SSL.</p>
                         </div>
                         <button className="px-5 py-2.5 bg-[#0069ff] text-white font-bold rounded-lg hover:bg-[#0055d4] transition-all text-sm">Create Account</button>
                       </div>
                       {(panelNotice || panelError) && (
                         <div className={`rounded-lg border px-4 py-3 text-sm font-bold ${panelError ? "border-rose-500/20 bg-rose-500/10 text-rose-300" : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"}`}>
                           {panelError || panelNotice}
                         </div>
                       )}
                       <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                         <div className="xl:col-span-2 bg-slate-950/50 border border-slate-800 rounded-lg p-5 space-y-5">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <Field label="Domain / Website Name" value={accountForm.domain} onChange={(value: string) => setAccountForm((current: any) => ({ ...current, domain: value, displayName: current.displayName || value }))} placeholder="example.com or leave blank for username.tiwlo.com" />
                             <Field label="Username" value={accountForm.username} onChange={(value: string) => setAccountForm((current: any) => ({ ...current, username: value }))} placeholder="example" />
                             <Field label="Password" type="password" value={accountForm.password} onChange={(value: string) => setAccountForm((current: any) => ({ ...current, password: value }))} placeholder="Minimum 8 characters" />
                             <Field label="Owner Email" value={accountForm.ownerEmail} onChange={(value: string) => setAccountForm((current: any) => ({ ...current, ownerEmail: value }))} placeholder="owner@example.com" />
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                             <label className="block">
                               <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Package</span>
                               <select value={accountForm.packageId} onChange={(e) => setAccountForm((current: any) => ({ ...current, packageId: e.target.value }))} className="mt-2 w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 outline-none focus:border-[#0069ff]">
                                 {(hostingState.packages || []).map((pkg: any) => <option key={pkg.id} value={pkg.id}>{pkg.name}</option>)}
                               </select>
                             </label>
                             <label className="block">
                               <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Access Profile</span>
                               <select
                                 value={accountForm.permissionProfile}
                                 onChange={(e) => {
                                   const permissionProfile = e.target.value;
                                   setAccountForm((current: any) => ({
                                     ...current,
                                     permissionProfile,
                                     permissions: { ...permissionsForProfile(permissionProfile) }
                                   }));
                                 }}
                                 className="mt-2 w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 outline-none focus:border-[#0069ff]"
                               >
                                 {ACCOUNT_PERMISSION_PROFILES.map((profile) => <option key={profile.id} value={profile.id}>{profile.label}</option>)}
                               </select>
                             </label>
                             <label className="block">
                               <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Runtime</span>
                               <select value={accountForm.runtime} onChange={(e) => setAccountForm((current: any) => ({ ...current, runtime: e.target.value }))} className="mt-2 w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 outline-none focus:border-[#0069ff]">
                                 <option value="php">PHP Website</option>
                                 <option value="node">Node.js App</option>
                                 <option value="static">Static Site</option>
                               </select>
                             </label>
                             <Field label={accountForm.runtime === "node" ? "Node Port" : "PHP Version"} value={accountForm.runtime === "node" ? accountForm.nodePort : accountForm.phpVersion} onChange={(value: string) => setAccountForm((current: any) => accountForm.runtime === "node" ? ({ ...current, nodePort: value }) : ({ ...current, phpVersion: value }))} />
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                             {ACCOUNT_PERMISSION_PROFILES.map((profile) => (
                               <button
                                 key={profile.id}
                                 type="button"
                                 onClick={() => setAccountForm((current: any) => ({
                                   ...current,
                                   permissionProfile: profile.id,
                                   permissions: { ...profile.permissions }
                                 }))}
                                 className={`rounded-lg border p-3 text-left transition-all ${accountForm.permissionProfile === profile.id ? "border-[#0069ff]/60 bg-[#0069ff]/10" : "border-slate-800 bg-slate-900/60 hover:border-slate-700"}`}
                               >
                                 <p className="text-xs font-black text-slate-100">{profile.label}</p>
                                 <p className="mt-1 text-[10px] leading-4 text-slate-500">{profile.description}</p>
                               </button>
                             ))}
                           </div>
                           <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                             {[
                               ["ftpEnabled", "FTP"],
                               ["emailEnabled", "Email"],
                               ["mysqlEnabled", "MySQL"],
                               ["sslEnabled", "Auto SSL"],
                               ["shellAccess", "Shell"],
                             ].map(([key, label]) => (
                               <label key={key} className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-300">
                                 <input type="checkbox" checked={Boolean(accountForm[key])} onChange={(e) => setAccountForm((current: any) => ({ ...current, [key]: e.target.checked }))} />
                                 {label}
                               </label>
                             ))}
                           </div>
                           <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
                             <div className="flex items-center justify-between gap-3 mb-3">
                               <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">User Panel Permissions</h2>
                               <span className="text-[10px] font-bold text-slate-600">Visible after login</span>
                             </div>
                             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                               {ACCOUNT_PERMISSION_ITEMS.map(([key, label]) => (
                                 <label key={key} className={`flex items-center gap-2 rounded border px-2 py-1.5 text-[11px] font-bold ${accountForm.permissions?.[key] ? "border-[#0069ff]/30 bg-[#0069ff]/10 text-slate-100" : "border-slate-800 bg-slate-950 text-slate-500"}`}>
                                   <input
                                     type="checkbox"
                                     checked={Boolean(accountForm.permissions?.[key])}
                                     onChange={(e) => setAccountForm((current: any) => ({ ...current, permissions: { ...(current.permissions || {}), [key]: e.target.checked } }))}
                                   />
                                   {label}
                                 </label>
                               ))}
                             </div>
                           </div>
                         </div>
                         <div className="bg-slate-950/50 border border-slate-800 rounded-lg p-5 space-y-4">
                           <h2 className="text-sm font-black text-slate-100">Resource Overrides</h2>
                           <Field label="Disk Quota MB" value={accountForm.quotaMb} onChange={(value: string) => setAccountForm((current: any) => ({ ...current, quotaMb: value }))} placeholder="Package default" />
                           <Field label="Bandwidth GB" value={accountForm.bandwidthGb} onChange={(value: string) => setAccountForm((current: any) => ({ ...current, bandwidthGb: value }))} placeholder="Package default" />
                           <Field label="Addon Domains" value={accountForm.maxDomains} onChange={(value: string) => setAccountForm((current: any) => ({ ...current, maxDomains: value }))} placeholder="Package default" />
                           <Field label="Email Accounts" value={accountForm.maxEmailAccounts} onChange={(value: string) => setAccountForm((current: any) => ({ ...current, maxEmailAccounts: value }))} placeholder="Package default" />
                           <Field label="Databases" value={accountForm.maxDatabases} onChange={(value: string) => setAccountForm((current: any) => ({ ...current, maxDatabases: value }))} placeholder="Package default" />
                           <Field label="Node Apps" value={accountForm.maxNodeApps} onChange={(value: string) => setAccountForm((current: any) => ({ ...current, maxNodeApps: value }))} placeholder="Package default" />
                           <Field label="Dedicated IP" value={accountForm.dedicatedIp} onChange={(value: string) => setAccountForm((current: any) => ({ ...current, dedicatedIp: value }))} placeholder="optional" />
                         </div>
                       </div>
                     </form>
                   ) : currentModule === "acc-list" ? (
                     <AccountList
                       accounts={hostingState.accounts || []}
                       provisioningAccounts={provisioningState.accounts || []}
                       onAction={runAccountAction}
                       onPassword={updateAccountPassword}
                       onPermission={updateAccountPermissions}
                       onProvision={retryProvisioning}
                     />
                   ) : currentModule === "pkg-add" ? (
                     <form onSubmit={createPackage} className="w-full max-w-4xl text-left space-y-5">
                       <div>
                         <h1 className="text-3xl font-black text-slate-100 tracking-tight">Add a Package</h1>
                         <p className="text-sm text-slate-500 mt-2">Define reusable hosting limits for accounts.</p>
                       </div>
                       {(panelNotice || panelError) && <div className={`rounded-lg border px-4 py-3 text-sm font-bold ${panelError ? "border-rose-500/20 bg-rose-500/10 text-rose-300" : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"}`}>{panelError || panelNotice}</div>}
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/50 border border-slate-800 rounded-lg p-5">
                         <Field label="Package Name" value={packageForm.name} onChange={(value: string) => setPackageForm((current: any) => ({ ...current, name: value }))} placeholder="Business Pro" />
                         {["quotaMb", "bandwidthGb", "domains", "emailAccounts", "databases", "ftpAccounts", "nodeApps"].map((key) => (
                           <Field key={key} label={key.replace(/([A-Z])/g, " $1")} value={packageForm[key]} onChange={(value: string) => setPackageForm((current: any) => ({ ...current, [key]: value }))} />
                         ))}
                       </div>
                       <button className="px-5 py-2.5 bg-[#0069ff] text-white font-bold rounded-lg hover:bg-[#0055d4] transition-all text-sm">Save Package</button>
                     </form>
                   ) : currentModule === "pkg-list" ? (
                     <PackageList packages={hostingState.packages || []} />
                   ) : ["soft-easy", "soft-module", "soft-system", "srv-manager", "srv-status", "srv-php", "srv-http", "srv-mysql", "srv-bind"].includes(currentModule || "") ? (
                     <HostingStackManager
                       stack={stackStatus}
                       output={stackInstallOutput}
                       isInstalling={isInstallingStack}
                       onRefresh={() => Promise.all([loadStackStatus(), loadProvisioning()])}
                       onInstall={installMissingStack}
                     />
                   ) : currentModule === "soft-update" ? (
                     <div className="w-full max-w-4xl text-left space-y-5">
                       <h1 className="text-3xl font-black text-slate-100 tracking-tight">System Update Manager</h1>
                       <p className="text-sm text-slate-500">Installed servers run the tPanel auto-update timer every 10 minutes. Forced central releases are pulled and rebuilt by the server-side update service.</p>
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         <StatCard label="Current Version" value={updateStatus?.currentVersion || "0.0.0"} icon={Activity} color="text-sky-400" />
                         <StatCard label="Published Version" value={updateStatus?.update?.version || "none"} icon={Upload} color="text-emerald-400" />
                         <StatCard label="Mode" value={updateStatus?.updateRequired ? "forced" : "ready"} icon={ShieldCheck} color={updateStatus?.updateRequired ? "text-rose-400" : "text-emerald-400"} />
                       </div>
                       <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-5">
                         <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Server command</p>
                         <code className="mt-2 block text-sm text-slate-200">sudo tpanel-update</code>
                       </div>
                     </div>
                   ) : currentModule === "sec-audit" ? (
                     <AuditLog events={auditEvents} onRefresh={() => loadAudit().catch((error) => setPanelError(error.message || "Unable to load audit events."))} />
                   ) : currentModule === "sec-terminal" ? (
                     <div className="w-full h-[600px] flex flex-col items-start text-left bg-black/80 rounded-xl border border-slate-800 p-6 font-mono text-xs overflow-hidden shadow-2xl">
                        <div className="flex-1 overflow-y-auto mb-4 w-full custom-scrollbar space-y-1">
                           {terminalLogs.map((log, i) => (
                             <div key={i} className={log.startsWith("root@") ? "text-emerald-400" : "text-slate-300 whitespace-pre-wrap"}>
                               {log}
                             </div>
                           ))}
                        </div>
                        <form 
                          onSubmit={(e) => {
                            e.preventDefault();
                            const cmd = terminalInput.trim().toLowerCase();
                            if (!cmd) return;
                            let reply = [`root@tpanel:~# ${terminalInput}`];
                            if (cmd === "help") {
                              reply.push("Available: help, neofetch, node -v, status, clear, uptime, whoami");
                            } else if (cmd === "neofetch") {
                              reply.push("  /\\_\\ tPanel Host System Kernel", " / \\_\\ OS: Ubuntu 24.04 LTS (HWE)", " \\_/ / Uptime: 142 days, 4:12", "  \\_/  CPU: Intel Xeon Cascade (4 Cores)");
                            } else if (cmd === "node -v") {
                              reply.push("v20.11.0 (LTS Iron)");
                            } else if (cmd === "status") {
                              reply.push("System: Nominal Performance", "Load: 0.12, 0.42, 0.38", "Memory: 1,482MB / 16,384MB");
                            } else if (cmd === "uptime") {
                              reply.push("up 142 days, 4:12, 1 user, load average: 0.12, 0.42, 0.38");
                            } else if (cmd === "whoami") {
                              reply.push("root");
                            } else if (cmd === "clear") {
                              setTerminalLogs(["Console cleared.", "root@tpanel:~# "]);
                              setTerminalInput("");
                              return;
                            } else {
                              reply.push(`bash: ${cmd}: command not found. Try 'help'.`);
                            }
                            setTerminalLogs(prev => [...prev, ...reply, "root@tpanel:~# "]);
                            setTerminalInput("");
                          }}
                          className="flex w-full items-center gap-2"
                        >
                          <span className="text-emerald-400 shrink-0">root@tpanel:~#</span>
                          <input 
                            autoFocus
                            value={terminalInput}
                            onChange={(e) => setTerminalInput(e.target.value)}
                            className="bg-transparent border-none outline-none flex-1 text-slate-100 placeholder:opacity-20"
                            placeholder="type command..."
                          />
                        </form>
                     </div>
                   ) : (
                     <>
                       <div className="w-20 h-20 bg-slate-950 rounded-3xl border border-slate-900/50 flex items-center justify-center text-[#0069ff] mb-8">
                          {React.createElement(MODULES.find(m => m.id === currentModule)?.icon || Settings, { className: "w-10 h-10" })}
                       </div>
                       <h1 className="text-3xl font-black text-slate-100 tracking-tighter">
                         {MODULES.find(m => m.id === currentModule)?.label}
                       </h1>
                       <div className="h-0.5 w-16 bg-[#0069ff] mt-4 mb-4 rounded-full opacity-50"></div>
                       <p className="text-slate-500 mb-2 max-w-lg mx-auto italic font-medium leading-relaxed">
                         You are accessing the root management interface for {MODULES.find(m => m.id === currentModule)?.label}. 
                         Configure low-level server parameters, kernel settings, and daemon behaviors for the {MODULES.find(m => m.id === currentModule)?.category} subsystem.
                       </p>
                       
                       <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-4xl font-sans">
                          {[ 
                            { title: "Configuration Mode", desc: "Toggle between standard and expert modes." },
                            { title: "Access Control", desc: "Define who can edit these parameters." },
                            { title: "Sync Frequency", desc: "Set how often nodes are updated." },
                            { title: "Logging Verbosity", desc: "Control level of event detail." },
                            { title: "Resource Limits", desc: "Enforce subsystem CPU/RAM caps." },
                            { title: "Auto-Repair", desc: "Enable self-healing for this service." }
                          ].map((param, i) => (
                            <div key={i} className="bg-slate-950/40 border border-slate-900/30 p-5 rounded-2xl flex flex-col gap-3 text-left hover:border-slate-800 transition-colors">
                               <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-900/50 flex items-center justify-center text-slate-500">
                                  <Settings className="w-5 h-5" />
                               </div>
                               <div>
                                  <p className="text-xs font-black text-slate-100 uppercase tracking-wider">{param.title}</p>
                                  <p className="text-[10px] text-slate-600 mt-1 font-medium">{param.desc}</p>
                               </div>
                               <div className="mt-2 h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                                  <div className="h-full bg-[#0069ff] w-1/3 opacity-50"></div>
                               </div>
                            </div>
                          ))}
                       </div>
    
                       <button className="mt-8 px-6 py-2.5 bg-[#0069ff] text-white font-bold rounded-xl hover:bg-[#0055d4] transition-all flex items-center gap-2 text-sm shadow-xl shadow-[#0069ff]/10">
                          Apply Changes & Restart Service
                          <ArrowRight className="w-4 h-4" />
                       </button>
                     </>
                   )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Sidebar Overlay */}
        {!isSidebarOpen && (
          <div 
            onClick={() => setIsSidebarOpen(true)}
            className="fixed bottom-6 left-6 w-12 h-12 bg-[#0069ff] rounded-full flex items-center justify-center lg:hidden z-[60] active:scale-95 transition-all text-white border-2 border-white/20"
          >
            <Menu className="w-6 h-6" />
          </div>
        )}

      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
      `}</style>
    </div>
  );
}

function statusTone(status: string) {
  const value = String(status || "").toLowerCase();
  if (["active", "ready", "ok", "installed"].includes(value)) return "text-emerald-400";
  if (["queued", "configuring", "pending_dns", "reload_failed"].includes(value)) return "text-amber-400";
  if (["failed", "blocked", "inactive", "missing"].includes(value)) return "text-rose-400";
  return "text-slate-400";
}

function AuditLog({ events, onRefresh }: any) {
  return (
    <div className="w-full max-w-6xl text-left space-y-5">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-100 tracking-tight">Security Audit Logs</h1>
          <p className="text-sm text-slate-500 mt-2">Account creation, password resets, permission profile changes, package edits, and provisioning retries.</p>
        </div>
        <button onClick={onRefresh} className="px-4 py-2 rounded-lg border border-slate-800 bg-slate-950 text-xs font-black text-slate-200 hover:border-[#0069ff]">
          Refresh
        </button>
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950/40">
        <table className="w-full min-w-[920px] text-xs">
          <thead className="bg-slate-900 text-slate-500 uppercase">
            <tr>
              <th className="p-3 text-left">Time</th>
              <th className="p-3 text-left">Actor</th>
              <th className="p-3 text-left">Action</th>
              <th className="p-3 text-left">Target</th>
              <th className="p-3 text-left">Message</th>
            </tr>
          </thead>
          <tbody>
            {(events || []).length === 0 ? (
              <tr><td colSpan={5} className="p-6 text-center text-slate-500 font-bold">No audit events recorded yet.</td></tr>
            ) : (events || []).map((event: any) => (
              <tr key={event.id} className="border-t border-slate-800 text-slate-300">
                <td className="p-3 font-mono text-slate-500">{event.at ? new Date(event.at).toLocaleString() : "-"}</td>
                <td className="p-3 font-black text-slate-100">{event.actor || "system"}</td>
                <td className={`p-3 font-black ${event.severity === "danger" ? "text-rose-400" : event.severity === "warning" ? "text-amber-400" : "text-emerald-400"}`}>{event.action}</td>
                <td className="p-3 font-mono">{event.target || "-"}</td>
                <td className="p-3 text-slate-400">{event.message || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HostingStackOverview({ stack, provisioning, onOpenStack, onOpenAccounts }: any) {
  const accounts = provisioning?.accounts || [];
  const activeSsl = accounts.filter((account: any) => account.provisioning?.ssl?.status === "active").length;
  const pendingSsl = accounts.filter((account: any) => ["queued", "pending_dns", "blocked"].includes(account.provisioning?.ssl?.status)).length;
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <div className="xl:col-span-2 rounded-lg border border-slate-800 bg-slate-900/50 p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-sm font-black text-slate-100">Hosting Stack Readiness</h2>
            <p className="mt-1 text-[11px] text-slate-500">Nginx, PHP-FPM, MariaDB, DNS tools, Node.js, and Certbot health.</p>
          </div>
          <button onClick={onOpenStack} className="px-4 py-2 rounded-lg border border-[#0069ff]/40 bg-[#0069ff]/10 text-xs font-black text-[#66a3ff] hover:bg-[#0069ff]/15">
            Open Stack Manager
          </button>
        </div>
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(stack?.checks || []).map((check: any) => (
            <div key={check.id} className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-black text-slate-100">{check.label}</p>
                <span className={`text-[10px] font-black uppercase ${check.ok ? "text-emerald-400" : "text-rose-400"}`}>{check.ok ? "ready" : "fix"}</span>
              </div>
              <p className="mt-2 text-[10px] text-slate-500">Package: {check.packageOk ? "installed" : check.packageName || "unknown"}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-5">
        <h2 className="text-sm font-black text-slate-100">Auto SSL Pipeline</h2>
        <div className="mt-5 space-y-3 text-xs">
          <div className="flex justify-between"><span className="text-slate-500">Active SSL</span><span className="font-black text-emerald-400">{activeSsl}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Pending / DNS</span><span className="font-black text-amber-400">{pendingSsl}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Missing Packages</span><span className="font-black text-rose-400">{stack?.missingPackages?.length || 0}</span></div>
        </div>
        <button onClick={onOpenAccounts} className="mt-5 w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold text-slate-200 hover:border-[#0069ff]">View Accounts</button>
      </div>
    </div>
  );
}

function HostingStackManager({ stack, output, isInstalling, onRefresh, onInstall }: any) {
  return (
    <div className="w-full max-w-6xl text-left space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-100 tracking-tight">Hosting Stack Manager</h1>
          <p className="text-sm text-slate-500 mt-2">Install and verify the packages required for cPanel-style PHP, Node.js, database, DNS, Nginx, and Auto SSL hosting.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={onRefresh} className="px-4 py-2 rounded-lg border border-slate-800 bg-slate-950 text-xs font-black text-slate-200 hover:border-[#0069ff]">Refresh</button>
          <button disabled={isInstalling} onClick={onInstall} className="px-4 py-2 rounded-lg bg-[#0069ff] text-xs font-black text-white hover:bg-[#0055d4] disabled:opacity-60">
            {isInstalling ? "Installing..." : "Install Missing Packages"}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Manager" value={stack?.manager || "unknown"} icon={Terminal} color="text-sky-400" />
        <StatCard label="Services Ready" value={`${stack?.servicesReady || 0}/${stack?.servicesTotal || 0}`} icon={Server} color="text-emerald-400" />
        <StatCard label="Missing Packages" value={String(stack?.missingPackages?.length || 0)} icon={Download} color="text-rose-400" />
        <StatCard label="Auto SSL Active" value={String(stack?.sslCounts?.active || 0)} icon={ShieldCheck} color="text-emerald-400" />
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950/40">
        <table className="w-full min-w-[880px] text-xs">
          <thead className="bg-slate-900 text-slate-500 uppercase">
            <tr><th className="p-3 text-left">Stack Item</th><th className="p-3 text-left">Package</th><th className="p-3 text-left">Command</th><th className="p-3 text-left">Services</th><th className="p-3 text-left">Status</th></tr>
          </thead>
          <tbody>
            {(stack?.checks || []).map((check: any) => (
              <tr key={check.id} className="border-t border-slate-800 text-slate-300">
                <td className="p-3 font-black text-slate-100">{check.label}</td>
                <td className={`p-3 font-bold ${check.packageOk ? "text-emerald-400" : "text-rose-400"}`}>{check.packageName || "-"} {check.packageOk ? "installed" : "missing"}</td>
                <td className={`p-3 font-bold ${check.commandOk ? "text-emerald-400" : "text-rose-400"}`}>{check.command} {check.commandOk ? "ok" : "missing"}</td>
                <td className="p-3">{(check.services || []).map((item: any) => `${item.service}:${item.status}`).join(", ") || "not required"}</td>
                <td className={`p-3 font-black ${check.ok ? "text-emerald-400" : "text-rose-400"}`}>{check.ok ? "ready" : "needs fix"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {stack?.missingPackages?.length > 0 && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4">
          <p className="text-xs font-black text-amber-300">Missing packages</p>
          <p className="mt-2 text-xs text-amber-100/80 break-words">{stack.missingPackages.join(", ")}</p>
        </div>
      )}
      {output && (
        <pre className="max-h-80 overflow-auto rounded-lg border border-slate-800 bg-black/60 p-4 text-[11px] text-slate-300 whitespace-pre-wrap">{output}</pre>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  return (
    <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-800 flex items-center gap-5 transition-colors hover:border-slate-700">
       <div className={`p-3 bg-slate-950 rounded-xl border border-slate-800 ${color}`}>
          <Icon className="w-5 h-5" />
       </div>
       <div>
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">{label}</p>
          <p className="text-xl font-black text-slate-100 tracking-tight mt-0.5">{value}</p>
       </div>
    </div>
  )
}

function AdminResourceChart({ values }: any) {
  const points = (values || []).map((value: number, index: number) => {
    const x = (index / Math.max(1, values.length - 1)) * 100;
    const y = 100 - Math.max(0, Math.min(100, value));
    return `${x},${y}`;
  }).join(" ");
  const latest = values?.[values.length - 1] || 0;
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Node Pressure</p>
          <p className="mt-1 text-2xl font-black text-slate-100">{latest}%</p>
        </div>
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-400">
          Live
        </div>
      </div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-48 w-full overflow-visible">
        {[20, 40, 60, 80].map((line) => (
          <line key={line} x1="0" x2="100" y1={line} y2={line} stroke="rgba(148,163,184,0.12)" strokeWidth="0.5" />
        ))}
        <polyline points={points} fill="none" stroke="#0069ff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        <polyline points={`0,100 ${points} 100,100`} fill="rgba(0,105,255,0.12)" stroke="none" />
      </svg>
    </div>
  );
}

function UsageBar({ label, value, tone }: any) {
  const safeValue = Math.max(0, Math.min(100, Number(value || 0)));
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-bold text-slate-400">{label}</span>
        <span className="font-black text-slate-100">{safeValue}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded bg-slate-950 border border-slate-800">
        <div className={`h-full ${tone}`} style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder = "", type = "text" }: any) {
  return (
    <label className="block">
      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</span>
      <input
        type={type}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 outline-none focus:border-[#0069ff]"
      />
    </label>
  );
}

function AccountList({ accounts, provisioningAccounts = [], onAction, onPassword, onPermission, onProvision }: any) {
  const [passwords, setPasswords] = useState<Record<string, string>>({});
  const provisioningByUser = new Map((provisioningAccounts || []).map((account: any) => [account.username, account]));

  return (
    <div className="w-full text-left space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-black text-slate-100 tracking-tight">List Accounts</h1>
          <p className="text-sm text-slate-500 mt-2 max-w-3xl">Manage accounts, domains, DNS, SSL, permissions, passwords, and permanent deletion without horizontal clipping.</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-2">
            <p className="text-[10px] font-black uppercase text-slate-500">Total</p>
            <p className="text-lg font-black text-slate-100">{accounts.length}</p>
          </div>
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2">
            <p className="text-[10px] font-black uppercase text-emerald-300">Active</p>
            <p className="text-lg font-black text-emerald-200">{accounts.filter((account: any) => account.status === "active").length}</p>
          </div>
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-2">
            <p className="text-[10px] font-black uppercase text-amber-300">Paused</p>
            <p className="text-lg font-black text-amber-200">{accounts.filter((account: any) => account.status === "suspended").length}</p>
          </div>
        </div>
      </div>
      {accounts.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-10 text-center text-sm font-bold text-slate-500">No accounts created yet.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {accounts.map((account: any) => {
            const provision = (provisioningByUser.get(account.username) as any) || account;
            const vhostStatus = provision.provisioning?.vhost?.status || "queued";
            const sslStatus = provision.provisioning?.ssl?.status || (account.sslEnabled ? "queued" : "disabled");
            const routeDomains = [
              account.domain,
              ...(provision.provisioning?.vhost?.aliases || []),
              ...((provision.provisioning?.vhost?.subdomains || []).flatMap((route: any) => [route.domain, ...(route.aliases || [])]))
            ].filter(Boolean);
            const latestLogs = (provision.provisioningLog || []).slice(-2);
            return (
              <section key={account.id || account.username} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 shadow-none">
                <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[minmax(280px,1.35fr)_minmax(220px,0.8fr)_minmax(320px,1fr)_minmax(300px,0.95fr)]">
                  <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded border px-2 py-1 text-[10px] font-black uppercase ${account.status === "active" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : account.status === "suspended" ? "border-amber-500/20 bg-amber-500/10 text-amber-300" : "border-rose-500/20 bg-rose-500/10 text-rose-300"}`}>{account.status}</span>
                      <span className="rounded border border-slate-800 bg-slate-900 px-2 py-1 text-[10px] font-black uppercase text-slate-400">{account.runtime || "php"}</span>
                      <span className="rounded border border-slate-800 bg-slate-900 px-2 py-1 text-[10px] font-black uppercase text-slate-400">{account.packageName || "Package"}</span>
                    </div>
                    <div>
                      <h2 className="break-all text-lg font-black text-slate-100">{account.domain}</h2>
                      <p className="mt-1 break-all font-mono text-[11px] font-bold text-slate-500">{account.documentRoot}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {routeDomains.slice(0, 6).map((domain: string) => (
                        <span key={domain} className="max-w-full break-all rounded border border-slate-800 bg-slate-900 px-2 py-1 text-[10px] font-bold text-slate-300">{domain}</span>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4 2xl:grid-cols-2">
                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                      <p className="text-[10px] font-black uppercase text-slate-500">Username</p>
                      <p className="mt-1 break-all font-mono font-black text-slate-100">{account.username}</p>
                    </div>
                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                      <p className="text-[10px] font-black uppercase text-slate-500">Quota</p>
                      <p className="mt-1 font-black text-slate-100">{account.quotaMb} MB</p>
                    </div>
                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                      <p className="text-[10px] font-black uppercase text-slate-500">Bandwidth</p>
                      <p className="mt-1 font-black text-slate-100">{account.bandwidthGb} GB</p>
                    </div>
                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                      <p className="text-[10px] font-black uppercase text-slate-500">Provision</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <span className={statusTone(vhostStatus)}>Vhost {vhostStatus}</span>
                        <span className={statusTone(sslStatus)}>SSL {sslStatus}</span>
                      </div>
                    </div>
                  </div>

                  <div className="min-w-0 space-y-3">
                    <select
                      value={account.permissionProfile || "standard"}
                      onChange={(event) => onPermission(account.username, {}, event.target.value)}
                      className="w-full rounded border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-100 outline-none focus:border-[#0069ff]"
                    >
                      {ACCOUNT_PERMISSION_PROFILES.map((profile) => <option key={profile.id} value={profile.id}>{profile.label}</option>)}
                    </select>
                    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 xl:grid-cols-4">
                      {ACCOUNT_PERMISSION_ITEMS.slice(0, 16).map(([key, label]) => {
                        const enabled = account.permissions?.[key] !== false;
                        return (
                          <button
                            key={key}
                            onClick={() => onPermission(account.username, { [key]: !enabled })}
                            className={`min-h-8 rounded border px-2 py-1 text-[9px] font-black uppercase leading-tight ${enabled ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-slate-800 bg-slate-950 text-slate-600"}`}
                            title={`${enabled ? "Disable" : "Enable"} ${label}`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="min-w-0 space-y-3">
                    <div className="grid grid-cols-[1fr_auto] gap-2">
                      <input
                        type="password"
                        value={passwords[account.username] || ""}
                        onChange={(event) => setPasswords((current) => ({ ...current, [account.username]: event.target.value }))}
                        placeholder={account.passwordSet ? "Reset password" : "Set password"}
                        className="min-w-0 rounded border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-100 outline-none focus:border-[#0069ff]"
                      />
                      <button
                        onClick={() => {
                          onPassword(account.username, passwords[account.username] || "");
                          setPasswords((current) => ({ ...current, [account.username]: "" }));
                        }}
                        className="inline-flex items-center gap-1.5 rounded border border-[#0069ff]/40 px-3 py-2 text-xs font-black text-[#66a3ff] hover:bg-[#0069ff]/10"
                      >
                        <Lock className="h-3.5 w-3.5" /> Save
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <button onClick={() => onProvision(account.username)} className="inline-flex items-center justify-center gap-1.5 rounded border border-[#0069ff]/30 px-3 py-2 text-xs font-black text-[#66a3ff] hover:bg-[#0069ff]/10">
                        <RefreshCw className="h-3.5 w-3.5" /> Retry SSL
                      </button>
                      <button onClick={() => onAction(account.username, account.status === "suspended" ? "unsuspend" : "suspend")} className="inline-flex items-center justify-center gap-1.5 rounded border border-slate-700 px-3 py-2 text-xs font-black text-slate-200 hover:bg-slate-800">
                        <ShieldCheck className="h-3.5 w-3.5" /> {account.status === "suspended" ? "Unsuspend" : "Suspend"}
                      </button>
                      <button onClick={() => onAction(account.username, "delete")} className="inline-flex items-center justify-center gap-1.5 rounded border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs font-black text-rose-300 hover:bg-rose-500/20" title="Permanently delete account, files, domains, DNS, SSL, and provisioning records">
                        <Trash2 className="h-3.5 w-3.5" /> Permanently Delete
                      </button>
                    </div>
                    {latestLogs.length > 0 && (
                      <div className="space-y-1 rounded-lg border border-slate-800 bg-slate-900/50 p-3">
                        {latestLogs.map((line: string) => (
                          <p key={line} className="truncate text-[10px] font-bold text-slate-500">{line}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PackageList({ packages }: any) {
  return (
    <div className="w-full max-w-6xl text-left space-y-5">
      <div>
        <h1 className="text-3xl font-black text-slate-100 tracking-tight">List Packages</h1>
        <p className="text-sm text-slate-500 mt-2">Reusable hosting plans available during account creation.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {packages.map((pkg: any) => (
          <div key={pkg.id} className="rounded-lg border border-slate-800 bg-slate-950/50 p-5">
            <h2 className="text-lg font-black text-slate-100">{pkg.name}</h2>
            <div className="mt-4 space-y-2 text-xs text-slate-400">
              <p>Disk: <span className="font-black text-slate-100">{pkg.quotaMb} MB</span></p>
              <p>Bandwidth: <span className="font-black text-slate-100">{pkg.bandwidthGb} GB</span></p>
              <p>Domains: <span className="font-black text-slate-100">{pkg.domains}</span></p>
              <p>Email: <span className="font-black text-slate-100">{pkg.emailAccounts}</span></p>
              <p>Databases: <span className="font-black text-slate-100">{pkg.databases}</span></p>
              <p>Node Apps: <span className="font-black text-slate-100">{pkg.nodeApps}</span></p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
