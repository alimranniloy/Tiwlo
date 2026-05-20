import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingBag, 
  Users, 
  BarChart3, 
  Megaphone, 
  Gift, 
  Monitor, 
  Globe, 
  Settings,
  LogOut,
  Palette,
  Puzzle,
  FolderTree,
  Tags,
  Warehouse,
  FileText,
  ShoppingCart,
  Building,
  Truck,
  CreditCard,
  Coins,
  Wallet,
  Calculator,
  Store,
  Link,
  ShieldCheck,
  Languages,
  Mail,
  HardDrive,
  Image,
  Search,
  Star,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SidebarItemProps {
  icon: any;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: string;
  isSubItem?: boolean;
  hasSubItems?: boolean;
  isOpen?: boolean;
  toggleOpen?: () => void;
}

const SidebarItem = ({ icon: Icon, label, active, onClick, badge, isSubItem, hasSubItems, isOpen, toggleOpen }: SidebarItemProps) => {
  return (
    <div className="flex flex-col">
      <button 
        onClick={(e) => {
          if (hasSubItems && toggleOpen) {
            toggleOpen();
          }
          onClick();
        }}
        className={`w-full flex items-center justify-between px-3 py-2 rounded text-[13px] font-medium transition-all ${
          active 
          ? 'bg-blue-600 text-white' 
          : 'text-gray-400 hover:text-white hover:bg-white/5'
        } ${isSubItem ? 'pl-9 text-[12px]' : ''}`}
      >
        <div className="flex items-center gap-3">
          <Icon className={`${isSubItem ? 'h-3.5 w-3.5 leading-none' : 'h-4 w-4 shrink-0'}`} />
          <span className="flex-1 text-left">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          {badge && (
            <span className="bg-red-500 text-[10px] px-1.5 py-0.5 rounded text-white font-bold">{badge}</span>
          )}
          {hasSubItems && (
            isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />
          )}
        </div>
      </button>
    </div>
  );
};

