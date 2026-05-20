import React from 'react';
import { AlertCircle, Box, Download, Puzzle, RefreshCw, Settings, X } from 'lucide-react';
import { fetchIntegrationsWithApi, upsertIntegrationWithApi } from '../../lib/tiwloApi';

export default function AdminPlugins() {
  const [plugins, setPlugins] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [isInstallOpen, setIsInstallOpen] = React.useState(false);
  const [form, setForm] = React.useState({ key: '', group: 'platform', name: '', status: 'active' });

  const loadPlugins = async () => {
    setLoading(true);
    setError('');
    try {
      const items = await fetchIntegrationsWithApi();
      setPlugins(items.map((item) => ({
        id: item.id,
        key: item.key,
        name: item.name,
        version: item.lastSyncAt ? new Date(item.lastSyncAt).toLocaleDateString() : 'Not synced',
        author: item.group,
        status: item.status === 'active' ? 'Active' : 'Inactive',
        statusRaw: item.status,
        config: item.config || {},
        health: item.health || {},
        icon: item.status === 'active' ? Box : Puzzle
      })));
    } catch (err) {
      setPlugins([]);
      setError(err instanceof Error ? err.message : 'Unable to load integrations');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadPlugins();
  }, []);

  const installPlugin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      await upsertIntegrationWithApi({
        ...form,
        config: {},
        health: { status: 'pending' }
      });
      setIsInstallOpen(false);
      setForm({ key: '', group: 'platform', name: '', status: 'active' });
      loadPlugins();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to install integration');
    }
  };

  const togglePlugin = async (plugin: any) => {
    setError('');
    try {
      const nextStatus = plugin.statusRaw === 'active' ? 'inactive' : 'active';
      await upsertIntegrationWithApi({
        key: plugin.key,
        group: plugin.author,
        name: plugin.name,
        status: nextStatus,
        config: plugin.config,
        health: { ...plugin.health, status: 'manual-toggle' }
      });
      loadPlugins();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update integration');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#2e3d49]">Platform Plugins</h1>
          <p className="text-[13px] text-[#4a4a4a] mt-1">Installed integrations loaded from the database.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadPlugins} className="bg-white border border-[#e5e8ed] text-[#4a4a4a] px-4 py-2 rounded font-bold text-[13px] hover:bg-[#f3f5f9] transition-all flex items-center gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button onClick={() => setIsInstallOpen(true)} className="bg-[#0069ff] text-white px-5 py-2 rounded font-bold text-[13px] hover:bg-[#0056cc] transition-all flex items-center gap-2">
            <Download className="h-4 w-4" /> Install Plugin
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="bg-white border border-[#e5e8ed] rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-[#f3f5f9] bg-[#f8f9fa] flex items-center justify-between">
          <h2 className="text-[14px] font-bold text-[#2e3d49] uppercase tracking-wide">Installed Extensions</h2>
          <span className="text-[11px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded uppercase">{plugins.length} Total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-[#e5e8ed]">
                <th className="px-6 py-4 text-[11px] font-bold text-[#4a4a4a] uppercase tracking-wider">Name & Sync</th>
                <th className="px-6 py-4 text-[11px] font-bold text-[#4a4a4a] uppercase tracking-wider">Group</th>
                <th className="px-6 py-4 text-[11px] font-bold text-[#4a4a4a] uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-[11px] font-bold text-[#4a4a4a] uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e8ed]">
              {loading ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-[13px] font-bold text-gray-400">Loading integrations from API...</td></tr>
              ) : plugins.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-[13px] font-bold text-gray-400">No integrations found in the database.</td></tr>
              ) : plugins.map((plugin) => (
                <tr key={plugin.id} className="hover:bg-[#f3f5f9] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded bg-[#f3f5f9] border border-[#e5e8ed] flex items-center justify-center text-[#8ba2ad]">
                        <plugin.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[14px] font-bold text-[#2e3d49]">{plugin.name}</p>
                        <p className="text-[11px] text-gray-400 font-mono">{plugin.version}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[13px] text-[#4a4a4a]">{plugin.author}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${plugin.status === 'Active' ? 'bg-[#24ad5f]' : 'bg-gray-300'}`}></div>
                      <span className="text-[12px] text-[#4a4a4a] font-medium">{plugin.status}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => togglePlugin(plugin)} className="p-2 hover:bg-gray-200 rounded transition-colors text-gray-400 hover:text-[#0069ff]" title={plugin.statusRaw === 'active' ? 'Deactivate' : 'Activate'}>
                      <Settings className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isInstallOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={installPlugin} className="w-full max-w-md rounded-lg bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-bold text-[#2e3d49]">Install Integration</h2>
              <button type="button" onClick={() => setIsInstallOpen(false)} className="rounded p-2 text-gray-400 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 p-6">
              <label className="block space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Key</span>
                <input required value={form.key} onChange={(event) => setForm((current) => ({ ...current, key: event.target.value }))} className="w-full rounded border border-gray-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none" />
              </label>
              <label className="block space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Name</span>
                <input required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="w-full rounded border border-gray-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none" />
              </label>
              <label className="block space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Group</span>
                <input value={form.group} onChange={(event) => setForm((current) => ({ ...current, group: event.target.value }))} className="w-full rounded border border-gray-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none" />
              </label>
              <label className="block space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Status</span>
                <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} className="w-full rounded border border-gray-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button type="button" onClick={() => setIsInstallOpen(false)} className="rounded border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-50">Cancel</button>
              <button className="rounded bg-[#0069ff] px-5 py-2 text-sm font-bold text-white hover:bg-[#0056cc]">Install</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
