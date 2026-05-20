import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Globe, 
  Users, 
  Zap, 
  Activity, 
  Database, 
  HardDrive, 
  Network, 
  Menu, 
  X,
  ChevronLeft,
  Search,
  Bell,
  Settings,
  CreditCard,
  FileText,
  ShieldCheck,
  Lock,
  LifeBuoy,
  BarChart3,
  Cpu,
  Radio,
  Server,
  Layers,
  TrendingUp,
  Puzzle
} from 'lucide-react';
import type { User } from '../../types';

interface IspLayoutProps {
  user: User;
  children: React.ReactNode;
}

export default function IspLayout({ user, children }: IspLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  const menuSections = [
    {
      label: 'GLOBAL OPERATIONS',
      items: [
        { name: 'Core Dashboard', icon: BarChart3, path: '/management/isp' },
        { name: 'Live Traffic Hub', icon: Globe, path: '/management/isp/live-traffic' },
        { name: 'Node Monitoring', icon: Activity, path: '/management/isp/nodes' },
        { name: 'Latency Monitor', icon: Zap, path: '/management/isp/latency' },
        { name: 'Cluster Health', icon: Database, path: '/management/isp/clusters' },
        { name: 'Traffic Analysis', icon: Network, path: '/management/isp/traffic' },
      ]
    },
    {
      label: 'MERCHANT HUB',
      items: [
        { name: 'Active Subscribers', icon: Users, path: '/management/isp/clients' },
        { name: 'Pending KYCs', icon: ShieldCheck, path: '/management/isp/kyc' },
        { name: 'Account Segments', icon: Layers, path: '/management/isp/segments' },
        { name: 'Partner Portals', icon: Globe, path: '/management/isp/partners' },
        { name: 'Client Activity', icon: Activity, path: '/management/isp/activity' },
      ]
    },
    {
      label: 'BILLING & REVENUE',
      items: [
        { name: 'Master Invoices', icon: FileText, path: '/management/isp/invoices' },
        { name: 'Revenue Streams', icon: CreditCard, path: '/management/isp/revenue' },
        { name: 'Subscription Plans', icon: Settings, path: '/management/isp/plans' },
        { name: 'Payment Gateways', icon: CreditCard, path: '/management/isp/gateways' },
        { name: 'Usage Metering', icon: Zap, path: '/management/isp/usage' },
        { name: 'Tax Compliance', icon: ShieldCheck, path: '/management/isp/taxes' },
      ]
    },
    {
      label: 'NETWORK & RADIUS',
      items: [
        { name: 'RADIUS Clusters', icon: Server, path: '/management/isp/radius' },
        { name: 'IP Pool Manager', icon: Globe, path: '/management/isp/ip-pools' },
        { name: 'VLAN Configuration', icon: Network, path: '/management/isp/vlan' },
        { name: 'Auth Server Logs', icon: Lock, path: '/management/isp/auth-logs' },
        { name: 'ONU Data Center', icon: Cpu, path: '/management/isp/onu' },
        { name: 'Backbone Config', icon: Activity, path: '/management/isp/backbone' },
      ]
    },
    {
      label: 'SaaS INFRASTRUCTURE',
      items: [
        { name: 'Storage Pools', icon: HardDrive, path: '/management/isp/storage' },
        { name: 'Database Clusters', icon: Database, path: '/management/isp/db-clusters' },
        { name: 'Asset CDN Hub', icon: Network, path: '/management/isp/cdn' },
        { name: 'Domain Proxy', icon: Globe, path: '/management/isp/domains' },
        { name: 'SSL Certificate Manager', icon: Lock, path: '/management/isp/ssl' },
      ]
    },
    {
      label: 'GROWTH & SUPPORT',
      items: [
        { name: 'Support Tickets', icon: LifeBuoy, path: '/management/isp/tickets' },
        { name: 'Lead Manager', icon: Users, path: '/management/isp/leads' },
        { name: 'Affiliate Portal', icon: TrendingUp, path: '/management/isp/affiliates' },
        { name: 'Alert Policies', icon: Bell, path: '/management/isp/alerts' },
        { name: 'Email Automation', icon: Bell, path: '/management/isp/email' },
      ]
    },
    {
      label: 'GOVERNANCE & API',
      items: [
        { name: 'Security Audit', icon: ShieldCheck, path: '/management/isp/security' },
        { name: 'Platform Compliance', icon: ShieldCheck, path: '/management/isp/compliance' },
        { name: 'API Management', icon: Settings, path: '/management/isp/api' },
        { name: 'Webhook Center', icon: Zap, path: '/management/isp/webhooks' },
        { name: 'System Logs', icon: FileText, path: '/management/isp/logs' },
        { name: 'SaaS Settings', icon: Settings, path: '/management/isp/settings' },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col md:flex-row font-sans">
      {/* ISP Sidebar */}
      <aside className={`${isSidebarOpen ? 'w-full md:w-64' : 'w-20'} bg-[#1e293b] border-r border-slate-800 flex flex-col z-50 fixed md:relative h-screen transition-all duration-200`}>
        <div className="p-5 flex items-center justify-between border-b border-slate-800 mb-2">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 bg-blue-600 flex items-center justify-center text-white rounded-sm shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            {isSidebarOpen && (
              <div className="flex flex-col">
                <span className="font-bold text-white text-sm leading-none">NetCore Admin</span>
                <span className="text-[11px] font-medium text-blue-400 mt-0.5">ISP & SaaS Billing</span>
              </div>
            )}
          </div>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden p-2 text-slate-400">
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-6 overflow-y-auto no-scrollbar pt-2 pb-8">
          {menuSections.map((section) => (
            <div key={section.label} className="space-y-1">
              {isSidebarOpen && (
                <h4 className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">{section.label}</h4>
              )}
              {section.items.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2 rounded-sm group transition-colors ${
                      isActive 
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' 
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white border border-transparent'
                    }`}
                  >
                    <item.icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'}`} />
                    {isSidebarOpen && <span className="text-[12px] font-medium">{item.name}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
           <button 
             onClick={() => navigate('/')} 
             className="w-full flex items-center gap-3 px-4 py-2.5 bg-slate-900 text-slate-300 rounded-sm hover:bg-black transition-colors"
           >
             <ChevronLeft className="w-4 h-4" />
             {isSidebarOpen && <span className="text-xs font-semibold uppercase tracking-wider">Main Console</span>}
           </button>
        </div>
      </aside>

      {/* Main ISP Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <header className="bg-white px-8 py-3.5 border-b border-gray-200 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-4 flex-1">
             <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 bg-gray-50 rounded-sm hover:bg-gray-100">
                <Menu className="w-4 h-4 text-gray-400" />
             </button>
             <div className="relative max-w-sm w-full hidden lg:block">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Seach nodes, IP or users..." 
                  className="w-full pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-sm text-sm focus:bg-white focus:border-blue-300 outline-none transition-colors"
                />
             </div>
          </div>

          <div className="flex items-center gap-4">
             <div className="hidden sm:flex flex-col items-right text-right mr-4 leading-tight">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Fiber Gateway #4</span>
                <span className="text-[11px] font-medium text-gray-500">Uptime: 14d 2h</span>
             </div>
             <button className="p-2 text-gray-400 hover:text-blue-600 relative">
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-blue-600 rounded-full border border-white"></span>
             </button>
             <div className="w-8 h-8 rounded-sm bg-gray-100 border border-gray-200 flex items-center justify-center font-semibold text-gray-600 text-xs">
                {user.email?.charAt(0).toUpperCase()}
             </div>
          </div>
        </header>

        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
