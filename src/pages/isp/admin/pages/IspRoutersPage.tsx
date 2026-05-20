import React from 'react';
import { AlertCircle, Edit3, Plus, RefreshCw, Save, Trash2, X } from 'lucide-react';
import {
  createIspRouterWithApi,
  deleteIspRouterWithApi,
  fetchIspRoutersWithApi,
  syncIspRouterWithApi,
  updateIspRouterWithApi
} from '../../../../lib/tiwloApi';
import { useActionConfirmation } from '../../../../components/ActionConfirmation';

const routerDefaults = {
  name: '',
  ip: '',
  vendor: 'MikroTik',
  status: 'online',
  apiPort: '8728',
  apiUser: '',
  nasIp: '',
  profile: ''
};

export default function IspRoutersPage({ site }: { site: any }) {
  const [routers, setRouters] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [syncingId, setSyncingId] = React.useState('');
  const [error, setError] = React.useState('');
  const [editing, setEditing] = React.useState<any | null | undefined>(undefined);
  const [form, setForm] = React.useState(routerDefaults);
  const { confirmDelete, confirmEdit } = useActionConfirmation();

  const loadRouters = React.useCallback(async () => {
    if (!site?.id) return;
    setLoading(true);
    setError('');
    try {
      setRouters(await fetchIspRoutersWithApi(site.id));
    } catch (err) {
      setRouters([]);
      setError(err instanceof Error ? err.message : 'Unable to load MikroTik routers');
    } finally {
      setLoading(false);
    }
  }, [site?.id]);

  React.useEffect(() => {
    loadRouters();
  }, [loadRouters]);

  const openCreate = () => {
    setEditing(null);
    setForm(routerDefaults);
  };

  const openEdit = async (router: any) => {
    const confirmed = await confirmEdit({
      title: 'Edit router?',
      message: 'Are you sure you want to edit this router?',
      resourceName: router.name
    });
    if (!confirmed) return;

    setEditing(router);
    setForm({
      name: router.name || '',
      ip: router.ip || '',
      vendor: router.vendor || 'MikroTik',
      status: router.status || 'online',
      apiPort: String(router.config?.apiPort || '8728'),
      apiUser: router.config?.apiUser || '',
      nasIp: router.config?.nasIp || '',
      profile: router.config?.profile || ''
    });
  };

  const closeForm = () => {
    setEditing(undefined);
    setForm(routerDefaults);
  };

  const saveRouter = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!site?.id) return;
    setSaving(true);
    setError('');
    const payload = {
      siteId: site.id,
      name: form.name.trim(),
      ip: form.ip.trim(),
      vendor: form.vendor.trim() || 'MikroTik',
      status: form.status,
      config: {
        apiPort: Number(form.apiPort || 8728),
        apiUser: form.apiUser.trim() || undefined,
        nasIp: form.nasIp.trim() || undefined,
        profile: form.profile.trim() || undefined,
        siteId: site.id
      }
    };
    try {
      if (editing?.id) {
        await updateIspRouterWithApi({ id: editing.id, ...payload });
      } else {
        await createIspRouterWithApi(payload);
      }
      closeForm();
      await loadRouters();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save MikroTik router');
    } finally {
      setSaving(false);
    }
  };

  const syncRouter = async (router: any) => {
    setSyncingId(router.id);
    setError('');
    try {
      await syncIspRouterWithApi(router.id);
      await loadRouters();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sync MikroTik router');
    } finally {
      setSyncingId('');
    }
  };

  const deleteRouter = async (router: any) => {
    const confirmed = await confirmDelete({
      title: 'Delete router?',
      message: 'Are you sure you want to delete this router?',
      resourceName: router.name
    });
    if (!confirmed) return;

    setError('');
    try {
      await deleteIspRouterWithApi(router.id);
      await loadRouters();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete router');
    }
  };

  const formOpen = editing !== undefined;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 border-b border-gray-200 pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">MikroTik BNG/BRAS</h1>
          <p className="mt-1 text-sm text-gray-500">Router API records and sync jobs are isolated by ISP site.</p>
          <p className="mt-1 font-mono text-[11px] text-gray-400">ISP Site ID: {site?.id || 'none'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadRouters} className="inline-flex items-center gap-2 border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button onClick={openCreate} className="inline-flex items-center gap-2 bg-gray-900 px-3 py-2 text-xs font-bold text-white hover:bg-black">
            <Plus className="h-3.5 w-3.5" /> Add Router
          </button>
        </div>
      </div>

      {error && <div className="flex items-center gap-2 border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600"><AlertCircle className="h-4 w-4" />{error}</div>}

      {formOpen && (
        <form onSubmit={saveRouter} className="border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
            <h2 className="text-sm font-bold text-gray-900">{editing ? 'Edit Router' : 'Add Router'}</h2>
            <button type="button" onClick={closeForm} className="p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid gap-4 p-4 md:grid-cols-4">
            {[
              ['name', 'Router name'],
              ['ip', 'IP / Host'],
              ['vendor', 'Vendor'],
              ['apiPort', 'API Port'],
              ['apiUser', 'API User'],
              ['nasIp', 'NAS IP'],
              ['profile', 'PPPoE Profile']
            ].map(([key, label]) => (
              <label key={key}>
                <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">{label}</span>
                <input value={(form as any)[key]} onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))} className="w-full border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500" required={['name', 'ip'].includes(key)} />
              </label>
            ))}
            <label>
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">Status</span>
              <select value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))} className="w-full border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500">
                {['online', 'offline', 'maintenance'].map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </label>
          </div>
          <div className="flex justify-end gap-2 border-t border-gray-200 bg-gray-50 px-4 py-3">
            <button type="button" onClick={closeForm} className="border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50">Cancel</button>
            <button disabled={saving} className="inline-flex items-center gap-2 bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60"><Save className="h-3.5 w-3.5" />{saving ? 'Saving...' : 'Save Router'}</button>
          </div>
        </form>
      )}

      <div className="border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3 font-bold">Router</th>
                <th className="px-4 py-3 font-bold">IP</th>
                <th className="px-4 py-3 font-bold">API</th>
                <th className="px-4 py-3 font-bold">Last Sync</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-sm font-bold text-gray-400">Loading routers from API...</td></tr>
              ) : routers.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-sm font-bold text-gray-400">No MikroTik routers found for this ISP site.</td></tr>
              ) : routers.map((router) => (
                <tr key={router.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3"><p className="font-bold text-gray-900">{router.name}</p><p className="text-xs text-gray-400">{router.vendor}</p></td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{router.ip}</td>
                  <td className="px-4 py-3 text-gray-600">{router.config?.apiPort || 8728}</td>
                  <td className="px-4 py-3 text-gray-500">{router.config?.lastSyncAt ? new Date(router.config.lastSyncAt).toLocaleString() : '-'}</td>
                  <td className="px-4 py-3"><span className="border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-600">{router.status}</span></td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <button onClick={() => syncRouter(router)} disabled={syncingId === router.id} className="border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50"><RefreshCw className={`h-3.5 w-3.5 ${syncingId === router.id ? 'animate-spin' : ''}`} /></button>
                      <button onClick={() => openEdit(router)} className="border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50"><Edit3 className="h-3.5 w-3.5" /></button>
                      <button onClick={() => deleteRouter(router)} className="border border-red-100 p-1.5 text-red-500 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
