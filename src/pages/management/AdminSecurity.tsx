import React from 'react';
import { AlertCircle, Ban, Clock, Fingerprint, RefreshCw, Save, Search, ShieldCheck, SlidersHorizontal, Unlock, Wifi } from 'lucide-react';
import {
  fetchTSecurityBlockEvents,
  fetchTSecurityBlockSummary,
  fetchTSecurityPolicy,
  releaseTSecurityBlockEvent,
  saveTSecurityPolicy
} from '../../../tSecurity/client/tSecurityClient';

type BlockEvent = {
  id: string;
  email?: string;
  phone?: string;
  ipAddress?: string;
  ipSubnet?: string;
  country?: string;
  deviceHash?: string;
  reason: string;
  riskScore?: number;
  blockedUntil?: string;
  createdAt?: string;
  status?: string;
};

type TSecurityPolicy = {
  enabled?: boolean;
  mode?: string;
  adminBypass?: boolean;
  hideBlockReasonFromUsers?: boolean;
  blockOnSignupAvailability?: boolean;
  blockOnLogin?: boolean;
  blockKnownUsersOnLogin?: boolean;
  bindTicketToSubnet?: boolean;
  blockOnSameDeviceSignup?: boolean;
  blockOnSameSubnetSignup?: boolean;
  blockOnAdminDeviceSignup?: boolean;
  cooldownDays?: number;
  signupRiskBlockThreshold?: number;
  loginRiskBlockThreshold?: number;
};

const formatDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const shortHash = (value?: string) => value ? `${value.slice(0, 12)}...${value.slice(-6)}` : '-';

