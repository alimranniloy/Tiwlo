import { NavLink } from 'react-router-dom';
import { 
  BarChart3, 
  Server, 
  Globe, 
  Network, 
  LogOut, 
  Menu,
  X,
  HelpCircle,
  HardDrive,
  Database,
  Box,
  Zap,
  LayoutGrid,
  Activity,
  Bell,
  Bot,
  Book,
  Cpu,
  Layers,
  Plus,
  Terminal,
  ShieldCheck,
  CreditCard,
  FileText,
  LifeBuoy,
  Users,
  Shield,
  ShoppingBag,
  Puzzle,
  Lock,
  Mail,
  MessageCircle,
  Settings,
  Coins,
  Archive
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { User } from '../types';
import BrandLogo from './BrandLogo';
import { fetchAdminModules } from '../lib/tiwloApi';
import { SERVICE_MODULE_GROUP, SERVICE_MODULE_KEYS, serviceEnabled } from '../lib/serviceModules';

interface SidebarProps {
  user: User;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onLogout: () => void;
}

export default function Sidebar({ user, isOpen, setIsOpen, onLogout }: SidebarProps) {
  const isAdminUser = ['admin', 'super_admin'].includes(user.role);
  const [serviceModules, setServiceModules] = useState<any[]>([]);

  useEffect(() => {
    if (isAdminUser) return;
    let isMounted = true;
    fetchAdminModules(SERVICE_MODULE_GROUP)
      .then((modules) => {
        if (isMounted) setServiceModules(modules || []);
      })
      .catch(() => {
        if (isMounted) setServiceModules([]);
      });
    return () => {
      isMounted = false;
    };
  }, [isAdminUser]);

  const sections = [
    ...(isAdminUser ? [
      {
        label: 'ADMIN DASHBOARD',
        items: [
          { name: 'System Overview', icon: BarChart3, path: '/' },
          { name: 'AI Model', icon: Bot, path: '/management/ai-model' },
          { name: 'Service Statistics', icon: Activity, path: '/management/statistics' },
          { name: 'Live Notifications', icon: Bell, path: '/management/notifications' },
        ]
      },
      {
        label: 'CLIENTS & ACCOUNTS',
        items: [
          { name: 'Client List', icon: Users, path: '/management/users' },
          { name: 'User Identities', icon: ShieldCheck, path: '/management/identity' },
          { name: 'Contact Groups', icon: Layers, path: '/management/contact-groups' },
          { name: 'Support Tickets', icon: LifeBuoy, path: '/management/support' },
          { name: 'ID Reviews', icon: ShieldCheck, path: '/management/id-verifications' },
        ]
      },
      {
        label: 'BILLING & FINANCE',
        items: [
          { name: 'All Invoices', icon: FileText, path: '/management/invoices' },
          { name: 'Payments Received', icon: CreditCard, path: '/management/payments' },
          { name: 'Tiwlo Pay', icon: CreditCard, path: '/management/tiwlo-pay' },
          { name: 'Pricing/Plans', icon: Settings, path: '/management/plans' },
          { name: 'Tax Configuration', icon: Database, path: '/management/taxes' },
          { name: 'Currencies', icon: Coins, path: '/management/currencies' },
        ]
      },
      {
        label: 'SERVICES & PRODUCTS',
        items: [
          { name: 'Store Products', icon: ShoppingBag, path: '/management/store-products' },
          { name: 'tPanel', icon: Server, path: '/management/tpanel' },
          { name: 'Cloud Templates', icon: LayoutGrid, path: '/management/cloud-templates' },
          { name: 'System Addons', icon: Puzzle, path: '/management/plugins' },
          { name: 'Discord Bot', icon: MessageCircle, path: '/management/discord-bot' },
        ]
      },
      {
        label: 'DNS',
        items: [
          { name: 'PowerDNS Zones', icon: Globe, path: '/management/dns' },
          { name: 'Hostnames', icon: Server, path: '/management/dns/hostnames' },
          { name: 'Nameservers', icon: Network, path: '/management/dns/nameservers' },
        ]
      },
      {
        label: 'INFRASTRUCTURE',
        items: [
          { name: 'Compute Nodes', icon: Server, path: '/management/resources/compute' },
          { name: 'Block Storage', icon: HardDrive, path: '/management/resources/volume' },
          { name: 'Data Instances', icon: Database, path: '/management/resources/database' },
          { name: 'Network Topology', icon: Network, path: '/management/resources/network' },
          { name: 'Edge Firewalls', icon: Shield, path: '/management/resources/firewall' },
        ]
      },
      {
        label: 'UTILITIES & SETUP',
        items: [
          { name: 'Automation Logs', icon: Terminal, path: '/management/logs' },
          { name: 'Email', icon: Mail, path: '/management/email' },
          { name: 'API Management', icon: Zap, path: '/management/api' },
          { name: 'Security Policy', icon: Lock, path: '/management/security' },
          { name: 'Backup', icon: Archive, path: '/management/backup' },
          { name: 'SSL', icon: ShieldCheck, path: '/management/ssl' },
          { name: 'System Settings', icon: Settings, path: '/management/settings' },
        ]
      }
    ] : [
      {
        label: 'MANAGE',
        items: [
          { name: 'Dashboard', icon: BarChart3, path: '/dashboard' },
          { name: 'Droplets', icon: Server, path: '/droplets' },
          { name: 'Ecommerce Center', icon: ShoppingBag, path: '/store', serviceKey: SERVICE_MODULE_KEYS.ecommerce },
          { name: 'Connectivity Hub', icon: Activity, path: '/isp-billing', serviceKey: SERVICE_MODULE_KEYS.isp },
          { name: 'Tiwlo Pay', icon: CreditCard, path: '/tiwlo-pay/overview', serviceKey: SERVICE_MODULE_KEYS.tiwloPay },
          { name: 'tPanel', icon: Server, path: '/tpanel', serviceKey: SERVICE_MODULE_KEYS.tpanel },
          { name: 'Kubernetes', icon: Layers, path: '/kubernetes' },
          { name: 'Volumes', icon: HardDrive, path: '/volumes' },
          { name: 'Databases', icon: Database, path: '/databases' },
          { name: 'Invoices', icon: FileText, path: '/invoices' },
        ]
      },
      {
        label: 'NETWORKING',
        items: [
          { name: 'Networking', icon: Network, path: '/networking' },
          { name: 'DNS', icon: Globe, path: '/dns' },
          { name: 'Firewalls', icon: ShieldCheck, path: '/firewalls' },
        ]
      },
      {
        label: 'MONITOR',
        items: [
           { name: 'Activity', icon: Activity, path: '/activity' },
           { name: 'Alerts', icon: Bell, path: '/alerts' },
           { name: 'Support', icon: LifeBuoy, path: '/support' },
        ]
      }
    ]),
    {
      label: 'ACCOUNT',
      items: [
        { name: 'Billing', icon: CreditCard, path: isAdminUser ? '/management/payments' : '/billing' },
        { name: 'Team', icon: ShieldCheck, path: isAdminUser ? '/management/users' : '/team' },
        { name: 'Settings', icon: Settings, path: isAdminUser ? '/management/settings' : '/settings' },
      ]
    },
    {
      label: 'TOOLS',
      items: [
        { name: 'Documentation', icon: Book, path: '/documentation' },
        { name: 'Marketplace', icon: ShoppingBag, path: '/marketplace' },
        { name: 'API', icon: Terminal, path: isAdminUser ? '/management/api' : '/api' },
        ...(isAdminUser ? [
          { name: 'Backup', icon: Archive, path: '/management/backup' },
          { name: 'SSL', icon: Lock, path: '/management/ssl' },
        ] : []),
        { name: 'App Platform', icon: LayoutGrid, path: '/apps' },
        { name: 'Functions', icon: Zap, path: '/functions' },
      ]
    }
  ];

  const visibleSections = sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => isAdminUser || !(item as any).serviceKey || serviceEnabled(serviceModules, (item as any).serviceKey))
    }))
    .filter((section) => section.items.length > 0);

  const NavContent = () => (
    <div className="flex flex-col h-full bg-[#031b4e] text-[#94a3b8]">
      <div className="p-5 md:p-6 flex items-center gap-3 mb-2">
        <BrandLogo variant="dark" className="h-12 w-36" />
        <div className="sr-only">
          <span>{isAdminUser ? 'Tiwlo Admin' : 'Tiwlo Console'}</span>
          <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest mt-0.5">SaaS Infrastructure</span>
        </div>
      </div>

      <div className="px-5 mb-8">
        <NavLink 
          to={isAdminUser ? '/management/servers' : '/droplets/create'}
          className="w-full bg-[#0069ff] text-white py-3 rounded font-bold text-[14px] flex items-center justify-center gap-2 hover:bg-[#0056cc] transition-all"
        >
          <Plus className="h-5 w-5" />
          <span>Server Create</span>
        </NavLink>
      </div>

      <nav className="flex-1 px-3 overflow-y-auto no-scrollbar pb-10">
        {visibleSections.map((section) => (
          <div key={section.label} className="mt-6 first:mt-0 mb-2">
            <h3 className="px-4 text-[10px] font-bold text-[#5b6e96] uppercase tracking-[0.1em] mb-2">{section.label}</h3>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2 rounded transition-all duration-150 group ${
                      isActive
                        ? 'bg-[#0069ff] text-white font-bold'
                        : 'hover:bg-white/5 hover:text-white'
                    }`
                  }
                  onClick={() => setIsOpen(false)}
                >
                  {({ isActive }) => (
                    <>
                      <item.icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-[#8ba2ad] group-hover:text-white'}`} />
                      <span className="text-[14px] tracking-tight">{item.name}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-white/5 bg-[#02143a]">
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 px-4 py-2 text-[#94A3B8] hover:text-red-400 hover:bg-red-500/10 rounded transition-all duration-200 text-[13px] font-medium"
        >
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-72 shrink-0 h-screen sticky top-0">
        <NavContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
        {isOpen && (
          <>
            <div
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black opacity-50 z-40 lg:hidden"
            />
            <aside
              className="fixed top-0 left-0 h-full w-80 z-50 lg:hidden"
            >
              <NavContent />
            </aside>
          </>
        )}
    </>
  );
}
