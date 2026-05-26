import React from 'react';
import { AlertCircle, CheckCircle2, Copy, Edit3, Globe2, Mail, Plus, RefreshCw, Save, Server, ShieldCheck, Trash2, Zap } from 'lucide-react';
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

const recordTypes = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV', 'CAA', 'PTR'];

const emptyRecord = {
  id: '',
  type: 'A',
  name: '@',
  value: '',
  ttl: 300,
  priority: '',
  weight: '',
  port: '',
  flags: '0',
  tag: 'issue'
};

const cleanDomain = (value = '') => value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^\.+|\.+$/g, '');
const recordHints: Record<string, { value: string; name: string; priority?: string }> = {
  A: { name: '@', value: '153.75.245.4' },
  AAAA: { name: '@', value: '2001:db8::10' },
  CNAME: { name: 'www', value: 'example.com' },
  MX: { name: '@', value: 'mail.example.com', priority: '10' },
  TXT: { name: '@', value: 'v=spf1 mx a ~all' },
  NS: { name: '@', value: 'dns1.example.com' },
  SRV: { name: '_sip._tcp', value: '0 5060 sip.example.com', priority: '10' },
  CAA: { name: '@', value: '0 issue "letsencrypt.org"' },
  PTR: { name: '4', value: 'mail.example.com' }
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
  const selectedZoneName = cleanDomain(selectedDomain?.name || config?.primaryDomain || 'tiwlo.com');
  const serverIp = config?.serverIp || 'SERVER_IP';
  const nsHosts = Array.isArray(config?.nameservers) && config.nameservers.length ? config.nameservers : [`dns1.${selectedZoneName}`, `dns2.${selectedZoneName}`];
  const mailHost = `mail.${selectedZoneName}`;

  const recordValueFromForm = React.useCallback(() => {
    if (recordForm.type === 'SRV') {
      return `${Number(recordForm.weight || 0)} ${Number(recordForm.port || 0)} ${recordForm.value.trim()}`.trim();
    }
    if (recordForm.type === 'CAA') {
      const flags = String(recordForm.flags || '0').trim();
      const tag = String(recordForm.tag || 'issue').trim();
      const value = String(recordForm.value || '').trim().replace(/^"|"$/g, '');
      return `${flags} ${tag} "${value}"`;
    }
    return String(recordForm.value || '').trim();
  }, [recordForm]);

  const applyRecordType = (type: string) => {
    const hint = recordHints[type] || recordHints.A;
    setRecordForm({
      ...emptyRecord,
      type,
      name: hint.name,
      value: hint.value.replace(/example\.com/g, selectedZoneName).replace('153.75.245.4', serverIp),
      priority: hint.priority || ''
    });
  };

  const applyTemplate = (template: 'website' | 'nameservers' | 'mail' | 'spf' | 'dmarc' | 'caa') => {
    const templates: Record<typeof template, any> = {
      website: { ...emptyRecord, type: 'A', name: '@', value: serverIp, ttl: 300 },
      nameservers: { ...emptyRecord, type: 'NS', name: '@', value: nsHosts[0] || `dns1.${selectedZoneName}`, ttl: 300 },
      mail: { ...emptyRecord, type: 'MX', name: '@', value: mailHost, priority: 10, ttl: 300 },
      spf: { ...emptyRecord, type: 'TXT', name: '@', value: `v=spf1 mx a ip4:${serverIp} ~all`, ttl: 300 },
      dmarc: { ...emptyRecord, type: 'TXT', name: '_dmarc', value: `v=DMARC1; p=quarantine; rua=mailto:postmaster@${selectedZoneName}`, ttl: 300 },
      caa: { ...emptyRecord, type: 'CAA', name: '@', value: 'letsencrypt.org', flags: '0', tag: 'issue', ttl: 300 }
    };
    setRecordForm(templates[template]);
  };

  const addRecordBatch = async (items: Array<{ type: string; name: string; value: string; priority?: number | null; ttl?: number }>, label: string) => {
    if (!selectedDomain?.id) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const existingKeys = new Set(records.map((record) => `${record.type}:${record.name}:${record.value}`.toLowerCase()));
      for (const item of items) {
        const key = `${item.type}:${item.name}:${item.value}`.toLowerCase();
        if (existingKeys.has(key)) continue;
        existingKeys.add(key);
        await addDnsRecordWithApi({
          domainId: selectedDomain.id,
          type: item.type,
          name: item.name,
          value: item.value,
          ttl: item.ttl || 300,
          priority: item.priority ?? null,
          metadata: { provider: 'powerdns', source: label }
        });
      }
      setRecords(await fetchDnsRecordsWithApi(selectedDomain.id));
      setNotice(`${label} records are saved and synced.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Unable to add ${label} records`);
    } finally {
      setSaving(false);
    }
  };

  const addMailDefaults = () => addRecordBatch([
    { type: serverIp.includes(':') ? 'AAAA' : 'A', name: 'mail', value: serverIp },
    { type: serverIp.includes(':') ? 'AAAA' : 'A', name: 'email', value: serverIp },
    { type: serverIp.includes(':') ? 'AAAA' : 'A', name: 'smtp', value: serverIp },
    { type: serverIp.includes(':') ? 'AAAA' : 'A', name: 'imap', value: serverIp },
    { type: 'MX', name: '@', value: mailHost, priority: 10 },
    { type: 'TXT', name: '@', value: `v=spf1 mx a ${serverIp.includes(':') ? `ip6:${serverIp}` : `ip4:${serverIp}`} ~all` },
    { type: 'TXT', name: '_dmarc', value: `v=DMARC1; p=quarantine; rua=mailto:postmaster@${selectedZoneName}` },
    { type: 'CAA', name: '@', value: '0 issue "letsencrypt.org"' }
  ], 'Mail DNS');

  const addNameserverDefaults = () => addRecordBatch([
    ...nsHosts.map((ns: string) => ({ type: 'NS', name: '@', value: ns })),
    ...nsHosts.map((ns: string) => ({ type: serverIp.includes(':') ? 'AAAA' : 'A', name: ns.replace(`.${selectedZoneName}`, ''), value: serverIp }))
  ], 'Nameserver DNS');

  const editRecord = (record: any) => {
    const next = { ...emptyRecord, ...record, priority: record.priority ?? '' };
    if (record.type === 'SRV') {
      const [weight, port, ...target] = String(record.value || '').split(/\s+/);
      next.weight = weight || '';
      next.port = port || '';
      next.value = target.join(' ');
    }
    if (record.type === 'CAA') {
      const match = String(record.value || '').match(/^(\d+)\s+([a-z0-9_-]+)\s+"?(.+?)"?$/i);
      if (match) {
        next.flags = match[1];
        next.tag = match[2];
        next.value = match[3];
      }
    }
    setRecordForm(next);
  };

  const copyValue = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setNotice('Copied.');
    } catch {
      setNotice(value);
    }
  };

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
    const preparedValue = recordValueFromForm();
    if (!selectedDomain?.id || !preparedValue) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const input = {
        type: recordForm.type,
        name: recordForm.name || '@',
        value: preparedValue,
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

          <div className="border-b border-[#f3f5f9] p-4">
            <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
              {[
                ['website', 'Website', Server],
                ['nameservers', 'NS', ShieldCheck],
                ['mail', 'MX Mail', Mail],
                ['spf', 'SPF', CheckCircle2],
                ['dmarc', 'DMARC', ShieldCheck],
                ['caa', 'CAA SSL', Zap]
              ].map(([key, label, Icon]: any) => (
                <button key={key} type="button" onClick={() => applyTemplate(key)} className="inline-flex items-center justify-center gap-2 rounded border border-[#d8dee9] bg-white px-3 py-2 text-[12px] font-black text-[#2e3d49] hover:border-[#0069ff] hover:bg-blue-50">
                  <Icon className="h-4 w-4" /> {label}
                </button>
              ))}
              <button type="button" onClick={addMailDefaults} disabled={!selectedDomain || saving} className="inline-flex items-center justify-center gap-2 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] font-black text-emerald-700 hover:border-emerald-500 disabled:opacity-60">
                <Mail className="h-4 w-4" /> Auto Mail DNS
              </button>
              <button type="button" onClick={addNameserverDefaults} disabled={!selectedDomain || saving} className="inline-flex items-center justify-center gap-2 rounded border border-cyan-200 bg-cyan-50 px-3 py-2 text-[12px] font-black text-cyan-700 hover:border-cyan-500 disabled:opacity-60">
                <ShieldCheck className="h-4 w-4" /> Auto NS
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[120px_1fr_1.7fr_100px_110px_auto]">
              <label className="space-y-1">
                <span className="text-[10px] font-black uppercase text-gray-500">Type</span>
                <select value={recordForm.type} onChange={(event) => applyRecordType(event.target.value)} className="w-full rounded border border-[#d8dee9] px-3 py-2 text-[13px] font-bold outline-none focus:border-[#0069ff]">
                  {recordTypes.map((type) => <option key={type}>{type}</option>)}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-black uppercase text-gray-500">Name</span>
                <input value={recordForm.name} onChange={(event) => setRecordForm({ ...recordForm, name: event.target.value })} placeholder={recordHints[recordForm.type]?.name || '@'} className="w-full rounded border border-[#d8dee9] px-3 py-2 text-[13px] font-bold outline-none focus:border-[#0069ff]" />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-black uppercase text-gray-500">{recordForm.type === 'SRV' ? 'Target' : recordForm.type === 'CAA' ? 'Authority' : 'Value'}</span>
                <input value={recordForm.value} onChange={(event) => setRecordForm({ ...recordForm, value: event.target.value })} placeholder={recordHints[recordForm.type]?.value || 'Record value'} className="w-full rounded border border-[#d8dee9] px-3 py-2 text-[13px] font-bold outline-none focus:border-[#0069ff]" />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-black uppercase text-gray-500">TTL</span>
                <input type="number" value={recordForm.ttl} onChange={(event) => setRecordForm({ ...recordForm, ttl: Number(event.target.value || 300) })} className="w-full rounded border border-[#d8dee9] px-3 py-2 text-[13px] font-bold outline-none focus:border-[#0069ff]" />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-black uppercase text-gray-500">Priority</span>
                <input value={recordForm.priority} onChange={(event) => setRecordForm({ ...recordForm, priority: event.target.value })} placeholder={recordHints[recordForm.type]?.priority || '-'} disabled={!['MX', 'SRV'].includes(recordForm.type)} className="w-full rounded border border-[#d8dee9] px-3 py-2 text-[13px] font-bold outline-none focus:border-[#0069ff] disabled:bg-gray-100" />
              </label>
              <button disabled={!selectedDomain || saving || !recordValueFromForm()} onClick={saveRecord} className="inline-flex items-end justify-center gap-2 rounded bg-[#0069ff] px-4 py-2 text-[12px] font-black text-white disabled:opacity-60">
                <Save className="h-4 w-4" /> Save
              </button>
            </div>

            {(recordForm.type === 'SRV' || recordForm.type === 'CAA') && (
              <div className="mt-3 grid grid-cols-1 gap-3 rounded border border-[#e5e8ed] bg-[#f8f9fa] p-3 md:grid-cols-3">
                {recordForm.type === 'SRV' && (
                  <>
                    <label className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-gray-500">Weight</span>
                      <input value={recordForm.weight} onChange={(event) => setRecordForm({ ...recordForm, weight: event.target.value })} placeholder="0" className="w-full rounded border border-[#d8dee9] bg-white px-3 py-2 text-[13px] font-bold outline-none focus:border-[#0069ff]" />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-gray-500">Port</span>
                      <input value={recordForm.port} onChange={(event) => setRecordForm({ ...recordForm, port: event.target.value })} placeholder="5060" className="w-full rounded border border-[#d8dee9] bg-white px-3 py-2 text-[13px] font-bold outline-none focus:border-[#0069ff]" />
                    </label>
                  </>
                )}
                {recordForm.type === 'CAA' && (
                  <>
                    <label className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-gray-500">Flags</span>
                      <input value={recordForm.flags} onChange={(event) => setRecordForm({ ...recordForm, flags: event.target.value })} placeholder="0" className="w-full rounded border border-[#d8dee9] bg-white px-3 py-2 text-[13px] font-bold outline-none focus:border-[#0069ff]" />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-gray-500">Tag</span>
                      <select value={recordForm.tag} onChange={(event) => setRecordForm({ ...recordForm, tag: event.target.value })} className="w-full rounded border border-[#d8dee9] bg-white px-3 py-2 text-[13px] font-bold outline-none focus:border-[#0069ff]">
                        <option value="issue">issue</option>
                        <option value="issuewild">issuewild</option>
                        <option value="iodef">iodef</option>
                      </select>
                    </label>
                  </>
                )}
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-gray-500">Preview</span>
                  <div className="truncate rounded border border-[#d8dee9] bg-white px-3 py-2 font-mono text-[12px] font-bold text-[#111827]">{recordValueFromForm() || '-'}</div>
                </div>
              </div>
            )}
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
                        <button onClick={() => editRecord(record)} className="rounded p-1.5 text-gray-500 hover:bg-blue-50 hover:text-blue-600" title="Edit record">
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button onClick={() => copyValue(record.value)} className="rounded p-1.5 text-gray-500 hover:bg-cyan-50 hover:text-cyan-700" title="Copy value">
                          <Copy className="h-4 w-4" />
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
