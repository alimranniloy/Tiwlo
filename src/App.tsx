import { lazy, Suspense, useState, useEffect, type ReactElement } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Droplet, Domain, User } from './types';

// Pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const DropletsPage = lazy(() => import('./pages/Droplets'));
const DomainsPage = lazy(() => import('./pages/Domains'));
const NetworkingPage = lazy(() => import('./pages/Networking'));
const SettingsPage = lazy(() => import('./pages/Settings'));
const TeamPage = lazy(() => import('./pages/Team'));
const BillingPage = lazy(() => import('./pages/Billing'));
const TiwloPay = lazy(() => import('./pages/TiwloPay'));
const TiwloPayCheckout = lazy(() => import('./pages/TiwloPayCheckout'));
const TPanel = lazy(() => import('./pages/TPanel'));
const APIPage = lazy(() => import('./pages/API'));
const VolumesPage = lazy(() => import('./pages/Volumes'));
const DatabasesPage = lazy(() => import('./pages/Databases'));
const InvoicesPage = lazy(() => import('./pages/Invoices'));
const ActivityPage = lazy(() => import('./pages/Activity'));
const AlertsPage = lazy(() => import('./pages/Alerts'));
const SupportPage = lazy(() => import('./pages/Support'));
const FirewallsPage = lazy(() => import('./pages/Firewalls'));
const AppsPage = lazy(() => import('./pages/Apps'));
const FunctionsPage = lazy(() => import('./pages/Functions'));
const MarketplacePage = lazy(() => import('./pages/Marketplace'));
const KubernetesPage = lazy(() => import('./pages/Kubernetes'));
const CloudStorePage = lazy(() => import('./pages/CloudStore'));
const StoreManagementPage = lazy(() => import('./pages/StoreManagement'));
const StoreAdminDashboard = lazy(() => import('./cloudstore/storeadmin/StoreAdminDashboard'));
const StoreUserDashboard = lazy(() => import('./cloudstore/userdashboard'));
const AuraPreview = lazy(() => import('./themes/aura').then((module) => ({ default: module.AuraPreview })));
const EplazaPreview = lazy(() => import('./themes/eplaza').then((module) => ({ default: module.EplazaPreview })));
const StorefrontHost = lazy(() => import('./themes/StorefrontHost'));
const ServicesPage = lazy(() => import('./pages/Services'));
const ProductsPage = lazy(() => import('./pages/Products'));
const CommercePage = lazy(() => import('./pages/Commerce'));
const BroadbandPage = lazy(() => import('./pages/Broadband'));
const DocumentationPage = lazy(() => import('./pages/Documentation'));
const CreateDroplet = lazy(() => import('./pages/CreateDroplet'));
const AdminDashboard = lazy(() => import('./pages/management/AdminDashboard'));
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
const AdminSecurity = lazy(() => import('./pages/management/AdminSecurity'));
const AdminCore = lazy(() => import('./pages/management/AdminCore'));
const AdminAiModel = lazy(() => import('./pages/management/AdminAiModel'));
const AdminSupport = lazy(() => import('./pages/management/AdminSupport'));
const AdminNotifications = lazy(() => import('./pages/management/AdminNotifications'));
const AdminEmail = lazy(() => import('./pages/management/AdminEmail'));
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
const LoginPage = lazy(() => import('./pages/Login'));
const SignupPage = lazy(() => import('./pages/Signup'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const EmailPortal = lazy(() => import('./pages/EmailPortal'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const BannedAccount = lazy(() => import('./pages/BannedAccount'));
const CompleteProfile = lazy(() => import('./pages/CompleteProfile'));
const GlobalLoader = lazy(() => import('./components/GlobalLoader'));
const FloatingAIWidget = lazy(() => import('./components/FloatingAIWidget'));
const ISPStorefront = lazy(() => import('./pages/isp/ISPStorefront'));
const ISPAddRouter = lazy(() => import('./pages/isp/ISPAddRouter'));
const ISPAdminRoot = lazy(() => import('./pages/isp/admin/ISPAdminRoot'));
import { clearAuthToken, fetchAdminModules, fetchConsoleData, getAuthToken } from './lib/tiwloApi';
import { getStorefrontHostContext } from './lib/storefrontHost';
import { isProfileComplete } from './lib/countries';
import { SERVICE_MODULE_GROUP, SERVICE_MODULE_KEYS, serviceEnabled } from './lib/serviceModules';

// Components
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import CubeLoader from './components/CubeLoader';

const restrictedStatuses = new Set(['banned', 'blocked', 'suspended', 'disabled']);

function RouteLoader() {
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  if (/^\/(?:login|signup|themes)(?:\/|$)/.test(pathname)) return null;
  return (
    <CubeLoader className="bg-transparent" />
  );
}

function isRestrictedUser(user?: User | null) {
  return restrictedStatuses.has(String(user?.status || '').toLowerCase());
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
                     location.pathname.startsWith('/pay/') ||
                     location.pathname === '/email';

  return (
    <div className="flex min-h-screen bg-[#F3F5F9] font-sans text-[#141414]">
      {!hideLayout && (
        <Sidebar 
          user={user}
          isOpen={isSidebarOpen} 
          setIsOpen={setIsSidebarOpen} 
          onLogout={handleLogout} 
        />
      )}
      
      <div className="flex-1 flex flex-col min-w-0">
        {!hideLayout && (
          <Header 
            user={user} 
            onLogout={handleLogout} 
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
          />
        )}
        
        <main className={`flex-1 overflow-y-auto ${hideLayout ? '' : 'p-3 md:p-8'}`}>
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
                <Route path="/management/payments" element={<AdminPayments />} />
                <Route path="/management/tiwlo-pay" element={<AdminTiwloPay />} />
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
                <Route path="/management/security" element={<AdminSecurity />} />
                <Route path="/management/core" element={<AdminCore />} />
                <Route path="/management/ai-model" element={<AdminAiModel />} />
                <Route path="/management/settings" element={<AdminCore />} />
                <Route path="/management/backup" element={<AdminBackup />} />
                <Route path="/management/ssl" element={<AdminSsl />} />
                <Route path="/management/support" element={<AdminSupport />} />
                <Route path="/management/taxes" element={<AdminSectionRecords sectionKey="taxes" />} />
                <Route path="/management/currencies" element={<AdminCurrencies />} />
                <Route path="/management/store-products" element={<AdminStoreProducts />} />
                <Route path="/management/cloud-templates" element={<AdminSectionRecords sectionKey="cloudTemplates" />} />
                <Route path="/management/resources/:kind" element={<AdminResourcesPage />} />
                <Route path="/management/api" element={<APIPage />} />
                <Route path="/management/*" element={<AdminDashboard user={user} />} />
              </>
            ) : (
              <Route path="/" element={<Dashboard user={user} droplets={droplets} domains={domains} />} />
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
            <Route path="/firewalls" element={<FirewallsPage />} />
            <Route path="/apps" element={<AppsPage />} />
            <Route path="/functions" element={<FunctionsPage />} />
            <Route path="/marketplace" element={<MarketplacePage />} />
            <Route path="/kubernetes" element={<KubernetesPage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/commerce" element={<CommercePage />} />
            <Route path="/broadband" element={<BroadbandPage />} />
            <Route path="/documentation" element={<DocumentationPage />} />
            <Route path="/team" element={<TeamPage user={user} />} />
            <Route path="/billing" element={<BillingPage />} />
            <Route path="/tiwlo-pay/*" element={serviceRoute(SERVICE_MODULE_KEYS.tiwloPay, <TiwloPay />, '/management/tiwlo-pay')} />
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
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const [appInitializing, setAppInitializing] = useState(false);
  const storefrontHost = getStorefrontHostContext();
  const isEmailHost = typeof window !== 'undefined' && /^(?:tmail|email)\./.test(window.location.hostname.toLowerCase());

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
    if (!user) return;
    if (isRestrictedUser(user)) {
      setDroplets([]);
      setDomains([]);
      return;
    }

    let isMounted = true;

    const loadConsoleData = async () => {
      try {
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
    window.addEventListener('tiwlo:data-refresh', loadConsoleData);

    return () => {
      isMounted = false;
      window.removeEventListener('tiwlo:data-refresh', loadConsoleData);
    };
  }, [user?.id]);

  const handleLogin = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    localStorage.setItem('tiwlo_user', JSON.stringify(authenticatedUser));
  };

  const handleLogout = () => {
    setUser(null);
    clearAuthToken();
    localStorage.removeItem('tiwlo_user');
  };

  if (appInitializing) {
    return (
      <Suspense fallback={<RouteLoader />}>
        <GlobalLoader onComplete={() => setAppInitializing(false)} />
      </Suspense>
    );
  }

  if (isEmailHost) {
    return (
      <Router>
        <Suspense fallback={<RouteLoader />}>
        <Routes>
          <Route path="*" element={<EmailPortal />} />
        </Routes>
        </Suspense>
      </Router>
    );
  }

  if (storefrontHost) {
    return (
      <Router>
        <Suspense fallback={<RouteLoader />}>
        <Routes>
          <Route path="/store/user/*" element={<StoreUserDashboard />} />
          <Route path="*" element={<StorefrontHost />} />
        </Routes>
        </Suspense>
      </Router>
    );
  }

  if (!user) {
    return (
      <Router>
        <Suspense fallback={<RouteLoader />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/commerce" element={<CommercePage />} />
          <Route path="/broadband" element={<BroadbandPage />} />
          <Route path="/pay/:slug" element={<TiwloPayCheckout />} />
          <Route path="/themes/eplaza/*" element={<EplazaPreview />} />
          <Route path="/themes/aura/*" element={<AuraPreview />} />
          <Route path="/themes/*" element={<AuraPreview />} />
          <Route path="/store/user/*" element={<StoreUserDashboard />} />
          <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
          <Route path="/signup" element={<SignupPage onSignup={handleLogin} />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword onLogin={handleLogin} />} />
          <Route path="/verify-email" element={<VerifyEmail onLogin={handleLogin} />} />
          <Route path="/email" element={<EmailPortal />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </Router>
    );
  }

  if (isRestrictedUser(user)) {
    return (
      <Router>
        <Suspense fallback={<RouteLoader />}>
          <BannedAccount user={user} onLogout={handleLogout} />
        </Suspense>
      </Router>
    );
  }

  if (!['admin', 'super_admin'].includes(user.role) && !isProfileComplete(user)) {
    return (
      <Router>
        <Suspense fallback={<RouteLoader />}>
          <CompleteProfile user={user} setUser={setUser} onLogout={handleLogout} />
        </Suspense>
      </Router>
    );
  }

  return (
    <Router>
      <AppContent 
        user={user} 
        setUser={setUser} 
        droplets={droplets} 
        setDroplets={setDroplets} 
        domains={domains} 
        setDomains={setDomains} 
        handleLogout={handleLogout} 
      />
      <Suspense fallback={null}>
        <FloatingAIWidget />
      </Suspense>
    </Router>
  );
}
