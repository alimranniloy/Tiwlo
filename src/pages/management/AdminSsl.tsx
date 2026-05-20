import React from 'react';
import { CheckCircle2, Globe2, Lock, RefreshCw, ShieldCheck, Terminal, XCircle } from 'lucide-react';
import { SystemJob, fetchSslJob, fetchSslStatus, startSslJob } from '../../lib/tiwloApi';

function ProgressPanel({ job }: { job?: SystemJob | null }) {
  if (!job) return null;
  const tone = job.status === 'failed'
    ? 'border-red-100 bg-red-50 text-red-700'
    : job.status === 'completed'
      ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
      : 'border-blue-100 bg-blue-50 text-blue-700';

  return (
    <div className={`rounded-md border px-4 py-3 ${tone}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 text-[13px] font-bold">{job.message || 'SSL job running'}</p>
        <span className="shrink-0 text-[12px] font-black">{Math.round(job.progress || 0)}%</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/70">
        <div className="h-full rounded-full bg-current transition-all" style={{ width: `${Math.min(100, Math.max(0, job.progress || 0))}%` }} />
      </div>
      {job.domains?.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {job.domains.slice(0, 10).map((domain) => (
            <span key={domain} className="rounded bg-white/70 px-2 py-1 text-[11px] font-bold">{domain}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function AdminSsl() {
  const [domain, setDomain] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [mode, setMode] = React.useState<'main' | 'all'>('main');
  const [staging, setStaging] = React.useState(false);
  const [forceRenewal, setForceRenewal] = React.useState(false);
  const [status, setStatus] = React.useState<{ installed: boolean; output: string } | null>(null);
  const [job, setJob] = React.useState<SystemJob | null>(null);
  const [error, setError] = React.useState('');
  const [loadingStatus, setLoadingStatus] = React.useState(false);

  const loadStatus = React.useCallback(async () => {
    setLoadingStatus(true);
    setError('');
    try {
      setStatus(await fetchSslStatus());
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

  const applySsl = async () => {
    setError('');
    try {
      setJob(await startSslJob({ mode, domain, email, staging, forceRenewal }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'SSL job could not start');
    }
  };

  const busy = job && ['queued', 'running'].includes(job.status);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#2e3d49]">SSL</h1>
          <p className="mt-1 text-[13px] text-[#4a4a4a]">Free SSL certificates for the main site or known connected domains.</p>
        </div>
        <button onClick={loadStatus} className="inline-flex items-center gap-2 rounded-md border border-[#d8dee9] bg-white px-3 py-2 text-[12px] font-bold text-[#2e3d49] hover:bg-[#f8f9fa]">
          <RefreshCw className={`h-4 w-4 ${loadingStatus ? 'animate-spin' : ''}`} /> Status
        </button>
      </div>

      {error && <div className="rounded-md border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600">{error}</div>}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="xl:col-span-2 rounded-lg border border-[#e5e8ed] bg-white">
          <div className="flex items-center gap-3 border-b border-[#f3f5f9] px-6 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-50 text-[#0069ff]">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-[14px] font-black uppercase tracking-wide text-[#2e3d49]">Certificate Request</h2>
              <p className="text-[12px] font-medium text-gray-500">Certbot installs automatically on Linux servers when missing.</p>
            </div>
          </div>

          <div className="space-y-5 p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-[12px] font-black uppercase tracking-wide text-gray-500">Email</span>
                <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@example.com" className="w-full rounded-md border border-[#d8dee9] bg-white px-3 py-2 text-[13px] font-bold outline-none focus:border-[#0069ff]" />
              </label>
              <label className="space-y-2">
                <span className="text-[12px] font-black uppercase tracking-wide text-gray-500">Main domain</span>
                <input value={domain} onChange={(event) => setDomain(event.target.value)} placeholder="example.com" disabled={mode === 'all'} className="w-full rounded-md border border-[#d8dee9] bg-white px-3 py-2 text-[13px] font-bold outline-none focus:border-[#0069ff] disabled:bg-[#f8f9fa]" />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <button onClick={() => setMode('main')} className={`rounded-md border px-4 py-3 text-left ${mode === 'main' ? 'border-[#0069ff] bg-blue-50 text-[#0069ff]' : 'border-[#e5e8ed] bg-white text-[#2e3d49]'}`}>
                <span className="flex items-center gap-2 text-[13px] font-black"><Globe2 className="h-4 w-4" /> Main site</span>
              </button>
              <button onClick={() => setMode('all')} className={`rounded-md border px-4 py-3 text-left ${mode === 'all' ? 'border-[#0069ff] bg-blue-50 text-[#0069ff]' : 'border-[#e5e8ed] bg-white text-[#2e3d49]'}`}>
                <span className="flex items-center gap-2 text-[13px] font-black"><ShieldCheck className="h-4 w-4" /> All known sites</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-5">
              <label className="flex items-center gap-2 text-[13px] font-bold text-[#2e3d49]">
                <input type="checkbox" checked={staging} onChange={(event) => setStaging(event.target.checked)} className="h-4 w-4" />
                Test mode
              </label>
              <label className="flex items-center gap-2 text-[13px] font-bold text-[#2e3d49]">
                <input type="checkbox" checked={forceRenewal} onChange={(event) => setForceRenewal(event.target.checked)} className="h-4 w-4" />
                Force renewal
              </label>
            </div>

            <button disabled={Boolean(busy)} onClick={applySsl} className="inline-flex items-center gap-2 rounded-md bg-[#0069ff] px-4 py-2.5 text-[12px] font-black text-white hover:bg-[#0056cc] disabled:cursor-not-allowed disabled:opacity-60">
              <Lock className="h-4 w-4" /> Connect free SSL
            </button>

            <ProgressPanel job={job} />
          </div>
        </section>

        <section className="rounded-lg border border-[#e5e8ed] bg-white">
          <div className="flex items-center gap-3 border-b border-[#f3f5f9] px-6 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-50 text-slate-600">
              <Terminal className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-[14px] font-black uppercase tracking-wide text-[#2e3d49]">Certbot</h2>
              <p className="text-[12px] font-medium text-gray-500">Current certificate command output.</p>
            </div>
          </div>
          <div className="space-y-4 p-6">
            <div className="flex items-center gap-3 rounded-md border border-[#e5e8ed] px-4 py-3">
              {status?.installed ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <XCircle className="h-5 w-5 text-gray-400" />}
              <span className="text-[13px] font-black text-[#2e3d49]">{status?.installed ? 'Installed' : 'Not installed yet'}</span>
            </div>
            <pre className="max-h-[420px] overflow-auto rounded-md bg-[#0f172a] p-4 text-[11px] leading-relaxed text-slate-100">
              {status?.output || 'No SSL status loaded.'}
            </pre>
          </div>
        </section>
      </div>
    </div>
  );
}
