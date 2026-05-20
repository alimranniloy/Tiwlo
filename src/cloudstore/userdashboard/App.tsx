import React from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Auth } from './components/Auth';
import { Dashboard } from './components/Dashboard';
import {
  clearStoreCustomerSession,
  fetchPrimaryStore,
  fetchStoreCustomerDashboardWithApi,
  fetchStoreThemeRuntime,
  loginStoreCustomerWithApi,
  registerStoreCustomerWithApi,
  type StoreCustomerDashboard
} from '../../lib/tiwloApi';
import { getStorefrontHostContext } from '../../lib/storefrontHost';

const blockedStatuses = new Set(['deleted', 'disabled', 'blocked', 'banned', 'suspended']);

function useStoreLocator() {
  const [params] = useSearchParams();
  const location = useLocation();
  return React.useMemo(() => {
    const hostContext = getStorefrontHostContext();
    return {
      storeId: params.get('storeId') || undefined,
      slug: params.get('slug') || hostContext?.slug || undefined,
      domain: params.get('domain') || hostContext?.domain || (!hostContext?.slug ? hostContext?.hostname : undefined),
      themeKey: params.get('theme') || undefined,
      mode: location.pathname.includes('/register') || params.get('mode') === 'register' ? 'register' as const : 'login' as const
    };
  }, [location.pathname, params]);
}

export default function StoreCustomerDashboardApp() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const locator = useStoreLocator();
  const [dashboard, setDashboard] = React.useState<StoreCustomerDashboard | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [authBusy, setAuthBusy] = React.useState(false);
  const [error, setError] = React.useState('');

  const loadPublicStore = React.useCallback(async () => {
    const fallbackStore = locator.storeId || locator.slug || locator.domain
      ? null
      : await fetchPrimaryStore().catch(() => null);
    const data = await fetchStoreThemeRuntime({
      storeId: locator.storeId || fallbackStore?.id,
      slug: locator.slug,
      domain: locator.domain,
      themeKey: locator.themeKey,
      templateKey: locator.themeKey,
      preview: false
    });
    setDashboard({
      store: data.store,
      activeTheme: data.activeTheme,
      settings: data.settings,
      customer: { id: '', name: '', email: '', status: 'guest', tier: 'guest', points: 0 },
      orders: [],
      products: data.products,
      categories: data.categories,
      records: data.records,
      stats: {}
    });
  }, [locator.domain, locator.slug, locator.storeId, locator.themeKey]);

  const loadDashboard = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const fallbackStore = locator.storeId || locator.slug || locator.domain
        ? null
        : await fetchPrimaryStore().catch(() => null);
      const data = await fetchStoreCustomerDashboardWithApi({
        storeId: locator.storeId || fallbackStore?.id,
        slug: locator.slug,
        domain: locator.domain,
        themeKey: locator.themeKey
      });
      if (blockedStatuses.has(String(data.customer.status || '').toLowerCase())) {
        clearStoreCustomerSession(data.store.id);
        throw new Error('This customer account is not active.');
      }
      setDashboard(data);
    } catch (err) {
      await loadPublicStore();
      setError(err instanceof Error ? err.message : '');
    } finally {
      setLoading(false);
    }
  }, [loadPublicStore, locator.domain, locator.slug, locator.storeId, locator.themeKey]);

  React.useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const submitAuth = async (input: Record<string, any>) => {
    setAuthBusy(true);
    setError('');
    try {
      const payload = locator.mode === 'register'
        ? await registerStoreCustomerWithApi({
          storeId: dashboard?.store?.id || locator.storeId,
          slug: locator.slug,
          domain: locator.domain,
          themeKey: locator.themeKey || dashboard?.activeTheme?.key,
          name: input.name,
          email: input.email,
          password: input.password,
          phone: input.phone,
          address: input.address ? { line1: input.address } : undefined
        })
        : await loginStoreCustomerWithApi({
          storeId: dashboard?.store?.id || locator.storeId,
          slug: locator.slug,
          domain: locator.domain,
          themeKey: locator.themeKey || dashboard?.activeTheme?.key,
          email: input.email,
          password: input.password
        });
      setDashboard(payload.dashboard);
      const nextParams = new URLSearchParams(params);
      nextParams.set('storeId', payload.dashboard.store.id);
      nextParams.set('theme', payload.dashboard.activeTheme.key);
      nextParams.delete('mode');
      setParams(nextParams, { replace: true });
      navigate(`/store/user?${nextParams.toString()}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to authenticate');
    } finally {
      setAuthBusy(false);
    }
  };

  const switchMode = () => {
    const nextParams = new URLSearchParams(params);
    nextParams.set('mode', locator.mode === 'login' ? 'register' : 'login');
    navigate(`/store/user/${locator.mode === 'login' ? 'register' : 'login'}?${nextParams.toString()}`);
  };

  const logout = () => {
    clearStoreCustomerSession(dashboard?.store?.id);
    const nextParams = new URLSearchParams(params);
    nextParams.set('mode', 'login');
    setDashboard((current) => current ? {
      ...current,
      customer: { id: '', name: '', email: '', status: 'guest', tier: 'guest', points: 0 },
      orders: [],
      stats: {}
    } : current);
    navigate(`/store/user/login?${nextParams.toString()}`, { replace: true });
  };

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f4f4f4]">
        <div className="rounded-sm border border-[#e6e6e6] bg-white px-6 py-4 text-xs font-black uppercase tracking-widest text-[#999]">Loading customer dashboard...</div>
      </div>
    );
  }

  if (!dashboard?.customer?.id) {
    return <Auth dashboard={dashboard} mode={locator.mode} error={error} busy={authBusy} onSwitch={switchMode} onSubmit={submitAuth} />;
  }

  return (
    <Routes>
      <Route path="login" element={<Navigate to={`/store/user?${params.toString()}`} replace />} />
      <Route path="register" element={<Navigate to={`/store/user?${params.toString()}`} replace />} />
      <Route path="*" element={<Dashboard dashboard={dashboard} params={params} onReload={loadDashboard} onLogout={logout} />} />
    </Routes>
  );
}
