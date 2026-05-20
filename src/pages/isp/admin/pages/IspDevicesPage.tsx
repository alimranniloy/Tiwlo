import React from 'react';
import { AlertCircle, Edit3, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import {
  deleteNetworkDeviceWithApi,
  fetchNetworkDevicesWithApi,
  upsertNetworkDeviceWithApi
} from '../../../../lib/tiwloApi';
import { useActionConfirmation } from '../../../../components/ActionConfirmation';

const deviceDefaults = {
  name: '',
  serial: '',
  status: 'online',
  port: '',
  vlan: '',
  client: '',
  rxPower: '',
  location: ''
};

export default function IspDevicesPage({ site, type, title }: { site: any; type: string; title: string }) {
  const [devices, setDevices] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [editing, setEditing] = React.useState<any | null | undefined>(undefined);
  const [form, setForm] = React.useState(deviceDefaults);
  const { confirmDelete, confirmEdit } = useActionConfirmation();

  const loadDevices = React.useCallback(async () => {
    if (!site?.id) return;
    setLoading(true);
    setError('');
    try {
      setDevices(await fetchNetworkDevicesWithApi(site.id, type));
    } catch (err) {
      setDevices([]);
      setError(err instanceof Error ? err.message : `Unable to load ${title}`);
    } finally {
      setLoading(false);
    }
  }, [site?.id, title, type]);

  React.useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  const openCreate = () => {
    setEditing(null);
    setForm(deviceDefaults);
  };

  const openEdit = async (device: any) => {
    const confirmed = await confirmEdit({
      title: 'Edit device?',
      message: 'Are you sure you want to edit this device?',
      resourceName: device.name
    });
    if (!confirmed) return;

    setEditing(device);
    setForm({
      name: device.name || '',
      serial: device.serial || '',
      status: device.status || 'online',
      port: device.metadata?.port || '',
      vlan: device.metadata?.vlan || '',
      client: device.metadata?.client || '',
      rxPower: device.metadata?.rxPower || '',
      location: device.metadata?.location || ''
    });
  };

  const closeForm = () => {
    setEditing(undefined);
    setForm(deviceDefaults);
  };

  const saveDevice = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!site?.id) return;
    setSaving(true);
    setError('');
    try {
      await upsertNetworkDeviceWithApi({
        siteId: site.id,
        type,
        id: editing?.id,
        name: form.name.trim(),
        serial: form.serial.trim() || undefined,
        status: form.status,
        metadata: {
          port: form.port.trim() || undefined,
          vlan: form.vlan.trim() || undefined,
          client: form.client.trim() || undefined,
          rxPower: form.rxPower.trim() || undefined,
          location: form.location.trim() || undefined
        }
      });
      closeForm();
      await loadDevices();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Unable to save ${title}`);
    } finally {
      setSaving(false);
    }
  };

  const deleteDevice = async (device: any) => {
    const confirmed = await confirmDelete({
      title: 'Delete device?',
      message: 'Are you sure you want to delete this device?',
      resourceName: device.name
    });
    if (!confirmed) return;

    setError('');
    try {
      await deleteNetworkDeviceWithApi(device.id);
      await loadDevices();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Unable to delete ${title}`);
    }
  };

  const formOpen = editing !== undefined;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 border-b border-gray-200 pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">{title}</h1>
          <p className="mt-1 text-sm text-gray-500">Devices are stored in the network device table by site and type.</p>
          <p className="mt-1 font-mono text-[11px] text-gray-400">ISP Site ID: {site?.id || 'none'} / type: {type}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadDevices} className="inline-flex items-center gap-2 border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
          <button onClick={openCreate} className="inline-flex items-center gap-2 bg-gray-900 px-3 py-2 text-xs font-bold text-white hover:bg-black"><Plus className="h-3.5 w-3.5" /> Add Device</button>
        </div>
      </div>

      {error && <div className="flex items-center gap-2 border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600"><AlertCircle className="h-4 w-4" />{error}</div>}

      {formOpen && (
        <form onSubmit={saveDevice} className="border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
            <h2 className="text-sm font-bold text-gray-900">{editing ? 'Edit Device' : 'Add Device'}</h2>
            <button type="button" onClick={closeForm} className="p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid gap-4 p-4 md:grid-cols-4">
            {[
              ['name', 'Name'],
              ['serial', 'Serial'],
              ['port', 'OLT Port'],
              ['vlan', 'VLAN'],
              ['client', 'Bound Client'],
              ['rxPower', 'RX Power'],
              ['location', 'Location']
            ].map(([key, label]) => (
              <label key={key}>
                <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">{label}</span>
                <input value={(form as any)[key]} onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))} className="w-full border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500" required={key === 'name'} />
              </label>
            ))}
            <label>
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">Status</span>
              <select value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))} className="w-full border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500">
                {['online', 'offline', 'warning', 'provisioning'].map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </label>
          </div>
          <div className="flex justify-end gap-2 border-t border-gray-200 bg-gray-50 px-4 py-3">
            <button type="button" onClick={closeForm} className="border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50">Cancel</button>
            <button disabled={saving} className="bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60">{saving ? 'Saving...' : 'Save Device'}</button>
          </div>
        </form>
      )}

      <div className="border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3 font-bold">Device</th>
                <th className="px-4 py-3 font-bold">Serial</th>
                <th className="px-4 py-3 font-bold">Port / VLAN</th>
                <th className="px-4 py-3 font-bold">Client</th>
                <th className="px-4 py-3 font-bold">Signal</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-sm font-bold text-gray-400">Loading devices from API...</td></tr>
              ) : devices.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-sm font-bold text-gray-400">No devices found for this ISP site.</td></tr>
              ) : devices.map((device) => (
                <tr key={device.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3"><p className="font-bold text-gray-900">{device.name}</p><p className="text-xs text-gray-400">{device.metadata?.location || '-'}</p></td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{device.serial || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{device.metadata?.port || '-'} / {device.metadata?.vlan || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{device.metadata?.client || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{device.metadata?.rxPower || '-'}</td>
                  <td className="px-4 py-3"><span className="border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-600">{device.status}</span></td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <button onClick={() => openEdit(device)} className="border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50"><Edit3 className="h-3.5 w-3.5" /></button>
                      <button onClick={() => deleteDevice(device)} className="border border-red-100 p-1.5 text-red-500 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button>
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
