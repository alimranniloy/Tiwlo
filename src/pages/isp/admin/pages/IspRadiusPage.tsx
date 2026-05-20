import React from 'react';
import { AlertCircle, Edit3, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import {
  createRadiusServerWithApi,
  deleteRadiusServerWithApi,
  fetchRadiusServersWithApi,
  updateRadiusServerWithApi
} from '../../../../lib/tiwloApi';
import { useActionConfirmation } from '../../../../components/ActionConfirmation';

const radiusDefaults = { name: '', host: '', secret: '', status: 'online', nasGroup: '', realm: '' };

export default function IspRadiusPage({ site }: { site: any }) {
  const [servers, setServers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [editing, setEditing] = React.useState<any | null | undefined>(undefined);
  const [form, setForm] = React.useState(radiusDefaults);
  const { confirmDelete, confirmEdit } = useActionConfirmation();

  const loadServers = React.useCallback(async () => {
    if (!site?.id) return;
    setLoading(true);
    setError('');
    try {
      setServers(await fetchRadiusServersWithApi(site.id));
    } catch (err) {
      setServers([]);
      setError(err instanceof Error ? err.message : 'Unable to load RADIUS servers');
    } finally {
      setLoading(false);
    }
  }, [site?.id]);

  React.useEffect(() => {
    loadServers();
  }, [loadServers]);

  const openCreate = () => {
    setEditing(null);
    setForm(radiusDefaults);
  };

  const openEdit = async (server: any) => {
    const confirmed = await confirmEdit({
      title: 'Edit RADIUS server?',
      message: 'Are you sure you want to edit this RADIUS server?',
      resourceName: server.name
    });
    if (!confirmed) return;

    setEditing(server);
    setForm({
      name: server.name || '',
      host: server.host || '',
      secret: '',
      status: server.status || 'online',
      nasGroup: server.metadata?.nasGroup || '',
      realm: server.metadata?.realm || ''
    });
  };

  const closeForm = () => {
    setEditing(undefined);
    setForm(radiusDefaults);
  };

  const saveServer = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!site?.id) return;
    setSaving(true);
    setError('');
    try {
      const payload = {
        siteId: site.id,
        name: form.name.trim(),
        host: form.host.trim(),
        secret: form.secret.trim() || undefined,
        status: form.status,
        metadata: { nasGroup: form.nasGroup.trim() || undefined, realm: form.realm.trim() || undefined, siteId: site.id }
      };
      if (editing?.id) {
        await updateRadiusServerWithApi({ id: editing.id, ...payload });
      } else {
        await createRadiusServerWithApi({ ...payload, secret: form.secret.trim() || 'change-me' });
      }
      closeForm();
      await loadServers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save RADIUS server');
    } finally {
      setSaving(false);
    }
  };

  const deleteServer = async (server: any) => {
    const confirmed = await confirmDelete({
      title: 'Delete RADIUS server?',
      message: 'Are you sure you want to delete this RADIUS server?',
      resourceName: server.name
    });
    if (!confirmed) return;

    setError('');
    try {
      await deleteRadiusServerWithApi(server.id);
      await loadServers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete RADIUS server');
    }
  };

  const formOpen = editing !== undefined;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 border-b border-gray-200 pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">RADIUS Server</h1>
          <p className="mt-1 text-sm text-gray-500">Authentication nodes are scoped to this ISP site.</p>
          <p className="mt-1 font-mono text-[11px] text-gray-400">ISP Site ID: {site?.id || 'none'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadServers} className="inline-flex items-center gap-2 border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
          <button onClick={openCreate} className="inline-flex items-center gap-2 bg-gray-900 px-3 py-2 text-xs font-bold text-white hover:bg-black"><Plus className="h-3.5 w-3.5" /> Add RADIUS</button>
        </div>
      </div>

      {error && <div className="flex items-center gap-2 border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600"><AlertCircle className="h-4 w-4" />{error}</div>}

      {formOpen && (
        <form onSubmit={saveServer} className="border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
            <h2 className="text-sm font-bold text-gray-900">{editing ? 'Edit RADIUS' : 'Add RADIUS'}</h2>
            <button type="button" onClick={closeForm} className="p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid gap-4 p-4 md:grid-cols-3">
            {[
              ['name', 'Name'],
              ['host', 'Host'],
              ['secret', editing ? 'New Secret' : 'Shared Secret'],
              ['nasGroup', 'NAS Group'],
              ['realm', 'Realm']
            ].map(([key, label]) => (
              <label key={key}>
                <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">{label}</span>
                <input value={(form as any)[key]} onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))} className="w-full border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500" required={['name', 'host'].includes(key)} />
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
            <button disabled={saving} className="bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60">{saving ? 'Saving...' : 'Save RADIUS'}</button>
          </div>
        </form>
      )}

      <div className="border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3 font-bold">Server</th>
                <th className="px-4 py-3 font-bold">Host</th>
                <th className="px-4 py-3 font-bold">NAS Group</th>
                <th className="px-4 py-3 font-bold">Realm</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-sm font-bold text-gray-400">Loading RADIUS servers from API...</td></tr>
              ) : servers.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-sm font-bold text-gray-400">No RADIUS servers found for this ISP site.</td></tr>
              ) : servers.map((server) => (
                <tr key={server.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-bold text-gray-900">{server.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{server.host}</td>
                  <td className="px-4 py-3 text-gray-600">{server.metadata?.nasGroup || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{server.metadata?.realm || '-'}</td>
                  <td className="px-4 py-3"><span className="border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-600">{server.status}</span></td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <button onClick={() => openEdit(server)} className="border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50"><Edit3 className="h-3.5 w-3.5" /></button>
                      <button onClick={() => deleteServer(server)} className="border border-red-100 p-1.5 text-red-500 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button>
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
