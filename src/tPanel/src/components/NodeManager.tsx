import { useState, useEffect, useRef, Dispatch, SetStateAction, FormEvent } from "react";
import { 
  Cpu, 
  Terminal, 
  Play, 
  Square, 
  RefreshCw, 
  Plus, 
  Trash2, 
  Globe, 
  AlertCircle, 
  Sliders, 
  CheckCircle2,
  Settings,
  FolderOpen,
  Package,
  Layers,
  Zap,
  HardDrive,
  Code,
  Shield,
  Search,
  Check,
  X,
  FileCode,
  SlidersHorizontal,
  ChevronRight,
  Sparkles,
  Database
} from "lucide-react";
import { NodeApp, DomainItem, VirtualItem, NodeEnvVar } from "../types";

interface NodeManagerProps {
  nodeApps: NodeApp[];
  setNodeApps: Dispatch<SetStateAction<NodeApp[]>>;
  domains: DomainItem[];
  files: VirtualItem[];
  addActivity: (category: "file" | "domain" | "node" | "db" | "email" | "ssl", message: string) => void;
}

export default function NodeManager({ nodeApps, setNodeApps, domains, files, addActivity }: NodeManagerProps) {
  const [selectedAppId, setSelectedAppId] = useState<string>(nodeApps[0]?.id || "");
  const [isAddingApp, setIsAddingApp] = useState(false);
  
  // App Creation Form State
  const [appName, setAppName] = useState("");
  const [appDomainId, setAppDomainId] = useState(domains[0]?.id || "");
  const [appPort, setAppPort] = useState(3001);
  const [appStartup, setAppStartup] = useState("index.js");

  // Sub Tab panel per selected application
  const [appPanelTab, setAppPanelTab] = useState<"monitor" | "npm" | "nginx" | "env">("monitor");

  // NPM package operation state
  const [npmSearchQuery, setNpmSearchQuery] = useState("");
  const [installingPackage, setInstallingPackage] = useState<string | null>(null);
  const [installingProgress, setInstallingProgress] = useState(0);

  // New Env var input
  const [envKey, setEnvKey] = useState("");
  const [envVal, setEnvVal] = useState("");

  const activeApp = nodeApps.find(a => a.id === selectedAppId);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll terminal logs safely without scrolling the parent window!
  useEffect(() => {
    if (appPanelTab === "monitor" && terminalEndRef.current && terminalEndRef.current.parentElement) {
      const parent = terminalEndRef.current.parentElement;
      const isNearBottom = parent.scrollHeight - parent.scrollTop - parent.clientHeight < 80;
      // If parent height is small or user is near bottom, scroll safely
      if (isNearBottom || parent.scrollTop === 0) {
        parent.scrollTop = parent.scrollHeight;
      }
    }
  }, [activeApp?.logs, appPanelTab]);

  // Handle version switching loader
  const [isVersionSwitching, setIsVersionSwitching] = useState(false);

  const POPULAR_PACKAGES = [
    { name: "express", desc: "Fast, unopinionated, minimalist web framework for Node.js API development" },
    { name: "cors", desc: "Node.js CORS middleware to dynamically enable cross-origin requests" },
    { name: "dotenv", desc: "Loads environment variables from a .env file into process.env automatically" },
    { name: "jsonwebtoken", desc: "JsonWebToken implementation for authentication, signing & security" },
    { name: "mongoose", desc: "MongoDB object modeling tool designed to map database clusters" },
    { name: "socket.io", desc: "Real-time bidirectional event-based communication library for websockets" },
    { name: "nodemailer", desc: "Easy as cake secure email and SMTP sending from Node.js applications" },
    { name: "redis", desc: "High performance Redis cache, broker and memory keystore proxy" },
    { name: "prisma", desc: "Next-generation NodeJS & TypeScript Object-Relational Mapper (ORM)" },
    { name: "axios", desc: "Promise-based HTTP client helper for network and third-party calling" },
    { name: "lodash", desc: "Modern JavaScript utility library delivering modularity and performance" },
    { name: "helmet", desc: "Secures Express server hosts by setting various HTTP response headers" },
    { name: "bcryptjs", desc: "Optimized bcrypt implementation in JavaScript for passwords hashing" }
  ];

  // Fluctuating server logs and load simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setNodeApps(prevApps => prevApps.map(app => {
        if (app.status !== "running") return app;

        // Count PM2 cores
        const totalCores = app.instances || 1;
        const isCluster = app.clustering || false;
        
        // Base CPU usage varies by packages and clustering
        const baseCpu = isCluster ? (1.5 * totalCores) : 1.2;
        const pkgFactor = (app.installedPackages?.length || 3) * 0.15;
        const cpuChange = (Math.random() - 0.5) * 0.5;
        const newCpu = Math.max(0.1, Math.min(95, parseFloat((baseCpu + cpuChange + pkgFactor).toFixed(2))));
        
        // Base memory is limited by maxMemoryMB set
        const baseMem = app.memoryUsageMB || 28.5;
        const memLimit = app.maxMemoryMB || 512;
        const memChange = (Math.random() - 0.5) * (isCluster ? 1.6 : 0.6);
        const newMem = Math.max(15, Math.min(memLimit - 10, parseFloat((baseMem + memChange).toFixed(1))));

        // Potentially append a random server hit log
        let updatedLogs = [...app.logs];
        if (Math.random() > 0.6) {
          const endpoints = ["/", "/api/v1/auth/session", "/api/v1/users/profile", "/api/v1/db/query", "/healthz", "/static/bundle.js"];
          const selectedEndpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
          const requestIps = [window.location.hostname || "127.0.0.1", "10.0.0.8", "172.16.4.20"];
          const randomIp = requestIps[Math.floor(Math.random() * requestIps.length)];
          const timestamp = new Date().toLocaleTimeString();
          const statusCode = Math.random() > 0.97 ? 500 : (Math.random() > 0.94 ? 404 : 200);
          
          let logLine = `[${timestamp}] Incoming request - IP: ${randomIp} - Method: GET - URI: ${selectedEndpoint} - Response: ${statusCode} ${statusCode === 200 ? "OK" : statusCode === 404 ? "NOT FOUND" : "INTERNAL ERROR"}`;
          
          if (isCluster) {
            const workerId = Math.floor(Math.random() * totalCores);
            logLine = `[PM2] [worker-${workerId}] ${logLine}`;
          }

          updatedLogs.push(logLine);

          // Keep logs length reasonable
          if (updatedLogs.length > 60) {
            updatedLogs.shift();
          }
        }

        return {
          ...app,
          cpuUsage: newCpu,
          memoryUsageMB: newMem,
          logs: updatedLogs
        };
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, [setNodeApps]);

  const updateActiveApp = (updatedFields: Partial<NodeApp>) => {
    if (!activeApp) return;
    setNodeApps(prev => prev.map(app => {
      if (app.id === activeApp.id) {
        return {
          ...app,
          ...updatedFields
        };
      }
      return app;
    }));
  };

  // Safe configurations resolved with fallback values
  const nodeVersion = activeApp?.nodeVersion || "v20.11.0";
  const clustering = activeApp?.clustering || false;
  const instances = activeApp?.instances || 1;
  const maxMemoryMB = activeApp?.maxMemoryMB || 512;
  const nginxGzip = activeApp?.nginxGzip !== false;
  const nginxProxyHeaders = activeApp?.nginxProxyHeaders !== false;
  const installedPackages = activeApp?.installedPackages || ["express", "cors", "dotenv"];

  // Handle Create Application
  const handleCreateApp = (e: FormEvent) => {
    e.preventDefault();
    if (!appName.trim() || !appStartup) return;

    // Check if name or port already used
    if (nodeApps.some(a => a.name.toLowerCase() === appName.toLowerCase())) {
       alert("An application with that name already exists in the system.");
       return;
    }
    if (nodeApps.some(a => a.port === Number(appPort))) {
       alert(`Port ${appPort} is currently allocated to another process.`);
       return;
    }

    const newApp: NodeApp = {
      id: "app-" + Math.random().toString(36).substr(2, 9),
      name: appName.trim().toLowerCase().replace(/[^a-z0-9-_]/g, ""),
      domainId: appDomainId,
      port: Number(appPort),
      startupFile: appStartup,
      status: "running",
      envVars: [
        { key: "PORT", value: String(appPort) },
        { key: "NODE_ENV", value: "development" }
      ],
      cpuUsage: 1.0,
      memoryUsageMB: 28.5,
      logs: [
        `[INFO] [${new Date().toLocaleTimeString()}] Dynamic container initializing ... OK`,
        `[INFO] Spawning Virtual Node.js environment engine ... v20.11.0 loaded`,
        `[EXEC] node ${appStartup}`,
        `[NODE MASTER_PROCESS] API Server successfully bound and running on Port ${appPort}`,
        `[INFO] Listening to routes and ready for requests.`
      ],
      nodeVersion: "v20.11.0",
      clustering: false,
      instances: 1,
      maxMemoryMB: 512,
      nginxGzip: true,
      nginxProxyHeaders: true,
      installedPackages: ["express", "cors", "dotenv"]
    };

    setNodeApps(prev => [...prev, newApp]);
    setSelectedAppId(newApp.id);
    setIsAddingApp(false);
    addActivity("node", `Deployed new Node.js App instance: "${newApp.name}" on port ${newApp.port}`);
    
    // Clear inputs
    setAppName("");
    setAppPort(3002);
  };

  // Toggle status (start/stop)
  const toggleAppStatus = (id: string, action: "start" | "stop") => {
    setNodeApps(prev => prev.map(app => {
      if (app.id === id) {
        const timestamp = new Date().toLocaleTimeString();
        let newLogs = [...app.logs];
        if (action === "start") {
          newLogs.push(`[${timestamp}] [CONTROL] Start signal received.`);
          newLogs.push(`[${timestamp}] [EXEC] node ${app.startupFile}`);
          newLogs.push(`[${timestamp}] [NODE MASTER_PROCESS] API Server listening on port ${app.port}`);
          return {
            ...app,
            status: "running",
            cpuUsage: 1.2,
            memoryUsageMB: 32.4,
            logs: newLogs
          };
        } else {
          newLogs.push(`[${timestamp}] [CONTROL] Stop signal received. Gracefully terminating child threads.`);
          newLogs.push(`[${timestamp}] [SYS] Process exited with code 0 (SIGTERM - user intervention).`);
          return {
            ...app,
            status: "stopped",
            cpuUsage: 0,
            memoryUsageMB: 0,
            logs: newLogs
          };
        }
      }
      return app;
    }));
    addActivity("node", `${action === "start" ? "Started" : "Stopped"} Node process "${activeApp?.name}"`);
  };

  // Restart app
  const restartApp = (id: string) => {
    setNodeApps(prev => prev.map(app => {
      if (app.id === id) {
        const timestamp = new Date().toLocaleTimeString();
        const newLogs = [
          ...app.logs,
          `[${timestamp}] [CONTROL] Hard-Restart signal received.`,
          `[${timestamp}] [SYS] Terminating process thread ID: ${Math.floor(Math.random() * 8000 + 1000)} ... Done`,
          `[${timestamp}] [PROC] Re-pooling system modules ...`,
          `[${timestamp}] [EXEC] node ${app.startupFile}`,
          `[${timestamp}] [NODE MASTER_PROCESS] Reboot completed, bound to port ${app.port} successfully.`
        ];
        return {
          ...app,
          status: "running",
          cpuUsage: 2.5, // momentary surge
          memoryUsageMB: 38.0,
          logs: newLogs
        };
      }
      return app;
    }));
    addActivity("node", `Restarted node worker: "${activeApp?.name}"`);
  };

  // Switch Node Engine version with logs
  const handleNodeVersionChange = (version: string) => {
    if (!activeApp) return;
    setIsVersionSwitching(true);
    const timestamp = new Date().toLocaleTimeString();

    updateActiveApp({
      nodeVersion: version,
      logs: [
        ...activeApp.logs,
        `[${timestamp}] [SYSTEM] Switched runtime engine target version: -> ${version}`,
        `[${timestamp}] [NPM] Initiating environment sync and lockfile rebuild...`,
        `[${timestamp}] [SYSTEM] Swapping Node binary space pointer...`,
        `[${timestamp}] [SYSTEM] App instance rebooted using runtime engine ${version} completely.`
      ]
    });

    setTimeout(() => {
      setIsVersionSwitching(false);
      addActivity("node", `Switched "${activeApp.name}" Node.js runtime engine to ${version}`);
    }, 850);
  };

  // Add environment variable
  const addEnvVar = () => {
    if (!envKey.trim() || !envVal.trim() || !activeApp) return;

    // Check key
    const sanitizedKey = envKey.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "");
    if (activeApp.envVars.some(v => v.key === sanitizedKey)) {
      alert("This variable key already exists.");
      return;
    }

    const updatedVars = [...activeApp.envVars, { key: sanitizedKey, value: envVal.trim() }];
    
    setNodeApps(prev => prev.map(app => {
      if (app.id === activeApp.id) {
        return {
          ...app,
          envVars: updatedVars,
          logs: [...app.logs, `[${new Date().toLocaleTimeString()}] [ENV] Added configuration variable: ${sanitizedKey}`]
        };
      }
      return app;
    }));

    setEnvKey("");
    setEnvVal("");
    addActivity("node", `Configured environment variable ${sanitizedKey} in "${activeApp.name}"`);
  };

  // Delete environment variable
  const deleteEnvVar = (key: string) => {
    if (!activeApp) return;
    const updatedVars = activeApp.envVars.filter(v => v.key !== key);

    setNodeApps(prev => prev.map(app => {
      if (app.id === activeApp.id) {
        return {
          ...app,
          envVars: updatedVars,
          logs: [...app.logs, `[${new Date().toLocaleTimeString()}] [ENV] Revoked variable configuration: ${key}`]
        };
      }
      return app;
    }));
    addActivity("node", `Deleted environment variable ${key} in "${activeApp.name}"`);
  };

  // NPM install workflow
  const handleInstallPackage = (pkgName: string) => {
    if (!activeApp || installingPackage) return;
    
    setInstallingPackage(pkgName);
    setInstallingProgress(5);

    // Simulate progressive installation steps
    let currentProg = 5;
    const progressInterval = setInterval(() => {
      currentProg += Math.floor(Math.random() * 25) + 15;
      if (currentProg >= 100) {
        currentProg = 100;
        clearInterval(progressInterval);
      } else {
        setInstallingProgress(currentProg);
      }
    }, 150);

    setTimeout(() => {
      clearInterval(progressInterval);
      setInstallingProgress(100);
      
      const currentPkgs = activeApp.installedPackages || ["express", "cors", "dotenv"];
      const updatedPkgs = currentPkgs.includes(pkgName) ? currentPkgs : [...currentPkgs, pkgName];
      const timestamp = new Date().toLocaleTimeString();

      updateActiveApp({
        installedPackages: updatedPkgs,
        logs: [
          ...activeApp.logs,
          `[${timestamp}] [NPM] npm install ${pkgName} --save`,
          `[${timestamp}] [NPM] npm WARN resolution checking packages lockfile ...`,
          `[${timestamp}] [NPM] added 1 package, audited 284 modules in 1.48s`,
          `[${timestamp}] [SYSTEM] Process environment auto-updating. Successfully bound dynamic dependency.`
        ]
      });

      addActivity("node", `Installed NPM package "${pkgName}" into app "${activeApp.name}"`);
      setInstallingPackage(null);
      setInstallingProgress(0);
    }, 1100);
  };

  const handlePrunePackage = (pkgName: string) => {
    if (!activeApp) return;
    const currentPkgs = activeApp.installedPackages || ["express", "cors", "dotenv"];
    const updatedPkgs = currentPkgs.filter(p => p !== pkgName);
    const timestamp = new Date().toLocaleTimeString();

    updateActiveApp({
      installedPackages: updatedPkgs,
      logs: [
        ...activeApp.logs,
        `[${timestamp}] [NPM] npm uninstall ${pkgName} --save`,
        `[${timestamp}] [NPM] removed 1 package, audited 283 modules in 0.85s`,
        `[${timestamp}] [SYSTEM] Dependency pruned. System reloaded.`
      ]
    });

    addActivity("node", `Pruned NPM package "${pkgName}" from app "${activeApp.name}"`);
  };

  // Delete app entirely
  const handleDeleteApp = (id: string, name: string) => {
    if (confirm(`Are you sure you want to stop and delete the Node.js application "${name}" entirely?`)) {
      setNodeApps(prev => prev.filter(app => app.id !== id));
      addActivity("node", `Removed Node app configuration: "${name}"`);
      // Update selected
      const left = nodeApps.filter(app => app.id !== id);
      if (left.length > 0) {
        setSelectedAppId(left[0].id);
      } else {
        setSelectedAppId("");
      }
    }
  };

  const mappedDomain = domains.find(d => d.id === activeApp?.domainId)?.domainName || "Not mapped";

  const filteredPopularPackages = POPULAR_PACKAGES.filter(p => 
    p.name.toLowerCase().includes(npmSearchQuery.toLowerCase()) || 
    p.desc.toLowerCase().includes(npmSearchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Node Manager Header - CRISP BORDERS & BEAUTIFUL SLATE */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center bg-slate-900 border border-slate-700 p-5 rounded-xl gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 rounded border border-emerald-500/20 text-emerald-400">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 font-sans tracking-tight">
                Node.js Application Ecosystem
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">Deploy standalone processes, auto-bind proxy mapping, configure PM2 clustering monitors, and manage NPM workspace dependencies.</p>
            </div>
          </div>
        </div>
        <div className="flex items-center">
          <button 
            type="button"
            onClick={() => setIsAddingApp(true)}
            className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 rounded text-white pointer-events-auto transition cursor-pointer flex items-center justify-center gap-1.5 hover:shadow-lg hover:shadow-emerald-500/10"
            id="btn-register-node-app"
          >
            <Plus className="w-4 h-4" />
            Setup New App
          </button>
        </div>
      </div>

      {nodeApps.length === 0 ? (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-4">
          <Terminal className="w-12 h-12 text-slate-600 animate-pulse" />
          <div className="space-y-1">
            <h3 className="font-bold text-slate-200 text-sm">No Node.js Processes Active</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed font-mono">
              Setup custom express or socket microservices mapped to your DNS routing and scale instantly.
            </p>
          </div>
          <button 
            onClick={() => setIsAddingApp(true)}
            className="px-3.5 py-1.5 text-xs bg-emerald-600 rounded text-white font-semibold hover:bg-emerald-500 cursor-pointer transition font-mono"
          >
            Launch Server Instance
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          
          {/* List of Applications Bar (LEFT) */}
          <div className="lg:col-span-1 space-y-4">
            
            {/* PM2 Daemon Core System Status */}
            <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-3.5 space-y-3 font-sans">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  <span className="text-[10px] font-black text-slate-100 uppercase tracking-wider font-mono">PM2 System Daemon</span>
                </div>
                <span className="text-[9px] bg-indigo-500/10 text-indigo-400 font-mono border border-indigo-500/20 px-1.5 py-0.5 rounded font-black uppercase">
                  v5.4.1 LIVE
                </span>
              </div>
              
              <div className="space-y-1.5 text-[10.5px] font-mono leading-normal">
                <div className="flex justify-between">
                  <span className="text-slate-500">Daemon RAM:</span>
                  <span className="text-slate-300 font-bold">42.8 MB / 8 GB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Node Engine:</span>
                  <span className="text-slate-305 font-bold text-sky-400">v20.11.0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Uptime:</span>
                  <span className="text-slate-305 text-emerald-400 font-bold">48d 14h 22m</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px] font-mono">
                <button 
                  onClick={() => {
                    const timestamp = new Date().toLocaleTimeString();
                    setNodeApps(prev => prev.map(app => {
                      if (app.id !== selectedAppId) return app;
                      return {
                        ...app,
                        logs: [
                          ...app.logs,
                          `[${timestamp}] [SYSTEM] stdout console stream memory buffer cleared manually by Administrator.`
                        ]
                      };
                    }));
                    alert("PM2 active logs buffer successfully flushed!");
                    addActivity("node", "PM2 global terminal logs buffer flushed");
                  }}
                  className="py-1 bg-slate-950 hover:bg-slate-850 text-slate-300 rounded border border-slate-755 hover:border-slate-600 transition cursor-pointer"
                  title="Truncate memory buffer"
                >
                  🧹 Flush Logs
                </button>
                <button 
                  onClick={() => {
                    const timestamp = new Date().toLocaleTimeString();
                    setNodeApps(prev => prev.map(app => {
                      if (app.status !== "running") return app;
                      return {
                        ...app,
                        logs: [
                          ...app.logs,
                          `[${timestamp}] [PM2] Graceful reload triggered. Signal: SIGINT`,
                          `[${timestamp}] [PM2] All threads re-bound successfully. Live.`
                        ]
                      };
                    }));
                    alert("Graceful Daemon reload dispatched to PM2 threads!");
                    addActivity("node", "PM2 thread cluster gracefully restarted");
                  }}
                  className="py-1 bg-slate-950 hover:bg-slate-850 text-slate-300 rounded border border-slate-755 hover:border-slate-600 transition cursor-pointer"
                  title="Reload active ecosystem"
                >
                  🚀 Reload daemon
                </button>
              </div>
            </div>

            <div className="space-y-3.5">
              <div className="flex items-center gap-1.5 px-1 justify-between">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Processes</h3>
                </div>
                <span className="text-[10px] bg-slate-950 px-1.5 py-0.5 rounded font-mono text-slate-500 font-bold">
                  {nodeApps.length} processes
                </span>
              </div>
              <div className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 scrollbar-none font-sans">
                {nodeApps.map(app => (
                  <button
                    key={app.id}
                    onClick={() => setSelectedAppId(app.id)}
                    className={`w-full text-left p-3 rounded border transition font-mono shrink-0 min-w-[150px] lg:min-w-0 cursor-pointer ${
                      selectedAppId === app.id
                        ? "bg-slate-900 border-indigo-500 text-slate-150 shadow-[0_4px_12px_rgba(99,102,241,0.08)]"
                        : "bg-slate-900/40 border-slate-700/60 hover:bg-slate-900 hover:text-slate-250 text-slate-400"
                    }`}
                    id={`btn-select-app-${app.name}`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold truncate">
                      <span className="truncate text-slate-100 font-bold">{app.name}</span>
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 border border-slate-950 ${app.status === "running" ? "bg-emerald-400 animate-pulse animate-duration-1000" : "bg-slate-600"}`}></span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1.5 font-mono">
                      <span>Port: {app.port}</span>
                      <span>{app.nodeVersion || "v20.11.0"}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Micro Boilerplates scaffolding generator utility */}
            <div className="bg-slate-905 bg-slate-900 border border-slate-700/80 rounded-xl p-3.5 space-y-3 font-sans">
              <div>
                <span className="text-xs font-bold text-slate-200 block">Workspace Boilerplate scaffold</span>
                <span className="text-[10px] text-slate-500 mt-0.5 block">Deploy full boot file scaffolds directly into document workspace.</span>
              </div>
              <button 
                onClick={() => {
                  alert("BOILERPLATE DOWNLOADED:\n\n'server.js' Express router boilerplate has been successfully scaffolded inside your File Manager at '/home/tpanel/public_html/'");
                  addActivity("file", "Scaffolded NodeJS server.js boilerplate entrypoint in file explorer");
                }}
                className="w-full py-1.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 hover:border-indigo-500/45 text-[11px] font-bold rounded-lg transition text-center cursor-pointer font-sans"
              >
                ⚡ Generate Express server.js Boilerplate
              </button>
            </div>

          </div>

          {/* Selected Application Dashboard (RIGHT) */}
          {activeApp && (
            <div className="lg:col-span-3 space-y-6">
              
              {/* Info grid & Core Controls */}
              <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700/60 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base font-bold text-slate-100">{activeApp.name}</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono uppercase tracking-wider ${
                        activeApp.status === "running" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-slate-800 text-slate-400 border border-slate-700"
                      }`}>
                        {activeApp.status}
                      </span>
                      {clustering && (
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold font-mono uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          {instances}x Clustering
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Globe className="w-3.5 h-3.5 text-slate-500" />
                      <span>Subdomain Gateway:</span>
                      <span className="font-mono text-indigo-400 font-bold">{mappedDomain}</span>
                    </div>
                  </div>

                  {/* Process Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    {activeApp.status === "running" ? (
                      <button
                        onClick={() => toggleAppStatus(activeApp.id, "stop")}
                        className="px-3 py-1.5 text-xs text-rose-400 bg-slate-950 border border-slate-700 hover:bg-rose-950/20 hover:border-rose-500/35 rounded font-mono font-bold transition flex items-center gap-1 cursor-pointer"
                        title="Stop App Process"
                        id="btn-stop-node"
                      >
                        <Square className="w-3.5 h-3.5 fill-rose-400/20 text-rose-400" />
                        Stop Process
                      </button>
                    ) : (
                      <button
                        onClick={() => toggleAppStatus(activeApp.id, "start")}
                        className="px-3 py-1.5 text-xs text-emerald-400 bg-slate-950 border border-slate-700 hover:bg-emerald-950/20 hover:border-emerald-500/35 rounded font-mono font-bold transition flex items-center gap-1 cursor-pointer"
                        title="Start App Process"
                        id="btn-start-node"
                      >
                        <Play className="w-3.5 h-3.5 fill-emerald-400/20 text-emerald-400" />
                        Start Process
                      </button>
                    )}
                    
                    <button
                      onClick={() => restartApp(activeApp.id)}
                      disabled={activeApp.status !== "running"}
                      className="px-3 py-1.5 text-xs text-sky-400 bg-slate-950 border border-slate-700 hover:bg-sky-950/20 hover:border-sky-500/35 rounded font-mono font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                      title="Graceful Restart Process Core"
                      id="btn-restart-node"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
                      Restart
                    </button>
                    
                    <button
                      onClick={() => handleDeleteApp(activeApp.id, activeApp.name)}
                      className="p-1.5 text-slate-400 hover:text-rose-455 hover:bg-slate-950 border border-transparent hover:border-slate-700 rounded transition cursor-pointer"
                      title="Destroy Application"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Simulated live telemetry stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-slate-950 border border-slate-700/80 rounded p-3.5 flex items-center gap-3.5 font-mono">
                    <div className="p-2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/10">
                      <Cpu className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">CPU Threads Usage</div>
                      <div className="text-sm font-bold text-slate-200 mt-0.5">{activeApp.status === "running" ? `${activeApp.cpuUsage}%` : "0.00%"}</div>
                    </div>
                  </div>

                  <div className="bg-slate-950 border border-slate-700/80 rounded p-3.5 flex items-center gap-3.5 font-mono">
                    <div className="p-2 rounded bg-indigo-500/10 text-indigo-450 border border-indigo-500/10">
                      <HardDrive className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                      <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Allocated Heap Memory</div>
                      <div className="text-sm font-bold text-slate-200 mt-0.5">{activeApp.status === "running" ? `${activeApp.memoryUsageMB} MB` : "0.0 MB"} <span className="text-[10px] text-slate-500">/ {maxMemoryMB}MB</span></div>
                    </div>
                  </div>

                  <div className="bg-slate-950 border border-slate-700/80 rounded p-3.5 flex items-center gap-3.5 font-mono">
                    <div className="p-2 rounded bg-amber-500/10 text-amber-500 border border-amber-500/10">
                      <Zap className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                      <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Status Port Binding</div>
                      <div className="text-sm font-bold text-emerald-400 mt-0.5">{activeApp.status === "running" ? `LISTENING :${activeApp.port}` : "INACTIVE"}</div>
                    </div>
                  </div>
                </div>

                {/* Sub Tab Panel Navigation */}
                <div className="flex border-b border-slate-700/60 pb-px gap-1.5 overflow-x-auto scrollbar-none font-mono">
                  <button
                    onClick={() => setAppPanelTab("monitor")}
                    className={`px-3 py-2 text-xs font-bold border-b-2 transition cursor-pointer shrink-0 ${
                      appPanelTab === "monitor" 
                        ? "border-emerald-500 text-emerald-400 font-bold bg-slate-950/30" 
                        : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    💻 Monitoring &amp; Clusters
                  </button>
                  <button
                    onClick={() => setAppPanelTab("npm")}
                    className={`px-3 py-2 text-xs font-bold border-b-2 transition cursor-pointer shrink-0 ${
                      appPanelTab === "npm" 
                        ? "border-indigo-500 text-indigo-400 font-bold bg-slate-950/30" 
                        : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    📦 Package Manager ({installedPackages.length})
                  </button>
                  <button
                    onClick={() => setAppPanelTab("nginx")}
                    className={`px-3 py-2 text-xs font-bold border-b-2 transition cursor-pointer shrink-0 ${
                      appPanelTab === "nginx" 
                        ? "border-sky-500 text-sky-400 font-bold bg-slate-950/30" 
                        : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    ⚙️ Engine &amp; Proxy config
                  </button>
                  <button
                    onClick={() => setAppPanelTab("env")}
                    className={`px-3 py-2 text-xs font-bold border-b-2 transition cursor-pointer shrink-0 ${
                      appPanelTab === "env" 
                        ? "border-amber-500 text-amber-500 font-bold bg-slate-950/30" 
                        : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    📂 Env Variables (.env)
                  </button>
                </div>

                {/* Sub Tab panels render */}
                <div className="space-y-4 animate-fade-in">
                  
                  {/* TAB 1: MONITOR & LOGS */}
                  {appPanelTab === "monitor" && (
                    <div className="space-y-4">
                      
                      {/* Cluster instances selector visualizer */}
                      {clustering && (
                        <div className="bg-slate-950 border border-slate-700 rounded-xl p-4 space-y-3.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-350 font-mono flex items-center gap-2">
                              <Layers className="w-4 h-4 text-indigo-400 animate-pulse" />
                              PM2 Cluster Ecosystem Monitor ({instances} Processes online)
                            </span>
                            <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/15 border border-emerald-500/20 px-2 py-0.5 rounded leading-none flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                              Active Fork Map
                            </span>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {Array.from({ length: instances }).map((_, idx) => {
                              const workerPid = 3820 + idx * 44;
                              const status = activeApp.status === "running" ? "online" : "stopped";
                              let workerCpu = 0.0;
                              let workerMem = 0.0;
                              
                              if (status === "online") {
                                const seedValue = Math.sin(Date.now() / 2000 + idx);
                                workerCpu = Math.max(0.2, parseFloat((activeApp.cpuUsage / instances + seedValue * 0.4).toFixed(2)));
                                workerMem = Math.max(12, parseFloat((activeApp.memoryUsageMB / instances + seedValue * 1.5).toFixed(1)));
                              }

                              return (
                                <div key={idx} className="bg-slate-900 border border-slate-700/80 p-3 rounded font-mono text-[11px] flex flex-col justify-between gap-2 hover:border-indigo-500/40 transition">
                                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                                    <span className="font-bold text-slate-400">worker#{idx}</span>
                                    <span className="text-[9px] text-slate-500 font-bold">PID: {status === "online" ? workerPid : "-"}</span>
                                  </div>
                                  <div className="space-y-1 text-xs">
                                    <div className="flex justify-between text-[10px]">
                                      <span className="text-slate-500">CPU LOAD:</span>
                                      <span className="text-emerald-400 font-bold">{status === "online" ? `${workerCpu}%` : "0%"}</span>
                                    </div>
                                    <div className="flex justify-between text-[10px]">
                                      <span className="text-slate-500">MEMORY:</span>
                                      <span className="text-sky-400 font-bold">{status === "online" ? `${workerMem} MB` : "0 MB"}</span>
                                    </div>
                                    <div className="flex justify-between text-[10px]">
                                      <span className="text-slate-500">STATUS:</span>
                                      <span className={status === "online" ? "text-emerald-500" : "text-slate-500"}>{status.toUpperCase()}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Process logs kernel terminal console */}
                      <div className="bg-slate-950 border border-slate-700 rounded-xl overflow-hidden flex flex-col h-[280px]">
                        <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-700 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Terminal className="w-4 h-4 text-emerald-450" />
                            <span className="text-xs font-semibold text-slate-300 font-mono">stdout stream (live process)</span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2">
                            <RefreshCw className="w-3 h-3 animate-spin text-slate-650" />
                            <span>Interval refresh: 3s</span>
                          </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 font-mono text-[11px] text-emerald-400 bg-slate-950 select-text leading-relaxed space-y-1 scrollbar-thin">
                          {activeApp.logs.map((log, idx) => (
                            <div key={idx} className="break-all whitespace-pre-wrap">
                              <span className="text-slate-650 select-none mr-2">❯</span>
                              {log}
                            </div>
                          ))}
                          <div ref={terminalEndRef} />
                        </div>
                      </div>

                    </div>
                  )}

                  {/* TAB 2: VIRTUAL NPM SPACE */}
                  {appPanelTab === "npm" && (
                    <div className="space-y-4">
                      
                      <div className="bg-slate-950 border border-slate-700 p-4 rounded-xl space-y-3 font-mono">
                        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                          <div>
                            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                              <Package className="w-4 h-4 text-indigo-400" />
                              Virtual package.json Dependencies
                            </span>
                            <span className="text-[10px] text-slate-500 block mt-0.5">Integrate modules easily; system parses package loaders inside live thread.</span>
                          </div>
                          
                          {/* Search bar inside dependencies */}
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                              <Search className="h-3.5 w-3.5 text-slate-500" />
                            </span>
                            <input 
                              type="text"
                              value={npmSearchQuery}
                              onChange={(e) => setNpmSearchQuery(e.target.value)}
                              placeholder="Search modules..."
                              className="w-full sm:w-48 pl-8 pr-3 py-1 bg-slate-900 border border-slate-700 rounded text-xs focus:outline-none focus:border-indigo-500 text-slate-300"
                            />
                            {npmSearchQuery && (
                              <button onClick={() => setNpmSearchQuery("")} className="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer">
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* NPM install load progress bar */}
                        {installingPackage && (
                          <div className="bg-indigo-950/20 border border-indigo-700/30 p-3 rounded-lg space-y-2 animate-pulse">
                            <div className="flex justify-between text-xs font-sans text-indigo-300">
                              <span className="flex items-center gap-2">
                                <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                                Downloading package: <strong className="text-white">{installingPackage}</strong>
                              </span>
                              <span>{installingProgress}%</span>
                            </div>
                            <div className="w-full bg-slate-900 h-1.5 rounded overflow-hidden">
                              <div className="bg-indigo-500 h-full transition-all duration-150" style={{ width: `${installingProgress}%` }}></div>
                            </div>
                          </div>
                        )}

                        {/* Configured app packages grid */}
                        <div className="space-y-2">
                          <span className="text-[10px] text-slate-450 uppercase tracking-widest font-bold">Active package.json ["dependencies"]</span>
                          <div className="flex flex-wrap gap-1.5">
                            {installedPackages.map(pkg => (
                              <div key={pkg} className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 flex items-center gap-2">
                                <span className="font-semibold text-indigo-400">{pkg}</span>
                                <span className="text-[10px] text-slate-500">latest</span>
                                {pkg !== "express" && pkg !== "cors" && pkg !== "dotenv" && (
                                  <button onClick={() => handlePrunePackage(pkg)} className="text-slate-500 hover:text-rose-455 cursor-pointer transition leading-none ml-1">
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Installable Packages Catalog */}
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1 font-mono block">NPM Registry Modules Catalogue</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {filteredPopularPackages.map(pkg => {
                            const isInstalled = installedPackages.includes(pkg.name);
                            return (
                              <div key={pkg.name} className="bg-slate-900 border border-slate-700 rounded-xl p-3.5 flex flex-col justify-between gap-3.5 select-none font-sans">
                                <div>
                                  <div className="flex items-center justify-between">
                                    <span className="font-mono text-xs font-bold text-slate-200">{pkg.name}</span>
                                    <span className="text-[9px] font-mono text-slate-500 border border-slate-800 px-1.5 py-0.5 rounded">v1.0.0</span>
                                  </div>
                                  <p className="text-[11px] text-slate-400 mt-1 leading-normal">{pkg.desc}</p>
                                </div>
                                <div className="flex justify-end pt-1">
                                  {isInstalled ? (
                                    <div className="text-[10px] text-emerald-455 font-mono font-bold bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-1 flex items-center gap-1 select-none">
                                      <Check className="w-3.5 h-3.5" />
                                      Installed
                                    </div>
                                  ) : (
                                    <button
                                      disabled={!!installingPackage}
                                      onClick={() => handleInstallPackage(pkg.name)}
                                      className="px-2.5 py-1 text-[11px] font-bold font-mono bg-indigo-650 hover:bg-indigo-600 border border-indigo-500 text-white rounded cursor-pointer transition disabled:opacity-40"
                                    >
                                      Install Module
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          
                          {filteredPopularPackages.length === 0 && (
                            <div className="col-span-2 text-center py-6 text-slate-500 font-mono text-xs border border-transparent">
                              No compatible modules matching query found. Try another search.
                            </div>
                          )}
                        </div>
                      </div>

                    </div>
                  )}

                  {/* TAB 3: ENGINE & NG_PROXY */}
                  {appPanelTab === "nginx" && (
                    <div className="space-y-4">
                      
                      {/* Node Version and Limits row */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        
                        {/* Selector block */}
                        <div className="bg-slate-950 border border-slate-700 p-4 rounded-xl space-y-3 font-mono">
                          <div>
                            <span className="text-xs font-bold text-slate-300 block">Node.js Runtime Core Engine</span>
                            <span className="text-[10px] text-slate-500 mt-0.5 block">Select the default server-side executable workspace version.</span>
                          </div>

                          <div className="space-y-2">
                            <select
                              value={nodeVersion}
                              onChange={(e) => handleNodeVersionChange(e.target.value)}
                              disabled={isVersionSwitching}
                              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs select-none text-slate-350 focus:outline-none focus:border-emerald-500 font-mono cursor-pointer"
                            >
                              <option value="v16.20.2">Node.js LTS v16.20.2 (Legacy support)</option>
                              <option value="v18.19.1">Node.js LTS v18.19.1 (Hydrogen stable)</option>
                              <option value="v20.11.0">Node.js LTS v20.11.0 (Iron current - recommended)</option>
                              <option value="v22.2.0">Node.js Current v22.2.0 (Latest Release)</option>
                            </select>

                            {isVersionSwitching && (
                              <div className="text-[10px] text-emerald-400 flex items-center gap-1.5 animate-pulse">
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                Mapping executable node engine binary spaces...
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Heap memory limits core slider */}
                        <div className="bg-slate-950 border border-slate-700 p-4 rounded-xl space-y-3 font-mono">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-xs font-bold text-slate-300 block">Garbage Disposal Old Space (max-RAM)</span>
                              <span className="text-[10px] text-slate-500 mt-0.5 block">Garbage Collector threshold ceiling block limit.</span>
                            </div>
                            <span className="text-xs text-sky-400 font-bold bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded leading-none">
                              --max-old-space-size={maxMemoryMB}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <input
                              type="range"
                              min={128}
                              max={2048}
                              step={128}
                              value={maxMemoryMB}
                              onChange={(e) => updateActiveApp({ maxMemoryMB: Number(e.target.value) })}
                              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500 focus:outline-none"
                            />
                            <div className="flex justify-between text-[9px] text-slate-600">
                              <span>128 MB</span>
                              <span>512 MB</span>
                              <span>1024 MB</span>
                              <span>2048 MB</span>
                            </div>
                          </div>
                        </div>

                      </div>

                      {/* Process mode & clustering scaling options */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        
                        {/* PM2 clustering switch */}
                        <div className="bg-slate-950 border border-slate-700 p-4 rounded-xl space-y-4 font-mono">
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="text-xs font-bold text-slate-300 block">PM2 Process Cluster Mode</span>
                              <span className="text-[10px] text-slate-500 mt-0.5 block">Map Node single threads to multi-core hyperthreading nodes.</span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={clustering}
                                onChange={(e) => {
                                  const nowCheck = e.target.checked;
                                  const timestamp = new Date().toLocaleTimeString();
                                  updateActiveApp({ 
                                    clustering: nowCheck,
                                    instances: nowCheck ? 2 : 1,
                                    logs: [
                                      ...activeApp.logs,
                                      `[${timestamp}] [PM2] Cluster mode changed to ${nowCheck ? "ACTIVE" : "STANDALONE"}.`,
                                      `[${timestamp}] [PM2] Dispatching worker pool instances: count set size to ${nowCheck ? 2 : 1} modules.`
                                    ]
                                  });
                                  addActivity("node", `PM2 Process Clustering ${nowCheck ? "Enabled" : "Disabled"} for "${activeApp.name}"`);
                                }}
                                className="sr-only peer"
                              />
                              <div className="w-8 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3.5 after:transition-all peer-checked:bg-emerald-600 peer-checked:after:bg-white"></div>
                            </label>
                          </div>

                          {clustering && (
                            <div className="space-y-2 pt-1 animate-fade-in">
                              <div className="flex justify-between text-[11px] text-slate-400">
                                <span className="flex items-center gap-1">
                                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                                  Active Workers (CPU Cores Allocation):
                                </span>
                                <strong className="text-indigo-400 font-bold">{instances} Cores mapped</strong>
                              </div>
                              <input
                                type="range"
                                min={1}
                                max={8}
                                step={1}
                                value={instances}
                                onChange={(e) => {
                                  const newCores = Number(e.target.value);
                                  const timestamp = new Date().toLocaleTimeString();
                                  updateActiveApp({ 
                                    instances: newCores,
                                    logs: [
                                      ...activeApp.logs,
                                      `[${timestamp}] [PM2] Rescaled process grouping topology: -> ${newCores} cores active.`,
                                      `[${timestamp}] [PM2] Allocation complete. Multi-instancing reloaded.`
                                    ]
                                  });
                                }}
                                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none"
                              />
                              <div className="flex justify-between text-[9px] text-slate-600">
                                <span>Core#1</span>
                                <span>Core#2</span>
                                <span>Core#4</span>
                                <span>Core#8</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Nginx Proxy forwarding setup toggles */}
                        <div className="bg-slate-950 border border-slate-700 p-4 rounded-xl space-y-3.5 font-mono">
                          <div>
                            <span className="text-xs font-bold text-slate-300 block">Nginx Proxy Layer Integration</span>
                            <span className="text-[10px] text-slate-500 mt-0.5 block">Configure routing endpoints and compress assets directly on web requests.</span>
                          </div>

                          <div className="space-y-2.5">
                            <label className="flex items-center justify-between text-xs text-slate-400 cursor-pointer select-none">
                              <span className="flex items-center gap-1.5">
                                <SlidersHorizontal className="w-3.5 h-3.5 text-sky-400" />
                                Enable Gzip Compression Pass:
                              </span>
                              <input
                                type="checkbox"
                                checked={nginxGzip}
                                onChange={(e) => updateActiveApp({ nginxGzip: e.target.checked })}
                                className="rounded border-slate-700 text-sky-600 bg-slate-900 focus:ring-sky-500 focus:ring-offset-slate-950"
                              />
                            </label>

                            <label className="flex items-center justify-between text-xs text-slate-400 cursor-pointer select-none">
                              <span className="flex items-center gap-1.5">
                                <Shield className="w-3.5 h-3.5 text-sky-400" />
                                Inject Proxy Forwarding Headers:
                              </span>
                              <input
                                type="checkbox"
                                checked={nginxProxyHeaders}
                                onChange={(e) => updateActiveApp({ nginxProxyHeaders: e.target.checked })}
                                className="rounded border-slate-700 text-sky-600 bg-slate-900 focus:ring-sky-500 focus:ring-offset-slate-950"
                              />
                            </label>
                          </div>
                        </div>

                      </div>

                      {/* Auto-generated server config block */}
                      <div className="space-y-2 font-mono">
                        <span className="text-xs font-bold text-slate-450 uppercase tracking-wider block pl-1">Virtual Nginx reverse-proxy deployment block</span>
                        <div className="bg-slate-950 border border-slate-700 rounded-xl overflow-hidden text-[11px] p-4 text-sky-400 leading-normal font-mono relative overflow-x-auto pr-1">
                          <code className="block whitespace-pre select-all text-slate-300">
{`server {
    listen 80;
    server_name ${mappedDomain};

    location / {
        proxy_pass http://127.0.0.1:${activeApp.port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;`}
{nginxProxyHeaders ? `
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;` : `
        # Standard IP details headers configuration bypassed`}
{`
        proxy_cache_bypass $http_upgrade;
    }`}
{nginxGzip ? `

    # Dynamic gzip compressor engine pass active
    gzip on;
    gzip_proxied any;
    gzip_types text/plain text/css application/json application/javascript text/xml;` : `
    # Asset stream compression disabled`}
{`
}`}
                          </code>
                          <span className="absolute top-2 right-2 text-[9px] font-bold bg-slate-900 border border-slate-800 text-slate-500 px-1.5 py-0.5 rounded leading-none select-none uppercase font-mono">
                            Nginx conf
                          </span>
                        </div>
                      </div>

                    </div>
                  )}

                  {/* TAB 4: ENVIRONMENTAL .ENV KEYS */}
                  {appPanelTab === "env" && (
                    <div className="space-y-4">
                      
                      <div className="bg-slate-950 border border-slate-700 p-4 rounded-xl space-y-4 font-mono">
                        <div>
                          <span className="text-xs font-bold text-slate-350 flex items-center gap-1.5">
                            <Sliders className="w-4 h-4 text-amber-500" />
                            Configuration Variable key bindings (.env)
                          </span>
                          <span className="text-[10px] text-slate-500 block mt-0.5">Define sensitive credentials (e.g., API_KEYS, Mongo URLs) mapped into process.env.</span>
                        </div>

                        {/* Env vars lists */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {activeApp.envVars.map(item => (
                            <div key={item.key} className="flex justify-between items-center bg-slate-900 border border-slate-700 rounded px-3 py-2 font-mono text-xs">
                              <div className="truncate pr-2">
                                <span className="text-amber-500 font-bold">{item.key}</span>
                                <span className="text-slate-500 mx-1.5">=</span>
                                <span className="text-slate-350 truncate" title={item.value}>{item.value}</span>
                              </div>
                              {item.key !== "PORT" && (
                                <button
                                  type="button"
                                  onClick={() => deleteEnvVar(item.key)}
                                  className="p-1 hover:bg-slate-950 border border-transparent hover:border-slate-800 text-slate-500 hover:text-rose-455 rounded cursor-pointer transition ml-auto"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Add variables input fields */}
                        <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-800">
                          <input 
                            type="text" 
                            placeholder="SECRET_KEY_NAME" 
                            value={envKey}
                            onChange={(e) => setEnvKey(e.target.value.toUpperCase())}
                            className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded font-mono text-xs focus:outline-none focus:border-amber-500 text-slate-300"
                          />
                          <input 
                            type="text" 
                            placeholder="secret_pass_token" 
                            value={envVal}
                            onChange={(e) => setEnvVal(e.target.value)}
                            className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded font-mono text-xs focus:outline-none focus:border-amber-500 text-slate-300"
                          />
                          <button
                            type="button"
                            onClick={addEnvVar}
                            disabled={!envKey || !envVal}
                            className="px-3.5 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded transition flex items-center justify-center gap-1 shrink-0 disabled:opacity-40 cursor-pointer"
                          >
                            <Plus className="w-4 h-4" />
                            Add Key
                          </button>
                        </div>
                      </div>

                    </div>
                  )}

                </div>

              </div>

            </div>
          )}

        </div>
      )}

      {/* Register App Modal */}
      {isAddingApp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form 
            onSubmit={handleCreateApp}
            className="bg-slate-900 border border-slate-700 rounded-xl p-5 w-full max-w-md shadow-xl space-y-4"
          >
            <div className="flex justify-between items-center border-b border-slate-700/60 pb-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Settings className="w-5 h-5 text-emerald-400" />
                Spawn Standalone Node App
              </h3>
              <button 
                type="button"
                onClick={() => setIsAddingApp(false)}
                className="p-1 px-2 text-xs bg-slate-800 hover:bg-slate-755 hover:text-rose-455 text-slate-300 border border-slate-700/85 rounded transition cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 text-xs font-mono">
              
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-semibold block">Application Identifier (URL-friendly)</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. users-auth-api" 
                  value={appName}
                  onChange={(e) => setAppName(e.target.value.toLowerCase())}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded focus:outline-none focus:border-emerald-500 text-slate-300"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-semibold block">Gateway Subdomain Map Routing</label>
                <select
                  value={appDomainId}
                  onChange={(e) => setAppDomainId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded focus:outline-none focus:border-emerald-500 text-slate-300 text-xs font-mono cursor-pointer"
                >
                  {domains.map(d => (
                    <option key={d.id} value={d.id}>{d.domainName} ({d.documentRoot})</option>
                  ))}
                  {domains.length === 0 && (
                    <option value="">No subdomains generated - Standalone standby</option>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-semibold block">Assigned Port (TCP)</label>
                  <input 
                    type="number" 
                    required
                    min={3001}
                    max={3100}
                    value={appPort}
                    onChange={(e) => setAppPort(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded focus:outline-none focus:border-emerald-500 text-slate-300"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-semibold block">Execution File (Script name)</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. server.js, app.js" 
                    value={appStartup}
                    onChange={(e) => setAppStartup(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded focus:outline-none focus:border-emerald-500 text-slate-300"
                  />
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded text-[11px] text-slate-500 leading-relaxed border border-slate-700/80 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  By spawning this server process, our reverse proxy configures high-speed forwarding to bind localhost Port <code className="text-emerald-400 font-bold">{appPort}</code> to the selected DNS record dynamically.
                </span>
              </div>

            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button 
                type="button"
                onClick={() => setIsAddingApp(false)}
                className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-rose-455 hover:bg-slate-800 rounded transition cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="px-4 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 rounded text-white font-semibold transition cursor-pointer"
              >
                Register &amp; Execute
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
