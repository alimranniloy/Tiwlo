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
          { name: 'Size Packages', icon: HardDrive, path: '/management/size-packages' },
          { name: 'AI Model', icon: Bot, path: '/management/ai-model' },
          { name: 'Service Statistics', icon: Activity, path: '/management/statistics' },
          { name: 'Live Notifications', icon: Bell, path: '/management/notifications' },
          { name: 'Social', icon: MessageCircle, path: '/management/social' },
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
          { name: 'WhatsApp API', icon: MessageCircle, path: '/management/whatsapp-api' },
          { name: 'API Management', icon: Zap, path: '/management/api' },
          { name: 'tSecurity', icon: Lock, path: '/management/security' },
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
        { name: 'API', icon: Terminal, path: isAdminUser ? '/management/api' : '/api-tokens' },
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
    <div className="flex h-full flex-col border-r border-[#e6e9f2] bg-white text-[#52637a]">
      <div className="flex items-center gap-3 px-5 pb-4 pt-5">
        <BrandLogo className="h-10 w-28" />
        <div className="sr-only">
          <span>{isAdminUser ? 'Tiwlo Admin' : 'Tiwlo Console'}</span>
          <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest mt-0.5">SaaS Infrastructure</span>
        </div>
      </div>

      <div className="px-3 pb-4">
        <NavLink 
          to={isAdminUser ? '/management/servers' : '/droplets/create'}
          className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-[#4f2fff] px-3 py-3 text-[13px] font-black text-white transition-colors hover:bg-[#3e24df]"
        >
          <Plus className="h-4 w-4" />
          <span>Server Create</span>
        </NavLink>
      </div>

      <nav className="no-scrollbar flex-1 overflow-y-auto px-2 pb-8">
        {visibleSections.map((section) => (
          <div key={section.label} className="mb-3 mt-5 first:mt-1">
            <h3 className="mb-1.5 px-2.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#7b8496]">{section.label}</h3>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `group flex items-center gap-2.5 rounded px-2.5 py-2 text-[13px] transition-all duration-150 ${
                      isActive
                        ? 'bg-[#f4f1ff] text-[#4f35ff] font-black'
                        : 'text-[#52637a] hover:bg-[#f7f8fc] hover:text-[#111827]'
                    }`
                  }
                  onClick={() => setIsOpen(false)}
                >
                  {({ isActive }) => (
                    <>
                      <item.icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-[#4f35ff]' : 'text-[#71809a] group-hover:text-[#111827]'}`} />
                      <span className="truncate tracking-tight">{item.name}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-[#e6e9f2] bg-white p-3">
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-[10px] bg-[#f7f8fc] px-3 py-2.5 text-[13px] font-bold text-[#52637a] transition-colors hover:bg-red-50 hover:text-red-600"
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
      <aside className="sticky top-0 hidden h-screen w-[224px] shrink-0 lg:block">
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
              className="fixed left-0 top-0 z-50 h-full w-[min(20rem,86vw)] lg:hidden"
            >
              <NavContent />
            </aside>
          </>
        )}
    </>
  );
}
