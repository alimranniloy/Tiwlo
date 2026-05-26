import React from 'react';
import { AlertCircle, Edit3, Globe2, Plus, RefreshCw, Save, Server, Trash2, Zap } from 'lucide-react';
import {
  addDnsRecordWithApi,
  deleteDnsRecordWithApi,
  deleteDomainWithApi,
  fetchDnsRecordsWithApi,
  fetchDomainsWithApi,
  fetchPowerDnsConfigWithApi,
  fetchPowerDnsStatusWithApi,
  registerDomainWithApi,
  syncPowerDnsWithApi,
  updateDnsRecordWithApi
} from '../../lib/tiwloApi';
import { useActionConfirmation } from '../../components/ActionConfirmation';

const recordTypes = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV', 'CAA'];

const emptyRecord = {
  id: '',
  type: 'A',
  name: '@',
  value: '',
  ttl: 300,
  priority: ''
};

export default function AdminDns() {
  const [config, setConfig] = React.useState<any>(null);
  const [status, setStatus] = React.useState<any>(null);
  const [domains, setDomains] = React.useState<any[]>([]);
  const [records, setRecords] = React.useState<any[]>([]);
  const [selectedId, setSelectedId] = React.useState('');
  const [zoneName, setZoneName] = React.useState('');
  const [recordForm, setRecordForm] = React.useState<any>(emptyRecord);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [notice, setNotice] = React.useState('');
  const [error, setError] = React.useState('');
  const { confirmDelete } = useActionConfirmation();

  const selectedDomain = domains.find((item) => item.id === selectedId) || domains[0];

  const load = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [nextConfig, nextStatus, nextDomains] = await Promise.all([
        fetchPowerDnsConfigWithApi(),
        fetchPowerDnsStatusWithApi().catch(() => null),
        fetchDomainsWithApi()
      ]);
      setConfig(nextConfig);
      setStatus(nextStatus);
      setDomains(nextDomains);
      const nextSelected = selectedId || nextDomains[0]?.id || '';
      setSelectedId(nextSelected);
      if (nextSelected) {
        setRecords(await fetchDnsRecordsWithApi(nextSelected));
      } else {
        setRecords([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load PowerDNS zones');
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    if (!selectedDomain?.id) {
      setRecords([]);
      return;
    }
    fetchDnsRecordsWithApi(selectedDomain.id)
      .then(setRecords)
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load DNS records'));
  }, [selectedDomain?.id]);

  const createZone = async () => {
    if (!zoneName.trim()) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const created = await registerDomainWithApi({ name: zoneName.trim(), dns: config?.nameservers || undefined });
      const nextDomains = [created, ...domains];
      setDomains(nextDomains);
      setSelectedId(created.id);
      setZoneName('');
      setNotice('DNS zone created and queued for PowerDNS sync.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create DNS zone');
    } finally {
      setSaving(false);
    }
  };

  const saveRecord = async () => {
    if (!selectedDomain?.id || !recordForm.value.trim()) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const input = {
        type: recordForm.type,
        name: recordForm.name || '@',
        value: recordForm.value,
        ttl: Number(recordForm.ttl || 300),
        priority: recordForm.priority === '' ? null : Number(recordForm.priority)
      };
      if (recordForm.id) {
        await updateDnsRecordWithApi({ id: recordForm.id, ...input });
      } else {
        await addDnsRecordWithApi({ domainId: selectedDomain.id, ...input, metadata: { provider: 'powerdns' } });
      }
      setRecords(await fetchDnsRecordsWithApi(selectedDomain.id));
      setRecordForm(emptyRecord);
      setNotice('DNS record saved and synced to PowerDNS.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save DNS record');
    } finally {
      setSaving(false);
    }
  };

  const removeRecord = async (record: any) => {
    const confirmed = await confirmDelete({
      title: 'Delete DNS record?',
      message: 'This removes the record from the app database and the PowerDNS zone.',
      resourceName: `${record.type} ${record.name}`,
      confirmLabel: 'Delete record'
    });
    if (!confirmed) return;
    await deleteDnsRecordWithApi(record.id);
    setRecords(records.filter((item) => item.id !== record.id));
  };

  const removeZone = async (domain: any) => {
    const confirmed = await confirmDelete({
      title: 'Delete DNS zone?',
      message: 'This removes the zone and every DNS record under it.',
      resourceName: domain.name,
      confirmLabel: 'Delete zone'
    });
    if (!confirmed) return;
    await deleteDomainWithApi(domain.id);
    setDomains(domains.filter((item) => item.id !== domain.id));
    setSelectedId('');
    setRecords([]);
  };

  const syncNow = async () => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const result = await syncPowerDnsWithApi();
      setStatus(result);
      setNotice(result.message || 'PowerDNS sync completed.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sync PowerDNS');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded border border-blue-100 bg-blue-50 text-blue-600">
            <Globe2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#111827]">PowerDNS Zones</h1>
            <p className="mt-1 text-[13px] text-[#6B7280]">Authoritative DNS zones, records, automatic sync, and SSL-ready hostnames.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={load} className="inline-flex items-center gap-2 rounded border border-[#d8dee9] bg-white px-3 py-2 text-[12px] font-bold text-[#2e3d49] hover:bg-[#f8f9fa]">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button disabled={saving} onClick={syncNow} className="inline-flex items-center gap-2 rounded bg-[#0069ff] px-3 py-2 text-[12px] font-bold text-white hover:bg-[#0056cc] disabled:opacity-60">
            <Zap className="h-4 w-4" /> Sync
          </button>
        </div>
      </div>

      {error && <div className="flex items-center gap-2 rounded border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-700"><AlertCircle className="h-4 w-4" /> {error}</div>}
      {notice && <div className="rounded border border-emerald-100 bg-emerald-50 px-4 py-3 text-[13px] font-bold text-emerald-700">{notice}</div>}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {[
          ['Provider', config?.provider || 'powerdns'],
          ['Primary Domain', config?.primaryDomain || '-'],
          ['Zones', status?.zones ?? domains.length],
          ['Records', status?.records ?? records.length]
        ].map(([label, value]) => (
          <div key={label} className="rounded border border-[#e5e8ed] bg-white px-4 py-3">
            <p className="text-[11px] font-black uppercase text-gray-500">{label}</p>
            <p className="mt-1 truncate text-[15px] font-black text-[#111827]">{value}</p>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_1fr]">
        <div className="rounded border border-[#e5e8ed] bg-white">
          <div className="border-b border-[#f3f5f9] px-5 py-4">
            <h2 className="text-[14px] font-black uppercase text-[#111827]">Zones</h2>
          </div>
          <div className="border-b border-[#f3f5f9] p-4">
            <div className="flex gap-2">
              <input value={zoneName} onChange={(event) => setZoneName(event.target.value)} placeholder="example.com" className="min-w-0 flex-1 rounded border border-[#d8dee9] px-3 py-2 text-[13px] font-bold outline-none focus:border-[#0069ff]" />
              <button disabled={saving || !zoneName.trim()} onClick={createZone} className="inline-flex items-center gap-2 rounded bg-[#0069ff] px-3 py-2 text-[12px] font-black text-white disabled:opacity-60">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="max-h-[620px] overflow-y-auto">
            {domains.map((domain) => (
              <div key={domain.id} className={`flex items-center justify-between gap-3 border-b border-[#f3f5f9] px-4 py-3 ${selectedDomain?.id === domain.id ? 'bg-blue-50' : 'hover:bg-[#f8f9fa]'}`}>
                <button type="button" onClick={() => setSelectedId(domain.id)} className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-[13px] font-black text-[#111827]">{domain.name}</span>
                  <span className="block truncate text-[11px] font-bold text-gray-500">{(domain.dns || []).join(', ') || 'PowerDNS'}</span>
                </button>
                <button type="button" onClick={() => removeZone(domain)} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600" title="Delete zone">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded border border-[#e5e8ed] bg-white">
          <div className="flex flex-col gap-2 border-b border-[#f3f5f9] px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <h2 className="truncate text-[14px] font-black uppercase text-[#111827]">{selectedDomain?.name || 'Select a zone'}</h2>
              <p className="text-[12px] font-medium text-[#6B7280]">A, AAAA, CNAME, MX, TXT, NS, SRV, and CAA records.</p>
            </div>
            <div className="flex items-center gap-2 text-[12px] font-bold text-[#2e3d49]">
              <Server className="h-4 w-4 text-blue-600" /> {config?.serverIp || 'SERVER_IP'}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 border-b border-[#f3f5f9] p-4 lg:grid-cols-[110px_1fr_1.5fr_110px_110px_auto]">
            <select value={recordForm.type} onChange={(event) => setRecordForm({ ...recordForm, type: event.target.value })} className="rounded border border-[#d8dee9] px-3 py-2 text-[13px] font-bold outline-none focus:border-[#0069ff]">
              {recordTypes.map((type) => <option key={type}>{type}</option>)}
            </select>
            <input value={recordForm.name} onChange={(event) => setRecordForm({ ...recordForm, name: event.target.value })} placeholder="@" className="rounded border border-[#d8dee9] px-3 py-2 text-[13px] font-bold outline-none focus:border-[#0069ff]" />
            <input value={recordForm.value} onChange={(event) => setRecordForm({ ...recordForm, value: event.target.value })} placeholder="Record value" className="rounded border border-[#d8dee9] px-3 py-2 text-[13px] font-bold outline-none focus:border-[#0069ff]" />
            <input type="number" value={recordForm.ttl} onChange={(event) => setRecordForm({ ...recordForm, ttl: Number(event.target.value || 300) })} className="rounded border border-[#d8dee9] px-3 py-2 text-[13px] font-bold outline-none focus:border-[#0069ff]" />
            <input value={recordForm.priority} onChange={(event) => setRecordForm({ ...recordForm, priority: event.target.value })} placeholder="prio" className="rounded border border-[#d8dee9] px-3 py-2 text-[13px] font-bold outline-none focus:border-[#0069ff]" />
            <button disabled={!selectedDomain || saving} onClick={saveRecord} className="inline-flex items-center justify-center gap-2 rounded bg-[#0069ff] px-4 py-2 text-[12px] font-black text-white disabled:opacity-60">
              <Save className="h-4 w-4" /> Save
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse">
              <thead className="bg-[#f8f9fa] text-left">
                <tr>
                  {['Type', 'Name', 'Value', 'TTL', 'Priority', 'Status', 'Actions'].map((head) => (
                    <th key={head} className="px-5 py-3 text-[11px] font-black uppercase text-gray-500">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f3f5f9]">
                {records.length ? records.map((record) => (
                  <tr key={record.id}>
                    <td className="px-5 py-3 text-[12px] font-black text-blue-700">{record.type}</td>
                    <td className="px-5 py-3 font-mono text-[12px] text-[#111827]">{record.name}</td>
                    <td className="max-w-[360px] truncate px-5 py-3 font-mono text-[12px] text-[#4b5563]">{record.value}</td>
                    <td className="px-5 py-3 text-[12px] font-bold text-[#4b5563]">{record.ttl}</td>
                    <td className="px-5 py-3 text-[12px] font-bold text-[#4b5563]">{record.priority ?? '-'}</td>
                    <td className="px-5 py-3 text-[12px] font-bold text-emerald-700">{record.status}</td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => setRecordForm({ ...record, priority: record.priority ?? '' })} className="rounded p-1.5 text-gray-500 hover:bg-blue-50 hover:text-blue-600" title="Edit record">
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button onClick={() => removeRecord(record)} className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600" title="Delete record">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-[13px] font-bold text-gray-400">No DNS records yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
