import React from 'react';
import {
  Activity,
  AlertTriangle,
  Ban,
  CheckCircle2,
  Cpu,
  Globe2,
  Loader2,
  RefreshCcw,
  Save,
  Shield,
  ShieldAlert,
  Terminal,
  Zap
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import {
  createDdosBlockRuleWithApi,
  fetchDdosProtectionOverviewWithApi,
  ingestDdosTelemetryWithApi,
  releaseDdosBlockRuleWithApi,
  syncDdosProtectionAssetsWithApi,
  updateDdosProtectionPolicyWithApi
} from '../../lib/tiwloApi';

const defaults = {
  enabled: true,
  mode: 'mitigate',
  sensitivity: 'balanced',
  requestsPerSecondThreshold: 1200,
  packetsPerSecondThreshold: 20000,
  burstWindowSeconds: 60,
  blockDurationSeconds: 900,
  challengeThreshold: 600,
  syncToConnectedServers: true,
  protectHostingNodes: true,
  protectCloudResources: true,
  protectDomains: true,
  protectEcommerceDomains: true,
  automationMode: 'audit'
};

function randomIp() {
  return `${Math.floor(Math.random() * 190) + 20}.${Math.floor(Math.random() * 200) + 10}.${Math.floor(Math.random() * 200) + 10}.${Math.floor(Math.random() * 200) + 10}`;
}

function statusClass(status?: string) {
  const value = String(status || '').toLowerCase();
  if (['blocked', 'active', 'mitigating'].includes(value)) return 'border-red-100 bg-red-50 text-red-700';
  if (['released', 'resolved'].includes(value)) return 'border-green-100 bg-green-50 text-green-700';
  if (['stale', 'planned', 'queued'].includes(value)) return 'border-amber-100 bg-amber-50 text-amber-700';
  return 'border-blue-100 bg-blue-50 text-blue-700';
}

function dateTime(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function Toggle({ value, onChange }: { value: boolean; onChange: () => void }) {
  return (
    <button type="button" onClick={onChange} className={`relative h-6 w-10 rounded-full ${value ? 'bg-[#0069ff]' : 'bg-gray-200'}`}>
      <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${value ? 'right-1' : 'left-1'}`}></span>
    </button>
  );
}

export default function DdosProtectionPanel() {
  const [overview, setOverview] = React.useState<any | null>(null);
  const [policy, setPolicy] = React.useState<any>(defaults);
  const [manualIp, setManualIp] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [error, setError] = React.useState('');
  const [saved, setSaved] = React.useState(false);

  const load = React.useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError('');
    try {
      const data = await fetchDdosProtectionOverviewWithApi();
      setOverview(data);
      setPolicy({ ...defaults, ...(data.policy || {}) });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load DDoS protection overview');
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
    const timer = window.setInterval(() => load(true), 12000);
    return () => window.clearInterval(timer);
  }, [load]);

  const savePolicy = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const updated = await updateDdosProtectionPolicyWithApi({
        ...policy,
        requestsPerSecondThreshold: Number(policy.requestsPerSecondThreshold || defaults.requestsPerSecondThreshold),
        packetsPerSecondThreshold: Number(policy.packetsPerSecondThreshold || defaults.packetsPerSecondThreshold),
        burstWindowSeconds: Number(policy.burstWindowSeconds || defaults.burstWindowSeconds),
        blockDurationSeconds: Number(policy.blockDurationSeconds || defaults.blockDurationSeconds),
        challengeThreshold: Number(policy.challengeThreshold || defaults.challengeThreshold)
      });
      setPolicy({ ...defaults, ...updated });
      setOverview((current: any) => current ? { ...current, policy: updated } : current);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save DDoS policy');
    } finally {
      setSaving(false);
    }
  };

  const syncAssets = async () => {
    setSyncing(true);
    setError('');
    try {
      const data = await syncDdosProtectionAssetsWithApi();
      setOverview(data);
      setPolicy({ ...defaults, ...(data.policy || {}) });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sync protected assets');
    } finally {
      setSyncing(false);
    }
  };

  const runAttackTest = async () => {
    setTesting(true);
    setError('');
    try {
      const assets = overview?.assets || [];
      const asset = assets[0];
      await ingestDdosTelemetryWithApi({
        assetId: asset?.id,
        assetKey: asset?.resourceKey,
        sourceIp: randomIp(),
        vector: 'http-flood',
        requestsPerSecond: Math.max(Number(policy.requestsPerSecondThreshold || 1200) + 850, 1800),
        packetsPerSecond: Math.max(Number(policy.packetsPerSecondThreshold || 20000) + 9000, 29000),
        path: '/checkout',
        userAgent: 'Tiwlo Edge Sensor',
        metadata: { source: 'admin-simulation' }
      });
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to ingest telemetry');
    } finally {
      setTesting(false);
    }
  };

  const manualBlock = async () => {
    if (!manualIp.trim()) return;
    setSaving(true);
    setError('');
    try {
      await createDdosBlockRuleWithApi({
        sourceIp: manualIp.trim(),
        reason: 'Manual admin DDoS block',
        durationSeconds: Number(policy.blockDurationSeconds || 900),
        scope: 'global'
      });
      setManualIp('');
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create block rule');
    } finally {
      setSaving(false);
    }
  };

  const releaseRule = async (id: string) => {
    setError('');
    try {
      await releaseDdosBlockRuleWithApi(id);
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to release block rule');
    }
  };

  const metrics = overview?.metrics || {};
  const activeRules = (overview?.blockRules || []).filter((rule: any) => rule.status === 'active').slice(0, 6);
  const latestPlan = activeRules.find((rule: any) => rule.actionPlan)?.actionPlan;

  return (
    <div className="overflow-hidden rounded-lg border border-[#d7e3ff] bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-[#f3f5f9] bg-[#f8faff] px-6 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-blue-50 p-2 text-[#0069ff]">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-[14px] font-bold uppercase tracking-wide text-[#2e3d49]">DDoS Attack Protection</h2>
            <p className="mt-1 text-[12px] text-[#4a4a4a]">Tracks edge traffic, creates timed block rules, and syncs every connected server/domain asset.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={syncAssets} disabled={syncing} className="flex items-center gap-2 rounded border border-blue-100 bg-white px-3 py-2 text-[12px] font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-60">
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />} Sync Assets
          </button>
          <button onClick={runAttackTest} disabled={testing || loading} className="flex items-center gap-2 rounded border border-amber-100 bg-amber-50 px-3 py-2 text-[12px] font-bold text-amber-700 hover:bg-amber-100 disabled:opacity-60">
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />} Test Telemetry
          </button>
          <button onClick={savePolicy} disabled={saving || loading} className="flex items-center gap-2 rounded bg-[#0069ff] px-4 py-2 text-[12px] font-bold text-white hover:bg-[#0056cc] disabled:opacity-60">
            <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Policy'}
          </button>
        </div>
      </div>

      {error && <div className="mx-6 mt-6 flex items-start gap-2 rounded border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600"><AlertTriangle className="mt-0.5 h-4 w-4" /> {error}</div>}
      {saved && <div className="mx-6 mt-6 flex items-start gap-2 rounded border border-green-100 bg-green-50 px-4 py-3 text-[13px] font-bold text-green-700"><CheckCircle2 className="mt-0.5 h-4 w-4" /> DDoS policy saved.</div>}

      {loading ? (
        <div className="flex h-80 items-center justify-center text-sm font-bold text-gray-400">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading DDoS control plane...
        </div>
      ) : (
        <div className="space-y-8 p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            {[
              { label: 'Protected Assets', value: metrics.protectedAssets || 0, icon: Shield, color: 'text-blue-600' },
              { label: 'Active Blocks', value: metrics.activeBlocks || 0, icon: Ban, color: 'text-red-600' },
              { label: 'Active Attacks', value: metrics.activeAttacks || 0, icon: Activity, color: 'text-amber-600' },
              { label: 'Mitigated Today', value: metrics.mitigatedToday || 0, icon: CheckCircle2, color: 'text-green-600' },
              { label: 'Peak RPS', value: metrics.peakRps || 0, icon: Zap, color: 'text-indigo-600' }
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-md border border-[#e5e8ed] bg-white p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{item.label}</span>
                    <Icon className={`h-4 w-4 ${item.color}`} />
                  </div>
                  <div className={`text-2xl font-black ${item.color}`}>{item.value}</div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
            <div className="xl:col-span-7">
              <div className="rounded-lg border border-[#e5e8ed] bg-white p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-[14px] font-bold text-[#2e3d49]">Traffic & Mitigation Chart</h3>
                    <p className="text-[11px] font-medium text-gray-400">Five-minute buckets from the DDoS telemetry API.</p>
                  </div>
                  <span className={`rounded border px-2 py-1 text-[10px] font-black uppercase ${policy.enabled ? 'border-green-100 bg-green-50 text-green-700' : 'border-gray-100 bg-gray-50 text-gray-500'}`}>
                    {policy.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={overview?.telemetry || []} margin={{ left: -20, right: 8, top: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="ddosRequests" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="5%" stopColor="#0069ff" stopOpacity={0.28} />
                          <stop offset="95%" stopColor="#0069ff" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="ddosBlocked" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="5%" stopColor="#dc2626" stopOpacity={0.28} />
                          <stop offset="95%" stopColor="#dc2626" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#edf0f5" />
                      <XAxis dataKey="bucket" tick={{ fontSize: 10, fill: '#8a94a6' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#8a94a6' }} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Area type="monotone" dataKey="requests" stroke="#0069ff" fill="url(#ddosRequests)" strokeWidth={2} />
                      <Area type="monotone" dataKey="blocked" stroke="#dc2626" fill="url(#ddosBlocked)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="space-y-5 xl:col-span-5">
              <div className="rounded-lg border border-[#e5e8ed] bg-white p-5">
                <h3 className="mb-4 text-[14px] font-bold text-[#2e3d49]">Policy Engine</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="flex items-center justify-between rounded border border-[#f3f5f9] p-3">
                    <span className="text-[12px] font-bold text-[#4a4a4a]">Protection</span>
                    <Toggle value={Boolean(policy.enabled)} onChange={() => setPolicy((current: any) => ({ ...current, enabled: !current.enabled }))} />
                  </div>
                  <label className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Mode</span>
                    <select value={policy.mode} onChange={(event) => setPolicy((current: any) => ({ ...current, mode: event.target.value }))} className="w-full rounded border border-[#e5e8ed] px-3 py-2 text-sm font-bold">
                      <option value="monitor">Monitor</option>
                      <option value="challenge">Challenge</option>
                      <option value="mitigate">Mitigate</option>
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Sensitivity</span>
                    <select value={policy.sensitivity} onChange={(event) => setPolicy((current: any) => ({ ...current, sensitivity: event.target.value }))} className="w-full rounded border border-[#e5e8ed] px-3 py-2 text-sm font-bold">
                      <option value="relaxed">Relaxed</option>
                      <option value="balanced">Balanced</option>
                      <option value="aggressive">Aggressive</option>
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Automation</span>
                    <select value={policy.automationMode} onChange={(event) => setPolicy((current: any) => ({ ...current, automationMode: event.target.value }))} className="w-full rounded border border-[#e5e8ed] px-3 py-2 text-sm font-bold">
                      <option value="audit">Audit Plan</option>
                      <option value="remote_agent">Remote Agent Queue</option>
                      <option value="manual">Manual</option>
                    </select>
                  </label>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {[
                    ['requestsPerSecondThreshold', 'RPS Threshold'],
                    ['packetsPerSecondThreshold', 'PPS Threshold'],
                    ['challengeThreshold', 'Challenge RPS'],
                    ['blockDurationSeconds', 'Block Seconds']
                  ].map(([key, label]) => (
                    <label key={key} className="space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</span>
                      <input type="number" value={policy[key]} onChange={(event) => setPolicy((current: any) => ({ ...current, [key]: Number(event.target.value || 0) }))} className="w-full rounded border border-[#e5e8ed] px-3 py-2 text-sm font-bold" />
                    </label>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-1 gap-3 text-[12px] font-bold text-[#4a4a4a] sm:grid-cols-2">
                  {[
                    ['syncToConnectedServers', 'Auto-sync connected servers'],
                    ['protectHostingNodes', 'WHM/Plesk/hosting nodes'],
                    ['protectCloudResources', 'Cloud/system servers'],
                    ['protectDomains', 'DNS/subdomains'],
                    ['protectEcommerceDomains', 'Ecommerce domains']
                  ].map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2">
                      <input type="checkbox" checked={Boolean(policy[key])} onChange={(event) => setPolicy((current: any) => ({ ...current, [key]: event.target.checked }))} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-[#e5e8ed] bg-white p-5">
                <h3 className="mb-3 text-[14px] font-bold text-[#2e3d49]">Manual Emergency Block</h3>
                <div className="flex gap-2">
                  <input value={manualIp} onChange={(event) => setManualIp(event.target.value)} placeholder="203.0.113.10" className="min-w-0 flex-1 rounded border border-[#e5e8ed] px-3 py-2 font-mono text-sm" />
                  <button onClick={manualBlock} disabled={!manualIp.trim() || saving} className="rounded bg-red-600 px-4 py-2 text-[12px] font-bold text-white hover:bg-red-700 disabled:opacity-60">
                    Block
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
            <div className="rounded-lg border border-[#e5e8ed] bg-white xl:col-span-7">
              <div className="flex items-center gap-2 border-b border-[#f3f5f9] px-5 py-4">
                <Cpu className="h-4 w-4 text-[#0069ff]" />
                <h3 className="text-[14px] font-bold text-[#2e3d49]">Auto-Protected Assets</h3>
              </div>
              <div className="max-h-[360px] overflow-auto">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-[#f3f5f9]">
                      <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Asset</th>
                      <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Endpoint</th>
                      <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Risk</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f3f5f9]">
                    {(overview?.assets || []).slice(0, 12).map((asset: any) => (
                      <tr key={asset.id}>
                        <td className="px-5 py-3">
                          <div className="text-[13px] font-bold text-[#2e3d49]">{asset.name}</div>
                          <div className="text-[11px] text-gray-400">{asset.kind} {asset.panel ? `- ${asset.panel}` : ''}</div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="font-mono text-[12px] text-[#4a4a4a]">{asset.ip || asset.domain || '-'}</div>
                          {asset.ip && asset.domain && <div className="text-[11px] text-gray-400">{asset.domain}</div>}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`rounded border px-2 py-1 text-[10px] font-black uppercase ${asset.riskScore > 70 ? 'border-red-100 bg-red-50 text-red-700' : asset.riskScore > 30 ? 'border-amber-100 bg-amber-50 text-amber-700' : 'border-green-100 bg-green-50 text-green-700'}`}>
                            {asset.riskScore}/100
                          </span>
                        </td>
                      </tr>
                    ))}
                    {!overview?.assets?.length && (
                      <tr><td colSpan={3} className="px-5 py-10 text-center text-sm font-bold text-gray-400">No protected assets yet. Sync connected servers first.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-lg border border-[#e5e8ed] bg-white xl:col-span-5">
              <div className="flex items-center gap-2 border-b border-[#f3f5f9] px-5 py-4">
                <Ban className="h-4 w-4 text-red-600" />
                <h3 className="text-[14px] font-bold text-[#2e3d49]">Active Block Rules</h3>
              </div>
              <div className="max-h-[360px] divide-y divide-[#f3f5f9] overflow-auto">
                {activeRules.length ? activeRules.map((rule: any) => (
                  <div key={rule.id} className="p-5">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div>
                        <div className="font-mono text-[13px] font-bold text-[#2e3d49]">{rule.sourceIp}</div>
                        <div className="mt-1 text-[11px] text-gray-400">Expires: {dateTime(rule.expiresAt)}</div>
                      </div>
                      <span className={`rounded border px-2 py-1 text-[10px] font-black uppercase ${statusClass(rule.status)}`}>{rule.enforcementState}</span>
                    </div>
                    <p className="text-[12px] font-medium text-[#4a4a4a]">{rule.reason}</p>
                    <button onClick={() => releaseRule(rule.id)} className="mt-3 rounded border border-[#e5e8ed] px-3 py-1.5 text-[11px] font-bold text-[#4a4a4a] hover:bg-gray-50">Release Block</button>
                  </div>
                )) : (
                  <div className="p-10 text-center text-sm font-bold text-gray-400">No active timed blocks.</div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
            <div className="rounded-lg border border-[#e5e8ed] bg-white xl:col-span-7">
              <div className="flex items-center gap-2 border-b border-[#f3f5f9] px-5 py-4">
                <Globe2 className="h-4 w-4 text-[#0069ff]" />
                <h3 className="text-[14px] font-bold text-[#2e3d49]">Latest Attack Events</h3>
              </div>
              <div className="max-h-[330px] overflow-auto">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-[#f3f5f9]">
                      <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Source</th>
                      <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Target</th>
                      <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Traffic</th>
                      <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f3f5f9]">
                    {(overview?.events || []).slice(0, 10).map((event: any) => (
                      <tr key={event.id}>
                        <td className="px-5 py-3">
                          <div className="font-mono text-[12px] font-bold text-[#2e3d49]">{event.sourceIp}</div>
                          <div className="text-[11px] text-gray-400">{event.vector}</div>
                        </td>
                        <td className="px-5 py-3 text-[12px] font-medium text-[#4a4a4a]">{event.assetName || 'Global edge'}</td>
                        <td className="px-5 py-3 text-[12px] text-[#4a4a4a]">{event.requestsPerSecond} rps / {event.packetsPerSecond} pps</td>
                        <td className="px-5 py-3"><span className={`rounded border px-2 py-1 text-[10px] font-black uppercase ${statusClass(event.status)}`}>{event.status}</span></td>
                      </tr>
                    ))}
                    {!overview?.events?.length && (
                      <tr><td colSpan={4} className="px-5 py-10 text-center text-sm font-bold text-gray-400">No telemetry events yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-lg border border-[#e5e8ed] bg-[#111827] p-5 text-white xl:col-span-5">
              <div className="mb-4 flex items-center gap-2">
                <Terminal className="h-4 w-4 text-blue-300" />
                <h3 className="text-[14px] font-bold">Automation Command Plan</h3>
              </div>
              {latestPlan ? (
                <div className="space-y-4">
                  <div className="rounded border border-white/10 bg-white/5 p-3">
                    <p className="text-[11px] font-black uppercase tracking-widest text-blue-200">Target</p>
                    <p className="mt-1 text-[12px] text-gray-300">{latestPlan.target?.name || latestPlan.target?.scope || 'Global edge'} - {latestPlan.target?.ip || latestPlan.target?.domain || 'all protected endpoints'}</p>
                  </div>
                  <div className="space-y-2">
                    {(latestPlan.commands || []).map((command: string) => (
                      <code key={command} className="block overflow-x-auto rounded bg-black/30 px-3 py-2 text-[11px] text-green-200">{command}</code>
                    ))}
                  </div>
                  <p className="text-[11px] leading-relaxed text-gray-400">Current mode is {policy.automationMode}. Remote execution is queued for installed agents; audit mode records the exact plan without running shell commands.</p>
                </div>
              ) : (
                <div className="rounded border border-white/10 bg-white/5 p-5 text-sm font-bold text-gray-400">Block rules will show Linux, WHM/cPanel, Plesk, and Nginx enforcement plans here.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
