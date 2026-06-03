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
import { Link, useNavigate } from 'react-router-dom';
import {
  fetchBillingOverviewWithApi,
  fetchNotificationsWithApi,
  fetchSettingsWithApi,
  markNotificationReadWithApi
} from '../lib/tiwloApi';
import CurrencySwitcher from './CurrencySwitcher';
import BrandLogo from './BrandLogo';
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
  const navigate = useNavigate();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
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
    const loadNotifications = () => {
      fetchNotificationsWithApi(undefined, 'unread')
        .then((items) => {
          if (isMounted) setNotifications((items || []).slice(0, 8));
        })
        .catch(() => {
          if (isMounted) setNotifications([]);
        });
    };

    loadNotifications();
    window.addEventListener('tiwlo:data-refresh', loadNotifications);

    return () => {
      isMounted = false;
      window.removeEventListener('tiwlo:data-refresh', loadNotifications);
    };
  }, [user.id]);

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

  const notificationRoute = (notification: any) => {
    const metadata = notification?.metadata || {};
    const target = String(metadata.path || metadata.url || '');
    if (target.startsWith('/')) return target;
    const fingerprint = `${notification?.scope || ''} ${notification?.type || ''} ${notification?.title || ''} ${metadata.module || ''}`.toLowerCase();
    if (fingerprint.includes('invoice')) return '/invoices';
    if (fingerprint.includes('billing') || fingerprint.includes('credit') || fingerprint.includes('payment')) return '/billing';
    if (fingerprint.includes('support') || fingerprint.includes('ticket')) return '/support';
    if (fingerprint.includes('tiwlo') || fingerprint.includes('withdrawal') || fingerprint.includes('payout')) return '/tiwlo-pay/overview';
    if (fingerprint.includes('tpanel') || fingerprint.includes('license')) return '/tpanel';
    if (fingerprint.includes('isp') || fingerprint.includes('router')) return '/isp-billing';
    if (fingerprint.includes('store') || fingerprint.includes('order') || fingerprint.includes('ecommerce')) return '/store';
    return '/alerts';
  };

  const openNotification = async (notification: any) => {
    setIsNotificationOpen(false);
    setNotifications((current) => current.filter((item) => item.id !== notification.id));
    try {
      await markNotificationReadWithApi(notification.id);
    } catch {
      // Best-effort read receipt; navigation is more important here.
    }
    navigate(notificationRoute(notification));
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[#d9e1ec] bg-white px-2 shadow-[0_1px_4px_rgba(3,27,78,0.06)] sm:px-4 md:h-16 md:px-6">
      <div className="flex items-center gap-2 lg:hidden">
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="rounded-md p-1.5 text-[#52637a] transition-colors hover:bg-[#f3f6fb] hover:text-[#031b4e]"
        >
          {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        {/* Mobile menu and logo area */}
        <div className="flex items-center gap-2">
          <BrandLogo className="h-8 w-20 sm:w-28" />
        </div>
      </div>

      <div className="hidden flex-1 lg:block">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71809a]" />
          <input
            type="text"
            placeholder="Search by resource name or public IP"
            className="h-10 w-full max-w-xl rounded-md border border-transparent bg-transparent py-2 pl-10 pr-4 text-[14px] text-[#031b4e] transition-all placeholder:text-[#7b8798] focus:border-[#b9cdf8] focus:bg-[#f7faff] focus:outline-none focus:ring-2 focus:ring-[#0069ff]/10"
          />
        </div>
      </div>

      <div className="ml-auto flex items-center gap-1.5 md:gap-4">
        <CurrencySwitcher
          policy={currencyPolicy}
          storageKey={currencyStorageKey}
          value={selectedCurrency}
          onChange={setSelectedCurrency}
          scope="platform"
          scopeId="console"
          actorId={user.id}
          compact
          className="inline-flex"
          selectClassName="w-[62px] px-1.5 sm:w-[78px] sm:px-2.5"
        />

        <Link
          to="/billing"
          className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-2 md:px-3 ${
            isCreditEmpty
              ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100/70'
              : 'border-[#d9d2ff] bg-[#ede9ff] text-[#5b45ff] hover:border-[#c7bcff] hover:bg-[#e4ddff]'
          }`}
        >
          {isCreditEmpty && <AlertTriangle className="h-3.5 w-3.5" />}
          <span className="hidden max-w-[160px] truncate text-[11px] font-bold tracking-tight sm:inline sm:max-w-[240px]">
            {isCreditEmpty ? 'Add credit now: all servers will stay off' : `Credits: ${creditText}`}
          </span>
          <span className="max-w-[58px] truncate text-[10px] font-black tracking-tight sm:hidden">
            {isCreditEmpty ? 'Add' : creditText}
          </span>
        </Link>

        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setIsNotificationOpen((value) => !value)}
            className="relative rounded-md p-1.5 text-[#5d6b85] transition-colors hover:bg-[#f3f6fb] hover:text-[#031b4e] sm:p-2"
            aria-label="Notifications"
            aria-expanded={isNotificationOpen}
          >
             <Bell className="h-5 w-5" />
             {notifications.length > 0 && (
               <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full border border-white bg-red-500 px-1 text-[9px] font-black text-white">
                 {notifications.length > 9 ? '9+' : notifications.length}
               </span>
             )}
          </button>

          {isNotificationOpen && (
            <>
              <div className="fixed inset-0 z-[60]" onClick={() => setIsNotificationOpen(false)}></div>
              <div className="absolute right-0 top-full z-[100] mt-2 w-[min(20rem,calc(100vw-1rem))] overflow-hidden rounded-md border border-[#d9e1ec] bg-white shadow-[0_16px_40px_rgba(3,27,78,0.14)]">
                <div className="flex items-center justify-between border-b border-[#f3f5f9] bg-[#f8f9fa] px-4 py-3">
                  <p className="text-[12px] font-black uppercase tracking-wider text-[#2e3d49]">Notifications</p>
                  <Link to="/alerts" onClick={() => setIsNotificationOpen(false)} className="text-[11px] font-bold text-[#0069ff]">View all</Link>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-[12px] font-bold text-gray-400">No unread notifications.</div>
                  ) : notifications.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => openNotification(notification)}
                      className="block w-full border-b border-[#f3f5f9] px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-[#f8f9fa]"
                    >
                      <p className="line-clamp-1 text-[13px] font-black text-[#2e3d49]">{notification.title}</p>
                      <p className="mt-1 line-clamp-2 text-[12px] leading-5 text-[#6B7280]">{notification.message}</p>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
        
        <div className="mx-1 hidden h-7 w-px bg-[#d9e1ec] sm:block"></div>

        <div className="flex items-center gap-2 md:gap-3 group focus:outline-none">
          <div 
            className="hidden cursor-pointer text-right sm:block"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
          >
            <p className="text-[13px] font-bold leading-none text-[#031b4e] transition-colors group-hover:text-[#0069ff]">{user.name}</p>
            {['admin', 'super_admin'].includes(user.role) && (
              <span className="text-[10px] font-bold text-[#0069ff] uppercase tracking-wider bg-blue-50 px-1 rounded border border-blue-100 mt-1 inline-block">Admin</span>
            )}
          </div>
          <div className="relative">
            <div 
              className="h-8 w-8 cursor-pointer overflow-hidden rounded-full border border-[#d9e1ec] bg-[#0069ff] transition-all group-hover:border-[#0069ff] md:h-9 md:w-9"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            >
               {user.avatar ? (
                 <img src={user.avatar} className="w-full h-full object-cover" alt="" />
               ) : (
                 <div className="flex h-full w-full items-center justify-center bg-[#0069ff] text-[13px] font-bold text-white">
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
                  className="absolute right-0 top-full z-[100] mt-2 w-64 origin-top-right overflow-hidden rounded-md border border-[#d9e1ec] bg-white shadow-[0_16px_40px_rgba(3,27,78,0.14)]"
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
