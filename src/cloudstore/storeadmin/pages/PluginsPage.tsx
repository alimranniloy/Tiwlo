import React from 'react';
import { AlertCircle, CheckCircle, PlusCircle, Puzzle, RefreshCw, Search, X } from 'lucide-react';
import {
  fetchStorePluginsForAdmin,
  installStorePluginWithApi,
  toggleStorePluginWithApi
} from '../../../lib/tiwloApi';

export default function PluginsPage({ store }: { store: any }) {
  const [plugins, setPlugins] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [query, setQuery] = React.useState('');
  const [formOpen, setFormOpen] = React.useState(false);
  const [form, setForm] = React.useState({ name: '', key: '' });

  const loadPlugins = React.useCallback(async () => {
    if (!store?.id) return;
    setLoading(true);
    setError('');
    try {
      setPlugins(await fetchStorePluginsForAdmin(store.id));
    } catch (err) {
      setPlugins([]);
      setError(err instanceof Error ? err.message : 'Unable to load store plugins');
    } finally {
      setLoading(false);
    }
  }, [store?.id]);

  React.useEffect(() => {
    loadPlugins();
  }, [loadPlugins]);

  const installPlugin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!store?.id) return;
    setSaving(true);
    setError('');
    try {
      const key = form.key.trim() || form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      await installStorePluginWithApi(store.id, key, form.name.trim());
      setForm({ name: '', key: '' });
      setFormOpen(false);
      await loadPlugins();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to install plugin');
    } finally {
      setSaving(false);
    }
  };

  const togglePlugin = async (plugin: any) => {
    setError('');
    try {
      await toggleStorePluginWithApi(plugin.id, plugin.status === 'active' ? 'inactive' : 'active');
      await loadPlugins();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update plugin');
    }
  };

  const filtered = plugins.filter((plugin) => (
    [plugin.name, plugin.key, plugin.status].join(' ').toLowerCase().includes(query.toLowerCase())
  ));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">Plugins</h1>
          <p className="mt-1 text-sm text-gray-500">Install and toggle plugins for this store only.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadPlugins} className="inline-flex items-center gap-2 rounded-sm border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button onClick={() => setFormOpen(true)} className="inline-flex items-center gap-2 rounded-sm bg-gray-900 px-3 py-2 text-xs font-bold text-white hover:bg-black">
            <PlusCircle className="h-3.5 w-3.5" /> Install
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-sm border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {formOpen && (
        <form onSubmit={installPlugin} className="border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
            <h2 className="text-sm font-bold text-gray-900">Install Plugin</h2>
            <button type="button" onClick={() => setFormOpen(false)} className="rounded-sm p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-4 p-4 md:grid-cols-2">
            <label>
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">Plugin name</span>
              <input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} className="w-full rounded-sm border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500" required />
            </label>
            <label>
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">Plugin key</span>
              <input value={form.key} onChange={(event) => setForm((prev) => ({ ...prev, key: event.target.value }))} className="w-full rounded-sm border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="auto-generated when empty" />
            </label>
          </div>
          <div className="flex justify-end gap-2 border-t border-gray-200 bg-gray-50 px-4 py-3">
            <button type="button" onClick={() => setFormOpen(false)} className="rounded-sm border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50">Cancel</button>
            <button disabled={saving} className="rounded-sm bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60">{saving ? 'Installing...' : 'Install Plugin'}</button>
          </div>
        </form>
      )}

      <div className="border border-gray-200 bg-white">
        <div className="flex items-center gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search plugins..." className="w-full rounded-sm border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Plugins: {filtered.length}</span>
        </div>

        <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
          {loading ? (
            <div className="md:col-span-2 p-8 text-center text-sm font-bold text-gray-400">Loading plugins from API...</div>
          ) : filtered.length === 0 ? (
            <div className="md:col-span-2 p-8 text-center text-sm font-bold text-gray-400">No plugins found in the database.</div>
          ) : filtered.map((plugin) => (
            <div key={plugin.id} className="border border-gray-200 bg-white p-4">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center border border-gray-200 bg-gray-50 text-gray-500">
                    <Puzzle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{plugin.name}</h3>
                    <p className="font-mono text-xs text-gray-400">{plugin.key}</p>
                  </div>
                </div>
                <span className="rounded-sm border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-600">{plugin.status}</span>
              </div>
              <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                <span className="flex items-center gap-1.5 text-xs font-bold text-gray-600">
                  {plugin.status === 'active' && <CheckCircle className="h-3.5 w-3.5 text-green-600" />}
                  Store scoped
                </span>
                <button onClick={() => togglePlugin(plugin)} className="rounded-sm border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50">
                  {plugin.status === 'active' ? 'Disable' : 'Enable'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