export default function AdminSecurity() {
  const [summary, setSummary] = React.useState<any>(null);
  const [events, setEvents] = React.useState<BlockEvent[]>([]);
  const [search, setSearch] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [policy, setPolicy] = React.useState<TSecurityPolicy | null>(null);
  const [savingPolicy, setSavingPolicy] = React.useState(false);
  const [releasingId, setReleasingId] = React.useState('');

  const load = React.useCallback(async (query = search) => {
    setLoading(true);
    setError('');
    try {
      const [nextSummary, nextEvents] = await Promise.all([
        fetchTSecurityBlockSummary(),
        fetchTSecurityBlockEvents({ search: query, limit: 150 }),
        fetchTSecurityPolicy().then(setPolicy)
      ]);
      setSummary(nextSummary);
      setEvents(nextEvents);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load tSecurity data.');
    } finally {
      setLoading(false);
    }
  }, [search]);

  React.useEffect(() => {
    load('');
  }, [load]);

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    load(search);
  };

  const updatePolicy = (patch: TSecurityPolicy) => {
    setPolicy((current) => ({ ...(current || {}), ...patch }));
  };

  const persistPolicy = async () => {
    if (!policy) return;
    setSavingPolicy(true);
    setError('');
    try {
      setPolicy(await saveTSecurityPolicy(policy as Record<string, unknown>));
      await load(search);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save tSecurity policy.');
    } finally {
      setSavingPolicy(false);
    }
  };

  const releaseBlock = async (id: string) => {
    setReleasingId(id);
    setError('');
    try {
      await releaseTSecurityBlockEvent(id);
      await load(search);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to unblock this tSecurity record.');
    } finally {
      setReleasingId('');
    }
  };

  const metrics = [
    { label: 'Blocked 24h', value: summary?.blocked24h || 0, icon: Ban },
    { label: 'Active Cooldowns', value: summary?.activeCooldowns || 0, icon: Clock },
    { label: 'Unique Devices', value: summary?.uniqueDevices || 0, icon: Fingerprint },
    { label: 'Blocked Subnets', value: summary?.blockedSubnets || 0, icon: Wifi }
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#2e3d49]">tSecurity</h1>
          <p className="mt-1 text-[13px] text-[#4a4a4a]">User Block dashboard with exact fraud reasons, cooldowns, IP, country, and device signals.</p>
        </div>
        <button
          onClick={() => load()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded bg-[#0069ff] px-5 py-2 text-[13px] font-bold text-white hover:bg-[#0056cc] disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600">
          <AlertCircle className="mt-0.5 h-4 w-4" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-lg border border-[#e5e8ed] bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-wide text-[#7b8496]">{metric.label}</p>
                <p className="mt-2 text-2xl font-black text-[#111827]">{loading && !summary ? '-' : metric.value}</p>
              </div>
              <metric.icon className="h-5 w-5 text-[#0069ff]" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <section className="overflow-hidden rounded-lg border border-[#e5e8ed] bg-white">
          <div className="flex flex-col gap-3 border-b border-[#eef2f7] bg-[#f8f9fa] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-[#0069ff]" />
              <h2 className="text-[14px] font-bold uppercase tracking-wide text-[#2e3d49]">User Block Records</h2>
            </div>
            <form onSubmit={submitSearch} className="flex min-w-0 gap-2">
              <div className="relative min-w-0 flex-1 lg:w-80">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7b8496]" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="h-9 w-full rounded border border-[#dfe5ee] bg-white pl-9 pr-3 text-[13px] outline-none focus:border-[#0069ff]"
                  placeholder="Email, phone, IP, device, reason"
                />
              </div>
              <button className="rounded bg-[#111827] px-4 text-[12px] font-black text-white hover:bg-black">Search</button>
            </form>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1080px] w-full border-collapse text-left">
              <thead className="bg-white text-[11px] font-black uppercase tracking-wide text-[#7b8496]">
                <tr>
                  <th className="border-b border-[#eef2f7] px-4 py-3">User</th>
                  <th className="border-b border-[#eef2f7] px-4 py-3">Network</th>
                  <th className="border-b border-[#eef2f7] px-4 py-3">Device Hash</th>
                  <th className="border-b border-[#eef2f7] px-4 py-3">Exact Reason</th>
                  <th className="border-b border-[#eef2f7] px-4 py-3">Blocked</th>
                  <th className="border-b border-[#eef2f7] px-4 py-3">Cooldown</th>
                  <th className="border-b border-[#eef2f7] px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef2f7] text-[13px]">
                {loading && events.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-10 text-center font-bold text-[#7b8496]">Loading tSecurity records...</td></tr>
                ) : events.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-10 text-center font-bold text-[#7b8496]">No block records found.</td></tr>
                ) : events.map((event) => (
                  <tr key={event.id} className="align-top hover:bg-[#fbfdff]">
                    <td className="px-4 py-3">
                      <p className="font-bold text-[#111827]">{event.email || '-'}</p>
                      <p className="mt-1 text-[12px] text-[#64748b]">{event.phone || '-'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-mono text-[12px] font-bold text-[#111827]">{event.ipAddress || '-'}</p>
                      <p className="mt-1 text-[12px] text-[#64748b]">{event.ipSubnet || '-'} {event.country ? `/${event.country}` : ''}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-[12px] text-[#334155]">{shortHash(event.deviceHash)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded border border-red-100 bg-red-50 px-2 py-1 text-[12px] font-black text-red-700">
                        {event.reason}
                      </span>
                      <p className="mt-1 text-[12px] text-[#64748b]">Risk score: {event.riskScore || 0}</p>
                    </td>
                    <td className="px-4 py-3 text-[12px] font-semibold text-[#334155]">{formatDate(event.createdAt)}</td>
                    <td className="px-4 py-3 text-[12px] font-semibold text-[#334155]">{formatDate(event.blockedUntil)}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        disabled={releasingId === event.id || event.status === 'released'}
                        onClick={() => releaseBlock(event.id)}
                        className="inline-flex items-center gap-2 rounded border border-emerald-100 bg-emerald-50 px-3 py-2 text-[12px] font-black text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Unlock className="h-4 w-4" />
                        {event.status === 'released' ? 'Released' : releasingId === event.id ? 'Releasing...' : 'Unblock'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-lg border border-[#e5e8ed] bg-white p-5">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-[#0069ff]" />
              <h2 className="text-[13px] font-black uppercase tracking-wide text-[#2e3d49]">Security Mode</h2>
            </div>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="text-[11px] font-black uppercase tracking-wide text-[#7b8496]">Mode</span>
                <select
                  value={policy?.mode || 'balanced'}
                  onChange={(event) => updatePolicy({ mode: event.target.value })}
                  className="mt-1 h-10 w-full rounded border border-[#dfe5ee] bg-white px-3 text-[13px] font-bold outline-none focus:border-[#0069ff]"
                >
                  <option value="relaxed">Relaxed</option>
                  <option value="balanced">Balanced</option>
                  <option value="aggressive">Aggressive</option>
                </select>
              </label>

              {[
                ['enabled', 'tSecurity enabled'],
                ['adminBypass', 'Never block admins'],
                ['blockOnLogin', 'Hard block risky login'],
                ['blockOnSignupAvailability', 'Hard block email checks'],
                ['blockKnownUsersOnLogin', 'Block user status on login hit'],
                ['blockOnSameDeviceSignup', 'Block repeat signup device'],
                ['blockOnSameSubnetSignup', 'Block repeat signup subnet'],
                ['blockOnAdminDeviceSignup', 'Block admin device signup'],
                ['bindTicketToSubnet', 'Bind token to subnet']
              ].map(([key, label]) => (
                <label key={key} className="flex items-center justify-between gap-3 rounded border border-[#eef2f7] px-3 py-2">
                  <span className="text-[12px] font-bold text-[#334155]">{label}</span>
                  <input
                    type="checkbox"
                    checked={Boolean((policy as any)?.[key])}
                    onChange={(event) => updatePolicy({ [key]: event.target.checked } as TSecurityPolicy)}
                    className="h-4 w-4 accent-[#0069ff]"
                  />
                </label>
              ))}

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-[11px] font-black uppercase tracking-wide text-[#7b8496]">Cooldown Days</span>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={policy?.cooldownDays ?? 90}
                    onChange={(event) => updatePolicy({ cooldownDays: Number(event.target.value) })}
                    className="mt-1 h-10 w-full rounded border border-[#dfe5ee] px-3 text-[13px] font-bold outline-none focus:border-[#0069ff]"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] font-black uppercase tracking-wide text-[#7b8496]">Signup Block</span>
                  <input
                    type="number"
                    min={80}
                    max={500}
                    value={policy?.signupRiskBlockThreshold ?? 240}
                    onChange={(event) => updatePolicy({ signupRiskBlockThreshold: Number(event.target.value) })}
                    className="mt-1 h-10 w-full rounded border border-[#dfe5ee] px-3 text-[13px] font-bold outline-none focus:border-[#0069ff]"
                  />
                </label>
              </div>

              <button
                type="button"
                disabled={!policy || savingPolicy}
                onClick={persistPolicy}
                className="inline-flex w-full items-center justify-center gap-2 rounded bg-[#0069ff] px-4 py-2.5 text-[13px] font-black text-white hover:bg-[#0056cc] disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {savingPolicy ? 'Saving...' : 'Save tSecurity'}
              </button>
            </div>
          </section>

          <section className="rounded-lg border border-[#e5e8ed] bg-white p-5">
            <h2 className="text-[13px] font-black uppercase tracking-wide text-[#2e3d49]">Top Reasons</h2>
            <div className="mt-4 space-y-3">
              {(summary?.topReasons || []).length === 0 ? (
                <p className="text-[13px] font-semibold text-[#7b8496]">No block data yet.</p>
              ) : summary.topReasons.map((item: any) => (
                <div key={item.reason} className="flex items-center justify-between gap-3 border-b border-[#f1f5f9] pb-3 last:border-0 last:pb-0">
                  <p className="text-[13px] font-bold text-[#111827]">{item.reason}</p>
                  <span className="rounded bg-[#eef4ff] px-2 py-1 text-[12px] font-black text-[#0069ff]">{item.count}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
