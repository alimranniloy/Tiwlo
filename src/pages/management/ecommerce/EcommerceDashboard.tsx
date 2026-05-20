import React from 'react';
import { AlertCircle, Globe, Plus, RefreshCw, ShoppingBag, Store, TrendingUp, Users } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fetchEcommerceAdminSummary, fetchStoresWithApi } from '../../../lib/tiwloApi';

const numberValue = (value?: number) => (typeof value === 'number' ? value.toLocaleString() : '0');
const moneyValue = (value?: number) => `$${Number(value || 0).toLocaleString()}`;

export default function EcommerceDashboard() {
  const [summary, setSummary] = React.useState<any>(null);
  const [stores, setStores] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const [summaryData, storeRows] = await Promise.all([
        fetchEcommerceAdminSummary(),
        fetchStoresWithApi()
      ]);
      setSummary(summaryData);
      setStores(storeRows);
    } catch (err) {
      setSummary(null);
      setStores([]);
      setError(err instanceof Error ? err.message : 'Unable to load ecommerce data');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadDashboard();
  }, []);

  const stats = [
    { label: 'Active Merchants', value: numberValue(summary?.merchants), icon: Users },
    { label: 'Deployed Stores', value: numberValue(summary?.stores), icon: Store },
    { label: 'Revenue', value: moneyValue(summary?.revenue), icon: TrendingUp },
    { label: 'Orders', value: numberValue(summary?.orders), icon: ShoppingBag }
  ];

  const chartData = summary ? [{ name: 'Current', value: Number(summary.revenue || 0), stores: Number(summary.stores || 0) }] : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-100 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">System Intelligence</h1>
          <p className="text-gray-500 text-sm mt-1">Cross-platform merchant data from the ecommerce API.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={loadDashboard} className="px-4 py-2 bg-white border border-gray-200 rounded-sm text-sm font-medium text-gray-700 hover:bg-gray-50">
            <RefreshCw className={`w-4 h-4 mr-2 inline ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button className="px-4 py-2 bg-indigo-600 rounded-sm text-sm font-medium text-white hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2 inline" /> New Deployment
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-5 rounded-sm border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-sm bg-gray-50 text-gray-400">
                <stat.icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-gray-400 text-[11px] font-semibold uppercase tracking-wider leading-none">{stat.label}</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-2 tabular-nums">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Revenue Snapshot</h3>
              <p className="text-gray-400 text-xs mt-0.5">Current aggregate from store orders.</p>
            </div>
          </div>

          <div className="h-[280px] w-full">
            {chartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-[13px] font-bold text-gray-400">No ecommerce summary available.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Tooltip contentStyle={{ borderRadius: '4px', border: '1px solid #e2e8f0', boxShadow: 'none', padding: '8px' }} itemStyle={{ fontWeight: 600, fontSize: '12px' }} />
                  <Area type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={2} fillOpacity={0.05} fill="#4f46e5" />
                  <Area type="monotone" dataKey="stores" stroke="#10b981" strokeWidth={2} fillOpacity={0} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-sm border border-gray-200 p-5">
            <h3 className="text-md font-bold text-gray-900 mb-4">Recent Stores</h3>
            <div className="space-y-3">
              {loading ? (
                <div className="p-6 text-center text-[13px] font-bold text-gray-400">Loading stores...</div>
              ) : stores.length === 0 ? (
                <div className="p-6 text-center text-[13px] font-bold text-gray-400">No stores found in the database.</div>
              ) : stores.slice(0, 5).map((store) => (
                <div key={store.id} className="flex items-center justify-between p-3 bg-gray-50/50 hover:bg-gray-50 rounded-sm border border-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white border border-gray-200 rounded-sm flex items-center justify-center">
                      <ShoppingBag className="w-4 h-4 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-gray-800 leading-none">{store.name}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{store.category} / {store.status}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-900 rounded-sm p-6 text-white relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-md font-bold mb-1">Ecommerce API</h3>
              <p className="text-gray-400 text-xs leading-relaxed">Stores, products, customers, and order totals are loaded from database-backed GraphQL queries.</p>
            </div>
            <Globe className="absolute -bottom-6 -right-6 w-24 h-24 text-white/5" />
          </div>
        </div>
      </div>
    </div>
  );
}
