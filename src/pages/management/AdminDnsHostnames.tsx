import React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Edit3,
  Network,
  Plus,
  Save,
  Server,
  ShieldCheck,
  Trash2,
  X
} from 'lucide-react';
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

const cleanHost = (value = '') => value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^\.+|\.+$/g, '');
const uniqueRows = (rows: string[]) => Array.from(new Set(rows.map(cleanHost).filter(Boolean)));
const defaultNameservers = (domain: string) => [`dns1.${cleanHost(domain) || 'tiwlo.com'}`, `dns2.${cleanHost(domain) || 'tiwlo.com'}`];
const targetFor = (row: any) => (row.recordType === 'CNAME' ? row.target : row.ipAddress);

export default function AdminDnsHostnames({ mode = 'hostnames' }: { mode?: 'hostnames' | 'nameservers' }) {
  const [config, setConfig] = React.useState<any>({ primaryDomain: '', serverIp: '', nameservers: [], soaEmail: '', automationEnabled: true, dnssecEnabled: false });
  const [hostnames, setHostnames] = React.useState<any[]>([]);
  const [form, setForm] = React.useState<any>(emptyHostname);
  const [nameserverRows, setNameserverRows] = React.useState<string[]>([]);
  const [search, setSearch] = React.useState('');
  const [notice, setNotice] = React.useState('');
  const [error, setError] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const { confirmDelete } = useActionConfirmation();

  const primaryDomain = cleanHost(config.primaryDomain || 'tiwlo.com');
  const suggestedNameservers = React.useMemo(() => defaultNameservers(primaryDomain), [primaryDomain]);
  const activeNameservers = nameserverRows.length ? nameserverRows : suggestedNameservers;
  const filteredHostnames = hostnames.filter((row) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return [row.hostname, row.ipAddress, row.target, row.recordType, row.notes].some((value) => String(value || '').toLowerCase().includes(term));
  });

  const load = React.useCallback(async () => {
    setError('');
    try {
      const [nextConfig, nextHostnames] = await Promise.all([
        fetchPowerDnsConfigWithApi(),
        fetchPowerDnsHostnamesWithApi()
      ]);
      const nextNameservers = uniqueRows(nextConfig.nameservers || []);
      setConfig(nextConfig);
      setNameserverRows(nextNameservers.length ? nextNameservers : defaultNameservers(nextConfig.primaryDomain || 'tiwlo.com'));
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
      const nameservers = uniqueRows(activeNameservers);
      const saved = await updatePowerDnsConfigWithApi({
        primaryDomain: primaryDomain || config.primaryDomain,
        serverIp: config.serverIp,
        soaEmail: config.soaEmail,
        automationEnabled: config.automationEnabled,
        dnssecEnabled: config.dnssecEnabled,
        nameservers
      });
      setConfig(saved);
      setNameserverRows(uniqueRows(saved.nameservers || []));
      await syncPowerDnsWithApi();
      setNotice('PowerDNS nameservers, glue A records, NS records, and mail DNS defaults synced.');
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

  const updateNameserver = (index: number, value: string) => {
    setNameserverRows((rows) => rows.map((item, rowIndex) => (rowIndex === index ? value : item)));
  };

  const removeNameserver = (index: number) => {
    setNameserverRows((rows) => rows.filter((_, rowIndex) => rowIndex !== index));
  };

  const fillPreset = (hostname: string, recordType = 'A') => {
    setForm({
      ...emptyHostname,
      hostname,
      recordType,
      ipAddress: recordType === 'CNAME' ? '' : config.serverIp || '',
      target: recordType === 'CNAME' ? primaryDomain : '',
      ttl: 300
    });
  };

  const copyValue = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setNotice('Copied.');
    } catch {
      setNotice(value);
    }
  };

  const serverIpText = String(config.serverIp || 'SERVER_IP');
  const spfAddress = serverIpText.includes(':') ? `ip6:${serverIpText}` : `ip4:${serverIpText}`;
  const generatedRecords = [
    ...activeNameservers.map((ns) => ({ type: 'NS', name: '@', value: ns, priority: '-' })),
    ...activeNameservers.map((ns) => ({ type: serverIpText.includes(':') ? 'AAAA' : 'A', name: ns.replace(`.${primaryDomain}`, ''), value: serverIpText, priority: '-' })),
    { type: 'MX', name: '@', value: `mail.${primaryDomain}`, priority: '10' },
    { type: 'TXT', name: '@', value: `v=spf1 mx a ${spfAddress} ~all`, priority: '-' },
    { type: 'TXT', name: '_dmarc', value: `v=DMARC1; p=quarantine; rua=mailto:postmaster@${primaryDomain}`, priority: '-' },
    { type: 'CAA', name: '@', value: '0 issue "letsencrypt.org"', priority: '-' }
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded border border-cyan-100 bg-cyan-50 text-cyan-700">
            {mode === 'nameservers' ? <Network className="h-5 w-5" /> : <Server className="h-5 w-5" />}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#111827]">{mode === 'nameservers' ? 'PowerDNS Nameservers' : 'PowerDNS Hostnames'}</h1>
            <p className="mt-1 text-[13px] text-[#6B7280]">{mode === 'nameservers' ? 'Glue hosts, authoritative NS, SOA, mail DNS, and PowerDNS sync.' : 'Service hostnames for DNS, mail, SSL, storefronts, and server routing.'}</p>
          </div>
        </div>
        <button disabled={saving} onClick={saveConfig} className="inline-flex items-center justify-center gap-2 rounded bg-[#0069ff] px-4 py-2 text-[12px] font-black text-white hover:bg-[#0056cc] disabled:opacity-60">
          <Save className="h-4 w-4" /> Save And Sync
        </button>
      </div>

      {error && <div className="flex items-center gap-2 rounded border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-700"><AlertCircle className="h-4 w-4" /> {error}</div>}
      {notice && <div className="flex items-center gap-2 rounded border border-emerald-100 bg-emerald-50 px-4 py-3 text-[13px] font-bold text-emerald-700"><ShieldCheck className="h-4 w-4" /> {notice}</div>}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {[
          ['Primary zone', primaryDomain || '-'],
          ['Server IP', config.serverIp || '-'],
          ['Nameservers', activeNameservers.length],
          ['Hostnames', hostnames.length]
        ].map(([label, value]) => (
          <div key={label} className="rounded border border-[#e5e8ed] bg-white px-4 py-3">
            <p className="text-[11px] font-black uppercase text-gray-500">{label}</p>
            <p className="mt-1 truncate text-[15px] font-black text-[#111827]">{value}</p>
          </div>
        ))}
      </section>

      {mode === 'nameservers' ? (
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_420px]">
          <div className="rounded border border-[#e5e8ed] bg-white">
            <div className="border-b border-[#f3f5f9] px-5 py-4">
              <h2 className="text-[14px] font-black uppercase text-[#111827]">Authoritative Setup</h2>
            </div>
            <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-3">
              <label className="space-y-2">
                <span className="text-[11px] font-black uppercase text-gray-500">Domain Name</span>
                <input value={config.primaryDomain || ''} onChange={(event) => setConfig({ ...config, primaryDomain: event.target.value })} placeholder="tiwlo.com" className="w-full rounded border border-[#d8dee9] px-3 py-2 text-[13px] font-bold outline-none focus:border-[#0069ff]" />
              </label>
              <label className="space-y-2">
                <span className="text-[11px] font-black uppercase text-gray-500">Server IP</span>
                <input value={config.serverIp || ''} onChange={(event) => setConfig({ ...config, serverIp: event.target.value })} placeholder="153.75.245.4" className="w-full rounded border border-[#d8dee9] px-3 py-2 text-[13px] font-bold outline-none focus:border-[#0069ff]" />
              </label>
              <label className="space-y-2">
                <span className="text-[11px] font-black uppercase text-gray-500">SOA Email</span>
                <input value={config.soaEmail || ''} onChange={(event) => setConfig({ ...config, soaEmail: event.target.value })} placeholder="admin@tiwlo.com" className="w-full rounded border border-[#d8dee9] px-3 py-2 text-[13px] font-bold outline-none focus:border-[#0069ff]" />
              </label>
              <div className="space-y-3 lg:col-span-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-black uppercase text-gray-500">Nameserver Hosts</span>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setNameserverRows(suggestedNameservers)} className="rounded border border-[#d8dee9] px-3 py-2 text-[12px] font-bold text-[#2e3d49] hover:bg-[#f8f9fa]">Use dns1/dns2</button>
                    <button type="button" onClick={() => setNameserverRows((rows) => [...rows, `dns${rows.length + 1}.${primaryDomain}`])} className="inline-flex items-center gap-2 rounded border border-[#d8dee9] px-3 py-2 text-[12px] font-bold text-[#2e3d49] hover:bg-[#f8f9fa]">
                      <Plus className="h-4 w-4" /> Add More
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {activeNameservers.map((row, index) => (
                    <div key={`${row}-${index}`} className="grid grid-cols-[1fr_auto] gap-2">
                      <input value={row} onChange={(event) => updateNameserver(index, event.target.value)} placeholder={`dns${index + 1}.${primaryDomain}`} className="min-w-0 rounded border border-[#d8dee9] px-3 py-2 font-mono text-[12px] font-bold outline-none focus:border-[#0069ff]" />
                      <button type="button" onClick={() => removeNameserver(index)} className="rounded border border-red-100 bg-red-50 p-2 text-red-600 hover:bg-red-100" title="Remove nameserver">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:col-span-3">
                <label className="flex items-center justify-between gap-3 rounded border border-[#e5e8ed] px-3 py-2 text-[12px] font-bold text-[#2e3d49]">
                  <span>Auto Sync</span>
                  <input type="checkbox" checked={Boolean(config.automationEnabled)} onChange={(event) => setConfig({ ...config, automationEnabled: event.target.checked })} />
                </label>
                <label className="flex items-center justify-between gap-3 rounded border border-[#e5e8ed] px-3 py-2 text-[12px] font-bold text-[#2e3d49]">
                  <span>DNSSEC</span>
                  <input type="checkbox" checked={Boolean(config.dnssecEnabled)} onChange={(event) => setConfig({ ...config, dnssecEnabled: event.target.checked })} />
                </label>
              </div>
            </div>
          </div>

          <div className="rounded border border-[#e5e8ed] bg-white">
            <div className="border-b border-[#f3f5f9] px-5 py-4">
              <h2 className="text-[14px] font-black uppercase text-[#111827]">Registrar Readiness</h2>
            </div>
            <div className="space-y-3 p-5">
              {[
                ['Glue hostnames', activeNameservers.join(', ')],
                ['Glue IP target', config.serverIp || 'SERVER_IP'],
                ['PowerDNS service', 'Port 53 TCP/UDP'],
                ['Parent registry NS', activeNameservers.join(' / ')]
              ].map(([label, value]) => (
                <button key={label} type="button" onClick={() => copyValue(String(value))} className="flex w-full items-center justify-between gap-3 rounded border border-[#e5e8ed] bg-[#f8f9fa] px-3 py-3 text-left">
                  <span className="min-w-0">
                    <span className="block text-[10px] font-black uppercase text-gray-500">{label}</span>
                    <span className="mt-1 block truncate font-mono text-[12px] font-bold text-[#111827]">{value}</span>
                  </span>
                  <Copy className="h-4 w-4 shrink-0 text-cyan-700" />
                </button>
              ))}
              <div className="rounded border border-amber-100 bg-amber-50 px-3 py-3 text-[12px] font-bold text-amber-800">
                GoDaddy glue can be correct while public NS checks still wait on parent registry propagation or closed DNS port 53.
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded border border-[#e5e8ed] bg-white xl:col-span-2">
            <div className="flex items-center justify-between border-b border-[#f3f5f9] px-5 py-4">
              <h2 className="text-[14px] font-black uppercase text-[#111827]">Auto Generated Records</h2>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse">
                <thead className="bg-[#f8f9fa] text-left">
                  <tr>
                    {['Type', 'Name', 'Value', 'Priority'].map((head) => (
                      <th key={head} className="px-5 py-3 text-[11px] font-black uppercase text-gray-500">{head}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f3f5f9]">
                  {generatedRecords.map((record, index) => (
                    <tr key={`${record.type}-${record.name}-${index}`}>
                      <td className="px-5 py-3 text-[12px] font-black text-cyan-700">{record.type}</td>
                      <td className="px-5 py-3 font-mono text-[12px] text-[#111827]">{record.name}</td>
                      <td className="max-w-[460px] truncate px-5 py-3 font-mono text-[12px] text-[#4b5563]">{record.value}</td>
                      <td className="px-5 py-3 text-[12px] font-bold text-[#4b5563]">{record.priority}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : (
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_1fr]">
          <div className="rounded border border-[#e5e8ed] bg-white">
            <div className="border-b border-[#f3f5f9] px-5 py-4">
              <h2 className="text-[14px] font-black uppercase text-[#111827]">Add Hostname</h2>
            </div>
            <div className="space-y-4 p-5">
              <div className="grid grid-cols-2 gap-2">
                {[`dns1.${primaryDomain}`, `dns2.${primaryDomain}`, `mail.${primaryDomain}`, `email.${primaryDomain}`].map((item) => (
                  <button key={item} type="button" onClick={() => fillPreset(item)} className="rounded border border-[#d8dee9] px-3 py-2 text-left font-mono text-[11px] font-bold text-[#2e3d49] hover:border-[#0069ff] hover:bg-blue-50">
                    {item}
                  </button>
                ))}
              </div>
              <label className="space-y-2">
                <span className="text-[11px] font-black uppercase text-gray-500">Hostname</span>
                <input value={form.hostname} onChange={(event) => setForm({ ...form, hostname: event.target.value })} placeholder={`dns1.${primaryDomain}`} className="w-full rounded border border-[#d8dee9] px-3 py-2 text-[13px] font-bold outline-none focus:border-[#0069ff]" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase text-gray-500">Type</span>
                  <select value={form.recordType} onChange={(event) => setForm({ ...form, recordType: event.target.value })} className="w-full rounded border border-[#d8dee9] px-3 py-2 text-[13px] font-bold outline-none focus:border-[#0069ff]">
                    <option>A</option>
                    <option>AAAA</option>
                    <option>CNAME</option>
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase text-gray-500">TTL</span>
                  <input type="number" value={form.ttl} onChange={(event) => setForm({ ...form, ttl: Number(event.target.value || 300) })} className="w-full rounded border border-[#d8dee9] px-3 py-2 text-[13px] font-bold outline-none focus:border-[#0069ff]" />
                </label>
              </div>
              <label className="space-y-2">
                <span className="text-[11px] font-black uppercase text-gray-500">IP Address</span>
                <input value={form.ipAddress} onChange={(event) => setForm({ ...form, ipAddress: event.target.value })} placeholder={config.serverIp || '153.75.245.4'} disabled={form.recordType === 'CNAME'} className="w-full rounded border border-[#d8dee9] px-3 py-2 text-[13px] font-bold outline-none focus:border-[#0069ff] disabled:bg-gray-100" />
              </label>
              <label className="space-y-2">
                <span className="text-[11px] font-black uppercase text-gray-500">CNAME Target</span>
                <input value={form.target} onChange={(event) => setForm({ ...form, target: event.target.value })} placeholder={primaryDomain} disabled={form.recordType !== 'CNAME'} className="w-full rounded border border-[#d8dee9] px-3 py-2 text-[13px] font-bold outline-none focus:border-[#0069ff] disabled:bg-gray-100" />
              </label>
              <label className="space-y-2">
                <span className="text-[11px] font-black uppercase text-gray-500">Notes</span>
                <input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Registrar glue, mail, webmail, app route" className="w-full rounded border border-[#d8dee9] px-3 py-2 text-[13px] outline-none focus:border-[#0069ff]" />
              </label>
              <button disabled={saving || !form.hostname.trim()} onClick={saveHostname} className="inline-flex w-full items-center justify-center gap-2 rounded bg-[#0069ff] px-4 py-2.5 text-[12px] font-black text-white disabled:opacity-60">
                <Save className="h-4 w-4" /> {form.id ? 'Update Hostname' : 'Save Hostname'}
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded border border-[#e5e8ed] bg-white">
            <div className="flex flex-col gap-3 border-b border-[#f3f5f9] px-5 py-4 md:flex-row md:items-center md:justify-between">
              <h2 className="text-[14px] font-black uppercase text-[#111827]">Hostname Records</h2>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search hostnames" className="rounded border border-[#d8dee9] px-3 py-2 text-[12px] font-bold outline-none focus:border-[#0069ff]" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse">
                <thead className="bg-[#f8f9fa] text-left">
                  <tr>
                    {['Hostname', 'Type', 'Target', 'TTL', 'Status', 'Notes', 'Actions'].map((head) => (
                      <th key={head} className="px-5 py-3 text-[11px] font-black uppercase text-gray-500">{head}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f3f5f9]">
                  {filteredHostnames.map((row) => (
                    <tr key={row.id}>
                      <td className="px-5 py-3 font-mono text-[12px] font-bold text-[#111827]">{row.hostname}</td>
                      <td className="px-5 py-3 text-[12px] font-black text-cyan-700">{row.recordType}</td>
                      <td className="max-w-[260px] truncate px-5 py-3 font-mono text-[12px] text-[#4b5563]">{targetFor(row)}</td>
                      <td className="px-5 py-3 text-[12px] font-bold text-[#4b5563]">{row.ttl}</td>
                      <td className="px-5 py-3 text-[12px] font-bold text-emerald-700">{row.status}</td>
                      <td className="max-w-[220px] truncate px-5 py-3 text-[12px] text-[#6B7280]">{row.notes || '-'}</td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => setForm(row)} className="rounded p-1.5 text-gray-500 hover:bg-blue-50 hover:text-blue-600" title="Edit hostname">
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button onClick={() => copyValue(row.hostname)} className="rounded p-1.5 text-gray-500 hover:bg-cyan-50 hover:text-cyan-700" title="Copy hostname">
                            <Copy className="h-4 w-4" />
                          </button>
                          <button onClick={() => removeHostname(row)} className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600" title="Delete hostname">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!filteredHostnames.length && (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-[13px] font-bold text-gray-400">No hostnames saved yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
