import { Fragment, lazy, Suspense, useState, useEffect, type ReactElement, type ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import type { Droplet, Domain, User } from './types';
import LandingPage from './pages/LandingPage';

// Pages
const ActionConfirmationProvider = lazy(() => import('./components/ActionConfirmation').then((module) => ({ default: module.ActionConfirmationProvider })));
const Sidebar = lazy(() => import('./components/Sidebar'));
const Header = lazy(() => import('./components/Header'));
const CrystalSetupLoader = lazy(() => import('./components/SetupLoader').then((module) => ({ default: module.CrystalSetupLoader })));
const TrackingScripts = lazy(() => import('./components/TrackingScripts'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ServicesPage = lazy(() => import('./pages/Services'));
const ProductsPage = lazy(() => import('./pages/Products'));
const CommercePage = lazy(() => import('./pages/Commerce'));
const BroadbandPage = lazy(() => import('./pages/Broadband'));
const TiwloPayCheckout = lazy(() => import('./pages/TiwloPayCheckout'));
const AdminDashboard = lazy(() => import('./pages/management/AdminDashboard'));
const LoginPage = lazy(() => import('./pages/Login'));
const SignupPage = lazy(() => import('./pages/Signup'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const EmailPortal = lazy(() => import('./pages/EmailPortal'));
const BannedAccount = lazy(() => import('./pages/BannedAccount'));
const TSecurityBlocked = lazy(() => import('./pages/TSecurityBlocked'));
const MaintenancePage = lazy(() => import('./pages/Maintenance'));
const NotFoundPage = lazy(() => import('./pages/NotFound'));
const CompleteProfile = lazy(() => import('./pages/CompleteProfile'));
const StorefrontHost = lazy(() => import('./themes/StorefrontHost'));
const AuraPreview = lazy(() => import('./themes/aura').then((module) => ({ default: module.AuraPreview })));
const EplazaPreview = lazy(() => import('./themes/eplaza').then((module) => ({ default: module.EplazaPreview })));
const DropletsPage = lazy(() => import('./pages/Droplets'));
const DomainsPage = lazy(() => import('./pages/Domains'));
const NetworkingPage = lazy(() => import('./pages/Networking'));
const SettingsPage = lazy(() => import('./pages/Settings'));
const TeamPage = lazy(() => import('./pages/Team'));
const BillingPage = lazy(() => import('./pages/Billing'));
const TiwloPay = lazy(() => import('./pages/TiwloPay'));
const IdentityVerification = lazy(() => import('./pages/IdentityVerification'));
const TPanel = lazy(() => import('./pages/TPanel'));
const APIPage = lazy(() => import('./pages/API'));
const VolumesPage = lazy(() => import('./pages/Volumes'));
const DatabasesPage = lazy(() => import('./pages/Databases'));
const InvoicesPage = lazy(() => import('./pages/Invoices'));
const ActivityPage = lazy(() => import('./pages/Activity'));
const AlertsPage = lazy(() => import('./pages/Alerts'));
const SupportPage = lazy(() => import('./pages/Support'));
const CreateSupportTicket = lazy(() => import('./pages/CreateSupportTicket'));
const FirewallsPage = lazy(() => import('./pages/Firewalls'));
const AppsPage = lazy(() => import('./pages/Apps'));
const FunctionsPage = lazy(() => import('./pages/Functions'));
const MarketplacePage = lazy(() => import('./pages/Marketplace'));
const KubernetesPage = lazy(() => import('./pages/Kubernetes'));
const LegalPage = lazy(() => import('./pages/LegalPage'));
const AboutPage = lazy(() => import('./pages/About'));
const SeoTopicPage = lazy(() => import('./pages/SeoTopicPage'));
const CloudStorePage = lazy(() => import('./pages/CloudStore'));
const StoreManagementPage = lazy(() => import('./pages/StoreManagement'));
const StoreAdminDashboard = lazy(() => import('./cloudstore/storeadmin/StoreAdminDashboard'));
const StoreUserDashboard = lazy(() => import('./cloudstore/userdashboard'));
const DocumentationPage = lazy(() => import('./pages/Documentation'));
const CreateDroplet = lazy(() => import('./pages/CreateDroplet'));
const UserManagement = lazy(() => import('./pages/management/UserManagement'));
const SystemLogs = lazy(() => import('./pages/management/SystemLogs'));
const AddSystemServer = lazy(() => import('./pages/management/AddSystemServer'));
const AdminPayments = lazy(() => import('./pages/management/AdminPayments'));
const AdminTiwloPay = lazy(() => import('./pages/management/AdminTiwloPay'));
const AdminTPanel = lazy(() => import('./pages/management/AdminTPanel'));
const AdminDomains = lazy(() => import('./pages/management/AdminDomains'));
const AdminDns = lazy(() => import('./pages/management/AdminDns'));
const AdminDnsHostnames = lazy(() => import('./pages/management/AdminDnsHostnames'));
const AdminIdentity = lazy(() => import('./pages/management/AdminIdentity'));
const AdminPlugins = lazy(() => import('./pages/management/AdminPlugins'));
const AdminDiscordBot = lazy(() => import('./pages/management/AdminDiscordBot'));
const AdminSecurity = lazy(() => import('./pages/management/AdminSecurity'));
const AdminCore = lazy(() => import('./pages/management/AdminCore'));
const AdminAiModel = lazy(() => import('./pages/management/AdminAiModel'));
const AdminSupport = lazy(() => import('./pages/management/AdminSupport'));
const AdminIdentityVerification = lazy(() => import('./pages/management/AdminIdentityVerification'));
const AdminNotifications = lazy(() => import('./pages/management/AdminNotifications'));
const AdminEmail = lazy(() => import('./pages/management/AdminEmail'));
const AdminWhatsAppApi = lazy(() => import('./pages/management/AdminWhatsAppApi'));
const AdminPlans = lazy(() => import('./pages/management/AdminPlans'));
const AdminCurrencies = lazy(() => import('./pages/management/AdminCurrencies'));
const AdminResourcesPage = lazy(() => import('./pages/management/AdminResourcesPage'));
const AdminSectionRecords = lazy(() => import('./pages/management/AdminSectionRecords'));
const AdminServiceStatistics = lazy(() => import('./pages/management/AdminServiceStatistics'));
const AdminStoreProducts = lazy(() => import('./pages/management/AdminStoreProducts'));
const AdminBackup = lazy(() => import('./pages/management/AdminBackup'));
const AdminSsl = lazy(() => import('./pages/management/AdminSsl'));
const EcommerceLayout = lazy(() => import('./pages/management/EcommerceLayout'));
const EcommerceCreateStore = lazy(() => import('./pages/management/ecommerce/EcommerceCreateStore'));
const EcommerceControlPage = lazy(() => import('./pages/management/ecommerce/EcommerceControlPage'));
const ModulePlaceholder = lazy(() => import('./pages/management/ecommerce/ModulePlaceholder'));
const IspLayout = lazy(() => import('./pages/management/IspLayout'));
const IspDashboard = lazy(() => import('./pages/management/isp/IspDashboard'));
const IspClientManagement = lazy(() => import('./pages/management/isp/IspClientManagement'));
const MarketingInfoPage = lazy(() => import('./pages/MarketingInfoPage'));
const FloatingAIWidget = lazy(() => import('./components/FloatingAIWidget'));
const ISPStorefront = lazy(() => import('./pages/isp/ISPStorefront'));
const ISPAddRouter = lazy(() => import('./pages/isp/ISPAddRouter'));
const ISPAdminRoot = lazy(() => import('./pages/isp/admin/ISPAdminRoot'));
const WhatsAppVerificationRequired = lazy(() => import('./pages/WhatsAppVerificationRequired'));
const SignupPromoVerificationRequired = lazy(() => import('./pages/SignupPromoVerificationRequired'));
import { clearAuthToken, fetchAdminModules, fetchConsoleData, fetchCurrentUserWithApi, fetchPlatformStatusWithApi, getAuthToken } from './lib/api/appBootstrap';
import { getStorefrontHostContext } from './lib/storefrontHost';
import { isProfileComplete } from './lib/profileCompletion';
import { SERVICE_MODULE_GROUP, SERVICE_MODULE_KEYS, serviceEnabled } from './lib/serviceModules';

const restrictedStatuses = new Set(['banned', 'blocked', 'suspended', 'disabled']);
const PUBLIC_STATUS_DELAY_MS = 12000;
const TRACKING_MOUNT_DELAY_MS = 9000;

function RouteLoader() {
  return null;
}

function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname, search]);

  return null;
}

function DeferredTrackingScripts() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let done = false;
    let timerId: number | undefined;

    const enable = () => {
      if (done) return;
      done = true;
      setEnabled(true);
    };

    const schedule = () => {
      timerId = window.setTimeout(enable, TRACKING_MOUNT_DELAY_MS);
    };

    const interactionEvents = ['pointerdown', 'keydown', 'touchstart'] as const;

    if (document.readyState === 'complete') {
      schedule();
    } else {
      window.addEventListener('load', schedule, { once: true });
    }

    interactionEvents.forEach((eventName) => {
      window.addEventListener(eventName, enable, { once: true, passive: true });
    });

    return () => {
      done = true;
      if (timerId !== undefined) window.clearTimeout(timerId);
      window.removeEventListener('load', schedule);
      interactionEvents.forEach((eventName) => window.removeEventListener(eventName, enable));
    };
  }, []);

  if (!enabled) return null;

  return (
    <Suspense fallback={null}>
      <TrackingScripts />
    </Suspense>
  );
}

