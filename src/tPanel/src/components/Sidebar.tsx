import { useState } from "react";
import { 
  Server, 
  LayoutDashboard, 
  FolderIcon, 
  Cpu, 
  Globe, 
  Database, 
  Mail, 
  Sparkles, 
  Menu, 
  X,
  Radio,
  HardDrive,
  Key,
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
  LogOut
} from "lucide-react";
import BrandLogo from "./BrandLogo";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  runningAppsCount: number;
  unreadMailsCount: number;
  dbsCount: number;
  onLogout: () => void;
  allowedTabs?: string[];
}

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  runningAppsCount, 
  unreadMailsCount, 
  dbsCount,
  onLogout,
  allowedTabs
}: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isAllowed = (tabId: string) => !allowedTabs || allowedTabs.includes(tabId);

  const navigationGroups = [
    {
      title: "Main Console",
      items: [
        { id: "dashboard", label: "Dashboard Overview", icon: LayoutDashboard }
      ]
    },
    {
      title: "Files & Storage",
      items: [
        { id: "files", label: "File Manager", icon: FolderIcon },
        { id: "ftp", label: "FTP Accounts", icon: Key },
        { id: "disk", label: "Disk Analyser", icon: HardDrive }
      ]
    },
    {
      title: "Database Hub",
      items: [
        { id: "databases", label: "MySQL Databases", icon: Database, badge: dbsCount > 0 ? dbsCount : null, badgeColor: "bg-purple-500/10 text-purple-400 border border-purple-550/20" },
        { id: "postgre", label: "PostgreSQL", icon: Layers },
        { id: "phpmyadmin", label: "phpMyAdmin Portal", icon: Layers }
      ]
    },
    {
      title: "Domain Manager",
      items: [
        { id: "domains", label: "Domains & DNS", icon: Globe },
        { id: "dns_zone", label: "Zone DNS Editor", icon: Network },
        { id: "subdomains", label: "Subdomains", icon: Split }
      ]
    },
    {
      title: "Email Portal",
      items: [
        { id: "emails", label: "Email Accounts", icon: Mail, badge: unreadMailsCount > 0 ? unreadMailsCount : null, badgeColor: "bg-sky-500/10 text-sky-400 border border-sky-500/20" },
        { id: "forwarders", label: "Mail Forwarders", icon: Send },
        { id: "autoresponders", label: "Autoresponders", icon: Reply }
      ]
    },
    {
      title: "Security Suite",
      items: [
        { id: "ssl", label: "SSL Certificates", icon: ShieldCheck },
        { id: "ipblocker", label: "IP Block Firewall", icon: ShieldAlert },
        { id: "ssh", label: "SSH Shell Access", icon: Terminal }
      ]
    },
    {
      title: "Metrics & Logs",
      items: [
        { id: "visitors", label: "Live Visitors", icon: Eye },
        { id: "bandwidth", label: "Bandwidth Stats", icon: Activity }
      ]
    },
    {
      title: "Software & Runtimes",
      items: [
        { id: "node", label: "Node.js Manager", icon: Cpu, badge: runningAppsCount > 0 ? runningAppsCount : null, badgeColor: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" },
        { id: "phpversion", label: "PHP Selector", icon: FileCode2 },
        { id: "ruby", label: "Ruby App Suite", icon: Gem },
        { id: "marketplace", label: "App Marketplace", icon: ShoppingBag, highlight: true }
      ]
    },
    {
      title: "Advanced Tools",
      items: [
        { id: "cron", label: "Cron Jobs", icon: Clock },
        { id: "terminal", label: "Interactive Shell", icon: Terminal },
        { id: "copilot", label: "AI Copilot Shell", icon: Sparkles, highlight: true }
      ]
    }
  ];

  return (
    <>
      {/* Mobile Top Navigation Ribbon - relative to scroll up organically with content */}
      <div className="lg:hidden bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between relative z-50 transition-all">
        <div className="flex items-center gap-2">
          <BrandLogo compact className="h-9 w-9 border border-slate-700" />
          <div>
            <h1 className="text-sm font-black tracking-wider text-slate-100 leading-none">tPanel</h1>
            <p className="text-[9px] text-slate-500 font-bold mt-0.5 uppercase">Console v3.2</p>
          </div>
        </div>
        
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="p-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-100 transition-colors"
          id="btn-toggle-mobile-menu"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* Primary Sidebar Panel - scrollable naturally on parent page */}
      <aside className={`
        fixed inset-y-0 left-0 bg-slate-900 border-r border-slate-800 w-64 z-50 p-4 flex flex-col justify-between transition-all duration-350 lg:translate-x-0 lg:static lg:h-auto lg:min-h-screen
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="flex flex-col h-full overflow-hidden">
          {/* Logo / Header (Desktop only) */}
          <div className="hidden lg:flex items-center gap-3 border-b border-slate-800 pb-4 mb-4 shrink-0 px-2">
            <BrandLogo className="h-12 w-40 border border-slate-700 shadow-[0_12px_35px_rgba(0,105,255,0.14)]" />
            <div className="sr-only">
              <h1>tPanel Pro</h1>
              <p className="text-[10px] text-emerald-500 font-medium flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                CORE v3.2 ONLINE
              </p>
            </div>
          </div>

          {/* Navigation Links (Scrollable without visible scrollbars) */}
          <div className="flex-1 overflow-y-auto no-scrollbar pr-1 space-y-5 font-sans select-none">
            {navigationGroups.map((group, groupIdx) => {
              const visibleItems = group.items.filter((item) => isAllowed(item.id));
              if (!visibleItems.length) return null;
              return (
              <div key={groupIdx} className="space-y-1">
                <div className="px-2 py-1 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">
                  {group.title}
                </div>
                {visibleItems.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all text-xs font-bold leading-tight group ${
                        isActive 
                          ? "bg-[#0069ff] text-white" 
                          : item.highlight 
                            ? "text-amber-400 hover:bg-slate-800 border border-transparent"
                            : "text-slate-400 hover:text-slate-100 hover:bg-slate-800 border border-transparent"
                      }`}
                      id={`btn-nav-${item.id}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? "text-white" : item.highlight ? "text-amber-400" : "text-slate-650 group-hover:text-[#0069ff]"}`} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black shrink-0 ${item.badgeColor || "bg-slate-950/50 text-slate-500 border border-slate-800"}`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )})}
          </div>

          {/* Sidebar Footer info */}
          <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800 space-y-2 select-none shrink-0 mt-6">
            <div className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Plan: Pro Enterprise</div>
            <div className="flex justify-between items-center text-[10px] text-slate-400">
              <span className="font-bold">Uptime:</span>
              <span className="text-emerald-500 font-black flex items-center gap-1">
                <Radio className="w-3 h-3 text-emerald-500 animate-pulse" />
                99.9%
              </span>
            </div>
            <div className="text-[9px] text-slate-600 font-bold text-center leading-normal pt-2 border-t border-slate-800 flex items-center justify-center gap-2">
              <Key className="w-3 h-3" />
              AL IMRAN NILOY
            </div>
          </div>

          {/* Logout Action */}
          <button 
            onClick={onLogout}
            className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-xs font-black rounded-xl border border-rose-500/10 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            SIGN OUT
          </button>
        </div>
      </aside>
    </>
  );
}
