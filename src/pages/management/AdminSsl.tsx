import React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Globe2,
  Lock,
  Power,
  RefreshCw,
  RotateCw,
  Save,
  Server,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  XCircle,
  Zap
} from 'lucide-react';
import {
  fetchSslJob,
  fetchSslStatus,
  saveSslConfig,
  startSslJob,
  startSslRenew,
  type SslConfig,
  type SslDomainDiagnostic,
  type SslStatus,
  type SystemJob
} from '../../lib/tiwloApi';

const fallbackConfig: SslConfig = {
  autoEnabled: true,
  primaryDomain: 'tiwlo.com',
  email: 'admin@tiwlo.com',
  domainsText: 'tiwlo.com\nwww.tiwlo.com\nmail.tiwlo.com\nemail.tiwlo.com',
  includeKnownDomains: true,
  includeWildcard: false,
  staging: false,
  forceRenewal: false
};

const statusTone = {
  ok: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-100 bg-amber-50 text-amber-700',
  error: 'border-red-100 bg-red-50 text-red-700'
} as const;

function ProgressPanel({ job }: { job?: SystemJob | null }) {
  if (!job) return null;
  const tone = job.status === 'failed'
    ? statusTone.error
    : job.status === 'completed'
      ? statusTone.ok
      : 'border-blue-100 bg-blue-50 text-blue-700';

  return (
    <div className={`rounded border px-4 py-3 ${tone}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 text-[13px] font-bold">{job.message || 'SSL job running'}</p>
        <span className="shrink-0 text-[12px] font-black">{Math.round(job.progress || 0)}%</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/70">
        <div className="h-full rounded-full bg-current transition-all" style={{ width: `${Math.min(100, Math.max(0, job.progress || 0))}%` }} />
      </div>
      {job.failedDomains?.length ? (
        <div className="mt-3 space-y-1">
          {job.failedDomains.slice(0, 6).map((item) => (
            <p key={`${item.domain}-${item.error}`} className="text-[11px] font-bold">{item.domain}: {item.error}</p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ToggleButton({ checked, disabled, onClick }: { checked: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`relative h-7 w-12 rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${checked ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 bg-slate-200'}`}
      aria-pressed={checked}
      title={checked ? 'Turn Auto SSL off' : 'Turn Auto SSL on'}
    >
      <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );
}

function DomainDiagnostic({ item }: { item: SslDomainDiagnostic }) {
  const Icon = item.status === 'ok' ? CheckCircle2 : item.status === 'warning' ? ShieldAlert : XCircle;
  const tone = statusTone[item.status];
  const messages = item.issues.length ? item.issues : item.warnings;
  return (
    <div className={`rounded border px-4 py-3 ${tone}`}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <p className="break-all text-[13px] font-black">{item.domain}</p>
            <p className="text-[11px] font-black uppercase">80 {item.ports.http.ok ? 'open' : 'blocked'} / 443 {item.ports.https.ok ? 'open' : 'blocked'}</p>
          </div>
          <p className="mt-1 break-all text-[11px] font-semibold opacity-80">{item.addresses.length ? item.addresses.join(', ') : 'No DNS address'}</p>
          {messages.slice(0, 2).map((message) => (
            <p key={message} className="mt-1 text-[12px] font-bold">{message}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdminSsl() {
  const [config, setConfig] = React.useState<SslConfig>(fallbackConfig);
  const [status, setStatus] = React.useState<SslStatus | null>(null);
  const [job, setJob] = React.useState<SystemJob | null>(null);
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');
  const [loadingStatus, setLoadingStatus] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const busy = Boolean(job && ['queued', 'running'].includes(job.status));

  const loadStatus = React.useCallback(async () => {
    setLoadingStatus(true);
    setError('');
    try {
      const nextStatus = await fetchSslStatus();
      setStatus(nextStatus);
      if (nextStatus.config) setConfig({ ...fallbackConfig, ...nextStatus.config });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load SSL status');
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  React.useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  React.useEffect(() => {
    if (!job || !['queued', 'running'].includes(job.status)) return undefined;
    const timer = window.setInterval(async () => {
      try {
        const next = await fetchSslJob(job.id);
        setJob(next);
        if (['completed', 'failed'].includes(next.status)) loadStatus();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to read SSL progress');
      }
    }, 1800);
    return () => window.clearInterval(timer);
  }, [job, loadStatus]);

  const saveConfigOnly = async (nextConfig = config) => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const saved = await saveSslConfig(nextConfig);
      setConfig(saved.config);
      setNotice('SSL configuration saved.');
      await loadStatus();
      return saved.config;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save SSL configuration');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const runInstall = async (mode: 'main' | 'all' = 'all', nextConfig = config) => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const saved = await saveConfigOnly(nextConfig);
      const nextJob = await startSslJob({ ...saved, mode, domain: saved.primaryDomain, saveConfig: true });
      setJob(nextJob);
      setNotice(mode === 'main' ? 'Main SSL job started.' : 'Auto SSL job started.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'SSL job could not start');
    } finally {
      setSaving(false);
    }
  };

  const toggleAutoSsl = async () => {
    const nextConfig = { ...config, autoEnabled: !config.autoEnabled };
    setConfig(nextConfig);
    if (nextConfig.autoEnabled) {
      await runInstall('all', nextConfig);
    } else {
      await saveConfigOnly(nextConfig);
    }
  };

  const renewNow = async () => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const nextJob = await startSslRenew({ forceRenewal: config.forceRenewal });
      setJob(nextJob);
      setNotice('SSL renewal job started.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'SSL renewal could not start');
    } finally {
      setSaving(false);
    }
  };

  const domainCount = status?.domains?.length || config.domainsText.split(/\s+/).filter(Boolean).length;
  const diagnostics = status?.diagnostics || [];
  const okCount = diagnostics.filter((item) => item.status === 'ok').length;
  const warningCount = diagnostics.filter((item) => item.status === 'warning').length;
  const errorCount = diagnostics.filter((item) => item.status === 'error').length;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded border border-emerald-100 bg-emerald-50 text-emerald-600">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#111827]">SSL Manager</h1>
            <p className="mt-1 text-[13px] text-[#6B7280]">Let&apos;s Encrypt certificates, renewals, DNS checks, and Nginx status.</p>
          </div>
        </div>
        <button onClick={loadStatus} className="inline-flex items-center gap-2 rounded border border-[#d8dee9] bg-white px-3 py-2 text-[12px] font-bold text-[#2e3d49] hover:bg-[#f8f9fa]">
          <RefreshCw className={`h-4 w-4 ${loadingStatus ? 'animate-spin' : ''}`} /> Status
        </button>
      </div>

      {error && <div className="flex items-center gap-2 rounded border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-700"><AlertCircle className="h-4 w-4" /> {error}</div>}
      {notice && <div className="flex items-center gap-2 rounded border border-emerald-100 bg-emerald-50 px-4 py-3 text-[13px] font-bold text-emerald-700"><ShieldCheck className="h-4 w-4" /> {notice}</div>}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_0.86fr]">
        <section className="rounded border border-[#e5e8ed] bg-white">
          <div className="flex items-center justify-between gap-4 border-b border-[#f3f5f9] px-5 py-4">
            <div className="flex items-center gap-3">
              <Power className={config.autoEnabled ? 'h-5 w-5 text-emerald-600' : 'h-5 w-5 text-slate-400'} />
              <div>
                <h2 className="text-[14px] font-black uppercase text-[#111827]">Auto SSL</h2>
                <p className="text-[12px] font-medium text-[#6B7280]">{config.autoEnabled ? 'Enabled' : 'Disabled'} / {domainCount} domain target(s)</p>
              </div>
            </div>
            <ToggleButton checked={config.autoEnabled} disabled={busy || saving} onClick={toggleAutoSsl} />
          </div>

          <div className="space-y-5 p-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-[12px] font-black uppercase text-gray-500">Primary Domain</span>
                <input value={config.primaryDomain} onChange={(event) => setConfig({ ...config, primaryDomain: event.target.value })} placeholder="tiwlo.com" className="w-full rounded border border-[#d8dee9] bg-white px-3 py-2 text-[13px] font-bold outline-none focus:border-[#0069ff]" />
              </label>
              <label className="space-y-2">
                <span className="text-[12px] font-black uppercase text-gray-500">Let&apos;s Encrypt Email</span>
                <input value={config.email} onChange={(event) => setConfig({ ...config, email: event.target.value })} placeholder="admin@tiwlo.com" className="w-full rounded border border-[#d8dee9] bg-white px-3 py-2 text-[13px] font-bold outline-none focus:border-[#0069ff]" />
              </label>
            </div>

            <label className="space-y-2 block">
              <span className="text-[12px] font-black uppercase text-gray-500">Domains</span>
              <textarea value={config.domainsText} onChange={(event) => setConfig({ ...config, domainsText: event.target.value })} rows={6} className="w-full resize-y rounded border border-[#d8dee9] bg-white px-3 py-2 font-mono text-[12px] outline-none focus:border-[#0069ff]" />
            </label>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {[
                ['includeKnownDomains', 'Include mapped sites'],
                ['includeWildcard', 'Request wildcard'],
                ['staging', 'Test mode'],
                ['forceRenewal', 'Force renewal']
              ].map(([key, label]) => (
                <label key={key} className="flex items-center justify-between gap-3 rounded border border-[#e5e8ed] px-3 py-2 text-[13px] font-bold text-[#2e3d49]">
                  <span>{label}</span>
                  <input type="checkbox" checked={Boolean((config as any)[key])} onChange={(event) => setConfig({ ...config, [key]: event.target.checked })} className="h-4 w-4" />
                </label>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <button disabled={busy || saving} onClick={() => saveConfigOnly()} className="inline-flex items-center gap-2 rounded border border-[#d8dee9] bg-white px-4 py-2.5 text-[12px] font-black text-[#2e3d49] hover:bg-[#f8f9fa] disabled:cursor-not-allowed disabled:opacity-60">
                <Save className="h-4 w-4" /> Save
              </button>
              <button disabled={busy || saving} onClick={() => runInstall('all')} className="inline-flex items-center gap-2 rounded bg-[#0069ff] px-4 py-2.5 text-[12px] font-black text-white hover:bg-[#0056cc] disabled:cursor-not-allowed disabled:opacity-60">
                <Zap className="h-4 w-4" /> Install All
              </button>
              <button disabled={busy || saving} onClick={() => runInstall('main')} className="inline-flex items-center gap-2 rounded border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[12px] font-black text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60">
                <Globe2 className="h-4 w-4" /> Main Only
              </button>
              <button disabled={busy || saving} onClick={renewNow} className="inline-flex items-center gap-2 rounded border border-amber-200 bg-amber-50 px-4 py-2.5 text-[12px] font-black text-amber-700 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60">
                <RotateCw className="h-4 w-4" /> Renew Now
              </button>
            </div>

            <ProgressPanel job={job} />
          </div>
        </section>

        <section className="rounded border border-[#e5e8ed] bg-white">
          <div className="flex items-center gap-3 border-b border-[#f3f5f9] px-5 py-4">
            <Terminal className="h-5 w-5 text-slate-600" />
            <div>
              <h2 className="text-[14px] font-black uppercase text-[#111827]">Runtime</h2>
              <p className="text-[12px] font-medium text-[#6B7280]">Certbot, timer, and wildcard state.</p>
            </div>
          </div>
          <div className="space-y-4 p-5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-1">
              <div className="rounded border border-[#e5e8ed] px-4 py-3">
                <p className="text-[11px] font-black uppercase text-gray-500">Certbot</p>
                <p className="mt-1 flex items-center gap-2 text-[13px] font-black text-[#111827]">{status?.installed ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-red-500" />} {status?.installed ? 'Installed' : 'Missing'}</p>
              </div>
              <div className="rounded border border-[#e5e8ed] px-4 py-3">
                <p className="text-[11px] font-black uppercase text-gray-500">Renew Timer</p>
                <p className="mt-1 flex items-center gap-2 text-[13px] font-black text-[#111827]"><RotateCw className="h-4 w-4 text-blue-600" /> {status?.autoRenew?.timerStatus || 'unknown'}</p>
              </div>
              <div className="rounded border border-[#e5e8ed] px-4 py-3">
                <p className="text-[11px] font-black uppercase text-gray-500">DNS Checks</p>
                <p className="mt-1 text-[13px] font-black text-[#111827]">{okCount} ok / {warningCount} warn / {errorCount} error</p>
              </div>
            </div>

            <div className={`rounded border px-4 py-3 ${status?.wildcard?.requested ? statusTone.warning : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
              <div className="flex items-start gap-3">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="text-[12px] font-black uppercase">Wildcard</p>
                  <p className="mt-1 text-[12px] font-bold">{status?.wildcard?.message || 'Wildcard SSL is off.'}</p>
                </div>
              </div>
            </div>

            <pre className="max-h-[310px] overflow-auto rounded bg-[#0f172a] p-4 text-[11px] leading-relaxed text-slate-100">
              {status?.output || 'No SSL status loaded.'}
            </pre>
          </div>
        </section>
      </div>

      <section className="rounded border border-[#e5e8ed] bg-white">
        <div className="flex items-center gap-3 border-b border-[#f3f5f9] px-5 py-4">
          <Server className="h-5 w-5 text-blue-600" />
          <div>
            <h2 className="text-[14px] font-black uppercase text-[#111827]">Domain Diagnostics</h2>
            <p className="text-[12px] font-medium text-[#6B7280]">PowerDNS address, HTTP challenge port, HTTPS port, and proxy warnings.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 p-5 lg:grid-cols-2">
          {diagnostics.length ? diagnostics.map((item) => (
            <React.Fragment key={item.domain}>
              <DomainDiagnostic item={item} />
            </React.Fragment>
          )) : (
            <div className="rounded border border-slate-200 bg-slate-50 px-4 py-3 text-[13px] font-bold text-slate-600">No diagnostics loaded yet.</div>
          )}
        </div>
      </section>
    </div>
  );
}
