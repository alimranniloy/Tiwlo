import React from 'react';
import { AlertCircle, Globe, Plus, Save, Search, Settings2, X } from 'lucide-react';
import { fetchDomainsWithApi, upsertIntegrationWithApi } from '../../lib/tiwloApi';

export default function AdminDomains() {
  const [search, setSearch] = React.useState('');
  const [domains, setDomains] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [isRegistrarOpen, setIsRegistrarOpen] = React.useState(false);
  const [selectedDomain, setSelectedDomain] = React.useState<any | null>(null);
  const [registrar, setRegistrar] = React.useState({
    key: '',
    name: '',
    provider: '',
    status: 'active'
  });

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError('');
      fetchDomainsWithApi(search || undefined)
        .then(setDomains)
        .catch((err) => {
          setDomains([]);
          setError(err instanceof Error ? err.message : 'Unable to load domains');
        })
        .finally(() => setLoading(false));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const saveRegistrar = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await upsertIntegrationWithApi({
        key: registrar.key,
        group: 'domain-registrar',
        name: registrar.name,
        status: registrar.status,
        config: { provider: registrar.provider },
        health: { status: 'pending' }
      });
      setRegistrar({ key: '', name: '', provider: '', status: 'active' });
      setIsRegistrarOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save registrar');
    } finally {
      setSaving(false);
    }
  };

  const activeCount = domains.filter((domain) => domain.status === 'active').length;
  const expiringCount = domains.filter((domain) => {
    if (!domain.expiresAt) return false;
    const days = (new Date(domain.expiresAt).getTime() - Date.now()) / 86400000;
    return days <= 30;
  }).length;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#2e3d49]">Domain Registry Settings</h1>
          <p className="text-[13px] text-[#4a4a4a] mt-1">Domains are loaded from the database-backed API.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsRegistrarOpen(true)} className="bg-[#0069ff] text-white px-5 py-2 rounded font-bold text-[13px] hover:bg-[#0056cc] transition-all flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add Registrar
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Domains', value: domains.length },
          { label: 'Active Domains', value: activeCount },
          { label: 'Expiring Soon', value: expiringCount }
        ].map((item) => (
          <div key={item.label} className="bg-white border border-[#e5e8ed] rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <Globe className="h-6 w-6 text-[#0069ff]" />
            </div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{item.label}</p>
            <p className="mt-2 text-2xl font-bold text-[#2e3d49]">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-[#e5e8ed] rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-[#f3f5f9] bg-[#f8f9fa] flex items-center justify-between">
          <h2 className="text-[14px] font-bold text-[#2e3d49] uppercase tracking-wide">Registered Domains</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search domains..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="bg-white border border-[#e5e8ed] rounded pl-9 pr-3 py-1 text-[12px] focus:outline-none focus:border-[#0069ff]"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f8f9fa] border-b border-[#e5e8ed]">
                <th className="px-6 py-3 text-[11px] font-bold text-[#4a4a4a] uppercase tracking-wider">Domain</th>
                <th className="px-6 py-3 text-[11px] font-bold text-[#4a4a4a] uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-[11px] font-bold text-[#4a4a4a] uppercase tracking-wider">Auto Renew</th>
                <th className="px-6 py-3 text-[11px] font-bold text-[#4a4a4a] uppercase tracking-wider">Expires</th>
                <th className="px-6 py-3 text-[11px] font-bold text-[#4a4a4a] uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e8ed]">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-[13px] font-bold text-gray-400">Loading domains from API...</td></tr>
              ) : domains.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-[13px] font-bold text-gray-400">No domains found in the database.</td></tr>
              ) : domains.map((item) => (
                <tr key={item.id} className="hover:bg-[#f3f5f9] transition-colors">
                  <td className="px-6 py-4 font-bold text-[#2e3d49]">{item.name}</td>
                  <td className="px-6 py-4 text-[13px] text-gray-400">{item.status}</td>
                  <td className="px-6 py-4 text-[13px] font-bold text-[#24ad5f]">{item.autoRenew ? 'Enabled' : 'Disabled'}</td>
                  <td className="px-6 py-4 text-[13px] text-[#4a4a4a]">{item.expiresAt ? new Date(item.expiresAt).toLocaleDateString() : '-'}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => setSelectedDomain(item)} className="text-[#0069ff] p-1.5 hover:bg-blue-50 rounded" title="View DNS details"><Settings2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isRegistrarOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={saveRegistrar} className="w-full max-w-xl overflow-hidden rounded-md bg-white">
            <div className="flex items-center justify-between border-b border-[#f3f5f9] px-6 py-4">
              <h2 className="text-lg font-bold text-[#2e3d49]">Add Domain Registrar</h2>
              <button type="button" onClick={() => setIsRegistrarOpen(false)} className="rounded p-2 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Key</span>
                <input required value={registrar.key} onChange={(event) => setRegistrar((current) => ({ ...current, key: event.target.value }))} className="w-full rounded border border-[#e5e8ed] px-3 py-2 text-sm focus:border-[#0069ff] focus:outline-none" />
              </label>
              <label className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Provider</span>
                <input required value={registrar.provider} onChange={(event) => setRegistrar((current) => ({ ...current, provider: event.target.value }))} className="w-full rounded border border-[#e5e8ed] px-3 py-2 text-sm focus:border-[#0069ff] focus:outline-none" />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Name</span>
                <input required value={registrar.name} onChange={(event) => setRegistrar((current) => ({ ...current, name: event.target.value }))} className="w-full rounded border border-[#e5e8ed] px-3 py-2 text-sm focus:border-[#0069ff] focus:outline-none" />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Status</span>
                <select value={registrar.status} onChange={(event) => setRegistrar((current) => ({ ...current, status: event.target.value }))} className="w-full rounded border border-[#e5e8ed] px-3 py-2 text-sm focus:border-[#0069ff] focus:outline-none">
                  {['active', 'inactive', 'disabled'].map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </label>
            </div>
            <div className="flex justify-end gap-3 border-t border-[#f3f5f9] px-6 py-4">
              <button type="button" onClick={() => setIsRegistrarOpen(false)} className="rounded border border-[#e5e8ed] px-4 py-2 text-sm font-bold text-[#4a4a4a] hover:bg-gray-50">Cancel</button>
              <button disabled={saving} className="flex items-center gap-2 rounded bg-[#0069ff] px-5 py-2 text-sm font-bold text-white hover:bg-[#0056cc] disabled:opacity-60">
                <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {selectedDomain && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl overflow-hidden rounded-md bg-white">
            <div className="flex items-center justify-between border-b border-[#f3f5f9] px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-[#2e3d49]">{selectedDomain.name}</h2>
                <p className="text-xs font-medium text-gray-500">DNS and registrar details from the domain API.</p>
              </div>
              <button type="button" onClick={() => setSelectedDomain(null)} className="rounded p-2 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4 p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded border border-[#e5e8ed] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Status</p>
                  <p className="mt-1 text-sm font-bold text-[#2e3d49]">{selectedDomain.status}</p>
                </div>
                <div className="rounded border border-[#e5e8ed] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Auto Renew</p>
                  <p className="mt-1 text-sm font-bold text-[#2e3d49]">{selectedDomain.autoRenew ? 'Enabled' : 'Disabled'}</p>
                </div>
                <div className="rounded border border-[#e5e8ed] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Expires</p>
                  <p className="mt-1 text-sm font-bold text-[#2e3d49]">{selectedDomain.expiresAt ? new Date(selectedDomain.expiresAt).toLocaleDateString() : '-'}</p>
                </div>
              </div>
              <pre className="max-h-72 overflow-auto rounded border border-[#e5e8ed] bg-[#f8f9fa] p-4 text-xs text-[#2e3d49]">
                {JSON.stringify({ dns: selectedDomain.dns, records: selectedDomain.records }, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