export default function Sidebar({ activeNav, setActiveNav, store }: { activeNav: string; setActiveNav: (val: string) => void; store?: any }) {
  const navigate = useNavigate();
  const [openMenus, setOpenMenus] = useState<string[]>(['Products', 'Sales Channels', 'Management', 'System']);

  const toggleMenu = (menu: string) => {
    setOpenMenus(prev => prev.includes(menu) ? prev.filter(m => m !== menu) : [...prev, menu]);
  };

  return (
    <aside className="w-64 bg-[#1a1c1d] text-white flex flex-col fixed inset-y-0 left-0 z-50 overflow-hidden">
      <div className="p-5 flex items-center gap-3 border-b border-white/5 bg-[#121415] shrink-0">
        <div className="h-8 w-8 bg-blue-600 rounded flex items-center justify-center">
          <ShoppingBag className="h-4.5 w-4.5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold truncate tracking-tight">{store?.name || 'Store Admin'}</h2>
          <p className="text-[9px] text-gray-500 uppercase tracking-widest font-black flex items-center gap-1">{store?.status || 'active'} <span className="bg-blue-600/20 text-blue-400 px-1 rounded-sm">{store?.category || 'store'}</span></p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5 hide-scrollbar">
        <SidebarItem icon={LayoutDashboard} label="Home" active={activeNav === 'Home'} onClick={() => setActiveNav('Home')} />
        <SidebarItem icon={Store} label="Point of Sale (POS)" active={activeNav === 'POS'} onClick={() => setActiveNav('POS')} />
        
        <SidebarItem icon={Package} label="Orders" active={activeNav === 'Orders'} onClick={() => setActiveNav('Orders')} hasSubItems isOpen={openMenus.includes('Orders')} toggleOpen={() => toggleMenu('Orders')} />
        {openMenus.includes('Orders') && (
          <div className="space-y-0.5 mb-1">
            <SidebarItem icon={FileText} label="Invoices" active={activeNav === 'Invoices'} onClick={() => setActiveNav('Invoices')} isSubItem />
            <SidebarItem icon={ShoppingCart} label="Abandoned Carts" active={activeNav === 'Abandoned Carts'} onClick={() => setActiveNav('Abandoned Carts')} isSubItem />
          </div>
        )}

        <SidebarItem icon={ShoppingBag} label="Products" active={activeNav === 'Products'} onClick={() => setActiveNav('Products')} hasSubItems isOpen={openMenus.includes('Products')} toggleOpen={() => toggleMenu('Products')} />
        {openMenus.includes('Products') && (
          <div className="space-y-0.5 mb-1">
            <SidebarItem icon={FolderTree} label="Categories" active={activeNav === 'Categories'} onClick={() => setActiveNav('Categories')} isSubItem />
            <SidebarItem icon={Tags} label="Tags" active={activeNav === 'Tags'} onClick={() => setActiveNav('Tags')} isSubItem />
            <SidebarItem icon={Warehouse} label="Inventory" active={activeNav === 'Inventory'} onClick={() => setActiveNav('Inventory')} isSubItem />
          </div>
        )}

        <SidebarItem icon={Users} label="Customers" active={activeNav === 'Customers'} onClick={() => setActiveNav('Customers')} hasSubItems isOpen={openMenus.includes('Customers')} toggleOpen={() => toggleMenu('Customers')} />
        {openMenus.includes('Customers') && (
          <div className="space-y-0.5 mb-1">
            <SidebarItem icon={Building} label="B2B Wholesale" active={activeNav === 'B2B Wholesale'} onClick={() => setActiveNav('B2B Wholesale')} isSubItem />
          </div>
        )}
        
        <SidebarItem icon={BarChart3} label="Analytics" active={activeNav === 'Analytics'} onClick={() => setActiveNav('Analytics')} />
        <SidebarItem icon={Megaphone} label="Marketing" active={activeNav === 'Marketing'} onClick={() => setActiveNav('Marketing')} />
        <SidebarItem icon={Gift} label="Discounts" active={activeNav === 'Discounts'} onClick={() => setActiveNav('Discounts')} />
        <SidebarItem icon={Image} label="Files" active={activeNav === 'Files'} onClick={() => setActiveNav('Files')} />
        
        <div className="h-px bg-white/5 my-4" />
        <p className="px-3 text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-2 mt-4 cursor-pointer hover:text-gray-400 transition-colors flex justify-between" onClick={() => toggleMenu('Management')}>STORE MANAGEMENT {openMenus.includes('Management') ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3"/>}</p>
        
        {openMenus.includes('Management') && (
           <div className="space-y-0.5 mb-2">
            <SidebarItem icon={Truck} label="Shipping & Delivery" active={activeNav === 'Shipping'} onClick={() => setActiveNav('Shipping')} />
            <SidebarItem icon={CreditCard} label="Payment Gateways" active={activeNav === 'Payment Gateways'} onClick={() => setActiveNav('Payment Gateways')} />
            <SidebarItem icon={Wallet} label="My Wallet" active={activeNav === 'My Wallet'} onClick={() => setActiveNav('My Wallet')} />
            <SidebarItem icon={Calculator} label="Taxes & Duties" active={activeNav === 'Taxes'} onClick={() => setActiveNav('Taxes')} />
            <SidebarItem icon={Coins} label="Currencies" active={activeNav === 'Currencies'} onClick={() => setActiveNav('Currencies')} />
           </div>
        )}

        <p className="px-3 text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-2 mt-4 cursor-pointer hover:text-gray-400 transition-colors flex justify-between" onClick={() => toggleMenu('Sales Channels')}>SALES CHANNELS {openMenus.includes('Sales Channels') ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3"/>}</p>
        
        {openMenus.includes('Sales Channels') && (
          <div className="space-y-0.5 mb-2">
            <SidebarItem icon={Monitor} label="Online Store" active={activeNav === 'Online Store'} onClick={() => setActiveNav('Online Store')} hasSubItems isOpen={openMenus.includes('StoreTheme')} toggleOpen={() => toggleMenu('StoreTheme')} />
            {openMenus.includes('StoreTheme') && (
              <div className="space-y-0.5 mb-1 bg-black/20 rounded">
                <SidebarItem icon={Palette} label="Themes" active={activeNav === 'Themes'} onClick={() => setActiveNav('Themes')} isSubItem />
                <SidebarItem icon={LayoutDashboard} label="Homepage Sections" active={activeNav === 'Homepage Sections'} onClick={() => setActiveNav('Homepage Sections')} isSubItem />
                <SidebarItem icon={Monitor} label="Sliders" active={activeNav === 'Sliders'} onClick={() => setActiveNav('Sliders')} isSubItem />
                <SidebarItem icon={Megaphone} label="Banners" active={activeNav === 'Banners'} onClick={() => setActiveNav('Banners')} isSubItem />
                <SidebarItem icon={Link} label="Navigation" active={activeNav === 'Navigation'} onClick={() => setActiveNav('Navigation')} isSubItem />
                <SidebarItem icon={Store} label="Header" active={activeNav === 'Header'} onClick={() => setActiveNav('Header')} isSubItem />
                <SidebarItem icon={HardDrive} label="Footer" active={activeNav === 'Footer'} onClick={() => setActiveNav('Footer')} isSubItem />
                <SidebarItem icon={Puzzle} label="Widgets" active={activeNav === 'Widgets'} onClick={() => setActiveNav('Widgets')} isSubItem />
                <SidebarItem icon={Search} label="SEO" active={activeNav === 'SEO'} onClick={() => setActiveNav('SEO')} isSubItem />
                <SidebarItem icon={Image} label="Media" active={activeNav === 'Media'} onClick={() => setActiveNav('Media')} isSubItem />
                <SidebarItem icon={Settings} label="Theme Settings" active={activeNav === 'Theme Settings'} onClick={() => setActiveNav('Theme Settings')} isSubItem />
                <SidebarItem icon={Star} label="Reviews" active={activeNav === 'Reviews'} onClick={() => setActiveNav('Reviews')} isSubItem />
                <SidebarItem icon={FileText} label="Blogs" active={activeNav === 'Blogs'} onClick={() => setActiveNav('Blogs')} isSubItem />
                <SidebarItem icon={Puzzle} label="Plugins" active={activeNav === 'Plugins'} onClick={() => setActiveNav('Plugins')} isSubItem />
                <SidebarItem icon={Link} label="Domains" active={activeNav === 'Domains'} onClick={() => setActiveNav('Domains')} isSubItem />
              </div>
            )}
            <SidebarItem icon={Globe} label="Google Sales" active={activeNav === 'Google'} onClick={() => setActiveNav('Google')} />
          </div>
        )}

        <p className="px-3 text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-2 mt-4 cursor-pointer hover:text-gray-400 transition-colors flex justify-between" onClick={() => toggleMenu('System')}>SYSTEM CONFIG {openMenus.includes('System') ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3"/>}</p>

        {openMenus.includes('System') && (
          <div className="space-y-0.5 mb-2">
            <SidebarItem icon={ShieldCheck} label="Staff Accounts" active={activeNav === 'Staff Accounts'} onClick={() => setActiveNav('Staff Accounts')} />
            <SidebarItem icon={Languages} label="Languages" active={activeNav === 'Languages'} onClick={() => setActiveNav('Languages')} />
            <SidebarItem icon={Mail} label="Email Templates" active={activeNav === 'Email Templates'} onClick={() => setActiveNav('Email Templates')} />
            <SidebarItem icon={HardDrive} label="Backups" active={activeNav === 'Backups'} onClick={() => setActiveNav('Backups')} />
          </div>
        )}
      </nav>

      <div className="p-3 border-t border-white/5 space-y-1 bg-[#121415] shrink-0">
        <SidebarItem icon={Settings} label="General Settings" active={activeNav === 'Settings'} onClick={() => setActiveNav('Settings')} />
        <button 
          onClick={() => navigate('/store')}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded text-[12px] font-bold text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 transition-all mt-2"
        >
          <LogOut className="h-3.5 w-3.5 rotate-180" />
          <span>Return to Hub</span>
        </button>
      </div>
    </aside>
  );
}
