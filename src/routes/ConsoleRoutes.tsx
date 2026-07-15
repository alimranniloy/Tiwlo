import { lazy, Suspense, useEffect, useState, type ReactElement, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { Domain, Droplet, User } from '../types';
import { fetchAdminModules } from '../lib/api/appBootstrap';
import { SERVICE_MODULE_GROUP, SERVICE_MODULE_KEYS, serviceEnabled } from '../lib/serviceModules';
import TiwloRouteLoader from '../components/TiwloRouteLoader';

const ActionConfirmationProvider = lazy(() => import('../components/ActionConfirmation').then((module) => ({ default: module.ActionConfirmationProvider })));
const Sidebar = lazy(() => import('../components/Sidebar'));
const Header = lazy(() => import('../components/Header'));
const FloatingAIWidget = lazy(() => import('../components/FloatingAIWidget'));
const Dashboard = lazy(() => import('../pages/Dashboard'));
const ServicesPage = lazy(() => import('../pages/Services'));
const ProductsPage = lazy(() => import('../pages/Products'));
const CommercePage = lazy(() => import('../pages/Commerce'));
const BroadbandPage = lazy(() => import('../pages/Broadband'));
const TiwloPayCheckout = lazy(() => import('../pages/TiwloPayCheckout'));
const AdminDashboard = lazy(() => import('../pages/management/AdminDashboard'));
const VerifyEmail = lazy(() => import('../pages/VerifyEmail'));
const EmailPortal = lazy(() => import('../pages/EmailPortal'));
const NotFoundPage = lazy(() => import('../pages/NotFound'));
const AuraPreview = lazy(() => import('../themes/aura').then((module) => ({ default: module.AuraPreview })));
const EplazaPreview = lazy(() => import('../themes/eplaza').then((module) => ({ default: module.EplazaPreview })));
const DropletsPage = lazy(() => import('../pages/Droplets'));
const DomainsPage = lazy(() => import('../pages/Domains'));
const NetworkingPage = lazy(() => import('../pages/Networking'));
const SettingsPage = lazy(() => import('../pages/Settings'));
const TeamPage = lazy(() => import('../pages/Team'));
const BillingPage = lazy(() => import('../pages/Billing'));
const TiwloPay = lazy(() => import('../pages/TiwloPay'));
const IdentityVerification = lazy(() => import('../pages/IdentityVerification'));
const TPanel = lazy(() => import('../pages/TPanel'));
const APIPage = lazy(() => import('../pages/API'));
const VolumesPage = lazy(() => import('../pages/Volumes'));
const DatabasesPage = lazy(() => import('../pages/Databases'));
const InvoicesPage = lazy(() => import('../pages/Invoices'));
const ActivityPage = lazy(() => import('../pages/Activity'));
const AlertsPage = lazy(() => import('../pages/Alerts'));
const SupportPage = lazy(() => import('../pages/Support'));
const CreateSupportTicket = lazy(() => import('../pages/CreateSupportTicket'));
const FirewallsPage = lazy(() => import('../pages/Firewalls'));
const AppsPage = lazy(() => import('../pages/Apps'));
const FunctionsPage = lazy(() => import('../pages/Functions'));
const MarketplacePage = lazy(() => import('../pages/Marketplace'));
const KubernetesPage = lazy(() => import('../pages/Kubernetes'));
const LegalPage = lazy(() => import('../pages/LegalPage'));
const AboutPage = lazy(() => import('../pages/About'));
const SeoTopicPage = lazy(() => import('../pages/SeoTopicPage'));
const CloudStorePage = lazy(() => import('../pages/CloudStore'));
const StoreManagementPage = lazy(() => import('../pages/StoreManagement'));
const StoreAdminDashboard = lazy(() => import('../cloudstore/storeadmin/StoreAdminDashboard'));
const StoreUserDashboard = lazy(() => import('../cloudstore/userdashboard'));
const DocumentationPage = lazy(() => import('../pages/Documentation'));
const CreateDroplet = lazy(() => import('../pages/CreateDroplet'));
const UserManagement = lazy(() => import('../pages/management/UserManagement'));
const SystemLogs = lazy(() => import('../pages/management/SystemLogs'));
const AddSystemServer = lazy(() => import('../pages/management/AddSystemServer'));
const AdminPayments = lazy(() => import('../pages/management/AdminPayments'));
const AdminTiwloPay = lazy(() => import('../pages/management/AdminTiwloPay'));
const AdminTPanel = lazy(() => import('../pages/management/AdminTPanel'));
const AdminDomains = lazy(() => import('../pages/management/AdminDomains'));
const AdminDns = lazy(() => import('../pages/management/AdminDns'));
const AdminDnsHostnames = lazy(() => import('../pages/management/AdminDnsHostnames'));
const AdminIdentity = lazy(() => import('../pages/management/AdminIdentity'));
const AdminPlugins = lazy(() => import('../pages/management/AdminPlugins'));
const AdminDiscordBot = lazy(() => import('../pages/management/AdminDiscordBot'));
const AdminSecurity = lazy(() => import('../pages/management/AdminSecurity'));
const AdminCore = lazy(() => import('../pages/management/AdminCore'));
const AdminAiModel = lazy(() => import('../pages/management/AdminAiModel'));
const AdminSupport = lazy(() => import('../pages/management/AdminSupport'));
const AdminIdentityVerification = lazy(() => import('../pages/management/AdminIdentityVerification'));
const AdminNotifications = lazy(() => import('../pages/management/AdminNotifications'));
const AdminSocial = lazy(() => import('../pages/management/AdminSocial'));
const AdminEmail = lazy(() => import('../pages/management/AdminEmail'));
const AdminWhatsAppApi = lazy(() => import('../pages/management/AdminWhatsAppApi'));
const AdminPlans = lazy(() => import('../pages/management/AdminPlans'));
const AdminCurrencies = lazy(() => import('../pages/management/AdminCurrencies'));
const AdminResourcesPage = lazy(() => import('../pages/management/AdminResourcesPage'));
const AdminSectionRecords = lazy(() => import('../pages/management/AdminSectionRecords'));
const AdminServiceStatistics = lazy(() => import('../pages/management/AdminServiceStatistics'));
const AdminStoreProducts = lazy(() => import('../pages/management/AdminStoreProducts'));
const AdminBackup = lazy(() => import('../pages/management/AdminBackup'));
const AdminSsl = lazy(() => import('../pages/management/AdminSsl'));
const EcommerceLayout = lazy(() => import('../pages/management/EcommerceLayout'));
const EcommerceCreateStore = lazy(() => import('../pages/management/ecommerce/EcommerceCreateStore'));
const EcommerceControlPage = lazy(() => import('../pages/management/ecommerce/EcommerceControlPage'));
const ModulePlaceholder = lazy(() => import('../pages/management/ecommerce/ModulePlaceholder'));
const IspLayout = lazy(() => import('../pages/management/IspLayout'));
const IspDashboard = lazy(() => import('../pages/management/isp/IspDashboard'));
const IspClientManagement = lazy(() => import('../pages/management/isp/IspClientManagement'));
const MarketingInfoPage = lazy(() => import('../pages/MarketingInfoPage'));
const ISPStorefront = lazy(() => import('../pages/isp/ISPStorefront'));
const ISPAddRouter = lazy(() => import('../pages/isp/ISPAddRouter'));
const ISPAdminRoot = lazy(() => import('../pages/isp/admin/ISPAdminRoot'));

function RouteLoader() {
  return <TiwloRouteLoader />;
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

type ConsoleRoutesProps = {
  user: User;
  setUser: (user: User | null) => void;
  droplets: Droplet[];
  setDroplets: (droplets: Droplet[]) => void;
  domains: Domain[];
  setDomains: (domains: Domain[]) => void;
  handleLogout: () => void;
};

function ConsoleContent({
  user,
  setUser,
  droplets,
  setDroplets,
  domains,
  setDomains,
  handleLogout
}: ConsoleRoutesProps) {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [serviceModules, setServiceModules] = useState<any[]>([]);
  const isAdminUser = ['admin', 'super_admin'].includes(user.role);

  useEffect(() => {
    setIsSidebarOpen(false);
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
                  <Route path="/management/social" element={<AdminSocial />} />
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

              <Route path="/droplets" element={<DropletsPage droplets={droplets} setDroplets={setDroplets} />} />
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
              <Route path="/domains" element={<DomainsPage domains={domains} setDomains={setDomains} />} />
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
              <Route path="/developers" element={<MarketingInfoPage variant="developers" />} />
              <Route path="/broadband" element={<BroadbandPage />} />
              <Route path="/documentation" element={<DocumentationPage />} />
              <Route path="/team" element={<TeamPage user={user} />} />
              <Route path="/billing" element={<BillingPage />} />
              <Route path="/tiwlo-pay/*" element={serviceRoute(SERVICE_MODULE_KEYS.tiwloPay, <TiwloPay />, '/management/tiwlo-pay')} />
              <Route path="/id-verification" element={<IdentityVerification user={user} onLogout={handleLogout} />} />
              <Route path="/tpanel" element={serviceRoute(SERVICE_MODULE_KEYS.tpanel, <TPanel />, '/management/tpanel')} />
              <Route path="/pay/:slug" element={<TiwloPayCheckout />} />
              <Route path="/api-tokens" element={<APIPage />} />
              <Route path="/api" element={<Navigate to="/api-tokens" replace />} />
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

export default function ConsoleRoutes(props: ConsoleRoutesProps) {
  return (
    <>
      <ConsoleActionProvider>
        <ConsoleContent {...props} />
      </ConsoleActionProvider>
      <Suspense fallback={null}>
        <FloatingAIWidgetMount />
      </Suspense>
    </>
  );
}
