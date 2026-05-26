import React from 'react';
import { AlertCircle, Edit3, Network, Plus, Save, Server, Trash2 } from 'lucide-react';
import {
  deletePowerDnsHostnameWithApi,
  fetchPowerDnsConfigWithApi,
  fetchPowerDnsHostnamesWithApi,
  syncPowerDnsWithApi,
  updatePowerDnsConfigWithApi,
  upsertPowerDnsHostnameWithApi
} from '../../lib/tiwloApi';
import { useActionConfirmation } from '../../components/ActionConfirmation';

const emptyHostname = {
  id: '',
  hostname: '',
  ipAddress: '',
  target: '',
  recordType: 'A',
  ttl: 300,
  status: 'active',
  notes: ''
};

export default function AdminDnsHostnames({ mode = 'hostnames' }: { mode?: 'hostnames' | 'nameservers' }) {
  const [config, setConfig] = React.useState<any>({ primaryDomain: '', serverIp: '', nameservers: [], soaEmail: '', automationEnabled: true, dnssecEnabled: false });
  const [hostnames, setHostnames] = React.useState<any[]>([]);
  const [form, setForm] = React.useState<any>(emptyHostname);
  const [nameserversText, setNameserversText] = React.useState('');
  const [notice, setNotice] = React.useState('');
  const [error, setError] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const { confirmDelete } = useActionConfirmation();

  const load = React.useCallback(async () => {
    setError('');
    try {
      const [nextConfig, nextHostnames] = await Promise.all([
        fetchPowerDnsConfigWithApi(),
        fetchPowerDnsHostnamesWithApi()
      ]);
      setConfig(nextConfig);
      setNameserversText((nextConfig.nameservers || []).join('\n'));
      setHostnames(nextHostnames);
      setForm((current: any) => ({
        ...current,
        ipAddress: current.ipAddress || nextConfig.serverIp || ''
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load PowerDNS settings');
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const saveConfig = async () => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const nameservers = nameserversText.split(/\s+/).map((item) => item.trim()).filter(Boolean);
      const saved = await updatePowerDnsConfigWithApi({
        primaryDomain: config.primaryDomain,
        serverIp: config.serverIp,
        soaEmail: config.soaEmail,
        automationEnabled: config.automationEnabled,
        dnssecEnabled: config.dnssecEnabled,
        nameservers
      });
      setConfig(saved);
      setNameserversText((saved.nameservers || []).join('\n'));
      await syncPowerDnsWithApi();
      setNotice('PowerDNS domain identity and nameservers saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save PowerDNS config');
    } finally {
      setSaving(false);
    }
  };

  const saveHostname = async () => {
    if (!form.hostname.trim()) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const saved = await upsertPowerDnsHostnameWithApi({
        id: form.id || undefined,
        hostname: form.hostname,
        ipAddress: form.recordType === 'CNAME' ? undefined : form.ipAddress,
        target: form.recordType === 'CNAME' ? form.target : undefined,
        recordType: form.recordType,
        ttl: Number(form.ttl || 300),
        status: form.status,
        notes: form.notes
      });
      setHostnames((rows) => {
        const exists = rows.some((row) => row.id === saved.id);
        return exists ? rows.map((row) => (row.id === saved.id ? saved : row)) : [saved, ...rows];
      });
      setForm({ ...emptyHostname, ipAddress: config.serverIp || '' });
      setNotice('Hostname saved and synced to PowerDNS.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save hostname');
    } finally {
      setSaving(false);
    }
  };

  const removeHostname = async (row: any) => {
    const confirmed = await confirmDelete({
      title: 'Delete hostname?',
      message: 'This removes the hostname record from PowerDNS.',
      resourceName: row.hostname,
      confirmLabel: 'Delete hostname'
    });
    if (!confirmed) return;
    await deletePowerDnsHostnameWithApi(row.id);
    setHostnames(hostnames.filter((item) => item.id !== row.id));
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded border border-cyan-100 bg-cyan-50 text-cyan-700">
          {mode === 'nameservers' ? <Network className="h-5 w-5" /> : <Server className="h-5 w-5" />}
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827]">{mode === 'nameservers' ? 'PowerDNS Nameservers' : 'PowerDNS Hostnames'}</h1>
          <p className="mt-1 text-[13px] text-[#6B7280]">{mode === 'nameservers' ? 'Set the platform domain, server IP, SOA email, and authoritative nameserver hosts.' : 'Add glue-style hostnames and service records that point to this server.'}</p>
        </div>
      </div>

      {error && <div className="flex items-center gap-2 rounded border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-700"><AlertCircle className="h-4 w-4" /> {error}</div>}
      {notice && <div className="rounded border border-emerald-100 bg-emerald-50 px-4 py-3 text-[13px] font-bold text-emerald-700">{notice}</div>}

      <section className="rounded border border-[#e5e8ed] bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-[#f3f5f9] px-5 py-4">
          <h2 className="text-[14px] font-black uppercase text-[#111827]">Domain Identity</h2>
          <button disabled={saving} onClick={saveConfig} className="inline-flex items-center gap-2 rounded bg-[#0069ff] px-4 py-2 text-[12px] font-black text-white hover:bg-[#0056cc] disabled:opacity-60">
            <Save className="h-4 w-4" /> Save
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-4">
          <label className="space-y-2">
            <span className="text-[11px] font-black uppercase text-gray-500">Domain Name</span>
            <input value={config.primaryDomain || ''} onChange={(event) => setConfig({ ...config, primaryDomain: event.target.value })} placeholder="example.com" className="w-full rounded border border-[#d8dee9] px-3 py-2 text-[13px] font-bold outline-none focus:border-[#0069ff]" />
          </label>
          <label className="space-y-2">
            <span className="text-[11px] font-black uppercase text-gray-500">Server IP</span>
            <input value={config.serverIp || ''} onChange={(event) => setConfig({ ...config, serverIp: event.target.value })} placeholder="203.0.113.10" className="w-full rounded border border-[#d8dee9] px-3 py-2 text-[13px] font-bold outline-none focus:border-[#0069ff]" />
          </label>
          <label className="space-y-2">
            <span className="text-[11px] font-black uppercase text-gray-500">SOA Email</span>
            <input value={config.soaEmail || ''} onChange={(event) => setConfig({ ...config, soaEmail: event.target.value })} placeholder="admin@example.com" className="w-full rounded border border-[#d8dee9] px-3 py-2 text-[13px] font-bold outline-none focus:border-[#0069ff]" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center justify-between gap-3 rounded border border-[#e5e8ed] px-3 py-2 text-[12px] font-bold text-[#2e3d49]">
              <span>Auto Sync</span>
              <input type="checkbox" checked={Boolean(config.automationEnabled)} onChange={(event) => setConfig({ ...config, automationEnabled: event.target.checked })} />
            </label>
            <label className="flex items-center justify-between gap-3 rounded border border-[#e5e8ed] px-3 py-2 text-[12px] font-bold text-[#2e3d49]">
              <span>DNSSEC</span>
              <input type="checkbox" checked={Boolean(config.dnssecEnabled)} onChange={(event) => setConfig({ ...config, dnssecEnabled: event.target.checked })} />
            </label>
          </div>
          <label className="space-y-2 lg:col-span-4">
            <span className="text-[11px] font-black uppercase text-gray-500">Nameservers</span>
            <textarea value={nameserversText} onChange={(event) => setNameserversText(event.target.value)} rows={3} className="w-full rounded border border-[#d8dee9] px-3 py-2 font-mono text-[12px] outline-none focus:border-[#0069ff]" />
          </label>
        </div>
      </section>

      <section className="rounded border border-[#e5e8ed] bg-white">
        <div className="border-b border-[#f3f5f9] px-5 py-4">
          <h2 className="text-[14px] font-black uppercase text-[#111827]">Hostname Records</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 border-b border-[#f3f5f9] p-4 lg:grid-cols-[1.4fr_110px_1.2fr_1.2fr_100px_auto]">
          <input value={form.hostname} onChange={(event) => setForm({ ...form, hostname: event.target.value })} placeholder={`ns1.${config.primaryDomain || 'example.com'}`} className="rounded border border-[#d8dee9] px-3 py-2 text-[13px] font-bold outline-none focus:border-[#0069ff]" />
          <select value={form.recordType} onChange={(event) => setForm({ ...form, recordType: event.target.value })} className="rounded border border-[#d8dee9] px-3 py-2 text-[13px] font-bold outline-none focus:border-[#0069ff]">
            <option>A</option>
            <option>AAAA</option>
            <option>CNAME</option>
          </select>
          <input value={form.ipAddress} onChange={(event) => setForm({ ...form, ipAddress: event.target.value })} placeholder="IP address" disabled={form.recordType === 'CNAME'} className="rounded border border-[#d8dee9] px-3 py-2 text-[13px] font-bold outline-none focus:border-[#0069ff] disabled:bg-gray-100" />
          <input value={form.target} onChange={(event) => setForm({ ...form, target: event.target.value })} placeholder="CNAME target" disabled={form.recordType !== 'CNAME'} className="rounded border border-[#d8dee9] px-3 py-2 text-[13px] font-bold outline-none focus:border-[#0069ff] disabled:bg-gray-100" />
          <input type="number" value={form.ttl} onChange={(event) => setForm({ ...form, ttl: Number(event.target.value || 300) })} className="rounded border border-[#d8dee9] px-3 py-2 text-[13px] font-bold outline-none focus:border-[#0069ff]" />
          <button disabled={saving || !form.hostname.trim()} onClick={saveHostname} className="inline-flex items-center justify-center gap-2 rounded bg-[#0069ff] px-4 py-2 text-[12px] font-black text-white disabled:opacity-60">
            <Plus className="h-4 w-4" /> Save
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse">
            <thead className="bg-[#f8f9fa] text-left">
              <tr>
                {['Hostname', 'Type', 'Target', 'TTL', 'Status', 'Actions'].map((head) => (
                  <th key={head} className="px-5 py-3 text-[11px] font-black uppercase text-gray-500">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f3f5f9]">
              {hostnames.map((row) => (
                <tr key={row.id}>
                  <td className="px-5 py-3 font-mono text-[12px] font-bold text-[#111827]">{row.hostname}</td>
                  <td className="px-5 py-3 text-[12px] font-black text-cyan-700">{row.recordType}</td>
                  <td className="px-5 py-3 font-mono text-[12px] text-[#4b5563]">{row.recordType === 'CNAME' ? row.target : row.ipAddress}</td>
                  <td className="px-5 py-3 text-[12px] font-bold text-[#4b5563]">{row.ttl}</td>
                  <td className="px-5 py-3 text-[12px] font-bold text-emerald-700">{row.status}</td>
                  <td className="px-5 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => setForm(row)} className="rounded p-1.5 text-gray-500 hover:bg-blue-50 hover:text-blue-600" title="Edit hostname">
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button onClick={() => removeHostname(row)} className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600" title="Delete hostname">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!hostnames.length && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-[13px] font-bold text-gray-400">No hostnames saved yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
