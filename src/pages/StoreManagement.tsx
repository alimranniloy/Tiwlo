import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronRight,
  Copy,
  CreditCard,
  ExternalLink,
  Globe,
  HelpCircle,
  Link as LinkIcon,
  MessageSquare,
  Package,
  Plus,
  RefreshCw,
  Save,
  Server,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  Truck,
  Users
} from 'lucide-react';
import {
  deleteStoreWithApi,
  fetchStoreCustomersForAdmin,
  fetchStoreOrdersForAdmin,
  fetchStoreProductsForAdmin,
  fetchStoresWithApi,
  updateStoreWithApi
} from '../lib/tiwloApi';
import { useActionConfirmation } from '../components/ActionConfirmation';

const nameservers = ['ns1.tiwlo.com', 'ns2.tiwlo.com'];

function themeKey(store: any) {
  return String(store?.settings?.theme || 'aura').toLowerCase();
}

function normalizeDomain(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '')
    .replace(/^\.+|\.+$/g, '');
}

export default function StoreManagement() {
  const navigate = useNavigate();
  const location = useLocation();
  const [stores, setStores] = React.useState<any[]>([]);
  const [store, setStore] = React.useState<any>(null);
  const [products, setProducts] = React.useState<any[]>([]);
  const [orders, setOrders] = React.useState<any[]>([]);
  const [customers, setCustomers] = React.useState<any[]>([]);
  const [domainInput, setDomainInput] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');
  const [savingDomain, setSavingDomain] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [copied, setCopied] = React.useState('');
  const { confirmDelete } = useActionConfirmation();

  const loadManagementData = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const nextStores = await fetchStoresWithApi();
      const requestedStoreId = new URLSearchParams(location.search).get('storeId');
      const nextStore = nextStores.find((item) => item.id === requestedStoreId)
        || nextStores.find((item) => String(item.status).toLowerCase() === 'active')
        || nextStores[0]
        || null;

      setStores(nextStores);
      setStore(nextStore);
      setDomainInput(nextStore?.customDomain || '');

      if (!nextStore) {
        setProducts([]);
        setOrders([]);
        setCustomers([]);
        return;
      }

      const [nextProducts, nextOrders, nextCustomers] = await Promise.all([
        fetchStoreProductsForAdmin(nextStore.id),
        fetchStoreOrdersForAdmin(nextStore.id),
        fetchStoreCustomersForAdmin(nextStore.id)
      ]);
      setProducts(nextProducts);
      setOrders(nextOrders);
      setCustomers(nextCustomers);
    } catch (err) {
      setStores([]);
      setStore(null);
      setProducts([]);
      setOrders([]);
      setCustomers([]);
      setError(err instanceof Error ? err.message : 'Unable to load store management data');
    } finally {
      setLoading(false);
    }
  }, [location.search]);

  React.useEffect(() => {
    loadManagementData();
  }, [loadManagementData]);

  const adminPath = store?.id ? `/store/admin?storeId=${store.id}` : '/store/admin';
  const previewPath = store?.id ? `/themes/${themeKey(store)}?storeId=${store.id}&preview=1` : '/themes/aura?preview=1';
  const primaryDomain = store?.customDomain || store?.domain || (store?.slug ? `${store.slug}.tiwlo.com` : '');

  const copyValue = (value: string) => {
    navigator.clipboard.writeText(value);
    setCopied(value);
    window.setTimeout(() => setCopied(''), 1600);
  };

  const saveDomain = async () => {
    if (!store) return;
    const customDomain = normalizeDomain(domainInput);
    setSavingDomain(true);
    setError('');
    setNotice('');
    try {
      const updated = await updateStoreWithApi({
        id: store.id,
        customDomain: customDomain || null,
        settings: {
          ...(store.settings || {}),
          useCustomDomain: Boolean(customDomain)
        }
      });
      setStore(updated);
      setStores((items) => items.map((item) => (item.id === updated.id ? updated : item)));
      setDomainInput(updated.customDomain || '');
      setNotice(customDomain ? 'Custom domain saved. DNS verification is ready.' : 'Custom domain removed.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save custom domain');
    } finally {
      setSavingDomain(false);
    }
  };

  const deleteStore = async () => {
    if (!store) return;
    const confirmed = await confirmDelete({
      title: 'Delete store?',
      message: 'Are you sure you want to delete this store? This removes products, orders, customers, themes, plugins, and mapped store domains.',
      resourceName: store.name
    });
    if (!confirmed) return;

    setDeleting(true);
    setError('');
    setNotice('');
    try {
      await deleteStoreWithApi(store.id);
      navigate('/store');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete store');
    } finally {
      setDeleting(false);
    }
  };

  const operationalItems = [
    { title: 'Product Inventory', description: `${products.length} products loaded from API`, icon: Package, path: adminPath },
    { title: 'Customer Database', description: `${customers.length} customers loaded from API`, icon: Users, path: adminPath },
    { title: 'Fulfillment & Shipping', description: `${orders.length} orders available for fulfillment`, icon: Truck, path: adminPath },
    { title: 'Orders & Payments', description: 'Review transactions and pending payouts from orders API', icon: CreditCard, path: adminPath }
  ];

  const configItems = [
    { title: 'Store Settings', icon: Settings, path: adminPath },
    { title: 'API & Webhooks', icon: ShoppingBag, path: '/api-tokens' },
    { title: 'Support Tickets', icon: MessageSquare, path: '/support' },
    { title: 'Help Center', icon: HelpCircle, path: '/documentation' }
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-20">
      <section className="border-b border-[#e5e8ed] bg-transparent p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/store')} className="rounded-sm border border-slate-200 bg-white p-2 transition-all hover:border-blue-200 hover:text-blue-600">
              <ArrowLeft className="h-5 w-5 text-slate-500" />
            </button>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-blue-600">Store Management</p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#1f2937]">{store?.name || 'No store connected'}</h1>
              <p className="mt-1 font-mono text-xs text-slate-500">{primaryDomain || 'No domain configured'}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={loadManagementData} className="inline-flex items-center gap-2 rounded-sm border border-slate-200 bg-white px-4 py-2 text-xs font-bold uppercase text-slate-700 transition-all hover:border-blue-200 hover:text-blue-600">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button onClick={() => navigate(previewPath)} disabled={!store} className="inline-flex items-center gap-2 rounded-sm border border-slate-200 bg-white px-4 py-2 text-xs font-bold uppercase text-slate-700 transition-all hover:border-blue-200 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50">
              <ExternalLink className="h-3.5 w-3.5" /> Site View
            </button>
            <button onClick={() => navigate(adminPath)} disabled={!store} className="inline-flex items-center gap-2 rounded-sm bg-blue-600 px-4 py-2 text-xs font-bold uppercase text-white shadow-sm transition-all hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-600">
              <Plus className="h-3.5 w-3.5" /> Store Admin
            </button>
          </div>
        </div>
      </section>

      {error && <div className="rounded border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600">{error}</div>}
      {notice && <div className="rounded border border-emerald-100 bg-emerald-50 px-4 py-3 text-[13px] font-bold text-emerald-700">{notice}</div>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-4">
          <div className="rounded-lg border border-[#d9dee7] bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-900">Stores</h2>
              <span className="rounded-sm bg-slate-900 px-2 py-1 text-[10px] font-black text-white">{stores.length}</span>
            </div>
            {loading && stores.length === 0 ? (
              <div className="grid min-h-[120px] place-items-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" aria-label="Loading" />
              </div>
            ) : stores.length === 0 ? (
              <div className="rounded-sm border border-dashed border-slate-200 p-5 text-center text-xs font-bold text-slate-400">No stores found.</div>
            ) : (
              <div className="space-y-2">
                {stores.map((item) => {
                  const selected = item.id === store?.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => navigate(`/store/management?storeId=${item.id}`)}
                      className={`w-full rounded-sm border p-3 text-left transition-all ${
                        selected ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-slate-50 text-slate-800 hover:border-blue-300 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate text-sm font-black">{item.name}</span>
                        <span className={`h-2 w-2 rounded-full ${String(item.status).toLowerCase() === 'active' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                      </div>
                      <p className={`mt-1 truncate font-mono text-[10px] ${selected ? 'text-slate-400' : 'text-slate-500'}`}>{item.domain || `${item.slug}.tiwlo.com`}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-rose-900/30 bg-[#1f1116] p-5 text-white shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-300" />
              <h3 className="text-xs font-black uppercase tracking-widest">Danger Zone</h3>
            </div>
            <p className="text-xs leading-5 text-rose-100/70">Deleting a store removes store records and mapped ecommerce domains.</p>
            <button
              onClick={deleteStore}
              disabled={!store || deleting}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-sm bg-rose-600 px-4 py-2 text-xs font-black uppercase text-white transition-all hover:bg-rose-500 disabled:cursor-not-allowed disabled:bg-rose-900/50"
            >
              <Trash2 className="h-4 w-4" /> {deleting ? 'Deleting...' : 'Delete Store'}
            </button>
          </div>
        </aside>

        <main className="space-y-6">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="space-y-6 xl:col-span-2">
              <div className="overflow-hidden rounded-lg border border-[#d9dee7] bg-white shadow-sm">
                <div className="border-b border-[#e5e8ed] bg-[#f8f9fa] p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#1f2937]">Operational Control</h3>
                </div>
                <div className="divide-y divide-[#e5e8ed]">
                  {loading && <div className="p-8 text-center text-sm font-bold text-gray-400">Loading store controls from API...</div>}
                  {!loading && operationalItems.map((item) => (
                    <button key={item.title} onClick={() => navigate(item.path)} className="group flex w-full items-center justify-between p-6 text-left transition-all hover:bg-gray-50">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-sm border border-slate-200 bg-slate-900 text-white transition-all group-hover:bg-blue-600">
                          <item.icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-[#1f2937]">{item.title}</h4>
                          <p className="text-xs text-gray-400">{item.description}</p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-blue-500" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-[#d9dee7] bg-white p-6 shadow-sm">
                <h3 className="mb-6 text-xs font-bold uppercase tracking-wider text-[#1f2937]">Store Snapshot</h3>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  {[
                    ['Status', store?.status || 'none'],
                    ['Products', products.length],
                    ['Orders', orders.length],
                    ['Customers', customers.length]
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-sm border border-[#e5e8ed] bg-[#f8f9fa] p-4">
                      <p className="mb-1 text-[10px] font-bold uppercase text-gray-400">{label}</p>
                      <p className="text-xl font-bold capitalize text-[#1f2937]">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-lg border border-[#d9dee7] bg-white p-5 shadow-sm">
                <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-[#1f2937]">Configuration</h3>
                <div className="space-y-2">
                  {configItems.map((item) => (
                    <button key={item.title} onClick={() => navigate(item.path)} className="group flex w-full items-center justify-between rounded-sm p-3 transition-all hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <item.icon className="h-4 w-4 text-gray-400 group-hover:text-blue-500" />
                        <span className="text-xs font-bold text-gray-600 group-hover:text-[#1f2937]">{item.title}</span>
                      </div>
                      <ChevronRight className="h-3 w-3 text-gray-300" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-[#d9dee7] bg-[#111827] p-5 text-white shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-blue-300" />
                  <h3 className="text-xs font-bold uppercase tracking-wider">Current Domain</h3>
                </div>
                <div className="flex items-center gap-2 rounded-sm border border-white/10 bg-white/5 p-3 text-xs font-bold text-slate-200">
                  <Globe className="h-4 w-4 text-blue-300" />
                  <span className="truncate">{primaryDomain || 'No domain configured'}</span>
                </div>
              </div>
            </div>
          </div>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-lg border border-[#d9dee7] bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-slate-900 text-white">
                  <LinkIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#1f2937]">Add Custom Domain</h3>
                  <p className="text-xs text-slate-400">Connect a root domain or storefront subdomain.</p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  value={domainInput}
                  onChange={(event) => setDomainInput(event.target.value)}
                  placeholder="shop.example.com"
                  className="min-h-11 flex-1 rounded-sm border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-900 outline-none transition-all focus:border-blue-500 focus:bg-white"
                />
                <button
                  onClick={saveDomain}
                  disabled={!store || savingDomain}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-sm bg-blue-600 px-5 text-xs font-black uppercase text-white transition-all hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  <Save className="h-4 w-4" /> {savingDomain ? 'Saving...' : 'Save Domain'}
                </button>
              </div>

              <div className="mt-5 rounded-sm border border-blue-100 bg-blue-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-700">DNS Target</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {[
                    ['CNAME', '@', 'tiwlo.com'],
                    ['CNAME', 'www', 'tiwlo.com']
                  ].map(([type, host, value]) => (
                    <div key={`${type}-${host}`} className="rounded-sm border border-blue-100 bg-white p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{type} {host}</p>
                          <code className="mt-1 block text-xs font-black text-slate-900">{value}</code>
                        </div>
                        <button onClick={() => copyValue(value)} className="rounded-sm p-2 text-blue-600 transition-all hover:bg-blue-50">
                          {copied === value ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-800 bg-[#111827] p-6 text-white shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-sm border border-white/10 bg-white/5">
                  <Server className="h-5 w-5 text-blue-300" />
                </div>
                <div>
                  <h3 className="text-sm font-black">Nameserver Setup</h3>
                  <p className="text-xs text-slate-500">Use these values at your registrar.</p>
                </div>
              </div>

              <div className="space-y-3">
                {nameservers.map((item) => (
                  <div key={item} className="flex items-center justify-between rounded-sm border border-white/10 bg-white/5 p-3">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Nameserver</p>
                      <code className="mt-1 block text-sm font-black text-white">{item}</code>
                    </div>
                    <button onClick={() => copyValue(item)} className="rounded-sm p-2 text-blue-300 transition-all hover:bg-white/10">
                      {copied === item ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
