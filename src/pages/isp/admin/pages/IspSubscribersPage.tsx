import React from 'react';
import { AlertCircle, Edit3, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react';
import {
  createIspClientWithApi,
  deleteIspClientWithApi,
  fetchIspClientsWithApi,
  fetchIspPackagesWithApi,
  updateIspClientWithApi
} from '../../../../lib/tiwloApi';
import { useActionConfirmation } from '../../../../components/ActionConfirmation';
import { useCurrency } from '../../../../lib/useCurrency';

const clientDefaults = {
  name: '',
  username: '',
  email: '',
  phone: '',
  address: '',
  packageId: '',
  status: 'active',
  balance: '0',
  staticIp: '',
  onuSerial: ''
};

export default function IspSubscribersPage({ site, mode = 'subscribers' }: { site: any; mode?: 'subscribers' | 'sessions' }) {
  const { money } = useCurrency({ scope: 'platform', scopeId: 'isp-admin' });
  const [clients, setClients] = React.useState<any[]>([]);
  const [packages, setPackages] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [query, setQuery] = React.useState('');
  const [editing, setEditing] = React.useState<any | null | undefined>(undefined);
  const [form, setForm] = React.useState(clientDefaults);
  const { confirmDelete, confirmEdit } = useActionConfirmation();

  const loadClients = React.useCallback(async () => {
    if (!site?.id) return;
    setLoading(true);
    setError('');
    try {
      const [clientRows, packageRows] = await Promise.all([
        fetchIspClientsWithApi(query || undefined, site.id),
        fetchIspPackagesWithApi()
      ]);
      setClients(clientRows);
      setPackages(packageRows);
    } catch (err) {
      setClients([]);
      setPackages([]);
      setError(err instanceof Error ? err.message : 'Unable to load subscribers');
    } finally {
      setLoading(false);
    }
  }, [query, site?.id]);

  React.useEffect(() => {
    const timer = window.setTimeout(loadClients, 200);
    return () => window.clearTimeout(timer);
  }, [loadClients]);

  const openCreate = () => {
    setEditing(null);
    setForm(clientDefaults);
  };

  const openEdit = async (client: any) => {
    const confirmed = await confirmEdit({
      title: 'Edit subscriber?',
      message: 'Are you sure you want to edit this subscriber?',
      resourceName: client.name
    });
    if (!confirmed) return;

    setEditing(client);
    setForm({
      name: client.name || '',
      username: client.username || '',
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      packageId: client.packageId || '',
      status: client.status || 'active',
      balance: String(client.balance ?? 0),
      staticIp: client.metadata?.staticIp || '',
      onuSerial: client.metadata?.onu || ''
    });
  };

  const closeForm = () => {
    setEditing(undefined);
    setForm(clientDefaults);
  };

  const saveClient = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!site?.id) return;
    setSaving(true);
    setError('');
    try {
      const payload = {
        siteId: site.id,
        packageId: form.packageId || undefined,
        name: form.name.trim(),
        username: form.username.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        status: form.status,
        balance: Number(form.balance || 0),
        metadata: {
          staticIp: form.staticIp.trim() || undefined,
          onu: form.onuSerial.trim() || undefined,
          pppoe: { lastMode: mode }
        }
      };
      if (editing?.id) {
        await updateIspClientWithApi({ id: editing.id, ...payload });
      } else {
        await createIspClientWithApi(payload);
      }
      closeForm();
      await loadClients();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save subscriber');
    } finally {
      setSaving(false);
    }
  };

  const deleteClient = async (client: any) => {
    const confirmed = await confirmDelete({
      title: 'Delete subscriber?',
      message: 'Are you sure you want to delete this subscriber?',
      resourceName: client.name
    });
    if (!confirmed) return;

    setError('');
    try {
      await deleteIspClientWithApi(client.id);
      await loadClients();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete subscriber');
    }
  };

  const title = mode === 'sessions' ? 'PPPoE Sessions' : 'Subscribers';
  const formOpen = editing !== undefined;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 border-b border-gray-200 pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">{title}</h1>
          <p className="mt-1 text-sm text-gray-500">Subscriber records are scoped to {site?.name || 'this ISP site'}.</p>
          <p className="mt-1 font-mono text-[11px] text-gray-400">ISP Site ID: {site?.id || 'none'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadClients} className="inline-flex items-center gap-2 border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button onClick={openCreate} className="inline-flex items-center gap-2 bg-gray-900 px-3 py-2 text-xs font-bold text-white hover:bg-black">
            <Plus className="h-3.5 w-3.5" /> Add Subscriber
          </button>
        </div>
      </div>

      {error && <div className="flex items-center gap-2 border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600"><AlertCircle className="h-4 w-4" />{error}</div>}

      {formOpen && (
        <form onSubmit={saveClient} className="border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
            <h2 className="text-sm font-bold text-gray-900">{editing ? 'Edit Subscriber' : 'Add Subscriber'}</h2>
            <button type="button" onClick={closeForm} className="p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid gap-4 p-4 md:grid-cols-3">
            {[
              ['name', 'Name'],
              ['username', 'PPPoE Username'],
              ['email', 'Email'],
              ['phone', 'Phone'],
              ['address', 'Address'],
              ['balance', 'Balance'],
              ['staticIp', 'Static IP'],
              ['onuSerial', 'ONU Serial']
            ].map(([key, label]) => (
              <label key={key}>
                <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">{label}</span>
                <input value={(form as any)[key]} onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))} className="w-full border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500" required={['name', 'username'].includes(key)} />
              </label>
            ))}
            <label>
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">Internet Plan</span>
              <select value={form.packageId} onChange={(event) => setForm((prev) => ({ ...prev, packageId: event.target.value }))} className="w-full border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500">
                <option value="">No package</option>
                {packages.map((pkg) => <option key={pkg.id} value={pkg.id}>{pkg.name} / {pkg.speed}</option>)}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">Status</span>
              <select value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))} className="w-full border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500">
                {['active', 'suspended', 'pending', 'terminated'].map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </label>
          </div>
          <div className="flex justify-end gap-2 border-t border-gray-200 bg-gray-50 px-4 py-3">
            <button type="button" onClick={closeForm} className="border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50">Cancel</button>
            <button disabled={saving} className="bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60">{saving ? 'Saving...' : 'Save Subscriber'}</button>
          </div>
        </form>
      )}

      <div className="border border-gray-200 bg-white">
        <div className="flex items-center gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search subscribers..." className="w-full border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Records: {clients.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3 font-bold">Subscriber</th>
                <th className="px-4 py-3 font-bold">Username</th>
                <th className="px-4 py-3 font-bold">Static IP</th>
                <th className="px-4 py-3 font-bold">Balance</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-sm font-bold text-gray-400">Loading subscribers from API...</td></tr>
              ) : clients.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-sm font-bold text-gray-400">No subscribers found for this ISP site.</td></tr>
              ) : clients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3"><p className="font-bold text-gray-900">{client.name}</p><p className="text-xs text-gray-400">{client.phone || client.email || '-'}</p></td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{client.username}</td>
                  <td className="px-4 py-3 text-gray-600">{client.metadata?.staticIp || '-'}</td>
                  <td className="px-4 py-3 font-bold text-gray-900">{money(client.balance || 0, 'USD')}</td>
                  <td className="px-4 py-3"><span className="border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-600">{client.status}</span></td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <button onClick={() => openEdit(client)} className="border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50"><Edit3 className="h-3.5 w-3.5" /></button>
                      <button onClick={() => deleteClient(client)} className="border border-red-100 p-1.5 text-red-500 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button>
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
