import React from 'react';
import { AlertCircle, Filter, MoreVertical, Plus, RefreshCw, Search } from 'lucide-react';
import { fetchIspClientsWithApi } from '../../../lib/tiwloApi';
import { useCurrency } from '../../../lib/useCurrency';

export default function IspClientManagement() {
  const { money } = useCurrency({ scope: 'platform', scopeId: 'admin' });
  const [search, setSearch] = React.useState('');
  const [clients, setClients] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  const loadClients = async () => {
    setLoading(true);
    setError('');
    try {
      const rows = await fetchIspClientsWithApi(search || undefined);
      setClients(rows);
    } catch (err) {
      setClients([]);
      setError(err instanceof Error ? err.message : 'Unable to load ISP clients');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    const timer = window.setTimeout(loadClients, 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">ISP Client Directory</h1>
          <p className="text-gray-500 text-sm">Subscribers loaded directly from the ISP clients API.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadClients} className="px-3.5 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-sm text-sm font-medium hover:bg-gray-50">
            <RefreshCw className={`w-3.5 h-3.5 mr-2 inline ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button className="px-3.5 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-sm text-sm font-medium hover:bg-gray-50">
            <Filter className="w-3.5 h-3.5 mr-2 inline" /> Filter Listings
          </button>
          <button className="px-3.5 py-1.5 bg-blue-600 text-white rounded-sm text-sm font-medium hover:bg-blue-700">
            <Plus className="w-3.5 h-3.5 mr-2 inline" /> Create Account
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-800 text-sm">Subscriber Ledger</h3>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search subscribers..."
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
                <th className="px-6 py-3">Client</th>
                <th className="px-6 py-3">Username</th>
                <th className="px-6 py-3">Contact</th>
                <th className="px-6 py-3">Balance</th>
                <th className="px-6 py-3 text-center">Status</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-[13px] font-bold text-gray-400">Loading ISP clients from API...</td></tr>
              ) : clients.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-[13px] font-bold text-gray-400">No ISP clients found in the database.</td></tr>
              ) : clients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-50 text-blue-500 rounded-sm flex items-center justify-center font-bold text-[10px]">
                        {String(client.name).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-gray-800">{client.name}</p>
                        <p className="text-[11px] text-gray-400 font-medium">Joined: {client.createdAt ? new Date(client.createdAt).toLocaleDateString() : '-'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-sm border text-blue-600 border-blue-100 bg-blue-50">
                      {client.username}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-600">
                    {client.email || client.phone || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-[13px] font-bold text-gray-800">{money(client.balance || 0, 'USD')}</div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[10px] font-bold ${
                      client.status === 'active' ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'
                    }`}>
                      {client.status}
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
          <p className="text-[11px] text-gray-400 font-medium tracking-tight">Active Records: {clients.length}</p>
        </div>
      </div>
    </div>
  );
}
