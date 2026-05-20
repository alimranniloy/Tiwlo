import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Droplet, Domain, User } from './types';

// Pages
import Dashboard from './pages/Dashboard';
import DropletsPage from './pages/Droplets';
import DomainsPage from './pages/Domains';
import NetworkingPage from './pages/Networking';
import SettingsPage from './pages/Settings';
import TeamPage from './pages/Team';
import BillingPage from './pages/Billing';
import TiwloPay from './pages/TiwloPay';
import TiwloPayCheckout from './pages/TiwloPayCheckout';
import APIPage from './pages/API';
import VolumesPage from './pages/Volumes';
import DatabasesPage from './pages/Databases';
import InvoicesPage from './pages/Invoices';
import ActivityPage from './pages/Activity';
import AlertsPage from './pages/Alerts';
import SupportPage from './pages/Support';
import FirewallsPage from './pages/Firewalls';
import AppsPage from './pages/Apps';
import FunctionsPage from './pages/Functions';
import MarketplacePage from './pages/Marketplace';
import KubernetesPage from './pages/Kubernetes';
import CloudStorePage from './pages/CloudStore';
import StoreManagementPage from './pages/StoreManagement';
import StoreAdminDashboard from './cloudstore/storeadmin/StoreAdminDashboard';
import StoreUserDashboard from './cloudstore/userdashboard';
import { AuraPreview } from './themes/aura';
import { EplazaPreview } from './themes/eplaza';
import StorefrontHost from './themes/StorefrontHost';
import ServicesPage from './pages/Services';
import ProductsPage from './pages/Products';
import CommercePage from './pages/Commerce';
import BroadbandPage from './pages/Broadband';
import DocumentationPage from './pages/Documentation';
import CreateDroplet from './pages/CreateDroplet';
import AdminDashboard from './pages/management/AdminDashboard';
import UserManagement from './pages/management/UserManagement';
import SystemLogs from './pages/management/SystemLogs';
import AddSystemServer from './pages/management/AddSystemServer';
import AdminPayments from './pages/management/AdminPayments';
import AdminTiwloPay from './pages/management/AdminTiwloPay';
import AdminDomains from './pages/management/AdminDomains';
import AdminIdentity from './pages/management/AdminIdentity';
import AdminPlugins from './pages/management/AdminPlugins';
import AdminSecurity from './pages/management/AdminSecurity';
import AdminCore from './pages/management/AdminCore';
import AdminAiModel from './pages/management/AdminAiModel';
import AdminSupport from './pages/management/AdminSupport';
import AdminNotifications from './pages/management/AdminNotifications';
import AdminPlans from './pages/management/AdminPlans';
import AdminCurrencies from './pages/management/AdminCurrencies';
import AdminResourcesPage from './pages/management/AdminResourcesPage';
import AdminSectionRecords from './pages/management/AdminSectionRecords';
import AdminServiceStatistics from './pages/management/AdminServiceStatistics';
import AdminStoreProducts from './pages/management/AdminStoreProducts';
import EcommerceLayout from './pages/management/EcommerceLayout';
import EcommerceCreateStore from './pages/management/ecommerce/EcommerceCreateStore';
import EcommerceControlPage from './pages/management/ecommerce/EcommerceControlPage';
import ModulePlaceholder from './pages/management/ecommerce/ModulePlaceholder';
import IspLayout from './pages/management/IspLayout';
import IspDashboard from './pages/management/isp/IspDashboard';
import IspClientManagement from './pages/management/isp/IspClientManagement';
import LoginPage from './pages/Login';
import SignupPage from './pages/Signup';
import LandingPage from './pages/LandingPage';
import BannedAccount from './pages/BannedAccount';
import GlobalLoader from './components/GlobalLoader';
import FloatingAIWidget from './components/FloatingAIWidget';
import ISPStorefront from './pages/isp/ISPStorefront';
import ISPAddRouter from './pages/isp/ISPAddRouter';
import ISPAdminRoot from './pages/isp/admin/ISPAdminRoot';
import { clearAuthToken, fetchConsoleData, getAuthToken } from './lib/tiwloApi';
import { getStorefrontHostContext } from './lib/storefrontHost';

