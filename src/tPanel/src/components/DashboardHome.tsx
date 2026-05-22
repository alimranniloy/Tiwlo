import { useState, useEffect, Dispatch, SetStateAction } from "react";
import { 
  Cpu, 
  Database, 
  Globe, 
  Mail, 
  FolderIcon, 
  Server, 
  Terminal, 
  TrendingUp, 
  Clock, 
  Download, 
  FileCheck,
  ShieldCheck,
  AlertTriangle,
  Volume2,
  RefreshCw
} from "lucide-react";
import { ServerStats, RecentActivity, DomainItem } from "../types";

interface DashboardHomeProps {
  stats: ServerStats;
  setStats: Dispatch<SetStateAction<ServerStats>>;
  activities: RecentActivity[];
  setActivities: Dispatch<SetStateAction<RecentActivity[]>>;
  domains: DomainItem[];
  setActiveTab: (tab: string) => void;
  addActivity: (category: "file" | "domain" | "node" | "db" | "email" | "ssl", message: string) => void;
  account?: any | null;
}

export default function DashboardHome({ stats, setStats, activities, setActivities, domains, setActiveTab, addActivity, account }: DashboardHomeProps) {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupSuccess, setBackupSuccess] = useState(false);

  // Fluctuating server metrics
  useEffect(() => {
    const timer = setInterval(() => {
      setStats(prev => {
        // CPU fluctuates slightly
        const cpuDelta = (Math.random() - 0.5) * 1.5;
        const nextCpu = Math.max(2, Math.min(95, parseFloat((prev.cpu + cpuDelta).toFixed(1))));
        const nextCpuHistory = [...prev.cpuHistory.slice(1), nextCpu];

        // RAM fluctuate
        const ramDelta = Math.floor((Math.random() - 0.5) * 8);
        const nextRam = Math.max(256, Math.min(2048, prev.ram + ramDelta));
        const nextRamHistory = [...prev.ramHistory.slice(1), nextRam];

        return {
          ...prev,
          cpu: nextCpu,
          cpuHistory: nextCpuHistory,
          ram: nextRam,
          ramHistory: nextRamHistory
        };
      });
    }, 2500);

    return () => clearInterval(timer);
  }, []);

  // Trigger server gzip backup zip
  const runGzipBackup = () => {
    setIsBackingUp(true);
    setBackupSuccess(false);
    addActivity("file", "Initiating global system archive (public_html + mysql dumps)...");

    setTimeout(() => {
      setIsBackingUp(false);
      setBackupSuccess(true);
      addActivity("file", "Gzip archive successfully generated at relative path: /backups/host_backup_full_tar.gz");
      
      setTimeout(() => setBackupSuccess(false), 4000);
    }, 3000);
  };

  // Helper calculating SVG circular dashes
  const getCircleStrokeDash = (percent: number, radius = 40) => {
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percent / 100) * circumference;
    return { strokeDasharray: `${circumference} ${circumference}`, strokeDashoffset };
  };

  const ramPercent = parseFloat((stats.ram / stats.ramMax * 100).toFixed(1));
  const diskPercent = parseFloat((stats.disk / stats.diskMax * 100).toFixed(1));
  const bandwidthPercent = parseFloat((stats.bandwidth / stats.bandwidthMax * 100).toFixed(1));
  const primaryDomain = account?.domain || domains[0]?.domainName || "No domain added";
  const accountName = account?.username || "tPanel User";
  const runtimeLabel = account?.runtime ? String(account.runtime).toUpperCase() : "PHP";

  return (
    <div className="space-y-6">
      
      {/* Welcome server status alert bar */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg shadow-[0_18px_60px_rgba(2,6,23,0.24)] flex flex-col xl:flex-row justify-between items-start xl:items-center gap-5">
        <div className="space-y-2 min-w-0">
          <h2 className="text-xl font-black text-slate-100 flex items-center gap-2 tracking-tight">
            <Server className="w-5 h-5 text-sky-400" />
            {account ? `${accountName} Hosting Dashboard` : "Server Dashboard"}
          </h2>
          <p className="text-slate-400 text-xs leading-5">
            {account
              ? "Your website, files, database, email, runtime, DNS, and SSL tools are ready from one panel."
              : "Host Node.js apps, map DNS records, manage MySQL tables, and secure webmail."}
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[10px] w-full xl:w-auto">
          <div className="bg-slate-950 px-3 py-2 rounded border border-slate-800 flex items-center gap-1.5 min-w-0">
            <Globe className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="text-slate-500">Domain:</span>
            <span className="text-slate-100 font-black truncate">{primaryDomain}</span>
          </div>
          <div className="bg-slate-950 px-3 py-2 rounded border border-slate-800 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="text-slate-500">Status:</span>
            <span className="text-emerald-400 font-black">{account?.status || "online"}</span>
          </div>
          <div className="bg-slate-950 px-3 py-2 rounded border border-slate-800 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-500">Runtime:</span>
            <span className="text-slate-100 font-black">{runtimeLabel}</span>
          </div>
        </div>
      </div>

      {/* Grid: Server Resources Wheels & Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 select-none">
        
        {/* CPU Usage Wheel */}
        <div className="bg-slate-900 border border-slate-900/40 p-5 rounded-xl flex items-center gap-5 relative overflow-hidden group">
          <div className="relative w-20 h-20 shrink-0">
            {/* SVG Progress Ring */}
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="40" cy="40" r="32" className="stroke-slate-950 fill-transparent" strokeWidth="6" />
              <circle 
                cx="40" 
                cy="40" 
                r="32" 
                className="stroke-sky-500 fill-transparent transition-all duration-1000" 
                strokeWidth="6" 
                strokeDasharray={getCircleStrokeDash(stats.cpu, 32).strokeDasharray}
                strokeDashoffset={getCircleStrokeDash(stats.cpu, 32).strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col justify-center items-center font-mono">
              <span className="text-xs font-bold text-slate-100">{stats.cpu}%</span>
              <span className="text-[7px] text-slate-500 uppercase tracking-widest font-black">Usage</span>
            </div>
          </div>
          <div className="space-y-1 font-mono">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">CPU Core Load</span>
            <span className="text-xs font-bold text-sky-400 flex items-center gap-1">
              <Cpu className="w-4 h-4 text-sky-400" />
              LiteSpeed Server
            </span>
            <span className="text-[9px] text-slate-500 block leading-normal">Virtualizing 4 cores Xeon</span>
          </div>
        </div>

        {/* RAM Usage Wheel */}
        <div className="bg-slate-900 border border-slate-900/40 p-5 rounded-xl flex items-center gap-5 relative overflow-hidden group">
          <div className="relative w-20 h-20 shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="40" cy="40" r="32" className="stroke-slate-950 fill-transparent" strokeWidth="6" />
              <circle 
                cx="40" 
                cy="40" 
                r="32" 
                className="stroke-amber-450 stroke-amber-500 fill-transparent transition-all duration-1000" 
                strokeWidth="6" 
                strokeDasharray={getCircleStrokeDash(ramPercent, 32).strokeDasharray}
                strokeDashoffset={getCircleStrokeDash(ramPercent, 32).strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col justify-center items-center font-mono">
              <span className="text-xs font-bold text-slate-100">{ramPercent}%</span>
              <span className="text-[7px] text-slate-500 uppercase tracking-widest font-black">Overhead</span>
            </div>
          </div>
          <div className="space-y-1 font-mono">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">RAM Memory Allocation</span>
            <span className="text-xs font-bold text-amber-500 flex items-center gap-1">
              {stats.ram} MB
            </span>
            <span className="text-[9px] text-slate-500 block leading-normal">Maximum limit: 2 GB</span>
          </div>
        </div>

        {/* STORAGE Bar Indicator - Elite SSD */}
        <div className="bg-slate-900 border border-slate-900/40 p-5 rounded-xl flex flex-col justify-between h-full space-y-3 font-mono">
          <div className="flex justify-between items-center text-[10px] text-slate-500 uppercase block font-bold">
            <span>Disk Storage (SSD)</span>
            <span className="text-emerald-400 font-bold">{diskPercent}%</span>
          </div>
          
          <div className="space-y-1.5">
            <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-850 flex font-mono text-[8px]">
              <div 
                style={{ width: `${diskPercent}%` }} 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              />
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-400">
              <span>{stats.disk.toFixed(1)} MB</span>
              <span className="text-slate-600">of 5.0 GB limit</span>
            </div>
          </div>
        </div>

        {/* MONTHLY BANDWIDTH Allowance */}
        <div className="bg-slate-900 border border-slate-900/40 p-5 rounded-xl flex flex-col justify-between h-full space-y-3 font-mono">
          <div className="flex justify-between items-center text-[10px] text-slate-500 uppercase block font-bold">
            <span>Monthly Bandwidth</span>
            <span className="text-sky-455 text-sky-400 font-bold">{bandwidthPercent}%</span>
          </div>
          
          <div className="space-y-1.5">
            <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-850 flex font-mono text-[8px]">
              <div 
                style={{ width: `${bandwidthPercent}%` }} 
                className="bg-sky-500 h-full rounded-full transition-all duration-500"
              />
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-400">
              <span>{stats.bandwidth.toFixed(1)} GB</span>
              <span className="text-slate-600">of 500 GB dynamic</span>
            </div>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Column 1 & 2: Quick actions / system specs / backup */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Quick actions modular Grid tPanel styling */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4 shadow-[0_14px_50px_rgba(2,6,23,0.22)]">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Quick Access Controls</h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs text-slate-300">
              
              <button 
                onClick={() => setActiveTab("files")}
                className="p-4 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-sky-500/50 focus:border-sky-500/70 focus:outline-none rounded-lg flex flex-col items-center justify-center gap-2 text-center text-slate-200 hover:text-slate-100 active:text-slate-100 transition"
              >
                <FolderIcon className="w-6 h-6 text-sky-400 shrink-0" />
                <span className="font-semibold text-slate-200">File Explorer</span>
              </button>

              <button 
                onClick={() => setActiveTab("node")}
                className="p-4 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/50 focus:border-emerald-500/70 focus:outline-none rounded-lg flex flex-col items-center justify-center gap-2 text-center text-slate-200 hover:text-slate-100 active:text-slate-100 transition"
              >
                <Cpu className="w-6 h-6 text-emerald-400 shrink-0" />
                <span className="font-semibold text-slate-200">Node JS App</span>
              </button>

              <button 
                onClick={() => setActiveTab("domains")}
                className="p-4 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-teal-500/50 focus:border-teal-500/70 focus:outline-none rounded-lg flex flex-col items-center justify-center gap-2 text-center text-slate-200 hover:text-slate-100 active:text-slate-100 transition"
              >
                <Globe className="w-6 h-6 text-sky-400 shrink-0" />
                <span className="font-semibold text-slate-200">DNS Zones</span>
              </button>

              <button 
                onClick={() => setActiveTab("databases")}
                className="p-4 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-purple-500/50 focus:border-purple-500/70 focus:outline-none rounded-lg flex flex-col items-center justify-center gap-2 text-center text-slate-200 hover:text-slate-100 active:text-slate-100 transition"
              >
                <Database className="w-6 h-6 text-purple-400 shrink-0" />
                <span className="font-semibold text-slate-200">MySQL Table</span>
              </button>

              <button 
                onClick={() => setActiveTab("emails")}
                className="p-4 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/50 focus:border-cyan-500/70 focus:outline-none rounded-lg flex flex-col items-center justify-center gap-2 text-center text-slate-200 hover:text-slate-100 active:text-slate-100 transition"
              >
                <Mail className="w-6 h-6 text-sky-400 shrink-0" />
                <span className="font-semibold text-slate-200">Webmail Inbox</span>
              </button>

              <button 
                onClick={() => setActiveTab("copilot")}
                className="p-4 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/50 focus:border-amber-500/70 focus:outline-none rounded-lg flex flex-col items-center justify-center gap-2 text-center text-slate-200 hover:text-slate-100 active:text-slate-100 transition"
              >
                <Terminal className="w-6 h-6 text-amber-400 shrink-0" />
                <span className="font-semibold text-slate-200 font-bold">Smart AI Ask</span>
              </button>

            </div>
          </div>

          {/* Backup Restore Controller panel */}
          <div className="bg-slate-900 border border-slate-900/40 p-5 rounded-xl space-y-4 font-mono">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Host Restore &amp; Backup Daemon</h3>
              <p className="text-[11px] text-slate-500 mt-1">Backup is scheduled weekly. You can generate immediate local ZIP/Tar archives of the server here.</p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-950 p-4 border border-slate-900/40 rounded-xl">
              <div className="space-y-1">
                <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <FileCheck className="w-4.5 h-4.5 text-emerald-400" />
                  <span>Full server_backup.tar.gz</span>
                </div>
                <div className="text-[10px] text-slate-500">Includes databases, emails, and directories (public_html)</div>
              </div>

              <div>
                {isBackingUp ? (
                  <button 
                    disabled 
                    className="w-full sm:w-auto px-4 py-2 bg-slate-900 text-sky-400 border border-sky-500/25 rounded font-bold text-xs flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Zipping packages...
                  </button>
                ) : backupSuccess ? (
                  <button 
                    disabled 
                    className="w-full sm:w-auto px-4 py-2 bg-emerald-500/10 text-emerald-450 border border-emerald-500/10 rounded font-bold text-xs flex items-center justify-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Archive success!
                  </button>
                ) : (
                  <button
                    onClick={runGzipBackup}
                    className="w-full sm:w-auto px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                    id="btn-trigger-backup"
                  >
                    <Download className="w-4 h-4" />
                    Generate Gzip Backup
                  </button>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Column 3: Server Credentials & Nameservers, Recent Activities */}
        <div className="space-y-6">
          
          {/* Nameservers / IPs specs panel */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4 font-mono">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-0.5">Authoritative Nameservers</h3>
            
            <div className="bg-slate-950 p-3.5 border border-slate-850 rounded-lg text-[11px] text-slate-450 space-y-2.5">
              <div className="flex justify-between border-b border-slate-900 pb-2">
                <span className="text-slate-500">Primary NS:</span>
                <span className="text-slate-300 font-bold font-mono">ns1.niloyhost.com</span>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-2">
                <span className="text-slate-500">Secondary NS:</span>
                <span className="text-slate-300 font-bold font-mono">ns2.niloyhost.com</span>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-2">
                <span className="text-slate-500">PHP Interpreter:</span>
                <span className="text-slate-300">v8.2 (FPM)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Reverse Proxy:</span>
                <span className="text-sky-400 font-semibold font-mono">Nginx Proxy API</span>
              </div>
            </div>
          </div>

          {/* Recent live activities logs container */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4 flex flex-col h-[320px]">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-0.5 flex items-center gap-2">
              <TrendingUp className="w-4.5 h-4.5 text-sky-400" />
              Event log: stdout
            </h3>

            <div className="flex-1 overflow-y-auto space-y-3 font-mono text-[10px] text-slate-400 pr-1 scrollbar-thin">
              {activities.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-600 italic">
                  No registered activities found.
                </div>
              ) : (
                activities.map(act => (
                  <div key={act.id} className="flex gap-2.5 items-start bg-slate-950/60 p-2.5 rounded border border-slate-850/50">
                    <span className="text-slate-600 shrink-0 select-none">[{act.time}]</span>
                    <span className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${
                      act.category === "file" ? "bg-sky-400" :
                      act.category === "domain" ? "bg-sky-500" :
                      act.category === "node" ? "bg-emerald-450" :
                      act.category === "db" ? "bg-purple-550" :
                      act.category === "ssl" ? "bg-cyan-400" :
                      "bg-amber-400"
                    }`}></span>
                    <span className="text-slate-330 flex-1 leading-normal break-words">{act.message}</span>
                  </div>
                ))
              )}
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
