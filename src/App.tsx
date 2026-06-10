import { Fragment, lazy, startTransition, Suspense, useEffect, useState, type ReactNode } from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import type { Domain, Droplet, User } from './types';
import { clearAuthToken, fetchConsoleData, fetchCurrentUserWithApi, fetchPlatformStatusWithApi, getAuthToken } from './lib/api/appBootstrap';
import { getStorefrontHostContext } from './lib/storefrontHost';
import { isProfileComplete } from './lib/profileCompletion';
import { clearTSecurityClientState } from '../tSecurity/client/tSecurityClient';
import TiwloRouteLoader from './components/TiwloRouteLoader';

const loadPublicRoutes = () => import('./routes/PublicRoutes');
const loadConsoleRoutes = () => import('./routes/ConsoleRoutes');

const PublicRoutes = lazy(loadPublicRoutes);
const ConsoleRoutes = lazy(loadConsoleRoutes);
const TrackingScripts = lazy(() => import('./components/TrackingScripts'));
const FloatingAIWidget = lazy(() => import('./components/FloatingAIWidget'));
const LoginPage = lazy(() => import('./pages/Login'));
const EmailPortal = lazy(() => import('./pages/EmailPortal'));
const BannedAccount = lazy(() => import('./pages/BannedAccount'));
const MaintenancePage = lazy(() => import('./pages/Maintenance'));
const CompleteProfile = lazy(() => import('./pages/CompleteProfile'));
const StorefrontHost = lazy(() => import('./themes/StorefrontHost'));
const StoreUserDashboard = lazy(() => import('./cloudstore/userdashboard'));
const IdentityVerification = lazy(() => import('./pages/IdentityVerification'));
const WhatsAppVerificationRequired = lazy(() => import('./pages/WhatsAppVerificationRequired'));
const SignupPromoVerificationRequired = lazy(() => import('./pages/SignupPromoVerificationRequired'));

const restrictedStatuses = new Set(['banned', 'blocked', 'suspended', 'disabled']);
const PUBLIC_STATUS_DELAY_MS = 12000;
const TRACKING_MOUNT_DELAY_MS = 9000;

function RouteLoader() {
  return <TiwloRouteLoader />;
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

function PublicEntry({ onLogin }: { onLogin: (user: User) => void }) {
  const location = useLocation();

  useEffect(() => {
    if (['/login', '/signup', '/verify-email', '/reset-password'].includes(location.pathname)) {
      void loadConsoleRoutes();
    }
  }, [location.pathname]);

  if (location.pathname === '/') return <LandingPage />;

  return (
    <Suspense fallback={<RouteLoader />}>
      <PublicRoutes onLogin={onLogin} />
    </Suspense>
  );
}

function isRestrictedUser(user?: User | null) {
  if (isAdminRole(user)) return false;
  return restrictedStatuses.has(String(user?.status || '').toLowerCase());
}

function isAdminRole(user?: User | null) {
  return ['admin', 'super_admin'].includes(String(user?.role || '').toLowerCase());
}

export default function App() {
  const storefrontHost = getStorefrontHostContext();
  const hasStorefrontHost = Boolean(storefrontHost);
  const isEmailHost = typeof window !== 'undefined' && /^(?:tmail|email)\./.test(window.location.hostname.toLowerCase());
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

  const [droplets, setDroplets] = useState<Droplet[]>(() => []);
  const [domains, setDomains] = useState<Domain[]>(() => []);

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

  const resetAppRoute = (path = '/') => {
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', path);
    }
    setRouterResetKey((current) => current + 1);
  };

  const handleLogin = (authenticatedUser: User) => {
    if (!isRestrictedUser(authenticatedUser)) void loadConsoleRoutes();
    localStorage.setItem('tiwlo_user', JSON.stringify(authenticatedUser));
    startTransition(() => {
      resetAppRoute('/');
      setUser(authenticatedUser);
    });
  };

  const handleLogout = () => {
    clearAuthToken();
    clearTSecurityClientState();
    localStorage.removeItem('tiwlo_user');
    startTransition(() => {
      setUser(null);
      resetAppRoute('/');
    });
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
        <PublicEntry onLogin={handleLogin} />
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
      <Suspense fallback={<RouteLoader />}>
        <ConsoleRoutes
          user={user}
          setUser={setUser}
          droplets={droplets}
          setDroplets={setDroplets}
          domains={domains}
          setDomains={setDomains}
          handleLogout={handleLogout}
        />
      </Suspense>
    </ResettableRouter>
  );
}