// Components
import Sidebar from './components/Sidebar';
import Header from './components/Header';

const restrictedStatuses = new Set(['banned', 'blocked', 'suspended', 'disabled']);

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

  useEffect(() => {
    setIsSidebarOpen(false); // Close sidebar on route change
  }, [location.pathname]);

  const hideLayout = location.pathname.startsWith('/store/admin') || 
                     location.pathname.startsWith('/store/user') || 
                     location.pathname.startsWith('/themes') || 
                     location.pathname.startsWith('/isp-billing/admin') ||
                     location.pathname.startsWith('/management/ecommerce') ||
                     location.pathname.startsWith('/management/isp') ||
                     location.pathname.startsWith('/pay/');

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
          <Routes>
            {['admin', 'super_admin'].includes(user.role) ? (
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
                <Route path="/management/payments" element={<AdminPayments />} />
                <Route path="/management/tiwlo-pay" element={<AdminTiwloPay />} />
                <Route path="/management/invoices" element={<InvoicesPage adminMode />} />
                <Route path="/management/plans" element={<AdminPlans />} />
                <Route path="/management/domains" element={<AdminDomains />} />
                <Route path="/management/identity" element={<AdminIdentity />} />
                <Route path="/management/contact-groups" element={<AdminSectionRecords sectionKey="contactGroups" />} />
                <Route path="/management/plugins" element={<AdminPlugins />} />
                <Route path="/management/security" element={<AdminSecurity />} />
                <Route path="/management/core" element={<AdminCore />} />
                <Route path="/management/ai-model" element={<AdminAiModel />} />
                <Route path="/management/settings" element={<AdminCore />} />
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
            <Route path="/store" element={<CloudStorePage />} />
            <Route path="/store/create" element={<EcommerceCreateStore />} />
            <Route path="/store/management" element={<StoreManagementPage />} />
            <Route path="/store/admin/*" element={<StoreAdminDashboard />} />
            <Route path="/store/user/*" element={<StoreUserDashboard />} />
            <Route path="/themes/eplaza/*" element={<EplazaPreview />} />
            <Route path="/themes/aura/*" element={<AuraPreview />} />
            <Route path="/themes/*" element={<AuraPreview />} />
            <Route path="/isp-billing" element={<ISPStorefront />} />
            <Route path="/isp-billing/add-router" element={<ISPAddRouter />} />
            <Route path="/isp-billing/admin/*" element={<ISPAdminRoot />} />
            <Route 
              path="/domains" 
              element={<DomainsPage domains={domains} setDomains={setDomains} />} 
            />
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
            <Route path="/tiwlo-pay/*" element={<TiwloPay />} />
            <Route path="/pay/:slug" element={<TiwloPayCheckout />} />
            <Route path="/api" element={<APIPage />} />
            <Route path="/droplets/create" element={<CreateDroplet />} />
            <Route path="/settings" element={<SettingsPage user={user} setUser={setUser} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const [appInitializing, setAppInitializing] = useState(false);
  const storefrontHost = getStorefrontHostContext();

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
    return <GlobalLoader onComplete={() => setAppInitializing(false)} />;
  }

  if (storefrontHost) {
    return (
      <Router>
        <Routes>
          <Route path="/store/user/*" element={<StoreUserDashboard />} />
          <Route path="*" element={<StorefrontHost />} />
        </Routes>
      </Router>
    );
  }

  if (!user) {
    return (
      <Router>
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    );
  }

  if (isRestrictedUser(user)) {
    return (
      <Router>
        <BannedAccount user={user} onLogout={handleLogout} />
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
      <FloatingAIWidget />
    </Router>
  );
}
