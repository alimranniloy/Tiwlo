import { 
  AlertTriangle,
  Bell, 
  Search, 
  LogOut, 
  Menu, 
  X, 
  LifeBuoy, 
  Settings, 
  CreditCard
} from 'lucide-react';
import { User } from '../types';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchBillingOverviewWithApi, fetchSettingsWithApi } from '../lib/tiwloApi';
import CurrencySwitcher from './CurrencySwitcher';
import {
  CURRENCY_POLICY_KEY,
  chooseCurrencyForStorage,
  convertCurrencyAmount,
  currencySelectionStorageKey,
  DEFAULT_CURRENCY_POLICY,
  formatCurrencyAmount,
  normalizeCurrencyPolicy,
  persistCurrencySelection,
  readStoredCurrencySelection
} from '../lib/currency';

interface HeaderProps {
  user: User;
  onLogout: () => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
}

export default function Header({ user, onLogout, isSidebarOpen, setIsSidebarOpen }: HeaderProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [creditBalance, setCreditBalance] = useState<number | null>(typeof user.credits === 'number' ? user.credits : null);
  const [currencyPolicy, setCurrencyPolicy] = useState(() => normalizeCurrencyPolicy(DEFAULT_CURRENCY_POLICY));
  const currencyStorageKey = currencySelectionStorageKey('platform', 'console', user.id);
  const [selectedCurrency, setSelectedCurrency] = useState(() => chooseCurrencyForStorage(currencyPolicy, currencyStorageKey));

  useEffect(() => {
    let isMounted = true;

    const loadCreditBalance = () => {
      fetchBillingOverviewWithApi()
        .then((overview) => {
          if (isMounted) setCreditBalance(Number(overview?.credits || 0));
        })
        .catch(() => {
          if (isMounted && typeof user.credits === 'number') setCreditBalance(user.credits);
        });
    };

    loadCreditBalance();
    window.addEventListener('tiwlo:data-refresh', loadCreditBalance);

    return () => {
      isMounted = false;
      window.removeEventListener('tiwlo:data-refresh', loadCreditBalance);
    };
  }, [user.id, user.credits]);

  useEffect(() => {
    let isMounted = true;
    fetchSettingsWithApi('platform')
      .then((settings) => {
        if (!isMounted) return;
        const saved = settings.find((setting) => setting.key === CURRENCY_POLICY_KEY)?.value;
        setCurrencyPolicy(normalizeCurrencyPolicy(saved || DEFAULT_CURRENCY_POLICY));
      })
      .catch(() => {
        if (isMounted) setCurrencyPolicy(normalizeCurrencyPolicy(DEFAULT_CURRENCY_POLICY));
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const next = chooseCurrencyForStorage(currencyPolicy, currencyStorageKey);
    setSelectedCurrency(next);
    if (!readStoredCurrencySelection(currencyStorageKey, currencyPolicy)) {
      persistCurrencySelection(currencyStorageKey, next, { scope: 'platform', scopeId: 'console', actorId: user.id });
    }
  }, [currencyPolicy, currencyStorageKey, user.id]);

  const creditText = creditBalance === null
    ? '...'
    : formatCurrencyAmount(convertCurrencyAmount(creditBalance, currencyPolicy, selectedCurrency), selectedCurrency);
  const isCreditEmpty = creditBalance !== null && creditBalance <= 0;
  const roleLabel = ['admin', 'super_admin'].includes(user.role)
    ? 'Administrator'
    : user.role.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');

  return (
    <header className="h-14 md:h-16 bg-white border-b border-[#e5e8ed] px-4 md:px-8 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3 lg:hidden">
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 text-[#2e3d49] hover:bg-gray-100 rounded-md transition-colors"
        >
          {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        {/* Mobile menu and logo area */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#0069ff] rounded flex items-center justify-center text-white font-bold text-xs">
            D
          </div>
          <span className="text-sm font-bold tracking-tight text-[#2e3d49] uppercase">Tiwlo Console</span>
        </div>
      </div>

      <div className="flex-1 max-w-sm hidden lg:block">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94a3b8]" />
          <input
            type="text"
            placeholder="Search resources..."
            className="w-full bg-[#f8f9fa] border border-[#e5e8ed] focus:bg-white focus:border-[#0069ff] rounded-md py-1.5 pl-10 pr-4 text-[13px] focus:outline-none transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-5 ml-auto">
        <CurrencySwitcher
          policy={currencyPolicy}
          storageKey={currencyStorageKey}
          value={selectedCurrency}
          onChange={setSelectedCurrency}
          scope="platform"
          scopeId="console"
          actorId={user.id}
          compact
          className="hidden sm:inline-flex"
        />

        <Link
          to="/billing"
          className={`${isCreditEmpty ? 'flex' : 'hidden md:flex'} items-center gap-2 rounded-lg border px-3 py-1 mr-2 shrink-0 ${
            isCreditEmpty
              ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100/70'
              : 'border-green-100 bg-green-50 text-green-700 hover:border-green-200 hover:bg-green-100/70'
          }`}
        >
          {isCreditEmpty ? <AlertTriangle className="h-3.5 w-3.5" /> : <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>}
          <span className="max-w-[160px] truncate text-[11px] font-bold tracking-tight sm:max-w-[240px]">
            {isCreditEmpty ? 'Add credit now: all servers will stay off' : `Credits: ${creditText}`}
          </span>
        </Link>

        <button className="p-2 text-[#6B7280] hover:bg-gray-50 rounded-md transition-colors relative shrink-0">
           <Bell className="h-5 w-5" />
           <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-red-500 rounded-full border border-white"></span>
        </button>
        
        <div className="h-6 w-[1px] bg-[#e5e8ed] mx-1 hidden sm:block"></div>

        <div className="flex items-center gap-2 md:gap-3 group focus:outline-none">
          <div 
            className="hidden sm:block text-right cursor-pointer"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
          >
            <p className="text-[13px] font-bold text-[#2e3d49] leading-none transition-colors group-hover:text-[#0069ff]">{user.name}</p>
            {['admin', 'super_admin'].includes(user.role) && (
              <span className="text-[10px] font-bold text-[#0069ff] uppercase tracking-wider bg-blue-50 px-1 rounded border border-blue-100 mt-1 inline-block">Admin</span>
            )}
          </div>
          <div className="relative">
            <div 
              className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-[#2e3d49] border border-[#e5e8ed] overflow-hidden transition-all group-hover:border-[#0069ff] cursor-pointer"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            >
               {user.avatar ? (
                 <img src={user.avatar} className="w-full h-full object-cover" alt="" />
               ) : (
                 <div className="w-full h-full flex items-center justify-center bg-[#2e3d49] text-white text-[13px] font-bold">
                    {user.name.charAt(0)}
                 </div>
               )}
            </div>
            
            {isUserMenuOpen && (
              <>
                {/* Transparent backdrop to close menu */}
                <div 
                  className="fixed inset-0 z-[60]" 
                  onClick={() => setIsUserMenuOpen(false)}
                ></div>

                {/* DigitalOcean Style Dropdown */}
                <div
                  className="absolute right-0 top-full mt-2 w-64 bg-white border border-[#e5e8ed] rounded shadow-[0_8px_24px_rgba(3,27,78,0.12)] z-[100] overflow-hidden origin-top-right"
                >
                    {/* User Info Section */}
                    <div className="px-5 py-4 border-b border-[#f3f5f9] flex items-center gap-3 bg-[#f8f9fa]">
                       <div className="w-10 h-10 bg-[#2e3d49] rounded-full overflow-hidden shrink-0 border border-[#e5e8ed]">
                          {user.avatar ? (
                            <img src={user.avatar} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold">
                               {user.name.charAt(0)}
                            </div>
                          )}
                       </div>
                       <div className="min-w-0">
                          <p className="text-sm font-bold text-[#2e3d49] truncate leading-tight">{user.name}</p>
                          <p className="text-[11px] text-gray-500 font-medium truncate">{roleLabel}</p>
                       </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-1">
                       <Link 
                         to="/settings" 
                         onClick={() => setIsUserMenuOpen(false)}
                         className="flex items-center gap-3 px-5 py-2.5 text-[13px] font-medium text-[#4a4a4a] hover:bg-[#f3f5f9] hover:text-[#0069ff] transition-colors"
                       >
                          <Settings className="h-4 w-4 text-gray-400" /> Account
                       </Link>
                       <Link 
                         to="/invoices" 
                         onClick={() => setIsUserMenuOpen(false)}
                         className="flex items-center gap-3 px-5 py-2.5 text-[13px] font-medium text-[#4a4a4a] hover:bg-[#f3f5f9] hover:text-[#0069ff] transition-colors"
                       >
                          <CreditCard className="h-4 w-4 text-gray-400" /> Billing
                       </Link>
                    </div>

                    <div className="h-px bg-[#f3f5f9] mx-0"></div>

                    <div className="py-1">
                       <Link 
                         to="/support" 
                         onClick={() => setIsUserMenuOpen(false)}
                         className="flex items-center gap-3 px-5 py-2.5 text-[13px] font-medium text-[#4a4a4a] hover:bg-[#f3f5f9] hover:text-[#0069ff] transition-colors"
                       >
                          <LifeBuoy className="h-4 w-4 text-gray-400" /> Help & Support
                       </Link>
                    </div>

                    <div className="p-2 border-t border-[#f3f5f9] bg-[#f8f9fa]">
                       <button 
                         onClick={() => {
                           setIsUserMenuOpen(false);
                           onLogout();
                         }}
                         className="w-full flex items-center gap-3 px-3 py-2 text-[13px] font-bold text-red-500 hover:bg-white border border-transparent hover:border-red-100 rounded transition-colors"
                       >
                          <LogOut className="h-4 w-4" /> Sign Out
                       </button>
                    </div>
                  </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
