import React, { useState } from 'react';
import { 
  Home, Users, CreditCard, Package, Router, Map, LifeBuoy, BarChart2, Settings,
  LogOut, Globe, ChevronDown, Network, Activity, Banknote, Shield, ShieldAlert,
  Server, HardDrive, Cpu, RadioTower, Database, Lock, Key, AlertCircle, FileText,
  MessageSquare, Mail, BellRing, Smartphone, Tv, MonitorPlay, Zap, Archive, ShoppingBag,
  Briefcase, UserPlus, FileSpreadsheet, Building2, MapPin, Search, Receipt, Calculator, Command, Wifi,
  Wallet, Percent, UsersRound, CalendarCheck, Megaphone, Truck, ShieldCheck, ActivitySquare, DatabaseBackup, PieChart
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const navGroups = [
  {
    title: 'Core & Analytics',
    items: [
      { id: 'Home', label: 'Dashboard Overview', icon: Home },
      { id: 'Network Map', label: 'Network & Fiber GIS', icon: MapPin },
      { id: 'NMS', label: 'NMS (Network Monitor)', icon: Activity },
      { id: 'Bandwidth', label: 'Bandwidth Monitor', icon: ActivitySquare },
      { id: 'Data Usage', label: 'Data Usage Stats', icon: PieChart },
    ]
  },
  {
    title: 'Client Operations',
    items: [
      { id: 'Customers', label: 'Subscribers', icon: Users },
      { id: 'Corporate', label: 'Corporate Clients', icon: UsersRound },
      { id: 'PPPoE Users', label: 'PPPoE Sessions', icon: Router },
      { id: 'Hotspot Users', label: 'Hotspot Vouchers', icon: Wifi },
      { id: 'Static IP', label: 'Static IP Clients', icon: Network },
      { id: 'Resellers', label: 'Reseller Portal', icon: Building2 },
      { id: 'Franchise', label: 'Franchise Tracking', icon: Briefcase },
    ]
  },
  {
    title: 'Billing & Auto-logic',
    items: [
      { id: 'Billing', label: 'Invoices & Billing', icon: Receipt },
      { id: 'Payments', label: 'Payment Gateways', icon: CreditCard },
      { id: 'Wallet', label: 'Top-up & Wallet', icon: Wallet },
      { id: 'Grace Period', label: 'Auto Grace Period', icon: Calculator },
      { id: 'Tax', label: 'Tax & VAT Settings', icon: Percent },
      { id: 'Expenses', label: 'Expense Manager', icon: Banknote },
      { id: 'Payroll', label: 'Salary & Payroll', icon: FileSpreadsheet },
    ]
  },
  {
    title: 'Network & Devices',
    items: [
      { id: 'MikroTik', label: 'MikroTik BNG/BRAS', icon: Server },
      { id: 'OLT', label: 'OLT Management', icon: HardDrive },
      { id: 'ONU', label: 'ONU/ONT Devices', icon: RadioTower },
      { id: 'Radius', label: 'RADIUS Server', icon: Database },
      { id: 'MAC Binding', label: 'Device Binding', icon: ShieldCheck },
      { id: 'IP Pool', label: 'IP Pool Range', icon: Command },
    ]
  },
  {
    title: 'Packages & Services',
    items: [
      { id: 'Packages', label: 'Internet Plans', icon: Package },
      { id: 'IPTV', label: 'IPTV Management', icon: Tv },
      { id: 'CATV', label: 'Cable TV Billing', icon: MonitorPlay },
      { id: 'OTT', label: 'VOD & OTT Subscriptions', icon: Smartphone },
    ]
  },
  {
    title: 'Inventory & Stock',
    items: [
      { id: 'Stock', label: 'Item Stock', icon: Archive },
      { id: 'Vendors', label: 'Vendor Directory', icon: UserPlus },
      { id: 'Purchases', label: 'Purchase Orders', icon: ShoppingBag },
      { id: 'Fleet', label: 'Fleet & Vehicles', icon: Truck },
    ]
  },
  {
    title: 'Support & CRM',
    items: [
      { id: 'Tickets', label: 'Helpdesk Tickets', icon: LifeBuoy },
      { id: 'Live Chat', label: 'Live Chat Center', icon: MessageSquare },
      { id: 'SMS Server', label: 'SMS & WhatsApp', icon: Smartphone },
      { id: 'Emails', label: 'Email Automations', icon: Mail },
      { id: 'Referrals', label: 'Referral Program', icon: Megaphone },
      { id: 'Complaints', label: 'SLA Complaints', icon: AlertCircle },
    ]
  },
  {
    title: 'Security & System',
    items: [
      { id: 'Reports', label: 'Financial Reports', icon: BarChart2 },
      { id: 'Permissions', label: 'Staff Roles', icon: Shield },
      { id: 'Attendance', label: 'Staff Attendance', icon: CalendarCheck },
      { id: 'Logs', label: 'Audit Trail Logs', icon: FileText },
      { id: 'Backups', label: 'Cloud Backups', icon: DatabaseBackup },
      { id: 'API', label: 'Webhooks & API', icon: Key },
      { id: 'Settings', label: 'App Settings', icon: Settings },
    ]
  }
];

export default function Sidebar({ activeNav, setActiveNav, isOpen, setIsOpen, site }: { activeNav: string, setActiveNav: (n: string) => void, isOpen: boolean, setIsOpen: (b: boolean) => void, site?: any }) {
  const navigate = useNavigate();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    'Core & Analytics': true,
    'Client Operations': true,
    'Billing & Auto-logic': true,
    'Network & Devices': true,
    'Packages & Services': true,
    'Inventory & Stock': true,
    'Support & CRM': true,
    'Security & System': true,
  });

  const toggleGroup = (title: string) => {
    setOpenGroups(prev => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <>
      {/* Mobile overlay */}
      <div 
        className={`fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-20 transition-opacity lg:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
        onClick={() => setIsOpen(false)} 
      />

      <div className={`w-64 bg-gray-900 border-r border-gray-800 fixed h-screen flex flex-col font-sans z-30 text-gray-300 transition-transform duration-300 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-16 flex items-center px-6 border-b border-gray-800 cursor-pointer shrink-0" onClick={() => navigate('/isp-billing/admin')}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-none flex items-center justify-center">
            <Globe className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <span className="block truncate text-sm font-bold tracking-tight text-white">{site?.name || 'ISP Admin'}</span>
            <span className="block truncate font-mono text-[10px] uppercase tracking-wider text-gray-500">{site?.code || 'site'}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-4 hide-scrollbar">
        {navGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            <button 
              onClick={() => toggleGroup(group.title)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-gray-300 transition-colors outline-none"
            >
              {group.title}
              <ChevronDown className={`w-3 h-3 transition-transform ${openGroups[group.title] ? 'rotate-180' : ''}`} />
            </button>
            
            <div className={`space-y-0.5 overflow-hidden transition-all duration-200 ${openGroups[group.title] ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
              {group.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveNav(item.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-none text-[13px] font-medium transition-colors outline-none
                    ${activeNav === item.id 
                      ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20' 
                      : 'text-gray-400 hover:bg-gray-800/80 hover:text-white border border-transparent'
                    }
                  `}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-gray-800 shrink-0 bg-gray-900">
        <button 
          onClick={() => navigate('/isp-billing')}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-none text-[13px] font-medium text-gray-400 hover:bg-red-500/10 hover:text-red-400 border border-transparent hover:border-red-500/20 transition-colors outline-none"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Secure Logout
        </button>
      </div>
    </div>
    </>
  );
}
