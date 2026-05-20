import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock,
  DollarSign,
  ExternalLink,
  Globe,
  Lock,
  Package,
  Plus,
  RefreshCw,
  Settings,
  ShoppingBag,
  User,
  Users
} from 'lucide-react';
import {
  fetchStoreCustomersForAdmin,
  fetchStoreOrdersForAdmin,
  fetchStoreProductsForAdmin,
  fetchStoresWithApi
} from '../lib/tiwloApi';

function money(value: number, currency = 'USD') {
  return `${currency} ${Number(value || 0).toFixed(2)}`;
}

function dateLabel(value?: string) {
  if (!value) return 'New';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function themeKey(store: any) {
  return String(store?.settings?.theme || 'aura').toLowerCase();
}

function statusTone(status?: string) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'active') return 'border-emerald-100 bg-emerald-50 text-emerald-700';
  if (['disabled', 'suspended', 'deleted', 'closed'].includes(normalized)) return 'border-rose-100 bg-rose-50 text-rose-700';
  return 'border-amber-100 bg-amber-50 text-amber-700';
}

export default function CloudStore() {
  const navigate = useNavigate();
  const location = useLocation();
  const [stores, setStores] = React.useState<any[]>([]);
  const [store, setStore] = React.useState<any>(null);
  const [products, setProducts] = React.useState<any[]>([]);
  const [orders, setOrders] = React.useState<any[]>([]);
  const [customers, setCustomers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  const loadStoreData = React.useCallback(async () => {
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
      setError(err instanceof Error ? err.message : 'Unable to load store data');
    } finally {
      setLoading(false);
    }
  }, [location.search]);

  React.useEffect(() => {
    loadStoreData();
  }, [loadStoreData]);

  const revenue = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const activeOrders = orders.filter((order) => !['delivered', 'cancelled', 'refunded'].includes(String(order.status).toLowerCase())).length;
  const activeStores = stores.filter((item) => String(item.status).toLowerCase() === 'active').length;
  const storeDomain = store?.customDomain || store?.domain || (store?.slug ? `${store.slug}.tiwlo.com` : '');
  const adminPath = store?.id ? `/store/admin?storeId=${store.id}` : '/store/admin';
  const previewPath = store?.id ? `/themes/${themeKey(store)}?storeId=${store.id}&preview=1` : '/themes/aura?preview=1';

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-20">
      <section className="overflow-hidden border-b border-[#e5e8ed] bg-transparent pb-6">
        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-blue-600">Ecommerce Center</p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-medium uppercase tracking-wider text-slate-400">
              <ShoppingBag className="h-4 w-4 text-blue-600" />
              <span>Managed Services</span>
              <ArrowRight className="h-3 w-3" />
              <span className="text-[#1f2937]">Cloud Store</span>
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-[#1f2937]">{store?.name || 'No store connected'}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${statusTone(store?.status)}`}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" /> {store?.status || 'No Store'}
              </span>
              <span className="rounded-sm border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-[11px] text-slate-600">
                {storeDomain || 'No domain configured'}
              </span>
              <span className="rounded-sm border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600">
                {activeStores}/{stores.length} active
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button onClick={loadStoreData} className="inline-flex items-center gap-2 rounded-sm border border-slate-200 bg-white px-4 py-2 text-xs font-bold uppercase text-slate-700 transition-all hover:border-blue-200 hover:text-blue-600">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button onClick={() => navigate(previewPath)} className="inline-flex items-center gap-2 rounded-sm border border-slate-200 bg-white px-4 py-2 text-xs font-bold uppercase text-slate-700 transition-all hover:border-blue-200 hover:text-blue-600">
              <ExternalLink className="h-3.5 w-3.5" /> Preview
            </button>
            <button onClick={() => navigate('/store/create')} className="inline-flex items-center gap-2 rounded-sm bg-blue-600 px-4 py-2 text-xs font-bold uppercase text-white shadow-sm transition-all hover:bg-blue-500">
              <Plus className="h-3.5 w-3.5" /> Create Store
            </button>
          </div>
        </div>
      </section>

      {error && <div className="rounded border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600">{error}</div>}

      <section className="rounded-lg border border-[#d9dee7] bg-[#f3f5f8] p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-[#1f2937]">Active Stores</h2>
            <p className="mt-1 text-xs font-medium text-slate-500">All created stores stay visible here.</p>
          </div>
          <span className="rounded-sm bg-[#111827] px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white">{stores.length} stores</span>
        </div>

        {loading && stores.length === 0 ? (
          <div className="grid min-h-[140px] place-items-center">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" aria-label="Loading" />
          </div>
        ) : stores.length === 0 ? (
          <div className="rounded-sm border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-bold text-slate-400">No stores found.</div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {stores.map((item) => {
              const selected = item.id === store?.id;
              const active = String(item.status).toLowerCase() === 'active';
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(`/store?storeId=${item.id}`)}
                  className={`group min-h-[132px] rounded-md border p-4 text-left transition-all ${
                    selected
                      ? 'border-slate-900 bg-[#111827] text-white shadow-lg'
                      : 'border-slate-200 bg-white text-slate-900 hover:border-blue-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${active ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                        <p className={`truncate text-sm font-black ${selected ? 'text-white' : 'text-slate-900'}`}>{item.name}</p>
                      </div>
                      <p className={`mt-1 truncate font-mono text-[11px] ${selected ? 'text-slate-400' : 'text-slate-500'}`}>{item.domain || `${item.slug}.tiwlo.com`}</p>
                    </div>
                    {selected && <CheckCircle2 className="h-4 w-4 text-blue-300" />}
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <div className={`rounded-sm border px-3 py-2 ${selected ? 'border-white/10 bg-white/5' : 'border-slate-100 bg-slate-50'}`}>
                      <p className={`text-[9px] font-black uppercase tracking-widest ${selected ? 'text-slate-500' : 'text-slate-400'}`}>Status</p>
                      <p className={`mt-1 text-xs font-bold capitalize ${selected ? 'text-emerald-200' : 'text-emerald-700'}`}>{item.status}</p>
                    </div>
                    <div className={`rounded-sm border px-3 py-2 ${selected ? 'border-white/10 bg-white/5' : 'border-slate-100 bg-slate-50'}`}>
                      <p className={`text-[9px] font-black uppercase tracking-widest ${selected ? 'text-slate-500' : 'text-slate-400'}`}>Created</p>
                      <p className={`mt-1 text-xs font-bold ${selected ? 'text-slate-200' : 'text-slate-700'}`}>{dateLabel(item.createdAt)}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {[
          { label: 'Revenue', value: money(revenue, store?.currency), icon: DollarSign, color: 'text-blue-600' },
          { label: 'Active Orders', value: activeOrders, icon: Package, color: 'text-purple-600' },
          { label: 'Products', value: products.length, icon: ShoppingBag, color: 'text-orange-600' },
          { label: 'Customers', value: customers.length, icon: Users, color: 'text-emerald-600' }
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-[#d9dee7] bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{stat.label}</p>
              <stat.icon className={`h-4 w-4 ${stat.color} opacity-80`} />
            </div>
            <span className="text-lg font-bold text-[#1f2937]">{loading ? '...' : stat.value}</span>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-[#d9dee7] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-sm bg-[#111827] text-white">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#1f2937]">{store?.name || 'No store selected'}</h2>
              <p className="mt-1 font-mono text-[11px] text-gray-400">ID: {store?.id || 'none'}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => navigate(adminPath)} disabled={!store} className="inline-flex items-center gap-1.5 rounded-sm bg-slate-900 px-3 py-2 text-[10px] font-bold uppercase text-white transition-all hover:bg-black disabled:cursor-not-allowed disabled:bg-slate-200">
              <Lock className="h-3 w-3" /> Admin Panel
            </button>
            <button onClick={() => navigate(previewPath)} disabled={!store} className="inline-flex items-center gap-1.5 rounded-sm bg-blue-600 px-3 py-2 text-[10px] font-bold uppercase text-white transition-all hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-200">
              <User className="h-3 w-3" /> Customer View
            </button>
            <button onClick={() => navigate(`/store/management${store?.id ? `?storeId=${store.id}` : ''}`)} disabled={!store} className="inline-flex items-center gap-1.5 rounded-sm border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold uppercase text-slate-700 transition-all hover:border-blue-300 hover:text-blue-600 disabled:cursor-not-allowed disabled:text-slate-300">
              <Settings className="h-3 w-3" /> Management
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="overflow-hidden rounded-lg border border-[#d9dee7] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#e5e8ed] p-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#1f2937]">Products</h3>
              <button onClick={() => navigate(adminPath)} disabled={!store} className="text-xs font-bold text-[#0069ff] hover:underline disabled:text-slate-300">Manage</button>
            </div>
            <table className="w-full text-left">
              <thead className="border-b border-[#e5e8ed] bg-[#f8f9fa]">
                <tr>
                  <th className="px-4 py-2 text-[10px] font-bold uppercase text-gray-400">Product</th>
                  <th className="px-4 py-2 text-[10px] font-bold uppercase text-gray-400">Stock</th>
                  <th className="px-4 py-2 text-[10px] font-bold uppercase text-gray-400">Price</th>
                  <th className="px-4 py-2 text-[10px] font-bold uppercase text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e8ed]">
                {loading && <tr><td colSpan={4} className="px-4 py-10 text-center text-sm font-bold text-gray-400">Loading products from API...</td></tr>}
                {!loading && products.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-sm font-bold text-gray-400">No products found.</td></tr>}
                {!loading && products.slice(0, 6).map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="text-xs font-bold text-[#1f2937]">{product.name}</p>
                      <p className="text-[10px] text-gray-400">{product.sku || product.category}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{product.stock}</td>
                    <td className="px-4 py-3 font-mono text-xs font-bold text-[#1f2937]">{money(product.price, store?.currency)}</td>
                    <td className="px-4 py-3 text-xs font-bold uppercase text-gray-500">{product.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-[#d9dee7] bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-[#1f2937]">Identity & Domain</h3>
            <div className="rounded-sm border border-[#e5e8ed] bg-[#f8f9fa] p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold text-gray-600">
                <Globe className="h-4 w-4 text-blue-500" />
                Primary Domain
              </div>
              <p className="font-mono text-xs text-[#1f2937]">{storeDomain || 'No domain configured'}</p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-sm bg-slate-50 p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category</p>
                <p className="mt-1 text-xs font-bold capitalize text-slate-700">{store?.category || 'Not set'}</p>
              </div>
              <div className="rounded-sm bg-slate-50 p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Region</p>
                <p className="mt-1 text-xs font-bold text-slate-700">{store?.region || 'Not set'}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-[#d9dee7] bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-[#1f2937]">Recent Orders</h3>
            <div className="space-y-4">
              {loading && <div className="text-sm font-bold text-gray-400">Loading orders...</div>}
              {!loading && orders.length === 0 && <div className="text-sm font-bold text-gray-400">No orders found.</div>}
              {!loading && orders.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-start gap-3 border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-50">
                    <Clock className="h-3.5 w-3.5 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-[#1f2937]">{order.number}</p>
                    <p className="text-[9px] text-gray-400">{money(order.total, order.currency)} / {order.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-[#d9dee7] bg-[#111827] p-5 text-white shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-300" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Store Health</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-sm border border-white/10 bg-white/5 p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Orders</p>
                <p className="mt-1 text-lg font-black">{orders.length}</p>
              </div>
              <div className="rounded-sm border border-white/10 bg-white/5 p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Customers</p>
                <p className="mt-1 text-lg font-black">{customers.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