function ResettableRouter({ routerKey, children }: { routerKey: string; children: ReactNode }) {
  return (
    <Fragment key={routerKey}>
      <Router>
        <ScrollToTop />
        <DeferredTrackingScripts />
        {children}
      </Router>
    </Fragment>
  );
}

function ConsoleActionProvider({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<RouteLoader />}>
      <ActionConfirmationProvider>{children}</ActionConfirmationProvider>
    </Suspense>
  );
}

function FloatingAIWidgetMount() {
  const location = useLocation();
  if (location.pathname === '/droplets/create') return null;
  return <FloatingAIWidget />;
}

function isRestrictedUser(user?: User | null) {
  if (isAdminRole(user)) return false;
  return restrictedStatuses.has(String(user?.status || '').toLowerCase());
}

function isAdminRole(user?: User | null) {
  return ['admin', 'super_admin'].includes(String(user?.role || '').toLowerCase());
}

function WelcomeScreen() {
  return (
    <Suspense fallback={<RouteLoader />}>
      <CrystalSetupLoader
        messages={[
          'Setting up your console',
          'Checking billing profile',
          'Syncing services and modules',
          'Opening dashboard'
        ]}
      />
    </Suspense>
  );
}

function AppContent({ 
  user, 
  setUser, 
  droplets, 
  setDroplets, 
  domains, 
  setDomains, 
  handleLogout 
}: { 
  user: User, 
  setUser: any, 
  droplets: Droplet[], 
  setDroplets: any, 
  domains: Domain[], 
  setDomains: any, 
  handleLogout: any 
}) {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [serviceModules, setServiceModules] = useState<any[]>([]);
  const isAdminUser = ['admin', 'super_admin'].includes(user.role);

  useEffect(() => {
    setIsSidebarOpen(false); // Close sidebar on route change
  }, [location.pathname]);

  useEffect(() => {
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
  }, []);

  const serviceRoute = (key: string, element: ReactElement, adminPath: string) => {
    const enabled = serviceEnabled(serviceModules, key);
    if (!enabled && isAdminUser) return <Navigate to={adminPath} replace />;
    if (!enabled) return <Navigate to="/" replace />;
    return element;
  };

  const hideLayout = location.pathname.startsWith('/store/admin') || 
                     location.pathname.startsWith('/store/user') || 
                     location.pathname.startsWith('/themes') || 
                     location.pathname.startsWith('/isp-billing/admin') ||
                     location.pathname.startsWith('/management/ecommerce') ||
                     location.pathname.startsWith('/management/isp') ||
                     location.pathname.startsWith('/id-verification') ||
                     location.pathname.startsWith('/pay/') ||
                     location.pathname === '/email';

  return (
    <div className="flex min-h-screen bg-[#f7f8fb] font-sans text-[#031b4e]">
      {!hideLayout && (
        <Suspense fallback={<RouteLoader />}>
          <Sidebar
            user={user}
            isOpen={isSidebarOpen}
            setIsOpen={setIsSidebarOpen}
            onLogout={handleLogout}
          />
        </Suspense>
      )}
      
      <div className="flex-1 flex flex-col min-w-0">
        {!hideLayout && (
          <Suspense fallback={<RouteLoader />}>
            <Header
              user={user}
              onLogout={handleLogout}
              isSidebarOpen={isSidebarOpen}
              setIsSidebarOpen={setIsSidebarOpen}
            />
          </Suspense>
        )}
        
        <main className={`flex-1 overflow-y-auto ${hideLayout ? '' : 'tiwlo-console-main px-3 py-4 sm:px-5 md:px-7 md:py-7'}`}>
          <Suspense fallback={<RouteLoader />}>
          <Routes>
            {isAdminUser ? (
              <>
                <Route path="/" element={<AdminDashboard user={user} />} />
                <Route path="/management/ecommerce/*" element={
                  <EcommerceLayout user={user}>
                    <Routes>
                      <Route path="/" element={<EcommerceControlPage />} />
                      <Route path="/*" element={<EcommerceControlPage />} />
                    </Routes>
                  </EcommerceLayout>
                } />
                <Route path="/management/isp/*" element={
                  <IspLayout user={user}>
                    <Routes>
                      <Route path="/" element={<IspDashboard />} />
                      <Route path="/clients" element={<IspClientManagement />} />
                      <Route path="/*" element={<ModulePlaceholder />} />
                    </Routes>
                  </IspLayout>
                } />
                <Route path="/management/users" element={<UserManagement />} />
                <Route path="/management/logs" element={<SystemLogs />} />
                <Route path="/management/servers" element={<AddSystemServer />} />
                <Route path="/management/statistics" element={<AdminServiceStatistics />} />
                <Route path="/management/notifications" element={<AdminNotifications />} />
                <Route path="/management/email" element={<AdminEmail />} />
                <Route path="/management/whatsapp-api" element={<AdminWhatsAppApi />} />
                <Route path="/management/payments" element={<AdminPayments />} />
                <Route path="/management/tiwlo-pay" element={<AdminTiwloPay />} />
                <Route path="/management/size-packages" element={<AdminTPanel />} />
                <Route path="/management/tpanel/*" element={<AdminTPanel />} />
                <Route path="/management/invoices" element={<InvoicesPage adminMode />} />
                <Route path="/management/plans" element={<AdminPlans />} />
                <Route path="/management/domains" element={<AdminDomains />} />
                <Route path="/management/dns" element={<AdminDns />} />
                <Route path="/management/dns/hostnames" element={<AdminDnsHostnames mode="hostnames" />} />
                <Route path="/management/dns/nameservers" element={<AdminDnsHostnames mode="nameservers" />} />
                <Route path="/management/identity" element={<AdminIdentity />} />
                <Route path="/management/contact-groups" element={<AdminSectionRecords sectionKey="contactGroups" />} />
                <Route path="/management/plugins" element={<AdminPlugins />} />
                <Route path="/management/discord-bot" element={<AdminDiscordBot />} />
                <Route path="/management/security" element={<AdminSecurity />} />
                <Route path="/management/core" element={<AdminCore />} />
                <Route path="/management/ai-model" element={<AdminAiModel />} />
                <Route path="/management/settings" element={<AdminCore />} />
                <Route path="/management/backup" element={<AdminBackup />} />
                <Route path="/management/ssl" element={<AdminSsl />} />
                <Route path="/management/support" element={<AdminSupport />} />
                <Route path="/management/id-verifications" element={<AdminIdentityVerification />} />
                <Route path="/management/taxes" element={<AdminSectionRecords sectionKey="taxes" />} />
                <Route path="/management/currencies" element={<AdminCurrencies />} />
                <Route path="/management/store-products" element={<AdminStoreProducts />} />
                <Route path="/management/cloud-templates" element={<AdminSectionRecords sectionKey="cloudTemplates" />} />
                <Route path="/management/resources/:kind" element={<AdminResourcesPage />} />
                <Route path="/management/api" element={<APIPage />} />
                <Route path="/management/*" element={<AdminDashboard user={user} />} />
              </>
            ) : (
              <>
                <Route path="/" element={<Dashboard user={user} droplets={droplets} domains={domains} />} />
                <Route path="/dashboard" element={<Dashboard user={user} droplets={droplets} domains={domains} />} />
                <Route path="/dasboard" element={<Dashboard user={user} droplets={droplets} domains={domains} />} />
              </>
            )}
            
            <Route 
              path="/droplets" 
              element={<DropletsPage droplets={droplets} setDroplets={setDroplets} />} 
            />
            <Route path="/store" element={serviceRoute(SERVICE_MODULE_KEYS.ecommerce, <CloudStorePage />, '/management/ecommerce')} />
            <Route path="/store/create" element={serviceRoute(SERVICE_MODULE_KEYS.ecommerce, <EcommerceCreateStore />, '/management/ecommerce')} />
            <Route path="/store/management" element={serviceRoute(SERVICE_MODULE_KEYS.ecommerce, <StoreManagementPage />, '/management/ecommerce')} />
            <Route path="/store/admin/*" element={serviceRoute(SERVICE_MODULE_KEYS.ecommerce, <StoreAdminDashboard />, '/management/ecommerce')} />
            <Route path="/store/user/*" element={serviceRoute(SERVICE_MODULE_KEYS.ecommerce, <StoreUserDashboard />, '/management/ecommerce')} />
            <Route path="/themes/eplaza/*" element={serviceRoute(SERVICE_MODULE_KEYS.ecommerce, <EplazaPreview />, '/management/ecommerce')} />
            <Route path="/themes/aura/*" element={serviceRoute(SERVICE_MODULE_KEYS.ecommerce, <AuraPreview />, '/management/ecommerce')} />
            <Route path="/themes/*" element={serviceRoute(SERVICE_MODULE_KEYS.ecommerce, <AuraPreview />, '/management/ecommerce')} />
            <Route path="/isp-billing" element={serviceRoute(SERVICE_MODULE_KEYS.isp, <ISPStorefront />, '/management/isp')} />
            <Route path="/isp-billing/add-router" element={serviceRoute(SERVICE_MODULE_KEYS.isp, <ISPAddRouter />, '/management/isp')} />
            <Route path="/isp-billing/admin/*" element={serviceRoute(SERVICE_MODULE_KEYS.isp, <ISPAdminRoot />, '/management/isp')} />
            <Route 
              path="/domains" 
              element={<DomainsPage domains={domains} setDomains={setDomains} />} 
            />
            <Route path="/dns" element={<DomainsPage domains={domains} setDomains={setDomains} />} />
            <Route path="/networking" element={<NetworkingPage />} />
            <Route path="/volumes" element={<VolumesPage />} />
            <Route path="/databases" element={<DatabasesPage />} />
            <Route path="/invoices" element={<InvoicesPage />} />
            <Route path="/activity" element={<ActivityPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/support" element={<SupportPage />} />
            <Route path="/support/create-ticket" element={<CreateSupportTicket />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/bangladesh-hosting" element={<SeoTopicPage topicKey="bangladeshHosting" />} />
            <Route path="/cloud-vps-hosting" element={<SeoTopicPage topicKey="cloudVps" />} />
            <Route path="/tpanel-hosting" element={<SeoTopicPage topicKey="tpanelHosting" />} />
            <Route path="/whmcs-alternative" element={<SeoTopicPage topicKey="whmcsAlternative" />} />
            <Route path="/hosting-free-credit" element={<SeoTopicPage topicKey="freeCredit" />} />
            <Route path="/hosting-features" element={<SeoTopicPage topicKey="hostingFeatures" />} />
            <Route path="/terms" element={<LegalPage />} />
            <Route path="/privacy" element={<LegalPage />} />
            <Route path="/firewalls" element={<FirewallsPage />} />
            <Route path="/apps" element={<AppsPage />} />
            <Route path="/functions" element={<FunctionsPage />} />
            <Route path="/marketplace" element={<MarketplacePage />} />
            <Route path="/kubernetes" element={<KubernetesPage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/commerce" element={<CommercePage />} />
            <Route path="/partners" element={<MarketingInfoPage variant="partners" />} />
            <Route path="/pricing" element={<MarketingInfoPage variant="pricing" />} />
            <Route path="/broadband" element={<BroadbandPage />} />
            <Route path="/documentation" element={<DocumentationPage />} />
            <Route path="/team" element={<TeamPage user={user} />} />
            <Route path="/billing" element={<BillingPage />} />
            <Route path="/tiwlo-pay/*" element={serviceRoute(SERVICE_MODULE_KEYS.tiwloPay, <TiwloPay />, '/management/tiwlo-pay')} />
            <Route path="/id-verification" element={<IdentityVerification user={user} onLogout={handleLogout} />} />
            <Route path="/tpanel" element={serviceRoute(SERVICE_MODULE_KEYS.tpanel, <TPanel />, '/management/tpanel')} />
            <Route path="/pay/:slug" element={<TiwloPayCheckout />} />
            <Route path="/api" element={<APIPage />} />
            <Route path="/droplets/create" element={<CreateDroplet />} />
            <Route path="/settings" element={<SettingsPage user={user} setUser={setUser} />} />
            <Route path="/verify-email" element={<VerifyEmail onLogin={(nextUser) => {
              setUser(nextUser);
              localStorage.setItem('tiwlo_user', JSON.stringify(nextUser));
            }} />} />
            <Route path="/email" element={<EmailPortal />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const storefrontHost = getStorefrontHostContext();
  const hasStorefrontHost = Boolean(storefrontHost);
  const isEmailHost = typeof window !== 'undefined' && /^(?:tmail|email)\./.test(window.location.hostname.toLowerCase());
  const [showWelcome, setShowWelcome] = useState(false);
  const [routerResetKey, setRouterResetKey] = useState(0);
  const [platformStatus, setPlatformStatus] = useState<{ loading: boolean; maintenance: boolean; whatsappEnabled: boolean }>({
    loading: true,
    maintenance: false,
    whatsappEnabled: false
  });

  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('tiwlo_user');
    const token = getAuthToken();
    if (saved && token) {
      const parsed = JSON.parse(saved);
      if (!parsed.role) parsed.role = 'user';
      return parsed;
    }
    localStorage.removeItem('tiwlo_user');
    return null;
  });

  const [droplets, setDroplets] = useState<Droplet[]>(() => {
    return [];
  });

  const [domains, setDomains] = useState<Domain[]>(() => {
    return [];
  });

  useEffect(() => {
    let isMounted = true;
    let idleId: number | undefined;
    let loadTimerId: number | undefined;
    const loadStatus = async () => {
      try {
        const status = await fetchPlatformStatusWithApi();
        if (isMounted) {
          setPlatformStatus({
            loading: false,
            maintenance: Boolean(status.maintenance?.enabled),
            whatsappEnabled: Boolean(status.whatsapp?.enabled)
          });
        }
      } catch {
        if (isMounted) setPlatformStatus({ loading: false, maintenance: false, whatsappEnabled: false });
      }
    };

    const beginStatusLoad = () => {
      const requestIdle = (window as any).requestIdleCallback as undefined | ((callback: () => void, options?: { timeout: number }) => number);
      if (requestIdle) {
        idleId = requestIdle(loadStatus, { timeout: 2500 });
        return;
      }
      loadStatus();
    };

    const scheduleInitialStatusLoad = () => {
      if (user || hasStorefrontHost || isEmailHost) {
        loadStatus();
        return;
      }
      loadTimerId = window.setTimeout(beginStatusLoad, PUBLIC_STATUS_DELAY_MS);
    };

    const startAfterWindowLoad = () => scheduleInitialStatusLoad();
    if (user || hasStorefrontHost || isEmailHost) {
      scheduleInitialStatusLoad();
    } else if (document.readyState === 'complete') {
      startAfterWindowLoad();
    } else {
      window.addEventListener('load', startAfterWindowLoad, { once: true });
    }
    window.addEventListener('tiwlo:platform-status-refresh', loadStatus);
    return () => {
      isMounted = false;
      const cancelIdle = (window as any).cancelIdleCallback as undefined | ((id: number) => void);
      if (idleId !== undefined) cancelIdle?.(idleId);
      if (loadTimerId !== undefined) window.clearTimeout(loadTimerId);
      window.removeEventListener('load', startAfterWindowLoad);
      window.removeEventListener('tiwlo:platform-status-refresh', loadStatus);
    };
  }, [hasStorefrontHost, isEmailHost, user?.id]);

  useEffect(() => {
    if (!user) return;
    if (platformStatus.maintenance && !isAdminRole(user)) return;

    let isMounted = true;

    const loadConsoleData = async () => {
      try {
        if (isRestrictedUser(user)) {
          const latestUser = await fetchCurrentUserWithApi();
          if (!isMounted) return;
          if (latestUser) {
            setUser(latestUser);
            localStorage.setItem('tiwlo_user', JSON.stringify(latestUser));
          }
          if (!latestUser || isRestrictedUser(latestUser)) {
            setDroplets([]);
            setDomains([]);
            return;
          }
        }

        const data = await fetchConsoleData();
        if (!isMounted) return;
        if (data.user) {
          setUser(data.user);
          localStorage.setItem('tiwlo_user', JSON.stringify(data.user));
        }
        if (isRestrictedUser(data.user)) {
          setDroplets([]);
          setDomains([]);
          return;
        }
        setDroplets(data.droplets);
        setDomains(data.domains);
      } catch {
        if (!isMounted) return;
        setDroplets([]);
        setDomains([]);
      }
    };

    loadConsoleData();
    const interval = window.setInterval(loadConsoleData, isRestrictedUser(user) ? 10000 : 30000);
    window.addEventListener('tiwlo:data-refresh', loadConsoleData);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
      window.removeEventListener('tiwlo:data-refresh', loadConsoleData);
    };
  }, [user?.id, user?.role, user?.status, platformStatus.maintenance]);

  useEffect(() => {
    if (!showWelcome) return undefined;
    const timer = window.setTimeout(() => setShowWelcome(false), 3000);
    return () => window.clearTimeout(timer);
  }, [showWelcome]);

  const resetAppRoute = (path = '/') => {
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', path);
    }
    setRouterResetKey((current) => current + 1);
  };

  const handleLogin = (authenticatedUser: User) => {
    resetAppRoute('/');
    setUser(authenticatedUser);
    localStorage.setItem('tiwlo_user', JSON.stringify(authenticatedUser));
    setShowWelcome(true);
  };

  const handleLogout = () => {
    resetAppRoute('/');
    setUser(null);
    setShowWelcome(false);
    clearAuthToken();
    localStorage.removeItem('tiwlo_user');
  };

  if (platformStatus.loading && user) {
    return null;
  }

  if (showWelcome && user && !isRestrictedUser(user) && (!platformStatus.maintenance || isAdminRole(user))) {
    return <WelcomeScreen />;
  }

  if (platformStatus.maintenance && !isAdminRole(user)) {
    const maintenanceLoginHref = storefrontHost
      ? `${window.location.protocol}//${storefrontHost.rootDomain}/login`
      : '/login';

    return (
      <ResettableRouter routerKey={`maintenance-${routerResetKey}`}>
        <Suspense fallback={<RouteLoader />}>
        <Routes>
          {!user && <Route path="/login" element={<LoginPage onLogin={handleLogin} maintenanceMode />} />}
          <Route path="*" element={<MaintenancePage user={user} onLogout={handleLogout} loginHref={maintenanceLoginHref} />} />
        </Routes>
        </Suspense>
      </ResettableRouter>
    );
  }

  if (isEmailHost) {
    return (
      <ResettableRouter routerKey={`email-${routerResetKey}`}>
        <Suspense fallback={<RouteLoader />}>
        <Routes>
          <Route path="*" element={<EmailPortal />} />
        </Routes>
        </Suspense>
      </ResettableRouter>
    );
  }

  if (storefrontHost) {
    return (
      <ResettableRouter routerKey={`storefront-${routerResetKey}`}>
        <Suspense fallback={<RouteLoader />}>
        <Routes>
          <Route path="/store/user/*" element={<StoreUserDashboard />} />
          <Route path="*" element={<StorefrontHost />} />
        </Routes>
        </Suspense>
      </ResettableRouter>
    );
  }

  if (!user) {
    return (
      <ResettableRouter routerKey={`public-${routerResetKey}`}>
        <Suspense fallback={<RouteLoader />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/services" element={<MarketingInfoPage variant="solutions" />} />
          <Route path="/products" element={<MarketingInfoPage variant="products" />} />
          <Route path="/api" element={<MarketingInfoPage variant="developers" />} />
          <Route path="/partners" element={<MarketingInfoPage variant="partners" />} />
          <Route path="/pricing" element={<MarketingInfoPage variant="pricing" />} />
          <Route path="/support" element={<MarketingInfoPage variant="support" />} />
          <Route path="/documentation" element={<DocumentationPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/bangladesh-hosting" element={<SeoTopicPage topicKey="bangladeshHosting" />} />
          <Route path="/cloud-vps-hosting" element={<SeoTopicPage topicKey="cloudVps" />} />
          <Route path="/tpanel-hosting" element={<SeoTopicPage topicKey="tpanelHosting" />} />
          <Route path="/whmcs-alternative" element={<SeoTopicPage topicKey="whmcsAlternative" />} />
          <Route path="/hosting-free-credit" element={<SeoTopicPage topicKey="freeCredit" />} />
          <Route path="/hosting-features" element={<SeoTopicPage topicKey="hostingFeatures" />} />
          <Route path="/commerce" element={<CommercePage />} />
          <Route path="/broadband" element={<BroadbandPage />} />
          <Route path="/pay/:slug" element={<TiwloPayCheckout />} />
          <Route path="/themes/eplaza/*" element={<EplazaPreview />} />
          <Route path="/themes/aura/*" element={<AuraPreview />} />
          <Route path="/themes/*" element={<AuraPreview />} />
          <Route path="/store/user/*" element={<StoreUserDashboard />} />
          <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
          <Route path="/signup" element={<SignupPage onSignup={handleLogin} />} />
          <Route path="/id-verification" element={<LoginPage onLogin={handleLogin} />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword onLogin={handleLogin} />} />
          <Route path="/verify-email" element={<VerifyEmail onLogin={handleLogin} />} />
          <Route path="/blocked" element={<TSecurityBlocked />} />
          <Route path="/email" element={<EmailPortal />} />
          <Route path="/terms" element={<LegalPage />} />
          <Route path="/privacy" element={<LegalPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </Suspense>
      </ResettableRouter>
    );
  }

  if (isRestrictedUser(user)) {
    return (
      <ResettableRouter routerKey={`restricted-${routerResetKey}`}>
        <Suspense fallback={<RouteLoader />}>
          <Routes>
            <Route path="/id-verification" element={<IdentityVerification user={user} onLogout={handleLogout} />} />
            <Route path="*" element={<BannedAccount user={user} onLogout={handleLogout} />} />
          </Routes>
        </Suspense>
        <Suspense fallback={null}>
          <FloatingAIWidget />
        </Suspense>
      </ResettableRouter>
    );
  }

  if (!['admin', 'super_admin'].includes(user.role) && !isProfileComplete(user)) {
    return (
      <ResettableRouter routerKey={`profile-${routerResetKey}`}>
        <Suspense fallback={<RouteLoader />}>
          <CompleteProfile user={user} setUser={setUser} onLogout={handleLogout} />
        </Suspense>
      </ResettableRouter>
    );
  }

  if (!isAdminRole(user) && user.promoCreditStatus === 'pending') {
    return (
      <ResettableRouter routerKey={`signup-promo-${routerResetKey}`}>
        <Suspense fallback={<RouteLoader />}>
          <SignupPromoVerificationRequired user={user} setUser={setUser} onLogout={handleLogout} />
        </Suspense>
      </ResettableRouter>
    );
  }

  if (!isAdminRole(user) && platformStatus.whatsappEnabled && user.whatsappVerificationRequired !== false && !user.whatsappVerifiedAt) {
    return (
      <ResettableRouter routerKey={`whatsapp-${routerResetKey}`}>
        <Suspense fallback={<RouteLoader />}>
          <WhatsAppVerificationRequired user={user} setUser={setUser} onLogout={handleLogout} />
        </Suspense>
      </ResettableRouter>
    );
  }

  return (
    <ResettableRouter routerKey={`app-${routerResetKey}`}>
      <ConsoleActionProvider>
        <AppContent
          user={user}
          setUser={setUser}
          droplets={droplets}
          setDroplets={setDroplets}
          domains={domains}
          setDomains={setDomains}
          handleLogout={handleLogout}
        />
      </ConsoleActionProvider>
      <Suspense fallback={null}>
        <FloatingAIWidgetMount />
      </Suspense>
    </ResettableRouter>
  );
}
