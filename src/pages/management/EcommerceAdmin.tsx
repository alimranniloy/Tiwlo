import React, { useState } from 'react';
import { AlertCircle, Filter, MoreVertical, Plus, Search, ShoppingBag, Store, TrendingUp, Users } from 'lucide-react';
import { fetchEcommerceAdminSummary, fetchStoresWithApi } from '../../lib/tiwloApi';
import type { User } from '../../types';

interface EcommerceAdminProps {
  user: User;
}

const numberValue = (value?: number) => (typeof value === 'number' ? value.toLocaleString() : '0');
const moneyValue = (value?: number) => `$${Number(value || 0).toLocaleString()}`;

export default function EcommerceAdmin({ user }: EcommerceAdminProps) {
  const [search, setSearch] = useState('');
  const [summary, setSummary] = React.useState<any>(null);
  const [stores, setStores] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  const loadStores = async () => {
    setLoading(true);
    setError('');
    try {
      const [summaryData, storeRows] = await Promise.all([
        fetchEcommerceAdminSummary(),
        fetchStoresWithApi(search || undefined)
      ]);
      setSummary(summaryData);
      setStores(storeRows);
    } catch (err) {
      setSummary(null);
      setStores([]);
      setError(err instanceof Error ? err.message : 'Unable to load merchant data');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    const timer = window.setTimeout(loadStores, 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const stats = [
    { label: 'Total Merchants', value: numberValue(summary?.merchants), icon: Users },
    { label: 'Platform Revenue', value: moneyValue(summary?.revenue), icon: TrendingUp },
    { label: 'Deployed Stores', value: numberValue(summary?.stores), icon: Store },
    { label: 'Total Orders', value: numberValue(summary?.orders), icon: ShoppingBag }
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-8">
      <div className="bg-white border-b border-gray-200 px-8 py-5 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 bg-indigo-600 flex items-center justify-center text-white rounded-sm">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <h1 className="text-xl font-bold text-gray-800">Merchant Directory</h1>
            </div>
            <p className="text-[13px] text-gray-500">Database-backed SaaS stores for {user.email}.</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3.5 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-sm text-sm font-medium hover:bg-gray-50">
              <Filter className="w-3.5 h-3.5 mr-2 inline" /> Filters
            </button>
            <button className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-sm text-sm font-medium hover:bg-indigo-700">
              <Plus className="w-3.5 h-3.5 mr-2 inline" /> New Merchant
            </button>
          </div>
        </div>
      </div>

      <div className="px-8 space-y-6">
        {error && (
          <div className="flex items-center gap-2 rounded border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white border border-gray-200 rounded-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-gray-50 text-gray-400 rounded-sm">
                  <stat.icon className="w-4 h-4" />
                </div>
              </div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{stat.label}</p>
              <h3 className="text-xl font-bold text-gray-800 mt-1">{stat.value}</h3>
            </div>
          ))}
        </div>

        <div className="bg-white border border-gray-200 rounded-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-800 text-sm">Store Accounts</h3>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search stores..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-200 text-sm rounded-sm w-48 focus:bg-white outline-none"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500 font-bold border-b border-gray-100">
                  <th className="px-6 py-3">Store</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Domain</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-[13px] font-bold text-gray-400">Loading stores from API...</td></tr>
                ) : stores.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-[13px] font-bold text-gray-400">No stores found in the database.</td></tr>
                ) : stores.map((store) => (
                  <tr key={store.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 text-gray-500 rounded-sm flex items-center justify-center font-bold text-sm">
                          {String(store.name).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold text-gray-800">{store.name}</p>
                          <p className="text-[11px] text-gray-400 font-medium">{store.contactEmail || store.ownerId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-sm border text-indigo-600 border-indigo-100 bg-indigo-50">
                        {store.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[13px] font-medium text-gray-600">{store.customDomain || store.domain || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-bold ${
                        store.status === 'active' ? 'text-green-600' : store.status === 'pending' ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {store.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-1 hover:bg-gray-100 rounded-sm text-gray-300">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <p className="text-[11px] text-gray-400 font-medium">Records: {stores.length}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
